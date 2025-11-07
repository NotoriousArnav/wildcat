const express = require('express');
const multer = require('multer');
const { connectToDB } = require('./db');
const MediaHandler = require('./mediaHandler');
const audioConverter = require('./audioConverter');
const { appLogger } = require('./logger');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

/**
 * Create an Express router exposing REST endpoints to manage and interact with a single account's messaging socket and stored messages.
 * @param {string} accountId - Account identifier used to scope socket operations, logging, and database queries.
 * @param {Object} socketManager - Manager providing socket lifecycle and access methods (e.g., `getSocket`, `createSocket`, `removeSocket`).
 * @returns {import('express').Router} An Express router with routes for sending text and media messages, replying, reacting, deleting, retrieving messages/media/chats, and controlling the account connection.
 */
function createAccountRouter(accountId, socketManager) {
  const router = express.Router();
  let db = null;
  let mediaHandler = null;
  const log = appLogger(`account:${accountId}`);

  (async () => {
    try {
      db = await connectToDB();
      mediaHandler = new MediaHandler(db);
      log.info('media_handler_initialized');
    } catch (e) {
      log.error('media_handler_init_failed', { error: e.message });
    }
  })();

  async function loadQuotedMessage(socketInfo, quotedMessageId, chatId) {
    try {
      let quotedMsg = null;
      try {
        quotedMsg = await socketInfo.socket.loadMessage(chatId, quotedMessageId);
      } catch (socketErr) {
        log.warn('quote_load_socket_failed', { error: socketErr.message });
      }
      if (quotedMsg) {
        log.info('quote_loaded_socket_store', { quotedMessageId });
        return quotedMsg;
      }

      log.info('quote_socket_store_miss', { quotedMessageId });

      if (!db) {
        log.warn('quote_db_uninitialized');
        db = await connectToDB();
      }

      const messagesCollection = db.collection('messages');
      const dbMsg = await messagesCollection.findOne({ messageId: quotedMessageId, accountId });
      if (!dbMsg) {
        log.warn('quote_not_found_db', { quotedMessageId });
        return null;
      }

      if (dbMsg.rawMessage) {
        const participant = dbMsg.rawMessage.key.participant && dbMsg.rawMessage.key.participant.trim()
          ? dbMsg.rawMessage.key.participant
          : undefined;
        const sanitizedQuote = {
          key: {
            remoteJid: dbMsg.rawMessage.key.remoteJid,
            id: dbMsg.rawMessage.key.id,
            fromMe: dbMsg.rawMessage.key.fromMe,
            participant
          },
          message: dbMsg.rawMessage.message,
          messageTimestamp: dbMsg.rawMessage.messageTimestamp
        };
        log.info('quote_using_sanitized_rawMessage', { quotedMessageId });
        return sanitizedQuote;
      }

      log.info('quote_constructing_from_db_fields', { quotedMessageId });
      return {
        key: {
          remoteJid: dbMsg.chatId,
          id: dbMsg.messageId,
          fromMe: dbMsg.fromMe,
          participant: dbMsg.fromMe ? undefined : dbMsg.from
        },
        message: { conversation: dbMsg.text || '' },
        messageTimestamp: dbMsg.timestamp
      };
    } catch (err) {
      log.error('quote_load_error', { quotedMessageId, error: err.message });
      return null;
    }
  }

  async function storeSentMessage(sentMsg, messageType, additionalData = {}) {
    try {
      if (!db) db = await connectToDB();
      const messagesCollection = db.collection('messages');
      const messageId = sentMsg.key.id;
      const chatId = sentMsg.key.remoteJid;
      const timestamp = sentMsg.messageTimestamp?.low || Math.floor(Date.now() / 1000);

      let textContent = null;
      let hasMedia = false;
      let mediaUrl = null;
      let mediaType = null;
      let caption = null;

      if (messageType === 'text') {
        textContent = additionalData.text || null;
      } else if (['image', 'video', 'audio', 'document'].includes(messageType)) {
        hasMedia = true;
        mediaType = messageType;
        caption = additionalData.caption || null;
      }

      const messageDoc = {
        accountId,
        messageId,
        chatId,
        from: chatId,
        fromMe: true,
        timestamp,
        type: messageType,
        text: textContent,
        caption,
        hasMedia,
        mediaUrl,
        mediaType,
        quotedMessage: additionalData.quotedMessage || null,
        mentions: additionalData.mentions || [],
        rawMessage: sentMsg,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await messagesCollection.insertOne(messageDoc);
      log.info('sent_message_stored', { messageType, messageId });
      return true;
    } catch (err) {
      log.error('sent_message_store_failed', { error: err.message });
      return false;
    }
  }

  // Reply to message
  router.post('/message/reply', async (req, res) => {
    const { to, message, quotedMessageId, mentions } = req.body || {};
    if (!to || !message || !quotedMessageId) {
      return res.status(400).json({ ok: false, error: 'to, message, and quotedMessageId are required' });
    }
    const socketInfo = socketManager.getSocket(accountId);
    if (!socketInfo) return res.status(404).json({ ok: false, error: 'Account not found' });
    if (socketInfo.status !== 'connected') {
      return res.status(400).json({ ok: false, error: 'Account not connected', status: socketInfo.status });
    }
    try {
      const quotedMsg = await loadQuotedMessage(socketInfo, quotedMessageId, to);
      if (!quotedMsg) return res.status(404).json({ ok: false, error: 'Quoted message not found' });
      const messageContent = { text: message };
      if (mentions && Array.isArray(mentions) && mentions.length > 0) messageContent.mentions = mentions;
      const sentMsg = await socketInfo.socket.sendMessage(to, messageContent, { quoted: quotedMsg });
      await storeSentMessage(sentMsg, 'text', { text: message, mentions, quotedMessage: quotedMessageId });
      return res.status(200).json({ ok: true, messageId: sentMsg.key.id, timestamp: sentMsg.messageTimestamp });
    } catch (err) {
      log.error('reply_send_error', { error: err.message });
      return res.status(500).json({ ok: false, error: err.message || 'internal_error' });
    }
  });

  // Send text
  router.post('/message/send', async (req, res) => {
    const { to, message, mentions } = req.body || {};
    if (!to || !message) return res.status(400).json({ ok: false, error: 'to and message are required' });
    const socketInfo = socketManager.getSocket(accountId);
    if (!socketInfo) return res.status(404).json({ ok: false, error: 'Account not found' });
    if (socketInfo.status !== 'connected') {
      return res.status(400).json({ ok: false, error: 'Account not connected', status: socketInfo.status });
    }
    try {
      const messageContent = { text: message };
      if (mentions && Array.isArray(mentions) && mentions.length > 0) messageContent.mentions = mentions;
      const sentMsg = await socketInfo.socket.sendMessage(to, messageContent);
      await storeSentMessage(sentMsg, 'text', { text: message, mentions });
      return res.status(200).json({ ok: true, messageId: sentMsg.key.id, timestamp: sentMsg.messageTimestamp });
    } catch (err) {
      log.error('text_send_error', { error: err.message });
      return res.status(500).json({ ok: false, error: err.message || 'internal_error' });
    }
  });

  // Image
  router.post('/message/send/image', upload.single('image'), async (req, res) => {
    const { to, caption, quotedMessageId } = req.body || {};
    if (!to) return res.status(400).json({ ok: false, error: 'to field is required' });
    if (!req.file) return res.status(400).json({ ok: false, error: 'image file is required' });
    const socketInfo = socketManager.getSocket(accountId);
    if (!socketInfo || socketInfo.status !== 'connected') {
      return res.status(400).json({ ok: false, error: 'Account not connected', status: socketInfo?.status });
    }
    try {
      const messageContent = { image: req.file.buffer, caption: caption || undefined, mimetype: req.file.mimetype };
      const sendOptions = {};
      if (quotedMessageId) {
        try {
          const quotedMsg = await loadQuotedMessage(socketInfo, quotedMessageId, to);
          if (quotedMsg) sendOptions.quoted = quotedMsg;
        } catch (quoteErr) {
          log.error('image_quote_load_error', { error: quoteErr.message });
        }
      }
      const sentMsg = await socketInfo.socket.sendMessage(to, messageContent, sendOptions);
      await storeSentMessage(sentMsg, 'image', { caption });
      return res.status(200).json({ ok: true, messageId: sentMsg.key.id, timestamp: sentMsg.messageTimestamp });
    } catch (err) {
      log.error('image_send_error', { error: err.message });
      return res.status(500).json({ ok: false, error: err.message || 'internal_error' });
    }
  });

  // Video
  router.post('/message/send/video', upload.single('video'), async (req, res) => {
    const { to, caption, gifPlayback, quotedMessageId } = req.body || {};
    if (!to) return res.status(400).json({ ok: false, error: 'to field is required' });
    if (!req.file) return res.status(400).json({ ok: false, error: 'video file is required' });
    const socketInfo = socketManager.getSocket(accountId);
    if (!socketInfo || socketInfo.status !== 'connected') {
      return res.status(400).json({ ok: false, error: 'Account not connected', status: socketInfo?.status });
    }
    try {
      const messageContent = {
        video: req.file.buffer,
        caption: caption || undefined,
        mimetype: req.file.mimetype,
        gifPlayback: gifPlayback === 'true' || gifPlayback === true
      };
      const sendOptions = {};
      if (quotedMessageId) {
        try {
          const quotedMsg = await loadQuotedMessage(socketInfo, quotedMessageId, to);
          if (quotedMsg) sendOptions.quoted = quotedMsg;
        } catch (quoteErr) {
          log.error('video_quote_load_error', { error: quoteErr.message });
        }
      }
      const sentMsg = await socketInfo.socket.sendMessage(to, messageContent, sendOptions);
      await storeSentMessage(sentMsg, 'video', { caption });
      return res.status(200).json({ ok: true, messageId: sentMsg.key.id, timestamp: sentMsg.messageTimestamp });
    } catch (err) {
      log.error('video_send_error', { error: err.message });
      return res.status(500).json({ ok: false, error: err.message || 'internal_error' });
    }
  });

  // Audio
  router.post('/message/send/audio', upload.single('audio'), async (req, res) => {
    const { to, ptt, quotedMessageId } = req.body || {};
    if (!to) return res.status(400).json({ ok: false, error: 'to field is required' });
    if (!req.file) return res.status(400).json({ ok: false, error: 'audio file is required' });
    const socketInfo = socketManager.getSocket(accountId);
    if (!socketInfo || socketInfo.status !== 'connected') {
      return res.status(400).json({ ok: false, error: 'Account not connected', status: socketInfo?.status });
    }
    try {
      let audioBuffer = req.file.buffer;
      let mimetype = 'audio/ogg; codecs=opus';
      const isPtt = ptt === 'true' || ptt === true;
      if (audioConverter.needsConversion(req.file.mimetype)) {
        try {
          audioBuffer = await audioConverter.convertToOggOpus(req.file.buffer, req.file.mimetype, isPtt);
        } catch (conversionErr) {
          log.error('audio_conversion_failed', { error: conversionErr.message });
          audioBuffer = req.file.buffer;
          mimetype = req.file.mimetype;
        }
      }
      const messageContent = { audio: audioBuffer, mimetype, ptt: isPtt };
      const sendOptions = {};
      if (quotedMessageId) {
        try {
          const quotedMsg = await loadQuotedMessage(socketInfo, quotedMessageId, to);
          if (quotedMsg) sendOptions.quoted = quotedMsg;
        } catch (quoteErr) {
          log.error('audio_quote_load_error', { error: quoteErr.message });
        }
      }
      const sentMsg = await socketInfo.socket.sendMessage(to, messageContent, sendOptions);
      await storeSentMessage(sentMsg, 'audio', {});
      return res.status(200).json({ ok: true, messageId: sentMsg.key.id, timestamp: sentMsg.messageTimestamp });
    } catch (err) {
      log.error('audio_send_error', { error: err.message });
      return res.status(500).json({ ok: false, error: err.message || 'internal_error' });
    }
  });

  // Document
  router.post('/message/send/document', upload.single('document'), async (req, res) => {
    const { to, caption, fileName, quotedMessageId } = req.body || {};
    if (!to) return res.status(400).json({ ok: false, error: 'to field is required' });
    if (!req.file) return res.status(400).json({ ok: false, error: 'document file is required' });
    const socketInfo = socketManager.getSocket(accountId);
    if (!socketInfo || socketInfo.status !== 'connected') {
      return res.status(400).json({ ok: false, error: 'Account not connected', status: socketInfo?.status });
    }
    try {
      const messageContent = { document: req.file.buffer, caption: caption || undefined, mimetype: req.file.mimetype, fileName: fileName || req.file.originalname };
      const sendOptions = {};
      if (quotedMessageId) {
        try {
          const quotedMsg = await loadQuotedMessage(socketInfo, quotedMessageId, to);
          if (quotedMsg) sendOptions.quoted = quotedMsg;
        } catch (quoteErr) {
          log.error('document_quote_load_error', { error: quoteErr.message });
        }
      }
      const sentMsg = await socketInfo.socket.sendMessage(to, messageContent, sendOptions);
      await storeSentMessage(sentMsg, 'document', { caption });
      return res.status(200).json({ ok: true, messageId: sentMsg.key.id, timestamp: sentMsg.messageTimestamp });
    } catch (err) {
      log.error('document_send_error', { error: err.message });
      return res.status(500).json({ ok: false, error: err.message || 'internal_error' });
    }
  });

  // Reaction
  router.post('/message/react', async (req, res) => {
    const { chatId, messageId, emoji } = req.body || {};
    if (!chatId || !messageId) return res.status(400).json({ ok: false, error: 'chatId and messageId are required' });
    const socketInfo = socketManager.getSocket(accountId);
    if (!socketInfo || socketInfo.status !== 'connected') {
      return res.status(400).json({ ok: false, error: 'Account not connected', status: socketInfo?.status });
    }
    try {
      const messagesCollection = db.collection('messages');
      const originalMsg = await messagesCollection.findOne({ messageId, chatId, accountId });
      if (!originalMsg) return res.status(404).json({ ok: false, error: 'Message not found in database' });
      const reactionMessage = { react: { text: emoji || '', key: { remoteJid: chatId, id: messageId, fromMe: originalMsg.fromMe } } };
      const sentMsg = await socketInfo.socket.sendMessage(chatId, reactionMessage);
      await storeSentMessage(sentMsg, 'text', {});
      return res.status(200).json({ ok: true, messageId: sentMsg.key.id });
    } catch (err) {
      log.error('reaction_send_error', { error: err.message });
      return res.status(500).json({ ok: false, error: err.message || 'internal_error' });
    }
  });

  // Delete message
  router.post('/message/delete', async (req, res) => {
    const { chatId, messageId } = req.body || {};
    if (!chatId || !messageId) return res.status(400).json({ ok: false, error: 'chatId and messageId are required' });
    const socketInfo = socketManager.getSocket(accountId);
    if (!socketInfo || socketInfo.status !== 'connected') {
      return res.status(400).json({ ok: false, error: 'Account not connected', status: socketInfo?.status });
    }
    try {
      await socketInfo.socket.sendMessage(chatId, { delete: { remoteJid: chatId, id: messageId, fromMe: true } });
      return res.status(200).json({ ok: true });
    } catch (err) {
      log.error('message_delete_error', { error: err.message });
      return res.status(500).json({ ok: false, error: err.message || 'internal_error' });
    }
  });

  // Get media
  router.get('/messages/:messageId/media', async (req, res) => {
    try {
      const { messageId } = req.params;
      const messagesCollection = db.collection('messages');
      const message = await messagesCollection.findOne({ messageId, accountId });
      if (!message) return res.status(404).json({ ok: false, error: 'Message not found' });
      if (!message.hasMedia || !message.mediaGridFsId) return res.status(404).json({ ok: false, error: 'Message has no media' });
      const { stream, metadata } = await mediaHandler.getMedia(message.mediaGridFsId);
      res.setHeader('Content-Type', metadata.contentType || 'application/octet-stream');
      res.setHeader('Content-Length', metadata.length);
      if (metadata.fileName) res.setHeader('Content-Disposition', `inline; filename="${metadata.fileName}"`);
      stream.pipe(res);
    } catch (err) {
      log.error('media_retrieval_error', { error: err.message });
      return res.status(500).json({ ok: false, error: err.message || 'internal_error' });
    }
  });

  // Get single message
  router.get('/messages/:messageId', async (req, res) => {
    try {
      const { messageId } = req.params;
      const messagesCollection = db.collection('messages');
      const message = await messagesCollection.findOne({ messageId, accountId });
      if (!message) return res.status(404).json({ ok: false, error: 'Message not found' });
      delete message._id;
      return res.status(200).json({ ok: true, message });
    } catch (err) {
      log.error('message_fetch_error', { error: err.message });
      return res.status(500).json({ ok: false, error: err.message || 'internal_error' });
    }
  });

  // Get chat messages
  router.get('/chats/:chatId/messages', async (req, res) => {
    try {
      const { chatId } = req.params;
      const { limit = 50, offset = 0, before, after } = req.query;
      const messagesCollection = db.collection('messages');
      const query = { accountId, chatId };
      if (before) query.timestamp = { $lt: parseInt(before) };
      if (after) query.timestamp = { ...query.timestamp, $gt: parseInt(after) };
      const messages = await messagesCollection.find(query).sort({ timestamp: -1 }).skip(parseInt(offset)).limit(parseInt(limit)).toArray();
      const total = await messagesCollection.countDocuments(query);
      messages.forEach(m => delete m._id);
      return res.status(200).json({ ok: true, messages, pagination: { total, limit: parseInt(limit), offset: parseInt(offset), hasMore: total > (parseInt(offset) + messages.length) } });
    } catch (err) {
      log.error('chat_messages_fetch_error', { error: err.message });
      return res.status(500).json({ ok: false, error: err.message || 'internal_error' });
    }
  });

  // List chats
  router.get('/chats', async (req, res) => {
    try {
      const messagesCollection = db.collection('messages');
      const chats = await messagesCollection.aggregate([
        { $match: { accountId } },
        { $sort: { timestamp: -1 } },
        { $group: { _id: '$chatId', lastMessage: { $first: '$$ROOT' }, messageCount: { $sum: 1 }, lastTimestamp: { $first: '$timestamp' } } },
        { $sort: { lastTimestamp: -1 } }
      ]).toArray();
      const formattedChats = chats.map(chat => ({
        chatId: chat._id,
        messageCount: chat.messageCount,
        lastMessage: { messageId: chat.lastMessage.messageId, text: chat.lastMessage.text, type: chat.lastMessage.type, timestamp: chat.lastMessage.timestamp, fromMe: chat.lastMessage.fromMe }
      }));
      return res.status(200).json({ ok: true, chats: formattedChats });
    } catch (err) {
      log.error('chats_list_error', { error: err.message });
      return res.status(500).json({ ok: false, error: err.message || 'internal_error' });
    }
  });

  // Account status
  router.get('/status', (req, res) => {
    const socketInfo = socketManager.getSocket(accountId);
    if (!socketInfo) return res.status(404).json({ ok: false, error: 'Account not found or not started' });
    return res.status(200).json({ ok: true, accountId, status: socketInfo.status, qr: socketInfo.qr, collection: socketInfo.collection });
  });

  // Connect
  router.post('/connect', async (req, res) => {
    try {
      const socketInfo = await socketManager.createSocket(accountId);
      return res.status(200).json({ ok: true, accountId, status: socketInfo.status, message: 'Connection initiated. Check /accounts/' + accountId + '/status for QR code' });
    } catch (err) {
      log.error('connect_error', { error: err.message });
      return res.status(500).json({ ok: false, error: 'Failed to connect' });
    }
  });

  // Disconnect
  router.post('/disconnect', async (req, res) => {
    try {
      await socketManager.removeSocket(accountId);
      return res.status(200).json({ ok: true, message: 'Account disconnected' });
    } catch (err) {
      log.error('disconnect_error', { error: err.message });
      return res.status(500).json({ ok: false, error: 'Failed to disconnect' });
    }
  });

  return router;
}

module.exports = { createAccountRouter };
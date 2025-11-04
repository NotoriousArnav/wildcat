const express = require('express');
const multer = require('multer');
const { connectToDB } = require('./db');
const MediaHandler = require('./mediaHandler');

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Per-account route handlers
function createAccountRouter(accountId, socketManager) {
  const router = express.Router();

  // Get DB and MediaHandler instances
  let db = null;
  let mediaHandler = null;
  
  (async () => {
    db = await connectToDB();
    mediaHandler = new MediaHandler(db);
  })();

  // ============================================================================
  // SEND MESSAGE ENDPOINTS
  // ============================================================================

  // Send text message (enhanced with quote/mention support)
  router.post('/message/send', async (req, res) => {
    const { to, message, quotedMessageId, mentions } = req.body || {};
    if (!to || !message) {
      return res.status(400).json({
        ok: false,
        error: 'to and message are required'
      });
    }
    
    const socketInfo = socketManager.getSocket(accountId);
    if (!socketInfo) {
      return res.status(404).json({ ok: false, error: 'Account not found' });
    }
    
    if (socketInfo.status !== 'connected') {
      return res.status(400).json({ 
        ok: false, 
        error: 'Account not connected',
        status: socketInfo.status 
      });
    }
    
    try {
      // Build message content
      const messageContent = { text: message };
      
      // Add quoted message if provided
      if (quotedMessageId) {
        const messagesCollection = db.collection('messages');
        const quotedMsg = await messagesCollection.findOne({ 
          messageId: quotedMessageId,
          accountId 
        });
        
        if (quotedMsg) {
          messageContent.quoted = {
            key: {
              remoteJid: quotedMsg.chatId,
              id: quotedMsg.messageId,
              fromMe: quotedMsg.fromMe
            }
          };
        }
      }
      
      // Add mentions if provided
      if (mentions && Array.isArray(mentions) && mentions.length > 0) {
        messageContent.mentions = mentions;
      }
      
      const sentMsg = await socketInfo.socket.sendMessage(to, messageContent);
      return res.status(200).json({ 
        ok: true, 
        messageId: sentMsg.key.id,
        timestamp: sentMsg.messageTimestamp
      });
    } catch (err) {
      console.error(`Error sending message for ${accountId}:`, err);
      return res.status(500).json({ ok: false, error: err.message || 'internal_error' });
    }
  });

  // Send image message
  router.post('/message/send/image', upload.single('image'), async (req, res) => {
    const { to, caption } = req.body || {};
    
    if (!to) {
      return res.status(400).json({ ok: false, error: 'to field is required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'image file is required' });
    }
    
    const socketInfo = socketManager.getSocket(accountId);
    if (!socketInfo || socketInfo.status !== 'connected') {
      return res.status(400).json({ 
        ok: false, 
        error: 'Account not connected',
        status: socketInfo?.status 
      });
    }
    
    try {
      const messageContent = {
        image: req.file.buffer,
        caption: caption || undefined,
        mimetype: req.file.mimetype
      };
      
      const sentMsg = await socketInfo.socket.sendMessage(to, messageContent);
      return res.status(200).json({ 
        ok: true, 
        messageId: sentMsg.key.id,
        timestamp: sentMsg.messageTimestamp
      });
    } catch (err) {
      console.error(`Error sending image for ${accountId}:`, err);
      return res.status(500).json({ ok: false, error: err.message || 'internal_error' });
    }
  });

  // Send video message
  router.post('/message/send/video', upload.single('video'), async (req, res) => {
    const { to, caption, gifPlayback } = req.body || {};
    
    if (!to) {
      return res.status(400).json({ ok: false, error: 'to field is required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'video file is required' });
    }
    
    const socketInfo = socketManager.getSocket(accountId);
    if (!socketInfo || socketInfo.status !== 'connected') {
      return res.status(400).json({ 
        ok: false, 
        error: 'Account not connected',
        status: socketInfo?.status 
      });
    }
    
    try {
      const messageContent = {
        video: req.file.buffer,
        caption: caption || undefined,
        mimetype: req.file.mimetype,
        gifPlayback: gifPlayback === 'true' || gifPlayback === true
      };
      
      const sentMsg = await socketInfo.socket.sendMessage(to, messageContent);
      return res.status(200).json({ 
        ok: true, 
        messageId: sentMsg.key.id,
        timestamp: sentMsg.messageTimestamp
      });
    } catch (err) {
      console.error(`Error sending video for ${accountId}:`, err);
      return res.status(500).json({ ok: false, error: err.message || 'internal_error' });
    }
  });

  // Send audio message
  router.post('/message/send/audio', upload.single('audio'), async (req, res) => {
    const { to, ptt } = req.body || {};
    
    if (!to) {
      return res.status(400).json({ ok: false, error: 'to field is required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'audio file is required' });
    }
    
    const socketInfo = socketManager.getSocket(accountId);
    if (!socketInfo || socketInfo.status !== 'connected') {
      return res.status(400).json({ 
        ok: false, 
        error: 'Account not connected',
        status: socketInfo?.status 
      });
    }
    
    try {
      const messageContent = {
        audio: req.file.buffer,
        mimetype: req.file.mimetype,
        ptt: ptt === 'true' || ptt === true // Push-to-talk (voice message)
      };
      
      const sentMsg = await socketInfo.socket.sendMessage(to, messageContent);
      return res.status(200).json({ 
        ok: true, 
        messageId: sentMsg.key.id,
        timestamp: sentMsg.messageTimestamp
      });
    } catch (err) {
      console.error(`Error sending audio for ${accountId}:`, err);
      return res.status(500).json({ ok: false, error: err.message || 'internal_error' });
    }
  });

  // Send document message
  router.post('/message/send/document', upload.single('document'), async (req, res) => {
    const { to, caption, fileName } = req.body || {};
    
    if (!to) {
      return res.status(400).json({ ok: false, error: 'to field is required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'document file is required' });
    }
    
    const socketInfo = socketManager.getSocket(accountId);
    if (!socketInfo || socketInfo.status !== 'connected') {
      return res.status(400).json({ 
        ok: false, 
        error: 'Account not connected',
        status: socketInfo?.status 
      });
    }
    
    try {
      const messageContent = {
        document: req.file.buffer,
        caption: caption || undefined,
        mimetype: req.file.mimetype,
        fileName: fileName || req.file.originalname
      };
      
      const sentMsg = await socketInfo.socket.sendMessage(to, messageContent);
      return res.status(200).json({ 
        ok: true, 
        messageId: sentMsg.key.id,
        timestamp: sentMsg.messageTimestamp
      });
    } catch (err) {
      console.error(`Error sending document for ${accountId}:`, err);
      return res.status(500).json({ ok: false, error: err.message || 'internal_error' });
    }
  });

  // ============================================================================
  // MESSAGE REACTIONS & ACTIONS
  // ============================================================================

  // Send reaction to a message
  router.post('/message/react', async (req, res) => {
    const { chatId, messageId, emoji } = req.body || {};
    
    if (!chatId || !messageId) {
      return res.status(400).json({ 
        ok: false, 
        error: 'chatId and messageId are required' 
      });
    }
    
    const socketInfo = socketManager.getSocket(accountId);
    if (!socketInfo || socketInfo.status !== 'connected') {
      return res.status(400).json({ 
        ok: false, 
        error: 'Account not connected',
        status: socketInfo?.status 
      });
    }
    
    try {
      // Retrieve message from database to get complete key with fromMe field
      const messagesCollection = db.collection('messages');
      const originalMsg = await messagesCollection.findOne({ 
        messageId,
        chatId,
        accountId 
      });
      
      if (!originalMsg) {
        return res.status(404).json({ 
          ok: false, 
          error: 'Message not found in database' 
        });
      }
      
      const reactionMessage = {
        react: {
          text: emoji || '', // Empty string removes reaction
          key: {
            remoteJid: chatId,
            id: messageId,
            fromMe: originalMsg.fromMe
          }
        }
      };
      
      const sentMsg = await socketInfo.socket.sendMessage(chatId, reactionMessage);
      return res.status(200).json({ 
        ok: true,
        messageId: sentMsg.key.id
      });
    } catch (err) {
      console.error(`Error sending reaction for ${accountId}:`, err);
      return res.status(500).json({ ok: false, error: err.message || 'internal_error' });
    }
  });

  // Delete a message
  router.post('/message/delete', async (req, res) => {
    const { chatId, messageId } = req.body || {};
    
    if (!chatId || !messageId) {
      return res.status(400).json({ 
        ok: false, 
        error: 'chatId and messageId are required' 
      });
    }
    
    const socketInfo = socketManager.getSocket(accountId);
    if (!socketInfo || socketInfo.status !== 'connected') {
      return res.status(400).json({ 
        ok: false, 
        error: 'Account not connected',
        status: socketInfo?.status 
      });
    }
    
    try {
      await socketInfo.socket.sendMessage(chatId, { 
        delete: {
          remoteJid: chatId,
          id: messageId,
          fromMe: true
        }
      });
      
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error(`Error deleting message for ${accountId}:`, err);
      return res.status(500).json({ ok: false, error: err.message || 'internal_error' });
    }
  });

  // ============================================================================
  // MEDIA RETRIEVAL ENDPOINTS
  // ============================================================================

  // Get media for a message
  router.get('/messages/:messageId/media', async (req, res) => {
    try {
      const { messageId } = req.params;
      const messagesCollection = db.collection('messages');
      
      // Find message
      const message = await messagesCollection.findOne({ 
        messageId,
        accountId 
      });
      
      if (!message) {
        return res.status(404).json({ ok: false, error: 'Message not found' });
      }
      
      if (!message.hasMedia || !message.mediaGridFsId) {
        return res.status(404).json({ ok: false, error: 'Message has no media' });
      }
      
      // Retrieve media from GridFS
      const { stream, metadata } = await mediaHandler.getMedia(message.mediaGridFsId);
      
      // Set content type and headers
      res.setHeader('Content-Type', metadata.contentType || 'application/octet-stream');
      res.setHeader('Content-Length', metadata.length);
      
      if (metadata.fileName) {
        res.setHeader('Content-Disposition', `inline; filename="${metadata.fileName}"`);
      }
      
      // Stream media to response
      stream.pipe(res);
      
    } catch (err) {
      console.error(`Error retrieving media for ${accountId}:`, err);
      return res.status(500).json({ ok: false, error: err.message || 'internal_error' });
    }
  });

  // ============================================================================
  // MESSAGE RETRIEVAL ENDPOINTS (for CRM integration)
  // ============================================================================

  // Get single message by ID
  router.get('/messages/:messageId', async (req, res) => {
    try {
      const { messageId } = req.params;
      const messagesCollection = db.collection('messages');
      
      const message = await messagesCollection.findOne({ 
        messageId,
        accountId 
      });
      
      if (!message) {
        return res.status(404).json({ ok: false, error: 'Message not found' });
      }
      
      // Remove internal MongoDB _id from response
      delete message._id;
      
      return res.status(200).json({ ok: true, message });
      
    } catch (err) {
      console.error(`Error retrieving message for ${accountId}:`, err);
      return res.status(500).json({ ok: false, error: err.message || 'internal_error' });
    }
  });

  // Get all messages for a chat
  router.get('/chats/:chatId/messages', async (req, res) => {
    try {
      const { chatId } = req.params;
      const { limit = 50, offset = 0, before, after } = req.query;
      
      const messagesCollection = db.collection('messages');
      
      // Build query
      const query = { 
        accountId,
        chatId
      };
      
      // Add timestamp filters if provided
      if (before) {
        query.timestamp = { $lt: parseInt(before) };
      }
      if (after) {
        query.timestamp = { ...query.timestamp, $gt: parseInt(after) };
      }
      
      // Get messages with pagination
      const messages = await messagesCollection
        .find(query)
        .sort({ timestamp: -1 })
        .skip(parseInt(offset))
        .limit(parseInt(limit))
        .toArray();
      
      // Get total count
      const total = await messagesCollection.countDocuments(query);
      
      // Remove internal MongoDB _id from responses
      messages.forEach(msg => delete msg._id);
      
      return res.status(200).json({ 
        ok: true, 
        messages,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: total > (parseInt(offset) + messages.length)
        }
      });
      
    } catch (err) {
      console.error(`Error retrieving messages for ${accountId}:`, err);
      return res.status(500).json({ ok: false, error: err.message || 'internal_error' });
    }
  });

  // Get all chats for account
  router.get('/chats', async (req, res) => {
    try {
      const messagesCollection = db.collection('messages');
      
      // Aggregate to get unique chats with last message
      const chats = await messagesCollection.aggregate([
        { $match: { accountId } },
        { $sort: { timestamp: -1 } },
        {
          $group: {
            _id: '$chatId',
            lastMessage: { $first: '$$ROOT' },
            messageCount: { $sum: 1 },
            lastTimestamp: { $first: '$timestamp' }
          }
        },
        { $sort: { lastTimestamp: -1 } }
      ]).toArray();
      
      // Format response
      const formattedChats = chats.map(chat => ({
        chatId: chat._id,
        messageCount: chat.messageCount,
        lastMessage: {
          messageId: chat.lastMessage.messageId,
          text: chat.lastMessage.text,
          type: chat.lastMessage.type,
          timestamp: chat.lastMessage.timestamp,
          fromMe: chat.lastMessage.fromMe
        }
      }));
      
      return res.status(200).json({ 
        ok: true, 
        chats: formattedChats 
      });
      
    } catch (err) {
      console.error(`Error retrieving chats for ${accountId}:`, err);
      return res.status(500).json({ ok: false, error: err.message || 'internal_error' });
    }
  });

  // ============================================================================
  // ACCOUNT STATUS & CONTROL ENDPOINTS
  // ============================================================================

  // Get status for this account
  router.get('/status', async (req, res) => {
    const socketInfo = socketManager.getSocket(accountId);
    if (!socketInfo) {
      return res.status(404).json({ ok: false, error: 'Account not found or not started' });
    }
    return res.status(200).json({ 
      ok: true, 
      accountId, 
      status: socketInfo.status, 
      qr: socketInfo.qr,
      collection: socketInfo.collection
    });
  });

  // Start/restart connection
  router.post('/connect', async (req, res) => {
    try {
      const socketInfo = await socketManager.createSocket(accountId);
      return res.status(200).json({ 
        ok: true, 
        accountId, 
        status: socketInfo.status,
        message: 'Connection initiated. Check /accounts/' + accountId + '/status for QR code'
      });
    } catch (err) {
      console.error(`Error connecting ${accountId}:`, err);
      return res.status(500).json({ ok: false, error: 'Failed to connect' });
    }
  });

  // Disconnect/logout
  router.post('/disconnect', async (req, res) => {
    try {
      await socketManager.removeSocket(accountId);
      return res.status(200).json({ ok: true, message: 'Account disconnected' });
    } catch (err) {
      console.error(`Error disconnecting ${accountId}:`, err);
      return res.status(500).json({ ok: false, error: 'Failed to disconnect' });
    }
  });

  return router;
}

module.exports = { createAccountRouter };

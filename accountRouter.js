const express = require('express');
const multer = require('multer');
const { connectToDB } = require('./db');
const MediaHandler = require('./mediaHandler.new.js');
const audioConverter = require('./audioConverter');

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
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Load a quoted message for reply functionality
   * Tries socket store first, then DB with rawMessage, then constructs from DB fields
   */
  async function loadQuotedMessage(socketInfo, quotedMessageId, chatId) {
    try {
      // First try to load from socket's message store
      let quotedMsg = null;
      try {
        quotedMsg = await socketInfo.socket.loadMessage(chatId, quotedMessageId);
      } catch (socketErr) {
        // Socket loadMessage can throw errors - ignore and fallback to DB
        console.log(`[QUOTE] Socket loadMessage failed, will try DB: ${socketErr.message}`);
      }
      
      if (quotedMsg) {
        console.log(`[QUOTE] Loaded from socket store: ${quotedMessageId}`);
        return quotedMsg;
      }

      // Fallback: get raw message from DB
      console.log(`[QUOTE] Socket store miss, trying DB: ${quotedMessageId}`);
      
      if (!db) {
        console.error(`[QUOTE] DB not initialized yet, connecting now...`);
        db = await connectToDB();
      }
      
      const messagesCollection = db.collection('messages');
      const dbMsg = await messagesCollection.findOne({ 
        messageId: quotedMessageId,
        accountId: accountId 
      });
      
      if (!dbMsg) {
        console.warn(`[QUOTE] Message not found in DB: ${quotedMessageId}`);
        return null;
      }

      if (dbMsg.rawMessage) {
        // Sanitize the rawMessage - only include essential fields
        // and fix empty participant strings
        const participant = dbMsg.rawMessage.key.participant && dbMsg.rawMessage.key.participant.trim() 
          ? dbMsg.rawMessage.key.participant 
          : undefined;
        
        const sanitizedQuote = {
          key: {
            remoteJid: dbMsg.rawMessage.key.remoteJid,
            id: dbMsg.rawMessage.key.id,
            fromMe: dbMsg.rawMessage.key.fromMe,
            participant: participant
          },
          message: dbMsg.rawMessage.message,
          messageTimestamp: dbMsg.rawMessage.messageTimestamp
        };
        
        console.log(`[QUOTE] Using sanitized rawMessage from DB: ${quotedMessageId}`);
        return sanitizedQuote;
      }

      // Last fallback: construct from DB fields
      console.log(`[QUOTE] No rawMessage, constructing from DB fields: ${quotedMessageId}`);
      return {
        key: {
          remoteJid: dbMsg.chatId,
          id: dbMsg.messageId,
          fromMe: dbMsg.fromMe,
          participant: dbMsg.fromMe ? undefined : dbMsg.from
        },
        message: {
          conversation: dbMsg.text || ''
        },
        messageTimestamp: dbMsg.timestamp
      };

    } catch (err) {
      console.error(`[QUOTE] Error loading quoted message ${quotedMessageId}:`, err.message);
      return null;
    }
  }

  /**
   * Store a sent message in the database
   * Called after successfully sending a message via API
   */
  async function storeSentMessage(sentMsg, messageType, additionalData = {}) {
    try {
      // Ensure DB is initialized
      if (!db) {
        db = await connectToDB();
      }
      
      const messagesCollection = db.collection('messages');
      
      // Extract basic message info
      const messageId = sentMsg.key.id;
      const chatId = sentMsg.key.remoteJid;
      const timestamp = sentMsg.messageTimestamp?.low || Math.floor(Date.now() / 1000);
      
      // Determine message type and extract content
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
        // Media URL will be set when the message is received back via upsert
      }
      
      // Build message document
      const messageDoc = {
        accountId,
        messageId,
        chatId,
        from: chatId, // For sent messages, 'from' is the recipient
        fromMe: true,
        timestamp,
        type: messageType,
        text: textContent,
        caption,
        hasMedia,
        mediaUrl,
        mediaType,
        
        // Quote context
        quotedMessage: additionalData.quotedMessage || null,
        mentions: additionalData.mentions || [],
        
        // Store raw message for future operations
        rawMessage: sentMsg,
        
        // Timestamps
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Store in MongoDB
      await messagesCollection.insertOne(messageDoc);
      console.log(`[STORE] Stored sent ${messageType} message ${messageId}`);
      
      return true;
    } catch (err) {
      console.error(`[STORE] Failed to store sent message:`, err.message);
      return false;
    }
  }

  // ============================================================================
  // SEND MESSAGE ENDPOINTS
  // ============================================================================

  // Reply to a message (dedicated endpoint for cleaner reply handling)
  router.post('/message/reply', async (req, res) => {
    const { to, message, quotedMessageId, mentions } = req.body || {};
    
    if (!to || !message || !quotedMessageId) {
      return res.status(400).json({
        ok: false,
        error: 'to, message, and quotedMessageId are required'
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
      // Load the quoted message
      const quotedMsg = await loadQuotedMessage(socketInfo, quotedMessageId, to);
      
      if (!quotedMsg) {
        return res.status(404).json({
          ok: false,
          error: 'Quoted message not found'
        });
      }
      
      // Build message content
      const messageContent = { text: message };
      
      // Add mentions if provided
      if (mentions && Array.isArray(mentions) && mentions.length > 0) {
        messageContent.mentions = mentions;
      }
      
      // Send with quoted message
      const sentMsg = await socketInfo.socket.sendMessage(to, messageContent, { quoted: quotedMsg });
      
      // Store the sent message in database
      await storeSentMessage(sentMsg, 'text', { text: message, mentions, quotedMessage: quotedMessageId });
      
      return res.status(200).json({ 
        ok: true, 
        messageId: sentMsg.key.id,
        timestamp: sentMsg.messageTimestamp
      });
    } catch (err) {
      console.error(`Error sending reply for ${accountId}:`, err);
      return res.status(500).json({ ok: false, error: err.message || 'internal_error' });
    }
  });

  // Send text message (simple, no quote support - use /message/reply for replies)
  router.post('/message/send', async (req, res) => {
    const { to, message, mentions } = req.body || {};
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
      
      // Add mentions if provided
      if (mentions && Array.isArray(mentions) && mentions.length > 0) {
        messageContent.mentions = mentions;
      }
      
      const sentMsg = await socketInfo.socket.sendMessage(to, messageContent);
      
      // Store the sent message in database
      await storeSentMessage(sentMsg, 'text', { text: message, mentions });
      
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
    const { to, caption, quotedMessageId } = req.body || {};
    
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
      
      // Build send options (for quoted message)
      const sendOptions = {};
      
      // Add quoted message if provided (as option, not in content)
      if (quotedMessageId) {
        try {
          // First try to load from socket's message store
          const quotedMsg = await socketInfo.socket.loadMessage(to, quotedMessageId);
          
          if (quotedMsg) {
            sendOptions.quoted = quotedMsg;
          } else {
            // Fallback: get raw message from DB
            console.warn(`Could not load quoted message ${quotedMessageId} from socket store, trying DB...`);
            const messagesCollection = db.collection('messages');
            const dbMsg = await messagesCollection.findOne({ 
              messageId: quotedMessageId,
              accountId 
            });
            
            if (dbMsg && dbMsg.rawMessage) {
              // Use the stored raw Baileys message object
              sendOptions.quoted = dbMsg.rawMessage;
            } else if (dbMsg) {
              // Last fallback: construct from DB fields
              console.warn(`No rawMessage found for ${quotedMessageId}, constructing from DB fields...`);
              sendOptions.quoted = {
                key: {
                  remoteJid: dbMsg.chatId,
                  id: dbMsg.messageId,
                  fromMe: dbMsg.fromMe,
                  participant: dbMsg.fromMe ? undefined : dbMsg.from
                },
                message: {
                  conversation: dbMsg.text || ''
                },
                messageTimestamp: dbMsg.timestamp
              };
            }
          }
        } catch (quoteErr) {
          console.error(`Error loading quoted message ${quotedMessageId}:`, quoteErr.message);
          // Continue without quote if it fails
        }
      }
      
      const sentMsg = await socketInfo.socket.sendMessage(to, messageContent, sendOptions);
      
      // Store the sent message in database
      await storeSentMessage(sentMsg, 'image', { caption });
      
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
    const { to, caption, gifPlayback, quotedMessageId } = req.body || {};
    
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
      
      // Build send options (for quoted message)
      const sendOptions = {};
      
      // Add quoted message if provided (as option, not in content)
      if (quotedMessageId) {
        try {
          // First try to load from socket's message store
          const quotedMsg = await socketInfo.socket.loadMessage(to, quotedMessageId);
          
          if (quotedMsg) {
            sendOptions.quoted = quotedMsg;
          } else {
            // Fallback: get raw message from DB
            console.warn(`Could not load quoted message ${quotedMessageId} from socket store, trying DB...`);
            const messagesCollection = db.collection('messages');
            const dbMsg = await messagesCollection.findOne({ 
              messageId: quotedMessageId,
              accountId 
            });
            
            if (dbMsg && dbMsg.rawMessage) {
              // Use the stored raw Baileys message object
              sendOptions.quoted = dbMsg.rawMessage;
            } else if (dbMsg) {
              // Last fallback: construct from DB fields
              console.warn(`No rawMessage found for ${quotedMessageId}, constructing from DB fields...`);
              sendOptions.quoted = {
                key: {
                  remoteJid: dbMsg.chatId,
                  id: dbMsg.messageId,
                  fromMe: dbMsg.fromMe,
                  participant: dbMsg.fromMe ? undefined : dbMsg.from
                },
                message: {
                  conversation: dbMsg.text || ''
                },
                messageTimestamp: dbMsg.timestamp
              };
            }
          }
        } catch (quoteErr) {
          console.error(`Error loading quoted message ${quotedMessageId}:`, quoteErr.message);
          // Continue without quote if it fails
        }
      }
      
      const sentMsg = await socketInfo.socket.sendMessage(to, messageContent, sendOptions);
      
      // Store the sent message in database
      await storeSentMessage(sentMsg, 'video', { caption });
      
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
    const { to, ptt, quotedMessageId } = req.body || {};
    
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
      // Convert audio to OGG/Opus format for WhatsApp compatibility
      let audioBuffer = req.file.buffer;
      let mimetype = 'audio/ogg; codecs=opus';
      const isPtt = ptt === 'true' || ptt === true;
      
      if (audioConverter.needsConversion(req.file.mimetype)) {
        try {
          // Pass isPtt to converter for voice-optimized encoding
          audioBuffer = await audioConverter.convertToOggOpus(req.file.buffer, req.file.mimetype, isPtt);
        } catch (conversionErr) {
          console.error(`Audio conversion failed for ${accountId}, sending original:`, conversionErr.message);
          // Fallback to original if conversion fails
          audioBuffer = req.file.buffer;
          mimetype = req.file.mimetype;
        }
      }
      
      const messageContent = {
        audio: audioBuffer,
        mimetype: mimetype,
        ptt: isPtt // Push-to-talk (voice message)
      };
      
      // Build send options (for quoted message)
      const sendOptions = {};
      
      // Add quoted message if provided (as option, not in content)
      if (quotedMessageId) {
        try {
          // First try to load from socket's message store
          const quotedMsg = await socketInfo.socket.loadMessage(to, quotedMessageId);
          
          if (quotedMsg) {
            sendOptions.quoted = quotedMsg;
          } else {
            // Fallback: get raw message from DB
            console.warn(`Could not load quoted message ${quotedMessageId} from socket store, trying DB...`);
            const messagesCollection = db.collection('messages');
            const dbMsg = await messagesCollection.findOne({ 
              messageId: quotedMessageId,
              accountId 
            });
            
            if (dbMsg && dbMsg.rawMessage) {
              // Use the stored raw Baileys message object
              sendOptions.quoted = dbMsg.rawMessage;
            } else if (dbMsg) {
              // Last fallback: construct from DB fields
              console.warn(`No rawMessage found for ${quotedMessageId}, constructing from DB fields...`);
              sendOptions.quoted = {
                key: {
                  remoteJid: dbMsg.chatId,
                  id: dbMsg.messageId,
                  fromMe: dbMsg.fromMe,
                  participant: dbMsg.fromMe ? undefined : dbMsg.from
                },
                message: {
                  conversation: dbMsg.text || ''
                },
                messageTimestamp: dbMsg.timestamp
              };
            }
          }
        } catch (quoteErr) {
          console.error(`Error loading quoted message ${quotedMessageId}:`, quoteErr.message);
          // Continue without quote if it fails
        }
      }
      
      const sentMsg = await socketInfo.socket.sendMessage(to, messageContent, sendOptions);
      
      // Store the sent message in database
      await storeSentMessage(sentMsg, 'audio', {});
      
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
    const { to, caption, fileName, quotedMessageId } = req.body || {};
    
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
      
      // Build send options (for quoted message)
      const sendOptions = {};
      
      // Add quoted message if provided (as option, not in content)
      if (quotedMessageId) {
        try {
          // First try to load from socket's message store
          const quotedMsg = await socketInfo.socket.loadMessage(to, quotedMessageId);
          
          if (quotedMsg) {
            sendOptions.quoted = quotedMsg;
          } else {
            // Fallback: get raw message from DB
            console.warn(`Could not load quoted message ${quotedMessageId} from socket store, trying DB...`);
            const messagesCollection = db.collection('messages');
            const dbMsg = await messagesCollection.findOne({ 
              messageId: quotedMessageId,
              accountId 
            });
            
            if (dbMsg && dbMsg.rawMessage) {
              // Use the stored raw Baileys message object
              sendOptions.quoted = dbMsg.rawMessage;
            } else if (dbMsg) {
              // Last fallback: construct from DB fields
              console.warn(`No rawMessage found for ${quotedMessageId}, constructing from DB fields...`);
              sendOptions.quoted = {
                key: {
                  remoteJid: dbMsg.chatId,
                  id: dbMsg.messageId,
                  fromMe: dbMsg.fromMe,
                  participant: dbMsg.fromMe ? undefined : dbMsg.from
                },
                message: {
                  conversation: dbMsg.text || ''
                },
                messageTimestamp: dbMsg.timestamp
              };
            }
          }
        } catch (quoteErr) {
          console.error(`Error loading quoted message ${quotedMessageId}:`, quoteErr.message);
          // Continue without quote if it fails
        }
      }
      
      const sentMsg = await socketInfo.socket.sendMessage(to, messageContent, sendOptions);
      
      // Store the sent message in database
      await storeSentMessage(sentMsg, 'document', { caption });
      
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
      
      // Store the sent message in database
      await storeSentMessage(sentMsg, 'text', {});
      
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

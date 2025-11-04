const { DisconnectReason } = require("@whiskeysockets/baileys");
const makeWASocket = require("@whiskeysockets/baileys").default;
const useMongoDBAuthState = require("./mongoAuthState");
const qrcode = require("qrcode-terminal");
const { connectToDB } = require("./db");
const { wireSocketLogging } = require("./logger");
const MediaHandler = require("./mediaHandler");

class SocketManager {
  constructor() {
    this.sockets = new Map(); // accountId -> { socket, status, qr, collection, etc. }
    this.db = null;
    this.mediaHandler = null;
  }

  async init() {
    this.db = await connectToDB();
    this.mediaHandler = new MediaHandler(this.db);
  }

  async createSocket(accountId, collectionName) {
    // Use custom collection per account
    const collName = collectionName || `auth_${accountId}`;
    
    if (this.sockets.has(accountId)) {
      return this.sockets.get(accountId);
    }

    const collection = this.db.collection(collName);
    const { state, saveCreds } = await useMongoDBAuthState(collection);
    const sock = makeWASocket({
      auth: state,
      syncFullHistory: true,
    });
    wireSocketLogging(sock);

    const socketInfo = {
      socket: sock,
      status: 'connecting',
      qr: null,
      lastDisconnect: null,
      collection: collName,
    };

    this.sockets.set(accountId, socketInfo);

    // Handle connection updates
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update || {};
      if (connection) {
        socketInfo.status = connection;
      }
      socketInfo.lastDisconnect = lastDisconnect;
      socketInfo.qr = qr;

      if (qr) {
        console.log(`\n=== QR Code for account: ${accountId} ===`);
        qrcode.generate(qr, { small: true });
        console.log(`=== Scan with WhatsApp to connect ===\n`);
      }

      if (connection === "close") {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) {
          // Remove old socket and reconnect
          this.sockets.delete(accountId);
          console.log(`Reconnecting account ${accountId} in 5 seconds...`);
          setTimeout(() => this.createSocket(accountId, collName), 5000);
        } else {
          socketInfo.status = 'logged_out';
          console.log(`Account ${accountId} logged out.`);
        }
      } else if (connection === 'open') {
        socketInfo.status = 'connected';
        console.log(`Account ${accountId} connected successfully!`);
      }
    });

    sock.ev.on("creds.update", saveCreds);

    // Handle messages per account with media and context support
    sock.ev.on("messages.upsert", async (messageInfoUpsert) => {
      if (messageInfoUpsert.type === "notify") {
        const messages = messageInfoUpsert.messages;
        const messagesCollection = this.db.collection("messages");

        // Process each message
        for (const msg of messages) {
          try {
            // Extract text content
            const textContent = this._extractTextContent(msg);
            
            // Check for media
            const hasMedia = this.mediaHandler.hasMedia(msg);
            let mediaInfo = null;

            if (hasMedia) {
              try {
                // Download and store media
                mediaInfo = await this.mediaHandler.downloadAndStoreMedia(
                  msg,
                  accountId,
                  sock.updateMediaMessage
                );
                console.log(`Media stored for message ${msg.key.id}: ${mediaInfo.mediaType}`);
              } catch (err) {
                console.error(`Failed to download media for ${msg.key.id}:`, err.message);
              }
            }

            // Extract message context (replies, mentions)
            const quotedMessage = this.mediaHandler.extractQuotedMessage(msg);
            const mentions = this.mediaHandler.extractMentions(msg);

            // Build enhanced message document
            const messageDoc = {
              accountId,
              messageId: msg.key.id,
              chatId: msg.key.remoteJid,
              from: msg.key.remoteJid,
              fromMe: msg.key.fromMe,
              timestamp: msg.messageTimestamp,
              
              // Message type and content
              type: mediaInfo ? mediaInfo.mediaType : 'text',
              text: textContent,
              
              // Media information
              hasMedia,
              ...(mediaInfo && {
                mediaType: mediaInfo.mediaType,
                mediaGridFsId: mediaInfo.gridFsId.toString(),
                mediaUrl: this.mediaHandler.getMediaUrl(accountId, msg.key.id),
                mediaSize: mediaInfo.size,
                mediaMimetype: mediaInfo.mimetype,
                mediaFileName: mediaInfo.fileName,
                caption: mediaInfo.caption,
                mediaWidth: mediaInfo.width,
                mediaHeight: mediaInfo.height,
              }),
              
              // Message context
              quotedMessage,
              mentions,
              
              // Additional metadata
              isForwarded: msg.message?.extendedTextMessage?.contextInfo?.isForwarded || false,
              
              // Store raw Baileys message for reply functionality
              rawMessage: msg,
              
              // Timestamps
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Store in MongoDB
            await messagesCollection.insertOne(messageDoc);

            // Send webhooks
            const { sendToWebhook } = require("./webhookHandler");
            const webhooksCollection = this.db.collection("webhooks");
            const webhooks = await webhooksCollection.find({}).toArray();
            
            // Prepare webhook payload
            const webhookPayload = {
              accountId,
              messageId: msg.key.id,
              chatId: msg.key.remoteJid,
              from: msg.key.remoteJid,
              fromMe: msg.key.fromMe,
              timestamp: msg.messageTimestamp,
              type: messageDoc.type,
              text: textContent,
              hasMedia,
              mediaUrl: mediaInfo ? messageDoc.mediaUrl : null,
              mediaType: mediaInfo ? mediaInfo.mediaType : null,
              quotedMessage,
              mentions,
              createdAt: messageDoc.createdAt,
            };

            // Send to all registered webhooks
            for (const webhook of webhooks) {
              const result = await sendToWebhook(webhook.url, webhookPayload);
              if (!result.ok) {
                console.error(`Failed to send message to webhook ${webhook.url}:`, result.error);
              }
            }

          } catch (err) {
            console.error(`Error processing message ${msg.key.id}:`, err);
          }
        }
      }
    });

    return socketInfo;
  }

  getSocket(accountId) {
    return this.sockets.get(accountId);
  }

  getAllSockets() {
    return Array.from(this.sockets.entries()).map(([id, info]) => ({ 
      id, 
      status: info.status, 
      qr: info.qr,
      collection: info.collection
    }));
  }

  async removeSocket(accountId) {
    const info = this.sockets.get(accountId);
    if (info) {
      try {
        await info.socket.logout();
      } catch (e) {
        console.error(`Error logging out ${accountId}:`, e);
      }
      this.sockets.delete(accountId);
    }
  }

  async deleteAccountData(accountId) {
    const info = this.sockets.get(accountId);
    if (info) {
      // Delete the entire collection for this account
      await this.db.collection(info.collection).drop();
    }
  }

  /**
   * Extract text content from Baileys message
   * @private
   */
  _extractTextContent(message) {
    const msg = message.message;
    if (!msg) return null;

    // Plain text conversation
    if (msg.conversation) return msg.conversation;
    
    // Extended text message
    if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
    
    // Media with caption
    if (msg.imageMessage?.caption) return msg.imageMessage.caption;
    if (msg.videoMessage?.caption) return msg.videoMessage.caption;
    if (msg.documentMessage?.caption) return msg.documentMessage.caption;
    
    return null;
  }
}

module.exports = SocketManager;

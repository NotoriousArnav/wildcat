const { DisconnectReason } = require('@whiskeysockets/baileys');
const makeWASocket = require('@whiskeysockets/baileys').default;
const useMongoDBAuthState = require('./mongoAuthState');
const qrcode = require('qrcode-terminal');
const { connectToDB } = require('./db');
const { wireSocketLogging, appLogger } = require('./logger');
const MediaHandler = require('./mediaHandler');
const socketLog = appLogger('socket');

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

    // Connection lifecycle
    sock.ev.on('connection.update', async (update = {}) => {
      const { connection, lastDisconnect, qr } = update;
      if (connection) socketInfo.status = connection;
      socketInfo.lastDisconnect = lastDisconnect;
      socketInfo.qr = qr;

      const accountsCol = this.db.collection('accounts');

      if (qr) {
        // Keep terminal friendly QR while also structured log
        console.log(`\n=== QR Code for account: ${accountId} ===`);
        qrcode.generate(qr, { small: true });
        console.log('=== Scan with WhatsApp to connect ===\n');
        socketLog.info('qr_generated', { accountId });
      }

      if (connection === 'close') {
        const loggedOut = lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut;
        if (!loggedOut) {
          this.sockets.delete(accountId);
          socketLog.info('reconnecting_account', { accountId, delaySeconds: 5 });
          try {
            const res1 = await accountsCol.updateOne({ _id: { $eq: accountId } }, { $set: { status: 'reconnecting', updatedAt: new Date() } });
            socketLog.info('account_status_updated', { accountId, status: 'reconnecting', modifiedCount: res1.modifiedCount });
          } catch (err) {
            socketLog.error('account_status_update_failed', { accountId, status: 'reconnecting', error: err && err.message });
          }
          setTimeout(() => this.createSocket(accountId, collName), 5000);
        } else {
          socketInfo.status = 'logged_out';
          socketLog.info('account_logged_out', { accountId });
          try {
            const res2 = await accountsCol.updateOne({ _id: { $eq: accountId } }, { $set: { status: 'logged_out', updatedAt: new Date() } });
            socketLog.info('account_status_updated', { accountId, status: 'logged_out', modifiedCount: res2.modifiedCount });
          } catch (err) {
            socketLog.error('account_status_update_failed', { accountId, status: 'logged_out', error: err && err.message });
          }
        }
      } else if (connection === 'open') {
        socketInfo.status = 'connected';
        socketLog.info('account_connected', { accountId });
        try {
          const res3 = await accountsCol.updateOne({ _id: { $eq: accountId } }, { $set: { status: 'connected', updatedAt: new Date() } });
          socketLog.info('account_status_updated', { accountId, status: 'connected', modifiedCount: res3.modifiedCount });
        } catch (err) {
          socketLog.error('account_status_update_failed', { accountId, status: 'connected', error: err && err.message });
        }
        if (process.env.ADMIN_NUMBER) {
          try {
            await sock.sendMessage(process.env.ADMIN_NUMBER, { text: `\u2705 Account ${accountId} connected successfully!` });
          } catch (notifyErr) {
            socketLog.error('admin_notify_failed', { accountId, error: notifyErr.message });
          }
        }
      } else if (connection === 'connecting') {
        try {
          const res4 = await accountsCol.updateOne({ _id: { $eq: accountId } }, { $set: { status: 'connecting', updatedAt: new Date() } });
          socketLog.info('account_status_updated', { accountId, status: 'connecting', modifiedCount: res4.modifiedCount });
        } catch (err) {
          socketLog.error('account_status_update_failed', { accountId, status: 'connecting', error: err && err.message });
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);

    // Per-account message handling
    sock.ev.on('messages.upsert', async (messageInfoUpsert) => {
      if (messageInfoUpsert.type !== 'notify') return;
      const messages = messageInfoUpsert.messages || [];
      const messagesCollection = this.db.collection('messages');

      for (const msg of messages) {
        try {
          const textContent = this._extractTextContent(msg);
          const hasMedia = this.mediaHandler.hasMedia(msg);
          let mediaInfo = null;

          if (hasMedia) {
            try {
              mediaInfo = await this.mediaHandler.downloadAndStoreMedia(
                msg,
                accountId,
                sock.updateMediaMessage,
              );
              socketLog.info('media_stored', { accountId, messageId: msg.key.id, mediaType: mediaInfo.mediaType });
            } catch (err) {
              socketLog.error('media_download_failed', { accountId, messageId: msg.key.id, error: err.message });
            }
          }

          const quotedMessage = this.mediaHandler.extractQuotedMessage(msg);
          const mentions = this.mediaHandler.extractMentions(msg);

          const messageDoc = {
            accountId,
            messageId: msg.key.id,
            chatId: msg.key.remoteJid,
            from: msg.key.remoteJid,
            fromMe: msg.key.fromMe,
            timestamp: msg.messageTimestamp,
            type: mediaInfo ? mediaInfo.mediaType : 'text',
            text: textContent,
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
            quotedMessage,
            mentions,
            isForwarded: msg.message?.extendedTextMessage?.contextInfo?.isForwarded || false,
            rawMessage: msg,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await messagesCollection.insertOne(messageDoc);

          // Webhooks
          const { sendToWebhook } = require('./webhookHandler');
          const webhooksCollection = this.db.collection('webhooks');
          const webhooks = await webhooksCollection.find({}).toArray();
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
          for (const webhook of webhooks) {
            const result = await sendToWebhook(webhook.url, webhookPayload);
            if (!result.ok) {
              let redactedUrl = '<redacted>';
              try {
                const parsed = new URL(webhook.url);
                redactedUrl = `${parsed.protocol}//${parsed.hostname}${parsed.port ? ':' + parsed.port : ''}${parsed.pathname}`;
              } catch (_) {}
              socketLog.error('webhook_send_failed', { accountId, webhook: redactedUrl, error: result.error });
            }
          }
        } catch (err) {
          socketLog.error('message_processing_error', { accountId, messageId: msg.key?.id, error: err.message });
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
      collection: info.collection,
    }));
  }

  async removeSocket(accountId) {
    const info = this.sockets.get(accountId);
    if (info) {
      try {
        await info.socket.logout();
      } catch (e) {
        socketLog.error('logout_error', { accountId, error: e.message });
      }
      this.sockets.delete(accountId);
    }
  }

  async deleteAccountData(accountId) {
    const info = this.sockets.get(accountId);
    if (info) {
      await this.db.collection(info.collection).drop();
    }
  }

  // Extract text content from Baileys message
  _extractTextContent(message) {
    const msg = message.message;
    if (!msg) return null;
    if (msg.conversation) return msg.conversation;
    if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
    if (msg.imageMessage?.caption) return msg.imageMessage.caption;
    if (msg.videoMessage?.caption) return msg.videoMessage.caption;
    if (msg.documentMessage?.caption) return msg.documentMessage.caption;
    return null;
  }
}

module.exports = SocketManager;

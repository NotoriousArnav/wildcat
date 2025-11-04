const { DisconnectReason } = require("@whiskeysockets/baileys");
const makeWASocket = require("@whiskeysockets/baileys").default;
const useMongoDBAuthState = require("./mongoAuthState");
const qrcode = require("qrcode-terminal");
const { connectToDB } = require("./db");
const { wireSocketLogging } = require("./logger");

class SocketManager {
  constructor() {
    this.sockets = new Map(); // accountId -> { socket, status, qr, collection, etc. }
    this.db = null;
  }

  async init() {
    this.db = await connectToDB();
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

    // Handle messages per account
    sock.ev.on("messages.upsert", async (messageInfoUpsert) => {
      if (messageInfoUpsert.type === "notify") {
        const messages = messageInfoUpsert.messages;

        // Store messages with accountId
        const messagesCollection = this.db.collection("messages");
        messages.forEach(async (msg) => {
          await messagesCollection.insertOne({
            accountId,
            id: msg.key.id,
            from: msg.key.remoteJid,
            to: msg.key.remoteJid, // The JID this message is associated with
            message: msg.message,
            timestamp: msg.messageTimestamp,
            fromMe: msg.key.fromMe,
            createdAt: new Date(),
          });
        });

        // Webhooks (global)
        const { sendToWebhook } = require("./webhookHandler");
        messages.forEach(async (msg) => {
          if (!msg.key.fromMe && msg.message) {
            const payload = {
              accountId,
              id: msg.key.id,
              from: msg.key.remoteJid,
              to: msg.key.remoteJid, // The JID this message is associated with
              message: msg.message,
              timestamp: msg.messageTimestamp,
              fromMe: msg.key.fromMe,
            };
            const webhooksCollection = this.db.collection("webhooks");
            const webhooks = await webhooksCollection.find({}).toArray();
            for (const webhook of webhooks) {
              const result = await sendToWebhook(webhook.url, payload);
              if (!result.ok) {
                console.error(`Failed to send message to webhook ${webhook.url}:`, result.error);
              }
            }
          }
        });
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
}

module.exports = SocketManager;

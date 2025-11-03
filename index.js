require("dotenv").config();
const { DisconnectReason, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const makeWASocket = require("@whiskeysockets/baileys").default;
const useMongoDBAuthState = require("./mongoAuthState");
const qrcode = require("qrcode-terminal");

const { connectToDB } = require("./db");
const { startServer, makeApp, constructApp } = require("./server");
const { routes } = require("./routes");
const { sendToWebhook } = require("./webhookHandler");

async function connectionLogic() {
  const db = await connectToDB();
  const collection = db.collection("auth_info_baileys");
  const { state, saveCreds } = await useMongoDBAuthState(collection);
  const sock = makeWASocket({auth: state}); require("./logger").wireSocketLogging(sock);
  const app = constructApp(sock);

  makeApp(app, routes);

  // Handle Login and Reconnection
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update || {};
    if (qr) { qrcode.generate(qr, { small: true });}
    if (connection === "close") {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) { connectionLogic(); }
    }
  });

  sock.ev.on("creds.update", saveCreds); // Save credentials whenever updated

  sock.ev.on("messages.update", (messageInfo) => {}); // Listen for message updates

  // Listen for incoming messages
  sock.ev.on("messages.upsert", (messageInfoUpsert) => {
    if (messageInfoUpsert.type === "notify") {
      const messages = messageInfoUpsert.messages;

      // Make message history in DB
      const messagesCollection = db.collection("messages");
      messages.forEach(async (msg) => {
        await messagesCollection.insertOne({
          id: msg.key.id,
          from: msg.key.remoteJid,
          message: msg.message,
          timestamp: msg.messageTimestamp,
          fromMe: msg.key.fromMe,
        });
      });

      // Webhooks
      messages.forEach(async (msg) => {
        if (!msg.key.fromMe && msg.message) {
          // Send to webhook
          const payload = {
            id: msg.key.id,
            from: msg.key.remoteJid,
            message: msg.message,
            timestamp: msg.messageTimestamp,
          };
          // Fetch webhooks from DB
          const webhooksCollection = db.collection("webhooks");
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

  startServer(app);
}

connectionLogic(); // Start the connection logic
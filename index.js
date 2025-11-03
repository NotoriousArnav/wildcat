require("dotenv").config();
const { DisconnectReason, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const makeWASocket = require("@whiskeysockets/baileys").default;
const useMongoDBAuthState = require("./mongoAuthState");
const qrcode = require("qrcode-terminal");

const { connectToDB } = require("./db");

async function connectionLogic() {
  const db = await connectToDB();
  const collection = db.collection("auth_info_baileys");
  const { state, saveCreds } = await useMongoDBAuthState(collection);
  const sock = makeWASocket({auth: state});

  // Handle Login and Reconnection
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update || {};
    if (qr) { qrcode.generate(qr, { small: true });}
    if (connection === "close") {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) { connectionLogic(); }
    }
  });

  // Save credentials whenever updated
  sock.ev.on("creds.update", saveCreds);

  // Listen for message updates
  sock.ev.on("messages.update", (messageInfo) => {});

  // Listen for incoming messages
  sock.ev.on("messages.upsert", (messageInfoUpsert) => {
    const messages = messageInfoUpsert.messages;
    console.log(messages[0].message);
  });
}

// Start the connection logic
connectionLogic();

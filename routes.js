async function sendMessage(req, res, next) {
  const sock = req.app.locals.whatsapp_socket;
  const { to, message } = req.body || {};
  if (!to || !message) {
    return res.status(400).json({ ok: false, error: 'to and message are required' });
  }
  try {
    const sentMsg = await sock.sendMessage(to, { text: message });
    console.log(sentMsg);
    return res.status(200).json({ ok: true, messageId: sentMsg.key.id });
  } catch (err) {
    console.error('Error sending message:', err);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
}

module.exports = {
  routes: [
    {
      method: 'post',
      path: '/message/send',
      handler: sendMessage,
    },
    {
      method: 'get',
      path: '/ping',
      handler: (req, res) => {
        res.status(200).json({ ok: true, pong: true, time: new Date().toISOString() });
      },
    },
    {
      method: 'post',
      path: '/webhooks',
      handler: async (req, res) => {
        try {
          const { url } = req.body || {};
          if (!url || typeof url !== 'string') {
            return res.status(400).json({ ok: false, error: 'url is required and must be a string' });
          }
          let parsed;
          try {
            parsed = new URL(url);
          } catch (_) {
            return res.status(400).json({ ok: false, error: 'invalid URL' });
          }
          if (!/^https?:$/.test(parsed.protocol)) {
            return res.status(400).json({ ok: false, error: 'only http/https URLs are allowed' });
          }

          const { connectToDB } = require('./db');
          const db = await connectToDB();
          const collection = db.collection('webhooks');

          const now = new Date();
          const result = await collection.updateOne(
            { url },
            { $setOnInsert: { url, createdAt: now } },
            { upsert: true }
          );

          const created = result && (result.upsertedId != null || result.upsertedCount === 1);
          return res.status(created ? 201 : 200).json({ ok: true, url, created });
        } catch (err) {
          console.error('POST /webhooks error:', err);
          return res.status(500).json({ ok: false, error: 'internal_error' });
        }
      },
    },
  ]
};

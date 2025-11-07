const { ObjectId, GridFSBucket } = require('mongodb');
const { appLogger } = require('./logger');
const log = appLogger('routes');

async function sendMessage(req, res) {
  const sock = req.app.locals.whatsapp_socket;
  const { to, message } = req.body || {};
  if (!to || !message) {
    return res.status(400).json({ ok: false, error: 'to and message are required' });
  }
  try {
    const sentMsg = await sock.sendMessage(to, { text: message });
    return res.status(200).json({ ok: true, messageId: sentMsg.key.id });
  } catch (err) {
    log.error('send_message_error', { error: err.message });
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
}

async function fetchFile(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ ok: false, error: 'id is required' });
  try {
    const { connectToDB } = require('./db');
    const db = await connectToDB();
    const bucket = new GridFSBucket(db, { bucketName: 'fs' });
    const files = await bucket.find({ _id: new ObjectId(id) }).toArray();
    if (files.length === 0) return res.status(404).json({ ok: false, error: 'file not found' });
    const file = files[0];
    res.set('Content-Type', file.contentType || 'application/octet-stream');
    res.set('Content-Length', file.length);
    bucket.openDownloadStream(file._id).pipe(res);
  } catch (err) {
    log.error('fetch_file_error', { error: err.message });
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
}

module.exports = {
  routes: [
    { method: 'post', path: '/message/send', handler: sendMessage },
    { method: 'get', path: '/ping', handler: (req, res) => res.status(200).json({ ok: true, pong: true, time: new Date().toISOString() }) },
    { method: 'post', path: '/webhooks', handler: async (req, res) => {
      try {
        const { url } = req.body || {};
        if (!url || typeof url !== 'string') return res.status(400).json({ ok: false, error: 'url is required and must be a string' });
        let parsed;
        try { parsed = new URL(url); } catch (_) { return res.status(400).json({ ok: false, error: 'invalid URL' }); }
        if (!/^https?:$/.test(parsed.protocol)) return res.status(400).json({ ok: false, error: 'only http/https URLs are allowed' });
        const { connectToDB } = require('./db');
        const db = await connectToDB();
        const collection = db.collection('webhooks');
        const now = new Date();
        const result = await collection.updateOne({ url }, { $setOnInsert: { url, createdAt: now } }, { upsert: true });
        const created = result && (result.upsertedId != null || result.upsertedCount === 1);
        return res.status(created ? 201 : 200).json({ ok: true, url, created });
      } catch (err) {
        log.error('webhook_register_error', { error: err.message });
        return res.status(500).json({ ok: false, error: 'internal_error' });
      }
    } },
    { method: 'get', path: '/files/:id', handler: fetchFile },
  ]
};

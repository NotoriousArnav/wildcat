const { ObjectId, GridFSBucket } = require('mongodb');
const { appLogger } = require('./logger');
const log = appLogger('routes');

/**
 * Send a text message via the configured WhatsApp socket and respond with the outcome.
 *
 * Responds with:
 * - 200: { ok: true, messageId } when the message is sent successfully.
 * - 400: { ok: false, error: 'to and message are required' } when `to` or `message` is missing from the request body.
 * - 500: { ok: false, error: 'internal_error' } when an internal error occurs while sending the message.
 */
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

/**
 * Streams a file from MongoDB GridFS to the HTTP response using the route `:id` parameter.
 *
 * If `req.params.id` is missing the function responds with 400 and `{ ok: false, error: 'id is required' }`.
 * If no file matches the given id the function responds with 404 and `{ ok: false, error: 'file not found' }`.
 * On success the response headers `Content-Type` and `Content-Length` are set (using file metadata) and the file is piped to the response.
 * On unexpected errors the function logs the error and responds with 500 and `{ ok: false, error: 'internal_error' }`.
 *
 * @param {import('express').Request} req - Express request; expects `req.params.id` to contain the GridFS file id.
 * @param {import('express').Response} res - Express response used to send headers and stream the file or error JSON.
 */
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
const express = require('express');
const { GridFSBucket, ObjectId } = require('mongodb');
const { appLogger } = require('./logger');
const { webhookUrlValidationMiddleware } = require('./webhookSecurityMiddleware');
const { validateRequest, webhookSchema } = require('./validationSchemas');

/**
 * Builds and returns an Express router exposing management endpoints for accounts, media, webhooks, messages, and health checks.
 *
 * The router includes routes to create, list, retrieve, and delete accounts (mounting per-account routers on creation),
 * list and fetch media from GridFS, register webhooks, list messages with pagination, and a /ping health check.
 *
 * @param {object} accountManager - Service responsible for account lifecycle operations (create, list, get, delete).
 * @param {object} socketManager - Service responsible for socket lifecycle and socket-related data access.
 * @param {import('express').Application} app - Express application instance used to mount per-account routers.
 * @returns {import('express').Router} Configured router with all management endpoints mounted.
 */

function createManagementRoutes(accountManager, socketManager, app) {
  const router = express.Router();
  const { createAccountRouter } = require('./accountRouter');
  const log = appLogger('management');

  router.post('/accounts', async (req, res) => {
    const { id, name, collectionName } = req.body || {};
    if (!id) return res.status(400).json({ ok: false, error: 'id is required' });
    try {
      const account = await accountManager.createAccount(id, name, collectionName);
      const accountRouter = createAccountRouter(id, socketManager);
      app.use(`/accounts/${id}`, accountRouter);
      await socketManager.createSocket(id, account.collectionName);
      log.info('account_created', { accountId: id });
      return res.status(201).json({ ok: true, account });
    } catch (err) {
      log.error('account_create_error', { error: err.message });
      return res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.get('/accounts', async (req, res) => {
    try {
      const accounts = await accountManager.listAccounts();
      const sockets = socketManager.getAllSockets();
      const statusMap = new Map(sockets.map(s => [s.id, { status: s.status, qr: s.qr }]));
      const result = accounts.map(acc => ({
        ...acc,
        currentStatus: statusMap.get(acc._id)?.status || 'not_started',
        hasQR: !!statusMap.get(acc._id)?.qr,
      }));
      return res.status(200).json({ ok: true, accounts: result });
    } catch (err) {
      log.error('accounts_list_error', { error: err.message });
      return res.status(500).json({ ok: false, error: 'internal_error' });
    }
  });

  router.get('/accounts/:accountId', async (req, res) => {
    const { accountId } = req.params;
    try {
      const account = await accountManager.getAccount(accountId);
      if (!account) return res.status(404).json({ ok: false, error: 'Account not found' });
      const socketInfo = socketManager.getSocket(accountId);
      return res.status(200).json({ ok: true, account: { ...account, currentStatus: socketInfo?.status || 'not_started', hasQR: !!socketInfo?.qr } });
    } catch (err) {
      log.error('account_get_error', { error: err.message });
      return res.status(500).json({ ok: false, error: 'internal_error' });
    }
  });

  router.delete('/accounts/:accountId', async (req, res) => {
    const { accountId } = req.params;
    try {
      await socketManager.deleteAccountData(accountId);
      await socketManager.removeSocket(accountId);
      const collectionName = await accountManager.deleteAccount(accountId);
      if (collectionName) {
        try {
          const { connectToDB } = require('./db');
          const db = await connectToDB();
          await db.collection(collectionName).drop();
          log.info('collection_dropped', { collectionName });
        } catch (_) {
          log.info('collection_drop_not_required', { collectionName });
        }
      }
      log.info('account_deleted', { accountId });
      return res.status(200).json({ ok: true, message: 'Account deleted', deletedCollection: collectionName });
    } catch (err) {
      log.error('account_delete_error', { accountId, error: err.message });
      return res.status(500).json({ ok: false, error: 'internal_error' });
    }
  });

  router.get('/ping', (req, res) => {
    res.status(200).json({ ok: true, pong: true, time: new Date().toISOString() });
  });

   router.post('/webhooks',
     validateRequest(webhookSchema),
     webhookUrlValidationMiddleware({ bodyField: 'webhookUrl' }),
     async (req, res) => {
       try {
         const { webhookUrl } = req.body || {};
         if (!webhookUrl || typeof webhookUrl !== 'string') return res.status(400).json({ ok: false, error: 'webhookUrl is required and must be a string' });
         let parsed;
         try {
           parsed = new URL(webhookUrl);
         } catch (_) {
           return res.status(400).json({ ok: false, error: 'invalid URL' });
         }
         if (!/^https?:$/.test(parsed.protocol)) return res.status(400).json({ ok: false, error: 'only http/https URLs are allowed' });
         const { connectToDB } = require('./db');
         const db = await connectToDB();
         const collection = db.collection('webhooks');
         const now = new Date();
         const result = await collection.updateOne({ webhookUrl }, { $setOnInsert: { webhookUrl, createdAt: now } }, { upsert: true });
         const created = result && (result.upsertedId != null || result.upsertedCount === 1);
         const redactedUrl = `${parsed.protocol}//${parsed.hostname}${parsed.port ? ':' + parsed.port : ''}${parsed.pathname}`;
         log.info('webhook_registered', { url: redactedUrl, created });
         return res.status(created ? 201 : 200).json({ ok: true, url: webhookUrl, created });
       } catch (err) {
         log.error('webhook_register_error', { error: err.message });
         return res.status(500).json({ ok: false, error: 'internal_error' });
       }
     }
   );

  router.get('/messages', async (req, res) => {
    try {
      const { connectToDB } = require('./db');
      const db = await connectToDB();
      const collection = db.collection('messages');
      const limit = Math.min(parseInt(req.query.limit) || 50, 500);
      const skip = parseInt(req.query.skip) || 0;
      const accountId = req.query.accountId;
      const query = accountId ? { accountId } : {};
      const messages = await collection.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).toArray();
      const total = await collection.countDocuments(query);
      return res.status(200).json({ ok: true, messages, pagination: { skip, limit, total, hasMore: skip + messages.length < total } });
    } catch (err) {
      log.error('messages_list_error', { error: err.message });
      return res.status(500).json({ ok: false, error: 'internal_error' });
    }
  });

  router.get('/media', async (req, res) => {
    try {
      const { connectToDB } = require('./db');
      const db = await connectToDB();
      const filesCollection = db.collection('media.files');
      const query = {};
      if (req.query.messageId) query['metadata.messageId'] = req.query.messageId;
      if (req.query.accountId) query['metadata.accountId'] = req.query.accountId;
      if (req.query.chatId) query['metadata.chatId'] = req.query.chatId;
      const files = await filesCollection.find(query).sort({ uploadDate: -1 }).toArray();
      const mediaList = files.map(file => ({ id: file._id, filename: file.filename, contentType: file.contentType, length: file.length, uploadDate: file.uploadDate, metadata: file.metadata }));
      return res.status(200).json({ ok: true, media: mediaList });
    } catch (err) {
      log.error('media_list_error', { error: err.message });
      return res.status(500).json({ ok: false, error: 'internal_error' });
    }
  });

  router.get('/media/:id', async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ ok: false, error: 'id is required' });
    try {
      const { connectToDB } = require('./db');
      const db = await connectToDB();
      const bucket = new GridFSBucket(db, { bucketName: 'media' });
      const files = await bucket.find({ _id: new ObjectId(id) }).toArray();
      if (files.length === 0) return res.status(404).json({ ok: false, error: 'media not found' });
      const file = files[0];
      res.set('Content-Type', file.contentType || 'application/octet-stream');
      res.set('Content-Length', file.length);
      if (file.metadata && file.metadata.fileName) res.set('Content-Disposition', `inline; filename="${file.metadata.fileName}"`);
      bucket.openDownloadStream(file._id).pipe(res);
    } catch (err) {
      log.error('media_fetch_error', { error: err.message });
      return res.status(500).json({ ok: false, error: 'internal_error' });
    }
  });

  return router;
}

module.exports = { createManagementRoutes };

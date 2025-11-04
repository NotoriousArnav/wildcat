const express = require('express');

// Global management routes
function createManagementRoutes(accountManager, socketManager, app) {
  const router = express.Router();
  const { createAccountRouter } = require('./accountRouter');

  // Create a new account
  router.post('/accounts', async (req, res) => {
    const { id, name, collectionName } = req.body || {};
    if (!id) {
      return res.status(400).json({ ok: false, error: 'id is required' });
    }
    
    try {
      const account = await accountManager.createAccount(id, name, collectionName);
      
      // Create and mount router for this account
      const accountRouter = createAccountRouter(id, socketManager);
      app.use(`/accounts/${id}`, accountRouter);
      
      // Optionally auto-start connection
      await socketManager.createSocket(id, account.collectionName);
      
      return res.status(201).json({ ok: true, account });
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
  });

  // List all accounts
  router.get('/accounts', async (req, res) => {
    try {
      const accounts = await accountManager.listAccounts();
      const sockets = socketManager.getAllSockets();
      const statusMap = new Map(sockets.map(s => [s.id, { status: s.status, qr: s.qr }]));
      
      const result = accounts.map(acc => ({ 
        ...acc, 
        currentStatus: statusMap.get(acc._id)?.status || 'not_started',
        hasQR: !!statusMap.get(acc._id)?.qr
      }));
      
      return res.status(200).json({ ok: true, accounts: result });
    } catch (err) {
      console.error('Error listing accounts:', err);
      return res.status(500).json({ ok: false, error: 'internal_error' });
    }
  });

  // Get specific account info
  router.get('/accounts/:accountId', async (req, res) => {
    const { accountId } = req.params;
    try {
      const account = await accountManager.getAccount(accountId);
      if (!account) {
        return res.status(404).json({ ok: false, error: 'Account not found' });
      }
      
      const socketInfo = socketManager.getSocket(accountId);
      return res.status(200).json({ 
        ok: true, 
        account: {
          ...account,
          currentStatus: socketInfo?.status || 'not_started',
          hasQR: !!socketInfo?.qr
        }
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'internal_error' });
    }
  });

  // Delete account
  router.delete('/accounts/:accountId', async (req, res) => {
    const { accountId } = req.params;
    try {
      // Disconnect socket if active
      await socketManager.removeSocket(accountId);
      
      // Delete account data
      await socketManager.deleteAccountData(accountId);
      
      // Delete account record
      const collectionName = await accountManager.deleteAccount(accountId);
      
      return res.status(200).json({ 
        ok: true, 
        message: 'Account deleted',
        deletedCollection: collectionName
      });
    } catch (err) {
      console.error(`Error deleting account ${accountId}:`, err);
      return res.status(500).json({ ok: false, error: 'internal_error' });
    }
  });

  // Health check
  router.get('/ping', (req, res) => {
    res.status(200).json({ ok: true, pong: true, time: new Date().toISOString() });
  });

  // Webhooks
  router.post('/webhooks', async (req, res) => {
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
  });

  return router;
}

module.exports = { createManagementRoutes };

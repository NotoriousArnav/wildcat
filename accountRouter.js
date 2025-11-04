const express = require('express');

// Per-account route handlers
function createAccountRouter(accountId, socketManager) {
  const router = express.Router();

  // Send message endpoint for this specific account
  router.post('/message/send', async (req, res) => {
    const { to, message } = req.body || {};
    if (!to || !message) {
      return res.status(400).json({
        ok: false,
        error: 'to and message are required'
      });
    }
    
    const socketInfo = socketManager.getSocket(accountId);
    if (!socketInfo) {
      return res.status(404).json({ ok: false, error: 'Account not found' });
    }
    
    if (socketInfo.status !== 'connected') {
      return res.status(400).json({ 
        ok: false, 
        error: 'Account not connected',
        status: socketInfo.status 
      });
    }
    
    try {
      const sentMsg = await socketInfo.socket.sendMessage(to, { text: message });
      return res.status(200).json({ ok: true, messageId: sentMsg.key.id });
    } catch (err) {
      console.error(`Error sending message for ${accountId}:`, err);
      return res.status(500).json({ ok: false, error: 'internal_error' });
    }
  });

  // Get status for this account
  router.get('/status', async (req, res) => {
    const socketInfo = socketManager.getSocket(accountId);
    if (!socketInfo) {
      return res.status(404).json({ ok: false, error: 'Account not found or not started' });
    }
    return res.status(200).json({ 
      ok: true, 
      accountId, 
      status: socketInfo.status, 
      qr: socketInfo.qr,
      collection: socketInfo.collection
    });
  });

  // Start/restart connection
  router.post('/connect', async (req, res) => {
    try {
      const socketInfo = await socketManager.createSocket(accountId);
      return res.status(200).json({ 
        ok: true, 
        accountId, 
        status: socketInfo.status,
        message: 'Connection initiated. Check /accounts/' + accountId + '/status for QR code'
      });
    } catch (err) {
      console.error(`Error connecting ${accountId}:`, err);
      return res.status(500).json({ ok: false, error: 'Failed to connect' });
    }
  });

  // Disconnect/logout
  router.post('/disconnect', async (req, res) => {
    try {
      await socketManager.removeSocket(accountId);
      return res.status(200).json({ ok: true, message: 'Account disconnected' });
    } catch (err) {
      console.error(`Error disconnecting ${accountId}:`, err);
      return res.status(500).json({ ok: false, error: 'Failed to disconnect' });
    }
  });

  return router;
}

module.exports = { createAccountRouter };

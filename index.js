require('dotenv').config();

const { constructApp, startServer } = require('./server');
const SocketManager = require('./socketManager');
const AccountManager = require('./accountManager');
const { createManagementRoutes } = require('./managementRoutes');
const { createAccountRouter } = require('./accountRouter');
const { appLogger } = require('./logger');

/**
 * Restore existing accounts from database on startup
 * - Mounts routes for each account
 * - Optionally auto-connects accounts that were previously connected
 */
async function restoreAccounts(accountManager, socketManager, app) {
  const log = appLogger('startup');
  log.info('restoring_accounts');
  
  try {
    const accounts = await accountManager.listAccounts();
    
    if (accounts.length === 0) {
      log.info('no_existing_accounts');
      return;
    }
    
    log.info(`found_accounts_to_restore`, { count: accounts.length });
    
    for (const account of accounts) {
      const accountId = account._id;
      log.info('restoring_account', { accountId, status: account.status });
      
      // Mount routes for this account
      const accountRouter = createAccountRouter(accountId, socketManager);
      app.use(`/accounts/${accountId}`, accountRouter);
      log.info('routes_mounted', { accountId });
      
      // Auto-connect policy:
      // - If AUTO_CONNECT_ON_START=true, connect all accounts
      // - Else connect if account was previously connected OR creds exist in auth collection
      const autoConnectAll = process.env.AUTO_CONNECT_ON_START === 'true';
      let shouldAutoConnect = false;
      if (autoConnectAll) {
        shouldAutoConnect = true;
      } else if (account.status && account.status !== 'created') {
        shouldAutoConnect = true;
      } else {
        try {
          const collName = account.collectionName || `auth_${accountId}`;
          const credsDoc = await socketManager.db.collection(collName).findOne({ _id: 'creds' });
          shouldAutoConnect = !!credsDoc;
        } catch (probeErr) {
          // ignore and leave shouldAutoConnect as false
        }
      }

      if (shouldAutoConnect) {
        log.info('auto_connecting', { accountId });
        try {
          await socketManager.createSocket(accountId, account.collectionName);
          log.info('socket_created', { accountId });
        } catch (err) {
          log.error('auto_connect_failed', { accountId, error: err.message });
          // Update status to indicate restoration failed
          await accountManager.updateAccountStatus(accountId, 'not_started');
        }
      } else {
        log.info('auto_connect_skipped', { accountId });
      }
    }
    
    log.info('account_restoration_complete');
  } catch (err) {
    const log = appLogger('startup');
    log.error('account_restoration_error', { error: err.message });
    // Don't throw - allow server to start even if restoration fails
  }
}

async function main() {
  const log = appLogger('startup');
  log.info('initializing_api');

  // Initialize managers
  const socketManager = new SocketManager();
  const accountManager = new AccountManager();

  await socketManager.init();
  await accountManager.init();

  log.info('managers_initialized');

  // Create Express app
  const app = constructApp();

  // Mount management routes (account creation, listing, deletion, webhooks, ping)
  const managementRouter = createManagementRoutes(accountManager, socketManager, app);
  app.use('/', managementRouter);

  // Restore existing accounts from database
  await restoreAccounts(accountManager, socketManager, app);

  // Start server
  await startServer(app);

  log.info('api_ready');
  log.info('endpoints_summary', {
    accounts_create: 'POST /accounts',
    accounts_list: 'GET /accounts',
    account_prefix: '/accounts/:accountId/...'
  });

  // Do not log secrets; only note configuration presence
  if (process.env.ADMIN_NUMBER) {
    log.info('admin_number_configured');
  }
}

main().catch((err) => {
  const log = appLogger('startup');
  log.error('fatal_startup_error', { error: err.message });
  process.exit(1);
});

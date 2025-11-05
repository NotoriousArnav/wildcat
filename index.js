require("dotenv").config();

const { constructApp, startServer } = require("./server");
const SocketManager = require("./socketManager");
const AccountManager = require("./accountManager");
const { createManagementRoutes } = require("./managementRoutes");
const { createAccountRouter } = require("./accountRouter");

/**
 * Restore existing accounts from database on startup
 * - Mounts routes for each account
 * - Optionally auto-connects accounts that were previously connected
 */
async function restoreAccounts(accountManager, socketManager, app) {
  console.log("Restoring existing accounts from database...");
  
  try {
    const accounts = await accountManager.listAccounts();
    
    if (accounts.length === 0) {
      console.log("No existing accounts found.");
      return;
    }
    
    console.log(`Found ${accounts.length} account(s) to restore.`);
    
    for (const account of accounts) {
      const accountId = account._id;
      console.log(`Restoring account: ${accountId} (status: ${account.status})`);
      
      // Mount routes for this account
      const accountRouter = createAccountRouter(accountId, socketManager);
      app.use(`/accounts/${accountId}`, accountRouter);
      console.log(`  ✓ Routes mounted for ${accountId}`);
      
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
        console.log(`  → Auto-connecting ${accountId}...`);
        try {
          await socketManager.createSocket(accountId, account.collectionName);
          console.log(`  ✓ Socket created for ${accountId}`);
        } catch (err) {
          console.error(`  ✗ Failed to auto-connect ${accountId}:`, err.message);
          // Update status to indicate restoration failed
          await accountManager.updateAccountStatus(accountId, 'not_started');
        }
      } else {
        console.log(`  ⊘ Skipping auto-connect for ${accountId} (no prior creds; POST /accounts/${accountId}/connect to start)`);
      }
    }
    
    console.log("Account restoration complete!");
  } catch (err) {
    console.error("Error during account restoration:", err);
    // Don't throw - allow server to start even if restoration fails
  }
}

async function main() {
  console.log("Initializing multi-account WhatsApp API...");

  // Initialize managers
  const socketManager = new SocketManager();
  const accountManager = new AccountManager();

  await socketManager.init();
  await accountManager.init();

  console.log("Managers initialized successfully!");

  // Create Express app
  const app = constructApp();

  // Mount management routes (account creation, listing, deletion, webhooks, ping)
  const managementRouter = createManagementRoutes(accountManager, socketManager, app);
  app.use('/', managementRouter);

  // Restore existing accounts from database
  await restoreAccounts(accountManager, socketManager, app);

  // Start server
  await startServer(app);

   console.log("Multi-account API is ready!");
   console.log("- Create accounts: POST /accounts");
   console.log("- List accounts: GET /accounts");
   console.log("- Account endpoints: /accounts/:accountId/...");

   // Send admin notification if configured
   if (process.env.ADMIN_NUMBER) { console.log(`Admin number is ${process.env.ADMIN_NUMBER}`) }
}

main().catch((err) => {
  console.error("Fatal error during startup:", err);
  process.exit(1);
});

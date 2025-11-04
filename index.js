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
      
      // Auto-connect accounts that were previously connected
      // Skip if status is 'created' (never connected)
      if (account.status && account.status !== 'created') {
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
        console.log(`  ⊘ Skipping auto-connect for ${accountId} (never connected)`);
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
   if (process.env.ADMIN_NUMBER && process.env.ADMIN_ACCOUNT) {
     const adminSocket = socketManager.getSocket(process.env.ADMIN_ACCOUNT);
     if (adminSocket && adminSocket.status === 'connected') {
       try {
         await adminSocket.socket.sendMessage(process.env.ADMIN_NUMBER, { 
           text: '🤖 Wildcat bot is now online and ready to assist!' 
         });
         console.log('✅ Admin startup notification sent');
       } catch (err) {
         console.error('❌ Failed to send admin startup notification:', err.message);
       }
     } else {
       console.log('ℹ️ Admin account not connected, skipping startup notification');
     }
   }
 }

main().catch((err) => {
  console.error("Fatal error during startup:", err);
  process.exit(1);
});

require("dotenv").config();

const { constructApp, startServer } = require("./server");
const SocketManager = require("./socketManager");
const AccountManager = require("./accountManager");
const { createManagementRoutes } = require("./managementRoutes");

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

  // Start server
  await startServer(app);

  console.log("Multi-account API is ready!");
  console.log("- Create accounts: POST /accounts");
  console.log("- List accounts: GET /accounts");
  console.log("- Account endpoints: /accounts/:accountId/...");
}

main().catch((err) => {
  console.error("Fatal error during startup:", err);
  process.exit(1);
});
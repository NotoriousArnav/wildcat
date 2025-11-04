# Wildcat — Multi-Account WhatsApp Integration Layer (Baileys + MongoDB)

NOTE: This is an unofficial WhatsApp integration using reverse-engineered libraries. Use at your own risk and ensure compliance with WhatsApp's terms of service.
NOTE: This project is a work in progress. Features like REST endpoints and CRM/webhook integrations are being added incrementally and is in full development, use in production on your own risk.

**Wildcat** is a WhatsApp Integration Layer for Data Connectivity and Transfer with **multi-account support**. Connect multiple WhatsApp accounts simultaneously via @whiskeysockets/baileys, persist auth state in MongoDB, and manage accounts via REST API.

- **API Docs:** see `API_DOCS.md`

---

## 🚀 Key Features

- ✅ **Multi-Account Support**: Manage multiple WhatsApp accounts simultaneously
- ✅ **Separate Collections**: Each account uses its own MongoDB collection for isolation
- ✅ **Dynamic Routing**: Per-account API endpoints automatically mounted
- ✅ **Account Persistence**: Accounts auto-restore on server restart with intelligent reconnection
- ✅ **Message Handling**: Send/receive messages per account with webhook support
- ✅ **REST API**: Full REST interface for account management and messaging
- ✅ **Auto-Reconnection**: Intelligent reconnection logic per account
- ✅ **QR Code Authentication**: Terminal-based QR scanning for each account
- ✅ **CLI Helper**: npm scripts for common operations (see `CLI_USAGE.md`)

---

## Overview

### Architecture

Wildcat now supports **multiple WhatsApp accounts** simultaneously:
- Each account has a unique identifier (`accountId`)
- Separate MongoDB collections per account (`auth_{accountId}`)
- Independent socket connections per account
- Per-account API routes under `/accounts/:accountId/`
- Global management endpoints for account CRUD operations

### Components

- **SocketManager**: Manages WhatsApp socket connections per account
- **AccountManager**: Handles account metadata and lifecycle
- **Express API**: RESTful interface with dynamic per-account routing
- **MongoDB**: Persistent auth state and message storage
- **Webhooks**: Global event delivery with account identification

---

## Package Metadata

- **Name:** `wildcat`
- **Version:** `2.0.0` (Multi-Account)
- **Description:** Multi-Account WhatsApp Integration Layer for Data Connectivity and Transfer
- **Entry:** `index.js`
- **Script(s):** `dev` → `nodemon index.js`
- **License:** GPL-3.0-only (see `LICENSE`)
- **Repository:** https://github.com/NotoriousArnav/Whatsapp_Unofficial_REST_API

---

## Requirements

- Node.js 18+ (recommended 20+)
- MongoDB (local or remote)
- WhatsApp account(s) to link via QR code

---

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Create a `.env` file (start from `.env.example`):
   ```env
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=wildcat
   PORT=3000
   HOST=0.0.0.0
   ```

3. **Start MongoDB:**
   ```bash
   # If running locally
   mongod
   ```

4. **Run the application:**
   ```bash
   # Development with auto-restart
   npm run dev
   
   # Or production
   node index.js
   ```

---

## Quick Start

### Using CLI Helper (Recommended)

The project includes a CLI helper for easier interaction. See `CLI_USAGE.md` for full documentation.

```bash
# List all accounts
npm run accounts

# Create account
npm run account:create mybusiness "Business Account"

# Check status and get QR code
npm run account:status mybusiness

# Send message
npm run message:send mybusiness 1234567890@s.whatsapp.net "Hello!"

# View help
npm run cli
```

### Using curl

### 1. Create Your First Account

```bash
curl -X POST http://localhost:3000/accounts \
  -H 'Content-Type: application/json' \
  -d '{"id":"mybusiness","name":"Business Account"}'
```

### 2. Get QR Code

```bash
curl http://localhost:3000/accounts/mybusiness/status
```

The response includes a QR code string. Check your terminal for the visual QR code output.

### 3. Scan QR Code

Open WhatsApp on your phone → **Linked Devices** → **Link a Device** → Scan the QR code from the terminal.

### 4. Verify Connection

```bash
curl http://localhost:3000/accounts/mybusiness/status
```

You should see `"status": "connected"`.

### 5. Send a Message

```bash
curl -X POST http://localhost:3000/accounts/mybusiness/message/send \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "1234567890@s.whatsapp.net",
    "message": "Hello from Wildcat!"
  }'
```

---

## API Endpoints

### Management Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/ping` | Health check |
| `POST` | `/accounts` | Create new account |
| `GET` | `/accounts` | List all accounts |
| `GET` | `/accounts/:id` | Get account details |
| `DELETE` | `/accounts/:id` | Delete account |
| `POST` | `/webhooks` | Register webhook URL |

### Per-Account Endpoints

All endpoints are prefixed with `/accounts/:accountId/`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/status` | Get connection status & QR |
| `POST` | `/connect` | Start/restart connection |
| `POST` | `/disconnect` | Disconnect account |
| `POST` | `/message/send` | Send text message |

**Full documentation:** See `API_DOCS.md`

---

## Project Structure

```
wildcat/
├── index.js                 # Main entry point - multi-account initialization & restoration
├── socketManager.js         # Manages WhatsApp sockets per account
├── accountManager.js        # Account CRUD and metadata
├── accountRouter.js         # Per-account route handlers
├── managementRoutes.js      # Global management routes
├── mongoAuthState.js        # MongoDB-backed Baileys auth state (per collection)
├── server.js                # Express app construction and server startup
├── db.js                    # MongoDB connection utility
├── webhookHandler.js        # Webhook dispatch helper
├── logger.js                # JSON logging utilities
├── scripts/
│   └── cli.js               # CLI helper for common operations
├── routes.js                # LEGACY: Old single-account routes
├── API_DOCS.md              # Comprehensive API documentation
├── CLI_USAGE.md             # CLI helper documentation and examples
├── AGENTS.md                # Development guidelines for AI agents
├── README.md                # This file
├── .env.example             # Environment variable template
└── package.json             # Project metadata and dependencies
```

---

## How It Works

### Multi-Account Architecture

1. **Initialization (`index.js`):**
   - Creates `SocketManager` and `AccountManager` instances
   - Connects to MongoDB
   - Sets up Express app with management routes
   - **Restores existing accounts from database:**
     - Automatically mounts routes for all accounts in DB
     - Auto-connects accounts that were previously connected (status !== 'created')
     - Skips auto-connect for never-connected accounts (status: 'created')
     - Gracefully handles restoration errors without preventing server start
   - Starts HTTP server

2. **Account Creation (`POST /accounts`):**
   - Stores account metadata in `accounts` collection
   - Creates dedicated MongoDB collection (`auth_{accountId}`)
   - Initializes WhatsApp socket for the account
   - Dynamically mounts per-account routes (`/accounts/{id}/...`)

3. **Socket Management (`socketManager.js`):**
   - Each account gets its own socket connection
   - Handles QR code generation and display
   - Auto-reconnection on disconnect (unless logged out)
   - Message event handling with `accountId` tagging
   - Stores messages in shared `messages` collection with `accountId` field

4. **Routing (`accountRouter.js` + `managementRoutes.js`):**
   - Management routes: global operations (create/list/delete accounts)
   - Per-account routes: dynamically mounted on account creation
   - Each account has isolated endpoints for status, messaging, etc.

5. **Data Storage:**
   - `accounts` collection: Account metadata and status
   - `auth_{accountId}` collections: Per-account auth state (keys, creds)
   - `messages` collection: All messages tagged with `accountId`
   - `webhooks` collection: Global webhook registrations

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_URL` | `mongodb://localhost:27017` | MongoDB connection string |
| `DB_NAME` | `wildcat` | Database name |
| `PORT` | `3000` | HTTP server port |
| `HOST` | `0.0.0.0` | HTTP server host |

**Note:** Variables in `.env.example` like `DB_URL`, `MONGODB_URI`, `SESSION_ID`, `SERVER_HOST`, `SERVER_PORT`, Cloudinary settings, etc., are from previous versions and not currently used.

---

## Logging

All logs are written as JSON lines to `.logs/` directory:

- **HTTP Requests:** `.logs/http.log`
  ```javascript
  app.use(require('./logger').httpLogger({ redactBody: false }));
  ```

- **Baileys Events:** `.logs/baileys.log`
  ```javascript
  require('./logger').wireSocketLogging(sock);
  ```

- **Application Logs:** `.logs/app.log`
  ```javascript
  const { appLogger } = require('./logger');
  const log = appLogger('context', 'filename.js');
  log.info('event_name', { data: 'value' });
  ```

---

## Webhooks

Register webhook URLs to receive message events from all accounts:

```bash
curl -X POST http://localhost:3000/webhooks \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://webhook.site/your-unique-id"}'
```

**Webhook Payload:**
```json
{
  "accountId": "mybusiness",
  "id": "3EB0A12345678901",
  "from": "1234567890@s.whatsapp.net",
  "message": { "conversation": "Hello!" },
  "timestamp": 1699099199
}
```

---

## Troubleshooting

### Connection Issues

- **Account won't connect:**
  - Check MongoDB connection: `MONGO_URL` and `DB_NAME`
  - Verify network connectivity
  - Check logs in `.logs/` directory

- **QR code not showing:**
  - Check terminal output when creating account
  - Call `/accounts/:id/status` to get QR code data
  - Try reconnecting: `POST /accounts/:id/connect`

- **Logged out / reconnect loop:**
  - Account was logged out on phone
  - Delete the account and recreate: `DELETE /accounts/:id`
  - Or drop the auth collection manually in MongoDB

### Database Issues

- **"Connection refused":**
  - Ensure MongoDB is running
  - Verify `MONGO_URL` is correct
  - Test connection: `mongosh mongodb://localhost:27017`

- **"Collection not found":**
  - Collections are created automatically
  - Verify `DB_NAME` is set correctly

### API Issues

- **"Account not found":**
  - Ensure account exists: `GET /accounts`
  - Create account first: `POST /accounts`

- **"Account not connected":**
  - Check status: `GET /accounts/:id/status`
  - Wait for QR scan or reconnect: `POST /accounts/:id/connect`

---

## Migration from v1.0

If you're upgrading from the single-account version:

1. **Backup your data:**
   ```bash
   mongodump --db wildcat --out backup/
   ```

2. **Switch to multi-account branch:**
   ```bash
   git checkout multi-acc-try
   npm install
   ```

3. **Create your first account:**
   The old `auth_info_baileys` collection won't be used. Create a new account via API.

4. **Link WhatsApp:**
   Scan the QR code for your new account.

**Note:** Old single-account routes are preserved in `routes.js` but not actively used in the new architecture.

---

## Development Guidelines

- See `AGENTS.md` for development conventions and guidelines
- Use CommonJS modules (no `"type": "module"`)
- Keep routes in separate files (`managementRoutes.js`, `accountRouter.js`)
- Update `API_DOCS.md` when adding endpoints
- Follow existing logging patterns
- Test with `curl` commands from `API_DOCS.md`

---

## Roadmap

- ✅ Multi-account support with separate collections
- ✅ Per-account routing and socket management
- ✅ Message sending per account
- ✅ Webhook delivery with accountId
- ✅ Account persistence and auto-restoration on restart
- ✅ CLI helper with npm scripts
- ✅ Message history API (GET /messages)
- 🔄 Media message support (images, videos, documents)
- 🔄 Group management endpoints
- 🔄 Webhook signing/verification
- 🔄 GET/DELETE webhook endpoints
- 🔄 Authentication and rate limiting
- 🔄 Account-specific webhook configuration
- 🔄 Bulk messaging operations

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

GPL-3.0-only — See `LICENSE` for full text.

---

## Support

For issues, questions, or contributions:
- GitHub Issues: https://github.com/NotoriousArnav/Whatsapp_Unofficial_REST_API/issues
- Documentation: See `API_DOCS.md` and `AGENTS.md`

---

**⚠️ Disclaimer:** This is an unofficial WhatsApp integration. Use at your own risk and ensure compliance with WhatsApp's Terms of Service.

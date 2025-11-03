# Wildcat — WhatsApp Integration Layer (Baileys + MongoDB)

NOTE: This is an unofficial WhatsApp integration using reverse-engineered libraries. Use at your own risk and ensure compliance with WhatsApp's terms of service.
NOTE: This project is a work in progress. Features like REST endpoints and CRM/webhook integrations are being added incrementally and is in full development, use in production on your own risk.

Whatsapp Integration Layer for Data Connectivity and Transfer. Connects to WhatsApp via @whiskeysockets/baileys, persists auth state in MongoDB, and logs incoming messages. REST endpoints and CRM/Webhook integrations are being added incrementally.

- API Docs: see `API_DOCS.md`

## Overview
- Uses Baileys multi-device WebSocket to connect to WhatsApp
- Persists credentials/keys in MongoDB (`auth_info_baileys` collection)
- Prints a QR code in the terminal for login; logs incoming messages
- Express/REST: basic endpoints are available and more are planned for CRM/webhooks

## Package Metadata
- Name: `wildcat`
- Version: `1.0.0`
- Description: Whatsapp Integration Layer for Data Connectivity and Transfer
- Entry: `index.js`
- Script(s): `dev` → `nodemon index.js`
- License: GPL-3.0-only (see `LICENSE`)
- Repository: https://github.com/NotoriousArnav/Whatsapp_Unofficial_REST_API

Note: If `package.json` still shows `ISC`, update it to `GPL-3.0-only` to match `LICENSE`.

## Requirements
- Node.js 18+ (recommended 20+)
- MongoDB (local or remote)
- A WhatsApp account to link via QR code

## Setup
1. Install dependencies: `npm install`
2. Create a `.env` file (you can start from `.env.example`). For the current code, the variables actually used are:
   - `MONGO_URL` (default: `mongodb://localhost:27017`)
   - `DB_NAME` (default: `wildcat`)

Example `.env` minimal config:
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=whatsapp
```

Note: `.env.example` includes variables like `DB_URL`, `MONGODB_URI`, `MEDIA_STORAGE`, Cloudinary settings, etc. These are not used by the current code. Prefer `MONGO_URL` and `DB_NAME` which are what `db.js` reads.

## Run
- Development (auto-restart): `npm run dev`
- On first run you’ll see a QR code in the terminal — scan it using WhatsApp (Linked devices). Credentials are persisted in Mongo; subsequent runs reuse them.
- Incoming messages print to the console.

## Current Endpoints
- GET `/ping` — liveness probe
- POST `/webhooks` — upsert a webhook URL in MongoDB
  - See request/response schemas in `API_DOCS.md`.

## Project Structure
- `index.js` — Connects to WhatsApp using Baileys, handles QR login, persists creds, logs messages
- `mongoAuthState.js` — MongoDB-backed Baileys auth state adapter; stores creds/keys in `auth_info_baileys`
- `db.js` — MongoDB connection utility reading `MONGO_URL` and `DB_NAME`
- `server.js` — Express helpers: `constructApp`, `makeApp`, `startServer`
- `routes.js` — Route definitions array (e.g., `/ping`, `POST /webhooks`)
- `webhookHandler.js` — Helper to POST JSON payloads to registered webhook URLs
- `logger.js` — JSON line logger, HTTP request logger middleware, and Baileys event logger
- `API_DOCS.md` — Endpoint documentation
- `.env.example` — Example env file
- `LICENSE` — GPL-3.0

## How It Works
- `index.js` connects to Mongo (`connectToDB`), initializes Baileys with the Mongo-backed auth state, prints QR on connection update, attempts reconnection when not logged out, persists creds on updates, and logs incoming messages.

## Wiring Routes (Option A)
- `constructApp(sock)` stores the socket on `app.locals.whatsapp_socket`.
- Register routes using your helper: `makeApp(app, require('./routes').routes)` before calling `startServer(app)`.
- Handlers can access the socket via `req.app.locals.whatsapp_socket`.

## Logging
- HTTP request logging (Express middleware):
  - Add: `app.use(require('./logger').httpLogger());`
  - Logs to `.logs/http.log` as JSON lines.
- Baileys event logging:
  - After socket creation: `require('./logger').wireSocketLogging(sock);`
  - Logs to `.logs/baileys.log`.
- Application logs:
  - `const { appLogger } = require('./logger'); const log = appLogger('app'); log.info('service_started');`
  - Logs to `.logs/app.log`.

## Webhooks
- Register URLs with `POST /webhooks`.
- Send events to URLs using `sendToWebhook(url, payload)` from `webhookHandler.js`.
- Delivery, retries, signing, and filtering are planned enhancements.

## Environment Variables
- `MONGO_URL` — Mongo connection string (e.g., `mongodb://localhost:27017`)
- `DB_NAME` — Database name (e.g., `whatsapp`)
- (Planned for Express) `PORT` and `HOST`

Currently NOT used by the code (present in `.env.example`): `DB_URL`, `MONGODB_URI`, `SESSION_ID`, `SERVER_HOST`, `SERVER_PORT`, `LOG_LEVEL`, `MEDIA_STORAGE`, `CLOUDINARY_*`, `WWEBJS_*`, `PUPPETEER_*`.

## Troubleshooting
- "ReferenceError: require is not defined in ES module scope":
  - This codebase is CommonJS. Ensure `package.json` does NOT set `"type": "module"`.
  - If you must stay ESM, convert to `import`/`export` or use `createRequire`:
    ```js
    import { createRequire } from 'node:module';
    const require = createRequire(import.meta.url);
    const express = require('express');
    ```
- Mongo connection errors: verify `MONGO_URL` and database reachability; set `DB_NAME`.
- Logged out / reconnect loop: if `DisconnectReason.loggedOut`, delete the `auth_info_baileys` records in Mongo and re-link.

## License
- GPL-3.0-only — see `LICENSE` for full text.

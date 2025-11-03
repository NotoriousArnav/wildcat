# Wildcat — WhatsApp Integration Layer (Baileys + MongoDB)

Whatsapp Integration Layer for Data Connectivity and Transfer. Connects to WhatsApp via @whiskeysockets/baileys, persists auth state in MongoDB, and logs incoming messages. REST endpoints and Express-based CRM/Webhook integrations are planned, not implemented yet.

## Overview
- Uses Baileys multi-device WebSocket to connect to WhatsApp
- Persists credentials/keys in MongoDB (`auth_info_baileys` collection)
- Prints a QR code in the terminal for login; logs incoming messages
- Express/REST: planned for CRM integrations and webhooks (not active yet)

## Package Metadata
- Name: `wildcat`
- Version: `1.0.0`
- Description: Whatsapp Integration Layer for Data Connectivity and Transfer
- Entry: `index.js`
- Script(s): `dev` → `nodemon index.js`
- License: ISC
- Repository: https://github.com/NotoriousArnav/Whatsapp_Unofficial_REST_API

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

## Project Structure
- `index.js` — Connects to WhatsApp using Baileys, handles QR login, persists creds, logs messages
- `mongoAuthState.js` — MongoDB-backed Baileys auth state adapter; stores creds/keys in `auth_info_baileys`
- `db.js` — MongoDB connection utility reading `MONGO_URL` and `DB_NAME`
- `server.js` — Placeholder for future Express/REST usage (not wired yet)
- `.env.example` — Example env file (includes unused variables for now)
- `package.json` — Package metadata and scripts

## How It Works
- `index.js` connects to Mongo (`connectToDB`), initializes Baileys with the Mongo-backed auth state, prints QR on connection update, attempts reconnection when not logged out, persists creds on updates, and logs incoming messages.

## Roadmap (Planned)
- Add Express server and expose REST endpoints
- CRM integrations (e.g., webhooks, outbound messaging APIs)
- Message send APIs, chat retrieval, media handling
- Basic auth/tenancy for multi-tenant integrations

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

## Notes
- Unofficial integration; use responsibly and review WhatsApp Terms of Service.
- Libraries: `@whiskeysockets/baileys`, `mongodb`, `qrcode-terminal`.

## License
ISC

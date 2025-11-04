# Project Report — Wildcat (WhatsApp Integration Layer)

Date: 2025-11-04

## Summary
- WhatsApp connectivity via Baileys is implemented with MongoDB-backed auth state.
- Express scaffolding exists; routes are defined separately and can access the Baileys socket via `app.locals.whatsapp_socket`.
- Multi-account support: Each account has separate MongoDB collection for auth state and dedicated socket.
- Pluggable media storage backends: GridFS (default) and Cloudinary (in progress).
- Core endpoints available:
  - GET `/ping`
  - POST `/webhooks` (upsert webhook URLs)
  - Account management: POST `/accounts`, GET `/accounts`, GET `/accounts/:id`, DELETE `/accounts/:id`
  - Per-account endpoints: status, connect, disconnect, send messages (text, image, video, audio, document), react, delete, get messages, etc.
- Logging utilities added: HTTP request logger, Baileys event logger, and app logger writing JSON lines to `.logs/`.
- API documentation added in `API_DOCS.md`. License file added: GPL-3.0.

## Files Added/Updated This Session
- `mediaBackends.js` — GridFSBackend and CloudinaryBackend classes for pluggable media storage.
- `mediaHandler.new.js` — MediaHandler class that delegates to selected backend (GridFS or Cloudinary).
- `mediaHandler.js` — Original media handler (still used?).
- `accountRouter.js` — Per-account routing for messages, media, etc.
- `accountManager.js` — Manages multiple accounts.
- `socketManager.js` — Manages multiple sockets.
- `routes.js` — Updated with account management routes.
- `API_DOCS.md` — Updated with media backends, multi-account endpoints, and examples.
- `.env` — Added with MEDIA_STORAGE=cloudinary and placeholders.
- `TODO.md` — Added (untracked).

## Current Architecture
- `index.js` — Orchestrates MongoDB connection, Baileys sockets for accounts, and starts the HTTP server.
- `server.js` — Express helpers: `constructApp(sock)`, `makeApp(app, routes)`, `startServer(app)`.
- `routes.js` — Exports `{ routes: RouteDef[] }` where a `RouteDef` is `{ method, path, handler }`.
- `mongoAuthState.js` — Mongo-backed Baileys auth state implementation.
- `db.js` — Connects to MongoDB using `MONGO_URL`, `DB_NAME`.
- `logger.js` — Logging utilities.
- `socketManager.js` — Manages multiple sockets and accounts.
- `accountManager.js` — Account CRUD operations.
- `mediaHandler.new.js` — Pluggable media handler.
- `mediaBackends.js` — Backend implementations.

## How to Wire Things (No code changes performed here)
- Apply routes:
  - After `const app = constructApp(sock);` call `makeApp(app, require('./routes').routes)`
- Start server: keep `startServer(app)` after routes.
- Enable logging:
  - HTTP: `app.use(require('./logger').httpLogger());`
  - Baileys: `require('./logger').wireSocketLogging(sock);`

## Observations & Recommendations
1) License mismatch
- `LICENSE` is GPL-3.0; `package.json` license is `ISC`.
- Recommendation: update `package.json` to `"license": "GPL-3.0-only"` for consistency.

2) Env var naming mismatch
- `server.js` uses `HOST`/`PORT`. `.env.example` shows `SERVER_HOST`/`SERVER_PORT`.
- Recommendation: align `.env.example` to `HOST`/`PORT` or support both.

3) DB connection reuse
- Current endpoints call `connectToDB()` per request.
- Recommendation: hold a single MongoClient/DB instance and reuse it across requests to avoid connection churn.

4) Potential bug in `mongoAuthState.js`
- In `keys.get`, for `app-state-sync-key`, code uses `proto.Message.AppStateSyncKeyData.fromObject(data)` with the entire accumulator.
- Recommendation: use the per-id value (likely `value`) rather than the accumulator `data`.

5) Export pattern in `mongoAuthState.js`
- Uses `module.exports = useMongoDBAuthState = async (...) => {}` which assigns to an undeclared variable.
- Recommendation: switch to `module.exports = async function useMongoDBAuthState(...) { ... }`.

6) ESM/CJS consistency
- Project is CommonJS. Avoid adding `"type": "module"` unless ready to refactor. If ESM is needed, use `createRequire` or convert imports.

7) Security considerations
- Webhook registration accepts arbitrary URLs. Risk of SSRF if dispatch code is added without restrictions.
- Recommendations:
  - Validate/whitelist domains or IP ranges.
  - Disallow local addresses (e.g., 127.0.0.1, RFC1918) if running in shared environments.
  - Add request signing for outbound webhook delivery.
  - Rate-limit POST `/webhooks`.

8) Media backend status
- Pluggable backends implemented, but Cloudinary backend is stubbed (not implemented).
- GridFS backend works, Cloudinary needs credentials and implementation.
- Switch via `MEDIA_STORAGE` env var.

## Roadmap Suggestions
- Complete Cloudinary backend implementation.
- Add GET `/webhooks` (list) and DELETE `/webhooks` (remove).
- Implement webhook delivery from inbound message events with retries/backoff.
- Add basic authentication for endpoints.
- Centralize DB connection management.
- Add request validation (e.g., zod/joi) and unified error handling.
- Add tests for route handlers and webhook delivery.
- Add CI and production configuration (Docker, health checks).
- Fix Baileys version issues if any.

## Quick Test Commands
- Health:
```
curl -sS http://localhost:3000/ping
```
- Register webhook:
```
curl -sS -X POST http://localhost:3000/webhooks \
  -H 'content-type: application/json' \
  -d '{"url":"https://webhook.site/your-id"}'
```
- Create account:
```
curl -sS -X POST http://localhost:3000/accounts \
  -H 'content-type: application/json' \
  -d '{"id":"test","name":"Test Account"}'
```
- Send image (after connecting account):
```
curl -sS -X POST http://localhost:3000/accounts/test/message/send/image \
  -F "image=@/path/to/image.jpg" \
  -F "to=9002179990@s.whatsapp.net"
```

## Status
- Multi-account WhatsApp integration with pluggable media storage (GridFS working, Cloudinary in progress).
- All endpoints implemented and documented.
- Code committed to `feature/cloudinary-integration` branch (DO NOT MERGE until tested).
- Ready for testing and further development.

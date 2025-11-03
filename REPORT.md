# Project Report — Wildcat (WhatsApp Integration Layer)

Date: 2025-11-03

## Summary
- WhatsApp connectivity via Baileys is implemented with MongoDB-backed auth state.
- Express scaffolding exists; routes are defined separately and can access the Baileys socket via `app.locals.whatsapp_socket`.
- Core endpoints available:
  - GET `/ping`
  - POST `/webhooks` (upsert webhook URLs)
- Logging utilities added: HTTP request logger, Baileys event logger, and app logger writing JSON lines to `.logs/`.
- API documentation added in `API_DOCS.md`. License file added: GPL-3.0.

## Files Added/Updated This Session
- `routes.js` — Added GET `/ping` and POST `/webhooks` (idempotent upsert).
- `webhookHandler.js` — Added `sendToWebhook(url, payload)` using axios.
- `logger.js` — Added JSON logger, HTTP logging middleware, and Baileys event logging helper.
- `API_DOCS.md` — Documented available endpoints with request/response examples.
- `LICENSE` — GNU GPL v3.0 text.
- `README.md` — Updated to reference API docs, logging usage, and license.

## Current Architecture
- `index.js` — Orchestrates MongoDB connection, Baileys socket, and starts the HTTP server.
- `server.js` — Express helpers: `constructApp(sock)`, `makeApp(app, routes)`, `startServer(app)`.
- `routes.js` — Exports `{ routes: RouteDef[] }` where a `RouteDef` is `{ method, path, handler }`.
- `mongoAuthState.js` — Mongo-backed Baileys auth state implementation.
- `db.js` — Connects to MongoDB using `MONGO_URL`, `DB_NAME`.
- `logger.js` — Logging utilities.

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

## Roadmap Suggestions
- Add GET `/webhooks` (list) and DELETE `/webhooks` (remove).
- Implement webhook delivery from inbound message events with retries/backoff.
- Add basic authentication for endpoints.
- Centralize DB connection management.
- Add request validation (e.g., zod/joi) and unified error handling.
- Add tests for route handlers and webhook delivery.
- Add CI and production configuration (Docker, health checks).

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

## Status
- Core plumbing works; endpoints and logging are in place. Some cleanup and enhancements recommended as above.

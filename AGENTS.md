# AGENTS.md — Guidance for Future Agent Sessions

Scope: Entire repository

## Goals
- Maintain a stable WhatsApp integration via Baileys with MongoDB-backed auth state.
- Grow REST endpoints incrementally, keeping socket lifecycle separate from HTTP server.
- Keep logging consistent and machine-parseable (JSON lines in `.logs/`).

## Conventions
- CommonJS modules (do not add `"type": "module"` unless converting codebase).
- Route definitions live in `routes.js` as an array of `{ method, path, handler }` and are mounted via `makeApp(app, routes)`.
- WhatsApp socket is available to route handlers via `req.app.locals.whatsapp_socket` (set by `constructApp(sock)`).
- Use the logging helpers in `logger.js`:
  - `httpLogger()` as early middleware
  - `wireSocketLogging(sock)` right after socket creation
  - `appLogger(context, file)` for custom logs

## Do / Don’t
- Do: Reuse a single Mongo client/db across requests; avoid connecting per request.
- Do: Validate and sanitize user input; prefer returning `{ ok: boolean, ... }` shapes.
- Do: Keep API docs in `API_DOCS.md` in sync with routes.
- Do: Document new env vars in README and `.env.example`.
- Don’t: Change `index.js` socket lifecycle without clear need.
- Don’t: Introduce ESM syntax unless repo is migrated.

## Known Issues / TODOs
1) License mismatch: Package shows `ISC`, LICENSE is GPL-3.0. Update `package.json` to `GPL-3.0-only`.
2) Env mismatch: `.env.example` has `SERVER_HOST`/`SERVER_PORT`, code uses `HOST`/`PORT`. Align.
3) `mongoAuthState.js` potential bug in `keys.get` for `app-state-sync-key` (uses accumulator not per-key value). Fix conservatively.
4) Export pattern in `mongoAuthState.js` assigns to undeclared variable; switch to named function export.
5) DB connection reuse: introduce a singleton client to reduce connection churn.
6) Webhooks: add GET/DELETE endpoints, retries/backoff, request signing, SSRF protections.

## Testing & Validation
- Keep endpoints small and testable; add unit tests for route handlers if a test framework is introduced.
- For manual checks:
  - `curl http://localhost:3000/ping`
  - `curl -X POST http://localhost:3000/webhooks -H 'content-type: application/json' -d '{"url":"https://example.com"}'`
- Tail logs: `tail -f .logs/*.log`

## PR/Commit Style
- Small, focused changes.
- Include rationale in commit messages (the “why”).
- Update README and API_DOCS when adding/modifying endpoints.

## Security
- Treat webhook URLs cautiously; avoid SSRF by restricting addresses/domains when implementing dispatch.
- Don’t log secrets; keep `httpLogger({ redactBody: true })` in production.

## How to Add New Endpoints
1. Add a new object to the array in `routes.js`.
2. Handlers can access the socket via `req.app.locals.whatsapp_socket`.
3. Update `API_DOCS.md` and README if public.
4. Consider logging via `appLogger`.

## Contact Points
- Socket entry: `index.js` (create and wire socket, call `constructApp(sock)`).
- Express helpers: `server.js`.
- Logging helpers: `logger.js`.
- Webhook handler: `webhookHandler.js`.

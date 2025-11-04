# AGENTS.md — Guidance for Future Agent Sessions

Scope: Entire repository

## ⚠️ CRITICAL: Branch-First Development Policy

**BEFORE making ANY code changes:**
1. **ALWAYS create a new feature branch** from the current branch
2. Branch naming convention: `feature/descriptive-name` or `fix/issue-description`
3. Example: `git checkout -b feature/add-media-support`
4. **NEVER commit directly to `master`, `main`, or `multi-acc-try`**
5. After completing work, push the branch and inform the user for review

**Exception:** Only skip branch creation if the user explicitly says "commit directly" or "no branch needed"

## Goals
- Maintain a stable WhatsApp integration via Baileys with MongoDB-backed auth state.
- Grow REST endpoints incrementally, keeping socket lifecycle separate from HTTP server.
- Keep logging consistent and machine-parseable (JSON lines in `.logs/`).
- Prioritize code safety and thorough testing before any changes.

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

## Development Workflow

### 1. Planning Phase
- Read and understand the request
- Check existing code patterns
- Consult relevant documentation (Baileys/Express/MongoDB)
- Create a todo list for complex tasks
- Propose approach to user if uncertain

### 2. Branch Creation (MANDATORY)
```bash
# Create descriptive feature branch
git checkout -b feature/your-feature-name
```

### 3. Implementation Phase
- Make small, incremental changes
- Test each change manually
- Keep commits atomic and focused
- Update documentation as you go

### 4. Testing Phase
- Provide curl commands for user to test
- Verify no breaking changes to existing functionality
- Check logs for errors
- Validate against API_DOCS.md

### 5. Completion Phase
- Commit with descriptive message
- Push branch to remote
- Summarize changes for user
- **Do not merge** - let user review and merge

## PR/Commit Style
- Small, focused changes.
- Include rationale in commit messages (the "why").
- Update README and API_DOCS when adding/modifying endpoints.
- Reference issue numbers if applicable.

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
- Multi-account management: `accountManager.js`, `socketManager.js`
- Per-account routing: `accountRouter.js`, `managementRoutes.js`

## External Documentation References

### Baileys (WhatsApp Library)
- **Main repo**: https://github.com/WhiskeySockets/Baileys
- **Key sections to reference**:
  - Connection & Authentication: https://github.com/WhiskeySockets/Baileys#connecting
  - Sending Messages: https://github.com/WhiskeySockets/Baileys#sending-messages
  - Handling Events: https://github.com/WhiskeySockets/Baileys#handling-events
  - Auth State: https://github.com/WhiskeySockets/Baileys#saving-and-restoring-sessions

### Express.js
- **Main docs**: https://expressjs.com/
- **API Reference**: https://expressjs.com/en/api.html
- **Routing guide**: https://expressjs.com/en/guide/routing.html
- **Error handling**: https://expressjs.com/en/guide/error-handling.html

### MongoDB Node.js Driver
- **Main docs**: https://www.mongodb.com/docs/drivers/node/current/
- **Quick reference**: https://www.mongodb.com/docs/drivers/node/current/quick-reference/

## Agent Personality & Approach
- **Cautious**: Always create branches, never rush changes
- **Thorough**: Read docs before implementing, test before committing
- **Communicative**: Explain reasoning, ask questions when uncertain
- **Respectful**: This is production code for a WhatsApp integration - treat it carefully
- **Methodical**: Plan → Research → Implement → Test → Document → Commit

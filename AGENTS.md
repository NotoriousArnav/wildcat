# AGENTS.md — Quick Guide for Coding Agents
Scope: entire repo. Always branch first (feature/... or fix/...), never commit to master/main.
Build/run: `npm ci`; dev: `npm run dev`; prod: `npm start`.
Health check: `npm run ping` or `curl http://localhost:3000/ping`.
Tests: none configured; use curl/manual checks. If Jest is added: `npx jest path/to.test.js -t "name"` for single tests.
Lint/format: ESLint v9+ is configured (see eslint.config.js). Use 2‑space indent, single quotes, semicolons, trailing newline. Run `npx eslint . --ext .js` before committing.
Modules: CommonJS only (`require`/`module.exports`). Do not introduce ESM.
Imports: group built‑in, deps, local; use relative paths (`./`, `../`). Avoid deep coupling.
Types: plain JS; add JSDoc for complex functions. Do not add TS files unless requested.
Naming: camelCase vars/functions; PascalCase classes; UPPER_SNAKE for constants/env.
Errors: validate inputs; respond JSON `{ ok:false, error }` with correct HTTP codes; avoid uncaught throws in handlers.
Logging: use `logger.js` helpers (`httpLogger`, `wireSocketLogging`, `appLogger`). Never log secrets.
MongoDB: reuse a single client (no per‑request connects). Keep auth state in `mongoAuthState.js`.
Routes: define in `routes.js` as `[{ method, path, handler }]`; use `req.app.locals.whatsapp_socket`.
Socket lifecycle: in `index.js`; don’t change without need; keep HTTP and socket separate.
Env vars: `HOST`, `PORT`, `MONGO_URL`, `DB_NAME`; keep README and `.env.example` in sync.
API shape: return `{ ok: boolean, ... }`; keep endpoints small and testable.
Docs: update `docs/API_Reference.md` and `README.md` when adding/modifying endpoints.
Security: avoid SSRF in webhooks; sanitize input; restrict logging; no `eval`/`new Function`.
Tools: No Cursor or Copilot rules present. Follow CodeRabbit settings in `.coderabbit.yml`.

# NEXT STEPS - WILDCAT Phase 2 & Beyond

**Last Updated:** Nov 11, 2025  
**Current Branch:** `feature/phase1-modernization`  
**Latest Commit:** `2f7fe91` - docs: clean up redundant documentation files and consolidate to GitHub Pages

---

## Phase 1 Status: ✅ COMPLETE

### Completed Tasks
- ✅ ESLint compliance (all 43 errors fixed, 18 warnings removed)
- ✅ Full test suite (164 tests passing)
- ✅ Documentation cleanup (6 redundant files removed, consolidated to GitHub Pages)
- ✅ Code organization (entire codebase in `src/` folder structure)
- ✅ TypeScript foundation (3 files already converted: logger.ts, db.ts, types/index.ts)

### Key Metrics
- **Test Coverage:** 164 tests, all passing
- **Code Quality:** 0 ESLint errors, 0 warnings
- **Build Status:** Ready for production

---

## Phase 2: TypeScript & ESM Migration (READY TO START)

### Overview
Convert remaining CommonJS files to TypeScript + ESM (ES2020 modules).

### Current State
- **Module System:** CommonJS (require/module.exports) - **NEEDS UPDATE**
- **TypeScript Files:** 3 of ~20 files converted (logger.ts, db.ts, types/index.ts)
- **ESM Ready:** Build tools configured (tsc, tsx, nodemon available)
- **tsconfig.json:** Configured for ES2020 + ESM with strict mode
- **Package.json:** Has build scripts ready (`build`, `dev:ts`, `start:ts`)

### Files Requiring Conversion

#### Core Source Files (High Priority)
1. `src/index.js` - Main entry point
2. `src/server.js` - Express server setup
3. `src/routes.js` - Route definitions
4. `src/accountManager.js` - Account management
5. `src/accountRouter.js` - Account routing
6. `src/socketManager.js` - Socket lifecycle management
7. `src/mediaHandler.js` - Media handling
8. `src/webhookHandler.js` - Webhook logic
9. `src/mongoAuthState.js` - MongoDB auth state

#### Middleware & Validators (Medium Priority)
10. `src/middleware/authMiddleware.js`
11. `src/middleware/webhookSecurityMiddleware.js`
12. `src/validators/validationSchemas.js`

#### Other Files (Lower Priority)
13. `src/audioConverter.js` - Audio conversion utility
14. `src/managementRoutes.js` - Management routes
15. `scripts/cli.js` - CLI utility
16. `index.js` - Root entry point

#### Legacy JavaScript (Can keep as .js or convert)
- `src/db.js` - Already have db.ts
- `src/logger.js` - Already have logger.ts

### Migration Strategy

1. **Update package.json:**
   ```json
   {
     "type": "module",
     "main": "dist/index.js",
     "exports": {
       ".": "./dist/index.js"
     }
   }
   ```

2. **Convert files incrementally:**
   - Start with core utilities (db.ts, logger.ts already done)
   - Move to middleware and validators
   - Then main application files
   - Finally, scripts and entry points

3. **Update imports:**
   - Replace `require()` with `import`
   - Replace `module.exports` with `export`
   - Add `.js` file extensions in ESM imports
   - Update path resolutions

4. **Test after each conversion:**
   - Run ESLint checks
   - Run Jest tests
   - Verify build output with `npm run build`
   - Test locally with `npm run dev:ts`

5. **Remove legacy files:**
   - Delete `.js` versions after successful conversion
   - Keep `.ts` versions only

### Testing Strategy
- Update Jest config if needed for ESM
- Ensure all 164 tests continue to pass
- Add new tests for TypeScript types as needed
- Verify build artifacts in `dist/` folder

### Build Pipeline After Phase 2
```bash
npm run build          # Compiles TypeScript to dist/
npm start              # Runs compiled JavaScript
npm run dev:ts         # Runs with tsx watch (development)
npm test               # Jest tests
npm run lint           # ESLint checks
npm run lint:fix       # Auto-fix ESLint issues
```

---

## Phase 3: Security Hardening (Post TypeScript)

### Planned Security Enhancements
- [ ] API key authentication (replace/enhance basic auth)
- [ ] Rate limiting refinement
- [ ] CSRF protection
- [ ] Input sanitization improvements
- [ ] Webhook signature verification enhancements
- [ ] SSRF protection for webhooks (validate URLs)
- [ ] Environment variable validation at startup

---

## Phase 4: Performance Optimization

### Areas to Optimize
- [ ] Connection pooling (MongoDB)
- [ ] Caching strategy (Redis or in-memory)
- [ ] Media file optimization
- [ ] Query optimization
- [ ] Memory management review

---

## Decision Points

### Before Starting Phase 2:
- [ ] Decide: Merge Phase 1 first (to main), or continue on feature branch?
- [ ] Team review of TypeScript configuration
- [ ] Confirm ESM migration is desired (vs staying CommonJS)

### During Phase 2:
- [ ] Handle legacy db.js and logger.js (delete or keep for backwards compat?)
- [ ] Plan for gradual rollout vs big bang conversion
- [ ] Define Node.js version requirement (recommend 18+)

### After Phase 2:
- [ ] Update CI/CD pipeline for TypeScript build step
- [ ] Update Docker build if using containers
- [ ] Update deployment documentation
- [ ] Consider creating `dist/` in .gitignore or version control

---

## Quick Reference: Commands for Phase 2

```bash
# Build TypeScript
npm run build

# Development with TypeScript watching
npm run dev:ts

# Run compiled output
npm start

# Run tests
npm test

# Linting
npm run lint
npm run lint:fix

# Type checking only (no build)
npx tsc --noEmit

# Check for unused code
npx knip
```

---

## Files to Update After Phase 2

- [ ] README.md - Update build/run instructions
- [ ] DEVELOPMENT.md - Update dev setup guide
- [ ] SETUP.md - Update installation guide
- [ ] GitHub Actions CI/CD workflow (add TypeScript build step)
- [ ] Dockerfile - Update build process
- [ ] package.json - Clean up dev deps, set Node version
- [ ] .gitignore - Add dist/ if not already there

---

## Notes

- **Duplicate Files:** Currently have both `.js` and `.ts` versions of logger and db. Plan to remove `.js` versions after full ESM conversion.
- **Testing:** Jest is configured for TypeScript via `@types/jest`. Tests may need updates for ESM imports.
- **Type Definitions:** Comprehensive type definitions already exist in `src/types/index.ts`. Leverage these across the codebase.
- **Dependencies:** All required TypeScript tooling already in package.json (typescript, tsx, @types/node, @types/express, @types/jest)

---

## Related Documentation

- See `AGENTS.md` for development guidelines
- See `docs/DEVELOPMENT.md` for detailed setup
- See `README.md` for quick start
- GitHub Pages: https://notoriousarnav.github.io/wildcat/

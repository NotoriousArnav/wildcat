# WILDCAT v3.0 Migration Plan

**Target Release:** Q2 2025 (Tentative)  
**Status:** Planning Phase  
**Breaking Changes:** YES - Major version bump required

## Overview

WILDCAT v3.0 will modernize the codebase with ESM, TypeScript, proper authentication, and security improvements. This document outlines the migration strategy.

---

## Phase 1: Code Quality & Modernization (4-6 weeks)

**Goal:** Improve maintainability and developer experience without breaking functionality.

### 1.1 Logging Cleanup (1 week)
- [ ] Replace 99 `console.log` statements with `logger` calls
- [ ] Add log levels (debug, info, warn, error)
- [ ] Add log rotation support
- [ ] Add `LOG_LEVEL` and `LOG_TO_FILE` environment variables
- [ ] Update documentation

**Files affected:** All `.js` files  
**Breaking changes:** None (internal only)

### 1.2 ESM + TypeScript Setup (1 week)
- [ ] Install TypeScript and type definitions
- [ ] Create `tsconfig.json` with ESM target
- [ ] Update `package.json` with `"type": "module"`
- [ ] Create `src/` directory structure
- [ ] Setup build scripts (`npm run build`, `npm run dev`)
- [ ] Update Docker image to build TypeScript

**Breaking changes:** None yet (compiled output remains compatible)

### 1.3 Incremental Migration to TypeScript (2-3 weeks)

**Migration order (easiest to hardest):**

1. **Week 1: Utilities**
   - [ ] `logger.js` → `logger.ts`
   - [ ] `db.js` → `db.ts`
   - [ ] Test: Ensure builds and runs

2. **Week 2: Core Logic**
   - [ ] `accountManager.js` → `accountManager.ts`
   - [ ] `audioConverter.js` → `audioConverter.ts`
   - [ ] `mediaHandler.js` → `mediaHandler.ts`
   - [ ] Define interfaces: `Account`, `MediaFile`, etc.

3. **Week 3: Routes & Server**
   - [ ] `routes.js` → `routes.ts`
   - [ ] `managementRoutes.js` → `managementRoutes.ts`
   - [ ] `accountRouter.js` → `accountRouter.ts`
   - [ ] `webhookHandler.js` → `webhookHandler.ts`
   - [ ] Define request/response types

4. **Week 4: Critical Files**
   - [ ] `socketManager.js` → `socketManager.ts` (most complex)
   - [ ] `mongoAuthState.js` → `mongoAuthState.ts`
   - [ ] `server.js` → `server.ts`
   - [ ] `index.js` → `index.ts`

### 1.4 Type Definitions (Ongoing)
```typescript
// types/index.ts
export interface Account {
  phoneNumber: string;
  name?: string;
  webhookUrl?: string;
  status: 'active' | 'disconnected' | 'qr_required';
  createdAt: Date;
  lastConnected?: Date;
}

export interface SendMessageRequest {
  to: string;
  message: string;
  options?: {
    linkPreview?: boolean;
    quotedMessage?: string;
  };
}

export interface SendMessageResponse {
  ok: boolean;
  messageId?: string;
  timestamp?: number;
  error?: string;
}

export interface WebhookPayload {
  event: string;
  account: string;
  from: string;
  fromContact?: ContactInfo;
  chat?: ChatInfo;
  message: string;
  timestamp: number;
}

export interface ContactInfo {
  name?: string;
  pushName?: string;
  number: string;
  isMyContact: boolean;
}

export interface ChatInfo {
  id: string;
  name?: string;
  isGroup: boolean;
  participants?: number;
}
```

**Breaking changes:** None (types are compile-time only)

---

## Phase 2: Security & Authentication (3-4 weeks)

**Goal:** Make WILDCAT safe to deploy on public internet.

### 2.1 Basic HTTP Authentication (Week 1)

**Add to `.env`:**
```env
# Basic HTTP Authentication (temporary, will be replaced by API keys)
BASIC_AUTH_ENABLED=true
BASIC_AUTH_USERNAME=admin
BASIC_AUTH_PASSWORD=your-secure-password-here
```

**Implementation:**
```typescript
// middleware/basicAuth.ts
import { Request, Response, NextFunction } from 'express';

export function basicAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  if (process.env.BASIC_AUTH_ENABLED !== 'true') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Basic ')) {
    return res.status(401).json({ 
      ok: false, 
      error: 'Authentication required' 
    });
  }

  const [username, password] = Buffer.from(
    authHeader.slice(6), 
    'base64'
  ).toString().split(':');

  if (username === process.env.BASIC_AUTH_USERNAME && 
      password === process.env.BASIC_AUTH_PASSWORD) {
    return next();
  }

  res.status(401).json({ ok: false, error: 'Invalid credentials' });
}
```

**Apply to all routes:**
```typescript
// server.ts
app.use('/accounts', basicAuthMiddleware);
app.use('/webhooks', basicAuthMiddleware);
// etc.
```

**Breaking change:** ✅ YES - All API calls now require authentication header

### 2.2 API Key Authentication (Week 2)

**Add to `.env`:**
```env
# API Key Authentication (recommended for production)
API_KEY_ENABLED=true
API_KEYS=key1:read,write|key2:read|key3:admin
```

**Implementation:**
```typescript
// middleware/apiKeyAuth.ts
export function apiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return res.status(401).json({ ok: false, error: 'API key required' });
  }

  const keys = parseApiKeys(process.env.API_KEYS || '');
  const keyInfo = keys.get(apiKey);

  if (!keyInfo) {
    return res.status(401).json({ ok: false, error: 'Invalid API key' });
  }

  // Attach permissions to request
  req.apiKeyPermissions = keyInfo.permissions;
  next();
}
```

**Breaking change:** ✅ YES - Requires `X-API-Key` header

### 2.3 Rate Limiting (Week 3)

```typescript
// middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { ok: false, error: 'Too many requests' }
});

export const sendMessageRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 messages per minute
  message: { ok: false, error: 'Message rate limit exceeded' }
});

// Apply:
app.use(globalRateLimit);
app.post('/accounts/:id/send', sendMessageRateLimit, handleSendMessage);
```

**Breaking change:** ⚠️ Partial - May affect high-volume users

### 2.4 SSRF Prevention (Week 4)

```typescript
// utils/webhookValidator.ts
import { URL } from 'url';

const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254', // AWS metadata
  '10.0.0.0/8',      // Private networks
  '172.16.0.0/12',
  '192.168.0.0/16',
];

export function isValidWebhookUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    
    // Must be HTTPS in production
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
      return false;
    }
    
    // Check against blocked hosts
    if (BLOCKED_HOSTS.some(blocked => url.hostname.includes(blocked))) {
      return false;
    }
    
    // Additional validation: no file:// or data:// protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}
```

**Breaking change:** ⚠️ Partial - Webhook URLs with localhost/private IPs will be rejected

### 2.5 Input Validation

```typescript
// utils/validation.ts
import { z } from 'zod';

export const SendMessageSchema = z.object({
  to: z.string().regex(/^\d+@s\.whatsapp\.net$|^\d+@g\.us$/),
  message: z.string().min(1).max(10000),
  options: z.object({
    linkPreview: z.boolean().optional(),
    quotedMessage: z.string().optional(),
  }).optional(),
});

export const CreateAccountSchema = z.object({
  id: z.string().regex(/^\+?\d{10,15}$/),
  name: z.string().optional(),
  webhookUrl: z.string().url().optional(),
});

// Usage in route:
app.post('/accounts/:id/send', async (req, res) => {
  const result = SendMessageSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Invalid input', 
      details: result.error.issues 
    });
  }
  // ... proceed with validated data
});
```

**Breaking change:** ⚠️ Partial - Malformed requests will be rejected

---

## Phase 3: Feature Enhancements (2-3 weeks)

### 3.1 Contact & Group Enrichment

**Webhook payload before:**
```json
{
  "from": "919876543210@s.whatsapp.net",
  "message": "Hello"
}
```

**Webhook payload after:**
```json
{
  "from": "919876543210@s.whatsapp.net",
  "fromContact": {
    "name": "Arnav Kumar",
    "pushName": "Arnav 🚀",
    "number": "919876543210",
    "isMyContact": true
  },
  "chat": {
    "id": "120363123456789@g.us",
    "name": "Engineering Team",
    "isGroup": true,
    "participants": 24
  },
  "message": "Hello"
}
```

**Breaking change:** ✅ YES - Webhook payload structure changes

### 3.2 New API Endpoints

```typescript
// GET /accounts/:id/contacts
// Returns all contacts with names

// GET /accounts/:id/groups  
// Returns all groups with metadata

// GET /accounts/:id/contacts/:jid
// Get specific contact info

// POST /accounts/:id/sync
// Force sync contacts and groups
```

**Breaking change:** None (new endpoints only)

---

## Phase 4: Testing & Production Readiness (2-3 weeks)

### 4.1 Automated Testing
- [ ] Setup Jest
- [ ] Unit tests for utilities
- [ ] Integration tests for API endpoints
- [ ] Mock Baileys for testing
- [ ] Target: 50%+ code coverage

### 4.2 CI/CD Pipeline
- [ ] GitHub Actions workflow
- [ ] Run tests on PR
- [ ] Build Docker image
- [ ] Automated security scanning

### 4.3 Documentation Updates
- [ ] Update API_Reference.md with new auth
- [ ] Create migration guide for v2 → v3
- [ ] Update all code examples
- [ ] Video walkthrough (optional)

---

## Breaking Changes Summary

### Required Actions for Users

**1. Environment Variables (NEW/REQUIRED):**
```env
# Choose one authentication method:
BASIC_AUTH_ENABLED=true
BASIC_AUTH_USERNAME=admin
BASIC_AUTH_PASSWORD=secure-password

# OR
API_KEY_ENABLED=true
API_KEYS=your-key-here:read,write
```

**2. API Requests (BREAKING):**
```bash
# Before (v2.x):
curl http://localhost:3000/accounts/mybot/send \
  -d '{"to": "1234@s.whatsapp.net", "message": "Hi"}'

# After (v3.x) - Basic Auth:
curl http://localhost:3000/accounts/mybot/send \
  -u admin:password \
  -d '{"to": "1234@s.whatsapp.net", "message": "Hi"}'

# After (v3.x) - API Key:
curl http://localhost:3000/accounts/mybot/send \
  -H "X-API-Key: your-key-here" \
  -d '{"to": "1234@s.whatsapp.net", "message": "Hi"}'
```

**3. Webhook Payloads (BREAKING):**
- New fields: `fromContact`, `chat`
- Update webhook handlers to handle new structure
- Old fields remain for backward compatibility

**4. Webhook URLs (BREAKING):**
- localhost/private IPs rejected in production
- Must use HTTPS in production
- Add validation before registering webhooks

**5. Rate Limits (NEW):**
- 100 requests per 15 minutes (global)
- 20 messages per minute (per account)
- Plan accordingly for high-volume use cases

---

## Migration Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1.1: Logging | 1 week | Not Started |
| Phase 1.2: ESM Setup | 1 week | Not Started |
| Phase 1.3: TS Migration | 2-3 weeks | Not Started |
| Phase 2.1: Basic Auth | 1 week | Not Started |
| Phase 2.2: API Keys | 1 week | Not Started |
| Phase 2.3: Rate Limiting | 1 week | Not Started |
| Phase 2.4: SSRF Fix | 1 week | Not Started |
| Phase 3: Features | 2-3 weeks | Not Started |
| Phase 4: Testing | 2-3 weeks | Not Started |
| **Total** | **12-16 weeks** | **Q2 2025 target** |

---

## Rollout Strategy

### Alpha (v3.0.0-alpha.1)
- Internal testing only
- Breaking changes may still occur
- Not recommended for production

### Beta (v3.0.0-beta.1)
- Feature-complete
- Public testing
- Migration guide available
- Bug fixes only

### RC (v3.0.0-rc.1)
- Release candidate
- No breaking changes from beta
- Documentation finalized
- Ready for production testing

### Stable (v3.0.0)
- Production-ready
- Full migration support
- Long-term support (LTS)

---

## Support

**v2.x Support:**
- Security fixes: Until v3.0 stable release
- Bug fixes: 3 months after v3.0 release
- New features: None (frozen)

**v3.x Support:**
- Full support ongoing
- Regular updates
- Community contributions welcome

---

## Questions?

Open an issue on GitHub: https://github.com/NotoriousArnav/wildcat/issues

**Track progress:** https://github.com/NotoriousArnav/wildcat/projects

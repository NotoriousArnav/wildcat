# WILDCAT

**W**hatsApp **I**ntegration **L**ayer for **D**ata **C**onnectivity **A**nd **T**ransfer

[![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/NotoriousArnav/wildcat?utm_source=oss&utm_medium=github&utm_campaign=NotoriousArnav%2Fwildcat&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)](https://coderabbit.ai)

> **Unofficial WhatsApp integration** using reverse-engineered libraries. Use at your own risk and ensure compliance with WhatsApp's terms of service.

**WILDCAT** is a Node.js API server that provides REST endpoints for WhatsApp messaging, media handling, and webhook delivery. Built with Baileys and MongoDB for reliable multi-account support.

## ✨ Why Wildcat?

**Advantages:**
- 🚀 **Multi-Account Support** - Manage multiple WhatsApp numbers simultaneously
- 📱 **Full WhatsApp Features** - Send/receive messages, media, reactions, and more
- 🔗 **Webhook Integration** - Real-time message delivery to external services
- 🧾 **Media Storage** - Automatic GridFS storage with direct access endpoints
- 🤖 **Bot-Ready** - Perfect for chatbots, automation, and CRM integrations
- ⚡ **REST API** - Clean HTTP interface for easy integration

**Shortcomings:**
- ⚠️ **Unofficial** - Relies on reverse-engineered WhatsApp protocols
- 🚫 **Rate Limited** - Subject to WhatsApp's sending limits
- 🔒 **No Official Support** - Community-maintained, no guarantees
- 📵 **Ban Risk** - Automated usage may trigger WhatsApp bans

## 🚀 Quick Start

```bash
# Install
npm install

# Configure
cp .env.example .env  # Edit with your settings

# Run
npm start

# Create account
curl -X POST http://localhost:3000/accounts \
  -H 'Content-Type: application/json' \
  -d '{"id": "myaccount", "name": "My Account"}'

# Scan QR code and start messaging!
```

## 📚 Documentation

- **[Setup Guide](./docs/SETUP.md)** - Installation & configuration
- **[API Reference](./docs/API_Reference.md)** - Complete endpoint documentation
- **[Architecture](./docs/ARCHITECTURE.md)** - System design
- **[Development](./docs/DEVELOPMENT.md)** - Contributing guide

## 🧰 CLI Tools

```bash
npm run accounts     # List accounts
npm run account:create mybot "Bot Account"
npm run message:send mybot 1234567890@s.whatsapp.net "Hello!"
```

## 🐳 Docker

A minimal image is provided via the `Dockerfile` with ffmpeg installed for audio conversion.

- Build the image:
```bash
docker build -t wildcat:latest .
```

- Run the container (connect to MongoDB and expose port 3000):
```bash
docker run --name wildcat \
  -p 3000:3000 \
  -e HOST=0.0.0.0 \
  -e PORT=3000 \
  -e MONGO_URL="mongodb://host.docker.internal:27017" \
  -e DB_NAME=wildcat \
  -e AUTO_CONNECT_ON_START=true \
  wildcat:latest
```

- Using a Docker network with MongoDB:
```bash
# Example: run mongo separately
docker network create wildcat-net || true
docker run -d --name mongo --network wildcat-net -p 27017:27017 mongo:6

# Run Wildcat on the same network
docker run --name wildcat --network wildcat-net -p 3000:3000 \
  -e MONGO_URL="mongodb://mongo:27017" \
  -e DB_NAME=wildcat \
  -e AUTO_CONNECT_ON_START=true \
  wildcat:latest
```

Environment variables:
- `HOST` (default `0.0.0.0`)
- `PORT` (default `3000`)
- `MONGO_URL` (e.g., `mongodb://mongo:27017`)
- `DB_NAME` (e.g., `wildcat`)
- `ADMIN_NUMBER` (optional: `jid@s.whatsapp.net` to receive a startup ping)
- `AUTO_CONNECT_ON_START` (`true|false`) to auto-connect restored accounts

Health check: `GET /ping`

## 🔀 n8n Integration (Example)

The screenshot below demonstrates integrating Wildcat with n8n to receive webhooks and send WhatsApp messages via the REST API.

![n8n Workflow](./TEST_n8n_Workflow.jpeg)

Basic flow:
- Receive inbound message via Wildcat webhook at your n8n HTTP Trigger node.
- Transform or route the payload in n8n.
- Send an outbound WhatsApp message using an HTTP Request node:
  - Method: `POST`
  - URL: `http://<wildcat-host>:3000/accounts/<accountId>/message/send`
  - Body (JSON): `{ "to": "1234567890@s.whatsapp.net", "message": "Hello from n8n!" }`

Register the webhook URL in Wildcat:
```bash
curl -X POST http://<wildcat-host>:3000/webhooks \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://your-n8n-host/webhook/<id>"}'
```

Note: Server logs redact webhook URLs (credentials and query removed).

For more examples, see `docs/API_Reference.md`.

## ⚠️ Important: Upcoming Breaking Changes

**WILDCAT is undergoing major improvements.** The codebase is being modernized to improve maintainability, security, and developer experience. **Expect breaking changes** in upcoming releases.

### Current Limitations & Security Warnings

**🚨 CRITICAL: No Authentication**
- Currently, **anyone** with access to your server can send WhatsApp messages
- **DO NOT expose this API to the public internet** without a reverse proxy with authentication
- This is a **major security risk** and will be addressed in v3.0

**Current Issues:**
- No API authentication (open access)
- No rate limiting (spam risk)
- SSRF vulnerability in webhook handler
- Minimal input validation
- CommonJS only (limits modern library usage)
- 99 console.log statements instead of proper logging

### 🚧 Roadmap: v3.0 (Breaking Changes Expected)

**Phase 1: Code Quality & Migration (Current Focus)**
- Migrate to ES Modules (ESM)
- Migrate to TypeScript for type safety
- Replace console.log with structured logging
- Add JSDoc/TypeScript types for all APIs
- Code cleanup and refactoring

**Phase 2: Security (HIGH PRIORITY)**
- Basic HTTP authentication (username/password from env)
- API key authentication
- JWT-based authentication
- Rate limiting per account/IP
- Webhook URL validation (prevent SSRF)
- Input validation with Zod/Joi schemas

**Phase 3: Features**
- Contact and group name enrichment in webhooks
- Better error messages and logging
- Improved Docker deployment
- Health check improvements
- Metrics and monitoring endpoints

**Phase 4: Production Readiness**
- Automated testing (Jest)
- CI/CD pipeline
- Security audit
- Performance optimization
- Documentation updates

### Migration Guide (Coming Soon)

When v3.0 is released, you will need to:
- Update environment variables (add authentication credentials)
- Update API calls to include authentication headers
- Review breaking changes in webhook payload structure
- Update Docker configuration if using containers

**Stay updated:** Watch this repository for release announcements.

### Why These Changes?

**Current state:** WILDCAT works but is not production-ready due to security gaps and maintainability concerns.

**Goal:** Make WILDCAT:
- ✅ **Secure** - Safe to deploy without exposing your WhatsApp accounts
- ✅ **Modern** - ESM + TypeScript for better DX
- ✅ **Reliable** - Proper testing and error handling
- ✅ **Maintainable** - Clean code that's easy to contribute to

### For Current Users

**Recommendation:**
- Use WILDCAT in **development/staging only** until v3.0
- Deploy behind a reverse proxy with authentication (nginx, Caddy)
- Monitor logs for suspicious activity
- Keep backups of your MongoDB data
- Star/watch this repo for updates

**Timeline:** v3.0 expected in Q2 2025 (tentative)

## 🤝 Contributing

See [Development Guide](./docs/DEVELOPMENT.md) for contribution guidelines.

**Want to help with v3.0?** Priority areas:
- Security improvements (authentication, rate limiting)
- TypeScript migration
- Test coverage
- Documentation

## 🙏 Acknowledgments

This project builds upon the work of many open-source contributors. See [ACKNOWLEDGMENTS.md](./ACKNOWLEDGMENTS.md) for a complete list of third-party projects and libraries used, including:

- **@whiskeysockets/baileys** - WhatsApp Web API implementation
- **mongo-baileys** - MongoDB session persistence (adapted code in `mongoAuthState.js`)
- **Express**, **MongoDB**, and many other excellent npm packages

## 📄 License

GPL-3.0-only — See `LICENSE`

This project includes adapted code from MIT-licensed dependencies, which is compatible with GPL-3.0. All original copyright notices and attributions are preserved in the respective files and documented in `ACKNOWLEDGMENTS.md`.

---

**Repository:** https://github.com/NotoriousArnav/wildcat

## 🤖 CodeRabbit Setup

- Install the CodeRabbit GitHub App and grant access to this repo
- Ensure this config file exists: `.coderabbit.yml` at repo root
- Open a PR; CodeRabbit will auto-review and comment
- Optional: Require the CodeRabbit status check in branch protection


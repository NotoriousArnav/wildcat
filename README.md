<div align="center">

# 🐱 WILDCAT

**W**hatsApp **I**ntegration **L**ayer for **D**ata **C**onnectivity **A**nd **T**ransfer

[![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/NotoriousArnav/wildcat?utm_source=oss&utm_medium=github&utm_campaign=NotoriousArnav%2Fwildcat&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)](https://coderabbit.ai)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%203.0-blue.svg)](https://opensource.org/licenses/GPL-3.0)
[![Node.js Version](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0%2B-green.svg)](https://www.mongodb.com/)

> **Unofficial WhatsApp integration** using reverse-engineered libraries. Use at your own risk and ensure compliance with WhatsApp's terms of service.

### Enterprise-Grade WhatsApp REST API for Node.js

**WILDCAT** is a production-ready Node.js API server providing REST endpoints for WhatsApp messaging, media handling, and webhook delivery. Built with **Baileys** and **MongoDB** for reliable multi-account support.

Perfect for **chatbots**, **CRM integrations**, **marketing automation**, and **business workflows**.

<a href="#-quick-start"><strong>Get Started →</strong></a> · 
<a href="https://notoriousarnav.github.io/wildcat/"><strong>📚 Full Docs →</strong></a> · 
<a href="https://github.com/NotoriousArnav/wildcat/issues"><strong>Report Issues →</strong></a>

</div>

---

## ✨ Why Choose WILDCAT?

### 🎯 Key Features

| Feature | Details |
|---------|---------|
| 🚀 **Multi-Account Support** | Manage unlimited WhatsApp numbers simultaneously |
| 📱 **Full WhatsApp Features** | Messages, media, reactions, statuses, and more |
| 🔗 **Webhook Integration** | Real-time message delivery to external services |
| 🧾 **Media Storage** | Automatic GridFS with direct-access endpoints |
| 🤖 **Bot-Ready** | Perfect for chatbots, automation, CRM integrations |
| ⚡ **REST API** | Clean HTTP interface, easy integration |
| 🐳 **Docker Support** | Production-ready containerization |
| 📊 **Structured Logging** | JSON-based logging for monitoring & debugging |

### ⚠️ Important Considerations

**Limitations:**
- ⚠️ **Unofficial** - Relies on reverse-engineered WhatsApp Web protocols
- 🚫 **Rate Limited** - Subject to WhatsApp's sending limits (typically 60 msg/min)
- 🔒 **No Official Support** - Community-maintained, no guarantees
- 📵 **Ban Risk** - Heavy automated usage may trigger WhatsApp account bans

**Recommended Use Cases:**
- ✅ Development and testing environments
- ✅ Bot automation for personal/small business use
- ✅ Webhook-based workflows (n8n, Zapier, Make.com)
- ✅ Message broadcasting to opt-in contacts
- ✅ Customer support automation

**Not Recommended For:**
- ❌ Large-scale spam/marketing (violates WhatsApp ToS)
- ❌ Production without proper security controls
- ❌ High-volume transaction messaging (use official WhatsApp Business API)
- ❌ Public internet exposure without authentication

---

## 🚀 Quick Start

### 1️⃣ Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **MongoDB** 6.0+ ([Local](https://docs.mongodb.com/manual/installation/) or [Atlas](https://www.mongodb.com/cloud/atlas))
- **Git** (optional, for cloning)

### 2️⃣ Installation & Setup

```bash
# Clone repository
git clone https://github.com/NotoriousArnav/wildcat.git
cd wildcat

# Install dependencies
npm ci

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB URL and other settings
nano .env

# Start server
npm start
# Server runs on http://localhost:3000
```

### 3️⃣ Health Check

```bash
curl http://localhost:3000/ping
# Response: { "ok": true, "timestamp": "2025-11-08T..." }
```

### 4️⃣ Create Your First Account

```bash
# Create account via REST API
curl -X POST http://localhost:3000/accounts \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "mybot",
    "name": "My First Bot"
  }'

# Response: QR code + WebSocket connection ready
```

### 5️⃣ Scan QR Code & Start Messaging

The QR code will be displayed in terminal. Scan with your WhatsApp phone camera, and the account will authenticate.

```bash
# Send a test message
curl -X POST http://localhost:3000/accounts/mybot/message/send \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "1234567890@s.whatsapp.net",
    "message": "Hello from WILDCAT! 🐱"
  }'

# Response: { "ok": true, "messageId": "..." }
```

✅ **Success!** You're now sending WhatsApp messages via REST API.

### 📖 Next Steps

📚 **[Visit Full Documentation](https://notoriousarnav.github.io/wildcat/)** - Comprehensive guides and API reference

---

## 🧹 Code Quality

- **Linting:** ESLint v9+ (flat config) for code consistency
- **Testing:** Jest with 164+ passing tests
- **TypeScript:** Gradual migration in progress (`src/logger.ts`, `src/db.ts`)
- **Code Style:** 2-space indent, single quotes, trailing commas, semicolons

```bash
# Run tests
npm test

# Check code style
npx eslint . --ext .js

# Auto-fix style issues
npx eslint . --ext .js --fix
```

---

## 🐳 Docker Deployment

WILDCAT is Docker-ready with ffmpeg pre-installed for audio conversion.

### 🔨 Build Image

```bash
docker build -t wildcat:latest .
```

### 🚀 Run Standalone

```bash
docker run --name wildcat \
  -p 3000:3000 \
  -e HOST=0.0.0.0 \
  -e PORT=3000 \
  -e MONGO_URL="mongodb://host.docker.internal:27017" \
  -e DB_NAME=wildcat \
  wildcat:latest
```

### 🤝 Docker Compose (Recommended)

```bash
docker-compose up -d
```

See full documentation at [GitHub Pages](https://notoriousarnav.github.io/wildcat/) for detailed Docker setup.

---

## 🔀 Integration Examples

### n8n Workflow Integration

WILDCAT integrates seamlessly with **n8n** for visual workflow automation.

**Workflow Flow:**
```
Webhook Trigger (n8n)
        ↓
   Process/Transform
        ↓
HTTP Request → WILDCAT API
        ↓
WhatsApp Message Sent
```

### Other Integration Platforms

WILDCAT works with any HTTP-based automation platform:
- **Zapier** - Trigger webhooks and send messages
- **Make.com** - Complex workflows
- **IFTTT** - Simple if-this-then-that automation
- **Custom Applications** - Direct REST API calls

---

## 🚨 Security & Stability Notice

### ⚠️ CRITICAL: Current Security Status

**Current Status:** Development branch - Not production ready without authentication layer

| Issue | Risk | Mitigation |
|-------|------|-----------|
| No Authentication | 🔴 **CRITICAL** | Deploy behind reverse proxy with auth |
| No Rate Limiting | 🟠 HIGH | Planned for v3.0 |
| Limited Input Validation | 🟠 HIGH | Validation layer in development |

**⚠️ WARNING:** Do not expose to public internet without authentication. Deploy behind nginx/Caddy with auth layer.

### 🚧 v3.0 Roadmap

**Current Phase:** TypeScript & ESM Migration

- Phase 1: ✅ **Code Quality & Modernization** - ESLint compliance, test suite
- Phase 2: 🔄 **TypeScript & ESM** - Full migration in progress
- Phase 3: 🔜 **Security Hardening** - Authentication, rate limiting, validation
- Phase 4: 🔜 **Production Ready** - Security audit, performance optimization

---

## 🤝 Contributing

WILDCAT welcomes contributions! Priority areas:

| Area | Priority |
|------|----------|
| 🔐 Security improvements | 🔴 **HIGH** |
| 📘 TypeScript migration | 🔴 **HIGH** |
| ✅ Test coverage | 🟠 **MEDIUM** |
| 🐛 Bug fixes | 🟡 **ONGOING** |

### Development Setup

```bash
# Fork & clone
git clone https://github.com/YOUR_USERNAME/wildcat.git
cd wildcat

# Create feature branch
git checkout -b feature/your-feature-name

# Install & develop
npm ci
npm run dev

# Test & lint
npm test
npx eslint . --ext .js --fix

# Commit & push
git add .
git commit -m "feat: your description"
git push origin feature/your-feature-name
```

See [AGENTS.md](./AGENTS.md) for detailed contribution guidelines.

---

## 🙏 Acknowledgments

This project builds on excellent open-source work. See [ACKNOWLEDGMENTS.md](./ACKNOWLEDGMENTS.md) for complete credits.

**Key Dependencies:**
- **[@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys)** - WhatsApp Web API
- **[Express.js](https://expressjs.com/)** - Web framework
- **[MongoDB](https://www.mongodb.com/)** - Database
- **[Socket.io](https://socket.io/)** - Real-time communication

---

## 📄 License

**GPL-3.0-only** — See [`LICENSE`](./LICENSE)

This project includes adapted code from MIT-licensed dependencies. All copyright notices preserved in [`ACKNOWLEDGMENTS.md`](./ACKNOWLEDGMENTS.md).

**Disclaimer:** WILDCAT is an unofficial tool for educational purposes. Ensure compliance with WhatsApp ToS before use.

---

## 📊 Quick Links

| Link | Purpose |
|------|---------|
| 🔗 [GitHub](https://github.com/NotoriousArnav/wildcat) | Source code & issues |
| 📖 [Documentation](https://notoriousarnav.github.io/wildcat/) | Full docs on GitHub Pages |
| 🐛 [Issue Tracker](https://github.com/NotoriousArnav/wildcat/issues) | Bug reports & feature requests |
| 💬 [Discussions](https://github.com/NotoriousArnav/wildcat/discussions) | Community discussions |

---

## 🆘 Support

**Need help?**

- 📖 Check the [full documentation](https://notoriousarnav.github.io/wildcat/)
- 🐛 Search [existing issues](https://github.com/NotoriousArnav/wildcat/issues)
- 💬 Open a [discussion](https://github.com/NotoriousArnav/wildcat/discussions)
- 📝 Create a [new issue](https://github.com/NotoriousArnav/wildcat/issues/new)

## 📡 Stay Updated

⭐ **Star this repository** to be notified of releases.

🔔 **Watch** for announcements and updates.

---

<div align="center">

**Made with ❤️ by the WILDCAT community**

[⬆ back to top](#-wildcat)

</div>

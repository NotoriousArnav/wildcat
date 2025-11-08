---
layout: default
title: Documentation
nav_order: 1
description: "Complete guides for installing, configuring, and using WILDCAT"
permalink: /docs/
---

# WILDCAT Documentation

Complete guides for installing, configuring, and using WILDCAT.

---

## Quick Navigation

### Getting Started

| Guide | For | Time |
|-------|-----|------|
| **[Setup Guide](./SETUP.md)** | First-time installation & environment configuration | 10 min |
| **[Quick Start](#quick-start)** | Get up and running in 5 minutes | 5 min |

### 📖 Reference & Design

| Document | For | Use When |
|----------|-----|----------|
| **[API Reference](./API_Reference.md)** | All REST endpoints with examples | Building integrations |
| **[Architecture](./ARCHITECTURE.md)** | System design & module overview | Understanding the codebase |

### 👨‍💻 Development

| Guide | For | Purpose |
|-------|-----|---------|
| **[Development](./DEVELOPMENT.md)** | Contributors & maintainers | Setting up dev environment |

---

## ⚡ Quick Start

### 1. Prerequisites

```bash
# Check Node.js version (18+ required)
node --version

# Check MongoDB access
# (Local: mongodb://localhost:27017 or Atlas URL)
```

### 2. Install & Configure

```bash
# Install dependencies
npm ci

# Copy environment template
cp .env.example .env

# Edit configuration
# Required: MONGO_URL, DB_NAME
nano .env
```

### 3. Start Server

```bash
# Development (auto-reload)
npm run dev

# Production
npm start

# Health check
curl http://localhost:3000/ping
```

### 4. Create Account & Send Message

```bash
# Create account
curl -X POST http://localhost:3000/accounts \
  -H 'Content-Type: application/json' \
  -d '{"id": "mybot", "name": "My Bot"}'

# Scan QR code in terminal...

# Send message
curl -X POST http://localhost:3000/accounts/mybot/message/send \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "1234567890@s.whatsapp.net",
    "message": "Hello from WILDCAT! 🐱"
  }'
```

✅ **Done!** Check your WhatsApp to see the message.

---

## 📖 Documentation Structure

### [Setup Guide](./SETUP.md)
- ✅ System requirements
- ✅ Installation steps
- ✅ Environment variables
- ✅ Database setup (MongoDB)
- ✅ Docker configuration
- ✅ Troubleshooting

### [API Reference](./API_Reference.md)
- 🔌 Account endpoints
- 💬 Message endpoints
- 📁 Media endpoints
- 🔗 Webhook endpoints
- ⚠️ Error codes & handling
- 📊 Example workflows

### [Architecture](./ARCHITECTURE.md)
- 🏗️ System components
- 📡 Socket communication
- 💾 MongoDB schema
- 🔄 Message flow
- 🧩 Module dependencies

### [Development](./DEVELOPMENT.md)
- 🛠️ Local development setup
- 📝 Code style guidelines
- ✅ Testing procedures
- 🚀 Contributing workflow
- 📚 Code structure

---

## 🎓 Integration Examples

### n8n + WILDCAT Workflow

Automate WhatsApp responses using n8n visual workflows:

```
WhatsApp Message Received
    ↓
Webhook → n8n HTTP Trigger
    ↓
Process/Transform in n8n
    ↓
HTTP Request → WILDCAT API
    ↓
Send WhatsApp Reply
```

**Setup:**

```bash
# 1. Register webhook in WILDCAT
curl -X POST http://localhost:3000/webhooks \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://your-n8n-host/webhook/<id>"}'

# 2. Create n8n HTTP Request node
# Method: POST
# URL: http://wildcat-host:3000/accounts/mybot/message/send
# Body: { "to": "{{ $json.from }}", "message": "Your response" }
```

### Other Platforms

- **Zapier** - Receive webhook → Trigger Zap → Send message
- **Make.com** - Complex workflows with multiple steps
- **Custom Apps** - Direct REST API integration

---

## ❓ Frequently Asked Questions

### How do I get started?

1. Read [Setup Guide](./SETUP.md)
2. Install WILDCAT
3. Create your first account
4. Check [API Reference](./API_Reference.md) for endpoints

### What's the difference between this and official WhatsApp API?

WILDCAT uses reverse-engineered WhatsApp Web protocols (unofficial), while the official API requires business verification and approvals. WILDCAT is faster to set up but has risks.

### Is it production-ready?

**Not yet.** v2 has security gaps (no auth, no rate limiting). Use it for development/testing. v3.0 (coming Q2 2025) will have production-grade security.

### Can I use this for marketing/bulk messaging?

⚠️ **Not recommended.** WhatsApp's Terms of Service prohibit automated marketing. Heavy use may result in account bans.

### What about WhatsApp rate limits?

WhatsApp typically allows ~60 messages/minute. Exceeding limits causes temporary blocks. WILDCAT will add rate limiting in v3.0.

### How do I authenticate the API?

Currently, anyone with server access can send messages. **DO NOT expose to internet** without a proxy with authentication. v3.0 will add built-in auth.

---

## 🔗 External Resources

### WhatsApp & Baileys
- [Baileys Library](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web reverse engineering
- [WhatsApp Docs](https://www.whatsapp.com/business/downloads/) - Official business docs

### Technologies
- [Node.js Docs](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/)
- [MongoDB Manual](https://docs.mongodb.com/manual/)

### Related Projects
- [n8n Workflow Automation](https://n8n.io/)
- [Socket.io Documentation](https://socket.io/docs/)

---

## 🆘 Getting Help

| Issue | Action |
|-------|--------|
| Installation problems | See [Setup Guide](./SETUP.md#troubleshooting) |
| API questions | Check [API Reference](./API_Reference.md) |
| Want to contribute | Read [Development Guide](./DEVELOPMENT.md) |
| Found a bug | [Open GitHub Issue](https://github.com/NotoriousArnav/wildcat/issues) |

---

## 📊 Documentation Stats

- **Total Pages:** 5 documents
- **Total Words:** ~10,000+
- **Code Examples:** 50+
- **Diagrams:** System architecture & flows
- **Last Updated:** November 2025

---

## 🎯 Next Steps

- **Just starting?** → [Setup Guide](./SETUP.md)
- **Ready to build?** → [API Reference](./API_Reference.md)
- **Want to contribute?** → [Development Guide](./DEVELOPMENT.md)
- **Curious about design?** → [Architecture](./ARCHITECTURE.md)

---

<div align="center">

**[← Back to README](../README.md)** • **[GitHub](https://github.com/NotoriousArnav/wildcat)**

</div>

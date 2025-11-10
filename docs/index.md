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

## 🚀 Start Here

### New to WILDCAT?

| Guide | Time | Learn |
|-------|------|-------|
| **[5-Minute Quickstart](/docs/getting-started/quickstart/)** | 5 min | Get WILDCAT running instantly |
| **[Detailed Installation Guide](/docs/getting-started/installation/)** | 15 min | Step‑by‑step setup with all options |

### 🔌 Building with WILDCAT

| Resource | Purpose | Time |
|----------|---------|------|
| **[API Reference](/docs/api/endpoints/)** | All REST endpoints with examples | Reference |
| **[Integration Examples](/docs/guides/integration-examples/)** | n8n, Zapier, Node.js, Python | 15-30 min |
| **[Deployment Guide](/docs/guides/deployment/)** | VPS, Docker, Heroku, AWS, home server | 30-60 min |

### 🆘 Need Help?

| Issue | Solution |
|-------|----------|
| **Problems?** | Check [Troubleshooting & FAQ](/docs/troubleshooting/faq/) |
| **Questions?** | Browse [Getting Started](/docs/getting-started/) |
| **Stuck?** | [Search GitHub Issues](https://github.com/NotoriousArnav/wildcat/issues) |

---

## 📚 Documentation Sections

### [Getting Started](/docs/getting-started/)

- **[Quickstart](/docs/getting-started/quickstart/)** - 5-minute setup guide
- **[Installation](/docs/getting-started/installation/)** - Complete installation with all options
- Prerequisites, environment setup, first run

### [API Reference](/docs/api/endpoints/)

- All 20+ REST endpoints documented
- Request/response examples
- Authentication, error codes, best practices

### [Guides](/docs/guides/)

- **[Deployment Guide](/docs/guides/deployment/)** - VPS, Docker, Heroku, AWS, home server
- **[Integration Examples](/docs/guides/integration-examples/)** - Real-world workflows

### [Troubleshooting](/docs/troubleshooting/)

- **[FAQ & Solutions](/docs/troubleshooting/faq/)** - Common problems and fixes

---

## 📖 Full Documentation Index

### [Getting Started](/docs/getting-started/)
Guide new users through setup and first steps.

- **[Quickstart](/docs/getting-started/quickstart/)** - Get WILDCAT running in 5 minutes
- **[Installation](/docs/getting-started/installation/)** - Complete step‑by‑step installation with all options

### [API Reference](/docs/api/endpoints/)
Complete reference for all REST endpoints.

- All 20+ endpoints documented
- Request/response examples
- Error handling and status codes
- Authentication overview

### [Guides](/docs/guides/)
Practical guides for real-world scenarios.

- **[Deployment Guide](/docs/guides/deployment/)** - Deploy to VPS, Docker, Heroku, AWS EC2, or home server
- **[Integration Examples](/docs/guides/integration-examples/)** - Integrate with n8n, Zapier, Node.js, Python

### [Troubleshooting](/docs/troubleshooting/)
Solutions to common problems.

- **[FAQ & Solutions](/docs/troubleshooting/faq/)** - Frequently asked questions and how to fix common issues
- Debug tips, error messages, and support resources

---

## 🎯 Quick Answers

### How do I install WILDCAT?

**Start here:** [Installation Guide](/docs/getting-started/installation/)

Quick version:
```bash
npm ci
cp .env.example .env
# Edit .env with MONGO_URL and DB_NAME
npm run dev
```

### What are the main features?

- ✅ Send/receive WhatsApp messages via REST API
- ✅ Manage multiple WhatsApp accounts
- ✅ Media file support (images, videos, documents)
- ✅ Webhook integration for received messages
- ✅ Message reactions and replies
- ✅ Message deletion and editing
- ✅ Get chat lists and conversation history

### Is this production-ready?

**Not yet.** v2 is suitable for development/testing. Production deployment recommended for v3.0+ (Q2 2025) which will include:
- Built-in authentication and rate limiting
- Security hardening
- Performance optimizations
- TLS encryption

### Can I use this commercially?

⚠️ **Use at your own risk.** WILDCAT uses reverse-engineered WhatsApp Web protocols (unofficial). WhatsApp's Terms of Service prohibit automated messaging for marketing. Heavy use may result in account restrictions.

### How do I deploy to production?

See [Deployment Guide](/docs/guides/deployment/) for:
- Virtual Private Server (VPS) setup
- Docker containerization
- Heroku hosting
- AWS EC2 deployment
- Home server/Raspberry Pi

### Where can I find API documentation?

See [API Reference](/docs/api/endpoints/) - all REST endpoints with examples, error codes, and best practices.

### How do I integrate with other services?

See [Integration Examples](/docs/guides/integration-examples/):
- n8n visual workflows
- Zapier automations
- Node.js client code
- Python client code

---

## 🆘 Support

| Need Help? | Go To |
|------------|-------|
| **Installation issues** | [Installation Guide](/docs/getting-started/installation/) |
| **Can't send messages** | [Troubleshooting FAQ](/docs/troubleshooting/faq/#messaging-issues) |
| **Webhook not working** | [Troubleshooting FAQ](/docs/troubleshooting/faq/#webhooks--integration) |
| **Deployment questions** | [Deployment Guide](/docs/guides/deployment/) |
| **API endpoint help** | [API Reference](/docs/api/endpoints/) |
| **Database issues** | [Troubleshooting FAQ](/docs/troubleshooting/faq/#database--mongodb) |
| **Connection problems** | [Troubleshooting FAQ](/docs/troubleshooting/faq/#connection--session) |
| **General questions** | [FAQ & Troubleshooting](/docs/troubleshooting/faq/) |

---

## 📚 Related Documentation

**Legacy Documentation** (archived format, still valid for reference):
- [SETUP.md](./SETUP.md) - Original setup guide
- [API_Reference.md](./API_Reference.md) - Original endpoint reference
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development guidelines

---

## 🔗 External Resources

### WhatsApp & Baileys
- [Baileys Library](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web reverse engineering
- [WhatsApp Business](https://www.whatsapp.com/business/) - Official WhatsApp Business info

### Technologies
- [Node.js Docs](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/)
- [MongoDB Manual](https://docs.mongodb.com/manual/)

### Integrations
- [n8n](https://n8n.io/) - Workflow automation
- [Zapier](https://zapier.com/) - App integration
- [Socket.io](https://socket.io/docs/) - Real-time communication

---

## 📊 Documentation Stats

- **Total Pages:** 12 comprehensive documents
- **Code Examples:** 100+ copy‑paste ready commands
- **Endpoints Documented:** 20+ REST API endpoints
- **Deployment Options:** 5 (VPS, Docker, Heroku, AWS, home server)
- **Integration Examples:** 4 (n8n, Zapier, Node.js, Python)
- **Troubleshooting Q&A:** 30+ solutions
- **Last Updated:** November 2025

---

<div align="center">

**[← Back to README](../README.md)** • **[GitHub](https://github.com/NotoriousArnav/wildcat)**

</div>

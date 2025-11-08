---
layout: default
title: Getting Started
nav_order: 2
has_children: true
description: "Getting started with WILDCAT - installation and quick start guides"
permalink: /docs/getting-started/
---

# 🚀 Getting Started

Learn how to install WILDCAT and get it running in minutes.

## Choose Your Path

**New to WILDCAT?**
- **[⚡ 5-Minute Quick Start](/docs/getting-started/quickstart/)** - Get running in 5 minutes
- **[📦 Full Installation Guide](/docs/getting-started/installation/)** - Detailed setup with all options

**Ready to build?**
- **[📚 API Reference](/docs/api/endpoints/)** - Learn all available endpoints
- **[🔗 Integration Examples](/docs/guides/integration-examples/)** - Connect with n8n, Zapier, etc.

---

## Quick Navigation

### 1. Install WILDCAT
```bash
git clone https://github.com/NotoriousArnav/wildcat.git
cd wildcat
npm ci
cp .env.example .env
npm run dev
```

### 2. Create Account
```bash
curl -X POST http://localhost:3000/accounts \
  -H 'Content-Type: application/json' \
  -d '{"id":"mybot","name":"My Bot"}'
```

### 3. Scan QR Code
- Check server logs for QR code
- Scan with your WhatsApp phone

### 4. Send Message
```bash
curl -X POST http://localhost:3000/accounts/mybot/message/send \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "919876543210@s.whatsapp.net",
    "message": "Hello! 🐱"
  }'
```

---

## System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **Node.js** | 18.x | 20.x LTS |
| **RAM** | 512 MB | 2+ GB |
| **Disk Space** | 500 MB | 2+ GB |
| **MongoDB** | 6.0 | Latest |

---

## Installation Options

1. **[Quick Setup (5 min)](/docs/getting-started/quickstart/)** - Default local setup
2. **[Full Guide](/docs/getting-started/installation/)** - Custom configuration, Docker, production
3. **[Docker](/docs/getting-started/installation/#docker-setup)** - Containerized deployment

---

## Common Questions

**Q: What do I need to get started?**
- Node.js 18+
- MongoDB (local or Atlas)
- WhatsApp account

**Q: How long does setup take?**
- 5 minutes for quick start
- 15 minutes for full setup with configuration

**Q: Can I use MongoDB Atlas?**
- Yes! Free tier included. See [Installation Guide](/docs/getting-started/installation/#option-b-mongodb-atlas-cloud)

**Q: What if I get stuck?**
- Check [Troubleshooting Guide](/docs/troubleshooting/faq/)
- Read the [Installation Guide](/docs/getting-started/installation/)

---

## Next Steps

1. **[Quick Start (5 min)](/docs/getting-started/quickstart/)** - Get WILDCAT running
2. **[API Reference](/docs/api/endpoints/)** - Learn what you can do
3. **[Integration Examples](/docs/guides/integration-examples/)** - Connect with other tools
4. **[Deployment](/docs/guides/deployment/)** - Deploy to production

---

**Already set up?** Jump to [API Reference](/docs/api/endpoints/)

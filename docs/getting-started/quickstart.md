---
layout: default
title: Quick Start (5 Minutes)
nav_order: 2
parent: Getting Started
description: "Get WILDCAT running in 5 minutes"
permalink: /docs/getting-started/quickstart/
---

# ⚡ Quick Start Guide (5 Minutes)

Get WILDCAT up and running in just 5 minutes with this streamlined setup.

```
┌─────────────────────────────────────────────────────────────────┐
│                    5-Minute Setup Timeline                      │
└─────────────────────────────────────────────────────────────────┘

    0:00          1:00          2:00          3:30          5:00
    ════          ════          ════          ════          ════
    │             │             │             │             │
    ▼             ▼             ▼             ▼             ▼
  Clone &      Configure     Start        Create &       Send First
  Install       .env        Server       QR Scan         Message
  
  npm ci        Edit         npm run      curl POST      ✅ Done!
               MONGO_URL        dev       /accounts
```

## Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org/))
- **MongoDB** (Local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) - free tier available)
- **Git** (optional, for cloning)
- **WhatsApp Account** (with active WhatsApp Web access)

**Verify you have Node.js 18+:**
```bash
node --version  # Should show v18.x.x or higher
```

---

## 1. Clone & Install (1 min)

```bash
# Clone the repository
git clone https://github.com/NotoriousArnav/wildcat.git
cd wildcat

# Install dependencies
npm ci
```

---

## 2. Configure Environment (1 min)

Copy the example environment file and update it:

```bash
cp .env.example .env
```

Edit `.env` with your MongoDB connection:

```bash
# .env
HOST=localhost
PORT=3000
MONGO_URL=mongodb://localhost:27017
DB_NAME=wildcat
```

**Using MongoDB Atlas?**
```bash
MONGO_URL=mongodb+srv://username:password@cluster0.mongodb.net/?retryWrites=true&w=majority
DB_NAME=wildcat
```

---

## 3. Start Server (30 seconds)

```bash
# Development mode (auto-reload on file changes)
npm run dev

# Production mode
npm start
```

You'll see output like:
```
[2025-11-08] ✅ Server running on http://localhost:3000
[2025-11-08] ✅ Database connected to MongoDB
```

---

## 4. Create Your First Account (1.5 min)

Open a new terminal and create a WhatsApp account:

```bash
# Create account "mybot"
curl -X POST http://localhost:3000/accounts \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "mybot",
    "name": "My First Bot"
  }'
```

**Response:**
```json
{
  "ok": true,
  "account": {
    "_id": "mybot",
    "name": "My First Bot",
    "collectionName": "auth_mybot",
    "status": "connecting",
    "createdAt": "2025-11-08T12:00:00.000Z"
  }
}
```

**Watch for QR Code** - In the server terminal, you'll see:
```
=== QR Code for account: mybot ===
▄▄▄▄▄▄▄ ▀█▀▀ ▀▄▄ ▀ ▀▄▀ ▄▄▄▄▄▄▄
█ ███ █  ▀█▀ ▄▀ ▀▄  ▄█ █ ███ █
█ ▀▀▀ █ ▀▀▀▀ ▀▄▀▀  █  █ ▀▀▀ █
▀▀▀▀▀▀▀ ▀ █ █ █ █ ▀ ▀ ▀▀▀▀▀▀▀
=== Scan with WhatsApp to connect ===
```

**Scan the QR code** using your WhatsApp app:
1. Open WhatsApp on your phone
2. Go to **Settings** > **Linked Devices** (or similar option)
3. Tap **Link a Device**
4. Point your camera at the QR code in the terminal
5. Wait 5-10 seconds for connection

✅ When connected, you'll see: `✅ Account mybot connected successfully!`

---

## 5. Send Your First Message (30 seconds)

```bash
# Send a message to any WhatsApp number
# Format: 1234567890@s.whatsapp.net (number without + or spaces)

curl -X POST http://localhost:3000/accounts/mybot/message/send \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "1234567890@s.whatsapp.net",
    "message": "Hello from WILDCAT! 🐱"
  }'
```

Replace `1234567890` with a real WhatsApp number (without country code prefix, just digits):

**Example for Indian number +91 98765 43210:**
```json
{
  "to": "919876543210@s.whatsapp.net",
  "message": "Hello from WILDCAT! 🐱"
}
```

**Response:**
```json
{
  "ok": true,
  "messageId": "3EB0123ABCD456EF"
}
```

✅ **Check your WhatsApp** - You should see the message arrive!

---

## 🎉 You're Done!

You now have a working WILDCAT instance. Here's what's next:

```
┌─────────────────────────────────────────────────────────────────┐
│                     What You Just Built                         │
└─────────────────────────────────────────────────────────────────┘

    Your App                 WILDCAT Server           WhatsApp Web
    ════════                 ══════════════           ════════════
    
    🖥️  REST Client     ◄──►   🖥️  Node.js       ◄──►   📱 Account
    curl/Postman                Express                 Authenticated
    n8n/Zapier                  MongoDB                 Ready to send
    Custom code                 Baileys                 & receive
    
    
    Available Now:
    ═══════════════
    ✅ Send text messages         ✅ Upload media files
    ✅ Send images/videos/audio   ✅ React to messages
    ✅ Send documents             ✅ Delete messages
    ✅ Reply to messages          ✅ Webhook support
```

### Next Steps

| What | Do This |
|------|---------|
| **Learn more endpoints** | Read [API Reference](/docs/api/endpoints/) |
| **Send media files** | See [Media Messaging](/docs/api/messaging/#send-media) |
| **Set up webhooks** | Check [Webhooks Guide](/docs/api/webhooks/) |
| **Deploy to production** | Follow [Deployment Guide](/docs/guides/deployment/) |
| **Integrate with n8n** | Read [n8n Integration](/docs/guides/n8n-integration/) |
| **Troubleshoot issues** | Go to [FAQ & Troubleshooting](/docs/troubleshooting/faq/) |

---

## ⚡ Quick API Examples

### Check Server Health
```bash
curl http://localhost:3000/ping
# {"ok":true,"pong":true,"time":"2025-11-08T12:00:00.000Z"}
```

### List All Accounts
```bash
curl http://localhost:3000/accounts
# {"ok":true,"accounts":[...]}
```

### Get Account Status
```bash
curl http://localhost:3000/accounts/mybot
# {"ok":true,"account":{...,"currentStatus":"connected"}}
```

### Disconnect Account
```bash
curl -X POST http://localhost:3000/accounts/mybot/disconnect
# {"ok":true,"message":"Account mybot disconnected"}
```

### Delete Account
```bash
curl -X DELETE http://localhost:3000/accounts/mybot
# {"ok":true,"message":"Account mybot deleted"}
```

---

## 🆘 Troubleshooting

### QR Code Not Appearing?
- Make sure server is running: `npm run dev`
- Check if terminal supports Unicode characters
- Try scanning the QR code from terminal output

### Connection Timeout?
- Check MongoDB is running: `mongod --version`
- Verify MONGO_URL in `.env` is correct
- Ensure WhatsApp Web is accessible (not blocked by ISP)

### Message Not Sending?
- Ensure account is connected: Check for green checkmark in API response
- Verify WhatsApp number format: `919876543210@s.whatsapp.net`
- Check WhatsApp account isn't rate limited (wait a minute)

### Port Already in Use?
```bash
# Change port in .env
PORT=3001

# Or kill existing process on port 3000
lsof -ti:3000 | xargs kill -9
```

---

## 📚 Learn More

- **[Complete Setup Guide](/docs/getting-started/installation/)** - In-depth configuration
- **[API Reference](/docs/api/endpoints/)** - All available endpoints
- **[Architecture](/docs/reference/architecture/)** - How WILDCAT works internally
- **[Deployment](/docs/guides/deployment/)** - Production setup

---

**Have questions?** Check [FAQ](/docs/troubleshooting/faq/) or [GitHub Issues](https://github.com/NotoriousArnav/wildcat/issues)

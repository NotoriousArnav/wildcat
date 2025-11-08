---
layout: default
title: FAQ & Troubleshooting
nav_order: 5
description: "Frequently asked questions and solutions to common problems"
permalink: /docs/troubleshooting/faq/
---

# ❓ FAQ & Troubleshooting

Solutions to common problems and frequently asked questions.

---

## Installation & Setup

### Q: How do I install WILDCAT?

**A:** Follow the [Installation Guide](/docs/getting-started/installation/). Quick version:

```bash
git clone https://github.com/NotoriousArnav/wildcat.git
cd wildcat
npm ci
cp .env.example .env
npm run dev
```

---

### Q: What version of Node.js do I need?

**A:** Node.js 18 or higher. Check with `node --version`.

```bash
# If you have Node 16, upgrade:
# Using NVM (recommended)
nvm install 18
nvm use 18
```

---

### Q: Do I need MongoDB?

**A:** Yes. You have two options:

**Option 1: Local MongoDB**
```bash
# macOS
brew install mongodb-community
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows: Download from https://www.mongodb.com/try/download/community
```

**Option 2: MongoDB Atlas (Cloud)**
1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create free tier cluster
3. Get connection string
4. Add to `.env`:
   ```bash
   MONGO_URL=mongodb+srv://user:password@cluster0.mongodb.net
   ```

---

### Q: Which ports does WILDCAT use?

**A:** 
- **Default:** 3000 (configurable via `PORT` env var)
- **MongoDB:** 27017 (if running locally)

To use different port:
```bash
# In .env or terminal
PORT=3001
npm run dev
```

---

## Connection Issues

### Q: I'm getting "Cannot connect to MongoDB"

**A:** Check these:

1. **Is MongoDB running?**
   ```bash
   # Test connection
   mongosh
   # or
   mongo
   ```

2. **Check MONGO_URL in `.env`**
   - Local: `mongodb://localhost:27017`
   - Atlas: Check connection string format

3. **Is your IP whitelisted (Atlas)?**
   - Go to MongoDB Atlas > Network Access
   - Add your IP address (or 0.0.0.0 for testing)

4. **Check credentials (Atlas)**
   ```bash
   # Correct format:
   mongodb+srv://username:password@cluster0.mongodb.net/?retryWrites=true&w=majority
   ```

---

### Q: QR code is not appearing in terminal

**A:** Try these solutions:

1. **Check server is running**
   ```bash
   # See "Server running on http://localhost:3000"
   npm run dev
   ```

2. **Create account to generate QR**
   ```bash
   curl -X POST http://localhost:3000/accounts \
     -H 'Content-Type: application/json' \
     -d '{"id":"test","name":"Test"}'
   
   # QR should appear in server terminal within 10 seconds
   ```

3. **Terminal doesn't support Unicode?**
   - Try a different terminal (VS Code, iTerm2, etc.)
   - Check terminal encoding is UTF-8

4. **Scanning QR not working?**
   - Make sure WhatsApp Web link is active on your phone
   - Try different lighting for QR code scan
   - Restart WhatsApp and try again

---

### Q: Account keeps disconnecting

**A:** This is usually temporary. WILDCAT auto-reconnects after 5 seconds.

**If it keeps happening:**

1. **Check internet connection**
   ```bash
   curl https://www.whatsapp.com
   ```

2. **Restart the account**
   ```bash
   # Disconnect
   curl -X POST http://localhost:3000/accounts/:accountId/disconnect
   
   # Reconnect
   curl -X POST http://localhost:3000/accounts/:accountId/connect
   ```

3. **Check server logs for errors**
   ```bash
   # Look for ERROR or disconnect messages in console
   ```

4. **WhatsApp account issues?**
   - Log out of WhatsApp Web
   - Clear browser cookies
   - Log back in

---

### Q: Getting "Account already exists" error

**A:** Use a different account ID:

```bash
# This fails if 'mybot' already exists:
curl -X POST http://localhost:3000/accounts \
  -H 'Content-Type: application/json' \
  -d '{"id":"mybot"}'

# Solution: Use a unique ID
curl -X POST http://localhost:3000/accounts \
  -H 'Content-Type: application/json' \
  -d '{"id":"mybot2"}'
```

Or delete the existing account:
```bash
curl -X DELETE http://localhost:3000/accounts/mybot
```

---

## Messaging Issues

### Q: Messages are not being sent

**A:** Check in this order:

1. **Is account connected?**
   ```bash
   curl http://localhost:3000/accounts/:accountId
   # Check "currentStatus": "connected"
   ```

2. **Correct WhatsApp format?**
   ```bash
   # Correct: 919876543210@s.whatsapp.net
   # Wrong: +919876543210
   # Wrong: 91-9876-543210
   
   # Test with known number
   curl -X POST http://localhost:3000/accounts/mybot/message/send \
     -H 'Content-Type: application/json' \
     -d '{
       "to": "919876543210@s.whatsapp.net",
       "message": "Test"
     }'
   ```

3. **WhatsApp rate limiting?**
   - Send ~60+ messages per minute = temporary block
   - Wait 15-30 minutes, then retry
   - Check: "Too many requests" or 429 error

4. **Is account logged out?**
   ```bash
   # Status shows "logged_out"?
   # Reconnect:
   curl -X POST http://localhost:3000/accounts/mybot/connect
   ```

---

### Q: Getting "internal_error" when sending

**A:** This usually means:

1. **Account is disconnected**
   - Reconnect: `POST /accounts/:accountId/connect`
   - Check status: `GET /accounts/:accountId`

2. **Invalid recipient number**
   - Format must be: `919876543210@s.whatsapp.net`
   - Verify number exists on WhatsApp

3. **Message too long**
   - WhatsApp limit: ~4096 characters per message
   - Split long messages into multiple

4. **Server/network error**
   - Check server logs: `npm run dev` output
   - Restart server: `npm start`

---

### Q: Can I send media files?

**A:** Yes! Supported media types:

**Images** (JPG, PNG, GIF)
```bash
curl -X POST http://localhost:3000/accounts/mybot/message/send/image \
  -F "image=@/path/to/photo.jpg" \
  -F "to=919876543210@s.whatsapp.net" \
  -F "caption=Check this out!"
```

**Videos** (MP4, WebM)
```bash
curl -X POST http://localhost:3000/accounts/mybot/message/send/video \
  -F "video=@/path/to/video.mp4" \
  -F "to=919876543210@s.whatsapp.net"
```

**Audio** (MP3, M4A, WAV, OGG)
```bash
curl -X POST http://localhost:3000/accounts/mybot/message/send/audio \
  -F "audio=@/path/to/audio.mp3" \
  -F "to=919876543210@s.whatsapp.net"
```

**Documents** (PDF, DOCX, XLS, etc.)
```bash
curl -X POST http://localhost:3000/accounts/mybot/message/send/document \
  -F "document=@/path/to/document.pdf" \
  -F "to=919876543210@s.whatsapp.net"
```

**Limits:** Max 50MB per file

---

## Performance & Resources

### Q: Server is slow / using a lot of memory

**A:** Try these optimizations:

1. **Reduce number of concurrent accounts**
   ```bash
   # Delete unused accounts
   curl -X DELETE http://localhost:3000/accounts/unused-account
   ```

2. **Increase Node.js heap size**
   ```bash
   NODE_OPTIONS=--max-old-space-size=2048 npm start
   ```

3. **Check for message buildup**
   - Delete old messages periodically
   - Limit stored chat history

4. **Use more powerful server**
   - Recommended: 2+ CPU, 4GB+ RAM for production
   - Monitor with: `npm list` or `pm2 monit`

---

### Q: Can I run multiple servers/instances?

**A:** Yes, with considerations:

**Single Server (Recommended for v2):**
- Simple, easy to manage
- All accounts on one server
- Good for <100 accounts

**Multiple Servers:**
- Requires coordinated database
- Complex session management
- Better for scaling to 1000+ accounts
- Recommended for v3.0

For now, use single server deployment.

---

## Security & Best Practices

### Q: Is WILDCAT production-ready?

**A:** **Not yet (v2.0).** Known limitations:

- ⚠️ **No authentication** - Anyone with server access can send messages
- 🚫 **No rate limiting** - Can spam quickly
- 🔒 **Minimal security** - Use behind Nginx with auth

**Recommendations:**
1. Run on internal network only
2. Put Nginx/proxy with authentication in front
3. Limit inbound IPs
4. Wait for v3.0 (Q2 2025) for prod-grade security

---

### Q: Can I expose WILDCAT to the internet?

**A:** ⚠️ **Not recommended (v2).** Instead:

1. **Run behind Nginx** (add auth)
   ```nginx
   location / {
     auth_basic "Restricted";
     auth_basic_user_file /etc/nginx/.htpasswd;
     proxy_pass http://localhost:3000;
   }
   ```

2. **Use VPN/SSH tunnel**
   ```bash
   ssh -L 3000:localhost:3000 user@server
   ```

3. **Run on private network** (recommended)
   - Internal company network only
   - Access via VPN

---

### Q: How do I keep my WhatsApp number from getting banned?

**A:** WhatsApp terms prohibit automated marketing. Guidelines:

- ❌ Don't send bulk spam messages
- ✅ Use for legitimate customer notifications
- ✅ Use for chatbots with real conversations
- ✅ Respect rate limits (60 msg/minute)
- ✅ Allow users to opt-out

**If account gets banned:**
- Wait 24-72 hours
- Use different phone number
- Request reactivation from WhatsApp

---

## Debugging

### Q: How do I see what's happening?

**A:** Check logs in several ways:

**Server logs** (development)
```bash
npm run dev
# All logs appear in terminal
```

**Production logs** (with PM2)
```bash
pm2 logs wildcat
pm2 logs wildcat --err
```

**MongoDB logs** (check operations)
```bash
mongosh
test> db.getCollection("accounts").find()
test> db.getCollection("messages").findOne()
```

---

### Q: How do I enable verbose logging?

**A:** Currently, logging is built-in. For v3.0, expect:

```bash
LOG_LEVEL=debug npm run dev
```

For now, check server output for:
- `[INFO]` - Normal operations
- `[ERROR]` - Problems
- `[WARN]` - Warnings

---

## Feature Support

### Q: What WhatsApp features are supported?

**Supported:**
- ✅ Text messages
- ✅ Images, videos, audio, documents
- ✅ Message reactions (emoji)
- ✅ Message replies (quoted)
- ✅ Multiple accounts
- ✅ Webhooks
- ✅ Chat history
- ✅ Status messages

**Not yet (coming v3.0):**
- ❌ Group management (create/invite)
- ❌ Story replies
- ❌ Call notifications
- ❌ Status replies
- ❌ Disappearing messages

---

### Q: Can I create WhatsApp groups?

**A:** Not in v2.0. Coming in v3.0.

**Workaround:** Create group manually, then:
```bash
# Get group JID
curl http://localhost:3000/accounts/mybot/chats

# Send message to group
curl -X POST http://localhost:3000/accounts/mybot/message/send \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "123456789-1234567890@g.us",
    "message": "Hello group!"
  }'
```

---

## License & Terms

### Q: Is WILDCAT free to use?

**A:** Yes! It's open-source under GPL 3.0.

- ✅ Free to use
- ✅ Free to modify
- ✅ Free to distribute (with GPL terms)
- ✅ Use commercially (with GPL terms)

---

### Q: What are the legal risks?

**A:** WILDCAT uses reverse-engineered WhatsApp protocols:

- ⚠️ Unofficial - Could break anytime
- 📵 Terms violation risk - WhatsApp may ban accounts
- 🚫 Not guaranteed support
- 📜 You assume all legal responsibility

Use responsibly and comply with WhatsApp ToS.

---

## Getting Help

### Where can I ask questions?

| Channel | Best For |
|---------|----------|
| **[GitHub Issues](https://github.com/NotoriousArnav/wildcat/issues)** | Bug reports, feature requests |
| **[Discussions](https://github.com/NotoriousArnav/wildcat/discussions)** | General questions, help |
| **[Documentation](/docs/)** | Learning, setup, usage |
| **[Stack Overflow](https://stackoverflow.com/tag/wildcat)** | General programming questions |

---

## Still Stuck?

1. **Check [Installation Guide](/docs/getting-started/installation/)**
2. **Read [API Reference](/docs/api/endpoints/)**
3. **Review [Quick Start](/docs/getting-started/quickstart/)**
4. **Search [GitHub Issues](https://github.com/NotoriousArnav/wildcat/issues)**
5. **Open new [GitHub Issue](https://github.com/NotoriousArnav/wildcat/issues/new)**

---

**Last updated:** November 2025 | **Version:** WILDCAT v2.0

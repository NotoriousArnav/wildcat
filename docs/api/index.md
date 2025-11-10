---
layout: default
title: API
nav_order: 3
has_children: true
description: "API Reference - All WILDCAT endpoints and responses"
permalink: /docs/api/
---

# 📚 API Reference

Complete documentation of all WILDCAT REST API endpoints.

## Quick Reference

**Base URL:** `http://localhost:3000` (or your deployed URL)

**Response Format:** All responses are JSON

```json
{
  "ok": true,
  "data": {}
}
```

---

## API Categories

### [Accounts](/docs/api/endpoints/#accounts-management)
Manage multiple WhatsApp accounts
- Create account
- List accounts
- Get account details
- Delete account

### [Messaging](/docs/api/endpoints/#messaging)
Send and receive messages
- Send text, images, videos, audio, documents
- Reply to messages
- React to messages
- Delete messages

### [Chats & Messages](/docs/api/endpoints/#chats--messages)
Retrieve conversations
- Get all chats
- Get chat messages
- Get single message
- Download media

### [Connection Control](/docs/api/endpoints/#connection-control)
Manage account connections
- Get status
- Connect account
- Disconnect account

### [Webhooks](/docs/api/endpoints/#webhooks)
Receive incoming events
- Register webhook
- Receive message events

---

## Common Patterns

### Authentication
Currently **no built-in authentication** (v2.0). 

⚠️ **Security:** Use behind Nginx or VPN with auth.

### Request Headers

```bash
-H 'Content-Type: application/json'
```

### Response Codes

| Status | Meaning |
|--------|---------|
| 200 | ✅ Success |
| 201 | ✅ Created |
| 400 | ❌ Bad request |
| 404 | ❌ Not found |
| 500 | ❌ Server error |

### Error Response

```json
{
  "ok": false,
  "error": "error_message"
}
```

---

## Example: Full Workflow

```bash
# 1. Create account
curl -X POST http://localhost:3000/accounts \
  -H 'Content-Type: application/json' \
  -d '{"id":"mybot"}'

# (Scan QR code in terminal)

# 2. List accounts to verify
curl http://localhost:3000/accounts

# 3. Send message
curl -X POST http://localhost:3000/accounts/mybot/message/send \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "919876543210@s.whatsapp.net",
    "message": "Hello! 🐱"
  }'

# 4. Get chats
curl http://localhost:3000/accounts/mybot/chats

# 5. Get messages from chat
curl http://localhost:3000/accounts/mybot/chats/919876543210@s.whatsapp.net/messages
```

---

## Complete Endpoint List

### Health
- `GET /ping` - Server health check

### Accounts
- `POST /accounts` - Create account
- `GET /accounts` - List all accounts
- `GET /accounts/:accountId` - Get account details
- `DELETE /accounts/:accountId` - Delete account

### Messaging
- `POST /accounts/:accountId/message/send` - Send text
- `POST /accounts/:accountId/message/send/image` - Send image
- `POST /accounts/:accountId/message/send/video` - Send video
- `POST /accounts/:accountId/message/send/audio` - Send audio
- `POST /accounts/:accountId/message/send/document` - Send document
- `POST /accounts/:accountId/message/reply` - Reply to message
- `POST /accounts/:accountId/message/react` - React with emoji
- `POST /accounts/:accountId/message/delete` - Delete message

### Chats & Messages
- `GET /accounts/:accountId/chats` - Get all chats
- `GET /accounts/:accountId/chats/:chatId/messages` - Get chat messages
- `GET /accounts/:accountId/messages/:messageId` - Get single message
- `GET /accounts/:accountId/messages/:messageId/media` - Download media

### Connection
- `GET /accounts/:accountId/status` - Get connection status
- `POST /accounts/:accountId/connect` - Reconnect account
- `POST /accounts/:accountId/disconnect` - Disconnect account

### Webhooks
- `POST /webhooks` - Register webhook

---

## Rate Limits

| Limit | Value |
|-------|-------|
| Message Rate | ~60/minute (WhatsApp limit) |
| Max File Size | 50 MB |
| Concurrent Accounts | Unlimited (limited by resources) |

---

## Data Formats

### WhatsApp JID (Java ID)

Individual:

```
919876543210@s.whatsapp.net
```

Group:

```
123456789-1234567890@g.us
```

### Timestamp

Unix timestamp in milliseconds:

```
1730700645123
```

### Message ID

Unique identifier:

```
3EB0123ABCD456EF
```

---

## Next Steps

- **[Full Endpoint Reference](/docs/api/endpoints/)** - Detailed endpoint documentation
- **[Integration Examples](/docs/guides/integration-examples/)** - Code examples
- **[Troubleshooting](/docs/troubleshooting/faq/)** - Common issues


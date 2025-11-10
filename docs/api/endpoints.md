---
layout: default
title: API Reference
nav_order: 4
parent: API
description: "Complete API reference for all WILDCAT endpoints"
permalink: /docs/api/endpoints/
---

# 📚 API Reference

Complete documentation of all WILDCAT REST API endpoints.

**Base URL:** `http://localhost:3000` (or your deployed URL)

**Response Format:** All responses are JSON with `{ ok: boolean, ...data }`

---

## Health & Status

### Health Check

Check if the server is running and responsive.

**Endpoint:** `GET /ping`

**Request:**
```bash
curl http://localhost:3000/ping
```

**Response (200 OK):**
```json
{
  "ok": true,
  "pong": true,
  "time": "2025-11-08T12:30:45.123Z"
}
```

---

## Accounts Management

### Create Account

Create a new WhatsApp account with a unique identifier.

**Endpoint:** `POST /accounts`

**Request:**
```bash
curl -X POST http://localhost:3000/accounts \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "mybot",
    "name": "My WhatsApp Bot",
    "collectionName": "auth_mybot"
  }'
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ Yes | Unique account identifier (alphanumeric, no spaces) |
| `name` | string | ❌ No | Human-readable account name |
| `collectionName` | string | ❌ No | MongoDB collection name (defaults to `auth_{id}`) |

**Response (201 Created):**
```json
{
  "ok": true,
  "account": {
    "_id": "mybot",
    "name": "My WhatsApp Bot",
    "collectionName": "auth_mybot",
    "status": "connecting",
    "createdAt": "2025-11-08T12:30:45.123Z"
  }
}
```

**Errors:**

| Status | Error | Cause |
|--------|-------|-------|
| 400 | `id is required` | Missing `id` field |
| 400 | `Account already exists` | `id` already in use |

**Important:** After creation, watch the server logs for a QR code to scan with WhatsApp.

---

### List All Accounts

Get all accounts with their current connection status.

**Endpoint:** `GET /accounts`

**Request:**
```bash
curl http://localhost:3000/accounts
```

**Response (200 OK):**
```json
{
  "ok": true,
  "accounts": [
    {
      "_id": "mybot",
      "name": "My WhatsApp Bot",
      "collectionName": "auth_mybot",
      "status": "connected",
      "currentStatus": "connected",
      "hasQR": false,
      "createdAt": "2025-11-08T12:30:45.123Z"
    },
    {
      "_id": "support-bot",
      "name": "Support Bot",
      "status": "connecting",
      "currentStatus": "connecting",
      "hasQR": true,
      "createdAt": "2025-11-08T12:31:00.123Z"
    }
  ]
}
```

**Status Values:**

| Status | Meaning |
|--------|---------|
| `created` | Account created but not yet connected |
| `connecting` | Waiting for QR code scan |
| `connected` | Successfully authenticated |
| `reconnecting` | Attempting to reconnect |
| `logged_out` | Account was logged out |
| `not_started` | Not yet initialized |

---

### Get Account Details

Retrieve detailed information about a specific account.

**Endpoint:** `GET /accounts/:accountId`

**Request:**
```bash
curl http://localhost:3000/accounts/mybot
```

**Response (200 OK):**
```json
{
  "ok": true,
  "account": {
    "_id": "mybot",
    "name": "My WhatsApp Bot",
    "collectionName": "auth_mybot",
    "status": "connected",
    "currentStatus": "connected",
    "hasQR": false,
    "createdAt": "2025-11-08T12:30:45.123Z"
  }
}
```

**Errors:**

| Status | Error | Cause |
|--------|-------|-------|
| 404 | `Account not found` | `accountId` doesn't exist |

---

### Delete Account

Remove an account and clear all associated data.

**Endpoint:** `DELETE /accounts/:accountId`

**Request:**
```bash
curl -X DELETE http://localhost:3000/accounts/mybot
```

**Response (200 OK):**
```json
{
  "ok": true,
  "message": "Account mybot deleted"
}
```

**⚠️ Warning:** This permanently deletes:
- All stored messages
- All media files
- All authentication data
- All account settings

---

## Messaging

### Send Text Message

Send a text message to a WhatsApp contact or group.

**Endpoint:** `POST /accounts/:accountId/message/send`

**Request:**
```bash
curl -X POST http://localhost:3000/accounts/mybot/message/send \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "919876543210@s.whatsapp.net",
    "message": "Hello! How are you?"
  }'
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | ✅ Yes | WhatsApp JID (format: `1234567890@s.whatsapp.net`) |
| `message` | string | ✅ Yes | Message text (supports emojis and newlines) |

**JID Format:**
- **Individual:** `919876543210@s.whatsapp.net` (country code + number)
- **Group:** `123456789-1234567890@g.us` (group ID)

**Response (200 OK):**
```json
{
  "ok": true,
  "messageId": "3EB0123ABCD456EF"
}
```

**Errors:**

| Status | Error | Cause |
|--------|-------|-------|
| 400 | `to and message are required` | Missing fields |
| 500 | `internal_error` | Failed to send (account disconnected, rate limited, etc.) |

---

### Send Image

Send an image file to a contact.

**Endpoint:** `POST /accounts/:accountId/message/send/image`

**Request:**
```bash
curl -X POST http://localhost:3000/accounts/mybot/message/send/image \
  -F "image=@/path/to/image.jpg" \
  -F "to=919876543210@s.whatsapp.net" \
  -F "caption=Check out this photo!"
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | file | ✅ Yes | Image file (JPG, PNG, GIF - max 50MB) |
| `to` | string | ✅ Yes | WhatsApp JID |
| `caption` | string | ❌ No | Caption text |

**Response (200 OK):**
```json
{
  "ok": true,
  "messageId": "3EB0123ABCD456EF"
}
```

---

### Send Video

Send a video file to a contact.

**Endpoint:** `POST /accounts/:accountId/message/send/video`

**Request:**
```bash
curl -X POST http://localhost:3000/accounts/mybot/message/send/video \
  -F "video=@/path/to/video.mp4" \
  -F "to=919876543210@s.whatsapp.net" \
  -F "caption=Check this video out!"
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `video` | file | ✅ Yes | Video file (MP4, WebM - max 50MB) |
| `to` | string | ✅ Yes | WhatsApp JID |
| `caption` | string | ❌ No | Caption text |

---

### Send Audio

Send an audio file (voice message or music) to a contact.

**Endpoint:** `POST /accounts/:accountId/message/send/audio`

**Request:**
```bash
curl -X POST http://localhost:3000/accounts/mybot/message/send/audio \
  -F "audio=@/path/to/audio.mp3" \
  -F "to=919876543210@s.whatsapp.net"
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `audio` | file | ✅ Yes | Audio file (MP3, M4A, OGG, WAV - max 50MB) |
| `to` | string | ✅ Yes | WhatsApp JID |

**Note:** Audio automatically converted to appropriate format. Supports voice messages.

---

### Send Document

Send a document (PDF, DOCX, etc.) to a contact.

**Endpoint:** `POST /accounts/:accountId/message/send/document`

**Request:**
```bash
curl -X POST http://localhost:3000/accounts/mybot/message/send/document \
  -F "document=@/path/to/document.pdf" \
  -F "to=919876543210@s.whatsapp.net" \
  -F "caption=Your invoice"
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `document` | file | ✅ Yes | Document file (PDF, DOCX, XLS, etc. - max 50MB) |
| `to` | string | ✅ Yes | WhatsApp JID |
| `caption` | string | ❌ No | Document name/description |

---

### Reply to Message

Reply to a specific message (quoted/threaded reply).

**Endpoint:** `POST /accounts/:accountId/message/reply`

**Request:**
```bash
curl -X POST http://localhost:3000/accounts/mybot/message/reply \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "919876543210@s.whatsapp.net",
    "message": "Thanks for your message!",
    "quotedMessageId": "3EB0QUOTED123ID"
  }'
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | ✅ Yes | WhatsApp JID |
| `message` | string | ✅ Yes | Reply text |
| `quotedMessageId` | string | ✅ Yes | Message ID to reply to |
| `chatId` | string | ❌ No | Chat ID (auto-detected if omitted) |

**Response:**
```json
{
  "ok": true,
  "messageId": "3EB0REPLY789ABC"
}
```

---

### React to Message

Add an emoji reaction to a message.

**Endpoint:** `POST /accounts/:accountId/message/react`

**Request:**
```bash
curl -X POST http://localhost:3000/accounts/mybot/message/react \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "919876543210@s.whatsapp.net",
    "messageId": "3EB0123ABCD456EF",
    "emoji": "👍"
  }'
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | ✅ Yes | WhatsApp JID (sender of original message) |
| `messageId` | string | ✅ Yes | Message ID to react to |
| `emoji` | string | ✅ Yes | Single emoji (e.g., "👍", "❤️", "😂") |

**Response:**
```json
{
  "ok": true,
  "message": "Reaction sent"
}
```

---

### Delete Message

Delete a message for everyone in the chat.

**Endpoint:** `POST /accounts/:accountId/message/delete`

**Request:**
```bash
curl -X POST http://localhost:3000/accounts/mybot/message/delete \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "919876543210@s.whatsapp.net",
    "messageId": "3EB0123ABCD456EF"
  }'
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | ✅ Yes | WhatsApp JID |
| `messageId` | string | ✅ Yes | Message ID to delete |

**Response:**
```json
{
  "ok": true,
  "message": "Message deleted"
}
```

**⚠️ Note:** Can only delete messages sent within the last few minutes.

---

## Chats & Messages

### Get All Chats

Retrieve list of all active chats (conversations).

**Endpoint:** `GET /accounts/:accountId/chats`

**Request:**
```bash
curl http://localhost:3000/accounts/mybot/chats
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Max chats to return (default: 50) |
| `skip` | number | Skip first N chats (for pagination) |

**Response (200 OK):**
```json
{
  "ok": true,
  "chats": [
    {
      "chatId": "919876543210@s.whatsapp.net",
      "name": "John Doe",
      "unreadCount": 0,
      "lastMessageTime": 1730700645123
    },
    {
      "chatId": "123456789-1234567890@g.us",
      "name": "Project Team",
      "unreadCount": 5,
      "lastMessageTime": 1730700600123
    }
  ]
}
```

---

### Get Chat Messages

Retrieve messages from a specific chat.

**Endpoint:** `GET /accounts/:accountId/chats/:chatId/messages`

**Request:**
```bash
curl http://localhost:3000/accounts/mybot/chats/919876543210@s.whatsapp.net/messages
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Max messages (default: 50, max: 100) |
| `skip` | number | Skip first N messages (pagination) |

**Response (200 OK):**
```json
{
  "ok": true,
  "messages": [
    {
      "messageId": "3EB0123ABCD456EF",
      "from": "919876543210@s.whatsapp.net",
      "timestamp": 1730700645123,
      "text": "Hello!",
      "type": "text",
      "fromMe": false
    },
    {
      "messageId": "3EB0456DEFG789HI",
      "from": "919876543210@s.whatsapp.net",
      "timestamp": 1730700650123,
      "type": "image",
      "hasMedia": true,
      "mediaId": "60d5ec49c1234567890abcde",
      "caption": "Check this out",
      "fromMe": false
    }
  ]
}
```

---

### Get Single Message

Retrieve a specific message by ID.

**Endpoint:** `GET /accounts/:accountId/messages/:messageId`

**Request:**
```bash
curl http://localhost:3000/accounts/mybot/messages/3EB0123ABCD456EF
```

**Response (200 OK):**
```json
{
  "ok": true,
  "message": {
    "messageId": "3EB0123ABCD456EF",
    "from": "919876543210@s.whatsapp.net",
    "chatId": "919876543210@s.whatsapp.net",
    "timestamp": 1730700645123,
    "text": "Hello there!",
    "type": "text",
    "fromMe": false
  }
}
```

---

### Get Media

Download a media file (image, video, audio, document) from a message.

**Endpoint:** `GET /accounts/:accountId/messages/:messageId/media`

**Request:**
```bash
curl http://localhost:3000/accounts/mybot/messages/60d5ec49c1234567890abcde/media \
  -o downloaded_file.jpg
```

**Response (200 OK):**
Binary file data with appropriate `Content-Type` and `Content-Length` headers.

**Errors:**

| Status | Error | Cause |
|--------|-------|-------|
| 404 | `Message not found` or `No media in message` | Message doesn't exist or has no media |
| 500 | `internal_error` | Failed to retrieve media |

---

## Connection Control

### Get Account Status

Check current connection status of an account.

**Endpoint:** `GET /accounts/:accountId/status`

**Request:**
```bash
curl http://localhost:3000/accounts/mybot/status
```

**Response (200 OK):**
```json
{
  "ok": true,
  "status": "connected",
  "accountId": "mybot",
  "lastUpdate": "2025-11-08T12:30:45.123Z"
}
```

---

### Connect Account

Manually trigger connection/QR code generation.

**Endpoint:** `POST /accounts/:accountId/connect`

**Request:**
```bash
curl -X POST http://localhost:3000/accounts/mybot/connect
```

**Response (200 OK):**
```json
{
  "ok": true,
  "message": "Attempting to connect mybot",
  "status": "connecting"
}
```

**Note:** Watch server logs for QR code to appear.

---

### Disconnect Account

Disconnect an account without deleting it.

**Endpoint:** `POST /accounts/:accountId/disconnect`

**Request:**
```bash
curl -X POST http://localhost:3000/accounts/mybot/disconnect
```

**Response (200 OK):**
```json
{
  "ok": true,
  "message": "Account mybot disconnected"
}
```

**Note:** Account data is preserved. Can reconnect later.

---

## Webhooks

### Register Webhook

Register a webhook URL to receive message events.

**Endpoint:** `POST /webhooks`

**Request:**
```bash
curl -X POST http://localhost:3000/webhooks \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://your-app.com/whatsapp-webhook"
  }'
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | ✅ Yes | Valid HTTP/HTTPS URL |

**Response (201 Created / 200 OK):**
```json
{
  "ok": true,
  "url": "https://your-app.com/whatsapp-webhook",
  "created": true
}
```

**Response (200 OK) if already registered:**
```json
{
  "ok": true,
  "url": "https://your-app.com/whatsapp-webhook",
  "created": false
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "ok": false,
  "error": "error_code_or_message"
}
```

### Common HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | ✅ Success |
| 201 | ✅ Created successfully |
| 400 | ❌ Bad request (invalid parameters) |
| 404 | ❌ Resource not found |
| 500 | ❌ Server error |

---

## Rate Limiting & Limits

| Limit | Value | Notes |
|-------|-------|-------|
| **Message Rate** | ~60 msg/minute | WhatsApp imposed limit |
| **Max File Size** | 50 MB | Per file upload |
| **API Endpoints** | Unlimited | No per-endpoint limits (v2) |
| **Concurrent Accounts** | Unlimited | Limited by server resources |

---

## Next Steps

- **[WebSocket Events](/docs/api/websocket-events/)** - Real-time event streaming
- **[Webhooks Guide](/docs/guides/webhooks/)** - Set up incoming webhooks
- **[Examples](/docs/guides/integration-examples/)** - Integration examples
- **[Troubleshooting](/docs/troubleshooting/faq/)** - Common issues


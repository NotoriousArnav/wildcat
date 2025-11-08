---
layout: default
title: API Reference
nav_order: 3
description: "Complete REST API endpoint documentation"
parent: Documentation
---

# Wildcat API Reference

Version: 2.0.0 - Multi-Account Support

Base URL: `http://HOST:PORT` (defaults: `HOST=0.0.0.0`, `PORT=3000`)

Content-Type: `application/json`

Authentication: None (development). Add your own auth when exposing publicly.

---

## Table of Contents

- [Management Endpoints](#management-endpoints)
  - [Health Check](#health-check)
  - [Create Account](#create-account)
  - [List Accounts](#list-accounts)
  - [Get Account Details](#get-account-details)
  - [Delete Account](#delete-account)
  - [Fetch Media from GridFS](#fetch-media-from-gridfs)
  - [List All Media Files](#list-all-media-files)
- [Per-Account Endpoints](#per-account-endpoints)
  - [Get Account Status](#get-account-status)
  - [Connect Account](#connect-account)
  - [Disconnect Account](#disconnect-account)
  - [Send Text Message](#send-text-message)
  - [Send Image](#send-image)
  - [Send Video](#send-video)
  - [Send Audio](#send-audio)
  - [Send Document](#send-document)
  - [React to Message](#react-to-message)
  - [Delete Message](#delete-message)
  - [Get Message by ID](#get-message-by-id)
  - [Get Chat Messages](#get-chat-messages)
  - [Get All Chats](#get-all-chats)
  - [Get Media for Message](#get-media-for-message)
- [Webhooks](#webhooks)
  - [Register Webhook](#register-webhook)
- [Conventions](#conventions)
- [Examples](#examples)
  - [Create and Connect an Account](#create-and-connect-an-account)
  - [Send a Message](#send-a-message)
  - [Send Media Messages](#send-media-messages)
  - [React and Delete Messages](#react-and-delete-messages)
  - [Retrieve Messages and Media](#retrieve-messages-and-media)
  - [List All Accounts](#list-all-accounts)
  - [Register Webhook](#register-webhook-1)
- [Roadmap](#roadmap)

---

## Management Endpoints

## Management Endpoints

### Health Check
- **Method:** `GET`
- **Path:** `/ping`
- **Description:** Liveness probe.
- **Response 200:**
```json
{
  "ok": true,
  "pong": true,
  "time": "2025-11-04T09:49:19.855Z"
}
```

### Fetch Media from GridFS
- **Method:** `GET`
- **Path:** `/media/:id`
- **Description:** Fetch media stored in GridFS by its ObjectId (attachments from WhatsApp messages).
- **Parameters:**
  - `id` (required): The ObjectId of the media file in GridFS
- **Response 200:**
  - Content-Type: (media mimetype, e.g., `image/jpeg`, `video/mp4`)
  - Content-Length: File size in bytes
  - Content-Disposition: `inline; filename="..."` (if filename available)
  - Body: Binary media data (streamed)
- **Response 400:**
```json
{ "ok": false, "error": "id is required" }
```
- **Response 404:**
```json
{ "ok": false, "error": "media not found" }
```
- **Response 500:**
```json
{ "ok": false, "error": "internal_error" }
```

### List All Media Files
- **Method:** `GET`
- **Path:** `/media`
- **Description:** List all media files stored in GridFS with their metadata and linked message info. Supports filtering by message ID, account ID, or chat ID.
- **Query Parameters:**
  - `messageId` (optional): Filter by specific message ID
  - `accountId` (optional): Filter by account ID
  - `chatId` (optional): Filter by chat ID
- **Response 200:**
```json
{
  "ok": true,
  "media": [
    {
      "id": "507f1f77bcf86cd799439011",
      "filename": "account1_123456789012345678901_1699099199000",
      "contentType": "image/jpeg",
      "length": 1024000,
      "uploadDate": "2025-11-04T09:49:25.526Z",
      "metadata": {
        "accountId": "mybusiness",
        "messageId": "3EB0A12345678901",
        "chatId": "1234567890@s.whatsapp.net",
        "uploadedAt": "2025-11-04T09:49:25.526Z",
        "mediaType": "image",
        "mimetype": "image/jpeg",
        "caption": null,
        "fileName": null,
        "fileLength": 1024000,
        "width": 1920,
        "height": 1080
      }
    }
  ]
}
```
- **Example:** `GET /media?messageId=3EB0A12345678901` to find attachments for a specific message

### Register Webhook
- **Method:** `POST`
- **Path:** `/webhooks`
- **Description:** Upsert a webhook URL that will receive message events.
- **Request Body:**
```json
{
  "url": "https://example.com/my-webhook"
}
```
- **Rules:**
  - `url` must be a valid `http://` or `https://` URL
  - Idempotent: creates on first call, subsequent calls return success
  - Logging: server logs redact webhook URLs (no credentials or query)
- **Response 201:**
```json
{
  "ok": true,
  "url": "https://example.com/my-webhook",
  "created": true
}
```
- **Webhook Payload Format:**
```json
{
  "accountId": "mybusiness",
  "messageId": "3EB0A12345678901",
  "chatId": "1234567890@s.whatsapp.net",
  "from": "1234567890@s.whatsapp.net",
  "fromMe": false,
  "timestamp": 1699099199,
  "type": "text",
  "text": "Hello!",
  "hasMedia": false,
  "mediaUrl": null,
  "mediaType": null,
  "quotedMessage": {
    "messageId": "3EB0A00000000000",
    "participant": "9876543210@s.whatsapp.net",
    "text": "Previous message",
    "hasMedia": false
  },
  "mentions": ["1234567890@s.whatsapp.net"],
  "createdAt": "2025-11-04T09:49:25.526Z"
}
```
- **Media Message Example:**
```json
{
  "accountId": "mybusiness",
  "messageId": "3EB0A12345678902",
  "chatId": "1234567890@s.whatsapp.net",
  "from": "1234567890@s.whatsapp.net",
  "fromMe": false,
  "timestamp": 1699099199,
  "type": "image",
  "text": "Check this out!",
  "hasMedia": true,
  "mediaUrl": "/accounts/mybusiness/messages/3EB0A12345678902/media",
  "mediaType": "image",
  "quotedMessage": null,
  "mentions": [],
  "createdAt": "2025-11-04T09:49:25.526Z"
}
```

---

## Conventions
- All responses use `{ ok: boolean, ... }` shape; errors include `{ error: string }`.
- Timestamps are ISO-8601 strings in UTC.
- WhatsApp JIDs use format `number@s.whatsapp.net` for individuals, `groupid@g.us` for groups.

---

## Examples

### Create and Connect an Account
```bash
# 1. Create account
curl -X POST http://localhost:3000/accounts \
  -H 'Content-Type: application/json' \
  -d '{"id":"mybusiness","name":"Business Account"}'

# 2. Check status and get QR code
curl http://localhost:3000/accounts/mybusiness/status

# 3. Scan the QR code with WhatsApp mobile app

# 4. Verify connection
curl http://localhost:3000/accounts/mybusiness/status
# Should show "status": "connected"
```

### Send a Message
```bash
# Send text message
curl -X POST http://localhost:3000/accounts/mybusiness/message/send \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "1234567890@s.whatsapp.net",
    "message": "Hello from Wildcat API!"
  }'

# Send reply to a message
curl -X POST http://localhost:3000/accounts/mybusiness/message/send \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "1234567890@s.whatsapp.net",
    "message": "This is a reply!",
    "quotedMessageId": "3EB0A12345678901"
  }'

# Send message with mentions
curl -X POST http://localhost:3000/accounts/mybusiness/message/send \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "groupid@g.us",
    "message": "Hello @user!",
    "mentions": ["1234567890@s.whatsapp.net"]
  }'
```

### Send Media Messages
```bash
# Send image
curl -X POST http://localhost:3000/accounts/mybusiness/message/send/image \
  -F "image=@/path/to/image.jpg" \
  -F "to=1234567890@s.whatsapp.net" \
  -F "caption=Check out this image!"

# Send video
curl -X POST http://localhost:3000/accounts/mybusiness/message/send/video \
  -F "video=@/path/to/video.mp4" \
  -F "to=1234567890@s.whatsapp.net" \
  -F "caption=Watch this!"

# Send audio
curl -X POST http://localhost:3000/accounts/mybusiness/message/send/audio \
  -F "audio=@/path/to/audio.mp3" \
  -F "to=1234567890@s.whatsapp.net" \
  -F "ptt=true"

# Send document
curl -X POST http://localhost:3000/accounts/mybusiness/message/send/document \
  -F "document=@/path/to/file.pdf" \
  -F "to=1234567890@s.whatsapp.net" \
  -F "fileName=report.pdf"
```

### React and Delete Messages
```bash
# React to message
curl -X POST http://localhost:3000/accounts/mybusiness/message/react \
  -H 'Content-Type: application/json' \
  -d '{
    "chatId": "1234567890@s.whatsapp.net",
    "messageId": "3EB0A12345678901",
    "emoji": "👍"
  }'

# Delete message
curl -X POST http://localhost:3000/accounts/mybusiness/message/delete \
  -H 'Content-Type: application/json' \
  -d '{
    "chatId": "1234567890@s.whatsapp.net",
    "messageId": "3EB0A12345678901"
  }'
```

### Retrieve Messages and Media
```bash
# Get specific message
curl http://localhost:3000/accounts/mybusiness/messages/3EB0A12345678901

# Get chat messages with pagination
curl "http://localhost:3000/accounts/mybusiness/chats/1234567890@s.whatsapp.net/messages?limit=20&offset=0"

# Get all chats
curl http://localhost:3000/accounts/mybusiness/chats

# Download media
curl http://localhost:3000/accounts/mybusiness/messages/3EB0A12345678901/media -o downloaded_media.jpg
```

### List All Accounts
```bash
curl http://localhost:3000/accounts
```

### Register Webhook
```bash
curl -X POST http://localhost:3000/webhooks \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://webhook.site/your-id"}'
```

---

## Roadmap
- ✅ Multi-account support with separate collections
- ✅ Per-account routing and socket management
- ✅ Message sending per account
- ✅ Webhook delivery with accountId
- ✅ Media message support (images, videos, audio, documents)
- ✅ Message replies/quotes and mentions
- ✅ Message reactions
- ✅ Full chat history storage with GridFS
- ✅ Media retrieval endpoints for CRM integration
- ✅ Message retrieval and pagination
- 🔄 Group management endpoints
- 🔄 Webhook signing/verification
- 🔄 GET/DELETE webhook endpoints
- 🔄 Authentication and rate limiting
- 🔄 Account-specific webhook configuration

# Wildcat API Documentation

Version: 2.0.0 - Multi-Account Support

Base URL: `http://HOST:PORT` (defaults: `HOST=0.0.0.0`, `PORT=3000`)

Content-Type: `application/json`

Authentication: None (development). Add your own auth when exposing publicly.

---

## Architecture Overview

Wildcat now supports **multiple WhatsApp accounts** simultaneously. Each account:
- Has a unique `accountId`
- Uses a separate MongoDB collection for auth state (`auth_{accountId}`)
- Has its own WhatsApp socket connection
- Has dedicated API endpoints under `/accounts/:accountId/`

---

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

### Fetch File from GridFS
- **Method:** `GET`
- **Path:** `/files/:id`
- **Description:** Fetch a file stored in GridFS by Baileys (attachments from messages).
- **Parameters:**
  - `id` (required): The ObjectId of the file in GridFS
- **Response 200:**
  - Content-Type: (file mimetype, e.g., `image/jpeg`, `video/mp4`)
  - Content-Length: File size in bytes
  - Body: Binary file data (streamed)
- **Response 400:**
```json
{ "ok": false, "error": "id is required" }
```
- **Response 404:**
```json
{ "ok": false, "error": "file not found" }
```
- **Response 500:**
```json
{ "ok": false, "error": "internal_error" }
```

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

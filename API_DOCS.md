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

### Create Account
- **Method:** `POST`
- **Path:** `/accounts`
- **Description:** Create a new WhatsApp account and automatically initialize its connection.
- **Request Body:**
```json
{
  "id": "account1",
  "name": "My Business Account",
  "collectionName": "auth_account1"  // optional
}
```
- **Parameters:**
  - `id` (required): Unique identifier for the account
  - `name` (optional): Human-readable name
  - `collectionName` (optional): Custom MongoDB collection name (defaults to `auth_{id}`)
- **Response 201:**
```json
{
  "ok": true,
  "account": {
    "id": "account1",
    "name": "My Business Account",
    "collectionName": "auth_account1",
    "status": "created"
  }
}
```
- **Response 400:**
```json
{ "ok": false, "error": "Account already exists" }
```

### List Accounts
- **Method:** `GET`
- **Path:** `/accounts`
- **Description:** List all registered accounts with their current status.
- **Response 200:**
```json
{
  "ok": true,
  "accounts": [
    {
      "_id": "account1",
      "name": "My Business Account",
      "collectionName": "auth_account1",
      "createdAt": "2025-11-04T09:49:25.526Z",
      "status": "created",
      "currentStatus": "connected",
      "hasQR": false
    }
  ]
}
```

### Get Account Details
- **Method:** `GET`
- **Path:** `/accounts/:accountId`
- **Description:** Get detailed information about a specific account.
- **Response 200:**
```json
{
  "ok": true,
  "account": {
    "_id": "account1",
    "name": "My Business Account",
    "collectionName": "auth_account1",
    "createdAt": "2025-11-04T09:49:25.526Z",
    "status": "created",
    "currentStatus": "connected",
    "hasQR": false
  }
}
```
- **Response 404:**
```json
{ "ok": false, "error": "Account not found" }
```

### Delete Account
- **Method:** `DELETE`
- **Path:** `/accounts/:accountId`
- **Description:** Delete an account, disconnect its socket, and remove all auth data.
- **Response 200:**
```json
{
  "ok": true,
  "message": "Account deleted",
  "deletedCollection": "auth_account1"
}
```

---

## Per-Account Endpoints

All per-account endpoints are mounted under `/accounts/:accountId/`

### Get Account Status
- **Method:** `GET`
- **Path:** `/accounts/:accountId/status`
- **Description:** Get the current connection status and QR code (if available).
- **Response 200:**
```json
{
  "ok": true,
  "accountId": "account1",
  "status": "connecting",
  "qr": "2@96+SryGcjixr...",  // Base64 QR code data
  "collection": "auth_account1"
}
```
- **Status Values:**
  - `connecting`: Initial connection in progress
  - `connected`: Successfully connected
  - `close`: Connection closed
  - `open`: Connection open
  - `logged_out`: Account logged out (won't auto-reconnect)
  - `unknown`: Status not yet determined

### Connect Account
- **Method:** `POST`
- **Path:** `/accounts/:accountId/connect`
- **Description:** Start or restart the WhatsApp connection for this account.
- **Response 200:**
```json
{
  "ok": true,
  "accountId": "account1",
  "status": "connecting",
  "message": "Connection initiated. Check /accounts/account1/status for QR code"
}
```

### Disconnect Account
- **Method:** `POST`
- **Path:** `/accounts/:accountId/disconnect`
- **Description:** Disconnect and logout the account.
- **Response 200:**
```json
{
  "ok": true,
  "message": "Account disconnected"
}
```

### Send Text Message
- **Method:** `POST`
- **Path:** `/accounts/:accountId/message/send`
- **Description:** Send a text message via this account. Supports replies/quotes and mentions.
- **Request Body:**
```json
{
  "to": "1234567890@s.whatsapp.net",
  "message": "Hello from Wildcat!",
  "quotedMessageId": "3EB0A12345678901",  // optional: reply to a message
  "mentions": ["1234567890@s.whatsapp.net"]  // optional: mention users
}
```
- **Parameters:**
  - `to` (required): WhatsApp JID (format: `number@s.whatsapp.net` or `groupid@g.us`)
  - `message` (required): Text message to send
  - `quotedMessageId` (optional): ID of message to quote/reply to
  - `mentions` (optional): Array of WhatsApp JIDs to mention
- **Response 200:**
```json
{
  "ok": true,
  "messageId": "3EB0A12345678901",
  "timestamp": 1699099199
}
```
- **Response 400:**
```json
{
  "ok": false,
  "error": "Account not connected",
  "status": "connecting"
}
```

### Send Image
- **Method:** `POST`
- **Path:** `/accounts/:accountId/message/send/image`
- **Description:** Send an image with optional caption.
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `image` (file, required): Image file to send
  - `to` (text, required): WhatsApp JID
  - `caption` (text, optional): Image caption
- **Response 200:**
```json
{
  "ok": true,
  "messageId": "3EB0A12345678901",
  "timestamp": 1699099199
}
```
- **Example:**
```bash
curl -X POST http://localhost:3000/accounts/mybusiness/message/send/image \
  -F "image=@/path/to/image.jpg" \
  -F "to=1234567890@s.whatsapp.net" \
  -F "caption=Check out this image!"
```

### Send Video
- **Method:** `POST`
- **Path:** `/accounts/:accountId/message/send/video`
- **Description:** Send a video with optional caption.
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `video` (file, required): Video file to send
  - `to` (text, required): WhatsApp JID
  - `caption` (text, optional): Video caption
  - `gifPlayback` (boolean, optional): Play as GIF (default: false)
- **Response 200:**
```json
{
  "ok": true,
  "messageId": "3EB0A12345678901",
  "timestamp": 1699099199
}
```

### Send Audio
- **Method:** `POST`
- **Path:** `/accounts/:accountId/message/send/audio`
- **Description:** Send audio or voice message.
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `audio` (file, required): Audio file to send
  - `to` (text, required): WhatsApp JID
  - `ptt` (boolean, optional): Send as voice message/PTT (default: false)
- **Response 200:**
```json
{
  "ok": true,
  "messageId": "3EB0A12345678901",
  "timestamp": 1699099199
}
```

### Send Document
- **Method:** `POST`
- **Path:** `/accounts/:accountId/message/send/document`
- **Description:** Send a document file.
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `document` (file, required): Document file to send
  - `to` (text, required): WhatsApp JID
  - `caption` (text, optional): Document caption
  - `fileName` (text, optional): Custom filename (defaults to original)
- **Response 200:**
```json
{
  "ok": true,
  "messageId": "3EB0A12345678901",
  "timestamp": 1699099199
}
```

### React to Message
- **Method:** `POST`
- **Path:** `/accounts/:accountId/message/react`
- **Description:** Send a reaction emoji to a message. Send empty emoji to remove reaction.
- **Request Body:**
```json
{
  "chatId": "1234567890@s.whatsapp.net",
  "messageId": "3EB0A12345678901",
  "emoji": "👍"
}
```
- **Parameters:**
  - `chatId` (required): WhatsApp JID of the chat
  - `messageId` (required): ID of message to react to
  - `emoji` (optional): Emoji to react with (empty string removes reaction)
- **Response 200:**
```json
{
  "ok": true,
  "messageId": "3EB0B98765432109"
}
```

### Delete Message
- **Method:** `POST`
- **Path:** `/accounts/:accountId/message/delete`
- **Description:** Delete a message you sent.
- **Request Body:**
```json
{
  "chatId": "1234567890@s.whatsapp.net",
  "messageId": "3EB0A12345678901"
}
```
- **Parameters:**
  - `chatId` (required): WhatsApp JID of the chat
  - `messageId` (required): ID of message to delete
- **Response 200:**
```json
{
  "ok": true
}
```

### Get Message by ID
- **Method:** `GET`
- **Path:** `/accounts/:accountId/messages/:messageId`
- **Description:** Retrieve a specific message by its ID.
- **Response 200:**
```json
{
  "ok": true,
  "message": {
    "accountId": "mybusiness",
    "messageId": "3EB0A12345678901",
    "chatId": "1234567890@s.whatsapp.net",
    "from": "1234567890@s.whatsapp.net",
    "fromMe": false,
    "timestamp": 1699099199,
    "type": "text",
    "text": "Hello!",
    "hasMedia": false,
    "quotedMessage": null,
    "mentions": [],
    "isForwarded": false,
    "createdAt": "2025-11-04T09:49:25.526Z"
  }
}
```

### Get Chat Messages
- **Method:** `GET`
- **Path:** `/accounts/:accountId/chats/:chatId/messages`
- **Description:** Retrieve all messages for a specific chat with pagination.
- **Query Parameters:**
  - `limit` (optional, default: 50): Number of messages to return
  - `offset` (optional, default: 0): Pagination offset
  - `before` (optional): Get messages before this timestamp
  - `after` (optional): Get messages after this timestamp
- **Response 200:**
```json
{
  "ok": true,
  "messages": [
    {
      "accountId": "mybusiness",
      "messageId": "3EB0A12345678901",
      "chatId": "1234567890@s.whatsapp.net",
      "text": "Hello!",
      "type": "text",
      "hasMedia": false,
      "mediaUrl": null,
      "timestamp": 1699099199
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

### Get All Chats
- **Method:** `GET`
- **Path:** `/accounts/:accountId/chats`
- **Description:** Get list of all chats for this account with last message info.
- **Response 200:**
```json
{
  "ok": true,
  "chats": [
    {
      "chatId": "1234567890@s.whatsapp.net",
      "messageCount": 25,
      "lastMessage": {
        "messageId": "3EB0A12345678901",
        "text": "Latest message",
        "type": "text",
        "timestamp": 1699099199,
        "fromMe": true
      }
    }
  ]
}
```

### Get Media for Message
- **Method:** `GET`
- **Path:** `/accounts/:accountId/messages/:messageId/media`
- **Description:** Download the media file associated with a message.
- **Response 200:**
  - Content-Type: (media mimetype, e.g., `image/jpeg`, `video/mp4`)
  - Content-Disposition: `inline; filename="..."`
  - Body: Binary media data (streamed)
- **Response 404:**
```json
{
  "ok": false,
  "error": "Message not found" 
}
```
```json
{
  "ok": false,
  "error": "Message has no media"
}
```

---

## Webhooks

Global webhook configuration for receiving message events from all accounts.

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

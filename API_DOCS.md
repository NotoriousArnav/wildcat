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

### Send Message
- **Method:** `POST`
- **Path:** `/accounts/:accountId/message/send`
- **Description:** Send a text message via this account.
- **Request Body:**
```json
{
  "to": "1234567890@s.whatsapp.net",
  "message": "Hello from Wildcat!"
}
```
- **Parameters:**
  - `to`: WhatsApp JID (format: `number@s.whatsapp.net` or `groupid@g.us`)
  - `message`: Text message to send
- **Response 200:**
```json
{
  "ok": true,
  "messageId": "3EB0A12345678901"
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
  "accountId": "account1",
  "id": "3EB0A12345678901",
  "from": "1234567890@s.whatsapp.net",
  "message": { "conversation": "Hello!" },
  "timestamp": 1699099199
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
curl -X POST http://localhost:3000/accounts/mybusiness/message/send \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "1234567890@s.whatsapp.net",
    "message": "Hello from Wildcat API!"
  }'
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
- 🔄 Media message support (images, videos, documents)
- 🔄 Group management endpoints
- 🔄 Webhook signing/verification
- 🔄 GET/DELETE webhook endpoints
- 🔄 Authentication and rate limiting
- 🔄 Account-specific webhook configuration

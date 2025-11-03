# Wildcat API Documentation

Version: 1.0.0

Base URL: `http://HOST:PORT` (defaults: `HOST=0.0.0.0`, `PORT=3000`)

Content-Type: `application/json`

Authentication: None (development). Add your own auth when exposing publicly.

## Health
- Method: `GET`
- Path: `/ping`
- Description: Liveness probe.
- Response 200:
```
{
  "ok": true,
  "pong": true,
  "time": "2025-11-03T12:34:56.789Z"
}
```

## Webhooks
Register external webhook URLs that will receive events (e.g., message notifications) in future iterations.

- Method: `POST`
- Path: `/webhooks`
- Description: Upsert a webhook URL into the database.
- Request Body:
```
{
  "url": "https://example.com/my-webhook"
}
```
- Rules:
  - `url` must be a valid `http://` or `https://` URL
  - Idempotent: creates on first call, subsequent calls return success without duplicates
- Responses:
  - 201 Created
  ```
  { "ok": true, "url": "https://example.com/my-webhook", "created": true }
  ```
  - 200 OK (already existed)
  ```
  { "ok": true, "url": "https://example.com/my-webhook", "created": false }
  ```
  - 400 Bad Request
  ```
  { "ok": false, "error": "url is required and must be a string" }
  ```
  or
  ```
  { "ok": false, "error": "invalid URL" }
  ```
  - 500 Internal Error
  ```
  { "ok": false, "error": "internal_error" }
  ```

### Notes
- Storage: `webhooks` collection in MongoDB.
- Delivery: Webhook dispatch is performed via HTTP POST with JSON body. The helper `sendToWebhook(url, payload)` is available in `webhookHandler.js`.
- Retry/Backoff: Not implemented yet.

## Conventions
- All responses use `{ ok: boolean, ... }` shape; errors include `{ error: string }`.
- Timestamps are ISO-8601 strings in UTC.

## Examples
Register a webhook URL:
```
curl -sS -X POST http://localhost:3000/webhooks \
  -H 'content-type: application/json' \
  -d '{"url":"https://webhook.site/your-id"}'
```
Health check:
```
curl -sS http://localhost:3000/ping
```

## Roadmap (Planned)
- Message send endpoint(s) (text/media)
- Webhook delivery of inbound messages
- Signing/verification of webhook requests
- Listing/removing registered webhooks
- Authentication and rate limiting

# Wildcat Documentation

Welcome to the Wildcat WhatsApp Integration API documentation.

## Overview

Wildcat is a comprehensive WhatsApp Business API integration built with Node.js, Express, and MongoDB. It supports multiple accounts, message handling, media storage, and webhook delivery.

## Documentation Structure

- **[API Reference](./API_Reference.md)** - Complete API endpoint documentation with examples
- **[Setup Guide](./SETUP.md)** - Installation and configuration instructions
- **[Architecture](./ARCHITECTURE.md)** - System design and components
- **[Development](./DEVELOPMENT.md)** - Contributing guidelines and development workflow

## Quick Start

1. Install dependencies: `npm install`
2. Configure environment variables in `.env`
3. Start the server: `npm start`
4. Create an account: `POST /accounts`
5. Scan QR code and start sending messages!

## Key Features

- ✅ Multi-account WhatsApp support
- ✅ Message sending (text, media, reactions)
- ✅ Media storage in GridFS
- ✅ Webhook delivery for incoming messages
- ✅ RESTful API with JSON responses
- ✅ Comprehensive logging and error handling

## n8n Integration (Example)

Use n8n to orchestrate workflows that react to Wildcat webhooks and send outbound WhatsApp messages.

![n8n Workflow](../TEST_n8n_Workflow.jpeg)

Example steps:
- Configure a public HTTP Trigger node in n8n (or use a webhook.site URL while testing).
- Register the webhook in Wildcat:
  ```bash
  curl -X POST http://<wildcat-host>:3000/webhooks \
    -H 'Content-Type: application/json' \
    -d '{"url":"https://your-n8n-host/webhook/<id>"}'
  ```
- Add an HTTP Request node in n8n to send replies:
  - Method: `POST`
  - URL: `http://<wildcat-host>:3000/accounts/<accountId>/message/send`
  - JSON body: `{ "to": "1234567890@s.whatsapp.net", "message": "Hello from n8n!" }`

See more examples in the [API Reference](./API_Reference.md).

## Support

For issues or questions, please [open an issue](https://github.com/NotoriousArnav/wildcat/issues) on GitHub.

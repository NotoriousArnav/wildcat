---
layout: default
title: Architecture
nav_order: 4
description: "System design, module overview, and component relationships"
parent: Documentation
---

# Architecture Overview

This document describes the high-level architecture of the Wildcat WhatsApp integration system.

## System Components

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Express App   │    │  Socket Manager │    │  Account Manager│
│                 │    │                 │    │                 │
│ • REST API      │    │ • WhatsApp Sock │    │ • Account CRUD  │
│ • Route Handler │    │ • QR Generation │    │ • DB Persistence│
│ • Middleware    │    │ • Event Handling│    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   MongoDB       │
                    │                 │
                    │ • Messages      │
                    │ • Auth States   │
                    │ • Webhooks      │
                    │ • Media (GridFS)│
                    └─────────────────┘
```

### Key Files

- **`index.js`** - Application entry point, initializes managers and starts server
- **`server.js`** - Express app construction and server startup
- **`managementRoutes.js`** - Global routes (accounts, webhooks, media)
- **`accountRouter.js`** - Per-account routes (messages, status)
- **`socketManager.js`** - WhatsApp socket lifecycle management
- **`accountManager.js`** - Account CRUD operations
- **`mediaHandler.js`** - Media download/upload to GridFS
- **`logger.js`** - Structured logging utilities

## Data Flow

### Message Sending
1. Client → Express Route → Socket Manager
2. Socket Manager → WhatsApp Socket → Network
3. Response → Store in DB → Return to client

### Message Receiving
1. WhatsApp Socket → Event Handler → Media Handler (if media)
2. Store message in DB → Webhook delivery → Client

### Account Management
1. Client → Management Routes → Account Manager
2. Account Manager → DB → Socket Manager (create socket)
3. Socket Manager → QR generation → Client

## Database Schema

### Collections

- **`messages`** - All chat messages with metadata
- **`auth_{accountId}`** - WhatsApp auth state per account
- **`webhooks`** - Registered webhook URLs
- **`media.files`** - GridFS file metadata
- **`media.chunks`** - GridFS file data chunks

### Message Document Structure

```json
{
  "accountId": "myaccount",
  "messageId": "BAE123456789",
  "chatId": "1234567890@s.whatsapp.net",
  "from": "1234567890@s.whatsapp.net",
  "fromMe": true,
  "timestamp": 1699099199,
  "type": "text",
  "text": "Hello!",
  "hasMedia": false,
  "mediaUrl": null,
  "rawMessage": { /* Baileys message object */ }
}
```

## Security Considerations

- **Authentication:** None implemented (development mode)
- **Input Validation:** Basic validation on all endpoints
- **Webhook Security:** No signing/verification yet
- **Rate Limiting:** Not implemented
- **Secrets:** Environment variables for sensitive data

## Scalability

- **Horizontal:** Multiple instances possible with shared MongoDB
- **Vertical:** Node.js single-threaded, limited by CPU
- **Database:** MongoDB handles read/write scaling
- **Media:** GridFS supports large files efficiently

## Future Improvements

- Add authentication middleware
- Implement rate limiting
- Add webhook signing
- Support for groups and broadcasts
- Message encryption at rest
- API versioning
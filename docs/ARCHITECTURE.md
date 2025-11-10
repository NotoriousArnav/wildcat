---
layout: default
title: Architecture
nav_order: 4
description: "System design, module overview, and component relationships"
parent: Documentation
---

# Architecture Overview

This document describes the high-level architecture of the Wildcat WhatsApp integration system.

```
┌────────────────────────────────────────────────────────────────────┐
│                         WILDCAT System Architecture                │
└────────────────────────────────────────────────────────────────────┘

    External World              WILDCAT Server              WhatsApp
    ══════════════              ══════════════              ════════
    
    ┌──────────┐                                           ┌─────────┐
    │  HTTP    │───REST API────┐                           │WhatsApp │
    │  Clients │               │                           │  Web    │
    │  (curl,  │               │    ┌────────────────┐    │Protocol │
    │  Postman)│◄──────────────┼────│ Express Server │◄───┤ (Baileys│
    └──────────┘               │    │                │    │ Library)│
                               │    │  • Routes      │    └─────────┘
    ┌──────────┐               │    │  • Middleware  │
    │ Webhooks │◄──────Events──┤    │  • Logging     │
    │ (n8n,    │               │    └────────────────┘
    │  Zapier) │               │            ▲  ▼
    └──────────┐               │            │  │
                               │    ┌───────┴──┴──────┐
                               │    │  Socket Manager │
                               │    │                 │
                               │    │ • QR Generation │
                               └────│ • Auth Handling │
                                    │ • Event Loop    │
                                    └─────────────────┘
                                            ▲  ▼
                                            │  │
                                    ┌───────┴──┴──────┐
                                    │    MongoDB      │
                                    │                 │
                                    │ • Messages      │
                                    │ • Auth States   │
                                    │ • Media (GridFS)│
                                    │ • Webhooks      │
                                    └─────────────────┘
```

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

```
┌──────────────────────────────────────────────────────────────────┐
│                      Module Relationships                        │
└──────────────────────────────────────────────────────────────────┘

                           index.js
                          (Entry Point)
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
          server.js    accountManager.js  socketManager.js
          (Express)      (Account CRUD)   (WhatsApp Sock)
                │              │              │
                │              └──────┬───────┘
                │                     │
                ▼                     ▼
        ┌───────────────┐      ┌──────────────────┐
        │   Routes      │      │   Database       │
        └───────┬───────┘      │   (MongoDB)      │
                │              └─────────▲────────┘
                │                        │
        ┌───────┴────────┐               │
        │                │               │
        ▼                ▼               │
managementRoutes   accountRouter         │
        │                │               │
        │                ▼               │
        │          ┌──────────┐          │
        │          │ Message  │          │
        │          │ Handlers │──────────┘
        │          └──────────┘
        │                │
        ▼                ▼
 ┌────────────┐   ┌─────────────┐
 │  Webhook   │   │   Media     │
 │  Handler   │   │   Handler   │
 └────────────┘   └─────────────┘
        │                │
        └────────┬───────┘
                 │
                 ▼
          ┌──────────────┐
          │   logger.js  │
          │  (Logging)   │
          └──────────────┘


Legend:
────  Synchronous dependency
═══   Async/Event communication
```

- **`index.js`** - Application entry point, initializes managers and starts server
- **`server.js`** - Express app construction and server startup
- **`managementRoutes.js`** - Global routes (accounts, webhooks, media)
- **`accountRouter.js`** - Per-account routes (messages, status)
- **`socketManager.js`** - WhatsApp socket lifecycle management
- **`accountManager.js`** - Account CRUD operations
- **`mediaHandler.js`** - Media download/upload to GridFS
- **`webhookHandler.js`** - Webhook delivery and retry logic
- **`logger.js`** - Structured logging utilities

## Data Flow

### Message Sending Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                      Outbound Message Flow                       │
└──────────────────────────────────────────────────────────────────┘

Step 1: Client Request          Step 2: Server Processing
─────────────────────          ──────────────────────────
    ┌─────────┐                     ┌────────────┐
    │ Client  │                     │  Express   │
    │ (curl)  │──POST /send/text────│  Route     │
    └─────────┘                     │  Handler   │
         │                          └─────┬──────┘
         │                                │ validate
         │                                │ accountId
         │                                ▼
         │                          ┌─────────────┐
         │                          │   Socket    │
         │                          │   Manager   │
         │                          └──────┬──────┘
         │                                 │ sock.sendMessage()
         │                                 ▼
         │                          ┌─────────────┐
         │                          │  WhatsApp   │
         │                          │   Socket    │
         │                          │  (Baileys)  │
         │                          └──────┬──────┘
         │                                 │
         │                                 ▼
Step 3: Delivery                    ┌─────────────┐
─────────────                       │  WhatsApp   │
    ┌─────────┐                     │   Network   │
    │Response │◄────────────────────└─────────────┘
    │{ ok:true│                            │
    │  msgId} │                            ▼
    └─────────┘                     ┌─────────────┐
         ▲                          │   MongoDB   │
         │                          │   (store)   │
         └──────────────────────────└─────────────┘
```

### Message Receiving Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                      Inbound Message Flow                        │
└──────────────────────────────────────────────────────────────────┘

Step 1: WhatsApp Event      Step 2: Processing         Step 3: Webhook
──────────────────────      ──────────────────         ───────────────
  ┌─────────────┐              ┌──────────┐              ┌─────────┐
  │  WhatsApp   │              │  Event   │              │Webhooks │
  │   Network   │──new msg─────│ Handler  │              │(n8n etc)│
  └─────────────┘              └────┬─────┘              └────▲────┘
                                    │                         │
                                    ▼                         │
                               ┌──────────┐                   │
                               │  Media?  │                   │
                               └────┬─────┘                   │
                                    │                         │
                          ┌─────────┴──────────┐              │
                          │                    │              │
                        Yes                   No              │
                          │                    │              │
                          ▼                    ▼              │
                   ┌──────────────┐     ┌──────────┐         │
                   │Media Handler │     │          │         │
                   │              │     │          │         │
                   │1. Download   │     │          │         │
                   │2. GridFS save│     │          │         │
                   │3. Get URL    │     │          │         │
                   └──────┬───────┘     │          │         │
                          │             │          │         │
                          └─────────────┼──────────┘         │
                                        │                    │
                                        ▼                    │
                                 ┌──────────────┐            │
                                 │   MongoDB    │            │
                                 │  (messages)  │            │
                                 └──────┬───────┘            │
                                        │                    │
                                        ▼                    │
                                 ┌──────────────┐            │
                                 │   Webhook    │            │
                                 │   Manager    │────────────┘
                                 │              │  HTTP POST
                                 │ Fetch URLs   │  with payload
                                 │ Send events  │
                                 └──────────────┘
```

### Account Management Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                     Account Lifecycle Flow                       │
└──────────────────────────────────────────────────────────────────┘

CREATE ACCOUNT                    AUTHENTICATION
──────────────                    ──────────────
     ┌────┐                           ┌────┐
     │ 1. │ POST /accounts/create     │ 4. │ QR scanned by phone
     └─┬──┘                           └─┬──┘
       │                                │
       ▼                                ▼
  ┌──────────────┐                ┌──────────────┐
  │Account       │                │ WhatsApp     │
  │Manager       │                │ validates    │
  └──────┬───────┘                └──────┬───────┘
         │                               │
     ┌───┴───┐                       ┌───┴───┐
     │ 2.    │ Create in DB          │ 5.    │ Store auth state
     └───┬───┘                       └───┬───┘
         │                               │
         ▼                               ▼
  ┌──────────────┐                ┌──────────────┐
  │ Socket       │                │ MongoDB      │
  │ Manager      │                │ auth_account │
  └──────┬───────┘                └──────────────┘
         │
     ┌───┴───┐
     │ 3.    │ Generate QR
     └───┬───┘
         │
         ▼
  ┌──────────────┐                READY STATE
  │ Return QR    │                ────────────
  │ to client    │                    ┌────┐
  └──────────────┘                    │ 6. │ Socket ready
                                      └─┬──┘
DELETE ACCOUNT                          │
──────────────                          ▼
     ┌────┐                       ┌──────────────┐
     │ 7. │ DELETE /accounts/:id  │ Socket emits │
     └─┬──┘                       │ "ready"      │
       │                          └──────────────┘
       ▼                               │
  ┌──────────────┐                     │
  │ Logout from  │                     ▼
  │ WhatsApp     │              Application can now
  └──────┬───────┘              send/receive messages
         │
         ▼
  ┌──────────────┐
  │ Delete DB    │
  │ collections  │
  └──────────────┘
```

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
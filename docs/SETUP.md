---
layout: default
title: Setup Guide
nav_order: 2
description: "Installation, configuration, and deployment guide"
parent: Documentation
---

# Setup Guide

This guide will help you get Wildcat up and running on your system.

## Prerequisites

- Node.js 16+ and npm
- MongoDB 4.4+ (local or cloud instance)
- WhatsApp mobile app for QR scanning

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/NotoriousArnav/wildcat.git
   cd wildcat
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the root directory:
   ```env
   # Server configuration
   HOST=0.0.0.0
   PORT=3000

   # MongoDB configuration
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=wildcat

   # Optional: Logging level
   LOG_LEVEL=info

   # Optional: Admin number to receive startup ping
   # ADMIN_NUMBER=1234567890@s.whatsapp.net

   # Auto connect restored accounts
   # AUTO_CONNECT_ON_START=true
   ```

4. **Start MongoDB:**
   Make sure MongoDB is running on your system.

5. **Start the server:**
   ```bash
   npm start
   ```

   The server will start on `http://localhost:3000`

## Creating Your First Account

1. **Create an account:**
   ```bash
   curl -X POST http://localhost:3000/accounts \
     -H 'Content-Type: application/json' \
     -d '{"id": "myaccount", "name": "My WhatsApp Account"}'
   ```

2. **Get QR code:**
   ```bash
   curl http://localhost:3000/accounts/myaccount/status
   ```

3. **Scan the QR code:**
   - Copy the `qr` value from the response
   - Open WhatsApp on your phone
   - Go to Settings > Linked Devices > Link a Device
   - Scan the QR code

4. **Verify connection:**
   ```bash
   curl http://localhost:3000/accounts/myaccount/status
   ```
   Should show `"status": "connected"`

## Testing the API

Send a test message:
```bash
curl -X POST http://localhost:3000/accounts/myaccount/message/send \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "1234567890@s.whatsapp.net",
    "message": "Hello from Wildcat API!"
  }'
```

## Docker Deployment

A `Dockerfile` is provided to build a production image (includes `ffmpeg` for audio conversion).

- Build the image:
```bash
docker build -t wildcat:latest .
```

- Run with local MongoDB (host network example):
```bash
docker run --name wildcat \
  -p 3000:3000 \
  -e HOST=0.0.0.0 \
  -e PORT=3000 \
  -e MONGO_URL="mongodb://host.docker.internal:27017" \
  -e DB_NAME=wildcat \
  -e AUTO_CONNECT_ON_START=true \
  wildcat:latest
```

- Run with a MongoDB container on the same network:
```bash
docker network create wildcat-net || true

docker run -d --name mongo --network wildcat-net -p 27017:27017 mongo:6

docker run --name wildcat --network wildcat-net -p 3000:3000 \
  -e MONGO_URL="mongodb://mongo:27017" \
  -e DB_NAME=wildcat \
  -e AUTO_CONNECT_ON_START=true \
  wildcat:latest
```

Health check: `GET /ping` should return `{ ok: true, pong: true }`.

## Development Mode

For development with auto-restart:
```bash
npm run dev
```

## Troubleshooting

- **Server won't start:** Check MongoDB connection and environment variables
- **QR code not working:** Ensure WhatsApp is updated and try regenerating
- **Messages not sending:** Verify account is connected and JID format is correct

## Next Steps

- Set up webhooks for incoming messages
- Explore the full API in the [API Reference](./API_Reference.md)
- Check out [development guidelines](./DEVELOPMENT.md)

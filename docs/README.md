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

## Support

For issues or questions, please [open an issue](https://github.com/NotoriousArnav/wildcat/issues) on GitHub.
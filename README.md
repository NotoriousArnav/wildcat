# Wildcat — Multi-Account WhatsApp Integration Layer (Baileys + MongoDB)

> **⚠️ Disclaimer:** This is an unofficial WhatsApp integration using reverse-engineered libraries. Use at your own risk and ensure compliance with WhatsApp's terms of service.

**Wildcat** is a comprehensive WhatsApp Business API integration built with Node.js, Express, and MongoDB. It supports multiple accounts, message handling, media storage, and webhook delivery.

📖 **[Full Documentation](./docs/)** | 📋 **[API Reference](./docs/API_Reference.md)** | 🚀 **[Quick Setup](./docs/SETUP.md)**

---

## ✨ Key Features

- ✅ **Multi-Account Support** - Manage multiple WhatsApp accounts simultaneously
- ✅ **REST API** - Full REST interface for account management and messaging
- ✅ **Media Storage** - Automatic media storage in GridFS with retrieval endpoints
- ✅ **Webhooks** - Real-time message delivery to external services
- ✅ **Auto-Reconnection** - Intelligent reconnection logic per account
- ✅ **QR Authentication** - Terminal-based QR scanning for setup
- ✅ **CLI Helper** - npm scripts for common operations

---

## 🏗️ Architecture

Wildcat supports **multiple WhatsApp accounts** simultaneously with:
- Separate MongoDB collections per account for isolation
- Dynamic per-account API routes (`/accounts/:accountId/`)
- Global management endpoints for account operations
- GridFS media storage with direct access endpoints

**Core Components:**
- **SocketManager** - WhatsApp socket connections per account
- **AccountManager** - Account CRUD and metadata
- **Express API** - RESTful interface with dynamic routing
- **MongoDB** - Persistent auth state and message storage

---

## 🚀 Quick Start

### 1. Setup
```bash
npm install
# Configure .env file
npm run dev  # or node index.js
```

### 2. Create Account
```bash
curl -X POST http://localhost:3000/accounts \
  -H 'Content-Type: application/json' \
  -d '{"id": "myaccount", "name": "My Account"}'
```

### 3. Get QR Code
```bash
curl http://localhost:3000/accounts/myaccount/status
# Scan the QR code with WhatsApp
```

### 4. Send Message
```bash
curl -X POST http://localhost:3000/accounts/myaccount/message/send \
  -H 'Content-Type: application/json' \
  -d '{"to": "1234567890@s.whatsapp.net", "message": "Hello!"}'
```

---

## 📁 Project Structure

```
wildcat/
├── docs/                    # 📖 Comprehensive documentation
│   ├── README.md           # Documentation overview
│   ├── API_Reference.md    # Complete API reference
│   ├── SETUP.md           # Installation & setup guide
│   ├── ARCHITECTURE.md    # System design & components
│   └── DEVELOPMENT.md     # Development guidelines
├── index.js                # Main application entry point
├── socketManager.js        # WhatsApp socket management
├── accountManager.js       # Account lifecycle management
├── accountRouter.js        # Per-account API routes
├── managementRoutes.js     # Global management routes
├── mediaHandler.js         # Media storage & retrieval
├── server.js               # Express server setup
├── db.js                   # MongoDB connection
├── logger.js               # Structured logging
└── package.json            # Project metadata
```

---

## 📚 Documentation

- **[Setup Guide](./docs/SETUP.md)** - Installation and configuration
- **[API Reference](./docs/API_Reference.md)** - Complete endpoint documentation
- **[Architecture](./docs/ARCHITECTURE.md)** - System design and data flow
- **[Development](./docs/DEVELOPMENT.md)** - Contributing guidelines

---

## 🛠️ CLI Helper

The project includes npm scripts for common operations:

```bash
npm run accounts           # List all accounts
npm run account:create     # Create new account
npm run account:status     # Check account status
npm run message:send       # Send messages
npm run cli               # Show all commands
```

---

## 📋 Requirements

- **Node.js** 18+ (recommended 20+)
- **MongoDB** 4.4+ (local or cloud)
- **WhatsApp Account** for linking

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes following [development guidelines](./docs/DEVELOPMENT.md)
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

GPL-3.0-only — See `LICENSE` for full text.

---

**Repository:** https://github.com/NotoriousArnav/wildcat

<div align="center">

# 🐱 WILDCAT

**W**hatsApp **I**ntegration **L**ayer for **D**ata **C**onnectivity **A**nd **T**ransfer

[![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/NotoriousArnav/wildcat?utm_source=oss&utm_medium=github&utm_campaign=NotoriousArnav%2Fwildcat&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)](https://coderabbit.ai)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%203.0-blue.svg)](https://opensource.org/licenses/GPL-3.0)
[![Node.js Version](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0%2B-green.svg)](https://www.mongodb.com/)

> **Unofficial WhatsApp integration** using reverse-engineered libraries. Use at your own risk and ensure compliance with WhatsApp's terms of service.

### Enterprise-Grade WhatsApp REST API for Node.js

**WILDCAT** is a production-ready Node.js API server providing REST endpoints for WhatsApp messaging, media handling, and webhook delivery. Built with **Baileys** and **MongoDB** for reliable multi-account support.

Perfect for **chatbots**, **CRM integrations**, **marketing automation**, and **business workflows**.

<a href="#-quick-start"><strong>Get Started →</strong></a> · 
<a href="./docs/API_Reference.md"><strong>API Docs →</strong></a> · 
<a href="./docs/SETUP.md"><strong>Setup Guide →</strong></a>

</div>

---

## ✨ Why Choose WILDCAT?

### 🎯 Key Features

| Feature | Details |
|---------|---------|
| 🚀 **Multi-Account Support** | Manage unlimited WhatsApp numbers simultaneously |
| 📱 **Full WhatsApp Features** | Messages, media, reactions, statuses, and more |
| 🔗 **Webhook Integration** | Real-time message delivery to external services |
| 🧾 **Media Storage** | Automatic GridFS with direct-access endpoints |
| 🤖 **Bot-Ready** | Perfect for chatbots, automation, CRM integrations |
| ⚡ **REST API** | Clean HTTP interface, easy integration |
| 🐳 **Docker Support** | Production-ready containerization |
| 📊 **Structured Logging** | JSON-based logging for monitoring & debugging |

### ⚠️ Important Considerations

**Limitations:**
- ⚠️ **Unofficial** - Relies on reverse-engineered WhatsApp Web protocols
- 🚫 **Rate Limited** - Subject to WhatsApp's sending limits (typically 60 msg/min)
- 🔒 **No Official Support** - Community-maintained, no guarantees
- 📵 **Ban Risk** - Heavy automated usage may trigger WhatsApp account bans
- 🔐 **No Auth (v2)** - Currently requires manual authentication setup

**Recommended Use Cases:**
- ✅ Development and testing environments
- ✅ Bot automation for personal/small business use
- ✅ Webhook-based workflows (n8n, Zapier, Make.com)
- ✅ Message broadcasting to opt-in contacts
- ✅ Customer support automation

**Not Recommended For:**
- ❌ Large-scale spam/marketing (violates WhatsApp ToS)
- ❌ Production without proper security controls
- ❌ High-volume transaction messaging (use official WhatsApp Business API)
- ❌ Public internet exposure without authentication

---

## 🚧 v3.0 Modernization In Progress

**Current Status:** Code modernization and restructuring is actively happening in the `feature/phase1-modernization` branch.

### What's Being Updated

We're currently working on a major reorganization to improve code quality, maintainability, and security:

- ✅ **Directory Structure** - Reorganizing codebase into structured `src/` directory
- ✅ **Code Organization** - Middleware, validators, and types in dedicated subdirectories  
- ✅ **Security Enhancements** - Authentication middleware, webhook validation, input validation
- ✅ **Structured Logging** - Unified logging system across all modules
- 🔄 **Documentation** - Comprehensive guides and API reference updates

### Timeline

**Phase 1 (Current - Q4 2024):**
- Code reorganization into modular structure
- Enhanced security middleware
- Comprehensive testing framework

**Phase 2 (Q1 2025):**
- HTTP Authentication (API keys, JWT)
- Rate limiting per account/IP
- Advanced input validation

**Phase 3 (Q2 2025):**
- Additional features and optimizations
- Performance improvements
- Production readiness

To see the latest improvements, check the [`feature/phase1-modernization`](../../tree/feature/phase1-modernization) branch. We welcome contributions and feedback!

---

## 🚀 Quick Start

### 1️⃣ Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **MongoDB** 6.0+ ([Local](https://docs.mongodb.com/manual/installation/) or [Atlas](https://www.mongodb.com/cloud/atlas))
- **Git** (optional, for cloning)

### 2️⃣ Installation & Setup

```bash
# Clone repository
git clone https://github.com/NotoriousArnav/wildcat.git
cd wildcat

# Install dependencies
npm ci

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB URL and other settings
nano .env

# Start server
npm start
# Server runs on http://localhost:3000
```

### 3️⃣ Health Check

```bash
curl http://localhost:3000/ping
# Response: { "ok": true, "timestamp": "2025-11-08T..." }
```

### 4️⃣ Create Your First Account

```bash
# Create account via REST API
curl -X POST http://localhost:3000/accounts \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "mybot",
    "name": "My First Bot"
  }'

# Response: QR code + WebSocket connection ready
```

### 5️⃣ Scan QR Code & Start Messaging

The QR code will be displayed in terminal. Scan with your WhatsApp phone camera, and the account will authenticate.

```bash
# Send a test message
curl -X POST http://localhost:3000/accounts/mybot/message/send \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "1234567890@s.whatsapp.net",
    "message": "Hello from WILDCAT! 🐱"
  }'

# Response: { "ok": true, "messageId": "..." }
```

✅ **Success!** You're now sending WhatsApp messages via REST API.

### 📖 Next Steps

- **[Full Setup Guide](./docs/SETUP.md)** - Detailed installation & configuration
- **[API Reference](./docs/API_Reference.md)** - All available endpoints
- **[Examples](#-n8n-integration-example)** - Real-world integration examples
- **[Linting & Code Style](#-linting--code-style)** - Linting, formatting, and code quality


## 📚 Documentation

## 🧹 Linting & Code Style

- **Linting:** This project uses [ESLint](https://eslint.org/) (v9+ flat config) for code quality and consistency.
- **Run linter:**
  ```bash
  npx eslint . --ext .js
  ```
- **Auto-fix:**
  ```bash
  npx eslint . --ext .js --fix
  ```
- **Config:** See `eslint.config.js` in the project root.
- **CI:** Linting is enforced in GitHub Actions.
- **Style:** 2-space indent, single quotes, trailing commas, semicolons, CommonJS modules.

<table>
  <tr>
    <th>📄 Document</th>
    <th>📖 Purpose</th>
    <th>🎯 For</th>
  </tr>
  <tr>
    <td><a href="./docs/SETUP.md"><strong>Setup Guide</strong></a></td>
    <td>Installation, configuration & deployment</td>
    <td>First-time users, DevOps</td>
  </tr>
  <tr>
    <td><a href="./docs/API_Reference.md"><strong>API Reference</strong></a></td>
    <td>Complete REST API endpoint documentation</td>
    <td>Frontend developers, integrators</td>
  </tr>
  <tr>
    <td><a href="./docs/ARCHITECTURE.md"><strong>Architecture</strong></a></td>
    <td>System design, module overview</td>
    <td>Contributors, architects</td>
  </tr>
  <tr>
    <td><a href="./docs/DEVELOPMENT.md"><strong>Development</strong></a></td>
    <td>Contributing guidelines, local development</td>
    <td>Contributors, maintainers</td>
  </tr>
</table>

## ⚙️ CLI Tools

WILDCAT includes command-line utilities for account and message management:

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start

# Health check
npm run ping

# Run tests
npm test
npm run test:watch
npm run test:coverage
```

For advanced CLI usage, see the [Development Guide](./docs/DEVELOPMENT.md).


## 🐳 Docker Deployment

WILDCAT is Docker-ready with ffmpeg pre-installed for audio conversion.

### 🔨 Build Image

```bash
docker build -t wildcat:latest .
```

### 🚀 Run Standalone

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

### 🤝 Docker Compose (Recommended)

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:7
    container_name: wildcat-mongo
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    environment:
      MONGO_INITDB_DATABASE: wildcat

  wildcat:
    build: .
    container_name: wildcat-api
    depends_on:
      - mongodb
    ports:
      - "3000:3000"
    environment:
      HOST: 0.0.0.0
      PORT: 3000
      MONGO_URL: "mongodb://mongodb:27017"
      DB_NAME: wildcat
      AUTO_CONNECT_ON_START: "true"
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

volumes:
  mongo-data:
```

Run with:

```bash
docker-compose up -d
```

### 📋 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `0.0.0.0` | Server listen address |
| `PORT` | `3000` | Server port |
| `MONGO_URL` | Required | MongoDB connection string |
| `DB_NAME` | `wildcat` | MongoDB database name |
| `ADMIN_NUMBER` | Optional | WhatsApp JID (`xxx@s.whatsapp.net`) to receive startup ping |
| `AUTO_CONNECT_ON_START` | `false` | Auto-reconnect saved accounts on startup |

### 🏥 Health Check

```bash
curl http://localhost:3000/ping
# {
#   "ok": true,
#   "timestamp": "2025-11-08T12:34:56.789Z"
# }
```



## 🔀 Integration Examples

### n8n Workflow Integration

WILDCAT integrates seamlessly with **n8n** for visual workflow automation.

![n8n Workflow Example](./TEST_n8n_Workflow.jpeg)

**Workflow Flow:**

```
Webhook Trigger (n8n)
        ↓
   Process/Transform
        ↓
HTTP Request → WILDCAT API
        ↓
WhatsApp Message Sent
```

**Setup Steps:**

1. **Create n8n HTTP Trigger node**
   - Note the webhook URL

2. **Register with WILDCAT**
   ```bash
   curl -X POST http://localhost:3000/webhooks \
     -H 'Content-Type: application/json' \
     -d '{"url": "https://your-n8n-host/webhook/<webhook-id>"}'
   ```

3. **Create HTTP Request node in n8n**
   - **Method:** `POST`
   - **URL:** `http://wildcat-host:3000/accounts/<accountId>/message/send`
   - **Headers:** `Content-Type: application/json`
   - **Body:**
     ```json
     {
       "to": "{{ $json.from }}",
       "message": "{{ $json.message }}"
     }
     ```

4. **Deploy workflow**
   - Messages received by WILDCAT will trigger n8n
   - n8n processes and sends WhatsApp responses

**Note:** Server logs redact webhook URLs for security (credentials removed).

### Other Integration Platforms

WILDCAT works with any HTTP-based automation platform:
- **Zapier** - Trigger webhooks and send messages
- **Make.com** (formerly Integromat) - Complex workflows
- **IFTTT** - Simple if-this-then-that automation
- **Custom Applications** - Direct REST API calls

See [API Reference](./docs/API_Reference.md) for complete endpoint documentation.


## 🚨 Security & Stability Notice

### ⚠️ CRITICAL: v2 Security Gaps

**Current Security Status:** ❌ NOT PRODUCTION READY

| Issue | Risk | Status |
|-------|------|--------|
| No Authentication | 🔴 **CRITICAL** | Will be fixed in v3.0 |
| No Rate Limiting | 🟠 HIGH | Subject to abuse |
| SSRF in Webhooks | 🟠 HIGH | Planned security audit |
| Minimal Input Validation | 🟠 HIGH | Validation layer coming |
| CommonJS Only | 🟡 MEDIUM | Migration to ESM planned |

**⚠️ WARNING:** Anyone with access to your server can send WhatsApp messages. **DO NOT expose to public internet** without authentication layer (nginx, Caddy, etc.).

### 🚧 Roadmap: v3.0

**Current Focus:** Code Quality & Security Modernization

#### Phase 1: Modernization (Q4 2024 - Q1 2025)
- [ ] Migrate to ES Modules (ESM)
- [ ] TypeScript migration
- [ ] Replace console.log with structured logging
- [ ] Comprehensive JSDoc/TS types
- [ ] Test coverage (Jest automation)

#### Phase 2: Security (Q1 2025 - Q2 2025)
- [ ] **HTTP Authentication** (API keys, JWT)
- [ ] **Rate Limiting** (per account, per IP)
- [ ] **Input Validation** (Zod/Joi schemas)
- [ ] **SSRF Prevention** (webhook URL validation)
- [ ] Security audit & pen testing

#### Phase 3: Features (Q2 2025)
- [ ] Contact enrichment in webhooks
- [ ] Group management endpoints
- [ ] Message scheduling
- [ ] Advanced media handling (batch uploads)
- [ ] Monitoring & metrics endpoints

#### Phase 4: Production Ready (Q2 2025)
- [ ] Comprehensive testing
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Performance optimization
- [ ] Docker/K8s best practices
- [ ] SLA documentation

### 📋 For Current Users

**Until v3.0 is released:**

✅ **Recommended for:**
- Development & testing environments
- Internal business automation
- Bot prototyping & experimentation

❌ **NOT recommended for:**
- Public internet exposure
- High-volume production use
- Sensitive business data
- Large-scale deployments

**Best Practices:**

```bash
# 1. Deploy behind authentication proxy
# nginx example with basic auth
location / {
  auth_basic "WILDCAT API";
  auth_basic_user_file /etc/nginx/.htpasswd;
  proxy_pass http://localhost:3000;
}

# 2. Use environment-specific URLs
# .env
MONGO_URL=mongodb://...  # Use MongoDB Atlas or encrypted
AUTO_CONNECT_ON_START=false

# 3. Monitor logs for suspicious activity
tail -f logs/app.log | grep "error\|warn"

# 4. Keep backups
mongodump --uri="mongodb://..." --out=./backups

# 5. Watch for updates
# Star/watch this repo for release announcements
```

**Timeline:** v3.0 expected **Q2 2025** (tentative)

---


## 🤝 Contributing

WILDCAT welcomes contributions! See [Development Guide](./docs/DEVELOPMENT.md) for detailed guidelines.

### 🎯 Priority Areas for Contributors

We're actively seeking help with:

| Area | Priority | Impact |
|------|----------|--------|
| 🔐 Security improvements | 🔴 **HIGH** | Authentication, rate limiting |
| 📘 TypeScript migration | 🔴 **HIGH** | Type safety & DX |
| ✅ Test coverage | 🟠 **MEDIUM** | Reliability & refactoring safety |
| 📚 Documentation | 🟠 **MEDIUM** | Developer experience |
| 🐛 Bug fixes | 🟡 **ONGOING** | Stability |

### 🚀 Getting Started with Development

```bash
# 1. Fork & clone
git clone https://github.com/YOUR_USERNAME/wildcat.git
cd wildcat

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Install dependencies
npm ci

# 4. Make changes & test
npm run dev       # development mode with auto-reload
npm test          # run tests
npm run lint      # check code style (coming in v3.0)

# 5. Commit & push
git add .
git commit -m "feat: add your feature"
git push origin feature/your-feature-name

# 6. Create Pull Request
# Open PR on GitHub with clear description
```

### 📝 Contribution Guidelines

- Follow the [code style](./docs/DEVELOPMENT.md#code-style) (2-space indent, CommonJS)
- Add tests for new features
- Update documentation
- Keep commits atomic and well-described
- No breaking changes without discussion

See [Development Guide](./docs/DEVELOPMENT.md) for more details.


## 🙏 Acknowledgments

This project builds on excellent open-source work. See [ACKNOWLEDGMENTS.md](./ACKNOWLEDGMENTS.md) for complete credits.

**Key Dependencies:**
- **[@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys)** - WhatsApp Web API
- **[Express.js](https://expressjs.com/)** - Web framework
- **[MongoDB](https://www.mongodb.com/)** - Database
- **[Socket.io](https://socket.io/)** - Real-time communication

---

## 📄 License

**GPL-3.0-only** — See [`LICENSE`](./LICENSE)

This project includes adapted code from MIT-licensed dependencies. All original copyright notices are preserved in respective files and in [`ACKNOWLEDGMENTS.md`](./ACKNOWLEDGMENTS.md).

**Disclaimer:** WILDCAT is an unofficial tool for educational purposes. Ensure compliance with WhatsApp's Terms of Service and applicable laws before use.

---

## 📊 Project Links

| Link | Purpose |
|------|---------|
| 🔗 [GitHub](https://github.com/NotoriousArnav/wildcat) | Source code & issues |
| 📖 [Setup Guide](./docs/SETUP.md) | Installation instructions |
| 🔌 [API Reference](./docs/API_Reference.md) | Endpoint documentation |
| 🏗️ [Architecture](./docs/ARCHITECTURE.md) | System design |
| 👨‍💻 [Development](./docs/DEVELOPMENT.md) | Contributing guide |

---

## 🆘 Support

**Need help?**

- 📖 Check the [documentation](./docs/)
- 🐛 Search [existing issues](https://github.com/NotoriousArnav/wildcat/issues)
- 💬 Open a [new issue](https://github.com/NotoriousArnav/wildcat/issues/new)
- 🤖 See [CodeRabbit Setup](#-coderabbit-setup) for code reviews

## 📡 Stay Updated

⭐ **Star this repository** to be notified of releases and updates.

🔔 **Watch** for important announcements and breaking changes.

---

<div align="center">

**Made with ❤️ by the WILDCAT community**

[⬆ back to top](#-wildcat)

</div>



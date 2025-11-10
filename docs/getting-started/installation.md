---
layout: default
title: Installation & Setup
nav_order: 3
parent: Getting Started
description: "Complete installation and configuration guide for WILDCAT"
permalink: /docs/getting-started/installation/
---

# 📦 Installation & Setup Guide

Complete guide to installing and configuring WILDCAT for development or production.

## System Requirements

### Required
- **Node.js** 18 or higher
- **MongoDB** 6.0 or higher (local or cloud)
- **npm** 9+ (comes with Node.js)
- **Git** (for cloning repository)

### Recommended
- **4GB+ RAM** (for production)
- **2+ CPU cores** (for production)
- **Linux/macOS** (Windows also supported via WSL2 or native)

### Optional
- **Docker & Docker Compose** (for containerized deployment)
- **Nginx** (for reverse proxy in production)
- **PM2** (for process management in production)

---

## Checking Prerequisites

```bash
# Check Node.js version (should be 18 or higher)
node --version
# v18.x.x or higher ✅

# Check npm version (should be 9 or higher)
npm --version
# 9.x.x or higher ✅

# Check MongoDB (if running locally)
mongod --version
# MongoDB version v6.x.x or higher ✅
```

---

## Installation Steps

### 1. Clone Repository

```bash
# Using HTTPS
git clone https://github.com/NotoriousArnav/wildcat.git

# Or using SSH (if you have SSH keys configured)
git clone git@github.com:NotoriousArnav/wildcat.git

# Navigate to project directory
cd wildcat
```

### 2. Install Dependencies

```bash
# Use npm ci for production-like installation (recommended)
npm ci

# Or use npm install for development
npm install
```

**What this installs:**
- Express.js (web server)
- @whiskeysockets/baileys (WhatsApp client)
- MongoDB driver
- Multer (file upload handling)
- Additional utilities (axios, uuid, etc.)

### 3. Create Environment File

```bash
# Copy the example environment file
cp .env.example .env

# Edit with your editor
nano .env          # Linux/macOS
code .env          # VS Code
notepad .env       # Windows
```

---

## Environment Configuration

### Basic Configuration

The `.env` file controls server behavior. Here are the essential variables:

```bash
# Server Configuration
HOST=localhost
PORT=3000

# MongoDB Configuration
MONGO_URL=mongodb://localhost:27017
DB_NAME=wildcat

# Optional: Admin Notifications
ADMIN_NUMBER=

# Optional: Auto-connect on startup
AUTO_CONNECT_ON_START=false
```

### Detailed Configuration Options

#### Server Settings

| Variable | Purpose | Example | Default |
|----------|---------|---------|---------|
| `HOST` | Server host address | `0.0.0.0` | `localhost` |
| `PORT` | Server port number | `3000` | `3000` |
| `NODE_ENV` | Environment (dev/prod) | `production` | `development` |

#### Database Settings

| Variable | Purpose | Example | Default |
|----------|---------|---------|---------|
| `MONGO_URL` | MongoDB connection string | See below | `mongodb://localhost:27017` |
| `DB_NAME` | Database name in MongoDB | `wildcat` | `wildcat` |

#### Feature Flags

| Variable | Purpose | Options | Default |
|----------|---------|---------|---------|
| `AUTO_CONNECT_ON_START` | Auto‑reconnect on server restart | `true`/`false` | `false` |
| `ADMIN_NUMBER` | Send admin notifications | WhatsApp number | (empty) |

---

## Database Setup

### Option A: Local MongoDB

#### On macOS (Homebrew)
```bash
# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Verify it's running
mongo --eval "db.adminCommand('ping')"
# { ok: 1 }
```

#### On Linux (Ubuntu/Debian)
```bash
# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod

# Verify it's running
mongosh
# test>
```

#### On Windows (via Chocolatey)
```bash
# Install with Chocolatey (if installed)
choco install mongodb

# Or download manually from https://www.mongodb.com/try/download/community
```

#### Test Local MongoDB
```bash
# Connect to MongoDB shell
mongosh

# Inside shell:
test> db.adminCommand('ping')
{ ok: 1 }
test> exit
```

Update `.env`:
```bash
MONGO_URL=mongodb://localhost:27017
DB_NAME=wildcat
```

### Option B: MongoDB Atlas (Cloud)

#### Setup Steps
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account (500MB free tier)
3. Create a new project
4. Create a new cluster (M0 free tier)
5. Create database user with password
6. Add your IP to network access whitelist
7. Get connection string (looks like below)

#### Connection String Format
```
mongodb+srv://username:password@cluster0.mongodb.net/?retryWrites=true&w=majority
```

Update `.env`:
```bash
MONGO_URL=mongodb+srv://user:password@cluster0.mongodb.net/?retryWrites=true&w=majority
DB_NAME=wildcat
```

---

## Starting the Server

### Development Mode

```bash
# Auto‑reload on file changes (recommended for development)
npm run dev
```

Output:
```
nodemon watching .
[01:23:45] ✅ Server running on http://localhost:3000
[01:23:45] ✅ MongoDB connected
Ready to create accounts!
```

Press `Ctrl+C` to stop.

### Production Mode

```bash
# Optimized for performance
npm start
```

Output:
```
[01:23:45] ✅ Server running on http://localhost:3000
[01:23:45] ✅ MongoDB connected
Ready to create accounts!
```

### Health Check

Verify server is running:
```bash
# HTTP request
curl http://localhost:3000/ping

# Response:
# {"ok":true,"pong":true,"time":"2025-11-08T12:30:45.000Z"}
```

---

## Docker Setup (Optional)

### Building Docker Image

```bash
# Build the image
docker build -t wildcat:latest .

# View the image
docker images | grep wildcat
```

### Running with Docker Compose

```bash
# Start services (MongoDB + WILDCAT)
docker-compose up -d

# Check logs
docker-compose logs -f wildcat

# Stop services
docker-compose down
```

### Running Docker Manually

```bash
# Start MongoDB container
docker run -d --name mongodb -p 27017:27017 mongo:6.0

# Start WILDCAT container
docker run -d --name wildcat \
  -p 3000:3000 \
  -e MONGO_URL=mongodb://mongodb:27017 \
  -e DB_NAME=wildcat \
  --link mongodb \
  wildcat:latest

# Test
curl http://localhost:3000/ping
```

---

## Production Deployment

### Using PM2 (Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start index.js --name "wildcat" --instances max

# View logs
pm2 logs wildcat

# Monitor
pm2 monit

# Restart on reboot
pm2 startup
pm2 save
```

### Using Systemd (Linux)

Create `/etc/systemd/system/wildcat.service`:
```ini
[Unit]
Description=WILDCAT WhatsApp API
After=network.target mongodb.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/wildcat
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable wildcat
sudo systemctl start wildcat
sudo systemctl status wildcat
```

### Nginx Reverse Proxy

Create `/etc/nginx/sites-available/wildcat`:
```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and test:
```bash
sudo ln -s /etc/nginx/sites-available/wildcat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Verification

### 1. Server is Running
```bash
curl http://localhost:3000/ping
# {"ok":true,"pong":true,"time":"..."}
```

### 2. Database is Connected
```bash
# Check MongoDB has wildcat database
mongosh
> show databases
> use wildcat
> show collections
```

### 3. Create Test Account
```bash
curl -X POST http://localhost:3000/accounts \
  -H 'Content-Type: application/json' \
  -d '{"id":"test","name":"Test Account"}'

# Response should have {"ok":true,...}
```

---

## Troubleshooting Installation

### Port 3000 Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different port in .env
PORT=3001
```

### MongoDB Connection Failed
```bash
# Check if MongoDB is running
mongosh

# If not running:
brew services start mongodb-community  # macOS
sudo systemctl start mongod            # Linux
```

### Permission Denied on Linux
```bash
# Run with sudo or change user permissions
sudo npm start

# Or change directory ownership
sudo chown -R $USER:$USER /path/to/wildcat
```

### Memory Issues
```bash
# Increase Node.js heap size
NODE_OPTIONS=--max-old-space-size=2048 npm start
```

---

## Next Steps

- **[Quick Start Guide](/docs/getting-started/quickstart/)** - Get running in 5 minutes
- **[API Reference](/docs/api/endpoints/)** - Learn all endpoints
- **[Deployment Guide](/docs/guides/deployment/)** - Deploy to production

---

**Need help?** Check [FAQ](/docs/troubleshooting/faq/) or [GitHub Issues](https://github.com/NotoriousArnav/wildcat/issues)

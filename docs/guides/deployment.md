---
layout: default
title: Deployment Guide
nav_order: 4
parent: Guides
description: "Deploy WILDCAT to production environments"
permalink: /docs/guides/deployment/
---

# 🚀 Deployment Guide

Complete guide to deploying WILDCAT in production environments.

---

## Deployment Options Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                   Deployment Strategy Comparison                 │
└──────────────────────────────────────────────────────────────────┘

    Complexity          Cost/Month          Scalability
    ══════════          ══════════          ═══════════

VPS (DigitalOcean)        $5-20                ⭐⭐⭐
    ⭐⭐                Manual scale         Vertical scaling
                                            Add load balancer
                                            
Docker (Any Cloud)        $10-50               ⭐⭐⭐⭐
    ⭐⭐⭐              Container-based      Horizontal scaling
                                            Orchestration ready
                                            
Heroku                    $7-50                ⭐⭐⭐
    ⭐                  Easy scaling         Dyno scaling
                                            Managed platform
                                            
AWS EC2                   $20-100+             ⭐⭐⭐⭐⭐
    ⭐⭐⭐⭐            Auto scaling         Full AWS ecosystem
                                            Load balancers
                                            
Home Server               $0                   ⭐
    ⭐⭐                (electricity)        Limited
                                            Testing only
```

| Option | Complexity | Cost | Best For |
|--------|-----------|------|----------|
| **VPS (Linode, DigitalOcean)** | ⭐⭐ Medium | $5-20/mo | Small teams, learning |
| **Docker (Any cloud)** | ⭐⭐⭐ Medium | $10-50/mo | Scalable, flexible |
| **Heroku** | ⭐ Easy | $7-50/mo | Quick deployment |
| **AWS EC2** | ⭐⭐⭐⭐ Complex | $20-100+/mo | Enterprise, scale |
| **Home Server** | ⭐⭐ Medium | $0 | Development, testing |

---

## Prerequisites

Before deploying, ensure you have:

1. **Server access** - SSH access to VPS/cloud instance
2. **Domain name** (optional) - For HTTPS
3. **MongoDB connection** - Local or Atlas
4. **Basic Linux knowledge** - For VPS deployment
5. **Git** - To clone repository

---

## VPS Deployment (DigitalOcean/Linode)

```
┌──────────────────────────────────────────────────────────────────┐
│                     VPS Deployment Flow                          │
└──────────────────────────────────────────────────────────────────┘

Step 1: Setup         Step 2: Install       Step 3: Configure
───────────────       ────────────────      ─────────────────
┌────────────┐        ┌────────────┐        ┌────────────┐
│ Create VPS │        │   Node.js  │        │ Clone Repo │
│ Ubuntu     │───────▶│   MongoDB  │───────▶│  npm ci    │
│ $5/month   │        │     Git    │        │  Setup .env│
└────────────┘        └────────────┘        └────────────┘
                                                    │
Step 4: Process Mgr   Step 5: Reverse Proxy │      │
───────────────────   ─────────────────────  │      │
┌────────────┐        ┌────────────┐         │      │
│ Install PM2│◄───────│Setup Nginx │◄────────┘      │
│ Start app  │        │Port 80/443 │                │
│ Auto-start │        │SSL Certbot │                │
└────────────┘        └────────────┘                │
      │                     │                        │
      └─────────────────────┼────────────────────────┘
                            │
                            ▼
                    ┌────────────────┐
                    │ WILDCAT Ready! │
                    │ https://domain │
                    └────────────────┘
```

### 1. Create Droplet/Instance

**DigitalOcean:**
1. Create Droplet: $5/month, Ubuntu 22.04
2. Add SSH key
3. SSH into server

**Linode:**
1. Create Linode: $5/month, Ubuntu 22.04
2. Add SSH key
3. Connect via SSH

### 2. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Git
sudo apt install -y git

# Install MongoDB (or use MongoDB Atlas)
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 3. Clone and Install WILDCAT

```bash
# Create app directory
mkdir -p /opt/wildcat
cd /opt/wildcat

# Clone repository
git clone https://github.com/NotoriousArnav/wildcat.git .

# Install dependencies
npm ci

# Copy environment file
cp .env.example .env

# Edit configuration
sudo nano .env
```

Edit `.env`:
```bash
HOST=0.0.0.0
PORT=3000
MONGO_URL=mongodb://localhost:27017
DB_NAME=wildcat
NODE_ENV=production
```

### 4. Set Up Process Manager (PM2)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start WILDCAT
pm2 start index.js --name "wildcat"

# Save PM2 configuration
pm2 save

# Enable auto-start on reboot
pm2 startup
# (Copy and run the command it outputs)
```

### 5. Set Up Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/wildcat
```

Add configuration:
```nginx
upstream wildcat {
    server localhost:3000;
}

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://wildcat;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:
```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/wildcat /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 6. Set Up HTTPS (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate (auto-setup)
sudo certbot --nginx -d your-domain.com

# Auto-renewal is automatic!

# Verify
sudo certbot renew --dry-run
```

### 7. Verify Deployment

```bash
# Check Nginx is running
sudo systemctl status nginx

# Check PM2 is running
pm2 status

# Check MongoDB is running
sudo systemctl status mongod

# Test API
curl https://your-domain.com/ping
```

---

## Docker Deployment

```
┌──────────────────────────────────────────────────────────────────┐
│                    Docker Deployment Flow                        │
└──────────────────────────────────────────────────────────────────┘

Option A: Docker Only              Option B: Docker Compose
─────────────────────              ────────────────────────

┌─────────────────┐                ┌─────────────────┐
│ docker build    │                │docker-compose.yml│
│ -t wildcat      │                │                 │
└────────┬────────┘                │ • MongoDB       │
         │                         │ • WILDCAT       │
         ▼                         │ • Volumes       │
┌─────────────────┐                └────────┬────────┘
│ docker run      │                         │
│ -p 3000:3000    │                         ▼
│ --link mongo    │                ┌─────────────────┐
└────────┬────────┘                │docker-compose up│
         │                         └────────┬────────┘
         │                                  │
         └──────────────┬───────────────────┘
                        │
                        ▼
                ┌────────────────┐
                │  Both Running  │
                │                │
                │ MongoDB:27017  │
                │ WILDCAT:3000   │
                └────────────────┘
```

### 1. Build Docker Image

```bash
# Clone repository
git clone https://github.com/NotoriousArnav/wildcat.git
cd wildcat

# Build image
docker build -t wildcat:latest .

# Tag for registry (optional)
docker tag wildcat:latest your-registry/wildcat:latest
```

### 2. Run with Docker Compose

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: wildcat-mongo
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_DATABASE: wildcat
    restart: unless-stopped

  wildcat:
    build: .
    container_name: wildcat-app
    ports:
      - "3000:3000"
    environment:
      HOST: 0.0.0.0
      PORT: 3000
      MONGO_URL: mongodb://mongodb:27017
      DB_NAME: wildcat
      NODE_ENV: production
    depends_on:
      - mongodb
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs

volumes:
  mongodb_data:
```

Run:
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f wildcat

# Stop services
docker-compose down
```

### 3. Deploy to Cloud

**Docker Hub:**
```bash
# Login
docker login

# Push image
docker push your-registry/wildcat:latest
```

**AWS ECS, Google Cloud Run, Azure Container Instances:**
- Follow provider documentation to deploy from registry
- Set environment variables
- Attach MongoDB (Atlas recommended)

---

## Heroku Deployment

### 1. Create Heroku Account & App

```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Create app
heroku create wildcat-your-name

# Add MongoDB Atlas add-on
heroku addons:create mongolab
```

### 2. Deploy

```bash
# Clone repo
git clone https://github.com/NotoriousArnav/wildcat.git
cd wildcat

# Add Heroku remote
heroku git:remote -a wildcat-your-name

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

### 3. Set Environment Variables

```bash
# Set variables
heroku config:set \
  NODE_ENV=production \
  MONGO_URL=<your-atlas-url> \
  DB_NAME=wildcat \
  PORT=3000

# View variables
heroku config
```

---

## AWS EC2 Deployment

### 1. Launch EC2 Instance

1. Go to AWS Console > EC2
2. Launch instance: Ubuntu 22.04 LTS, t2.medium
3. Create/use key pair
4. Create security group:
   - Allow SSH (port 22) from your IP
   - Allow HTTP (port 80) from anywhere
   - Allow HTTPS (port 443) from anywhere
5. Launch instance

### 2. Connect & Configure

```bash
# SSH into instance
ssh -i /path/to/key.pem ubuntu@your-instance-ip

# Follow VPS Deployment steps (Linux section) above
```

### 3. Attach Elastic IP

```bash
# In AWS Console:
# 1. Go to Elastic IPs
# 2. Allocate new address
# 3. Associate with instance
# 4. Update domain DNS
```

---

## Production Checklist

```
┌──────────────────────────────────────────────────────────────────┐
│                    Pre-Launch Checklist                          │
└──────────────────────────────────────────────────────────────────┘

Security              Performance           Reliability
────────              ───────────           ───────────
[✓] HTTPS enabled     [✓] PM2 running       [✓] Backups configured
[✓] Firewall setup    [✓] Nginx proxy       [✓] Monitoring active
[✓] Env vars set      [✓] Gzip enabled      [✓] Alerts setup
[✓] DB secured        [✓] Static cache      [✓] Auto-restart
[✓] Rate limiting     [✓] Connection pool   [✓] Health checks

         │                    │                      │
         └────────────────────┼──────────────────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │  Production     │
                     │  Ready! 🚀      │
                     └─────────────────┘
```

Before going live, verify:

- [ ] **Environment variables set correctly**
  ```bash
  echo $MONGO_URL
  echo $NODE_ENV  # Should be "production"
  ```

- [ ] **HTTPS enabled** (Let's Encrypt or AWS Certificate Manager)
  ```bash
  curl https://your-domain.com/ping
  ```

- [ ] **Monitoring set up**
  - PM2 Plus: `pm2 plus`
  - CloudWatch (AWS)
  - Papertrail (logs)

- [ ] **Backups configured**
  ```bash
  # MongoDB Atlas auto-backups enabled
  # Or custom backup script
  ```

- [ ] **Firewall properly configured**
  - Only needed ports open
  - Database port NOT publicly exposed

- [ ] **API authentication**
  - ⚠️ v2 has no built-in auth!
  - Use Nginx with basic auth or API key proxy

- [ ] **Rate limiting**
  - ⚠️ Not built-in to v2
  - Use Nginx rate limiting

- [ ] **Logs monitored**
  - Set up alerts for errors
  - Monitor disk space

---

## Monitoring & Maintenance

### PM2 Monitoring

```bash
# Web dashboard
pm2 web
# Access: http://localhost:9615

# View metrics
pm2 monit

# Save logs for review
pm2 logs > logs.txt
```

### MongoDB Backup

```bash
# Backup database
mongodump --uri="mongodb://localhost:27017/wildcat" --out /backups/$(date +%Y%m%d)

# Restore
mongorestore /backups/backup-date/
```

### System Monitoring

```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top
```

---

## Scaling Tips

```
┌──────────────────────────────────────────────────────────────────┐
│                      Scaling Roadmap                             │
└──────────────────────────────────────────────────────────────────┘

10-100 Accounts              100-1,000 Accounts          1,000+ Accounts
───────────────              ──────────────────          ───────────────

┌──────────────┐             ┌──────────────┐            ┌──────────────┐
│ Single VPS   │             │Load Balancer │            │ Kubernetes   │
│              │             │      ▲       │            │   Cluster    │
│ • 1 Server   │             │      │       │            │              │
│ • Local DB   │             ├──────┼───────┤            │ • Auto-scale │
│ • $5-20/mo   │             │  App │  App  │            │ • HA setup   │
│              │             │   1  │   2   │            │ • Multi-zone │
└──────────────┘             ├──────┴───────┤            │ • $500+/mo   │
                             │ MongoDB      │            └──────────────┘
       │                     │  Cluster     │                   │
       │                     │ + Redis      │                   │
       │                     │              │                   │
       ▼                     └──────────────┘                   ▼
   Basic Setup               $100-500/mo                   Enterprise
```

**For 10-100 accounts:**
- Single VPS instance ($5-20/mo)
- Local MongoDB or MongoDB Atlas
- PM2 process manager

**For 100-1000 accounts:**
- Multiple app servers behind load balancer
- Dedicated MongoDB cluster
- Redis caching layer
- CDN for media files

**For 1000+ accounts:**
- Kubernetes deployment
- Microservices architecture
- Advanced caching & optimization
- Multi-region deployment

---

## Troubleshooting Deployment

### Port Already in Use

```bash
# Find process on port 80/443
sudo lsof -i :80
sudo lsof -i :443

# Kill process
sudo kill -9 <PID>
```

### MongoDB Connection Issues

```bash
# Test connection
mongosh --uri="$MONGO_URL"

# Check Atlas whitelist
# MongoDB Atlas > Security > Network Access
```

### PM2 Not Starting

```bash
# Check logs
pm2 logs wildcat

# Try manual start
pm2 start index.js --name wildcat --error /tmp/error.log

# View error
cat /tmp/error.log
```

### Nginx Proxy Issues

```bash
# Test Nginx config
sudo nginx -t

# View error log
sudo tail -f /var/log/nginx/error.log

# View access log
sudo tail -f /var/log/nginx/access.log
```

---

## Cost Estimates

| Deployment | Monthly Cost | Includes |
|-----------|--------------|----------|
| **VPS** | $5-20 | Server, MongoDB |
| **Docker + DigitalOcean App Platform** | $12-50 | Managed platform |
| **Heroku** | $7-50 | Easy deployment |
| **AWS EC2** | $15-100+ | Scalable, flexible |
| **Home Server** | $0 | (Your electricity) |

---

## Next Steps

- **[Webhook Integration](/docs/guides/webhooks/)** - Receive incoming messages
- **[n8n Integration](/docs/guides/n8n-integration/)** - Automate workflows
- **[Troubleshooting](/docs/troubleshooting/faq/)** - Common issues

---

**Questions?** Check [GitHub Issues](https://github.com/NotoriousArnav/wildcat/issues)

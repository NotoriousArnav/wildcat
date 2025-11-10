---
layout: default
title: Guides
nav_order: 4
has_children: true
description: "Integration and deployment guides for WILDCAT"
permalink: /docs/guides/
---

# 📖 Guides

Comprehensive guides for integrating and deploying WILDCAT.

---

## Available Guides

### [🚀 Deployment Guide](/docs/guides/deployment/)
Deploy WILDCAT to production environments

**Topics:**
- VPS Deployment (DigitalOcean, Linode)
- Docker Deployment
- Heroku Deployment
- AWS EC2 Deployment
- Production Checklist
- Monitoring & Maintenance
- Cost Estimates

**Best for:** DevOps engineers, system administrators

---

### [🔗 Integration Examples](/docs/guides/integration-examples/)
Connect WILDCAT with popular platforms and custom apps

**Topics:**
- n8n Workflow Automation
- Zapier Integration
- Node.js Custom Integration
- Python Integration
- Use Case Examples
- Error Handling
- Security Best Practices

**Best for:** Developers, automation enthusiasts

---

## Quick Start Guides

### Deploy to Production (15 min)

```bash
# 1. Choose deployment option
# Option 1: VPS (DigitalOcean, Linode)
# Option 2: Docker (Any cloud)
# Option 3: Heroku (Easiest)

# 2. Follow [Deployment Guide](/docs/guides/deployment/)

# 3. Set environment variables
export NODE_ENV=production
export MONGO_URL=your-mongo-url

# 4. Start server
npm start
```

### Integrate with n8n (10 min)

```bash
# 1. Install n8n locally or use n8n.cloud
# 2. Create webhook trigger
# 3. Add HTTP Request node to WILDCAT
# 4. Deploy workflow
```

---

## Integration Matrix

| Platform | Use Case | Difficulty |
|----------|----------|-----------|
| **n8n** | Visual workflow automation | ⭐ Easy |
| **Zapier** | Connect 7000+ apps | ⭐ Easy |
| **Node.js** | Custom applications | ⭐⭐ Medium |
| **Python** | Data science, scripts | ⭐⭐ Medium |
| **AWS Lambda** | Serverless functions | ⭐⭐⭐ Hard |
| **Google Cloud Functions** | Serverless, scalable | ⭐⭐⭐ Hard |

---

## Deployment Comparison

| Deployment | Startup Time | Cost | Scalability | Maintenance |
|-----------|-------------|------|-------------|------------|
| **VPS** | 1 day | $5-20/mo | Medium | High |
| **Docker** | 1 day | $10-50/mo | High | Medium |
| **Heroku** | 1 hour | $7-50/mo | Low | Low |
| **AWS** | 1 day | $20-100+/mo | Very High | High |
| **Home Server** | 1 hour | $0 | Low | Medium |

---

## Use Case Examples

### 1. Customer Support Bot

Receive WhatsApp messages → Auto‑reply to FAQs → Create support tickets for complex issues

**Tools:** WILDCAT + n8n + Your CRM

### 2. Order Notifications

Shopify webhook → WILDCAT → Send order updates to customers

**Tools:** Shopify + WILDCAT + Zapier

### 3. Lead Management

Website form → Google Sheets → Send welcome message

**Tools:** Zapier + Google Sheets + WILDCAT

### 4. Alert System

Server alert → Multi-channel notification (WhatsApp, Slack, Email)

**Tools:** Monitoring tool + WILDCAT + Zapier

---

## Next Steps

1. **[Deployment Guide](/docs/guides/deployment/)** - Choose where to deploy
2. **[Integration Examples](/docs/guides/integration-examples/)** - Connect with other tools
3. **[API Reference](/docs/api/endpoints/)** - Learn all endpoints
4. **[Troubleshooting](/docs/troubleshooting/faq/)** - Get help

---

## Popular Integrations

### Receive Messages Workflow

```
WILDCAT
  ↓
Register Webhook
  ↓
Customer sends WhatsApp
  ↓
WILDCAT receives message
  ↓
Webhook POST to your app/n8n
  ↓
Process and respond
```

### Send Messages Workflow

```
Your App
  ↓
HTTP Request to WILDCAT
  ↓
Send text/media/document
  ↓
WhatsApp receives message
  ↓
Customer gets notification
```

---

## Monitoring & Support

After deployment, monitor:
- Server health (`GET /ping`)
- Account connections (`GET /accounts`)
- Error logs (PM2 or Docker)
- Database (MongoDB Atlas)
- Performance (CPU, memory, disk)

---

**Need help?** Check [Troubleshooting Guide](/docs/troubleshooting/faq/)

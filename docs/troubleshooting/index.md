---
layout: default
title: Troubleshooting
nav_order: 5
has_children: true
description: "Solutions to common problems and frequently asked questions"
permalink: /docs/troubleshooting/
---

# 🆘 Troubleshooting & Support

Find solutions to common problems and answers to frequently asked questions.

---

## Quick Links

| Problem | Solution |
|---------|----------|
| **Server won't start** | See [FAQ: Installation & Setup](./faq/#installation--setup) |
| **MongoDB connection fails** | See [FAQ: Database Issues](./faq/#database--mongodb) |
| **WhatsApp disconnects** | See [FAQ: Connection & Session](./faq/#connection--session) |
| **Messages not sending** | See [FAQ: Messaging Issues](./faq/#messaging-issues) |
| **Port already in use** | See [FAQ: Common Errors](./faq/#common-errors) |
| **Webhook not triggering** | See [FAQ: Webhooks & Integration](./faq/#webhooks--integration) |
| **Media upload fails** | See [FAQ: Media & Files](./faq/#media--files) |
| **High CPU/Memory usage** | See [FAQ: Performance & Optimization](./faq/#performance--optimization) |

---

## Getting Help

### 1. **Check the FAQ**
   - Browse [Frequently Asked Questions](./faq/) for your specific issue
   - Most common problems have quick solutions

### 2. **Review Deployment Guide**
   - See [Deployment Guide](/docs/guides/deployment/) for environment-specific setup
   - Covers VPS, Docker, Heroku, AWS, and home server deployments

### 3. **Check API Reference**
   - See [API Reference](/docs/api/endpoints/) for endpoint specifications
   - Verify request/response formats

### 4. **Review Logs**
   - Check application logs: `npm run dev` or `pm2 logs`
   - Check MongoDB connection logs
   - Enable debug mode: `DEBUG=* npm run dev`

### 5. **Search Issues**
   - [GitHub Issues](https://github.com/NotoriousArnav/wildcat/issues) - Search existing issues
   - [GitHub Discussions](https://github.com/NotoriousArnav/wildcat/discussions) - Ask the community

---

## Common Issues at a Glance

### Installation Issues
- **npm ci fails** → Check Node.js version (18+), npm cache, internet connection
- **MongoDB URL error** → Verify `MONGO_URL` in `.env` file
- **Port 3000 in use** → Change `PORT` in `.env` or kill existing process

### Runtime Issues
- **WhatsApp QR won't scan** → Check browser console, session storage, network
- **Messages fail silently** → Verify account is connected, check webhook logs
- **API returns 404** → Verify endpoint path, account ID, and request method
- **Webhook not firing** → Check webhook URL is publicly accessible, no auth required

### Production Issues
- **High memory usage** → Implement session cleanup, reduce payload sizes
- **Accounts disconnect periodically** → Add auto-reconnect logic, check network stability
- **Database growing too large** → Implement message/log cleanup policies

---

## Debug Mode

Enable detailed logging:

```bash
# Show all debug output
DEBUG=* npm run dev

# Show only app debug
DEBUG=app:* npm run dev

# Show Socket.io events
DEBUG=socket.io:* npm run dev

# Show MongoDB queries
DEBUG=mongodb:* npm run dev
```

---

## Still Stuck?

1. **Search GitHub Issues**: [notoriousarnav/wildcat/issues](https://github.com/NotoriousArnav/wildcat/issues)
2. **Ask on Discussions**: [notoriousarnav/wildcat/discussions](https://github.com/NotoriousArnav/wildcat/discussions)
3. **Check Community**: Look for similar problems in closed issues
4. **File a New Issue**: Provide error logs, OS, Node version, and steps to reproduce

---

## See Also

- [Getting Started Guide](/docs/getting-started/) - Installation and quickstart
- [API Reference](/docs/api/endpoints/) - All available endpoints
- [Deployment Guide](/docs/guides/deployment/) - Production setup
- [Integration Examples](/docs/guides/integration-examples/) - Real-world workflows


---
layout: default
title: Integration Examples
nav_order: 3
parent: Guides
description: "Integration examples with n8n, Zapier, and custom applications"
permalink: /docs/guides/integration-examples/
---

# 🔗 Integration Examples

Examples of integrating WILDCAT with popular platforms and custom applications.

---

## n8n Workflow Automation

Automate WhatsApp messaging using n8n's visual workflow builder.

### Setup n8n

1. **Install n8n locally or use n8n.cloud**

   ```bash
   # Docker
   docker run -it --rm --name n8n -p 5678:5678 n8nio/n8n
   
   # Or signup at https://n8n.io
   ```

2. **Access n8n**
   - Local: http://localhost:5678
   - Cloud: https://app.n8n.cloud

### Create Webhook-Triggered Workflow

1. **Create new workflow**
   - Click "Create New Workflow"
   - Start with "HTTP Request" trigger

2. **Configure HTTP Webhook Trigger**
   - Node name: "Webhook Trigger"
   - Method: POST
   - Path: `/whatsapp-webhook`
   - Authentication: None (or add basic auth)

3. **Add "Process Message" Logic**
   - Add "IF" node to check message type
   - Extract sender, message, and attachments

4. **Add "Send Response" Node**
   - HTTP Request node
   - URL: `http://your-wildcat-server:3000/accounts/mybot/message/send`
   - Method: POST
   - Body:

   ```json
   {
     "to": "{{ $json.from }}",
     "message": "Thanks for your message: {{ $json.body }}"
   }
   ```

### Example: Auto-Reply Workflow

**Workflow:**
```
Webhook Trigger
    ↓
Check if message contains keyword
    ↓
If YES → Send auto-reply via WILDCAT
If NO → Send to manager
```

**Setup:**
1. Webhook receives message
2. IF node checks: `$json.body contains "support"`
3. If YES: Send auto-reply
4. If NO: Send Telegram notification to manager

---

## Zapier Integration

Connect WILDCAT with 7000+ Zapier apps.

### 1. Register Webhook in WILDCAT

```bash
curl -X POST http://localhost:3000/webhooks \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://hooks.zapier.com/hooks/catch/YOUR-WEBHOOK-ID/..."
  }'
```

### 2. Create Zapier Zap

1. Go to zapier.com
2. Create new Zap
3. **Trigger:** Webhooks by Zapier > Catch Hook
4. **Action:** (Choose app - e.g., Google Sheets, Slack)

### Example Zaps

**Zap 1: Save Messages to Google Sheets**
```
Trigger: WhatsApp message webhook
  ↓
Action 1: Parse JSON from webhook
  ↓
Action 2: Add row to Google Sheet
  - Phone: {{ from }}
  - Message: {{ text }}
  - Time: {{ timestamp }}
```

**Zap 2: Create Support Ticket**
```
Trigger: WhatsApp message webhook
  ↓
Action 1: Search contact in CRM
  ↓
Action 2: Create ticket in Freshdesk
  - Customer: {{ contact_name }}
  - Issue: {{ message }}
  - Priority: High
```

**Zap 3: Send Slack Notification**
```
Trigger: WhatsApp message webhook
  ↓
Action: Send Slack message
  - Channel: #customer-messages
  - Message: New message from {{ from }}: {{ text }}
```

---

## Custom Node.js Application

Integrate WILDCAT into your own Node.js app.

### Installation

```bash
npm install axios
```

### Basic Usage

```javascript
const axios = require('axios');

const WILDCAT_URL = 'http://localhost:3000';
const ACCOUNT_ID = 'mybot';

// Send message
async function sendMessage(to, message) {
  try {
    const response = await axios.post(
      `${WILDCAT_URL}/accounts/${ACCOUNT_ID}/message/send`,
      { to, message }
    );
    console.log('Message sent:', response.data.messageId);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}

// Get chats
async function getChats() {
  try {
    const response = await axios.get(`${WILDCAT_URL}/accounts/${ACCOUNT_ID}/chats`);
    return response.data.chats;
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}

// Usage
sendMessage('919876543210@s.whatsapp.net', 'Hello from Node.js!');
```

### Express.js Webhook Receiver

```javascript
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const WILDCAT_URL = 'http://localhost:3000';

// Webhook endpoint to receive messages
app.post('/webhooks/whatsapp', async (req, res) => {
  const { from, text, messageId } = req.body;

  console.log(`Message from ${from}: ${text}`);

  // Send auto-reply
  try {
    await axios.post(
      `${WILDCAT_URL}/accounts/mybot/message/send`,
      {
        to: from,
        message: 'Thanks for your message! I received it at ' + new Date().toLocaleTimeString()
      }
    );
  } catch (error) {
    console.error('Failed to send reply:', error.message);
  }

  res.json({ ok: true });
});

// Register webhook
async function registerWebhook() {
  try {
    await axios.post(
      `${WILDCAT_URL}/webhooks`,
      { url: 'https://your-app.com/webhooks/whatsapp' }
    );
    console.log('Webhook registered!');
  } catch (error) {
    console.error('Failed to register webhook:', error.message);
  }
}

app.listen(3001, async () => {
  console.log('App listening on port 3001');
  await registerWebhook();
});
```

### Advanced: Message Handler Class

```javascript
const axios = require('axios');

class WildcatClient {
  constructor(baseUrl, accountId) {
    this.baseUrl = baseUrl;
    this.accountId = accountId;
  }

  async send(to, message) {
    return axios.post(
      `${this.baseUrl}/accounts/${this.accountId}/message/send`,
      { to, message }
    );
  }

  async sendImage(to, imageBuffer, caption) {
    const formData = new FormData();
    formData.append('image', imageBuffer);
    formData.append('to', to);
    if (caption) formData.append('caption', caption);

    return axios.post(
      `${this.baseUrl}/accounts/${this.accountId}/message/send/image`,
      formData
    );
  }

  async getChats() {
    return axios.get(
      `${this.baseUrl}/accounts/${this.accountId}/chats`
    );
  }

  async getMessages(chatId, limit = 50) {
    return axios.get(
      `${this.baseUrl}/accounts/${this.accountId}/chats/${chatId}/messages`,
      { params: { limit } }
    );
  }

  async replyTo(to, message, quotedMessageId, chatId) {
    return axios.post(
      `${this.baseUrl}/accounts/${this.accountId}/message/reply`,
      { to, message, quotedMessageId, chatId }
    );
  }
}

// Usage
const client = new WildcatClient('http://localhost:3000', 'mybot');

// Send message
await client.send('919876543210@s.whatsapp.net', 'Hello!');

// Get chats
const chats = await client.getChats();
console.log(chats.data.chats);
```

---

## Python Integration

Use WILDCAT with Python applications.

### Installation

```bash
pip install requests
```

### Basic Usage

```python
import requests
import json

WILDCAT_URL = "http://localhost:3000"
ACCOUNT_ID = "mybot"

def send_message(to, message):
    url = f"{WILDCAT_URL}/accounts/{ACCOUNT_ID}/message/send"
    payload = {
        "to": to,
        "message": message
    }
    response = requests.post(url, json=payload)
    return response.json()

def get_chats():
    url = f"{WILDCAT_URL}/accounts/{ACCOUNT_ID}/chats"
    response = requests.get(url)
    return response.json()

# Usage
result = send_message("919876543210@s.whatsapp.net", "Hello from Python!")
print(result)
```

### Flask Webhook

```python
from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

WILDCAT_URL = "http://localhost:3000"

@app.route('/webhooks/whatsapp', methods=['POST'])
def webhook():
    data = request.json
    sender = data.get('from')
    text = data.get('text')

    print(f"Message from {sender}: {text}")

    # Send auto-reply
    response = requests.post(
        f"{WILDCAT_URL}/accounts/mybot/message/send",
        json={
            "to": sender,
            "message": f"I received your message: {text}"
        }
    )

    return jsonify({"ok": True})

@app.route('/register-webhook', methods=['POST'])
def register_webhook():
    # Register webhook in WILDCAT
    response = requests.post(
        f"{WILDCAT_URL}/webhooks",
        json={"url": "https://your-app.com/webhooks/whatsapp"}
    )
    return jsonify(response.json())

if __name__ == '__main__':
    app.run(port=3001)
```

---

## Use Case Examples

### 1. Customer Support Bot

**Flow:**
```
Customer Message
    ↓
Check if FAQ keyword
    ↓
If FAQ → Send auto-reply
If Support → Create ticket + notify agent
    ↓
Agent responds via WILDCAT
```

### 2. Order Notifications

**Flow:**
```
Order placed in Shopify
    ↓
n8n webhook triggers
    ↓
Get customer phone from order
    ↓
Send order confirmation via WILDCAT
    ↓
Update tracking → Send SMS
```

### 3. Lead Management

**Flow:**
```
Lead submits form
    ↓
Save to Google Sheets (Zapier)
    ↓
Send welcome message via WhatsApp (WILDCAT)
    ↓
Add to CRM (HubSpot)
```

### 4. Multi-Channel Notifications

**Flow:**
```
Alert triggered
    ↓
Send to:
  - WhatsApp (WILDCAT)
  - Slack (Zapier)
  - Email (IFTTT)
  - SMS (Twilio)
```

---

## Error Handling

### Common Issues

**1. Webhook Not Receiving Messages**
```bash
# Check webhook is registered
curl http://localhost:3000/webhooks

# Test webhook manually
curl -X POST https://your-app.com/webhooks/whatsapp \
  -H 'Content-Type: application/json' \
  -d '{"from":"919876543210@s.whatsapp.net","text":"test"}'
```

**2. CORS Issues**

Add CORS headers in your app:
```javascript
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['POST', 'GET']
}));
```

**3. Timeout Issues**

Increase timeout for long operations:
```javascript
const client = axios.create({
  timeout: 30000  // 30 seconds
});
```

---

## Security Best Practices

1. **Use HTTPS only**

   ```javascript
   // Good
   url: "https://secure-api.example.com/webhook"
   
   // Bad
   url: "http://insecure.example.com/webhook"
   ```

2. **Validate webhook source**

   ```javascript
   // Verify the webhook came from WILDCAT
   // (Add shared secret validation)
   ```

3. **Never log sensitive data**

   ```javascript
   // Bad
   console.log(phoneNumber);  // Never!
   
   // Good
   console.log(`Message from ${phoneNumber.slice(-4)}`);
   ```

4. **Use environment variables**

   ```javascript
   const WILDCAT_URL = process.env.WILDCAT_URL;
   const API_KEY = process.env.API_KEY;
   ```

---

## Performance Tips

1. **Batch messages**

   ```javascript
   // Send multiple messages in parallel
   await Promise.all(
     phoneNumbers.map(phone =>
       client.send(phone, 'Your message')
     )
   );
   ```

2. **Implement retry logic**

   ```javascript
   async function sendWithRetry(to, message, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await client.send(to, message);
       } catch (error) {
         if (i < maxRetries - 1) {
           await new Promise(r => setTimeout(r, 1000 * (i + 1)));
         } else {
           throw error;
         }
       }
     }
   }
   ```

3. **Cache data**

   ```javascript
   // Cache chats for 5 minutes
   const cacheTime = 5 * 60 * 1000;
   let cachedChats = null;
   let cacheExpiry = null;

   async function getChatsWithCache() {
     if (cachedChats && Date.now() < cacheExpiry) {
       return cachedChats;
     }
     cachedChats = await client.getChats();
     cacheExpiry = Date.now() + cacheTime;
     return cachedChats;
   }
   ```

---

## Next Steps

- **[API Reference](/docs/api/endpoints/)** - All available endpoints
- **[Deployment Guide](/docs/guides/deployment/)** - Deploy to production
- **[Troubleshooting](/docs/troubleshooting/faq/)** - Common issues


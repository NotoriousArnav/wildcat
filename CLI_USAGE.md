# Wildcat CLI Usage Guide

This document describes all available npm scripts for interacting with the Wildcat API.

## Setup

All commands use the `scripts/cli.js` helper script which makes it easy to interact with the API.

Default base URL: `http://localhost:3000` (can be overridden with `BASE_URL` environment variable)

## Available Commands

### Server Health

Check if the server is running:
```bash
npm run ping
```

### Account Management

#### List all accounts (compact view)
```bash
npm run accounts
```
Shows: id, name, status, hasQR

#### List all accounts (full details)
```bash
npm run accounts:list
```

#### Get specific account status
```bash
npm run account:status <accountId>
```
Example:
```bash
npm run account:status mynumber
```

#### Create a new account
```bash
npm run account:create <accountId> [name]
```
Examples:
```bash
npm run account:create myaccount
npm run account:create myaccount "My Business Account"
```

#### Delete an account
```bash
npm run account:delete <accountId>
```
Example:
```bash
npm run account:delete myaccount
```

#### Connect/restart an account
```bash
npm run account:connect <accountId>
```
Example:
```bash
npm run account:connect mynumber
```

#### Disconnect an account
```bash
npm run account:disconnect <accountId>
```
Example:
```bash
npm run account:disconnect mynumber
```

### Messaging

#### Send a message
```bash
npm run message:send <accountId> <to> "<message>"
```
Examples:
```bash
npm run message:send mynumber 919163827035@s.whatsapp.net "Hello from CLI!"
npm run message:send account1 1234567890@s.whatsapp.net "Test message"
```

#### List recent messages (compact)
```bash
npm run messages
```
Shows: accountId, from, message text, timestamp

#### List all messages (full details)
```bash
npm run messages:all
```

### Webhooks

#### Add a webhook URL
```bash
npm run webhook:add <url>
```
Example:
```bash
npm run webhook:add https://webhook.site/your-unique-id
```

### Logs

#### Tail application logs
```bash
npm run logs:app
```

#### Tail HTTP request logs
```bash
npm run logs:http
```

#### Tail Baileys (WhatsApp) logs
```bash
npm run logs:baileys
```

### Help

#### Show all available commands
```bash
npm run cli
```

## Usage Examples

### Complete workflow: Create account and send message

1. Check server is running:
   ```bash
   npm run ping
   ```

2. Create a new account:
   ```bash
   npm run account:create business "My Business"
   ```

3. Check account status and get QR code:
   ```bash
   npm run account:status business
   ```

4. Scan the QR code with WhatsApp mobile app

5. Verify connection:
   ```bash
   npm run account:status business
   # Should show "status": "connected"
   ```

6. Send a message:
   ```bash
   npm run message:send business 919163827035@s.whatsapp.net "Hello!"
   ```

7. Check sent messages:
   ```bash
   npm run messages
   ```

### Managing multiple accounts

```bash
# Create multiple accounts
npm run account:create personal "Personal Account"
npm run account:create business "Business Account"
npm run account:create support "Support Account"

# List all accounts
npm run accounts

# Check status of each
npm run account:status personal
npm run account:status business
npm run account:status support

# Send messages from different accounts
npm run message:send personal 1234567890@s.whatsapp.net "Personal message"
npm run message:send business 9876543210@s.whatsapp.net "Business message"
```

### Monitoring

```bash
# Watch application logs in real-time
npm run logs:app

# Watch HTTP requests in real-time
npm run logs:http

# Watch WhatsApp connection logs
npm run logs:baileys
```

## Environment Variables

- `BASE_URL`: Override the API base URL (default: `http://localhost:3000`)

Example:
```bash
BASE_URL=http://192.168.1.100:3000 npm run ping
```

## Notes

- All commands that accept arguments will show usage help if called without required arguments
- The `<to>` parameter for messages should be in WhatsApp JID format: `number@s.whatsapp.net` for individuals or `groupid@g.us` for groups
- Messages with spaces or special characters should be quoted
- All commands use `jq` for JSON formatting - ensure it's installed (`sudo apt install jq` on Ubuntu/Debian)

## Troubleshooting

If a command fails:

1. Check server is running: `npm run ping`
2. Check account exists: `npm run accounts`
3. Check account is connected: `npm run account:status <accountId>`
4. Check logs: `npm run logs:app` or `npm run logs:baileys`

Common issues:
- "Account not connected" - The account needs to scan QR code first
- "Account not found" - Use `npm run accounts` to see available account IDs
- Connection issues - Try `npm run account:connect <accountId>` to restart

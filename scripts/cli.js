#!/usr/bin/env node

const axios = require('axios');
const qrcode = require('qrcode-terminal');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const commands = {
  ping: async () => {
    const res = await axios.get(`${BASE_URL}/ping`);
    console.log(JSON.stringify(res.data, null, 2));
  },

  accounts: async () => {
    const res = await axios.get(`${BASE_URL}/accounts`);
    if (Array.isArray(res.data.accounts)) {
      res.data.accounts.forEach(acc => {
        console.log(JSON.stringify({
          id: acc._id,
          name: acc.name,
          status: acc.currentStatus,
          hasQR: acc.hasQR,
        }, null, 2));
      });
    } else {
      console.log(JSON.stringify(res.data, null, 2));
    }
  },

  'accounts:list': async () => {
    const res = await axios.get(`${BASE_URL}/accounts`);
    console.log(JSON.stringify(res.data, null, 2));
  },

  'account:status': async (accountId) => {
    if (!accountId) throw new Error('Usage: npm run account:status <accountId>');
    const res = await axios.get(`${BASE_URL}/accounts/${encodeURIComponent(accountId)}/status`);
    console.log(JSON.stringify(res.data, null, 2));
  },
  
  'account:create': async (accountId, accountName) => {
    if (!accountId) throw new Error('Usage: npm run account:create <accountId> [accountName]');
    const name = accountName || accountId;
    const res = await axios.post(`${BASE_URL}/accounts`, { id: accountId, name });
    console.log(JSON.stringify(res.data, null, 2));
  },
  
  'account:delete': async (accountId) => {
    if (!accountId) throw new Error('Usage: npm run account:delete <accountId>');
    const res = await axios.delete(`${BASE_URL}/accounts/${encodeURIComponent(accountId)}`);
    console.log(JSON.stringify(res.data, null, 2));
  },
  
  'account:connect': async (accountId) => {
    if (!accountId) throw new Error('Usage: npm run account:connect <accountId>');
    const res = await axios.post(`${BASE_URL}/accounts/${encodeURIComponent(accountId)}/connect`);
    console.log(JSON.stringify(res.data, null, 2));
  },

  'account:disconnect': async (accountId) => {
    if (!accountId) throw new Error('Usage: npm run account:disconnect <accountId>');
    const res = await axios.post(`${BASE_URL}/accounts/${encodeURIComponent(accountId)}/disconnect`);
    console.log(JSON.stringify(res.data, null, 2));
  },
  
  // Create an account and show QR in terminal
  'account:create:qr': (accountId, accountName) => {
    if (!accountId) throw new Error('Usage: npm run account:create:qr <accountId> [accountName]');
    const name = accountName || accountId;
    // Bash script: create, connect, poll for QR, render via qrencode or qrcode-terminal fallback
    return `bash -lc '
set -e
BASE_URL="${BASE_URL}"
ID="${accountId}"
NAME="${name}"
# Create account (idempotent)
curl -s -X POST "$BASE_URL/accounts" -H "Content-Type: application/json" -d '{"id":"'"$ID"'","name":"'"$NAME"'"}' >/dev/null || true
# Ensure connection is initiated
curl -s -X POST "$BASE_URL/accounts/$ID/connect" >/dev/null || true
>&2 echo "Waiting for QR for $ID (60s timeout)..."
for i in $(seq 1 60); do
  QR=$(curl -s "$BASE_URL/accounts/$ID/status" | jq -r '.qr // empty')
  if [ -n "$QR" ]; then
    if command -v qrencode >/dev/null 2>&1; then
      echo "$QR" | qrencode -t ansiutf
    else
      node -e "require('qrcode-terminal').generate(process.argv[1], { small: true })" "$QR"
    fi
    >&2 echo "Scan this QR with WhatsApp to link account: $ID"
    exit 0
  fi
  sleep 1
done
>&2 echo "Timed out waiting for QR for $ID"
exit 1
'`;
  },
  
  'message:send': (accountId, to, message) => {
    if (!accountId || !to || !message) {
      throw new Error('Usage: npm run message:send <accountId> <to> <message>');
    }
    const escapedMessage = JSON.stringify(message).slice(1, -1);
    return `curl -s -X POST ${BASE_URL}/accounts/${accountId}/message/send -H 'Content-Type: application/json' -d '{"to":"${to}","message":"${escapedMessage}"}' | jq '.'`;
  },
  
  messages: () => `curl -s ${BASE_URL}/messages | jq '.messages[] | {accountId, from, message: .message.conversation, timestamp}'`,
  
  'messages:all': () => `curl -s ${BASE_URL}/messages | jq '.'`,
  
  'webhook:add': (url) => {
    if (!url) throw new Error('Usage: npm run webhook:add <url>');
    return `curl -s -X POST ${BASE_URL}/webhooks -H 'Content-Type: application/json' -d '{"url":"${url}"}' | jq '.'`;
  },
  
  'logs:app': () => 'tail -f .logs/app.log | jq \'.\'',
  'logs:http': () => 'tail -f .logs/http.log | jq \'.\'',
  'logs:baileys': () => 'tail -f .logs/baileys.log | jq \'.\'',
};

const [,, command, ...args] = process.argv;

if (!command || !commands[command]) {
  console.log('Wildcat CLI - Available commands:');
  console.log('');
  console.log('  npm run ping                                 - Check server health');
  console.log('  npm run accounts                             - List all accounts (compact)');
  console.log('  npm run accounts:list                        - List all accounts (full)');
  console.log('  npm run account:status <accountId>           - Get account status');
  console.log('  npm run account:create <accountId> [name]    - Create new account');
  console.log('  npm run account:create:qr <accountId> [name] - Create account and show QR');
  console.log('  npm run account:delete <accountId>           - Delete account');
  console.log('  npm run account:connect <accountId>          - Connect account');
  console.log('  npm run account:disconnect <accountId>       - Disconnect account');
  console.log('  npm run message:send <accountId> <to> <msg>  - Send message');
  console.log('  npm run messages                             - List recent messages');
  console.log('  npm run messages:all                         - List all messages (full)');
  console.log('  npm run webhook:add <url>                    - Add webhook URL');
  console.log('  npm run logs:app                             - Tail app logs');
  console.log('  npm run logs:http                            - Tail HTTP logs');
  console.log('  npm run logs:baileys                         - Tail Baileys logs');
  console.log('');
  process.exit(command ? 1 : 0);
}

(async () => {
  try {
    const result = await commands[command](...args);
    // For log tailing commands, result will be a string command to execSync
    if (typeof result === 'string') {
      const { execSync } = require('child_process');
      execSync(result, { stdio: 'inherit', shell: '/bin/bash' });
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
})();

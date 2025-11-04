#!/usr/bin/env node

const { execSync } = require('child_process');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const commands = {
  ping: () => `curl -s ${BASE_URL}/ping | jq '.'`,
  
  accounts: () => `curl -s ${BASE_URL}/accounts | jq '.accounts[] | {id: ._id, name: .name, status: .currentStatus, hasQR: .hasQR}'`,
  
  'accounts:list': () => `curl -s ${BASE_URL}/accounts | jq '.'`,
  
  'account:status': (accountId) => {
    if (!accountId) throw new Error('Usage: npm run account:status <accountId>');
    return `curl -s ${BASE_URL}/accounts/${accountId}/status | jq '.'`;
  },
  
  'account:create': (accountId, accountName) => {
    if (!accountId) throw new Error('Usage: npm run account:create <accountId> [accountName]');
    const name = accountName || accountId;
    return `curl -s -X POST ${BASE_URL}/accounts -H 'Content-Type: application/json' -d '{"id":"${accountId}","name":"${name}"}' | jq '.'`;
  },
  
  'account:delete': (accountId) => {
    if (!accountId) throw new Error('Usage: npm run account:delete <accountId>');
    return `curl -s -X DELETE ${BASE_URL}/accounts/${accountId} | jq '.'`;
  },
  
  'account:connect': (accountId) => {
    if (!accountId) throw new Error('Usage: npm run account:connect <accountId>');
    return `curl -s -X POST ${BASE_URL}/accounts/${accountId}/connect | jq '.'`;
  },
  
  'account:disconnect': (accountId) => {
    if (!accountId) throw new Error('Usage: npm run account:disconnect <accountId>');
    return `curl -s -X POST ${BASE_URL}/accounts/${accountId}/disconnect | jq '.'`;
  },
  
  'message:send': (accountId, to, message) => {
    if (!accountId || !to || !message) {
      throw new Error('Usage: npm run message:send <accountId> <to> <message>');
    }
    const escapedMessage = message.replace(/"/g, '\\"');
    return `curl -s -X POST ${BASE_URL}/accounts/${accountId}/message/send -H 'Content-Type: application/json' -d '{"to":"${to}","message":"${escapedMessage}"}' | jq '.'`;
  },
  
  messages: () => `curl -s ${BASE_URL}/messages | jq '.messages[] | {accountId, from, message: .message.conversation, timestamp}'`,
  
  'messages:all': () => `curl -s ${BASE_URL}/messages | jq '.'`,
  
  'webhook:add': (url) => {
    if (!url) throw new Error('Usage: npm run webhook:add <url>');
    return `curl -s -X POST ${BASE_URL}/webhooks -H 'Content-Type: application/json' -d '{"url":"${url}"}' | jq '.'`;
  },
  
  'logs:app': () => `tail -f .logs/app.log | jq '.'`,
  'logs:http': () => `tail -f .logs/http.log | jq '.'`,
  'logs:baileys': () => `tail -f .logs/baileys.log | jq '.'`,
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

try {
  const cmd = commands[command](...args);
  execSync(cmd, { stdio: 'inherit', shell: '/bin/bash' });
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

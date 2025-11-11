const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '.logs');

function ensureLogsDir() {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch (_) { // eslint-disable-line no-unused-vars
    // If logs dir cannot be created, we silently ignore; console fallback remains.
  }
}

const streams = new Map();
function getStream(fileName) {
  ensureLogsDir();
  const target = path.join(LOG_DIR, fileName);
  if (!streams.has(target)) {
    const stream = fs.createWriteStream(target, { flags: 'a', encoding: 'utf8' });
    streams.set(target, stream);
  }
  return streams.get(target);
}

function writeLine(fileName, level, message, meta) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta || {}),
  });
  try {
    getStream(fileName).write(line + '\n');
  } catch (_) { // eslint-disable-line no-unused-vars
    // fallback to stdout
    try { console.log(line); } catch {} // no-op
  }
}

function appLogger(context = 'app', fileName = 'app.log') {
  const base = { context };
  return {
    info: (message, meta) => writeLine(fileName, 'info', message, { ...base, ...meta }),
    warn: (message, meta) => writeLine(fileName, 'warn', message, { ...base, ...meta }),
    error: (message, meta) => writeLine(fileName, 'error', message, { ...base, ...meta }),
    debug: (message, meta) => writeLine(fileName, 'debug', message, { ...base, ...meta }),
  };
}

function httpLogger(options = {}) {
  const fileName = options.file ?? 'http.log';
  const redactBody = options.redactBody ?? true;
  return function httpLoggerMiddleware(req, res, next) {
    const start = process.hrtime.bigint();
    const { method, url, headers, ip } = req;
    const ua = headers['user-agent'];
    const reqBody = redactBody ? undefined : (req.body || undefined);

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      writeLine(fileName, 'info', 'http_request', {
        method,
        url,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 1000) / 1000,
        ip,
        ua,
        reqBody,
      });
    });

    next();
  };
}

function wireSocketLogging(sock, logger = appLogger('baileys', 'baileys.log')) {
  // connection updates
  sock.ev.on('connection.update', (u = {}) => {
    const { connection, lastDisconnect } = u;
    logger.info('connection.update', {
      connection,
      lastDisconnectCode: lastDisconnect?.error?.output?.statusCode,
    });
  });

  sock.ev.on('creds.update', () => logger.info('creds.update'));

  sock.ev.on('messages.upsert', (up) => {
    const count = up?.messages?.length ?? 0;
    logger.info('messages.upsert', { count, type: up?.type });
  });

  sock.ev.on('messages.update', (updates) => {
    const count = Array.isArray(updates) ? updates.length : 0;
    logger.info('messages.update', { count });
  });
}

module.exports = {
  appLogger,
  httpLogger,
  wireSocketLogging,
};

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Logger } from './types/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, '../.logs');

function ensureLogsDir(): void {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  } catch (e) {
    // If logs dir cannot be created, we silently ignore; console fallback remains.
  }
}

const streams = new Map<string, fs.WriteStream>();

function getStream(fileName: string): fs.WriteStream {
  ensureLogsDir();
  const target = path.join(LOG_DIR, fileName);
  if (!streams.has(target)) {
    const stream = fs.createWriteStream(target, { flags: 'a', encoding: 'utf8' });
    streams.set(target, stream);
  }
  return streams.get(target)!;
}

function writeLine(fileName: string, level: string, message: string, meta?: Record<string, any>): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta || {}),
  });
  try {
    getStream(fileName).write(line + '\n');
  } catch (_) {
    // fallback to stdout
    try {
      console.log(line);
    } catch {} // no-op
  }
}

/**
 * Create a logger instance for a specific context
 * @param context - Context name for log categorization
 * @param fileName - Log file name (default: app.log)
 * @returns Logger instance
 */
export function appLogger(context: string = 'app', fileName: string = 'app.log'): Logger {
  const base = { context };
  return {
    info: (message: string, meta?: Record<string, any>) =>
      writeLine(fileName, 'info', message, { ...base, ...meta }),
    warn: (message: string, meta?: Record<string, any>) =>
      writeLine(fileName, 'warn', message, { ...base, ...meta }),
    error: (message: string, meta?: Record<string, any>) =>
      writeLine(fileName, 'error', message, { ...base, ...meta }),
    debug: (message: string, meta?: Record<string, any>) =>
      writeLine(fileName, 'debug', message, { ...base, ...meta }),
  };
}

/**
 * Express middleware for HTTP request logging
 * @param options - Configuration options
 * @returns Express middleware function
 */
export function httpLogger(options: { file?: string; redactBody?: boolean } = {}) {
  const fileName = options.file ?? 'http.log';
  const redactBody = options.redactBody ?? true;

  return function httpLoggerMiddleware(req: any, res: any, next: any) {
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

/**
 * Wire up Baileys socket event logging
 * @param sock - Baileys socket instance
 * @param logger - Logger instance (default: creates new one)
 */
export function wireSocketLogging(sock: any, logger: Logger = appLogger('baileys', 'baileys.log')): void {
  // connection updates
  sock.ev.on('connection.update', (u: any = {}) => {
    const { connection, lastDisconnect } = u;
    logger.info('connection.update', {
      connection,
      lastDisconnectCode: lastDisconnect?.error?.output?.statusCode,
    });
  });

  sock.ev.on('creds.update', () => logger.info('creds.update'));

  sock.ev.on('messages.upsert', (up: any) => {
    const count = up?.messages?.length ?? 0;
    logger.info('messages.upsert', { count, type: up?.type });
  });

  sock.ev.on('messages.update', (updates: any) => {
    const count = Array.isArray(updates) ? updates.length : 0;
    logger.info('messages.update', { count });
  });
}

export default {
  appLogger,
  httpLogger,
  wireSocketLogging,
};

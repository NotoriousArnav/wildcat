const rateLimit = require('express-rate-limit');
const { appLogger } = require('../../logger');

const log = appLogger('auth');

/**
 * Basic HTTP Authentication middleware
 * Validates Authorization header with username and password
 *
 * Environment Variables:
 * - BASIC_AUTH_ENABLED: Set to 'true' to enable (default: false for backwards compatibility)
 * - BASIC_AUTH_USERNAME: Username for basic auth
 * - BASIC_AUTH_PASSWORD: Password for basic auth
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.optional - If true, missing auth is allowed (default: false)
 * @returns {Function} Express middleware function
 */
function basicAuthMiddleware(options = {}) {
  const isEnabled = process.env.BASIC_AUTH_ENABLED === 'true';
  const username = process.env.BASIC_AUTH_USERNAME;
  const password = process.env.BASIC_AUTH_PASSWORD;
  const optional = options.optional || false;

  return (req, res, next) => {
    // If auth is disabled, allow request through
    if (!isEnabled) {
      return next();
    }

    // Validate configuration
    if (!username || !password) {
      log.error('basic_auth_misconfigured', {
        hasUsername: !!username,
        hasPassword: !!password,
      });
      return res.status(500).json({
        ok: false,
        error: 'Authentication server misconfigured',
      });
    }

    const authHeader = req.headers.authorization;

    // Handle missing auth header
    if (!authHeader) {
      if (optional) {
        return next();
      }
      log.warn('missing_auth_header', { path: req.path, method: req.method });
      return res.status(401).json({
        ok: false,
        error: 'Authentication required',
      });
    }

    // Validate header format
    if (!authHeader.startsWith('Basic ')) {
      log.warn('invalid_auth_header_format', { path: req.path, method: req.method });
      return res.status(401).json({
        ok: false,
        error: 'Invalid authentication header format',
      });
    }

    // Decode Base64 credentials
    try {
      const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
      const [providedUsername, providedPassword] = credentials.split(':');

      // Validate credentials
      if (providedUsername === username && providedPassword === password) {
        log.debug('basic_auth_success', { username: providedUsername });
        req.auth = { authenticated: true, method: 'basic', username: providedUsername };
        return next();
      }

      log.warn('basic_auth_failed', { username: providedUsername, path: req.path });
      return res.status(401).json({
        ok: false,
        error: 'Invalid credentials',
      });
    } catch (err) {
      log.error('basic_auth_decode_error', { error: err.message });
      return res.status(401).json({
        ok: false,
        error: 'Invalid authentication header',
      });
    }
  };
}

/**
 * API Key Authentication middleware
 * Validates X-API-Key header against configured API keys
 *
 * Environment Variables:
 * - API_KEYS_ENABLED: Set to 'true' to enable (default: false)
 * - API_KEYS: JSON string of API keys with permissions
 *   Example: '{"key1":"read,write","key2":"read"}'
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.optional - If true, missing key is allowed (default: false)
 * @param {string|string[]} options.requiredPermissions - Required permissions (e.g., 'write' or ['read', 'write'])
 * @returns {Function} Express middleware function
 */
function apiKeyMiddleware(options = {}) {
  const isEnabled = process.env.API_KEYS_ENABLED === 'true';
  const optional = options.optional || false;
  const requiredPermissions = options.requiredPermissions || [];
  const permissionsArray = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions].filter(Boolean);

  // Parse API keys from environment
  let apiKeysConfig = {};
  try {
    if (process.env.API_KEYS) {
      apiKeysConfig = JSON.parse(process.env.API_KEYS);
    }
  } catch (err) {
    log.error('api_keys_parse_error', { error: err.message });
  }

  return (req, res, next) => {
    // If auth is disabled, allow request through
    if (!isEnabled) {
      return next();
    }

    const apiKey = req.headers['x-api-key'];

    // Handle missing API key
    if (!apiKey) {
      if (optional) {
        return next();
      }
      log.warn('missing_api_key', { path: req.path, method: req.method });
      return res.status(401).json({
        ok: false,
        error: 'API key required',
      });
    }

    // Validate API key exists
    const keyPermissions = apiKeysConfig[apiKey];
    if (!keyPermissions) {
      log.warn('invalid_api_key', { path: req.path, method: req.method });
      return res.status(401).json({
        ok: false,
        error: 'Invalid API key',
      });
    }

    // Parse and validate permissions
    const permissions = keyPermissions.split(',').map(p => p.trim().toLowerCase());
    const hasPermissions = permissionsArray.length === 0 ||
      permissionsArray.every(perm => permissions.includes(perm.toLowerCase()));

    if (!hasPermissions) {
      log.warn('insufficient_permissions', {
        path: req.path,
        method: req.method,
        required: permissionsArray,
        actual: permissions,
      });
      return res.status(403).json({
        ok: false,
        error: 'Insufficient permissions',
      });
    }

    log.debug('api_key_auth_success', { path: req.path });
    req.auth = {
      authenticated: true,
      method: 'apikey',
      permissions,
    };
    return next();
  };
}

/**
 * Global Rate Limiter
 * Applies to all endpoints with configurable window and max requests
 *
 * Environment Variables:
 * - RATE_LIMIT_ENABLED: Set to 'true' to enable (default: false)
 * - RATE_LIMIT_WINDOW_MS: Time window in milliseconds (default: 15 * 60 * 1000 = 15 minutes)
 * - RATE_LIMIT_MAX_REQUESTS: Max requests per window (default: 100)
 *
 * @returns {Function} Express middleware function
 */
function globalRateLimiter() {
  const isEnabled = process.env.RATE_LIMIT_ENABLED === 'true';
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000; // 15 minutes
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100;

  const config = {
    windowMs,
    max: maxRequests,
    standardHeaders: false, // Disable default headers
    skip: (req) => !isEnabled, // Skip if disabled
    handler: (req, res) => {
      log.warn('rate_limit_exceeded', {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });
      res.status(429).json({
        ok: false,
        error: 'Too many requests. Please try again later.',
      });
    },
  };

  // Use default key generator (based on IP) unless user is authenticated
  if (!isEnabled) {
    return rateLimit(config);
  }

  // When enabled, add custom key generator for authenticated users
  config.keyGenerator = (req) => {
    // Use user ID if authenticated, otherwise use default IP-based key
    if (req.auth && req.auth.userId) {
      return `user:${req.auth.userId}`;
    }
    // Return empty string to use default behavior for unauthenticated users
    return undefined;
  };

  return rateLimit(config);
}

/**
 * Endpoint-specific Rate Limiter
 * Creates a rate limiter for specific endpoints
 *
 * @param {Object} options - Configuration options
 * @param {number} options.windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @param {number} options.max - Max requests per window (default: 20)
 * @returns {Function} Express middleware function
 */
function endpointRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60000; // 1 minute
  const max = options.max || 20;

  const config = {
    windowMs,
    max,
    standardHeaders: false,
    skip: (req) => process.env.RATE_LIMIT_ENABLED !== 'true',
    handler: (req, res) => {
      log.warn('endpoint_rate_limit_exceeded', {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });
      res.status(429).json({
        ok: false,
        error: 'Too many requests to this endpoint. Please try again later.',
      });
    },
  };

  // Add custom key generator only if rate limiting is enabled
  if (process.env.RATE_LIMIT_ENABLED === 'true') {
    config.keyGenerator = (req) => {
      if (req.auth && req.auth.userId) {
        return `user:${req.auth.userId}:${req.path}`;
      }
      return undefined;
    };
  }

  return rateLimit(config);
}

module.exports = {
  basicAuthMiddleware,
  apiKeyMiddleware,
  globalRateLimiter,
  endpointRateLimiter,
};

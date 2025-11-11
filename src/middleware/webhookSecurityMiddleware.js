const { appLogger } = require('../logger');

const log = appLogger('webhook');

// Private IP ranges (RFC 1918)
const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
];

// Loopback addresses
const LOOPBACK_ADDRESSES = ['127.0.0.1', 'localhost', '::1', '0.0.0.0'];

// Cloud metadata endpoints
const CLOUD_METADATA_HOSTS = [
  'metadata.google.internal',
  '169.254.169.254', // AWS, Azure, OpenStack
  '100.100.100.200', // Alibaba
];

/**
 * Validates webhook URL for SSRF vulnerabilities
 *
 * Environment Variables:
 * - WEBHOOK_URL_VALIDATION_ENABLED: Set to 'true' to enable (default: false)
 * - ENFORCE_HTTPS_WEBHOOKS: Set to 'true' to require HTTPS in production (default: false)
 *
 * @param {string} url - Webhook URL to validate
 * @returns {Object} { valid: boolean, error: string | null }
 */
function validateWebhookUrl(url) {
  const isEnabled = process.env.WEBHOOK_URL_VALIDATION_ENABLED === 'true';
  const enforceHttps = process.env.ENFORCE_HTTPS_WEBHOOKS === 'true';

  if (!isEnabled) {
    return { valid: true };
  }

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Check for HTTP in production
    if (enforceHttps && urlObj.protocol !== 'https:') {
      return {
        valid: false,
        error: 'HTTPS required for webhooks in production',
      };
    }

    // Check for loopback addresses
    if (LOOPBACK_ADDRESSES.includes(hostname.toLowerCase())) {
      log.warn('webhook_loopback_blocked', { url });
      return {
        valid: false,
        error: 'Loopback addresses are not allowed',
      };
    }

    // Check for private IP ranges
    if (PRIVATE_IP_RANGES.some(range => range.test(hostname))) {
      log.warn('webhook_private_ip_blocked', { url });
      return {
        valid: false,
        error: 'Private IP addresses are not allowed',
      };
    }

    // Check for cloud metadata endpoints
    if (CLOUD_METADATA_HOSTS.includes(hostname.toLowerCase())) {
      log.warn('webhook_metadata_blocked', { url });
      return {
        valid: false,
        error: 'Cloud metadata endpoints are not allowed',
      };
    }

    return { valid: true };
  } catch (err) {
    log.error('webhook_url_validation_error', { error: err.message, url });
    return {
      valid: false,
      error: 'Invalid URL format',
    };
  }
}

/**
 * Middleware to validate webhook URLs in request body
 *
 * @param {Object} options - Configuration options
 * @param {string} options.bodyField - Field name in request body (default: 'webhookUrl')
 * @returns {Function} Express middleware function
 */
function webhookUrlValidationMiddleware(options = {}) {
  const bodyField = options.bodyField || 'webhookUrl';

  return (req, res, next) => {
    const isEnabled = process.env.WEBHOOK_URL_VALIDATION_ENABLED === 'true';

    if (!isEnabled) {
      return next();
    }

    const webhookUrl = req.body?.[bodyField];

    if (!webhookUrl) {
      return next();
    }

    const validation = validateWebhookUrl(webhookUrl);

    if (!validation.valid) {
      log.warn('webhook_validation_failed', {
        path: req.path,
        error: validation.error,
      });
      return res.status(400).json({
        ok: false,
        error: `Invalid webhook URL: ${validation.error}`,
      });
    }

    return next();
  };
}

module.exports = {
  validateWebhookUrl,
  webhookUrlValidationMiddleware,
};

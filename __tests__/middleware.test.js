/**
 * Middleware Tests
 * Tests for authentication, rate limiting, validation, and webhook security
 */

const { basicAuthMiddleware, apiKeyMiddleware } = require('../src/middleware/authMiddleware');
const { sendMessageSchema, webhookSchema } = require('../src/validators/validationSchemas');
const { validateWebhookUrl } = require('../src/middleware/webhookSecurityMiddleware');

describe('Authentication Middleware', () => {
  describe('basicAuthMiddleware', () => {
    it('should pass through when disabled', () => {
      process.env.BASIC_AUTH_ENABLED = 'false';
      const middleware = basicAuthMiddleware();
      const req = { headers: {} };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should reject missing auth header when enabled', () => {
      process.env.BASIC_AUTH_ENABLED = 'true';
      process.env.BASIC_AUTH_USERNAME = 'user';
      process.env.BASIC_AUTH_PASSWORD = 'pass';

      const middleware = basicAuthMiddleware();
      const req = { headers: {}, path: '/test', method: 'GET' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept valid basic auth credentials', () => {
      process.env.BASIC_AUTH_ENABLED = 'true';
      process.env.BASIC_AUTH_USERNAME = 'user';
      process.env.BASIC_AUTH_PASSWORD = 'pass';

      const middleware = basicAuthMiddleware();
      const credentials = Buffer.from('user:pass').toString('base64');
      const req = { headers: { authorization: `Basic ${credentials}` }, path: '/test' };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);
      expect(req.auth).toBeDefined();
      expect(req.auth.authenticated).toBe(true);
      expect(req.auth.method).toBe('basic');
      expect(next).toHaveBeenCalled();
    });

    it('should reject invalid credentials', () => {
      process.env.BASIC_AUTH_ENABLED = 'true';
      process.env.BASIC_AUTH_USERNAME = 'user';
      process.env.BASIC_AUTH_PASSWORD = 'pass';

      const middleware = basicAuthMiddleware();
      const credentials = Buffer.from('user:wrong').toString('base64');
      const req = { headers: { authorization: `Basic ${credentials}` }, path: '/test', method: 'GET' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('apiKeyMiddleware', () => {
    it('should pass through when disabled', () => {
      process.env.API_KEYS_ENABLED = 'false';
      const middleware = apiKeyMiddleware();
      const req = { headers: {} };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should reject missing API key when enabled', () => {
      process.env.API_KEYS_ENABLED = 'true';
      process.env.API_KEYS = '{"key1":"read,write"}';

      const middleware = apiKeyMiddleware();
      const req = { headers: {}, path: '/test', method: 'GET' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept valid API key', () => {
      process.env.API_KEYS_ENABLED = 'true';
      process.env.API_KEYS = '{"key123":"read,write"}';

      const middleware = apiKeyMiddleware();
      const req = { headers: { 'x-api-key': 'key123' }, path: '/test' };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);
      expect(req.auth).toBeDefined();
      expect(req.auth.authenticated).toBe(true);
      expect(req.auth.method).toBe('apikey');
      expect(next).toHaveBeenCalled();
    });

    it('should check permissions when specified', () => {
      process.env.API_KEYS_ENABLED = 'true';
      process.env.API_KEYS = '{"key123":"read"}';

      const middleware = apiKeyMiddleware({ requiredPermissions: 'write' });
      const req = { headers: { 'x-api-key': 'key123' }, path: '/test', method: 'POST' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});

describe('Webhook Security', () => {
  describe('validateWebhookUrl', () => {
    beforeEach(() => {
      process.env.WEBHOOK_URL_VALIDATION_ENABLED = 'true';
    });

    it('should validate public URLs', () => {
      const result = validateWebhookUrl('https://example.com/webhook');
      expect(result.valid).toBe(true);
    });

    it('should block loopback addresses', () => {
      const result = validateWebhookUrl('http://localhost:8000/webhook');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Loopback');
    });

    it('should block private IPs', () => {
      const result = validateWebhookUrl('http://192.168.1.1/webhook');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Private');
    });

    it('should block cloud metadata endpoints', () => {
      const result = validateWebhookUrl('http://169.254.169.254/webhook');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('metadata');
    });

    it('should require HTTPS when enforced', () => {
      process.env.ENFORCE_HTTPS_WEBHOOKS = 'true';
      const result = validateWebhookUrl('http://example.com/webhook');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('HTTPS');
    });

    it('should reject invalid URLs', () => {
      const result = validateWebhookUrl('not-a-valid-url');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid');
    });
  });
});

describe('Input Validation', () => {
  describe('sendMessageSchema', () => {
    it('should validate correct message data', () => {
      const data = {
        phoneNumber: '+1234567890',
        message: 'Hello World',
      };
      const result = sendMessageSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const data = {
        message: 'Hello World',
      };
      const result = sendMessageSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid phone numbers', () => {
      const data = {
        phoneNumber: 'invalid',
        message: 'Hello',
      };
      const result = sendMessageSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('webhookSchema', () => {
    it('should validate correct webhook data', () => {
      const data = {
        webhookUrl: 'https://example.com/webhook',
        events: ['message', 'status'],
      };
      const result = webhookSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid webhook URL', () => {
      const data = {
        webhookUrl: 'not-a-url',
        events: ['message'],
      };
      const result = webhookSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require at least one event', () => {
      const data = {
        webhookUrl: 'https://example.com/webhook',
        events: [],
      };
      const result = webhookSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});

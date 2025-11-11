const { z } = require('zod');

// Common patterns
const PHONE_PATTERN = /^[0-9+\-\s()]{10,20}$/;
const URL_PATTERN = /^https?:\/\/.+/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================================
// Auth Schemas
// ============================================================

const basicAuthSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(128),
});

const apiKeySchema = z.object({
  key: z.string().min(20).max(100),
  permissions: z.array(z.enum(['read', 'write', 'admin'])).min(1),
});

// ============================================================
// Account Schemas
// ============================================================

const sendMessageSchema = z.object({
  phoneNumber: z.string().regex(PHONE_PATTERN, 'Invalid phone number'),
  message: z.string().min(1).max(4096),
  quotedMessageId: z.string().optional(),
});

const sendMediaSchema = z.object({
  phoneNumber: z.string().regex(PHONE_PATTERN, 'Invalid phone number'),
  mediaUrl: z.string().url('Invalid media URL'),
  caption: z.string().max(1024).optional(),
  mediaType: z.enum(['image', 'video', 'audio', 'document']),
});

const createGroupSchema = z.object({
  groupName: z.string().min(1).max(64),
  participants: z.array(
    z.string().regex(PHONE_PATTERN, 'Invalid phone number')
  ).min(2),
});

const addGroupMemberSchema = z.object({
  groupId: z.string(),
  phoneNumber: z.string().regex(PHONE_PATTERN, 'Invalid phone number'),
});

// ============================================================
// Webhook Schemas
// ============================================================

const webhookSchema = z.object({
  webhookUrl: z.string().url('Invalid webhook URL'),
  events: z.array(
    z.enum(['message', 'status', 'group', 'error'])
  ).min(1),
  active: z.boolean().optional().default(true),
});

const webhookUpdateSchema = z.object({
  webhookUrl: z.string().url('Invalid webhook URL').optional(),
  events: z.array(
    z.enum(['message', 'status', 'group', 'error'])
  ).optional(),
  active: z.boolean().optional(),
});

// ============================================================
// Contact Schemas
// ============================================================

const contactSchema = z.object({
  phoneNumber: z.string().regex(PHONE_PATTERN, 'Invalid phone number'),
  name: z.string().min(1).max(100).optional(),
  profilePicture: z.string().url().optional(),
});

// ============================================================
// Validation Middleware
// ============================================================

/**
 * Creates a validation middleware for request body
 *
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
function validateRequest(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.validated = validated;
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors = err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          ok: false,
          error: 'Validation failed',
          details: errors,
        });
      }
      return res.status(400).json({
        ok: false,
        error: 'Invalid request',
      });
    }
  };
}

/**
 * Creates a validation middleware for query parameters
 *
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
function validateQuery(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.query);
      req.validated = validated;
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors = err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          ok: false,
          error: 'Invalid query parameters',
          details: errors,
        });
      }
      return res.status(400).json({
        ok: false,
        error: 'Invalid request',
      });
    }
  };
}

module.exports = {
  // Schemas
  basicAuthSchema,
  apiKeySchema,
  sendMessageSchema,
  sendMediaSchema,
  createGroupSchema,
  addGroupMemberSchema,
  webhookSchema,
  webhookUpdateSchema,
  contactSchema,
  // Middleware
  validateRequest,
  validateQuery,
};

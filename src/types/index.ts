/**
 * Type definitions for WILDCAT - WhatsApp Integration Layer
 * These types provide compile-time safety and improved developer experience
 */

/**
 * Account entity representing a WhatsApp connection
 */
export interface Account {
  _id: string; // Account ID
  name?: string;
  webhookUrl?: string;
  status: 'created' | 'connecting' | 'connected' | 'disconnected' | 'logged_out' | 'reconnecting' | 'not_started';
  createdAt: Date;
  updatedAt: Date;
  lastConnected?: Date;
  collectionName?: string;
}

/**
 * Message sending request
 */
export interface SendMessageRequest {
  to: string;
  message: string;
  options?: {
    linkPreview?: boolean;
    quotedMessage?: string;
  };
}

/**
 * Message sending response
 */
export interface SendMessageResponse {
  ok: boolean;
  messageId?: string;
  timestamp?: number;
  error?: string;
}

/**
 * Media sending request (image, video, audio, document)
 */
export interface SendMediaRequest {
  to: string;
  caption?: string;
  options?: {
    quotedMessage?: string;
  };
}

/**
 * Media sending response
 */
export interface SendMediaResponse {
  ok: boolean;
  messageId?: string;
  mediaUrl?: string;
  timestamp?: number;
  error?: string;
}

/**
 * Contact information enrichment
 */
export interface ContactInfo {
  name?: string;
  pushName?: string;
  number: string;
  isMyContact: boolean;
}

/**
 * Chat/Group information
 */
export interface ChatInfo {
  id: string;
  name?: string;
  isGroup: boolean;
  participants?: number;
}

/**
 * Webhook payload - data sent to external services
 */
export interface WebhookPayload {
  event: string;
  accountId: string;
  messageId: string;
  chatId: string;
  from: string;
  fromMe: boolean;
  fromContact?: ContactInfo;
  chat?: ChatInfo;
  timestamp: number;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'reaction' | 'status' | 'unknown';
  text?: string;
  hasMedia: boolean;
  mediaUrl?: string | null;
  mediaType?: string | null;
  quotedMessage?: Record<string, any>;
  mentions?: string[];
  isForwarded: boolean;
  createdAt: Date;
}

/**
 * Webhook registration document
 */
export interface Webhook {
  _id?: string;
  url: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastTriggered?: Date;
  failureCount?: number;
}

/**
 * Message document stored in database
 */
export interface Message {
  _id?: string;
  accountId: string;
  messageId: string;
  chatId: string;
  from: string;
  fromMe: boolean;
  timestamp: number;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'reaction' | 'status' | 'unknown';
  text?: string | null;
  hasMedia: boolean;
  mediaType?: string;
  mediaGridFsId?: string;
  mediaUrl?: string;
  mediaSize?: number;
  mediaMimetype?: string;
  mediaFileName?: string;
  mediaWidth?: number;
  mediaHeight?: number;
  caption?: string;
  quotedMessage?: Record<string, any>;
  mentions?: string[];
  isForwarded: boolean;
  rawMessage: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Media file information
 */
export interface MediaFile {
  gridFsId: string;
  accountId: string;
  messageId: string;
  mediaType: 'image' | 'video' | 'audio' | 'document';
  mimetype: string;
  fileName?: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  caption?: string;
  uploadedAt: Date;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
}

/**
 * Socket manager state for an account
 */
export interface SocketInfo {
  socket: any; // Baileys socket type
  status: string;
  qr: string | null;
  lastDisconnect?: any;
  collection: string;
}

/**
 * Authentication state document
 */
export interface AuthState {
  _id: string;
  value: any;
}

/**
 * Logger interface
 */
export interface Logger {
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
  debug(message: string, meta?: Record<string, any>): void;
}

/**
 * Request validation result
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  issues?: Array<{
    path: string[];
    message: string;
  }>;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  message?: string;
}

/**
 * Authentication credentials
 */
export interface AuthCredentials {
  username: string;
  password: string;
}

/**
 * API Key information
 */
export interface ApiKeyInfo {
  key: string;
  permissions: string[];
  createdAt: Date;
  lastUsed?: Date;
  active: boolean;
}

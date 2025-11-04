const { appLogger } = require('./logger');
const { GridFSBackend, CloudinaryBackend } = require('./mediaBackends');

const logger = appLogger('mediaHandler');


// --- MediaStorageBackend interface (for documentation) ---
/**
 * MediaStorageBackend interface:
 * - async downloadAndStoreMedia(message, accountId, reuploadRequest, getMediaType, extractMediaMetadata): Promise<object>
 * - async getMedia(id): Promise<{stream, metadata}>
 * - async deleteMedia(id): Promise<void>
 * - getMediaUrl(accountId, messageId): string
 */

// --- Backend Interface (for documentation) ---
/**
 * MediaStorageBackend interface:
 * - async downloadAndStoreMedia(message, accountId, reuploadRequest, getMediaType, extractMediaMetadata): Promise<object>
 * - async getMedia(id): Promise<{stream, metadata}>
 * - async deleteMedia(id): Promise<void>
 * - getMediaUrl(accountId, messageId): string
 */

// --- GridFS Backend ---
class GridFSBackend {
  constructor(db) {
    this.db = db;
    this.bucket = new GridFSBucket(db, { bucketName: 'media' });
    this.logger = appLogger('GridFSBackend');
  }
  async downloadAndStoreMedia(message, accountId, reuploadRequest, getMediaType, extractMediaMetadata) {
    try {
      this.logger.info('Downloading media from message', { 
        accountId, 
        messageId: message.key.id 
      });

      // Download media as buffer
      const buffer = await downloadMediaMessage(
        message,
        'buffer',
        {},
        {
          logger: this.logger,
          reuploadRequest
        }
      );

      if (!buffer) {
        throw new Error('Failed to download media - no buffer returned');
      }

      // Determine media type and metadata
      const mediaType = getMediaType(message);
      const metadata = extractMediaMetadata(message, mediaType, accountId);

      // Store in GridFS
      const filename = `${accountId}_${message.key.id}_${Date.now()}`;
      const uploadStream = this.bucket.openUploadStream(filename, {
        contentType: metadata.mimetype,
        metadata: {
          accountId,
          messageId: message.key.id,
          chatId: message.key.remoteJid,
          uploadedAt: new Date(),
          ...metadata
        }
      });

      // Convert buffer to stream and pipe to GridFS
      const { Readable } = require('stream');
      const readStream = Readable.from(buffer);
      return new Promise((resolve, reject) => {
        readStream.pipe(uploadStream)
          .on('error', (err) => {
            this.logger.error('Error uploading to GridFS', { error: err.message });
            reject(err);
          })
          .on('finish', () => {
            this.logger.info('Media stored successfully', { 
              fileId: uploadStream.id,
              filename 
            });
            resolve({
              gridFsId: uploadStream.id,
              filename,
              size: buffer.length,
              ...metadata
            });
          });
      });
    } catch (err) {
      this.logger.error('Error downloading and storing media', { 
        accountId,
        messageId: message?.key?.id,
        error: err.message 
      });
      throw err;
    }
  }
  async getMedia(gridFsId) {
    // TODO: Implement method
  }
  async deleteMedia(gridFsId) {
    // TODO: Implement method
  }
  getMediaUrl(accountId, messageId) {
    // TODO: Implement method
  }
}

// --- Backend Interface (for documentation) ---
/**
 * MediaStorageBackend interface:
 * - async downloadAndStoreMedia(message, accountId, reuploadRequest, getMediaType, extractMediaMetadata): Promise<object>
 * - async getMedia(id): Promise<{stream, metadata}>
 * - async deleteMedia(id): Promise<void>
 * - getMediaUrl(accountId, messageId): string
 */

// --- GridFS Backend ---
class GridFSBackend {
  constructor(db) {
    this.db = db;
    this.bucket = new GridFSBucket(db, { bucketName: 'media' });
    this.logger = appLogger('GridFSBackend');
  }

  async downloadAndStoreMedia(message, accountId, reuploadRequest, getMediaType, extractMediaMetadata) {
    try {
      this.logger.info('Downloading media from message', { 
        accountId, 
        messageId: message.key.id 
      });

      // Download media as buffer
      const buffer = await downloadMediaMessage(
        message,
        'buffer',
        {},
        {
          logger: this.logger,
          reuploadRequest
        }
      );

      if (!buffer) {
        throw new Error('Failed to download media - no buffer returned');
      }

      // Determine media type and metadata
      const mediaType = getMediaType(message);
      const metadata = extractMediaMetadata(message, mediaType, accountId);

      // Store in GridFS
      const filename = `${accountId}_${message.key.id}_${Date.now()}`;
      const uploadStream = this.bucket.openUploadStream(filename, {
        contentType: metadata.mimetype,
        metadata: {
          accountId,
          messageId: message.key.id,
          chatId: message.key.remoteJid,
          uploadedAt: new Date(),
          ...metadata
        }
      });

      // Convert buffer to stream and pipe to GridFS
      const readStream = Readable.from(buffer);
      return new Promise((resolve, reject) => {
        readStream.pipe(uploadStream)
          .on('error', (err) => {
            this.logger.error('Error uploading to GridFS', { error: err.message });
            reject(err);
          })
          .on('finish', () => {
            this.logger.info('Media stored successfully', { 
              fileId: uploadStream.id,
              filename 
            });
            resolve({
              gridFsId: uploadStream.id,
              filename,
              size: buffer.length,
              ...metadata
            });
          });
      });
    } catch (err) {
      this.logger.error('Error downloading and storing media', { 
        accountId,
        messageId: message?.key?.id,
        error: err.message 
      });
      throw err;
    }
  }

  async getMedia(gridFsId) {
    try {
      const { ObjectId } = require('mongodb');
      const fileId = new ObjectId(gridFsId);
      const files = await this.bucket.find({ _id: fileId }).toArray();
      if (files.length === 0) {
        throw new Error('Media file not found');
      }
      const file = files[0];
      const downloadStream = this.bucket.openDownloadStream(fileId);
      return {
        stream: downloadStream,
        metadata: {
          filename: file.filename,
          contentType: file.contentType,
          length: file.length,
          uploadDate: file.uploadDate,
          ...file.metadata
        }
      };
    } catch (err) {
      this.logger.error('Error retrieving media', { gridFsId, error: err.message });
      throw err;
    }
  }

  async deleteMedia(gridFsId) {
    try {
      const { ObjectId } = require('mongodb');
      await this.bucket.delete(new ObjectId(gridFsId));
      this.logger.info('Media deleted', { gridFsId });
    } catch (err) {
      this.logger.error('Error deleting media', { gridFsId, error: err.message });
      throw err;
    }
  }

  getMediaUrl(accountId, messageId) {
    return `/accounts/${accountId}/messages/${messageId}/media`;
  }
}

// --- Backend Interface (for documentation) ---
/**
 * MediaStorageBackend interface:
 * - async downloadAndStoreMedia(message, accountId, reuploadRequest, getMediaType, extractMediaMetadata): Promise<object>
 * - async getMedia(id): Promise<{stream, metadata}>
 * - async deleteMedia(id): Promise<void>
 * - getMediaUrl(accountId, messageId): string
 */

// --- GridFS Backend ---
class GridFSBackend {
  constructor(db) {
    this.db = db;
    this.bucket = new GridFSBucket(db, { bucketName: 'media' });
    this.logger = appLogger('GridFSBackend');
  }

  async downloadAndStoreMedia(message, accountId, reuploadRequest, getMediaType, extractMediaMetadata) {
    try {
      this.logger.info('Downloading media from message', { 
        accountId, 
        messageId: message.key.id 
      });

      // Download media as buffer
      const buffer = await downloadMediaMessage(
        message,
        'buffer',
        {},
        {
          logger: this.logger,
          reuploadRequest
        }
      );

      if (!buffer) {
        throw new Error('Failed to download media - no buffer returned');
      }

      // Determine media type and metadata
      const mediaType = getMediaType(message);
      const metadata = extractMediaMetadata(message, mediaType, accountId);

      // Store in GridFS
      const filename = `${accountId}_${message.key.id}_${Date.now()}`;
      const uploadStream = this.bucket.openUploadStream(filename, {
        contentType: metadata.mimetype,
        metadata: {
          accountId,
          messageId: message.key.id,
          chatId: message.key.remoteJid,
          uploadedAt: new Date(),
          ...metadata
        }
      });

      // Convert buffer to stream and pipe to GridFS
      const readStream = Readable.from(buffer);
      return new Promise((resolve, reject) => {
        readStream.pipe(uploadStream)
          .on('error', (err) => {
            this.logger.error('Error uploading to GridFS', { error: err.message });
            reject(err);
          })
          .on('finish', () => {
            this.logger.info('Media stored successfully', { 
              fileId: uploadStream.id,
              filename 
            });
            resolve({
              gridFsId: uploadStream.id,
              filename,
              size: buffer.length,
              ...metadata
            });
          });
      });
    } catch (err) {
      this.logger.error('Error downloading and storing media', { 
        accountId,
        messageId: message?.key?.id,
        error: err.message 
      });
      throw err;
    }
  }

  async getMedia(gridFsId) {
    try {
      const { ObjectId } = require('mongodb');
      const fileId = new ObjectId(gridFsId);
      const files = await this.bucket.find({ _id: fileId }).toArray();
      if (files.length === 0) {
        throw new Error('Media file not found');
      }
      const file = files[0];
      const downloadStream = this.bucket.openDownloadStream(fileId);
      return {
        stream: downloadStream,
        metadata: {
          filename: file.filename,
          contentType: file.contentType,
          length: file.length,
          uploadDate: file.uploadDate,
          ...file.metadata
        }
      };
    } catch (err) {
      this.logger.error('Error retrieving media', { gridFsId, error: err.message });
      throw err;
    }
  }

  async deleteMedia(gridFsId) {
    try {
      const { ObjectId } = require('mongodb');
      await this.bucket.delete(new ObjectId(gridFsId));
      this.logger.info('Media deleted', { gridFsId });
    } catch (err) {
      this.logger.error('Error deleting media', { gridFsId, error: err.message });
      throw err;
    }
  }

  getMediaUrl(accountId, messageId) {
    return `/accounts/${accountId}/messages/${messageId}/media`;
  }
}

/**
 * Media Handler - Manages media storage and retrieval using MongoDB GridFS
 * For CRM integration with complete chat history
 */

// --- GridFS Backend ---
class GridFSBackend {
  constructor(db) {
    this.db = db;
    this.bucket = new GridFSBucket(db, { bucketName: 'media' });
    this.logger = appLogger('GridFSBackend');
  }

  async downloadAndStoreMedia(message, accountId, reuploadRequest, getMediaType, extractMediaMetadata) {
    try {
      this.logger.info('Downloading media from message', { 
        accountId, 
        messageId: message.key.id 
      });

      // Download media as buffer
      const buffer = await downloadMediaMessage(
        message,
        'buffer',
        {},
        {
          logger: this.logger,
          reuploadRequest
        }
      );

      if (!buffer) {
        throw new Error('Failed to download media - no buffer returned');
      }

      // Determine media type and metadata
      const mediaType = getMediaType(message);
      const metadata = extractMediaMetadata(message, mediaType, accountId);

      // Store in GridFS
      const filename = `${accountId}_${message.key.id}_${Date.now()}`;
      const uploadStream = this.bucket.openUploadStream(filename, {
        contentType: metadata.mimetype,
        metadata: {
          accountId,
          messageId: message.key.id,
          chatId: message.key.remoteJid,
          uploadedAt: new Date(),
          ...metadata
        }
      });

      // Convert buffer to stream and pipe to GridFS
      const readStream = Readable.from(buffer);
      return new Promise((resolve, reject) => {
        readStream.pipe(uploadStream)
          .on('error', (err) => {
            this.logger.error('Error uploading to GridFS', { error: err.message });
            reject(err);
          })
          .on('finish', () => {
            this.logger.info('Media stored successfully', { 
              fileId: uploadStream.id,
              filename 
            });
            resolve({
              gridFsId: uploadStream.id,
              filename,
              size: buffer.length,
              ...metadata
            });
          });
      });
    } catch (err) {
      this.logger.error('Error downloading and storing media', { 
        accountId,
        messageId: message?.key?.id,
        error: err.message 
      });
      throw err;
    }
  }

  async getMedia(gridFsId) {
    try {
      const { ObjectId } = require('mongodb');
      const fileId = new ObjectId(gridFsId);
      const files = await this.bucket.find({ _id: fileId }).toArray();
      if (files.length === 0) {
        throw new Error('Media file not found');
      }
      const file = files[0];
      const downloadStream = this.bucket.openDownloadStream(fileId);
      return {
        stream: downloadStream,
        metadata: {
          filename: file.filename,
          contentType: file.contentType,
          length: file.length,
          uploadDate: file.uploadDate,
          ...file.metadata
        }
      };
    } catch (err) {
      this.logger.error('Error retrieving media', { gridFsId, error: err.message });
      throw err;
    }
  }

  async deleteMedia(gridFsId) {
    try {
      const { ObjectId } = require('mongodb');
      await this.bucket.delete(new ObjectId(gridFsId));
      this.logger.info('Media deleted', { gridFsId });
    } catch (err) {
      this.logger.error('Error deleting media', { gridFsId, error: err.message });
      throw err;
    }
  }

  getMediaUrl(accountId, messageId) {
    return `/accounts/${accountId}/messages/${messageId}/media`;
  }
}

// --- Cloudinary Backend (stub) ---
class CloudinaryBackend {
  constructor() {
    this.logger = appLogger('CloudinaryBackend');
    // Cloudinary config will be set up here
    // cloudinary.config({ ... })
  }

  async downloadAndStoreMedia(message, accountId, reuploadRequest, getMediaType, extractMediaMetadata) {
    // TODO: Implement Cloudinary upload logic
    throw new Error('Cloudinary backend not yet implemented');
  }

  async getMedia(cloudinaryId) {
    // TODO: Implement Cloudinary download logic
    throw new Error('Cloudinary backend not yet implemented');
  }

  async deleteMedia(cloudinaryId) {
    // TODO: Implement Cloudinary delete logic
    throw new Error('Cloudinary backend not yet implemented');
  }

  getMediaUrl(accountId, messageId) {
    // TODO: Implement Cloudinary media URL logic
    return `/accounts/${accountId}/messages/${messageId}/media`;
  }
}

/**
 * Media Handler - Delegates to selected backend (GridFS or Cloudinary)
 */
class MediaHandler {
  constructor(db) {
    const backendType = (process.env.MEDIA_STORAGE || 'gridfs').toLowerCase();
    if (backendType === 'cloudinary') {
      this.backend = new CloudinaryBackend();
    } else {
      this.backend = new GridFSBackend(db);
    }
    this._getMediaType = this._getMediaType.bind(this);
    this._extractMediaMetadata = this._extractMediaMetadata.bind(this);
  }

  /**
   * Download media from WhatsApp message and store in backend
   * @param {object} message - Baileys message object
   * @param {string} accountId - Account ID
   * @param {function} reuploadRequest - Socket's updateMediaMessage function
   * @returns {Promise<object>} Media metadata
   */
  async downloadAndStoreMedia(message, accountId, reuploadRequest) {
    try {
      logger.info('Downloading media from message', { 
        accountId, 
        messageId: message.key.id 
      });

      // Download media as buffer
      const buffer = await downloadMediaMessage(
        message,
        'buffer',
        {},
        {
          logger,
          reuploadRequest
        }
      );

      if (!buffer) {
        throw new Error('Failed to download media - no buffer returned');
      }

      // Determine media type and metadata
      const mediaType = this._getMediaType(message);
      const metadata = this._extractMediaMetadata(message, mediaType, accountId);

      // Store in GridFS
      const filename = `${accountId}_${message.key.id}_${Date.now()}`;
      const uploadStream = this.bucket.openUploadStream(filename, {
        contentType: metadata.mimetype,
        metadata: {
          accountId,
          messageId: message.key.id,
          chatId: message.key.remoteJid,
          uploadedAt: new Date(),
          ...metadata
        }
      });

      // Convert buffer to stream and pipe to GridFS
      const readStream = Readable.from(buffer);
      
      return new Promise((resolve, reject) => {
        readStream.pipe(uploadStream)
          .on('error', (err) => {
            logger.error('Error uploading to GridFS', { error: err.message });
            reject(err);
          })
          .on('finish', () => {
            logger.info('Media stored successfully', { 
              fileId: uploadStream.id,
              filename 
            });
            resolve({
              gridFsId: uploadStream.id,
              filename,
              size: buffer.length,
              ...metadata
            });
          });
      });

    } catch (err) {
      logger.error('Error downloading and storing media', { 
        accountId,
        messageId: message?.key?.id,
        error: err.message 
      });
      throw err;
    }
  }

  /**
   * Retrieve media from GridFS
   * @param {string} gridFsId - GridFS file ID
   * @returns {Promise<{stream: ReadStream, metadata: object}>}
   */
  async getMedia(gridFsId) {
    try {
      const { ObjectId } = require('mongodb');
      const fileId = new ObjectId(gridFsId);

      // Get file metadata
      const files = await this.bucket.find({ _id: fileId }).toArray();
      if (files.length === 0) {
        throw new Error('Media file not found');
      }

      const file = files[0];
      const downloadStream = this.bucket.openDownloadStream(fileId);

      return {
        stream: downloadStream,
        metadata: {
          filename: file.filename,
          contentType: file.contentType,
          length: file.length,
          uploadDate: file.uploadDate,
          ...file.metadata
        }
      };

    } catch (err) {
      logger.error('Error retrieving media', { gridFsId, error: err.message });
      throw err;
    }
  }

  /**
   * Delete media from GridFS
   * @param {string} gridFsId - GridFS file ID
   */
  async deleteMedia(gridFsId) {
    try {
      const { ObjectId } = require('mongodb');
      await this.bucket.delete(new ObjectId(gridFsId));
      logger.info('Media deleted', { gridFsId });
    } catch (err) {
      logger.error('Error deleting media', { gridFsId, error: err.message });
      throw err;
    }
  }

  /**
   * Get media URL path for API access
   * @param {string} accountId - Account ID
   * @param {string} messageId - Message ID
   * @returns {string} URL path
   */
  getMediaUrl(accountId, messageId) {
    return `/accounts/${accountId}/messages/${messageId}/media`;
  }

  /**
   * Extract media type from Baileys message
   * @private
   */
  _getMediaType(message) {
    const msg = message.message;
    if (!msg) return null;

    if (msg.imageMessage) return 'image';
    if (msg.videoMessage) return 'video';
    if (msg.audioMessage) return 'audio';
    if (msg.documentMessage) return 'document';
    if (msg.stickerMessage) return 'sticker';
    
    return null;
  }

  /**
   * Extract media metadata from Baileys message
   * @private
   */
  _extractMediaMetadata(message, mediaType, accountId) {
    const msg = message.message;
    let mediaMsg = null;
    
    switch(mediaType) {
      case 'image':
        mediaMsg = msg.imageMessage;
        break;
      case 'video':
        mediaMsg = msg.videoMessage;
        break;
      case 'audio':
        mediaMsg = msg.audioMessage;
        break;
      case 'document':
        mediaMsg = msg.documentMessage;
        break;
      case 'sticker':
        mediaMsg = msg.stickerMessage;
        break;
      default:
        return {};
    }

    if (!mediaMsg) return {};

    const metadata = {
      mediaType,
      mimetype: mediaMsg.mimetype || 'application/octet-stream',
      caption: mediaMsg.caption || null,
      fileName: mediaMsg.fileName || null,
      fileLength: mediaMsg.fileLength || null,
    };

    // Image/video specific
    if (mediaType === 'image' || mediaType === 'video') {
      metadata.width = mediaMsg.width || null;
      metadata.height = mediaMsg.height || null;
    }

    // Video specific
    if (mediaType === 'video') {
      metadata.seconds = mediaMsg.seconds || null;
      metadata.gifPlayback = mediaMsg.gifPlayback || false;
    }

    // Audio specific
    if (mediaType === 'audio') {
      metadata.seconds = mediaMsg.seconds || null;
      metadata.ptt = mediaMsg.ptt || false; // Push-to-talk (voice message)
    }

    return metadata;
  }

  /**
   * Check if message has media
   * @param {object} message - Baileys message object
   * @returns {boolean}
   */
  hasMedia(message) {
    if (!message || !message.message) return false;
    const mediaType = this._getMediaType(message);
    return mediaType !== null;
  }

  /**
   * Extract quoted message info for replies
   * @param {object} message - Baileys message object
   * @returns {object|null} Quoted message data
   */
  extractQuotedMessage(message) {
    try {
      const msg = message.message;
      
      // Check different message types for context
      let contextInfo = null;
      if (msg?.extendedTextMessage?.contextInfo) {
        contextInfo = msg.extendedTextMessage.contextInfo;
      } else if (msg?.imageMessage?.contextInfo) {
        contextInfo = msg.imageMessage.contextInfo;
      } else if (msg?.videoMessage?.contextInfo) {
        contextInfo = msg.videoMessage.contextInfo;
      } else if (msg?.documentMessage?.contextInfo) {
        contextInfo = msg.documentMessage.contextInfo;
      } else if (msg?.audioMessage?.contextInfo) {
        contextInfo = msg.audioMessage.contextInfo;
      }

      if (!contextInfo || !contextInfo.quotedMessage) {
        return null;
      }

      // Extract quoted message details
      const quotedMsg = contextInfo.quotedMessage;
      const quotedMessageType = Object.keys(quotedMsg)[0];
      
      return {
        messageId: contextInfo.stanzaId,
        participant: contextInfo.participant,
        text: quotedMsg.conversation || 
              quotedMsg.extendedTextMessage?.text ||
              quotedMsg.imageMessage?.caption ||
              quotedMsg.videoMessage?.caption ||
              null,
        hasMedia: ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'].includes(quotedMessageType)
      };

    } catch (err) {
      logger.error('Error extracting quoted message', { error: err.message });
      return null;
    }
  }

  /**
   * Extract mentions from message
   * @param {object} message - Baileys message object
   * @returns {array} Array of mentioned JIDs
   */
  extractMentions(message) {
    try {
      const msg = message.message;
      let contextInfo = null;

      if (msg?.extendedTextMessage?.contextInfo) {
        contextInfo = msg.extendedTextMessage.contextInfo;
      } else if (msg?.imageMessage?.contextInfo) {
        contextInfo = msg.imageMessage.contextInfo;
      } else if (msg?.videoMessage?.contextInfo) {
        contextInfo = msg.videoMessage.contextInfo;
      }

      return contextInfo?.mentionedJid || [];
    } catch (err) {
      logger.error('Error extracting mentions', { error: err.message });
      return [];
    }
  }
}

module.exports = MediaHandler;

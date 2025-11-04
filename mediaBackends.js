const { GridFSBucket } = require('mongodb');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { appLogger } = require('./logger');
const { Readable } = require('stream');
const cloudinary = require('cloudinary').v2;

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
      const mediaType = getMediaType(message);
      const metadata = extractMediaMetadata(message, mediaType, accountId);
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
    // Configure Cloudinary from env vars
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
  }

  async downloadAndStoreMedia(message, accountId, reuploadRequest, getMediaType, extractMediaMetadata) {
    try {
      this.logger.info('Downloading media from message', {
        accountId,
        messageId: message.key.id
      });
      // Download media as buffer (same as GridFS)
      const { downloadMediaMessage } = require('@whiskeysockets/baileys');
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
      const mediaType = getMediaType(message);
      const metadata = extractMediaMetadata(message, mediaType, accountId);
      const publicId = `${accountId}_${message.key.id}_${Date.now()}`;
      // Upload to Cloudinary using upload_stream
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            resource_type: 'auto',
            folder: process.env.CLOUDINARY_FOLDER || 'whatsapp',
            context: metadata,
            use_filename: true,
            unique_filename: false,
            overwrite: false
          },
          (error, result) => {
            if (error) {
              this.logger.error('Cloudinary upload error', { error });
              reject(error);
            } else {
              resolve(result);
            }
          }
        );
        stream.end(buffer);
      });
      this.logger.info('Media uploaded to Cloudinary', {
        publicId,
        url: uploadResult.secure_url
      });
      return {
        cloudinaryId: uploadResult.public_id,
        url: uploadResult.secure_url,
        size: buffer.length,
        ...metadata
      };
    } catch (err) {
      this.logger.error('Error downloading and storing media (Cloudinary)', {
        accountId,
        messageId: message?.key?.id,
        error: err.message
      });
      throw err;
    }
  }

  async getMedia(cloudinaryId) {
    try {
      // Get asset details from Cloudinary
      const result = await cloudinary.api.resource(cloudinaryId, { resource_type: 'auto' });
      // Return the secure_url for direct download, or stream if needed
      return {
        url: result.secure_url,
        metadata: {
          filename: result.public_id,
          contentType: result.format,
          length: result.bytes,
          uploadDate: result.created_at,
          ...result.context?.custom
        }
      };
    } catch (err) {
      this.logger.error('Error retrieving media from Cloudinary', { cloudinaryId, error: err.message });
      throw err;
    }
  }

  async deleteMedia(cloudinaryId) {
    try {
      const result = await cloudinary.uploader.destroy(cloudinaryId, { resource_type: 'auto' });
      if (result.result !== 'ok') {
        throw new Error('Failed to delete media from Cloudinary');
      }
      this.logger.info('Media deleted from Cloudinary', { cloudinaryId });
    } catch (err) {
      this.logger.error('Error deleting media from Cloudinary', { cloudinaryId, error: err.message });
      throw err;
    }
  }

  getMediaUrl(accountId, messageId) {
    // This method is for API path, not Cloudinary direct URL
    return `/accounts/${accountId}/messages/${messageId}/media`;
  }
}


module.exports = { GridFSBackend, CloudinaryBackend };

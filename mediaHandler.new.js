const { appLogger } = require('./logger');
const { GridFSBackend, CloudinaryBackend } = require('./mediaBackends');

const logger = appLogger('mediaHandler');

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

  async downloadAndStoreMedia(message, accountId, reuploadRequest) {
    return this.backend.downloadAndStoreMedia(
      message,
      accountId,
      reuploadRequest,
      this._getMediaType,
      this._extractMediaMetadata
    );
  }

  async getMedia(id) {
    return this.backend.getMedia(id);
  }

  async deleteMedia(id) {
    return this.backend.deleteMedia(id);
  }

  getMediaUrl(accountId, messageId) {
    return this.backend.getMediaUrl(accountId, messageId);
  }

  // --- Utility methods copied from old MediaHandler ---
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

  _extractMediaMetadata(message, mediaType, accountId) {
    const msg = message.message;
    let mediaMsg = null;
    switch(mediaType) {
      case 'image': mediaMsg = msg.imageMessage; break;
      case 'video': mediaMsg = msg.videoMessage; break;
      case 'audio': mediaMsg = msg.audioMessage; break;
      case 'document': mediaMsg = msg.documentMessage; break;
      case 'sticker': mediaMsg = msg.stickerMessage; break;
      default: return {};
    }
    if (!mediaMsg) return {};
    const metadata = {
      mediaType,
      mimetype: mediaMsg.mimetype || 'application/octet-stream',
      caption: mediaMsg.caption || null,
      fileName: mediaMsg.fileName || null,
      fileLength: mediaMsg.fileLength || null,
    };
    if (mediaType === 'image' || mediaType === 'video') {
      metadata.width = mediaMsg.width || null;
      metadata.height = mediaMsg.height || null;
    }
    if (mediaType === 'video') {
      metadata.seconds = mediaMsg.seconds || null;
      metadata.gifPlayback = mediaMsg.gifPlayback || false;
    }
    if (mediaType === 'audio') {
      metadata.seconds = mediaMsg.seconds || null;
      metadata.ptt = mediaMsg.ptt || false;
    }
    return metadata;
  }

  hasMedia(message) {
    if (!message || !message.message) return false;
    const mediaType = this._getMediaType(message);
    return mediaType !== null;
  }
}

module.exports = MediaHandler;

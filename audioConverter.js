const { spawn } = require('child_process');
const { appLogger } = require('./logger');
const fs = require('fs');
const path = require('path');
const os = require('os');

const logger = appLogger('audioConverter');

/**
 * Audio Converter - Converts audio files to WhatsApp-compatible OGG/Opus format
 * Uses ffmpeg to ensure proper encoding
 */
class AudioConverter {
  constructor() {
    this.ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
  }

  /**
   * Check if ffmpeg is available
   * @returns {Promise<boolean>}
   */
  async checkFfmpegAvailable() {
    return new Promise((resolve) => {
      const ffmpeg = spawn(this.ffmpegPath, ['-version']);
      
      ffmpeg.on('error', () => {
        resolve(false);
      });
      
      ffmpeg.on('close', (code) => {
        resolve(code === 0);
      });
    });
  }

  /**
   * Convert audio buffer to OGG/Opus format for WhatsApp
   * @param {Buffer} inputBuffer - Input audio buffer
   * @param {string} originalMimetype - Original audio mimetype
   * @returns {Promise<Buffer>} - Converted audio buffer
   */
  async convertToOggOpus(inputBuffer, originalMimetype = '') {
    const available = await this.checkFfmpegAvailable();
    if (!available) {
      logger.warn('ffmpeg not available, sending audio without conversion');
      return inputBuffer;
    }

    // If already OGG with opus codec, skip conversion
    if (originalMimetype === 'audio/ogg; codecs=opus' || originalMimetype === 'audio/ogg') {
      logger.info('Audio already in OGG format, checking codec');
      // We could add codec verification here, but for now trust the mimetype
      return inputBuffer;
    }

    return new Promise((resolve, reject) => {
      const tempDir = os.tmpdir();
      const inputPath = path.join(tempDir, `input_${Date.now()}.${this._getExtension(originalMimetype)}`);
      const outputPath = path.join(tempDir, `output_${Date.now()}.ogg`);

      logger.info('Converting audio to OGG/Opus', { 
        originalMimetype, 
        inputSize: inputBuffer.length 
      });

      // Write input buffer to temp file
      fs.writeFileSync(inputPath, inputBuffer);

      // Convert using ffmpeg
      // -avoid_negative_ts make_zero: fixes timestamp issues
      // -ac 1: mono channel (required by WhatsApp)
      // -codec:a libopus: use Opus codec
      // -b:a 128k: bitrate for decent quality
      const ffmpeg = spawn(this.ffmpegPath, [
        '-i', inputPath,
        '-avoid_negative_ts', 'make_zero',
        '-ac', '1',
        '-codec:a', 'libopus',
        '-b:a', '128k',
        '-f', 'ogg',
        '-y', // Overwrite output file
        outputPath
      ]);

      let stderrData = '';
      
      ffmpeg.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      ffmpeg.on('error', (err) => {
        logger.error('ffmpeg spawn error', { error: err.message });
        this._cleanup([inputPath, outputPath]);
        reject(new Error(`ffmpeg process error: ${err.message}`));
      });

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          logger.error('ffmpeg conversion failed', { 
            code, 
            stderr: stderrData.substring(0, 500) 
          });
          this._cleanup([inputPath, outputPath]);
          reject(new Error(`ffmpeg exited with code ${code}`));
          return;
        }

        try {
          // Read converted file
          const convertedBuffer = fs.readFileSync(outputPath);
          logger.info('Audio converted successfully', { 
            originalSize: inputBuffer.length,
            convertedSize: convertedBuffer.length
          });
          
          // Cleanup temp files
          this._cleanup([inputPath, outputPath]);
          
          resolve(convertedBuffer);
        } catch (err) {
          logger.error('Error reading converted file', { error: err.message });
          this._cleanup([inputPath, outputPath]);
          reject(err);
        }
      });
    });
  }

  /**
   * Get file extension from mimetype
   * @private
   */
  _getExtension(mimetype) {
    const map = {
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/mp4': 'm4a',
      'audio/m4a': 'm4a',
      'audio/x-m4a': 'm4a',
      'audio/wav': 'wav',
      'audio/wave': 'wav',
      'audio/x-wav': 'wav',
      'audio/ogg': 'ogg',
      'audio/webm': 'webm',
      'audio/flac': 'flac',
      'audio/aac': 'aac',
      'audio/3gpp': '3gp',
      'audio/amr': 'amr'
    };
    
    return map[mimetype] || 'audio';
  }

  /**
   * Cleanup temporary files
   * @private
   */
  _cleanup(files) {
    files.forEach(file => {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch (err) {
        logger.warn('Failed to cleanup temp file', { file, error: err.message });
      }
    });
  }

  /**
   * Check if mimetype needs conversion
   * @param {string} mimetype - Audio mimetype
   * @returns {boolean}
   */
  needsConversion(mimetype) {
    // Skip conversion for OGG
    if (mimetype === 'audio/ogg' || mimetype === 'audio/ogg; codecs=opus') {
      return false;
    }
    return true;
  }
}

module.exports = new AudioConverter();

const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const sharp = require('sharp');
const mime = require('mime-types');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class StorageService {
  constructor() {
    this._s3Client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
      },
      forcePathStyle: true, // Required for MinIO
    });
    this.bucketName = process.env.S3_BUCKET_NAME || 'durusuna-uploads';
  }

  // Getter for S3 client (for direct access when needed)
  get s3Client() {
    return this._s3Client;
  }

  set s3Client(client) {
    this._s3Client = client;
  }

  /**
   * Upload a file to S3
   * @param {Buffer} buffer - File buffer
   * @param {string} originalName - Original filename
   * @param {string} mimeType - MIME type
   * @param {string} folder - Folder path (e.g., 'class-updates', 'messages', 'profiles')
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} File info object
   */
  async uploadFile(buffer, originalName, mimeType, folder = 'general', options = {}) {
    try {
      const fileExtension = mime.extension(mimeType) || 'bin';
      const fileName = `${uuidv4()}.${fileExtension}`;
      const key = `${folder}/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${fileName}`;

      let processedBuffer = buffer;
      let metadata = {
        originalName,
        mimeType,
        size: buffer.length,
      };

      // Process images if needed
      if (mimeType.startsWith('image/') && options.processImage !== false) {
        const imageInfo = await this.processImage(buffer, options.imageOptions);
        processedBuffer = imageInfo.buffer;
        metadata = { ...metadata, ...imageInfo.metadata };
      }

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: processedBuffer,
        ContentType: mimeType,
        Metadata: {
          'original-name': originalName,
          'upload-folder': folder,
          ...options.customMetadata,
        },
      });

      await this._s3Client.send(command);

      // Generate URL through backend API (eliminates storage endpoint exposure)
      const backendUrl = process.env.BACKEND_PUBLIC_URL || 'http://localhost:3001';
      const pathParts = key.split('/');
      const url = `${backendUrl}/api/uploads/serve/${pathParts.join('/')}`;

      return {
        key,
        url,
        fileName,
        originalName,
        mimeType,
        size: processedBuffer.length,
        folder,
        metadata,
      };
    } catch (error) {
      logger.error('Error uploading file to S3:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Process image (resize, optimize)
   * @param {Buffer} buffer - Image buffer
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processed image info
   */
  async processImage(buffer, options = {}) {
    try {
      const {
        maxWidth = 1920,
        maxHeight = 1080,
        quality = 85,
        format = 'jpeg',
        createThumbnail = true,
        thumbnailSize = 300,
      } = options;

      let sharpInstance = sharp(buffer);
      const originalMetadata = await sharpInstance.metadata();

      // Resize if needed
      if (originalMetadata.width > maxWidth || originalMetadata.height > maxHeight) {
        sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Convert and compress
      const processedBuffer = await sharpInstance
        .jpeg({ quality })
        .toBuffer();

      // Create thumbnail if requested
      let thumbnailBuffer = null;
      if (createThumbnail) {
        thumbnailBuffer = await sharp(buffer)
          .resize(thumbnailSize, thumbnailSize, {
            fit: 'cover',
            position: 'center',
          })
          .jpeg({ quality: 80 })
          .toBuffer();
      }

      return {
        buffer: processedBuffer,
        thumbnailBuffer,
        metadata: {
          originalWidth: originalMetadata.width,
          originalHeight: originalMetadata.height,
          processedWidth: originalMetadata.width > maxWidth ? maxWidth : originalMetadata.width,
          processedHeight: originalMetadata.height > maxHeight ? maxHeight : originalMetadata.height,
          format,
          hasAlpha: originalMetadata.hasAlpha,
        },
      };
    } catch (error) {
      logger.error('Error processing image:', error);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Upload multiple files
   * @param {Array} files - Array of file objects with {buffer, originalName, mimeType}
   * @param {string} folder - Folder path
   * @param {Object} options - Upload options
   * @returns {Promise<Array>} Array of file info objects
   */
  async uploadMultipleFiles(files, folder = 'general', options = {}) {
    try {
      const uploadPromises = files.map(file => 
        this.uploadFile(file.buffer, file.originalName, file.mimeType, folder, options)
      );
      
      return await Promise.all(uploadPromises);
    } catch (error) {
      logger.error('Error uploading multiple files:', error);
      throw new Error(`Batch upload failed: ${error.message}`);
    }
  }

  /**
   * Delete a file from S3
   * @param {string} key - S3 object key
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(key) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this._s3Client.send(command);
      return true;
    } catch (error) {
      logger.error('Error deleting file from S3:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Generate a presigned URL for direct upload
   * @param {string} key - S3 object key
   * @param {string} contentType - MIME type
   * @param {number} expiresIn - URL expiration in seconds (default: 1 hour)
   * @returns {Promise<string>} Presigned URL
   */
  async generatePresignedUploadUrl(key, contentType, expiresIn = 3600) {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });

      return await getSignedUrl(this._s3Client, command, { expiresIn });
    } catch (error) {
      logger.error('Error generating presigned URL:', error);
      throw new Error(`Presigned URL generation failed: ${error.message}`);
    }
  }

  /**
   * Generate a presigned URL for file download
   * @param {string} key - S3 object key
   * @param {number} expiresIn - URL expiration in seconds (default: 1 hour)
   * @returns {Promise<string>} Presigned URL
   */
  async generatePresignedDownloadUrl(key, expiresIn = 3600) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getSignedUrl(this._s3Client, command, { expiresIn });
    } catch (error) {
      logger.error('Error generating presigned download URL:', error);
      throw new Error(`Presigned download URL generation failed: ${error.message}`);
    }
  }

  /**
   * Get file metadata
   * @param {Object} file - File info
   * @returns {Object} Enhanced metadata
   */
  getFileMetadata(file) {
    const isImage = file.mimeType.startsWith('image/');
    const isVideo = file.mimeType.startsWith('video/');
    const isAudio = file.mimeType.startsWith('audio/');
    const isDocument = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ].includes(file.mimeType);

    // Ensure size is a valid number
    const fileSize = typeof file.size === 'number' ? file.size : parseInt(file.size) || 0;

    return {
      ...file,
      size: fileSize, // Ensure size is always a number
      fileType: isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : isDocument ? 'document' : 'other',
      isImage,
      isVideo,
      isAudio,
      isDocument,
      sizeFormatted: this.formatFileSize(fileSize),
    };
  }

  /**
   * Format file size in human readable format
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate file type and size
   * @param {string} mimeType - MIME type
   * @param {number} size - File size in bytes
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  validateFile(mimeType, size, options = {}) {
    const {
      allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/quicktime', 'video/x-msvideo',
        'audio/mpeg', 'audio/wav', 'audio/mp4',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
      ],
      maxSize = 5 * 1024 * 1024, // 5MB default
      maxImageSize = 5 * 1024 * 1024, // 5MB for images
      maxVideoSize = 10 * 1024 * 1024, // 50MB for videos
    } = options;

    const errors = [];

    // Check file type
    if (!allowedTypes.includes(mimeType)) {
      errors.push(`File type ${mimeType} is not allowed`);
    }

    // Check file size based on type
    let sizeLimit = maxSize;
    if (mimeType.startsWith('image/')) {
      sizeLimit = maxImageSize;
    } else if (mimeType.startsWith('video/')) {
      sizeLimit = maxVideoSize;
    }

    if (size > sizeLimit) {
      errors.push(`File size ${this.formatFileSize(size)} exceeds limit of ${this.formatFileSize(sizeLimit)}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Create singleton instance
const storageService = new StorageService();

module.exports = storageService; 
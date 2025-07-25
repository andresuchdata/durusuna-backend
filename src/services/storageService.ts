import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import mime from 'mime-types';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

interface FileUploadOptions {
  processImage?: boolean;
  imageOptions?: ImageProcessingOptions;
  customMetadata?: Record<string, string>;
}

interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: string;
  createThumbnail?: boolean;
  thumbnailSize?: number;
}

interface ProcessedImageInfo {
  buffer: Buffer;
  thumbnailBuffer: Buffer | null;
  metadata: {
    originalWidth: number;
    originalHeight: number;
    processedWidth: number;
    processedHeight: number;
    format: string;
    hasAlpha?: boolean;
  };
}

interface FileInfo {
  key: string;
  url: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  folder: string;
  metadata: Record<string, any>;
}

interface EnhancedFileInfo extends FileInfo {
  fileType: 'image' | 'video' | 'audio' | 'document' | 'other';
  isImage: boolean;
  isVideo: boolean;
  isAudio: boolean;
  isDocument: boolean;
  sizeFormatted: string;
}

interface FileValidationOptions {
  allowedTypes?: string[];
  maxSize?: number;
  maxImageSize?: number;
  maxVideoSize?: number;
}

interface FileValidationResult {
  isValid: boolean;
  errors: string[];
}

interface UploadFile {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}

class StorageService {
  private _s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this._s3Client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
      forcePathStyle: true, // Required for MinIO
    });
    this.bucketName = process.env.S3_BUCKET_NAME || 'durusuna-uploads';
  }

  // Getter for S3 client (for direct access when needed)
  get s3Client(): S3Client {
    return this._s3Client;
  }

  set s3Client(client: S3Client) {
    this._s3Client = client;
  }

  /**
   * Upload a file to S3
   */
  async uploadFile(
    buffer: Buffer, 
    originalName: string, 
    mimeType: string, 
    folder: string = 'general', 
    options: FileUploadOptions = {}
  ): Promise<FileInfo> {
    try {
      const fileExtension = mime.extension(mimeType) || 'bin';
      const fileName = `${uuidv4()}.${fileExtension}`;
      const key = `${folder}/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${fileName}`;

      let processedBuffer = buffer;
      let metadata: Record<string, any> = {
        originalName,
        mimeType,
        size: buffer.length,
      };

      // Process images if needed (but not videos)
      if (mimeType.startsWith('image/') && options.processImage !== false) {
        try {
          const imageInfo = await this.processImage(buffer, options.imageOptions);
          processedBuffer = imageInfo.buffer;
          metadata = { ...metadata, ...imageInfo.metadata };
        } catch (imageError) {
          logger.warn('Image processing failed, uploading original:', (imageError as Error).message);
          // Continue with original buffer if image processing fails
        }
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
      throw new Error(`Upload failed: ${(error as Error).message}`);
    }
  }

  /**
   * Process image (resize, optimize)
   */
  async processImage(buffer: Buffer, options: ImageProcessingOptions = {}): Promise<ProcessedImageInfo> {
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
      if ((originalMetadata.width && originalMetadata.width > maxWidth) || 
          (originalMetadata.height && originalMetadata.height > maxHeight)) {
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
      let thumbnailBuffer: Buffer | null = null;
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
          originalWidth: originalMetadata.width || 0,
          originalHeight: originalMetadata.height || 0,
          processedWidth: (originalMetadata.width && originalMetadata.width > maxWidth) ? maxWidth : (originalMetadata.width || 0),
          processedHeight: (originalMetadata.height && originalMetadata.height > maxHeight) ? maxHeight : (originalMetadata.height || 0),
          format,
          hasAlpha: originalMetadata.hasAlpha,
        },
      };
    } catch (error) {
      logger.error('Error processing image:', error);
      throw new Error(`Image processing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: UploadFile[], 
    folder: string = 'general', 
    options: FileUploadOptions = {}
  ): Promise<FileInfo[]> {
    try {
      const uploadPromises = files.map(file => 
        this.uploadFile(file.buffer, file.originalName, file.mimeType, folder, options)
      );
      
      return await Promise.all(uploadPromises);
    } catch (error) {
      logger.error('Error uploading multiple files:', error);
      throw new Error(`Batch upload failed: ${(error as Error).message}`);
    }
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this._s3Client.send(command);
      return true;
    } catch (error) {
      logger.error('Error deleting file from S3:', error);
      throw new Error(`Delete failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generate a presigned URL for direct upload
   */
  async generatePresignedUploadUrl(key: string, contentType: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });

      return await getSignedUrl(this._s3Client, command, { expiresIn });
    } catch (error) {
      logger.error('Error generating presigned URL:', error);
      throw new Error(`Presigned URL generation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generate a presigned URL for file download
   */
  async generatePresignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getSignedUrl(this._s3Client, command, { expiresIn });
    } catch (error) {
      logger.error('Error generating presigned download URL:', error);
      throw new Error(`Presigned download URL generation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get file metadata
   */
  getFileMetadata(file: FileInfo): EnhancedFileInfo {
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
    const fileSize = typeof file.size === 'number' ? file.size : parseInt(String(file.size)) || 0;

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
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate file type and size
   */
  validateFile(mimeType: string, size: number, options: FileValidationOptions = {}): FileValidationResult {
    const {
      allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/avi', 'video/webm',
        'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
      ],
      maxSize = 5 * 1024 * 1024, // 5MB default
      maxImageSize = 5 * 1024 * 1024, // 5MB for images
      maxVideoSize = 100 * 1024 * 1024, // 100MB for videos (matches multer limit)
    } = options;

    const errors: string[] = [];

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

export default storageService;
export { 
  StorageService, 
  type FileInfo, 
  type EnhancedFileInfo, 
  type FileUploadOptions, 
  type ImageProcessingOptions,
  type FileValidationOptions,
  type FileValidationResult,
  type UploadFile
}; 
import express, { Request, Response } from 'express';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { authenticate } from '../middleware/auth';
import logger from '../shared/utils/logger';
import storageService from '../services/storageService';
import { AuthenticatedRequest } from '../types/auth';
import { uploadMiddleware } from '../shared/middleware/upload';
import {
  UploadFileRequest,
  UploadFileResponse,
  UploadMultipleFilesRequest,
  UploadMultipleFilesResponse,
  EnhancedFileInfo,
  FileValidationError,
  PresignedUploadRequest,
  PresignedUploadResponse,
  PresignedDownloadRequest,
  PresignedDownloadResponse,
  DeleteFileResponse,
  FileUploadOptions,
  FileToUpload,
  ServeFileParams,
  LegacyServeParams,
  UploadError
} from '../types/upload';

const router = express.Router();

/**
 * @route POST /api/uploads/file
 * @desc Upload single file
 * @access Private
 */
router.post('/file', authenticate, uploadMiddleware.general.single('file'), async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' } as UploadError);
    }

    const { folder = 'general', processImage = true }: UploadFileRequest = req.body;

    // Validate file
    const validation = storageService.validateFile(req.file.mimetype, req.file.size);
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'Invalid file',
        details: validation.errors 
      } as UploadError);
    }

    // Prepare upload options
    const uploadOptions: FileUploadOptions = {
      processImage: processImage === true || processImage === 'true',
      imageOptions: {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 85,
        createThumbnail: true,
      },
      customMetadata: {
        'uploaded-by': authenticatedReq.user.id,
        'upload-context': folder as string,
      },
    };

    // Upload to S3
    const fileInfo = await storageService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      folder as string,
      uploadOptions
    );

    // Get enhanced metadata
    const enhancedFileInfo: EnhancedFileInfo = storageService.getFileMetadata(fileInfo);

    const response: UploadFileResponse = {
      success: true,
      file: enhancedFileInfo,
    };

    res.json(response);
  } catch (error) {
    logger.error('Error uploading file:', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      fileName: req.file?.originalname,
      fileSize: req.file?.size,
      mimeType: req.file?.mimetype,
      folder: req.body?.folder
    });
    
    const errorResponse: UploadError = {
      error: 'Failed to upload file',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Upload failed'
    };
    
    res.status(500).json(errorResponse);
  }
});

/**
 * @route POST /api/uploads/files
 * @desc Upload multiple files
 * @access Private
 */
router.post('/files', authenticate, uploadMiddleware.general.array('files', 10), async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' } as UploadError);
    }

    const { folder = 'general', processImage = true }: UploadMultipleFilesRequest = req.body;

    // Validate all files first
    const validationErrors: FileValidationError[] = [];
    req.files.forEach((file: Express.Multer.File, index: number) => {
      const validation = storageService.validateFile(file.mimetype, file.size);
      if (!validation.isValid) {
        validationErrors.push({
          file: file.originalname,
          index,
          errors: validation.errors,
        });
      }
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Some files are invalid',
        details: validationErrors,
      } as UploadError);
    }

    // Prepare files for batch upload
    const filesToUpload: FileToUpload[] = req.files.map((file: Express.Multer.File) => ({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
    }));

    // Prepare upload options
    const uploadOptions: FileUploadOptions = {
      processImage: processImage === true || processImage === 'true',
      imageOptions: {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 85,
        createThumbnail: true,
      },
      customMetadata: {
        'uploaded-by': authenticatedReq.user.id,
        'upload-context': folder as string,
      },
    };

    // Upload all files
    const uploadedFiles = await storageService.uploadMultipleFiles(
      filesToUpload,
      folder as string,
      uploadOptions
    );

    // Get enhanced metadata for all files
    const enhancedFiles: EnhancedFileInfo[] = uploadedFiles.map(file => 
      storageService.getFileMetadata(file)
    );

    const response: UploadMultipleFilesResponse = {
      success: true,
      files: enhancedFiles,
      count: enhancedFiles.length,
    };

    res.json(response);
  } catch (error) {
    logger.error('Error uploading files:', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      fileCount: req.files?.length,
      files: Array.isArray(req.files) ? req.files.map(f => ({ name: f.originalname, size: f.size, type: f.mimetype })) : [],
      folder: req.body?.folder
    });
    
    const errorResponse: UploadError = {
      error: 'Failed to upload files',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Upload failed'
    };
    
    res.status(500).json(errorResponse);
  }
});

/**
 * @route POST /api/uploads/presigned-upload
 * @desc Generate presigned upload URL for direct client uploads
 * @access Private
 */
router.post('/presigned-upload', authenticate, async (req: Request, res: Response) => {
  try {
    const { filename, contentType, folder = 'general' }: PresignedUploadRequest = req.body;

    if (!filename || !contentType) {
      return res.status(400).json({ 
        error: 'Filename and contentType are required' 
      } as UploadError);
    }

    // Validate file type
    const validation = storageService.validateFile(contentType, 0); // Size will be validated on upload
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'Invalid file type',
        details: validation.errors 
      } as UploadError);
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now();
    const key = `${folder}/${year}/${month}/${timestamp}-${filename}`;
    
    const presignedUrl = await storageService.generatePresignedUploadUrl(key, contentType);

    const response: PresignedUploadResponse = {
      success: true,
      presignedUrl,
      key,
      expiresIn: 3600, // 1 hour
    };

    res.json(response);
  } catch (error) {
    logger.error('Error generating presigned upload URL:', error);
    
    const errorResponse: UploadError = {
      error: 'Failed to generate presigned URL',
      message: (error as Error).message 
    };
    
    res.status(500).json(errorResponse);
  }
});

/**
 * @route POST /api/uploads/avatar
 * @desc Upload avatar with thumbnail generation
 * @access Private
 */
router.post('/avatar', authenticate, uploadMiddleware.general.single('avatar'), async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No avatar file uploaded' } as UploadError);
    }

    // Validate file is an image
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ 
        error: 'Avatar must be an image file' 
      } as UploadError);
    }

    // Validate file size (max 5MB for avatars)
    const validation = storageService.validateFile(req.file.mimetype, req.file.size, {
      maxImageSize: 5 * 1024 * 1024, // 5MB
    });
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'Invalid avatar file',
        details: validation.errors 
      } as UploadError);
    }

    // Avatar-specific upload options - always process and create thumbnails
    const uploadOptions: FileUploadOptions = {
      processImage: true,
      imageOptions: {
        maxWidth: 800,  // Smaller for avatars
        maxHeight: 800,
        quality: 90,    // Higher quality for avatars
        createThumbnail: true,
        thumbnailSize: 150, // Standard avatar thumbnail size
      },
      customMetadata: {
        'uploaded-by': authenticatedReq.user.id,
        'upload-context': 'avatar',
        'user-id': authenticatedReq.user.id,
      },
    };

    // Upload to avatars folder
    const fileInfo = await storageService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'avatars',
      uploadOptions
    );

    // Get enhanced metadata
    const enhancedFileInfo: EnhancedFileInfo = storageService.getFileMetadata(fileInfo);

    const response: UploadFileResponse = {
      success: true,
      file: enhancedFileInfo,
    };

    res.json(response);
  } catch (error) {
    logger.error('Error uploading avatar:', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      fileName: req.file?.originalname,
      fileSize: req.file?.size,
      mimeType: req.file?.mimetype,
      userId: authenticatedReq.user?.id
    });
    
    const errorResponse: UploadError = {
      error: 'Failed to upload avatar',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Avatar upload failed'
    };
    
    res.status(500).json(errorResponse);
  }
});

/**
 * @route POST /api/uploads/presigned-download
 * @desc Generate presigned download URL
 * @access Private
 */
router.post('/presigned-download', authenticate, async (req: Request, res: Response) => {
  try {
    const { key }: PresignedDownloadRequest = req.body;

    if (!key) {
      return res.status(400).json({ error: 'File key is required' } as UploadError);
    }

    const presignedUrl = await storageService.generatePresignedDownloadUrl(key);

    const response: PresignedDownloadResponse = {
      success: true,
      presignedUrl,
      expiresIn: 3600, // 1 hour
    };

    res.json(response);
  } catch (error) {
    logger.error('Error generating presigned download URL:', error);
    
    const errorResponse: UploadError = {
      error: 'Failed to generate presigned download URL',
      message: (error as Error).message 
    };
    
    res.status(500).json(errorResponse);
  }
});

/**
 * @route DELETE /api/uploads/file/:key(*)
 * @desc Delete file
 * @access Private
 */
router.delete('/file/:key(*)', authenticate, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    if (!key) {
      return res.status(400).json({ error: 'File key is required' } as UploadError);
    }

    await storageService.deleteFile(key);

    const response: DeleteFileResponse = {
      success: true,
      message: 'File deleted successfully',
    };

    res.json(response);
  } catch (error) {
    logger.error('Error deleting file:', error);
    
    const errorResponse: UploadError = {
      error: 'Failed to delete file',
      message: (error as Error).message 
    };
    
    res.status(500).json(errorResponse);
  }
});

/**
 * @route GET /api/uploads/serve/:filename
 * @desc Legacy endpoint - serve files (for backward compatibility)
 * @access Public
 */
router.get('/serve/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const { folder = 'general' } = req.query as LegacyServeParams;
    
    // Construct the S3 key (this is a simplified approach)
    // In a real application, you'd store the full key in your database
    const key = `${folder}/${filename}`;
    
    // Generate presigned URL and redirect
    const presignedUrl = await storageService.generatePresignedDownloadUrl(key, 300); // 5 minutes
    res.redirect(presignedUrl);
  } catch (error) {
    logger.error('Error serving file:', error);
    res.status(404).json({ error: 'File not found' });
  }
});

/**
 * @route GET /api/uploads/serve/:folder/:year/:month/:filename
 * @desc Serve files through backend API (eliminates need for direct S3 access)
 * @access Public
 */
router.get('/serve/:folder/:year/:month/:filename', async (req: Request, res: Response) => {
  try {
    const { folder, year, month, filename }: ServeFileParams = req.params as ServeFileParams;
    const key = `${folder}/${year}/${month}/${filename}`;

    // Get file stream directly from S3
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME || 'durusuna-uploads',
      Key: key,
    });

    const s3Client = storageService.s3Client;
    const s3Response = await s3Client.send(command);

    // Ensure we have the required properties
    if (!s3Response.Body) {
      throw new Error('No file body received from S3');
    }

    // Set appropriate headers
    res.set({
      'Content-Type': s3Response.ContentType || 'application/octet-stream',
      'Content-Length': s3Response.ContentLength?.toString() || '0',
      'Cache-Control': 'public, max-age=86400', // 24 hours cache
      'ETag': s3Response.ETag || '',
      'Last-Modified': s3Response.LastModified?.toISOString() || new Date().toISOString(),
    });

    // Stream the file data
    if (typeof s3Response.Body.pipe === 'function') {
      (s3Response.Body as any).pipe(res);
    } else {
      // For newer AWS SDK versions, Body might be a different type
      res.end(s3Response.Body);
    }
  } catch (error) {
    logger.error('Error serving file:', error);
    if ((error as any).name === 'NoSuchKey') {
      return res.status(404).json({ error: 'File not found' });
    }
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

/**
 * @route GET /api/uploads/debug-sevalla
 * @desc Debug Sevalla storage configuration
 * @access Private
 */
router.get('/debug-sevalla', authenticate, async (req: Request, res: Response) => {
  try {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      
      // Environment variables check (without exposing secrets)
      config: {
        hasS3Endpoint: !!process.env.S3_ENDPOINT,
        s3EndpointFormat: process.env.S3_ENDPOINT ? 
          (process.env.S3_ENDPOINT.includes('cloudflarestorage.com') ? 'Cloudflare R2' : 'Other S3') : 
          'Not configured',
        hasS3AccessKey: !!process.env.S3_ACCESS_KEY,
        hasS3SecretKey: !!process.env.S3_SECRET_KEY,
        hasS3BucketName: !!process.env.S3_BUCKET_NAME,
        s3Region: process.env.S3_REGION || 'Not set',
        s3BucketName: process.env.S3_BUCKET_NAME || 'Not set',
      },
      
      // Storage service test
      storageService: {
        available: true,
        isSevallaStorage: storageService.isSevallaStorage(),
      }
    };

    // Test basic storage service functionality
    try {
      const testValidation = storageService.validateFile('image/jpeg', 1024 * 1024); // 1MB
      debugInfo.storageService = {
        ...debugInfo.storageService,
        validation: testValidation.isValid ? 'Working' : 'Failed',
        validationErrors: testValidation.errors
      };
    } catch (validationError) {
      debugInfo.storageService = {
        ...debugInfo.storageService,
        validation: 'Error',
        validationError: (validationError as Error).message
      };
    }

    // Test S3 client initialization
    try {
      const s3Client = storageService.s3Client;
      debugInfo.storageService = {
        ...debugInfo.storageService,
        s3ClientInitialized: !!s3Client
      };
    } catch (s3Error) {
      debugInfo.storageService = {
        ...debugInfo.storageService,
        s3ClientInitialized: false,
        s3Error: (s3Error as Error).message
      };
    }

    res.json(debugInfo);
  } catch (error) {
    logger.error('Error in debug endpoint:', error);
    res.status(500).json({
      error: 'Debug endpoint failed',
      message: (error as Error).message
    });
  }
});

export default router; 
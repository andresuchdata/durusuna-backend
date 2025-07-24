const express = require('express');
const multer = require('multer');
const { authenticate: auth } = require('../middleware/auth');
const logger = require('../utils/logger');
const storageService = require('../services/storageService');

const router = express.Router();

// Configure multer for memory storage (we'll handle S3 upload manually)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

// Upload single file
router.post('/file', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { folder = 'general', processImage = true } = req.body;

    // Validate file
    const validation = storageService.validateFile(req.file.mimetype, req.file.size);
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'Invalid file',
        details: validation.errors 
      });
    }

    // Upload to S3
    const fileInfo = await storageService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      folder,
      {
        processImage: processImage === 'true',
        imageOptions: {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 85,
          createThumbnail: true,
        },
        customMetadata: {
          'uploaded-by': req.user.id,
          'upload-context': folder,
        },
      }
    );

    // Get enhanced metadata
    const enhancedFileInfo = storageService.getFileMetadata(fileInfo);

    res.json({
      success: true,
      file: enhancedFileInfo,
    });
  } catch (error) {
    logger.error('Error uploading file:', error);
    res.status(500).json({ 
      error: 'Failed to upload file',
      message: error.message 
    });
  }
});

// Upload multiple files
router.post('/files', auth, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { folder = 'general', processImage = true } = req.body;

    // Validate all files first
    const validationErrors = [];
    req.files.forEach((file, index) => {
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
      });
    }

    // Prepare files for batch upload
    const filesToUpload = req.files.map(file => ({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
    }));

    // Upload all files
    const uploadedFiles = await storageService.uploadMultipleFiles(
      filesToUpload,
      folder,
      {
        processImage: processImage === 'true',
        imageOptions: {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 85,
          createThumbnail: true,
        },
        customMetadata: {
          'uploaded-by': req.user.id,
          'upload-context': folder,
        },
      }
    );

    // Get enhanced metadata for all files
    const enhancedFiles = uploadedFiles.map(file => 
      storageService.getFileMetadata(file)
    );

    res.json({
      success: true,
      files: enhancedFiles,
      count: enhancedFiles.length,
    });
  } catch (error) {
    logger.error('Error uploading files:', error);
    res.status(500).json({ 
      error: 'Failed to upload files',
      message: error.message 
    });
  }
});

// Generate presigned upload URL for direct client uploads
router.post('/presigned-upload', auth, async (req, res) => {
  try {
    const { filename, contentType, folder = 'general' } = req.body;

    if (!filename || !contentType) {
      return res.status(400).json({ 
        error: 'Filename and contentType are required' 
      });
    }

    // Validate file type
    const validation = storageService.validateFile(contentType, 0); // Size will be validated on upload
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'Invalid file type',
        details: validation.errors 
      });
    }

    const key = `${folder}/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${Date.now()}-${filename}`;
    const presignedUrl = await storageService.generatePresignedUploadUrl(key, contentType);

    res.json({
      success: true,
      presignedUrl,
      key,
      expiresIn: 3600, // 1 hour
    });
  } catch (error) {
    logger.error('Error generating presigned upload URL:', error);
    res.status(500).json({ 
      error: 'Failed to generate presigned URL',
      message: error.message 
    });
  }
});

// Generate presigned download URL
router.post('/presigned-download', auth, async (req, res) => {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({ error: 'File key is required' });
    }

    const presignedUrl = await storageService.generatePresignedDownloadUrl(key);

    res.json({
      success: true,
      presignedUrl,
      expiresIn: 3600, // 1 hour
    });
  } catch (error) {
    logger.error('Error generating presigned download URL:', error);
    res.status(500).json({ 
      error: 'Failed to generate presigned download URL',
      message: error.message 
    });
  }
});

// Delete file
router.delete('/file/:key(*)', auth, async (req, res) => {
  try {
    const { key } = req.params;

    if (!key) {
      return res.status(400).json({ error: 'File key is required' });
    }

    await storageService.deleteFile(key);

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting file:', error);
    res.status(500).json({ 
      error: 'Failed to delete file',
      message: error.message 
    });
  }
});

// Legacy endpoint - serve files (for backward compatibility)
// This will generate a presigned URL and redirect
router.get('/serve/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { folder = 'general' } = req.query;
    
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

// Serve files through backend API (eliminates need for direct S3 access)
router.get('/serve/:folder/:year/:month/:filename', async (req, res) => {
  try {
    const { folder, year, month, filename } = req.params;
    const key = `${folder}/${year}/${month}/${filename}`;

    // Get file stream directly from S3
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME || 'durusuna-uploads',
      Key: key,
    });

    const s3Client = storageService.s3Client;
    const s3Response = await s3Client.send(command);

    // Set appropriate headers
    res.set({
      'Content-Type': s3Response.ContentType || 'application/octet-stream',
      'Content-Length': s3Response.ContentLength,
      'Cache-Control': 'public, max-age=86400', // 24 hours cache
      'ETag': s3Response.ETag,
      'Last-Modified': s3Response.LastModified,
    });

    // Stream the file data
    s3Response.Body.pipe(res);
  } catch (error) {
    logger.error('Error serving file:', error);
    if (error.name === 'NoSuchKey') {
      return res.status(404).json({ error: 'File not found' });
    }
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

module.exports = router; 
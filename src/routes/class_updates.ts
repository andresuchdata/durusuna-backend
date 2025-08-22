import express, { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import db from '../config/database';
import { authenticate } from '../middleware/auth';
import { validate, classUpdateSchema, commentSchema } from '../utils/validation';
import logger from '../shared/utils/logger';
import { safeJsonParse, migrateReactions, safeJsonStringify, ReactionData } from '../utils/json';
import storageService from '../services/storageService';
import { AuthenticatedRequest } from '../types/auth';
import { ClassUpdatesService } from '../services/classUpdatesService';
import { ClassUpdatesRepository } from '../repositories/classUpdatesRepository';
import { NotificationOutboxRepository } from '../repositories/notificationOutboxRepository';
import { NotificationDeliveryRepository } from '../repositories/notificationDeliveryRepository';
import { NotificationDispatcher } from '../services/notification/NotificationDispatcher';
import { SocketChannelProvider } from '../services/notification/channels/SocketChannelProvider';
import { EmailChannelProvider } from '../services/notification/channels/EmailChannelProvider';
import { FirebaseChannelProvider } from '../services/notification/channels/FirebaseChannelProvider';
import { ClassUpdateNotificationService } from '../services/classUpdateNotificationService';
import {
  ClassUpdate,
  ClassUpdateWithAuthor,
  ClassUpdateAttachment,
  ClassUpdateComment,
  ClassUpdateCommentWithAuthor,
  CreateClassUpdateRequest,
  UpdateClassUpdateRequest,
  CreateCommentRequest,
  ClassUpdateQueryParams,
  ClassUpdatesResponse,
  ClassUpdateResponse,
  UploadAttachmentsRequest,
  UploadAttachmentsResponse,
  AddReactionRequest,
  ReactionResponse
} from '../types/classUpdate';

const router = express.Router();

// Initialize service layer
const classUpdatesRepository = new ClassUpdatesRepository(db);
const classUpdatesService = new ClassUpdatesService(classUpdatesRepository);

// Initialize notification system (lazy loaded to avoid circular dependencies)
let classUpdateNotificationService: ClassUpdateNotificationService | null = null;

function getNotificationService() {
  if (!classUpdateNotificationService) {
    const outboxRepo = new NotificationOutboxRepository(db);
    const deliveryRepo = new NotificationDeliveryRepository(db);
    const providers = [
      new SocketChannelProvider(),
      new EmailChannelProvider(db),
      new FirebaseChannelProvider(db)
    ];
    const notificationDispatcher = new NotificationDispatcher(outboxRepo, deliveryRepo, providers);
    classUpdateNotificationService = new ClassUpdateNotificationService(db, notificationDispatcher);
  }
  return classUpdateNotificationService;
}

// Configure multer for memory storage for class update attachments
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for class updates
  },
});

// JSON utilities now imported from utils/json.ts

interface UserAccess {
  user_type: 'student' | 'teacher' | 'parent' | 'admin';
  role: 'user' | 'admin';
  school_id: string;
  role_in_class?: string;
}

/**
 * @route POST /api/class-updates/upload-attachments
 * @desc Upload attachments for class updates
 * @access Private (Teachers only)
 */
router.post('/upload-attachments', authenticate, upload.array('attachments', 5), async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { class_id }: UploadAttachmentsRequest = req.body;

    if (!class_id) {
      return res.status(400).json({ error: 'Class ID is required' });
    }

    // Verify user has permission to upload to this class using service
    await classUpdatesService.validateUploadPermissions(authReq.user, class_id);

    // Validate all files first
    const validationErrors: Array<{ file: string; index: number; errors: string[] }> = [];
    req.files.forEach((file: Express.Multer.File, index: number) => {
      const validation = storageService.validateFile(file.mimetype, file.size, {
        maxSize: 5 * 1024 * 1024, // 5MB for class updates
        maxImageSize: 5 * 1024 * 1024, // 5MB for images
        maxVideoSize: 50 * 1024 * 1024, // 50MB for videos
      });
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
    const filesToUpload = req.files.map((file: Express.Multer.File) => ({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
    }));

    // Upload all files to class-updates folder
    const uploadedFiles = await storageService.uploadMultipleFiles(
      filesToUpload,
      'class-updates',
      {
        processImage: true,
        imageOptions: {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 85,
          createThumbnail: true,
        },
        customMetadata: {
          'uploaded-by': authReq.user.id,
          'class-id': class_id,
          'upload-context': 'class-update-attachment',
        },
      }
    );

    // Format attachments for class updates
    const formattedAttachments: ClassUpdateAttachment[] = uploadedFiles.map(file => {
      const metadata = storageService.getFileMetadata(file);
      
      return {
        id: uuidv4(),
        fileName: file.fileName,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        url: file.url,
        key: file.key,
        fileType: metadata.fileType,
        isImage: metadata.isImage,
        isVideo: metadata.isVideo,
        isAudio: metadata.isAudio,
        isDocument: metadata.isDocument,
        sizeFormatted: metadata.sizeFormatted,
        uploadedBy: authReq.user.id,
        uploadedAt: new Date().toISOString(),
        metadata: file.metadata,
      };
    });

    const response: UploadAttachmentsResponse = {
      success: true,
      attachments: formattedAttachments,
      count: formattedAttachments.length,
    };

    res.json(response);
  } catch (error) {
    logger.error('Error uploading class update attachments:', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      fileCount: req.files?.length,
      classId: req.body?.class_id,
      userId: authReq.user?.id,
      // Environment debug info (be careful not to log secrets)
      environment: {
        hasS3Endpoint: !!process.env.S3_ENDPOINT,
        hasS3AccessKey: !!process.env.S3_ACCESS_KEY,
        hasS3SecretKey: !!process.env.S3_SECRET_KEY,
        hasS3BucketName: !!process.env.S3_BUCKET_NAME,
        s3Region: process.env.S3_REGION,
        nodeEnv: process.env.NODE_ENV
      }
    });
    
    res.status(500).json({ 
      error: 'Failed to upload attachments',
      message: (error as Error).message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route DELETE /api/class-updates/attachments/:key(*)
 * @desc Delete a class update attachment
 * @access Private (Author or Teacher)
 */
router.delete('/attachments/:key(*)', authenticate, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { key } = req.params;

    if (!key) {
      return res.status(400).json({ error: 'Attachment key is required' });
    }

    // Validate delete permissions using service
    await classUpdatesService.validateDeleteAttachmentPermissions(authReq.user);

    await storageService.deleteFile(key);

    res.json({
      success: true,
      message: 'Attachment deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting class update attachment:', error);
    res.status(500).json({ 
      error: 'Failed to delete attachment',
      message: (error as Error).message 
    });
  }
});



/**
 * @swagger
 * /api/class-updates/{updateId}/comments:
 *   get:
 *     summary: Get comments for a specific class update
 *     description: Retrieve paginated comments for a class update
 *     tags: [Class Updates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: updateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The class update ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of comments per page
 *     responses:
 *       200:
 *         description: Comments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ClassUpdateComment'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       404:
 *         description: Class update not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:updateId/comments', authenticate, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { updateId } = req.params;
    const { page = '1', limit = '20' } = req.query;

    if (!updateId) {
      return res.status(400).json({ error: 'Update ID is required' });
    }

    // Use service to get comments with pagination
    const result = await classUpdatesService.getClassUpdateComments(
      updateId,
      authReq.user,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json(result);

  } catch (error) {
    logger.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});



/**
 * @swagger
 * /api/class-updates/{updateId}/reactions:
 *   post:
 *     summary: Add or toggle a reaction to a class update
 *     description: Add or remove an emoji reaction to a class update
 *     tags: [Class Updates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: updateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The class update ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emoji
 *             properties:
 *               emoji:
 *                 type: string
 *                 description: The emoji to react with
 *                 example: "👍"
 *     responses:
 *       200:
 *         description: Reaction toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 reactions:
 *                   type: object
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       count:
 *                         type: integer
 *                         description: Number of reactions
 *                       users:
 *                         type: array
 *                         items:
 *                           type: string
 *                           format: uuid
 *                         description: Users who reacted
 *       400:
 *         description: Invalid emoji
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Class update not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:updateId/reactions', authenticate, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { updateId } = req.params;
    const { emoji }: AddReactionRequest = req.body;

    if (!updateId) {
      return res.status(400).json({ error: 'Update ID is required' });
    }

    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    // Use service to toggle reaction
    const result = await classUpdatesService.toggleUpdateReaction(updateId, authReq.user, emoji);
    
    res.json(result);

  } catch (error) {
    logger.error('Error toggling reaction:', error);
    res.status(500).json({ error: 'Failed to toggle reaction' });
  }
});

/**
 * @swagger
 * /api/class-updates/{updateId}:
 *   get:
 *     summary: Get a specific class update
 *     description: Retrieve a specific class update with author information
 *     tags: [Class Updates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: updateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The class update ID
 *     responses:
 *       200:
 *         description: Class update retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 update:
 *                   $ref: '#/components/schemas/ClassUpdate'
 *                 comments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ClassUpdateComment'
 *       404:
 *         description: Class update not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     summary: Update a class update
 *     description: Update an existing class update (author only)
 *     tags: [Class Updates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: updateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The class update ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 255
 *                 description: Title of the update
 *               content:
 *                 type: string
 *                 maxLength: 10000
 *                 description: Content of the update
 *               update_type:
 *                 type: string
 *                 enum: [announcement, homework, reminder, event]
 *                 description: Type of update
 *               attachments:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ClassUpdateAttachment'
 *                 maxItems: 5
 *                 description: File attachments
 *     responses:
 *       200:
 *         description: Class update updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 update:
 *                   $ref: '#/components/schemas/ClassUpdate'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied - author only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Class update not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: Delete a class update
 *     description: Delete a class update (author or admin only)
 *     tags: [Class Updates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: updateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The class update ID
 *     responses:
 *       200:
 *         description: Class update deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Class update not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:updateId', authenticate, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { updateId } = req.params;

    if (!updateId) {
      return res.status(400).json({ error: 'Update ID is required' });
    }

    // Use service to get update with comments
    const result = await classUpdatesService.getClassUpdateWithComments(updateId, authReq.user);
    
    res.json(result);

  } catch (error) {
    logger.error('Error fetching class update:', error);
    res.status(500).json({ error: 'Failed to fetch class update' });
  }
});

// PUT /api/class-updates/:updateId - Update a class update
router.put('/:updateId', authenticate, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { updateId } = req.params;
    const { title, content, update_type, attachments } = req.body;

    if (!updateId) {
      return res.status(400).json({ error: 'Update ID is required' });
    }

    // Use service to update class update
    const updatedUpdate = await classUpdatesService.updateClassUpdate(
      updateId, 
      authReq.user, 
      { title, content, update_type, attachments }
    );

    res.json({ update: updatedUpdate });

  } catch (error) {
    logger.error('Error updating class update:', error);
    res.status(500).json({ error: 'Failed to update class update' });
  }
});

// DELETE /api/class-updates/:updateId - Delete a class update
router.delete('/:updateId', authenticate, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { updateId } = req.params;

    if (!updateId) {
      return res.status(400).json({ error: 'Update ID is required' });
    }

    // Use service to delete class update
    await classUpdatesService.deleteClassUpdate(updateId, authReq.user);

    res.json({ message: 'Class update deleted successfully' });

  } catch (error) {
    logger.error('Error deleting class update:', error);
    res.status(500).json({ error: 'Failed to delete class update' });
  }
});

/**
 * @swagger
 * /api/class-updates/{updateId}/comments:
 *   post:
 *     summary: Create a comment on a class update
 *     description: Add a new comment to a class update
 *     tags: [Class Updates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: updateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The class update ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 2000
 *                 description: Comment content
 *               reply_to_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of parent comment for replies
 *     responses:
 *       201:
 *         description: Comment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comment:
 *                   $ref: '#/components/schemas/ClassUpdateComment'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Class update not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:updateId/comments', authenticate, validate(commentSchema), async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { updateId } = req.params;
    const { content, reply_to_id }: CreateCommentRequest = req.body;

    if (!updateId) {
      return res.status(400).json({ error: 'Update ID is required' });
    }

    // Use service to create comment
    const result = await classUpdatesService.createComment(updateId, authReq.user, { content, reply_to_id });

    res.status(201).json({ comment: result.comment });

    // Send notifications for the new comment
    try {
      await getNotificationService().notifyClassUpdateCommentCreated({
        commentId: result.comment.id,
        updateId: updateId as string,
        classId: result.classId,
        authorId: authReq.user.id,
        content: content,
        isReply: !!reply_to_id
      });

      logger.info(`🔔 Successfully sent comment notifications for comment ${result.comment.id}`);
    } catch (notificationError) {
      logger.error('🔔 Failed to send comment notifications:', notificationError);
      // Don't fail the request if notification fails
    }

  } catch (error) {
    logger.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

/**
 * @route PUT /api/class-updates/:updateId/pin
 * @desc Pin or unpin a class update
 * @access Private (Teachers only)
 */
router.put('/:updateId/pin', authenticate, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { updateId } = req.params;
    const { is_pinned } = req.body;

    if (!updateId) {
      return res.status(400).json({ error: 'Update ID is required' });
    }

    // Use service to update pin status
    await classUpdatesService.updatePinStatus(updateId, authReq.user, Boolean(is_pinned));

    res.json({
      message: is_pinned ? 'Update pinned successfully' : 'Update unpinned successfully',
      is_pinned: Boolean(is_pinned)
    });

  } catch (error) {
    logger.error('Error updating pin status:', error);
    res.status(500).json({ error: 'Failed to update pin status' });
  }
});

/**
 * @swagger
 * /api/class-updates/comments/{commentId}/reactions:
 *   post:
 *     summary: Toggle reaction on a comment
 *     description: Add or remove a reaction (emoji) on a class update comment
 *     tags: [Class Updates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The comment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emoji
 *             properties:
 *               emoji:
 *                 type: string
 *                 description: Emoji to react with
 *                 example: "👍"
 *     responses:
 *       200:
 *         description: Reaction toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 reactions:
 *                   type: object
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       count:
 *                         type: integer
 *                         description: Number of reactions
 *                       users:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: User IDs who reacted
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Comment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/comments/:commentId/reactions', authenticate, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { commentId } = req.params;
    const { emoji }: AddReactionRequest = req.body;

    if (!commentId) {
      return res.status(400).json({ error: 'Comment ID is required' });
    }

    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    // Use service to toggle comment reaction
    const result = await classUpdatesService.toggleCommentReaction(commentId, authReq.user, emoji);
    
    res.json(result);

  } catch (error) {
    logger.error('Error toggling comment reaction:', error);
    res.status(500).json({ error: 'Failed to toggle comment reaction' });
  }
});

export default router; 
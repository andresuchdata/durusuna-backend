import express, { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import db from '../config/database';
import { authenticate } from '../middleware/auth';
import { validate, classUpdateSchema, commentSchema } from '../utils/validation';
import logger from '../utils/logger';
import { safeJsonParse, migrateReactions, safeJsonStringify, ReactionData } from '../utils/json';
import storageService from '../services/storageService';
import { AuthenticatedRequest } from '../types/auth';
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
router.post('/upload-attachments', authenticate, upload.array('attachments', 5), async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthenticatedRequest;
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { class_id }: UploadAttachmentsRequest = req.body;

    if (!class_id) {
      return res.status(400).json({ error: 'Class ID is required' });
    }

    // Verify user has permission to upload to this class
    const currentUser: UserAccess | undefined = await db('users')
      .where('id', authReq.user.id)
      .select('user_type', 'role', 'school_id')
      .first();

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check access permissions
    let hasAccess = false;
    if (currentUser.role === 'admin' && currentUser.user_type === 'teacher') {
      const targetClass = await db('classes')
        .where('id', class_id)
        .where('school_id', currentUser.school_id)
        .first();
      hasAccess = !!targetClass;
    } else {
      const userClass = await db('user_classes')
        .join('users', 'user_classes.user_id', 'users.id')
        .where({
          'user_classes.user_id': authReq.user.id,
          'user_classes.class_id': class_id
        })
        .select('users.user_type', 'user_classes.role_in_class')
        .first();
      hasAccess = userClass && (userClass.user_type === 'teacher' || userClass.role_in_class === 'teacher');
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

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
    logger.error('Error uploading class update attachments:', error);
    res.status(500).json({ 
      error: 'Failed to upload attachments',
      message: (error as Error).message 
    });
  }
});

/**
 * @route DELETE /api/class-updates/attachments/:key(*)
 * @desc Delete a class update attachment
 * @access Private (Author or Teacher)
 */
router.delete('/attachments/:key(*)', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { key } = req.params;

    if (!key) {
      return res.status(400).json({ error: 'Attachment key is required' });
    }

    // Extract class ID from key if possible (depends on your key structure)
    // For now, we'll allow deletion if user has teacher permissions
    const currentUser: UserAccess | undefined = await db('users')
      .where('id', authReq.user.id)
      .select('user_type', 'role')
      .first();

    if (!currentUser || (currentUser.user_type !== 'teacher' && currentUser.role !== 'admin')) {
      return res.status(403).json({ error: 'Only teachers can delete attachments' });
    }

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
router.get('/:updateId/comments', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { updateId } = req.params;
    const { page = '1', limit = '20' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Verify the update exists
    const update = await db('class_updates')
      .where('id', updateId)
      .where('is_deleted', false)
      .first();

    if (!update) {
      return res.status(404).json({ error: 'Class update not found' });
    }

    // Check if user has access to the class
    let hasAccess = false;

    const currentUser: UserAccess | undefined = await db('users')
      .where('id', authReq.user.id)
      .select('user_type', 'role', 'school_id')
      .first();

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is an admin teacher - they can view comments for any class in their school
    if (currentUser.role === 'admin' && currentUser.user_type === 'teacher') {
      // Verify the class exists and belongs to their school
      const targetClass = await db('classes')
        .where('id', update.class_id)
        .where('school_id', currentUser.school_id)
        .first();

      hasAccess = !!targetClass;
    } else {
      // For non-admin users, check if they're enrolled in the specific class
      const userClass = await db('user_classes')
        .where({
          user_id: authReq.user.id,
          class_id: update.class_id
        })
        .first();

      hasAccess = !!userClass;
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    // Get comments with pagination
    const comments = await db('class_update_comments')
      .join('users', 'class_update_comments.author_id', 'users.id')
      .where('class_update_comments.class_update_id', updateId)
      .where('class_update_comments.is_deleted', false)
      .select(
        'class_update_comments.*',
        'users.first_name as author_first_name',
        'users.last_name as author_last_name',
        'users.email as author_email',
        'users.avatar_url as author_avatar',
        'users.user_type as author_user_type'
      )
      .orderBy('class_update_comments.created_at', 'asc')
      .limit(parseInt(limit as string))
      .offset(offset);

    // Get total count for pagination
    const totalResult = await db('class_update_comments')
      .where('class_update_id', updateId)
      .where('is_deleted', false)
      .count('* as count')
      .first();

    const total = parseInt(totalResult?.count as string) || 0;

    // Format comments
    const formattedComments: ClassUpdateCommentWithAuthor[] = comments.map(comment => ({
      id: comment.id,
      class_update_id: comment.class_update_id,
      author_id: comment.author_id,
      content: comment.content,
      reply_to_id: comment.reply_to_id,
      reactions: safeJsonParse(comment.reactions, {}),
      is_edited: comment.is_edited || false,
      edited_at: comment.edited_at,
      is_deleted: comment.is_deleted,
      deleted_at: comment.deleted_at,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      author: {
        id: comment.author_id,
        first_name: comment.author_first_name,
        last_name: comment.author_last_name,
        email: comment.author_email,
        avatar_url: comment.author_avatar || "",
        user_type: comment.author_user_type
      }
    }));

    const response = {
      comments: formattedComments,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        hasMore: offset + comments.length < total
      }
    };

    res.json(response);

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
router.post('/:updateId/reactions', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { updateId } = req.params;
    const { emoji }: AddReactionRequest = req.body;

    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    // Get the existing update
    const existingUpdate = await db('class_updates')
      .where('id', updateId)
      .where('is_deleted', false)
      .first();

    if (!existingUpdate) {
      return res.status(404).json({ error: 'Class update not found' });
    }

    // Check if user has access to the class
    let hasAccess = false;

    if (authReq.user.user_type === 'teacher' && authReq.user.role === 'admin') {
      // Admin teachers can react to updates in any class in their school
      const classInfo = await db('classes')
        .where('id', existingUpdate.class_id)
        .where('school_id', authReq.user.school_id)
        .first();
      
      hasAccess = !!classInfo;
    } else {
      // Regular users need to be enrolled in the class
      const userClass = await db('user_classes')
        .where({
          user_id: authReq.user.id,
          class_id: existingUpdate.class_id
        })
        .first();
      
      hasAccess = !!userClass;
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    // Parse existing reactions
    const reactions = migrateReactions(safeJsonParse(existingUpdate.reactions, {}));
    
    // Initialize emoji reaction if it doesn't exist
    if (!reactions[emoji]) {
      reactions[emoji] = { count: 0, users: [] };
    }

    // Check if user has already reacted with this emoji
    const userIndex = reactions[emoji].users.indexOf(authReq.user.id);
    
    if (userIndex > -1) {
      // User has already reacted, remove the reaction
      reactions[emoji].users.splice(userIndex, 1);
      reactions[emoji].count = Math.max(0, reactions[emoji].count - 1);
      
      // Remove emoji entirely if no reactions left
      if (reactions[emoji].count === 0) {
        delete reactions[emoji];
      }
    } else {
      // User hasn't reacted, add the reaction
      reactions[emoji].users.push(authReq.user.id);
      reactions[emoji].count += 1;
    }

    // Update the class update with new reactions
    await db('class_updates')
      .where('id', updateId)
      .update({
        reactions: safeJsonStringify(reactions),
        updated_at: new Date()
      });

    const response: ReactionResponse = {
      message: userIndex > -1 ? 'Reaction removed successfully' : 'Reaction added successfully',
      reactions
    };

    res.json(response);

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
router.get('/:updateId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { updateId } = req.params;

    // Get the update with author information
    const update = await db('class_updates')
      .join('users', 'class_updates.author_id', 'users.id')
      .where('class_updates.id', updateId)
      .where('class_updates.is_deleted', false)
      .select(
        'class_updates.*',
        'users.id as author_user_id',
        'users.first_name as author_first_name',
        'users.last_name as author_last_name',
        'users.email as author_email',
        'users.avatar_url as author_avatar',
        'users.user_type as author_user_type',
        'users.role as author_role'
      )
      .first();

    if (!update) {
      return res.status(404).json({ error: 'Class update not found' });
    }

    // Check if user has access to the class
    const userClass = await db('user_classes')
      .where({
        user_id: authReq.user.id,
        class_id: update.class_id
      })
      .first();

    if (!userClass) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    // Get comments for this update
    const comments = await db('class_update_comments')
      .join('users', 'class_update_comments.author_id', 'users.id')
      .where('class_update_comments.class_update_id', updateId)
      .where('class_update_comments.is_deleted', false)
      .select(
        'class_update_comments.*',
        'users.first_name as author_first_name',
        'users.last_name as author_last_name',
        'users.email as author_email',
        'users.avatar_url as author_avatar',
        'users.user_type as author_user_type'
      )
      .orderBy('class_update_comments.created_at', 'asc');

    // Format the update
    const formattedUpdate: ClassUpdateWithAuthor = {
      id: update.id,
      class_id: update.class_id,
      author_id: update.author_id,
      title: update.title,
      content: update.content,
      update_type: update.update_type,
      is_pinned: update.is_pinned,
      is_deleted: update.is_deleted,
      attachments: safeJsonParse(update.attachments, []),
      reactions: migrateReactions(safeJsonParse(update.reactions, {})),
      comment_count: comments.length,
      created_at: update.created_at,
      updated_at: update.updated_at,
      author: {
        id: update.author_user_id,
        first_name: update.author_first_name,
        last_name: update.author_last_name,
        email: update.author_email,
        avatar_url: update.author_avatar || "",
        user_type: update.author_user_type,
        role: update.author_role
      }
    };

    // Format comments
    const formattedComments: ClassUpdateCommentWithAuthor[] = comments.map(comment => ({
      id: comment.id,
      class_update_id: comment.class_update_id,
      author_id: comment.author_id,
      content: comment.content,
      reply_to_id: comment.reply_to_id,
      reactions: safeJsonParse(comment.reactions, {}),
      is_edited: comment.is_edited || false,
      edited_at: comment.edited_at,
      is_deleted: comment.is_deleted,
      deleted_at: comment.deleted_at,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      author: {
        id: comment.author_id,
        first_name: comment.author_first_name,
        last_name: comment.author_last_name,
        email: comment.author_email,
        avatar_url: comment.author_avatar || "",
        user_type: comment.author_user_type
      }
    }));

    const response: ClassUpdateResponse = {
      update: formattedUpdate,
      comments: formattedComments
    };

    res.json(response);

  } catch (error) {
    logger.error('Error fetching class update:', error);
    res.status(500).json({ error: 'Failed to fetch class update' });
  }
});

// PUT /api/class-updates/:updateId - Update a class update
router.put('/:updateId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { updateId } = req.params;
    const { title, content, update_type, attachments } = req.body;

    // Get the existing update
    const existingUpdate = await db('class_updates')
      .where('id', updateId)
      .where('is_deleted', false)
      .first();

    if (!existingUpdate) {
      return res.status(404).json({ error: 'Class update not found' });
    }

    // Check if user is the author or has permission
    if (existingUpdate.author_id !== authReq.user.id) {
      // Check if user is an admin teacher
      const currentUser = await db('users')
        .where('id', authReq.user.id)
        .select('user_type', 'role', 'school_id')
        .first();

      if (!(currentUser?.role === 'admin' && currentUser?.user_type === 'teacher')) {
        return res.status(403).json({ error: 'Access denied. Only the author or admin can update this.' });
      }

      // Verify class belongs to admin's school
      const targetClass = await db('classes')
        .where('id', existingUpdate.class_id)
        .where('school_id', currentUser.school_id)
        .first();

      if (!targetClass) {
        return res.status(403).json({ error: 'Access denied to this class' });
      }
    }

    // Update the class update
    const updateData: any = {
      updated_at: new Date()
    };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (update_type !== undefined) updateData.update_type = update_type;
    if (attachments !== undefined) updateData.attachments = safeJsonStringify(attachments);

    await db('class_updates')
      .where('id', updateId)
      .update(updateData);

    // Get the updated record with author information
    const updatedUpdate = await db('class_updates')
      .join('users', 'class_updates.author_id', 'users.id')
      .where('class_updates.id', updateId)
      .select(
        'class_updates.*',
        'users.id as author_user_id',
        'users.first_name as author_first_name',
        'users.last_name as author_last_name',
        'users.email as author_email',
        'users.avatar_url as author_avatar',
        'users.user_type as author_user_type',
        'users.role as author_role'
      )
      .first();

    const formattedUpdate: ClassUpdateWithAuthor = {
      id: updatedUpdate.id,
      class_id: updatedUpdate.class_id,
      author_id: updatedUpdate.author_id,
      title: updatedUpdate.title,
      content: updatedUpdate.content,
      update_type: updatedUpdate.update_type,
      is_pinned: updatedUpdate.is_pinned,
      is_deleted: updatedUpdate.is_deleted,
      attachments: safeJsonParse(updatedUpdate.attachments, []),
      reactions: migrateReactions(safeJsonParse(updatedUpdate.reactions, {})),
      comment_count: 0, // Could be calculated if needed
      created_at: updatedUpdate.created_at,
      updated_at: updatedUpdate.updated_at,
      author: {
        id: updatedUpdate.author_user_id,
        first_name: updatedUpdate.author_first_name,
        last_name: updatedUpdate.author_last_name,
        email: updatedUpdate.author_email,
        avatar_url: updatedUpdate.author_avatar || "",
        user_type: updatedUpdate.author_user_type,
        role: updatedUpdate.author_role
      }
    };

    res.json({ update: formattedUpdate });

  } catch (error) {
    logger.error('Error updating class update:', error);
    res.status(500).json({ error: 'Failed to update class update' });
  }
});

// DELETE /api/class-updates/:updateId - Delete a class update
router.delete('/:updateId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { updateId } = req.params;

    // Get the existing update
    const existingUpdate = await db('class_updates')
      .where('id', updateId)
      .where('is_deleted', false)
      .first();

    if (!existingUpdate) {
      return res.status(404).json({ error: 'Class update not found' });
    }

    // Check if user is the author or has permission
    if (existingUpdate.author_id !== authReq.user.id) {
      // Check if user is an admin teacher
      const currentUser = await db('users')
        .where('id', authReq.user.id)
        .select('user_type', 'role', 'school_id')
        .first();

      if (!(currentUser?.role === 'admin' && currentUser?.user_type === 'teacher')) {
        return res.status(403).json({ error: 'Access denied. Only the author or admin can delete this.' });
      }

      // Verify class belongs to admin's school
      const targetClass = await db('classes')
        .where('id', existingUpdate.class_id)
        .where('school_id', currentUser.school_id)
        .first();

      if (!targetClass) {
        return res.status(403).json({ error: 'Access denied to this class' });
      }
    }

    // Soft delete the class update
    await db('class_updates')
      .where('id', updateId)
      .update({
        is_deleted: true,
        updated_at: new Date()
      });

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
router.post('/:updateId/comments', authenticate, validate(commentSchema), async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { updateId } = req.params;
    const { content, reply_to_id }: CreateCommentRequest = req.body;

    // Verify the update exists
    const update = await db('class_updates')
      .where('id', updateId)
      .where('is_deleted', false)
      .first();

    if (!update) {
      return res.status(404).json({ error: 'Class update not found' });
    }

    // Check if user has access to the class
    const userClass = await db('user_classes')
      .where({
        user_id: authReq.user.id,
        class_id: update.class_id
      })
      .first();

    if (!userClass) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    // Verify reply-to comment exists if provided
    if (reply_to_id) {
      const replyComment = await db('class_update_comments')
        .where('id', reply_to_id)
        .where('class_update_id', updateId)
        .where('is_deleted', false)
        .first();

      if (!replyComment) {
        return res.status(400).json({ error: 'Invalid reply-to comment' });
      }
    }

    // Create the comment
    const commentId = uuidv4();
    const [newComment] = await db('class_update_comments')
      .insert({
        id: commentId,
        class_update_id: updateId,
        author_id: authReq.user.id,
        content,
        reply_to_id,
        is_deleted: false,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    // Get the comment with author information
    const commentWithAuthor = await db('class_update_comments')
      .join('users', 'class_update_comments.author_id', 'users.id')
      .where('class_update_comments.id', commentId)
      .select(
        'class_update_comments.*',
        'users.first_name as author_first_name',
        'users.last_name as author_last_name',
        'users.email as author_email',
        'users.avatar_url as author_avatar',
        'users.user_type as author_user_type'
      )
      .first();

    const formattedComment: ClassUpdateCommentWithAuthor = {
      id: commentWithAuthor.id,
      class_update_id: commentWithAuthor.class_update_id,
      author_id: commentWithAuthor.author_id,
      content: commentWithAuthor.content,
      reply_to_id: commentWithAuthor.reply_to_id,
      reactions: safeJsonParse(commentWithAuthor.reactions, {}),
      is_edited: commentWithAuthor.is_edited || false,
      edited_at: commentWithAuthor.edited_at,
      is_deleted: commentWithAuthor.is_deleted,
      deleted_at: commentWithAuthor.deleted_at,
      created_at: commentWithAuthor.created_at,
      updated_at: commentWithAuthor.updated_at,
      author: {
        id: commentWithAuthor.author_id,
        first_name: commentWithAuthor.author_first_name,
        last_name: commentWithAuthor.author_last_name,
        email: commentWithAuthor.author_email,
        avatar_url: commentWithAuthor.author_avatar || "",
        user_type: commentWithAuthor.author_user_type
      }
    };

    res.status(201).json({ comment: formattedComment });

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
router.put('/:updateId/pin', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { updateId } = req.params;
    const { is_pinned } = req.body;

    // Get the update
    const update = await db('class_updates')
      .where('id', updateId)
      .where('is_deleted', false)
      .first();

    if (!update) {
      return res.status(404).json({ error: 'Class update not found' });
    }

    // Check if user is a teacher and has access to this class
    if (authReq.user.user_type !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can pin/unpin updates' });
    }

    const userClass = await db('user_classes')
      .where({
        user_id: authReq.user.id,
        class_id: update.class_id
      })
      .first();

    if (!userClass) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    // Update pin status
    await db('class_updates')
      .where('id', updateId)
      .update({
        is_pinned: Boolean(is_pinned),
        updated_at: new Date()
      });

    res.json({
      message: is_pinned ? 'Update pinned successfully' : 'Update unpinned successfully',
      is_pinned: Boolean(is_pinned)
    });

  } catch (error) {
    logger.error('Error updating pin status:', error);
    res.status(500).json({ error: 'Failed to update pin status' });
  }
});

export default router; 
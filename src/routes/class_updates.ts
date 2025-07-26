import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import db from '../config/database';
import { authenticate } from '../middleware/auth';
import { validate, classUpdateSchema, commentSchema } from '../utils/validation';
import logger from '../utils/logger';
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
  ReactionResponse,
  ReactionData
} from '../types/classUpdate';

const router = express.Router();

// Configure multer for memory storage for class update attachments
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for class updates
  },
});

// Helper function to safely parse JSON
const safeJsonParse = (jsonData: any, fallback: any = null): any => {
  try {
    // If it's already an object/array, return it as-is
    if (typeof jsonData === 'object' && jsonData !== null) {
      return jsonData;
    }
    // If it's a string, try to parse it
    if (typeof jsonData === 'string' && jsonData.trim()) {
      return JSON.parse(jsonData);
    }
    return fallback;
  } catch (error) {
    logger.warn('Failed to parse JSON:', { jsonData, error: (error as Error).message });
    return fallback;
  }
};

// Helper function to migrate old reaction format to new format
const migrateReactions = (reactions: any): Record<string, ReactionData> => {
  if (!reactions || typeof reactions !== 'object') return {};
  
  const migratedReactions: Record<string, ReactionData> = {};
  
  for (const [emoji, value] of Object.entries(reactions)) {
    if (typeof value === 'number') {
      // Old format: { "👍": 5 } -> New format: { "👍": { count: 5, users: [] } }
      migratedReactions[emoji] = {
        count: value,
        users: [] // We can't recover the user data from old format
      };
    } else if (value && typeof value === 'object' && typeof (value as any).count === 'number') {
      // Already new format
      migratedReactions[emoji] = value as ReactionData;
    }
  }
  
  return migratedReactions;
};

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
  const authenticatedReq = req as AuthenticatedRequest;
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
      .where('id', authenticatedReq.user.id)
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
          'user_classes.user_id': authenticatedReq.user.id,
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
          'uploaded-by': authenticatedReq.user.id,
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
        uploadedBy: authenticatedReq.user.id,
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
router.delete('/attachments/:key(*)', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { key } = req.params;

    if (!key) {
      return res.status(400).json({ error: 'Attachment key is required' });
    }

    // Extract class ID from key if possible (depends on your key structure)
    // For now, we'll allow deletion if user has teacher permissions
    const currentUser: UserAccess | undefined = await db('users')
      .where('id', authenticatedReq.user.id)
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
 * @route GET /api/class-updates/:classId
 * @desc Get class updates for a specific class
 * @access Private
 */
router.get('/:classId', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { classId } = req.params;
    const { page = '1', limit = '20', type } = req.query as ClassUpdateQueryParams & { page?: string; limit?: string };
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get current user details
    const currentUser: UserAccess | undefined = await db('users')
      .where('id', authenticatedReq.user.id)
      .select('user_type', 'role', 'school_id')
      .first();

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is an admin teacher - they can view updates for any class in their school
    if (currentUser.role === 'admin' && currentUser.user_type === 'teacher') {
      // Verify the class exists and belongs to their school
      const targetClass = await db('classes')
        .where('id', classId)
        .where('school_id', currentUser.school_id)
        .first();

      if (!targetClass) {
        return res.status(404).json({ error: 'Class not found or access denied' });
      }
    } else {
      // For non-admin users, check if they're enrolled in the specific class
      const userClass = await db('user_classes')
        .where({
          user_id: authenticatedReq.user.id,
          class_id: classId
        })
        .first();

      if (!userClass) {
        return res.status(403).json({ error: 'Access denied to this class' });
      }
    }

    // Build query for class updates
    let query = db('class_updates')
      .join('users', 'class_updates.author_id', 'users.id')
      .where('class_updates.class_id', classId)
      .where('class_updates.is_deleted', false)
      .select(
        'class_updates.*',
        'users.id as author_user_id',
        'users.first_name as author_first_name',
        'users.last_name as author_last_name',
        'users.email as author_email',
        'users.phone as author_phone',
        'users.avatar_url as author_avatar',
        'users.user_type as author_user_type',
        'users.role as author_role',
        'users.school_id as author_school_id',
        'users.is_active as author_is_active',
        'users.last_login_at as author_last_active_at',
        'users.created_at as author_created_at',
        'users.updated_at as author_updated_at'
      );

    // Filter by type if specified
    if (type) {
      query = query.where('class_updates.update_type', type);
    }

    const updates = await query
      .orderBy([
        { column: 'class_updates.is_pinned', order: 'desc' },
        { column: 'class_updates.updated_at', order: 'desc' }
      ])
      .limit(parseInt(limit))
      .offset(offset);

    // Get comments count for each update
    const updateIds = updates.map(update => update.id);
    let commentCounts: Array<{ class_update_id: string; count: string }> = [];
    
    if (updateIds.length > 0) {
      commentCounts = await db('class_update_comments')
        .whereIn('class_update_id', updateIds)
        .where('is_deleted', false)
        .groupBy('class_update_id')
        .select('class_update_id')
        .count('* as count');
    }

    // Create a map for quick lookup of comment counts
    const commentCountMap: Record<string, number> = {};
    commentCounts.forEach(item => {
      commentCountMap[item.class_update_id] = parseInt(item.count);
    });

    // Format response with comment counts
    const formattedUpdates: ClassUpdateWithAuthor[] = updates.map(update => {
      const attachments = safeJsonParse(update.attachments, []);
      
      return {
        id: update.id,
        class_id: update.class_id,
        author_id: update.author_id,
        title: update.title,
        content: update.content,
        update_type: update.update_type,
        priority: update.priority || 'medium',
        is_pinned: update.is_pinned,
        is_deleted: update.is_deleted,
        attachments: attachments,
        reactions: migrateReactions(safeJsonParse(update.reactions, {})),
        comment_count: commentCountMap[update.id] || 0,
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
    });

    const response: ClassUpdatesResponse = {
      updates: formattedUpdates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: formattedUpdates.length, // This should be the actual total from a count query
        hasMore: updates.length === parseInt(limit)
      }
    };

    res.json(response);

  } catch (error) {
    logger.error('Error fetching class updates:', error);
    res.status(500).json({ error: 'Failed to fetch class updates' });
  }
});

/**
 * @route POST /api/class-updates/create
 * @desc Create a new class update
 * @access Private (Teachers only)
 */
router.post('/create', authenticate, validate(classUpdateSchema), async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const {
      class_id,
      title,
      content,
      update_type = 'announcement',
      priority = 'medium',
      is_pinned = false,
      attachments = []
    }: CreateClassUpdateRequest = req.body;

    // Get current user details
    const currentUser: UserAccess | undefined = await db('users')
      .where('id', authenticatedReq.user.id)
      .select('user_type', 'role', 'school_id')
      .first();

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is an admin teacher - they can create updates for any class in their school
    if (currentUser.role === 'admin' && currentUser.user_type === 'teacher') {
      // Verify the class exists and belongs to their school
      const targetClass = await db('classes')
        .where('id', class_id)
        .where('school_id', currentUser.school_id)
        .first();

      if (!targetClass) {
        return res.status(404).json({ error: 'Class not found or access denied' });
      }
    } else {
      // For non-admin users, check if they're enrolled in the specific class
      const userClass = await db('user_classes')
        .join('users', 'user_classes.user_id', 'users.id')
        .where({
          'user_classes.user_id': authenticatedReq.user.id,
          'user_classes.class_id': class_id
        })
        .select('users.user_type', 'user_classes.role_in_class')
        .first();

      if (!userClass) {
        return res.status(403).json({ error: 'Access denied to this class' });
      }

      if (userClass.user_type !== 'teacher' && userClass.role_in_class !== 'teacher') {
        return res.status(403).json({ error: 'Only teachers can create class updates' });
      }
    }

    // Create the class update
    const updateId = uuidv4();
    const [newUpdate] = await db('class_updates')
      .insert({
        id: updateId,
        class_id,
        author_id: authenticatedReq.user.id,
        title,
        content,
        update_type,
        priority,
        attachments: JSON.stringify(attachments),
        reactions: JSON.stringify({}),
        is_pinned,
        is_deleted: false,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    // Get the created update with author information
    const createdUpdate = await db('class_updates')
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
      id: createdUpdate.id,
      class_id: createdUpdate.class_id,
      author_id: createdUpdate.author_id,
      title: createdUpdate.title,
      content: createdUpdate.content,
      update_type: createdUpdate.update_type,
      priority: createdUpdate.priority,
      is_pinned: createdUpdate.is_pinned,
      is_deleted: createdUpdate.is_deleted,
      attachments: safeJsonParse(createdUpdate.attachments, []),
      reactions: migrateReactions(safeJsonParse(createdUpdate.reactions, {})),
      comment_count: 0,
      created_at: createdUpdate.created_at,
      updated_at: createdUpdate.updated_at,
      author: {
        id: createdUpdate.author_user_id,
        first_name: createdUpdate.author_first_name,
        last_name: createdUpdate.author_last_name,
        email: createdUpdate.author_email,
        avatar_url: createdUpdate.author_avatar || "",
        user_type: createdUpdate.author_user_type,
        role: createdUpdate.author_role
      }
    };

    res.status(201).json({ update: formattedUpdate });

  } catch (error) {
    logger.error('Error creating class update:', error);
    res.status(500).json({ error: 'Failed to create class update' });
  }
});

/**
 * @route POST /api/class-updates/:updateId/reactions
 * @desc Add or toggle a reaction to a class update
 * @access Private
 */
router.post('/:updateId/reactions', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
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

    if (authenticatedReq.user.user_type === 'teacher' && authenticatedReq.user.role === 'admin') {
      // Admin teachers can react to updates in any class in their school
      const classInfo = await db('classes')
        .where('id', existingUpdate.class_id)
        .where('school_id', authenticatedReq.user.school_id)
        .first();
      
      hasAccess = !!classInfo;
    } else {
      // Regular users need to be enrolled in the class
      const userClass = await db('user_classes')
        .where({
          user_id: authenticatedReq.user.id,
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
    const userIndex = reactions[emoji].users.indexOf(authenticatedReq.user.id);
    
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
      reactions[emoji].users.push(authenticatedReq.user.id);
      reactions[emoji].count += 1;
    }

    // Update the class update with new reactions
    await db('class_updates')
      .where('id', updateId)
      .update({
        reactions: JSON.stringify(reactions),
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
 * @route GET /api/class-updates/:updateId
 * @desc Get a specific class update with comments
 * @access Private
 */
router.get('/update/:updateId', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
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
        user_id: authenticatedReq.user.id,
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
      priority: update.priority || 'medium',
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
      is_deleted: comment.is_deleted,
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

/**
 * @route POST /api/class-updates/:updateId/comments
 * @desc Create a comment on a class update
 * @access Private
 */
router.post('/:updateId/comments', authenticate, validate(commentSchema), async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
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
        user_id: authenticatedReq.user.id,
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
        author_id: authenticatedReq.user.id,
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
      is_deleted: commentWithAuthor.is_deleted,
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
router.put('/:updateId/pin', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
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
    if (authenticatedReq.user.user_type !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can pin/unpin updates' });
    }

    const userClass = await db('user_classes')
      .where({
        user_id: authenticatedReq.user.id,
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
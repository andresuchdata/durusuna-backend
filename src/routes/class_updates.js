const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const db = require('../config/database');
const { authenticate: auth } = require('../middleware/auth');
const { validate, classUpdateSchema, commentSchema } = require('../utils/validation');
const logger = require('../utils/logger');
const storageService = require('../services/storageService');

const router = express.Router();

// Configure multer for memory storage for class update attachments
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for class updates
  },
});

// Helper function to safely parse JSON
const safeJsonParse = (jsonData, fallback = null) => {
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
    logger.warn('Failed to parse JSON:', { jsonData, error: error.message });
    return fallback;
  }
};

/**
 * @route POST /api/class-updates/upload-attachments
 * @desc Upload attachments for class updates
 * @access Private (Teachers only)
 */
router.post('/upload-attachments', auth, upload.array('attachments', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { class_id } = req.body;

    if (!class_id) {
      return res.status(400).json({ error: 'Class ID is required' });
    }

    // Verify user has permission to upload to this class
    const currentUser = await db('users')
      .where('id', req.user.id)
      .select('user_type', 'role', 'school_id')
      .first();

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check access permissions (same logic as create class update)
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
          'user_classes.user_id': req.user.id,
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
    const validationErrors = [];
    req.files.forEach((file, index) => {
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
    const filesToUpload = req.files.map(file => ({
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
          'uploaded-by': req.user.id,
          'class-id': class_id,
          'upload-context': 'class-update-attachment',
        },
      }
    );

    // Format attachments for class updates
    const formattedAttachments = uploadedFiles.map(file => {
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
        uploadedBy: req.user.id,
        uploadedAt: new Date().toISOString(),
        metadata: file.metadata,
      };
    });

    res.json({
      success: true,
      attachments: formattedAttachments,
      count: formattedAttachments.length,
    });
  } catch (error) {
    logger.error('Error uploading class update attachments:', error);
    res.status(500).json({ 
      error: 'Failed to upload attachments',
      message: error.message 
    });
  }
});

/**
 * @route DELETE /api/class-updates/attachments/:key(*)
 * @desc Delete a class update attachment
 * @access Private (Author or Teacher)
 */
router.delete('/attachments/:key(*)', auth, async (req, res) => {
  try {
    const { key } = req.params;

    if (!key) {
      return res.status(400).json({ error: 'Attachment key is required' });
    }

    // Extract class ID from key if possible (depends on your key structure)
    // For now, we'll allow deletion if user has teacher permissions
    const currentUser = await db('users')
      .where('id', req.user.id)
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
      message: error.message 
    });
  }
});

// Helper function to migrate old reaction format to new format
const migrateReactions = (reactions) => {
  if (!reactions || typeof reactions !== 'object') return {};
  
  const migratedReactions = {};
  
  for (const [emoji, value] of Object.entries(reactions)) {
    if (typeof value === 'number') {
      // Old format: { "👍": 5 } -> New format: { "👍": { count: 5, users: [] } }
      migratedReactions[emoji] = {
        count: value,
        users: [] // We can't recover the user data from old format
      };
    } else if (value && typeof value === 'object' && typeof value.count === 'number') {
      // Already new format
      migratedReactions[emoji] = value;
    }
  }
  
  return migratedReactions;
};

/**
 * @route GET /api/class-updates/:classId
 * @desc Get class updates for a specific class
 * @access Private
 */
router.get('/:classId', auth, async (req, res) => {
  try {
    const { classId } = req.params;
    const { page = 1, limit = 20, type } = req.query;
    const offset = (page - 1) * limit;

    // Get current user details
    const currentUser = await db('users')
      .where('id', req.user.id)
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
          user_id: req.user.id,
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
      .limit(limit)
      .offset(offset);

    // Get comments count for each update
    const updateIds = updates.map(update => update.id);
    let commentCounts = [];
    
    if (updateIds.length > 0) {
      commentCounts = await db('class_update_comments')
        .whereIn('class_update_id', updateIds)
        .where('is_deleted', false)
        .groupBy('class_update_id')
        .select('class_update_id')
        .count('* as count');
    }

    // Create a map for quick lookup of comment counts
    const commentCountMap = {};
    commentCounts.forEach(item => {
      commentCountMap[item.class_update_id] = parseInt(item.count);
    });

    // Format response with comment counts
    const formattedUpdates = updates.map(update => {
      const attachments = safeJsonParse(update.attachments, []);
      
      return {
        id: update.id,
        class_id: update.class_id,
        author_id: update.author_id,
        title: update.title,
        content: update.content,
        update_type: update.update_type,
        attachments: attachments,
        reactions: migrateReactions(safeJsonParse(update.reactions, {})),
        is_pinned: update.is_pinned,
        is_edited: update.is_edited,
        edited_at: update.edited_at,
        is_deleted: update.is_deleted,
        deleted_at: update.deleted_at,
        created_at: update.created_at,
        updated_at: update.updated_at,
        author: {
          id: update.author_user_id,
          first_name: update.author_first_name,
          last_name: update.author_last_name,
          email: update.author_email,
          phone: update.author_phone,
          avatar_url: update.author_avatar || "",
          user_type: update.author_user_type,
          role: update.author_role,
          school_id: update.author_school_id,
          is_active: update.author_is_active,
          last_active_at: update.author_last_active_at,
          created_at: update.author_created_at,
          updated_at: update.author_updated_at
        },
        comments_count: commentCountMap[update.id] || 0
      };
    });

    res.json({
      updates: formattedUpdates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: updates.length === parseInt(limit)
      }
    });

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
router.post('/create', auth, validate(classUpdateSchema), async (req, res) => {
  try {
    const {
      class_id,
      title,
      content,
      update_type = 'announcement',
      attachments = []
    } = req.body;

    // Get current user details
    const currentUser = await db('users')
      .where('id', req.user.id)
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
          'user_classes.user_id': req.user.id,
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
        author_id: req.user.id,
        title,
        content,
        update_type,
        attachments: JSON.stringify(attachments),
        reactions: JSON.stringify({}),
        is_pinned: false,
        is_edited: false,
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
        'users.phone as author_phone',
        'users.avatar_url as author_avatar',
        'users.user_type as author_user_type',
        'users.role as author_role',
        'users.school_id as author_school_id',
        'users.is_active as author_is_active',
        'users.last_login_at as author_last_active_at',
        'users.created_at as author_created_at',
        'users.updated_at as author_updated_at'
      )
      .first();

    const formattedUpdate = {
      id: createdUpdate.id,
      class_id: createdUpdate.class_id,
      author_id: createdUpdate.author_id,
      title: createdUpdate.title,
      content: createdUpdate.content,
      update_type: createdUpdate.update_type,
      attachments: safeJsonParse(createdUpdate.attachments, []),
      reactions: migrateReactions(safeJsonParse(createdUpdate.reactions, {})),
      is_pinned: createdUpdate.is_pinned,
      is_edited: createdUpdate.is_edited,
      edited_at: createdUpdate.edited_at,
      is_deleted: createdUpdate.is_deleted,
      deleted_at: createdUpdate.deleted_at,
      created_at: createdUpdate.created_at,
      updated_at: createdUpdate.updated_at,
      author: {
        id: createdUpdate.author_user_id,
        first_name: createdUpdate.author_first_name || "",
        last_name: createdUpdate.author_last_name || "",
        email: createdUpdate.author_email || "",
        phone: createdUpdate.author_phone || "",
        avatar_url: createdUpdate.author_avatar || "",
        user_type: createdUpdate.author_user_type || "",
        role: createdUpdate.author_role || "",
        school_id: createdUpdate.author_school_id || null,
        is_active: createdUpdate.author_is_active || false,
        last_active_at: createdUpdate.author_last_active_at || "",
        created_at: createdUpdate.author_created_at || "",
        updated_at: createdUpdate.author_updated_at || ""
      },
      comments_count: 0
    };

    res.status(201).json({
      update: formattedUpdate
    });

  } catch (error) {
    logger.error('Error creating class update:', error);
    res.status(500).json({ error: 'Failed to create class update' });
  }
});

/**
 * @route PUT /api/class-updates/:updateId
 * @desc Update a class update
 * @access Private (Author or Teacher)
 */
router.put('/:updateId', auth, async (req, res) => {
  try {
    const { updateId } = req.params;
    const {
      title,
      content,
      update_type,
      attachments
    } = req.body;

    // Get the existing update
    const existingUpdate = await db('class_updates')
      .where('id', updateId)
      .where('is_deleted', false)
      .first();

    if (!existingUpdate) {
      return res.status(404).json({ error: 'Class update not found' });
    }

    // Check if user is the author or a teacher in the class
    let canEdit = existingUpdate.author_id === req.user.id;

    if (!canEdit) {
      const userClass = await db('user_classes')
        .join('users', 'user_classes.user_id', 'users.id')
        .where({
          'user_classes.user_id': req.user.id,
          'user_classes.class_id': existingUpdate.class_id
        })
        .select('users.user_type', 'user_classes.role_in_class')
        .first();

      canEdit = userClass && (userClass.user_type === 'teacher' || userClass.role_in_class === 'teacher');
    }

    if (!canEdit) {
      return res.status(403).json({ error: 'You can only edit your own updates or you must be a teacher' });
    }

    // Prepare update data
    const updateData = {
      updated_at: new Date(),
      is_edited: true,
      edited_at: new Date()
    };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (update_type !== undefined) updateData.update_type = update_type;
    if (attachments !== undefined) updateData.attachments = JSON.stringify(attachments);

    // Update the class update
    await db('class_updates')
      .where('id', updateId)
      .update(updateData);

    // Get the updated record with author information
    const updatedRecord = await db('class_updates')
      .join('users', 'class_updates.author_id', 'users.id')
      .where('class_updates.id', updateId)
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
      )
      .first();

    const formattedUpdate = {
      id: updatedRecord.id,
      class_id: updatedRecord.class_id,
      author_id: updatedRecord.author_id,
      title: updatedRecord.title,
      content: updatedRecord.content,
      update_type: updatedRecord.update_type,
      attachments: safeJsonParse(updatedRecord.attachments, []),
      reactions: migrateReactions(safeJsonParse(updatedRecord.reactions, {})),
      is_pinned: updatedRecord.is_pinned,
      is_edited: updatedRecord.is_edited,
      edited_at: updatedRecord.edited_at,
      is_deleted: updatedRecord.is_deleted,
      deleted_at: updatedRecord.deleted_at,
      created_at: updatedRecord.created_at,
      updated_at: updatedRecord.updated_at,
      author: {
        id: updatedRecord.author_id,
        name: updatedRecord.author_name,
        email: updatedRecord.author_email,
        avatar_url: updatedRecord.author_avatar
      }
    };

    res.json({
      update: formattedUpdate
    });

  } catch (error) {
    logger.error('Error updating class update:', error);
    res.status(500).json({ error: 'Failed to update class update' });
  }
});

/**
 * @route DELETE /api/class-updates/:updateId
 * @desc Delete a class update (soft delete)
 * @access Private (Author or Teacher)
 */
router.delete('/:updateId', auth, async (req, res) => {
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

    // Check if user is the author or a teacher in the class
    let canDelete = existingUpdate.author_id === req.user.id;

    if (!canDelete) {
      const userClass = await db('user_classes')
        .join('users', 'user_classes.user_id', 'users.id')
        .where({
          'user_classes.user_id': req.user.id,
          'user_classes.class_id': existingUpdate.class_id
        })
        .select('users.user_type', 'user_classes.role_in_class')
        .first();

      canDelete = userClass && (userClass.user_type === 'teacher' || userClass.role_in_class === 'teacher');
    }

    if (!canDelete) {
      return res.status(403).json({ error: 'Only the author or class teachers can delete this update' });
    }

    // Soft delete the update
    await db('class_updates')
      .where('id', updateId)
      .update({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date()
      });

    res.json({
      message: 'Class update deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting class update:', error);
    res.status(500).json({ error: 'Failed to delete class update' });
  }
});

/**
 * @route GET /api/class-updates/:updateId/comments
 * @desc Get comments for a class update
 * @access Private
 */
router.get('/:updateId/comments', auth, async (req, res) => {
  try {
    const { updateId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Check if update exists
    const update = await db('class_updates')
      .where('id', updateId)
      .where('is_deleted', false)
      .first();

    if (!update) {
      return res.status(404).json({ error: 'Class update not found' });
    }

    // Check if user has access to the class
    let hasAccess = false;

    if (req.user.user_type === 'teacher' && req.user.role === 'admin') {
      // Admin teachers can view comments on any class in their school
      const classInfo = await db('classes')
        .where('id', update.class_id)
        .where('school_id', req.user.school_id)
        .first();
      
      hasAccess = !!classInfo;
    } else {
      // Regular users need to be enrolled in the class
      const userClass = await db('user_classes')
        .where({
          user_id: req.user.id,
          class_id: update.class_id
        })
        .first();
      
      hasAccess = !!userClass;
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    // Get comments with author information
    const comments = await db('class_update_comments')
      .join('users', 'class_update_comments.author_id', 'users.id')
      .where('class_update_comments.class_update_id', updateId)
      .where('class_update_comments.is_deleted', false)
      .select(
        'class_update_comments.*',
        db.raw("CONCAT(users.first_name, ' ', users.last_name) as author_name"),
        'users.email as author_email',
        'users.avatar_url as author_avatar'
      )
      .orderBy('class_update_comments.created_at', 'asc')
      .limit(limit)
      .offset(offset);

    const formattedComments = comments.map(comment => ({
      id: comment.id,
      class_update_id: comment.class_update_id,
      author_id: comment.author_id,
      content: comment.content,
      reply_to_id: comment.reply_to_id,
      reactions: migrateReactions(safeJsonParse(comment.reactions, {})),
      is_edited: comment.is_edited,
      edited_at: comment.edited_at,
      is_deleted: comment.is_deleted || false,
      deleted_at: comment.deleted_at,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      author: {
        id: comment.author_id,
        first_name: comment.author_name ? comment.author_name.split(' ')[0] : '',
        last_name: comment.author_name ? comment.author_name.split(' ').slice(1).join(' ') : '',
        email: comment.author_email,
        phone: null,
        avatar_url: comment.author_avatar || "",
        user_type: 'student', // Default, could be enhanced later
        role: 'user',
        school_id: null,
        is_active: true,
        last_active_at: null,
        created_at: comment.created_at,
        updated_at: comment.updated_at
      }
    }));

    res.json({
      comments: formattedComments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: comments.length === parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

/**
 * @route POST /api/class-updates/:updateId/comments
 * @desc Add a comment to a class update
 * @access Private
 */
router.post('/:updateId/comments', auth, validate(commentSchema), async (req, res) => {
  try {
    const { updateId } = req.params;
    const { content, reply_to_id } = req.body;

    // Check if update exists
    const update = await db('class_updates')
      .where('id', updateId)
      .where('is_deleted', false)
      .first();

    if (!update) {
      return res.status(404).json({ error: 'Class update not found' });
    }

    // Check if user has access to the class
    let hasAccess = false;

    if (req.user.user_type === 'teacher' && req.user.role === 'admin') {
      // Admin teachers can comment on updates in any class in their school
      const classInfo = await db('classes')
        .where('id', update.class_id)
        .where('school_id', req.user.school_id)
        .first();
      
      hasAccess = !!classInfo;
    } else {
      // Regular users need to be enrolled in the class
      const userClass = await db('user_classes')
        .where({
          user_id: req.user.id,
          class_id: update.class_id
        })
        .first();
      
      hasAccess = !!userClass;
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    // Validate reply_to_id if provided
    if (reply_to_id) {
      const parentComment = await db('class_update_comments')
        .where('id', reply_to_id)
        .where('class_update_id', updateId)
        .where('is_deleted', false)
        .first();

      if (!parentComment) {
        return res.status(400).json({ error: 'Invalid reply-to comment' });
      }
    }

    // Create the comment
    const commentId = uuidv4();
    const [newComment] = await db('class_update_comments')
      .insert({
        id: commentId,
        class_update_id: updateId,
        author_id: req.user.id,
        content,
        reply_to_id: reply_to_id || null,
        is_edited: false,
        is_deleted: false,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    // Get the created comment with author information
    const createdComment = await db('class_update_comments')
      .join('users', 'class_update_comments.author_id', 'users.id')
      .where('class_update_comments.id', commentId)
      .select(
        'class_update_comments.*',
        db.raw("CONCAT(users.first_name, ' ', users.last_name) as author_name"),
        'users.email as author_email',
        'users.avatar_url as author_avatar'
      )
      .first();

    const formattedComment = {
      id: createdComment.id,
      class_update_id: createdComment.class_update_id,
      author_id: createdComment.author_id,
      content: createdComment.content,
      reply_to_id: createdComment.reply_to_id,
      reactions: migrateReactions(safeJsonParse(createdComment.reactions, {})),
      is_edited: createdComment.is_edited,
      edited_at: createdComment.edited_at,
      is_deleted: createdComment.is_deleted || false,
      deleted_at: createdComment.deleted_at,
      created_at: createdComment.created_at,
      updated_at: createdComment.updated_at,
      author: {
        id: createdComment.author_id,
        first_name: createdComment.author_name ? createdComment.author_name.split(' ')[0] : '',
        last_name: createdComment.author_name ? createdComment.author_name.split(' ').slice(1).join(' ') : '',
        email: createdComment.author_email,
        phone: null,
        avatar_url: createdComment.author_avatar || "",
        user_type: 'student', // Default, could be enhanced later
        role: 'user',
        school_id: null,
        is_active: true,
        last_active_at: null,
        created_at: createdComment.created_at,
        updated_at: createdComment.updated_at
      }
    };

    res.status(201).json({
      comment: formattedComment
    });

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
router.put('/:updateId/pin', auth, async (req, res) => {
  try {
    const { updateId } = req.params;
    const { is_pinned } = req.body;

    if (typeof is_pinned !== 'boolean') {
      return res.status(400).json({ error: 'is_pinned must be a boolean value' });
    }

    // Get the existing update
    const existingUpdate = await db('class_updates')
      .where('id', updateId)
      .where('is_deleted', false)
      .first();

    if (!existingUpdate) {
      return res.status(404).json({ error: 'Class update not found' });
    }

    // Check if user is a teacher in the class
    const userClass = await db('user_classes')
      .join('users', 'user_classes.user_id', 'users.id')
      .where({
        'user_classes.user_id': req.user.id,
        'user_classes.class_id': existingUpdate.class_id
      })
      .select('users.user_type', 'user_classes.role_in_class')
      .first();

    if (!userClass || (userClass.user_type !== 'teacher' && userClass.role_in_class !== 'teacher')) {
      return res.status(403).json({ error: 'Only teachers can pin/unpin updates' });
    }

    // Update pin status
    await db('class_updates')
      .where('id', updateId)
      .update({
        is_pinned,
        updated_at: new Date()
      });

    // Get the updated record
    const updatedRecord = await db('class_updates')
      .join('users', 'class_updates.author_id', 'users.id')
      .where('class_updates.id', updateId)
      .select(
        'class_updates.*',
        db.raw("CONCAT(users.first_name, ' ', users.last_name) as author_name"),
        'users.email as author_email',
        'users.avatar_url as author_avatar'
      )
      .first();

    const formattedUpdate = {
      id: updatedRecord.id,
      class_id: updatedRecord.class_id,
      author_id: updatedRecord.author_id,
      title: updatedRecord.title,
      content: updatedRecord.content,
      update_type: updatedRecord.update_type,
      attachments: safeJsonParse(updatedRecord.attachments, []),
      reactions: migrateReactions(safeJsonParse(updatedRecord.reactions, {})),
      is_pinned: updatedRecord.is_pinned,
      is_edited: updatedRecord.is_edited,
      edited_at: updatedRecord.edited_at,
      is_deleted: updatedRecord.is_deleted,
      deleted_at: updatedRecord.deleted_at,
      created_at: updatedRecord.created_at,
      updated_at: updatedRecord.updated_at,
      author: {
        id: updatedRecord.author_id,
        name: updatedRecord.author_name,
        email: updatedRecord.author_email,
        avatar_url: updatedRecord.author_avatar
      }
    };

    res.json({
      update: formattedUpdate
    });

  } catch (error) {
    logger.error('Error updating pin status:', error);
    res.status(500).json({ error: 'Failed to update pin status' });
  }
});

/**
 * @route POST /api/class-updates/:updateId/reactions
 * @desc Add or toggle a reaction to a class update
 * @access Private
 */
router.post('/:updateId/reactions', auth, async (req, res) => {
  try {
    const { updateId } = req.params;
    const { emoji } = req.body;

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

    if (req.user.user_type === 'teacher' && req.user.role === 'admin') {
      // Admin teachers can react to updates in any class in their school
      const classInfo = await db('classes')
        .where('id', existingUpdate.class_id)
        .where('school_id', req.user.school_id)
        .first();
      
      hasAccess = !!classInfo;
    } else {
      // Regular users need to be enrolled in the class
      const userClass = await db('user_classes')
        .where({
          user_id: req.user.id,
          class_id: existingUpdate.class_id
        })
        .first();
      
      hasAccess = !!userClass;
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    // Parse existing reactions with new structure: { "emoji": { "count": 0, "users": [] } }
    const reactions = migrateReactions(safeJsonParse(existingUpdate.reactions, {}));
    
    // Initialize emoji reaction if it doesn't exist
    if (!reactions[emoji]) {
      reactions[emoji] = { count: 0, users: [] };
    }

    // Check if user has already reacted with this emoji
    const userIndex = reactions[emoji].users.indexOf(req.user.id);
    
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
      reactions[emoji].users.push(req.user.id);
      reactions[emoji].count += 1;
    }

    // Update the class update with new reactions
    await db('class_updates')
      .where('id', updateId)
      .update({
        reactions: JSON.stringify(reactions),
        updated_at: new Date()
      });

    // Get the updated record with author information to return full object
    const updatedRecord = await db('class_updates')
      .join('users', 'class_updates.author_id', 'users.id')
      .where('class_updates.id', updateId)
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
      )
      .first();

    // Get comments count
    const commentCount = await db('class_update_comments')
      .where('class_update_id', updateId)
      .where('is_deleted', false)
      .count('* as count')
      .first();

    const formattedUpdate = {
      id: updatedRecord.id,
      class_id: updatedRecord.class_id,
      author_id: updatedRecord.author_id,
      title: updatedRecord.title,
      content: updatedRecord.content,
      update_type: updatedRecord.update_type,
      attachments: safeJsonParse(updatedRecord.attachments, []),
      reactions: migrateReactions(safeJsonParse(updatedRecord.reactions, {})),
      is_pinned: updatedRecord.is_pinned,
      is_edited: updatedRecord.is_edited,
      edited_at: updatedRecord.edited_at,
      is_deleted: updatedRecord.is_deleted,
      deleted_at: updatedRecord.deleted_at,
      created_at: updatedRecord.created_at,
      updated_at: updatedRecord.updated_at,
      author: {
        id: updatedRecord.author_user_id,
        first_name: updatedRecord.author_first_name,
        last_name: updatedRecord.author_last_name,
        email: updatedRecord.author_email,
        phone: updatedRecord.author_phone,
        avatar_url: updatedRecord.author_avatar || "",
        user_type: updatedRecord.author_user_type,
        role: updatedRecord.author_role,
        school_id: updatedRecord.author_school_id,
        is_active: updatedRecord.author_is_active,
        last_active_at: updatedRecord.author_last_active_at,
        created_at: updatedRecord.author_created_at,
        updated_at: updatedRecord.author_updated_at
      },
      comments_count: parseInt(commentCount.count) || 0
    };

    res.json({
      message: userIndex > -1 ? 'Reaction removed successfully' : 'Reaction added successfully',
      update: formattedUpdate
    });

  } catch (error) {
    logger.error('Error toggling reaction:', error);
    res.status(500).json({ error: 'Failed to toggle reaction' });
  }
});



module.exports = router; 
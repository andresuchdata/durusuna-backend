import express, { Request, Response } from 'express';
import { ZodError } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { ClassService } from '../services/classService';
import { ClassRepository } from '../repositories/classRepository';
import { LessonRepository } from '../repositories/lessonRepository';
import { UserClassRepository } from '../repositories/userClassRepository';
import { authenticate, authorize } from '../shared/middleware/auth';
import logger from '../shared/utils/logger';
import db from '../shared/database/connection';
import { validate, classUpdateSchema } from '../utils/validation';
import { safeJsonParse, migrateReactions, safeJsonStringify } from '../utils/json';
import { AuthenticatedRequest } from '../types/auth';
import { NotificationRepository } from '../repositories/notificationRepository';
import { NotificationService as AppNotificationService } from '../services/notificationService';
import { NotificationOutboxRepository } from '../repositories/notificationOutboxRepository';
import { NotificationDeliveryRepository } from '../repositories/notificationDeliveryRepository';
import { NotificationDispatcher } from '../services/notification/NotificationDispatcher';
import { SocketChannelProvider } from '../services/notification/channels/SocketChannelProvider';
import { EmailChannelProvider } from '../services/notification/channels/EmailChannelProvider';
import { Class, ClassWithDetails } from '../types/class';
import {
  ClassUpdateWithAuthor,
  CreateClassUpdateRequest,
  ClassUpdatesResponse,
  ClassUpdateQueryParams,
} from '../types/classUpdate';

const router = express.Router();

// Initialize service layer with all dependencies
const classRepository = new ClassRepository(db);
const lessonRepository = new LessonRepository(db);
const userClassRepository = new UserClassRepository(db);
const classService = new ClassService(classRepository, lessonRepository, userClassRepository);

// JSON utilities now imported from utils/json.ts

interface UserAccess {
  user_type: 'student' | 'teacher' | 'parent' | 'admin';
  role: 'user' | 'admin';
  school_id: string;
  role_in_class?: string;
}

/**
 * @route GET /api/classes
 * @desc Get classes for current user
 * @access Private
 */
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const classes = await classService.getAllClasses(req.user);
    res.json(classes);
  } catch (error) {
    logger.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

/**
 * @route GET /api/classes/my-classes
 * @desc Get classes for current user (enrolled classes)
 * @access Private
 */
router.get('/my-classes', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const classes = await classService.getUserClasses(req.user);
    res.json({ classes });
  } catch (error) {
    logger.error('Error fetching user classes:', error);
    res.status(500).json({ error: 'Failed to fetch user classes' });
  }
});

/**
 * @route GET /api/classes/:id
 * @desc Get class by ID
 * @access Private
 */
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Class ID is required' });
    }
    const classItem = await classService.getClassById(id, req.user);
    res.json(classItem);
  } catch (error) {
    if (error instanceof Error && error.message === 'Class not found') {
      return res.status(404).json({ error: error.message });
    }
    
    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({ error: error.message });
    }
    
    logger.error('Error fetching class:', error);
    res.status(500).json({ error: 'Failed to fetch class' });
  }
});

/**
 * @swagger
 * /api/classes/{classId}/updates:
 *   get:
 *     summary: Get class updates
 *     description: Retrieve paginated class updates for a specific class
 *     tags: [Class Updates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The class ID
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
 *         description: Number of updates per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [announcement, homework, reminder, event]
 *         description: Filter by update type
 *     responses:
 *       200:
 *         description: Class updates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 updates:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ClassUpdate'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       404:
 *         description: Class not found or access denied
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
router.get('/:classId/updates', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { classId } = req.params;
    const { page = '1', limit = '20', type } = req.query as ClassUpdateQueryParams & { page?: string; limit?: string };
    
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get current user details
    const currentUser: UserAccess | undefined = await db('users')
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
        { column: 'class_updates.updated_at', order: 'desc' },
        { column: 'class_updates.created_at', order: 'desc' }
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
 * @swagger
 * /api/classes/{classId}/updates:
 *   post:
 *     summary: Create a new class update
 *     description: Create a new class update (teachers only)
 *     tags: [Class Updates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The class ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
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
 *                 default: announcement
 *                 description: Type of update
 *               is_pinned:
 *                 type: boolean
 *                 default: false
 *                 description: Whether the update should be pinned
 *               attachments:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ClassUpdateAttachment'
 *                 maxItems: 5
 *                 description: File attachments
 *     responses:
 *       201:
 *         description: Class update created successfully
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
 *         description: Access denied - teachers only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Class not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:classId/updates', authenticate, validate(classUpdateSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { classId } = req.params;
    const {
      title,
      content,
      update_type = 'announcement',
      is_pinned = false,
      attachments = []
    } = req.body;

    // Get current user details
    const currentUser: UserAccess | undefined = await db('users')
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
        .where('id', classId)
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
          'user_classes.class_id': classId
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
        class_id: classId,
        author_id: req.user.id,
        title,
        content,
        update_type,
        attachments: safeJsonStringify(attachments),
        reactions: safeJsonStringify({}),
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

    // Fire test notifications to class subscribers (students and parents). Admin excluded.
    try {
      logger.info(`🔔 Enqueuing class update notifications for classId: ${classId}`);
      
      const recipientRows = await db('user_classes')
        .join('users', 'user_classes.user_id', 'users.id')
        .where('user_classes.class_id', classId)
        .whereIn('users.user_type', ['student', 'parent'])
        .select('users.id as user_id');

      logger.info(`🔔 Found ${recipientRows.length} potential recipients`);

      const userIds = recipientRows
        .map(r => r.user_id)
        .filter((id: string) => id !== req.user.id);

      logger.info(`🔔 After filtering author, ${userIds.length} recipients: ${userIds.join(', ')}`);

      if (userIds.length > 0) {
        const notificationRepository = new NotificationRepository(db as any);
        const notificationService = new AppNotificationService(notificationRepository);
        const outboxRepo = new NotificationOutboxRepository(db as any);
        const deliveryRepo = new NotificationDeliveryRepository(db as any);
        const providers = [new SocketChannelProvider(), new EmailChannelProvider(db as any)];
      
        const dispatcher = new NotificationDispatcher(outboxRepo, deliveryRepo, providers);

        const titleText = title || 'New class update';
        const bodyText = content?.slice(0, 140) || 'A new update was posted.';

        const created = await notificationService.createBulkNotifications(
          userIds,
          {
            title: titleText,
            content: bodyText,
            notification_type: 'announcement',
            priority: 'normal',
            sender_id: req.user.id,
            action_url: undefined,
            action_data: { class_id: classId, update_id: updateId, update_type },
          },
          req.user
        );

        logger.info(`🔔 Created ${created.length} notifications`);

        const channels = (process.env.NOTIF_CHANNELS_ENABLED || 'socket').split(',').map(s => s.trim()) as any;
        logger.info(`🔔 Using channels: ${channels.join(', ')}`);
        
        for (const n of created) {
          logger.info(`🔔 Enqueuing notification ${n.id} for user ${n.user_id}`);
          await dispatcher.enqueue(n, [n.user_id], channels);
        }
        
        logger.info(`🔔 Successfully enqueued ${created.length} notifications`);
      } else {
        logger.info('🔔 No recipients found for class update notifications');
      }
    } catch (notifyError) {
      logger.error('Failed to enqueue class update notifications', notifyError);
    }

  } catch (error) {
    logger.error('Error creating class update:', error);
    res.status(500).json({ error: 'Failed to create class update' });
  }
});

/**
 * @route POST /api/classes
 * @desc Create new class
 * @access Private (teachers and admins)
 */
router.post('/', authenticate, authorize([], ['teacher']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Set school_id from user's school
    const classData = {
      ...req.body,
      school_id: req.user.school_id
    };
    
    const classItem = await classService.createClass(classData, req.user);
    res.status(201).json({
      message: 'Class created successfully',
      class: classItem
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        errors: error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    
    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({ error: error.message });
    }
    
    logger.error('Error creating class:', error);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

/**
 * @route PUT /api/classes/:id
 * @desc Update class
 * @access Private (teachers and admins)
 */
router.put('/:id', authenticate, authorize([], ['teacher']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Class ID is required' });
    }
    const classItem = await classService.updateClass(id, req.body, req.user);
    res.json({
      message: 'Class updated successfully',
      class: classItem
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        errors: error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    
    if (error instanceof Error && error.message === 'Class not found') {
      return res.status(404).json({ error: error.message });
    }
    
    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({ error: error.message });
    }
    
    logger.error('Error updating class:', error);
    res.status(500).json({ error: 'Failed to update class' });
  }
});

/**
 * @route GET /api/classes/:id/students
 * @desc Get students in a class with pagination and search
 * @access Private
 * @query page: number (default: 1)
 * @query limit: number (default: 20, max: 100)
 * @query search: string (optional search term)
 */
router.get('/:id/students', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '20', search } = req.query as { page?: string; limit?: string; search?: string };
    
    if (!id) {
      return res.status(400).json({ error: 'Class ID is required' });
    }
    
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100); // Max 100 students per page
    
    if (pageNum < 1 || limitNum < 1) {
      return res.status(400).json({ error: 'Page and limit must be positive numbers' });
    }
    
    const response = await classService.getClassStudents(id, req.user, pageNum, limitNum, search);
    res.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'Class not found') {
      return res.status(404).json({ error: error.message });
    }
    
    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({ error: error.message });
    }
    
    logger.error('Error fetching class students:', error);
    res.status(500).json({ error: 'Failed to fetch class students' });
  }
});

/**
 * @route GET /api/classes/:id/teachers
 * @desc Get teachers in a class with pagination
 * @access Private
 * @query page: number (default: 1)
 * @query limit: number (default: 20, max: 100)
 */
router.get('/:id/teachers', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '20' } = req.query as { page?: string; limit?: string };
    
    if (!id) {
      return res.status(400).json({ error: 'Class ID is required' });
    }
    
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100); // Max 100 teachers per page
    
    if (pageNum < 1 || limitNum < 1) {
      return res.status(400).json({ error: 'Page and limit must be positive numbers' });
    }
    
    const response = await classService.getClassTeachers(id, req.user, pageNum, limitNum);
    res.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'Class not found') {
      return res.status(404).json({ error: error.message });
    }
    
    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({ error: error.message });
    }
    
    logger.error('Error fetching class teachers:', error);
    res.status(500).json({ error: 'Failed to fetch class teachers' });
  }
});

/**
 * @route GET /api/classes/:id/counts
 * @desc Get student and teacher counts for a class
 * @access Private
 */
router.get('/:id/counts', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Class ID is required' });
    }
    
    const counts = await classService.getClassCounts(id, req.user);
    res.json(counts);
  } catch (error) {
    if (error instanceof Error && error.message === 'Class not found') {
      return res.status(404).json({ error: error.message });
    }
    
    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({ error: error.message });
    }
    
    logger.error('Error fetching class counts:', error);
    res.status(500).json({ error: 'Failed to fetch class counts' });
  }
});

/**
 * @route GET /api/classes/:id/subjects
 * @desc Get subjects for a class with their lessons
 * @access Private
 */
router.get('/:id/subjects', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Class ID is required' });
    }
    const subjects = await classService.getClassSubjects(id, req.user);
    res.json({ subjects });
  } catch (error) {
    if (error instanceof Error && error.message === 'Class not found') {
      return res.status(404).json({ error: error.message });
    }
    
    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({ error: error.message });
    }
    
    logger.error('Error fetching class subjects:', error);
    res.status(500).json({ error: 'Failed to fetch class subjects' });
  }
});


/**
 * @route GET /api/classes/:id/lessons
 * @desc Get lessons for a class
 * @access Private
 */
router.get('/:id/lessons', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Class ID is required' });
    }
    const lessons = await classService.getClassLessons(id, req.user);
    res.json({ lessons });
  } catch (error) {
    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({ error: error.message });
    }
    
    logger.error('Error fetching class lessons:', error);
    res.status(500).json({ error: 'Failed to fetch class lessons' });
  }
});

export default router; 
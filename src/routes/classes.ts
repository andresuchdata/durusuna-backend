import express, { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ClassService } from '../services/classService';
import { ClassUpdatesService } from '../services/classUpdatesService';
import { ClassRepository } from '../repositories/classRepository';
import { ClassUpdatesRepository } from '../repositories/classUpdatesRepository';
import { LessonRepository } from '../repositories/lessonRepository';
import { UserClassRepository } from '../repositories/userClassRepository';
import { authenticate, authorize } from '../shared/middleware/auth';
import logger from '../shared/utils/logger';
import db from '../shared/database/connection';
import { validate, classUpdateSchema } from '../utils/validation';
import { AuthenticatedRequest } from '../types/auth';
import { NotificationOutboxRepository } from '../repositories/notificationOutboxRepository';
import { NotificationDeliveryRepository } from '../repositories/notificationDeliveryRepository';
import { NotificationDispatcher } from '../services/notification/NotificationDispatcher';
import { SocketChannelProvider } from '../services/notification/channels/SocketChannelProvider';
import { EmailChannelProvider } from '../services/notification/channels/EmailChannelProvider';
import { FirebaseChannelProvider } from '../services/notification/channels/FirebaseChannelProvider';
import { ClassUpdateNotificationService } from '../services/classUpdateNotificationService';
import { Class, ClassWithDetails } from '../types/class';
import {
  ClassUpdateQueryParams,
} from '../types/classUpdate';

const router = express.Router();

// Initialize service layer with all dependencies
const classRepository = new ClassRepository(db);
const classUpdatesRepository = new ClassUpdatesRepository(db);
const lessonRepository = new LessonRepository(db);
const userClassRepository = new UserClassRepository(db);
const classService = new ClassService(classRepository, lessonRepository, userClassRepository);
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

// Clean architecture: Routes -> Services -> Repositories -> Database

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
router.get('/:classId/updates', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { classId } = req.params;
    if (!classId) {
      return res.status(400).json({ error: 'Class ID is required' });
    }
    
    const queryParams = req.query as ClassUpdateQueryParams & { page?: string; limit?: string };
    const response = await classUpdatesService.getClassUpdates(classId, queryParams, authenticatedReq.user);
    res.json(response);

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'Class not found or access denied') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'Access denied to this class') {
        return res.status(403).json({ error: error.message });
      }
    }
    
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
router.post('/:classId/updates', authenticate, validate(classUpdateSchema), async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { classId } = req.params;
    if (!classId) {
      return res.status(400).json({ error: 'Class ID is required' });
    }
    
    const createData = {
      title: req.body.title,
      content: req.body.content,
      update_type: req.body.update_type || 'announcement',
      is_pinned: req.body.is_pinned || false,
      attachments: req.body.attachments || []
    };

    const createdUpdate = await classUpdatesService.createClassUpdate(classId, createData, authenticatedReq.user);
    res.status(201).json({ update: createdUpdate });

    // Send notifications to class subscribers (students, teachers, and parents)
    try {
      await getNotificationService().notifyClassUpdateCreated({
        updateId: createdUpdate.id,
        classId: classId,
        authorId: authenticatedReq.user.id,
        title: createdUpdate.title,
        content: createdUpdate.content,
        updateType: createdUpdate.update_type
      });

      logger.info(`🔔 Successfully sent class update notifications for update ${createdUpdate.id}`);
    } catch (notificationError) {
      logger.error('🔔 Failed to send class update notifications:', notificationError);
      // Don't fail the request if notification fails
    }

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'Class not found or access denied') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'Access denied to this class') {
        return res.status(403).json({ error: error.message });
      }
      if (error.message === 'Only teachers can create class updates') {
        return res.status(403).json({ error: error.message });
      }
    }
    
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
 * @route GET /api/classes/:id/offerings
 * @desc Get class offerings (subject-classes) for a class, optionally filtered by current teacher
 * @access Private
 */
router.get('/:id/offerings', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Class ID is required' });
    }
    const offerings = await classService.getClassOfferings(id, req.user);
    res.json({ offerings });
  } catch (error) {
    if (error instanceof Error && error.message === 'Class not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({ error: error.message });
    }
    logger.error('Error fetching class offerings:', error);
    res.status(500).json({ error: 'Failed to fetch class offerings' });
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
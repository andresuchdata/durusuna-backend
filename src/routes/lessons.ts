import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import db from '../config/database';
import { authenticate } from '../middleware/auth';
import logger from '../shared/utils/logger';
import { AuthenticatedRequest } from '../types/auth';
import {
  Lesson,
  LessonWithClass,
  LessonWithTeacher,
  CreateLessonRequest,
  UpdateLessonRequest,
  LessonQueryParams,
  LessonsResponse
} from '../types/lesson';

const router = express.Router();

interface UserClassAccess {
  user_id: string;
  class_id: string;
  role: 'student' | 'teacher' | 'assistant';
  is_active: boolean;
}

// Get lessons for a class
router.get('/class/:classId', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { classId } = req.params;
    const { page = '1', limit = '20', status, from_date, to_date } = req.query as LessonQueryParams & { page?: string; limit?: string };

    // Check if user has access to this class
    const userClass: UserClassAccess | undefined = await db('user_classes')
      .where({
        user_id: authenticatedReq.user.id,
        class_id: classId,
        is_active: true
      })
      .first();

    if (!userClass) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    // Build query for lessons
    let lessonsQuery = db('lessons')
      .leftJoin('users as teacher', 'lessons.teacher_id', 'teacher.id')
      .leftJoin('classes', 'lessons.class_id', 'classes.id')
      .where('lessons.class_id', classId)
      .where('lessons.is_active', true);

    // Apply filters
    if (status) {
      lessonsQuery = lessonsQuery.where('lessons.status', status);
    }

    if (from_date) {
      lessonsQuery = lessonsQuery.where('lessons.lesson_date', '>=', new Date(from_date));
    }

    if (to_date) {
      lessonsQuery = lessonsQuery.where('lessons.lesson_date', '<=', new Date(to_date));
    }

    // Get total count for pagination
    const totalCount = await lessonsQuery.clone().count('* as count').first();
    const total = parseInt(totalCount?.count as string) || 0;

    // Apply pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const lessons = await lessonsQuery
      .select(
        'lessons.id',
        'lessons.title',
        'lessons.content',
        'lessons.lesson_date',
        'lessons.duration_minutes',
        'lessons.materials',
        'lessons.homework_assigned',
        'lessons.learning_objectives',
        'lessons.status',
        'lessons.created_at',
        'lessons.updated_at',
        'teacher.id as teacher_id',
        'teacher.first_name as teacher_first_name',
        'teacher.last_name as teacher_last_name',
        'teacher.email as teacher_email',
        'teacher.avatar_url as teacher_avatar',
        'classes.name as class_name',
        'classes.subject as class_subject'
      )
      .orderBy('lessons.lesson_date', 'desc')
      .limit(limitNum)
      .offset(offset);

    // Format lessons with additional data
    const formattedLessons: LessonWithTeacher[] = lessons.map(lesson => ({
      id: lesson.id,
      title: lesson.title,
      content: lesson.content,
      lesson_date: lesson.lesson_date,
      class_id: classId,
      teacher_id: lesson.teacher_id,
      duration_minutes: lesson.duration_minutes,
      materials: lesson.materials,
      homework_assigned: lesson.homework_assigned,
      learning_objectives: lesson.learning_objectives ? JSON.parse(lesson.learning_objectives) : [],
      status: lesson.status || 'planned',
      is_active: true,
      created_at: lesson.created_at,
      updated_at: lesson.updated_at,
      teacher: {
        id: lesson.teacher_id,
        first_name: lesson.teacher_first_name,
        last_name: lesson.teacher_last_name,
        email: lesson.teacher_email,
        avatar_url: lesson.teacher_avatar
      }
    }));

    const response: LessonsResponse = {
      lessons: formattedLessons,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        hasMore: offset + limitNum < total
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching lessons:', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

// Get lesson by ID
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { id } = req.params;

    const lesson = await db('lessons')
      .leftJoin('users as teacher', 'lessons.teacher_id', 'teacher.id')
      .leftJoin('classes', 'lessons.class_id', 'classes.id')
      .where('lessons.id', id)
      .where('lessons.is_active', true)
      .select(
        'lessons.*',
        'teacher.id as teacher_id',
        'teacher.first_name as teacher_first_name',
        'teacher.last_name as teacher_last_name',
        'teacher.email as teacher_email',
        'teacher.avatar_url as teacher_avatar',
        'classes.name as class_name',
        'classes.subject as class_subject',
        'classes.school_id as class_school_id'
      )
      .first();

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Check if user has access to this lesson's class
    const userClass: UserClassAccess | undefined = await db('user_classes')
      .where({
        user_id: authenticatedReq.user.id,
        class_id: lesson.class_id,
        is_active: true
      })
      .first();

    if (!userClass) {
      return res.status(403).json({ error: 'Access denied to this lesson' });
    }

    // Format lesson with additional data
    const formattedLesson: LessonWithTeacher & LessonWithClass = {
      id: lesson.id,
      title: lesson.title,
      content: lesson.content,
      lesson_date: lesson.lesson_date,
      class_id: lesson.class_id,
      teacher_id: lesson.teacher_id,
      duration_minutes: lesson.duration_minutes,
      materials: lesson.materials,
      homework_assigned: lesson.homework_assigned,
      learning_objectives: lesson.learning_objectives ? JSON.parse(lesson.learning_objectives) : [],
      status: lesson.status || 'planned',
      is_active: true,
      created_at: lesson.created_at,
      updated_at: lesson.updated_at,
      teacher: {
        id: lesson.teacher_id,
        first_name: lesson.teacher_first_name,
        last_name: lesson.teacher_last_name,
        email: lesson.teacher_email,
        avatar_url: lesson.teacher_avatar
      },
      class: {
        id: lesson.class_id,
        name: lesson.class_name,
        subject: lesson.class_subject,
        school_id: lesson.class_school_id
      }
    };

    res.json(formattedLesson);
  } catch (error) {
    logger.error('Error fetching lesson:', error);
    res.status(500).json({ error: 'Failed to fetch lesson' });
  }
});

// Create new lesson (teachers only)
router.post('/', [
  authenticate,
  body('title').notEmpty().withMessage('Lesson title is required').trim(),
  body('class_id').isUUID().withMessage('Valid class ID is required'),
  body('lesson_date').isISO8601().withMessage('Valid lesson date is required'),
  body('content').optional().trim(),
  body('duration_minutes').optional().isInt({ min: 1, max: 480 }).withMessage('Duration must be between 1 and 480 minutes'),
  body('materials').optional().trim(),
  body('homework_assigned').optional().trim(),
  body('learning_objectives').optional().isArray().withMessage('Learning objectives must be an array')
], async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user is a teacher
    if (authenticatedReq.user.user_type !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can create lessons' });
    }

    const {
      title,
      content,
      lesson_date,
      class_id,
      duration_minutes,
      materials,
      homework_assigned,
      learning_objectives
    }: CreateLessonRequest = req.body;

    // Verify teacher has access to this class
    const userClass: UserClassAccess | undefined = await db('user_classes')
      .where({
        user_id: authenticatedReq.user.id,
        class_id,
        is_active: true
      })
      .first();

    if (!userClass || userClass.role !== 'teacher') {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    const [newLesson] = await db('lessons')
      .insert({
        title,
        content,
        lesson_date: new Date(lesson_date),
        class_id,
        teacher_id: authenticatedReq.user.id,
        duration_minutes,
        materials,
        homework_assigned,
        learning_objectives: learning_objectives ? JSON.stringify(learning_objectives) : null,
        status: 'planned',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    res.status(201).json(newLesson);
  } catch (error) {
    logger.error('Error creating lesson:', error);
    res.status(500).json({ error: 'Failed to create lesson' });
  }
});

// Update lesson (teachers only)
router.put('/:id', [
  authenticate,
  body('title').optional().notEmpty().withMessage('Lesson title cannot be empty').trim(),
  body('lesson_date').optional().isISO8601().withMessage('Valid lesson date is required'),
  body('content').optional().trim(),
  body('duration_minutes').optional().isInt({ min: 1, max: 480 }).withMessage('Duration must be between 1 and 480 minutes'),
  body('materials').optional().trim(),
  body('homework_assigned').optional().trim(),
  body('learning_objectives').optional().isArray().withMessage('Learning objectives must be an array'),
  body('status').optional().isIn(['planned', 'in_progress', 'completed', 'cancelled']).withMessage('Invalid status')
], async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates: UpdateLessonRequest = req.body;

    // Check if user is a teacher
    if (authenticatedReq.user.user_type !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can update lessons' });
    }

    // Get the lesson to verify ownership
    const lesson = await db('lessons')
      .where('id', id)
      .where('is_active', true)
      .first();

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Verify teacher has access to this lesson's class
    const userClass: UserClassAccess | undefined = await db('user_classes')
      .where({
        user_id: authenticatedReq.user.id,
        class_id: lesson.class_id,
        is_active: true
      })
      .first();

    if (!userClass || userClass.role !== 'teacher') {
      return res.status(403).json({ error: 'Access denied to this lesson' });
    }

    // Prepare update data
    const updateData: any = {
      ...updates,
      updated_at: new Date()
    };

    if (updates.lesson_date) {
      updateData.lesson_date = new Date(updates.lesson_date);
    }

    if (updates.learning_objectives) {
      updateData.learning_objectives = JSON.stringify(updates.learning_objectives);
    }

    const [updatedLesson] = await db('lessons')
      .where('id', id)
      .update(updateData)
      .returning('*');

    res.json(updatedLesson);
  } catch (error) {
    logger.error('Error updating lesson:', error);
    res.status(500).json({ error: 'Failed to update lesson' });
  }
});

// Delete lesson (soft delete - teachers only)
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { id } = req.params;

    // Check if user is a teacher
    if (authenticatedReq.user.user_type !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can delete lessons' });
    }

    // Get the lesson to verify ownership
    const lesson = await db('lessons')
      .where('id', id)
      .where('is_active', true)
      .first();

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Verify teacher has access to this lesson's class
    const userClass: UserClassAccess | undefined = await db('user_classes')
      .where({
        user_id: authenticatedReq.user.id,
        class_id: lesson.class_id,
        is_active: true
      })
      .first();

    if (!userClass || userClass.role !== 'teacher') {
      return res.status(403).json({ error: 'Access denied to this lesson' });
    }

    // Soft delete the lesson
    await db('lessons')
      .where('id', id)
      .update({
        is_active: false,
        updated_at: new Date()
      });

    res.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    logger.error('Error deleting lesson:', error);
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
});

export default router; 
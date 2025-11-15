import express, { NextFunction, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import logger from '../shared/utils/logger';
import { LessonService } from '../services/lessonService';
import { LessonRepository } from '../repositories/lessonRepository';
import db from '../config/database';
import {
  CreateLessonInstanceRequest,
  LessonInstanceQueryParams,
  UpdateLessonInstanceRequest,
  UpdateLessonStatusRequest,
} from '../types/lesson';
import { authenticateMiddleware } from '../shared/middleware/authenticateMiddleware';
import { isAuthenticatedRequest } from '../shared/middleware/auth';
import type { AuthenticatedUser } from '../types/user';

const router = express.Router();
const lessonRepository = new LessonRepository(db);
const lessonService = new LessonService(lessonRepository);

router.use(authenticateMiddleware);

const parsePagination = (query: LessonInstanceQueryParams) => {
  const page = query.page && query.page > 0 ? query.page : 1;
  const limit = query.limit && query.limit > 0 ? query.limit : 20;
  return { page, limit };
};

const requireCurrentUser = (req: Request, res: Response): AuthenticatedUser | undefined => {
  if (!isAuthenticatedRequest(req)) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  return req.user;
};

router.get('/class/:classId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { classId } = req.params;
    if (!classId) {
      res.status(400).json({ error: 'Class ID is required' });
      return;
    }

    const currentUser = requireCurrentUser(req, res);
    if (!currentUser) {
      return;
    }

    const status = typeof req.query.status === 'string' ? (req.query.status as LessonInstanceQueryParams['status']) : undefined;
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;
    const pageQuery = typeof req.query.page === 'string' ? Number(req.query.page) : undefined;
    const limitQuery = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
    const rawParams: LessonInstanceQueryParams = {
      status,
      from,
      to,
      page: pageQuery,
      limit: limitQuery,
    };
    const { page, limit } = parsePagination(rawParams);
    const queryParams: LessonInstanceQueryParams = { ...rawParams, page, limit };
    const lessons = await lessonService.listLessonInstancesForClass(
      classId,
      currentUser,
      queryParams,
    );

    const total = await lessonService.countLessonInstancesForClass(
      classId,
      currentUser,
      queryParams,
    );

    res.json({
      lessons,
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    logger.error('Error fetching lessons:', error);
    next(error);
  }
});

router.get('/admin/lessons', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireCurrentUser(req, res);
    if (!currentUser) {
      return;
    }

    const status = typeof req.query.status === 'string' ? (req.query.status as LessonInstanceQueryParams['status']) : undefined;
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;
    const classId = typeof req.query.class_id === 'string' ? req.query.class_id : undefined;
    const teacherId = typeof req.query.teacher_id === 'string' ? req.query.teacher_id : undefined;
    const subjectId = typeof req.query.subject_id === 'string' ? req.query.subject_id : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const pageQuery = typeof req.query.page === 'string' ? Number(req.query.page) : undefined;
    const limitQuery = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;

    const rawParams: LessonInstanceQueryParams = {
      status,
      from,
      to,
      class_id: classId,
      teacher_id: teacherId,
      subject_id: subjectId,
      search,
      page: pageQuery,
      limit: limitQuery,
    };

    const { page, limit } = parsePagination(rawParams);
    const params: LessonInstanceQueryParams = { ...rawParams, page, limit };

    const dashboard = await lessonService.getAdminLessonsDashboard(currentUser, params);
    res.json(dashboard);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Admin access required')) {
      res.status(403).json({ error: error.message });
      return;
    }
    logger.error('Error fetching admin lesson dashboard:', error);
    next(error);
  }
});

router.get('/teacher/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireCurrentUser(req, res);
    if (!currentUser) {
      return;
    }

    const { date } = req.query;
    if (date && typeof date !== 'string') {
      res.status(400).json({ error: 'date must be a string in YYYY-MM-DD format' });
      return;
    }

    const dashboard = await lessonService.getTeacherDailyLessons(currentUser, date);
    res.json(dashboard);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Teacher access required')) {
      res.status(403).json({ error: error.message });
      return;
    }
    if (error instanceof Error && error.message.includes('Invalid date')) {
      res.status(400).json({ error: error.message });
      return;
    }
    logger.error('Error fetching teacher lesson dashboard:', error);
    next(error);
  }
});

router.get('/teacher/lessons/:lessonId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.params.lessonId) {
      res.status(400).json({ error: 'Lesson ID is required' });
      return;
    }

    const currentUser = requireCurrentUser(req, res);
    if (!currentUser) {
      return;
    }

    const lesson = await lessonService.getTeacherLessonSummary(req.params.lessonId, currentUser);
    res.json(lesson);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof Error && error.message.includes('Teacher access required')) {
      res.status(403).json({ error: error.message });
      return;
    }
    logger.error('Error fetching teacher lesson summary:', error);
    next(error);
  }
});

router.post('/teacher/lessons/:lessonId/status', [
  body('status').isIn(['in_session', 'completed']).withMessage('status must be in_session or completed'),
  body('actual_start').optional().isISO8601().withMessage('actual_start must be ISO8601'),
  body('actual_end').optional().isISO8601().withMessage('actual_end must be ISO8601'),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.params.lessonId) {
      res.status(400).json({ error: 'Lesson ID is required' });
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const currentUser = requireCurrentUser(req, res);
    if (!currentUser) {
      return;
    }

    const payload: UpdateLessonStatusRequest = req.body;
    const updated = await lessonService.updateTeacherLessonStatus(
      req.params.lessonId,
      payload,
      currentUser,
    );

    res.json({
      message: `Lesson status updated to ${payload.status}`,
      lesson: updated,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Teacher access required')) {
        res.status(403).json({ error: error.message });
        return;
      }
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message.includes('Invalid date')) {
        res.status(400).json({ error: error.message });
        return;
      }
    }

    logger.error('Error updating teacher lesson status:', error);
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  if (!req.params.id) {
    res.status(400).json({ error: 'Lesson ID is required' });
    return;
  }

  try {
    const currentUser = requireCurrentUser(req, res);
    if (!currentUser) {
      return;
    }

    const lesson = await lessonService.getLessonInstanceById(
      req.params.id,
      currentUser,
    );
    res.json(lesson);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof Error && error.message.includes('Access denied')) {
      res.status(403).json({ error: error.message });
      return;
    }
    logger.error('Error fetching lesson instance:', error);
    next(error);
  }
});

router.post('/', [
  body('class_subject_id').isUUID().withMessage('class_subject_id is required'),
  body('scheduled_start').isISO8601().withMessage('scheduled_start must be ISO8601'),
  body('scheduled_end').isISO8601().withMessage('scheduled_end must be ISO8601'),
  body('schedule_slot_id').optional().isUUID(),
  body('objectives').optional().isArray(),
  body('materials').optional().isArray(),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const currentUser = requireCurrentUser(req, res);
    if (!currentUser) {
      return;
    }

    const payload: CreateLessonInstanceRequest = req.body;
    const lesson = await lessonService.createLessonInstance(payload, currentUser);
    res.status(201).json(lesson);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Admin access required') || error.message.includes('Access denied')) {
        res.status(403).json({ error: error.message });
        return;
      }
    }
    logger.error('Error creating lesson instance:', error);
    next(error);
  }
});

router.patch('/:id', [
  body('scheduled_start').optional().isISO8601(),
  body('scheduled_end').optional().isISO8601(),
  body('schedule_slot_id').optional({ nullable: true }).isUUID(),
  body('status').optional().isIn(['planned', 'in_session', 'completed', 'cancelled']),
  body('objectives').optional().isArray(),
  body('materials').optional().isArray(),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.params.id) {
      res.status(400).json({ error: 'Lesson ID is required' });
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const currentUser = requireCurrentUser(req, res);
    if (!currentUser) {
      return;
    }

    const payload: UpdateLessonInstanceRequest = req.body;
    const updated = await lessonService.updateLessonInstance(
      req.params.id,
      payload,
      currentUser,
    );
    res.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof Error && error.message.includes('Access denied')) {
      res.status(403).json({ error: error.message });
      return;
    }
    logger.error('Error updating lesson instance:', error);
    next(error);
  }
});

router.post('/:id/cancel', [
  body('reason').optional().isString().isLength({ max: 500 }),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.params.id) {
      res.status(400).json({ error: 'Lesson ID is required' });
      return;
    }

    const currentUser = requireCurrentUser(req, res);
    if (!currentUser) {
      return;
    }

    await lessonService.cancelLessonInstance(
      req.params.id,
      currentUser,
      req.body.reason,
    );
    res.json({ message: 'Lesson instance cancelled' });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof Error && error.message.includes('Access denied')) {
      res.status(403).json({ error: error.message });
      return;
    }
    logger.error('Error cancelling lesson instance:', error);
    next(error);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.params.id) {
      res.status(400).json({ error: 'Lesson ID is required' });
      return;
    }

    const currentUser = requireCurrentUser(req, res);
    if (!currentUser) {
      return;
    }

    await lessonService.deleteLessonInstance(
      req.params.id,
      currentUser,
    );
    res.json({ message: 'Lesson instance deleted' });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof Error && error.message.includes('Access denied')) {
      res.status(403).json({ error: error.message });
      return;
    }
    logger.error('Error deleting lesson instance:', error);
    next(error);
  }
});

export default router;
 
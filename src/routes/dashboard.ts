import express, { NextFunction, Request, Response } from 'express';
import logger from '../shared/utils/logger';
import { LessonService } from '../services/lessonService';
import { LessonRepository } from '../repositories/lessonRepository';
import db from '../config/database';
import { authenticateMiddleware } from '../shared/middleware/authenticateMiddleware';
import { isAuthenticatedRequest } from '../shared/middleware/auth';
import type { AuthenticatedUser } from '../types/user';

const router = express.Router();
const lessonRepository = new LessonRepository(db);
const lessonService = new LessonService(lessonRepository);

router.use(authenticateMiddleware);

const requireCurrentUser = (req: Request, res: Response): AuthenticatedUser | undefined => {
  if (!isAuthenticatedRequest(req)) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  return req.user;
};

router.get('/lessons', async (req: Request, res: Response, next: NextFunction) => {
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

    const userType = currentUser.user_type;
    const role = currentUser.role;

    if (userType === 'teacher' || role === 'admin') {
      const dashboard = await lessonService.getTeacherDailyLessons(currentUser, date as string | undefined);
      res.json(dashboard);
      return;
    }

    let isoDate: string;

    if (typeof date === 'string') {
      const parsed = new Date(date);
      if (Number.isNaN(parsed.getTime())) {
        res.status(400).json({ error: 'date must be a string in YYYY-MM-DD format' });
        return;
      }
      isoDate = parsed.toISOString().slice(0, 10);
    } else {
      const now = new Date();
      isoDate = now.toISOString().slice(0, 10);
    }

    res.json({
      date: isoDate,
      lessons: [],
      total: 0,
    });
  } catch (error) {
    logger.error('Error fetching dashboard lessons:', error);
    next(error);
  }
});

export default router;

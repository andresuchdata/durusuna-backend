import express, { NextFunction, Request, Response } from 'express';
import db from '../config/database';
import logger from '../shared/utils/logger';
import { SubjectRepository } from '../repositories/subjectRepository';
import { SubjectService } from '../services/subjectService';
import { authenticateMiddleware } from '../shared/middleware/authenticateMiddleware';
import { isAuthenticatedRequest } from '../shared/middleware/auth';

const router = express.Router();
const subjectRepository = new SubjectRepository(db);
const subjectService = new SubjectService(subjectRepository);

router.use(authenticateMiddleware);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isAuthenticatedRequest(req)) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const subjects = await subjectService.getSchoolSubjects(req.user);
    res.json({ subjects });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Admin access required')) {
        res.status(403).json({ error: error.message });
        return;
      }

      if (error.message.includes('Admin must be associated with a school')) {
        res.status(400).json({ error: error.message });
        return;
      }
    }

    logger.error('Error fetching school subjects:', error);
    next(error);
  }
});

export default router;

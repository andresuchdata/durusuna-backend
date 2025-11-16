import express, { Request, Response } from 'express';
import { authenticate } from '../shared/middleware/auth';
import { AuthenticatedRequest } from '../types/auth';
import logger from '../shared/utils/logger';
import db from '../shared/database/connection';
import { AcademicService } from '../services/academicService';

const router = express.Router();
const academicService = new AcademicService(db);

/**
 * @route GET /api/academic/current-period
 * @desc Get current academic period for user's school
 * @access Private
 */
router.get('/current-period', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const schoolId = authenticatedReq.user.school_id;

    if (!schoolId) {
      return res.status(400).json({
        error: 'User has no school assigned',
      });
    }

    const result = await academicService.getCurrentAcademicPeriodForSchool(schoolId);

    if (!result) {
      return res.status(404).json({ 
        error: 'No current academic period found for this school' 
      });
    }

    res.json(result);
  } catch (error) {
    logger.error('Error fetching current academic period:', error);
    res.status(500).json({ error: 'Failed to fetch current academic period' });
  }
});

export default router;

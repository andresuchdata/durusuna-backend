import express, { Request, Response } from 'express';
import { authenticate } from '../shared/middleware/auth';
import { AuthenticatedRequest } from '../types/auth';
import logger from '../shared/utils/logger';
import db from '../shared/database/connection';

const router = express.Router();

/**
 * @route GET /api/academic/current-period
 * @desc Get current academic period for user's school
 * @access Private
 */
router.get('/current-period', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const schoolId = authenticatedReq.user.school_id;

    // Get current academic period with academic year
    const result = await db('academic_periods')
      .join('academic_years', 'academic_periods.academic_year_id', 'academic_years.id')
      .where('academic_years.school_id', schoolId)
      .where('academic_periods.is_current', true)
      .where('academic_years.is_current', true)
      .select(
        'academic_periods.id as period_id',
        'academic_periods.name as period_name',
        'academic_periods.sequence',
        'academic_periods.start_date as period_start',
        'academic_periods.end_date as period_end',
        'academic_years.id as year_id',
        'academic_years.name as year_name',
        'academic_years.start_date as year_start',
        'academic_years.end_date as year_end'
      )
      .first();

    if (!result) {
      return res.status(404).json({ 
        error: 'No current academic period found for this school' 
      });
    }

    res.json({
      academic_year: {
        id: result.year_id,
        name: result.year_name,
        start_date: result.year_start,
        end_date: result.year_end
      },
      current_period: {
        id: result.period_id,
        name: result.period_name,
        sequence: result.sequence,
        start_date: result.period_start,
        end_date: result.period_end
      }
    });
  } catch (error) {
    logger.error('Error fetching current academic period:', error);
    res.status(500).json({ error: 'Failed to fetch current academic period' });
  }
});

export default router;

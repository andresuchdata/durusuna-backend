import express, { Response } from 'express';
import { EnrollmentService } from '../services/enrollmentService';
import { EnrollmentRepository } from '../repositories/enrollmentRepository';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/auth';
import logger from '../shared/utils/logger';
import db from '../shared/database/connection';

const router = express.Router();

// Initialize service layer
const enrollmentRepository = new EnrollmentRepository(db);
const enrollmentService = new EnrollmentService(enrollmentRepository);

/**
 * @route GET /api/enrollments/my-offerings
 * @desc Get subject offerings for current student based on their enrollments
 * @access Private (Students only)
 */
router.get('/my-offerings', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const offerings = await enrollmentService.getStudentSubjectOfferings(req.user);
    res.json({ offerings });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }
    logger.error('Error fetching student subject offerings:', error);
    res.status(500).json({ error: 'Failed to fetch subject offerings' });
  }
});

/**
 * @route GET /api/enrollments/children-offerings
 * @desc Get subject offerings for parent's children based on their enrollments
 * @access Private (Parents only)
 */
router.get('/children-offerings', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const offerings = await enrollmentService.getParentChildrenSubjectOfferings(req.user);
    res.json({ offerings });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }
    logger.error('Error fetching parent children subject offerings:', error);
    res.status(500).json({ error: 'Failed to fetch subject offerings' });
  }
});

/**
 * @route POST /api/enrollments
 * @desc Enroll a student in a class offering
 * @access Private (Admins and Teachers only)
 */
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { student_id, class_offering_id, notes } = req.body;

    if (!student_id || !class_offering_id) {
      return res.status(400).json({ 
        error: 'Student ID and Class Offering ID are required' 
      });
    }

    const enrollmentId = await enrollmentService.enrollStudent(
      student_id,
      class_offering_id,
      req.user,
      notes
    );

    res.status(201).json({ 
      message: 'Student enrolled successfully',
      enrollment_id: enrollmentId
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }
    if (error instanceof Error && error.message.includes('already enrolled')) {
      return res.status(409).json({ error: error.message });
    }
    logger.error('Error enrolling student:', error);
    res.status(500).json({ error: 'Failed to enroll student' });
  }
});

/**
 * @route PUT /api/enrollments/:id/withdraw
 * @desc Withdraw a student from a class offering
 * @access Private (Admins and Teachers only)
 */
router.put('/:id/withdraw', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { withdrawal_reason } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Enrollment ID is required' });
    }

    await enrollmentService.withdrawStudent(id, req.user, withdrawal_reason);

    res.json({ message: 'Student withdrawn successfully' });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }
    logger.error('Error withdrawing student:', error);
    res.status(500).json({ error: 'Failed to withdraw student' });
  }
});

export default router;

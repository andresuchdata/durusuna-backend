import express, { Response } from 'express';
import { ClassOfferingService } from '../services/classOfferingService';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/auth';
import logger from '../shared/utils/logger';
import db from '../shared/database/connection';

const router = express.Router();

// Initialize service layer
const classOfferingService = new ClassOfferingService(db);

/**
 * @route GET /api/class-offerings/all
 * @desc Get all class offerings for admin users
 * @access Private (Admin only)
 */
router.get('/all', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const offerings = await classOfferingService.getAllClassOfferings(req.user);
    res.json({ offerings });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }
    logger.error('Error fetching all class offerings:', error);
    res.status(500).json({ error: 'Failed to fetch class offerings' });
  }
});

/**
 * @route GET /api/class-offerings/:id
 * @desc Get class offering details by ID
 * @access Private
 */
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Class offering ID is required' });
    }

    const offering = await classOfferingService.getClassOfferingById(id, req.user);

    if (!offering) {
      return res.status(404).json({ error: 'Class offering not found' });
    }

    res.json({ offering });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }
    logger.error('Error fetching class offering:', error);
    res.status(500).json({ error: 'Failed to fetch class offering' });
  }
});

/**
 * @route POST /api/class-offerings
 * @desc Create a new class offering
 * @access Private (Admin only)
 */
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      class_id, 
      subject_id, 
      primary_teacher_id, 
      hours_per_week, 
      room, 
      schedule 
    } = req.body;

    // Validate required fields
    if (!class_id || !subject_id || !primary_teacher_id || !hours_per_week) {
      return res.status(400).json({ 
        error: 'Class ID, Subject ID, Primary Teacher ID, and Hours per Week are required' 
      });
    }

    const offeringId = await classOfferingService.createClassOffering(
      class_id,
      subject_id,
      primary_teacher_id,
      parseInt(hours_per_week),
      room,
      schedule,
      req.user
    );

    res.status(201).json({ 
      message: 'Class offering created successfully',
      offering_id: offeringId
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }
    logger.error('Error creating class offering:', error);
    res.status(500).json({ error: 'Failed to create class offering' });
  }
});

export default router;

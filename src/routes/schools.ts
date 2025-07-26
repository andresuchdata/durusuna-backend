import express, { Request, Response } from 'express';
import { ZodError } from 'zod';
import { SchoolService } from '../services/schoolService';
import { SchoolRepository } from '../repositories/schoolRepository';
import { authenticate, authorize } from '../shared/middleware/auth';
import logger from '../shared/utils/logger';
import db from '../shared/database/connection';

const router = express.Router();

// Initialize service layer
const schoolRepository = new SchoolRepository(db);
const schoolService = new SchoolService(schoolRepository);

/**
 * @route GET /api/schools
 * @desc Get all schools (admin only)
 * @access Private
 */
router.get('/', authenticate, authorize(['admin']), async (req: any, res: Response) => {
  try {
    const schools = await schoolService.getAllSchools();
    res.json(schools);
  } catch (error) {
    logger.error('Error fetching schools:', error);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

/**
 * @route GET /api/schools/:id
 * @desc Get school by ID
 * @access Private
 */
router.get('/:id', authenticate, async (req: any, res: Response) => {
  try {
    const school = await schoolService.getSchoolById(req.params.id, req.user);
    res.json(school);
  } catch (error) {
    if (error instanceof Error && error.message === 'School not found') {
      return res.status(404).json({ error: error.message });
    }
    
    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({ error: error.message });
    }
    
    logger.error('Error fetching school:', error);
    res.status(500).json({ error: 'Failed to fetch school' });
  }
});

/**
 * @route POST /api/schools
 * @desc Create new school
 * @access Private (admin only)
 */
router.post('/', authenticate, authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const school = await schoolService.createSchool(req.body);
    res.status(201).json({
      message: 'School created successfully',
      school
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
    
    logger.error('Error creating school:', error);
    res.status(500).json({ error: 'Failed to create school' });
  }
});

/**
 * @route PUT /api/schools/:id
 * @desc Update school
 * @access Private (admin only)
 */
router.put('/:id', authenticate, authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const school = await schoolService.updateSchool(req.params.id, req.body);
    res.json({
      message: 'School updated successfully',
      school
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
    
    if (error instanceof Error && error.message === 'School not found') {
      return res.status(404).json({ error: error.message });
    }
    
    logger.error('Error updating school:', error);
    res.status(500).json({ error: 'Failed to update school' });
  }
});

export default router; 
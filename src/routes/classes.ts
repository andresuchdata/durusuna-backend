import express, { Request, Response } from 'express';
import { ZodError } from 'zod';
import { ClassService } from '../services/classService';
import { ClassRepository } from '../repositories/classRepository';
import { authenticate, authorize } from '../shared/middleware/auth';
import logger from '../shared/utils/logger';
import db from '../shared/database/connection';

const router = express.Router();

// Initialize service layer
const classRepository = new ClassRepository(db);
const classService = new ClassService(classRepository);

/**
 * @route GET /api/classes
 * @desc Get classes for current user
 * @access Private
 */
router.get('/', authenticate, async (req: any, res: Response) => {
  try {
    const classes = await classService.getAllClasses(req.user);
    res.json(classes);
  } catch (error) {
    logger.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

/**
 * @route GET /api/classes/:id
 * @desc Get class by ID
 * @access Private
 */
router.get('/:id', authenticate, async (req: any, res: Response) => {
  try {
    const classItem = await classService.getClassById(req.params.id, req.user);
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
 * @route POST /api/classes
 * @desc Create new class
 * @access Private (teachers and admins)
 */
router.post('/', authenticate, authorize([], ['teacher']), async (req: any, res: Response) => {
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
router.put('/:id', authenticate, authorize([], ['teacher']), async (req: any, res: Response) => {
  try {
    const classItem = await classService.updateClass(req.params.id, req.body, req.user);
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
 * @desc Get students in a class
 * @access Private
 */
router.get('/:id/students', authenticate, async (req: any, res: Response) => {
  try {
    const students = await classService.getClassStudents(req.params.id, req.user);
    res.json(students);
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
 * @desc Get teachers in a class
 * @access Private
 */
router.get('/:id/teachers', authenticate, async (req: any, res: Response) => {
  try {
    const teachers = await classService.getClassTeachers(req.params.id, req.user);
    res.json(teachers);
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

export default router; 
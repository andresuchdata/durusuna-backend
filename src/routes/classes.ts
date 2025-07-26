import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import db from '../config/database';
import { authenticate } from '../middleware/auth';
import logger from '../utils/logger';
import { AuthenticatedRequest } from '../types/auth';

const router = express.Router();

interface ClassData {
  id: string;
  name: string;
  subject: string;
  description?: string;
  school_id: string;
  teacher_id: string;
  grade_level?: string;
  room_number?: string;
  schedule?: Record<string, any>;
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
}

interface UserClassData {
  id: string;
  user_id: string;
  class_id: string;
  role: 'student' | 'teacher' | 'assistant';
  joined_at: Date;
  is_active: boolean;
}

// Get classes for current user
router.get('/', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const classes = await db('classes')
      .join('user_classes', 'classes.id', 'user_classes.class_id')
      .where('user_classes.user_id', authenticatedReq.user.id)
      .where('user_classes.is_active', true)
      .where('classes.is_active', true)
      .select(
        'classes.id', 
        'classes.name', 
        'classes.subject', 
        'classes.description',
        'classes.grade_level',
        'classes.room_number',
        'classes.created_at',
        'user_classes.role as user_role'
      )
      .orderBy('classes.name', 'asc');

    res.json(classes);
  } catch (error) {
    logger.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// Get class by ID
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { id } = req.params;

    // Check if user has access to this class
    const userClass = await db('user_classes')
      .where({
        user_id: authenticatedReq.user.id,
        class_id: id,
        is_active: true
      })
      .first();

    if (!userClass) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    const classData = await db('classes')
      .leftJoin('users as teacher', 'classes.teacher_id', 'teacher.id')
      .leftJoin('schools', 'classes.school_id', 'schools.id')
      .where('classes.id', id)
      .where('classes.is_active', true)
      .select(
        'classes.id',
        'classes.name',
        'classes.subject',
        'classes.description',
        'classes.grade_level',
        'classes.room_number',
        'classes.schedule',
        'classes.created_at',
        'classes.updated_at',
        'teacher.id as teacher_id',
        'teacher.first_name as teacher_first_name',
        'teacher.last_name as teacher_last_name',
        'teacher.email as teacher_email',
        'schools.name as school_name'
      )
      .first();

    if (!classData) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Get class participants
    const participants = await db('user_classes')
      .join('users', 'user_classes.user_id', 'users.id')
      .where('user_classes.class_id', id)
      .where('user_classes.is_active', true)
      .where('users.is_active', true)
      .select(
        'users.id',
        'users.first_name',
        'users.last_name',
        'users.email',
        'users.avatar_url',
        'users.user_type',
        'user_classes.role',
        'user_classes.joined_at'
      )
      .orderBy('user_classes.role', 'desc') // Teachers first
      .orderBy('users.last_name', 'asc');

    const formattedClass = {
      id: classData.id,
      name: classData.name,
      subject: classData.subject,
      description: classData.description,
      grade_level: classData.grade_level,
      room_number: classData.room_number,
      schedule: classData.schedule ? JSON.parse(classData.schedule) : null,
      created_at: classData.created_at,
      updated_at: classData.updated_at,
      teacher: classData.teacher_id ? {
        id: classData.teacher_id,
        first_name: classData.teacher_first_name,
        last_name: classData.teacher_last_name,
        email: classData.teacher_email
      } : null,
      school_name: classData.school_name,
      participants: participants.map(p => ({
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email,
        avatar_url: p.avatar_url,
        user_type: p.user_type,
        role: p.role,
        joined_at: p.joined_at
      })),
      user_role: userClass.role
    };

    res.json(formattedClass);
  } catch (error) {
    logger.error('Error fetching class:', error);
    res.status(500).json({ error: 'Failed to fetch class' });
  }
});

// Create new class (teachers only)
router.post('/', [
  authenticate,
  body('name').notEmpty().withMessage('Class name is required').trim(),
  body('subject').notEmpty().withMessage('Subject is required').trim(),
  body('description').optional().trim(),
  body('grade_level').optional().trim(),
  body('room_number').optional().trim()
], async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user is a teacher
    if (authenticatedReq.user.user_type !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can create classes' });
    }

    const { name, subject, description, grade_level, room_number } = req.body;

    const [newClass] = await db('classes')
      .insert({
        name,
        subject,
        description,
        grade_level,
        room_number,
        school_id: authenticatedReq.user.school_id,
        teacher_id: authenticatedReq.user.id,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    // Add teacher as class participant
    await db('user_classes').insert({
      user_id: authenticatedReq.user.id,
      class_id: newClass.id,
      role: 'teacher',
      joined_at: new Date(),
      is_active: true
    });

    res.status(201).json(newClass);
  } catch (error) {
    logger.error('Error creating class:', error);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

export default router; 
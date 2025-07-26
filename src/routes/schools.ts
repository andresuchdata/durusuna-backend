import express, { Request, Response } from 'express';
import { body, validationResult, ValidationError } from 'express-validator';
import db from '../config/database';
import { authenticate } from '../middleware/auth';
import logger from '../utils/logger';
import { AuthenticatedRequest } from '../types/auth';

const router = express.Router();

interface School {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  settings?: Record<string, any>;
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
}

interface CreateSchoolRequest {
  name: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
}

// Get all schools
router.get('/', async (req: Request, res: Response) => {
  try {
    const schools = await db('schools')
      .select('id', 'name', 'address', 'phone', 'email', 'created_at')
      .orderBy('name', 'asc');

    res.json(schools);
  } catch (error) {
    logger.error('Error fetching schools:', error);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

// Get school by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const school = await db('schools')
      .select('id', 'name', 'address', 'phone', 'email', 'created_at')
      .where('id', id)
      .first();

    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.json(school);
  } catch (error) {
    logger.error('Error fetching school:', error);
    res.status(500).json({ error: 'Failed to fetch school' });
  }
});

// Create new school (admin only)
router.post('/', [
  authenticate,
  body('name').notEmpty().withMessage('School name is required').trim(),
  body('address').notEmpty().withMessage('Address is required').trim(),
  body('phone').optional().trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('website').optional().isURL().withMessage('Invalid website URL')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const { name, address, phone, email, website }: CreateSchoolRequest = req.body;

    const [school] = await db('schools')
      .insert({
        name,
        address,
        phone,
        email,
        website,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning(['id', 'name', 'address', 'phone', 'email', 'website', 'created_at']);

    res.status(201).json(school);
  } catch (error) {
    logger.error('Error creating school:', error);
    res.status(500).json({ error: 'Failed to create school' });
  }
});

// Update school (admin only)
router.put('/:id', [
  authenticate,
  body('name').optional().notEmpty().withMessage('School name cannot be empty').trim(),
  body('address').optional().notEmpty().withMessage('Address cannot be empty').trim(),
  body('phone').optional().trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('website').optional().isURL().withMessage('Invalid website URL')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const { id } = req.params;
    const updates: Partial<CreateSchoolRequest> = req.body;
    
    // Add updated_at timestamp
    const updateData = {
      ...updates,
      updated_at: new Date()
    };

    const [school] = await db('schools')
      .where('id', id)
      .update(updateData)
      .returning(['id', 'name', 'address', 'phone', 'email', 'website', 'updated_at']);

    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.json(school);
  } catch (error) {
    logger.error('Error updating school:', error);
    res.status(500).json({ error: 'Failed to update school' });
  }
});

export default router; 
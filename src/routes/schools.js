const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate: auth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get all schools
router.get('/', async (req, res) => {
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
router.get('/:id', async (req, res) => {
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
  auth,
  body('name').notEmpty().withMessage('School name is required').trim(),
  body('address').notEmpty().withMessage('Address is required').trim(),
  body('phone').optional().trim(),
  body('email').optional().isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const { name, address, phone, email } = req.body;

    const [school] = await db('schools')
      .insert({
        name,
        address,
        phone,
        email,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning(['id', 'name', 'address', 'phone', 'email', 'created_at']);

    res.status(201).json(school);
  } catch (error) {
    logger.error('Error creating school:', error);
    res.status(500).json({ error: 'Failed to create school' });
  }
});

module.exports = router; 
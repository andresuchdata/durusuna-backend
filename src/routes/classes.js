const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate: auth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get classes for current user
router.get('/', auth, async (req, res) => {
  try {
    const classes = await db('classes')
      .join('user_classes', 'classes.id', 'user_classes.class_id')
      .where('user_classes.user_id', req.user.id)
      .select('classes.id', 'classes.name', 'classes.subject', 'classes.description', 'classes.created_at');

    res.json(classes);
  } catch (error) {
    logger.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// Get class by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user has access to this class
    const userClass = await db('user_classes')
      .where({
        user_id: req.user.id,
        class_id: id
      })
      .first();

    if (!userClass) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    const classData = await db('classes')
      .where('id', id)
      .select('id', 'name', 'subject', 'description', 'created_at')
      .first();

    if (!classData) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json(classData);
  } catch (error) {
    logger.error('Error fetching class:', error);
    res.status(500).json({ error: 'Failed to fetch class' });
  }
});

module.exports = router; 
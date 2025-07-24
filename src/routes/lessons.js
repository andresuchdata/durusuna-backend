const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate: auth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get lessons for a class
router.get('/class/:classId', auth, async (req, res) => {
  try {
    const { classId } = req.params;

    // Check if user has access to this class
    const userClass = await db('user_classes')
      .where({
        user_id: req.user.id,
        class_id: classId
      })
      .first();

    if (!userClass) {
      return res.status(403).json({ error: 'Access denied to this class' });
    }

    const lessons = await db('lessons')
      .where('class_id', classId)
      .select('id', 'title', 'content', 'lesson_date', 'created_at')
      .orderBy('lesson_date', 'desc');

    res.json(lessons);
  } catch (error) {
    logger.error('Error fetching lessons:', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

// Get lesson by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const lesson = await db('lessons')
      .where('id', id)
      .select('id', 'title', 'content', 'lesson_date', 'class_id', 'created_at')
      .first();

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Check if user has access to this lesson's class
    const userClass = await db('user_classes')
      .where({
        user_id: req.user.id,
        class_id: lesson.class_id
      })
      .first();

    if (!userClass) {
      return res.status(403).json({ error: 'Access denied to this lesson' });
    }

    res.json(lesson);
  } catch (error) {
    logger.error('Error fetching lesson:', error);
    res.status(500).json({ error: 'Failed to fetch lesson' });
  }
});

module.exports = router; 
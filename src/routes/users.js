const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate: auth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get current user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await db('users')
      .select('id', 'email', 'first_name', 'last_name', 'role', 'school_id', 'created_at')
      .where('id', req.user.id)
      .first();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get school info if user has one
    if (user.school_id) {
      const school = await db('schools')
        .select('name', 'address')
        .where('id', user.school_id)
        .first();
      user.school = school;
    }

    res.json(user);
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update user profile
router.put('/profile', [
  auth,
  body('first_name').optional().isLength({ min: 1 }).trim(),
  body('last_name').optional().isLength({ min: 1 }).trim(),
  body('email').optional().isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { first_name, last_name, email } = req.body;
    const updateData = {};

    if (first_name) updateData.first_name = first_name;
    if (last_name) updateData.last_name = last_name;
    if (email) updateData.email = email;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateData.updated_at = new Date();

    await db('users')
      .where('id', req.user.id)
      .update(updateData);

    const updatedUser = await db('users')
      .select('id', 'email', 'first_name', 'last_name', 'role', 'school_id')
      .where('id', req.user.id)
      .first();

    res.json(updatedUser);
  } catch (error) {
    logger.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// Change password
router.put('/password', [
  auth,
  body('current_password').notEmpty().withMessage('Current password is required'),
  body('new_password').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { current_password, new_password } = req.body;

    // Get current user
    const user = await db('users')
      .select('password')
      .where('id', req.user.id)
      .first();

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(new_password, saltRounds);

    // Update password
    await db('users')
      .where('id', req.user.id)
      .update({
        password: hashedNewPassword,
        updated_at: new Date()
      });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    logger.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get users by school (admin only)
router.get('/school/:schoolId', auth, async (req, res) => {
  try {
    const { schoolId } = req.params;

    // Check if user is admin or belongs to the school
    if (req.user.role !== 'admin' && req.user.school_id !== schoolId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const users = await db('users')
      .select('id', 'email', 'first_name', 'last_name', 'role', 'created_at')
      .where('school_id', schoolId)
      .orderBy('last_name', 'asc');

    res.json(users);
  } catch (error) {
    logger.error('Error fetching school users:', error);
    res.status(500).json({ error: 'Failed to fetch school users' });
  }
});

/**
 * @route GET /api/users/contacts
 * @desc Get contacts for messaging (users in same school)
 * @access Private
 */
router.get('/contacts', auth, async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Get current user's school
    const currentUser = await db('users')
      .where('id', req.user.id)
      .select('school_id', 'user_type')
      .first();

    if (!currentUser || !currentUser.school_id) {
      return res.status(400).json({ error: 'User not associated with a school' });
    }

    // Build query for users in same school (excluding current user)
    let query = db('users')
      .where('school_id', currentUser.school_id)
      .where('id', '!=', req.user.id)
      .where('is_active', true)
      .select(
        'id',
        'first_name',
        'last_name',
        'email',
        'avatar_url',
        'user_type',
        'role',
        'last_login_at'
      );

    // Add search filter if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = query.where(function() {
        this.where('first_name', 'ilike', searchTerm)
            .orWhere('last_name', 'ilike', searchTerm)
            .orWhere('email', 'ilike', searchTerm)
            .orWhere(db.raw("CONCAT(first_name, ' ', last_name)"), 'ilike', searchTerm);
      });
    }

    // Apply pagination and ordering
    const users = await query
      .orderBy('last_login_at', 'desc')
      .orderBy('first_name', 'asc')
      .limit(limit)
      .offset(offset);

    // Format response
    const formattedUsers = users.map(user => ({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      avatar_url: user.avatar_url,
      user_type: user.user_type,
      role: user.role,
      school_id: user.school_id,
      is_active: true,
      last_active_at: user.last_login_at,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    res.json({
      contacts: formattedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: users.length === parseInt(limit)
      },
      totalContacts: formattedUsers.length
    });

  } catch (error) {
    logger.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

/**
 * @route GET /api/users/search
 * @desc Search users for messaging
 * @access Private
 */
router.get('/search', auth, async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ 
        error: 'Search query must be at least 2 characters long' 
      });
    }

    // Get current user's school
    const currentUser = await db('users')
      .where('id', req.user.id)
      .select('school_id')
      .first();

    if (!currentUser || !currentUser.school_id) {
      return res.status(400).json({ error: 'User not associated with a school' });
    }

    const searchTerm = `%${q.trim()}%`;
    
    const users = await db('users')
      .where('school_id', currentUser.school_id)
      .where('id', '!=', req.user.id)
      .where('is_active', true)
      .where(function() {
        this.where('first_name', 'ilike', searchTerm)
            .orWhere('last_name', 'ilike', searchTerm)
            .orWhere('email', 'ilike', searchTerm)
            .orWhere(db.raw("CONCAT(first_name, ' ', last_name)"), 'ilike', searchTerm);
      })
      .select(
        'id',
        'first_name',
        'last_name',
        'email',
        'avatar_url',
        'user_type',
        'role'
      )
      .orderBy('first_name', 'asc')
      .limit(limit);

    const formattedUsers = users.map(user => ({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      avatar_url: user.avatar_url,
      user_type: user.user_type,
      role: user.role,
      school_id: user.school_id,
      is_active: true,
      last_active_at: user.last_login_at,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    res.json({
      users: formattedUsers,
      query: q.trim()
    });

  } catch (error) {
    logger.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

module.exports = router; 
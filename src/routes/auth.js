const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { generateTokenPair, verifyRefreshToken } = require('../utils/jwt');
const { validate, registerSchema, loginSchema, passwordResetRequestSchema, passwordResetSchema, profileUpdateSchema } = require('../utils/validation');
const { authenticate, rateLimitSensitive } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', validate(registerSchema), rateLimitSensitive, async (req, res) => {
  const trx = await db.transaction();
  
  try {
    const {
      email,
      password,
      first_name,
      last_name,
      user_type,
      school_id,
      phone,
      date_of_birth,
      student_id,
      employee_id
    } = req.body;

    // Check if email already exists
    const existingUser = await trx('users').where('email', email).first();
    if (existingUser) {
      await trx.rollback();
      return res.status(409).json({
        error: 'Conflict',
        message: 'Email already registered'
      });
    }

    // Verify school exists
    const school = await trx('schools').where({ id: school_id, is_active: true }).first();
    if (!school) {
      await trx.rollback();
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid school ID'
      });
    }

    // Check for duplicate student/employee ID if provided
    if (student_id) {
      const existingStudent = await trx('users')
        .where({ student_id, school_id })
        .first();
      if (existingStudent) {
        await trx.rollback();
        return res.status(409).json({
          error: 'Conflict',
          message: 'Student ID already exists in this school'
        });
      }
    }

    if (employee_id) {
      const existingEmployee = await trx('users')
        .where({ employee_id, school_id })
        .first();
      if (existingEmployee) {
        await trx.rollback();
        return res.status(409).json({
          error: 'Conflict',
          message: 'Employee ID already exists in this school'
        });
      }
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const userId = uuidv4();
    const [newUser] = await trx('users').insert({
      id: userId,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      first_name,
      last_name,
      user_type,
      school_id,
      phone,
      date_of_birth,
      student_id,
      employee_id,
      is_active: true,
      is_verified: false,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');

    await trx.commit();

    // Generate tokens
    const tokens = generateTokenPair(newUser);

    // Remove sensitive information
    const userResponse = {
      id: newUser.id,
      email: newUser.email,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      user_type: newUser.user_type,
      role: newUser.role,
      school_id: newUser.school_id,
      phone: newUser.phone,
      date_of_birth: newUser.date_of_birth,
      student_id: newUser.student_id,
      employee_id: newUser.employee_id,
      is_active: newUser.is_active,
      is_verified: newUser.is_verified,
      created_at: newUser.created_at
    };

    res.status(201).json({
      message: 'User registered successfully',
      user: userResponse,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: process.env.JWT_EXPIRE || '7d'
    });

  } catch (error) {
    await trx.rollback();
    logger.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Registration failed'
    });
  }
});

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 */
router.post('/login', validate(loginSchema), rateLimitSensitive, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and include school information
    const user = await db('users')
      .leftJoin('schools', 'users.school_id', 'schools.id')
      .where('users.email', email.toLowerCase())
      .where('users.is_active', true)
      .select(
        'users.*',
        'schools.name as school_name',
        'schools.address as school_address'
      )
      .first();

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }

    // Generate tokens
    const tokens = generateTokenPair(user);

    // Update last login
    await db('users')
      .where('id', user.id)
      .update({
        last_login_at: new Date(),
        updated_at: new Date()
      });

    // Remove sensitive information
    const userResponse = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      user_type: user.user_type,
      role: user.role,
      school_id: user.school_id,
      school_name: user.school_name,
      phone: user.phone,
      date_of_birth: user.date_of_birth,
      student_id: user.student_id,
      employee_id: user.employee_id,
      avatar_url: user.avatar_url,
      is_active: user.is_active,
      is_verified: user.email_verified,
      last_active_at: user.last_login_at,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    res.json({
      message: 'Login successful',
      user: userResponse,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: process.env.JWT_EXPIRE || '7d'
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Login failed'
    });
  }
});

/**
 * @route GET /api/auth/me
 * @desc Get current user profile
 * @access Private
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await db('users')
      .leftJoin('schools', 'users.school_id', 'schools.id')
      .where('users.id', req.user.id)
      .select(
        'users.id',
        'users.email',
        'users.first_name',
        'users.last_name',
        'users.user_type',
        'users.role',
        'users.school_id',
        'schools.name as school_name',
        'schools.address as school_address',
        'users.phone',
        'users.date_of_birth',
        'users.student_id',
        'users.employee_id',
        'users.avatar_url',
        'users.is_active',
        'users.email_verified',
        'users.last_login_at',
        'users.created_at'
      )
      .first();

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    res.json({ user });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get profile'
    });
  }
});

/**
 * @route PUT /api/auth/me
 * @desc Update user profile
 * @access Private
 */
router.put('/me', authenticate, validate(profileUpdateSchema), async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      phone,
      date_of_birth,
      avatar_url
    } = req.body;

    const updateData = {
      updated_at: new Date()
    };

    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (phone !== undefined) updateData.phone = phone;
    if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

    await db('users')
      .where('id', req.user.id)
      .update(updateData);

    // Get updated user data
    const updatedUser = await db('users')
      .leftJoin('schools', 'users.school_id', 'schools.id')
      .where('users.id', req.user.id)
      .select(
        'users.id',
        'users.email',
        'users.first_name',
        'users.last_name',
        'users.user_type',
        'users.role',
        'users.school_id',
        'schools.name as school_name',
        'users.phone',
        'users.date_of_birth',
        'users.student_id',
        'users.employee_id',
        'users.avatar_url',
        'users.is_active',
        'users.email_verified',
        'users.last_login_at',
        'users.created_at',
        'users.updated_at'
      )
      .first();

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update profile'
    });
  }
});

/**
 * @route POST /api/auth/change-password
 * @desc Change user password
 * @access Private
 */
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Current password and new password are required'
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'New password must be at least 8 characters long'
      });
    }

    // Get current user
    const user = await db('users')
      .where('id', req.user.id)
      .first();

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(current_password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

    // Update password
    await db('users')
      .where('id', req.user.id)
      .update({
        password_hash: newPasswordHash,
        updated_at: new Date()
      });

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to change password'
    });
  }
});

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refresh_token);
    
    // Check if user still exists and is active
    const user = await db('users')
      .where('id', decoded.id)
      .where('is_active', true)
      .first();

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const tokens = generateTokenPair(user);

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: process.env.JWT_EXPIRE || '7d'
    });

  } catch (error) {
    logger.error('Refresh token error:', error);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid refresh token'
    });
  }
});

/**
 * @route POST /api/auth/logout
 * @desc Logout user (invalidate refresh token)
 * @access Private
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    // In a production environment, you might want to maintain a blacklist
    // of tokens or store refresh tokens in the database to invalidate them
    // For now, we'll just return success since JWTs are stateless
    
    res.json({
      message: 'Logged out successfully'
    });

  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Logout failed'
    });
  }
});

/**
 * @route POST /api/auth/forgot-password
 * @desc Request password reset
 * @access Public
 */
router.post('/forgot-password', validate(passwordResetRequestSchema), rateLimitSensitive, async (req, res) => {
  try {
    const { email } = req.body;

    const user = await db('users')
      .where('email', email.toLowerCase())
      .where('is_active', true)
      .first();

    // Always return success to prevent email enumeration
    res.json({
      message: 'If the email exists, a password reset link has been sent'
    });

    if (!user) {
      return;
    }

    // Generate reset token (in production, implement proper token generation and email sending)
    const resetToken = uuidv4();
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await db('users')
      .where('id', user.id)
      .update({
        reset_token: resetToken,
        reset_token_expires: resetExpires,
        updated_at: new Date()
      });

    // TODO: Send email with reset link
    logger.info(`Password reset requested for user ${user.id}. Reset token: ${resetToken}`);

  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process password reset request'
    });
  }
});

/**
 * @route POST /api/auth/reset-password
 * @desc Reset password with token
 * @access Public
 */
router.post('/reset-password', validate(passwordResetSchema), rateLimitSensitive, async (req, res) => {
  try {
    const { token, new_password } = req.body;

    const user = await db('users')
      .where('reset_token', token)
      .where('reset_token_expires', '>', new Date())
      .where('is_active', true)
      .first();

    if (!user) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(new_password, saltRounds);

    // Update password and clear reset token
    await db('users')
      .where('id', user.id)
      .update({
        password_hash: passwordHash,
        reset_token: null,
        reset_token_expires: null,
        updated_at: new Date()
      });

    res.json({
      message: 'Password reset successfully'
    });

  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to reset password'
    });
  }
});

module.exports = router; 
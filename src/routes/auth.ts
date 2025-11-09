import express, { Request, Response } from 'express';
import { ZodError } from 'zod';
import { AuthService } from '../services/authService';
import { AuthRepository } from '../repositories/authRepository';
import { authenticate } from '../shared/middleware/auth';
import logger from '../shared/utils/logger';
import db from '../shared/database/connection';
import { AuthenticatedRequest } from '../types/auth';

const router = express.Router();

// Initialize service layer
const authRepository = new AuthRepository(db);
const schoolRepository = new (require('../repositories/schoolRepository').SchoolRepository)(db);
const authService = new AuthService(authRepository, schoolRepository);

// Rate limiting middleware (import from existing middleware)
const { rateLimitSensitive } = require('../shared/middleware/auth');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account in the system
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *               - role
 *               - schoolId
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: "john.doe@school.edu"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: User password (minimum 8 characters)
 *                 example: "SecurePass123!"
 *               firstName:
 *                 type: string
 *                 description: User's first name
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 description: User's last name
 *                 example: "Doe"
 *               role:
 *                 type: string
 *                 enum: [student, teacher, parent, admin]
 *                 description: User role in the school system
 *                 example: "student"
 *               schoolId:
 *                 type: integer
 *                 description: ID of the school the user belongs to
 *                 example: 1
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error or invalid school ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', rateLimitSensitive, async (req: Request, res: Response) => {
  try {
    const result = await authService.register(req.body);
    
    res.status(201).json({
      message: 'User registered successfully',
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn
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
    
    if (error instanceof Error) {
      if (error.message === 'Email already registered') {
        return res.status(409).json({
          error: 'Conflict',
          message: error.message
        });
      }
      
      if (error.message === 'Invalid school ID') {
        return res.status(400).json({
          error: 'Bad Request',
          message: error.message
        });
      }
    }
    
    logger.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register user'
    });
  }
});

/**
 * @swagger
 * /api/auth/register-admin:
 *   post:
 *     summary: Register a new admin and create school
 *     description: Create a new school and admin user account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - school_name
 *               - school_address
 *               - first_name
 *               - last_name
 *               - email
 *               - password
 *             properties:
 *               school_name:
 *                 type: string
 *                 description: Name of the school
 *                 example: "Greenwood High School"
 *               school_address:
 *                 type: string
 *                 description: School address
 *                 example: "123 Main St, City, State 12345"
 *               school_phone:
 *                 type: string
 *                 description: School phone number
 *                 example: "+1234567890"
 *               school_email:
 *                 type: string
 *                 format: email
 *                 description: School email address
 *                 example: "info@greenwood.edu"
 *               school_website:
 *                 type: string
 *                 format: uri
 *                 description: School website URL
 *                 example: "https://www.greenwood.edu"
 *               first_name:
 *                 type: string
 *                 description: Admin user's first name
 *                 example: "John"
 *               last_name:
 *                 type: string
 *                 description: Admin user's last name
 *                 example: "Smith"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Admin user email address
 *                 example: "admin@greenwood.edu"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Admin user password (minimum 8 characters)
 *                 example: "SecurePass123!"
 *               phone:
 *                 type: string
 *                 description: Admin user phone number
 *                 example: "+1234567890"
 *     responses:
 *       201:
 *         description: Admin registered and school created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register-admin', rateLimitSensitive, async (req: Request, res: Response) => {
  try {
    const result = await authService.registerAdmin(req.body);
    
    res.status(201).json({
      message: 'Admin registered and school created successfully',
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn
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
    
    if (error instanceof Error) {
      if (error.message === 'Email already registered') {
        return res.status(409).json({
          error: 'Conflict',
          message: error.message
        });
      }
    }
    
    logger.error('Admin registration error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register admin and create school'
    });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticate user with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: "john.doe@school.edu"
 *               password:
 *                 type: string
 *                 description: User password
 *                 example: "SecurePass123!"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', rateLimitSensitive, async (req: Request, res: Response) => {
  try {
    const result = await authService.login(req.body);
    
    res.json(result);
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
    
    if (error instanceof Error && error.message === 'Invalid email or password') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: error.message
      });
    }
    
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to login'
    });
  }
});

/**
 * @route GET /api/auth/me
 * @desc Get current user profile
 * @access Private
 */
router.get('/me', authenticate, async (req: any, res: Response) => {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    res.json(user);
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found') {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }
    
    logger.error('Get current user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user profile'
    });
  }
});

/**
 * @route PUT /api/auth/me
 * @desc Update user profile
 * @access Private
 */
router.put('/me', authenticate, async (req: any, res: Response) => {
  try {
    const updatedUser = await authService.updateProfile(req.user.id, req.body);
    
    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
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
    
    if (error instanceof Error && error.message === 'User not found') {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }
    
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
router.post('/change-password', authenticate, async (req: any, res: Response) => {
  try {
    await authService.changePassword(req.user.id, req.body);
    
    res.json({
      message: 'Password changed successfully'
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
    
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        return res.status(404).json({
          error: 'Not Found',
          message: error.message
        });
      }
      
      if (error.message === 'Current password is incorrect') {
        return res.status(400).json({
          error: 'Bad Request',
          message: error.message
        });
      }
    }
    
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
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const tokens = await authService.refreshToken(req.body);
    
    res.json({
      message: 'Token refreshed successfully',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Refresh token is required'
      });
    }
    
    if (error instanceof Error && error.message === 'Invalid refresh token') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: error.message
      });
    }
    
    logger.error('Refresh token error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to refresh token'
    });
  }
});

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 * @access Private
 */
router.post('/logout', authenticate, async (req: any, res: Response) => {
  try {
    await authService.logout(req.user.id);
    
    res.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to logout'
    });
  }
});

/**
 * @route POST /api/auth/forgot-password
 * @desc Request password reset
 * @access Public
 */
router.post('/forgot-password', rateLimitSensitive, async (req: Request, res: Response) => {
  try {
    await authService.forgotPassword(req.body);
    
    // Always return success for security (don't reveal if email exists)
    res.json({
      message: 'If your email is registered, you will receive a password reset link'
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
router.post('/reset-password', rateLimitSensitive, async (req: Request, res: Response) => {
  try {
    await authService.resetPassword(req.body);
    
    res.json({
      message: 'Password reset successfully'
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
    
    if (error instanceof Error && error.message === 'Invalid or expired reset token') {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }
    
    logger.error('Reset password error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to reset password'
    });
  }
});

export default router; 
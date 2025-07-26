import express, { Request, Response } from 'express';
import { ZodError } from 'zod';
import { AuthService } from '../services/authService';
import { AuthRepository } from '../data/authRepository';
import { authenticate } from '../middleware/auth';
import logger from '../utils/logger';
import db from '../config/database';
import { AuthenticatedRequest } from '../types/auth';

const router = express.Router();

// Initialize service layer
const authRepository = new AuthRepository(db);
const authService = new AuthService(authRepository);

// Rate limiting middleware (import from existing middleware)
const { rateLimitSensitive } = require('../middleware/auth');

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
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
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
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
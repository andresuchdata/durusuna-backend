import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import logger from '../shared/utils/logger';
import { AuthenticatedRequest } from '../types/auth';

// Import JWT utilities (keeping require for now due to CommonJS)
const { verifyAccessToken, extractToken } = require('../utils/jwt');

/**
 * Authentication middleware
 * Verifies JWT token and adds user to request object
 */
export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);

    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required'
      });
      return;
    }

    // Verify token
    const decoded = verifyAccessToken(token);
    
    // Check if user still exists and is active
    const user = await db('users')
      .select('id', 'email', 'first_name', 'last_name', 'user_type', 'role', 'school_id', 'is_active')
      .where({ id: decoded.id, is_active: true })
      .first();

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found or inactive'
      });
      return;
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error instanceof Error && error.message.includes('expired')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token expired'
      });
      return;
    }
    
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid access token'
    });
  }
};

/**
 * Authorization middleware factory
 * Checks if user has required role or user type
 */
export const authorize = (allowedRoles: string[] = [], allowedUserTypes: string[] = []) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const { role, user_type } = req.user;

    // Check role authorization
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient role permissions'
      });
      return;
    }

    // Check user type authorization
    if (allowedUserTypes.length > 0 && !allowedUserTypes.includes(user_type)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient user type permissions'
      });
      return;
    }

    next();
  };
};

/**
 * Check if user belongs to the same school
 * Admins automatically have access to their school data
 */
export const checkSchoolAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { school_id, role } = req.user;
    const targetSchoolId = req.params.schoolId || req.body.school_id;

    // If no target school ID is specified, allow the request to proceed
    if (!targetSchoolId) {
      next();
      return;
    }

    // Admins can access any data within their school
    if (role === 'admin' && targetSchoolId === school_id) {
      next();
      return;
    }

    // Regular users must match school exactly
    if (targetSchoolId !== school_id) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this school'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('School access check error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify school access'
    });
  }
};

/**
 * Check if user is admin with school access
 * This middleware ensures admins can only access data within their own school
 */
export const checkAdminSchoolAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { role, school_id } = req.user;

    // Check if user is admin
    if (role !== 'admin') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
      return;
    }

    // Ensure admin has a school_id (should always be true)
    if (!school_id) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Admin must be associated with a school'
      });
      return;
    }

    // Get target school ID from various possible sources
    const targetSchoolId = req.params.schoolId || req.body.school_id || req.query.school_id;

    // If target school ID is specified, ensure it matches admin's school
    if (targetSchoolId && targetSchoolId !== school_id) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this school'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Admin school access check error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify admin school access'
    });
  }
};

/**
 * Check if user has access to a specific class
 * Admins can access all classes within their school
 */
export const checkClassAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId, user_type, role, school_id } = req.user;
    const classId = req.params.classId || req.body.class_id;

    if (!classId) {
      next(); // Skip if no class ID specified
      return;
    }

    // Admins have access to all classes in their school
    if (role === 'admin') {
      // Verify the class belongs to the admin's school
      const classData = await db('classes')
        .select('school_id')
        .where('id', classId)
        .where('is_active', true)
        .first();

      if (!classData) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Class not found'
        });
        return;
      }

      if (classData.school_id !== school_id) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied to this class'
        });
        return;
      }

      // Admin access granted
      (req as any).userClassRole = 'admin';
      next();
      return;
    }

    // Check if user is associated with the class
    const userClass = await db('user_classes')
      .where({
        user_id: userId,
        class_id: classId,
        is_active: true
      })
      .first();

    if (!userClass) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this class'
      });
      return;
    }

    (req as any).userClassRole = userClass.role_in_class;
    next();
  } catch (error) {
    logger.error('Class access check error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify class access'
    });
  }
};

/**
 * Rate limiting middleware for sensitive operations
 */
export const rateLimitSensitive = (req: Request, res: Response, next: NextFunction): void => {
  // This would integrate with Redis in production
  // For now, we'll use a simple in-memory approach
  const app = req.app as any;
  const sensitiveOps = app.locals.sensitiveOps || new Map();
  const key = `${req.ip}:${(req as any).user?.id || 'anonymous'}`;
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5 minutes
  const maxAttempts = 5;

  const attempts = sensitiveOps.get(key) || [];
  const recentAttempts = attempts.filter((time: number) => now - time < windowMs);

  if (recentAttempts.length >= maxAttempts) {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many sensitive operations. Please try again later.'
    });
    return;
  }

  recentAttempts.push(now);
  sensitiveOps.set(key, recentAttempts);
  app.locals.sensitiveOps = sensitiveOps;

  next();
}; 
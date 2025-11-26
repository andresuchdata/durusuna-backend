import { Request, Response, NextFunction, RequestHandler } from 'express';
import db from '../database/connection';
import logger from '../utils/logger';
import { AuthenticatedRequest } from '../../types/auth';

// Import JWT utilities (keeping require for now due to CommonJS)
import { verifyAccessToken, extractToken } from '../../utils/jwt';

/**
 * Authentication middleware
 * Verifies JWT token and adds user to request object
 */
// Type guard to check if a request is authenticated
export function isAuthenticatedRequest(req: Request): req is AuthenticatedRequest {
  return !!(req as any).user;
}

// Middleware factory that ensures the request is authenticated
export function requireAuth(): RequestHandler {
  return (req, res, next) => {
    if (!isAuthenticatedRequest(req)) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }
    next();
  };
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    (req as AuthenticatedRequest).user = user;
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
  return (req: Request, res: Response, next: NextFunction): void => {
    const { role, user_type } = (req as AuthenticatedRequest).user;

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
 */
export const checkSchoolAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { school_id } = req.user;
    const targetSchoolId = req.params.schoolId || req.body.school_id;

    if (targetSchoolId && targetSchoolId !== school_id) {
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
 * Check if user has access to a specific class
 */
export const checkClassAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId, user_type, role } = req.user;
    const classId = req.params.classId || req.body.class_id;

    if (!classId) {
      next(); // Skip if no class ID specified
      return;
    }

    // Admins have access to all classes in their school
    if (role === 'admin') {
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
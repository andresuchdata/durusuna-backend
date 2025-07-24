const { verifyAccessToken, extractToken } = require('../utils/jwt');
const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Authentication middleware
 * Verifies JWT token and adds user to request object
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required'
      });
    }

    // Verify token
    const decoded = verifyAccessToken(token);
    
    // Check if user still exists and is active
    const user = await db('users')
      .select('id', 'email', 'first_name', 'last_name', 'user_type', 'role', 'school_id', 'is_active')
      .where({ id: decoded.id, is_active: true })
      .first();

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found or inactive'
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error.message.includes('expired')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token expired'
      });
    }
    
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid access token'
    });
  }
};

/**
 * Authorization middleware factory
 * Checks if user has required role or user type
 */
const authorize = (allowedRoles = [], allowedUserTypes = []) => {
  return (req, res, next) => {
    const { role, user_type } = req.user;

    // Check role authorization
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient role permissions'
      });
    }

    // Check user type authorization
    if (allowedUserTypes.length > 0 && !allowedUserTypes.includes(user_type)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient user type permissions'
      });
    }

    next();
  };
};

/**
 * Check if user belongs to the same school
 */
const checkSchoolAccess = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const targetSchoolId = req.params.schoolId || req.body.school_id;

    if (targetSchoolId && targetSchoolId !== school_id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this school'
      });
    }

    next();
  } catch (error) {
    logger.error('School access check error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify school access'
    });
  }
};

/**
 * Check if user has access to a specific class
 */
const checkClassAccess = async (req, res, next) => {
  try {
    const { id: userId, user_type, role } = req.user;
    const classId = req.params.classId || req.body.class_id;

    if (!classId) {
      return next(); // Skip if no class ID specified
    }

    // Admins have access to all classes in their school
    if (role === 'admin') {
      return next();
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
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this class'
      });
    }

    req.userClassRole = userClass.role_in_class;
    next();
  } catch (error) {
    logger.error('Class access check error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify class access'
    });
  }
};

/**
 * Rate limiting middleware for sensitive operations
 */
const rateLimitSensitive = (req, res, next) => {
  // This would integrate with Redis in production
  // For now, we'll use a simple in-memory approach
  const sensitiveOps = req.app.locals.sensitiveOps || new Map();
  const key = `${req.ip}:${req.user?.id || 'anonymous'}`;
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5 minutes
  const maxAttempts = 5;

  const attempts = sensitiveOps.get(key) || [];
  const recentAttempts = attempts.filter(time => now - time < windowMs);

  if (recentAttempts.length >= maxAttempts) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many sensitive operations. Please try again later.'
    });
  }

  recentAttempts.push(now);
  sensitiveOps.set(key, recentAttempts);
  req.app.locals.sensitiveOps = sensitiveOps;

  next();
};

module.exports = {
  authenticate,
  authorize,
  checkSchoolAccess,
  checkClassAccess,
  rateLimitSensitive
}; 
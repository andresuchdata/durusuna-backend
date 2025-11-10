import express, { Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { AccessControlService } from '../services/accessControlService';
import { UserService } from '../services/userService';
import { UserRepository } from '../repositories/userRepository';
import db from '../config/database';
import logger from '../shared/utils/logger';
import { AuthenticatedRequest } from '../types/auth';
import { query } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest';

const router = express.Router();

// Initialize services
const userRepository = new UserRepository(db);
const accessControlService = new AccessControlService(db);
const userService = new UserService(userRepository);

/**
 * @route GET /api/access/users
 * @desc Get users accessible to the current user based on their role and relationships
 * @access Private
 */
router.get('/users',
  (req: Request, res: Response, next: NextFunction) => authenticate(req as any, res, next),
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('search')
      .optional()
      .isString()
      .withMessage('Search must be a string'),
    query('userType')
      .optional()
      .isIn(['all', 'teacher', 'student', 'parent'])
      .withMessage('User type must be one of: all, teacher, student, parent'),
    query('includeInactive')
      .optional()
      .isBoolean()
      .withMessage('includeInactive must be a boolean'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const authenticatedReq = req as AuthenticatedRequest;
    try {
      const { user: currentUser } = authenticatedReq;

      if (!currentUser) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const search = req.query.search as string | undefined;
      const userType = req.query.userType as string | undefined;
      const includeInactive = req.query.includeInactive === 'true';

      const offset = (page - 1) * limit;
      const users = await accessControlService.getAccessibleUsers(currentUser, {
        search,
        userType,
        limit,
        offset,
        includeInactive
      });

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page,
            limit,
            hasMore: users.length === limit,
            total: users.length
          }
        }
      });

    } catch (error: any) {
      logger.error('Failed to get accessible users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get accessible users',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/access/user/:userId
 * @desc Check if current user can access a specific user
 * @access Private
 */
router.get('/user/:userId',
  (req: Request, res: Response, next: NextFunction) => authenticate(req as any, res, next),
  async (req: Request, res: Response) => {
    const authenticatedReq = req as AuthenticatedRequest;
    try {
      const { user: currentUser } = authenticatedReq;
      const { userId } = req.params;

      if (!currentUser) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const canAccess = await accessControlService.canAccessUser(currentUser, userId);

      res.json({
        success: true,
        data: {
          userId,
          canAccess,
          currentUserId: currentUser.id
        }
      });

    } catch (error: any) {
      logger.error(`Failed to check access for user ${req.params.userId}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to check user access',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/access/conversation-participants
 * @desc Check if current user can access conversation participants
 * @access Private
 */
router.get('/conversation-participants',
  (req: Request, res: Response, next: NextFunction) => authenticate(req as any, res, next),
  [
    query('participantIds')
      .notEmpty()
      .withMessage('participantIds query parameter is required')
      .custom((value) => {
        const ids = value.split(',').filter((id: string) => id.trim());
        return ids.length > 0;
      })
      .withMessage('participantIds must contain at least one valid ID'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const authenticatedReq = req as AuthenticatedRequest;
    try {
      const { user: currentUser } = authenticatedReq;

      if (!currentUser) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const participantIds = (req.query.participantIds as string)
        .split(',')
        .map(id => id.trim())
        .filter(id => id);

      const canAccess = await accessControlService.canAccessConversationParticipants(
        currentUser,
        participantIds
      );

      const accessibleParticipants = await accessControlService.getAccessibleConversationParticipants(
        currentUser,
        participantIds
      );

      res.json({
        success: true,
        data: {
          participantIds,
          canAccessAll: canAccess,
          accessibleParticipants,
          accessibleCount: accessibleParticipants.length,
          totalRequested: participantIds.length
        }
      });

    } catch (error: any) {
      logger.error('Failed to check conversation participants access:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check conversation participants access',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/access/user-types
 * @desc Get user types that the current user can access
 * @access Private
 */
router.get('/user-types',
  (req: Request, res: Response, next: NextFunction) => authenticate(req as any, res, next),
  async (req: Request, res: Response) => {
    const authenticatedReq = req as AuthenticatedRequest;
    try {
      const { user: currentUser } = authenticatedReq;

      if (!currentUser) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const accessibleUserTypes = await accessControlService.getAccessibleUserTypes(currentUser);

      res.json({
        success: true,
        data: {
          userTypes: accessibleUserTypes,
          currentUserType: currentUser.user_type,
          currentUserRole: currentUser.role
        }
      });

    } catch (error: any) {
      logger.error('Failed to get accessible user types:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get accessible user types',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/access/permissions
 * @desc Get current user's permissions and access levels
 * @access Private
 */
router.get('/permissions',
  (req: Request, res: Response, next: NextFunction) => authenticate(req as any, res, next),
  async (req: Request, res: Response) => {
    const authenticatedReq = req as AuthenticatedRequest;
    try {
      const { user: currentUser } = authenticatedReq;

      if (!currentUser) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const accessibleUserTypes = await accessControlService.getAccessibleUserTypes(currentUser);

      // Define permissions based on role and user type
      const permissions = {
        canViewAllUsers: currentUser.role === 'admin',
        canCreateUsers: currentUser.role === 'admin',
        canUpdateUsers: currentUser.role === 'admin' || currentUser.user_type === 'teacher',
        canDeleteUsers: currentUser.role === 'admin',
        canAccessConversations: true, // All authenticated users can access conversations
        canCreateConversations: true, // All authenticated users can create conversations
        canManageSchool: currentUser.role === 'admin',
        canViewGrades: currentUser.role === 'admin' || currentUser.user_type === 'teacher' || currentUser.user_type === 'parent',
        canManageClasses: currentUser.role === 'admin' || currentUser.user_type === 'teacher',
        accessibleUserTypes,
        userType: currentUser.user_type,
        role: currentUser.role,
        schoolId: currentUser.school_id
      };

      res.json({
        success: true,
        data: permissions
      });

    } catch (error: any) {
      logger.error('Failed to get user permissions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user permissions',
        error: error.message
      });
    }
  }
);

export default router;

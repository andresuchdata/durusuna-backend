import express, { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { authenticate } from '../middleware/auth';
import { UserService } from '../services/userService';
import { validateRequest } from '../middleware/validateRequest';
import { body, query } from 'express-validator';
import logger from '../shared/utils/logger';
import db from '../shared/database/connection';
import { UserRepository } from '../repositories/userRepository';
import { AuthenticatedRequest } from '../types/auth';
import { getContactsSchema, type GetContactsInput } from '../schemas/userSchemas';

const router = express.Router();
const userService = new UserService(new UserRepository(db));

const handleUserRouteError = (error: unknown, res: Response, defaultMessage: string) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.issues,
    });
  }

  if (error instanceof Error) {
    const message = error.message || defaultMessage;
    const lower = message.toLowerCase();

    if (lower.includes('access denied') || lower.includes('insufficient permissions')) {
      return res.status(403).json({ success: false, message });
    }

    if (message === 'User not found') {
      return res.status(404).json({ success: false, message });
    }

    if (lower.includes('already exists')) {
      return res.status(409).json({ success: false, message });
    }

    if (lower.includes('not associated with a school')) {
      return res.status(400).json({ success: false, message });
    }

    if (lower.includes('cannot delete your own')) {
      return res.status(400).json({ success: false, message });
    }

    return res.status(500).json({ success: false, message });
  }

  logger.error(defaultMessage, error);
  return res.status(500).json({ success: false, message: defaultMessage });
};

// List users with optional filters (admin/teacher full access, others read-only)
router.get(
  '/',
  (req: Request, res: Response, next: NextFunction) => authenticate(req as any, res, next),
  async (req: Request, res: Response) => {
    try {
      const { user: currentUser } = req as AuthenticatedRequest;
      const result = await userService.listUsers(currentUser, {
        page: req.query.page as any,
        limit: req.query.limit as any,
        search: req.query.search as string | undefined,
        userType: req.query.userType as string | undefined,
        isActive: req.query.isActive as any,
        dobFrom: req.query.dobFrom as string | undefined,
        dobTo: req.query.dobTo as string | undefined,
      });
      res.json(result);
    } catch (error) {
      logger.error('Failed to list users:', error);
      handleUserRouteError(error, res, 'Failed to list users');
    }
  }
);

// Create single user (admin only)
router.post(
  '/',
  (req: Request, res: Response, next: NextFunction) => authenticate(req as any, res, next),
  async (req: Request, res: Response) => {
    try {
      const { user: currentUser } = req as AuthenticatedRequest;
      const user = await userService.createUser(currentUser, req.body);
      res.status(201).json({ success: true, user });
    } catch (error) {
      logger.error('Failed to create user:', error);
      handleUserRouteError(error, res, 'Failed to create user');
    }
  }
);

// Batch create users (admin only)
router.post(
  '/batch',
  (req: Request, res: Response, next: NextFunction) => authenticate(req as any, res, next),
  async (req: Request, res: Response) => {
    try {
      const { user: currentUser } = req as AuthenticatedRequest;
      const users = await userService.createUsersBatch(currentUser, req.body);
      res.status(201).json({ success: true, users });
    } catch (error) {
      logger.error('Failed to batch create users:', error);
      handleUserRouteError(error, res, 'Failed to batch create users');
    }
  }
);

// Update FCM token for push notifications
router.put(
  '/fcm-token',
  (req: Request, res: Response, next: NextFunction) => authenticate(req as any, res, next),
  [
    body('fcm_token')
      .notEmpty()
      .isString()
      .isLength({ min: 10, max: 4096 })
      .withMessage('FCM token must be a valid string'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { user: currentUser } = req as AuthenticatedRequest;
      const userId = currentUser?.id;
      const { fcm_token } = req.body;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not authenticated' 
        });
      }

      await userService.updateFCMToken(userId, fcm_token);

      logger.info(`🔥 FCM token updated for user ${userId}`);
      
      res.json({ 
        success: true, 
        message: 'FCM token updated successfully' 
      });
    } catch (error: any) {
      logger.error('Failed to update FCM token:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update FCM token',
        error: error.message 
      });
    }
  }
);

// Clear FCM token (for logout)
router.delete(
  '/fcm-token',
  (req: Request, res: Response, next: NextFunction) => authenticate(req as any, res, next),
  async (req: Request, res: Response) => {
    try {
      const { user: currentUser } = req as AuthenticatedRequest;
      const userId = currentUser?.id;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not authenticated' 
        });
      }

      await userService.clearFCMToken(userId);

      logger.info(`🔥 FCM token cleared for user ${userId}`);
      
      res.json({ 
        success: true, 
        message: 'FCM token cleared successfully' 
      });
    } catch (error: any) {
      logger.error('Failed to clear FCM token:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to clear FCM token',
        error: error.message 
      });
    }
  }
);

// Update user profile (including avatar)
router.put(
  '/profile',
  (req: Request, res: Response, next: NextFunction) => authenticate(req as any, res, next),
  [
    body('first_name')
      .optional()
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be between 1 and 50 characters'),
    body('last_name')
      .optional()
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be between 1 and 50 characters'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Valid email is required'),
    body('avatar_url')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Avatar URL must be less than 500 characters'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { user: currentUser } = req as AuthenticatedRequest;
      const userId = currentUser?.id;
      const { first_name, last_name, email, avatar_url } = req.body;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not authenticated' 
        });
      }

      const updateData: any = {};
      if (first_name != null) updateData.first_name = first_name;
      if (last_name != null) updateData.last_name = last_name;
      if (email != null) updateData.email = email;
      if (avatar_url != null) updateData.avatar_url = avatar_url;

      logger.info(`🔄 [Profile Update] User ${userId} update data:`, updateData);

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'At least one field must be provided for update' 
        });
      }

      const updatedUser = await userService.updateUserProfile(userId, updateData);
      
      logger.info(`🔄 [Profile Update] Updated user data:`, {
        id: updatedUser.id,
        avatar_url: updatedUser.avatar_url,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name
      });

      logger.info(`👤 Profile updated for user ${userId}`);
      
      res.json({ 
        success: true, 
        message: 'Profile updated successfully',
        user: updatedUser
      });
    } catch (error: any) {
      logger.error('Failed to update profile:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update profile',
        error: error.message 
      });
    }
  }
);

// Update user (admin & teacher)
router.put(
  '/:id',
  (req: Request, res: Response, next: NextFunction) => authenticate(req as any, res, next),
  async (req: Request, res: Response) => {
    if (req.params.id === 'profile' || req.params.id === 'contacts' || req.params.id === 'batch') {
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
      const { user: currentUser } = req as AuthenticatedRequest;
      const updated = await userService.updateUser(currentUser, req.params.id, req.body);
      res.json({ success: true, user: updated });
    } catch (error) {
      logger.error(`Failed to update user ${req.params.id}:`, error);
      handleUserRouteError(error, res, 'Failed to update user');
    }
  }
);

// Delete user (admin only)
router.delete(
  '/:id',
  (req: Request, res: Response, next: NextFunction) => authenticate(req as any, res, next),
  async (req: Request, res: Response) => {
    if (req.params.id === 'profile' || req.params.id === 'contacts' || req.params.id === 'batch') {
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
      const { user: currentUser } = req as AuthenticatedRequest;
      await userService.deleteUser(currentUser, req.params.id);
      res.status(204).send();
    } catch (error) {
      logger.error(`Failed to delete user ${req.params.id}:`, error);
      handleUserRouteError(error, res, 'Failed to delete user');
    }
  }
);

// Get contacts for chat/messaging
router.get(
  '/contacts',
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
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { user: currentUser } = req as AuthenticatedRequest;
      
      if (!currentUser) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not authenticated' 
        });
      }

      // Parse and validate query parameters
      const contactsParams: GetContactsInput = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        search: req.query.search as string | undefined,
        userType: req.query.userType as 'all' | 'teacher' | 'student' | 'parent' | undefined,
      };

      const result = await userService.getContacts(
        currentUser,
        contactsParams.page,
        contactsParams.limit,
        contactsParams.search,
        contactsParams.userType
      );

      logger.info(`📞 Retrieved ${result.contacts.length} contacts for user ${currentUser.id}`);
      
      res.json(result);
    } catch (error: any) {
      logger.error('Failed to get contacts:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get contacts',
        error: error.message 
      });
    }
  }
);

// Get user detail (all roles read access)
router.get(
  '/:id',
  (req: Request, res: Response, next: NextFunction) => authenticate(req as any, res, next),
  async (req: Request, res: Response) => {
    if (req.params.id === 'profile' || req.params.id === 'contacts' || req.params.id === 'batch') {
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
      const { user: currentUser } = req as AuthenticatedRequest;
      const user = await userService.getUserById(currentUser, req.params.id);
      res.json({ success: true, user });
    } catch (error) {
      logger.error(`Failed to fetch user ${req.params.id}:`, error);
      handleUserRouteError(error, res, 'Failed to fetch user');
    }
  }
);

export default router;
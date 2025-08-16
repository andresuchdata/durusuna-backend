import express, { Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { UserService } from '../services/userService';
import { validateRequest } from '../middleware/validateRequest';
import { body } from 'express-validator';
import logger from '../shared/utils/logger';
import db from '../shared/database/connection';
import { UserRepository } from '../repositories/userRepository';
import { AuthenticatedRequest } from '../types/auth';

const router = express.Router();
const userService = new UserService(new UserRepository(db));

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

export default router;
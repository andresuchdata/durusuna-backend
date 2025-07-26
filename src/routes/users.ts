import express, { Request, Response } from 'express';
import { ZodError } from 'zod';
import { UserService } from '../services/userService';
import { UserRepository } from '../repositories/userRepository';
import { authenticate } from '../shared/middleware/auth';
import logger from '../shared/utils/logger';
import db from '../shared/database/connection';
import { AuthenticatedUser } from '../types/user';

const router = express.Router();

// Initialize service layer
const userRepository = new UserRepository(db);
const userService = new UserService(userRepository);

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

// Get current user profile
router.get('/profile', authenticate, async (req: any, res: Response) => {
  try {
    const user = await userService.getUserProfile(req.user.id);
    res.json(user);
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found') {
      return res.status(404).json({ error: error.message });
    }
    
    logger.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update user profile
router.put('/profile', authenticate, async (req: any, res: Response) => {
  try {
    const updatedUser = await userService.updateUserProfile(req.user.id, req.body);
    res.json(updatedUser);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ 
        errors: error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    
    logger.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// Change password
router.put('/password', authenticate, async (req: any, res: Response) => {
  try {
    await userService.changePassword(req.user.id, req.body);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ 
        errors: error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    
    if (error instanceof Error && error.message === 'Current password is incorrect') {
      return res.status(400).json({ error: error.message });
    }
    
    if (error instanceof Error && error.message === 'User not found') {
      return res.status(404).json({ error: error.message });
    }
    
    logger.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get users by school (admin only)
router.get('/school/:schoolId', authenticate, async (req: any, res: Response) => {
  try {
    const { schoolId } = req.params;
    const users = await userService.getSchoolUsers(req.user, schoolId);
    res.json(users);
  } catch (error) {
    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({ error: error.message });
    }
    
    logger.error('Error fetching school users:', error);
    res.status(500).json({ error: 'Failed to fetch school users' });
  }
});

// Get contacts for messaging (users in same school)
router.get('/contacts', authenticate, async (req: any, res: Response) => {
  try {
    const { page = '1', limit = '50' } = req.query;
    const contacts = await userService.getContacts(
      req.user, 
      parseInt(page as string), 
      parseInt(limit as string)
    );
    res.json(contacts);
  } catch (error) {
    if (error instanceof Error && error.message === 'User not associated with a school') {
      return res.status(400).json({ error: error.message });
    }
    
    logger.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Search users for messaging
router.get('/search', authenticate, async (req: any, res: Response) => {
  try {
    const searchResult = await userService.searchUsers(req.user, req.query);
    res.json(searchResult);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ 
        error: error.issues[0]?.message || 'Invalid search parameters'
      });
    }
    
    if (error instanceof Error && error.message === 'User not associated with a school') {
      return res.status(400).json({ error: error.message });
    }
    
    logger.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

export default router; 
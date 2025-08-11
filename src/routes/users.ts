import express, { Request, Response } from 'express';
import { ZodError } from 'zod';
import { UserService } from '../services/userService';
import { UserRepository } from '../repositories/userRepository';
import { authenticate, checkAdminSchoolAccess } from '../middleware/auth';
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

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get current user profile
 *     description: Retrieve the profile information of the authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
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
    const { page = '1', limit = '50', search, userType } = req.query;
    const contacts = await userService.getContacts(
      req.user, 
      parseInt(page as string), 
      parseInt(limit as string),
      search as string,
      userType as string
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

// Admin-only routes

/**
 * @swagger
 * /api/users/school/{schoolId}:
 *   get:
 *     summary: Get all users in a school (Admin only)
 *     description: Retrieve all users in the specified school. Only admins can access this endpoint.
 *     tags: [Users, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: schoolId
 *         required: true
 *         schema:
 *           type: string
 *         description: The school ID
 *     responses:
 *       200:
 *         description: School users retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/school/:schoolId', authenticate, checkAdminSchoolAccess, async (req: any, res: Response) => {
  try {
    const users = await userService.getSchoolUsers(req.user, req.params.schoolId);
    res.json(users);
  } catch (error) {
    logger.error('Error fetching school users:', error);
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to fetch school users' });
  }
});

/**
 * @swagger
 * /api/users/students:
 *   get:
 *     summary: Get all students in admin's school
 *     description: Retrieve all students in the admin's school. Only admins can access this endpoint.
 *     tags: [Users, Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Students retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/students', authenticate, checkAdminSchoolAccess, async (req: any, res: Response) => {
  try {
    const students = await userService.getSchoolStudents(req.user);
    res.json(students);
  } catch (error) {
    logger.error('Error fetching school students:', error);
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to fetch school students' });
  }
});

/**
 * @swagger
 * /api/users/teachers:
 *   get:
 *     summary: Get all teachers in admin's school
 *     description: Retrieve all teachers in the admin's school. Only admins can access this endpoint.
 *     tags: [Users, Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Teachers retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/teachers', authenticate, checkAdminSchoolAccess, async (req: any, res: Response) => {
  try {
    const teachers = await userService.getSchoolTeachers(req.user);
    res.json(teachers);
  } catch (error) {
    logger.error('Error fetching school teachers:', error);
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to fetch school teachers' });
  }
});

/**
 * @swagger
 * /api/users/by-type/{userType}:
 *   get:
 *     summary: Get users by type in admin's school
 *     description: Retrieve users of a specific type in the admin's school. Only admins can access this endpoint.
 *     tags: [Users, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [student, teacher, parent, admin]
 *         description: The user type to filter by
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       400:
 *         description: Invalid user type
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/by-type/:userType', authenticate, checkAdminSchoolAccess, async (req: any, res: Response) => {
  try {
    const users = await userService.getUsersByType(req.user, req.params.userType);
    res.json(users);
  } catch (error) {
    logger.error('Error fetching users by type:', error);
    if (error instanceof Error && (error.message.includes('Access denied') || error.message.includes('Invalid user type'))) {
      return res.status(error.message.includes('Invalid user type') ? 400 : 403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to fetch users by type' });
  }
});

export default router; 
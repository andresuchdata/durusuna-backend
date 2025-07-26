import express, { Request, Response } from 'express';
import { NotificationService } from '../services/notificationService';
import { NotificationRepository } from '../repositories/notificationRepository';
import db from '../config/database';
import { authenticate } from '../middleware/auth';
import logger from '../utils/logger';
import { AuthenticatedRequest } from '../types/auth';
import { NotificationQueryParams } from '../types/notification';

const router = express.Router();

// Initialize service layer
const notificationRepository = new NotificationRepository(db);
const notificationService = new NotificationService(notificationRepository);

/**
 * @route GET /api/notifications
 * @desc Get user's notifications with pagination and filtering
 * @access Private
 * @query read_status: 'read' | 'unread' | '' (empty returns all)
 * @query notification_type: NotificationType (optional)
 * @query page: number (default: 1)
 * @query limit: number (default: 20, max: 50)
 * @query sort_by: 'created_at' | 'priority' (default: 'created_at')
 * @query sort_order: 'asc' | 'desc' (default: 'desc')
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const params: NotificationQueryParams = {
      read_status: req.query.read_status as 'read' | 'unread' | '' || '',
      notification_type: req.query.notification_type as any,
      page: parseInt(req.query.page as string) || 1,
      limit: Math.min(parseInt(req.query.limit as string) || 20, 50),
      sort_by: req.query.sort_by as 'created_at' | 'priority' || 'created_at',
      sort_order: req.query.sort_order as 'asc' | 'desc' || 'desc'
    };

    const response = await notificationService.getNotifications(authenticatedReq.user.id, params);

    res.json(response);

  } catch (error) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * @route GET /api/notifications/unread-count
 * @desc Get total unread count for current user (optimized endpoint)
 * @access Private
 */
router.get('/unread-count', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const response = await notificationService.getUnreadCount(authenticatedReq.user.id);

    res.json(response);

  } catch (error) {
    logger.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

/**
 * @route GET /api/notifications/:id
 * @desc Get a specific notification by ID
 * @access Private
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Notification ID is required' });
    }

    const notification = await notificationService.getNotificationById(id, authenticatedReq.user);

    res.json(notification);

  } catch (error) {
    if (error instanceof Error && error.message === 'Notification not found') {
      return res.status(404).json({ error: error.message });
    }
    
    logger.error('Error fetching notification:', error);
    res.status(500).json({ error: 'Failed to fetch notification' });
  }
});

/**
 * @route POST /api/notifications
 * @desc Create a new notification
 * @access Private
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const {
      title,
      content,
      notification_type,
      priority,
      user_id,
      sender_id,
      action_url,
      action_data,
      image_url
    } = req.body;

    if (!title || !content || !notification_type || !user_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: title, content, notification_type, and user_id are required' 
      });
    }

    const notification = await notificationService.createNotification(
      {
        title,
        content,
        notification_type,
        priority,
        user_id,
        sender_id,
        action_url,
        action_data,
        image_url
      },
      authenticatedReq.user
    );

    res.status(201).json(notification);

  } catch (error) {
    if (error instanceof Error && (
      error.message.includes('Missing required fields') ||
      error.message.includes('Invalid notification type') ||
      error.message.includes('Invalid priority level')
    )) {
      return res.status(400).json({ error: error.message });
    }
    
    logger.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

/**
 * @route POST /api/notifications/bulk
 * @desc Create notifications for multiple users (bulk creation)
 * @access Private
 */
router.post('/bulk', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const {
      user_ids,
      title,
      content,
      notification_type,
      priority,
      sender_id,
      action_url,
      action_data,
      image_url
    } = req.body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ error: 'user_ids array is required and must not be empty' });
    }

    if (!title || !content || !notification_type) {
      return res.status(400).json({ 
        error: 'Missing required fields: title, content, and notification_type are required' 
      });
    }

    const notifications = await notificationService.createBulkNotifications(
      user_ids,
      {
        title,
        content,
        notification_type,
        priority,
        sender_id,
        action_url,
        action_data,
        image_url
      },
      authenticatedReq.user
    );

    res.status(201).json({
      success: true,
      created_count: notifications.length,
      notifications
    });

  } catch (error) {
    if (error instanceof Error && (
      error.message.includes('Missing required fields') ||
      error.message.includes('Invalid notification type') ||
      error.message.includes('At least one user ID is required')
    )) {
      return res.status(400).json({ error: error.message });
    }
    
    logger.error('Error creating bulk notifications:', error);
    res.status(500).json({ error: 'Failed to create bulk notifications' });
  }
});

/**
 * @route PUT /api/notifications/:id
 * @desc Update a notification
 * @access Private
 */
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Notification ID is required' });
    }

    const notification = await notificationService.updateNotification(id, updateData, authenticatedReq.user);

    res.json(notification);

  } catch (error) {
    if (error instanceof Error && error.message === 'Notification not found or update failed') {
      return res.status(404).json({ error: error.message });
    }
    
    if (error instanceof Error && (
      error.message.includes('Invalid notification type') ||
      error.message.includes('Invalid priority level')
    )) {
      return res.status(400).json({ error: error.message });
    }
    
    logger.error('Error updating notification:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

/**
 * @route PATCH /api/notifications/:id/read
 * @desc Mark a specific notification as read
 * @access Private
 */
router.patch('/:id/read', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Notification ID is required' });
    }

    const response = await notificationService.markAsRead(id, authenticatedReq.user);

    res.json(response);

  } catch (error) {
    if (error instanceof Error && error.message === 'Notification not found or already read') {
      return res.status(404).json({ error: error.message });
    }
    
    logger.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * @route PATCH /api/notifications/read-all
 * @desc Mark all notifications as read for current user
 * @access Private
 */
router.patch('/read-all', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const response = await notificationService.markAllAsRead(authenticatedReq.user);

    res.json(response);

  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

/**
 * @route DELETE /api/notifications/:id
 * @desc Delete a notification
 * @access Private
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Notification ID is required' });
    }

    const response = await notificationService.deleteNotification(id, authenticatedReq.user);

    res.json(response);

  } catch (error) {
    if (error instanceof Error && error.message === 'Notification not found') {
      return res.status(404).json({ error: error.message });
    }
    
    logger.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

export default router; 
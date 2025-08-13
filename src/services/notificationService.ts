import { NotificationRepository } from '../repositories/notificationRepository';
import { AuthenticatedUser } from '../types/user';
import logger from '../shared/utils/logger';
import {
  Notification,
  NotificationWithSender,
  CreateNotificationRequest,
  UpdateNotificationRequest,
  NotificationQueryParams,
  NotificationListResponse,
  UnreadCountResponse,
  MarkReadResponse
} from '../types/notification';

export class NotificationService {
  constructor(private notificationRepository: NotificationRepository) {}

  /**
   * Create a new notification
   */
  async createNotification(
    data: CreateNotificationRequest,
    currentUser: AuthenticatedUser
  ): Promise<Notification> {
    try {
      // Validate required fields
      if (!data.title || !data.content || !data.notification_type || !data.user_id) {
        throw new Error('Missing required fields: title, content, notification_type, and user_id are required');
      }

      // Validate notification type
      const validTypes = ['message', 'assignment', 'announcement', 'event', 'system'];
      if (!validTypes.includes(data.notification_type)) {
        throw new Error('Invalid notification type');
      }

      // Validate priority if provided
      if (data.priority) {
        const validPriorities = ['low', 'normal', 'high', 'urgent'];
        if (!validPriorities.includes(data.priority)) {
          throw new Error('Invalid priority level');
        }
      }

      // If sender_id is not provided, use current user as sender
      const notificationData = {
        ...data,
        sender_id: data.sender_id || currentUser.id
      };

      const notification = await this.notificationRepository.create(notificationData);
      
      logger.info(`Notification created: ${notification.id} for user ${notification.user_id}`);
      
      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user with pagination and filtering
   */
  async getNotifications(
    userId: string,
    params: NotificationQueryParams = {}
  ): Promise<NotificationListResponse> {
    try {
      const {
        page = 1,
        limit = 20
      } = params;

      const { notifications, total } = await this.notificationRepository.findByUserId(userId, params);
      const unreadCount = await this.notificationRepository.getUnreadCount(userId);

      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          total_pages: totalPages,
          has_next: hasNext,
          has_prev: hasPrev
        },
        unread_count: unreadCount
      };
    } catch (error) {
      logger.error('Error fetching notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread count for a user (optimized endpoint)
   */
  async getUnreadCount(userId: string): Promise<UnreadCountResponse> {
    try {
      const unreadCount = await this.notificationRepository.getUnreadCount(userId);
      
      return { unread_count: unreadCount };
    } catch (error) {
      logger.error('Error fetching unread count:', error);
      throw error;
    }
  }

  /**
   * Get a specific notification by ID
   */
  async getNotificationById(
    id: string,
    currentUser: AuthenticatedUser
  ): Promise<NotificationWithSender> {
    try {
      const notification = await this.notificationRepository.findByIdAndUserId(id, currentUser.id);
      
      if (!notification) {
        throw new Error('Notification not found');
      }

      return notification;
    } catch (error) {
      logger.error('Error fetching notification:', error);
      throw error;
    }
  }

  /**
   * Update a notification
   */
  async updateNotification(
    id: string,
    data: UpdateNotificationRequest,
    currentUser: AuthenticatedUser
  ): Promise<Notification> {
    try {
      // Validate notification type if provided
      if (data.notification_type) {
        const validTypes = ['message', 'class_update', 'assignment', 'announcement', 'event', 'system'];
        if (!validTypes.includes(data.notification_type)) {
          throw new Error('Invalid notification type');
        }
      }

      // Validate priority if provided
      if (data.priority) {
        const validPriorities = ['low', 'normal', 'high', 'urgent'];
        if (!validPriorities.includes(data.priority)) {
          throw new Error('Invalid priority level');
        }
      }

      const notification = await this.notificationRepository.update(id, currentUser.id, data);
      
      if (!notification) {
        throw new Error('Notification not found or update failed');
      }

      logger.info(`Notification updated: ${id} by user ${currentUser.id}`);
      
      return notification;
    } catch (error) {
      logger.error('Error updating notification:', error);
      throw error;
    }
  }

  /**
   * Mark a specific notification as read
   */
  async markAsRead(
    id: string,
    currentUser: AuthenticatedUser
  ): Promise<MarkReadResponse> {
    try {
      const success = await this.notificationRepository.markAsRead(id, currentUser.id);
      
      if (!success) {
        throw new Error('Notification not found or already read');
      }

      logger.info(`Notification marked as read: ${id} by user ${currentUser.id}`);
      
      return {
        success: true,
        notification_id: id
      };
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(currentUser: AuthenticatedUser): Promise<MarkReadResponse> {
    try {
      const markedCount = await this.notificationRepository.markAllAsRead(currentUser.id);
      
      logger.info(`Marked ${markedCount} notifications as read for user ${currentUser.id}`);
      
      return {
        success: true,
        marked_count: markedCount
      };
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(
    id: string,
    currentUser: AuthenticatedUser
  ): Promise<{ success: boolean }> {
    try {
      const success = await this.notificationRepository.delete(id, currentUser.id);
      
      if (!success) {
        throw new Error('Notification not found');
      }

      logger.info(`Notification deleted: ${id} by user ${currentUser.id}`);
      
      return { success: true };
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Create notifications for multiple users (useful for broadcasting)
   */
  async createBulkNotifications(
    userIds: string[],
    notificationData: Omit<CreateNotificationRequest, 'user_id'>,
    currentUser: AuthenticatedUser
  ): Promise<Notification[]> {
    try {
      // Validate required fields
      if (!notificationData.title || !notificationData.content || !notificationData.notification_type) {
        throw new Error('Missing required fields: title, content, and notification_type are required');
      }

      if (!userIds || userIds.length === 0) {
        throw new Error('At least one user ID is required');
      }

      // Validate notification type
      const validTypes = ['message', 'class_update', 'assignment', 'announcement', 'event', 'system'];
      if (!validTypes.includes(notificationData.notification_type)) {
        throw new Error('Invalid notification type');
      }

      const notifications = userIds.map(userId => ({
        ...notificationData,
        user_id: userId,
        sender_id: notificationData.sender_id || currentUser.id
      }));

      const createdNotifications = await this.notificationRepository.createMany(notifications);
      
      logger.info(`Bulk notifications created: ${createdNotifications.length} notifications for ${userIds.length} users`);
      
      return createdNotifications;
    } catch (error) {
      logger.error('Error creating bulk notifications:', error);
      throw error;
    }
  }
} 
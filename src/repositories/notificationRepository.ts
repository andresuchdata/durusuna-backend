import { Knex } from 'knex';
import {
  Notification,
  NotificationWithSender,
  CreateNotificationRequest,
  UpdateNotificationRequest,
  NotificationQueryParams,
  NotificationType
} from '../types/notification';

export class NotificationRepository {
  constructor(private db: Knex) {}

  /**
   * Create a new notification
   */
  async create(data: CreateNotificationRequest): Promise<Notification> {
    // Extract indexed fields from action_data for better query performance
    const actionData = data.action_data || {};
    
    const [notification] = await this.db('notifications')
      .insert({
        title: data.title,
        content: data.content,
        notification_type: data.notification_type,
        priority: data.priority || 'normal',
        user_id: data.user_id,
        sender_id: data.sender_id,
        action_url: data.action_url,
        action_data: data.action_data ? JSON.stringify(data.action_data) : '{}',
        image_url: data.image_url,
        is_read: false,
        read_at: null,
        // ✅ Populate indexed columns for fast filtering
        class_id: actionData.class_id || null,
        update_id: actionData.update_id || null,
        assignment_id: actionData.assignment_id || null,
        conversation_id: actionData.conversation_id || null,
        message_id: actionData.message_id || null,
      })
      .returning('*');

    return this.parseNotification(notification);
  }

  /**
   * Find notifications for a user with pagination and filtering
   */
  async findByUserId(
    userId: string,
    params: NotificationQueryParams = {}
  ): Promise<{ notifications: NotificationWithSender[]; total: number }> {
    const {
      read_status = '',
      notification_type,
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = params;

    const pageLimit = Math.min(Math.max(limit, 1), 50); // Limit between 1-50
    const offset = (Math.max(page, 1) - 1) * pageLimit;

    // Build the base query
    let query = this.db('notifications')
      .select(
        'notifications.*',
        'sender.id as sender_id',
        'sender.first_name as sender_first_name',
        'sender.last_name as sender_last_name',
        'sender.avatar_url as sender_avatar_url',
        'sender.email as sender_email',
        'sender.user_type as sender_user_type',
        'sender.role as sender_role'
      )
      .leftJoin('users as sender', 'notifications.sender_id', 'sender.id')
      .where('notifications.user_id', userId);

    // Apply filters
    if (read_status === 'read') {
      query = query.where('notifications.is_read', true);
    } else if (read_status === 'unread') {
      query = query.where('notifications.is_read', false);
    }

    if (notification_type) {
      query = query.where('notifications.notification_type', notification_type);
    }

    // ✅ Filter by class ID using indexed column (much faster than JSON extraction)
    if (params.class_id) {
      query = query.where('notifications.class_id', params.class_id);
    }

    // Get total count for pagination
    const countQuery = query.clone().clearSelect().count('* as total');
    const [{ total }] = await countQuery;

    // Apply sorting and pagination
    query = query
      .orderBy(`notifications.${sort_by}`, sort_order)
      .limit(pageLimit)
      .offset(offset);

    const results = await query;

    const notifications: NotificationWithSender[] = results.map(row => ({
      ...this.parseNotification(row),
      sender: row.sender_id ? {
        id: row.sender_id,
        first_name: row.sender_first_name,
        last_name: row.sender_last_name,
        avatar_url: row.sender_avatar_url,
        email: row.sender_email,
        user_type: row.sender_user_type,
        role: row.sender_role
      } : undefined
    }));

    return { notifications, total: parseInt(total as string) };
  }

  /**
   * Get unread count for a user - highly optimized query
   */
  async getUnreadCount(userId: string): Promise<number> {
    const [result] = await this.db('notifications')
      .where('user_id', userId)
      .where('is_read', false)
      .count('* as count');

    return parseInt(result.count as string);
  }

  /**
   * Find notification by ID and user ID (for security)
   */
  async findByIdAndUserId(id: string, userId: string): Promise<NotificationWithSender | null> {
    const result = await this.db('notifications')
      .select(
        'notifications.*',
        'sender.id as sender_id',
        'sender.first_name as sender_first_name',
        'sender.last_name as sender_last_name',
        'sender.avatar_url as sender_avatar_url',
        'sender.email as sender_email'
      )
      .leftJoin('users as sender', 'notifications.sender_id', 'sender.id')
      .where('notifications.id', id)
      .where('notifications.user_id', userId)
      .first();

    if (!result) return null;

    return {
      ...this.parseNotification(result),
      sender: result.sender_id ? {
        id: result.sender_id,
        first_name: result.sender_first_name,
        last_name: result.sender_last_name,
        avatar_url: result.sender_avatar_url,
        email: result.sender_email
      } : undefined
    };
  }

  /**
   * Update notification
   */
  async update(id: string, userId: string, data: UpdateNotificationRequest): Promise<Notification | null> {
    const updateData: any = {
      updated_at: this.db.fn.now()
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.notification_type !== undefined) updateData.notification_type = data.notification_type;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.action_url !== undefined) updateData.action_url = data.action_url;
    if (data.action_data !== undefined) updateData.action_data = JSON.stringify(data.action_data);
    if (data.image_url !== undefined) updateData.image_url = data.image_url;

    const [updated] = await this.db('notifications')
      .where('id', id)
      .where('user_id', userId)
      .update(updateData)
      .returning('*');

    return updated ? this.parseNotification(updated) : null;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userId: string): Promise<boolean> {
    const updated = await this.db('notifications')
      .where('id', id)
      .where('user_id', userId)
      .where('is_read', false) // Only update if not already read
      .update({
        is_read: true,
        read_at: this.db.fn.now(),
        updated_at: this.db.fn.now()
      });

    return updated > 0;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const updated = await this.db('notifications')
      .where('user_id', userId)
      .where('is_read', false)
      .update({
        is_read: true,
        read_at: this.db.fn.now(),
        updated_at: this.db.fn.now()
      });

    return updated;
  }

  /**
   * Delete notification
   */
  async delete(id: string, userId: string): Promise<boolean> {
    const deleted = await this.db('notifications')
      .where('id', id)
      .where('user_id', userId)
      .del();

    return deleted > 0;
  }

  /**
   * Bulk create notifications (useful for broadcasting)
   */
  async createMany(notifications: CreateNotificationRequest[]): Promise<Notification[]> {
    const insertData = notifications.map(data => ({
      title: data.title,
      content: data.content,
      notification_type: data.notification_type,
      priority: data.priority || 'normal',
      user_id: data.user_id,
      sender_id: data.sender_id,
      action_url: data.action_url,
      action_data: data.action_data ? JSON.stringify(data.action_data) : '{}',
      image_url: data.image_url,
      is_read: false,
      read_at: null
    }));

    const results = await this.db('notifications')
      .insert(insertData)
      .returning('*');

    return results.map(this.parseNotification);
  }

  /**
   * Helper method to parse notification data
   */
  private parseNotification(row: any): Notification {
    // Handle action_data - it might already be parsed as an object or still be a string
    let actionData = {};
    if (row.action_data) {
      if (typeof row.action_data === 'string') {
        try {
          actionData = JSON.parse(row.action_data);
        } catch (error) {
          console.warn('Failed to parse action_data as JSON:', row.action_data, error);
          actionData = {};
        }
      } else if (typeof row.action_data === 'object') {
        actionData = row.action_data;
      }
    }

    return {
      id: row.id,
      title: row.title,
      content: row.content,
      notification_type: row.notification_type,
      priority: row.priority,
      is_read: row.is_read,
      user_id: row.user_id,
      sender_id: row.sender_id,
      action_url: row.action_url,
      action_data: actionData,
      image_url: row.image_url,
      read_at: row.read_at ? new Date(row.read_at) : undefined,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
} 
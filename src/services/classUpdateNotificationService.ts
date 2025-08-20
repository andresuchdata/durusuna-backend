import { Knex } from 'knex';
import { FCMTopicManager } from './notification/FCMTopicManager';
import { NotificationDispatcher } from './notification/NotificationDispatcher';
import { Notification } from '../types/notification';
import { 
  getNotificationTypeForClassUpdate, 
  getNotificationTypeForComment, 
  getDefaultPriority 
} from '../types/notificationTypes';
import logger from '../shared/utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface ClassUpdateNotificationData {
  updateId: string;
  classId: string;
  authorId: string;
  title?: string;
  content: string;
  updateType: 'announcement' | 'homework' | 'reminder' | 'event';
}

export interface ClassUpdateCommentNotificationData {
  commentId: string;
  updateId: string;
  classId: string;
  authorId: string;
  content: string;
  isReply: boolean;
}

export class ClassUpdateNotificationService {
  private fcmTopicManager: FCMTopicManager;

  constructor(
    private db: Knex,
    private notificationDispatcher: NotificationDispatcher
  ) {
    this.fcmTopicManager = new FCMTopicManager(db);
  }

  /**
   * Send notifications when a class update is created
   */
  async notifyClassUpdateCreated(data: ClassUpdateNotificationData): Promise<void> {
    try {
      logger.info(`🔔 ClassUpdate: Starting notification for update ${data.updateId} in class ${data.classId}`);

      // Get class and author information
      const [classInfo, authorInfo] = await Promise.all([
        this.getClassInfo(data.classId),
        this.getAuthorInfo(data.authorId)
      ]);

      if (!classInfo) {
        logger.error(`🔔 ClassUpdate: Class ${data.classId} not found`);
        return;
      }

      if (!authorInfo) {
        logger.error(`🔔 ClassUpdate: Author ${data.authorId} not found`);
        return;
      }

      // Send notifications via FCM Topics (this now creates individual notifications per user)
      await this.sendViaTopics(data, classInfo, authorInfo);

      logger.info(`🔔 ClassUpdate: Successfully sent notifications for update ${data.updateId}`);
    } catch (error) {
      logger.error(`🔔 ClassUpdate: Failed to send notifications for update ${data.updateId}:`, error);
      throw error;
    }
  }

  /**
   * Send notifications when a comment is created on a class update
   */
  async notifyClassUpdateCommentCreated(data: ClassUpdateCommentNotificationData): Promise<void> {
    try {
      logger.info(`🔔 ClassUpdateComment: Starting notification for comment ${data.commentId} on update ${data.updateId}`);

      // Get class, author, and update information
      const [classInfo, authorInfo, updateInfo] = await Promise.all([
        this.getClassInfo(data.classId),
        this.getAuthorInfo(data.authorId),
        this.getUpdateInfo(data.updateId)
      ]);

      if (!classInfo || !authorInfo || !updateInfo) {
        logger.error(`🔔 ClassUpdateComment: Missing required information for comment ${data.commentId}`);
        return;
      }

      // Send via FCM Topics (this now creates individual notifications per user)
      await this.sendCommentViaTopics(data, classInfo, authorInfo, updateInfo);

      logger.info(`🔔 ClassUpdateComment: Successfully sent notifications for comment ${data.commentId}`);
    } catch (error) {
      logger.error(`🔔 ClassUpdateComment: Failed to send notifications for comment ${data.commentId}:`, error);
      throw error;
    }
  }

  /**
   * Send update notifications via FCM topics
   */
  private async sendViaTopics(
    data: ClassUpdateNotificationData,
    classInfo: any,
    authorInfo: any
  ): Promise<void> {
    // Get subscribers (for logging and individual fallback if needed)
    const subscribers = await this.fcmTopicManager.getClassUpdateSubscribers(data.classId);
    const filteredSubscribers = subscribers.filter(userId => userId !== data.authorId);

    logger.info(`🔔 ClassUpdate: Found ${filteredSubscribers.length} subscribers for class ${data.classId}`);

    if (filteredSubscribers.length === 0) {
      logger.info(`🔔 ClassUpdate: No subscribers to notify for class ${data.classId}`);
      return;
    }

    // Create individual notification records for each subscriber
    const notifications: Notification[] = [];
    for (const userId of filteredSubscribers) {
      const notificationType = getNotificationTypeForClassUpdate(data.updateType);
      const notification = await this.createNotificationForUser({
        userId,
        senderId: data.authorId,
        type: notificationType,
        title: this.buildUpdateNotificationTitle(data, classInfo.name, authorInfo),
        content: this.buildUpdateNotificationContent(data),
        action_url: `/classes/${data.classId}/updates/${data.updateId}`,
        action_data: {
          class_id: data.classId,
          update_id: data.updateId,
          update_type: data.updateType
        },
        priority: getDefaultPriority(notificationType)
      });
      notifications.push(notification);
    }

    // Send via FCM Topic (one message to topic for all subscribers)
    if (notifications.length > 0 && notifications[0]) {
      const firstNotification = notifications[0];
      await this.fcmTopicManager.sendToClassTopic(data.classId, 'updates', {
        title: firstNotification.title, // All notifications have same title/content
        body: firstNotification.content,
        data: {
          notification_id: firstNotification.id, // Use first notification ID for reference
          update_id: data.updateId,
          update_type: data.updateType,
          author_name: `${authorInfo.first_name} ${authorInfo.last_name}`
        }
      });
    }

    // Enqueue individual notifications for socket/email channels
    for (const notification of notifications) {
      await this.notificationDispatcher.enqueue(
        notification,
        [notification.user_id], // Single user per notification
        ['socket', 'email'] // FCM already sent via topic
      );
    }
  }

  /**
   * Send comment notifications via FCM topics
   */
  private async sendCommentViaTopics(
    data: ClassUpdateCommentNotificationData,
    classInfo: any,
    authorInfo: any,
    updateInfo: any
  ): Promise<void> {
    const subscribers = await this.fcmTopicManager.getClassCommentSubscribers(data.classId);
    const filteredSubscribers = subscribers.filter(userId => userId !== data.authorId);

    logger.info(`🔔 ClassUpdateComment: Found ${filteredSubscribers.length} subscribers for class ${data.classId}`);

    if (filteredSubscribers.length === 0) {
      logger.info(`🔔 ClassUpdateComment: No subscribers to notify for class ${data.classId}`);
      return;
    }

    // Create individual notification records for each subscriber
    const notifications: Notification[] = [];
    for (const userId of filteredSubscribers) {
      const notificationType = getNotificationTypeForComment(data.isReply);
      const notification = await this.createNotificationForUser({
        userId,
        senderId: data.authorId,
        type: notificationType,
        title: this.buildCommentNotificationTitle(data, classInfo.name, authorInfo),
        content: this.buildCommentNotificationContent(data, updateInfo),
        action_url: `/classes/${data.classId}/updates/${data.updateId}#comment-${data.commentId}`,
        action_data: {
          class_id: data.classId,
          update_id: data.updateId,
          comment_id: data.commentId,
          is_reply: data.isReply
        },
        priority: getDefaultPriority(notificationType)
      });
      notifications.push(notification);
    }

    // Send via FCM Topic (one message to topic for all subscribers)
    if (notifications.length > 0 && notifications[0]) {
      const firstNotification = notifications[0];
      await this.fcmTopicManager.sendToClassTopic(data.classId, 'comments', {
        title: firstNotification.title,
        body: firstNotification.content,
        data: {
          notification_id: firstNotification.id,
          update_id: data.updateId,
          comment_id: data.commentId,
          author_name: `${authorInfo.first_name} ${authorInfo.last_name}`,
          is_reply: data.isReply.toString()
        }
      });
    }

    // Enqueue individual notifications for socket/email channels
    for (const notification of notifications) {
      await this.notificationDispatcher.enqueue(
        notification,
        [notification.user_id], // Single user per notification
        ['socket', 'email'] // FCM already sent via topic
      );
    }
  }

  // Helper methods for building notification content
  private buildUpdateNotificationTitle(
    data: ClassUpdateNotificationData,
    className: string,
    author: any
  ): string {
    const authorName = `${author.first_name} ${author.last_name}`;
    const typeLabel = this.getUpdateTypeLabel(data.updateType);
    
    if (data.title) {
      return `${typeLabel} in ${className}: ${data.title}`;
    }
    
    return `New ${typeLabel} in ${className} from ${authorName}`;
  }

  private buildUpdateNotificationContent(data: ClassUpdateNotificationData): string {
    const truncatedContent = data.content.length > 100 
      ? data.content.substring(0, 100) + '...' 
      : data.content;
    
    return truncatedContent;
  }

  private buildCommentNotificationTitle(
    data: ClassUpdateCommentNotificationData,
    className: string,
    author: any
  ): string {
    const authorName = `${author.first_name} ${author.last_name}`;
    const commentType = data.isReply ? 'Reply' : 'Comment';
    
    return `New ${commentType} in ${className} from ${authorName}`;
  }

  private buildCommentNotificationContent(
    data: ClassUpdateCommentNotificationData,
    updateInfo: any
  ): string {
    const truncatedContent = data.content.length > 100 
      ? data.content.substring(0, 100) + '...' 
      : data.content;
    
    return `On "${updateInfo.title || 'class update'}": ${truncatedContent}`;
  }

  private getUpdateTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      announcement: 'Announcement',
      homework: 'Homework',
      reminder: 'Reminder', 
      event: 'Event'
    };
    return labels[type] || 'Class Update';
  }

  // Database helper methods
  private async createNotificationForUser(data: {
    userId: string;
    senderId?: string;
    type: string;
    title: string;
    content: string;
    action_url?: string;
    action_data?: Record<string, any>;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
  }): Promise<Notification> {
    const notificationId = uuidv4();
    
    const [notification] = await this.db('notifications')
      .insert({
        id: notificationId,
        title: data.title,
        content: data.content,
        notification_type: data.type,
        priority: data.priority || 'normal',
        user_id: data.userId, // Required field!
        sender_id: data.senderId,
        action_url: data.action_url,
        action_data: JSON.stringify(data.action_data || {}),
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    return notification;
  }

  private async getClassInfo(classId: string) {
    return await this.db('classes')
      .where('id', classId)
      .where('is_active', true)
      .select('id', 'name', 'grade_level', 'section')
      .first();
  }

  private async getAuthorInfo(authorId: string) {
    return await this.db('users')
      .where('id', authorId)
      .where('is_active', true)
      .select('id', 'first_name', 'last_name', 'user_type')
      .first();
  }

  private async getUpdateInfo(updateId: string) {
    return await this.db('class_updates')
      .where('id', updateId)
      .where('is_deleted', false)
      .select('id', 'title', 'content', 'update_type')
      .first();
  }
}

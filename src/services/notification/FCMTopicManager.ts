import { Knex } from 'knex';
import { FirebaseManager } from '../../config/firebase';
import { FCMTokenRepository } from '../../repositories/fcmTokenRepository';
import logger from '../../shared/utils/logger';

export interface TopicSubscription {
  id: string;
  user_id: string;
  topic_name: string;
  topic_type: 'class_updates' | 'class_comments' | 'attendance' | 'grades';
  class_id?: string;
  is_subscribed: boolean;
  subscribed_at: Date;
  unsubscribed_at?: Date;
}

export interface ClassTopicConfig {
  classId: string;
  updatesTopic: string;
  commentsTopic: string;
}

export class FCMTopicManager {
  private readonly firebaseManager: FirebaseManager;
  private readonly tokenRepository: FCMTokenRepository;

  constructor(private db: Knex) {
    this.firebaseManager = FirebaseManager.getInstance();
    this.tokenRepository = new FCMTokenRepository(db);
  }

  /**
   * Generate topic names for a class
   */
  getClassTopics(classId: string): ClassTopicConfig {
    return {
      classId,
      updatesTopic: `class_${classId}_updates`,
      commentsTopic: `class_${classId}_comments`
    };
  }

  /**
   * Subscribe a user to class topics based on their role
   */
  async subscribeUserToClassTopics(
    userId: string, 
    classId: string, 
    userType: 'student' | 'teacher' | 'parent'
  ): Promise<void> {
    const topics = this.getClassTopics(classId);
    const fcmToken = await this.tokenRepository.getToken(userId);
    
    if (!fcmToken) {
      logger.warn(`🔥 FCM Topic: No token found for user ${userId}, skipping topic subscription`);
      return;
    }

    const messaging = this.firebaseManager.getMessaging();
    if (!messaging) {
      logger.warn('🔥 FCM Topic: Firebase messaging not available');
      return;
    }

    try {
      // All users get class updates
      await this.subscribeToTopic(userId, fcmToken, topics.updatesTopic, 'class_updates', classId);
      
      // All users get comment notifications  
      await this.subscribeToTopic(userId, fcmToken, topics.commentsTopic, 'class_comments', classId);

      logger.info(`🔥 FCM Topic: Successfully subscribed user ${userId} (${userType}) to class ${classId} topics`);
    } catch (error) {
      logger.error(`🔥 FCM Topic: Failed to subscribe user ${userId} to class topics:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe a user from class topics
   */
  async unsubscribeUserFromClassTopics(userId: string, classId: string): Promise<void> {
    const topics = this.getClassTopics(classId);
    const fcmToken = await this.tokenRepository.getToken(userId);
    
    if (!fcmToken) {
      logger.warn(`🔥 FCM Topic: No token found for user ${userId}, skipping topic unsubscription`);
      return;
    }

    const messaging = this.firebaseManager.getMessaging();
    if (!messaging) {
      logger.warn('🔥 FCM Topic: Firebase messaging not available');
      return;
    }

    try {
      // Unsubscribe from both topics
      await this.unsubscribeFromTopic(userId, fcmToken, topics.updatesTopic);
      await this.unsubscribeFromTopic(userId, fcmToken, topics.commentsTopic);

      logger.info(`🔥 FCM Topic: Successfully unsubscribed user ${userId} from class ${classId} topics`);
    } catch (error) {
      logger.error(`🔥 FCM Topic: Failed to unsubscribe user ${userId} from class topics:`, error);
      throw error;
    }
  }

  /**
   * Get all users who should be subscribed to class update notifications
   */
  async getClassUpdateSubscribers(classId: string): Promise<string[]> {
    // Get students and teachers directly enrolled in the class
    const directUsers = await this.db('user_classes')
      .join('users', 'user_classes.user_id', 'users.id')
      .where('user_classes.class_id', classId)
      .where('user_classes.is_active', true)
      .where('users.is_active', true)
      .select('users.id');

    // Get parents of students in the class
    const parentUsers = await this.db('user_classes')
      .join('parent_student_relationships', 'user_classes.user_id', 'parent_student_relationships.student_id')
      .join('users as parents', 'parent_student_relationships.parent_id', 'parents.id')
      .where('user_classes.class_id', classId)
      .where('user_classes.role_in_class', 'student')
      .where('user_classes.is_active', true)
      .where('parent_student_relationships.is_active', true)
      .where('parent_student_relationships.can_receive_notifications', true)
      .where('parents.is_active', true)
      .select('parents.id');

    const allUserIds = [
      ...directUsers.map(u => u.id),
      ...parentUsers.map(u => u.id)
    ];

    // Remove duplicates
    return [...new Set(allUserIds)];
  }

  /**
   * Get all users who should be subscribed to class comment notifications  
   */
  async getClassCommentSubscribers(classId: string): Promise<string[]> {
    // For comments, include teachers, students, and parents
    return this.getClassUpdateSubscribers(classId);
  }

  /**
   * Send notification to a class topic
   */
  async sendToClassTopic(
    classId: string, 
    topicType: 'updates' | 'comments',
    notification: {
      title: string;
      body: string;
      data?: Record<string, string>;
    }
  ): Promise<void> {
    const topics = this.getClassTopics(classId);
    const topicName = topicType === 'updates' ? topics.updatesTopic : topics.commentsTopic;
    
    const messaging = this.firebaseManager.getMessaging();
    if (!messaging) {
      logger.warn('🔥 FCM Topic: Firebase messaging not available');
      return;
    }

    try {
      const message = {
        topic: topicName,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: {
          type: topicType === 'updates' ? 'class_update_created' : 'class_update_comment_created',
          class_id: classId,
          ...notification.data
        },
        android: {
          priority: 'high' as const,
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
        },
      };

      const response = await messaging.send(message);
      logger.info(`🔥 FCM Topic: Successfully sent notification to topic ${topicName}`, {
        messageId: response,
        topicName,
        classId
      });
    } catch (error) {
      logger.error(`🔥 FCM Topic: Failed to send notification to topic ${topicName}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe a user to a specific topic
   */
  private async subscribeToTopic(
    userId: string, 
    fcmToken: string, 
    topicName: string, 
    topicType: TopicSubscription['topic_type'],
    classId?: string
  ): Promise<void> {
    const messaging = this.firebaseManager.getMessaging();
    if (!messaging) {
      throw new Error('Firebase messaging not available');
    }

    // Subscribe to topic via Firebase
    await messaging.subscribeToTopic([fcmToken], topicName);

    // Record subscription in database
    await this.db('fcm_topic_subscriptions')
      .insert({
        user_id: userId,
        topic_name: topicName,
        topic_type: topicType,
        class_id: classId,
        is_subscribed: true,
        subscribed_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      })
      .onConflict(['user_id', 'topic_name'])
      .merge({
        is_subscribed: true,
        subscribed_at: new Date(),
        unsubscribed_at: null,
        updated_at: new Date()
      });
  }

  /**
   * Unsubscribe a user from a specific topic
   */
  private async unsubscribeFromTopic(userId: string, fcmToken: string, topicName: string): Promise<void> {
    const messaging = this.firebaseManager.getMessaging();
    if (!messaging) {
      throw new Error('Firebase messaging not available');
    }

    // Unsubscribe from topic via Firebase
    await messaging.unsubscribeFromTopic([fcmToken], topicName);

    // Update subscription record in database
    await this.db('fcm_topic_subscriptions')
      .where({ user_id: userId, topic_name: topicName })
      .update({
        is_subscribed: false,
        unsubscribed_at: new Date(),
        updated_at: new Date()
      });
  }

  /**
   * Sync all class subscriptions for a user (useful for onboarding or recovery)
   */
  async syncUserClassSubscriptions(userId: string): Promise<void> {
    const userClasses = await this.db('user_classes')
      .join('users', 'user_classes.user_id', 'users.id')
      .where('user_classes.user_id', userId)
      .where('user_classes.is_active', true)
      .where('users.is_active', true)
      .select('user_classes.class_id', 'users.user_type');

    for (const userClass of userClasses) {
      await this.subscribeUserToClassTopics(
        userId, 
        userClass.class_id, 
        userClass.user_type
      );
    }

    // Also sync parent subscriptions
    const parentClasses = await this.db('parent_student_relationships')
      .join('user_classes', 'parent_student_relationships.student_id', 'user_classes.user_id')
      .where('parent_student_relationships.parent_id', userId)
      .where('parent_student_relationships.is_active', true)
      .where('parent_student_relationships.can_receive_notifications', true)
      .where('user_classes.is_active', true)
      .select('user_classes.class_id')
      .distinct();

    for (const parentClass of parentClasses) {
      await this.subscribeUserToClassTopics(userId, parentClass.class_id, 'parent');
    }
  }
}

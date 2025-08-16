import { Knex } from 'knex';
import { FCMTopicManager } from './notification/FCMTopicManager';
import logger from '../shared/utils/logger';

/**
 * Service to manage FCM topic subscriptions when users join/leave classes
 * or when parent-student relationships are created/modified
 */
export class FCMTopicSubscriptionService {
  private fcmTopicManager: FCMTopicManager;

  constructor(private db: Knex) {
    this.fcmTopicManager = new FCMTopicManager(db);
  }

  /**
   * Subscribe a user to class topics when they join a class
   * This should be called when:
   * - A user is enrolled in a class (user_classes table)
   * - A parent-student relationship is created
   */
  async onUserJoinedClass(userId: string, classId: string): Promise<void> {
    try {
      const user = await this.db('users')
        .where('id', userId)
        .where('is_active', true)
        .select('user_type')
        .first();

      if (!user) {
        logger.warn(`User ${userId} not found or inactive, skipping topic subscription`);
        return;
      }

      await this.fcmTopicManager.subscribeUserToClassTopics(userId, classId, user.user_type);
      logger.info(`🔔 FCM Topic: User ${userId} (${user.user_type}) subscribed to class ${classId} topics`);
    } catch (error) {
      logger.error(`Failed to subscribe user ${userId} to class ${classId} topics:`, error);
    }
  }

  /**
   * Unsubscribe a user from class topics when they leave a class
   * This should be called when:
   * - A user is removed from a class (user_classes is_active = false)
   * - A parent-student relationship is deactivated
   */
  async onUserLeftClass(userId: string, classId: string): Promise<void> {
    try {
      await this.fcmTopicManager.unsubscribeUserFromClassTopics(userId, classId);
      logger.info(`🔔 FCM Topic: User ${userId} unsubscribed from class ${classId} topics`);
    } catch (error) {
      logger.error(`Failed to unsubscribe user ${userId} from class ${classId} topics:`, error);
    }
  }

  /**
   * Subscribe all parents of a student to the student's class topics
   * This should be called when:
   * - A student joins a class
   * - A new parent-student relationship is created for an already enrolled student
   */
  async subscribeParentsToStudentClasses(studentId: string): Promise<void> {
    try {
      // Get all parents of this student who should receive notifications
      const parents = await this.db('parent_student_relationships')
        .join('users', 'parent_student_relationships.parent_id', 'users.id')
        .where('parent_student_relationships.student_id', studentId)
        .where('parent_student_relationships.is_active', true)
        .where('parent_student_relationships.can_receive_notifications', true)
        .where('users.is_active', true)
        .select('users.id as parent_id');

      // Get all classes the student is enrolled in
      const studentClasses = await this.db('user_classes')
        .where('user_id', studentId)
        .where('role_in_class', 'student')
        .where('is_active', true)
        .select('class_id');

      // Subscribe each parent to all the student's class topics
      for (const parent of parents) {
        for (const studentClass of studentClasses) {
          await this.fcmTopicManager.subscribeUserToClassTopics(
            parent.parent_id, 
            studentClass.class_id, 
            'parent'
          );
        }
      }

      logger.info(`🔔 FCM Topic: Subscribed ${parents.length} parents to ${studentClasses.length} class topics for student ${studentId}`);
    } catch (error) {
      logger.error(`Failed to subscribe parents to student ${studentId} class topics:`, error);
    }
  }

  /**
   * Unsubscribe all parents of a student from a specific class
   * This should be called when:
   * - A student leaves a class
   */
  async unsubscribeParentsFromStudentClass(studentId: string, classId: string): Promise<void> {
    try {
      const parents = await this.db('parent_student_relationships')
        .join('users', 'parent_student_relationships.parent_id', 'users.id')
        .where('parent_student_relationships.student_id', studentId)
        .where('parent_student_relationships.is_active', true)
        .where('users.is_active', true)
        .select('users.id as parent_id');

      for (const parent of parents) {
        await this.fcmTopicManager.unsubscribeUserFromClassTopics(parent.parent_id, classId);
      }

      logger.info(`🔔 FCM Topic: Unsubscribed ${parents.length} parents from class ${classId} for student ${studentId}`);
    } catch (error) {
      logger.error(`Failed to unsubscribe parents from class ${classId} for student ${studentId}:`, error);
    }
  }

  /**
   * Handle parent-student relationship creation
   */
  async onParentStudentRelationshipCreated(parentId: string, studentId: string): Promise<void> {
    try {
      // Get all classes the student is enrolled in
      const studentClasses = await this.db('user_classes')
        .where('user_id', studentId)
        .where('role_in_class', 'student')
        .where('is_active', true)
        .select('class_id');

      // Subscribe parent to all the student's class topics
      for (const studentClass of studentClasses) {
        await this.fcmTopicManager.subscribeUserToClassTopics(
          parentId, 
          studentClass.class_id, 
          'parent'
        );
      }

      logger.info(`🔔 FCM Topic: Parent ${parentId} subscribed to ${studentClasses.length} class topics for student ${studentId}`);
    } catch (error) {
      logger.error(`Failed to handle parent-student relationship creation (${parentId}-${studentId}):`, error);
    }
  }

  /**
   * Handle parent-student relationship deletion/deactivation
   */
  async onParentStudentRelationshipRemoved(parentId: string, studentId: string): Promise<void> {
    try {
      // Get all classes the student is enrolled in
      const studentClasses = await this.db('user_classes')
        .where('user_id', studentId)
        .where('role_in_class', 'student')
        .where('is_active', true)
        .select('class_id');

      // Check if parent has other children in these classes
      for (const studentClass of studentClasses) {
        const hasOtherChildrenInClass = await this.db('parent_student_relationships')
          .join('user_classes', 'parent_student_relationships.student_id', 'user_classes.user_id')
          .where('parent_student_relationships.parent_id', parentId)
          .where('parent_student_relationships.student_id', '!=', studentId)
          .where('parent_student_relationships.is_active', true)
          .where('parent_student_relationships.can_receive_notifications', true)
          .where('user_classes.class_id', studentClass.class_id)
          .where('user_classes.role_in_class', 'student')
          .where('user_classes.is_active', true)
          .select('parent_student_relationships.id')
          .first();

        // Only unsubscribe if parent has no other children in this class
        if (!hasOtherChildrenInClass) {
          await this.fcmTopicManager.unsubscribeUserFromClassTopics(parentId, studentClass.class_id);
        }
      }

      logger.info(`🔔 FCM Topic: Handled parent-student relationship removal (${parentId}-${studentId})`);
    } catch (error) {
      logger.error(`Failed to handle parent-student relationship removal (${parentId}-${studentId}):`, error);
    }
  }

  /**
   * Sync all subscriptions for a user (useful for recovery or initial setup)
   */
  async syncUserSubscriptions(userId: string): Promise<void> {
    try {
      await this.fcmTopicManager.syncUserClassSubscriptions(userId);
      logger.info(`🔔 FCM Topic: Synced subscriptions for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to sync subscriptions for user ${userId}:`, error);
    }
  }

  /**
   * Bulk sync all users in the system (for initial migration)
   */
  async syncAllUserSubscriptions(): Promise<void> {
    try {
      const users = await this.db('users')
        .where('is_active', true)
        .whereNotNull('fcm_token')
        .select('id');

      logger.info(`🔔 FCM Topic: Starting bulk sync for ${users.length} users with FCM tokens`);

      let synced = 0;
      for (const user of users) {
        try {
          await this.syncUserSubscriptions(user.id);
          synced++;
        } catch (error) {
          logger.error(`Failed to sync user ${user.id}:`, error);
        }
      }

      logger.info(`🔔 FCM Topic: Bulk sync completed - ${synced}/${users.length} users synced successfully`);
    } catch (error) {
      logger.error('Failed to bulk sync user subscriptions:', error);
      throw error;
    }
  }
}

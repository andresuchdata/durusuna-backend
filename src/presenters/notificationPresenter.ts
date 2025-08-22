import { NotificationWithSender } from '../types/notification';
import { NotificationTypes } from '../types/notificationTypes';

/**
 * Mobile-compatible notification types that match the mobile app's enum
 * These are the only types the mobile app supports
 */
export type MobileNotificationType = 
  // Class Update Related
  | 'class_update_announcement'
  | 'class_update_homework' 
  | 'class_update_reminder'
  | 'class_update_event'
  | 'class_update_comment'
  | 'class_update_reply'
  // Assignment Related
  | 'assignment_created'
  | 'assignment_updated'
  | 'assignment_due_soon'
  | 'assignment_submitted'
  | 'assignment_graded'
  // Attendance Related
  | 'attendance_marked'
  | 'attendance_late'
  | 'attendance_absent'
  // Grade Related
  | 'grade_posted'
  | 'grade_updated'
  // Message Related
  | 'message_received'
  | 'conversation_created'
  // System Related
  | 'system_announcement'
  | 'system_maintenance'
  | 'system_update'
  // General
  | 'announcement'
  | 'event'
  | 'reminder'
  // Legacy types (for backward compatibility)
  | 'message'
  | 'assignment'
  | 'system';

/**
 * Notification data formatted for mobile app consumption
 */
export interface MobileNotification {
  id: string;
  title: string;
  content: string;
  notification_type: MobileNotificationType;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_read: boolean;
  user_id: string;
  sender_id?: string;
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
    email: string;
    user_type: string;
    role: string;
  };
  action_url?: string;
  action_data?: Record<string, any>;
  image_url?: string;
  read_at?: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Maps backend notification types to mobile-compatible types
 * 
 * IMPORTANT: Class update comments (class_update_comment, class_update_reply) 
 * are now passed through as-is so the mobile app can navigate to class updates
 * instead of incorrectly routing to the message module.
 */
function mapNotificationTypeToMobile(backendType: string): MobileNotificationType {
  // Class update types - pass through as-is for proper mobile handling
  if (backendType === NotificationTypes.CLASS_UPDATE_ANNOUNCEMENT) return backendType as MobileNotificationType;
  if (backendType === NotificationTypes.CLASS_UPDATE_HOMEWORK) return backendType as MobileNotificationType;
  if (backendType === NotificationTypes.CLASS_UPDATE_REMINDER) return backendType as MobileNotificationType;
  if (backendType === NotificationTypes.CLASS_UPDATE_EVENT) return backendType as MobileNotificationType;
  if (backendType === NotificationTypes.CLASS_UPDATE_COMMENT) return backendType as MobileNotificationType;
  if (backendType === NotificationTypes.CLASS_UPDATE_REPLY) return backendType as MobileNotificationType;

  // Assignment types - pass through as-is for proper mobile handling
  if (backendType === NotificationTypes.ASSIGNMENT_CREATED) return backendType as MobileNotificationType;
  if (backendType === NotificationTypes.ASSIGNMENT_UPDATED) return backendType as MobileNotificationType;
  if (backendType === NotificationTypes.ASSIGNMENT_DUE_SOON) return backendType as MobileNotificationType;
  if (backendType === NotificationTypes.ASSIGNMENT_SUBMITTED) return backendType as MobileNotificationType;
  if (backendType === NotificationTypes.ASSIGNMENT_GRADED) return backendType as MobileNotificationType;

  // Attendance types - pass through as-is for proper mobile handling
  if (backendType === NotificationTypes.ATTENDANCE_MARKED) return backendType as MobileNotificationType;
  if (backendType === NotificationTypes.ATTENDANCE_LATE) return backendType as MobileNotificationType;
  if (backendType === NotificationTypes.ATTENDANCE_ABSENT) return backendType as MobileNotificationType;

  // Grade types - pass through as-is for proper mobile handling
  if (backendType === NotificationTypes.GRADE_POSTED) return backendType as MobileNotificationType;
  if (backendType === NotificationTypes.GRADE_UPDATED) return backendType as MobileNotificationType;

  // Message types - pass through as-is for proper mobile handling
  if (backendType === NotificationTypes.MESSAGE_RECEIVED) return backendType as MobileNotificationType;
  if (backendType === NotificationTypes.CONVERSATION_CREATED) return backendType as MobileNotificationType;

  // System types - pass through as-is for proper mobile handling
  if (backendType === NotificationTypes.SYSTEM_ANNOUNCEMENT) return backendType as MobileNotificationType;
  if (backendType === NotificationTypes.SYSTEM_MAINTENANCE) return backendType as MobileNotificationType;
  if (backendType === NotificationTypes.SYSTEM_UPDATE) return backendType as MobileNotificationType;

  // General types - pass through as-is for proper mobile handling
  if (backendType === NotificationTypes.ANNOUNCEMENT) return backendType as MobileNotificationType;
  if (backendType === NotificationTypes.EVENT) return backendType as MobileNotificationType;
  if (backendType === NotificationTypes.REMINDER) return backendType as MobileNotificationType;

  // Legacy types (already compatible)
  if (backendType === 'message') return 'message';
  if (backendType === 'assignment') return 'assignment';
  if (backendType === 'announcement') return 'announcement';
  if (backendType === 'event') return 'event';
  if (backendType === 'system') return 'system';

  // Default fallback
  return 'system';
}

/**
 * NotificationPresenter handles converting backend notifications to mobile-friendly format
 */
export class NotificationPresenter {
  /**
   * Converts a single notification to mobile format
   */
  static toMobile(notification: NotificationWithSender): MobileNotification {
    return {
      id: notification.id,
      title: notification.title,
      content: notification.content,
      notification_type: mapNotificationTypeToMobile(notification.notification_type),
      priority: notification.priority,
      is_read: notification.is_read,
      user_id: notification.user_id,
      sender_id: notification.sender_id,
      sender: notification.sender ? {
        id: notification.sender.id,
        first_name: notification.sender.first_name,
        last_name: notification.sender.last_name,
        avatar_url: notification.sender.avatar_url,
        email: notification.sender.email,
        user_type: (notification.sender as any).user_type || 'user',
        role: (notification.sender as any).role || '',
      } : undefined,
      action_url: notification.action_url,
      action_data: notification.action_data,
      image_url: notification.image_url,
      read_at: notification.read_at,
      created_at: notification.created_at,
      updated_at: notification.updated_at,
    };
  }

  /**
   * Converts multiple notifications to mobile format
   */
  static toMobileList(notifications: NotificationWithSender[]): MobileNotification[] {
    return notifications.map(notification => this.toMobile(notification));
  }
}

import { NotificationWithSender } from '../types/notification';
import { NotificationTypes } from '../types/notificationTypes';

/**
 * Mobile-compatible notification types that match the mobile app's enum
 * These are the only types the mobile app supports
 */
export type MobileNotificationType = 'message' | 'assignment' | 'announcement' | 'event' | 'system';

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
 */
function mapNotificationTypeToMobile(backendType: string): MobileNotificationType {
  // Class update types
  if (backendType === NotificationTypes.CLASS_UPDATE_ANNOUNCEMENT) return 'announcement';
  if (backendType === NotificationTypes.CLASS_UPDATE_HOMEWORK) return 'assignment';
  if (backendType === NotificationTypes.CLASS_UPDATE_REMINDER) return 'announcement';
  if (backendType === NotificationTypes.CLASS_UPDATE_EVENT) return 'event';
  if (backendType === NotificationTypes.CLASS_UPDATE_COMMENT) return 'message';
  if (backendType === NotificationTypes.CLASS_UPDATE_REPLY) return 'message';

  // Assignment types
  if (backendType === NotificationTypes.ASSIGNMENT_CREATED) return 'assignment';
  if (backendType === NotificationTypes.ASSIGNMENT_UPDATED) return 'assignment';
  if (backendType === NotificationTypes.ASSIGNMENT_DUE_SOON) return 'assignment';
  if (backendType === NotificationTypes.ASSIGNMENT_SUBMITTED) return 'assignment';
  if (backendType === NotificationTypes.ASSIGNMENT_GRADED) return 'assignment';

  // Attendance types
  if (backendType === NotificationTypes.ATTENDANCE_MARKED) return 'system';
  if (backendType === NotificationTypes.ATTENDANCE_LATE) return 'system';
  if (backendType === NotificationTypes.ATTENDANCE_ABSENT) return 'system';

  // Grade types
  if (backendType === NotificationTypes.GRADE_POSTED) return 'assignment';
  if (backendType === NotificationTypes.GRADE_UPDATED) return 'assignment';

  // Message types
  if (backendType === NotificationTypes.MESSAGE_RECEIVED) return 'message';
  if (backendType === NotificationTypes.CONVERSATION_CREATED) return 'message';

  // System types
  if (backendType === NotificationTypes.SYSTEM_ANNOUNCEMENT) return 'system';
  if (backendType === NotificationTypes.SYSTEM_MAINTENANCE) return 'system';
  if (backendType === NotificationTypes.SYSTEM_UPDATE) return 'system';

  // General types
  if (backendType === NotificationTypes.ANNOUNCEMENT) return 'announcement';
  if (backendType === NotificationTypes.EVENT) return 'event';
  if (backendType === NotificationTypes.REMINDER) return 'announcement';

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
        user_type: notification.sender.user_type,
        role: notification.sender.role,
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

/**
 * Centralized Notification Types System
 * 
 * This file defines all notification types used throughout the application.
 * It ensures consistency between database schema, backend services, and frontend handling.
 */

// Core notification types enum
export const NotificationTypes = {
  // Class Update Related
  CLASS_UPDATE_ANNOUNCEMENT: 'class_update_announcement',
  CLASS_UPDATE_HOMEWORK: 'class_update_homework',
  CLASS_UPDATE_REMINDER: 'class_update_reminder',
  CLASS_UPDATE_EVENT: 'class_update_event',
  
  // Class Update Comments
  CLASS_UPDATE_COMMENT: 'class_update_comment',
  CLASS_UPDATE_REPLY: 'class_update_reply',
  
  // Assignment Related
  ASSIGNMENT_CREATED: 'assignment_created',
  ASSIGNMENT_UPDATED: 'assignment_updated',
  ASSIGNMENT_DUE_SOON: 'assignment_due_soon',
  ASSIGNMENT_SUBMITTED: 'assignment_submitted',
  ASSIGNMENT_GRADED: 'assignment_graded',
  
  // Attendance Related
  ATTENDANCE_MARKED: 'attendance_marked',
  ATTENDANCE_LATE: 'attendance_late',
  ATTENDANCE_ABSENT: 'attendance_absent',
  
  // Grade Related
  GRADE_POSTED: 'grade_posted',
  GRADE_UPDATED: 'grade_updated',
  
  // Message Related
  MESSAGE_RECEIVED: 'message_received',
  CONVERSATION_CREATED: 'conversation_created',
  
  // System Related
  SYSTEM_ANNOUNCEMENT: 'system_announcement',
  SYSTEM_MAINTENANCE: 'system_maintenance',
  SYSTEM_UPDATE: 'system_update',
  
  // General
  ANNOUNCEMENT: 'announcement',
  EVENT: 'event',
  REMINDER: 'reminder',
} as const;

// Type for all notification types
export type NotificationType = typeof NotificationTypes[keyof typeof NotificationTypes];

// Array of all notification types for database enum
export const ALL_NOTIFICATION_TYPES: NotificationType[] = Object.values(NotificationTypes);

// Class update type to notification type mapping
export const ClassUpdateTypeToNotificationType: Record<string, NotificationType> = {
  'announcement': NotificationTypes.CLASS_UPDATE_ANNOUNCEMENT,
  'homework': NotificationTypes.CLASS_UPDATE_HOMEWORK,
  'reminder': NotificationTypes.CLASS_UPDATE_REMINDER,
  'event': NotificationTypes.CLASS_UPDATE_EVENT,
};

// Notification type categories for easier management
export const NotificationCategories = {
  CLASS_UPDATES: [
    NotificationTypes.CLASS_UPDATE_ANNOUNCEMENT,
    NotificationTypes.CLASS_UPDATE_HOMEWORK,
    NotificationTypes.CLASS_UPDATE_REMINDER,
    NotificationTypes.CLASS_UPDATE_EVENT,
    NotificationTypes.CLASS_UPDATE_COMMENT,
    NotificationTypes.CLASS_UPDATE_REPLY,
  ],
  ASSIGNMENTS: [
    NotificationTypes.ASSIGNMENT_CREATED,
    NotificationTypes.ASSIGNMENT_UPDATED,
    NotificationTypes.ASSIGNMENT_DUE_SOON,
    NotificationTypes.ASSIGNMENT_SUBMITTED,
    NotificationTypes.ASSIGNMENT_GRADED,
  ],
  ATTENDANCE: [
    NotificationTypes.ATTENDANCE_MARKED,
    NotificationTypes.ATTENDANCE_LATE,
    NotificationTypes.ATTENDANCE_ABSENT,
  ],
  GRADES: [
    NotificationTypes.GRADE_POSTED,
    NotificationTypes.GRADE_UPDATED,
  ],
  MESSAGES: [
    NotificationTypes.MESSAGE_RECEIVED,
    NotificationTypes.CONVERSATION_CREATED,
  ],
  SYSTEM: [
    NotificationTypes.SYSTEM_ANNOUNCEMENT,
    NotificationTypes.SYSTEM_MAINTENANCE,
    NotificationTypes.SYSTEM_UPDATE,
  ],
  GENERAL: [
    NotificationTypes.ANNOUNCEMENT,
    NotificationTypes.EVENT,
    NotificationTypes.REMINDER,
  ],
} as const;

// Priority mapping for different notification types
export const NotificationPriorities: Record<NotificationType, 'low' | 'normal' | 'high' | 'urgent'> = {
  // Class Updates - homework is high priority, others normal
  [NotificationTypes.CLASS_UPDATE_ANNOUNCEMENT]: 'normal',
  [NotificationTypes.CLASS_UPDATE_HOMEWORK]: 'high',
  [NotificationTypes.CLASS_UPDATE_REMINDER]: 'normal',
  [NotificationTypes.CLASS_UPDATE_EVENT]: 'normal',
  [NotificationTypes.CLASS_UPDATE_COMMENT]: 'low',
  [NotificationTypes.CLASS_UPDATE_REPLY]: 'low',
  
  // Assignments - time-sensitive items are high priority
  [NotificationTypes.ASSIGNMENT_CREATED]: 'high',
  [NotificationTypes.ASSIGNMENT_UPDATED]: 'normal',
  [NotificationTypes.ASSIGNMENT_DUE_SOON]: 'urgent',
  [NotificationTypes.ASSIGNMENT_SUBMITTED]: 'normal',
  [NotificationTypes.ASSIGNMENT_GRADED]: 'high',
  
  // Attendance
  [NotificationTypes.ATTENDANCE_MARKED]: 'low',
  [NotificationTypes.ATTENDANCE_LATE]: 'normal',
  [NotificationTypes.ATTENDANCE_ABSENT]: 'high',
  
  // Grades
  [NotificationTypes.GRADE_POSTED]: 'high',
  [NotificationTypes.GRADE_UPDATED]: 'normal',
  
  // Messages
  [NotificationTypes.MESSAGE_RECEIVED]: 'normal',
  [NotificationTypes.CONVERSATION_CREATED]: 'low',
  
  // System
  [NotificationTypes.SYSTEM_ANNOUNCEMENT]: 'normal',
  [NotificationTypes.SYSTEM_MAINTENANCE]: 'urgent',
  [NotificationTypes.SYSTEM_UPDATE]: 'low',
  
  // General
  [NotificationTypes.ANNOUNCEMENT]: 'normal',
  [NotificationTypes.EVENT]: 'normal',
  [NotificationTypes.REMINDER]: 'normal',
};

// Helper functions
export const getNotificationTypeForClassUpdate = (updateType: string): NotificationType => {
  return ClassUpdateTypeToNotificationType[updateType] || NotificationTypes.CLASS_UPDATE_ANNOUNCEMENT;
};

export const getNotificationTypeForComment = (isReply: boolean): NotificationType => {
  return isReply ? NotificationTypes.CLASS_UPDATE_REPLY : NotificationTypes.CLASS_UPDATE_COMMENT;
};

export const getDefaultPriority = (notificationType: NotificationType): 'low' | 'normal' | 'high' | 'urgent' => {
  return NotificationPriorities[notificationType] || 'normal';
};

export const isClassUpdateNotification = (notificationType: NotificationType): boolean => {
  return NotificationCategories.CLASS_UPDATES.includes(notificationType);
};

export const isHighPriorityNotification = (notificationType: NotificationType): boolean => {
  const priority = getDefaultPriority(notificationType);
  return priority === 'high' || priority === 'urgent';
};

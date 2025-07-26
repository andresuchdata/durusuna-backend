export type NotificationType = 'message' | 'assignment' | 'announcement' | 'event' | 'system';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  title: string;
  content: string;
  notification_type: NotificationType;
  priority: NotificationPriority;
  is_read: boolean;
  user_id: string;
  sender_id?: string;
  action_url?: string;
  action_data?: Record<string, any>;
  image_url?: string;
  read_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationWithSender extends Notification {
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
    email: string;
  };
}

export interface CreateNotificationRequest {
  title: string;
  content: string;
  notification_type: NotificationType;
  priority?: NotificationPriority;
  user_id: string;
  sender_id?: string;
  action_url?: string;
  action_data?: Record<string, any>;
  image_url?: string;
}

export interface UpdateNotificationRequest {
  title?: string;
  content?: string;
  notification_type?: NotificationType;
  priority?: NotificationPriority;
  action_url?: string;
  action_data?: Record<string, any>;
  image_url?: string;
}

export interface NotificationQueryParams {
  read_status?: 'read' | 'unread' | '';
  notification_type?: NotificationType;
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'priority';
  sort_order?: 'asc' | 'desc';
}

export interface NotificationListResponse {
  notifications: NotificationWithSender[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  unread_count: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface MarkReadResponse {
  success: boolean;
  notification_id?: string;
  marked_count?: number;
} 
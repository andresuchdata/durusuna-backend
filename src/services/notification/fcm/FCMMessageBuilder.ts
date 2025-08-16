import { Message } from 'firebase-admin/messaging';
import { Notification } from '../../../types/notification';

export class FCMMessageBuilder {
  private static readonly ANDROID_CONFIG = {
    icon: 'ic_notification',
    color: '#1E3A8A',
    channelId: 'durusuna_notifications',
    priority: 'high' as const,
    defaultSound: true,
  };

  private static readonly APNS_CONFIG = {
    priority: '10',
    pushType: 'alert' as const,
    badge: 1,
    sound: 'default',
    contentAvailable: 1,
  };

  build(fcmToken: string, notification: Notification): Message {
    return {
      token: fcmToken,
      notification: this.buildNotificationPayload(notification),
      data: this.buildDataPayload(notification),
      android: this.buildAndroidConfig(notification),
      apns: this.buildApnsConfig(notification),
    };
  }

  private buildNotificationPayload(notification: Notification) {
    return {
      title: notification.title,
      body: notification.content,
      ...(notification.image_url && { imageUrl: notification.image_url }),
    };
  }

  private buildDataPayload(notification: Notification) {
    return {
      notificationId: notification.id,
      notificationType: notification.notification_type,
      priority: notification.priority?.toString() || '0',
      actionUrl: notification.action_url || '',
      actionData: notification.action_data ? JSON.stringify(notification.action_data) : '',
      createdAt: notification.created_at?.toISOString() || new Date().toISOString(),
    };
  }

  private buildAndroidConfig(notification: Notification) {
    return {
      notification: FCMMessageBuilder.ANDROID_CONFIG,
      data: {
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
    };
  }

  private buildApnsConfig(notification: Notification) {
    return {
      payload: {
        aps: {
          alert: {
            title: notification.title,
            body: notification.content,
          },
          badge: FCMMessageBuilder.APNS_CONFIG.badge,
          sound: FCMMessageBuilder.APNS_CONFIG.sound,
          'content-available': FCMMessageBuilder.APNS_CONFIG.contentAvailable,
        },
      },
      headers: {
        'apns-priority': FCMMessageBuilder.APNS_CONFIG.priority,
        'apns-push-type': FCMMessageBuilder.APNS_CONFIG.pushType,
      },
    };
  }
}

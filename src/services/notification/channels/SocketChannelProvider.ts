import { ChannelProvider, NotificationChannel } from '../NotificationDispatcher';
import { Notification } from '../../../types/notification';
import logger from '../../../shared/utils/logger';

export class SocketChannelProvider implements ChannelProvider {
  public readonly channel: NotificationChannel = 'socket';

  async send(input: { userId: string; notification: Notification }): Promise<'sent' | 'skipped'> {
    try {
      logger.info(`📡 SocketChannelProvider: Attempting to send notification ${input.notification.id} to user ${input.userId}`);

      if (!global.io || typeof (global.io as any).emitToUser !== 'function') {
        logger.warn('SocketChannelProvider: io.emitToUser not available; skipping');
        return 'skipped';
      }

      // Visibility: is the user currently online (joined to personal room)?
      try {
        const isOnline = typeof (global.io as any).isUserOnline === 'function'
          ? (global.io as any).isUserOnline(input.userId)
          : undefined;
        if (isOnline === false) {
          logger.warn(`📴 SocketChannelProvider: User ${input.userId} offline at send time`);
        } else if (isOnline === true) {
          logger.info(`🟢 SocketChannelProvider: User ${input.userId} is online`);
        }
      } catch (_) {
        // ignore
      }

      const payload = {
        notification: {
          id: input.notification.id,
          title: input.notification.title,
          content: input.notification.content,
          notification_type: input.notification.notification_type,
          priority: input.notification.priority,
          action_url: input.notification.action_url,
          action_data: input.notification.action_data,
          image_url: input.notification.image_url,
          created_at: input.notification.created_at,
        },
        action: 'created',
        timestamp: new Date().toISOString(),
      };

      logger.info(`📡 SocketChannelProvider: Emitting notification:new to user ${input.userId}`);
      (global.io as any).emitToUser(input.userId, 'notification:new', payload);
      
      logger.info(`📡 SocketChannelProvider: Successfully sent notification ${input.notification.id} to user ${input.userId}`);
      return 'sent';
    } catch (error) {
      logger.error('SocketChannelProvider.send error', error);
      throw error;
    }
  }
}



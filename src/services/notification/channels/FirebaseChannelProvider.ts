import { ChannelProvider, NotificationChannel } from '../NotificationDispatcher';
import { Notification } from '../../../types/notification';
import { FirebaseManager } from '../../../config/firebase';
import { FCMTokenRepository } from '../../../repositories/fcmTokenRepository';
import { FCMMessageBuilder } from '../fcm/FCMMessageBuilder';
import { FCMErrorHandler } from '../fcm/FCMErrorHandler';
import logger from '../../../shared/utils/logger';
import { Knex } from 'knex';

export class FirebaseChannelProvider implements ChannelProvider {
  public readonly channel: NotificationChannel = 'firebase';
  
  private readonly firebaseManager: FirebaseManager;
  private readonly tokenRepository: FCMTokenRepository;
  private readonly messageBuilder: FCMMessageBuilder;
  private readonly errorHandler: FCMErrorHandler;

  constructor(db: Knex) {
    this.firebaseManager = FirebaseManager.getInstance();
    this.tokenRepository = new FCMTokenRepository(db);
    this.messageBuilder = new FCMMessageBuilder();
    this.errorHandler = new FCMErrorHandler(this.tokenRepository);
  }

  async send(input: { userId: string; notification: Notification }): Promise<'sent' | 'skipped'> {
    try {
      if (!this.firebaseManager.isInitialized()) {
        await this.firebaseManager.initialize();
        if (!this.firebaseManager.isInitialized()) {
          logger.warn('🔥 Firebase: Not initialized, skipping');
          return 'skipped';
        }
      }

      const fcmToken = await this.tokenRepository.getToken(input.userId);
      if (!fcmToken) {
        logger.warn(`🔥 Firebase: No FCM token for user ${input.userId}, skipping`);
        return 'skipped';
      }

      const messaging = this.firebaseManager.getMessaging()!;
      const message = this.messageBuilder.build(fcmToken, input.notification);
      
      const response = await messaging.send(message);
      
      logger.info(`🔥 Firebase: Notification sent successfully`, {
        notificationId: input.notification.id,
        userId: input.userId,
        messageId: response,
        tokenPrefix: fcmToken.substring(0, 20) + '...'
      });

      return 'sent';
    } catch (error: any) {
      return await this.errorHandler.handle(error, input.userId, input.notification.id);
    }
  }
}
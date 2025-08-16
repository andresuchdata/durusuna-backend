import { FCMTokenRepository } from '../../../repositories/fcmTokenRepository';
import logger from '../../../shared/utils/logger';

export class FCMErrorHandler {
  private static readonly INVALID_TOKEN_ERRORS = [
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
  ];

  constructor(private tokenRepository: FCMTokenRepository) {}

  async handle(error: any, userId: string, notificationId: string): Promise<'sent' | 'skipped'> {
    const errorCode = error.code;
    
    if (FCMErrorHandler.INVALID_TOKEN_ERRORS.includes(errorCode)) {
      logger.warn(`🔥 Firebase: Invalid token for user ${userId}`, { errorCode });
      await this.tokenRepository.removeToken(userId);
      return 'skipped';
    }

    logger.error('🔥 Firebase: Send failed', {
      error: error.message,
      code: errorCode,
      userId,
      notificationId,
    });
    
    throw error;
  }
}

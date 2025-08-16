import { Knex } from 'knex';
import logger from '../shared/utils/logger';

export class FCMTokenRepository {
  constructor(private db: Knex) {}

  async getToken(userId: string): Promise<string | null> {
    try {
      const row = await this.db('users')
        .select('fcm_token')
        .where('id', userId)
        .first();
      
      return row?.fcm_token ?? null;
    } catch (error) {
      logger.error('FCMTokenRepository: Failed to get token', { userId, error });
      return null;
    }
  }

  async updateToken(userId: string, fcmToken: string): Promise<void> {
    try {
      await this.db('users')
        .where('id', userId)
        .update({
          fcm_token: fcmToken,
          fcm_token_updated_at: new Date(),
          updated_at: new Date()
        });
      
      logger.info('FCMTokenRepository: Token updated', { userId });
    } catch (error) {
      logger.error('FCMTokenRepository: Failed to update token', { userId, error });
      throw error;
    }
  }

  async removeToken(userId: string): Promise<void> {
    try {
      await this.db('users')
        .where('id', userId)
        .update({
          fcm_token: null,
          fcm_token_updated_at: new Date(),
          updated_at: new Date()
        });
      
      logger.info('FCMTokenRepository: Token removed', { userId });
    } catch (error) {
      logger.error('FCMTokenRepository: Failed to remove token', { userId, error });
      throw error;
    }
  }
}

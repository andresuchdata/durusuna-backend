import { Knex } from 'knex';
import logger from '../shared/utils/logger';

export class FCMTokenRepository {
  constructor(private db: Knex) {}

  /**
   * Get FCM token for a user
   */
  async getToken(userId: string): Promise<string | null> {
    try {
      const user = await this.db('users')
        .where('id', userId)
        .where('is_active', true)
        .select('fcm_token')
        .first();

      return user?.fcm_token || null;
    } catch (error) {
      logger.error(`Failed to get FCM token for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Update FCM token for a user
   */
  async updateToken(userId: string, fcmToken: string): Promise<void> {
    try {
      await this.db('users')
        .where('id', userId)
        .update({
          fcm_token: fcmToken,
          fcm_token_updated_at: new Date(),
          updated_at: new Date()
        });

      logger.info(`Updated FCM token for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to update FCM token for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Remove FCM token for a user (on logout or token invalidation)
   */
  async removeToken(userId: string): Promise<void> {
    try {
      await this.db('users')
        .where('id', userId)
        .update({
          fcm_token: null,
          fcm_token_updated_at: null,
          updated_at: new Date()
        });

      logger.info(`Removed FCM token for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to remove FCM token for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get all valid FCM tokens for multiple users
   */
  async getTokensForUsers(userIds: string[]): Promise<Array<{ userId: string; token: string }>> {
    try {
      if (userIds.length === 0) return [];

      const users = await this.db('users')
        .whereIn('id', userIds)
        .where('is_active', true)
        .whereNotNull('fcm_token')
        .select('id', 'fcm_token');

      return users.map(user => ({
        userId: user.id,
        token: user.fcm_token
      }));
    } catch (error) {
      logger.error('Failed to get FCM tokens for users:', error);
      return [];
    }
  }

  /**
   * Check if a token is valid/exists
   */
  async isTokenValid(fcmToken: string): Promise<boolean> {
    try {
      const user = await this.db('users')
        .where('fcm_token', fcmToken)
        .where('is_active', true)
        .select('id')
        .first();

      return !!user;
    } catch (error) {
      logger.error('Failed to validate FCM token:', error);
      return false;
    }
  }

  /**
   * Clean up old/invalid tokens
   */
  async cleanupInvalidTokens(invalidTokens: string[]): Promise<void> {
    try {
      if (invalidTokens.length === 0) return;

      await this.db('users')
        .whereIn('fcm_token', invalidTokens)
        .update({
          fcm_token: null,
          fcm_token_updated_at: null,
          updated_at: new Date()
        });

      logger.info(`Cleaned up ${invalidTokens.length} invalid FCM tokens`);
    } catch (error) {
      logger.error('Failed to cleanup invalid FCM tokens:', error);
      throw error;
    }
  }
}
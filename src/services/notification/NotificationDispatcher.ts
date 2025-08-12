import { Notification } from '../../types/notification';
import { NotificationOutboxRepository } from '../../repositories/notificationOutboxRepository';
import { NotificationDeliveryRepository } from '../../repositories/notificationDeliveryRepository';
import logger from '../../utils/logger';

export type NotificationChannel = 'socket' | 'email';

export interface ChannelProvider {
  channel: NotificationChannel;
  send(input: { userId: string; notification: Notification }): Promise<'sent' | 'skipped'>;
}

export class NotificationDispatcher {
  constructor(
    private outboxRepo: NotificationOutboxRepository,
    private deliveryRepo: NotificationDeliveryRepository,
    private providers: ChannelProvider[],
  ) {}

  async enqueue(notification: Notification, userIds: string[], channels: NotificationChannel[] = ['socket', 'email']) {
    for (const userId of userIds) {
      // Create delivery records up-front for dedupe/observability
      for (const channel of channels) {
        await this.deliveryRepo.upsertQueued({ notificationId: notification.id, userId, channel });
      }
      await this.outboxRepo.enqueue({ notificationId: notification.id, userId, channels });
    }
  }

  async process(outboxId: string, data: { notification: Notification; userId: string; channels: NotificationChannel[] }) {
    const { notification, userId, channels } = data;
    try {
      for (const channel of channels) {
        const provider = this.providers.find(p => p.channel === channel);
        if (!provider) continue;
        const result = await provider.send({ userId, notification });
        if (result === 'sent') {
          await this.deliveryRepo.markSentByComposite({ notificationId: notification.id, userId, channel: channel as any });
        }
      }
      await this.outboxRepo.markSent(outboxId);
    } catch (err: any) {
      logger.error('NotificationDispatcher.process error', { outboxId, err: err?.message || String(err) });
      await this.outboxRepo.rescheduleFailure(outboxId, err?.message || String(err), 60_000, 1);
    }
  }
}



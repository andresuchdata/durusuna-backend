import dotenv from 'dotenv';
dotenv.config();

import db from '../config/database';
import logger from '../shared/utils/logger';
import { NotificationOutboxRepository } from '../repositories/notificationOutboxRepository';
import { NotificationDeliveryRepository } from '../repositories/notificationDeliveryRepository';
import { NotificationRepository } from '../repositories/notificationRepository';
import { NotificationDispatcher } from '../services/notification/NotificationDispatcher';
import { SocketChannelProvider } from '../services/notification/channels/SocketChannelProvider';
import { EmailChannelProvider } from '../services/notification/channels/EmailChannelProvider';

const outboxRepo = new NotificationOutboxRepository(db);
const deliveryRepo = new NotificationDeliveryRepository(db);
const notificationRepo = new NotificationRepository(db);

const providers = [
  new SocketChannelProvider(),
  new EmailChannelProvider(db),
];

const dispatcher = new NotificationDispatcher(outboxRepo, deliveryRepo, providers);

async function runOnce() {
  const batch = await outboxRepo.leaseNextBatch(25);
  if (batch.length === 0) return;
  for (const job of batch) {
    try {
      const notification = await db('notifications').where('id', job.notification_id).first();
      if (!notification) {
        logger.warn('notificationWorker: notification missing', { id: job.notification_id });
        await outboxRepo.markSent(job.id); // drop it
        continue;
      }
      await dispatcher.process(job.id, {
        notification: notificationRepo['parseNotification']
          ? (notificationRepo as any)['parseNotification'](notification)
          : notification,
        userId: job.user_id,
        channels: job.channels as any,
      });
    } catch (err: any) {
      logger.error('notificationWorker job error', { jobId: job.id, err: err?.message || String(err) });
      await outboxRepo.rescheduleFailure(job.id, err?.message || String(err), 60_000, job.attempts);
    }
  }
}

async function loop() {
  logger.info('notificationWorker started');
  while (true) {
    try {
      await runOnce();
    } catch (e) {
      logger.error('notificationWorker loop error', e);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
}

if (require.main === module) {
  loop();
}



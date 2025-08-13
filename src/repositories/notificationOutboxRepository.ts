import { Knex } from 'knex';
import logger from '../shared/utils/logger';

export type OutboxStatus = 'queued' | 'processing' | 'sent' | 'failed';

export interface OutboxRecord {
  id: string;
  notification_id: string;
  user_id: string;
  channels: string[];
  status: OutboxStatus;
  attempts: number;
  next_run_at: Date;
  last_error?: string;
  created_at: Date;
  updated_at: Date;
}

export class NotificationOutboxRepository {
  constructor(private db: Knex) {}

  async enqueue(params: {
    notificationId: string;
    userId: string;
    channels: string[];
    runAt?: Date;
  }): Promise<OutboxRecord> {
    const [row] = await this.db('notification_outbox')
      .insert({
        notification_id: params.notificationId,
        user_id: params.userId,
        channels: JSON.stringify(params.channels),
        status: 'queued',
        attempts: 0,
        next_run_at: params.runAt || this.db.fn.now(),
      })
      .returning('*');
    logger.info(`🧾 Outbox inserted: notif=${params.notificationId} user=${params.userId} channels=${params.channels.length}`);
    return this.parse(row);
  }

  async leaseNextBatch(limit: number = 50): Promise<OutboxRecord[]> {
    const rows = await this.db('notification_outbox')
      .where('status', 'queued')
      .andWhere('next_run_at', '<=', this.db.fn.now())
      .orderBy('next_run_at', 'asc')
      .limit(limit)
      .forUpdate()
      .skipLocked();

    if (rows.length === 0) return [];

    const ids = rows.map(r => r.id);
    await this.db('notification_outbox')
      .whereIn('id', ids)
      .update({ status: 'processing', updated_at: this.db.fn.now() });

    return rows.map(this.parse);
  }

  async markSent(id: string): Promise<void> {
    await this.db('notification_outbox')
      .where('id', id)
      .update({ status: 'sent', updated_at: this.db.fn.now() });
  }

  async rescheduleFailure(id: string, error: string, delayMs: number, attempts: number): Promise<void> {
    await this.db('notification_outbox')
      .where('id', id)
      .update({
        status: attempts >= 5 ? 'failed' : 'queued',
        attempts: attempts + 1,
        last_error: error,
        next_run_at: new Date(Date.now() + delayMs),
        updated_at: this.db.fn.now(),
      });
  }

  private parse(row: any): OutboxRecord {
    return {
      id: row.id,
      notification_id: row.notification_id,
      user_id: row.user_id,
      channels: Array.isArray(row.channels) ? row.channels : JSON.parse(row.channels || '[]'),
      status: row.status,
      attempts: row.attempts,
      next_run_at: new Date(row.next_run_at),
      last_error: row.last_error || undefined,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}



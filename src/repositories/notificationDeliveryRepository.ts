import { Knex } from 'knex';

export type DeliveryChannel = 'socket' | 'email';
export type DeliveryStatus = 'queued' | 'sent' | 'failed' | 'acknowledged';

export interface DeliveryRecord {
  id: string;
  notification_id: string;
  user_id: string;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  attempts: number;
  sent_at?: Date;
  ack_at?: Date;
  last_error?: string;
  created_at: Date;
  updated_at: Date;
}

export class NotificationDeliveryRepository {
  constructor(private db: Knex) {}

  async upsertQueued(params: { notificationId: string; userId: string; channel: DeliveryChannel }): Promise<DeliveryRecord> {
    const existing = await this.db('notification_deliveries')
      .where({ notification_id: params.notificationId, user_id: params.userId, channel: params.channel })
      .first();
    if (existing) return this.parse(existing);

    const [row] = await this.db('notification_deliveries')
      .insert({
        notification_id: params.notificationId,
        user_id: params.userId,
        channel: params.channel,
        status: 'queued',
        attempts: 0,
      })
      .returning('*');
    return this.parse(row);
  }

  async markSent(id: string): Promise<void> {
    await this.db('notification_deliveries')
      .where('id', id)
      .update({ status: 'sent', sent_at: this.db.fn.now(), updated_at: this.db.fn.now() });
  }

  async markSentByComposite(params: { notificationId: string; userId: string; channel: DeliveryChannel }): Promise<void> {
    await this.db('notification_deliveries')
      .where({ notification_id: params.notificationId, user_id: params.userId, channel: params.channel })
      .update({ status: 'sent', sent_at: this.db.fn.now(), updated_at: this.db.fn.now() });
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.db('notification_deliveries')
      .where('id', id)
      .update({ status: 'failed', last_error: error, updated_at: this.db.fn.now() });
  }

  async acknowledge(notificationId: string, userId: string): Promise<number> {
    return this.db('notification_deliveries')
      .where({ notification_id: notificationId, user_id: userId, channel: 'socket' })
      .update({ status: 'acknowledged', ack_at: this.db.fn.now(), updated_at: this.db.fn.now() });
  }

  private parse(row: any): DeliveryRecord {
    return {
      id: row.id,
      notification_id: row.notification_id,
      user_id: row.user_id,
      channel: row.channel,
      status: row.status,
      attempts: row.attempts,
      sent_at: row.sent_at ? new Date(row.sent_at) : undefined,
      ack_at: row.ack_at ? new Date(row.ack_at) : undefined,
      last_error: row.last_error || undefined,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}



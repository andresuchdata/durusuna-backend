import { ChannelProvider, NotificationChannel } from '../NotificationDispatcher';
import { Notification } from '../../../types/notification';
import nodemailer from 'nodemailer';
import logger from '../../../shared/utils/logger';
import { Knex } from 'knex';

export class EmailChannelProvider implements ChannelProvider {
  public readonly channel: NotificationChannel = 'email';
  private transporter: nodemailer.Transporter | null = null;

  constructor(private db: Knex) {}

  private async getUserEmail(userId: string): Promise<string | null> {
    const row = await this.db('users').select('email').where('id', userId).first();
    return row?.email ?? null;
  }

  private getTransporter(): nodemailer.Transporter | null {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !port || !user || !pass) return null;
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }
    return this.transporter;
  }

  async send(input: { userId: string; notification: Notification }): Promise<'sent' | 'skipped'> {
    try {
      const transporter = this.getTransporter();
      if (!transporter) {
        logger.warn('EmailChannelProvider: SMTP not configured; skipping');
        return 'skipped';
      }
      const to = await this.getUserEmail(input.userId);
      if (!to) return 'skipped';

      const from = process.env.EMAIL_FROM || 'no-reply@durusuna.app';
      const subject = input.notification.title;
      const text = input.notification.content;
      const html = `<p>${escapeHtml(text)}</p>`;

      await transporter.sendMail({ from, to, subject, text, html });
      return 'sent';
    } catch (error) {
      logger.error('EmailChannelProvider.send error', error);
      throw error;
    }
  }
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}



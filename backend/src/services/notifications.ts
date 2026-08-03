import nodemailer from 'nodemailer';
import Notification, { NotificationType } from '../models/Notification';
import { sendWebPushToUser } from './webPush';
import { logger } from '../logger';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export interface CreateNotificationParams {
  user: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedListing?: string;
  relatedTransaction?: string;
  relatedReview?: string;
  /** Web push tıklanınca açılacak relative path (varsayılan: /tr) */
  pushUrl?: string;
}

// Bildirim oluşturur. Hata durumunda ana akışı bozmamak için sadece loglar.
// VAPID tanımlıysa aynı anda Web Push da gönderilir.
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    await Notification.create({
      user: params.user,
      type: params.type,
      title: params.title,
      message: params.message,
      relatedListing: params.relatedListing,
      relatedTransaction: params.relatedTransaction,
      relatedReview: params.relatedReview
    });

    await sendWebPushToUser(params.user, {
      title: params.title,
      body: params.message,
      url: params.pushUrl || '/tr',
    });
  } catch (error) {
    logger.error({ event: 'notification_create_failed', err: error }, 'Bildirim oluşturulamadı');
  }
}

// Kritik olaylarda (satış, para yatırma) email gönderir. Hata durumunda ana akışı bozmaz.
export async function sendCriticalEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return;
    }
    await transporter.sendMail({ to, subject, html });
  } catch (error) {
    logger.error({ event: 'notification_email_failed', err: error }, 'Bildirim e-postası gönderilemedi');
  }
}

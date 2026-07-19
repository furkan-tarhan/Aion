import nodemailer from 'nodemailer';
import Notification, { NotificationType } from '../models/Notification';

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
}

// Bildirim oluşturur. Hata durumunda ana akışı bozmamak için sadece loglar.
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
  } catch (error) {
    console.error('Bildirim oluşturulamadı:', error);
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
    console.error('Bildirim e-postası gönderilemedi:', error);
  }
}

import webpush from 'web-push';
import User from '../models/User';
import { logger } from '../logger';

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@localhost';

export const isWebPushConfigured = Boolean(vapidPublicKey && vapidPrivateKey);

if (isWebPushConfigured) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export function getVapidPublicKey(): string | null {
  return isWebPushConfigured ? vapidPublicKey : null;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/** Kullanıcının kayıtlı tüm push aboneliklerine bildirim gönderir. VAPID yoksa no-op. */
export async function sendWebPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!isWebPushConfigured) return;

  try {
    const user = await User.findById(userId).select('pushSubscriptions').lean();
    const subs = user?.pushSubscriptions || [];
    if (!subs.length) return;

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/tr',
    });

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
            },
            body
          );
        } catch (err: any) {
          // 404/410: abonelik artık geçerli değil — temizle
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await User.updateOne(
              { _id: userId },
              { $pull: { pushSubscriptions: { endpoint: sub.endpoint } } }
            );
          } else {
            logger.warn({ event: 'web_push_failed', err, userId }, 'Web push gönderilemedi');
          }
        }
      })
    );
  } catch (err) {
    logger.warn({ event: 'web_push_error', err, userId }, 'Web push hatası');
  }
}

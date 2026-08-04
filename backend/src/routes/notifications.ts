import express, { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import jwt from 'jsonwebtoken';
import Notification from '../models/Notification';
import User from '../models/User';
import { getVapidPublicKey, isWebPushConfigured } from '../services/webPush';

const router = express.Router();
const JWT_SECRET: string = config.jwt.secret;

// JWT doğrulama middleware'i
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token gerekli' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Geçersiz token' });
    (req as any).user = user;
    next();
  });
}

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Bildirimleri listele (sayfalanmış)
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *       - { in: query, name: unreadOnly, schema: { type: string, enum: ['true', 'false'] } }
 *     responses:
 *       200:
 *         description: Bildirim listesi + pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Notification' } }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
// Bildirimleri listele (sayfalanmış)
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const unreadOnly = req.query.unreadOnly === 'true';

    const filter: Record<string, any> = { user: userId };
    if (unreadOnly) filter.isRead = false;

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: notifications,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Notification list error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     summary: Okunmamış bildirim sayısını getir (Navbar polling için)
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Okunmamış sayısı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object, properties: { count: { type: integer } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
// Okunmamış bildirim sayısı
router.get('/unread-count', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const count = await Notification.countDocuments({ user: userId, isRead: false });
    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /notifications/push/vapid-public-key:
 *   get:
 *     summary: Web Push VAPID public key (frontend subscribe için)
 *     tags: [Notifications]
 *     security: []
 *     responses:
 *       200:
 *         description: Public key veya null (VAPID yapılandırılmamış)
 */
router.get('/push/vapid-public-key', (_req: Request, res: Response) => {
  res.json({ success: true, data: { publicKey: getVapidPublicKey() } });
});

/**
 * @swagger
 * /notifications/push/subscribe:
 *   post:
 *     summary: Web Push aboneliğini kaydet
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subscription]
 *             properties:
 *               subscription:
 *                 type: object
 *                 properties:
 *                   endpoint: { type: string }
 *                   keys: { type: object, properties: { p256dh: { type: string }, auth: { type: string } } }
 *     responses:
 *       200: { description: Abonelik kaydedildi }
 *       503: { description: VAPID yapılandırılmamış }
 */
router.post('/push/subscribe', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!isWebPushConfigured) {
      return res.status(503).json({ success: false, message: 'Web Push yapılandırılmamış (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)' });
    }

    const userId = (req as any).user.userId;
    const sub = req.body?.subscription;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return res.status(400).json({ success: false, message: 'Geçersiz subscription' });
    }

    // Aynı endpoint varsa önce kaldır, sonra ekle (yeniden abone olma / key rotasyonu)
    await User.updateOne(
      { _id: userId },
      { $pull: { pushSubscriptions: { endpoint: sub.endpoint } } }
    );
    await User.updateOne(
      { _id: userId },
      {
        $push: {
          pushSubscriptions: {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
            createdAt: new Date(),
          },
        },
      }
    );

    res.json({ success: true, message: 'Push aboneliği kaydedildi' });
  } catch (error) {
    console.error('Push subscribe error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /notifications/push/unsubscribe:
 *   post:
 *     summary: Web Push aboneliğini kaldır
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/push/unsubscribe', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const endpoint = req.body?.endpoint;
    if (!endpoint) {
      return res.status(400).json({ success: false, message: 'endpoint gerekli' });
    }
    await User.updateOne({ _id: userId }, { $pull: { pushSubscriptions: { endpoint } } });
    res.json({ success: true, message: 'Push aboneliği kaldırıldı' });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Tek bir bildirimi okundu işaretle
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: Bildirim güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Notification' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
// Tek bir bildirimi okundu işaretle
router.patch('/:id/read', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Bildirim bulunamadı' });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /notifications/read-all:
 *   patch:
 *     summary: Tüm bildirimleri okundu işaretle
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Tüm bildirimler okundu olarak işaretlendi }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
// Tüm bildirimleri okundu işaretle
router.patch('/read-all', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    await Notification.updateMany({ user: userId, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'Tüm bildirimler okundu olarak işaretlendi' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

export default router;

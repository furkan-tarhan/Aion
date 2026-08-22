import express, { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Listing from '../models/Listing';
import Skin from '../models/Skin';
import Transaction from '../models/Transaction';
import { requireAdmin } from '../middleware/adminAuth';
import { createNotification, sendCriticalEmail } from '../services/notifications';
import { logger } from '../logger';
import { swaggerSpec } from '../swagger';
import { getBotStatus } from '../services/steamBot';

const router = express.Router();
const JWT_SECRET: string = config.jwt.secret;

function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Token gerekli' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Geçersiz token' });
    (req as any).user = user;
    next();
  });
}

router.use(authenticateToken, requireAdmin);

/**
 * @swagger
 * /admin/bot-status:
 *   get:
 *     summary: Steam trade botunun durumu (yapılandırılmış mı, oturum açık mı)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Bot durumu }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
// Steam trade bot durumu
router.get('/bot-status', (req: Request, res: Response) => {
  res.json({ success: true, data: getBotStatus() });
});

/**
 * @swagger
 * /admin/stats:
 *   get:
 *     summary: Dashboard istatistikleri (kullanıcı/ilan/satış sayıları)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: İstatistik verisi }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
// Dashboard istatistikleri
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      bannedUsers,
      newUsersLast7Days,
      totalSkins,
      listingStatusAgg,
      salesAgg,
      recentUsers,
      recentListings
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isBanned: true }),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Skin.countDocuments(),
      Listing.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Listing.aggregate([
        { $match: { status: 'sold' } },
        { $group: { _id: null, totalVolume: { $sum: '$price' }, totalCount: { $sum: 1 } } }
      ]),
      User.find().select('username email role isBanned createdAt').sort({ createdAt: -1 }).limit(5).lean(),
      Listing.find().populate('seller', 'username').select('title price status seller createdAt').sort({ createdAt: -1 }).limit(5).lean()
    ]);

    const listingsByStatus: Record<string, number> = { active: 0, sold: 0, cancelled: 0 };
    listingStatusAgg.forEach((row: any) => { listingsByStatus[row._id] = row.count; });

    res.json({
      success: true,
      data: {
        totalUsers,
        bannedUsers,
        newUsersLast7Days,
        totalSkins,
        listingsByStatus,
        totalListings: listingsByStatus.active + listingsByStatus.sold + listingsByStatus.cancelled,
        totalSalesVolume: salesAgg[0]?.totalVolume || 0,
        totalSalesCount: salesAgg[0]?.totalCount || 0,
        recentUsers,
        recentListings
      }
    });
  } catch (error) {
    console.error('Admin stats hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Kullanıcı listesi (arama + filtre + sayfalama)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *       - { in: query, name: q, schema: { type: string }, description: 'username/email arama' }
 *       - { in: query, name: role, schema: { type: string, enum: [user, admin] } }
 *       - { in: query, name: banned, schema: { type: string, enum: ['true', 'false'] } }
 *     responses:
 *       200:
 *         description: Kullanıcı listesi + pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { $ref: '#/components/schemas/User' } }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
// Kullanıcı listesi (arama + filtre + sayfalama)
router.get('/users', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const q = (req.query.q as string || '').trim();
    const role = req.query.role as string;
    const banned = req.query.banned as string;

    const filter: Record<string, any> = {};
    if (q) {
      filter.$or = [
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ];
    }
    if (role === 'user' || role === 'admin') filter.role = role;
    if (banned === 'true') filter.isBanned = true;
    else if (banned === 'false') filter.isBanned = false;

    const [users, total] = await Promise.all([
      User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Admin kullanıcı listesi hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /admin/users/{id}/ban:
 *   patch:
 *     summary: Kullanıcıyı banla (giriş yapamaz olur, bildirim + email gönderilir)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200: { description: Kullanıcı banlandı }
 *       400: { description: 'Kendinizi/adminleri banlayamazsınız' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
// Kullanıcı banla
router.patch('/users/:id/ban', async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const adminId = (req as any).user.userId;

    if (req.params.id === adminId) {
      return res.status(400).json({ success: false, message: 'Kendinizi banlayamazsınız' });
    }

    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }
    if (target.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Admin kullanıcılar banlanamaz' });
    }

    target.isBanned = true;
    target.bannedAt = new Date();
    target.banReason = reason || undefined;
    await target.save();

    logger.warn(
      { event: 'admin_user_banned', adminId, targetUserId: target._id, reason },
      'Admin kullanıcıyı banladı'
    );

    try {
      await createNotification({
        user: String(target._id),
        type: 'account_banned',
        title: 'Hesabınız Askıya Alındı',
        message: reason ? `Hesabınız askıya alındı. Sebep: ${reason}` : 'Hesabınız askıya alındı.'
      });
      await sendCriticalEmail(
        target.email,
        'Hesabınız Askıya Alındı',
        `<p>Hesabınız askıya alınmıştır.</p>${reason ? `<p>Sebep: ${reason}</p>` : ''}`
      );
    } catch (notifyError) {
      console.error('Ban bildirim hatası:', notifyError);
    }

    res.json({ success: true, message: 'Kullanıcı banlandı' });
  } catch (error) {
    console.error('Ban hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /admin/users/{id}/unban:
 *   patch:
 *     summary: Kullanıcının banını kaldır
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Kullanıcının banı kaldırıldı }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
// Kullanıcının banını kaldır
router.patch('/users/:id/unban', async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user.userId;
    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    target.isBanned = false;
    target.bannedAt = undefined;
    target.banReason = undefined;
    await target.save();

    logger.info(
      { event: 'admin_user_unbanned', adminId, targetUserId: target._id },
      'Admin kullanıcının banını kaldırdı'
    );

    try {
      await createNotification({
        user: String(target._id),
        type: 'account_unbanned',
        title: 'Hesabınızın Askısı Kaldırıldı',
        message: 'Hesabınızın askıya alınma durumu kaldırıldı, tekrar giriş yapabilirsiniz.'
      });
    } catch (notifyError) {
      console.error('Unban bildirim hatası:', notifyError);
    }

    res.json({ success: true, message: 'Kullanıcının banı kaldırıldı' });
  } catch (error) {
    console.error('Unban hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /admin/users/{id}/role:
 *   patch:
 *     summary: Kullanıcının rolünü değiştir (user/admin)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [user, admin] }
 *     responses:
 *       200:
 *         description: Rol güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { $ref: '#/components/schemas/User' }
 *       400: { description: 'Geçersiz rol / kendi rolünüzü değiştiremezsiniz' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
// Kullanıcı rolünü değiştir
router.patch('/users/:id/role', async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    const adminId = (req as any).user.userId;

    if (role !== 'user' && role !== 'admin') {
      return res.status(400).json({ success: false, message: 'Geçersiz rol' });
    }
    if (req.params.id === adminId) {
      return res.status(400).json({ success: false, message: 'Kendi rolünüzü değiştiremezsiniz' });
    }

    const target = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!target) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    logger.warn(
      { event: 'admin_role_changed', adminId, targetUserId: target._id, newRole: role },
      'Admin kullanıcı rolünü değiştirdi'
    );

    res.json({ success: true, message: 'Kullanıcı rolü güncellendi', data: target });
  } catch (error) {
    console.error('Rol güncelleme hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /admin/listings:
 *   get:
 *     summary: Tüm ilanları listele (moderasyon, tüm status'ler)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *       - { in: query, name: status, schema: { type: string, enum: [active, sold, cancelled] } }
 *       - { in: query, name: q, schema: { type: string }, description: 'başlıkta arama' }
 *     responses:
 *       200:
 *         description: İlan listesi + pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Listing' } }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
// Tüm ilanlar (moderasyon için, tüm status'ler)
router.get('/listings', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;
    const q = (req.query.q as string || '').trim();

    const filter: Record<string, any> = {};
    if (status === 'active' || status === 'sold' || status === 'cancelled') filter.status = status;
    if (q) filter.title = { $regex: q, $options: 'i' };

    const [listings, total] = await Promise.all([
      Listing.find(filter)
        .populate('seller', 'username email')
        .populate('skin')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Listing.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: listings,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Admin ilan listesi hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /admin/listings/{id}:
 *   delete:
 *     summary: İlanı kaldır (moderasyon — sadece aktif ilanlar, bildirim + email gönderilir)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200: { description: İlan kaldırıldı }
 *       400: { description: Sadece aktif ilanlar kaldırılabilir }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
// İlanı kaldır (moderasyon)
router.delete('/listings/:id', async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user.userId;
    const { reason } = req.body;
    const listing = await Listing.findById(req.params.id).populate('seller', 'username email');
    if (!listing) {
      return res.status(404).json({ success: false, message: 'İlan bulunamadı' });
    }
    if (listing.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Sadece aktif ilanlar kaldırılabilir' });
    }

    listing.status = 'cancelled';
    await listing.save();

    logger.warn(
      { event: 'admin_listing_removed', adminId, listingId: listing._id, reason },
      'Admin ilanı kaldırdı'
    );

    const seller = listing.seller as any;
    try {
      await createNotification({
        user: seller._id.toString(),
        type: 'listing_removed',
        title: 'İlanınız Kaldırıldı',
        message: reason
          ? `"${listing.title}" ilanınız yönetici tarafından kaldırıldı. Sebep: ${reason}`
          : `"${listing.title}" ilanınız yönetici tarafından kaldırıldı.`,
        relatedListing: listing._id.toString()
      });
      if (seller?.email) {
        await sendCriticalEmail(
          seller.email,
          'İlanınız Kaldırıldı',
          `<p><strong>${listing.title}</strong> ilanınız yönetici tarafından kaldırıldı.</p>${reason ? `<p>Sebep: ${reason}</p>` : ''}`
        );
      }
    } catch (notifyError) {
      console.error('İlan kaldırma bildirim hatası:', notifyError);
    }

    res.json({ success: true, message: 'İlan kaldırıldı' });
  } catch (error) {
    console.error('İlan kaldırma hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /admin/withdrawals:
 *   get:
 *     summary: Kripto çekim taleplerini listele (varsayılan sadece bekleyenler)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *       - { in: query, name: status, schema: { type: string, enum: [pending, completed, failed, all] }, description: 'Varsayılan: pending' }
 *     responses:
 *       200:
 *         description: Çekim talebi listesi + pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Transaction' } }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
// Kripto çekim talepleri (admin manuel coin gönderimi için takip listesi)
router.get('/withdrawals', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const status = (req.query.status as string) || 'pending';

    const filter: Record<string, any> = { type: 'withdrawal' };
    if (status !== 'all') filter.status = status;

    const [withdrawals, total] = await Promise.all([
      Transaction.find(filter)
        .populate('user', 'username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: withdrawals,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Admin çekim listesi hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /admin/withdrawals/{id}/complete:
 *   patch:
 *     summary: Çekim talebini tamamlandı olarak işaretle (coin admin tarafından manuel gönderildikten sonra)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Çekim talebi tamamlandı olarak işaretlendi }
 *       400: { description: 'Talep zaten işlenmiş' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
// Çekim talebini tamamlandı işaretle — coin gönderildikten sonra admin burayı tıklar
router.patch('/withdrawals/:id/complete', async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user.userId;
    const transaction = await Transaction.findOne({ _id: req.params.id, type: 'withdrawal' });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Çekim talebi bulunamadı' });
    }
    if (transaction.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Bu talep zaten işlenmiş' });
    }

    transaction.status = 'completed';
    await transaction.save();

    logger.info(
      { event: 'admin_withdrawal_completed', adminId, transactionId: transaction._id, userId: transaction.user },
      'Admin çekim talebini tamamlandı işaretledi'
    );

    try {
      await createNotification({
        user: transaction.user.toString(),
        type: 'withdrawal',
        title: 'Çekiminiz Gönderildi',
        message: `${Math.abs(transaction.amount)} USD tutarındaki kripto çekiminiz gönderildi.`,
        relatedTransaction: transaction._id.toString()
      });
    } catch (notifyError) {
      console.error('Withdrawal complete bildirim hatası:', notifyError);
    }

    res.json({ success: true, message: 'Çekim talebi tamamlandı olarak işaretlendi' });
  } catch (error) {
    console.error('Çekim tamamlama hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /admin/withdrawals/{id}/reject:
 *   patch:
 *     summary: Çekim talebini reddet (bakiye kullanıcıya iade edilir)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200: { description: Çekim talebi reddedildi, bakiye iade edildi }
 *       400: { description: 'Talep zaten işlenmiş' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
// Çekim talebini reddet — örn. geçersiz/ulaşılamayan adres — bakiye kullanıcıya geri eklenir
router.patch('/withdrawals/:id/reject', async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user.userId;
    const { reason } = req.body;
    const transaction = await Transaction.findOne({ _id: req.params.id, type: 'withdrawal' });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Çekim talebi bulunamadı' });
    }
    if (transaction.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Bu talep zaten işlenmiş' });
    }

    const refundAmount = Math.abs(transaction.amount);
    transaction.status = 'failed';
    await transaction.save();

    const updatedUser = await User.findByIdAndUpdate(
      transaction.user,
      { $inc: { balance: refundAmount } },
      { new: true }
    );

    logger.warn(
      { event: 'admin_withdrawal_rejected', adminId, transactionId: transaction._id, userId: transaction.user, reason },
      'Admin çekim talebini reddetti, bakiye iade edildi'
    );

    try {
      await createNotification({
        user: transaction.user.toString(),
        type: 'withdrawal',
        title: 'Çekim Talebiniz Reddedildi',
        message: reason
          ? `${refundAmount} USD tutarındaki çekim talebiniz reddedildi ve bakiyenize iade edildi. Sebep: ${reason}`
          : `${refundAmount} USD tutarındaki çekim talebiniz reddedildi ve bakiyenize iade edildi.`,
        relatedTransaction: transaction._id.toString()
      });
    } catch (notifyError) {
      console.error('Withdrawal reject bildirim hatası:', notifyError);
    }

    res.json({ success: true, message: 'Çekim talebi reddedildi, bakiye iade edildi', data: { balance: updatedUser?.balance } });
  } catch (error) {
    console.error('Çekim reddetme hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

// OpenAPI spec JSON — admin panelindeki "API Dokümantasyonu" sekmesi (SwaggerUI) bu endpoint'i
// authenticated fetch ile çeker. router.use(authenticateToken, requireAdmin) yukarıda tüm route'ları
// koruduğu için burada ekstra bir şey yapmaya gerek yok.
router.get('/docs', (req: Request, res: Response) => {
  res.json(swaggerSpec);
});

export default router;

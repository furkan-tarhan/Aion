import express, { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import Review from '../models/Review';
import User from '../models/User';
import jwt from 'jsonwebtoken';
import { createNotification } from '../services/notifications';

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
 * /reviews:
 *   post:
 *     summary: Kullanıcı için değerlendirme yaz (alıcı/satıcı puanlama)
 *     tags: [Reviews]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [revieweeId, rating, comment]
 *             properties:
 *               revieweeId: { type: string }
 *               listingId: { type: string, nullable: true }
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               comment: { type: string, maxLength: 500 }
 *     responses:
 *       201:
 *         description: Değerlendirme oluşturuldu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { $ref: '#/components/schemas/Review' }
 *       400: { description: 'Geçersiz veri / zaten değerlendirilmiş / kendini değerlendirme' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
// Değerlendirme yaz
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { revieweeId, listingId, rating, comment } = req.body;
    const reviewerId = (req as any).user.userId;

    if (!revieweeId || !rating || !comment) {
      return res.status(400).json({ success: false, message: 'revieweeId, rating ve comment zorunlu' });
    }

    if (reviewerId === revieweeId) {
      return res.status(400).json({ success: false, message: 'Kendinizi değerlendiremezsiniz' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating 1-5 arasında olmalı' });
    }

    const review = new Review({
      reviewer: reviewerId,
      reviewee: revieweeId,
      listing: listingId || null,
      rating,
      comment: comment.substring(0, 500),
    });

    await review.save();

    try {
      await createNotification({
        user: revieweeId,
        type: 'review',
        title: 'Yeni Değerlendirme Aldınız',
        message: `${rating}/5 puanlı yeni bir değerlendirme aldınız: "${review.comment}"`,
        relatedReview: review.id
      });
    } catch (notifyError) {
      console.error('Review notification error:', notifyError);
    }

    res.status(201).json({ success: true, message: 'Değerlendirme oluşturuldu', data: review });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Bu işlem için zaten değerlendirme yapmışsınız' });
    }
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /reviews/user/{userId}:
 *   get:
 *     summary: Belirli bir kullanıcının aldığı değerlendirmeleri getir (max 50, ortalama puan ile)
 *     tags: [Reviews]
 *     security: []
 *     parameters:
 *       - { in: path, name: userId, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: Değerlendirmeler + ortalama puan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     reviews: { type: array, items: { $ref: '#/components/schemas/Review' } }
 *                     averageRating: { type: number }
 *                     totalRatings: { type: integer }
 */
// Belirli bir kullanıcının aldığı değerlendirmeler
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const reviews = await Review.find({ reviewee: userId })
      .populate('reviewer', 'username profile.avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    // Ortalama puanı hesapla
    const totalRatings = reviews.length;
    const averageRating = totalRatings > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : 0;

    res.json({
      success: true,
      data: {
        reviews,
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

export default router;

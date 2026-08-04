import express, { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import User from '../models/User';
import jwt from 'jsonwebtoken';

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
 * /favorites:
 *   get:
 *     summary: Favori skinleri (skinId listesi) getir
 *     tags: [Favorites]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Favori skinId listesi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: string } }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
// Favori skinleri getir
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = await User.findById((req as any).user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });

    res.json({ success: true, data: user.favorites || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /favorites:
 *   post:
 *     summary: Skini favorilere ekle
 *     tags: [Favorites]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [skinId]
 *             properties:
 *               skinId: { type: string }
 *     responses:
 *       200: { description: Favorilere eklendi }
 *       400: { description: Bu skin zaten favorilerde }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
// Favorilere ekle
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { skinId } = req.body;
    if (!skinId) return res.status(400).json({ success: false, message: 'skinId gerekli' });

    const user = await User.findById((req as any).user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });

    if (user.favorites.includes(skinId)) {
      return res.status(400).json({ success: false, message: 'Bu skin zaten favorilerde' });
    }

    user.favorites.push(skinId);
    await user.save();

    res.json({ success: true, message: 'Favorilere eklendi', data: user.favorites });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /favorites/{skinId}:
 *   delete:
 *     summary: Skini favorilerden çıkar
 *     tags: [Favorites]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: skinId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Favorilerden çıkarıldı }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
// Favorilerden çıkar
router.delete('/:skinId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { skinId } = req.params;
    const user = await User.findById((req as any).user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });

    user.favorites = user.favorites.filter((id: string) => id !== skinId);
    await user.save();

    res.json({ success: true, message: 'Favorilerden çıkarıldı', data: user.favorites });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

export default router;

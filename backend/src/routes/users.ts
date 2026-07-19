import express, { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import Listing from '../models/Listing';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { getSteamUserProfile } from '../services/steamApi';
import { config } from '../config';
import { requireAdmin } from '../middleware/adminAuth';
import { logger } from '../logger';

const router = express.Router();
const JWT_SECRET: string = process.env.JWT_SECRET ?? (() => { throw new Error('JWT_SECRET environment variable is required'); })();

const isAdminEmail = (email: string) => config.adminEmails.includes(email.trim().toLowerCase());

// Email gönderimi için transporter oluştur
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// JWT doğrulama middleware'i
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
  if (!token) return res.status(401).json({ message: 'Token gerekli' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Geçersiz token' });
    (req as any).user = user;
    next();
  });
}

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Tüm kullanıcıları listele (admin)
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Kullanıcı listesi
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/User' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
// Tüm kullanıcıları getir (sadece admin)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Kayıt ol (register)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username: { type: string, minLength: 3, maxLength: 30 }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *     responses:
 *       201: { description: Kullanıcı oluşturuldu }
 *       400: { $ref: '#/components/responses/ServerError' }
 *       409: { description: Email veya kullanıcı adı zaten kayıtlı }
 */
// Yeni kullanıcı oluştur
router.post('/', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Input validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Kullanıcı adı, email ve şifre zorunludur' });
    }
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ message: 'Kullanıcı adı 3-30 karakter arasında olmalıdır' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Geçerli bir email adresi giriniz' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Şifre en az 6 karakter olmalıdır' });
    }

    // Email zaten kayıtlı mı?
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(409).json({ message: 'Bu email veya kullanıcı adı zaten kayıtlı' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      email,
      password: hashedPassword,
      role: isAdminEmail(email) ? 'admin' : 'user'
    });
    await user.save();
    logger.info({ event: 'user_registered', userId: user._id, email: user.email }, 'Yeni kullanıcı kaydı');
    res.status(201).json({ message: 'Kullanıcı oluşturuldu' });
  } catch (error) {
    logger.error({ event: 'user_register_error', err: error }, 'Kullanıcı oluşturma hatası');
    res.status(400).json({
      message: 'Kullanıcı oluşturulamadı',
      error: error instanceof Error ? error.message : error
    });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Kullanıcı bilgilerini güncelle (sadece kendi hesabı)
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *     responses:
 *       200: { description: Kullanıcı güncellendi }
 *       400: { $ref: '#/components/responses/ServerError' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
// Kullanıcı güncelle
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Sadece kendi hesabını güncelleyebilir
    if ((req as any).user.userId !== req.params.id) {
      return res.status(403).json({ message: 'Sadece kendi hesabınızı güncelleyebilirsiniz' });
    }

    // Güncellenecek alanları topla
    const updateData: Record<string, any> = {};

    if (username) {
      if (username.length < 3 || username.length > 30) {
        return res.status(400).json({ message: 'Kullanıcı adı 3-30 karakter arasında olmalıdır' });
      }
      updateData.username = username;
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Geçerli bir email adresi giriniz' });
      }
      updateData.email = email;
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Şifre en az 6 karakter olmalıdır' });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'Güncellenecek alan belirtiniz' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    res.json({ message: 'Kullanıcı güncellendi', user: updatedUser });
  } catch (error) {
    res.status(400).json({ message: 'Kullanıcı güncellenemedi', error: error instanceof Error ? error.message : error });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Hesabı sil (sadece kendi hesabı)
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Kullanıcı silindi }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
// Kullanıcı sil
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Sadece kendi hesabını silebilir
    if ((req as any).user.userId !== req.params.id) {
      return res.status(403).json({ message: 'Sadece kendi hesabınızı silebilirsiniz' });
    }

    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    res.json({ message: 'Kullanıcı silindi' });
  } catch (error) {
    res.status(400).json({ message: 'Kullanıcı silinemedi', error: error instanceof Error ? error.message : error });
  }
});

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Giriş yap (login), JWT döner
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Giriş başarılı, JWT token döner
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 token: { type: string }
 *       400: { description: Geçersiz email veya şifre }
 *       403: { description: Hesap banlı }
 */
// Kullanıcı girişi (login)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email ve şifre zorunludur' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      logger.warn({ event: 'login_failed', email, reason: 'user_not_found' }, 'Başarısız giriş denemesi');
      return res.status(400).json({ message: 'Geçersiz email veya şifre' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn({ event: 'login_failed', userId: user._id, email, reason: 'wrong_password' }, 'Başarısız giriş denemesi');
      return res.status(400).json({ message: 'Geçersiz email veya şifre' });
    }

    if (user.isBanned) {
      logger.warn({ event: 'login_banned_attempt', userId: user._id, email }, 'Banlı hesap giriş denemesi');
      return res.status(403).json({
        message: `Hesabınız askıya alınmıştır.${user.banReason ? ` Sebep: ${user.banReason}` : ''}`
      });
    }

    // ADMIN_EMAILS'e sonradan eklenen hesaplar login anında otomatik admin olur
    if (isAdminEmail(user.email) && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    logger.info({ event: 'login_success', userId: user._id, email: user.email }, 'Kullanıcı girişi yapıldı');
    res.json({ message: 'Giriş başarılı', token });
  } catch (error) {
    logger.error({ event: 'login_error', err: error }, 'Giriş işlemi hatası');
    res.status(500).json({ message: 'Giriş işlemi sırasında hata oluştu', error: error instanceof Error ? error.message : error });
  }
});

/**
 * @swagger
 * /users/forgot-password:
 *   post:
 *     summary: Şifre sıfırlama emaili gönder
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: Sıfırlama bağlantısı gönderildi }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
// Şifre sıfırlama isteği
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'Bu email adresi ile kayıtlı kullanıcı bulunamadı' });
    }

    // Şifre sıfırlama token'ı oluştur
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 saat geçerli
    await user.save();

    // Email gönder
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    await transporter.sendMail({
      to: user.email,
      subject: 'Şifre Sıfırlama',
      html: `Şifrenizi sıfırlamak için <a href="${resetUrl}">buraya tıklayın</a>. Bu link 1 saat süreyle geçerlidir.`
    });

    res.json({ message: 'Şifre sıfırlama bağlantısı email adresinize gönderildi' });
  } catch (error) {
    res.status(500).json({ message: 'Şifre sıfırlama işlemi başarısız oldu', error: error instanceof Error ? error.message : error });
  }
});

/**
 * @swagger
 * /users/reset-password/{token}:
 *   post:
 *     summary: Şifre sıfırlama token'ı ile yeni şifre belirle
 *     tags: [Auth]
 *     security: []
 *     parameters:
 *       - { in: path, name: token, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPassword]
 *             properties:
 *               newPassword: { type: string, minLength: 6 }
 *     responses:
 *       200: { description: Şifre güncellendi }
 *       400: { description: Geçersiz veya süresi dolmuş token }
 */
// Şifre sıfırlama
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Geçersiz veya süresi dolmuş token' });
    }

    // Yeni şifreyi hashle ve kaydet
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Şifreniz başarıyla güncellendi' });
  } catch (error) {
    res.status(500).json({ message: 'Şifre güncelleme işlemi başarısız oldu', error: error instanceof Error ? error.message : error });
  }
});

/**
 * @swagger
 * /users/send-verification-email:
 *   post:
 *     summary: Email doğrulama bağlantısı gönder
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Doğrulama emaili gönderildi }
 *       400: { description: Email zaten doğrulanmış }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
// Email doğrulama isteği
router.post('/send-verification-email', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById((req as any).user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email adresi zaten doğrulanmış' });
    }

    // Doğrulama token'ı oluştur
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = verificationToken;
    user.emailVerificationTokenExpires = new Date(Date.now() + 24 * 3600000); // 24 saat geçerli
    await user.save();

    // Email gönder
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    await transporter.sendMail({
      to: user.email,
      subject: 'Email Doğrulama',
      html: `Email adresinizi doğrulamak için <a href="${verificationUrl}">buraya tıklayın</a>. Bu link 24 saat süreyle geçerlidir.`
    });

    res.json({ message: 'Doğrulama emaili gönderildi' });
  } catch (error) {
    res.status(500).json({ message: 'Email doğrulama işlemi başarısız oldu', error: error instanceof Error ? error.message : error });
  }
});

/**
 * @swagger
 * /users/verify-email/{token}:
 *   post:
 *     summary: Email adresini doğrula
 *     tags: [Auth]
 *     security: []
 *     parameters:
 *       - { in: path, name: token, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Email doğrulandı }
 *       400: { description: Geçersiz veya süresi dolmuş token }
 */
// Email doğrulama
router.post('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Geçersiz veya süresi dolmuş token' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpires = undefined;
    await user.save();

    res.json({ message: 'Email adresi başarıyla doğrulandı' });
  } catch (error) {
    res.status(500).json({ message: 'Email doğrulama işlemi başarısız oldu', error: error instanceof Error ? error.message : error });
  }
});

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Giriş yapmış kullanıcının profilini ve satış istatistiklerini getir
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Kullanıcı profili + istatistikler
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - { $ref: '#/components/schemas/User' }
 *                 - type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                       properties:
 *                         activeListings: { type: integer }
 *                         completedSales: { type: integer }
 *                         totalEarnings: { type: number }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
// Kendi profil bilgilerini getir (JWT'den)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById((req as any).user.userId).select('-password -resetPasswordToken -resetPasswordExpires -emailVerificationToken -emailVerificationTokenExpires');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    // İlan istatistikleri
    const activeListings = await Listing.countDocuments({ seller: user._id, status: 'active' });
    const completedSales = await Listing.countDocuments({ seller: user._id, status: 'sold' });
    const totalEarnings = await Listing.aggregate([
      { $match: { seller: user._id, status: 'sold' } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);

    res.json({
      success: true,
      data: {
        ...user.toObject(),
        stats: {
          activeListings,
          completedSales,
          totalEarnings: totalEarnings[0]?.total || 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /users/link-steam:
 *   put:
 *     summary: Steam hesabını kullanıcı profiline bağla
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [steamId]
 *             properties:
 *               steamId: { type: string }
 *     responses:
 *       200: { description: Steam hesabı bağlandı }
 *       400: { description: Steam ID gerekli }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
// Steam hesap bağlama
router.put('/link-steam', authenticateToken, async (req, res) => {
  try {
    const { steamId } = req.body;
    if (!steamId) {
      return res.status(400).json({ success: false, message: 'Steam ID gerekli' });
    }

    const user = await User.findById((req as any).user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    // Steam profilini çek
    let steamProfile = null;
    try {
      steamProfile = await getSteamUserProfile(steamId);
    } catch {
      // Steam API erişilemezse sadece ID'yi kaydet
    }

    user.steamId = steamId;
    if (steamProfile) {
      user.steamProfile = {
        displayName: steamProfile.personaname,
        avatar: steamProfile.avatarfull,
        profileUrl: steamProfile.profileurl
      };
    }

    await user.save();
    res.json({
      success: true,
      message: 'Steam hesabı bağlandı',
      data: { steamId: user.steamId, steamProfile: user.steamProfile }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /users/profile:
 *   put:
 *     summary: Profil bilgilerini güncelle (ad, telefon, adres, avatar)
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName: { type: string }
 *               phone: { type: string }
 *               address: { type: string }
 *               avatar: { type: string }
 *     responses:
 *       200: { description: Profil güncellendi }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
// Profil güncelleme
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { fullName, phone, address, avatar } = req.body;
    const user = await User.findById((req as any).user.userId);

    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    // Profil bilgilerini güncelle
    user.profile = {
      ...user.profile,
      fullName: fullName || user.profile?.fullName,
      phone: phone || user.profile?.phone,
      address: address || user.profile?.address,
      avatar: avatar || user.profile?.avatar
    };

    await user.save();
    res.json({ message: 'Profil başarıyla güncellendi', profile: user.profile });
  } catch (error) {
    res.status(500).json({ message: 'Profil güncelleme işlemi başarısız oldu', error: error instanceof Error ? error.message : error });
  }
});

export default router; 
import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Transaction from '../models/Transaction';
import { initializeDeposit, retrieveCheckoutForm } from '../services/iyzico';
import { config } from '../config';
import { createNotification, sendCriticalEmail } from '../services/notifications';
import { logger } from '../logger';

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

const MIN_DEPOSIT = 10;
const MAX_DEPOSIT = 50000;
const MIN_WITHDRAW = 50;

/**
 * @swagger
 * /wallet:
 *   get:
 *     summary: Cüzdan özeti (bakiye + son 10 işlem)
 *     tags: [Wallet]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Bakiye ve son işlemler
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     balance: { type: number }
 *                     currency: { type: string }
 *                     recentTransactions: { type: array, items: { $ref: '#/components/schemas/Transaction' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
// Cüzdan özeti: bakiye + son işlemler
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const user = await User.findById(userId).select('balance');
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });

    const recentTransactions = await Transaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      data: {
        balance: user.balance,
        currency: 'TRY',
        recentTransactions
      }
    });
  } catch (error) {
    console.error('Wallet fetch error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /wallet/transactions:
 *   get:
 *     summary: İşlem geçmişi (sayfalanmış)
 *     tags: [Wallet]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *     responses:
 *       200:
 *         description: İşlem listesi + pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Transaction' } }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
// İşlem geçmişi (sayfalanmış)
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find({ user: userId })
        .populate('listing', 'title price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments({ user: userId })
    ]);

    res.json({
      success: true,
      data: transactions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Transaction history error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /wallet/deposit:
 *   post:
 *     summary: Para yatırma başlat (iyzico Checkout Form oturumu oluşturur)
 *     tags: [Wallet]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, name, surname, identityNumber, phone, address, city]
 *             properties:
 *               amount: { type: number, minimum: 10, maximum: 50000, description: '10-50000 TL' }
 *               name: { type: string }
 *               surname: { type: string }
 *               identityNumber: { type: string, description: '11 haneli TC Kimlik No' }
 *               phone: { type: string }
 *               address: { type: string }
 *               city: { type: string }
 *     responses:
 *       200:
 *         description: iyzico Checkout Form oturumu oluşturuldu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     token: { type: string }
 *                     paymentPageUrl: { type: string }
 *                     checkoutFormContent: { type: string }
 *       400: { $ref: '#/components/responses/ServerError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       502: { description: Ödeme sağlayıcıya bağlanılamadı }
 *       503: { description: Ödeme sağlayıcı yapılandırılmamış }
 */
// TEST için sahte bakiye yükleme (sadece geliştirme amaçlı — production'da kapalıdır)
router.post('/test-deposit', authenticateToken, async (req, res) => {
  if (config.server.nodeEnv === 'production') {
    return res.status(404).json({ success: false, message: 'Endpoint bulunamadı' });
  }
  try {
    const userId = (req as any).user.userId;
    const { amount } = req.body;
    
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Geçersiz tutar' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });

    user.balance += parsedAmount;
    await user.save();

    const transaction = new Transaction({
      user: userId,
      type: 'deposit',
      amount: parsedAmount,
      status: 'completed',
      description: 'Test bakiye yükleme (Admin)'
    });
    await transaction.save();

    res.json({ success: true, message: `${parsedAmount} TRY test bakiyesi eklendi`, balance: user.balance });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Hata oluştu' });
  }
});

// Para yatırma başlat — iyzico Checkout Form oturumu oluşturur
router.post('/deposit', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { amount, name, surname, identityNumber, phone, address, city } = req.body;

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount < MIN_DEPOSIT || parsedAmount > MAX_DEPOSIT) {
      return res.status(400).json({ success: false, message: `Tutar ${MIN_DEPOSIT}-${MAX_DEPOSIT} TL arasında olmalıdır` });
    }
    if (!name || !surname || !phone || !address || !city) {
      return res.status(400).json({ success: false, message: 'Ad, soyad, telefon, adres ve şehir zorunludur' });
    }
    if (!identityNumber || !/^\d{11}$/.test(identityNumber)) {
      return res.status(400).json({ success: false, message: 'Geçerli bir TC Kimlik No (11 hane) giriniz' });
    }

    if (!config.iyzico.apiKey || !config.iyzico.secretKey) {
      return res.status(503).json({ success: false, message: 'Ödeme sağlayıcı henüz yapılandırılmamış. Lütfen backend/.env dosyasına iyzico API bilgilerinizi ekleyin.' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });

    const transaction = new Transaction({
      user: userId,
      type: 'deposit',
      amount: parsedAmount,
      status: 'pending',
      description: 'Cüzdan bakiye yükleme'
    });
    await transaction.save();

    const callbackUrl = `${config.server.backendUrl}/api/wallet/deposit/callback`;
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';

    let result;
    try {
      result = await initializeDeposit(
        {
          userId,
          email: user.email,
          name,
          surname,
          identityNumber,
          phone,
          address,
          city,
          ip
        },
        parsedAmount,
        transaction._id.toString(),
        callbackUrl
      );
    } catch (iyzicoError) {
      console.error('iyzico initialize error:', iyzicoError);
      transaction.status = 'failed';
      await transaction.save();
      return res.status(502).json({ success: false, message: 'Ödeme sağlayıcıya bağlanılamadı' });
    }

    if (result.status !== 'success' || !result.token) {
      transaction.status = 'failed';
      await transaction.save();
      return res.status(400).json({ success: false, message: result.errorMessage || 'Ödeme oturumu başlatılamadı' });
    }

    transaction.paymentToken = result.token;
    await transaction.save();

    res.json({
      success: true,
      data: {
        token: result.token,
        paymentPageUrl: result.paymentPageUrl,
        checkoutFormContent: result.checkoutFormContent
      }
    });
  } catch (error) {
    console.error('Deposit init error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /wallet/deposit/callback:
 *   post:
 *     summary: iyzico ödeme callback'i (tarayıcı yönlendirilir, doğrudan çağrılmamalı)
 *     tags: [Wallet]
 *     security: []
 *     requestBody:
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               token: { type: string }
 *     responses:
 *       302: { description: 'Frontend /wallet sayfasına yönlendirir (?deposit=success|failed)' }
 */
// iyzico ödeme tamamlandıktan sonra kullanıcının tarayıcısı buraya yönlendirilir
router.post('/deposit/callback', async (req, res) => {
  const frontendUrl = config.frontendUrl;
  try {
    const token = req.body?.token as string;
    if (!token) {
      return res.redirect(302, `${frontendUrl}/wallet?deposit=failed`);
    }

    const transaction = await Transaction.findOne({ paymentToken: token });
    if (!transaction) {
      return res.redirect(302, `${frontendUrl}/wallet?deposit=failed`);
    }

    // Zaten işlenmişse (çift callback) tekrar bakiye ekleme
    if (transaction.status !== 'pending') {
      return res.redirect(302, `${frontendUrl}/wallet?deposit=${transaction.status === 'completed' ? 'success' : 'failed'}`);
    }

    const result = await retrieveCheckoutForm(token, transaction._id.toString());

    if (result.status === 'success' && result.paymentStatus === 'SUCCESS') {
      // Çift ödeme sayımını önlemek için sadece 'pending' durumundaki işlemi tamamlanmışa çevir
      const claimed = await Transaction.findOneAndUpdate(
        { _id: transaction._id, status: 'pending' },
        { status: 'completed' },
        { new: true }
      );

      if (claimed) {
        const updatedUser = await User.findByIdAndUpdate(
          transaction.user,
          { $inc: { balance: transaction.amount } },
          { new: true }
        );
        claimed.balanceAfter = updatedUser?.balance;
        await claimed.save();

        logger.info(
          { event: 'deposit_completed', userId: transaction.user, amount: transaction.amount, transactionId: claimed._id },
          'Bakiye yükleme tamamlandı'
        );

        // Bildirim + kritik email — hata olursa callback akışını etkilemez
        try {
          await createNotification({
            user: transaction.user.toString(),
            type: 'deposit',
            title: 'Bakiye Yükleme Başarılı',
            message: `${transaction.amount} TL bakiyenize yüklendi.`,
            relatedTransaction: claimed._id.toString()
          });
          if (updatedUser?.email) {
            await sendCriticalEmail(
              updatedUser.email,
              'Bakiye Yükleme Başarılı',
              `<p><strong>${transaction.amount} TL</strong> bakiyenize başarıyla yüklendi.</p><p>Güncel bakiyeniz: ${updatedUser.balance} TL</p>`
            );
          }
        } catch (notifyError) {
          console.error('Deposit notification error:', notifyError);
        }
      }

      return res.redirect(302, `${frontendUrl}/wallet?deposit=success`);
    }

    transaction.status = 'failed';
    await transaction.save();
    return res.redirect(302, `${frontendUrl}/wallet?deposit=failed`);
  } catch (error) {
    console.error('Deposit callback error:', error);
    return res.redirect(302, `${frontendUrl}/wallet?deposit=failed`);
  }
});

/**
 * @swagger
 * /wallet/withdraw:
 *   post:
 *     summary: Para çekme talebi oluştur (bakiye anında düşülür, transfer manuel işlenir)
 *     tags: [Wallet]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, iban]
 *             properties:
 *               amount: { type: number, minimum: 50, description: 'En az 50 TL' }
 *               iban: { type: string }
 *     responses:
 *       200:
 *         description: Talep alındı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     balance: { type: number }
 *                     transaction: { $ref: '#/components/schemas/Transaction' }
 *       400: { description: 'Yetersiz bakiye / geçersiz IBAN' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
// Para çekme talebi oluştur — bakiye hemen düşülür, transfer manuel işlenir
router.post('/withdraw', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { amount, iban } = req.body;

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount < MIN_WITHDRAW) {
      return res.status(400).json({ success: false, message: `Tutar en az ${MIN_WITHDRAW} TL olmalıdır` });
    }
    if (!iban || iban.replace(/\s/g, '').length < 15) {
      return res.status(400).json({ success: false, message: 'Geçerli bir IBAN giriniz' });
    }

    // Bakiyeyi atomik olarak düş — yetersiz bakiye varsa güncelleme eşleşmez
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, balance: { $gte: parsedAmount } },
      { $inc: { balance: -parsedAmount } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(400).json({ success: false, message: 'Yetersiz bakiye' });
    }

    const transaction = new Transaction({
      user: userId,
      type: 'withdrawal',
      amount: -parsedAmount,
      balanceAfter: updatedUser.balance,
      status: 'pending',
      description: `Para çekme talebi (IBAN: ${iban})`
    });
    await transaction.save();

    logger.info(
      { event: 'withdrawal_requested', userId, amount: parsedAmount, transactionId: transaction._id },
      'Para çekme talebi oluşturuldu'
    );

    try {
      await createNotification({
        user: userId,
        type: 'withdrawal',
        title: 'Para Çekme Talebi Alındı',
        message: `${parsedAmount} TL çekme talebiniz alındı. Tutar 1-3 iş günü içinde IBAN'ınıza aktarılacaktır.`,
        relatedTransaction: transaction._id.toString()
      });
    } catch (notifyError) {
      console.error('Withdraw notification error:', notifyError);
    }

    res.json({
      success: true,
      message: 'Para çekme talebiniz alındı. Tutar 1-3 iş günü içinde IBAN\'ınıza aktarılacaktır.',
      data: { balance: updatedUser.balance, transaction }
    });
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

export default router;

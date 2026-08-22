import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Transaction from '../models/Transaction';
import { createInvoice, verifyWebhookSignature, PAID_STATUSES, CryptomusWebhookPayload } from '../services/cryptomus';
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

const MIN_DEPOSIT = 5; // USD
const MAX_DEPOSIT = 10000; // USD
const MIN_WITHDRAW = 10; // USD

// Cryptomus'ta desteklediğimiz çekim ağları — kullanıcı bunlardan birini seçmek zorunda,
// admin manuel gönderirken hangi ağa göndereceğini bu değerden anlar.
const PAYOUT_NETWORKS = ['USDT_TRC20', 'USDT_BEP20', 'USDT_ERC20', 'BTC', 'ETH', 'TON'];

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
        currency: 'USD',
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

    res.json({ success: true, message: `${parsedAmount} USD test bakiyesi eklendi`, balance: user.balance });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Hata oluştu' });
  }
});

/**
 * @swagger
 * /wallet/deposit:
 *   post:
 *     summary: Para yatırma başlat (Cryptomus ödeme sayfası oturumu oluşturur)
 *     tags: [Wallet]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: number, minimum: 5, maximum: 10000, description: '5-10000 USD' }
 *     responses:
 *       200:
 *         description: Cryptomus ödeme sayfası oturumu oluşturuldu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentPageUrl: { type: string }
 *       400: { $ref: '#/components/responses/ServerError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       502: { description: Ödeme sağlayıcıya bağlanılamadı }
 *       503: { description: Ödeme sağlayıcı yapılandırılmamış }
 */
// Para yatırma başlat — Cryptomus ödeme sayfası (invoice) oturumu oluşturur
router.post('/deposit', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { amount } = req.body;

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount < MIN_DEPOSIT || parsedAmount > MAX_DEPOSIT) {
      return res.status(400).json({ success: false, message: `Tutar ${MIN_DEPOSIT}-${MAX_DEPOSIT} USD arasında olmalıdır` });
    }

    if (!config.cryptomus.merchantId || !config.cryptomus.paymentApiKey) {
      return res.status(503).json({ success: false, message: 'Ödeme sağlayıcı henüz yapılandırılmamış. Lütfen backend/.env dosyasına Cryptomus API bilgilerinizi ekleyin.' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });

    const transaction = new Transaction({
      user: userId,
      type: 'deposit',
      amount: parsedAmount,
      status: 'pending',
      description: 'Cüzdan bakiye yükleme (kripto)'
    });
    await transaction.save();

    const callbackUrl = `${config.server.backendUrl}/api/wallet/deposit/webhook`;
    const returnUrl = `${config.frontendUrl}/wallet?deposit=pending`;

    let result;
    try {
      result = await createInvoice(parsedAmount, transaction._id.toString(), callbackUrl, returnUrl);
    } catch (cryptomusError) {
      console.error('Cryptomus initialize error:', cryptomusError);
      transaction.status = 'failed';
      await transaction.save();
      return res.status(502).json({ success: false, message: 'Ödeme sağlayıcıya bağlanılamadı' });
    }

    transaction.paymentToken = result.uuid;
    await transaction.save();

    res.json({
      success: true,
      data: {
        paymentPageUrl: result.url
      }
    });
  } catch (error) {
    console.error('Deposit init error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /wallet/deposit/webhook:
 *   post:
 *     summary: Cryptomus ödeme webhook'u (sunucudan sunucuya çağrılır, doğrudan tarayıcıdan çağrılmaz)
 *     tags: [Wallet]
 *     security: []
 *     responses:
 *       200: { description: 'Her zaman 200 döner (Cryptomus retry mekanizmasını tetiklememek için)' }
 */
// Cryptomus ödeme durumunu bildiren sunucu-to-sunucu webhook — gerçek bakiye artışı burada olur
router.post('/deposit/webhook', async (req, res) => {
  // Cryptomus imzası geçersizse veya işlem bulunamazsa bile 200 dönülür ki Cryptomus tekrar
  // tekrar denemesin; hata sadece loglanır.
  try {
    const payload = req.body as CryptomusWebhookPayload;

    if (!verifyWebhookSignature(payload)) {
      logger.warn({ event: 'cryptomus_webhook_invalid_signature' }, 'Cryptomus webhook imza doğrulaması başarısız');
      return res.status(200).json({ success: false });
    }

    const transaction = await Transaction.findById(payload.order_id);
    if (!transaction || transaction.type !== 'deposit') {
      logger.warn({ event: 'cryptomus_webhook_unknown_order', orderId: payload.order_id }, 'Cryptomus webhook: eşleşen işlem yok');
      return res.status(200).json({ success: false });
    }

    // Zaten işlenmişse (çift webhook) tekrar bakiye ekleme
    if (transaction.status !== 'pending') {
      return res.status(200).json({ success: true });
    }

    if (!payload.is_final) {
      // Ara durum (process/confirm_check vb.) — henüz kesinleşmedi, bekle
      return res.status(200).json({ success: true });
    }

    if (PAID_STATUSES.has(payload.status)) {
      // Çift ödeme sayımını önlemek için sadece 'pending' durumundaki işlemi tamamlanmışa çevir
      const claimed = await Transaction.findOneAndUpdate(
        { _id: transaction._id, status: 'pending' },
        {
          status: 'completed',
          cryptoAmount: payload.payment_amount || payload.amount,
          cryptoCurrency: payload.payer_currency || payload.currency,
          cryptoNetwork: payload.network
        },
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

        try {
          await createNotification({
            user: transaction.user.toString(),
            type: 'deposit',
            title: 'Bakiye Yükleme Başarılı',
            message: `${transaction.amount} USD bakiyenize yüklendi.`,
            relatedTransaction: claimed._id.toString()
          });
          if (updatedUser?.email) {
            await sendCriticalEmail(
              updatedUser.email,
              'Bakiye Yükleme Başarılı',
              `<p><strong>${transaction.amount} USD</strong> bakiyenize başarıyla yüklendi.</p><p>Güncel bakiyeniz: ${updatedUser.balance} USD</p>`
            );
          }
        } catch (notifyError) {
          console.error('Deposit notification error:', notifyError);
        }
      }
    } else {
      transaction.status = 'failed';
      await transaction.save();
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Deposit webhook error:', error);
    return res.status(200).json({ success: false });
  }
});

/**
 * @swagger
 * /wallet/withdraw:
 *   post:
 *     summary: Kripto para çekme talebi oluştur (bakiye anında düşülür, coin transferi manuel işlenir)
 *     tags: [Wallet]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, walletAddress, network]
 *             properties:
 *               amount: { type: number, minimum: 10, description: 'En az 10 USD' }
 *               walletAddress: { type: string }
 *               network: { type: string, enum: [USDT_TRC20, USDT_BEP20, USDT_ERC20, BTC, ETH, TON] }
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
 *       400: { description: 'Yetersiz bakiye / geçersiz adres ya da ağ' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
// Kripto çekim talebi oluştur — bakiye hemen düşülür, coin transferi admin tarafından manuel gönderilir
router.post('/withdraw', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { amount, walletAddress, network } = req.body;

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount < MIN_WITHDRAW) {
      return res.status(400).json({ success: false, message: `Tutar en az ${MIN_WITHDRAW} USD olmalıdır` });
    }
    if (!walletAddress || String(walletAddress).trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Geçerli bir cüzdan adresi giriniz' });
    }
    if (!network || !PAYOUT_NETWORKS.includes(network)) {
      return res.status(400).json({ success: false, message: 'Geçerli bir ağ seçiniz' });
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
      payoutAddress: walletAddress,
      payoutNetwork: network,
      description: `Kripto çekme talebi (${network}): ${walletAddress}`
    });
    await transaction.save();

    logger.info(
      { event: 'withdrawal_requested', userId, amount: parsedAmount, network, transactionId: transaction._id },
      'Para çekme talebi oluşturuldu'
    );

    try {
      await createNotification({
        user: userId,
        type: 'withdrawal',
        title: 'Para Çekme Talebi Alındı',
        message: `${parsedAmount} USD çekme talebiniz alındı. Coin 1-3 iş günü içinde belirttiğiniz adrese gönderilecektir.`,
        relatedTransaction: transaction._id.toString()
      });
    } catch (notifyError) {
      console.error('Withdraw notification error:', notifyError);
    }

    res.json({
      success: true,
      message: 'Para çekme talebiniz alındı. Coin 1-3 iş günü içinde belirttiğiniz adrese gönderilecektir.',
      data: { balance: updatedUser.balance, transaction }
    });
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

export default router;

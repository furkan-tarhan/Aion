import express, { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import jwt from 'jsonwebtoken';
import Listing, { LISTING_WEAR_VALUES } from '../models/Listing';
import Skin from '../models/Skin';
import User from '../models/User';
import Transaction from '../models/Transaction';
import { createNotification, sendCriticalEmail } from '../services/notifications';
import { logger } from '../logger';
import { isBotConfigured, requestDeposit, requestDelivery, botEvents, type OfferStateChangedMsg } from '../services/steamBot';

const router = express.Router();
const JWT_SECRET: string = config.jwt.secret;
const CS2_APP_ID = 730;
const CS2_INVENTORY_CONTEXT_ID = 2;

// Steam bot'tan gelen deposit/delivery offer durum değişikliklerini ilgili Listing/Transaction'a işler.
// Bot yapılandırılmamışsa botEvents hiç emit etmez, bu listener sessizce kayıtlı kalır.
botEvents.on('offer_state_changed', async (msg: OfferStateChangedMsg) => {
  try {
    const listing = await Listing.findOne({ depositOfferId: msg.offerId });
    if (listing) {
      await handleDepositOfferUpdate(listing, msg);
      return;
    }

    const transaction = await Transaction.findOne({ deliveryOfferId: msg.offerId });
    if (transaction) {
      await handleDeliveryOfferUpdate(transaction, msg);
    }
  } catch (error) {
    logger.error({ event: 'steam_bot_offer_update_error', offerId: msg.offerId, error }, 'Trade offer durum güncellemesi işlenemedi');
  }
});

async function handleDepositOfferUpdate(listing: InstanceType<typeof Listing>, msg: OfferStateChangedMsg) {
  listing.depositStatus = msg.state === 'active' ? 'pending' : (msg.state as any);
  if (msg.state === 'accepted') {
    listing.status = 'active';
    listing.botAssetId = msg.newAssetId;
  }
  await listing.save();

  logger.info({ event: 'deposit_offer_updated', listingId: listing._id, state: msg.state }, 'İlan emanet durumu güncellendi');

  if (msg.state === 'accepted') {
    await createNotification({
      user: listing.seller.toString(),
      type: 'listing_active',
      title: 'İlanınız Yayında',
      message: `${listing.title} için gönderdiğiniz item onaylandı, ilanınız artık pazarda görünüyor.`,
      relatedListing: listing._id.toString()
    }).catch(() => {});
  } else if (['declined', 'canceled', 'expired'].includes(msg.state)) {
    await createNotification({
      user: listing.seller.toString(),
      type: 'listing_active',
      title: 'İlan Emaneti Tamamlanamadı',
      message: `${listing.title} için gönderilen trade teklifi ${msg.state === 'declined' ? 'reddedildi' : msg.state === 'expired' ? 'süresi doldu' : 'iptal edildi'}. İlanı tekrar oluşturabilirsiniz.`,
      relatedListing: listing._id.toString()
    }).catch(() => {});
  }
}

async function handleDeliveryOfferUpdate(transaction: InstanceType<typeof Transaction>, msg: OfferStateChangedMsg) {
  transaction.deliveryStatus = msg.state === 'active' ? 'pending' : (msg.state as any);
  await transaction.save();

  logger.info({ event: 'delivery_offer_updated', transactionId: transaction._id, state: msg.state }, 'Teslimat durumu güncellendi');

  const statusText: Record<string, string> = {
    accepted: 'Steam envanterinize başarıyla teslim edildi.',
    declined: 'Steam trade teklifi reddedildi. Destek ile iletişime geçin.',
    canceled: 'Steam trade teklifi iptal edildi. Destek ile iletişime geçin.',
    expired: 'Steam trade teklifinin süresi doldu. Destek ile iletişime geçin.',
    escrow: 'Steam trade teklifi onaylandı ama Steam bekleme süresine (escrow) girdi.'
  };
  if (statusText[msg.state]) {
    await createNotification({
      user: transaction.user.toString(),
      type: 'purchase',
      title: 'Teslimat Durumu Güncellendi',
      message: statusText[msg.state],
      relatedTransaction: transaction._id.toString()
    }).catch(() => {});
  }
}

// Steam envanterinden seçilip DB'de karşılığı olmayan bir item için Skin otomatik oluşturulurken
// weapon adından kaba bir kategori tahmini yapar (seed verisiyle aynı, küçük harf konvansiyonu).
const CATEGORY_KEYWORDS: Array<[RegExp, string]> = [
  [/knife|karambit|bayonet|dagger|bowie|butterfly|falchion|flip|gut|huntsman|kukri|m9|navaja|nomad|paracord|shadow daggers|skeleton|stiletto|survival|talon|ursus|classic knife/i, 'knife'],
  [/gloves|hand wraps|wraps|moto gloves|specialist|sport gloves|driver gloves|hydra gloves/i, 'gloves'],
  [/awp|ssg 08|scar-20|g3sg1/i, 'sniper'],
  [/ak-47|m4a4|m4a1-s|famas|galil|aug|sg 553/i, 'rifle'],
  [/glock|usp|p2000|p250|five-seven|tec-9|cz75|deagle|desert eagle|dual berettas|r8 revolver/i, 'pistol'],
  [/mp9|mac-10|mp7|mp5|ump-45|p90|pp-bizon/i, 'smg'],
  [/nova|xm1014|mag-7|sawed-off|negev|m249/i, 'heavy'],
];

function inferSkinCategory(weaponName: string): string {
  const match = CATEGORY_KEYWORDS.find(([pattern]) => pattern.test(weaponName));
  return match ? match[1] : 'rifle';
}

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
 * /listings:
 *   get:
 *     summary: Aktif ilanları listele (filtre + sıralama + pagination)
 *     tags: [Listings]
 *     security: []
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *       - { in: query, name: sort, schema: { type: string, enum: [newest, oldest, price-asc, price-desc] } }
 *       - { in: query, name: weapon, schema: { type: string } }
 *       - { in: query, name: rarity, schema: { type: string } }
 *       - { in: query, name: minPrice, schema: { type: number } }
 *       - { in: query, name: maxPrice, schema: { type: number } }
 *       - { in: query, name: wear, schema: { type: string, enum: [Factory New, Minimal Wear, Field-Tested, Well-Worn, Battle-Scarred] } }
 *       - { in: query, name: statTrak, schema: { type: string, enum: ['true', 'false'] } }
 *       - { in: query, name: minFloat, schema: { type: number } }
 *       - { in: query, name: maxFloat, schema: { type: number } }
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
 */
// Aktif ilanları listele (filtreler + sıralama + pagination)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const sort = req.query.sort as string || 'newest';
    const weapon = req.query.weapon as string;
    const rarity = req.query.rarity as string;
    const search = req.query.search as string;
    const minPrice = parseFloat(req.query.minPrice as string) || 0;
    const maxPrice = parseFloat(req.query.maxPrice as string) || 999999;
    const wear = req.query.wear as string;
    const statTrak = req.query.statTrak as string;
    const minFloat = parseFloat(req.query.minFloat as string);
    const maxFloat = parseFloat(req.query.maxFloat as string);

    // Filtre: sadece aktif ilanlar
    const filter: Record<string, any> = { status: 'active' };
    if (weapon) filter.weapon = { $regex: new RegExp(`^${weapon}$`, 'i') };
    if (rarity) filter.rarity = rarity;
    if (search) filter.title = { $regex: new RegExp(search, 'i') };
    filter.price = { $gte: minPrice, $lte: maxPrice };
    if (wear && LISTING_WEAR_VALUES.includes(wear as any)) filter.wear = wear;
    if (statTrak === 'true') filter.isStatTrak = true;
    else if (statTrak === 'false') filter.isStatTrak = false;
    if (!isNaN(minFloat) || !isNaN(maxFloat)) {
      filter.floatValue = {};
      if (!isNaN(minFloat)) filter.floatValue.$gte = minFloat;
      if (!isNaN(maxFloat)) filter.floatValue.$lte = maxFloat;
    }

    // Sıralama
    let sortOption: Record<string, 1 | -1> = {};
    switch (sort) {
      case 'price-asc': sortOption = { price: 1 }; break;
      case 'price-desc': sortOption = { price: -1 }; break;
      case 'oldest': sortOption = { createdAt: 1 }; break;
      case 'newest':
      default: sortOption = { createdAt: -1 };
    }

    const [listings, total] = await Promise.all([
      Listing.find(filter)
        .populate('seller', 'username')
        .populate('skin')
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      Listing.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: listings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /listings/{id}:
 *   get:
 *     summary: İlan detayını getir
 *     tags: [Listings]
 *     security: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: İlan detayı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Listing' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
// İlan detayı
router.get('/:id', async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('seller', 'username')
      .populate('skin')
      .lean();

    if (!listing) {
      return res.status(404).json({ success: false, error: 'İlan bulunamadı' });
    }

    res.json({ success: true, data: listing });
  } catch (error) {
    console.error('Error fetching listing:', error);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /listings:
 *   post:
 *     summary: Yeni ilan oluştur
 *     tags: [Listings]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [skinId, price, steamTradeUrl]
 *             properties:
 *               skinId: { type: string }
 *               price: { type: number, minimum: 0.01 }
 *               steamTradeUrl: { type: string, description: 'steamcommunity.com/tradeoffer içermeli' }
 *               wear: { type: string, enum: [Factory New, Minimal Wear, Field-Tested, Well-Worn, Battle-Scarred] }
 *               floatValue: { type: number, minimum: 0, maximum: 1 }
 *               isStatTrak: { type: boolean }
 *     responses:
 *       201:
 *         description: İlan oluşturuldu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { $ref: '#/components/schemas/Listing' }
 *       400: { $ref: '#/components/responses/ServerError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { description: Skin bulunamadı }
 */
// Yeni ilan oluştur (auth gerekli)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { skinId, marketHashName, iconUrl, price, steamTradeUrl, wear, floatValue, isStatTrak, assetId } = req.body;
    const userId = (req as any).user.userId;

    // Validasyon
    if (!skinId || !price || !steamTradeUrl) {
      return res.status(400).json({ message: 'Skin, fiyat ve Steam Trade URL zorunludur' });
    }

    if (price <= 0) {
      return res.status(400).json({ message: 'Fiyat 0\'dan büyük olmalıdır' });
    }

    // Steam Trade URL formatı kontrolü
    if (!steamTradeUrl.includes('steamcommunity.com/tradeoffer')) {
      return res.status(400).json({ message: 'Geçerli bir Steam Trade URL giriniz' });
    }

    if (wear && !LISTING_WEAR_VALUES.includes(wear)) {
      return res.status(400).json({ message: 'Geçersiz wear değeri' });
    }

    if (floatValue !== undefined && floatValue !== null && floatValue !== '') {
      const parsedFloat = Number(floatValue);
      if (isNaN(parsedFloat) || parsedFloat < 0 || parsedFloat > 1) {
        return res.status(400).json({ message: 'Float değeri 0-1 arasında olmalıdır' });
      }
    }

    // Skin'in var olduğunu kontrol et veya otomatik oluştur
    let skin = await Skin.findOne({ $or: [{ skinId: skinId }, { name: marketHashName }] });
    
    if (!skin && marketHashName) {
      // Skin bulunamadı ama envanterden seçildiyse otomatik oluştur
      const weaponName = marketHashName.split(' | ')[0] || 'Unknown';
      const skinName = marketHashName.split(' | ')[1] || marketHashName;
      
      skin = new Skin({
        skinId: skinId.replace(/\s+/g, '-').toLowerCase(),
        name: skinName,
        weapon: weaponName,
        category: inferSkinCategory(weaponName),
        rarity: 'Mil-Spec', // Skin.rarity enum'unda "Grade" son eki yok — envanterden gelen item'ın gerçek rarity'si bilinmiyor
        description: `${marketHashName} cs2 skin`,
        image: iconUrl || '',
        price: { min: price, max: price, currency: 'USD' } // İlk ilanın fiyatını başlangıç referansı olarak kullan
      });
      await skin.save();
    } else if (!skin) {
      return res.status(404).json({ message: 'Skin sistemde bulunamadı ve gerekli bilgiler eksik' });
    }

    // Bot yapılandırılmışsa ve satıcı envanterden bir item seçtiyse (assetId mevcut), item bota
    // emanet edilene kadar ilan pazarda görünmez ('pending_deposit'). Bot yoksa/assetId yoksa
    // (örn. DB'deki hazır skin'den ilan açma) eski davranış: ilan hemen aktif, teslimat manuel.
    const willAutoDeposit = isBotConfigured && !!assetId;

    // İlan oluştur
    const listing = new Listing({
      seller: userId,
      skin: skin._id,
      skinId: skin.skinId,
      weapon: skin.weapon,
      rarity: skin.rarity,
      title: marketHashName || `${skin.weapon} | ${skin.name}`,
      price,
      currency: 'USD', // LoopSkins kripto ödeme USD üzerinden hesaplanır
      steamTradeUrl,
      status: willAutoDeposit ? 'pending_deposit' : 'active',
      wear: wear || undefined,
      floatValue: (floatValue !== undefined && floatValue !== null && floatValue !== '') ? Number(floatValue) : undefined,
      isStatTrak: !!isStatTrak,
      assetId: assetId || undefined,
      depositStatus: willAutoDeposit ? 'pending' : undefined
    });

    let depositOffer: { offerId: string; tradeOfferUrl: string } | undefined;
    if (willAutoDeposit) {
      try {
        depositOffer = await requestDeposit(steamTradeUrl, assetId, CS2_APP_ID, CS2_INVENTORY_CONTEXT_ID);
        listing.depositOfferId = depositOffer.offerId;
      } catch (botError) {
        // Bot şu an cevap veremiyorsa ilanı manuel akışa düşürerek yine de oluştur — satıcı
        // engellenmesin, sadece emanet otomasyonundan faydalanamaz.
        logger.error({ event: 'deposit_request_failed', error: botError }, 'Steam bot deposit isteği başarısız, ilan manuel akışa düşürüldü');
        listing.status = 'active';
        listing.depositStatus = undefined;
      }
    }

    await listing.save();

    // Populate ile doldurup döndür
    const populatedListing = await Listing.findById(listing._id)
      .populate('seller', 'username')
      .populate('skin')
      .lean();

    res.status(201).json({
      success: true,
      message: willAutoDeposit && depositOffer
        ? 'İlan oluşturuldu, Steam üzerinden gelen trade teklifini kabul edince yayına alınacak'
        : 'İlan başarıyla oluşturuldu',
      data: populatedListing,
      depositTradeOfferUrl: depositOffer?.tradeOfferUrl
    });
  } catch (error) {
    console.error('Error creating listing:', error);
    res.status(500).json({ success: false, error: 'İlan oluşturulamadı' });
  }
});

/**
 * @swagger
 * /listings/{id}/deposit-status:
 *   get:
 *     summary: İlanın Steam bot emanet (deposit) durumunu getir (sadece ilan sahibi)
 *     tags: [Listings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Emanet durumu }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
// İlanın deposit durumunu getir (frontend bu endpoint'i poll eder)
router.get('/:id/deposit-status', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: 'İlan bulunamadı' });
    if (listing.seller.toString() !== userId) return res.status(403).json({ success: false, message: 'Bu ilana erişim yetkiniz yok' });

    res.json({
      success: true,
      data: {
        status: listing.status,
        depositStatus: listing.depositStatus,
        depositOfferId: listing.depositOfferId,
        tradeOfferUrl: listing.depositOfferId ? `https://steamcommunity.com/tradeoffer/${listing.depositOfferId}/` : undefined
      }
    });
  } catch (error) {
    console.error('Error fetching deposit status:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /listings/{id}/buy:
 *   post:
 *     summary: İlanı cüzdan bakiyesinden satın al
 *     tags: [Listings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: Satın alma başarılı — güncel bakiye ve ilan döner
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
 *                     listing: { $ref: '#/components/schemas/Listing' }
 *                     balance: { type: number }
 *       400: { description: 'İlan aktif değil / yetersiz bakiye / kendi ilanı' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
// İlan satın al (cüzdan bakiyesinden) — auth gerekli
router.post('/:id/buy', authenticateToken, async (req, res) => {
  try {
    const buyerId = (req as any).user.userId;
    const listingId = req.params.id;
    const buyerTradeUrl: string | undefined = req.body?.steamTradeUrl;

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'İlan bulunamadı' });
    }

    if (listing.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Bu ilan artık aktif değil' });
    }

    if (listing.seller.toString() === buyerId) {
      return res.status(400).json({ success: false, message: 'Kendi ilanınızı satın alamazsınız' });
    }

    // Item bot emanetindeyse (otomatik teslimat mümkünse) alıcının trade URL'i zorunludur.
    const willAutoDeliver = isBotConfigured && !!listing.botAssetId;
    if (willAutoDeliver && (!buyerTradeUrl || !buyerTradeUrl.includes('steamcommunity.com/tradeoffer'))) {
      return res.status(400).json({ success: false, message: 'Teslimat için geçerli bir Steam Trade URL giriniz' });
    }

    // 1) İlanı atomik olarak "sold" durumuna al — çift satışı (race condition) önler
    const claimedListing = await Listing.findOneAndUpdate(
      { _id: listingId, status: 'active' },
      { status: 'sold', buyer: buyerId, soldAt: new Date() },
      { new: true }
    );

    if (!claimedListing) {
      return res.status(400).json({ success: false, message: 'Bu ilan artık aktif değil' });
    }

    // 2) Alıcının bakiyesini atomik guard ile düş — yetersizse ilanı geri aktif hale getir
    const buyer = await User.findOneAndUpdate(
      { _id: buyerId, balance: { $gte: claimedListing.price } },
      { $inc: { balance: -claimedListing.price } },
      { new: true }
    );

    if (!buyer) {
      await Listing.findByIdAndUpdate(listingId, {
        $set: { status: 'active' },
        $unset: { buyer: '', soldAt: '' }
      });
      return res.status(400).json({ success: false, message: 'Yetersiz bakiye. Lütfen cüzdanınıza para yükleyin.' });
    }

    // 3) Satıcının bakiyesini artır
    const seller = await User.findByIdAndUpdate(
      claimedListing.seller,
      { $inc: { balance: claimedListing.price } },
      { new: true }
    );

    // 4) İşlem kayıtlarını oluştur
    const [purchaseTransaction] = await Transaction.create([
      {
        user: buyerId,
        type: 'purchase',
        amount: -claimedListing.price,
        balanceAfter: buyer.balance,
        status: 'completed',
        listing: claimedListing._id,
        counterparty: claimedListing.seller,
        description: `${claimedListing.title} satın alındı`
      },
      {
        user: claimedListing.seller,
        type: 'sale',
        amount: claimedListing.price,
        balanceAfter: seller?.balance,
        status: 'completed',
        listing: claimedListing._id,
        counterparty: buyerId,
        description: `${claimedListing.title} satıldı`
      }
    ]);

    // 5) Item bot emanetindeyse otomatik teslimat başlat — hata olursa satın alma iptal edilmez,
    //    teslimat 'failed' benzeri bir durumda kalır ve destek/manuel süreç devreye girer.
    let deliveryOffer: { offerId: string; tradeOfferUrl: string } | undefined;
    if (willAutoDeliver && buyerTradeUrl) {
      try {
        deliveryOffer = await requestDelivery(buyerTradeUrl, claimedListing.botAssetId!, CS2_APP_ID, CS2_INVENTORY_CONTEXT_ID);
        purchaseTransaction.deliveryOfferId = deliveryOffer.offerId;
        purchaseTransaction.deliveryStatus = 'pending';
        await purchaseTransaction.save();
      } catch (botError) {
        logger.error({ event: 'delivery_request_failed', transactionId: purchaseTransaction._id, error: botError }, 'Steam bot teslimat isteği başarısız');
      }
    }

    const populatedListing = await Listing.findById(claimedListing._id)
      .populate('seller', 'username')
      .populate('buyer', 'username')
      .populate('skin')
      .lean();

    logger.info(
      { event: 'purchase_completed', listingId: claimedListing._id, buyerId, sellerId: claimedListing.seller, price: claimedListing.price },
      'Satın alma tamamlandı'
    );

    // 6) Bildirimleri gönder — hata olursa satın alma sonucunu etkilemez
    try {
      await createNotification({
        user: buyerId,
        type: 'purchase',
        title: 'Satın Alma Başarılı',
        message: `${claimedListing.title} ürününü ${claimedListing.price} USD karşılığında satın aldınız.`,
        relatedListing: claimedListing._id.toString()
      });
      await createNotification({
        user: claimedListing.seller.toString(),
        type: 'sale',
        title: 'Ürününüz Satıldı',
        message: `${claimedListing.title} ürününüz ${claimedListing.price} USD karşılığında satıldı.`,
        relatedListing: claimedListing._id.toString()
      });
      if (seller?.email) {
        await sendCriticalEmail(
          seller.email,
          'Ürününüz Satıldı',
          `<p><strong>${claimedListing.title}</strong> ürününüz <strong>${claimedListing.price} USD</strong> karşılığında satıldı.</p><p>Güncel bakiyeniz: ${seller.balance} USD</p>`
        );
      }
    } catch (notifyError) {
      console.error('Purchase notification error:', notifyError);
    }

    res.json({
      success: true,
      message: 'Satın alma başarılı',
      data: { listing: populatedListing, balance: buyer.balance },
      deliveryTradeOfferUrl: deliveryOffer?.tradeOfferUrl
    });
  } catch (error) {
    console.error('Error buying listing:', error);
    res.status(500).json({ success: false, message: 'Satın alma işlemi başarısız oldu' });
  }
});

/**
 * @swagger
 * /listings/{id}:
 *   put:
 *     summary: İlanı güncelle (sadece ilan sahibi, sadece fiyat/trade URL)
 *     tags: [Listings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               price: { type: number }
 *               steamTradeUrl: { type: string }
 *     responses:
 *       200: { description: İlan güncellendi }
 *       400: { description: Sadece aktif ilanlar düzenlenebilir }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
// İlan güncelle (sadece ilan sahibi)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'İlan bulunamadı' });
    }

    if (listing.seller.toString() !== userId) {
      return res.status(403).json({ message: 'Bu ilanı düzenleme yetkiniz yok' });
    }

    if (listing.status !== 'active') {
      return res.status(400).json({ message: 'Sadece aktif ilanlar düzenlenebilir' });
    }

    const { price, steamTradeUrl } = req.body;
    if (price) listing.price = price;
    if (steamTradeUrl) listing.steamTradeUrl = steamTradeUrl;

    await listing.save();

    res.json({
      success: true,
      message: 'İlan güncellendi',
      data: listing
    });
  } catch (error) {
    console.error('Error updating listing:', error);
    res.status(500).json({ success: false, error: 'İlan güncellenemedi' });
  }
});

/**
 * @swagger
 * /listings/{id}:
 *   delete:
 *     summary: İlanı iptal et (sadece ilan sahibi)
 *     tags: [Listings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: İlan iptal edildi }
 *       400: { description: Satılmış ilanlar silinemez }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
// İlan iptal et (sadece ilan sahibi)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'İlan bulunamadı' });
    }

    if (listing.seller.toString() !== userId) {
      return res.status(403).json({ message: 'Bu ilanı silme yetkiniz yok' });
    }

    if (listing.status === 'sold') {
      return res.status(400).json({ message: 'Satılmış ilanlar silinemez' });
    }

    listing.status = 'cancelled';
    await listing.save();

    res.json({
      success: true,
      message: 'İlan iptal edildi'
    });
  } catch (error) {
    console.error('Error cancelling listing:', error);
    res.status(500).json({ success: false, error: 'İlan iptal edilemedi' });
  }
});

/**
 * @swagger
 * /listings/my/listings:
 *   get:
 *     summary: Giriş yapmış kullanıcının tüm ilanlarını getir (durumdan bağımsız)
 *     tags: [Listings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: İlan listesi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Listing' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
// Kullanıcının kendi ilanları
router.get('/my/listings', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;

    const listings = await Listing.find({ seller: userId })
      .populate('skin')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: listings
    });
  } catch (error) {
    console.error('Error fetching user listings:', error);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

export default router;

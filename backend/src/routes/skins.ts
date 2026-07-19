import express from 'express';
import axios from 'axios';
import Skin from '../models/Skin';
import Listing from '../models/Listing';

const router = express.Router();

// Steam Market API'den fiyat verisi çekme
async function getSteamMarketPrice(marketHashName: string): Promise<number | null> {
  try {
    const response = await axios.get(
      `https://steamcommunity.com/market/priceoverview/?appid=730&currency=1&market_hash_name=${encodeURIComponent(marketHashName)}`
    );

    if (response.data.success && response.data.lowest_price) {
      const price = parseFloat(response.data.lowest_price.replace(/[^0-9.]/g, ''));
      return price;
    }

    return null;
  } catch (error) {
    console.error('Steam Market API error:', error);
    return null;
  }
}

/**
 * @swagger
 * /skins/weapon/{weapon}:
 *   get:
 *     summary: Belirli bir silahın tüm skinlerini getir
 *     tags: [Skins]
 *     security: []
 *     parameters:
 *       - { in: path, name: weapon, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: Skin listesi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Skin' } }
 */
// Belirli bir silahın tüm skinlerini getir
router.get('/weapon/:weapon', async (req, res) => {
  try {
    const { weapon } = req.params;

    // MongoDB'den skinleri çek
    const skins = await Skin.find({ weapon: { $regex: new RegExp(`^${weapon}$`, 'i') } }).lean();

    if (skins.length === 0) {
      return res.json({
        success: true,
        data: [],
        weapon: weapon,
        message: 'Bu silah için skin bulunamadı'
      });
    }

    // Sonuçları frontend'in beklediği formata çevir
    const formattedSkins = skins.map(skin => ({
      id: skin.skinId,
      name: skin.name,
      weapon: skin.weapon,
      category: skin.category,
      rarity: skin.rarity,
      price: skin.price,
      image: skin.image,
      market_hash_name: skin.market_hash_name,
      wear: skin.wear,
      description: skin.description,
      collection: skin.collection
    }));

    res.json({
      success: true,
      data: formattedSkins,
      weapon: weapon
    });

  } catch (error) {
    console.error('Error fetching skins:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /skins/skin-price/{marketHashName}:
 *   get:
 *     summary: Steam Market'ten anlık fiyat referansı getir
 *     tags: [Skins]
 *     security: []
 *     parameters:
 *       - { in: path, name: marketHashName, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Fiyat verisi (bulunamazsa price null döner) }
 */
// Belirli bir skinin Steam Market fiyatını getir
router.get('/skin-price/:marketHashName', async (req, res) => {
  try {
    const { marketHashName } = req.params;
    const price = await getSteamMarketPrice(marketHashName);

    res.json({
      success: true,
      data: {
        market_hash_name: marketHashName,
        price: price
      }
    });

  } catch (error) {
    console.error('Error fetching skin details:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /skins/skin/{skinId}:
 *   get:
 *     summary: Skin detayını getir (Steam Market fiyatı ile birleştirilmiş)
 *     tags: [Skins]
 *     security: []
 *     parameters:
 *       - { in: path, name: skinId, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: Skin detayı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Skin' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
// Belirli bir skinin detaylarını getir (skinId ile)
router.get('/skin/:skinId', async (req, res) => {
  try {
    const { skinId } = req.params;

    // MongoDB'den skin bul
    const skin = await Skin.findOne({ skinId }).lean();

    if (!skin) {
      return res.status(404).json({
        success: false,
        error: 'Skin bulunamadı'
      });
    }

    // Steam Market'ten fiyat verisi
    let steamPrice = null;
    if (skin.market_hash_name) {
      steamPrice = await getSteamMarketPrice(skin.market_hash_name);
    }

    const skinData = {
      id: skin.skinId,
      name: skin.name,
      weapon: skin.weapon,
      category: skin.category,
      rarity: skin.rarity,
      price: steamPrice
        ? { min: steamPrice, max: steamPrice * 1.1, currency: 'USD' }
        : skin.price,
      image: skin.image,
      market_hash_name: skin.market_hash_name,
      wear: skin.wear,
      description: skin.description,
      collection: skin.collection
    };

    res.json({
      success: true,
      data: skinData
    });
  } catch (error) {
    console.error('Error fetching skin details:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /skins/{skinId}/price-history:
 *   get:
 *     summary: Skin fiyat geçmişi (platform satışları) + Steam anlık fiyat referansı
 *     tags: [Skins]
 *     security: []
 *     parameters:
 *       - { in: path, name: skinId, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: Günlük satış geçmişi (ortalama/min/max/hacim) + currentSteamPrice
 *       404: { $ref: '#/components/responses/NotFound' }
 */
// Skin için fiyat geçmişi: platformun kendi tamamlanmış satışları + Steam anlık fiyat referansı
router.get('/:skinId/price-history', async (req, res) => {
  try {
    const { skinId } = req.params;

    const skin = await Skin.findOne({ skinId }).lean();
    if (!skin) {
      return res.status(404).json({ success: false, error: 'Skin bulunamadı' });
    }

    const history = await Listing.aggregate([
      { $match: { skinId, status: 'sold', soldAt: { $exists: true } } },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$soldAt' } },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          volume: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    const currentSteamPrice = skin.market_hash_name ? await getSteamMarketPrice(skin.market_hash_name) : null;

    res.json({
      success: true,
      data: {
        history: history.map(h => ({
          date: h._id,
          avgPrice: h.avgPrice,
          minPrice: h.minPrice,
          maxPrice: h.maxPrice,
          volume: h.volume
        })),
        currentSteamPrice
      }
    });
  } catch (error) {
    console.error('Error fetching price history:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /skins/categories:
 *   get:
 *     summary: Tüm silah kategorilerini (ve skin sayılarını) getir
 *     tags: [Skins]
 *     security: []
 *     responses:
 *       200: { description: Kategori listesi }
 */
// Tüm silah kategorilerini getir
router.get('/categories', async (req, res) => {
  try {
    // MongoDB'den benzersiz kategorileri al
    const categories = await Skin.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const categoryMap: Record<string, string> = {
      'rifle': 'Tüfekler',
      'sniper': 'Keskin Nişancı Tüfekleri',
      'pistol': 'Tabancalar',
      'smg': 'SMG',
      'heavy': 'Ağır Silahlar',
      'knife': 'Bıçaklar'
    };

    const formattedCategories = categories.map(cat => ({
      id: cat._id + 's',
      name: categoryMap[cat._id] || cat._id,
      slug: cat._id,
      count: cat.count
    }));

    // Boş kategorileri de ekle (henüz bu kategoride skin yoksa bile)
    const allSlugs = ['rifle', 'sniper', 'pistol', 'smg', 'heavy', 'knife'];
    for (const slug of allSlugs) {
      if (!formattedCategories.find(c => c.slug === slug)) {
        formattedCategories.push({
          id: slug + 's',
          name: categoryMap[slug] || slug,
          slug: slug,
          count: 0
        });
      }
    }

    res.json({
      success: true,
      data: formattedCategories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /skins/popular:
 *   get:
 *     summary: Popüler (en yüksek fiyatlı) skinleri getir
 *     tags: [Skins]
 *     security: []
 *     responses:
 *       200:
 *         description: Popüler skin listesi (max 12)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Skin' } }
 */
// Popüler skinleri getir
router.get('/popular', async (req, res) => {
  try {
    // En pahalı skinleri popüler olarak döndür
    const popularSkins = await Skin.find()
      .sort({ 'price.min': -1 })
      .limit(12)
      .lean();

    const formattedSkins = popularSkins.map(skin => ({
      id: skin.skinId,
      name: skin.name,
      weapon: skin.weapon,
      category: skin.category,
      rarity: skin.rarity,
      price: skin.price,
      image: skin.image,
      market_hash_name: skin.market_hash_name,
      wear: skin.wear,
      description: skin.description,
      collection: skin.collection
    }));

    res.json({
      success: true,
      data: formattedSkins
    });

  } catch (error) {
    console.error('Error fetching popular skins:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /skins/search:
 *   get:
 *     summary: Skin adı/silah/skinId ile arama (min 2 karakter)
 *     tags: [Skins]
 *     security: []
 *     parameters:
 *       - { in: query, name: q, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: Arama sonuçları (max 10)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Skin' } }
 */
// Skin arama
router.get('/search', async (req, res) => {
  try {
    const query = (req.query.q as string || '').trim();

    if (query.length < 2) {
      return res.json({ success: true, data: [] });
    }

    // MongoDB'de regex ile arama
    const regex = new RegExp(query, 'i');
    const results = await Skin.find({
      $or: [
        { name: regex },
        { weapon: regex },
        { skinId: regex }
      ]
    })
      .limit(10)
      .lean();

    const formattedResults = results.map(skin => ({
      id: skin.skinId,
      name: skin.name,
      weapon: skin.weapon,
      category: skin.category,
      rarity: skin.rarity,
      price: skin.price,
      image: skin.image,
      market_hash_name: skin.market_hash_name
    }));

    res.json({
      success: true,
      data: formattedResults
    });
  } catch (error) {
    console.error('Error searching skins:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /skins:
 *   get:
 *     summary: Tüm skinleri listele (filtre + sıralama + pagination)
 *     tags: [Skins]
 *     security: []
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *       - { in: query, name: weapon, schema: { type: string } }
 *       - { in: query, name: category, schema: { type: string } }
 *       - { in: query, name: rarity, schema: { type: string } }
 *       - { in: query, name: sort, schema: { type: string, enum: [price-asc, price-desc, name-asc, name-desc] } }
 *     responses:
 *       200:
 *         description: Skin listesi + pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Skin' } }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 */
// Tüm skinleri getir (pagination destekli)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const weapon = req.query.weapon as string;
    const category = req.query.category as string;
    const rarity = req.query.rarity as string;
    const sort = req.query.sort as string || 'price-desc';

    // Filtre oluştur
    const filter: Record<string, any> = {};
    if (weapon) filter.weapon = { $regex: new RegExp(`^${weapon}$`, 'i') };
    if (category) filter.category = category;
    if (rarity) filter.rarity = rarity;

    // Sıralama
    let sortOption: Record<string, 1 | -1> = {};
    switch (sort) {
      case 'price-asc': sortOption = { 'price.min': 1 }; break;
      case 'price-desc': sortOption = { 'price.min': -1 }; break;
      case 'name-asc': sortOption = { name: 1 }; break;
      case 'name-desc': sortOption = { name: -1 }; break;
      default: sortOption = { 'price.min': -1 };
    }

    const [skins, total] = await Promise.all([
      Skin.find(filter).sort(sortOption).skip(skip).limit(limit).lean(),
      Skin.countDocuments(filter)
    ]);

    const formattedSkins = skins.map(skin => ({
      id: skin.skinId,
      name: skin.name,
      weapon: skin.weapon,
      category: skin.category,
      rarity: skin.rarity,
      price: skin.price,
      image: skin.image,
      market_hash_name: skin.market_hash_name,
      wear: skin.wear,
      description: skin.description,
      collection: skin.collection
    }));

    res.json({
      success: true,
      data: formattedSkins,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching skins:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
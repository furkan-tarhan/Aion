import express from 'express';
import { 
  getSteamUserProfile, 
  getCS2Skins, 
  getUserSkinsWithPrices, 
  calculateInventoryValue, 
  getMostExpensiveSkins,
  getSteamMarketPrice
} from '../services/steamApi';

const router = express.Router();

/**
 * @swagger
 * /steam/profile/{steamId}:
 *   get:
 *     summary: Steam kullanıcı profilini getir
 *     tags: [Steam]
 *     security: []
 *     parameters:
 *       - { in: path, name: steamId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Steam profil verisi }
 *       404: { description: Steam profili bulunamadı }
 */
// Kullanıcı profili getirme
router.get('/profile/:steamId', async (req, res) => {
  try {
    const { steamId } = req.params;
    
    const profile = await getSteamUserProfile(steamId);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Steam profile not found'
      });
    }
    
    res.json({
      success: true,
      data: profile
    });
    
  } catch (error) {
    console.error('Error fetching Steam profile:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /steam/inventory/{steamId}:
 *   get:
 *     summary: Kullanıcının Steam envanterindeki CS2 skinlerini getir
 *     tags: [Steam]
 *     security: []
 *     parameters:
 *       - { in: path, name: steamId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Envanter skin listesi }
 */
// Kullanıcının CS2 skinlerini getirme
router.get('/inventory/:steamId', async (req, res) => {
  try {
    const { steamId } = req.params;
    
    const skins = await getCS2Skins(steamId);
    
    res.json({
      success: true,
      data: {
        steamId,
        skins,
        totalSkins: skins.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching Steam inventory:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /steam/inventory/{steamId}/prices:
 *   get:
 *     summary: Envanter skinlerini Steam Market fiyatlarıyla birlikte getir
 *     tags: [Steam]
 *     security: []
 *     parameters:
 *       - { in: path, name: steamId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Fiyatlandırılmış skin listesi + toplam değer }
 */
// Kullanıcının skinlerini fiyatlarla birlikte getirme
router.get('/inventory/:steamId/prices', async (req, res) => {
  try {
    const { steamId } = req.params;
    
    const skinsWithPrices = await getUserSkinsWithPrices(steamId);
    
    res.json({
      success: true,
      data: {
        steamId,
        skins: skinsWithPrices,
        totalSkins: skinsWithPrices.length,
        totalValue: skinsWithPrices.reduce((total, skin) => total + (skin.price || 0), 0)
      }
    });
    
  } catch (error) {
    console.error('Error fetching Steam inventory with prices:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /steam/inventory/{steamId}/value:
 *   get:
 *     summary: Kullanıcının toplam envanter değerini hesapla (USD)
 *     tags: [Steam]
 *     security: []
 *     parameters:
 *       - { in: path, name: steamId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Toplam envanter değeri }
 */
// Kullanıcının envanter değerini hesaplama
router.get('/inventory/:steamId/value', async (req, res) => {
  try {
    const { steamId } = req.params;
    
    const totalValue = await calculateInventoryValue(steamId);
    
    res.json({
      success: true,
      data: {
        steamId,
        totalValue,
        currency: 'USD'
      }
    });
    
  } catch (error) {
    console.error('Error calculating inventory value:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /steam/inventory/{steamId}/expensive:
 *   get:
 *     summary: Kullanıcının en pahalı skinlerini getir
 *     tags: [Steam]
 *     security: []
 *     parameters:
 *       - { in: path, name: steamId, required: true, schema: { type: string } }
 *       - { in: query, name: limit, schema: { type: integer, default: 10 } }
 *     responses:
 *       200: { description: En pahalı skin listesi }
 */
// Kullanıcının en pahalı skinlerini getirme
router.get('/inventory/:steamId/expensive', async (req, res) => {
  try {
    const { steamId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const expensiveSkins = await getMostExpensiveSkins(steamId, limit);
    
    res.json({
      success: true,
      data: {
        steamId,
        skins: expensiveSkins,
        limit
      }
    });
    
  } catch (error) {
    console.error('Error fetching expensive skins:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /steam/price/{marketHashName}:
 *   get:
 *     summary: Steam Market'ten skin fiyatı getir
 *     tags: [Steam]
 *     security: []
 *     parameters:
 *       - { in: path, name: marketHashName, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Fiyat verisi }
 */
// Belirli bir skinin fiyatını getirme
router.get('/price/:marketHashName', async (req, res) => {
  try {
    const { marketHashName } = req.params;
    
    const price = await getSteamMarketPrice(marketHashName);
    
    res.json({
      success: true,
      data: {
        market_hash_name: marketHashName,
        price,
        currency: 'USD'
      }
    });
    
  } catch (error) {
    console.error('Error fetching skin price:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /steam/inventory/{steamId}/stats:
 *   get:
 *     summary: Envanter istatistikleri (toplam değer, tradeable/marketable sayıları, top 5, silah dağılımı)
 *     tags: [Steam]
 *     security: []
 *     parameters:
 *       - { in: path, name: steamId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Envanter istatistikleri }
 */
// Kullanıcının skin istatistiklerini getirme
router.get('/inventory/:steamId/stats', async (req, res) => {
  try {
    const { steamId } = req.params;
    
    const skinsWithPrices = await getUserSkinsWithPrices(steamId);
    
    // İstatistikleri hesapla
    const totalValue = skinsWithPrices.reduce((total, skin) => total + (skin.price || 0), 0);
    const tradeableSkins = skinsWithPrices.filter(skin => skin.tradeable === 1);
    const marketableSkins = skinsWithPrices.filter(skin => skin.marketable === 1);
    
    // En pahalı 5 skin
    const topSkins = skinsWithPrices
      .filter(skin => skin.price !== null)
      .sort((a, b) => (b.price || 0) - (a.price || 0))
      .slice(0, 5);
    
    // Silah kategorilerine göre dağılım
    const weaponCategories: Record<string, number> = {};
    skinsWithPrices.forEach(skin => {
      const weapon = skin.market_hash_name.split(' | ')[0];
      weaponCategories[weapon] = (weaponCategories[weapon] || 0) + 1;
    });
    
    res.json({
      success: true,
      data: {
        steamId,
        totalSkins: skinsWithPrices.length,
        totalValue,
        tradeableSkins: tradeableSkins.length,
        marketableSkins: marketableSkins.length,
        topSkins,
        weaponCategories,
        currency: 'USD'
      }
    });
    
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router; 
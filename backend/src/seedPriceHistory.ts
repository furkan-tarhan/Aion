import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { config } from './config';
import Skin from './models/Skin';
import Listing from './models/Listing';
import User from './models/User';

// Demo fiyat geçmişi için hedef skinler
const POPULAR_SKIN_IDS = [
  'awp-dragonlore',
  'm4a4-howling-dawn',
  'ak47-fire-serpent',
  'awp-medusa',
  'awp-asiimov',
  'awp-hyper-beast',
  'awp-printstream',
  'ak47-redline'
];

const DEMO_SELLER = { username: 'demo_seller', email: 'demo_seller@bynogame.local', password: 'DemoSeller123!' };
const DEMO_BUYER = { username: 'demo_buyer', email: 'demo_buyer@bynogame.local', password: 'DemoBuyer123!' };

const WEAR_OPTIONS = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

async function ensureDemoUser(userData: { username: string; email: string; password: string }) {
  let user = await User.findOne({ username: userData.username });
  if (user) return user;

  const hashedPassword = await bcrypt.hash(userData.password, 10);
  user = await User.create({
    username: userData.username,
    email: userData.email,
    password: hashedPassword,
    isEmailVerified: true,
    balance: 0
  });
  return user;
}

// Skin'in min/max fiyat aralığında rastgele-yürüyüş (random walk) ile sentetik satış geçmişi üretir
function generateSyntheticSales(skin: any, days: number): { price: number; soldAt: Date }[] {
  const sales: { price: number; soldAt: Date }[] = [];
  const now = Date.now();
  const minPrice = skin.price.min;
  const maxPrice = skin.price.max;
  const midPrice = (minPrice + maxPrice) / 2;
  const range = maxPrice - minPrice;

  let currentPrice = midPrice;

  for (let dayOffset = days; dayOffset >= 0; dayOffset--) {
    // Her gün için 0-2 satış (bazı günler satış olmayabilir, boşluklar gerçekçi görünsün)
    const salesToday = Math.random() < 0.35 ? 0 : Math.floor(randomBetween(1, 3));

    for (let i = 0; i < salesToday; i++) {
      // Rastgele yürüyüş: küçük bir adım ile fiyatı kaydır, aralık dışına taşmasın
      const step = randomBetween(-range * 0.04, range * 0.04);
      currentPrice = Math.min(maxPrice, Math.max(minPrice, currentPrice + step));

      const soldAt = new Date(now - dayOffset * 24 * 60 * 60 * 1000 - Math.random() * 20 * 60 * 60 * 1000);
      sales.push({ price: Math.round(currentPrice * 100) / 100, soldAt });
    }
  }

  return sales;
}

async function seedPriceHistory() {
  try {
    await mongoose.connect(config.database.uri);
    console.log('MongoDB bağlantısı başarılı');

    const seller = await ensureDemoUser(DEMO_SELLER);
    const buyer = await ensureDemoUser(DEMO_BUYER);
    console.log(`Demo kullanıcılar hazır: ${seller.username}, ${buyer.username}`);

    // İdempotent olması için demo satıcıya ait önceki kayıtları temizle
    const deleted = await Listing.deleteMany({ seller: seller._id });
    console.log(`Eski demo listing kayıtları temizlendi: ${deleted.deletedCount}`);

    let totalCreated = 0;

    for (const skinId of POPULAR_SKIN_IDS) {
      const skin = await Skin.findOne({ skinId });
      if (!skin) {
        console.warn(`Skin bulunamadı, atlanıyor: ${skinId}`);
        continue;
      }

      const sales = generateSyntheticSales(skin, 180); // ~6 ay
      if (sales.length === 0) continue;

      const listingsToInsert = sales.map(sale => {
        const wear = WEAR_OPTIONS[Math.floor(Math.random() * WEAR_OPTIONS.length)];
        return {
          seller: seller._id,
          buyer: buyer._id,
          skin: skin._id,
          skinId: skin.skinId,
          weapon: skin.weapon,
          rarity: skin.rarity,
          title: `${skin.weapon} | ${skin.name}`,
          price: sale.price,
          currency: 'USD',
          steamTradeUrl: 'https://steamcommunity.com/tradeoffer/demo',
          status: 'sold' as const,
          soldAt: sale.soldAt,
          wear,
          floatValue: Math.round(randomBetween(0.01, 0.9) * 1000) / 1000,
          isStatTrak: Math.random() < 0.15
        };
      });

      const result = await Listing.insertMany(listingsToInsert);
      console.log(`${skin.name} (${skinId}): ${result.length} sentetik satış oluşturuldu`);
      totalCreated += result.length;
    }

    console.log(`Toplam ${totalCreated} sentetik satış kaydı oluşturuldu.`);
  } catch (error) {
    console.error('Fiyat geçmişi seed hatası:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB bağlantısı kapatıldı');
  }
}

seedPriceHistory();

import mongoose from 'mongoose';
import { config } from './config';
import Skin from './models/Skin';

// Mevcut hardcoded skin verileri — frontend/src/lib/data.ts ve backend/src/routes/skins.ts'den alındı
const skinData = [
  // AWP Skinleri
  { skinId: 'awp-dragonlore', name: 'Dragon Lore', weapon: 'AWP', category: 'sniper', rarity: 'Contraband', price: { min: 50000, max: 100000, currency: 'USD' }, wear: 0.15, image: '/images/awp-dragonlore.png', market_hash_name: 'AWP | Dragon Lore (Field-Tested)', description: 'Efsanevi AWP Dragon Lore skini', collection: 'Cobblestone Collection' },
  { skinId: 'awp-medusa', name: 'Medusa', weapon: 'AWP', category: 'sniper', rarity: 'Covert', price: { min: 2000, max: 5000, currency: 'USD' }, wear: 0.12, image: '/images/Medusa.webp', market_hash_name: 'AWP | Medusa (Field-Tested)', description: 'Gorgon Medusa temalı AWP skini', collection: 'Gods and Monsters Collection' },
  { skinId: 'awp-atheris', name: 'Atheris', weapon: 'AWP', category: 'sniper', rarity: 'Classified', price: { min: 500, max: 1200, currency: 'USD' }, wear: 0.08, image: '/images/Atheris.webp', market_hash_name: 'AWP | Atheris (Field-Tested)', description: 'Viper temalı AWP skini', collection: 'Snakebite Case' },
  { skinId: 'awp-asiimov', name: 'Asiimov', weapon: 'AWP', category: 'sniper', rarity: 'Restricted', price: { min: 100, max: 300, currency: 'USD' }, wear: 0.18, image: '/images/Asiimov.webp', market_hash_name: 'AWP | Asiimov (Field-Tested)', description: 'Futuristik Asiimov tasarımı', collection: 'Bravo Case' },
  { skinId: 'awp-hyper-beast', name: 'Hyper Beast', weapon: 'AWP', category: 'sniper', rarity: 'Restricted', price: { min: 80, max: 200, currency: 'USD' }, wear: 0.22, image: '/images/Hyper Beast.webp', market_hash_name: 'AWP | Hyper Beast (Field-Tested)', description: 'Psikedelik Hyper Beast tasarımı', collection: 'Chroma Case' },
  { skinId: 'awp-the-prince', name: 'The Prince', weapon: 'AWP', category: 'sniper', rarity: 'Covert', price: { min: 1500, max: 3500, currency: 'USD' }, wear: 0.10, image: '/images/The Prince.webp', description: 'Prens temalı AWP skini', collection: 'Gods and Monsters Collection' },
  { skinId: 'awp-gunnir', name: 'Günnir', weapon: 'AWP', category: 'sniper', rarity: 'Classified', price: { min: 400, max: 800, currency: 'USD' }, wear: 0.14, image: '/images/Günnir.webp', description: 'Norse mitolojisi temalı AWP', collection: 'Gods and Monsters Collection' },
  { skinId: 'awp-snake-camo', name: 'Snake Camo', weapon: 'AWP', category: 'sniper', rarity: 'Mil-Spec', price: { min: 20, max: 50, currency: 'USD' }, wear: 0.25, image: '/images/Snake Camo.webp', description: 'Yılan kamuflaj deseni', collection: 'Snakebite Case' },
  { skinId: 'awp-desert-hydra', name: 'Desert Hydra', weapon: 'AWP', category: 'sniper', rarity: 'Restricted', price: { min: 60, max: 150, currency: 'USD' }, wear: 0.20, image: '/images/Desert Hydra.webp', description: 'Çöl hidra temalı tasarım', collection: 'Snakebite Case' },
  { skinId: 'awp-pink-ddpat', name: 'Pink DDPAT', weapon: 'AWP', category: 'sniper', rarity: 'Consumer', price: { min: 5, max: 15, currency: 'USD' }, wear: 0.30, image: '/images/Pink DDPAT.webp', description: 'Pembe DDPAT kamuflaj', collection: 'Bravo Case' },
  { skinId: 'awp-acheron', name: 'Acheron', weapon: 'AWP', category: 'sniper', rarity: 'Classified', price: { min: 200, max: 500, currency: 'USD' }, wear: 0.12, image: '/images/Acheron.webp', description: 'Karanlık Acheron tasarımı' },
  { skinId: 'awp-arsenic-spill', name: 'Arsenic Spill', weapon: 'AWP', category: 'sniper', rarity: 'Mil-Spec', price: { min: 10, max: 30, currency: 'USD' }, wear: 0.18, image: '/images/Arsenic Spill.webp', description: 'Arsenik dökülmesi temalı AWP' },
  { skinId: 'awp-boom', name: 'BOOM', weapon: 'AWP', category: 'sniper', rarity: 'Restricted', price: { min: 150, max: 400, currency: 'USD' }, wear: 0.10, image: '/images/BOOM.webp', description: 'Pop-art tarzı BOOM tasarımı' },
  { skinId: 'awp-black-nile', name: 'Black Nile', weapon: 'AWP', category: 'sniper', rarity: 'Classified', price: { min: 100, max: 250, currency: 'USD' }, wear: 0.15, image: '/images/Black Nile.webp', description: 'Siyah Nil temalı AWP' },
  { skinId: 'awp-cmyk', name: 'CMYK', weapon: 'AWP', category: 'sniper', rarity: 'Mil-Spec', price: { min: 5, max: 20, currency: 'USD' }, wear: 0.20, image: '/images/CMYK.webp', description: 'CMYK baskı renkleri temalı' },
  { skinId: 'awp-capillary', name: 'Capillary', weapon: 'AWP', category: 'sniper', rarity: 'Industrial', price: { min: 3, max: 10, currency: 'USD' }, wear: 0.25, image: '/images/Capillary.webp', description: 'Kılcal damar deseni' },
  { skinId: 'awp-chromatic-aberration', name: 'Chromatic Aberration', weapon: 'AWP', category: 'sniper', rarity: 'Mil-Spec', price: { min: 8, max: 25, currency: 'USD' }, wear: 0.18, image: '/images/Choromatic Aberration.webp', description: 'Kromatik sapma efekti' },
  { skinId: 'awp-chrome-cannon', name: 'Chrome Cannon', weapon: 'AWP', category: 'sniper', rarity: 'Restricted', price: { min: 30, max: 80, currency: 'USD' }, wear: 0.15, image: '/images/Chorome Cannon.webp', description: 'Krom kaplama tasarım' },
  { skinId: 'awp-containment-breach', name: 'Containment Breach', weapon: 'AWP', category: 'sniper', rarity: 'Covert', price: { min: 800, max: 2000, currency: 'USD' }, wear: 0.08, image: '/images/Containment Breach.webp', description: 'Biyolojik tehdit temalı AWP' },
  { skinId: 'awp-corticera', name: 'Corticera', weapon: 'AWP', category: 'sniper', rarity: 'Mil-Spec', price: { min: 15, max: 40, currency: 'USD' }, wear: 0.20, image: '/images/Corticera.webp', description: 'Organik kabuk temalı tasarım' },
  { skinId: 'awp-crakow', name: 'Crakow!', weapon: 'AWP', category: 'sniper', rarity: 'Classified', price: { min: 150, max: 350, currency: 'USD' }, wear: 0.12, image: '/images/Crakow!.webp', description: 'Krakow temalı AWP' },
  { skinId: 'awp-duality', name: 'Duality', weapon: 'AWP', category: 'sniper', rarity: 'Restricted', price: { min: 40, max: 100, currency: 'USD' }, wear: 0.18, image: '/images/Duality.webp', description: 'İkili doğa temalı tasarım' },
  { skinId: 'awp-electric-hive', name: 'Electric Hive', weapon: 'AWP', category: 'sniper', rarity: 'Restricted', price: { min: 50, max: 130, currency: 'USD' }, wear: 0.15, image: '/images/Electric Hive.webp', description: 'Elektrik kovan deseni' },
  { skinId: 'awp-elite-build', name: 'Elite Build', weapon: 'AWP', category: 'sniper', rarity: 'Mil-Spec', price: { min: 5, max: 18, currency: 'USD' }, wear: 0.22, image: '/images/Elite Build.webp', description: 'Elit yapı tasarımı' },
  { skinId: 'awp-exoskeleton', name: 'Exoskeleton', weapon: 'AWP', category: 'sniper', rarity: 'Industrial', price: { min: 3, max: 12, currency: 'USD' }, wear: 0.28, image: '/images/Exoskeleton.webp', description: 'Dış iskelet temalı AWP' },
  { skinId: 'awp-fade', name: 'Fade', weapon: 'AWP', category: 'sniper', rarity: 'Covert', price: { min: 1200, max: 3000, currency: 'USD' }, wear: 0.06, image: '/images/FADE.webp', description: 'Renk geçişli Fade tasarımı' },
  { skinId: 'awp-fever-dream', name: 'Fever Dream', weapon: 'AWP', category: 'sniper', rarity: 'Mil-Spec', price: { min: 8, max: 25, currency: 'USD' }, wear: 0.20, image: '/images/Fever Dream.webp', description: 'Ateşli rüya temalı AWP' },
  { skinId: 'awp-graphite', name: 'Graphite', weapon: 'AWP', category: 'sniper', rarity: 'Restricted', price: { min: 200, max: 500, currency: 'USD' }, wear: 0.08, image: '/images/Graphite.webp', description: 'Grafit kaplamalı klasik AWP' },
  { skinId: 'awp-green-energy', name: 'Green Energy', weapon: 'AWP', category: 'sniper', rarity: 'Classified', price: { min: 100, max: 280, currency: 'USD' }, wear: 0.12, image: '/images/Green Energy.webp', description: 'Yeşil enerji temalı AWP' },
  { skinId: 'awp-lightning-strike', name: 'Lightning Strike', weapon: 'AWP', category: 'sniper', rarity: 'Covert', price: { min: 300, max: 700, currency: 'USD' }, wear: 0.06, image: '/images/Lightning Strike.webp', description: 'Yıldırım çarpması temalı AWP' },
  { skinId: 'awp-longdog', name: 'LongDog', weapon: 'AWP', category: 'sniper', rarity: 'Classified', price: { min: 80, max: 200, currency: 'USD' }, wear: 0.15, image: '/images/LongDog.webp', description: 'Uzun köpek temalı eğlenceli AWP' },
  { skinId: 'awp-man-o-war', name: "Man-o'-War", weapon: 'AWP', category: 'sniper', rarity: 'Restricted', price: { min: 30, max: 80, currency: 'USD' }, wear: 0.18, image: "/images/Man-o'-War.webp", description: 'Savaş gemisi temalı AWP' },
  { skinId: 'awp-mortis', name: 'Mortis', weapon: 'AWP', category: 'sniper', rarity: 'Mil-Spec', price: { min: 8, max: 22, currency: 'USD' }, wear: 0.22, image: '/images/Mortis.webp', description: 'Ölüm temalı AWP' },
  { skinId: 'awp-neo-noir', name: 'Neo-Noir', weapon: 'AWP', category: 'sniper', rarity: 'Classified', price: { min: 200, max: 500, currency: 'USD' }, wear: 0.10, image: '/images/Neo-Noir.webp', description: 'Neo-noir sanat tarzı AWP' },
  { skinId: 'awp-oni-taiji', name: 'Oni Taiji', weapon: 'AWP', category: 'sniper', rarity: 'Covert', price: { min: 600, max: 1500, currency: 'USD' }, wear: 0.08, image: '/images/Oni Taiji.webp', description: 'Japon demon avcısı temalı AWP' },
  { skinId: 'awp-pop-awp', name: 'POP AWP', weapon: 'AWP', category: 'sniper', rarity: 'Restricted', price: { min: 20, max: 60, currency: 'USD' }, wear: 0.20, image: '/images/POP AWP.webp', description: 'Pop sanat temalı AWP' },
  { skinId: 'awp-phobas', name: 'Phobas', weapon: 'AWP', category: 'sniper', rarity: 'Mil-Spec', price: { min: 5, max: 15, currency: 'USD' }, wear: 0.25, image: '/images/Phobas.webp', description: 'Korku temalı AWP' },
  { skinId: 'awp-pit-viper', name: 'Pit Viper', weapon: 'AWP', category: 'sniper', rarity: 'Mil-Spec', price: { min: 10, max: 30, currency: 'USD' }, wear: 0.22, image: '/images/Pit Viber.webp', description: 'Çukur engerek yılanı temalı AWP' },
  { skinId: 'awp-printstream', name: 'Printstream', weapon: 'AWP', category: 'sniper', rarity: 'Covert', price: { min: 500, max: 1200, currency: 'USD' }, wear: 0.06, image: '/images/Printstream.webp', description: 'Minimalist siyah-beyaz tasarım' },
  { skinId: 'awp-raw', name: 'Raw', weapon: 'AWP', category: 'sniper', rarity: 'Industrial', price: { min: 2, max: 8, currency: 'USD' }, wear: 0.30, image: '/images/Raw.webp', description: 'Ham metal görünümlü AWP' },
  { skinId: 'awp-redline', name: 'Redline', weapon: 'AWP', category: 'sniper', rarity: 'Restricted', price: { min: 40, max: 100, currency: 'USD' }, wear: 0.15, image: '/images/RedLine.webp', description: 'Kırmızı çizgili AWP', collection: 'Huntsman Case' },
  { skinId: 'awp-safari-mesh', name: 'Safari Mesh', weapon: 'AWP', category: 'sniper', rarity: 'Consumer', price: { min: 1, max: 5, currency: 'USD' }, wear: 0.35, image: '/images/Safari Mesh.webp', description: 'Safari ağ deseni' },
  { skinId: 'awp-silk-tiger', name: 'Silk Tiger', weapon: 'AWP', category: 'sniper', rarity: 'Classified', price: { min: 120, max: 300, currency: 'USD' }, wear: 0.12, image: '/images/Silk Tiger.webp', description: 'İpek kaplan temalı AWP' },
  { skinId: 'awp-sun-in-leon', name: 'Sun in Leo', weapon: 'AWP', category: 'sniper', rarity: 'Mil-Spec', price: { min: 8, max: 20, currency: 'USD' }, wear: 0.20, image: '/images/Sun in Leon.webp', description: 'Aslan burcunda güneş temalı' },
  { skinId: 'awp-wildfire', name: 'Wildfire', weapon: 'AWP', category: 'sniper', rarity: 'Classified', price: { min: 150, max: 400, currency: 'USD' }, wear: 0.10, image: '/images/Wildfire.webp', description: 'Orman yangını temalı AWP' },
  { skinId: 'awp-worm-god', name: 'Worm God', weapon: 'AWP', category: 'sniper', rarity: 'Mil-Spec', price: { min: 5, max: 15, currency: 'USD' }, wear: 0.22, image: '/images/Worm God.webp', description: 'Solucan tanrısı temalı AWP' },

  // AK-47 Skinleri
  { skinId: 'ak47-redline', name: 'Redline', weapon: 'AK-47', category: 'rifle', rarity: 'Restricted', price: { min: 50, max: 150, currency: 'USD' }, wear: 0.15, image: '/images/ak47-redline.jpg', market_hash_name: 'AK-47 | Redline (Field-Tested)', description: 'Kırmızı çizgili AK-47 skini', collection: 'Huntsman Weapon Case' },
  { skinId: 'ak47-fire-serpent', name: 'Fire Serpent', weapon: 'AK-47', category: 'rifle', rarity: 'Covert', price: { min: 3000, max: 8000, currency: 'USD' }, wear: 0.10, image: '/images/ak47-fire-serpent.jpg', market_hash_name: 'AK-47 | Fire Serpent (Field-Tested)', description: 'Ateş yılanı temalı AK-47', collection: 'Bravo Case' },

  // M4A4 Skinleri
  { skinId: 'm4a4-howling-dawn', name: 'Howl', weapon: 'M4A4', category: 'rifle', rarity: 'Contraband', price: { min: 15000, max: 30000, currency: 'USD' }, wear: 0.12, image: '/images/m4a4-howl.jpg', market_hash_name: 'M4A4 | Howl (Field-Tested)', description: 'Efsanevi M4A4 Howl skini', collection: 'Huntsman Weapon Case' },
];

async function seed() {
  try {
    await mongoose.connect(config.database.uri);
    console.log('MongoDB bağlantısı başarılı');

    // Mevcut skinleri temizle ve yeniden yükle
    await Skin.deleteMany({});
    console.log('Mevcut skin verileri temizlendi');

    const result = await Skin.insertMany(skinData);
    console.log(`${result.length} skin başarıyla veritabanına yüklendi!`);

    // Yüklenen skinleri kontrol et
    const count = await Skin.countDocuments();
    console.log(`Toplam skin sayısı: ${count}`);

    const weapons = await Skin.distinct('weapon');
    console.log(`Silahlar: ${weapons.join(', ')}`);

    const categories = await Skin.distinct('category');
    console.log(`Kategoriler: ${categories.join(', ')}`);

  } catch (error) {
    console.error('Seed hatası:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB bağlantısı kapatıldı');
  }
}

seed();

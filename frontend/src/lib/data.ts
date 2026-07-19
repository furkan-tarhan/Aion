import { WeaponCategory, Weapon, Skin } from './types';

// AWP Skinleri - Tüm mevcut görseller
const awpSkins: Skin[] = [
  { id: 'awp-dragonlore', name: 'Dragon Lore', weapon: 'AWP', category: 'sniper', rarity: 'Contraband', price: { min: 50000, max: 100000, currency: 'USD' }, wear: 0.15, image: '/images/awp-dragonlore.png', description: 'Efsanevi AWP Dragon Lore skini', collection: 'Cobblestone Collection' },
  { id: 'awp-medusa', name: 'Medusa', weapon: 'AWP', category: 'sniper', rarity: 'Covert', price: { min: 2000, max: 5000, currency: 'USD' }, wear: 0.12, image: '/images/Medusa.webp', description: 'Gorgon Medusa temalı AWP skini', collection: 'Gods and Monsters Collection' },
  { id: 'awp-atheris', name: 'Atheris', weapon: 'AWP', category: 'sniper', rarity: 'Classified', price: { min: 500, max: 1200, currency: 'USD' }, wear: 0.08, image: '/images/Atheris.webp', description: 'Viper temalı AWP skini', collection: 'Snakebite Case' },
  { id: 'awp-asiimov', name: 'Asiimov', weapon: 'AWP', category: 'sniper', rarity: 'Restricted', price: { min: 100, max: 300, currency: 'USD' }, wear: 0.18, image: '/images/Asiimov.webp', description: 'Futuristik Asiimov tasarımı', collection: 'Bravo Case' },
  { id: 'awp-hyper-beast', name: 'Hyper Beast', weapon: 'AWP', category: 'sniper', rarity: 'Restricted', price: { min: 80, max: 200, currency: 'USD' }, wear: 0.22, image: '/images/Hyper Beast.webp', description: 'Psikedelik Hyper Beast tasarımı', collection: 'Chroma Case' },
  { id: 'awp-the-prince', name: 'The Prince', weapon: 'AWP', category: 'sniper', rarity: 'Covert', price: { min: 1500, max: 3500, currency: 'USD' }, wear: 0.10, image: '/images/The Prince.webp', description: 'Prens temalı AWP skini', collection: 'Gods and Monsters Collection' },
  { id: 'awp-gunnir', name: 'Günnir', weapon: 'AWP', category: 'sniper', rarity: 'Classified', price: { min: 400, max: 800, currency: 'USD' }, wear: 0.14, image: '/images/Günnir.webp', description: 'Norse mitolojisi temalı AWP', collection: 'Gods and Monsters Collection' },
  { id: 'awp-snake-camo', name: 'Snake Camo', weapon: 'AWP', category: 'sniper', rarity: 'Mil-Spec', price: { min: 20, max: 50, currency: 'USD' }, wear: 0.25, image: '/images/Snake Camo.webp', description: 'Yılan kamuflaj deseni', collection: 'Snakebite Case' },
  { id: 'awp-desert-hydra', name: 'Desert Hydra', weapon: 'AWP', category: 'sniper', rarity: 'Restricted', price: { min: 60, max: 150, currency: 'USD' }, wear: 0.20, image: '/images/Desert Hydra.webp', description: 'Çöl hidra temalı tasarım', collection: 'Snakebite Case' },
  { id: 'awp-pink-ddpat', name: 'Pink DDPAT', weapon: 'AWP', category: 'sniper', rarity: 'Consumer', price: { min: 5, max: 15, currency: 'USD' }, wear: 0.30, image: '/images/Pink DDPAT.webp', description: 'Pembe DDPAT kamuflaj', collection: 'Bravo Case' },
  { id: 'awp-acheron', name: 'Acheron', weapon: 'AWP', category: 'sniper', rarity: 'Classified', price: { min: 200, max: 500, currency: 'USD' }, wear: 0.12, image: '/images/Acheron.webp', description: 'Karanlık Acheron tasarımı' },
  { id: 'awp-arsenic-spill', name: 'Arsenic Spill', weapon: 'AWP', category: 'sniper', rarity: 'Mil-Spec', price: { min: 10, max: 30, currency: 'USD' }, wear: 0.18, image: '/images/Arsenic Spill.webp', description: 'Arsenik dökülmesi temalı AWP' },
  { id: 'awp-boom', name: 'BOOM', weapon: 'AWP', category: 'sniper', rarity: 'Restricted', price: { min: 150, max: 400, currency: 'USD' }, wear: 0.10, image: '/images/BOOM.webp', description: 'Pop-art tarzı BOOM tasarımı' },
  { id: 'awp-black-nile', name: 'Black Nile', weapon: 'AWP', category: 'sniper', rarity: 'Classified', price: { min: 100, max: 250, currency: 'USD' }, wear: 0.15, image: '/images/Black Nile.webp', description: 'Siyah Nil temalı AWP' },
  { id: 'awp-cmyk', name: 'CMYK', weapon: 'AWP', category: 'sniper', rarity: 'Mil-Spec', price: { min: 5, max: 20, currency: 'USD' }, wear: 0.20, image: '/images/CMYK.webp', description: 'CMYK baskı renkleri temalı' },
  { id: 'awp-capillary', name: 'Capillary', weapon: 'AWP', category: 'sniper', rarity: 'Industrial', price: { min: 3, max: 10, currency: 'USD' }, wear: 0.25, image: '/images/Capillary.webp', description: 'Kılcal damar deseni' },
  { id: 'awp-chromatic-aberration', name: 'Chromatic Aberration', weapon: 'AWP', category: 'sniper', rarity: 'Mil-Spec', price: { min: 8, max: 25, currency: 'USD' }, wear: 0.18, image: '/images/Choromatic Aberration.webp', description: 'Kromatik sapma efekti' },
  { id: 'awp-chrome-cannon', name: 'Chrome Cannon', weapon: 'AWP', category: 'sniper', rarity: 'Restricted', price: { min: 30, max: 80, currency: 'USD' }, wear: 0.15, image: '/images/Chorome Cannon.webp', description: 'Krom kaplama tasarım' },
  { id: 'awp-containment-breach', name: 'Containment Breach', weapon: 'AWP', category: 'sniper', rarity: 'Covert', price: { min: 800, max: 2000, currency: 'USD' }, wear: 0.08, image: '/images/Containment Breach.webp', description: 'Biyolojik tehdit temalı AWP' },
  { id: 'awp-corticera', name: 'Corticera', weapon: 'AWP', category: 'sniper', rarity: 'Mil-Spec', price: { min: 15, max: 40, currency: 'USD' }, wear: 0.20, image: '/images/Corticera.webp', description: 'Organik kabuk temalı tasarım' },
  { id: 'awp-crakow', name: 'Crakow!', weapon: 'AWP', category: 'sniper', rarity: 'Classified', price: { min: 150, max: 350, currency: 'USD' }, wear: 0.12, image: '/images/Crakow!.webp', description: 'Krakow temalı AWP' },
  { id: 'awp-duality', name: 'Duality', weapon: 'AWP', category: 'sniper', rarity: 'Restricted', price: { min: 40, max: 100, currency: 'USD' }, wear: 0.18, image: '/images/Duality.webp', description: 'İkili doğa temalı tasarım' },
  { id: 'awp-electric-hive', name: 'Electric Hive', weapon: 'AWP', category: 'sniper', rarity: 'Restricted', price: { min: 50, max: 130, currency: 'USD' }, wear: 0.15, image: '/images/Electric Hive.webp', description: 'Elektrik kovan deseni' },
  { id: 'awp-elite-build', name: 'Elite Build', weapon: 'AWP', category: 'sniper', rarity: 'Mil-Spec', price: { min: 5, max: 18, currency: 'USD' }, wear: 0.22, image: '/images/Elite Build.webp', description: 'Elit yapı tasarımı' },
  { id: 'awp-exoskeleton', name: 'Exoskeleton', weapon: 'AWP', category: 'sniper', rarity: 'Industrial', price: { min: 3, max: 12, currency: 'USD' }, wear: 0.28, image: '/images/Exoskeleton.webp', description: 'Dış iskelet temalı AWP' },
  { id: 'awp-fade', name: 'Fade', weapon: 'AWP', category: 'sniper', rarity: 'Covert', price: { min: 1200, max: 3000, currency: 'USD' }, wear: 0.06, image: '/images/FADE.webp', description: 'Renk geçişli Fade tasarımı' },
  { id: 'awp-fever-dream', name: 'Fever Dream', weapon: 'AWP', category: 'sniper', rarity: 'Mil-Spec', price: { min: 8, max: 25, currency: 'USD' }, wear: 0.20, image: '/images/Fever Dream.webp', description: 'Ateşli rüya temalı AWP' },
  { id: 'awp-graphite', name: 'Graphite', weapon: 'AWP', category: 'sniper', rarity: 'Restricted', price: { min: 200, max: 500, currency: 'USD' }, wear: 0.08, image: '/images/Graphite.webp', description: 'Grafit kaplamalı klasik AWP' },
  { id: 'awp-green-energy', name: 'Green Energy', weapon: 'AWP', category: 'sniper', rarity: 'Classified', price: { min: 100, max: 280, currency: 'USD' }, wear: 0.12, image: '/images/Green Energy.webp', description: 'Yeşil enerji temalı AWP' },
  { id: 'awp-lightning-strike', name: 'Lightning Strike', weapon: 'AWP', category: 'sniper', rarity: 'Covert', price: { min: 300, max: 700, currency: 'USD' }, wear: 0.06, image: '/images/Lightning Strike.webp', description: 'Yıldırım çarpması temalı AWP' },
  { id: 'awp-longdog', name: 'LongDog', weapon: 'AWP', category: 'sniper', rarity: 'Classified', price: { min: 80, max: 200, currency: 'USD' }, wear: 0.15, image: '/images/LongDog.webp', description: 'Uzun köpek temalı eğlenceli AWP' },
  { id: 'awp-man-o-war', name: "Man-o'-War", weapon: 'AWP', category: 'sniper', rarity: 'Restricted', price: { min: 30, max: 80, currency: 'USD' }, wear: 0.18, image: "/images/Man-o'-War.webp", description: 'Savaş gemisi temalı AWP' },
  { id: 'awp-mortis', name: 'Mortis', weapon: 'AWP', category: 'sniper', rarity: 'Mil-Spec', price: { min: 8, max: 22, currency: 'USD' }, wear: 0.22, image: '/images/Mortis.webp', description: 'Ölüm temalı AWP' },
  { id: 'awp-neo-noir', name: 'Neo-Noir', weapon: 'AWP', category: 'sniper', rarity: 'Classified', price: { min: 200, max: 500, currency: 'USD' }, wear: 0.10, image: '/images/Neo-Noir.webp', description: 'Neo-noir sanat tarzı AWP' },
  { id: 'awp-oni-taiji', name: 'Oni Taiji', weapon: 'AWP', category: 'sniper', rarity: 'Covert', price: { min: 600, max: 1500, currency: 'USD' }, wear: 0.08, image: '/images/Oni Taiji.webp', description: 'Japon demon avcısı temalı AWP' },
  { id: 'awp-pop-awp', name: 'POP AWP', weapon: 'AWP', category: 'sniper', rarity: 'Restricted', price: { min: 20, max: 60, currency: 'USD' }, wear: 0.20, image: '/images/POP AWP.webp', description: 'Pop sanat temalı AWP' },
  { id: 'awp-phobas', name: 'Phobas', weapon: 'AWP', category: 'sniper', rarity: 'Mil-Spec', price: { min: 5, max: 15, currency: 'USD' }, wear: 0.25, image: '/images/Phobas.webp', description: 'Korku temalı AWP' },
  { id: 'awp-pit-viper', name: 'Pit Viper', weapon: 'AWP', category: 'sniper', rarity: 'Mil-Spec', price: { min: 10, max: 30, currency: 'USD' }, wear: 0.22, image: '/images/Pit Viber.webp', description: 'Çukur engerek yılanı temalı AWP' },
  { id: 'awp-printstream', name: 'Printstream', weapon: 'AWP', category: 'sniper', rarity: 'Covert', price: { min: 500, max: 1200, currency: 'USD' }, wear: 0.06, image: '/images/Printstream.webp', description: 'Minimalist siyah-beyaz tasarım' },
  { id: 'awp-raw', name: 'Raw', weapon: 'AWP', category: 'sniper', rarity: 'Industrial', price: { min: 2, max: 8, currency: 'USD' }, wear: 0.30, image: '/images/Raw.webp', description: 'Ham metal görünümlü AWP' },
  { id: 'awp-redline', name: 'Redline', weapon: 'AWP', category: 'sniper', rarity: 'Restricted', price: { min: 40, max: 100, currency: 'USD' }, wear: 0.15, image: '/images/RedLine.webp', description: 'Kırmızı çizgili AWP', collection: 'Huntsman Case' },
  { id: 'awp-safari-mesh', name: 'Safari Mesh', weapon: 'AWP', category: 'sniper', rarity: 'Consumer', price: { min: 1, max: 5, currency: 'USD' }, wear: 0.35, image: '/images/Safari Mesh.webp', description: 'Safari ağ deseni' },
  { id: 'awp-silk-tiger', name: 'Silk Tiger', weapon: 'AWP', category: 'sniper', rarity: 'Classified', price: { min: 120, max: 300, currency: 'USD' }, wear: 0.12, image: '/images/Silk Tiger.webp', description: 'İpek kaplan temalı AWP' },
  { id: 'awp-sun-in-leon', name: 'Sun in Leo', weapon: 'AWP', category: 'sniper', rarity: 'Mil-Spec', price: { min: 8, max: 20, currency: 'USD' }, wear: 0.20, image: '/images/Sun in Leon.webp', description: 'Aslan burcunda güneş temalı' },
  { id: 'awp-wildfire', name: 'Wildfire', weapon: 'AWP', category: 'sniper', rarity: 'Classified', price: { min: 150, max: 400, currency: 'USD' }, wear: 0.10, image: '/images/Wildfire.webp', description: 'Orman yangını temalı AWP' },
  { id: 'awp-worm-god', name: 'Worm God', weapon: 'AWP', category: 'sniper', rarity: 'Mil-Spec', price: { min: 5, max: 15, currency: 'USD' }, wear: 0.22, image: '/images/Worm God.webp', description: 'Solucan tanrısı temalı AWP' },
];

// AK-47 Skinleri
const ak47Skins: Skin[] = [
  {
    id: 'ak47-redline',
    name: 'Redline',
    weapon: 'AK-47',
    category: 'rifle',
    rarity: 'Restricted',
    price: { min: 50, max: 150, currency: 'USD' },
    wear: 0.15,
    image: '/images/ak47-redline.jpg',
    description: 'Kırmızı çizgili AK-47 skini',
    collection: 'Huntsman Weapon Case'
  },
  {
    id: 'ak47-fire-serpent',
    name: 'Fire Serpent',
    weapon: 'AK-47',
    category: 'rifle',
    rarity: 'Covert',
    price: { min: 3000, max: 8000, currency: 'USD' },
    wear: 0.10,
    image: '/images/ak47-fire-serpent.jpg',
    description: 'Ateş yılanı temalı AK-47',
    collection: 'Bravo Case'
  }
];

// M4A4 Skinleri
const m4a4Skins: Skin[] = [
  {
    id: 'm4a4-howling-dawn',
    name: 'Howl',
    weapon: 'M4A4',
    category: 'rifle',
    rarity: 'Contraband',
    price: { min: 15000, max: 30000, currency: 'USD' },
    wear: 0.12,
    image: '/images/m4a4-howl.jpg',
    description: 'Efsanevi M4A4 Howl skini',
    collection: 'Huntsman Weapon Case'
  }
];

// Silah tanımları
const weapons: Weapon[] = [
  {
    id: 'awp',
    name: 'AWP',
    category: 'sniper',
    slug: 'awp',
    description: 'Keskin nişancı tüfeği',
    skins: awpSkins
  },
  {
    id: 'ak47',
    name: 'AK-47',
    category: 'rifle',
    slug: 'ak-47',
    description: 'Terrorist tarafının ana tüfeği',
    skins: ak47Skins
  },
  {
    id: 'm4a4',
    name: 'M4A4',
    category: 'rifle',
    slug: 'm4a4',
    description: 'Counter-Terrorist tarafının ana tüfeği',
    skins: m4a4Skins
  }
];

// Kategori tanımları
export const weaponCategories: WeaponCategory[] = [
  {
    id: 'rifles',
    name: 'Tüfekler',
    slug: 'rifle',
    weapons: weapons.filter(w => w.category === 'rifle')
  },
  {
    id: 'snipers',
    name: 'Keskin Nişancı Tüfekleri',
    slug: 'sniper',
    weapons: weapons.filter(w => w.category === 'sniper')
  },
  {
    id: 'pistols',
    name: 'Tabancalar',
    slug: 'pistol',
    weapons: weapons.filter(w => w.category === 'pistol')
  },
  {
    id: 'smgs',
    name: 'SMG',
    slug: 'smg',
    weapons: weapons.filter(w => w.category === 'smg')
  },
  {
    id: 'heavy',
    name: 'Ağır Silahlar',
    slug: 'heavy',
    weapons: weapons.filter(w => w.category === 'heavy')
  }
];

// Yardımcı fonksiyonlar
export const getWeaponBySlug = (slug: string): Weapon | undefined => {
  return weapons.find(w => w.slug === slug);
};

export const getSkinById = (skinId: string): Skin | undefined => {
  return weapons.flatMap(w => w.skins).find(s => s.id === skinId);
};

export const getCategoryBySlug = (slug: string): WeaponCategory | undefined => {
  return weaponCategories.find(c => c.slug === slug);
}; 
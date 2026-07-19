'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Navbar from '@/components/Navbar';
import { Link } from '@/i18n/navigation';
import { skinsApi } from '@/lib/api';

const weaponCategories = [
  {
    name: 'Bıçaklar',
    weapons: [
      { name: 'Karambit', slug: 'karambit' },
      { name: 'Bayonet', slug: 'bayonet' },
      { name: 'M9 Bayonet', slug: 'm9-bayonet' },
      { name: 'Flip Knife', slug: 'flip-knife' },
      { name: 'Gut Knife', slug: 'gut-knife' },
      { name: 'Butterfly Knife', slug: 'butterfly-knife' },
      { name: 'Shadow Daggers', slug: 'shadow-daggers' },
      { name: 'Falchion Knife', slug: 'falchion-knife' },
      { name: 'Huntsman Knife', slug: 'huntsman-knife' },
      { name: 'Bowie Knife', slug: 'bowie-knife' },
      { name: 'Stiletto Knife', slug: 'stiletto-knife' },
      { name: 'Talon Knife', slug: 'talon-knife' },
      { name: 'Ursus Knife', slug: 'ursus-knife' },
      { name: 'Navaja Knife', slug: 'navaja-knife' },
      { name: 'Classic Knife', slug: 'classic-knife' },
      { name: 'Paracord Knife', slug: 'paracord-knife' },
      { name: 'Survival Knife', slug: 'survival-knife' },
      { name: 'Nomad Knife', slug: 'nomad-knife' },
      { name: 'Skeleton Knife', slug: 'skeleton-knife' },
    ],
  },
  {
    name: 'Tabancalar',
    weapons: [
      { name: 'Glock-18', slug: 'glock-18' },
      { name: 'USP-S', slug: 'usp-s' },
      { name: 'P2000', slug: 'p2000' },
      { name: 'P250', slug: 'p250' },
      { name: 'Five-SeveN', slug: 'five-seven' },
      { name: 'Tec-9', slug: 'tec-9' },
      { name: 'CZ75-Auto', slug: 'cz75-auto' },
      { name: 'Desert Eagle', slug: 'desert-eagle' },
      { name: 'Dual Berettas', slug: 'dual-berettas' },
      { name: 'R8 Revolver', slug: 'r8-revolver' },
    ],
  },
  {
    name: 'SMG',
    weapons: [
      { name: 'MAC-10', slug: 'mac-10' },
      { name: 'MP9', slug: 'mp9' },
      { name: 'MP7', slug: 'mp7' },
      { name: 'MP5-SD', slug: 'mp5-sd' },
      { name: 'UMP-45', slug: 'ump-45' },
      { name: 'P90', slug: 'p90' },
      { name: 'PP-Bizon', slug: 'pp-bizon' },
    ],
  },
  {
    name: 'Tüfekler',
    weapons: [
      { name: 'FAMAS', slug: 'famas' },
      { name: 'Galil AR', slug: 'galil-ar' },
      { name: 'M4A4', slug: 'm4a4' },
      { name: 'M4A1-S', slug: 'm4a1-s' },
      { name: 'AK-47', slug: 'ak-47' },
      { name: 'AUG', slug: 'aug' },
      { name: 'SG 553', slug: 'sg-553' },
    ],
  },
  {
    name: 'Ağır Silahlar',
    weapons: [
      { name: 'Nova', slug: 'nova' },
      { name: 'XM1014', slug: 'xm1014' },
      { name: 'MAG-7', slug: 'mag-7' },
      { name: 'Sawed-Off', slug: 'sawed-off' },
      { name: 'M249', slug: 'm249' },
      { name: 'Negev', slug: 'negev' },
    ],
  },
  {
    name: 'Keskin Nişancı Tüfekleri',
    weapons: [
      { name: 'AWP', slug: 'awp' },
      { name: 'SSG 08', slug: 'ssg-08' },
      { name: 'SCAR-20', slug: 'scar-20' },
      { name: 'G3SG1', slug: 'g3sg1' },
    ],
  },
  {
    name: 'AJANLAR',
    weapons: [
      { name: 'Terrorists (T)', slug: 'terrorists' },
      { name: 'Counter-Terrorists (CT)', slug: 'counter-terrorists' },
    ],
  },
];

// Statik fallback data (backend çalışmıyorken)
const fallbackPopular = [
  { id: 'awp-dragonlore', name: 'Dragon Lore', weapon: 'AWP', category: 'sniper', rarity: 'Contraband', price: { min: 50000, max: 100000, currency: 'USD' }, image: '/images/awp-dragonlore.png' },
  { id: 'awp-medusa', name: 'Medusa', weapon: 'AWP', category: 'sniper', rarity: 'Covert', price: { min: 2000, max: 5000, currency: 'USD' }, image: '/images/Medusa.webp' },
  { id: 'ak47-fire-serpent', name: 'Fire Serpent', weapon: 'AK-47', category: 'rifle', rarity: 'Covert', price: { min: 3000, max: 8000, currency: 'USD' }, image: '/images/ak47-fire-serpent.jpg' },
  { id: 'm4a4-howling-dawn', name: 'Howl', weapon: 'M4A4', category: 'rifle', rarity: 'Contraband', price: { min: 15000, max: 30000, currency: 'USD' }, image: '/images/m4a4-howl.jpg' },
  { id: 'awp-asiimov', name: 'Asiimov', weapon: 'AWP', category: 'sniper', rarity: 'Restricted', price: { min: 100, max: 300, currency: 'USD' }, image: '/images/Asiimov.webp' },
  { id: 'awp-hyper-beast', name: 'Hyper Beast', weapon: 'AWP', category: 'sniper', rarity: 'Restricted', price: { min: 80, max: 200, currency: 'USD' }, image: '/images/Hyper Beast.webp' },
];

const rarityColors: Record<string, string> = {
  'Consumer': 'text-gray-500',
  'Industrial': 'text-blue-500',
  'Mil-Spec': 'text-green-500',
  'Restricted': 'text-purple-500',
  'Classified': 'text-pink-500',
  'Covert': 'text-red-500',
  'Contraband': 'text-yellow-500',
};

export default function HomeClient() {
  const t = useTranslations('home');
  const [popularSkins, setPopularSkins] = useState<any[]>(fallbackPopular);

  useEffect(() => {
    async function fetchPopular() {
      try {
        const data = await skinsApi.getPopular();
        if (data.data && data.data.length > 0) {
          setPopularSkins(data.data);
        }
      } catch {
        // Backend çalışmıyorsa fallback kullan
      }
    }
    fetchPopular();
  }, []);

  const formatPrice = (price: any) => {
    if (!price) return t('noPriceInfo');
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: price.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price.min);
  };

  return (
    <>
      <Navbar />
      <main className="relative min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-blue-950 dark:to-blue-900 text-black dark:text-gray-100">
        {/* Arka plan siluet */}
        <div className="fixed inset-0 -z-10 overflow-hidden opacity-10 dark:opacity-20">
          <div className="absolute inset-0 bg-[url('/logo.png')] bg-no-repeat bg-center bg-contain"></div>
        </div>

        <div className="container mx-auto px-4 py-12">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
              {t('heroTitle')}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {t('heroDescription')}
            </p>
          </div>

          {/* Silah Kategorileri */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {weaponCategories.map((category) => (
              <div
                key={category.name}
                className="bg-white/90 dark:bg-blue-900/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-blue-800 p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-blue-500 dark:hover:border-blue-400"
              >
                <h2 className="text-xl font-bold text-black dark:text-blue-200 mb-4 tracking-wide uppercase border-b border-gray-200 dark:border-blue-800 pb-2">
                  {category.name}
                </h2>
                <ul className="space-y-2">
                  {category.weapons.map((weapon) => (
                    <li key={weapon.slug}>
                      <Link
                        href={`/cs2/skins/${category.name === 'AJANLAR' ? 'agents' : category.name.toLowerCase().replace(/\s+/g, '-')}/${weapon.slug}`}
                        className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium flex items-center group"
                      >
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                        {weapon.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Popüler Ürünler */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-black dark:text-gray-100 mb-8 text-center">
              {t('popularProducts')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {popularSkins.map((skin) => (
                <div
                  key={skin.id}
                  className="bg-white/90 dark:bg-blue-900/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-blue-800 p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group"
                >
                  <div className="aspect-video bg-gray-100 dark:bg-blue-800 rounded-lg mb-4 overflow-hidden relative">
                    {skin.image && (
                      <img
                        src={skin.image}
                        alt={`${skin.weapon} | ${skin.name}`}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                  </div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {skin.weapon} | {skin.name}
                    </h3>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${rarityColors[skin.rarity] || 'text-gray-500'} bg-gray-100 dark:bg-gray-800`}>
                      {skin.rarity}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-green-600 dark:text-green-400 font-bold text-lg">
                      {formatPrice(skin.price)}
                    </span>
                    <Link
                      href={`/cs2/skins/${skin.category}/${skin.weapon?.toLowerCase().replace(/[^a-z0-9]/g, '-')}/${skin.id}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      {t('viewDetails')}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

'use client';

import React, { useEffect, useState, use } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { getWeaponBySlug, getCategoryBySlug } from '@/lib/data';
import Navbar from '@/components/Navbar';
import RarityBadge from '@/components/ui/RarityBadge';
import PriceDisplay from '@/components/ui/PriceDisplay';
import { skinsApi } from '@/lib/api';
import { cdnUrl } from '@/lib/cdn';
import PriceHistoryChart, { PriceHistoryPoint } from '@/components/PriceHistoryChart';

interface SkinDetail {
  id: string;
  name: string;
  weapon: string;
  category: string;
  rarity: string;
  price: {
    min: number;
    max: number;
    currency: string;
  };
  image: string;
  market_hash_name: string;
  wear?: number;
  collection?: string;
  description?: string;
  tradeUp?: string[];
  marketUrl?: string;
}

export default function SkinDetailClient({
  params
}: {
  params: Promise<{ category: string; weapon: string; skinId: string }>
}) {
  const t = useTranslations('skinDetail');
  const [skin, setSkin] = useState<SkinDetail | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [currentSteamPrice, setCurrentSteamPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'prices' | 'trade'>('overview');

  const resolvedParams = use(params);
  const weapon = getWeaponBySlug(resolvedParams.weapon);
  const category = getCategoryBySlug(resolvedParams.category);

  const wearConditionLabel = (wear: number) =>
    wear < 0.07 ? 'Factory New' :
      wear < 0.15 ? 'Minimal Wear' :
        wear < 0.38 ? 'Field-Tested' :
          wear < 0.45 ? 'Well-Worn' : 'Battle-Scarred';

  useEffect(() => {
    async function fetchSkinData() {
      try {
        setLoading(true);

        // Backend'den skin detaylarını çek
        const data = await skinsApi.getById(resolvedParams.skinId);

        if (data.success) {
          setSkin(data.data);
        } else {
          throw new Error('Skin bulunamadı');
        }

        // Fiyat geçmişini backend'den çek (platform satışları + Steam anlık referans)
        try {
          const priceHistoryData = await skinsApi.getPriceHistory(resolvedParams.skinId);
          if (priceHistoryData.success) {
            setPriceHistory(priceHistoryData.data.history);
            setCurrentSteamPrice(priceHistoryData.data.currentSteamPrice);
          }
        } catch (priceErr) {
          console.error('Error fetching price history:', priceErr);
        }

      } catch (err) {
        console.error('Error fetching skin:', err);
        setError(t('fetchError'));
      } finally {
        setLoading(false);
      }
    }

    fetchSkinData();
  }, [resolvedParams.skinId]);

  if (!weapon || !category) {
    notFound();
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-blue-950 dark:to-blue-900">
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-300">{t('loading')}</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (error || !skin) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-blue-950 dark:to-blue-900">
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 mb-4">{error || t('notFound')}</p>
              <Link
                href={`/cs2/skins/${category.slug}/${weapon.slug}`}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('back')}
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-blue-950 dark:to-blue-900">
        <div className="container mx-auto px-4 py-12">
          {/* Breadcrumb */}
          <nav className="mb-8">
            <ol className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
              <li>
                <Link href="/cs2" className="hover:text-blue-600 dark:hover:text-blue-400">
                  CS2
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link href="/cs2/skins" className="hover:text-blue-600 dark:hover:text-blue-400">
                  {t('breadcrumbSkins')}
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link href={`/cs2/skins/${category.slug}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                  {category.name}
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link href={`/cs2/skins/${category.slug}/${weapon.slug}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                  {weapon.name}
                </Link>
              </li>
              <li>/</li>
              <li className="text-gray-900 dark:text-gray-100 font-medium">{skin.name}</li>
            </ol>
          </nav>

          {/* Ana Skin Bilgileri */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Sol: Skin Görseli */}
            <div className="bg-white/90 dark:bg-blue-900/80 backdrop-blur-sm rounded-xl shadow-lg p-8">
              <div className="aspect-square bg-gray-100 dark:bg-blue-800 rounded-lg overflow-hidden mb-6">
                <img
                  src={cdnUrl(skin.image)}
                  alt={skin.name}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {skin.name}
                  </h1>
                  <RarityBadge rarity={skin.rarity} size="lg" />
                </div>

                <p className="text-gray-600 dark:text-gray-300">
                  {skin.weapon} • {skin.category}
                </p>

                {skin.collection && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('collectionLabel')}: {skin.collection}
                  </p>
                )}
              </div>
            </div>

            {/* Sağ: Fiyat ve Detaylar */}
            <div className="bg-white/90 dark:bg-blue-900/80 backdrop-blur-sm rounded-xl shadow-lg p-8">
              <div className="space-y-6">
                {/* Fiyat Bilgisi */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    {t('priceInfo')}
                  </h3>
                  {skin.price ? (
                    <PriceDisplay price={skin.price} size="lg" showRange={true} />
                  ) : (
                    <div className="text-gray-500 dark:text-gray-400 text-lg">
                      {t('priceLoading')}
                    </div>
                  )}
                </div>

                {/* Wear Bilgisi */}
                {skin.wear !== undefined && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      {t('wearValue')}
                    </h3>
                    <div className="bg-gray-100 dark:bg-blue-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300">{t('condition')}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {wearConditionLabel(skin.wear)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-blue-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(1 - skin.wear) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t('wearShort')}: {skin.wear.toFixed(3)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Market Linkleri */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    {t('marketActions')}
                  </h3>
                  <div className="space-y-3">
                    <a
                      href={`https://steamcommunity.com/market/listings/730/${encodeURIComponent(skin.market_hash_name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full px-4 py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {t('viewOnSteam')}
                    </a>
                    <a
                      href={`https://buff.163.com/goods/${encodeURIComponent(skin.market_hash_name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full px-4 py-3 bg-orange-600 text-white text-center rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      {t('viewOnBuff')}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Menüsü */}
          <div className="bg-white/90 dark:bg-blue-900/80 backdrop-blur-sm rounded-xl shadow-lg mb-8">
            <div className="border-b border-gray-200 dark:border-blue-700">
              <nav className="flex space-x-8 px-8">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'overview'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                  {t('tabOverview')}
                </button>
                <button
                  onClick={() => setActiveTab('prices')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'prices'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                  {t('tabPrices')}
                </button>
                <button
                  onClick={() => setActiveTab('trade')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'trade'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                  {t('tabTrade')}
                </button>
              </nav>
            </div>

            <div className="p-8">
              {/* Genel Bakış Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      {t('descriptionTitle')}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {skin.description || t('noDescription')}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      {t('technicalInfo')}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('weaponLabel')}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{skin.weapon}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('categoryLabel')}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{skin.category}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('rarityLabel')}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{skin.rarity}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('marketHashLabel')}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-xs truncate">
                          {skin.market_hash_name}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Fiyat Geçmişi Tab */}
              {activeTab === 'prices' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    {t('priceHistoryTitle')}
                  </h3>
                  <PriceHistoryChart history={priceHistory} currentSteamPrice={currentSteamPrice} />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                    {t('priceHistoryNote')}
                  </p>
                </div>
              )}

              {/* Trade-Up Tab */}
              {activeTab === 'trade' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    {t('tradeUpTitle')}
                  </h3>
                  {skin.tradeUp && skin.tradeUp.length > 0 ? (
                    <div className="space-y-4">
                      <p className="text-gray-600 dark:text-gray-300">
                        {t('tradeUpAvailable')}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {skin.tradeUp.map((tradeSkin, index) => (
                          <div key={index} className="p-4 bg-gray-50 dark:bg-blue-800 rounded-lg">
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {tradeSkin}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-300">
                      {t('tradeUpUnavailable')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Geri Dön Butonu */}
          <div className="text-center">
            <Link
              href={`/cs2/skins/${category.slug}/${weapon.slug}`}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ← {t('backToWeaponSkins', { name: weapon.name })}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

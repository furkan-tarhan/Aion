'use client';

import React, { useEffect, useState, use } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { getWeaponBySlug, getCategoryBySlug } from '@/lib/data';
import Navbar from '@/components/Navbar';
import SkinCard from '@/components/skins/SkinCard';
import { skinsApi } from '@/lib/api';

interface APISkin {
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
}

export default function WeaponClient({ params }: { params: Promise<{ category: string; weapon: string }> }) {
  const t = useTranslations('skinWeapon');
  const resolvedParams = use(params);
  const [skins, setSkins] = useState<APISkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weapon = getWeaponBySlug(resolvedParams.weapon);
  const category = getCategoryBySlug(resolvedParams.category);

  useEffect(() => {
    async function fetchSkins() {
      try {
        setLoading(true);

        // Backend API'den veri çek
        const data = await skinsApi.getByWeapon(resolvedParams.weapon);

        if (data.success) {
          setSkins(data.data);
        } else {
          throw new Error('API returned error');
        }

      } catch (err) {
        console.error('Error fetching skins:', err);
        setError(t('fetchError'));

        // Fallback: Statik veri kullan
        if (weapon) {
          setSkins(weapon.skins as any[]);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchSkins();
  }, [resolvedParams.weapon, weapon]);

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

  if (error) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-blue-950 dark:to-blue-900">
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('retry')}
              </button>
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
            <ol className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <li><Link href="/" className="hover:text-blue-600">{t('breadcrumbHome')}</Link></li>
              <li>/</li>
              <li><Link href="/cs2" className="hover:text-blue-600">CS2</Link></li>
              <li>/</li>
              <li><Link href="/cs2/skins" className="hover:text-blue-600">{t('breadcrumbSkins')}</Link></li>
              <li>/</li>
              <li><Link href={`/cs2/skins/${category.slug}`} className="hover:text-blue-600">{category.name}</Link></li>
              <li>/</li>
              <li className="text-gray-900 dark:text-gray-100 font-medium">{weapon.name}</li>
            </ol>
          </nav>

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">{weapon.name}</h1>
            {weapon.description && (
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                {weapon.description}
              </p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {t('skinsAvailable', { count: skins.length })}
            </p>
          </div>

          {/* Skin Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {skins.map((skin) => (
              <SkinCard
                key={skin.id}
                skin={skin}
                weaponSlug={weapon.slug}
                categorySlug={category.slug}
              />
            ))}
          </div>

          {/* Geri Dön Butonu */}
          <div className="mt-12 text-center">
            <Link
              href={`/cs2/skins/${category.slug}`}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              ← {t('backToCategory', { name: category.name })}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

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
        <main className="min-h-screen bg-background flex flex-col items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent mx-auto"></div>
            <p className="mt-4 text-muted font-medium">{t('loading')}</p>
          </div>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background flex flex-col items-center justify-center">
          <div className="text-center">
            <p className="text-red-500 font-medium mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-surface border border-border hover:border-accent hover:text-accent text-foreground font-bold rounded-lg transition-all shadow-md"
            >
              {t('retry')}
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background text-foreground font-sans pt-12 pb-24 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="container mx-auto px-6 max-w-7xl relative z-10">
          {/* Breadcrumb */}
          <nav className="mb-10">
            <ol className="flex items-center space-x-2 text-sm text-muted">
              <li><Link href="/" className="hover:text-accent transition-colors">{t('breadcrumbHome')}</Link></li>
              <li>/</li>
              <li><Link href="/cs2" className="hover:text-accent transition-colors">CS2</Link></li>
              <li>/</li>
              <li><Link href="/cs2/skins" className="hover:text-accent transition-colors">{t('breadcrumbSkins')}</Link></li>
              <li>/</li>
              <li><Link href={`/cs2/skins/${category.slug}`} className="hover:text-accent transition-colors">{category.name}</Link></li>
              <li>/</li>
              <li className="text-foreground font-medium">{weapon.name}</li>
            </ol>
          </nav>

          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">{weapon.name}</h1>
            {weapon.description && (
              <p className="text-lg text-muted max-w-2xl mx-auto font-medium mb-4">
                {weapon.description}
              </p>
            )}
            <p className="text-sm text-accent font-semibold">
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
          <div className="mt-16 text-center">
            <Link
              href={`/cs2/skins/${category.slug}`}
              className="inline-flex items-center px-8 py-4 bg-surface border border-border hover:border-accent hover:text-accent text-foreground font-bold rounded-lg transition-all shadow-md"
            >
              ← {t('backToCategory', { name: category.name })}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

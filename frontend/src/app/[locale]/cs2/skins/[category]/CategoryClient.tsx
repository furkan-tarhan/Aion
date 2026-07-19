'use client';

import React, { use } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { getCategoryBySlug } from '@/lib/data';
import Navbar from '@/components/Navbar';

export default function CategoryClient({ params }: { params: Promise<{ category: string }> }) {
  const t = useTranslations('skinCategory');
  const resolvedParams = use(params);
  const category = getCategoryBySlug(resolvedParams.category);

  if (!category) {
    notFound();
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-blue-950 dark:to-blue-900">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold mb-8 text-center">{category.name}</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {category.weapons.map((weapon) => (
              <Link
                key={weapon.id}
                href={`/cs2/skins/${category.slug}/${weapon.slug}`}
                className="bg-white/90 dark:bg-blue-900/80 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all"
              >
                <h3 className="text-xl font-semibold mb-2">{weapon.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  {t('skinsAvailable', { count: weapon.skins.length })}
                </p>
                <span className="text-blue-600 dark:text-blue-400">{t('viewLink')} →</span>
              </Link>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link href="/cs2" className="px-6 py-3 bg-blue-600 text-white rounded-lg">
              ← {t('backToCs2Home')}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

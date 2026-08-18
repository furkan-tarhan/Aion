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
      <main className="min-h-screen bg-background text-foreground pt-12 pb-24 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="container mx-auto px-4 relative z-10 max-w-7xl">
          <h1 className="text-4xl font-bold mb-10 text-center text-foreground">{category.name}</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {category.weapons.map((weapon) => (
              <Link
                key={weapon.id}
                href={`/cs2/skins/${category.slug}/${weapon.slug}`}
                className="bg-surface rounded-xl border border-border p-6 hover:border-accent hover:-translate-y-1 transition-all group shadow-md"
              >
                <h3 className="text-xl font-bold mb-2 group-hover:text-accent transition-colors">{weapon.name}</h3>
                <p className="text-sm text-muted mb-6 font-medium">
                  {t('skinsAvailable', { count: weapon.skins.length })}
                </p>
                <span className="text-accent text-sm font-semibold">{t('viewLink')} →</span>
              </Link>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Link href="/cs2/skins" className="inline-flex items-center px-8 py-3 bg-surface border border-border hover:border-accent hover:text-accent text-foreground font-bold rounded-lg transition-all shadow-md">
              ← Ana Koleksiyona Dön
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

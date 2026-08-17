import React from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { weaponCategories } from '@/lib/data';
import Navbar from '@/components/Navbar';
import { buildLanguageAlternates } from '@/lib/seo';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'cs2Overview' });

  return {
    title: t('metaTitle'),
    description: t('skinsMetaDescription'),
    alternates: { canonical: `/${locale}/cs2/skins`, languages: buildLanguageAlternates('/cs2/skins') }
  };
}

export default async function SkinsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'cs2Overview' });

  return (
    <>
      <Navbar />
      <main className="relative min-h-screen bg-background text-foreground font-sans pt-12 pb-24">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="container mx-auto px-6 max-w-7xl relative z-10">
          {/* Breadcrumb */}
          <nav className="mb-10">
            <ol className="flex items-center space-x-2 text-sm text-muted">
              <li>
                <Link href="/" className="hover:text-accent transition-colors">
                  {t('breadcrumbHome')}
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link href="/cs2" className="hover:text-accent transition-colors">
                  CS2
                </Link>
              </li>
              <li>/</li>
              <li className="text-foreground font-medium">
                {t('breadcrumbSkins')}
              </li>
            </ol>
          </nav>

          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight">
              CS2 Skin <span className="text-accent">Koleksiyonu</span>
            </h1>
            <p className="text-lg text-muted max-w-2xl mx-auto font-medium">
              Counter-Strike 2 skinlerini keşfedin, fiyatları karşılaştırın ve en iyi teklifleri bulun.
            </p>
          </div>

          {/* Kategori Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {weaponCategories.map((category) => (
              <div 
                key={category.id} 
                className="bg-surface rounded-xl p-8 border border-border transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-lg hover:shadow-accent/5 group"
              >
                <h2 className="text-xl font-bold text-foreground mb-6 tracking-wide uppercase border-b border-border pb-4 group-hover:text-accent transition-colors">
                  {category.name}
                </h2>
                
                {/* Silah Listesi */}
                <div className="space-y-4">
                  {category.weapons.map((weapon) => (
                    <Link
                      key={weapon.id}
                      href={`/cs2/skins/${category.slug}/${weapon.slug}`}
                      className="flex items-center justify-between text-muted hover:text-foreground font-medium transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent/50 group-hover:bg-accent transition-colors"></div>
                        {weapon.name}
                      </div>
                      <span className="text-xs text-muted/70 font-mono">
                        {weapon.skins.length} {t('skinUnit')}
                      </span>
                    </Link>
                  ))}
                </div>

                {/* Kategori Linki */}
                <div className="mt-8 pt-6 border-t border-border">
                  <Link
                    href={`/cs2/skins/${category.slug}`}
                    className="text-accent font-semibold text-sm hover:text-accentHover transition-colors flex items-center gap-2"
                  >
                    {t('allPrefix')} {category.name} → 
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Geri Dön Butonu */}
          <div className="mt-16 text-center">
            <Link
              href="/cs2"
              className="inline-flex items-center px-8 py-4 bg-surface border border-border hover:border-accent hover:text-accent text-foreground font-bold rounded-lg transition-all shadow-md"
            >
              ← CS2 Ana Sayfasına Dön
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

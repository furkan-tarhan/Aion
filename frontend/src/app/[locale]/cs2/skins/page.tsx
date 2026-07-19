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
      <main className="relative min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-blue-950 dark:to-blue-900 text-black dark:text-gray-100">
        {/* Arka plan siluet */}
        <div className="fixed inset-0 -z-10 overflow-hidden opacity-10 dark:opacity-20">
          <div className="absolute inset-0 bg-[url('/logo.png')] bg-no-repeat bg-center bg-contain"></div>
        </div>

        <div className="container mx-auto px-4 py-12">
          {/* Breadcrumb */}
          <nav className="mb-8">
            <ol className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {t('breadcrumbHome')}
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link href="/cs2" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  CS2
                </Link>
              </li>
              <li>/</li>
              <li className="text-gray-900 dark:text-gray-100 font-medium">
                {t('breadcrumbSkins')}
              </li>
            </ol>
          </nav>

          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
              {t('heroTitle')}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {t('heroDescription')}
            </p>
          </div>

          {/* Kategori Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {weaponCategories.map((category) => (
              <div 
                key={category.id} 
                className="bg-white/90 dark:bg-blue-900/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-blue-800 p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-blue-500 dark:hover:border-blue-400"
              >
                <h2 className="text-xl font-bold text-black dark:text-blue-200 mb-4 tracking-wide uppercase border-b border-gray-200 dark:border-blue-800 pb-2">
                  {category.name}
                </h2>
                
                {/* Silah Listesi */}
                <div className="space-y-3">
                  {category.weapons.map((weapon) => (
                    <Link
                      key={weapon.id}
                      href={`/cs2/skins/${category.slug}/${weapon.slug}`}
                      className="block text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium flex items-center group transition-colors"
                    >
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                      {weapon.name}
                      <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                        {weapon.skins.length} {t('skinUnit')}
                      </span>
                    </Link>
                  ))}
                </div>

                {/* Kategori Linki */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-blue-800">
                  <Link
                    href={`/cs2/skins/${category.slug}`}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium transition-colors"
                  >
                    {t('allPrefix')} {category.name} → 
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Geri Dön Butonu */}
          <div className="mt-12 text-center">
            <Link
              href="/cs2"
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              ← {t('backToCs2Home')}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

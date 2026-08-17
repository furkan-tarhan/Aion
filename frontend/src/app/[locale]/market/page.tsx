import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buildLanguageAlternates } from '@/lib/seo';
import MarketClient from './MarketClient';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'market' });
  const title = t('metaTitle');
  const description = t('metaDescription');

  return {
    title,
    description,
    alternates: { canonical: `/${locale}/market`, languages: buildLanguageAlternates('/market') },
    openGraph: { title, description, url: `/${locale}/market` },
    twitter: { title, description }
  };
}

export default function MarketPage() {
  return (
    <Suspense>
      <MarketClient />
    </Suspense>
  );
}

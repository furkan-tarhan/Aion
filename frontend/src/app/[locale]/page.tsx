import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buildLanguageAlternates } from '@/lib/seo';
import HomeClient from './HomeClient';

// Ana sayfa root layout ile aynı route segment'inde olduğu için title.template
// otomatik uygulanmaz (Next.js'in dokümante edilmiş davranışı) — başlık burada tam yazılır.
export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });
  const title = t('metaTitle');
  const description = t('metaDescription');

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/${locale}`, languages: buildLanguageAlternates('/') },
    openGraph: { title, description, url: `/${locale}` },
    twitter: { title, description }
  };
}

export default function Home() {
  return <HomeClient />;
}

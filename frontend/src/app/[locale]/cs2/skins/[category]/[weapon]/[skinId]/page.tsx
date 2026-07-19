import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { absoluteUrl, buildLanguageAlternates, buildProductJsonLd, getSkinForSeo } from '@/lib/seo';
import SkinDetailClient from './SkinDetailClient';

type SkinDetailParams = Promise<{ category: string; weapon: string; skinId: string; locale: string }>;

export async function generateMetadata({ params }: { params: SkinDetailParams }): Promise<Metadata> {
  const { category, weapon, skinId, locale } = await params;
  const skin = await getSkinForSeo(skinId);
  if (!skin) return {};

  const t = await getTranslations({ locale, namespace: 'skinDetail' });
  const title = `${skin.weapon} | ${skin.name}`;
  const description = skin.description || t('metaDescriptionFallback', { title, rarity: skin.rarity });
  const canonicalPath = `/${locale}/cs2/skins/${category}/${weapon}/${skinId}`;
  const imageUrl = absoluteUrl(skin.image);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
      languages: buildLanguageAlternates(`/cs2/skins/${category}/${weapon}/${skinId}`)
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      images: [{ url: imageUrl }]
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl]
    }
  };
}

export default async function SkinDetailPage({ params }: { params: SkinDetailParams }) {
  const { category, weapon, skinId, locale } = await params;
  const skin = await getSkinForSeo(skinId);
  let jsonLd = null;
  if (skin) {
    const t = await getTranslations({ locale, namespace: 'skinDetail' });
    const title = `${skin.weapon} | ${skin.name}`;
    const description = skin.description || t('metaDescriptionFallback', { title, rarity: skin.rarity });
    jsonLd = buildProductJsonLd(skin, `/${locale}/cs2/skins/${category}/${weapon}/${skinId}`, description);
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <SkinDetailClient params={params} />
    </>
  );
}

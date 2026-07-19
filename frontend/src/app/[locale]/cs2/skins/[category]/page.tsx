import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getCategoryBySlug } from '@/lib/data';
import { buildLanguageAlternates } from '@/lib/seo';
import CategoryClient from './CategoryClient';

export async function generateMetadata({ params }: { params: Promise<{ category: string; locale: string }> }): Promise<Metadata> {
  const { category: slug, locale } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return {};

  const t = await getTranslations({ locale, namespace: 'skinCategory' });
  const title = t('metaTitle', { name: category.name });
  const description = t('metaDescription', { name: category.name });

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/cs2/skins/${category.slug}`,
      languages: buildLanguageAlternates(`/cs2/skins/${category.slug}`)
    },
    openGraph: { title, description }
  };
}

export default function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  return <CategoryClient params={params} />;
}

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getWeaponBySlug, getCategoryBySlug } from '@/lib/data';
import { buildLanguageAlternates } from '@/lib/seo';
import WeaponClient from './WeaponClient';

export async function generateMetadata({
  params
}: {
  params: Promise<{ category: string; weapon: string; locale: string }>;
}): Promise<Metadata> {
  const { category: categorySlug, weapon: weaponSlug, locale } = await params;
  const weapon = getWeaponBySlug(weaponSlug);
  const category = getCategoryBySlug(categorySlug);
  if (!weapon || !category) return {};

  const t = await getTranslations({ locale, namespace: 'skinWeapon' });
  const title = t('metaTitle', { name: weapon.name });
  const description = weapon.description
    ? t('metaDescriptionWithDetails', { name: weapon.name, description: weapon.description })
    : t('metaDescription', { name: weapon.name });

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/cs2/skins/${category.slug}/${weapon.slug}`,
      languages: buildLanguageAlternates(`/cs2/skins/${category.slug}/${weapon.slug}`)
    },
    openGraph: { title, description }
  };
}

export default function WeaponPage({
  params
}: {
  params: Promise<{ category: string; weapon: string }>;
}) {
  return <WeaponClient params={params} />;
}

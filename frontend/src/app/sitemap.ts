import type { MetadataRoute } from 'next';
import { SITE_URL, getAllSkinsForSitemap } from '@/lib/seo';
import { weaponCategories } from '@/lib/data';
import { routing } from '@/i18n/routing';

function localizedEntry(
  pathWithoutLocale: string,
  options: { changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }
): MetadataRoute.Sitemap {
  const normalized = pathWithoutLocale === '/' ? '' : pathWithoutLocale;
  return routing.locales.map(locale => {
    const languages: Record<string, string> = {};
    routing.locales.forEach(l => {
      languages[l] = `${SITE_URL}/${l}${normalized}`;
    });
    languages['x-default'] = `${SITE_URL}/${routing.defaultLocale}${normalized}`;

    return {
      url: `${SITE_URL}/${locale}${normalized}`,
      changeFrequency: options.changeFrequency,
      priority: options.priority,
      alternates: { languages }
    };
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    ...localizedEntry('/', { changeFrequency: 'daily', priority: 1 }),
    ...localizedEntry('/market', { changeFrequency: 'hourly', priority: 0.9 }),
    ...localizedEntry('/cs2', { changeFrequency: 'weekly', priority: 0.8 }),
    ...localizedEntry('/cs2/skins', { changeFrequency: 'weekly', priority: 0.8 })
  ];

  const categoryWeaponRoutes: MetadataRoute.Sitemap = weaponCategories.flatMap(category =>
    category.weapons.length > 0
      ? [
          ...localizedEntry(`/cs2/skins/${category.slug}`, { changeFrequency: 'weekly', priority: 0.7 }),
          ...category.weapons.flatMap(weapon =>
            localizedEntry(`/cs2/skins/${category.slug}/${weapon.slug}`, {
              changeFrequency: 'weekly',
              priority: 0.6
            })
          )
        ]
      : []
  );

  // Silah adı ("AWP") -> slug + kategori slug eşlemesi (data.ts rota yapısına dayanır)
  const weaponSlugByName = new Map<string, { weaponSlug: string; categorySlug: string }>();
  weaponCategories.forEach(category => {
    category.weapons.forEach(weapon => {
      weaponSlugByName.set(weapon.name, { weaponSlug: weapon.slug, categorySlug: category.slug });
    });
  });

  const skins = await getAllSkinsForSitemap();
  const skinRoutes: MetadataRoute.Sitemap = skins.flatMap(skin => {
    const mapping = weaponSlugByName.get(skin.weapon);
    if (!mapping) return [];
    return localizedEntry(
      `/cs2/skins/${mapping.categorySlug}/${mapping.weaponSlug}/${skin.id}`,
      { changeFrequency: 'weekly', priority: 0.5 }
    );
  });

  return [...staticRoutes, ...categoryWeaponRoutes, ...skinRoutes];
}

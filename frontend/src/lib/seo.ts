import { routing } from '@/i18n/routing';
import { cdnUrl, isCdnAssetPath } from '@/lib/cdn';

// Bu dosya sadece server component'lerde (generateMetadata, sitemap.ts) çalışır.
// Docker/Nginx arkasında NEXT_PUBLIC_API_URL browser için relative ("") olabileceğinden,
// server-side fetch'ler için ayrıca API_INTERNAL_URL (örn. http://backend:5000) kullanılır.
const API_BASE_URL = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
export const SITE_NAME = 'Zade';

export function absoluteUrl(path: string): string {
  if (!path) return SITE_URL;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  // Skin/OG görselleri CDN'deyse mutlak CDN URL kullan (Open Graph crawler'ları için).
  if (isCdnAssetPath(normalized)) {
    const viaCdn = cdnUrl(normalized);
    if (viaCdn.startsWith('http://') || viaCdn.startsWith('https://')) return viaCdn;
  }
  return `${SITE_URL}${normalized}`;
}

// Verilen locale önekisiz path için tüm desteklenen dillere ait mutlak URL'leri üretir.
// `generateMetadata`'da `alternates.languages` (hreflang) için kullanılır.
export function buildLanguageAlternates(pathWithoutLocale: string): Record<string, string> {
  const normalized = pathWithoutLocale.startsWith('/') ? pathWithoutLocale : `/${pathWithoutLocale}`;
  const languages: Record<string, string> = {};
  routing.locales.forEach(locale => {
    languages[locale] = `/${locale}${normalized === '/' ? '' : normalized}`;
  });
  languages['x-default'] = `/${routing.defaultLocale}${normalized === '/' ? '' : normalized}`;
  return languages;
}

export interface SeoSkin {
  id: string;
  name: string;
  weapon: string;
  category: string;
  rarity: string;
  price?: {
    min: number;
    max: number;
    currency: string;
  };
  image: string;
  market_hash_name?: string;
  description?: string;
  collection?: string;
}

// Server-side (generateMetadata / JSON-LD) için ayrı, localStorage'a bağımlı olmayan fetch.
// Backend'e erişilemezse veya yanıt gecikirse sayfayı bozmadan null döner.
export async function getSkinForSeo(skinId: string): Promise<SeoSkin | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/skins/skin/${skinId}`, {
      next: { revalidate: 3600 }
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (error) {
    console.error('getSkinForSeo error:', error);
    return null;
  }
}

export interface SeoSkinListItem {
  id: string;
  weapon: string;
  category: string;
}

// sitemap.ts için tüm skinlerin hafif listesi.
export async function getAllSkinsForSitemap(): Promise<SeoSkinListItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/skins?limit=1000`, {
      next: { revalidate: 3600 }
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (!json.success) return [];
    const list = Array.isArray(json.data) ? json.data : json.data?.skins;
    return Array.isArray(list) ? list : [];
  } catch (error) {
    console.error('getAllSkinsForSitemap error:', error);
    return [];
  }
}

export function buildProductJsonLd(skin: SeoSkin, canonicalPath: string, description?: string) {
  const title = `${skin.weapon} | ${skin.name}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title,
    description: description || skin.description || `${title} - ${skin.rarity} nadirlikte CS2 skin.`,
    image: absoluteUrl(skin.image),
    category: skin.rarity,
    brand: {
      '@type': 'Brand',
      name: 'CS2'
    },
    offers: skin.price
      ? {
          '@type': 'Offer',
          url: absoluteUrl(canonicalPath),
          priceCurrency: skin.price.currency || 'USD',
          price: skin.price.min,
          availability: 'https://schema.org/InStock'
        }
      : undefined
  };
}

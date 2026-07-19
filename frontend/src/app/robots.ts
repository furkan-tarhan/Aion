import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';
import { routing } from '@/i18n/routing';

const privatePaths = ['/profile', '/wallet', '/sell', '/login', '/register', '/forgot-password', '/admin'];

export default function robots(): MetadataRoute.Robots {
  // Her locale için private path'leri disallow et (/tr/login, /en/login, ...)
  const disallow = routing.locales.flatMap(locale =>
    privatePaths.map(path => `/${locale}${path}`)
  );

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow
      }
    ],
    sitemap: `${SITE_URL}/sitemap.xml`
  };
}

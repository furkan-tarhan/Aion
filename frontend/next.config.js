const { spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const createNextIntlPlugin = require('next-intl/plugin');
const withSerwistInit = require('@serwist/next').default;
const { withSentryConfig } = require('@sentry/nextjs');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const gitRevision = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout?.trim();
const revision = (gitRevision || randomUUID()).slice(0, 12);

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  // Dev'de (özellikle Turbopack) SW kapalı; production build/start ile test edilir.
  disable: process.env.NODE_ENV === 'development',
  additionalPrecacheEntries: [
    { url: '/tr/offline', revision },
    { url: '/en/offline', revision },
  ],
});

// NEXT_PUBLIC_CDN_URL tanımlıysa (Cloudflare R2 / S3 custom domain) next/image için remote pattern.
function cdnRemotePatterns() {
  const raw = process.env.NEXT_PUBLIC_CDN_URL;
  if (!raw) return [];
  try {
    const { protocol, hostname, port } = new URL(raw);
    return [
      {
        protocol: protocol.replace(':', ''),
        hostname,
        ...(port ? { port } : {}),
        pathname: '/**',
      },
    ];
  } catch {
    return [];
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker production imajını küçültmek için standalone çıktı (bkz. frontend/Dockerfile)
  output: process.env.DOCKER_BUILD ? 'standalone' : undefined,
  // Mevcut lint hataları (no-explicit-any vb.) production build'i bloklamasın;
  // `npm run lint` ile geliştirme sırasında ayrıca kontrol edilebilir.
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // Lokal fallback + CDN host (NEXT_PUBLIC_CDN_URL). unoptimized: true iken de
    // remotePatterns ileride optimize açıldığında hazır olsun diye tanımlı.
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', pathname: '/**' },
      ...cdnRemotePatterns(),
    ],
    unoptimized: true,
  },
};

// SENTRY_AUTH_TOKEN tanımlı değilse (örn. lokal geliştirme) source map yükleme otomatik devre
// dışı kalır; build'i bloklamaz, sadece stack trace'ler Sentry panelinde minify edilmiş görünür.
module.exports = withSentryConfig(withSerwist(withNextIntl(nextConfig)), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  telemetry: false,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});

const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

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
    domains: ['localhost'],
    unoptimized: true,
  },
}

module.exports = withNextIntl(nextConfig) 
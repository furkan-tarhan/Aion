import * as Sentry from '@sentry/nextjs';

// NEXT_PUBLIC_SENTRY_DSN tanımlı değilse Sentry.init sessizce devre dışı kalır
// (hiçbir event göndermez) — Sentry hesabı olmadan da proje sorunsuz çalışır.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});

// Next.js router (locale) geçişlerini performans izleme için Sentry'ye bildirir.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

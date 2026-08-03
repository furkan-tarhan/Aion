import * as Sentry from '@sentry/nextjs';

// SENTRY_DSN tanımlı değilse Sentry.init sessizce devre dışı kalır (hiçbir event göndermez).
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});

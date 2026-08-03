// Bu dosya index.ts'te İLK import olarak yüklenmeli — Sentry'nin http/express/mongoose gibi
// modülleri otomatik enstrümante edebilmesi için init() diğer tüm importlardan önce çalışmalı.
// Bu yüzden .env yüklemesi de config.ts'in side-effect'ine güvenmeden burada tekrar yapılıyor
// (config.ts henüz import edilmemiş olabilir, dolayısıyla process.env.SENTRY_DSN boş kalabilir).
import dotenv from 'dotenv';
dotenv.config();

import * as Sentry from '@sentry/node';

// SENTRY_DSN tanımlı değilse init() çağrılmaz; SDK sessizce devre dışı kalır (hiçbir event göndermez),
// böylece lokal geliştirmede Sentry hesabı olmadan da proje sorunsuz çalışır.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    // Prod'da event/performans verisi hacmini sınırlamak için düşük örnekleme oranı.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

export { Sentry };

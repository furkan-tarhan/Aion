// Sentry init'in http/express/mongoose enstrümantasyonu için diğer tüm importlardan önce
// çalışması gerekir (bkz. instrument.ts). app.ts de kendi ilk satırında instrument'ı import
// eder — burada da tekrar en başta tutuyoruz ki aşağıdaki `mongoose` import'u instrument'tan
// önce require edilmesin.
import { Sentry } from './instrument';
import mongoose from 'mongoose';
import { config } from './config';
import { logger } from './logger';
import { startSteamBot } from './services/steamBot';
import app from './app';

// MongoDB bağlantısı
mongoose.connect(config.database.uri)
  .then(() => logger.info({ event: 'mongo_connected' }, 'MongoDB bağlantısı başarılı'))
  .catch((err) => logger.error({ event: 'mongo_connection_error', err }, 'MongoDB bağlantı hatası'));

// STEAM_BOT_* env değişkenleri tanımlıysa Steam trade botunu izole bir child process olarak başlatır
// (bkz. services/steamBot.ts). Tanımlı değilse no-op — ilan/satın alma akışları manuel moda düşer.
startSteamBot();

process.on('uncaughtException', (err) => {
  logger.error({ event: 'uncaught_exception', err }, 'Uncaught exception');
  if (process.env.SENTRY_DSN) Sentry.captureException(err);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ event: 'unhandled_rejection', reason }, 'Unhandled promise rejection');
  if (process.env.SENTRY_DSN) Sentry.captureException(reason);
});

// 0.0.0.0: Railway/Docker healthcheck container dışından erişebilsin
app.listen(Number(config.server.port), '0.0.0.0', () => {
  logger.info({ event: 'server_started', port: config.server.port }, `Server ${config.server.port} portunda çalışıyor`);
});

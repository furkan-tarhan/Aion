import Redis from 'ioredis';
import { logger } from '../logger';

// REDIS_URL tanımlı değilse rate limiter'lar otomatik olarak in-memory store'a düşer
// (bkz. index.ts). Bu, Redis'siz tek instance geliştirme ortamlarını kırmadan,
// dağıtık/production ortamlarda Redis'in devreye girmesini sağlar.
export const redisClient = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: false,
    })
  : null;

if (redisClient) {
  redisClient.on('connect', () => logger.info({ event: 'redis_connected' }, 'Redis bağlantısı başarılı'));
  redisClient.on('error', (err) => logger.error({ event: 'redis_error', err }, 'Redis bağlantı hatası'));
}

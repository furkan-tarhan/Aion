import path from 'path';
import pino from 'pino';
import { config } from './config';

const isProd = config.server.nodeEnv === 'production';

// LOG_TO_FILE env değişkeniyle override edilebilir; varsayılan: production'da açık, dev'de kapalı.
const logToFile = process.env.LOG_TO_FILE
  ? process.env.LOG_TO_FILE === 'true'
  : isProd;

const logsDir = path.join(process.cwd(), 'logs');

const targets: pino.TransportTargetOptions[] = [];

if (isProd) {
  // Production: stdout'a düz JSON (Docker/PM2 log toplayıcıları için)
  targets.push({ target: 'pino/file', level: 'info', options: { destination: 1 } });
} else {
  // Development: renkli, okunabilir console çıktısı
  targets.push({
    target: 'pino-pretty',
    level: 'debug',
    options: { colorize: true, translateTime: 'SYS:yyyy-mm-dd HH:MM:ss', ignore: 'pid,hostname' },
  });
}

if (logToFile) {
  targets.push({
    target: 'pino-roll',
    level: 'info',
    options: {
      file: path.join(logsDir, 'app'),
      extension: '.log',
      frequency: 'daily',
      size: '10m',
      mkdir: true,
    },
  });
}

export const logger = pino(
  { level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug') },
  pino.transport({ targets })
);

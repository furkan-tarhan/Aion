import pinoHttp from 'pino-http';
import { logger } from '../logger';

export const requestLogger = pinoHttp({
  logger,
  // Varsayılan pino-http tüm header'ları loglar; disk/terminal gürültüsünü azaltmak için
  // sadece işe yarayan alanları tutuyoruz.
  serializers: {
    req: (req) => ({ method: req.method, url: req.url, remoteAddress: req.remoteAddress }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.currentPassword',
      'req.body.newPassword',
    ],
    censor: '[REDACTED]',
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} -> ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} -> ${res.statusCode} (${err.message})`,
});

// Sentry init'in http/express/mongoose enstrümantasyonu için diğer tüm importlardan önce
// çalışması gerekir (bkz. instrument.ts).
import { Sentry } from './instrument';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import { config } from './config';
import { logger } from './logger';
import { requestLogger } from './middleware/requestLogger';
import { redisClient } from './lib/redis';
import userRoutes from './routes/users';
import skinRoutes from './routes/skins';
import steamRoutes from './routes/steam';
import listingRoutes from './routes/listings';
import favoritesRoutes from './routes/favorites';
import reviewsRoutes from './routes/reviews';
import walletRoutes from './routes/wallet';
import notificationRoutes from './routes/notifications';
import adminRoutes from './routes/admin';
import steamAuthRoutes from './routes/steamAuth';
import session from 'express-session';
import passport from 'passport';
import { startSteamBot } from './services/steamBot';

const app = express();

// Session ayarları (Passport Steam stratejisi için gerekli)
app.use(session({
  secret: config.jwt.secret || 'loopskins_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport serialize/deserialize (sadece pass-through)
passport.serializeUser((user: any, done) => {
  done(null, user);
});
passport.deserializeUser((obj: any, done) => {
  done(null, obj);
});

// Railway/Vercel gibi reverse proxy arkasında doğru client IP + rate-limit için gerekli.
app.set('trust proxy', 1);

app.use(helmet());          // HTTP güvenlik header'ları
app.use(mongoSanitize());   // NoSQL injection koruması
app.use(requestLogger);     // Tüm HTTP isteklerini logla (method, path, status, süre)

// REDIS_URL tanımlıysa dağıtık (multi-instance) rate limiting için Redis store kullanılır,
// yoksa express-rate-limit'in varsayılan in-memory store'una düşer (tek instance geliştirme).
// (redisClient bilinçli olarak yerel bir sabite kopyalanıyor; TypeScript modül importlarını
// closure içinde otomatik daraltmadığı için bu narrowing'i garantiler.)
const client = redisClient;
const makeRedisStore = (prefix: string) =>
  client
    ? new RedisStore({
        prefix,
        sendCommand: (...args: string[]) => client.call(...(args as [string, ...string[]])) as any,
      })
    : undefined;

// Genel rate limiter: 100 istek / 15 dakika
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Çok fazla istek gönderildi, lütfen daha sonra tekrar deneyin.' },
  store: makeRedisStore('rl:general:'),
});

// Auth rate limiter: 10 istek / 15 dakika (brute-force koruması)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Çok fazla giriş denemesi, lütfen 15 dakika sonra tekrar deneyin.' },
  store: makeRedisStore('rl:auth:'),
});

// Health check — Railway liveness için her zaman 200 (process ayakta).
// Rate limiter veya CORS engeline takılmaması için tüm middleware'lerden önce tanımlanır.
app.get('/api/health', (req, res) => {
  const mongoConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    success: true,
    status: mongoConnected ? 'ok' : 'degraded',
    mongo: mongoConnected,
    uptime: process.uptime(),
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'LoopSkins API çalışıyor!' });
});

app.use(cors({ origin: config.cors.origin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // iyzico callback'i form-encoded gönderebilir
app.use(generalLimiter);

// MongoDB bağlantısı
mongoose.connect(config.database.uri)
  .then(() => logger.info({ event: 'mongo_connected' }, 'MongoDB bağlantısı başarılı'))
  .catch((err) => logger.error({ event: 'mongo_connection_error', err }, 'MongoDB bağlantı hatası'));

// STEAM_BOT_* env değişkenleri tanımlıysa Steam trade botunu izole bir child process olarak başlatır
// (bkz. services/steamBot.ts). Tanımlı değilse no-op — ilan/satın alma akışları manuel moda düşer.
startSteamBot();

// Routes
app.use('/api/users/login', authLimiter);
app.use('/api/users', userRoutes);
app.use('/api/skins', skinRoutes);
app.use('/api/steam', steamRoutes);
app.use('/api/auth/steam', steamAuthRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint bulunamadı' });
});

// SENTRY_DSN tanımlıysa: rota handler'larında fırlatılan hataları Sentry'ye gönderir, ardından
// next(err) ile aşağıdaki logger tabanlı error handler'a devam eder (bkz. instrument.ts).
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// Global error handler — beklenmeyen hataları logla, istemciye 500 dön
// (Express, 4 parametreli middleware'leri otomatik olarak error handler sayar)
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ event: 'unhandled_error', err, path: req.path, method: req.method }, 'Yakalanmamış hata');
  res.status(500).json({ success: false, message: 'Sunucu hatası oluştu' });
});

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

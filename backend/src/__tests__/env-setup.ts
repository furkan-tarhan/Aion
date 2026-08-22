// Jest `setupFiles` — herhangi bir modül (app.ts, instrument.ts, config.ts) import edilmeden
// ÖNCE çalışır. instrument.ts kendi başına dotenv.config() çağırıyor ve gerçek backend/.env
// dosyasını okuyor; dotenv varsayılan olarak process.env'de zaten TANIMLI olan (boş string dahil)
// değerleri EZMEZ. Bu yüzden burada testler için deterministik/izole değerleri önceden set ederek
// gerçek .env'deki secret'ların (Mongo URI, Sentry DSN, Cryptomus key'leri vb.) test sürecine
// sızmasını ve testlerin makineden makineye farklı davranmasını engelliyoruz.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.BACKEND_URL = 'http://localhost:5000';
process.env.SENTRY_DSN = '';
process.env.ADMIN_EMAILS = '';
process.env.REDIS_URL = '';
process.env.CRYPTOMUS_MERCHANT_ID = '';
process.env.CRYPTOMUS_PAYMENT_API_KEY = '';
process.env.STEAM_BOT_USERNAME = '';
process.env.STEAM_BOT_PASSWORD = '';
process.env.STEAM_BOT_SHARED_SECRET = '';
process.env.STEAM_BOT_IDENTITY_SECRET = '';

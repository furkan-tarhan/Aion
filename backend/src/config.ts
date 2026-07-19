import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Steam API Configuration
  steam: {
    apiKey: process.env.STEAM_API_KEY || '',
    baseUrl: 'https://api.steampowered.com',
    marketUrl: 'https://steamcommunity.com/market',
  },

  // Database Configuration
  database: {
    uri: process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/bynogame',
  },

  // Server Configuration
  server: {
    port: process.env.PORT || 3002,
    nodeEnv: process.env.NODE_ENV || 'development',
    backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  },

  // Frontend URL (redirect'ler için)
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Bu email'lerle register/login olan kullanıcılar otomatik admin rolü alır
  adminEmails: (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean),

  // iyzico Ödeme Sağlayıcı Konfigürasyonu (sandbox/test modu)
  iyzico: {
    apiKey: process.env.IYZICO_API_KEY || '',
    secretKey: process.env.IYZICO_SECRET_KEY || '',
    baseUrl: process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com',
  }
}; 
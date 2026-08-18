import path from 'path';
import swaggerJSDoc from 'swagger-jsdoc';
import { config } from './config';

// ts-node ile dev'de .ts, derlenmiş prod'da .js dosyaları taranır — swagger-jsdoc
// sadece dosyaları metin olarak okuyup JSDoc yorum bloklarını ayrıştırır (çalıştırmaz),
// bu yüzden her iki uzantı da güvenle glob pattern'e eklenebilir.
// Not: swagger-jsdoc glob pattern'lerinde "/" bekler; Windows'ta path.join "\\" ürettiği için
// glob hiçbir dosyayla eşleşmez ve spec boş kalır — bu yüzden ayraçlar "/" ile normalize edilir.
const routesDir = path.join(__dirname, 'routes').split(path.sep).join('/');

const definition: swaggerJSDoc.OAS3Definition = {
  openapi: '3.0.0',
  info: {
    title: 'LoopSkins API',
    version: '1.0.0',
    description:
      'CS2 dijital ürün pazarı (skin alım/satım, cüzdan, bildirim, admin paneli) için REST API dokümantasyonu.',
  },
  servers: [
    { url: `${config.server.backendUrl}/api`, description: 'Backend' },
    { url: '/api', description: 'Nginx reverse proxy üzerinden (relative)' },
  ],
  tags: [
    { name: 'Auth', description: 'Kayıt, giriş, email doğrulama, şifre sıfırlama' },
    { name: 'Skins', description: 'CS2 skin verileri ve arama' },
    { name: 'Listings', description: 'İlan oluşturma, listeleme, satın alma' },
    { name: 'Wallet', description: 'Cüzdan bakiyesi, para yatırma/çekme, işlem geçmişi' },
    { name: 'Notifications', description: 'Kullanıcı bildirimleri' },
    { name: 'Favorites', description: 'Favori skinler' },
    { name: 'Reviews', description: 'Alıcı/satıcı değerlendirmeleri' },
    { name: 'Steam', description: 'Steam profil/envanter entegrasyonu' },
    { name: 'Admin', description: 'Admin paneli: istatistikler, kullanıcı/ilan yönetimi' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Login sonrası dönen JWT — `Authorization: Bearer <token>` header ile gönderilir.',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Bir hata oluştu' },
        },
      },
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          username: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['user', 'admin'] },
          balance: { type: 'number' },
          isBanned: { type: 'boolean' },
          isEmailVerified: { type: 'boolean' },
          steamId: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Skin: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          skinId: { type: 'string' },
          name: { type: 'string' },
          weapon: { type: 'string' },
          category: { type: 'string' },
          rarity: {
            type: 'string',
            enum: ['Consumer', 'Industrial', 'Mil-Spec', 'Restricted', 'Classified', 'Covert', 'Contraband'],
          },
          price: {
            type: 'object',
            properties: {
              min: { type: 'number' },
              max: { type: 'number' },
              currency: { type: 'string' },
            },
          },
          image: { type: 'string' },
        },
      },
      Listing: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          seller: { type: 'string', description: 'User ID (populate edilmişse obje)' },
          skin: { type: 'string', description: 'Skin ID (populate edilmişse obje)' },
          skinId: { type: 'string' },
          weapon: { type: 'string' },
          rarity: { type: 'string' },
          title: { type: 'string' },
          price: { type: 'number' },
          currency: { type: 'string' },
          steamTradeUrl: { type: 'string' },
          status: { type: 'string', enum: ['active', 'sold', 'cancelled'] },
          wear: {
            type: 'string',
            enum: ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'],
          },
          floatValue: { type: 'number' },
          isStatTrak: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Transaction: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          user: { type: 'string' },
          type: { type: 'string', enum: ['deposit', 'withdrawal', 'purchase', 'sale'] },
          amount: { type: 'number' },
          status: { type: 'string', enum: ['pending', 'completed', 'failed'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          user: { type: 'string' },
          type: { type: 'string' },
          title: { type: 'string' },
          message: { type: 'string' },
          isRead: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Review: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          reviewer: { type: 'string' },
          reviewee: { type: 'string' },
          listing: { type: 'string', nullable: true },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          comment: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          pages: { type: 'integer' },
          total: { type: 'integer' },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Token eksik veya geçersiz',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Forbidden: {
        description: 'Yetki yetersiz (admin gerekli / banlı kullanıcı)',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      NotFound: {
        description: 'Kayıt bulunamadı',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      ServerError: {
        description: 'Sunucu hatası',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

// path.join KULLANILMAZ: native (Windows'ta "\\") ayraç üretir ve routesDir'in
// yukarıda normalize edilen "/" ayraçlarını tekrar bozar.
export const swaggerSpec = swaggerJSDoc({
  definition,
  apis: [`${routesDir}/*.ts`, `${routesDir}/*.js`],
});

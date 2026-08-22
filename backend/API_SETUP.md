# API Dokümantasyonu

## Kurulum

### Steam API Key Alma

1. https://steamcommunity.com/dev/apikey adresine gidin
2. Steam hesabınızla giriş yapın
3. Domain: `localhost` (geliştirme) veya `yourdomain.com` (canlı)
4. API key'i `backend/.env` dosyasına ekleyin

### Environment Değişkenleri

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/L3X4
JWT_SECRET=<rastgele-güçlü-anahtar>
EMAIL_USER=your@gmail.com
EMAIL_PASS=<gmail-app-password>
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
STEAM_API_KEY=<steam-api-key>
CRYPTOMUS_MERCHANT_ID=<cryptomus-merchant-id>
CRYPTOMUS_PAYMENT_API_KEY=<cryptomus-payment-api-key>
CRYPTOMUS_BASE_URL=https://api.cryptomus.com/v1
```

### Cryptomus Hesap Kurulumu

1. https://app.cryptomus.com adresinden ücretsiz bir merchant hesabı oluşturun (KYC gerekebilir)
2. Panelde bir **mağaza (store)** oluşturun; **Merchant ID**'yi panelin ana sayfasından/ayarlarından kopyalayın
3. **API → Payment API Key**'i alın (payout/withdraw API key'i ayrı bir anahtardır, şu an kullanılmıyor — bkz. `docs/PROJECT_STATUS.md`)
4. Bu değerleri `backend/.env` dosyasındaki `CRYPTOMUS_MERCHANT_ID` / `CRYPTOMUS_PAYMENT_API_KEY` alanlarına yazın
5. Cryptomus'un kendi test/sandbox modu yoktur — küçük tutarlı gerçek bir kripto ödemesiyle test etmeniz gerekir (örn. minimum tutara yakın bir USDT ödemesi)

> **Not:** Cryptomus'ta ödeme onayı `url_callback`'e (bizde `POST /api/wallet/deposit/webhook`) sunucudan sunucuya gönderilen bir webhook ile gelir — kullanıcının tarayıcısı sadece `url_return`'e (`/wallet?deposit=pending`) yönlendirilir, bakiye orada artmaz. Lokal geliştirmede webhook'un backend'inize ulaşabilmesi için `BACKEND_URL`'in dışarıdan erişilebilir olması gerekir (örn. `ngrok http 5000` ile bir tünel açıp `BACKEND_URL`'i tünel adresine ayarlayın).

---

## API Endpoint'leri

### Auth & Kullanıcı (`/api/users`)

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| `POST` | `/api/users` | ❌ | Kayıt ol (username, email, password) |
| `POST` | `/api/users/login` | ❌ | Giriş yap → JWT token |
| `GET` | `/api/users` | ✅ | Tüm kullanıcılar |
| `PUT` | `/api/users/:id` | ✅ | Kullanıcı güncelle (şifre hashlenır) |
| `DELETE` | `/api/users/:id` | ✅ | Kullanıcı sil |
| `PUT` | `/api/users/profile` | ✅ | Profil güncelle |
| `POST` | `/api/users/forgot-password` | ❌ | Şifre sıfırlama emaili |
| `POST` | `/api/users/reset-password/:token` | ❌ | Yeni şifre belirle |
| `POST` | `/api/users/send-verification-email` | ✅ | Email doğrulama gönder |
| `POST` | `/api/users/verify-email/:token` | ❌ | Email doğrula |

**Input Validation:**
- Username: 3-30 karakter
- Email: geçerli format (regex)
- Password: min 6 karakter
- Register: duplicate email/username kontrolü (409)
- PUT: sadece kendi hesabını güncelleyebilir

### Skin API (`/api/skins`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/api/skins/weapon/:weapon` | Silaha göre skinler |
| `GET` | `/api/skins/skin/:skinId` | Skin detayı |
| `GET` | `/api/skins/categories` | Tüm kategoriler |
| `GET` | `/api/skins/popular` | Popüler skinler |
| `GET` | `/api/skins/search?q=...` | Skin arama (min 2 karakter) |
| `GET` | `/api/skins/skin-price/:marketHashName` | Steam Market fiyatı |

### Steam API (`/api/steam`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/api/steam/profile/:steamId` | Steam profili |
| `GET` | `/api/steam/inventory/:steamId` | CS2 envanteri |
| `GET` | `/api/steam/inventory/:steamId/prices` | Envanter + fiyatlar |
| `GET` | `/api/steam/inventory/:steamId/value` | Toplam envanter değeri |
| `GET` | `/api/steam/inventory/:steamId/expensive` | En pahalı skinler |
| `GET` | `/api/steam/inventory/:steamId/stats` | Envanter istatistikleri |
| `GET` | `/api/steam/price/:marketHashName` | Tek skin fiyatı |

### Cüzdan / Bakiye API (`/api/wallet`)

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| `GET` | `/api/wallet` | ✅ | Bakiye + son 10 işlem |
| `GET` | `/api/wallet/transactions` | ✅ | Sayfalanmış işlem geçmişi |
| `POST` | `/api/wallet/deposit` | ✅ | Cryptomus ödeme sayfası (invoice) oluşturur, `paymentPageUrl` döner |
| `POST` | `/api/wallet/deposit/webhook` | ❌ | Cryptomus'un sunucudan sunucuya gönderdiği ödeme onayı (dahili kullanım, imza doğrulanır) |
| `POST` | `/api/wallet/withdraw` | ✅ | Kripto çekme talebi oluşturur (bakiye anında düşülür, coin transferi manuel işlenir) |

**Deposit body:** `{ amount }` — USD cinsinden tutar; kullanıcı hangi kripto para/ağla ödeyeceğini Cryptomus'un ödeme sayfasında seçer.

**Withdraw body:** `{ amount, walletAddress, network }` — `network`: `USDT_TRC20` | `USDT_BEP20` | `USDT_ERC20` | `BTC` | `ETH` | `TON`

### İlan Satın Alma (`/api/listings/:id/buy`)

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| `POST` | `/api/listings/:id/buy` | ✅ | Cüzdan bakiyesinden ilanı satın alır; alıcı/satıcı bakiyeleri güncellenir, ilan `sold` olur |

---

## Rate Limiting

| Kapsam | Limit | Açıklama |
|--------|-------|----------|
| Genel | 100 istek / 15 dk | Tüm endpoint'ler |
| Auth | 10 istek / 15 dk | `/api/users/login` |

---

## Güvenlik

- ✅ JWT token doğrulama (Bearer header)
- ✅ bcrypt ile şifre hashleme (salt: 10)
- ✅ Rate limiting (brute-force koruması)
- ✅ CORS kısıtlaması (`config.cors.origin`)
- ✅ Input validation (email, şifre, username)
- ✅ Password response'larda gizleniyor (`.select('-password')`)
- ⚠️ `.env` dosyası `.gitignore`'da — API key'leri repo'ya commit etmeyin
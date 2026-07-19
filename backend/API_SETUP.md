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
IYZICO_API_KEY=<iyzico-sandbox-api-key>
IYZICO_SECRET_KEY=<iyzico-sandbox-secret-key>
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
```

### iyzico Sandbox (Test) Hesabı Kurulumu

1. https://sandbox-merchant.iyzipay.com adresinden ücretsiz bir sandbox/test hesabı oluşturun
2. Panelde **Ayarlar → API Entegrasyonu** bölümünden sandbox `API Key` ve `Secret Key` değerlerini alın
3. Bu değerleri `backend/.env` dosyasındaki `IYZICO_API_KEY` / `IYZICO_SECRET_KEY` alanlarına yazın
4. Canlıya geçerken `IYZICO_BASE_URL`'i `https://api.iyzipay.com` yapıp gerçek (production) key'leri kullanmanız gerekir
5. Test ödemesi yaparken aşağıdaki sandbox test kartlarından birini kullanabilirsiniz (gerçek para çekilmez):

| Kart Numarası | Banka | Tip |
|---|---|---|
| 5528790000000008 | Halkbank | Master Card (Kredi) |
| 4059030000000009 | HSBC Bank | Visa (Banka) |
| 4111111111111129 | — | Yetersiz bakiye hatası (test) |

> Son kullanma tarihi ve CVC için ileri bir tarih ve herhangi bir 3 haneli sayı kullanabilirsiniz (örn. 12/2030, CVC: 123).

> **Not:** iyzico callback akışında kullanıcının kendi tarayıcısı `callbackUrl`'e yönlendirilir (sunucudan sunucuya çağrı değildir). Bu nedenle lokal geliştirmede `BACKEND_URL=http://localhost:5000` ile test edebilirsiniz, ngrok/tünel gerekmez.

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
| `POST` | `/api/wallet/deposit` | ✅ | iyzico Checkout Form oturumu başlatır, `paymentPageUrl` döner |
| `POST` | `/api/wallet/deposit/callback` | ❌ | iyzico ödeme sonrası kullanıcı tarayıcısını buraya yönlendirir (dahili kullanım) |
| `POST` | `/api/wallet/withdraw` | ✅ | Para çekme talebi oluşturur (bakiye anında düşülür, transfer manuel işlenir) |

**Deposit body:** `{ amount, name, surname, identityNumber, phone, address, city }` — iyzico'nun zorunlu alıcı bilgisi alanları.

**Withdraw body:** `{ amount, iban }`

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
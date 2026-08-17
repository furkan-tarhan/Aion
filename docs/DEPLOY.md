# Production Deploy Rehberi

Hedef mimari:

| Katman | Servis | Neden |
|--------|--------|--------|
| Frontend | **Vercel** | Next.js için en doğal hosting, HTTPS otomatik |
| Backend | **Railway** | Node/Express + healthcheck kolay, tek instance için yeterli |
| Veritabanı | **MongoDB Atlas** (ücretsiz M0) | Lokal `localhost` URI cloud'da çalışmaz |

Bu rehber hesap oluşturma + env bağlama adımlarını içerir. Deploy config dosyaları repoda hazır:

- `backend/railway.toml`
- `frontend/vercel.json`

---

## 0) Önkoşul: GitHub

Kod `main` branch'te GitHub'da olmalı (Vercel ve Railway GitHub ile bağlanır).

---

## 1) MongoDB Atlas (zorunlu)

Lokal `mongodb://localhost:27017/...` production'da **kullanılamaz**. Atlas ücretsiz cluster kur:

1. [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) → ücretsiz hesap.
2. **Build a Database** → **M0 Free** → bölge olarak mümkünse Avrupa (örn. Frankfurt / `eu-central-1`).
3. Database User oluştur (kullanıcı adı + güçlü şifre; şifreyi not al).
4. **Network Access** → **Add IP Address** → başlangıç için `0.0.0.0/0` (Allow from anywhere).  
   > İleride sadece Railway outbound IP'lerine kısıtlanabilir.
5. **Database** → **Connect** → **Drivers** → connection string'i kopyala:  
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/L3X4?retryWrites=true&w=majority`  
   - `<password>` yerine gerçek şifreyi yaz (özel karakterler URL-encode edilmeli).  
   - Database adı olarak `L3X4` (veya istediğin isim) kullan.

Seed (ilk veri) için Atlas URI ile lokalden:

```bash
cd backend
# .env içinde MONGODB_URI=mongodb+srv://...
npm run seed
npm run seed:price-history
```

---

## 2) Railway — Backend

1. [railway.app](https://railway.app) → GitHub ile giriş.
2. **New Project** → **Deploy from GitHub repo** → bu repo'yu seç.
3. Servis ayarları:
   - **Root Directory:** `backend`
   - Build/Start: `railway.toml` otomatik kullanılır (`npm run build` → `npm start`)
4. **Settings → Networking → Generate Domain** → örn. `https://loopskins-api-production.up.railway.app`  
   Bu adresi not et (**BACKEND_URL**).
5. **Variables** sekmesine şunları ekle (değerleri kendin doldur):

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/L3X4?retryWrites=true&w=majority
JWT_SECRET=<güçlü-rastgele-secret>
FRONTEND_URL=https://SENIN-VERCEL-DOMAIN.vercel.app
BACKEND_URL=https://SENIN-RAILWAY-DOMAIN.up.railway.app
CORS_ORIGIN=https://SENIN-VERCEL-DOMAIN.vercel.app
ADMIN_EMAILS=senin@email.com
EMAIL_USER=
EMAIL_PASS=
STEAM_API_KEY=
IYZICO_API_KEY=
IYZICO_SECRET_KEY=
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
LOG_TO_FILE=false
LOG_LEVEL=info
# Opsiyonel:
# REDIS_URL=
# SENTRY_DSN=
# VAPID_PUBLIC_KEY=
# VAPID_PRIVATE_KEY=
# VAPID_SUBJECT=mailto:senin@email.com
```

> Vercel domain'ini henüz bilmiyorsan önce Railway'i deploy et, sonra Vercel sonrası `FRONTEND_URL` / `CORS_ORIGIN` değerlerini güncelle (redeploy tetiklenir).

6. Health kontrolü: tarayıcıda  
   `https://SENIN-RAILWAY-DOMAIN.up.railway.app/api/health`  
   → `{"success":true,"status":"ok","mongo":true,...}` görmelisin.

---

## 3) Vercel — Frontend

1. [vercel.com](https://vercel.com) → GitHub ile giriş.
2. **Add New Project** → aynı repo.
3. Ayarlar:
   - **Root Directory:** `frontend`
   - Framework: Next.js (otomatik)
4. **Environment Variables:**

```env
NEXT_PUBLIC_API_URL=https://SENIN-RAILWAY-DOMAIN.up.railway.app
API_INTERNAL_URL=https://SENIN-RAILWAY-DOMAIN.up.railway.app
NEXT_PUBLIC_SITE_URL=https://SENIN-VERCEL-DOMAIN.vercel.app
# Opsiyonel Sentry:
# NEXT_PUBLIC_SENTRY_DSN=
# SENTRY_DSN=
```

> `NEXT_PUBLIC_*` değişkenleri **build** anında gömülür; değiştirdikten sonra Redeploy gerekir.

5. Deploy bitince Vercel size `*.vercel.app` URL verir.
6. Railway Variables'a dön:
   - `FRONTEND_URL` = Vercel URL
   - `CORS_ORIGIN` = Vercel URL  
   (Preview deploy'lar için: `https://app.vercel.app,https://app-git-main-xxx.vercel.app`)

---

## 4) Doğrulama checklist

- [ ] `GET /api/health` → mongo: true  
- [ ] Vercel sitede `/tr` açılıyor  
- [ ] Login / register çalışıyor (Network'te API çağrıları Railway'e gidiyor)  
- [ ] Admin email ile giriş → `/tr/admin`  
- [ ] (Opsiyonel) PWA: production URL'de "Uygulamayı yükle"

---

## 5) Sık sorunlar

| Belirti | Muhtemel neden | Çözüm |
|---------|----------------|--------|
| CORS hatası | `CORS_ORIGIN` yanlış | Vercel origin'ini tam `https://...` olarak ekle |
| API 503 / mongo false | Atlas IP / şifre | Network Access + connection string şifresi |
| Frontend eski API URL | `NEXT_PUBLIC_*` cache | Vercel'de Redeploy |
| Rate limit garip | proxy IP | Backend'de `trust proxy` zaten açık |
| Seed boş market | Atlas'a seed atılmadı | Lokalden Atlas URI ile `npm run seed` |

---

## 6) Sonraki adımlar (roadmap)

- **Domain + SSL:** Vercel + Railway custom domain (HTTPS otomatik)
- **CDN:** Skin görselleri için Cloudflare / object storage
- **CD:** GitHub Actions → Railway/Vercel otomatik deploy (şu an Git push ile platformların kendi deploy'u yeterli)

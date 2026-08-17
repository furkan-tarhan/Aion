# LoopSkins — CS2 Dijital Ürün Pazarı

[![CI](https://github.com/L3x4-4/Bynogame/actions/workflows/ci.yml/badge.svg)](https://github.com/L3x4-4/Bynogame/actions/workflows/ci.yml)

CS2 skinlerini güvenle alıp satabileceğiniz modern bir marketplace uygulaması.

> **AI / geliştirici handoff:** Ne yapıldı, ne eksik, ne WIP → [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) (projeyi taramadan buradan başla).

## Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| **Frontend** | Next.js 15, React 19, TailwindCSS |
| **Backend** | Express.js, TypeScript |
| **Veritabanı** | MongoDB + Mongoose |
| **Auth** | JWT (jsonwebtoken) + bcrypt |
| **API** | Steam Web API, Steam Market |

## Kurulum

### 1. Bağımlılıkları Yükle

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Environment Değişkenlerini Ayarla

`backend/.env` dosyasını düzenle:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/L3X4
JWT_SECRET=<rastgele-guclu-bir-anahtar>
EMAIL_USER=your@gmail.com
EMAIL_PASS=<gmail-app-password>
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
STEAM_API_KEY=<steam-api-key>
IYZICO_API_KEY=<iyzico-sandbox-api-key>
IYZICO_SECRET_KEY=<iyzico-sandbox-secret-key>
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
ADMIN_EMAILS=admin@ornek.com

# Opsiyonel — tanımlı değilse Steam trade botu devre dışı kalır, ilan/satın alma manuel akışa düşer
STEAM_BOT_USERNAME=
STEAM_BOT_PASSWORD=
STEAM_BOT_SHARED_SECRET=
STEAM_BOT_IDENTITY_SECRET=
```

> **Not:** `ADMIN_EMAILS` içinde virgülle ayrılmış email adresleriyle register/login olan kullanıcılar otomatik olarak admin rolü alır ve `/admin` panelini görebilir.

> **Not:** `STEAM_BOT_*` dördü de doldurulursa marketplace, satıcının item'ını otomatik emanete alıp satın alma sonrası alıcıya otomatik teslim eden bir Steam bot çalıştırır (bkz. `backend/.env.example`'daki detaylı açıklama ve `docs/PROJECT_STATUS.md`). Bu, marketplace'e ait ayrı bir Steam hesabı ve o hesapta etkin Steam Guard Mobile Authenticator gerektirir — kişisel hesabınla kullanma.

> **Not:** `JWT_SECRET` için `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` kullanabilirsin.
> **Not:** iyzico sandbox API bilgilerini almak için `backend/API_SETUP.md` içindeki "iyzico Sandbox Kurulumu" bölümüne bakabilirsin. Para çekme talepleri şu an otomatik değil — bakiye anında düşülür ama transfer manuel/banka tarafında yapılması beklenir.

Production'a deploy ederken `frontend`'de `NEXT_PUBLIC_SITE_URL` ortam değişkenini gerçek domain'e ayarla (örn. `https://loopskins.com`) — `sitemap.xml`, `robots.txt` ve Open Graph URL'leri bu değeri kullanır. Ayarlanmazsa `http://localhost:3000`'e düşer.

### 3. Çalıştır

```bash
# Backend (port 5000)
cd backend
npm run dev

# Frontend (port 3000)
cd frontend
npm run dev
```

## Docker ile Çalıştırma

Backend, frontend, MongoDB ve Redis'i Docker Compose ile tek komutla ayağa kaldırabilirsin. Her iki ortamda da bir **Nginx** reverse proxy tüm trafiği tek bir port üzerinden yönetir (`/api/*` → backend, diğer her şey → frontend).

### Gereksinimler

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) kurulu ve çalışıyor olmalı.

### 1. Environment dosyalarını hazırla

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

`backend/.env` içindeki secret'ları (JWT_SECRET, EMAIL_*, STEAM_API_KEY, IYZICO_*, ADMIN_EMAILS) doldur. `frontend/.env` dosyasındaki değerler Docker ortamında `docker-compose*.yml` tarafından otomatik override edilir, boş bırakılabilir.

### 2. Geliştirme ortamı (hot-reload)

```bash
docker compose up --build
```

- Uygulama: http://localhost:8080 (Nginx üzerinden — frontend + `/api`)
- Frontend direkt: http://localhost:3000
- Backend direkt: http://localhost:5000
- MongoDB: `localhost:27017`
- Redis: `localhost:6379` (dağıtık rate limiting store — `REDIS_URL` container'larda otomatik ayarlanır)

Kaynak kod (`backend/src`, `frontend/src`) host'tan container'a mount edilir; değişiklikler anında yansır (frontend Turbopack HMR, backend değişikliği için container'ı yeniden başlatman gerekir çünkü `ts-node` watch modunda çalışmıyor).

İlk çalıştırmada veritabanı boş olur, örnek skin verilerini yüklemek için:

```bash
docker compose exec backend npm run seed
```

### 3. Production ortamı (optimize build)

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

- Uygulama: http://localhost (Nginx, port 80 — `NGINX_PORT` ile değiştirilebilir)
- Backend/MongoDB dışarıya açık değildir, sadece Nginx üzerinden erişilir (güvenlik)
- Backend derlenmiş JS (`tsc` çıktısı) ile, frontend Next.js `standalone` build ile minimal image olarak çalışır

Gerçek bir domain'e deploy ederken frontend build'ine `NEXT_PUBLIC_SITE_URL` build-arg'ını gerçek domain ile geçir (`docker-compose.prod.yml` → `frontend.build.args`), aksi halde `sitemap.xml`/Open Graph URL'leri `http://localhost` kullanır.

> **Not:** `sitemap.xml` skin URL'leri build anında backend'e erişilemediği için (image build sırasında container'lar henüz ayakta değil) ilk build'de boş gelir; ISR (`revalidate: 3600`) sayesinde deploy sonrası ilk saat içinde arka planda otomatik güncellenir.

### Loglama

Backend, [Pino](https://getpino.io/) ile yapılandırılmış (structured) loglama kullanır:

- **Development:** Konsola renkli, okunabilir formatta (`pino-pretty`), `debug` seviyesinde.
- **Production:** Konsola düz JSON (`info` seviyesinde) + `backend/logs/app-*.log` dosyasına günlük rotasyonlu (`pino-roll`, 10MB veya gün değişiminde döner). Docker'da bu klasör `backend_logs` volume'una yazılır, container silinse de loglar kalır.
- **Kapsam:** Tüm HTTP istekleri (`pino-http`, hassas header/body alanları redakte edilir), yakalanmamış hata/exception'lar, ve önemli olaylar (login/register, ban/rol değişikliği, para yatırma/çekme, satın alma, ilan kaldırma) `event` alanıyla etiketlenmiş halde loglanır.
- `LOG_LEVEL` (`trace|debug|info|warn|error|fatal`) ve `LOG_TO_FILE` (`true`/`false`) ile davranış override edilebilir (bkz. `backend/.env.example`).

```bash
docker compose logs -f backend       # canlı log takibi (dev/prod)
docker compose exec backend tail -f logs/app.log   # prod'da dosyaya yazılan logu takip et
```

### Rate Limiting

`express-rate-limit`, `REDIS_URL` tanımlıysa (Docker Compose'da otomatik) Redis store kullanır; bu sayede birden fazla backend instance'ı rate limit sayaçlarını paylaşır (dağıtık ortam için gereklidir). `REDIS_URL` tanımlı değilse (örn. Redis'siz lokal geliştirme) otomatik olarak in-memory store'a düşer, herhangi bir hata vermez.

### Monitoring

- **Hata takibi ([Sentry](https://sentry.io)):** Backend (`@sentry/node`) ve frontend (`@sentry/nextjs`) için ayrı ayrı entegre edilmiştir. `SENTRY_DSN` (backend + frontend server/edge) ve `NEXT_PUBLIC_SENTRY_DSN` (frontend client) tanımlı değilse Sentry sessizce devre dışı kalır — hesap açmadan da proje sorunsuz çalışır (bkz. `.env.example` dosyaları).
  - Backend: `backend/src/instrument.ts` (index.ts'te ilk import), yakalanmamış hata/exception'lar ve Express route hataları otomatik gönderilir.
  - Frontend: `frontend/src/instrumentation.ts` + `instrumentation-client.ts` + `sentry.server.config.ts` + `sentry.edge.config.ts` (SSR, client, middleware hatalarını kapsar).
  - Source map yükleme (okunabilir stack trace) opsiyoneldir; `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN` tanımlı değilse build'i bloklamadan otomatik atlanır.
- **Uptime monitoring:** `GET /api/health` — MongoDB bağlantı durumunu ve process uptime'ını döner (`{"success":true,"status":"ok","mongo":true,"uptime":123.45}`, bağlantı yoksa `503`). UptimeRobot/Better Stack gibi bir servisle bu endpoint periyodik olarak izlenebilir.

### Durdurma / temizleme

```bash
docker compose down            # dev ortamı durdur (mongo_data volume kalır)
docker compose down -v         # + veritabanı volume'unu da sil
```

## CI/CD

`.github/workflows/ci.yml`, her pull request'te ve `main` branch'ine her push'ta backend ve frontend'i ayrı işler (job) olarak doğrular:

- **Backend:** `npm install` → `tsc --noEmit` (typecheck) → `npm run build`
- **Frontend:** `npm install` → `next lint` (sadece raporlar, pipeline'ı kırmaz — bkz. not) → `tsc --noEmit` → `npm run build`

> **Not:** Projede önceden var olan çok sayıda `no-explicit-any` lint uyarısı var (bkz. `frontend/next.config.js` → `eslint.ignoreDuringBuilds: true`); bu tutarlılıkla CI'daki lint adımı da sonucu raporlar ama pipeline'ı başarısız yapmaz.

Pipeline şu an CI (build doğrulaması + E2E) yapıyor. Production hosting Vercel + Railway + Atlas ile yapılandırıldı; adım adım kurulum için [docs/DEPLOY.md](docs/DEPLOY.md) bak. GitHub'a push sonrası platformların kendi Git deploy'u yeterlidir; ayrı CD job'u opsiyonel.

## Production Deploy

| Katman | Servis | Repo config |
|--------|--------|-------------|
| Frontend | Vercel | `frontend/vercel.json` (Root Directory: `frontend`) |
| Backend | Railway | `backend/railway.toml` (Root Directory: `backend`) |
| DB | MongoDB Atlas (M0) | `MONGODB_URI=mongodb+srv://...` |

Lokal `mongodb://localhost:...` cloud'da çalışmaz — Atlas zorunlu. Detaylı checklist, env listesi ve sorun giderme: **[docs/DEPLOY.md](docs/DEPLOY.md)**.

### CDN (skin görselleri)

`NEXT_PUBLIC_CDN_URL` (örn. Cloudflare R2 custom domain) tanımlıysa `/images/...` path'leri CDN'e gider; boşsa `public/` kullanılır. Yükleme: `cd frontend && npm run sync:cdn` — rehber: **[docs/CDN.md](docs/CDN.md)**.

### E2E Testler (Playwright)

Frontend'de Playwright ile core smoke/auth akışları test edilir (`frontend/e2e/`). API çağrıları `page.route` ile mock'lanır — gerçek backend/MongoDB gerekmez.

```bash
cd frontend
npm run test:e2e        # headless
npm run test:e2e:ui     # Playwright UI mode
```

Kapsam: ana sayfa, login/register formları, market açılışı, korumalı profil/sat sayfaları (giriş zorunluluğu + mock JWT ile giriş sonrası görünüm). CI'da `e2e` job'u frontend build'inden sonra Chromium ile çalışır.

### PWA (Progressive Web App)

- **Kurulum / offline:** Production build'de Serwist service worker (`/sw.js`) üretilir; App Manifest (`/manifest.webmanifest`) ve ikonlar ile "Ana ekrana ekle" desteklenir. Ağ yokken document istekleri `/tr/offline` (veya `/en/offline`) fallback'ine düşer.
- **Web Push:** Backend'de `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` tanımlıysa kullanıcı abone olabilir (`PushPrompt` banner'ı). `createNotification` çağrıları aynı anda tarayıcı push gönderir. Anahtar üretmek: `cd backend && npx web-push generate-vapid-keys`
- **Not:** Service worker development (`next dev` / Turbopack) ortamında kapalıdır; PWA'yı denemek için `npm run build && npm run start` kullan.

## Proje Yapısı

```
LoopSkins/
├── backend/
│   ├── src/
│   │   ├── config.ts          # Merkezi konfigürasyon
│   │   ├── index.ts           # Express app + rate limiting
│   │   ├── logger.ts          # Pino logger (console + günlük rotasyonlu dosya)
│   │   ├── swagger.ts         # OpenAPI spec (swagger-jsdoc, route dosyalarındaki @swagger yorumlarından üretilir)
│   │   ├── lib/redis.ts       # Redis client (REDIS_URL yoksa null → in-memory fallback)
│   │   ├── middleware/requestLogger.ts # pino-http HTTP istek loglama
│   │   ├── models/User.ts     # Mongoose User modeli (balance dahil)
│   │   ├── models/Transaction.ts # Cüzdan işlem kayıtları (deposit/withdrawal/purchase/sale)
│   │   ├── services/iyzico.ts # iyzico Checkout Form entegrasyonu
│   │   └── routes/
│   │       ├── users.ts       # Auth + CRUD + email doğrulama
│   │       ├── skins.ts       # Skin verileri + arama
│   │       ├── wallet.ts      # Bakiye, para yatırma/çekme, işlem geçmişi
│   │       ├── notifications.ts # Bildirim listesi, okunmamış sayacı, okundu işaretleme
│   │       ├── admin.ts       # Admin: stats, kullanıcı ban/rol, ilan moderasyonu
│   │       └── steam.ts       # Steam profil/envanter
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx       # Ana sayfa
│   │   │   ├── login/         # Giriş sayfası
│   │   │   ├── register/      # Kayıt sayfası
│   │   │   ├── market/        # Marketplace (filtre + sıralama)
│   │   │   ├── sell/           # Satış sayfası
│   │   │   ├── wallet/         # Cüzdan (bakiye, para yatırma/çekme, işlem geçmişi)
│   │   │   ├── profile/       # Kullanıcı profili
│   │   │   ├── admin/         # Admin paneli (kullanıcı/ilan yönetimi, istatistikler)
│   │   │   └── cs2/skins/     # Skin kategorileri/detay
│   │   ├── components/
│   │   │   ├── Navbar.tsx     # Arama + auth durumu
│   │   │   └── skins/         # SkinCard
│   │   └── lib/
│   │       ├── api.ts         # API client
│   │       ├── auth.tsx       # AuthContext + useAuth
│   │       ├── data.ts        # Statik skin verileri
│   │       └── types.ts       # TypeScript tipleri
│   └── public/images/         # Skin görselleri
├── nginx/
│   ├── nginx.dev.conf          # Dev reverse proxy (HMR websocket destekli)
│   └── nginx.prod.conf         # Prod reverse proxy (gzip)
├── .github/workflows/ci.yml    # CI: backend+frontend lint/typecheck/build + Playwright E2E
├── docker-compose.yml          # Dev ortamı (hot-reload)
├── docker-compose.prod.yml     # Prod ortamı (optimize build)
├── docs/DEPLOY.md              # Production: Atlas + Railway + Vercel adım adım
├── docs/CDN.md                 # Skin görselleri: Cloudflare R2 / S3 CDN
└── README.md
```

## Özellikler

- 🔐 JWT tabanlı kimlik doğrulama (register, login, token)
- 🔍 Skin arama (debounced, dropdown sonuçlar)
- 🛡️ Rate limiting (genel: 100/15dk, auth: 10/15dk)
- 🎨 Dark/Light mode
- 📱 Responsive tasarım
- 🎯 Input validation (email, şifre, username)
- 📧 Email doğrulama + şifre sıfırlama
- 💰 Steam Market fiyat entegrasyonu
- 👛 Cüzdan / bakiye sistemi (iyzico ile para yatırma, bakiyeyle satın alma)
- 🤖 Steam trade bot: emanet modeliyle otomatik ilan-teslim akışı (`STEAM_BOT_*` opsiyonel, izole child process'te çalışır)
- 🔔 Bildirim sistemi (satış/alım, para yatırma/çekme, değerlendirme — in-app + kritik email)
- 📈 Fiyat geçmişi grafikleri (platform satışları + Steam anlık fiyat referansı, Chart.js)
- 🔎 SEO: sayfa bazlı meta/OG etiketleri, dinamik `sitemap.xml`, `robots.txt`, Product JSON-LD, hreflang alternates
- 🛠️ Admin Paneli: kullanıcı yönetimi (ban/ban kaldırma, rol değiştirme), ilan moderasyonu, platform istatistikleri dashboard'u
- 🌐 Çoklu dil (i18n): Türkçe / İngilizce (`next-intl`, `/tr/...` ve `/en/...` locale önekli route'lar, Navbar dil değiştirici)
- 🐳 Docker Compose: dev (hot-reload) + prod (optimize build) ortamları, MongoDB + Redis container'ları, Nginx reverse proxy
- 📝 Yapılandırılmış loglama (Pino): console + günlük rotasyonlu dosya, HTTP istek logları, önemli olay logları (login, ödeme, admin işlemleri)
- 🚦 Redis destekli dağıtık rate limiting (Redis yoksa otomatik in-memory fallback)
- 📖 API Dokümantasyonu (Swagger/OpenAPI, admin panelinde interaktif SwaggerUI, sadece admin erişimi)
- ⚙️ CI Pipeline (GitHub Actions — her PR/push'ta backend+frontend lint/typecheck/build doğrulaması)
- 🩺 Monitoring: Sentry hata takibi (backend + frontend, opsiyonel) + `/api/health` uptime endpoint'i
- 🧪 E2E Testler (Playwright): smoke + auth + korumalı sayfalar, CI'da otomatik
- 📱 PWA: installable (manifest + ikonlar), offline fallback (Serwist), Web Push bildirimleri
- 🚀 Production deploy: Vercel + Railway + MongoDB Atlas (`docs/DEPLOY.md`)
- 🖼️ CDN: Cloudflare R2 / S3 uyumlu (`NEXT_PUBLIC_CDN_URL`, `docs/CDN.md`)

---

## 📋 Yapılacaklar (TODO / Roadmap)

> Güncel durum + uncommitted WIP detayı: [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md)

### ✅ Tamamlanan İşler

- [x] Backend API kurulumu (Express + TypeScript + MongoDB)
- [x] JWT tabanlı auth sistemi (register, login, token)
- [x] Frontend auth sayfaları (`/login`, `/register`, `/forgot-password`)
- [x] `AuthContext` + `useAuth` hook (token yönetimi, localStorage)
- [x] API client (`lib/api.ts`) — merkezi endpoint yönetimi
- [x] Navbar'da debounced arama + dropdown sonuçlar
- [x] Rate limiting (genel: 100/15dk, auth: 10/15dk)
- [x] Helmet + mongo-sanitize güvenlik middleware'leri
- [x] Steam Market fiyat entegrasyonu
- [x] Steam profil/envanter endpoint'leri
- [x] Email doğrulama + şifre sıfırlama backend akışı
- [x] CS2 skin kategori/silah/detay sayfaları (`/cs2/skins/...`)
- [x] Market sayfası (`/market`) — filtre + sıralama + skin listeleme
- [x] Satış sayfası (`/sell`) — ürün satışa koyma formu
- [x] Profil sayfası (`/profile`) — kullanıcı bilgileri
- [x] `/cs2-skin` eski route → `/cs2/skins` redirect'i
- [x] Gereksiz dosya/klasör temizliği
- [x] README.md güncelleme
- [x] MongoDB Skin modeli + Listing modeli oluşturuldu
- [x] Seed script ile 51 skin veritabanına yüklendi
- [x] Market sayfası backend API'den veri çekiyor (server-side filtre + sıralama + pagination)
- [x] Satış sayfası backend'e bağlandı (skin arama autocomplete + ilan oluşturma)
- [x] Listings API — CRUD endpoint'leri (`/api/listings`)
- [x] `.env` / `config.ts` env var uyuşmazlığı düzeltildi
- [x] MongoDB auth devre dışı bırakıldı, servis `--auth` olmadan yeniden kaydedildi

---

### 🔴 Yüksek Öncelik

- [x] **Veritabanı Skin Modeli** — MongoDB Skin modeli + seed script tamamlandı (51 skin)
- [x] **Market Sayfası Backend Entegrasyonu** — Market sayfası backend API'den veri çekiyor (filtre + sıralama + pagination)
- [x] **Satış Sayfası Backend Entegrasyonu** — Sell formu backend'e POST `/api/listings` ile bağlandı (skin arama + ilan oluşturma)
- [x] **Ödeme / Bakiye Sistemi** — iyzico Checkout Form (sandbox) ile para yatırma, cüzdan bakiyesiyle satın alma, para çekme talebi *(tamamlandı)*
- [x] **Sipariş / İşlem (Transaction) Sistemi** — Deposit/withdrawal/purchase/sale işlem geçmişi (`Transaction` modeli + `/api/wallet/transactions`) *(tamamlandı)*
- [x] **Next.js 15 `params` TypeScript Hatası** — Tüm dynamic route sayfalarında `Promise` + `use()` ile düzeltildi

---

### 🟡 Orta Öncelik

- [x] **Profil Sayfası Backend Entegrasyonu** — Profil düzenleme, Steam hesap bağlama, istatistikler, favoriler tabı *(tamamlandı)*
- [x] **Steam Envanter ile Satış Bağlantısı** — Sell sayfasında Steam envanterinden skin seçme *(tamamlandı)*
- [x] **Trade Offer Sistemi** — Steam bot (emanet modeli): ilan verirken item bota emanet edilir, satın alma sonrası bot otomatik alıcıya teslim eder. `STEAM_BOT_*` env değişkenleri tanımlı değilse devre dışı kalır, akış eskisi gibi manuele düşer *(kod tamam; gerçek bot hesabıyla uçtan uca doğrulanmadı — bkz. docs/PROJECT_STATUS.md §4)*
- [x] **Bildirim Sistemi** — Satış/alım, para yatırma/çekme, değerlendirme bildirimleri (in-app polling + kritik olaylarda email) *(tamamlandı)*
- [x] **Admin Paneli** — Kullanıcı yönetimi (ban/ban kaldırma, rol değiştirme), ilan moderasyonu (kaldırma), platform istatistikleri dashboard'u (`/admin`, `ADMIN_EMAILS` ile rol ataması) *(tamamlandı)*
- [x] **Kullanıcı Değerlendirme Sistemi** — Alıcı/satıcı puanlama ve yorum (Review modeli + API) *(tamamlandı)*
- [x] **Favoriler / Watchlist** — Skin favorilere ekleme/çıkarma + profilde Favoriler tabı *(tamamlandı)*

---

### 🟢 Düşük Öncelik / İyileştirmeler

- [x] **Daha Fazla Skin Verisi** — Seed script ile 51 skin (AWP, AK-47, M4A4) veritabanına yüklendi
- [x] **Gelişmiş Filtreleme** — Wear (FN/MW/FT/WW/BS), StatTrak™, float değeri filtresi (ilan bazlı) *(tamamlandı)*
- [x] **Fiyat Geçmişi Grafikleri** — Platform satış geçmişi (günlük ortalama/min/max) + Steam anlık fiyat referansı, Chart.js ile görselleştirme *(tamamlandı)*
- [x] **Çoklu Dil Desteği (i18n)** — `next-intl` ile Türkçe/İngilizce, locale önekli route'lar (`/tr/...`, `/en/...`), Navbar dil değiştirici, hreflang sitemap *(tamamlandı)*
- [x] **SEO Optimizasyonu** — Sayfa bazlı meta etiketleri, Open Graph/Twitter kartları, `sitemap.xml` (backend'den dinamik skin rotaları), `robots.txt`, skin detay sayfalarında Product JSON-LD *(tamamlandı)*
- [x] **PWA Desteği** — Serwist service worker + offline sayfa, Web App Manifest, Web Push (VAPID) abonelik + kritik bildirimlerde tarayıcı push *(tamamlandı)*
- [x] **E2E Testler** — Playwright ile core smoke/auth/profil/sat akışları (`frontend/e2e/`); API mock'lu, CI'da Chromium job'u *(tamamlandı)*
- [x] **CI/CD Pipeline** — GitHub Actions ile her PR/push'ta backend+frontend lint/typecheck/build doğrulaması (`.github/workflows/ci.yml`); deploy hedefi belirlenince CD adımları eklenecek *(CI tamamlandı, CD roadmap'te ayrı madde)*
- [x] **Docker Compose** — Dev (hot-reload) ve prod (optimize build) ortamları, MongoDB container + volume, Nginx reverse proxy (`/api` → backend, `/` → frontend) *(tamamlandı)*
- [x] **Rate Limiting İyileştirmesi** — `REDIS_URL` tanımlıysa Redis store (dağıtık ortam), tanımsızsa otomatik in-memory fallback *(tamamlandı)*
- [x] **Logging** — Pino ile merkezi loglama: console (dev) + günlük rotasyonlu dosya (prod), HTTP istek logları, hata/exception logları, önemli olay logları (login, ödeme, admin işlemleri) *(tamamlandı)*
- [x] **API Dokümantasyonu** — Swagger/OpenAPI (`swagger-jsdoc`) ile tüm endpoint'ler (~55) belgelendi; admin panelinde "API Dokümantasyonu" sekmesinde SwaggerUI ile interaktif olarak görüntülenir (sadece admin, JWT ile korumalı) *(tamamlandı)*

---

### 🏗️ Altyapı / DevOps

- [x] **Production Deploy** — Vercel (frontend) + Railway (backend) + MongoDB Atlas; `docs/DEPLOY.md` rehberi, `railway.toml` / `vercel.json`, trust proxy + çoklu CORS *(config + rehber tamam; canlı hesap bağlama senin adımların)*
- [ ] **Domain + SSL** — Özel domain bağlama
- [x] **CDN** — `NEXT_PUBLIC_CDN_URL` + `cdnUrl()` ile skin görselleri; Cloudflare R2 sync script (`npm run sync:cdn`); rehber `docs/CDN.md` *(kod tamam; bucket yükleme senin adımın)*
- [x] **Monitoring** — Sentry ile backend + frontend hata takibi (`SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` tanımlı değilse devre dışı), `/api/health` endpoint'i ile uptime monitoring *(tamamlandı)*
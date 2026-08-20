# LoopSkins — Proje Durum & Handoff Belgesi

> **Son güncelleme:** 2026-08-20
> **Amaç:** Yeni bir AI/geliştirici projeyi baştan taramadan devam edebilsin.
> **Repo:** `C:/Users/Msı/Projeler Cursor/Zade` (git `main`, klasör adı tarihsel — marka **LoopSkins**), GitHub: `furkan-tarhan/Aion`
> **Son commit:** `c4457fc` — `fix: apply non-breaking npm audit fixes (frontend + backend)` — **origin/main ile senkron** (2026-08-17/18 WIP'i tamamen commit edilip push edildi, bkz. §3 ve §9)

---

## 1. Proje nedir?

CS2 skin al/sat marketplace'i:

| Katman | Stack |
|--------|--------|
| Frontend | Next.js 15, React 19, Tailwind, `next-intl` (tr/en) |
| Backend | Express + TypeScript + MongoDB/Mongoose |
| Auth | JWT + bcrypt (email/şifre); Steam OpenID (bkz. §3, güvenlik sertleştirildi) |
| Ödeme | iyzico Checkout Form (**sandbox**) |
| Deploy hedefi | Vercel (FE) + Railway (BE) + MongoDB Atlas |

**Marka notu:** Marka **LoopSkins** olarak karara bağlandı (2026-08-17, `ee8afb4` ile commit edildi). README, PROJECT_STATUS, manifest, SEO, e2e testleri ve `zade_*` local storage/env örnekleri buna göre güncellendi. Repo klasör adı (`.../Zade`) ve git repo adı (`Aion`) bilinçli olarak değiştirilmedi.

---

## 2. Klasör haritası (önemli yerler)

```
backend/src/
  index.ts              # Express app, route mount, session/passport, startSteamBot()
  config.ts             # env
  models/               # User, Skin, Listing(+deposit alanları), Transaction(+delivery alanları), Review, Notification
  routes/               # users, skins, steam, steamAuth(Steam OpenID), listings(+bot entegrasyonu), favorites,
                        # reviews, wallet, notifications, admin(+bot-status)
  services/             # steamApi, iyzico, email, push, steamBot (bot child process controller)
  bot/                   # steamBotProcess.ts (izole child process), protocol.ts (IPC tipleri)
  swagger.ts

frontend/src/
  app/[locale]/          # tüm sayfalar (i18n prefix)
  components/Navbar.tsx
  lib/api.ts            # merkezi API client
  messages/tr.json, en.json

docs/
  DEPLOY.md, CDN.md, PROJECT_STATUS.md (bu dosya)

README.md               # kurulum + roadmap
```

### Backend API mount'ları

| Path | Durum |
|------|--------|
| `/api/users` | ✅ |
| `/api/skins` | ✅ |
| `/api/steam` | ✅ (profil/envanter/fiyat) |
| `/api/auth/steam` | ✅ kod tamam, güvenlik sertleştirildi — **gerçek Steam bot hesabıyla hiç uçtan uca test edilmedi** |
| `/api/listings` | ✅ (search, auto-create skin, TRY — enum/price şeması düzeltildi) + `GET /:id/deposit-status`, bot varsa otomatik emanet/teslimat |
| `/api/favorites` | ✅ |
| `/api/reviews` | ✅ |
| `/api/wallet` | ✅ (`POST /test-deposit` artık `NODE_ENV=production`'da 404) |
| `/api/notifications` | ✅ |
| `/api/admin` | ✅ + `GET /bot-status` (Steam bot online/offline) |
| `/api/health` | ✅ |

### Frontend sayfalar (`/[locale]/...`)

| Route | Durum |
|-------|--------|
| `/` homepage | ✅ CS2 buy-menu wheel (Vercel-style monochrome) |
| `/market` | ✅ (`useSearchParams` artık Suspense içinde — Vercel prod build hatası düzeltildi, `19f5f71`) |
| `/sell` | ✅ Steam login popup env-tabanlı URL + origin kontrolü; deposit durumu banner'ı (5sn poll) |
| `/wallet` | ✅ (test-deposit UI sadece `NODE_ENV!=='production'`'da render edilir) |
| `/profile` | ✅ |
| `/login` `/register` `/forgot-password` | ✅ |
| `/admin` | ✅ |
| `/cs2/skins/...` | ✅ kategori/silah/detay |
| `/offline` | ✅ PWA |

---

## 3. TAMAMLANAN (committed & pushed — çalışır kabul et)

### Çekirdek ürün
- [x] JWT auth (register/login/token), AuthContext
- [x] Email doğrulama + şifre sıfırlama
- [x] Skin modeli + seed (~51 skin)
- [x] Listings CRUD + market filtre/sıralama/pagination
- [x] Sell: skin arama + ilan oluşturma + Steam envanterinden seçim (trade URL manuel)
- [x] Cüzdan: bakiye, iyzico deposit (sandbox), purchase, withdrawal **talebi** (manuel payout)
- [x] Transaction geçmişi
- [x] Favoriler / watchlist
- [x] Reviews (alıcı/satıcı puan)
- [x] In-app bildirimler (+ kritikte email/push)
- [x] Admin panel (ban, rol, ilan moderasyon, istatistik, Swagger UI)
- [x] Steam Web API: profil, envanter, market fiyat referansı
- [x] Fiyat geçmişi grafikleri (Chart.js)
- [x] Gelişmiş filtre: wear, StatTrak, float

### Steam auth & trade bot (`ee8afb4`, 2026-08-17)
- [x] Steam login popup URL'leri artık `NEXT_PUBLIC_API_URL` env'inden (hardcode kaldırıldı); `postMessage` `'*'` yerine gerçek frontend/API origin'e scoped
- [x] Steam envanter auto-create bug fix: geçersiz `rarity` (`'Mil-Spec Grade'` enum'da yoktu) ve düz sayı `price` alanı → 500 hatası veriyordu; artık `rarity: 'Mil-Spec'`, `price: {min,max,currency}` ve `inferSkinCategory` ile kaba kategori tahmini
- [x] `steamApi.getSteamInventory`: public `steamcommunity.com/inventory` endpoint, private/rate-limit/erişilemez durumları `SteamInventoryError` ile ayırt edip 403/429/502 döner
- [x] `POST /api/wallet/test-deposit` prod'da 404 (API + UI)
- [x] **Steam trade bot — emanet (custody) modeli:** `backend/src/bot/steamBotProcess.ts` izole child process (`child_process.fork`), sadece `STEAM_BOT_*` env alır (DB/JWT/iyzico sırları sızmaz — `steamcommunity`/`steam-tradeoffer-manager` bağımlılık zincirinde düzeltmesi olmayan CVE'ler var, bilinçli izolasyon)
  - Satış: item seçilince bot satıcıdan ister → kabul edilince ilan `active` + `botAssetId` kaydedilir
  - Satın alma: bot alıcıya teslim eder, `Transaction.deliveryStatus` güncellenir, bildirim gider
  - Mobil onaylar `steam-totp` + confirmation checker ile otomatik
  - Bot yapılandırılmamışsa (`STEAM_BOT_*` yok) her şey eskisi gibi manuel akışa düşer — geriye dönük uyumlu
  - **Gerçek Steam hesabıyla hiç test edilmedi** (bkz. §4) — sadece typecheck/build/ts-node boot testi yapıldı
- [x] Frontend: `/sell` deposit banner (poll), `/market` satın alma `confirm()` yerine modal (buyer trade URL toplar, teslimat linki gösterir)
- [x] Marka: `Zade` → `LoopSkins` (README, docs, manifest, SEO, e2e, localStorage anahtarları)

### Deploy / güvenlik (2026-08-17 → 08-18)
- [x] React Server Components CVE yaması (Vercel otomatik PR, `5f9c7c7` → `82c5338` merge)
- [x] `MarketClient` `useSearchParams()` artık `Suspense` içinde — ilk gerçek Vercel deploy denemesinde yakalanan prod build hatası (`19f5f71`)
- [x] npm audit fix (non-breaking): frontend 9→3 açık (brace-expansion, dompurify, immutable, js-yaml, nanoid), backend 31→19 açık (axios, body-parser, brace-expansion vb.) — `c4457fc`. Kalan açıklar breaking (postcss/sharp→Next 16, ya da izole edilmiş steamcommunity/steam-user zinciri) olduğu için bilinçli bırakıldı

### Altyapı / kalite
- [x] i18n (tr/en)
- [x] SEO (meta, OG, sitemap, robots, JSON-LD)
- [x] PWA + Web Push (VAPID)
- [x] Sentry (DSN yoksa kapalı)
- [x] Pino logging, Helmet, mongo-sanitize, rate limit (Redis optional)
- [x] Docker Compose (dev/prod) + Nginx
- [x] GitHub Actions CI (lint/typecheck/build + Playwright e2e)
- [x] Deploy rehberi (`docs/DEPLOY.md`), CDN helper (`docs/CDN.md`)
- [x] Next.js CVE yaması (15.5.22)
- [x] Railway healthcheck / trust proxy / lazy iyzico init (boot crash fix'leri)
- [x] UI: Vercel-style monochrome + CS2 radial wheel homepage

---

## 4. YAPILMADI (roadmap'te açık / ürün eksikleri)

| Madde | Not |
|-------|-----|
| **Steam Trade Offer botu — gerçek Steam hesabıyla doğrulama** | Kod tamam ve commit'li (bkz. §3), typecheck+build temiz — ama gerçek bir Steam bot hesabı (kullanıcı adı/şifre + Steam Guard Mobile Authenticator shared/identity_secret) bu ortamda mevcut olmadığı için **gerçek Steam girişi, deposit/delivery trade offer gönderimi, mobil onay akışı hiç test edilmedi**. Önce sandbox/test bir bot hesabıyla uçtan uca denenmeli. |
| **Otomatik para çekme (payout)** | Withdrawal: bakiye düşülür, banka transferi manuel. |
| **iyzico production** | Hâlâ sandbox URL/keys. |
| **Domain + SSL** | Özel domain bağlanmamış. |
| **CD (otomatik deploy)** | CI var, push→deploy yok. İlk gerçek Vercel deploy denemesi yapıldı (`19f5f71` bunu düzeltti) ama otomatik pipeline kurulu değil. |
| **Canlı hesap bağlama** | Vercel/Railway/Atlas/CDN bucket — kod hazır, hesap/env senin adımın. |
| **Unit/integration test (backend)** | `npm test` placeholder. E2E sadece FE smoke (mock API). |
| **Steam hesabı ↔ mevcut email hesabı bağlama** | Steam girişi hep kendi steamId'sine göre ayrı hesap kullanır/oluşturur (sahte `{steamId}@steam.local` email + rastgele password) — mevcut email/şifre hesabına bağlama henüz yok (bilinçli ürün kararı, kapsam dışı bırakıldı). |

---

## 5. Kalan bilinçli riskler / TODO'lar

1. Mevcut email hesabına Steam **bağlama** akışı yok — şimdilik kapsam dışı bırakıldı (ürün kararı)
2. `test-deposit`'i tamamen kaldırmak yerine sadece prod'da kapatıldı — dev/staging'de hâlâ açık
3. Session store: memory `express-session` — multi-instance'ta Redis session gerekir (düşük öncelik, mevcut tek-instance deploy için sorun değil)
4. Steam partner panel / return URL canlı domain ile eşleştirilmeli (senin adımın)
5. Auto-created Skin'in `category`/`rarity` tahmini hâlâ kaba (gerçek Steam rarity/kategori verisi çekilmiyor) — artık en azından geçerli/doğru şemaya yazıyor
6. **Steam trade bot hesabı henüz oluşturulmadı** — canlıya almadan önce ayrı bir Steam hesabı (marketplace'e ait, kişisel değil) + Steam Guard Mobile Authenticator kurulumu gerekir, sonra `STEAM_BOT_*` env'leri doldurulup uçtan uca test edilmeli (sandbox/test item'larla önce)
7. Bot'un bağımlılık zincirindeki güvenlik açıkları (`npm audit`, steamcommunity/steam-tradeoffer-manager) — düzeltmesi yok, izolasyon dışında ek bir mitigasyon (örn. ayrı bir container/VM'de çalıştırma) canlıya çıkmadan değerlendirilebilir
8. npm audit: frontend'de 3, backend'de 19 açık kaldı — hepsi breaking upgrade gerektiriyor (Next 16, ya da izole steamcommunity zinciri), bilinçli olarak ertelendi

---

## 6. Satın alma akışı — bugün nasıl çalışıyor?

**`STEAM_BOT_*` yapılandırılmamışsa (bugünkü canlı durum — bot hiç test edilmedi):**
```
Alıcı cüzdana para yatırır (iyzico sandbox)
  → İlanı bakiye ile satın alır (Transaction purchase/sale)
  → Skin fiziksel teslim: OTOMATİK DEĞİL
  → Satıcı trade URL'i ile manuel Steam trade beklenir
```

**`STEAM_BOT_*` yapılandırılmışsa (kod hazır, gerçek bot ile doğrulanmadı — bkz. §4-5):**
```
Satıcı Steam envanterinden item seçip ilan verir
  → Bot satıcıdan item'ı isteyen bir trade offer gönderir ('pending_deposit', pazarda görünmez)
  → Satıcı Steam'de kabul eder → item bota geçer → ilan 'active' olur, pazarda görünür
Alıcı cüzdana para yatırır, ilanı satın alır + kendi trade URL'ini girer
  → Bot kendi envanterinden item'ı alıcıya gönderen bir trade offer yollar
  → Alıcı Steam'de kabul eder → Transaction.deliveryStatus 'accepted' olur, bildirim gider
```

**Not:** Bot yoksa/yanıt vermiyorsa ilan otomatik olarak eski manuel akışa düşer (satıcı engellenmez).

---

## 7. Env checklist (canlıya çıkmadan)

```
Backend: PORT, MONGO_URI, JWT_SECRET, EMAIL_*, FRONTEND_URL, BACKEND_URL,
         STEAM_API_KEY, IYZICO_*, ADMIN_EMAILS, REDIS_URL?, SENTRY_DSN?,
         VAPID_* (push), STEAM_BOT_* (opsiyonel — trade bot, dördü de tanımlı değilse devre dışı)

Frontend: NEXT_PUBLIC_API_URL / backend URL, NEXT_PUBLIC_SITE_URL,
          NEXT_PUBLIC_CDN_URL?, NEXT_PUBLIC_SENTRY_DSN?, VAPID public
```

Detay: `README.md`, `docs/DEPLOY.md`, `backend/API_SETUP.md`, `docs/CDN.md`.

---

## 8. Öncelikli sonraki işler (önerilen sıra)

1. ~~**WIP'i temizle:** Steam auth'u güvenli hale getir; `test-deposit`'i kilitle; marka kararı.~~ ✅ **2026-08-17 tamamlandı**
2. ~~**Trade Offer sistemi** (asıl ürün eksigi) — bot veya Steam Web API trade.~~ ✅ **2026-08-17 kod tamamlandı** (emanet modeli, izole child process) — **ama gerçek Steam bot hesabıyla hiç test edilmedi**, canlıya almadan önce mutlaka sandbox/test bir hesapla uçtan uca doğrula.
3. ~~WIP + Trade Offer değişikliklerini commit'le.~~ ✅ **2026-08-17/18 commit edildi (`ee8afb4`) ve `origin/main`'e push edildi (`c4457fc`, 2026-08-20)**
4. **Steam hesabı bağlama** (mevcut user'a steamId link) + envanter satışı e2e doğrula.
5. **Steam trade bot hesabı kur** (ayrı Steam hesabı + Mobile Authenticator) ve `STEAM_BOT_*` ile uçtan uca test et.
6. iyzico **live** + withdrawal süreci (en azından admin onayı UI).
7. Domain/SSL + CDN upload + CD.
8. README roadmap'ini bu dosyayla senkronla.

---

## 9. Commit geçmişi (yakın — bağlam)

```
c4457fc fix: apply non-breaking npm audit fixes (frontend + backend)
82c5338 Merge pull request #2 (React Server Components CVE fix, Vercel bot)
8608181 Merge branch 'main' into vercel/react-server-components-cve-vu-98ol08
19f5f71 fix: wrap MarketClient in Suspense to fix Vercel production build
ee8afb4 feat: LoopSkins rebrand, Steam auth hardening, and Steam trade bot (escrow model)
e6f0a0f style: MarketClient pure black vercel aesthetic
0ee70df style: Vercel b&w navbar, remove duplicate search bar
c5ca1e7 refactor: Vercel-style monochromatic theme
ae5fbf2 feat: CS2 buy menu wheel homepage
a43407e fix: Next.js CVE + sitemap timeout
ca83106 fix: JWT_SECRET boot crash
265ad3a fix: lazy iyzico init
72c7b66 / f983001 / c326cf3 Railway health/Dockerfile
00050e6 feat: Sentry, PWA/push, E2E, deploy, CDN
87a6859 feat: i18n, Docker, logging, Swagger, CI
```

---

## 10. Bu belgeyi güncelle

İş bitince veya yeni WIP commit edilince:
- Bölüm 4/5'i güncelle
- Tarihi değiştir
- Gerekirse README roadmap checkbox'larını senkronla

# LoopSkins — Proje Durum & Handoff Belgesi

> **Son güncelleme:** 2026-08-17  
> **Amaç:** Yeni bir AI/geliştirici projeyi baştan taramadan devam edebilsin.  
> **Repo:** `C:/Users/Msı/Projeler Cursor/Zade` (git `main`, klasör adı tarihsel — marka **LoopSkins**)  
> **Son commit:** `e6f0a0f` — `style: MarketClient pure black vercel aesthetic` (bu belgenin altında anlatılan WIP temizliği henüz commit edilmedi)

---

## 1. Proje nedir?

CS2 skin al/sat marketplace’i:

| Katman | Stack |
|--------|--------|
| Frontend | Next.js 15, React 19, Tailwind, `next-intl` (tr/en) |
| Backend | Express + TypeScript + MongoDB/Mongoose |
| Auth | JWT + bcrypt (email/şifre); Steam OpenID **WIP** |
| Ödeme | iyzico Checkout Form (**sandbox**) |
| Deploy hedefi | Vercel (FE) + Railway (BE) + MongoDB Atlas |

**Marka notu:** Marka **LoopSkins** olarak karara bağlandı (2026-08-17). README, PROJECT_STATUS, manifest, SEO, e2e testleri ve `zade_*` local storage/env örnekleri buna göre güncellendi. Repo klasör adı (`.../Zade`) ve git repo adı bilinçli olarak değiştirilmedi.

---

## 2. Klasör haritası (önemli yerler)

```
backend/src/
  index.ts              # Express app, route mount, session/passport (WIP), startSteamBot()
  config.ts             # env
  models/               # User, Skin, Listing(+deposit alanları), Transaction(+delivery alanları), Review, Notification
  routes/               # users, skins, steam, steamAuth(WIP), listings(+bot entegrasyonu), favorites,
                        # reviews, wallet, notifications, admin(+bot-status)
  services/             # steamApi, iyzico, email, push, steamBot (bot child process controller)
  bot/                   # YENİ: steamBotProcess.ts (izole child process), protocol.ts (IPC tipleri)
  swagger.ts

frontend/src/
  app/[locale]/          # tüm sayfalar (i18n prefix)
  components/Navbar.tsx
  lib/api.ts            # merkezi API client
  messages/tr.json, en.json

docs/
  DEPLOY.md, CDN.md, PROJECT_STATUS.md (bu dosya)

README.md               # kurulum + roadmap (kısmen eski; WIP’i yansıtmaz)
```

### Backend API mount’ları

| Path | Durum |
|------|--------|
| `/api/users` | ✅ |
| `/api/skins` | ✅ |
| `/api/steam` | ✅ (profil/envanter/fiyat) |
| `/api/auth/steam` | 🟡 WIP, güvenlik açıkları kapatıldı (uncommitted `steamAuth.ts`, bkz. §5) |
| `/api/listings` | ✅ (search, auto-create skin, TRY — enum/price şeması düzeltildi) + 🆕 `GET /:id/deposit-status`, bot varsa otomatik emanet/teslimat |
| `/api/favorites` | ✅ |
| `/api/reviews` | ✅ |
| `/api/wallet` | ✅ (`POST /test-deposit` artık `NODE_ENV=production`'da 404) |
| `/api/notifications` | ✅ |
| `/api/admin` | ✅ + 🆕 `GET /bot-status` (Steam bot online/offline) |
| `/api/health` | ✅ |

### Frontend sayfalar (`/[locale]/...`)

| Route | Durum |
|-------|--------|
| `/` homepage | ✅ (CS2 buy-menu wheel; WIP redesign, `listingsApi.getAll` tip hatası düzeltildi) |
| `/market` | ✅ |
| `/sell` | ✅ (Steam login popup artık env-tabanlı URL + origin kontrolü) |
| `/wallet` | ✅ (test-deposit UI sadece `NODE_ENV!=='production'`'da render edilir) |
| `/profile` | ✅ |
| `/login` `/register` `/forgot-password` | ✅ |
| `/admin` | ✅ |
| `/cs2/skins/...` | ✅ kategori/silah/detay |
| `/offline` | ✅ PWA |

---

## 3. TAMAMLANAN (committed — çalışır kabul et)

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
- [x] Railway healthcheck / trust proxy / lazy iyzico init (boot crash fix’leri)
- [x] UI: Vercel-style monochrome + CS2 radial wheel homepage (committed kısım)

---

## 4. YAPILMADI (roadmap’te açık / ürün eksikleri)

| Madde | Not |
|-------|-----|
| **Steam Trade Offer botu — gerçek Steam hesabıyla doğrulama** | Kod tamam (bkz. §5), typecheck+build temiz, bot devre dışıyken (env yok) sunucu sorunsuz açılıyor — ama gerçek bir Steam bot hesabı (kullanıcı adı/şifre + Steam Guard Mobile Authenticator shared/identity_secret) bu ortamda mevcut olmadığı için **gerçek Steam girişi, deposit/delivery trade offer gönderimi, mobil onay akışı hiç test edilmedi**. Önce sandbox/test bir bot hesabıyla uçtan uca denenmeli. |
| **Otomatik para çekme (payout)** | Withdrawal: bakiye düşülür, banka transferi manuel. |
| **iyzico production** | Hâlâ sandbox URL/keys. |
| **Domain + SSL** | Özel domain bağlanmamış. |
| **CD (otomatik deploy)** | CI var, push→deploy yok. |
| **Canlı hesap bağlama** | Vercel/Railway/Atlas/CDN bucket — kod hazır, hesap/env senin adımın. |
| **Unit/integration test (backend)** | `npm test` placeholder. E2E sadece FE smoke (mock API). |

---

## 5. YARIDA / WIP (working tree — COMMIT EDİLMEMİŞ)

> `git status` ile doğrula. Bu bölüm 2026-08-17 anlık görüntüsü (WIP güvenlik/temizlik geçişinden sonra).

### Untracked
- `backend/src/routes/steamAuth.ts` — Passport Steam OpenID; JWT üretip popup’a `postMessage`
- `frontend/public/hero-3d-bg.jpg`
- `frontend/public/hero-skins/*`

### Modified (özet)

**Steam auth (hâlâ WIP, ama artık prod'a daha yakın)**
- `passport` + `passport-steam` + `express-session` eklendi
- Navbar + Sell: popup URL'leri artık `NEXT_PUBLIC_API_URL` env'inden okunuyor (hardcode kaldırıldı)
- `postMessage` artık `'*'` değil, backend `config.frontendUrl`'e; frontend tarafı da `event.origin`'i doğruluyor
- Hesap bağlama bilinçli olarak **değiştirilmedi**: Steam girişi hep kendi steamId'sine göre ayrı hesap kullanır/oluşturur (sahte `{steamId}@steam.local` email + rastgele password) — mevcut email/şifre hesabına bağlama henüz yok
- Steam return URL / realm `BACKEND_URL`'e bağlı; Steam partner panel ayarı hâlâ gerekli (canlıya çıkmadan önce senin adımın)
- Session store hâlâ in-memory `express-session` — tek instance'ta sorun yok, Railway'de yatay ölçeklenirse (birden fazla instance) Redis session store'a geçilmeli (henüz yapılmadı, düşük öncelik)

**Envanter / ilan**
- `steamApi.getSteamInventory`: resmi OAuth inventory yerine `steamcommunity.com/inventory/...` public endpoint; artık private/rate-limit/erişilemez durumları `SteamInventoryError` ile ayırt edip 403/429/502 döner, `/sell` sayfası spesifik hata mesajını gösterir
- Listings POST auto-create Skin: **kritik bug düzeltildi** — `rarity: 'Mil-Spec Grade'` Skin şemasının enum'unda yoktu ve `price` düz sayı olarak kaydediliyordu (`price.min`/`price.max` required) → önceden DB'de olmayan her envanter item'ı ilana çevrilmeye çalışıldığında 500 ile patlıyordu. Artık `rarity: 'Mil-Spec'`, `price: {min,max,currency}` ve weapon adından kaba bir `category` tahmini (`inferSkinCategory`) kullanılıyor
- currency `TRY`; search query `?search=`

**Cüzdan**
- `POST /api/wallet/test-deposit` — artık `NODE_ENV=production`'da 404 döner; wallet sayfasındaki test bakiye butonu da aynı koşulla gizlendi

**UI**
- Homepage (`HomeClient`) büyük redesign; `listingsApi.getAll(URLSearchParams)` tip hatası (`tsc --noEmit` kırıyordu) düzeltildi
- Navbar: scroll-hide, dark force, logo “L” + **LoopSkins** — marka kararı verildi, tüm repo'da (README, docs, manifest, SEO, e2e, localStorage anahtarları) `Zade` → `LoopSkins` olarak eşitlendi (repo klasör adı hariç)
- Market / CS2 skins / sell / wallet küçük uyum dokunuşları
- Theme force dark
- e2e testleri (`smoke.spec.ts`, `auth.spec.ts`): marka kontrolü artık homepage'de olmayan bir `<h1>` yerine Navbar logo linkine (`getByRole('link', { name: /LoopSkins/i })`) bakıyor; `npx playwright test` yeşil

**Steam Trade Bot — emanet (custody) modeli, YENİ, commit edilmemiş**
- Mimari: `backend/src/bot/steamBotProcess.ts` **ayrı bir child process** (`child_process.fork`) olarak çalışır; `backend/src/services/steamBot.ts` bunu yönetir (fork, IPC request/response, event emitter, crash sonrası 30sn'de otomatik yeniden başlatma)
- **Bilinçli izolasyon:** bot process'ine sadece `STEAM_BOT_*` env değişkenleri aktarılır — `MONGO_URI`, `JWT_SECRET`, `IYZICO_*` gibi hiçbir sır bu process'e sızmaz. Sebep: `steamcommunity`/`steam-tradeoffer-manager` paketlerinin bağımlılık zincirinde (eski `request`/`postman-request` forku üzerinden) **düzeltmesi olmayan güvenlik açıkları var** (`npm audit`: ~17 ek açık, 5 kritik). Bu, bilinçli olarak kabul edilen bir risk (kullanıcı onayıyla) — izolasyon bu riskin blast radius'unu bot'un Steam oturumuyla sınırlıyor. **UYARI:** `npm audit fix --force` bu paketler için ÇALIŞTIRILMAMALI — denendiğinde iyzico'yu ve nodemailer'ı istemsizce sürüm değiştirdi, geri alındı.
- Akış: satıcı Steam envanterinden item seçip ilan verince (`assetId` mevcutsa) → backend bot'a "bu item'ı iste" mesajı yollar → bot satıcıya trade offer gönderir (bot hiçbir şey vermez, sadece ister) → ilan `pending_deposit` durumunda kalır, pazarda görünmez → satıcı Steam'de teklifi kabul edince bot'un `sentOfferChanged` event'i `accepted` gelir → ilan `active` olur + `botAssetId` (item'ın bottaki yeni assetid'i) kaydedilir
- Satın alma: alıcı `steamTradeUrl`'ini girer (bot varsa zorunlu) → backend bot'a "bu item'ı alıcıya gönder" der → bot kendi envanterinden item'ı alıcıya teklif eder → `Transaction.deliveryStatus` offer durumuna göre güncellenir (`pending`/`accepted`/`declined`/`canceled`/`expired`/`escrow`), bildirim gönderilir
- Mobil onaylar `steam-totp` + `community.startConfirmationChecker(20000, identitySecret)` ile otomatik kabul edilir
- Bot yapılandırılmamışsa (`STEAM_BOT_*` env yoksa) **her şey eskisi gibi manuel akışa düşer** — geriye dönük uyumlu, hiçbir mevcut davranış bozulmadı (typecheck + build + `ts-node` ile gerçek boot testi yapıldı, log: `steam_bot_disabled` → sunucu normal açılıyor)
- Frontend: `/sell` sayfasında deposit durumu banner'ı (5sn'de bir `GET /deposit-status` poll eder, trade offer linki gösterir); `/market`'te satın alma artık `confirm()` yerine bir modal — buyer trade URL'i toplar, teslimat linkini gösterir
- **Test edilemedi:** gerçek Steam bot hesabı yok (kullanıcı adı/şifre + Steam Guard Mobile Authenticator secret'leri gerekir, bu ortamda sağlanamaz) — sadece kod/tip/derleme doğrulaması yapıldı, gerçek Steam trade akışı hiç çalıştırılmadı

### Kalan bilinçli riskler / TODO'lar
1. Mevcut email hesabına Steam **bağlama** akışı yok — şimdilik kapsam dışı bırakıldı (ürün kararı)
2. `test-deposit`'i tamamen kaldırmak yerine sadece prod'da kapatıldı — dev/staging'de hâlâ açık
3. Session store: memory `express-session` — multi-instance'ta Redis session gerekir (düşük öncelik, mevcut tek-instance deploy için sorun değil)
4. Steam partner panel / return URL canlı domain ile eşleştirilmeli (senin adımın)
5. Auto-created Skin'in `category`/`rarity` tahmini hâlâ kaba (gerçek Steam rarity/kategori verisi çekilmiyor) — artık en azından geçerli/doğru şemaya yazıyor
6. **Steam trade bot hesabı henüz oluşturulmadı** — canlıya almadan önce ayrı bir Steam hesabı (marketplace'e ait, kişisel değil) + Steam Guard Mobile Authenticator kurulumu gerekir, sonra `STEAM_BOT_*` env'leri doldurulup uçtan uca test edilmeli (sandbox/test item'larla önce)
7. Bot'un bağımlılık zincirindeki güvenlik açıkları (`npm audit`, bkz. yukarı) — düzeltmesi yok, izolasyon dışında ek bir mitigasyon (örn. ayrı bir container/VM'de çalıştırma) canlıya çıkmadan değerlendirilebilir

---

## 6. Satın alma akışı — bugün nasıl çalışıyor?

**`STEAM_BOT_*` yapılandırılmamışsa (bugünkü canlı durum — bot hiç test edilmedi):**
```
Alıcı cüzdana para yatırır (iyzico sandbox)
  → İlanı bakiye ile satın alır (Transaction purchase/sale)
  → Skin fiziksel teslim: OTOMATİK DEĞİL
  → Satıcı trade URL’i ile manuel Steam trade beklenir
```

**`STEAM_BOT_*` yapılandırılmışsa (kod hazır, gerçek bot ile doğrulanmadı — bkz. §5):**
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

1. ~~**WIP’i temizle:** Steam auth’u güvenli hale getir; `test-deposit`’i kilitle; marka kararı.~~ ✅ **2026-08-17 tamamlandı** (bkz. §5)
2. ~~**Trade Offer sistemi** (asıl ürün eksigi) — bot veya Steam Web API trade.~~ ✅ **2026-08-17 kod tamamlandı** (emanet modeli, izole child process, bkz. §5) — **ama gerçek Steam bot hesabıyla hiç test edilmedi**, canlıya almadan önce mutlaka sandbox/test bir hesapla uçtan uca doğrula.
3. Henüz hiçbiri commit edilmedi — bir sonraki adım: WIP + Trade Offer değişikliklerini gözden geçirip commit'lemek.
4. **Steam hesabı bağlama** (mevcut user’a steamId link) + envanter satışı e2e doğrula.
5. **Steam trade bot hesabı kur** (ayrı Steam hesabı + Mobile Authenticator) ve `STEAM_BOT_*` ile uçtan uca test et.
6. iyzico **live** + withdrawal süreci (en azından admin onayı UI).
7. Domain/SSL + CDN upload + CD.
8. README roadmap’ini bu dosyayla senkronla.

---

## 9. Commit geçmişi (yakın — bağlam)

```
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

İş bitince veya WIP commit edilince:
- Bölüm 4/5’i güncelle
- Tarihi değiştir
- Gerekirse README roadmap checkbox’larını senkronla

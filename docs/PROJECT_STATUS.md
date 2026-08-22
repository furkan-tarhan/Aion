# LoopSkins — Proje Durum & Handoff Belgesi

> **Son güncelleme:** 2026-08-22
> **Amaç:** Yeni bir AI/geliştirici projeyi baştan taramadan devam edebilsin.
> **Repo:** `C:/Users/Msı/Projeler Cursor/Zade` (git `main`, klasör adı tarihsel — marka **LoopSkins**), GitHub: `furkan-tarhan/Aion`
> **Son commit:** `a2d6097` — **origin/main ile senkron**. Üzerine **kripto ödeme (Cryptomus) göçü WIP** olarak çalışma ağacında duruyor, henüz commit edilmedi (bkz. §3 "Ödeme sağlayıcı göçü" ve §4).

---

## 1. Proje nedir?

CS2 skin al/sat marketplace'i:

| Katman | Stack |
|--------|--------|
| Frontend | Next.js 15, React 19, Tailwind, `next-intl` (tr/en) |
| Backend | Express + TypeScript + MongoDB/Mongoose |
| Auth | JWT + bcrypt (email/şifre); Steam OpenID (bkz. §3, güvenlik sertleştirildi) |
| Ödeme | **Cryptomus (kripto ödeme, sadece kripto)** — WIP, gerçek merchant hesabıyla henüz test edilmedi (bkz. §3/§4) |
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
  services/             # steamApi, cryptomus, email, push, steamBot (bot child process controller)
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
| `/api/wallet` | ⚠️ WIP: Cryptomus'a geçti (`POST /deposit` invoice oluşturur, `POST /deposit/webhook` ödeme onayı) — kod tamam ama gerçek merchant hesabıyla test edilmedi. `POST /test-deposit` hâlâ `NODE_ENV=production`'da 404 |
| `/api/notifications` | ✅ |
| `/api/admin` | ✅ + `GET /bot-status` (Steam bot online/offline), `GET /withdrawals` + `PATCH /withdrawals/:id/complete\|reject` (kripto çekim takibi, WIP) |
| `/api/health` | ✅ |

### Frontend sayfalar (`/[locale]/...`)

| Route | Durum |
|-------|--------|
| `/` homepage | ✅ CS2 buy-menu wheel (Vercel-style monochrome) |
| `/market` | ✅ (`useSearchParams` artık Suspense içinde — Vercel prod build hatası düzeltildi, `19f5f71`) |
| `/sell` | ✅ Steam login popup env-tabanlı URL + origin kontrolü; deposit durumu banner'ı (5sn poll) |
| `/wallet` | ⚠️ WIP: Cryptomus akışına göre yeniden yazıldı (isim/TC/adres/IBAN formları kaldırıldı; deposit sadece tutar ister, withdraw cüzdan adresi+ağ ister). test-deposit UI sadece `NODE_ENV!=='production'`'da render edilir |
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
- [x] Cüzdan: bakiye (USD), Cryptomus deposit ⚠️ *(WIP, henüz gerçek hesapla test edilmedi — bkz. aşağıdaki alt bölüm)*, purchase, withdrawal **talebi** (manuel payout, artık kripto cüzdan adresi + ağ)
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
- [x] **Steam trade bot — emanet (custody) modeli:** `backend/src/bot/steamBotProcess.ts` izole child process (`child_process.fork`), sadece `STEAM_BOT_*` env alır (DB/JWT/Cryptomus sırları sızmaz — `steamcommunity`/`steam-tradeoffer-manager` bağımlılık zincirinde düzeltmesi olmayan CVE'ler var, bilinçli izolasyon)
  - Satış: item seçilince bot satıcıdan ister → kabul edilince ilan `active` + `botAssetId` kaydedilir
  - Satın alma: bot alıcıya teslim eder, `Transaction.deliveryStatus` güncellenir, bildirim gider
  - Mobil onaylar `steam-totp` + confirmation checker ile otomatik
  - Bot yapılandırılmamışsa (`STEAM_BOT_*` yok) her şey eskisi gibi manuel akışa düşer — geriye dönük uyumlu
  - **Gerçek Steam hesabıyla hiç test edilmedi** (bkz. §4) — sadece typecheck/build/ts-node boot testi yapıldı
- [x] Frontend: `/sell` deposit banner (poll), `/market` satın alma `confirm()` yerine modal (buyer trade URL toplar, teslimat linki gösterir)
- [x] Marka: `Zade` → `LoopSkins` (README, docs, manifest, SEO, e2e, localStorage anahtarları)

### ⚠️ Ödeme sağlayıcı göçü: iyzico → Cryptomus (2026-08-22, WIP — henüz commit edilmedi)

Kullanıcı kararı: platform artık **sadece kripto para** ile ödeme kabul edecek, kart/banka akışı tamamen kaldırıldı.

- [x] `backend/src/services/iyzico.ts` silindi, yerine `backend/src/services/cryptomus.ts` (invoice oluşturma `POST /payment` + webhook imza doğrulama `md5(base64(body)+apiKey)`)
- [x] `backend/src/routes/wallet.ts` yeniden yazıldı:
  - `POST /deposit` artık sadece `{ amount }` (USD) alır — isim/soyad/TC kimlik/telefon/adres alanları tamamen kaldırıldı (Cryptomus'ta gerekmiyor)
  - Eski `POST /deposit/callback` (tarayıcı yönlendirmeli, iyzico'ya özgü) yerine `POST /deposit/webhook` (sunucudan sunucuya, imza doğrulamalı) — gerçek bakiye artışı burada olur; kullanıcı tarayıcısı sadece `url_return` ile `/wallet?deposit=pending`'e döner
  - `POST /withdraw` artık `{ amount, walletAddress, network }` alır (IBAN yerine) — `network`: `USDT_TRC20 | USDT_BEP20 | USDT_ERC20 | BTC | ETH | TON`. Akış öncekiyle aynı: bakiye anında düşülür, transaction `pending` kalır, coin admin tarafından **manuel** gönderilir (otomatik Cryptomus Payout API'si bilinçli olarak entegre edilmedi — kullanıcı kararı, düşük risk tercih edildi)
- [x] `Transaction` modeline `cryptoAmount/cryptoCurrency/cryptoNetwork` (webhook'tan gelen gerçek ödeme kaydı) ve `payoutAddress/payoutNetwork` (withdraw) alanları eklendi
- [x] **Para birimi TRY → USD:** cüzdan bakiyesi, `Listing.currency` (Steam envanterinden auto-create edilen skin'ler dahil), bildirim/email metinleri, tüm frontend `Intl.NumberFormat` çağrıları (`Navbar`, `/wallet`, `/profile`, `HomeClient`) USD'ye çevrildi. Gerekçe: Listing şeması zaten varsayılan olarak USD idi, satın alma mantığı (`balance >= listing.price`) para birimi dönüşümü yapmıyor — TRY bakiye + USD ilan karışıklığını önlemek için tek para birimine sabitlendi
- [x] Frontend `/wallet`: deposit formu artık sadece tutar; withdraw formu cüzdan adresi + ağ seçimi (dropdown); `?deposit=pending` dönüşünde 3sn aralıklarla 10 kez cüzdanı yeniden çekip webhook'un işlemesini bekleyen polling eklendi (`/sell` deposit banner ile aynı desen)
- [x] `iyzipay` npm bağımlılığı kaldırıldı; `.env.example`, `README.md`, `docs/DEPLOY.md`, `backend/API_SETUP.md` Cryptomus'a göre güncellendi
- [x] **Admin: bekleyen çekim talepleri paneli** — `/admin` sayfasına "Çekimler" sekmesi eklendi (`GET /api/admin/withdrawals`, `PATCH /api/admin/withdrawals/:id/complete`, `PATCH /api/admin/withdrawals/:id/reject`). Reject bakiyeyi otomatik kullanıcıya iade eder; her iki aksiyon da bildirim gönderir
- [x] `CRYPTOMUS_MERCHANT_ID` gerçek değerle `backend/.env`'e dolduruldu (`.env` git'e commit edilmez); **`CRYPTOMUS_PAYMENT_API_KEY` hâlâ boş** — kullanıcı sonra dolduracak
- [ ] **Gerçek bir Cryptomus merchant hesabıyla hiç test edilmedi** — `CRYPTOMUS_MERCHANT_ID`/`CRYPTOMUS_PAYMENT_API_KEY` henüz doldurulmadı. Önce test hesabı açılıp küçük tutarlı gerçek bir kripto ödemesiyle deposit→webhook→bakiye artışı ve withdraw akışı uçtan uca doğrulanmalı
- [ ] Değişiklikler henüz **commit edilmedi** — typecheck/build de henüz çalıştırılmadı

### ⚠️ Backend test altyapısı (2026-08-22, WIP — henüz commit edilmedi)

- [x] **`backend/src/index.ts` → `app.ts` + `index.ts` olarak ikiye ayrıldı.** `app.ts` sadece Express app'ini kurar (middleware + route mount), MongoDB bağlantısı/Steam bot başlatma/`app.listen()` YOK — bu sayede testler gerçek sunucu ayağa kaldırmadan/gerçek Mongo'ya dokunmadan `app`'i import edip supertest ile kullanabiliyor. `index.ts` artık sadece bootstrap (mongo connect + bot start + listen). Davranış değişmedi, sadece testability için ayrıştırıldı.
- [x] Jest + ts-jest + Supertest + `mongodb-memory-server` (izole, gerçek Mongo'ya asla dokunmayan in-memory DB) kuruldu. `npm test` artık çalışıyor (`jest --forceExit` — pino'nun worker-thread transport'u yüzünden gerekli)
- [x] `src/__tests__/env-setup.ts`: gerçek `backend/.env`'deki secret'ların (Mongo URI, Sentry DSN, Cryptomus key'leri, Steam bot bilgileri) test sürecine sızmasını engelleyen deterministik env override
- [x] `src/__tests__/setup.ts`: her test dosyası için in-memory Mongo başlatma/temizleme/kapatma
- [x] **24 test, 4 suite** — hepsi para akışlarına odaklı (en yüksek risk):
  - `auth.test.ts`: register validasyonu (kısa şifre, geçersiz email, duplicate), login (yanlış şifre, banlı hesap, başarılı JWT)
  - `wallet.test.ts`: bakiye USD döner, deposit min tutar + Cryptomus yapılandırılmamışken 503, webhook imza doğrulanamayınca bakiye artmaz (200 döner ama sessizce reddeder), withdraw yetersiz bakiye/geçersiz ağ/atomik bakiye düşme
  - `listings-buy.test.ts`: yetersiz bakiye, kendi ilanını alamama, **başarılı satın almada iki tarafın bakiyesi + purchase/sale transaction çiftinin doğruluğu**, zaten satılmış ilanı tekrar satın alamama
  - `admin-withdrawals.test.ts`: admin olmayan 403, listeleme, complete (bakiyeye dokunmaz), reject (bakiye iadesi), zaten işlenmiş talebi tekrar işleme girişimi 400
- [ ] Kapsam dar — skins/favorites/reviews/notifications/steamAuth/admin (kullanıcı/ilan) route'ları hâlâ testsiz; e2e (Playwright) genişletilmedi

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
| **Otomatik para çekme (payout)** | Withdrawal: bakiye düşülür, coin transferi manuel (bilinçli ürün kararı — Cryptomus Payout API entegre edilmedi). |
| **Cryptomus canlı hesap + uçtan uca test** | Kod tamam (bkz. §3) ama `CRYPTOMUS_MERCHANT_ID`/`CRYPTOMUS_PAYMENT_API_KEY` boş — gerçek bir Cryptomus hesabı açılıp deposit→webhook→bakiye artışı akışı hiç test edilmedi. |
| **Domain + SSL** | Özel domain bağlanmamış. |
| **CD (otomatik deploy)** | CI var, push→deploy yok. İlk gerçek Vercel deploy denemesi yapıldı (`19f5f71` bunu düzeltti) ama otomatik pipeline kurulu değil. |
| **Canlı hesap bağlama** | Vercel/Railway/Atlas/CDN bucket — kod hazır, hesap/env senin adımın. |
| **Unit/integration test (backend) — kısmen** | `npm test` artık gerçek bir suite (bkz. §3 "Backend test altyapısı"), ama sadece en kritik para akışları (auth, wallet, listing satın alma, admin withdrawal) kapsanıyor — skins/favorites/reviews/notifications/steam/admin (kullanıcı-ilan) route'ları hâlâ testsiz. E2E hâlâ sadece FE smoke (mock API). |
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
8. npm audit: frontend'de 3, backend'de 19 açık kaldı (Cryptomus göçüyle `iyzipay` kaldırıldığında 17'ye düştü — güncel sayı doğrulanmalı) — hepsi breaking upgrade gerektiriyor (Next 16, ya da izole steamcommunity zinciri), bilinçli olarak ertelendi
9. **Cryptomus webhook'un backend'e ulaşabilmesi gerekir** — lokal geliştirmede `BACKEND_URL` dışarıdan erişilebilir olmalı (ngrok/tünel), aksi halde deposit hep `pending` kalır (webhook hiç gelmez)
10. Cryptomus Payout API entegre edilmedi (bilinçli, §4) — withdraw hâlâ tamamen manuel, admin coin'i kendi cüzdanından göndermeli. Takip için `/admin` → "Çekimler" sekmesi eklendi (bkz. §3) ama coin'in gerçekten gönderildiğini doğrulayan bir mekanizma yok — admin "Gönderildi İşaretle"ye bastığında sisteme güveniyoruz

---

## 6. Satın alma akışı — bugün nasıl çalışıyor?

**`STEAM_BOT_*` yapılandırılmamışsa (bugünkü canlı durum — bot hiç test edilmedi):**
```
Alıcı cüzdana para yatırır (Cryptomus, kripto ile — WIP, henüz gerçek hesapla test edilmedi)
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
         STEAM_API_KEY, CRYPTOMUS_MERCHANT_ID, CRYPTOMUS_PAYMENT_API_KEY, ADMIN_EMAILS,
         REDIS_URL?, SENTRY_DSN?, VAPID_* (push), STEAM_BOT_* (opsiyonel — trade bot, dördü de tanımlı değilse devre dışı)

Frontend: NEXT_PUBLIC_API_URL / backend URL, NEXT_PUBLIC_SITE_URL,
          NEXT_PUBLIC_CDN_URL?, NEXT_PUBLIC_SENTRY_DSN?, VAPID public
```

Detay: `README.md`, `docs/DEPLOY.md`, `backend/API_SETUP.md`, `docs/CDN.md`.

---

## 8. Öncelikli sonraki işler (önerilen sıra)

1. ~~**WIP'i temizle:** Steam auth'u güvenli hale getir; `test-deposit`'i kilitle; marka kararı.~~ ✅ **2026-08-17 tamamlandı**
2. ~~**Trade Offer sistemi** (asıl ürün eksigi) — bot veya Steam Web API trade.~~ ✅ **2026-08-17 kod tamamlandı** (emanet modeli, izole child process) — **ama gerçek Steam bot hesabıyla hiç test edilmedi**, canlıya almadan önce mutlaka sandbox/test bir hesapla uçtan uca doğrula.
3. ~~WIP + Trade Offer değişikliklerini commit'le.~~ ✅ **2026-08-17/18 commit edildi (`ee8afb4`) ve `origin/main`'e push edildi (`c4457fc`, 2026-08-20)**
4. **Cryptomus göçünü commit'le** (bkz. §3 "Ödeme sağlayıcı göçü") — henüz çalışma ağacında, typecheck/build de çalıştırılmadı.
5. **Cryptomus canlı hesap kur** ve `CRYPTOMUS_MERCHANT_ID`/`CRYPTOMUS_PAYMENT_API_KEY` ile küçük tutarlı gerçek bir kripto ödemesiyle deposit→webhook→bakiye akışını uçtan uca doğrula; withdraw akışını da test et.
6. Steam trade botu ertelendi (kullanıcı kararı, 2026-08-22) — bir süre sonra tekrar ele alınacak: **Steam hesabı bağlama** (mevcut user'a steamId link) + envanter satışı e2e doğrula, sonra **Steam trade bot hesabı kur** (ayrı Steam hesabı + Mobile Authenticator) ve `STEAM_BOT_*` ile uçtan uca test et.
7. ~~Bekleyen withdraw taleplerini admin'in takip edebileceği bir süreç/panel.~~ ✅ **2026-08-22 tamamlandı** (`/admin` → Çekimler sekmesi, bkz. §3) — henüz commit edilmedi.
8. Domain/SSL + CDN upload + CD.
9. README roadmap'ini bu dosyayla senkronla.

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

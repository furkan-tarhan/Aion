# Skin Görselleri — CDN (Cloudflare R2)

Önerilen çözüm: **Cloudflare R2** (S3 uyumlu, egress ücretsiz) + custom domain.

Uygulama tarafı hazır: `NEXT_PUBLIC_CDN_URL` tanımlıysa `/images/...` path'leri CDN'e yönlendirilir (`frontend/src/lib/cdn.ts`). Tanımsızsa görseller Vercel/lokal `public/` üzerinden servis edilmeye devam eder.

---

## 1) Cloudflare R2 bucket

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **R2** → **Create bucket**  
   Örn. isim: `loopskins-assets`
2. Bucket → **Settings** → **Public access** / **Custom Domains**  
   - Ya R2.dev public URL kullan  
   - Ya da kendi subdomain bağla: `cdn.senindomain.com` → bucket'a bağla (önerilen)
3. Not et: public base URL  
   Örn. `https://cdn.senindomain.com` veya `https://pub-xxxxx.r2.dev`

---

## 2) Dosyaları yükle

Bucket kökünde şu yapı olmalı (path'ler DB ile aynı):

```
/images/Asiimov.webp
/images/awp-dragonlore.png
...
/logo.png          (opsiyonel)
/icons/icon-192.png
/icons/icon-512.png
```

### Seçenek A — Wrangler (CLI)

```bash
# Bir kez: npm i -g wrangler && wrangler login
cd frontend

# images klasörünü bucket'a yükle (bucket adını kendi adınla değiştir)
npx wrangler r2 object put loopskins-assets/images/Asiimov.webp --file=public/images/Asiimov.webp --content-type=image/webp

# Toplu yükleme için aşağıdaki sync script'i kullan (S3 API + R2 API token)
```

### Seçenek B — Sync script (S3 API)

1. Cloudflare → R2 → **Manage R2 API Tokens** → Create API token (Object Read & Write).
2. Endpoint: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
3. Ortam değişkenlerini ayarla ve sync çalıştır:

```bash
cd frontend
# PowerShell örneği:
$env:R2_ACCOUNT_ID="..."
$env:R2_ACCESS_KEY_ID="..."
$env:R2_SECRET_ACCESS_KEY="..."
$env:R2_BUCKET="loopskins-assets"
$env:R2_PUBLIC_URL="https://cdn.senindomain.com"

npm run sync:cdn
```

Script `public/images`, `public/logo.png` ve `public/icons` dosyalarını R2'ye yükler; Cache-Control: `public, max-age=31536000, immutable`.

### Seçenek C — Dashboard upload

R2 bucket UI'dan `images/` klasörüne sürükle-bırak (az dosya için).

---

## 3) Frontend env

**Vercel** (veya lokal `.env`):

```env
NEXT_PUBLIC_CDN_URL=https://cdn.senindomain.com
```

Trailing slash olmadan yaz. Redeploy et (`NEXT_PUBLIC_*` build-time gömülür).

Doğrulama: tarayıcıda bir skin görseline sağ tık → "Open image" → URL `cdn...` olmalı.

---

## 4) Cache / CORS

- R2 custom domain Cloudflare üzerinden geldiği için edge cache otomatik.
- Bucket CORS (tarayıcıdan doğrudan fetch gerekirse):

```json
[
  {
    "AllowedOrigins": ["https://senin-vercel-domain.vercel.app", "http://localhost:3000"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 86400
  }
]
```

`<img>` / `next/image` için genelde CORS gerekmez; sadece canvas/fetch kullanırsan gerekir.

---

## 5) Alternatif: AWS S3 + CloudFront

Aynı `NEXT_PUBLIC_CDN_URL` modeli çalışır. Sync script R2 endpoint yerine S3 endpoint ile de kullanılabilir (`AWS_REGION`, klasik S3 credentials). CloudFront distribution origin = S3 bucket, CDN URL = CloudFront domain.

---

## Notlar

- DB'deki `image` alanları **göreli** kalır (`/images/...`) — seed değişmez.
- CDN kapalıyken (`NEXT_PUBLIC_CDN_URL` boş) her şey eskisi gibi `public/` üzerinden çalışır.
- Boşluklu dosya adları (`Hyper Beast.webp`) `cdnUrl` içinde encode edilir.

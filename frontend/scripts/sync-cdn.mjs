/**
 * public/images (+ logo, icons) → Cloudflare R2 / S3 uyumlu bucket.
 *
 * Gerekli env:
 *   R2_ACCOUNT_ID (veya AWS_ENDPOINT_URL_S3 tam endpoint)
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET
 *
 * Opsiyonel:
 *   R2_PUBLIC_URL  — yükleme sonrası örnek CDN URL yazdırır
 *   AWS_REGION     — varsayılan "auto" (R2)
 *
 * Kullanım: npm run sync:cdn
 */

import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET || process.env.AWS_S3_BUCKET;
const publicUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
const endpoint =
  process.env.AWS_ENDPOINT_URL_S3 ||
  (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);
const region = process.env.AWS_REGION || 'auto';

if (!accessKeyId || !secretAccessKey || !bucket || !endpoint) {
  console.error(`
Eksik env. Gerekli:
  R2_ACCOUNT_ID (veya AWS_ENDPOINT_URL_S3)
  R2_ACCESS_KEY_ID
  R2_SECRET_ACCESS_KEY
  R2_BUCKET

Örnek (PowerShell):
  $env:R2_ACCOUNT_ID="..."
  $env:R2_ACCESS_KEY_ID="..."
  $env:R2_SECRET_ACCESS_KEY="..."
  $env:R2_BUCKET="zade-assets"
  npm run sync:cdn
`);
  process.exit(1);
}

const CONTENT_TYPES = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const client = new S3Client({
  region,
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
});

const roots = ['images', 'icons'].map((d) => join(PUBLIC_DIR, d)).filter(existsSync);
const singles = ['logo.png', 'favicon.ico']
  .map((f) => join(PUBLIC_DIR, f))
  .filter(existsSync);

const files = [...roots.flatMap(walk), ...singles];

if (!files.length) {
  console.error('Yüklenecek dosya bulunamadı (public/images vb.).');
  process.exit(1);
}

console.log(`Yükleniyor → ${bucket} (${endpoint}), ${files.length} dosya`);

let ok = 0;
for (const file of files) {
  const key = relative(PUBLIC_DIR, file).split('\\').join('/');
  const ext = extname(file).toLowerCase();
  const ContentType = CONTENT_TYPES[ext] || 'application/octet-stream';

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: createReadStream(file),
      ContentType,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );
  ok += 1;
  const preview = publicUrl
    ? `${publicUrl}/${key.split('/').map(encodeURIComponent).join('/')}`
    : key;
  console.log(`  ✓ ${key}${publicUrl ? ` → ${preview}` : ''}`);
}

console.log(`\nBitti: ${ok}/${files.length} dosya.`);
if (publicUrl) {
  console.log(`Vercel env: NEXT_PUBLIC_CDN_URL=${publicUrl}`);
}

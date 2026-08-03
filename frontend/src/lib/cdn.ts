/**
 * Skin / statik görseller için CDN URL çözümleyici.
 *
 * DB ve seed verisi göreli path tutar (`/images/Asiimov.webp`).
 * `NEXT_PUBLIC_CDN_URL` tanımlıysa (örn. https://cdn.zade.app) bu path CDN'e yönlendirilir;
 * tanımsızsa aynı origin'den (`/images/...`) servis edilir — lokal / Docker bozulmaz.
 */

const CDN_BASE = (process.env.NEXT_PUBLIC_CDN_URL || '').replace(/\/$/, '');

/** CDN'e taşınabilir asset path'leri (logo, ikonlar, skin görselleri). */
export function isCdnAssetPath(path: string): boolean {
  if (!path || path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return false;
  }
  const p = path.startsWith('/') ? path : `/${path}`;
  return (
    p.startsWith('/images/') ||
    p.startsWith('/icons/') ||
    p === '/logo.png' ||
    p === '/favicon.ico'
  );
}

/**
 * Göreli asset path'ini CDN (veya lokal) mutlak/göreli URL'ye çevirir.
 * Zaten absolute URL ise olduğu gibi döner.
 */
export function cdnUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (CDN_BASE && isCdnAssetPath(normalized)) {
    // Path segment'lerini encode et (boşluk / unicode dosya adları: "Hyper Beast.webp")
    const encoded = normalized
      .split('/')
      .map((seg, i) => (i === 0 ? '' : encodeURIComponent(seg)))
      .join('/');
    return `${CDN_BASE}${encoded.startsWith('/') ? encoded : `/${encoded}`}`;
  }
  return normalized;
}

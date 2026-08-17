'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from '@/i18n/navigation';
import Navbar from '@/components/Navbar';
import { skinsApi, listingsApi } from '@/lib/api';
import { cdnUrl } from '@/lib/cdn';

export default function HomeClient() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [popularListings, setPopularListings] = useState<any[]>([]);
  const searchRef = useRef<HTMLFormElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchPopularListings = async () => {
      try {
        const res = await listingsApi.getAll({ limit: 4, sort: 'newest' });
        if (res.success) {
          setPopularListings(res.data);
        }
      } catch (error) {
        console.error('Failed to fetch popular listings:', error);
      }
    };
    fetchPopularListings();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.trim().length >= 2) {
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await skinsApi.search(searchQuery.trim());
          if (res.success) {
            setSearchResults(res.data);
            setShowResults(true);
          }
        } catch (error) {
          console.error("Arama hatası:", error);
        }
      }, 300);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      setShowResults(false);
      router.push(`/market?search=${encodeURIComponent(q)}` as any);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navbar />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative px-6 py-24 md:py-40 w-full flex flex-col items-center text-center overflow-hidden border-b border-white/5">
          {/* 3D Background */}
          <div className="absolute inset-0 z-0">
            <img src="/hero-3d-bg.jpg" alt="3D Background" className="w-full h-full object-cover opacity-60 object-center" style={{ filter: 'contrast(1.2) brightness(0.8)' }} />
            <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-transparent to-background"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
          </div>

          <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center">
            {/* Subtle Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[150px] pointer-events-none"></div>

            <h1 className="text-5xl md:text-7xl font-bold mb-10 tracking-tight text-foreground drop-shadow-2xl">
              CS2 Envanterini <br className="hidden md:block"/>
              <span className="text-accent drop-shadow-[0_0_25px_rgba(233,188,28,0.4)]">Şimdi Yükselt!</span>
            </h1>

            {/* Search Bar & Autocomplete */}
            <form ref={searchRef} onSubmit={handleSearch} className="relative w-full max-w-3xl flex flex-col gap-2 drop-shadow-2xl">
              <div className="flex gap-2 w-full">
                <input
                  type="text"
                  placeholder="Ne arıyorsun? (Örn: Asiimov, Doppler)"
                  className="flex-grow bg-surface border border-border rounded-lg py-4 px-6 text-foreground focus:outline-none focus:border-accent transition-colors shadow-lg"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
                />
                <button type="submit" className="bg-accent text-[#191816] font-bold py-4 px-8 rounded-lg hover:bg-accentHover transition-colors shadow-lg">
                  Ara
                </button>
              </div>

              {/* Autocomplete Dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-lg shadow-xl overflow-hidden z-50 max-h-[400px] overflow-y-auto">
                  {searchResults.map((skin) => (
                    <div 
                      key={skin.id}
                      onClick={() => {
                        setSearchQuery(skin.name);
                        setShowResults(false);
                        router.push(`/market?search=${encodeURIComponent(skin.name)}` as any);
                      }}
                      className="flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer border-b border-border/50 last:border-0 transition-colors"
                    >
                      <div className="w-16 h-12 bg-background rounded flex items-center justify-center p-1">
                        <img src={cdnUrl(skin.image)} alt={skin.name} className="max-w-full max-h-full object-contain" />
                      </div>
                      <div className="flex flex-col items-start text-left">
                        <span className="font-semibold text-foreground text-sm">{skin.weapon} | {skin.name}</span>
                        <span className="text-xs text-muted">{skin.category}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </form>
          </div>
        </section>

        {/* Stat Cards */}
        <section className="px-6 pb-20 max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface border border-border rounded-xl p-6 text-center shadow-md">
              <div className="text-3xl font-bold text-foreground mb-1">143K+</div>
              <div className="text-sm text-muted font-medium">Aktif İlan</div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-6 text-center shadow-md">
              <div className="text-3xl font-bold text-foreground mb-1">2M+</div>
              <div className="text-sm text-muted font-medium">Başarılı Takas</div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-6 text-center shadow-md">
              <div className="text-3xl font-bold text-accent mb-1">%0</div>
              <div className="text-sm text-muted font-medium">Gizli Ücret</div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-6 text-center shadow-md">
              <div className="text-3xl font-bold text-foreground mb-1">7/24</div>
              <div className="text-sm text-muted font-medium">Canlı Destek</div>
            </div>
          </div>
        </section>

        {/* Popular Skins Carousel */}
        <section className="px-6 pb-24 max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-8">
            <h2 className="text-3xl font-bold">Popüler Skinler</h2>
            <button onClick={() => router.push('/market' as any)} className="text-accent font-semibold hover:underline">
              Tümünü Gör
            </button>
          </div>
          
          {/* Horizontal Scroll Container */}
          <div className="flex gap-4 overflow-x-auto pb-6 snap-x hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
            {popularListings.length > 0 ? (
              popularListings.map((listing) => (
                <div 
                  key={listing._id}
                  onClick={() => router.push(`/market?search=${encodeURIComponent(listing.title)}` as any)}
                  className="min-w-[240px] bg-surface rounded-xl p-5 border border-border hover:border-accent transition-colors snap-start cursor-pointer group flex flex-col"
                >
                    <div className="h-32 bg-background rounded-lg mb-4 flex items-center justify-center p-2">
                        <img src={cdnUrl(listing.skin?.image)} alt={listing.title} className="max-h-full max-w-full object-contain drop-shadow-lg" />
                    </div>
                    <div className="text-xs text-accent font-bold mb-1">{listing.skin?.rarity || 'CS2 Skin'}</div>
                    <div className="font-bold text-sm truncate mb-1 group-hover:text-accent transition-colors">{listing.title}</div>
                    <div className="text-lg font-bold mt-auto pt-3 text-foreground">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: listing.currency || 'TRY' }).format(listing.price)}</div>
                    <div className="mt-4 bg-background text-center py-2 rounded font-semibold text-sm group-hover:bg-accent group-hover:text-[#191816] transition-colors">Hemen Al</div>
                </div>
              ))
            ) : (
              <div className="text-muted w-full text-center py-10">
                Şu an aktif ilan bulunmuyor.
              </div>
            )}
          </div>
        </section>

        {/* Mode Features */}
        <section className="px-6 pb-24 max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-10 text-center">Nasıl Çalışır?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface border border-border p-8 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-accent/10 rounded-full blur-3xl group-hover:bg-accent/20 transition-colors"></div>
              <h3 className="text-2xl font-bold mb-4 relative z-10 text-foreground">Takas Modu</h3>
              <p className="text-muted mb-6 relative z-10">
                Mevcut skinlerini ver, karşılığında yenilerini anında al. Bekleme yok, karmaşa yok.
              </p>
              <ul className="space-y-3 text-sm font-medium text-foreground relative z-10">
                <li className="flex items-center gap-2"><span className="text-accent">✓</span> Botlarla 7/24 Anında İşlem</li>
                <li className="flex items-center gap-2"><span className="text-accent">✓</span> Güvenli ve Hızlı</li>
                <li className="flex items-center gap-2"><span className="text-accent">✓</span> Tüm popüler itemler stokta</li>
              </ul>
            </div>
            
            <div className="bg-surface border border-border p-8 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors"></div>
              <h3 className="text-2xl font-bold mb-4 relative z-10 text-foreground">Market Modu</h3>
              <p className="text-muted mb-6 relative z-10">
                Skinleri %40'a varan indirimlerle satın al veya anında satıp bakiyeni banka hesabına çek.
              </p>
              <ul className="space-y-3 text-sm font-medium text-foreground relative z-10">
                <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> %40'a Varan İndirimler</li>
                <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> Kripto & Kredi Kartı</li>
                <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> Hızlı Nakit Çekimi</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="px-6 pb-24 max-w-7xl mx-auto">
          <div className="bg-accent rounded-2xl p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8 text-[#191816] shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Envanterindeki Çöpleri Efsanelere Dönüştür!</h2>
              <p className="text-[#3b2600] font-medium text-lg max-w-xl">
                LoopSkins ile skinlerini %35 daha ucuza yenile. Hemen giriş yap ve sürpriz bonusunu kap!
              </p>
            </div>
            <button className="bg-[#191816] text-white px-10 py-4 rounded-lg text-lg font-bold hover:bg-black transition-colors z-10 whitespace-nowrap shadow-xl">
              Ticarete Başla
            </button>
          </div>
        </section>

      </main>

      {/* Footer (Simple Placeholder to show rebranded footer) */}
      <footer className="bg-surface border-t border-border py-12 px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-accent text-[#191816] flex items-center justify-center rounded-md font-bold text-xl">L</div>
                <span className="text-xl font-bold text-foreground">LoopSkins</span>
            </div>
            <p className="text-muted text-sm">© 2026 LoopSkins. Tüm hakları saklıdır.</p>
        </div>
      </footer>

    </div>
  );
}

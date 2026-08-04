'use client';

import { useState, useRef } from 'react';
import { useRouter } from '@/i18n/navigation';
import Navbar from '@/components/Navbar';
import BuyMenuWheel from '@/components/BuyMenuWheel';
import ListingTicker from '@/components/ListingTicker';

// ─── Mobile categories ────────────────────────────────────────────────────────
const MOBILE_CATS = [
  { id: 'rifles',  label: 'Tüfekler',       icon: '🔫', href: '/market?category=rifles'  },
  { id: 'pistols', label: 'Tabancalar',      icon: '🔧', href: '/market?category=pistols' },
  { id: 'smg',     label: 'SMG',             icon: '⚡', href: '/market?category=smg'     },
  { id: 'heavy',   label: 'Ağır Silahlar',   icon: '💥', href: '/market?category=heavy'   },
  { id: 'knives',  label: 'Bıçak & Eldiven', icon: '🔪', href: '/market?category=knives'  },
  { id: 'cases',   label: 'Kasa & Diğer',    icon: '📦', href: '/market'                  },
];

export default function HomeClient() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) router.push(`/market?search=${encodeURIComponent(q)}` as any);
  };

  return (
    <>
      {/* ── Fixed full-viewport shell ───────────────────────────────────────── */}
      <div className="fixed inset-0 overflow-hidden bg-black">

        {/* CS2 Map Background */}
        <div
          aria-hidden
          className="absolute inset-0 scale-105"
          style={{
            backgroundImage: "url('/images/bg-cs2-map.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center 40%',
            filter: 'blur(4px) brightness(0.28) saturate(0.6)',
          }}
        />
        {/* Vignette overlay */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 30%, rgba(0,0,0,0.75) 100%)',
          }}
        />
        {/* Bottom gradient for ticker readability */}
        <div
          aria-hidden
          className="absolute bottom-0 left-0 right-0 h-32"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}
        />

        {/* ── Navbar (sits on top, transparent-ish) ────────────────────────── */}
        <div className="relative z-30">
          <Navbar />
        </div>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div className="absolute inset-0 z-10 flex flex-col" style={{ paddingTop: '64px' }}>

          {/* Search bar — desktop only, centered at top */}
          <div className="hidden md:flex justify-center pt-4 pb-2 px-4">
            <form onSubmit={handleSearch} className="relative w-full max-w-sm group">
              <div
                className="flex items-center gap-2 rounded px-4 py-2 transition-all duration-200 group-focus-within:bg-black/50"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {/* CS2-style crosshair icon */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                  <circle cx="12" cy="12" r="8" stroke="#5a6373" strokeWidth="1.5"/>
                  <line x1="12" y1="4" x2="12" y2="8"  stroke="#5a6373" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="12" y1="16" x2="12" y2="20" stroke="#5a6373" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="4"  y1="12" x2="8"  y2="12" stroke="#5a6373" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="16" y1="12" x2="20" y2="12" stroke="#5a6373" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Skin, silah veya kategori ara..."
                  className="flex-1 bg-transparent outline-none text-xs tracking-wide placeholder-gray-600 text-gray-300"
                  style={{ fontFamily: "'Rajdhani','Arial Narrow',sans-serif", letterSpacing: '0.08em' }}
                />
                {searchQuery && (
                  <button
                    type="submit"
                    className="text-[10px] tracking-widest text-gray-400 hover:text-gray-200 font-mono transition-colors"
                  >
                    ARA
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* CS2 title text */}
          <div className="hidden md:block text-center pb-1">
            <p
              className="text-[9px] tracking-[0.45em] font-mono uppercase"
              style={{ color: 'rgba(90,99,115,0.8)' }}
            >
              Zade Market — Silah Seç
            </p>
          </div>

          {/* ── DESKTOP: BuyMenuWheel ─────────────────────────────────────── */}
          <div className="hidden md:flex flex-1 items-center justify-center px-4 overflow-hidden">
            <BuyMenuWheel />
          </div>

          {/* ── MOBILE: Steam-style grid ──────────────────────────────────── */}
          <div className="md:hidden flex-1 overflow-y-auto px-4 pt-4 pb-4">
            {/* Mobile search */}
            <form onSubmit={handleSearch} className="mb-4">
              <div
                className="flex items-center gap-2 rounded px-3 py-2"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="#5a6373" strokeWidth="1.8"/>
                  <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="#5a6373" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Skin ara..."
                  className="flex-1 bg-transparent outline-none text-sm text-gray-300 placeholder-gray-600"
                />
              </div>
            </form>

            {/* Category grid */}
            <div className="grid grid-cols-2 gap-3">
              {MOBILE_CATS.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => router.push(cat.href as any)}
                  className="flex items-center gap-3 p-4 rounded text-left transition-all active:scale-95 hover:brightness-110"
                  style={{
                    background: 'rgba(20, 24, 30, 0.85)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <div>
                    <div className="text-xs font-bold text-gray-200 uppercase tracking-wide">
                      {cat.label}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Skinleri gör →</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Mobile market link */}
            <button
              onClick={() => router.push('/market' as any)}
              className="mt-4 w-full py-3 text-center text-xs tracking-widest font-mono uppercase text-gray-400 rounded transition-all active:scale-98"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              Tüm Pazarı Gör →
            </button>
          </div>

          {/* ── Listing ticker (both desktop & mobile) ────────────────────── */}
          <div className="relative z-20">
            <ListingTicker />
          </div>
        </div>
      </div>
    </>
  );
}

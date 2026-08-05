'use client';

import { useState, useRef } from 'react';
import { useRouter } from '@/i18n/navigation';
import Navbar from '@/components/Navbar';
import BuyMenuWheel from '@/components/BuyMenuWheel';
import ListingTicker from '@/components/ListingTicker';

const MOBILE_CATS = [
  { id: 'rifles',  label: 'Tüfekler',       href: '/market?category=rifles'  },
  { id: 'pistols', label: 'Tabancalar',      href: '/market?category=pistols' },
  { id: 'smg',     label: 'SMG',             href: '/market?category=smg'     },
  { id: 'heavy',   label: 'Ağır Silahlar',   href: '/market?category=heavy'   },
  { id: 'knives',  label: 'Bıçak & Eldiven', href: '/market?category=knives'  },
  { id: 'cases',   label: 'Kasa & Diğer',    href: '/market'                  },
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
      <div className="fixed inset-0 overflow-hidden" style={{ background: '#000000' }}>

        {/* ── Vercel-style radial glow behind the wheel ─────────────────────── */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 55% 55% at 50% 48%,
                rgba(255,255,255,0.035) 0%,
                rgba(255,255,255,0.012) 35%,
                rgba(0,0,0,0) 70%
              )
            `,
          }}
        />

        {/* ── Subtle noise texture overlay ─────────────────────────────────── */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* ── Navbar ──────────────────────────────────────────────────────────*/}
        <div className="relative z-30">
          <Navbar />
        </div>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div className="absolute inset-0 z-10 flex flex-col" style={{ paddingTop: '64px' }}>



          {/* ─ Desktop: BuyMenuWheel ─ */}
          <div className="hidden md:flex flex-1 items-center justify-center px-4 overflow-hidden">
            <BuyMenuWheel />
          </div>

          {/* ─ Mobile: minimal grid ─ */}
          <div className="md:hidden flex-1 overflow-y-auto px-4 pt-4 pb-4">
            {/* Mobile search */}
            <form onSubmit={handleSearch} className="mb-5">
              <div
                className="flex items-center gap-2 rounded-md px-3 py-2.5"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <circle cx="7" cy="7" r="5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
                  <line x1="11" y1="11" x2="15" y2="15" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Skin ara..."
                  className="flex-1 bg-transparent outline-none text-sm text-white/60 placeholder-white/20"
                />
              </div>
            </form>

            {/* Category grid (Vercel card style) */}
            <div className="grid grid-cols-2 gap-2">
              {MOBILE_CATS.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => router.push(cat.href as any)}
                  className="flex items-center justify-between p-4 rounded-md text-left transition-all duration-200 active:scale-[0.98] hover:border-white/20 group"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <span
                    className="text-[11px] font-medium tracking-wide uppercase text-white/50 group-hover:text-white/80 transition-colors"
                    style={{ fontFamily: "'Inter','Helvetica Neue',sans-serif" }}
                  >
                    {cat.label}
                  </span>
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="text-white/20 group-hover:text-white/50 transition-colors">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              ))}
            </div>

            <button
              onClick={() => router.push('/market' as any)}
              className="mt-3 w-full py-3 text-center text-[10px] tracking-[0.3em] font-mono uppercase text-white/25 hover:text-white/50 transition-colors rounded-md"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            >
              Tüm Pazarı Gör
            </button>
          </div>

          {/* ─ Listing ticker ─ */}
          <div className="relative z-20">
            <ListingTicker />
          </div>
        </div>
      </div>
    </>
  );
}

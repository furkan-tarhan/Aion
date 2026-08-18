'use client';

import { useState, useCallback } from 'react';
import { useRouter } from '@/i18n/navigation';

// ─── SVG Constants ────────────────────────────────────────────────────────────
const CX = 250;
const CY = 250;
const OUTER_R = 212;
const INNER_R = 52;
const TEXT_R   = 145;
const NUM_R    = 70;
const GAP_DEG  = 3.2; // larger gap = softer, more breathing room

// ─── Fixed angle slots ────────────────────────────────────────────────────────
const ANGLE_SLOTS = [
  { start: 300, end: 360 }, // 0: upper-left
  { start: 0,   end: 60  }, // 1: upper-right
  { start: 60,  end: 120 }, // 2: right
  { start: 120, end: 180 }, // 3: lower-right
  { start: 180, end: 240 }, // 4: lower-left
  { start: 240, end: 300 }, // 5: left
];

// ─── Data ─────────────────────────────────────────────────────────────────────
interface Item {
  id: string;
  lines: string[];
  href?: string;
  isOthers?: boolean;
}
interface Category extends Item {
  subItems: Item[];
}

const CATEGORIES: Category[] = [
  {
    id: 'rifles', lines: ['TÜFEKler'],
    subItems: [
      { id: 'ak-47',  lines: ['AK-47'],   href: '/market?weapon=ak-47'  },
      { id: 'm4a4',   lines: ['M4A4'],    href: '/market?weapon=m4a4'   },
      { id: 'm4a1-s', lines: ['M4A1-S'],  href: '/market?weapon=m4a1-s' },
      { id: 'awp',    lines: ['AWP'],     href: '/market?weapon=awp'    },
      { id: 'ssg-08', lines: ['SSG 08'],  href: '/market?weapon=ssg-08' },
      { id: 'others', lines: ['DİĞER', 'TÜFEKler'], href: '/market?category=rifles', isOthers: true },
    ],
  },
  {
    id: 'pistols', lines: ['TABANCA'],
    subItems: [
      { id: 'deagle',     lines: ['Desert', 'Eagle'],  href: '/market?weapon=desert-eagle' },
      { id: 'usp-s',      lines: ['USP-S'],            href: '/market?weapon=usp-s'        },
      { id: 'glock-18',   lines: ['Glock-18'],         href: '/market?weapon=glock-18'     },
      { id: 'p250',       lines: ['P250'],             href: '/market?weapon=p250'         },
      { id: 'five-seven', lines: ['Five-SeveN'],       href: '/market?weapon=five-seven'   },
      { id: 'others',     lines: ['DİĞER', 'TABANCA'], href: '/market?category=pistols', isOthers: true },
    ],
  },
  {
    id: 'smg', lines: ['SMG'],
    subItems: [
      { id: 'mp9',    lines: ['MP9'],    href: '/market?weapon=mp9'    },
      { id: 'mac-10', lines: ['MAC-10'], href: '/market?weapon=mac-10' },
      { id: 'p90',    lines: ['P90'],    href: '/market?weapon=p90'    },
      { id: 'ump-45', lines: ['UMP-45'], href: '/market?weapon=ump-45' },
      { id: 'mp5-sd', lines: ['MP5-SD'], href: '/market?weapon=mp5-sd' },
      { id: 'others', lines: ['DİĞER', 'SMG'], href: '/market?category=smg', isOthers: true },
    ],
  },
  {
    id: 'heavy', lines: ['AĞIR'],
    subItems: [
      { id: 'nova',   lines: ['Nova'],   href: '/market?weapon=nova'   },
      { id: 'xm1014', lines: ['XM1014'], href: '/market?weapon=xm1014' },
      { id: 'mag-7',  lines: ['MAG-7'],  href: '/market?weapon=mag-7'  },
      { id: 'm249',   lines: ['M249'],   href: '/market?weapon=m249'   },
      { id: 'negev',  lines: ['Negev'],  href: '/market?weapon=negev'  },
      { id: 'others', lines: ['DİĞER', 'AĞIR'], href: '/market?category=heavy', isOthers: true },
    ],
  },
  {
    id: 'knives', lines: ['BIÇAK &', 'ELDİVEN'],
    subItems: [
      { id: 'karambit',   lines: ['Karambit'],   href: '/market?weapon=karambit'       },
      { id: 'butterfly',  lines: ['Butterfly'],  href: '/market?weapon=butterfly-knife' },
      { id: 'm9-bayonet', lines: ['M9 Bayonet'], href: '/market?weapon=m9-bayonet'     },
      { id: 'skeleton',   lines: ['Skeleton'],   href: '/market?weapon=skeleton-knife'  },
      { id: 'gloves',     lines: ['Eldiven'],    href: '/market?category=gloves'        },
      { id: 'others',     lines: ['DİĞER', 'BIÇAK'], href: '/market?category=knives', isOthers: true },
    ],
  },
  {
    id: 'cases', lines: ['KASA &', 'DİĞER'],
    subItems: [
      { id: 'kasalar', lines: ['Kasalar'],    href: '/market?type=case'      },
      { id: 'muzik',   lines: ['Müzik Kiti'], href: '/market?type=music-kit' },
      { id: 'sticker', lines: ['Sticker'],    href: '/market?type=sticker'   },
      { id: 'ajan',    lines: ['Ajan'],       href: '/cs2/skins/agents'       },
      { id: 'pin',     lines: ['Pin'],        href: '/market?type=pin'        },
      { id: 'others',  lines: ['DİĞERLERİ'], href: '/market', isOthers: true },
    ],
  },
];

// ─── SVG Helpers ──────────────────────────────────────────────────────────────
function polar(r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function buildPath(startAngle: number, endAngle: number): string {
  const s  = startAngle + GAP_DEG;
  const e  = endAngle  - GAP_DEG;
  const so = polar(OUTER_R, s);
  const eo = polar(OUTER_R, e);
  const si = polar(INNER_R, s);
  const ei = polar(INNER_R, e);
  const lg = e - s > 180 ? 1 : 0;
  const f  = (n: number) => n.toFixed(2);
  return [
    `M ${f(si.x)} ${f(si.y)}`,
    `L ${f(so.x)} ${f(so.y)}`,
    `A ${OUTER_R} ${OUTER_R} 0 ${lg} 1 ${f(eo.x)} ${f(eo.y)}`,
    `L ${f(ei.x)} ${f(ei.y)}`,
    `A ${INNER_R} ${INNER_R} 0 ${lg} 0 ${f(si.x)} ${f(si.y)}`,
    'Z',
  ].join(' ');
}

function midPoint(slotIdx: number, r: number) {
  const { start, end } = ANGLE_SLOTS[slotIdx];
  return polar(r, (start + end) / 2);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function BuyMenuWheel() {
  const router = useRouter();
  const [hoveredSlot, setHoveredSlot]     = useState<number | null>(null);
  const [selectedCat, setSelectedCat]     = useState<string | null>(null);
  const [hoveredCenter, setHoveredCenter] = useState(false);
  const [fading, setFading]               = useState(false);

  const currentItems: Item[] = selectedCat
    ? (CATEGORIES.find(c => c.id === selectedCat)?.subItems ?? [])
    : CATEGORIES;

  const transition = useCallback((fn: () => void) => {
    setFading(true);
    setTimeout(() => { fn(); setFading(false); }, 160);
  }, []);

  const handleSegmentClick = useCallback((item: Item) => {
    if (!selectedCat) {
      transition(() => setSelectedCat((item as Category).id));
    } else if (item.href) {
      router.push(item.href as any);
    }
  }, [selectedCat, router, transition]);

  const handleCenterClick = useCallback(() => {
    if (selectedCat) {
      transition(() => setSelectedCat(null));
    } else {
      router.push('/cs2/skins/agents' as any);
    }
  }, [selectedCat, router, transition]);

  const activeCat = CATEGORIES.find(c => c.id === selectedCat);

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full">

      {/* Breadcrumb */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 text-[9px] tracking-[0.5em] font-mono uppercase transition-all duration-300"
        style={{ color: 'rgba(255,255,255,0.3)', opacity: selectedCat ? 1 : 0, whiteSpace: 'nowrap' }}
      >
        {activeCat?.lines.join(' ')} &rsaquo; SEÇİN
      </div>

      <svg
        viewBox="0 0 500 500"
        className="w-full h-full select-none"
        style={{ maxWidth: 'min(68vh, 68vw)' }}
      >
        <defs>
          {/* Vercel-style white glow — blurs the segment shape into a halo */}
          <filter id="halo" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="12" result="blur" />
          </filter>
          {/* Slight soften for segment edges */}
          <filter id="soften" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation="0.6" />
          </filter>
          {/* Center ring glow */}
          <filter id="ring-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* ── Outer rings (monochromatic) ── */}
        <circle cx={CX} cy={CY} r={OUTER_R + 6} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        <circle cx={CX} cy={CY} r={OUTER_R + 2} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />

        {/* ── Segments ── */}
        <g style={{ opacity: fading ? 0 : 1, transition: 'opacity 0.16s ease' }}>
          {ANGLE_SLOTS.map((slot, idx) => {
            const item = currentItems[idx];
            if (!item) return null;
            const hov  = hoveredSlot === idx;
            const path = buildPath(slot.start, slot.end);
            const tp   = midPoint(idx, TEXT_R);
            const np   = midPoint(idx, NUM_R);

            return (
              <g
                key={item.id}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredSlot(idx)}
                onMouseLeave={() => setHoveredSlot(null)}
                onClick={() => handleSegmentClick(item)}
              >
                {/* ── Vercel-style white halo glow (renders behind segment) ── */}
                {hov && (
                  <path
                    d={path}
                    fill="rgba(255,255,255,0.18)"
                    filter="url(#halo)"
                  />
                )}

                {/* ── Segment body (softened edges) ── */}
                <path
                  d={path}
                  fill={hov ? 'rgba(22,22,22,0.98)' : 'rgba(10,10,10,0.96)'}
                  stroke={hov ? 'rgba(255,255,255,0.14)' : 'rgba(35,35,35,0.9)'}
                  strokeWidth={hov ? '1' : '0.5'}
                  filter="url(#soften)"
                  style={{ transition: 'fill 0.15s, stroke 0.15s' }}
                />

                {/* ── Outer edge bright line on hover (Vercel border light) ── */}
                {hov && (
                  <path
                    d={path}
                    fill="none"
                    stroke="rgba(255,255,255,0.55)"
                    strokeWidth="1.2"
                  />
                )}

                {/* ── Slot number ── */}
                <text
                  x={np.x} y={np.y}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize="9"
                  fill={hov ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.07)'}
                  fontFamily="'Courier New', monospace"
                  style={{ userSelect: 'none', transition: 'fill 0.15s' }}
                >
                  {idx + 1}
                </text>

                {/* ── Label text ── */}
                {item.lines.map((line, li) => {
                  const lc = item.lines.length;
                  const lh = 16;
                  const dy = -((lc - 1) * lh) / 2 + li * lh;
                  return (
                    <text
                      key={li}
                      x={tp.x}
                      y={tp.y + dy}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={item.isOthers ? 10.5 : 12.5}
                      fontWeight="600"
                      letterSpacing="2"
                      fontFamily="'Inter','Helvetica Neue','Arial',sans-serif"
                      fill={
                        item.isOthers
                          ? (hov ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.2)')
                          : (hov ? '#ffffff' : 'rgba(255,255,255,0.38)')
                      }
                      style={{
                        userSelect: 'none',
                        transition: 'fill 0.15s',
                        textShadow: hov ? '0 0 20px rgba(255,255,255,0.6)' : 'none',
                      }}
                    >
                      {line.toUpperCase()}
                    </text>
                  );
                })}
              </g>
            );
          })}
        </g>

        {/* ── Center CT/T emblem (monochromatic) ── */}
        <g
          style={{ cursor: 'pointer' }}
          onMouseEnter={() => setHoveredCenter(true)}
          onMouseLeave={() => setHoveredCenter(false)}
          onClick={handleCenterClick}
        >
          {/* Halo on center hover */}
          {hoveredCenter && (
            <circle
              cx={CX} cy={CY} r={INNER_R}
              fill="rgba(255,255,255,0.1)"
              filter="url(#halo)"
            />
          )}
          {/* Background */}
          <circle cx={CX} cy={CY} r={INNER_R - 1} fill="#080808" />

          {/* CT left half */}
          <path
            d={`M ${CX} ${CY - INNER_R + 2} A ${INNER_R - 2} ${INNER_R - 2} 0 0 0 ${CX} ${CY + INNER_R - 2} Z`}
            fill={hoveredCenter ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)'}
            style={{ transition: 'fill 0.15s' }}
          />
          {/* T right half */}
          <path
            d={`M ${CX} ${CY - INNER_R + 2} A ${INNER_R - 2} ${INNER_R - 2} 0 0 1 ${CX} ${CY + INNER_R - 2} Z`}
            fill={hoveredCenter ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)'}
            style={{ transition: 'fill 0.15s' }}
          />
          {/* Divider */}
          <line
            x1={CX} y1={CY - INNER_R + 3}
            x2={CX} y2={CY + INNER_R - 3}
            stroke="rgba(255,255,255,0.08)" strokeWidth="1"
          />

          {/* CT text */}
          <text
            x={CX - 13} y={CY}
            textAnchor="middle" dominantBaseline="central"
            fontSize="9.5" fontWeight="600" letterSpacing="0.5"
            fontFamily="'Courier New', monospace"
            fill={hoveredCenter ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.22)'}
            style={{ userSelect: 'none', transition: 'fill 0.15s' }}
          >CT</text>

          {/* T text */}
          <text
            x={CX + 14} y={CY}
            textAnchor="middle" dominantBaseline="central"
            fontSize="11" fontWeight="600"
            fontFamily="'Courier New', monospace"
            fill={hoveredCenter ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.3)'}
            style={{ userSelect: 'none', transition: 'fill 0.15s' }}
          >T</text>

          {/* Border ring */}
          <circle
            cx={CX} cy={CY} r={INNER_R}
            fill="none"
            stroke={hoveredCenter ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)'}
            strokeWidth={hoveredCenter ? '1.5' : '1'}
            filter={hoveredCenter ? 'url(#ring-glow)' : 'none'}
            style={{ transition: 'stroke 0.15s, stroke-width 0.15s' }}
          />

          {/* Sub label */}
          {selectedCat ? (
            <text
              x={CX} y={CY + INNER_R + 14}
              textAnchor="middle" fontSize="8"
              fill={hoveredCenter ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.15)'}
              fontFamily="'Courier New', monospace" letterSpacing="2"
              style={{ userSelect: 'none', transition: 'fill 0.15s' }}
            >← GERİ</text>
          ) : (
            <text
              x={CX} y={CY + INNER_R + 14}
              textAnchor="middle" fontSize="8"
              fill={hoveredCenter ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.1)'}
              fontFamily="'Courier New', monospace" letterSpacing="2"
              style={{ userSelect: 'none', transition: 'fill 0.15s' }}
            >AJAN</text>
          )}
        </g>
      </svg>
    </div>
  );
}

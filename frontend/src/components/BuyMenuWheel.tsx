'use client';

import { useState, useCallback } from 'react';
import { useRouter } from '@/i18n/navigation';

// ─── SVG Constants ────────────────────────────────────────────────────────────
const CX = 250;
const CY = 250;
const OUTER_R = 218;
const INNER_R = 52;
const TEXT_R = 148;
const SLOT_NUM_R = 72;
const GAP_DEG = 1.8;

// ─── Fixed angle slots (same positions as CS2 buy menu) ──────────────────────
const ANGLE_SLOTS = [
  { start: 300, end: 360 }, // 0: upper-left
  { start: 0,   end: 60  }, // 1: upper-right
  { start: 60,  end: 120 }, // 2: right
  { start: 120, end: 180 }, // 3: lower-right
  { start: 180, end: 240 }, // 4: lower-left
  { start: 240, end: 300 }, // 5: left
];

// ─── Data Types ───────────────────────────────────────────────────────────────
interface Item {
  id: string;
  lines: string[];
  href?: string;
  isOthers?: boolean;
}
interface Category extends Item {
  subItems: Item[];
}

// ─── Market Categories & Weapons ─────────────────────────────────────────────
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
      { id: 'deagle',     lines: ['Desert', 'Eagle'],  href: '/market?weapon=desert-eagle'  },
      { id: 'usp-s',      lines: ['USP-S'],            href: '/market?weapon=usp-s'         },
      { id: 'glock-18',   lines: ['Glock-18'],         href: '/market?weapon=glock-18'      },
      { id: 'p250',       lines: ['P250'],             href: '/market?weapon=p250'          },
      { id: 'five-seven', lines: ['Five-SeveN'],       href: '/market?weapon=five-seven'    },
      { id: 'others',     lines: ['DİĞER', 'TABANCA'], href: '/market?category=pistols', isOthers: true },
    ],
  },
  {
    id: 'smg', lines: ['SMG'],
    subItems: [
      { id: 'mp9',    lines: ['MP9'],        href: '/market?weapon=mp9'    },
      { id: 'mac-10', lines: ['MAC-10'],     href: '/market?weapon=mac-10' },
      { id: 'p90',    lines: ['P90'],        href: '/market?weapon=p90'    },
      { id: 'ump-45', lines: ['UMP-45'],     href: '/market?weapon=ump-45' },
      { id: 'mp5-sd', lines: ['MP5-SD'],     href: '/market?weapon=mp5-sd' },
      { id: 'others', lines: ['DİĞER', 'SMG'], href: '/market?category=smg', isOthers: true },
    ],
  },
  {
    id: 'heavy', lines: ['AĞIR'],
    subItems: [
      { id: 'nova',   lines: ['Nova'],       href: '/market?weapon=nova'   },
      { id: 'xm1014', lines: ['XM1014'],     href: '/market?weapon=xm1014' },
      { id: 'mag-7',  lines: ['MAG-7'],      href: '/market?weapon=mag-7'  },
      { id: 'm249',   lines: ['M249'],       href: '/market?weapon=m249'   },
      { id: 'negev',  lines: ['Negev'],      href: '/market?weapon=negev'  },
      { id: 'others', lines: ['DİĞER', 'AĞIR'], href: '/market?category=heavy', isOthers: true },
    ],
  },
  {
    id: 'knives', lines: ['BIÇAK &', 'ELDİVEN'],
    subItems: [
      { id: 'karambit',  lines: ['Karambit'],   href: '/market?weapon=karambit'      },
      { id: 'butterfly', lines: ['Butterfly'],  href: '/market?weapon=butterfly-knife'},
      { id: 'm9-bayonet',lines: ['M9 Bayonet'], href: '/market?weapon=m9-bayonet'    },
      { id: 'skeleton',  lines: ['Skeleton'],   href: '/market?weapon=skeleton-knife' },
      { id: 'gloves',    lines: ['Eldiven'],    href: '/market?category=gloves'       },
      { id: 'others',    lines: ['DİĞER', 'BIÇAK'], href: '/market?category=knives', isOthers: true },
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
  const s = startAngle + GAP_DEG;
  const e = endAngle - GAP_DEG;
  const so = polar(OUTER_R, s);
  const eo = polar(OUTER_R, e);
  const si = polar(INNER_R, s);
  const ei = polar(INNER_R, e);
  const large = e - s > 180 ? 1 : 0;
  const f = (n: number) => n.toFixed(2);
  return [
    `M ${f(si.x)} ${f(si.y)}`,
    `L ${f(so.x)} ${f(so.y)}`,
    `A ${OUTER_R} ${OUTER_R} 0 ${large} 1 ${f(eo.x)} ${f(eo.y)}`,
    `L ${f(ei.x)} ${f(ei.y)}`,
    `A ${INNER_R} ${INNER_R} 0 ${large} 0 ${f(si.x)} ${f(si.y)}`,
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
  const [hoveredSlot, setHoveredSlot]       = useState<number | null>(null);
  const [selectedCat, setSelectedCat]       = useState<string | null>(null);
  const [hoveredCenter, setHoveredCenter]   = useState(false);
  const [fading, setFading]                 = useState(false);

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

  const activeCategory = CATEGORIES.find(c => c.id === selectedCat);

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full">
      {/* Category breadcrumb */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.35em] font-mono uppercase transition-opacity duration-200"
        style={{ color: '#5a6373', opacity: selectedCat ? 1 : 0 }}
      >
        {activeCategory?.lines.join(' ')} &rsaquo; SEÇ
      </div>

      <svg
        viewBox="0 0 500 500"
        className="w-full h-full select-none"
        style={{
          maxWidth: 'min(68vh, 68vw)',
          filter: 'drop-shadow(0 0 60px rgba(0,0,0,0.9))',
        }}
      >
        <defs>
          {/* Segment hover glow */}
          <filter id="whl-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Gold glow for center */}
          <filter id="ctr-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Segment gradients */}
          <radialGradient id="seg-def" cx="60%" cy="40%" r="70%">
            <stop offset="0%"   stopColor="#1c2028" />
            <stop offset="100%" stopColor="#0b0d10" />
          </radialGradient>
          <radialGradient id="seg-hov" cx="60%" cy="40%" r="70%">
            <stop offset="0%"   stopColor="#252d3a" />
            <stop offset="100%" stopColor="#111520" />
          </radialGradient>
          {/* Center gradients */}
          <linearGradient id="ct-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#0e2a4a" />
            <stop offset="100%" stopColor="#142d50" />
          </linearGradient>
          <linearGradient id="t-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#3a1500" />
            <stop offset="100%" stopColor="#5a2800" />
          </linearGradient>
          {/* Outer ring gradient */}
          <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#4a5568" />
            <stop offset="50%"  stopColor="#718096" />
            <stop offset="100%" stopColor="#4a5568" />
          </linearGradient>
        </defs>

        {/* ── Outer decorative rings ── */}
        <circle cx={CX} cy={CY} r={OUTER_R + 5} fill="none" stroke="url(#ring-grad)" strokeWidth="1.5" opacity="0.6" />
        <circle cx={CX} cy={CY} r={OUTER_R + 2} fill="none" stroke="#2d3548" strokeWidth="0.6" />

        {/* ── Segments ── */}
        <g style={{ opacity: fading ? 0 : 1, transition: 'opacity 0.16s ease' }}>
          {ANGLE_SLOTS.map((slot, idx) => {
            const item = currentItems[idx];
            if (!item) return null;
            const hov = hoveredSlot === idx;
            const path = buildPath(slot.start, slot.end);
            const tp   = midPoint(idx, TEXT_R);
            const np   = midPoint(idx, SLOT_NUM_R);

            return (
              <g
                key={item.id}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredSlot(idx)}
                onMouseLeave={() => setHoveredSlot(null)}
                onClick={() => handleSegmentClick(item)}
              >
                {/* Base fill */}
                <path
                  d={path}
                  fill={hov ? 'url(#seg-hov)' : 'url(#seg-def)'}
                  stroke={hov ? '#556070' : '#1f2533'}
                  strokeWidth={hov ? '1.2' : '0.6'}
                  style={{ transition: 'fill 0.12s, stroke 0.12s' }}
                />
                {/* Gold accent outline on hover */}
                {hov && (
                  <path
                    d={path}
                    fill="none"
                    stroke="#c8aa72"
                    strokeWidth="1.8"
                    opacity="0.45"
                  />
                )}
                {/* Slot number */}
                <text
                  x={np.x} y={np.y}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize="9.5"
                  fill={hov ? '#6b7c8f' : '#2d3a4a'}
                  fontFamily="'Courier New', monospace"
                  style={{ userSelect: 'none', transition: 'fill 0.12s' }}
                >
                  {idx + 1}
                </text>
                {/* Label text (multi-line) */}
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
                      fontSize={item.isOthers ? 10.5 : 13}
                      fontWeight="700"
                      letterSpacing="1.8"
                      fontFamily="'Rajdhani','Barlow Condensed','Arial Narrow',sans-serif"
                      fill={
                        item.isOthers
                          ? (hov ? '#b0d040' : '#8aaa28')
                          : (hov ? '#ffffff' : '#b8c2ce')
                      }
                      style={{
                        userSelect: 'none',
                        transition: 'fill 0.12s',
                        filter: hov ? 'url(#whl-glow)' : 'none',
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

        {/* ── Center CT/T emblem ── */}
        <g
          style={{ cursor: 'pointer' }}
          onMouseEnter={() => setHoveredCenter(true)}
          onMouseLeave={() => setHoveredCenter(false)}
          onClick={handleCenterClick}
        >
          {/* Background */}
          <circle cx={CX} cy={CY} r={INNER_R - 1} fill="#080a0d" />
          {/* CT left half */}
          <path
            d={`M ${CX} ${CY - INNER_R + 2} A ${INNER_R - 2} ${INNER_R - 2} 0 0 0 ${CX} ${CY + INNER_R - 2} Z`}
            fill="url(#ct-grad)"
          />
          {/* T right half */}
          <path
            d={`M ${CX} ${CY - INNER_R + 2} A ${INNER_R - 2} ${INNER_R - 2} 0 0 1 ${CX} ${CY + INNER_R - 2} Z`}
            fill="url(#t-grad)"
          />
          {/* Divider line */}
          <line
            x1={CX} y1={CY - INNER_R + 3}
            x2={CX} y2={CY + INNER_R - 3}
            stroke="#1e2530" strokeWidth="1.2"
          />
          {/* CT label */}
          <text
            x={CX - 14} y={CY}
            textAnchor="middle" dominantBaseline="central"
            fontSize="9.5" fontWeight="700" letterSpacing="0.5"
            fill={hoveredCenter ? '#82c1e8' : '#4a85b8'}
            fontFamily="'Courier New', monospace"
            style={{ userSelect: 'none', transition: 'fill 0.15s' }}
          >CT</text>
          {/* T label */}
          <text
            x={CX + 14} y={CY}
            textAnchor="middle" dominantBaseline="central"
            fontSize="11" fontWeight="700"
            fill={hoveredCenter ? '#e8a060' : '#b86820'}
            fontFamily="'Courier New', monospace"
            style={{ userSelect: 'none', transition: 'fill 0.15s' }}
          >T</text>
          {/* Ring border */}
          <circle
            cx={CX} cy={CY} r={INNER_R}
            fill="none"
            stroke={hoveredCenter ? '#c8aa72' : '#374050'}
            strokeWidth={hoveredCenter ? '2' : '1.5'}
            style={{
              transition: 'stroke 0.15s, stroke-width 0.15s',
              filter: hoveredCenter ? 'url(#ctr-glow)' : 'none',
            }}
          />
          {/* Back indicator in sub-menu */}
          {selectedCat && (
            <text
              x={CX} y={CY + INNER_R + 16}
              textAnchor="middle"
              fontSize="8" fill={hoveredCenter ? '#8a9ab0' : '#3d4a5c'}
              fontFamily="monospace" letterSpacing="2"
              style={{ userSelect: 'none', transition: 'fill 0.15s' }}
            >
              ← GERİ
            </text>
          )}
          {/* Agents label in main menu */}
          {!selectedCat && (
            <text
              x={CX} y={CY + INNER_R + 16}
              textAnchor="middle"
              fontSize="8" fill={hoveredCenter ? '#8a9ab0' : '#2d3a4a'}
              fontFamily="monospace" letterSpacing="2"
              style={{ userSelect: 'none', transition: 'fill 0.15s' }}
            >
              AJAN
            </text>
          )}
        </g>
      </svg>
    </div>
  );
}

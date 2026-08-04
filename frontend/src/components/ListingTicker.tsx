'use client';

interface TickerItem {
  id: string;
  name: string;
  weapon: string;
  price?: { min: number; currency: string } | null;
  wear?: string;
  image?: string;
  rarity?: string;
}

const WEAR_SHORT: Record<string, string> = {
  'Factory New': 'FN',
  'Minimal Wear': 'MW',
  'Field-Tested': 'FT',
  'Well-Worn': 'WW',
  'Battle-Scarred': 'BS',
};

const RARITY_COLOR: Record<string, string> = {
  'Consumer':   '#b0b0b0',
  'Industrial': '#5b9bd5',
  'Mil-Spec':   '#4b69ff',
  'Restricted': '#8847ff',
  'Classified': '#d32ee6',
  'Covert':     '#eb4b4b',
  'Contraband': '#e4ae39',
};

const FALLBACK: TickerItem[] = [
  { id:'1', name:'Dragon Lore',  weapon:'AWP',   rarity:'Contraband', price:{ min:8500,  currency:'USD' }, image:'/images/awp-dragonlore.png', wear:'Factory New'    },
  { id:'2', name:'Medusa',       weapon:'AWP',   rarity:'Covert',     price:{ min:1200,  currency:'USD' }, image:'/images/Medusa.webp',        wear:'Factory New'    },
  { id:'3', name:'Hyper Beast',  weapon:'AWP',   rarity:'Covert',     price:{ min:85,    currency:'USD' }, image:'/images/Hyper Beast.webp',   wear:'Factory New'    },
  { id:'4', name:'Asiimov',      weapon:'AWP',   rarity:'Classified', price:{ min:120,   currency:'USD' }, image:'/images/Asiimov.webp',       wear:'Field-Tested'   },
  { id:'5', name:'Printstream',  weapon:'M4A1-S',rarity:'Covert',     price:{ min:95,    currency:'USD' }, image:'/images/Printstream.webp',   wear:'Factory New'    },
  { id:'6', name:'Neo-Noir',     weapon:'MP9',   rarity:'Covert',     price:{ min:45,    currency:'USD' }, image:'/images/Neo-Noir.webp',      wear:'Factory New'    },
  { id:'7', name:'Fade',         weapon:'Glock', rarity:'Classified', price:{ min:200,   currency:'USD' }, image:'/images/FADE.webp',          wear:'Factory New'    },
  { id:'8', name:'Oni Taiji',    weapon:'M4A4',  rarity:'Covert',     price:{ min:65,    currency:'USD' }, image:'/images/Oni Taiji.webp',     wear:'Minimal Wear'   },
  { id:'9', name:'Wildfire',     weapon:'M4A4',  rarity:'Covert',     price:{ min:38,    currency:'USD' }, image:'/images/Wildfire.webp',      wear:'Factory New'    },
  { id:'10',name:'Duality',      weapon:'AK-47', rarity:'Covert',     price:{ min:52,    currency:'USD' }, image:'/images/Duality.webp',       wear:'Factory New'    },
];

export default function ListingTicker({ items = FALLBACK }: { items?: TickerItem[] }) {
  // Duplicate for seamless infinite scroll
  const doubled = [...items, ...items];

  return (
    <>
      <style>{`
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          animation: tickerScroll 45s linear infinite;
          will-change: transform;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div
        className="w-full overflow-hidden border-t border-white/8 backdrop-blur-sm"
        style={{ background: 'rgba(5, 7, 10, 0.75)' }}
      >
        {/* Header line */}
        <div className="px-4 py-1 flex items-center gap-3 border-b border-white/5">
          <span className="text-[9px] tracking-[0.3em] text-gray-500 font-mono uppercase">
            Güncel İlanlar
          </span>
          <span className="flex-1 h-px bg-white/5" />
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[9px] text-green-500/70 font-mono">CANLI</span>
        </div>

        {/* Scrolling items */}
        <div className="py-2 overflow-hidden">
          <div
            className="ticker-track flex gap-3"
            style={{ width: `${doubled.length * 196}px` }}
          >
            {doubled.map((item, idx) => {
              const wearShort = item.wear ? (WEAR_SHORT[item.wear] || item.wear) : null;
              const rarityColor = RARITY_COLOR[item.rarity ?? ''] ?? '#888';

              return (
                <div
                  key={`${item.id}-${idx}`}
                  className="flex items-center gap-2.5 rounded border px-3 py-1.5 transition-all duration-200 hover:scale-[1.03] hover:brightness-110 cursor-pointer min-w-[180px] max-w-[180px]"
                  style={{
                    background: 'rgba(20, 24, 30, 0.8)',
                    borderColor: `${rarityColor}30`,
                    borderLeftColor: rarityColor,
                    borderLeftWidth: '2px',
                  }}
                >
                  {/* Image */}
                  <div className="w-10 h-8 flex-shrink-0 flex items-center justify-center">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-8 h-6 bg-white/5 rounded" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[10px] font-semibold truncate leading-tight"
                      style={{ color: rarityColor, filter: 'brightness(1.4)' }}
                    >
                      {item.weapon}
                    </div>
                    <div className="text-[11px] text-gray-200 font-medium truncate leading-tight">
                      {item.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {wearShort && (
                        <span className="text-[9px] text-gray-500 font-mono">{wearShort}</span>
                      )}
                      {item.price && (
                        <span className="text-[10px] font-bold" style={{ color: '#9fc131' }}>
                          ${item.price.min.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

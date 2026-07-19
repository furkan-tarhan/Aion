export interface Skin {
  id: string;
  name: string;
  weapon: string;
  category: string;
  rarity: 'Consumer' | 'Industrial' | 'Mil-Spec' | 'Restricted' | 'Classified' | 'Covert' | 'Contraband';
  price: {
    min: number;
    max: number;
    currency: 'TRY' | 'USD';
  };
  wear?: number; // 0-1 arası
  image: string;
  description?: string;
  marketUrl?: string;
  tradeUp?: string[];
  collection?: string;
}

export interface Weapon {
  id: string;
  name: string;
  category: string;
  slug: string;
  description?: string;
  skins: Skin[];
}

export interface WeaponCategory {
  id: string;
  name: string;
  slug: string;
  weapons: Weapon[];
}

export interface Agent {
  id: string;
  name: string;
  type: 'T' | 'CT';
  slug: string;
  image: string;
  description?: string;
} 
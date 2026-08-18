import axios from 'axios';
import { config } from '../config';

export interface SteamMarketItem {
  name: string;
  sell_price: number;
  sell_price_text: string;
  app_icon: string;
  app_name: string;
  asset_description: {
    icon_url: string;
    name: string;
    market_hash_name: string;
    market_name: string;
    name_color: string;
    type: string;
  };
  sale_price_text: string;
}

export interface SteamInventoryItem {
  assetid: string;
  classid: string;
  instanceid: string;
  amount: string;
  market_hash_name: string;
  market_name: string;
  name: string;
  marketable: number;
  tradeable: number;
  commodity: number;
  market_tradable_restriction: string;
  market_marketable_restriction: string;
  descriptions: Array<{
    type: string;
    value: string;
    color?: string;
  }>;
  actions: Array<{
    name: string;
    link: string;
  }>;
  market_actions: Array<{
    name: string;
    link: string;
  }>;
  tags: Array<{
    category: string;
    internal_name: string;
    localized_category_name: string;
    localized_tag_name: string;
    color?: string;
  }>;
  icon_url: string;
  icon_url_large: string;
  background_color: string;
  name_color: string;
  type: string;
}

export interface SteamUserProfile {
  steamid: string;
  communityvisibilitystate: number;
  profilestate: number;
  personaname: string;
  commentpermission: number;
  profileurl: string;
  avatar: string;
  avatarmedium: string;
  avatarfull: string;
  avatarhash: string;
  lastlogoff: number;
  personastate: number;
  primaryclanid: string;
  timecreated: number;
  personastateflags: number;
  loccountrycode: string;
  locstatecode: string;
  loccityid: number;
}

// Steam Market API'den fiyat verisi çekme (key gerektirmiyor)
export async function getSteamMarketPrice(marketHashName: string): Promise<number | null> {
  try {
    const response = await axios.get(
      `${config.steam.marketUrl}/priceoverview/?appid=730&currency=1&market_hash_name=${encodeURIComponent(marketHashName)}`
    );
    
    if (response.data.success && response.data.lowest_price) {
      const price = parseFloat(response.data.lowest_price.replace(/[^0-9.]/g, ''));
      return price;
    }
    
    return null;
  } catch (error) {
    console.error('Steam Market API error:', error);
    return null;
  }
}

// Steam API ile kullanıcı profili getirme
export async function getSteamUserProfile(steamId: string): Promise<SteamUserProfile | null> {
  try {
    const response = await axios.get(
      `${config.steam.baseUrl}/ISteamUser/GetPlayerSummaries/v2/?key=${config.steam.apiKey}&steamids=${steamId}`
    );
    
    if (response.data.response && response.data.response.players.length > 0) {
      return response.data.response.players[0];
    }
    
    return null;
  } catch (error) {
    console.error('Steam User API error:', error);
    return null;
  }
}

// steamcommunity.com/inventory public endpoint'inin özel/rate-limit/erişilemez durumlarını
// ayırt edebilmek için tipli hata (route katmanı buna göre 403/429/502 döner).
export class SteamInventoryError extends Error {
  constructor(public code: 'private' | 'rate_limited' | 'unavailable', message: string) {
    super(message);
    this.name = 'SteamInventoryError';
  }
}

// Steam API ile kullanıcı envanteri getirme
export async function getSteamInventory(steamId: string, appId: number = 730): Promise<SteamInventoryItem[]> {
  let response;
  try {
    response = await axios.get(
      `https://steamcommunity.com/inventory/${steamId}/${appId}/2?l=english&count=2000`
    );
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 403 || status === 401) {
      throw new SteamInventoryError('private', 'Steam envanteri gizli. Steam gizlilik ayarlarından envanteri herkese açık yapın.');
    }
    if (status === 429) {
      throw new SteamInventoryError('rate_limited', 'Steam şu an çok fazla istek alıyor, lütfen birazdan tekrar deneyin.');
    }
    console.error('Steam Inventory API error:', error);
    throw new SteamInventoryError('unavailable', 'Steam envanterine ulaşılamadı.');
  }

  // Steam, gizli envanterlerde de HTTP 200 + { success: false } dönebilir
  if (response.data?.success === false) {
    throw new SteamInventoryError('private', 'Steam envanterine ulaşılamadı. Envanterinizin herkese açık olduğundan emin olun.');
  }

  if (response.data && response.data.assets && response.data.descriptions) {
    const { assets, descriptions } = response.data;

    // Asset ve Description'ları classid+instanceid üzerinden birleştir
    return assets.map((asset: any) => {
      const desc = descriptions.find(
        (d: any) => d.classid === asset.classid && d.instanceid === asset.instanceid
      );
      return {
        ...asset,
        ...desc
      };
    });
  }

  // assets/descriptions yoksa envanter gerçekten boştur
  return [];
}

// Steam API ile kullanıcının CS2 skinlerini getirme
export async function getCS2Skins(steamId: string): Promise<SteamInventoryItem[]> {
  const inventory = await getSteamInventory(steamId, 730);

  // Sadece CS2 skinlerini filtrele (marketable ve içinde | işareti olanlar genelde silah/bıçaktır)
  return inventory.filter(item =>
    item.marketable === 1 &&
    (item as any).tradable === 1 &&
    item.market_hash_name && item.market_hash_name.includes('|')
  );
}

// Steam API ile kullanıcının skin fiyatlarını getirme
export async function getUserSkinsWithPrices(steamId: string): Promise<Array<SteamInventoryItem & { price: number | null }>> {
  const skins = await getCS2Skins(steamId);
  const skinsWithPrices = [];

  for (const skin of skins) {
    const price = await getSteamMarketPrice(skin.market_hash_name);
    skinsWithPrices.push({
      ...skin,
      price: price
    });
  }

  return skinsWithPrices;
}

// Steam API ile kullanıcının envanter değerini hesaplama
export async function calculateInventoryValue(steamId: string): Promise<number> {
  const skinsWithPrices = await getUserSkinsWithPrices(steamId);

  return skinsWithPrices.reduce((total, skin) => total + (skin.price || 0), 0);
}

// Steam API ile kullanıcının en pahalı skinlerini getirme
export async function getMostExpensiveSkins(steamId: string, limit: number = 10): Promise<Array<SteamInventoryItem & { price: number | null }>> {
  const skinsWithPrices = await getUserSkinsWithPrices(steamId);

  // Fiyata göre sırala ve limit kadar döndür
  return skinsWithPrices
    .filter(skin => skin.price !== null)
    .sort((a, b) => (b.price || 0) - (a.price || 0))
    .slice(0, limit);
} 
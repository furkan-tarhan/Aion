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

// Steam API ile kullanıcı envanteri getirme
export async function getSteamInventory(steamId: string, appId: number = 730): Promise<SteamInventoryItem[]> {
  try {
    const response = await axios.get(
      `${config.steam.baseUrl}/ISteamUserOAuth/GetInventory/v1/?key=${config.steam.apiKey}&steamid=${steamId}&appid=${appId}`
    );
    
    if (response.data.response && response.data.response.assets) {
      return response.data.response.assets;
    }
    
    return [];
  } catch (error) {
    console.error('Steam Inventory API error:', error);
    return [];
  }
}

// Steam API ile kullanıcının CS2 skinlerini getirme
export async function getCS2Skins(steamId: string): Promise<SteamInventoryItem[]> {
  try {
    const inventory = await getSteamInventory(steamId, 730);
    
    // Sadece CS2 skinlerini filtrele
    const cs2Skins = inventory.filter(item => 
      item.marketable === 1 && 
      item.tradeable === 1 &&
      item.market_hash_name.includes('|')
    );
    
    return cs2Skins;
  } catch (error) {
    console.error('Error fetching CS2 skins:', error);
    return [];
  }
}

// Steam API ile kullanıcının skin fiyatlarını getirme
export async function getUserSkinsWithPrices(steamId: string): Promise<Array<SteamInventoryItem & { price: number | null }>> {
  try {
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
  } catch (error) {
    console.error('Error fetching user skins with prices:', error);
    return [];
  }
}

// Steam API ile kullanıcının envanter değerini hesaplama
export async function calculateInventoryValue(steamId: string): Promise<number> {
  try {
    const skinsWithPrices = await getUserSkinsWithPrices(steamId);
    
    const totalValue = skinsWithPrices.reduce((total, skin) => {
      return total + (skin.price || 0);
    }, 0);
    
    return totalValue;
  } catch (error) {
    console.error('Error calculating inventory value:', error);
    return 0;
  }
}

// Steam API ile kullanıcının en pahalı skinlerini getirme
export async function getMostExpensiveSkins(steamId: string, limit: number = 10): Promise<Array<SteamInventoryItem & { price: number | null }>> {
  try {
    const skinsWithPrices = await getUserSkinsWithPrices(steamId);
    
    // Fiyata göre sırala ve limit kadar döndür
    return skinsWithPrices
      .filter(skin => skin.price !== null)
      .sort((a, b) => (b.price || 0) - (a.price || 0))
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching most expensive skins:', error);
    return [];
  }
} 
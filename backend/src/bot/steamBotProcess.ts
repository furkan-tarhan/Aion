// Steam trade bot — AYRI BİR CHILD PROCESS olarak çalışır (bkz. services/steamBot.ts'deki fork).
// Bilinçli izolasyon: bu process'e sadece STEAM_BOT_* env değişkenleri verilir — MONGO_URI,
// JWT_SECRET, CRYPTOMUS_* gibi hiçbir hassas bilgiye erişimi yoktur. steamcommunity/steam-tradeoffer-manager
// paketlerinin bağımlılık zincirinde (eski `request` kütüphanesi üzerinden) düzeltmesi olmayan
// güvenlik açıkları var (bkz. commit mesajı / PROJECT_STATUS.md); bu process'in DB'ye veya diğer
// sırlara erişememesi, bu bağımlılık zincirinde bir açık istismar edilse bile blast radius'u
// "bot'un Steam oturumu" ile sınırlar.
import SteamUser from 'steam-user';
import SteamCommunity from 'steamcommunity';
import TradeOfferManager from 'steam-tradeoffer-manager';
import SteamTotp from 'steam-totp';
import type CEconItem = require('steamcommunity/classes/CEconItem');
import type { ParentToChildMsg, ChildToParentMsg, TradeOfferState } from './protocol';

// steam-tradeoffer-manager'ın gerçek runtime API'si (ve resmi dokümantasyonu) addMyItem/addTheirItem'a
// sadece {assetid, appid, contextid} içeren minimal bir obje geçmeye izin verir/bunu bekler, ama
// @types/steamcommunity'nin CEconItem tipi tüm alanları zorunlu kılıyor — bilinen bir tip tanımı
// eksikliği. Runtime davranışı doğru olduğu için burada dar bir tip cast'i kullanılıyor.
function minimalItem(assetId: string, appId: number, contextId: number): CEconItem {
  return { assetid: assetId, appid: appId, contextid: contextId } as unknown as CEconItem;
}

const { STEAM_BOT_USERNAME, STEAM_BOT_PASSWORD, STEAM_BOT_SHARED_SECRET, STEAM_BOT_IDENTITY_SECRET } = process.env;

if (!STEAM_BOT_USERNAME || !STEAM_BOT_PASSWORD || !STEAM_BOT_SHARED_SECRET || !STEAM_BOT_IDENTITY_SECRET) {
  // Parent zaten bu değişkenler yoksa fork etmiyor (bkz. steamBot.ts) — buraya düşülmesi beklenmez.
  console.error('[steam-bot] STEAM_BOT_* env değişkenleri eksik, process kapanıyor');
  process.exit(1);
}

function send(msg: ChildToParentMsg) {
  if (process.send) process.send(msg);
}

const client = new SteamUser();
const community = new SteamCommunity();
const manager = new TradeOfferManager({
  steam: client,
  community,
  language: 'en',
  cancelTime: 10 * 60 * 1000, // 10 dakikada kabul edilmeyen deposit/delivery teklifi otomatik iptal
});

client.logOn({
  accountName: STEAM_BOT_USERNAME,
  password: STEAM_BOT_PASSWORD,
  twoFactorCode: SteamTotp.generateAuthCode(STEAM_BOT_SHARED_SECRET),
});

client.on('loggedOn', () => {
  client.setPersona(SteamUser.EPersonaState.Online);
});

client.on('webSession', (_sessionId, cookies) => {
  manager.setCookies(cookies, (err) => {
    if (err) {
      send({ type: 'bot_status', online: false, error: err.message });
      return;
    }
    send({ type: 'bot_status', online: true, steamId: client.steamID?.getSteamID64() });
  });
  community.setCookies(cookies);
  // identitySecret verildiği için gelen mobil onaylar (trade offer confirmation) otomatik kabul edilir.
  community.startConfirmationChecker(20000, STEAM_BOT_IDENTITY_SECRET);
});

client.on('error', (err) => {
  send({ type: 'bot_status', online: false, error: err.message });
});

client.on('disconnected', (_eresult, msg) => {
  send({ type: 'bot_status', online: false, error: msg || 'disconnected' });
});

// Bot'a beklenmedik/istenmeyen bir teklif gelirse (deposit teklifleri hep bot tarafından
// gönderilir, bota gelen teklif olmamalı) — güvenlik için otomatik reddet.
manager.on('newOffer', (offer) => {
  offer.decline();
});

function mapState(state: number): TradeOfferState {
  switch (state) {
    case TradeOfferManager.ETradeOfferState.Accepted:
      return 'accepted';
    case TradeOfferManager.ETradeOfferState.Declined:
      return 'declined';
    case TradeOfferManager.ETradeOfferState.Canceled:
    case TradeOfferManager.ETradeOfferState.CanceledBySecondFactor:
      return 'canceled';
    case TradeOfferManager.ETradeOfferState.Expired:
      return 'expired';
    case TradeOfferManager.ETradeOfferState.InEscrow:
      return 'escrow';
    case TradeOfferManager.ETradeOfferState.Active:
    case TradeOfferManager.ETradeOfferState.CreatedNeedsConfirmation:
      return 'active';
    default:
      return 'invalid';
  }
}

manager.on('sentOfferChanged', (offer) => {
  const state = mapState(offer.state);

  if (state !== 'accepted') {
    send({ type: 'offer_state_changed', offerId: offer.id!, state });
    return;
  }

  // Kabul edilen teklif bir deposit ise (bot bir şey almışsa), item botun envanterinde yeni bir
  // assetid alır — teslimat sırasında bu yeni id gerekir.
  if (offer.itemsToReceive.length > 0) {
    offer.getReceivedItems(false, (err, items) => {
      send({
        type: 'offer_state_changed',
        offerId: offer.id!,
        state,
        newAssetId: !err && items?.[0] ? String(items[0].assetid) : undefined,
      });
    });
  } else {
    send({ type: 'offer_state_changed', offerId: offer.id!, state });
  }
});

process.on('message', (msg: ParentToChildMsg) => {
  if (msg.type === 'deposit_request') {
    const offer = manager.createOffer(msg.tradeUrl);
    offer.addTheirItem(minimalItem(msg.assetId, msg.appId, msg.contextId));
    offer.send((err) => {
      if (err) {
        send({ type: 'offer_error', requestId: msg.requestId, error: err.message });
        return;
      }
      send({
        type: 'offer_created',
        requestId: msg.requestId,
        offerId: offer.id!,
        tradeOfferUrl: `https://steamcommunity.com/tradeoffer/${offer.id}/`,
      });
    });
  } else if (msg.type === 'deliver_request') {
    const offer = manager.createOffer(msg.tradeUrl);
    offer.addMyItem(minimalItem(msg.assetId, msg.appId, msg.contextId));
    offer.send((err) => {
      if (err) {
        send({ type: 'offer_error', requestId: msg.requestId, error: err.message });
        return;
      }
      send({
        type: 'offer_created',
        requestId: msg.requestId,
        offerId: offer.id!,
        tradeOfferUrl: `https://steamcommunity.com/tradeoffer/${offer.id}/`,
      });
    });
  }
});

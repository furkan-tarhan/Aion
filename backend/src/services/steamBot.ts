// Steam trade bot'unu (bkz. bot/steamBotProcess.ts) izole bir child process olarak yönetir.
// Bot process'ine sadece STEAM_BOT_* env değişkenleri aktarılır — bu process'in (ve onun
// güvenlik açığı barındıran steamcommunity/steam-tradeoffer-manager bağımlılık zincirinin)
// MongoDB, JWT_SECRET veya iyzico sırlarına erişimi yoktur.
import { fork, ChildProcess } from 'child_process';
import path from 'path';
import { EventEmitter } from 'events';
import { logger } from '../logger';
import type { ParentToChildMsg, ChildToParentMsg, OfferStateChangedMsg } from '../bot/protocol';

export type { OfferStateChangedMsg };

const BOT_ENV_KEYS = ['STEAM_BOT_USERNAME', 'STEAM_BOT_PASSWORD', 'STEAM_BOT_SHARED_SECRET', 'STEAM_BOT_IDENTITY_SECRET'] as const;

export const isBotConfigured = BOT_ENV_KEYS.every((k) => !!process.env[k]);

// 'offer_state_changed' olayı: (msg: OfferStateChangedMsg) => void
export const botEvents = new EventEmitter();

let child: ChildProcess | null = null;
let botOnline = false;
let botSteamId: string | null = null;

interface PendingRequest {
  resolve: (v: { offerId: string; tradeOfferUrl: string }) => void;
  reject: (e: Error) => void;
  timer: NodeJS.Timeout;
}
const pending = new Map<string, PendingRequest>();

function isTsNodeRuntime() {
  return __filename.endsWith('.ts');
}

function randomId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

export function startSteamBot() {
  if (!isBotConfigured) {
    logger.info({ event: 'steam_bot_disabled' }, 'STEAM_BOT_* env değişkenleri tanımlı değil, Steam trade botu devre dışı');
    return;
  }

  const scriptPath = isTsNodeRuntime()
    ? path.join(__dirname, '../bot/steamBotProcess.ts')
    : path.join(__dirname, '../bot/steamBotProcess.js');

  const childEnv: NodeJS.ProcessEnv = { PATH: process.env.PATH, NODE_ENV: process.env.NODE_ENV };
  for (const key of BOT_ENV_KEYS) childEnv[key] = process.env[key];

  child = fork(scriptPath, [], {
    env: childEnv,
    execArgv: isTsNodeRuntime() ? ['-r', 'ts-node/register'] : [],
  });

  child.on('message', (msg: ChildToParentMsg) => handleChildMessage(msg));

  child.on('exit', (code) => {
    botOnline = false;
    child = null;
    logger.error({ event: 'steam_bot_exited', code }, 'Steam trade bot process kapandı, 30sn sonra yeniden denenecek');
    setTimeout(() => {
      if (isBotConfigured) startSteamBot();
    }, 30_000);
  });
}

function handleChildMessage(msg: ChildToParentMsg) {
  switch (msg.type) {
    case 'bot_status':
      botOnline = msg.online;
      botSteamId = msg.steamId ?? botSteamId;
      if (msg.online) {
        logger.info({ event: 'steam_bot_online', steamId: msg.steamId }, 'Steam trade bot oturumu açık');
      } else {
        logger.error({ event: 'steam_bot_offline', error: msg.error }, 'Steam trade bot oturumu kapalı/hatalı');
      }
      return;
    case 'offer_created': {
      const p = pending.get(msg.requestId);
      if (!p) return;
      clearTimeout(p.timer);
      pending.delete(msg.requestId);
      p.resolve({ offerId: msg.offerId, tradeOfferUrl: msg.tradeOfferUrl });
      return;
    }
    case 'offer_error': {
      const p = pending.get(msg.requestId);
      if (!p) return;
      clearTimeout(p.timer);
      pending.delete(msg.requestId);
      p.reject(new Error(msg.error));
      return;
    }
    case 'offer_state_changed':
      botEvents.emit('offer_state_changed', msg);
      return;
  }
}

function sendRequest(msg: ParentToChildMsg): Promise<{ offerId: string; tradeOfferUrl: string }> {
  if (!child || !botOnline) {
    return Promise.reject(new Error('Steam bot şu anda çevrimdışı, lütfen birazdan tekrar deneyin'));
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(msg.requestId);
      reject(new Error('Steam bot yanıt vermedi (zaman aşımı)'));
    }, 30_000);
    pending.set(msg.requestId, { resolve, reject, timer });
    child!.send(msg);
  });
}

/** Botun satıcıdan item talep eden bir trade offer göndermesini ister (ilan emanet akışı). */
export function requestDeposit(tradeUrl: string, assetId: string, appId = 730, contextId = 2) {
  return sendRequest({ type: 'deposit_request', requestId: randomId(), tradeUrl, assetId, appId, contextId });
}

/** Botun kendi envanterindeki bir item'ı alıcıya gönderen bir trade offer göndermesini ister. */
export function requestDelivery(tradeUrl: string, assetId: string, appId = 730, contextId = 2) {
  return sendRequest({ type: 'deliver_request', requestId: randomId(), tradeUrl, assetId, appId, contextId });
}

export function getBotStatus() {
  return { configured: isBotConfigured, online: botOnline, steamId: botSteamId };
}

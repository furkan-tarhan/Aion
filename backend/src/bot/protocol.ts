// Ana process (Express API) ile Steam bot child process'i arasındaki IPC mesaj sözleşmesi.
// Bu dosya her iki tarafta da import edilir — sıfır runtime bağımlılığı olmalı (sadece tip).

export interface DepositRequestMsg {
  type: 'deposit_request';
  requestId: string;
  tradeUrl: string;
  assetId: string;
  appId: number;
  contextId: number;
}

export interface DeliverRequestMsg {
  type: 'deliver_request';
  requestId: string;
  tradeUrl: string;
  assetId: string;
  appId: number;
  contextId: number;
}

export type ParentToChildMsg = DepositRequestMsg | DeliverRequestMsg;

export interface OfferCreatedMsg {
  type: 'offer_created';
  requestId: string;
  offerId: string;
  tradeOfferUrl: string;
}

export interface OfferErrorMsg {
  type: 'offer_error';
  requestId: string;
  error: string;
}

export type TradeOfferState = 'active' | 'accepted' | 'declined' | 'canceled' | 'expired' | 'escrow' | 'invalid';

export interface OfferStateChangedMsg {
  type: 'offer_state_changed';
  offerId: string;
  state: TradeOfferState;
  // Kabul edilen deposit teklifleri için: item botun envanterine yeni bir assetid ile düşer.
  // buyer'a teslimat sırasında bu yeni id kullanılmalı.
  newAssetId?: string;
}

export interface BotStatusMsg {
  type: 'bot_status';
  online: boolean;
  steamId?: string;
  error?: string;
}

export type ChildToParentMsg = OfferCreatedMsg | OfferErrorMsg | OfferStateChangedMsg | BotStatusMsg;

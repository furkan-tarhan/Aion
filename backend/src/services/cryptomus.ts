import crypto from 'crypto';
import axios from 'axios';
import { config } from '../config';

// Cryptomus REST API — resmi Node SDK yok, imzalı istekler doğrudan axios ile atılır.
// Doküman: https://doc.cryptomus.com/business/payments

function getCredentials() {
  if (!config.cryptomus.merchantId || !config.cryptomus.paymentApiKey) {
    throw new Error('Cryptomus API bilgileri (CRYPTOMUS_MERCHANT_ID / CRYPTOMUS_PAYMENT_API_KEY) henüz ortam değişkenlerinde tanımlanmamış.');
  }
  return { merchantId: config.cryptomus.merchantId, apiKey: config.cryptomus.paymentApiKey };
}

// Cryptomus imza şeması: sign = md5(base64(JSON body) + API key)
function sign(payload: Record<string, unknown>, apiKey: string): string {
  const base64Body = Buffer.from(JSON.stringify(payload)).toString('base64');
  return crypto.createHash('md5').update(base64Body + apiKey).digest('hex');
}

export interface CreateInvoiceResult {
  uuid: string;
  orderId: string;
  url: string;
}

// Bakiye yükleme için Cryptomus ödeme sayfası (invoice) oluşturur.
// Kullanıcı bu URL'de istediği kripto para/ağı seçip ödemeyi tamamlar.
export async function createInvoice(
  amountUsd: number,
  orderId: string,
  callbackUrl: string,
  returnUrl: string
): Promise<CreateInvoiceResult> {
  const { merchantId, apiKey } = getCredentials();

  const body = {
    amount: amountUsd.toFixed(2),
    currency: 'USD',
    order_id: orderId,
    url_callback: callbackUrl,
    url_return: returnUrl,
    is_payment_multiple: false,
    lifetime: 3600
  };

  const response = await axios.post(`${config.cryptomus.baseUrl}/payment`, body, {
    headers: {
      merchant: merchantId,
      sign: sign(body, apiKey),
      'Content-Type': 'application/json'
    }
  });

  const result = response.data?.result;
  if (!result?.uuid || !result?.url) {
    throw new Error(response.data?.message || 'Cryptomus ödeme oturumu oluşturulamadı');
  }

  return { uuid: result.uuid, orderId: result.order_id, url: result.url };
}

export interface CryptomusWebhookPayload {
  uuid: string;
  order_id: string;
  status: string; // paid | paid_over | process | confirm_check | wrong_amount | fail | cancel | ...
  is_final: boolean;
  amount: string;
  payment_amount?: string;
  payment_amount_usd?: string;
  currency: string;
  payer_currency?: string;
  network?: string;
  sign: string;
  [key: string]: unknown;
}

// Webhook gövdesindeki 'sign' alanını doğrular — Cryptomus'tan geldiğini garanti etmenin tek yolu bu.
export function verifyWebhookSignature(payload: CryptomusWebhookPayload): boolean {
  const { apiKey } = getCredentials();
  const { sign: receivedSign, ...rest } = payload;
  if (!receivedSign) return false;
  const expected = sign(rest, apiKey);
  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(receivedSign);
  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

// Ödemenin gerçekten tamamlandığını gösteren durumlar
export const PAID_STATUSES = new Set(['paid', 'paid_over']);

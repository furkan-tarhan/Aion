import { config } from '../config';

// 'iyzipay' paketi resmi TypeScript tip tanımı sağlamıyor (@types/iyzipay mevcut değil),
// bu yüzden require ile 'any' olarak içe aktarılıyor.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Iyzipay: any = require('iyzipay');

const iyzipay = new Iyzipay({
  apiKey: config.iyzico.apiKey,
  secretKey: config.iyzico.secretKey,
  uri: config.iyzico.baseUrl
});

export interface DepositBuyerInfo {
  userId: string;
  email: string;
  name: string;
  surname: string;
  identityNumber: string;
  phone: string;
  address: string;
  city: string;
  ip: string;
}

export interface CheckoutFormResult {
  status: string;
  token?: string;
  checkoutFormContent?: string;
  paymentPageUrl?: string;
  paymentStatus?: string;
  paymentId?: string;
  price?: string;
  paidPrice?: string;
  errorMessage?: string;
  errorCode?: string;
}

// Bakiye yükleme için iyzico Checkout Form oturumu başlatır.
// Kart bilgileri iyzico'nun barındırdığı sayfada alınır, sunucumuza hiç ulaşmaz.
export function initializeDeposit(
  buyer: DepositBuyerInfo,
  amount: number,
  conversationId: string,
  callbackUrl: string
): Promise<CheckoutFormResult> {
  return new Promise((resolve, reject) => {
    const formattedAmount = amount.toFixed(2);
    const fullName = `${buyer.name} ${buyer.surname}`.trim();

    const request = {
      locale: Iyzipay.LOCALE.TR,
      conversationId,
      price: formattedAmount,
      paidPrice: formattedAmount,
      currency: Iyzipay.CURRENCY.TRY,
      basketId: `WALLET-${conversationId}`,
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl,
      buyer: {
        id: buyer.userId,
        name: buyer.name,
        surname: buyer.surname,
        gsmNumber: buyer.phone,
        email: buyer.email,
        identityNumber: buyer.identityNumber,
        registrationAddress: buyer.address,
        ip: buyer.ip,
        city: buyer.city,
        country: 'Turkey'
      },
      shippingAddress: {
        contactName: fullName,
        city: buyer.city,
        country: 'Turkey',
        address: buyer.address
      },
      billingAddress: {
        contactName: fullName,
        city: buyer.city,
        country: 'Turkey',
        address: buyer.address
      },
      basketItems: [
        {
          id: 'WALLET-TOPUP',
          name: 'Cüzdan Bakiye Yükleme',
          category1: 'Bakiye',
          itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,
          price: formattedAmount
        }
      ]
    };

    iyzipay.checkoutFormInitialize.create(request, (err: any, result: any) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// Ödeme tamamlandıktan sonra callback'te gelen token ile sonucu doğrular.
export function retrieveCheckoutForm(token: string, conversationId: string): Promise<CheckoutFormResult> {
  return new Promise((resolve, reject) => {
    iyzipay.checkoutForm.retrieve({
      locale: Iyzipay.LOCALE.TR,
      conversationId,
      token
    }, (err: any, result: any) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

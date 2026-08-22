import mongoose, { Schema, Types } from 'mongoose';

export type TransactionType = 'deposit' | 'withdrawal' | 'purchase' | 'sale';
export type TransactionStatus = 'pending' | 'completed' | 'failed';
export type DeliveryStatus = 'pending' | 'accepted' | 'declined' | 'canceled' | 'expired' | 'escrow';

export interface ITransaction {
  user: Types.ObjectId;
  type: TransactionType;
  amount: number;
  balanceAfter?: number;
  status: TransactionStatus;
  listing?: Types.ObjectId;
  counterparty?: Types.ObjectId;
  paymentToken?: string; // 'deposit' işlemlerinde Cryptomus invoice uuid'i
  description?: string;
  // 'deposit' işleminde webhook'tan gelen gerçek ödeme bilgisi (kullanıcı hangi coin/ağ ile ödedi)
  cryptoAmount?: string;
  cryptoCurrency?: string;
  cryptoNetwork?: string;
  // 'withdrawal' işleminde kullanıcının verdiği çekim adresi (admin bu adrese manuel coin gönderir)
  payoutAddress?: string;
  payoutNetwork?: string;
  // 'purchase' işlemlerinde Steam trade bot teslimat durumu (bot yapılandırılmamışsa boş kalır)
  deliveryOfferId?: string;
  deliveryStatus?: DeliveryStatus;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'purchase', 'sale'],
    required: true,
    index: true
  },
  amount: { type: Number, required: true },
  balanceAfter: { type: Number },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  listing: { type: Schema.Types.ObjectId, ref: 'Listing' },
  counterparty: { type: Schema.Types.ObjectId, ref: 'User' },
  paymentToken: { type: String, index: true },
  description: { type: String },
  cryptoAmount: { type: String },
  cryptoCurrency: { type: String },
  cryptoNetwork: { type: String },
  payoutAddress: { type: String },
  payoutNetwork: { type: String },
  deliveryOfferId: { type: String, index: true },
  deliveryStatus: { type: String, enum: ['pending', 'accepted', 'declined', 'canceled', 'expired', 'escrow'] }
}, {
  timestamps: true
});

TransactionSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);

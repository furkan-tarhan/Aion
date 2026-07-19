import mongoose, { Schema, Types } from 'mongoose';

export type TransactionType = 'deposit' | 'withdrawal' | 'purchase' | 'sale';
export type TransactionStatus = 'pending' | 'completed' | 'failed';

export interface ITransaction {
  user: Types.ObjectId;
  type: TransactionType;
  amount: number;
  balanceAfter?: number;
  status: TransactionStatus;
  listing?: Types.ObjectId;
  counterparty?: Types.ObjectId;
  paymentToken?: string;
  description?: string;
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
  description: { type: String }
}, {
  timestamps: true
});

TransactionSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);

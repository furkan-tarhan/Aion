import mongoose, { Schema, Types } from 'mongoose';

export type ListingWear = 'Factory New' | 'Minimal Wear' | 'Field-Tested' | 'Well-Worn' | 'Battle-Scarred';

export const LISTING_WEAR_VALUES: ListingWear[] = [
  'Factory New',
  'Minimal Wear',
  'Field-Tested',
  'Well-Worn',
  'Battle-Scarred'
];

export interface IListing {
  seller: Types.ObjectId;
  skin: Types.ObjectId;
  skinId: string;
  weapon: string;
  rarity: string;
  title: string;
  price: number;
  currency: string;
  steamTradeUrl: string;
  status: 'active' | 'sold' | 'cancelled';
  buyer?: Types.ObjectId;
  soldAt?: Date;
  wear?: ListingWear;
  floatValue?: number;
  isStatTrak: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ListingSchema = new Schema<IListing>({
  seller: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  skin: { type: Schema.Types.ObjectId, ref: 'Skin', required: true },
  skinId: { type: String, required: true },
  weapon: { type: String, index: true },
  rarity: { type: String, index: true },
  title: { type: String, required: true },
  price: { type: Number, required: true, min: 0.01 },
  currency: { type: String, default: 'USD' },
  steamTradeUrl: { type: String, required: true },
  status: {
    type: String,
    enum: ['active', 'sold', 'cancelled'],
    default: 'active',
    index: true
  },
  buyer: { type: Schema.Types.ObjectId, ref: 'User' },
  soldAt: Date,
  wear: { type: String, enum: LISTING_WEAR_VALUES, index: true },
  floatValue: { type: Number, min: 0, max: 1 },
  isStatTrak: { type: Boolean, default: false, index: true }
}, {
  timestamps: true
});

// Aktif ilanlar için compound index
ListingSchema.index({ status: 1, createdAt: -1 });
ListingSchema.index({ seller: 1, status: 1 });

export default mongoose.model<IListing>('Listing', ListingSchema);

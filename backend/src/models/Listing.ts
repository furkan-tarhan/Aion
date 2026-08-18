import mongoose, { Schema, Types } from 'mongoose';

export type ListingWear = 'Factory New' | 'Minimal Wear' | 'Field-Tested' | 'Well-Worn' | 'Battle-Scarred';

export const LISTING_WEAR_VALUES: ListingWear[] = [
  'Factory New',
  'Minimal Wear',
  'Field-Tested',
  'Well-Worn',
  'Battle-Scarred'
];

export type ListingDepositStatus = 'pending' | 'accepted' | 'declined' | 'canceled' | 'expired';

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
  // 'pending_deposit': bot satıcıdan item'ı istedi, henüz onaylanmadı (item pazarda görünmez).
  // 'active': item bot envanterinde, satın alınabilir (bot yapılandırılmamışsa item her zaman satıcıda kalır).
  status: 'pending_deposit' | 'active' | 'sold' | 'cancelled';
  buyer?: Types.ObjectId;
  soldAt?: Date;
  wear?: ListingWear;
  floatValue?: number;
  isStatTrak: boolean;
  // Steam trade bot emanet akışı (bot yapılandırılmamışsa hepsi boş kalır, manuel akışa düşülür)
  assetId?: string; // seller'ın envanterindeki orijinal Steam assetid
  depositOfferId?: string;
  depositStatus?: ListingDepositStatus;
  botAssetId?: string; // deposit kabul edildikten sonra item'ın bot envanterindeki yeni assetid'i
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
    enum: ['pending_deposit', 'active', 'sold', 'cancelled'],
    default: 'active',
    index: true
  },
  buyer: { type: Schema.Types.ObjectId, ref: 'User' },
  soldAt: Date,
  wear: { type: String, enum: LISTING_WEAR_VALUES, index: true },
  floatValue: { type: Number, min: 0, max: 1 },
  isStatTrak: { type: Boolean, default: false, index: true },
  assetId: String,
  depositOfferId: { type: String, index: true },
  depositStatus: { type: String, enum: ['pending', 'accepted', 'declined', 'canceled', 'expired'] },
  botAssetId: String
}, {
  timestamps: true
});

// Aktif ilanlar için compound index
ListingSchema.index({ status: 1, createdAt: -1 });
ListingSchema.index({ seller: 1, status: 1 });

export default mongoose.model<IListing>('Listing', ListingSchema);

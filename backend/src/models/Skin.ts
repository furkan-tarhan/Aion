import mongoose, { Schema } from 'mongoose';

export interface ISkin {
  skinId: string;
  name: string;
  weapon: string;
  category: string;
  rarity: string;
  price: {
    min: number;
    max: number;
    currency: string;
  };
  image: string;
  market_hash_name?: string;
  wear?: number;
  description?: string;
  collection?: string;
}

const SkinSchema = new Schema<ISkin>({
  skinId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  weapon: { type: String, required: true, index: true },
  category: { type: String, required: true, index: true },
  rarity: {
    type: String,
    required: true,
    enum: ['Consumer', 'Industrial', 'Mil-Spec', 'Restricted', 'Classified', 'Covert', 'Contraband']
  },
  price: {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    currency: { type: String, default: 'USD' }
  },
  image: { type: String, required: true },
  market_hash_name: String,
  wear: Number,
  description: String,
  collection: String
}, {
  timestamps: true
});

// Arama için text index
SkinSchema.index({ name: 'text', weapon: 'text' });

export default mongoose.model<ISkin>('Skin', SkinSchema);

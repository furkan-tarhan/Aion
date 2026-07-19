import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  reviewer: mongoose.Types.ObjectId;
  reviewee: mongoose.Types.ObjectId;
  listing?: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  createdAt: Date;
}

const ReviewSchema: Schema = new Schema({
  reviewer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reviewee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  listing: { type: Schema.Types.ObjectId, ref: 'Listing', default: null },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now }
});

// Bir kullanıcı aynı listing'e birden fazla yorum yapamaz
ReviewSchema.index({ reviewer: 1, listing: 1 }, { unique: true, sparse: true });

export default mongoose.model<IReview>('Review', ReviewSchema);

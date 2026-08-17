import mongoose, { Schema, Types } from 'mongoose';

export type NotificationType = 'sale' | 'purchase' | 'deposit' | 'withdrawal' | 'review' | 'account_banned' | 'account_unbanned' | 'listing_removed' | 'listing_active';

export interface INotification {
  user: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  relatedListing?: Types.ObjectId;
  relatedTransaction?: Types.ObjectId;
  relatedReview?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: ['sale', 'purchase', 'deposit', 'withdrawal', 'review', 'account_banned', 'account_unbanned', 'listing_removed', 'listing_active'],
    required: true,
    index: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false, index: true },
  relatedListing: { type: Schema.Types.ObjectId, ref: 'Listing' },
  relatedTransaction: { type: Schema.Types.ObjectId, ref: 'Transaction' },
  relatedReview: { type: Schema.Types.ObjectId, ref: 'Review' }
}, {
  timestamps: true
});

NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, isRead: 1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);

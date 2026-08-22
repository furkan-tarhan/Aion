import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  createdAt: Date;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationTokenExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  profile?: {
    fullName?: string;
    phone?: string;
    address?: string;
    avatar?: string;
  };
  steamId?: string;
  steamProfile?: {
    displayName?: string;
    avatar?: string;
    profileUrl?: string;
  };
  favorites: string[]; // skin id'leri
  balance: number; // USD cüzdan bakiyesi (kripto ödemeler Cryptomus üzerinden USD karşılığı olarak işlenir)
  role: 'user' | 'admin';
  isBanned: boolean;
  bannedAt?: Date;
  banReason?: string;
  // Web Push abonelikleri (PWA). endpoint unique; aynı cihaz yeniden abone olunca güncellenir.
  pushSubscriptions: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    createdAt?: Date;
  }[];
}

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationTokenExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  profile: {
    fullName: String,
    phone: String,
    address: String,
    avatar: String
  },
  steamId: { type: String, default: null },
  steamProfile: {
    displayName: String,
    avatar: String,
    profileUrl: String
  },
  favorites: [{ type: String }],
  balance: { type: Number, default: 0, min: 0 },
  role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
  isBanned: { type: Boolean, default: false, index: true },
  bannedAt: Date,
  banReason: String,
  pushSubscriptions: [{
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    createdAt: { type: Date, default: Date.now },
  }],
});

export default mongoose.model<IUser>('User', UserSchema); 
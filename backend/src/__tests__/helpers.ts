import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User, { IUser } from '../models/User';
import { config } from '../config';

let counter = 0;

export async function createUser(overrides: Partial<{
  username: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  balance: number;
  isBanned: boolean;
}> = {}): Promise<IUser> {
  counter += 1;
  const password = overrides.password || 'password123';
  // Testlerde hız için düşük bcrypt cost — gerçek üretimde routes/users.ts hâlâ 10 kullanıyor.
  const hashed = await bcrypt.hash(password, 4);
  return User.create({
    username: overrides.username || `test_user_${counter}`,
    email: overrides.email || `test_user_${counter}@test.local`,
    password: hashed,
    role: overrides.role || 'user',
    balance: overrides.balance ?? 0,
    isBanned: overrides.isBanned ?? false,
  });
}

export function tokenFor(user: Pick<IUser, '_id' | 'username' | 'email' | 'role'>): string {
  return jwt.sign(
    { userId: (user._id as any).toString(), username: user.username, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: '1h' }
  );
}

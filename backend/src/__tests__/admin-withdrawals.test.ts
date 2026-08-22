import request from 'supertest';
import app from '../app';
import Transaction from '../models/Transaction';
import User from '../models/User';
import { createUser, tokenFor } from './helpers';

async function requestWithdrawal(user: Awaited<ReturnType<typeof createUser>>, amount: number) {
  const res = await request(app)
    .post('/api/wallet/withdraw')
    .set('Authorization', `Bearer ${tokenFor(user)}`)
    .send({ amount, walletAddress: 'TXYZ1234567890abcdef', network: 'USDT_TRC20' });
  expect(res.status).toBe(200);
  return Transaction.findOne({ user: user._id, type: 'withdrawal' }).sort({ createdAt: -1 });
}

describe('Admin: kripto çekim talepleri', () => {
  it('admin olmayan kullanıcı çekim listesini göremez', async () => {
    const user = await createUser();
    const res = await request(app)
      .get('/api/admin/withdrawals')
      .set('Authorization', `Bearer ${tokenFor(user)}`);

    expect(res.status).toBe(403);
  });

  it('admin bekleyen çekim taleplerini listeleyebilir', async () => {
    const admin = await createUser({ role: 'admin' });
    const user = await createUser({ balance: 100 });
    await requestWithdrawal(user, 60);

    const res = await request(app)
      .get('/api/admin/withdrawals')
      .set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].status).toBe('pending');
  });

  it('complete: talebi tamamlandı işaretler, bakiyeye dokunmaz', async () => {
    const admin = await createUser({ role: 'admin' });
    const user = await createUser({ balance: 100 });
    const tx = await requestWithdrawal(user, 60);

    const res = await request(app)
      .patch(`/api/admin/withdrawals/${tx!._id}/complete`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(res.status).toBe(200);

    const updatedTx = await Transaction.findById(tx!._id);
    expect(updatedTx?.status).toBe('completed');
    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.balance).toBe(40); // 100 - 60, complete bakiyeyi değiştirmemeli
  });

  it('reject: talebi reddeder ve bakiyeyi kullanıcıya iade eder', async () => {
    const admin = await createUser({ role: 'admin' });
    const user = await createUser({ balance: 100 });
    const tx = await requestWithdrawal(user, 60);

    const res = await request(app)
      .patch(`/api/admin/withdrawals/${tx!._id}/reject`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ reason: 'Geçersiz adres' });

    expect(res.status).toBe(200);

    const updatedTx = await Transaction.findById(tx!._id);
    expect(updatedTx?.status).toBe('failed');
    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.balance).toBe(100); // 40 + 60 iade
  });

  it('zaten işlenmiş bir talebi tekrar tamamlamayı reddeder', async () => {
    const admin = await createUser({ role: 'admin' });
    const user = await createUser({ balance: 100 });
    const tx = await requestWithdrawal(user, 60);

    await request(app)
      .patch(`/api/admin/withdrawals/${tx!._id}/complete`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`);

    const secondAttempt = await request(app)
      .patch(`/api/admin/withdrawals/${tx!._id}/complete`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(secondAttempt.status).toBe(400);
  });
});

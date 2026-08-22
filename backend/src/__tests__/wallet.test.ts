import request from 'supertest';
import app from '../app';
import Transaction from '../models/Transaction';
import User from '../models/User';
import { createUser, tokenFor } from './helpers';

describe('GET /api/wallet', () => {
  it('token yoksa 401 döner', async () => {
    const res = await request(app).get('/api/wallet');
    expect(res.status).toBe(401);
  });

  it('bakiyeyi USD olarak döner', async () => {
    const user = await createUser({ balance: 42 });
    const res = await request(app).get('/api/wallet').set('Authorization', `Bearer ${tokenFor(user)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.balance).toBe(42);
    expect(res.body.data.currency).toBe('USD');
  });
});

describe('POST /api/wallet/deposit', () => {
  it('minimum tutarın altındaki talebi reddeder', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/wallet/deposit')
      .set('Authorization', `Bearer ${tokenFor(user)}`)
      .send({ amount: 1 });

    expect(res.status).toBe(400);
  });

  it('Cryptomus yapılandırılmamışsa 503 döner (test ortamında CRYPTOMUS_* boş)', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/wallet/deposit')
      .set('Authorization', `Bearer ${tokenFor(user)}`)
      .send({ amount: 50 });

    expect(res.status).toBe(503);
  });
});

describe('POST /api/wallet/deposit/webhook', () => {
  it('imza doğrulanamayan webhook bakiyeyi artırmaz, yine de 200 döner', async () => {
    const user = await createUser({ balance: 0 });
    const transaction = await Transaction.create({
      user: user._id,
      type: 'deposit',
      amount: 100,
      status: 'pending',
      paymentToken: 'fake-uuid',
    });

    const res = await request(app)
      .post('/api/wallet/deposit/webhook')
      .send({
        uuid: 'fake-uuid',
        order_id: transaction._id.toString(),
        status: 'paid',
        is_final: true,
        amount: '100.00',
        currency: 'USD',
        sign: 'not-a-real-signature',
      });

    expect(res.status).toBe(200);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.balance).toBe(0);
    const updatedTx = await Transaction.findById(transaction._id);
    expect(updatedTx?.status).toBe('pending');
  });
});

describe('POST /api/wallet/withdraw', () => {
  it('yetersiz bakiyede 400 döner ve bakiyeyi değiştirmez', async () => {
    const user = await createUser({ balance: 5 });
    const res = await request(app)
      .post('/api/wallet/withdraw')
      .set('Authorization', `Bearer ${tokenFor(user)}`)
      .send({ amount: 100, walletAddress: 'TXYZ1234567890abcdef', network: 'USDT_TRC20' });

    expect(res.status).toBe(400);
    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.balance).toBe(5);
  });

  it('geçersiz ağ adını reddeder', async () => {
    const user = await createUser({ balance: 100 });
    const res = await request(app)
      .post('/api/wallet/withdraw')
      .set('Authorization', `Bearer ${tokenFor(user)}`)
      .send({ amount: 50, walletAddress: 'TXYZ1234567890abcdef', network: 'DOGE' });

    expect(res.status).toBe(400);
  });

  it('geçerli talepte bakiyeyi atomik düşer ve pending transaction oluşturur', async () => {
    const user = await createUser({ balance: 100 });
    const res = await request(app)
      .post('/api/wallet/withdraw')
      .set('Authorization', `Bearer ${tokenFor(user)}`)
      .send({ amount: 60, walletAddress: 'TXYZ1234567890abcdef', network: 'USDT_TRC20' });

    expect(res.status).toBe(200);
    expect(res.body.data.balance).toBe(40);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.balance).toBe(40);

    const tx = await Transaction.findOne({ user: user._id, type: 'withdrawal' });
    expect(tx?.status).toBe('pending');
    expect(tx?.amount).toBe(-60);
    expect(tx?.payoutAddress).toBe('TXYZ1234567890abcdef');
    expect(tx?.payoutNetwork).toBe('USDT_TRC20');
  });
});

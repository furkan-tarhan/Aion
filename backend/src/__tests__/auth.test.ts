import request from 'supertest';
import app from '../app';
import { createUser } from './helpers';

describe('POST /api/users (register)', () => {
  it('yeni kullanıcı oluşturur', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ username: 'newuser', email: 'newuser@test.local', password: 'password123' });

    expect(res.status).toBe(201);
  });

  it('kısa şifreyi reddeder', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ username: 'shortpw', email: 'shortpw@test.local', password: '123' });

    expect(res.status).toBe(400);
  });

  it('geçersiz email formatını reddeder', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ username: 'bademail', email: 'not-an-email', password: 'password123' });

    expect(res.status).toBe(400);
  });

  it('zaten kayıtlı email ile kaydı reddeder', async () => {
    await createUser({ email: 'dup@test.local' });

    const res = await request(app)
      .post('/api/users')
      .send({ username: 'someoneelse', email: 'dup@test.local', password: 'password123' });

    expect(res.status).toBe(409);
  });
});

describe('POST /api/users/login', () => {
  it('yanlış şifreyle girişi reddeder', async () => {
    await createUser({ email: 'login1@test.local', password: 'correct-password' });

    const res = await request(app)
      .post('/api/users/login')
      .send({ email: 'login1@test.local', password: 'wrong-password' });

    expect(res.status).toBe(400);
  });

  it('doğru bilgilerle JWT token döner', async () => {
    await createUser({ email: 'login2@test.local', password: 'correct-password' });

    const res = await request(app)
      .post('/api/users/login')
      .send({ email: 'login2@test.local', password: 'correct-password' });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
  });

  it('banlı kullanıcının girişini 403 ile reddeder', async () => {
    await createUser({ email: 'banned@test.local', password: 'correct-password', isBanned: true });

    const res = await request(app)
      .post('/api/users/login')
      .send({ email: 'banned@test.local', password: 'correct-password' });

    expect(res.status).toBe(403);
  });
});

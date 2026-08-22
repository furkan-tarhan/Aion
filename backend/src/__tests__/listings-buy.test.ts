import request from 'supertest';
import app from '../app';
import Listing from '../models/Listing';
import Skin from '../models/Skin';
import Transaction from '../models/Transaction';
import User from '../models/User';
import { createUser, tokenFor } from './helpers';

async function createSkin(overrides: Partial<{ skinId: string; price: number }> = {}) {
  return Skin.create({
    skinId: overrides.skinId || `awp-dragon-lore-${Date.now()}`,
    name: 'Dragon Lore',
    weapon: 'AWP',
    category: 'Rifle',
    rarity: 'Covert',
    price: { min: overrides.price ?? 100, max: overrides.price ?? 100, currency: 'USD' },
    image: 'https://example.com/awp.png',
  });
}

async function createListing(sellerId: any, skinId: any, price: number, status: 'active' | 'sold' = 'active') {
  return Listing.create({
    seller: sellerId,
    skin: skinId,
    skinId: `listing-skin-${Date.now()}-${Math.random()}`,
    weapon: 'AWP',
    rarity: 'Covert',
    title: 'AWP | Dragon Lore',
    price,
    currency: 'USD',
    steamTradeUrl: 'https://steamcommunity.com/tradeoffer/new/?partner=1&token=abc',
    status,
  });
}

describe('POST /api/listings/:id/buy', () => {
  it('yetersiz bakiyede satın almayı reddeder, ilan aktif kalır', async () => {
    const seller = await createUser({ balance: 0 });
    const buyer = await createUser({ balance: 10 });
    const skin = await createSkin();
    const listing = await createListing(seller._id, skin._id, 100);

    const res = await request(app)
      .post(`/api/listings/${listing._id}/buy`)
      .set('Authorization', `Bearer ${tokenFor(buyer)}`)
      .send({});

    expect(res.status).toBe(400);

    const updatedListing = await Listing.findById(listing._id);
    expect(updatedListing?.status).toBe('active');
  });

  it('kendi ilanını satın almayı reddeder', async () => {
    const seller = await createUser({ balance: 1000 });
    const skin = await createSkin();
    const listing = await createListing(seller._id, skin._id, 100);

    const res = await request(app)
      .post(`/api/listings/${listing._id}/buy`)
      .set('Authorization', `Bearer ${tokenFor(seller)}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('başarılı satın almada bakiyeleri doğru günceller ve transaction çifti oluşturur', async () => {
    const seller = await createUser({ balance: 0 });
    const buyer = await createUser({ balance: 150 });
    const skin = await createSkin();
    const listing = await createListing(seller._id, skin._id, 100);

    const res = await request(app)
      .post(`/api/listings/${listing._id}/buy`)
      .set('Authorization', `Bearer ${tokenFor(buyer)}`)
      .send({});

    expect(res.status).toBe(200);

    const updatedListing = await Listing.findById(listing._id);
    expect(updatedListing?.status).toBe('sold');
    expect(updatedListing?.buyer?.toString()).toBe((buyer._id as any).toString());

    const updatedBuyer = await User.findById(buyer._id);
    const updatedSeller = await User.findById(seller._id);
    expect(updatedBuyer?.balance).toBe(50);
    expect(updatedSeller?.balance).toBe(100);

    const purchaseTx = await Transaction.findOne({ user: buyer._id, type: 'purchase' });
    const saleTx = await Transaction.findOne({ user: seller._id, type: 'sale' });
    expect(purchaseTx?.amount).toBe(-100);
    expect(purchaseTx?.balanceAfter).toBe(50);
    expect(saleTx?.amount).toBe(100);
    expect(saleTx?.balanceAfter).toBe(100);
  });

  it('zaten satılmış ilanı tekrar satın almayı reddeder', async () => {
    const seller = await createUser({ balance: 0 });
    const buyer = await createUser({ balance: 1000 });
    const skin = await createSkin();
    const listing = await createListing(seller._id, skin._id, 100, 'sold');

    const res = await request(app)
      .post(`/api/listings/${listing._id}/buy`)
      .set('Authorization', `Bearer ${tokenFor(buyer)}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

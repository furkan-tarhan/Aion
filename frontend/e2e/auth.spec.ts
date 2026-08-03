import { test, expect } from '@playwright/test';
import { loginViaUi, makeFakeJwt } from './helpers/auth';

test.describe('Auth — core', () => {
  test('register: şifre uyuşmazlığı client-side hata gösterir', async ({ page }) => {
    await page.goto('/tr/register');
    await page.locator('#username').fill('e2euser');
    await page.locator('#email').fill('e2e@example.com');
    await page.locator('#password').fill('password123');
    await page.locator('#confirmPassword').fill('farklisifre');
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText('Şifreler eşleşmiyor')).toBeVisible();
  });

  test('register: başarılı kayıt login sayfasına yönlendirir', async ({ page }) => {
    await page.route('**/api/users', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Kayıt başarılı' }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/tr/register');
    await page.locator('#username').fill('e2euser');
    await page.locator('#email').fill(`e2e-${Date.now()}@example.com`);
    await page.locator('#password').fill('password123');
    await page.locator('#confirmPassword').fill('password123');
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL(/\/tr\/login/);
    await expect(page.getByRole('heading', { name: 'Giriş Yap' })).toBeVisible();
  });

  test('login: mock API ile giriş sonrası ana sayfaya gider', async ({ page }) => {
    await loginViaUi(page);
    await expect(page).toHaveURL(/\/tr\/?$/);
    await expect(page.getByRole('heading', { name: /Zade/i })).toBeVisible();
  });

  test('login: API hatası kullanıcıya gösterilir', async ({ page }) => {
    await page.route('**/api/users/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Email veya şifre hatalı' }),
      });
    });

    await page.goto('/tr/login');
    await page.locator('#email').fill('wrong@example.com');
    await page.locator('#password').fill('wrongpass');
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText(/Email veya şifre hatalı|Giriş başarısız/i)).toBeVisible();
  });
});

test.describe('Korumalı sayfalar', () => {
  test('profil: giriş yoksa "Giriş Gerekli" gösterir', async ({ page }) => {
    await page.goto('/tr/profile');
    await expect(page.getByRole('heading', { name: 'Giriş Gerekli' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Giriş Yap' }).first()).toBeVisible();
  });

  test('sat: giriş yoksa "Giriş Gerekli" gösterir', async ({ page }) => {
    await page.goto('/tr/sell');
    await expect(page.getByRole('heading', { name: 'Giriş Gerekli' })).toBeVisible();
  });

  test('profil: giriş sonrası profil içeriği görünür', async ({ page }) => {
    const token = makeFakeJwt({ username: 'e2euser' });
    await page.addInitScript((t) => {
      localStorage.setItem('zade_token', t);
    }, token);

    // Profil sayfasının ek API çağrıları backend olmadan kırılmasın.
    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto('/tr/profile');
    await expect(page.getByRole('heading', { name: 'Giriş Gerekli' })).toHaveCount(0);
    await expect(page.getByText('e2euser').first()).toBeVisible();
  });

  test('sat: giriş sonrası satış formu görünür', async ({ page }) => {
    const token = makeFakeJwt({ username: 'e2euser' });
    await page.addInitScript((t) => {
      localStorage.setItem('zade_token', t);
    }, token);

    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto('/tr/sell');
    await expect(page.getByRole('heading', { name: /Skin Sat|Giriş Gerekli/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Giriş Gerekli' })).toHaveCount(0);
  });
});

import { test, expect } from '@playwright/test';

test.describe('Smoke', () => {
  test('ana sayfa yüklenir ve marka görünür', async ({ page }) => {
    await page.goto('/tr');
    await expect(page.getByRole('link', { name: /LoopSkins/i }).first()).toBeVisible();
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('login sayfası formu gösterir', async ({ page }) => {
    await page.goto('/tr/login');
    await expect(page.getByRole('heading', { name: 'Giriş Yap' })).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('form button[type="submit"]')).toBeVisible();
  });

  test('market sayfası açılır', async ({ page }) => {
    // Backend olmadan da sayfa render edilmeli (liste boş/yükleniyor olabilir).
    await page.route('**/api/listings**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
          pagination: { page: 1, pages: 1, total: 0 },
        }),
      });
    });

    await page.goto('/tr/market');
    await expect(page.getByRole('heading', { name: 'Market' })).toBeVisible();
  });
});

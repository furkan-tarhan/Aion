import { Page } from '@playwright/test';

/** AuthContext'in atob(payload) ile parse edebildiği sahte JWT üretir. */
export function makeFakeJwt(overrides: Partial<{
  userId: string;
  username: string;
  email: string;
  role: string;
  exp: number;
}> = {}) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      userId: 'e2e-user-id',
      username: 'e2euser',
      email: 'e2e@example.com',
      role: 'user',
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
      ...overrides,
    })
  ).toString('base64url');
  return `${header}.${payload}.e2e-signature`;
}

/** Login API'sini mock'lar ve formu doldurup gönderir. */
export async function loginViaUi(page: Page, email = 'e2e@example.com', password = 'password123') {
  const token = makeFakeJwt({ email });
  await page.route('**/api/users/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Giriş başarılı', token }),
    });
  });

  await page.goto('/tr/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  // Navbar'daki "Giriş Yap" linkiyle karışmasın diye form submit butonunu hedefle.
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/\/tr\/?$/);
}

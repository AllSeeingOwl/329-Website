import { test, expect } from '@playwright/test';

// Phase 1 end-to-end: zine QR -> /system-override -> serial -> email -> data drop -> downloads.
// The webServer in playwright.config.ts runs with AUTH_PASSWORD=TEST-0000-E2E0.
const SERIAL = 'TEST0000E2E0';

test.describe('Phase 1 zine journey', () => {
  test('downloads are locked before the serial is entered', async ({ page, request }) => {
    const res = await request.get('/UNCUT_PUZZLE.pdf', { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    expect(res.headers()['location']).toBe('/system-override');

    await page.goto('/secure-data-drop-page');
    await expect(page.locator('.download-box')).toBeHidden();
    await expect(page.locator('#terminal-section')).toBeVisible();
  });

  test('serial + email unlocks the data drop', async ({ page }) => {
    await page.route('**/api/emails/collect', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' })
    );

    await page.goto('/system-override');
    const serial = page.locator('#serialKey');
    await expect(serial).toBeVisible({ timeout: 10000 }); // after the 2s tourism glitch

    await serial.fill('1111-2222-3333');
    await page.locator('#keyBtn').click();
    await expect(page.locator('#errorMessage')).toContainText('INVALID SERIAL');

    await serial.fill(SERIAL);
    await expect(serial).toHaveValue('TEST-0000-E2E0');
    await page.locator('#keyBtn').click();

    const email = page.locator('#commsLink');
    await expect(email).toBeVisible();
    await email.fill('reader@example.com');
    await page.locator('#submitBtn').click();

    await expect(page.locator('#successMessage')).toBeVisible();
    await page.waitForURL('**/secure-data-drop-page');

    await expect(page.locator('.download-box')).toBeVisible();
    await expect(page.locator('#terminal-section')).toBeHidden();

    const zip = await page.request.get('/SEEDLESS_GRAPES_MOTEL_BLUEPRINTS.zip');
    expect(zip.status()).toBe(200);
  });

  test('held-back Phase 1.5 module shows the held-back page', async ({ page }) => {
    const res = await page.goto('/ollies-radio-scanner');
    expect(res?.status()).toBe(403);
    await expect(page.getByText('HELD BACK MODULE')).toBeVisible();
  });
});

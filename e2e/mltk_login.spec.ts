import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('MLTK Login Gate E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept requests to serve local files
    await page.route('**/MLTK%20Login%20Gate.html', async (route) => {
      const filePath = path.join(__dirname, '..', 'public', 'MLTK Login Gate.html');
      await route.fulfill({
        contentType: 'text/html',
        path: filePath,
      });
    });

    await page.route('**/mltk_login_utils.js', async (route) => {
      const filePath = path.join(__dirname, '..', 'public', 'mltk_login_utils.js');
      await route.fulfill({
        contentType: 'application/javascript',
        path: filePath,
      });
    });

    await page.goto('/MLTK%20Login%20Gate.html');
  });

  test('should format input with hyphens and uppercase', async ({ page }) => {
    const inputField = page.locator('#serial-input');
    await inputField.fill('abcd1234efgh');
    await expect(inputField).toHaveValue('ABCD-1234-EFGH');
  });

  test('should display success screen on valid code', async ({ page }) => {
    // Mock successful API response
    await page.route('**/api/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    const inputField = page.locator('#serial-input');
    const lockdownScreen = page.locator('#lockdown-screen');
    const successScreen = page.locator('#success-screen');

    await inputField.fill('VALID-CODE');
    await page.keyboard.press('Enter');

    await expect(lockdownScreen).toBeHidden();
    await expect(successScreen).toBeVisible();
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(5, 5, 5)');
  });

  test('should display error on invalid code and clear input', async ({ page }) => {
    // Mock failed API response
    await page.route('**/api/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: false })
      });
    });

    const inputField = page.locator('#serial-input');
    const errorMsg = page.locator('#error-msg');
    const inputGroup = page.locator('#input-group');

    await inputField.fill('BAD-CODE');
    await page.keyboard.press('Enter');

    await expect(errorMsg).toBeVisible();
    await expect(inputGroup).toHaveClass(/shake/);
    await expect(inputField).toHaveValue('');

    // Error message should disappear after 3 seconds
    // Playwright has a default timeout of 5s, which gives enough time to see it hidden.
    await expect(errorMsg).toBeHidden({ timeout: 5000 });
  });
});

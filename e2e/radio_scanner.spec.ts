import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Radio Scanner E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept requests to serve local files as the server is not reliable in this environment
    await page.route('**/Ollies%20Radio%20Scanner.html', async (route) => {
      const filePath = path.join(__dirname, '..', 'public', 'Ollies Radio Scanner.html');
      await route.fulfill({
        contentType: 'text/html',
        path: filePath,
      });
    });

    await page.route('**/radio_scanner_utils.js', async (route) => {
      const filePath = path.join(__dirname, '..', 'public', 'radio_scanner_utils.js');
      await route.fulfill({
        contentType: 'application/javascript',
        path: filePath,
      });
    });

    await page.goto('/Ollies%20Radio%20Scanner.html');
  });

  test('should display initial state', async ({ page }) => {
    const display = page.locator('#freq-display');
    const output = page.locator('#transmission-output');

    await expect(display).toHaveText('88.0');
    await expect(output).toContainText('[SCANNING FREQUENCIES...]');
  });

  test('should update frequency when slider moves', async ({ page }) => {
    const slider = page.locator('#freq-slider');
    const display = page.locator('#freq-display');

    await slider.fill('920');
    await expect(display).toHaveText('92.0');
  });

  test('should lock in and decrypt message at 104.9', async ({ page }) => {
    const slider = page.locator('#freq-slider');
    const display = page.locator('#freq-display');
    const output = page.locator('#transmission-output');
    const radioBody = page.locator('#radio-body');

    await slider.fill('1049');

    await expect(display).toHaveText('104.9');
    await expect(radioBody).toHaveClass(/locked-in/);

    // The message is typed out, so we wait for it to be fully present
    const expectedMessage = "TRANSMISSION SECURED: What's up, groovy cats? Ollie here. If you're hearing this, you cracked the Dvorak disclaimer. The MLTK has eyes on the main routes. We are moving the operation. Meet us at the abandoned developer room under the Mini Rail. Bring bolt cutters. Stay wild.";

    await expect(output).toHaveText(expectedMessage, { timeout: 15000 });
  });

  test('should return to static when tuned away from 104.9', async ({ page }) => {
    const slider = page.locator('#freq-slider');
    const radioBody = page.locator('#radio-body');
    const output = page.locator('#transmission-output');

    // First tune in
    await slider.fill('1049');
    await expect(radioBody).toHaveClass(/locked-in/);

    // Then tune away
    await slider.fill('1080');
    await expect(radioBody).not.toHaveClass(/locked-in/);
    await expect(output).toHaveClass(/anim-shake/);

    const text = await output.innerText();
    expect(text).not.toContain('TRANSMISSION SECURED');
    expect(text.length).toBeGreaterThan(0);
  });
});

import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Velvet Rope E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept requests to serve local files as the server is not reliable in this environment
    await page.route('**/Velvet%20Rope%20Landing%20Page.html', async (route) => {
      const filePath = path.join(__dirname, '..', 'public', 'Velvet Rope Landing Page.html');
      await route.fulfill({
        contentType: 'text/html',
        path: filePath,
      });
    });

    await page.route('**/velvet_rope_utils.js', async (route) => {
      const filePath = path.join(__dirname, '..', 'public', 'velvet_rope_utils.js');
      await route.fulfill({
        contentType: 'application/javascript',
        path: filePath,
      });
    });

    await page.goto('/Velvet%20Rope%20Landing%20Page.html');
  });

  test('should display COMMUNICATION SECURED modal upon mainframe breach', async ({ page }) => {
    // Wait for the form to be ready
    const form = page.locator('form[onsubmit="breachMainframe(event)"]');
    await expect(form).toBeVisible();

    const emailInput = page.locator('#comms-link');
    const submitBtn = form.locator('button[type="submit"]');

    // Fill out the email field
    await emailInput.fill('hacker@mltk.net');

    // Submit the form
    await submitBtn.click();

    // Verify button changes its style and text
    await expect(submitBtn).toHaveText('LINK ESTABLISHED...');
    await expect(submitBtn).toHaveCSS('background-color', 'rgb(255, 255, 255)'); // #fff
    await expect(submitBtn).toHaveCSS('color', 'rgb(255, 0, 60)'); // #ff003c

    // Verify the modal appears
    const modal = page.locator('text=COMMUNICATION SECURED.').locator('..');
    await expect(modal).toBeVisible();

    // Verify the modal can be closed
    const closeBtn = modal.locator('button', { hasText: 'CLOSE' });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Radio Scanner E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept requests to serve local files as the server is not reliable in this environment
    await page.route('**/ollies-radio-scanner.html', async (route) => {
      const filePath = path.join(__dirname, '..', 'public', 'ollies-radio-scanner.html');
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

    await page.goto('/ollies-radio-scanner.html');
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
    const expectedMessage = `[FREQUENCY: 104.9 FM // FOUR CORNERS RADIO TRANSMISSION]

ALAN SMITHEE: "Welcome back to The Glitch and The Gambit. Today's corporate-approved playlist opens with Huey Lewis and the News performing Hip to Be Scare. Please ignore any digital interference."
OLLIE RADIAN: "Dig it, daddy-o! If you're scanning the airwaves for the Asp Boy's records, make sure you don't trip the Rat traps! We’ve got Cheeps playing on the monitor and a Harmonic Humdinger humming at high voltage!"
ALAN SMITHEE: "Indeed. Next up is Talking Heads with Psycro Killer, followed by Bobby Day singing Rockin’ Rovin. If your receiver displays an ISBN anomaly, adjust your dial."
OLLIE RADIAN: "Stay tuned, groovy cats! The Viper enforcers are searching the Efficiency Express, but Team Rabbit holds the Frequency! Keep your eyes on Index Line Eight!"
CAPTAIN OVERHERE (V.O.): "Computer... prepare the Zero-point Extraction! Code string: R-O-E!"`;

    await expect(output).toHaveText(expectedMessage, { timeout: 25000 }); // Explicit wait increased for typewriter animation stability
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
    expect(text).not.toContain('FOUR CORNERS RADIO TRANSMISSION');
    expect(text.length).toBeGreaterThan(0);
  });

  test('should allow vertical page scrolling when message is displayed at 104.9', async ({
    page,
  }) => {
    const slider = page.locator('#freq-slider');
    const radioBody = page.locator('#radio-body');

    // Set viewport size to ensure content height exceeds viewport
    await page.setViewportSize({ width: 375, height: 600 });

    await slider.fill('1049');
    await expect(radioBody).toHaveClass(/locked-in/);

    // Verify computed overflow style on body is not hidden
    const overflowY = await page.evaluate(() => window.getComputedStyle(document.body).overflowY);
    expect(overflowY).not.toBe('hidden');

    // Verify that the page is scrollable vertically
    const isScrollable = await page.evaluate(
      () =>
        document.documentElement.scrollHeight > window.innerHeight ||
        document.body.scrollHeight > window.innerHeight
    );
    expect(isScrollable).toBe(true);

    // Perform scrolling down and verify window scrollY changes
    await page.evaluate(() => window.scrollTo(0, 300));
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);
  });
});

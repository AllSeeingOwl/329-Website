import { test, expect } from '@playwright/test';

test('Dev Blog sidebar elements are spans and have correct styling', async ({ page }) => {
  // Navigate to the Dev Blog
  await page.goto('/developer-blog.html');

  // Check Recent Updates spans
  const recentUpdatesSpans = page.locator('.sidebar-section').first().locator('.update-title span');
  const countRecent = await recentUpdatesSpans.count();
  expect(countRecent).toBeGreaterThan(0);

  for (let i = 0; i < countRecent; i++) {
    const span = recentUpdatesSpans.nth(i);
    await expect(span).toBeVisible();

    // Check cursor on hover
    await span.hover();
    const cursor = await span.evaluate((el) => window.getComputedStyle(el).cursor);
    expect(cursor).toBe('default');

    // Check color on hover (accent-red)
    const color = await span.evaluate((el) => window.getComputedStyle(el).color);
    // --accent-red: #ff003c -> rgb(255, 0, 60)
    expect(color).toBe('rgb(255, 0, 60)');
  }

  // Check Categories spans
  const categoriesSpans = page.locator('.sidebar-section').last().locator('.update-title span');
  const countCategories = await categoriesSpans.count();
  expect(countCategories).toBeGreaterThan(0);

  for (let i = 0; i < countCategories; i++) {
    const span = categoriesSpans.nth(i);
    await expect(span).toBeVisible();

    // Check cursor on hover
    await span.hover();
    const cursor = await span.evaluate((el) => window.getComputedStyle(el).cursor);
    expect(cursor).toBe('default');

    // Check color on hover
    const color = await span.evaluate((el) => window.getComputedStyle(el).color);
    expect(color).toBe('rgb(255, 0, 60)');
  }
});

test('Clicking sidebar spans does not cause navigation or scroll to top', async ({ page }) => {
  await page.goto('/developer-blog.html');

  // Scroll down a bit to ensure "scroll to top" would be noticeable
  await page.setViewportSize({ width: 800, height: 600 });
  await page.evaluate(() => {
    document.body.style.minHeight = '2000px';
    window.scrollTo(0, 500);
  });
  const initialScrollY = await page.evaluate(() => window.scrollY);
  expect(initialScrollY).toBeGreaterThanOrEqual(0);

  const firstSpan = page.locator('.update-title span').first();
  const initialUrl = page.url();

  await firstSpan.scrollIntoViewIfNeeded();
  const scrolledY = await page.evaluate(() => window.scrollY);
  await firstSpan.click();

  // URL should not change
  expect(page.url()).toBe(initialUrl);

  // Scroll position should not change (unlike #)
  const finalScrollY = await page.evaluate(() => window.scrollY);
  expect(finalScrollY).toBe(scrolledY);
});

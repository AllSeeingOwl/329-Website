import { test, expect } from '@playwright/test';

test('Dev Blog sidebar elements are spans and have correct styling', async ({ page }) => {
  // Navigate to the Dev Blog
  await page.goto('/developer-blog.html');

  // Check Recent Updates spans
  const recentUpdatesSpans = page.locator('.sidebar-section').first().locator('.update-title span');
  const spansRecent = await recentUpdatesSpans.all();
  expect(spansRecent.length).toBeGreaterThan(0);

  // Parallelize visibility checks
  await Promise.all(spansRecent.map((span) => expect(span).toBeVisible()));

  for (const span of spansRecent) {
    // Check cursor and color on hover
    await span.hover();
    const { cursor, color } = await span.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return { cursor: style.cursor, color: style.color };
    });
    expect(cursor).toBe('default');
    expect(color).toBe('rgb(255, 0, 60)');
  }

  // Check Categories spans
  const categoriesSpans = page.locator('.sidebar-section').last().locator('.update-title span');
  const spansCategories = await categoriesSpans.all();
  expect(spansCategories.length).toBeGreaterThan(0);

  // Parallelize visibility checks
  await Promise.all(spansCategories.map((span) => expect(span).toBeVisible()));

  for (const span of spansCategories) {
    // Check cursor and color on hover
    await span.hover();
    const { cursor, color } = await span.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return { cursor: style.cursor, color: style.color };
    });
    expect(cursor).toBe('default');
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

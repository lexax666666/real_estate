import { test, expect } from '@playwright/test';

test('Hero autocomplete dropdown - scrolled into view', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Scroll the search card into center view first
  const searchCard = page.locator('.search-card');
  await searchCard.scrollIntoViewIfNeeded();

  const heroInput = page.locator('.search-card .search-input');
  await heroInput.fill('8933 amelung');

  const dropdown = page.locator('.search-card .autocomplete-dropdown');
  await expect(dropdown).toBeVisible({ timeout: 5000 });

  // Screenshot focused on the search card area
  await searchCard.screenshot({ path: 'screenshots/06-hero-dropdown-focused.png' });

  // Also take a full page screenshot
  await page.screenshot({ path: 'screenshots/07-hero-dropdown-fullpage.png', fullPage: true });
});

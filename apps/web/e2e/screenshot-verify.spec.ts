import { test, expect } from '@playwright/test';

test.describe('Autocomplete visual verification', () => {
  test('Hero search: screenshot autocomplete dropdown for "8933 amelung"', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Take screenshot of the initial hero page
    await page.screenshot({ path: 'screenshots/01-hero-initial.png', fullPage: false });

    // Type in hero search
    const heroInput = page.locator('.search-card .search-input');
    await heroInput.fill('8933 amelung');

    // Wait for dropdown
    const dropdown = page.locator('.search-card .autocomplete-dropdown');
    await expect(dropdown).toBeVisible({ timeout: 5000 });

    // Screenshot with autocomplete dropdown visible
    await page.screenshot({ path: 'screenshots/02-hero-autocomplete-amelung.png', fullPage: false });

    // Verify all results contain amelung (AND logic working)
    const items = dropdown.locator('.autocomplete-item');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const text = await items.nth(i).locator('.autocomplete-item-address').textContent();
      expect(text?.toLowerCase()).toContain('amelung');
    }

    // Select first suggestion
    await items.first().click();
    await page.waitForTimeout(500);

    // Screenshot after selection
    await page.screenshot({ path: 'screenshots/03-hero-after-selection.png', fullPage: false });
  });

  test('Center search: screenshot autocomplete dropdown for "123 main"', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Scroll to center section
    const centerInput = page.locator('#center-addr');
    await centerInput.scrollIntoViewIfNeeded();
    await centerInput.fill('123 main');

    // Wait for dropdown
    const dropdown = page.locator('.center-section .autocomplete-dropdown');
    await expect(dropdown).toBeVisible({ timeout: 5000 });

    // Screenshot center autocomplete
    await page.screenshot({ path: 'screenshots/04-center-autocomplete-main.png', fullPage: false });

    // Verify results contain main
    const items = dropdown.locator('.autocomplete-item');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
    await expect(items.first().locator('.autocomplete-item-address')).toContainText(/main/i);
  });

  test('Hero search: keyboard navigation screenshot', async ({ page }) => {
    await page.goto('/');
    const heroInput = page.locator('.search-card .search-input');
    await heroInput.fill('oak');

    const dropdown = page.locator('.search-card .autocomplete-dropdown');
    await expect(dropdown).toBeVisible({ timeout: 5000 });

    // Navigate down twice
    await heroInput.press('ArrowDown');
    await heroInput.press('ArrowDown');

    // Screenshot with keyboard selection highlighted
    await page.screenshot({ path: 'screenshots/05-hero-keyboard-navigation.png', fullPage: false });
  });
});

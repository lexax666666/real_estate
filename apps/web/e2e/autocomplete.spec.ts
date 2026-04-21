import { test, expect } from '@playwright/test';

test.describe('Hero search card autocomplete', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show autocomplete suggestions when typing in hero search', async ({ page }) => {
    const heroInput = page.locator('.search-card .search-input');
    await heroInput.fill('8933 amelung');

    // Wait for autocomplete dropdown to appear
    const dropdown = page.locator('.search-card .autocomplete-dropdown');
    await expect(dropdown).toBeVisible({ timeout: 5000 });

    // Should show amelung results
    const items = dropdown.locator('.autocomplete-item');
    await expect(items.first()).toBeVisible();
    await expect(items.first().locator('.autocomplete-item-address')).toContainText(/amelung/i);
  });

  test('should NOT show unrelated addresses for "8933 amelung st"', async ({ page }) => {
    const heroInput = page.locator('.search-card .search-input');
    await heroInput.fill('8933 amelung st');

    const dropdown = page.locator('.search-card .autocomplete-dropdown');
    await expect(dropdown).toBeVisible({ timeout: 5000 });

    // All results should contain "amelung"
    const items = dropdown.locator('.autocomplete-item');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const text = await items.nth(i).locator('.autocomplete-item-address').textContent();
      expect(text?.toLowerCase()).toContain('amelung');
    }
  });

  test('should select suggestion with click', async ({ page }) => {
    const heroInput = page.locator('.search-card .search-input');
    await heroInput.fill('8933 amelung');

    const dropdown = page.locator('.search-card .autocomplete-dropdown');
    await expect(dropdown).toBeVisible({ timeout: 5000 });

    // Click first suggestion
    const firstItem = dropdown.locator('.autocomplete-item').first();
    await firstItem.click();

    // Dropdown should close
    await expect(dropdown).not.toBeVisible();

    // Input should be populated with the selected address
    const value = await heroInput.inputValue();
    expect(value.toLowerCase()).toContain('amelung');
  });

  test('should navigate suggestions with keyboard', async ({ page }) => {
    const heroInput = page.locator('.search-card .search-input');
    await heroInput.fill('8933 amelung');

    const dropdown = page.locator('.search-card .autocomplete-dropdown');
    await expect(dropdown).toBeVisible({ timeout: 5000 });

    // Press ArrowDown to select first item
    await heroInput.press('ArrowDown');
    const firstItem = dropdown.locator('.autocomplete-item').first();
    await expect(firstItem).toHaveClass(/selected/);

    // Press Escape to close
    await heroInput.press('Escape');
    await expect(dropdown).not.toBeVisible();
  });

  test('should not show suggestions for queries under 3 characters', async ({ page }) => {
    const heroInput = page.locator('.search-card .search-input');
    await heroInput.fill('ab');

    // Wait a moment for any potential debounced request
    await page.waitForTimeout(500);

    const dropdown = page.locator('.search-card .autocomplete-dropdown');
    await expect(dropdown).not.toBeVisible();
  });
});

test.describe('Center section autocomplete', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show autocomplete suggestions in center search', async ({ page }) => {
    const centerInput = page.locator('#center-addr');
    await centerInput.fill('123 main');

    const dropdown = page.locator('.center-section .autocomplete-dropdown');
    await expect(dropdown).toBeVisible({ timeout: 5000 });

    const items = dropdown.locator('.autocomplete-item');
    await expect(items.first()).toBeVisible();
    await expect(items.first().locator('.autocomplete-item-address')).toContainText(/main/i);
  });

  test('should select suggestion with click in center search', async ({ page }) => {
    const centerInput = page.locator('#center-addr');
    await centerInput.fill('123 main');

    const dropdown = page.locator('.center-section .autocomplete-dropdown');
    await expect(dropdown).toBeVisible({ timeout: 5000 });

    await dropdown.locator('.autocomplete-item').first().click();
    await expect(dropdown).not.toBeVisible();

    const value = await centerInput.inputValue();
    expect(value.toLowerCase()).toContain('main');
  });
});

test.describe('Autocomplete AND logic (must vs should)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('"8933 amelung" should only return amelung addresses, not other 8933 streets', async ({ page }) => {
    const heroInput = page.locator('.search-card .search-input');
    await heroInput.fill('8933 amelung');

    const dropdown = page.locator('.search-card .autocomplete-dropdown');
    await expect(dropdown).toBeVisible({ timeout: 5000 });

    const items = dropdown.locator('.autocomplete-item');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const text = await items.nth(i).locator('.autocomplete-item-address').textContent();
      expect(text?.toLowerCase()).toContain('amelung');
      // Should NOT contain unrelated streets like "centerway", "abbey", etc.
      expect(text?.toLowerCase()).not.toContain('centerway');
      expect(text?.toLowerCase()).not.toContain('abbey');
    }
  });
});

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3333';

test.describe('PropLookup Frontend', () => {
  test('page loads with all main sections visible', async ({ page }) => {
    await page.goto(BASE_URL);

    // Ribbon
    await expect(page.locator('.ribbon')).toBeVisible();
    await expect(page.locator('.ribbon')).toContainText('Public records search');

    // Header brand
    await expect(page.locator('.brand-name')).toContainText('PropLookup');

    // Hero section
    await expect(page.locator('.hero h1')).toBeVisible();
    await expect(page.locator('.hero')).toContainText('assessment');

    // Hero search card
    await expect(page.locator('.search-card')).toBeVisible();
    await expect(page.locator('.search-card-title')).toContainText('Property Data Search');

    // Center search section
    await expect(page.locator('.center-card')).toBeVisible();
    await expect(page.locator('.center-card-title')).toContainText('Property Data Search');
    await expect(page.locator('.welcome-banner')).toBeVisible();

    // Tips grid
    await expect(page.locator('.tips-grid')).toBeVisible();
    await expect(page.locator('.tip')).toHaveCount(4);

    // Footer
    await expect(page.locator('.site-footer')).toBeVisible();
    await expect(page.locator('.foot-brand')).toContainText('PropLookup');
  });

  test('hero search and center search have independent state', async ({ page }) => {
    await page.goto(BASE_URL);

    // Type in hero search
    const heroInput = page.locator('.search-card .search-input');
    await heroInput.fill('hero test address');

    // Center search should remain empty
    const centerInput = page.locator('#center-addr');
    await expect(centerInput).toHaveValue('');

    // Type in center search
    await centerInput.fill('center test address');

    // Hero should still have its own value
    await expect(heroInput).toHaveValue('hero test address');
  });

  test('search button is disabled when input is empty', async ({ page }) => {
    await page.goto(BASE_URL);

    // Hero search button disabled when empty
    const heroSubmit = page.locator('.search-card .search-submit');
    await expect(heroSubmit).toBeDisabled();

    // Center search button disabled when empty
    const centerSubmit = page.locator('.center-submit');
    await expect(centerSubmit).toBeDisabled();

    // Type something - button should enable
    await page.locator('.search-card .search-input').fill('123 Main St');
    await expect(heroSubmit).not.toBeDisabled();

    // Center should still be disabled (independent state)
    await expect(centerSubmit).toBeDisabled();
  });

  test('center search shows error independently', async ({ page }) => {
    await page.goto(BASE_URL);

    const centerInput = page.locator('#center-addr');
    await centerInput.fill('123 Test Street');
    await page.locator('.center-submit').click();

    // Error should appear in center card only
    const centerError = page.locator('.center-card [style*="rgb(255, 240, 240)"]');
    await expect(centerError).toBeVisible({ timeout: 10000 });

    // Hero should NOT show an error
    const heroError = page.locator('.search-card .search-error');
    await expect(heroError).not.toBeVisible();
  });

  test('hero search shows error independently', async ({ page }) => {
    await page.goto(BASE_URL);

    const heroInput = page.locator('.search-card .search-input');
    await heroInput.fill('456 Hero Ave');
    await page.locator('.search-card .search-submit').click();

    // Error should appear in hero card only
    const heroError = page.locator('.search-card .search-error');
    await expect(heroError).toBeVisible({ timeout: 10000 });

    // Center card should NOT show an error
    const centerError = page.locator('.center-card [style*="rgb(255, 240, 240)"]');
    await expect(centerError).not.toBeVisible();
  });

  test('loading states are independent between searches', async ({ page }) => {
    await page.goto(BASE_URL);

    // Fill both inputs
    await page.locator('.search-card .search-input').fill('hero address');
    await page.locator('#center-addr').fill('center address');

    // Click hero search
    await page.locator('.search-card .search-submit').click();

    // Center button should still say "Search", not "Searching..."
    const centerBtn = page.locator('.center-submit');
    await expect(centerBtn).toContainText('Search');
    await expect(centerBtn).not.toContainText('Searching');
  });

  test('no Maryland government references in visible text', async ({ page }) => {
    await page.goto(BASE_URL);

    // Use innerText to get only visible text, not RSC script payloads
    const visibleText = await page.locator('body').innerText();
    const lower = visibleText.toLowerCase();
    expect(lower).not.toContain('maryland');
    expect(lower).not.toContain('department of assessments');
    expect(lower).not.toContain('state of maryland');
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 812 } }); // iPhone dimensions

  test('page renders correctly on mobile', async ({ page }) => {
    await page.goto(BASE_URL);

    // Ribbon should be visible
    await expect(page.locator('.ribbon')).toBeVisible();

    // Brand should be visible
    await expect(page.locator('.brand-name')).toBeVisible();

    // Hero graphic should be hidden on mobile
    await expect(page.locator('.hero-graphic')).toBeHidden();

    // Header meta should be hidden on mobile
    await expect(page.locator('.header-meta')).toBeHidden();

    // Hero h1 should be visible
    await expect(page.locator('.hero h1')).toBeVisible();

    // Search card should be visible and not overflow
    const searchCard = page.locator('.search-card');
    await expect(searchCard).toBeVisible();
    const cardBox = await searchCard.boundingBox();
    expect(cardBox!.width).toBeLessThanOrEqual(375);

    // Center card should be visible
    await expect(page.locator('.center-card')).toBeVisible();

    // Tips should stack vertically on mobile
    const tipsGrid = page.locator('.tips-grid');
    await expect(tipsGrid).toBeVisible();

    // Footer should be visible
    await expect(page.locator('.site-footer')).toBeVisible();
  });

  test('search form works on mobile', async ({ page }) => {
    await page.goto(BASE_URL);

    // Center search input should be usable
    const centerInput = page.locator('#center-addr');
    await centerInput.fill('123 Mobile Test St');
    await expect(centerInput).toHaveValue('123 Mobile Test St');

    // Submit button should be enabled
    const submitBtn = page.locator('.center-submit');
    await expect(submitBtn).not.toBeDisabled();
  });

  test('search inputs remain independent on mobile', async ({ page }) => {
    await page.goto(BASE_URL);

    const heroInput = page.locator('.search-card .search-input');
    const centerInput = page.locator('#center-addr');

    await heroInput.fill('mobile hero');
    await expect(centerInput).toHaveValue('');

    await centerInput.fill('mobile center');
    await expect(heroInput).toHaveValue('mobile hero');
  });
});

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3333';

test.describe('Search Page (/)', () => {
  test('page loads with all main sections visible', async ({ page }) => {
    await page.goto(BASE_URL);

    await expect(page.locator('.ribbon')).toBeVisible();
    await expect(page.locator('.brand-name')).toContainText('PropLookup');
    await expect(page.locator('.hero h1')).toBeVisible();
    await expect(page.locator('.search-card')).toBeVisible();
    await expect(page.locator('.center-card')).toBeVisible();
    await expect(page.locator('.tips-grid')).toBeVisible();
    await expect(page.locator('.tip')).toHaveCount(4);
    await expect(page.locator('.site-footer')).toBeVisible();
  });

  test('hero search and center search have independent state', async ({ page }) => {
    await page.goto(BASE_URL);

    await page.locator('.search-card .search-input').fill('hero test');
    await expect(page.locator('#center-addr')).toHaveValue('');

    await page.locator('#center-addr').fill('center test');
    await expect(page.locator('.search-card .search-input')).toHaveValue('hero test');
  });

  test('search navigates to /property page', async ({ page }) => {
    await page.goto(BASE_URL);

    await page.locator('#center-addr').fill('123 Test St');
    await page.locator('.center-submit').click();

    await page.waitForURL('**/property?address=*', { timeout: 5000 });
    expect(page.url()).toContain('/property?address=');
  });

  test('hero search also navigates to /property page', async ({ page }) => {
    await page.goto(BASE_URL);

    await page.locator('.search-card .search-input').fill('456 Hero Ave');
    await page.locator('.search-card .search-submit').click();

    await page.waitForURL('**/property?address=*', { timeout: 5000 });
    expect(page.url()).toContain('/property?address=');
  });

  test('no Maryland government references in visible text', async ({ page }) => {
    await page.goto(BASE_URL);

    const visibleText = await page.locator('body').innerText();
    const lower = visibleText.toLowerCase();
    expect(lower).not.toContain('maryland');
    expect(lower).not.toContain('department of assessments');
    expect(lower).not.toContain('state of maryland');
  });
});

test.describe('Property Detail Page (/property)', () => {
  test('shows minimal header (no hero) with PropLookup branding', async ({ page }) => {
    await page.goto(`${BASE_URL}/property?address=123+Test+St`);

    // Brand should be visible
    await expect(page.locator('.brand-name')).toContainText('PropLookup');
    await expect(page.locator('.ribbon')).toBeVisible();

    // Hero should NOT be visible (minimal mode)
    await expect(page.locator('.hero')).not.toBeVisible();

    // Footer should be visible
    await expect(page.locator('.site-footer')).toBeVisible();
  });

  test('shows error when API is unavailable', async ({ page }) => {
    await page.goto(`${BASE_URL}/property?address=123+Test+St`);

    // Should show error since backend API is not running
    const errorEl = page.locator('[style*="rgb(255, 240, 240)"]');
    await expect(errorEl).toBeVisible({ timeout: 10000 });
  });

  test('has Back to Search button on error', async ({ page }) => {
    await page.goto(`${BASE_URL}/property?address=123+Test+St`);

    const backBtn = page.locator('text=Back to Search');
    await expect(backBtn).toBeVisible({ timeout: 10000 });

    await backBtn.click();
    await page.waitForURL(`${BASE_URL}/`, { timeout: 5000 });
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('search page renders on mobile', async ({ page }) => {
    await page.goto(BASE_URL);

    await expect(page.locator('.ribbon')).toBeVisible();
    await expect(page.locator('.brand-name')).toBeVisible();
    await expect(page.locator('.hero-graphic')).toBeHidden();
    await expect(page.locator('.header-meta')).toBeHidden();
    await expect(page.locator('.hero h1')).toBeVisible();
    await expect(page.locator('.center-card')).toBeVisible();
    await expect(page.locator('.site-footer')).toBeVisible();
  });

  test('property page renders on mobile', async ({ page }) => {
    await page.goto(`${BASE_URL}/property?address=123+Test+St`);

    await expect(page.locator('.brand-name')).toBeVisible();
    await expect(page.locator('.ribbon')).toBeVisible();
    await expect(page.locator('.hero')).not.toBeVisible();
    await expect(page.locator('.site-footer')).toBeVisible();
  });
});

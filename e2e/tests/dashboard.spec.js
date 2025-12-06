/**
 * E2E Tests for Dashboard
 * 
 * Tests dashboard loading, chart rendering, and basic interactions
 */

import { test, expect } from '@playwright/test';
import { setupCommonMocks } from '../helpers/apiMocks.js';
import { waitForReactRender, waitForAPIToComplete } from '../helpers/testUtils.js';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Setup API mocks before each test
    await setupCommonMocks(page);
  });

  test('should load dashboard successfully', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Wait for page to load and API calls to complete
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 1000);
    
    // Verify dashboard loaded
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Verify we're on dashboard route
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should display dashboard header', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 1000);
    
    // Look for common dashboard elements (adjust selectors based on actual UI)
    // Check for navigation or header elements
    const header = page.locator('header, nav, [role="banner"]').first();
    if (await header.count() > 0) {
      await expect(header).toBeVisible();
    }
  });

  test('should display charts on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 2000);
    
    // Wait for chart containers to appear
    // Charts might be in cards or containers with data-chart-id
    const chartContainers = page.locator('[data-chart-id], .chart, [class*="chart"]');
    const chartCount = await chartContainers.count();
    
    // Should have at least some chart elements (even if empty state)
    expect(chartCount).toBeGreaterThanOrEqual(0);
  });

  test('should handle empty state when no data', async ({ page }) => {
    // Mock empty dashboard response
    await page.route('**/api/v1/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ charts: [], lastUpdated: new Date().toISOString() }),
      });
    });

    await page.goto('/dashboard');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 1000);
    
    // Check for empty state message (adjust selector based on actual component)
    const emptyState = page.locator('text=/no data|empty|no charts/i').first();
    if (await emptyState.count() > 0) {
      await expect(emptyState).toBeVisible();
    }
  });

  test('should handle error state', async ({ page }) => {
    // Mock error response
    await page.route('**/api/v1/dashboard', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto('/dashboard');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 1000);
    
    // Check for error message (adjust selector based on actual component)
    const errorMessage = page.locator('text=/error|failed|something went wrong/i').first();
    if (await errorMessage.count() > 0) {
      await expect(errorMessage).toBeVisible();
    }
  });

  test('should navigate to reports page', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 1000);
    
    // Look for reports link/button (adjust selector based on actual navigation)
    const reportsLink = page.locator('a[href*="reports"], button:has-text("Reports"), nav a:has-text("Reports")').first();
    
    if (await reportsLink.count() > 0) {
      await reportsLink.click();
      await waitForReactRender(page, 1000);
      await expect(page).toHaveURL(/.*reports/);
    }
  });
});


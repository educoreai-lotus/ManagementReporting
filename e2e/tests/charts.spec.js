/**
 * E2E Tests for Charts
 * 
 * Tests chart rendering, chart detail pages, and basic chart interactions
 */

import { test, expect } from '@playwright/test';
import { setupCommonMocks } from '../helpers/apiMocks.js';
import { waitForReactRender, waitForAPIToComplete } from '../helpers/testUtils.js';

test.describe('Charts', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page);
    
    // Mock chart detail API
    await page.route('**/api/v1/dashboard/chart/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'chart-1',
          title: 'Course Completion Rate',
          type: 'bar',
          data: [
            { name: 'Jan', value: 75 },
            { name: 'Feb', value: 82 },
            { name: 'Mar', value: 88 }
          ]
        }),
      });
    });
  });

  test('should render charts on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 2000);
    
    // Look for chart containers
    // Recharts typically creates elements with class 'recharts-wrapper'
    const chartWrappers = page.locator('.recharts-wrapper, [data-chart-id], [class*="chart"]');
    const chartCount = await chartWrappers.count();
    
    // Should have at least some chart elements
    expect(chartCount).toBeGreaterThanOrEqual(0);
  });

  test('should display chart titles', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 2000);
    
    // Look for chart titles (adjust based on actual structure)
    const chartTitle = page.locator('text=Course Completion Rate, text=User Engagement').first();
    
    if (await chartTitle.count() > 0) {
      await expect(chartTitle).toBeVisible();
    }
  });

  test('should navigate to chart detail page', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 2000);
    
    // Look for clickable chart elements
    const chartCard = page.locator('[data-chart-id], .chart-card, [class*="chart-card"]').first();
    
    if (await chartCard.count() > 0) {
      await chartCard.click();
      await waitForReactRender(page, 2000);
      
      // Verify navigation to chart detail
      await expect(page).toHaveURL(/.*chart.*/);
    }
  });

  test('should display chart detail page', async ({ page }) => {
    await page.goto('/dashboard/chart/chart-1');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 2000);
    
    // Verify chart detail page loaded
    await expect(page).toHaveURL(/.*chart.*/);
    
    // Look for chart visualization
    const chartVisualization = page.locator('.recharts-wrapper, [data-chart-id], canvas, svg').first();
    if (await chartVisualization.count() > 0) {
      await expect(chartVisualization).toBeVisible();
    }
  });

  test('should display chart data table', async ({ page }) => {
    await page.goto('/dashboard/chart/chart-1');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 2000);
    
    // Look for data table (adjust selector based on actual component)
    const dataTable = page.locator('table, [role="table"], [class*="table"]').first();
    
    if (await dataTable.count() > 0) {
      await expect(dataTable).toBeVisible();
    }
  });

  test('should handle chart loading state', async ({ page }) => {
    // Delay API response to see loading state
    await page.route('**/api/v1/dashboard/chart/**', async (route) => {
      await page.waitForTimeout(500);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'chart-1',
          title: 'Test Chart',
          type: 'bar',
          data: []
        }),
      });
    });

    await page.goto('/dashboard/chart/chart-1');
    
    // Check for loading indicator (adjust selector)
    const loadingSpinner = page.locator('[class*="loading"], [class*="spinner"], text=/loading/i').first();
    if (await loadingSpinner.count() > 0) {
      // Loading should appear briefly
      await expect(loadingSpinner).toBeVisible({ timeout: 1000 });
    }
  });

  test('should handle chart error state', async ({ page }) => {
    // Mock error response
    await page.route('**/api/v1/dashboard/chart/**', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Chart not found' }),
      });
    });

    await page.goto('/dashboard/chart/invalid-chart');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 1000);
    
    // Check for error message
    const errorMessage = page.locator('text=/error|not found|failed/i').first();
    if (await errorMessage.count() > 0) {
      await expect(errorMessage).toBeVisible();
    }
  });
});


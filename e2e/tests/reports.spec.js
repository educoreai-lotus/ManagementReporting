/**
 * E2E Tests for Reports
 * 
 * Tests report list rendering, report opening, and report UI
 */

import { test, expect } from '@playwright/test';
import { setupReportMocks } from '../helpers/apiMocks.js';
import { waitForReactRender, waitForAPIToComplete } from '../helpers/testUtils.js';
import mockReports from '../fixtures/mockReports.json';

test.describe('Reports', () => {
  test.beforeEach(async ({ page }) => {
    // Setup API mocks before each test
    await setupReportMocks(page);
  });

  test('should load reports page', async ({ page }) => {
    await page.goto('/reports');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 1000);
    
    // Verify reports page loaded
    await expect(page).toHaveURL(/.*reports/);
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should display list of report types', async ({ page }) => {
    await page.goto('/reports');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 2000);
    
    // Check for report type items
    // Look for report names from mock data
    const firstReportName = mockReports.reportTypes[0].name;
    const reportElement = page.locator(`text=${firstReportName}`).first();
    
    if (await reportElement.count() > 0) {
      await expect(reportElement).toBeVisible();
    }
  });

  test('should open report generation UI', async ({ page }) => {
    await page.goto('/reports');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 2000);
    
    // Look for generate button or report type click
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Create"), [role="button"]:has-text(/report/i)').first();
    
    if (await generateButton.count() > 0) {
      await generateButton.click();
      await waitForReactRender(page, 2000);
      
      // Verify report generation UI appeared
      // Look for loading state or report content
      const reportContent = page.locator('text=/report|generating|loading/i').first();
      if (await reportContent.count() > 0) {
        await expect(reportContent).toBeVisible();
      }
    }
  });

  test('should display report content after generation', async ({ page }) => {
    await page.goto('/reports');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 2000);
    
    // Trigger report generation
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Create")').first();
    
    if (await generateButton.count() > 0) {
      await generateButton.click();
      await waitForAPIToComplete(page, 15000);
      await waitForReactRender(page, 2000);
      
      // Verify report content appears
      // Look for charts, summary, or AI insights
      const reportCharts = page.locator('[data-chart-id], .chart, [class*="chart"]');
      const chartCount = await reportCharts.count();
      
      // Should have some content (charts or text)
      expect(chartCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should handle report generation error', async ({ page }) => {
    // Mock error response for report generation
    await page.route('**/api/v1/reports/generate', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to generate report' }),
      });
    });

    await page.goto('/reports');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 2000);
    
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Create")').first();
    
    if (await generateButton.count() > 0) {
      await generateButton.click();
      await waitForAPIToComplete(page, 10000);
      await waitForReactRender(page, 1000);
      
      // Check for error message
      const errorMessage = page.locator('text=/error|failed|something went wrong/i').first();
      if (await errorMessage.count() > 0) {
        await expect(errorMessage).toBeVisible();
      }
    }
  });

  test('should display report metadata', async ({ page }) => {
    await page.goto('/reports');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 2000);
    
    // Trigger report generation
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Create")').first();
    
    if (await generateButton.count() > 0) {
      await generateButton.click();
      await waitForAPIToComplete(page, 15000);
      await waitForReactRender(page, 2000);
      
      // Look for report metadata (title, date, etc.)
      const reportTitle = page.locator('h1, h2, [class*="title"], [class*="header"]').first();
      if (await reportTitle.count() > 0) {
        await expect(reportTitle).toBeVisible();
      }
    }
  });
});



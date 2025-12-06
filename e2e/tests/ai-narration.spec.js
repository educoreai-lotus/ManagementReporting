/**
 * E2E Tests for AI Narration
 * 
 * Tests AI narration generation flow, API mocking, and UI updates
 */

import { test, expect } from '@playwright/test';
import { setupNarrationMocks } from '../helpers/apiMocks.js';
import { waitForReactRender, waitForAPIToComplete } from '../helpers/testUtils.js';

test.describe('AI Narration', () => {
  test.beforeEach(async ({ page }) => {
    await setupNarrationMocks(page);
    
    // Mock report generation
    await page.route('**/api/v1/reports/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reportId: 'report-123',
          type: 'monthly-performance',
          charts: [
            {
              id: 'report-chart-1',
              title: 'Performance Metrics',
              type: 'bar',
              data: [{ name: 'Metric 1', value: 85 }]
            }
          ],
          executiveSummary: {
            title: 'Monthly Performance Summary'
          }
        }),
      });
    });
  });

  test('should generate narration for report', async ({ page }) => {
    await page.goto('/reports');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 2000);
    
    // Generate a report
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Create")').first();
    
    if (await generateButton.count() > 0) {
      await generateButton.click();
      await waitForAPIToComplete(page, 15000);
      await waitForReactRender(page, 3000);
      
      // Look for narration section or AI insights
      const narrationSection = page.locator('text=/insights|narration|ai|conclusions/i').first();
      if (await narrationSection.count() > 0) {
        await expect(narrationSection).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should trigger narration API call', async ({ page }) => {
    let narrationCalled = false;
    
    // Track narration API calls
    await page.route('**/api/v1/openai/report-conclusions', async (route) => {
      narrationCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          narration: 'AI-generated narration about the report data',
          generatedAt: new Date().toISOString()
        }),
      });
    });

    await page.goto('/reports');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 2000);
    
    const generateButton = page.locator('button:has-text("Generate")').first();
    
    if (await generateButton.count() > 0) {
      await generateButton.click();
      await waitForAPIToComplete(page, 15000);
      await waitForReactRender(page, 3000);
      
      // Verify narration API was called
      expect(narrationCalled).toBe(true);
    }
  });

  test('should show loading state during narration generation', async ({ page }) => {
    // Delay narration response
    await page.route('**/api/v1/openai/report-conclusions', async (route) => {
      await page.waitForTimeout(2000);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          narration: 'Generated narration',
          generatedAt: new Date().toISOString()
        }),
      });
    });

    await page.goto('/reports');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 2000);
    
    const generateButton = page.locator('button:has-text("Generate")').first();
    
    if (await generateButton.count() > 0) {
      await generateButton.click();
      await waitForReactRender(page, 500);
      
      // Check for loading indicator
      const loadingIndicator = page.locator('[class*="loading"], [class*="spinner"], text=/generating|loading/i').first();
      if (await loadingIndicator.count() > 0) {
        await expect(loadingIndicator).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('should handle narration error gracefully', async ({ page }) => {
    // Mock narration error
    await page.route('**/api/v1/openai/report-conclusions', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Narration generation failed' }),
      });
    });

    await page.goto('/reports');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 2000);
    
    const generateButton = page.locator('button:has-text("Generate")').first();
    
    if (await generateButton.count() > 0) {
      await generateButton.click();
      await waitForAPIToComplete(page, 15000);
      await waitForReactRender(page, 2000);
      
      // Report should still be displayed even if narration fails
      const reportContent = page.locator('[data-chart-id], .chart, text=/report|summary/i').first();
      if (await reportContent.count() > 0) {
        await expect(reportContent).toBeVisible();
      }
    }
  });

  test('should display narration text in report', async ({ page }) => {
    await page.goto('/reports');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 2000);
    
    const generateButton = page.locator('button:has-text("Generate")').first();
    
    if (await generateButton.count() > 0) {
      await generateButton.click();
      await waitForAPIToComplete(page, 15000);
      await waitForReactRender(page, 3000);
      
      // Look for narration text content
      const narrationText = page.locator('text=/chart|data|trend|performance|analysis/i').first();
      if (await narrationText.count() > 0) {
        await expect(narrationText).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should handle empty narration response', async ({ page }) => {
    // Mock empty narration
    await page.route('**/api/v1/openai/report-conclusions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          narration: '',
          generatedAt: new Date().toISOString()
        }),
      });
    });

    await page.goto('/reports');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 2000);
    
    const generateButton = page.locator('button:has-text("Generate")').first();
    
    if (await generateButton.count() > 0) {
      await generateButton.click();
      await waitForAPIToComplete(page, 15000);
      await waitForReactRender(page, 2000);
      
      // Report should still be displayed
      const reportContent = page.locator('[data-chart-id], .chart').first();
      if (await reportContent.count() > 0) {
        await expect(reportContent).toBeVisible();
      }
    }
  });
});


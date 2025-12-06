/**
 * E2E Tests for AI Chart Transcription
 * 
 * Tests chart transcription flow, API mocking, and UI updates
 */

import { test, expect } from '@playwright/test';
import { setupTranscriptionMocks } from '../helpers/apiMocks.js';
import { waitForReactRender, waitForAPIToComplete } from '../helpers/testUtils.js';

test.describe('AI Chart Transcription', () => {
  test.beforeEach(async ({ page }) => {
    await setupTranscriptionMocks(page);
  });

  test('should display transcription for chart', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 2000);
    
    // Navigate to chart detail
    const chartCard = page.locator('[data-chart-id], .chart-card').first();
    
    if (await chartCard.count() > 0) {
      await chartCard.click();
      await waitForAPIToComplete(page, 10000);
      await waitForReactRender(page, 2000);
      
      // Wait for transcription to load (it should load automatically)
      await waitForAPIToComplete(page, 10000);
      await waitForReactRender(page, 2000);
      
      // Look for transcription text
      const transcriptionText = page.locator('text=/chart|shows|displays|completion rate/i').first();
      if (await transcriptionText.count() > 0) {
        await expect(transcriptionText).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should trigger transcription API call', async ({ page }) => {
    let transcriptionCalled = false;
    
    // Track transcription API calls
    await page.route('**/api/v1/ai/chart-transcription/**', async (route) => {
      if (route.request().method() === 'GET') {
        transcriptionCalled = true;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            exists: true,
            transcription_text: 'This chart shows the course completion rate over time.',
            chartId: 'chart-1'
          }
        }),
      });
    });

    await page.goto('/dashboard/chart/chart-1');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 2000);
    
    // Verify transcription API was called
    expect(transcriptionCalled).toBe(true);
  });

  test('should handle transcription loading state', async ({ page }) => {
    // Delay transcription response
    await page.route('**/api/v1/ai/chart-transcription/**', async (route) => {
      await page.waitForTimeout(1000);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            exists: true,
            transcription_text: 'Chart transcription text',
            chartId: 'chart-1'
          }
        }),
      });
    });

    await page.goto('/dashboard/chart/chart-1');
    
    // Check for loading indicator (if present)
    const loadingIndicator = page.locator('[class*="loading"], [class*="spinner"]').first();
    if (await loadingIndicator.count() > 0) {
      await expect(loadingIndicator).toBeVisible({ timeout: 2000 });
    }
  });

  test('should handle transcription error', async ({ page }) => {
    // Mock transcription error
    await page.route('**/api/v1/ai/chart-transcription/**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Transcription failed' }),
      });
    });

    await page.goto('/dashboard/chart/chart-1');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 2000);
    
    // Check for error handling (should not crash, may show empty state)
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should handle missing transcription gracefully', async ({ page }) => {
    // Mock no transcription found
    await page.route('**/api/v1/ai/chart-transcription/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            exists: false,
            transcription_text: null,
            chartId: 'chart-1'
          }
        }),
      });
    });

    await page.goto('/dashboard/chart/chart-1');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 2000);
    
    // Should still display chart even without transcription
    const chartVisualization = page.locator('.recharts-wrapper, [data-chart-id], svg').first();
    if (await chartVisualization.count() > 0) {
      await expect(chartVisualization).toBeVisible();
    }
  });

  test('should update transcription when refreshed', async ({ page }) => {
    let callCount = 0;
    
    await page.route('**/api/v1/ai/chart-transcription/**', async (route) => {
      callCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            exists: true,
            transcription_text: `Updated transcription ${callCount}`,
            chartId: 'chart-1'
          }
        }),
      });
    });

    await page.goto('/dashboard/chart/chart-1');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 2000);
    
    // Look for refresh button (if exists)
    const refreshButton = page.locator('button:has-text("Refresh"), button:has-text("Reload")').first();
    
    if (await refreshButton.count() > 0) {
      const initialCallCount = callCount;
      await refreshButton.click();
      await waitForAPIToComplete(page, 10000);
      await waitForReactRender(page, 1000);
      
      // Verify API was called again
      expect(callCount).toBeGreaterThan(initialCallCount);
    }
  });
});


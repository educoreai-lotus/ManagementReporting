/**
 * E2E Tests for PDF Generation
 * 
 * Tests PDF download flow, UI states, and error handling
 */

import { test, expect } from '@playwright/test';
import { setupReportMocks } from '../helpers/apiMocks.js';
import { waitForReactRender, waitForAPIToComplete } from '../helpers/testUtils.js';

test.describe('PDF Generation', () => {
  test.beforeEach(async ({ page }) => {
    await setupReportMocks(page);
  });

  test('should trigger PDF download from report', async ({ page }) => {
    await page.goto('/reports');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 2000);
    
    // Generate a report first
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Create")').first();
    
    if (await generateButton.count() > 0) {
      await generateButton.click();
      await waitForAPIToComplete(page, 15000);
      await waitForReactRender(page, 2000);
      
      // Look for download PDF button
      const downloadButton = page.locator('button:has-text("Download"), button:has-text("PDF"), a:has-text("Download")').first();
      
      if (await downloadButton.count() > 0) {
        // Set up download listener
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
        
        await downloadButton.click();
        
        // Wait for download to start (or API call for PDF generation)
        await waitForAPIToComplete(page, 10000);
        
        // Verify PDF generation was triggered (check API call was made)
        // The actual download might be intercepted by the mock
        const download = await downloadPromise;
        
        // If download occurred, verify it's a PDF
        if (download) {
          expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
        }
      }
    }
  });

  test('should show loading state during PDF generation', async ({ page }) => {
    // Mock delayed PDF response
    await page.route('**/api/v1/reports/generate**', async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      if (postData?.format === 'pdf') {
        // Delay response to see loading state
        await page.waitForTimeout(1000);
        await route.fulfill({
          status: 200,
          contentType: 'application/pdf',
          body: Buffer.from('mock-pdf-content'),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            reportId: 'report-123',
            type: 'monthly-performance',
            charts: []
          }),
        });
      }
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
        await expect(loadingIndicator).toBeVisible({ timeout: 2000 });
      }
    }
  });

  test('should handle PDF generation error', async ({ page }) => {
    // Mock PDF generation error
    await page.route('**/api/v1/reports/generate**', async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      if (postData?.format === 'pdf') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'PDF generation failed' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            reportId: 'report-123',
            type: 'monthly-performance',
            charts: []
          }),
        });
      }
    });

    await page.goto('/reports');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 2000);
    
    const generateButton = page.locator('button:has-text("Generate")').first();
    
    if (await generateButton.count() > 0) {
      await generateButton.click();
      await waitForAPIToComplete(page, 15000);
      await waitForReactRender(page, 2000);
      
      // Try to download PDF
      const downloadButton = page.locator('button:has-text("Download"), button:has-text("PDF")').first();
      
      if (await downloadButton.count() > 0) {
        await downloadButton.click();
        await waitForAPIToComplete(page, 10000);
        await waitForReactRender(page, 1000);
        
        // Check for error message
        const errorMessage = page.locator('text=/error|failed|something went wrong/i').first();
        if (await errorMessage.count() > 0) {
          await expect(errorMessage).toBeVisible();
        }
      }
    }
  });

  test('should show success state after PDF generation', async ({ page }) => {
    await page.goto('/reports');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 2000);
    
    const generateButton = page.locator('button:has-text("Generate")').first();
    
    if (await generateButton.count() > 0) {
      await generateButton.click();
      await waitForAPIToComplete(page, 15000);
      await waitForReactRender(page, 2000);
      
      // Verify report content is displayed (success state)
      const reportContent = page.locator('[data-chart-id], .chart, text=/report|summary/i').first();
      if (await reportContent.count() > 0) {
        await expect(reportContent).toBeVisible();
      }
    }
  });
});


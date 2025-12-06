/**
 * Example E2E Test
 * 
 * Simple smoke test to verify that the frontend loads correctly
 * 
 * NOTE: More comprehensive tests are in:
 * - dashboard.spec.js
 * - reports.spec.js
 * - charts.spec.js
 * - etc.
 */

import { test, expect } from '@playwright/test';
import { setupCommonMocks } from '../helpers/apiMocks.js';
import { waitForReactRender, waitForAPIToComplete } from '../helpers/testUtils.js';

test.describe('Frontend Application - Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page);
  });

  test('should load the frontend application', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the page to load
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 1000);
    
    // Verify the page loaded
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should navigate to dashboard', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for navigation to complete
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 1000);
    
    // Check if we're on the dashboard (URL should redirect to /dashboard)
    await expect(page).toHaveURL(/.*dashboard/);
  });
});


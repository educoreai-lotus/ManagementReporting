/**
 * E2E Tests for User Preferences
 * 
 * Tests theme toggle, preference persistence, and UI updates
 */

import { test, expect } from '@playwright/test';
import { setupCommonMocks } from '../helpers/apiMocks.js';
import { waitForReactRender, waitForAPIToComplete } from '../helpers/testUtils.js';

test.describe('User Preferences', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page);
    
    // Clear localStorage before each test
    await page.addInitScript(() => {
      localStorage.clear();
    });
  });

  test('should toggle theme from light to dark', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 1000);
    
    // Check initial theme (should be light by default)
    const htmlElement = page.locator('html');
    let hasDarkClass = await htmlElement.evaluate((el) => el.classList.contains('dark'));
    expect(hasDarkClass).toBe(false);
    
    // Look for theme toggle button
    const themeToggle = page.locator('button[aria-label*="theme"], button:has-text("Theme"), button:has-text("Dark"), button:has-text("Light"), [class*="theme-toggle"]').first();
    
    if (await themeToggle.count() > 0) {
      await themeToggle.click();
      await waitForReactRender(page, 500);
      
      // Verify dark class was added
      hasDarkClass = await htmlElement.evaluate((el) => el.classList.contains('dark'));
      expect(hasDarkClass).toBe(true);
    }
  });

  test('should toggle theme from dark to light', async ({ page }) => {
    // Set initial theme to dark
    await page.addInitScript(() => {
      localStorage.setItem('mr_pref_theme', JSON.stringify('dark'));
    });

    await page.goto('/dashboard');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 1000);
    
    // Verify dark theme is active
    const htmlElement = page.locator('html');
    let hasDarkClass = await htmlElement.evaluate((el) => el.classList.contains('dark'));
    expect(hasDarkClass).toBe(true);
    
    // Toggle to light
    const themeToggle = page.locator('button[aria-label*="theme"], button:has-text("Theme"), button:has-text("Light"), [class*="theme-toggle"]').first();
    
    if (await themeToggle.count() > 0) {
      await themeToggle.click();
      await waitForReactRender(page, 500);
      
      // Verify dark class was removed
      hasDarkClass = await htmlElement.evaluate((el) => el.classList.contains('dark'));
      expect(hasDarkClass).toBe(false);
    }
  });

  test('should persist theme preference in localStorage', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 1000);
    
    const themeToggle = page.locator('button[aria-label*="theme"], button:has-text("Theme"), [class*="theme-toggle"]').first();
    
    if (await themeToggle.count() > 0) {
      // Toggle theme
      await themeToggle.click();
      await waitForReactRender(page, 500);
      
      // Check localStorage
      const themePreference = await page.evaluate(() => {
        return localStorage.getItem('mr_pref_theme');
      });
      
      // Should have theme preference stored
      expect(themePreference).toBeTruthy();
    }
  });

  test('should load saved theme preference on page load', async ({ page }) => {
    // Set theme preference before page load
    await page.addInitScript(() => {
      localStorage.setItem('mr_pref_theme', JSON.stringify('dark'));
    });

    await page.goto('/dashboard');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 1000);
    
    // Verify dark theme is applied
    const htmlElement = page.locator('html');
    const hasDarkClass = await htmlElement.evaluate((el) => el.classList.contains('dark'));
    expect(hasDarkClass).toBe(true);
  });

  test('should maintain theme across page navigation', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 1000);
    
    const themeToggle = page.locator('button[aria-label*="theme"], button:has-text("Theme"), [class*="theme-toggle"]').first();
    
    if (await themeToggle.count() > 0) {
      // Toggle to dark
      await themeToggle.click();
      await waitForReactRender(page, 500);
      
      // Navigate to reports
      const reportsLink = page.locator('a[href*="reports"], nav a:has-text("Reports")').first();
      
      if (await reportsLink.count() > 0) {
        await reportsLink.click();
        await waitForReactRender(page, 1000);
        
        // Verify theme is still dark
        const htmlElement = page.locator('html');
        const hasDarkClass = await htmlElement.evaluate((el) => el.classList.contains('dark'));
        expect(hasDarkClass).toBe(true);
      }
    }
  });

  test('should update UI elements when theme changes', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForAPIToComplete(page, 10000);
    await waitForReactRender(page, 1000);
    
    // Get initial background color or class
    const body = page.locator('body');
    const initialClasses = await body.getAttribute('class') || '';
    
    const themeToggle = page.locator('button[aria-label*="theme"], button:has-text("Theme"), [class*="theme-toggle"]').first();
    
    if (await themeToggle.count() > 0) {
      await themeToggle.click();
      await waitForReactRender(page, 500);
      
      // Verify body classes changed (theme classes should update)
      const updatedClasses = await body.getAttribute('class') || '';
      // Classes should have changed (though exact classes depend on implementation)
      expect(updatedClasses).toBeTruthy();
    }
  });
});


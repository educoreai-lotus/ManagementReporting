/**
 * Playwright E2E Test Configuration
 * 
 * Tests the frontend application end-to-end
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './e2e/tests',
  
  // Maximum time one test can run for
  timeout: 30 * 1000,
  
  // Test execution
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: 'html',
  
  // Shared settings for all projects
  use: {
    // Base URL for the application
    baseURL: 'http://localhost:5173',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run local dev server before starting tests
  // Note: This assumes the frontend dev server is already running
  // If you want Playwright to start it automatically, uncomment and configure:
  // webServer: {
  //   command: 'cd frontend && npm run dev',
  //   url: 'http://localhost:5173',
  //   reuseExistingServer: !process.env.CI,
  // },
});


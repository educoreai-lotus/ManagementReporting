/**
 * E2E Test Utilities
 * 
 * Common helper functions for E2E tests
 */

/**
 * Wait for API requests to complete
 * @param {Page} page - Playwright page object
 * @param {number} timeout - Maximum time to wait in milliseconds
 */
export async function waitForAPIToComplete(page, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for a specific element to be visible
 * @param {Page} page - Playwright page object
 * @param {string} selector - CSS selector or test ID
 * @param {number} timeout - Maximum time to wait in milliseconds
 */
export async function waitForElement(page, selector, timeout = 5000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Check if an element exists on the page
 * @param {Page} page - Playwright page object
 * @param {string} selector - CSS selector or test ID
 * @returns {boolean} True if element exists
 */
export async function elementExists(page, selector) {
  const element = await page.locator(selector).first();
  return await element.count() > 0;
}

/**
 * Mock API response using Playwright route interception
 * @param {Page} page - Playwright page object
 * @param {string} urlPattern - URL pattern to intercept (regex or string)
 * @param {Object} responseData - Response data to return
 * @param {number} status - HTTP status code (default: 200)
 */
export async function mockAPIResponse(page, urlPattern, responseData, status = 200) {
  await page.route(urlPattern, async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(responseData),
    });
  });
}

/**
 * Clear all mocked routes
 * @param {Page} page - Playwright page object
 */
export async function clearMocks(page) {
  await page.unrouteAll();
}

/**
 * Take a screenshot with a descriptive name
 * @param {Page} page - Playwright page object
 * @param {string} name - Screenshot name
 */
export async function takeScreenshot(page, name) {
  await page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true });
}

/**
 * Wait for React to finish rendering
 * @param {Page} page - Playwright page object
 * @param {number} delay - Additional delay in milliseconds
 */
export async function waitForReactRender(page, delay = 500) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(delay);
}

/**
 * Check if element is visible and contains text
 * @param {Page} page - Playwright page object
 * @param {string} selector - CSS selector
 * @param {string} text - Expected text
 */
export async function expectElementWithText(page, selector, text) {
  const element = page.locator(selector);
  await expect(element).toBeVisible();
  await expect(element).toContainText(text);
}


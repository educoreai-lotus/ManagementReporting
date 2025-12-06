/**
 * Test Helper Utilities
 * 
 * Common utilities for testing (mocks, fixtures, etc.)
 * This file is ONLY for test helpers, not production code.
 */

/**
 * Creates a mock Express request object
 */
export function createMockRequest(overrides = {}) {
  return {
    body: {},
    query: {},
    params: {},
    headers: {},
    user: null,
    ...overrides
  };
}

/**
 * Creates a mock Express response object
 */
export function createMockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  };
  return res;
}

/**
 * Creates a mock Express next function
 */
export function createMockNext() {
  return jest.fn();
}

/**
 * Waits for a specified number of milliseconds
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}



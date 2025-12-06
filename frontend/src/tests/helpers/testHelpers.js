/**
 * Test Helper Utilities
 * Common utilities for frontend tests
 */

import { vi } from 'vitest';

/**
 * Creates a mock localStorage
 */
export function createMockLocalStorage() {
  const store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    })
  };
}

/**
 * Creates a mock sessionStorage
 */
export function createMockSessionStorage() {
  const store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    })
  };
}

/**
 * Waits for a specified number of milliseconds
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates mock chart data for testing
 */
export function createMockChartData(overrides = {}) {
  return {
    id: 'chart-1',
    title: 'Test Chart',
    type: 'bar',
    data: [
      { name: 'A', value: 10 },
      { name: 'B', value: 20 }
    ],
    metadata: {},
    ...overrides
  };
}

/**
 * Creates mock dashboard data for testing
 */
export function createMockDashboardData(overrides = {}) {
  return {
    charts: [
      createMockChartData({ id: 'chart-1' }),
      createMockChartData({ id: 'chart-2' })
    ],
    lastUpdated: new Date().toISOString(),
    ...overrides
  };
}


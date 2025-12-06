/**
 * Vitest Setup File
 * 
 * This file runs before each test file.
 * Use it to configure testing utilities, global mocks, or test environment setup.
 */

import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test (e.g., clearing jsdom)
afterEach(() => {
  cleanup();
});

// You can add global test utilities, mocks, or configurations here
// Example:
// - Mock window.matchMedia
// - Mock IntersectionObserver
// - Configure global test timeouts
// - Set up test data factories



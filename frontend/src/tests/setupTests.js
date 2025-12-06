/**
 * Vitest Setup File
 * 
 * This file runs before each test file.
 * Use it to configure testing utilities, global mocks, or test environment setup.
 */

import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] || null
  };
})();

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] || null
  };
})();

// Set up global mocks
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true
});

// Cleanup after each test (e.g., clearing jsdom and storage)
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

// You can add global test utilities, mocks, or configurations here
// Example:
// - Mock window.matchMedia
// - Mock IntersectionObserver
// - Configure global test timeouts
// - Set up test data factories



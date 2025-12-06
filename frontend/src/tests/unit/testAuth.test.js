/**
 * Unit tests for testAuth utility
 * Tests authentication helper functions for local development
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setTestToken,
  getTestToken,
  clearTestToken,
  isDevelopment
} from '../../utils/testAuth.js';

describe('testAuth', () => {
  beforeEach(() => {
    // localStorage is already cleared in setupTests.js
    // Reset module state by clearing token
    clearTestToken();
  });

  describe('setTestToken', () => {
    it('should set default token when no argument provided', () => {
      setTestToken();
      expect(localStorage.getItem('authToken')).toBe('test-token-for-local-development');
    });

    it('should set custom token when provided', () => {
      const customToken = 'custom-test-token';
      setTestToken(customToken);
      expect(localStorage.getItem('authToken')).toBe(customToken);
    });
  });

  describe('getTestToken', () => {
    it('should return null when no token is set', () => {
      expect(getTestToken()).toBeNull();
    });

    it('should return token when set', () => {
      const token = 'test-token-123';
      localStorage.setItem('authToken', token);
      expect(getTestToken()).toBe(token);
    });
  });

  describe('clearTestToken', () => {
    it('should remove token from localStorage', () => {
      setTestToken('test-token');
      expect(getTestToken()).toBe('test-token');
      
      clearTestToken();
      expect(getTestToken()).toBeNull();
    });

    it('should not throw error when no token exists', () => {
      expect(() => clearTestToken()).not.toThrow();
    });
  });

  describe('isDevelopment', () => {
    it('should check development mode from import.meta.env', () => {
      // This test verifies the function exists and can be called
      // Actual value depends on test environment configuration
      const result = isDevelopment();
      expect(typeof result).toBe('boolean');
    });
  });
});


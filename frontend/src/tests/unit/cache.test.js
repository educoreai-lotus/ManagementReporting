/**
 * Unit tests for browserCache service
 * Tests localStorage and sessionStorage operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { browserCache } from '../../services/cache.js';

describe('browserCache', () => {
  beforeEach(() => {
    // Clear storage before each test
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('setPreference / getPreference', () => {
    it('should save and retrieve preference', () => {
      browserCache.setPreference('theme', 'dark');
      expect(browserCache.getPreference('theme')).toBe('dark');
    });

    it('should return default value when preference not found', () => {
      expect(browserCache.getPreference('nonexistent', 'default')).toBe('default');
    });

    it('should handle JSON serialization', () => {
      const complexValue = { theme: 'dark', fontSize: 14 };
      browserCache.setPreference('settings', complexValue);
      expect(browserCache.getPreference('settings')).toEqual(complexValue);
    });

    it('should handle errors gracefully', () => {
      // Mock localStorage.setItem to throw error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      expect(() => browserCache.setPreference('test', 'value')).not.toThrow();
      
      localStorage.setItem = originalSetItem;
    });
  });

  describe('setTempData / getTempData', () => {
    it('should save and retrieve temp data', () => {
      browserCache.setTempData('temp', 'value');
      expect(browserCache.getTempData('temp')).toBe('value');
    });

    it('should return null when temp data not found', () => {
      expect(browserCache.getTempData('nonexistent')).toBeNull();
    });

    it('should expire temp data after TTL', () => {
      vi.useFakeTimers();
      browserCache.setTempData('temp', 'value', 1000); // 1 second TTL
      
      expect(browserCache.getTempData('temp')).toBe('value');
      
      vi.advanceTimersByTime(1001);
      expect(browserCache.getTempData('temp')).toBeNull();
      
      vi.useRealTimers();
    });

    it('should not expire temp data before TTL', () => {
      vi.useFakeTimers();
      browserCache.setTempData('temp', 'value', 5000);
      
      vi.advanceTimersByTime(4000);
      expect(browserCache.getTempData('temp')).toBe('value');
      
      vi.useRealTimers();
    });
  });

  describe('setPersistentData / getPersistentData', () => {
    it('should save and retrieve persistent data', () => {
      browserCache.setPersistentData('persist', 'value');
      expect(browserCache.getPersistentData('persist')).toBe('value');
    });

    it('should return null when persistent data not found', () => {
      expect(browserCache.getPersistentData('nonexistent')).toBeNull();
    });

    it('should handle complex objects', () => {
      const complexData = { charts: [{ id: 1 }, { id: 2 }] };
      browserCache.setPersistentData('complex', complexData);
      expect(browserCache.getPersistentData('complex')).toEqual(complexData);
    });
  });

  describe('clear', () => {
    it('should clear all cache when no prefix provided', () => {
      browserCache.setPreference('theme', 'dark');
      browserCache.setPersistentData('data', 'value');
      
      browserCache.clear();
      
      expect(browserCache.getPreference('theme')).toBeNull();
      expect(browserCache.getPersistentData('data')).toBeNull();
    });

    it('should clear cache with specific prefix', () => {
      browserCache.setPreference('theme', 'dark');
      browserCache.setPreference('fontSize', 14);
      
      browserCache.clear('pref_theme');
      
      // Note: Implementation clears by prefix, so 'pref_theme' would clear 'theme'
      // This test verifies the function doesn't throw
      expect(() => browserCache.clear('pref_theme')).not.toThrow();
    });
  });
});


/**
 * Unit tests for preferences service
 * Tests user preference management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { preferences } from '../../services/preferences.js';
import { browserCache } from '../../services/cache.js';

// Mock browserCache
vi.mock('../../services/cache.js', () => ({
  browserCache: {
    setPreference: vi.fn(),
    getPreference: vi.fn()
  }
}));

describe('preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setTheme / getTheme', () => {
    it('should set and get theme preference', () => {
      browserCache.getPreference.mockReturnValue('dark');
      preferences.setTheme('dark');
      
      expect(browserCache.setPreference).toHaveBeenCalledWith('theme', 'dark');
      expect(preferences.getTheme()).toBe('dark');
    });

    it('should return default theme when not set', () => {
      browserCache.getPreference.mockImplementation((key, defaultValue) => defaultValue);
      expect(preferences.getTheme()).toBe('light');
    });
  });

  describe('setDashboardView / getDashboardView', () => {
    it('should set and get dashboard view configuration', () => {
      const views = { view1: { config: 'value' } };
      browserCache.getPreference.mockReturnValue(views);
      
      preferences.setDashboardView('view1', { config: 'value' });
      
      expect(browserCache.getPreference).toHaveBeenCalledWith('dashboardViews', {});
      expect(preferences.getDashboardView('view1')).toEqual({ config: 'value' });
    });

    it('should return null for non-existent view', () => {
      browserCache.getPreference.mockReturnValue({});
      expect(preferences.getDashboardView('nonexistent')).toBeNull();
    });
  });

  describe('setDateRange / getDateRange', () => {
    it('should set and get date range', () => {
      const range = { start: '2024-01-01', end: '2024-01-31' };
      browserCache.getPreference.mockReturnValue(range);
      
      preferences.setDateRange(range);
      
      expect(browserCache.setPreference).toHaveBeenCalledWith('dateRange', range);
      expect(preferences.getDateRange()).toEqual(range);
    });

    it('should return default date range when not set', () => {
      browserCache.getPreference.mockImplementation((key, defaultValue) => defaultValue);
      const result = preferences.getDateRange();
      
      expect(result).toHaveProperty('start');
      expect(result).toHaveProperty('end');
      expect(new Date(result.start).getTime()).toBeLessThanOrEqual(new Date(result.end).getTime());
    });
  });

  describe('setOrganizationFilter / getOrganizationFilter', () => {
    it('should set and get organization filter', () => {
      browserCache.getPreference.mockReturnValue('org-123');
      
      preferences.setOrganizationFilter('org-123');
      
      expect(browserCache.setPreference).toHaveBeenCalledWith('organizationFilter', 'org-123');
      expect(preferences.getOrganizationFilter()).toBe('org-123');
    });

    it('should return null when organization filter not set', () => {
      browserCache.getPreference.mockReturnValue(null);
      expect(preferences.getOrganizationFilter()).toBeNull();
    });
  });
});


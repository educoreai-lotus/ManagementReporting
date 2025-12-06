/**
 * Hook tests for useTheme
 * Tests theme context and toggle functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../../context/ThemeContext.jsx';
import { preferences } from '../../services/preferences.js';

// Mock preferences service
vi.mock('../../services/preferences.js', () => ({
  preferences: {
    getTheme: vi.fn(() => 'light'),
    setTheme: vi.fn()
  }
}));

describe('useTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    preferences.getTheme.mockReturnValue('light');
  });

  it('should throw error when used outside ThemeProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      renderHook(() => useTheme());
    }).toThrow('useTheme must be used within ThemeProvider');
    
    consoleSpy.mockRestore();
  });

  it('should return theme from preferences on mount', () => {
    preferences.getTheme.mockReturnValue('dark');
    
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider
    });
    
    expect(result.current.theme).toBe('dark');
  });

  it('should toggle theme from light to dark', () => {
    preferences.getTheme.mockReturnValue('light');
    
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider
    });
    
    expect(result.current.theme).toBe('light');
    
    act(() => {
      result.current.toggleTheme();
    });
    
    expect(result.current.theme).toBe('dark');
    expect(preferences.setTheme).toHaveBeenCalledWith('dark');
  });

  it('should toggle theme from dark to light', () => {
    preferences.getTheme.mockReturnValue('dark');
    
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider
    });
    
    expect(result.current.theme).toBe('dark');
    
    act(() => {
      result.current.toggleTheme();
    });
    
    expect(result.current.theme).toBe('light');
    expect(preferences.setTheme).toHaveBeenCalledWith('light');
  });

  it('should apply dark class to document root when theme is dark', () => {
    preferences.getTheme.mockReturnValue('dark');
    
    renderHook(() => useTheme(), {
      wrapper: ThemeProvider
    });
    
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should remove dark class from document root when theme is light', () => {
    preferences.getTheme.mockReturnValue('light');
    
    renderHook(() => useTheme(), {
      wrapper: ThemeProvider
    });
    
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});


/**
 * Unit tests for colorPalette utility
 * Tests color generation functions
 */

import { describe, it, expect } from 'vitest';
import {
  generateDiverseColorPalette,
  generateGradientColorPalette,
  getColorForIndex,
  DIVERSE_COLORS
} from '../../utils/colorPalette.js';

describe('colorPalette', () => {
  describe('generateDiverseColorPalette', () => {
    it('should return empty array for count <= 0', () => {
      expect(generateDiverseColorPalette(0)).toEqual([]);
      expect(generateDiverseColorPalette(-1)).toEqual([]);
    });

    it('should return single color for count = 1', () => {
      const result = generateDiverseColorPalette(1);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(DIVERSE_COLORS[0]);
    });

    it('should return multiple distinct colors', () => {
      const result = generateDiverseColorPalette(5);
      expect(result).toHaveLength(5);
      expect(result[0]).toBe(DIVERSE_COLORS[0]);
      expect(result[1]).toBe(DIVERSE_COLORS[1]);
      expect(result[2]).toBe(DIVERSE_COLORS[2]);
    });

    it('should cycle through colors when count exceeds available colors', () => {
      const count = DIVERSE_COLORS.length + 3;
      const result = generateDiverseColorPalette(count);
      expect(result).toHaveLength(count);
      expect(result[0]).toBe(DIVERSE_COLORS[0]);
      expect(result[DIVERSE_COLORS.length]).toBe(DIVERSE_COLORS[0]); // Should cycle
      expect(result[DIVERSE_COLORS.length + 1]).toBe(DIVERSE_COLORS[1]);
    });

    it('should ignore baseColor parameter (not used in implementation)', () => {
      const result1 = generateDiverseColorPalette(3);
      const result2 = generateDiverseColorPalette(3, '#ff0000');
      expect(result1).toEqual(result2);
    });
  });

  describe('generateGradientColorPalette', () => {
    it('should return empty array for count <= 0', () => {
      expect(generateGradientColorPalette('#10b981', 0)).toEqual([]);
      expect(generateGradientColorPalette('#10b981', -1)).toEqual([]);
    });

    it('should generate gradient colors from base color', () => {
      const result = generateGradientColorPalette('#10b981', 3);
      expect(result).toHaveLength(3);
      expect(result[0]).toMatch(/^rgb\(/);
      expect(result[1]).toMatch(/^rgb\(/);
      expect(result[2]).toMatch(/^rgb\(/);
    });

    it('should create variations of the base color', () => {
      const result = generateGradientColorPalette('#000000', 2);
      expect(result[0]).toContain('rgb(0, 0, 0)');
      expect(result[1]).toContain('rgb(');
    });

    it('should handle hex color without # prefix', () => {
      const result = generateGradientColorPalette('10b981', 2);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatch(/^rgb\(/);
    });

    it('should clamp RGB values to valid range', () => {
      const result = generateGradientColorPalette('#ffffff', 5);
      result.forEach(color => {
        const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
          const r = parseInt(rgbMatch[1]);
          const g = parseInt(rgbMatch[2]);
          const b = parseInt(rgbMatch[3]);
          expect(r).toBeGreaterThanOrEqual(0);
          expect(r).toBeLessThanOrEqual(255);
          expect(g).toBeGreaterThanOrEqual(0);
          expect(g).toBeLessThanOrEqual(255);
          expect(b).toBeGreaterThanOrEqual(0);
          expect(b).toBeLessThanOrEqual(255);
        }
      });
    });
  });

  describe('getColorForIndex', () => {
    it('should return color for valid index', () => {
      expect(getColorForIndex(0)).toBe(DIVERSE_COLORS[0]);
      expect(getColorForIndex(1)).toBe(DIVERSE_COLORS[1]);
    });

    it('should cycle through colors for large indices', () => {
      const largeIndex = DIVERSE_COLORS.length + 5;
      expect(getColorForIndex(largeIndex)).toBe(DIVERSE_COLORS[5]);
    });

    it('should ignore baseColor parameter (not used in implementation)', () => {
      const result1 = getColorForIndex(0);
      const result2 = getColorForIndex(0, '#ff0000');
      expect(result1).toBe(result2);
    });
  });
});


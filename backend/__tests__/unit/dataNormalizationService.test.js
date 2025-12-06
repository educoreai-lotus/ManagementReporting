/**
 * Unit tests for DataNormalizationService
 * 
 * Tests pure normalization methods.
 */

import { DataNormalizationService } from '../../src/domain/services/DataNormalizationService.js';

describe('DataNormalizationService', () => {
  let service;

  beforeEach(() => {
    service = new DataNormalizationService();
  });

  describe('normalizeDate', () => {
    test('should convert valid date to ISO string', () => {
      const date = new Date('2024-01-01');
      const result = service.normalizeDate(date);
      
      expect(result).toBe(date.toISOString());
    });

    test('should handle date string', () => {
      const dateString = '2024-01-01T00:00:00.000Z';
      const result = service.normalizeDate(dateString);
      
      expect(result).toBe(new Date(dateString).toISOString());
    });

    test('should return null for null input', () => {
      expect(service.normalizeDate(null)).toBe(null);
    });

    test('should throw error for invalid date', () => {
      expect(() => {
        service.normalizeDate('invalid-date');
      }).toThrow('Invalid date format');
    });
  });

  describe('normalizeScaling', () => {
    test('should normalize percentage values', () => {
      expect(service.normalizeScaling(50, 'percentage')).toBe(50);
      expect(service.normalizeScaling(150, 'percentage')).toBe(100);
      expect(service.normalizeScaling(-10, 'percentage')).toBe(0);
    });

    test('should normalize grade values', () => {
      expect(service.normalizeScaling(8.5, 'grade')).toBe(85);
      expect(service.normalizeScaling(12, 'grade')).toBe(100);
      expect(service.normalizeScaling(-1, 'grade')).toBe(0);
    });

    test('should return parsed float for other types', () => {
      expect(service.normalizeScaling('123.5', 'other')).toBe(123.5);
      expect(service.normalizeScaling('invalid', 'other')).toBe(0);
    });
  });

  describe('normalize', () => {
    test('should normalize data with metrics', () => {
      const inputData = {
        timestamp: '2024-01-01',
        data: {
          metrics: {
            totalUsers: 100,
            completionRate: 85.5
          }
        }
      };
      
      const result = service.normalize(inputData, 'test-service');
      
      expect(result.timestamp).toBeDefined();
      expect(result.data.metrics.totalUsers).toBe(100);
      expect(result.data.metrics.completionRate).toBe(85.5);
      expect(result.metadata.source).toBe('test-service');
    });

    test('should preserve details if present', () => {
      const inputData = {
        data: {
          metrics: {},
          details: { users: [] }
        }
      };
      
      const result = service.normalize(inputData, 'test-service');
      
      expect(result.data.details).toEqual({ users: [] });
    });
  });
});



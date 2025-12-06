/**
 * Unit tests for Chart Signature utilities
 * 
 * Tests the computeChartSignature function which creates stable hashes for chart data.
 */

import { computeChartSignature, buildChartSignature } from '../../src/utils/chartSignature.js';

describe('computeChartSignature', () => {
  test('should generate consistent hash for same chart data', () => {
    const chartData = [{ name: 'A', value: 10 }, { name: 'B', value: 20 }];
    const topic1 = 'Report 1';
    const topic2 = 'Report 2';
    
    const hash1 = computeChartSignature(topic1, chartData);
    const hash2 = computeChartSignature(topic2, chartData);
    
    // Same chart data should produce same hash regardless of topic
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA256 hex string length
  });

  test('should generate different hashes for different chart data', () => {
    const chartData1 = [{ name: 'A', value: 10 }];
    const chartData2 = [{ name: 'A', value: 20 }];
    
    const hash1 = computeChartSignature('Topic', chartData1);
    const hash2 = computeChartSignature('Topic', chartData2);
    
    expect(hash1).not.toBe(hash2);
  });

  test('should handle object chart data', () => {
    const chartData = { metric: 'users', value: 100, date: '2024-01-01' };
    const hash = computeChartSignature('Topic', chartData);
    
    expect(hash).toHaveLength(64);
    expect(typeof hash).toBe('string');
  });

  test('should handle array chart data', () => {
    const chartData = [
      { name: 'Jan', value: 100 },
      { name: 'Feb', value: 200 }
    ];
    const hash = computeChartSignature('Topic', chartData);
    
    expect(hash).toHaveLength(64);
  });

  test('should handle primitive chart data', () => {
    const hash1 = computeChartSignature('Topic', 123);
    const hash2 = computeChartSignature('Topic', 'string');
    
    expect(hash1).toHaveLength(64);
    expect(hash2).toHaveLength(64);
    expect(hash1).not.toBe(hash2);
  });

  test('buildChartSignature should be an alias', () => {
    const chartData = [{ name: 'Test', value: 10 }];
    const hash1 = computeChartSignature('Topic', chartData);
    const hash2 = buildChartSignature('Topic', chartData);
    
    expect(hash1).toBe(hash2);
  });
});



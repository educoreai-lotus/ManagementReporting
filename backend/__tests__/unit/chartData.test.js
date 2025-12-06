/**
 * Unit tests for ChartData entity
 * 
 * Tests entity methods and behavior.
 */

import { ChartData } from '../../src/domain/entities/ChartData.js';

describe('ChartData', () => {
  test('should create ChartData with all properties', () => {
    const chartData = new ChartData({
      id: 'chart-1',
      title: 'Test Chart',
      type: 'bar',
      data: [{ name: 'A', value: 10 }],
      description: 'Test description',
      metadata: { color: 'blue' }
    });
    
    expect(chartData.id).toBe('chart-1');
    expect(chartData.title).toBe('Test Chart');
    expect(chartData.type).toBe('bar');
    expect(chartData.data).toHaveLength(1);
    expect(chartData.description).toBe('Test description');
    expect(chartData.metadata.color).toBe('blue');
  });

  test('should create ChartData with defaults', () => {
    const chartData = new ChartData({
      id: 'chart-1',
      title: 'Test Chart',
      type: 'line'
    });
    
    expect(chartData.data).toEqual([]);
    expect(chartData.metadata).toEqual({});
  });

  test('should add data point', () => {
    const chartData = new ChartData({
      id: 'chart-1',
      title: 'Test Chart',
      type: 'bar'
    });
    
    chartData.addDataPoint({ name: 'A', value: 10 });
    
    expect(chartData.data).toHaveLength(1);
    expect(chartData.data[0]).toEqual({ name: 'A', value: 10 });
  });

  test('should convert to JSON', () => {
    const chartData = new ChartData({
      id: 'chart-1',
      title: 'Test Chart',
      type: 'bar',
      data: [{ name: 'A', value: 10 }],
      description: 'Test',
      metadata: { color: 'blue' }
    });
    
    const json = chartData.toJSON();
    
    expect(json).toEqual({
      id: 'chart-1',
      title: 'Test Chart',
      type: 'bar',
      data: [{ name: 'A', value: 10 }],
      description: 'Test',
      metadata: { color: 'blue' }
    });
  });
});



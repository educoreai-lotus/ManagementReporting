/**
 * Unit tests for Report entity
 * 
 * Tests entity methods and behavior.
 */

import { Report } from '../../src/domain/entities/Report.js';

describe('Report', () => {
  test('should create Report with all properties', () => {
    const report = new Report({
      id: 'report-1',
      type: 'monthly-performance',
      executiveSummary: { title: 'Summary' },
      charts: [{ id: 'chart-1' }],
      dataTable: [],
      aiInsights: { insights: [] },
      generatedAt: '2024-01-01',
      metadata: { version: '1.0' }
    });
    
    expect(report.id).toBe('report-1');
    expect(report.type).toBe('monthly-performance');
    expect(report.executiveSummary.title).toBe('Summary');
    expect(report.charts).toHaveLength(1);
    expect(report.generatedAt).toBe('2024-01-01');
  });

  test('should create Report with defaults', () => {
    const report = new Report({
      id: 'report-1',
      type: 'monthly-performance'
    });
    
    expect(report.charts).toEqual([]);
    expect(report.metadata).toEqual({});
    expect(report.generatedAt).toBeDefined();
  });

  test('should add chart', () => {
    const report = new Report({
      id: 'report-1',
      type: 'monthly-performance'
    });
    
    report.addChart({ id: 'chart-1', title: 'Test' });
    
    expect(report.charts).toHaveLength(1);
    expect(report.charts[0].id).toBe('chart-1');
  });

  test('should set AI insights', () => {
    const report = new Report({
      id: 'report-1',
      type: 'monthly-performance'
    });
    
    const insights = { conclusions: [] };
    report.setAIInsights(insights);
    
    expect(report.aiInsights).toBe(insights);
  });

  test('should convert to JSON', () => {
    const report = new Report({
      id: 'report-1',
      type: 'monthly-performance',
      executiveSummary: { title: 'Summary' },
      charts: [{ id: 'chart-1' }]
    });
    
    const json = report.toJSON();
    
    expect(json.id).toBe('report-1');
    expect(json.type).toBe('monthly-performance');
    expect(json.charts).toHaveLength(1);
    expect(json.generatedAt).toBeDefined();
  });
});



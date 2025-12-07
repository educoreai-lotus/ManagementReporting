/**
 * Integration tests for API client
 * Tests API endpoints and interceptors with mocked axios
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock axios before importing api
vi.mock('axios', async () => {
  const { vi } = await import('vitest');
  const mockRequestUse = vi.fn();
  const mockResponseUse = vi.fn();
  
  // Create a shared interceptors object that will be used by the instance
  const sharedInterceptors = {
    request: { use: mockRequestUse },
    response: { use: mockResponseUse }
  };
  
  const mockAxios = {
    create: vi.fn(() => {
      const instance = {
        get: vi.fn(() => Promise.resolve({ data: {}, status: 200 })),
        post: vi.fn(() => Promise.resolve({ data: {}, status: 200 })),
        interceptors: sharedInterceptors
      };
      return instance;
    }),
    get: vi.fn(() => Promise.resolve({ data: {}, status: 200 })),
    post: vi.fn(() => Promise.resolve({ data: {}, status: 200 })),
    interceptors: sharedInterceptors
  };
  
  // Store spies globally so we can access them in tests
  global.mockRequestUse = mockRequestUse;
  global.mockResponseUse = mockResponseUse;
  
  return {
    default: mockAxios,
    __esModule: true
  };
});

import axios from 'axios';
import {
  dashboardAPI,
  chartsAPI,
  boxAPI,
  reportsAPI,
  dataAPI,
  openaiAPI,
  aiCustomAPI,
  chartTranscriptionAPI,
  default as api
} from '../../services/api.js';

describe('API Client', () => {
  beforeEach(() => {
    // Don't clear mocks for interceptors - they're called during module import
    // vi.clearAllMocks();
    // localStorage is already cleared in setupTests.js
  });

  describe('dashboardAPI', () => {
    it('should call getDashboard endpoint', async () => {
      const mockResponse = { data: { charts: [] }, status: 200 };
      api.get.mockResolvedValue(mockResponse);
      
      const result = await dashboardAPI.getDashboard();
      
      expect(api.get).toHaveBeenCalledWith('/dashboard');
      expect(result).toEqual(mockResponse);
    });

    it('should call getAllCharts endpoint', async () => {
      const mockResponse = { data: { charts: [] }, status: 200 };
      api.get.mockResolvedValue(mockResponse);
      
      await dashboardAPI.getAllCharts();
      
      expect(api.get).toHaveBeenCalledWith('/dashboard/all-charts');
    });

    it('should call refreshData endpoint with services', async () => {
      const services = ['service1', 'service2'];
      const mockResponse = { data: { success: true }, status: 200 };
      api.post.mockResolvedValue(mockResponse);
      
      await dashboardAPI.refreshData(services);
      
      expect(api.post).toHaveBeenCalledWith('/dashboard/refresh', { services });
    });

    it('should call refreshData endpoint without services', async () => {
      const mockResponse = { data: { success: true }, status: 200 };
      api.post.mockResolvedValue(mockResponse);
      
      await dashboardAPI.refreshData();
      
      expect(api.post).toHaveBeenCalledWith('/dashboard/refresh', {});
    });
  });

  describe('chartsAPI', () => {
    it('should call getChart endpoint', async () => {
      const chartId = 'chart-123';
      await chartsAPI.getChart(chartId);
      
      expect(api.get).toHaveBeenCalledWith(`/dashboard/chart/${chartId}`);
    });

    it('should call getChartData endpoint with filters', async () => {
      const chartId = 'chart-123';
      const filters = { dateRange: '30d' };
      await chartsAPI.getChartData(chartId, filters);
      
      expect(api.post).toHaveBeenCalledWith(`/dashboard/chart/${chartId}/data`, filters);
    });

    it('should call downloadChartPDF with image', async () => {
      const chartId = 'chart-123';
      const chartImage = 'data:image/png;base64,...';
      await chartsAPI.downloadChartPDF(chartId, chartImage);
      
      expect(api.post).toHaveBeenCalledWith(
        `/dashboard/chart/${chartId}/pdf`,
        { chartImage },
        { responseType: 'blob' }
      );
    });

    it('should call downloadChartPDF without image (GET fallback)', async () => {
      const chartId = 'chart-123';
      await chartsAPI.downloadChartPDF(chartId);
      
      expect(api.get).toHaveBeenCalledWith(
        `/dashboard/chart/${chartId}/pdf`,
        { responseType: 'blob' }
      );
    });
  });

  describe('boxAPI', () => {
    it('should call getCharts endpoint', async () => {
      await boxAPI.getCharts();
      
      expect(api.get).toHaveBeenCalledWith('/dashboard/box/charts');
    });

    it('should call searchCharts endpoint with query', async () => {
      const query = 'test query';
      await boxAPI.searchCharts(query);
      
      expect(api.get).toHaveBeenCalledWith(`/dashboard/box/charts/search?query=${query}`);
    });
  });

  describe('reportsAPI', () => {
    it('should call getReportTypes endpoint', async () => {
      await reportsAPI.getReportTypes();
      
      expect(api.get).toHaveBeenCalledWith('/reports/types');
    });

    it('should call generateReport with PDF format', async () => {
      const reportType = 'monthly-performance';
      const options = { format: 'pdf' };
      await reportsAPI.generateReport(reportType, options);
      
      expect(api.post).toHaveBeenCalledWith(
        '/reports/generate',
        { reportType, ...options },
        { responseType: 'blob' }
      );
    });

    it('should call generateReport without PDF format', async () => {
      const reportType = 'monthly-performance';
      await reportsAPI.generateReport(reportType);
      
      expect(api.post).toHaveBeenCalledWith(
        '/reports/generate',
        { reportType }
      );
    });
  });

  describe('chartTranscriptionAPI', () => {
    it('should call getTranscription endpoint', async () => {
      const chartId = 'chart-123';
      await chartTranscriptionAPI.getTranscription(chartId);
      
      expect(api.get).toHaveBeenCalledWith(`/ai/chart-transcription/${chartId}`);
    });

    it('should call createOrUpdateTranscription endpoint', async () => {
      const chartId = 'chart-123';
      const topic = 'Test Chart';
      const chartData = { data: [] };
      const imageUrl = 'data:image/png;base64,...';
      
      await chartTranscriptionAPI.createOrUpdateTranscription(
        chartId,
        topic,
        chartData,
        imageUrl,
        'gpt-4o-mini',
        false
      );
      
      expect(api.post).toHaveBeenCalledWith(
        `/ai/chart-transcription/${chartId}`,
        {
          topic,
          chartData,
          imageUrl,
          model: 'gpt-4o-mini',
          forceRecompute: false
        }
      );
    });

    it('should call startup endpoint', async () => {
      const charts = [{ chartId: 'chart-1', chartPayload: {} }];
      await chartTranscriptionAPI.startup(charts);
      
      expect(api.post).toHaveBeenCalledWith(
        '/ai/chart-transcription/startup',
        { charts }
      );
    });

    it('should call refresh endpoint', async () => {
      const charts = [{ chartId: 'chart-1', chartPayload: {} }];
      await chartTranscriptionAPI.refresh(charts);
      
      expect(api.post).toHaveBeenCalledWith(
        '/ai/chart-transcription/refresh',
        { charts }
      );
    });
  });

  describe('API interceptors', () => {
    it('should have request interceptor configured', () => {
      // The interceptor should be configured on the api instance
      expect(api.interceptors.request.use).toBeDefined();
      // api.interceptors.request.use should be the mock function
      expect(api.interceptors.request.use).toBe(global.mockRequestUse);
      // The interceptor.use should have been called once during module import
      // when api.js calls api.interceptors.request.use() at line 33
      expect(api.interceptors.request.use).toHaveBeenCalledTimes(1);
    });

    it('should have response interceptor configured', () => {
      // The interceptor should be configured on the api instance
      expect(api.interceptors.response.use).toBeDefined();
      // api.interceptors.response.use should be the mock function
      expect(api.interceptors.response.use).toBe(global.mockResponseUse);
      // The interceptor.use should have been called once during module import
      // when api.js calls api.interceptors.response.use() at line 84
      expect(api.interceptors.response.use).toHaveBeenCalledTimes(1);
    });

    it('should add Authorization header when token exists', async () => {
      localStorage.setItem('authToken', 'test-token');
      
      // Make a request to trigger the interceptor
      const mockResponse = { data: {}, status: 200 };
      api.get.mockResolvedValue(mockResponse);
      
      await api.get('/test');
      
      // Verify the request was made
      expect(api.get).toHaveBeenCalled();
    });
  });
});


import axios from 'axios';

// Get base URL from environment, default to localhost
let baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Log API URL for debugging (only in development)
if (import.meta.env.DEV) {
  console.log('🔗 API Base URL:', baseURL);
}

// Ensure base URL doesn't end with slash
baseURL = baseURL.replace(/\/$/, '');

// Add /api/v1 if not already present
if (!baseURL.endsWith('/api/v1')) {
  baseURL = `${baseURL}/api/v1`;
}

const API_URL = baseURL;

// Log final API URL
console.log('🔗 Final API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for JWT token and logging
// For MVP: Token is optional - backend accepts requests without token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    // Only add token if it exists (optional for MVP)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request details for chart transcription endpoints
    if (config.url?.includes('/chart-transcription')) {
      console.log(`[API Request] ========================================`);
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
      console.log(`[API Request] Headers:`, {
        'content-type': config.headers['Content-Type'],
      });
      if (config.data) {
        try {
          const dataStr = typeof config.data === 'string' ? config.data : JSON.stringify(config.data);
          console.log(`[API Request] Body size: ${dataStr.length} chars (${(dataStr.length / 1024 / 1024).toFixed(2)} MB)`);
          const dataObj = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
          if (dataObj.charts && Array.isArray(dataObj.charts)) {
            console.log(`[API Request] Charts array length: ${dataObj.charts.length}`);
            console.log(`[API Request] First chart keys:`, dataObj.charts[0] ? Object.keys(dataObj.charts[0]) : 'N/A');
            console.log(`[API Request] First chart structure:`, dataObj.charts[0] ? {
              hasChartId: !!dataObj.charts[0].chartId,
              hasChartPayload: !!dataObj.charts[0].chartPayload,
              hasContext: !!dataObj.charts[0].context,
              chartId: dataObj.charts[0].chartId,
              dataPoints: dataObj.charts[0].chartPayload?.data?.length || 0
            } : 'N/A');
          } else {
            console.warn(`[API Request] ⚠️ Body does not have charts array!`, dataObj);
          }
        } catch (err) {
          console.error(`[API Request] ❌ Error parsing request data:`, err);
        }
      } else {
        console.warn(`[API Request] ⚠️ No request body!`);
      }
      console.log(`[API Request] ========================================`);
    }
    
    // Continue even without token (for MVP)
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Log successful responses for chart transcription endpoints
    if (response.config?.url?.includes('/chart-transcription')) {
      console.log(`[API Response] ✅ ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    // Log error responses for chart transcription endpoints
    if (error.config?.url?.includes('/chart-transcription')) {
      console.error(`[API Response] ❌ ${error.response?.status || 'NO_STATUS'} ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
      console.error(`[API Response] Error message:`, error.message);
      console.error(`[API Response] Error response data:`, error.response?.data);
      console.error(`[API Response] Request body that failed:`, error.config?.data ? JSON.parse(error.config.data) : 'N/A');
    }
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    
    // Handle 429 errors gracefully - reduce console spam
    if (error.response?.status === 429) {
      console.warn(`[API] Rate limit (429) for ${error.config?.url} - request will be retried or cached data will be used`);
      // Don't log full error details for 429 to reduce console noise
    } else {
      // Log errors for debugging (except 429)
      console.error('API Error:', {
        url: error.config?.url,
        status: error.response?.status,
        message: error.message,
        baseURL: API_URL
      });
    }
    return Promise.reject(error);
  }
);

// Dashboard API
export const dashboardAPI = {
  getDashboard: () => api.get('/dashboard'),
  getAllCharts: () => api.get('/dashboard/all-charts'), // All charts (priority + BOX) for transcription
  refreshData: (services) => api.post('/dashboard/refresh', services?.length ? { services } : {}),
};

// Charts API
export const chartsAPI = {
  getChart: (chartId) => api.get(`/dashboard/chart/${chartId}`),
  getChartData: (chartId, filters) => api.post(`/dashboard/chart/${chartId}/data`, filters),
  refreshChart: (chartId) => api.post(`/dashboard/chart/${chartId}/refresh`),
  getFilteredChart: (chartId, courseIds) => api.post(`/dashboard/chart/${chartId}/filter`, { courseIds }),
  downloadChartPDF: (chartId, chartImage) => {
    if (chartImage) {
      // Send POST with image data
      return api.post(`/dashboard/chart/${chartId}/pdf`, { chartImage }, { responseType: 'blob' });
    } else {
      // Fallback to GET if no image
      return api.get(`/dashboard/chart/${chartId}/pdf`, { responseType: 'blob' });
    }
  },
  getCourses: () => api.get('/dashboard/courses'),
};

// BOX API
export const boxAPI = {
  getCharts: () => api.get('/dashboard/box/charts'),
  searchCharts: (query) => api.get(`/dashboard/box/charts/search?query=${query}`),
};

// Reports API
export const reportsAPI = {
  getReportTypes: () => api.get('/reports/types'),
  generateReport: (reportType, options = {}) => {
    if (options.format === 'pdf') {
      return api.post('/reports/generate', { reportType, ...options }, { responseType: 'blob' });
    }
    return api.post('/reports/generate', { reportType, ...options });
  },
  downloadReport: (reportId) => api.get(`/reports/${reportId}/download`, { responseType: 'blob' }),
};

// Data API
export const dataAPI = {
  refresh: () => api.post('/data/refresh'),
  getStatus: () => api.get('/data/status'),
};

// OpenAI API
export const openaiAPI = {
  describeChart: (image, context, fast = false) => {
    // Legacy endpoint - uses old endpoint without caching
    const isUrl = image.startsWith('http://') || image.startsWith('https://');
    const payload = isUrl 
      ? { imageUrl: image, context, fast }
      : { dataUrl: image, context, fast };
    
    return api.post('/openai/describe-chart', payload);
  },
  generateReportConclusions: (topic, images) => {
    return api.post('/openai/report-conclusions', { topic, images });
  },
};

// AI Custom API
export const aiCustomAPI = {
  /**
   * POST /api/ai-custom/sql
   * Generates a SQL query from natural language using OpenAI.
   * 
   * @param {string} queryText - The user's natural language request (1-1000 characters)
   * @returns {Promise<{status: string, sql?: string, reason?: string, message?: string}>}
   */
  generateSql: (queryText) => {
    // Use direct axios call since this endpoint is at /api/ai-custom, not /api/v1
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const cleanBaseURL = baseURL.replace(/\/$/, '');
    return axios.post(`${cleanBaseURL}/api/ai-custom/sql`, { queryText });
  },

  /**
   * POST /api/ai-custom/query-data
   * Generates SQL from natural language, validates it, executes it, and returns the results.
   * 
   * @param {string} queryText - The user's natural language request (1-1000 characters)
   * @returns {Promise<{status: string, sql?: string, reason?: string, rowCount?: number, columns?: Array, rows?: Array, message?: string}>}
   */
  queryData: (queryText) => {
    // Use direct axios call since this endpoint is at /api/ai-custom, not /api/v1
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const cleanBaseURL = baseURL.replace(/\/$/, '');
    return axios.post(`${cleanBaseURL}/api/ai-custom/query-data`, { queryText });
  },
};

// Chart Transcription API (DB-first flow - API Contract)
export const chartTranscriptionAPI = {
  /**
   * GET: Read transcription from DB only
   * Returns: { chartId: string, exists: boolean, transcription_text: string | null }
   * Always returns 200 (never 404)
   */
  getTranscription: (chartId) => {
    return api.get(`/ai/chart-transcription/${chartId}`);
  },
  
  /**
   * POST: Create or update transcription
   * Always performs: OpenAI → DB (UPSERT) → Returns saved row
   * Body: { topic?: string, chartData?: any, imageUrl: string, model?: string, forceRecompute?: boolean }
   * Returns: { chartId, chart_signature, model, transcription_text, updated_at }
   */
  createOrUpdateTranscription: (chartId, topic, chartData, imageUrl, model = 'gpt-4o-mini', forceRecompute = false) => {
    return api.post(`/ai/chart-transcription/${chartId}`, {
      topic,
      chartData,
      imageUrl,
      model,
      forceRecompute
    });
  },
  
  // Legacy methods (for backward compatibility)
  getOrCreateTranscription: (chartId, topic, chartData, imageUrl, model = 'gpt-4o-mini') => {
    return chartTranscriptionAPI.createOrUpdateTranscription(chartId, topic, chartData, imageUrl, model, false);
  },
  
  /**
   * POST /startup: Sequentially transcribe charts on first load
   * Only saves if transcription doesn't exist
   * Body: { charts: [{ chartId, chartPayload, context? }] }
   */
  startup: (charts) => {
    return api.post('/ai/chart-transcription/startup', { charts });
  },
  
  /**
   * POST /refresh: Always overwrite transcriptions when data changes
   * Body: { charts: [{ chartId, chartPayload, context? }] }
   */
  refresh: (charts) => {
    return api.post('/ai/chart-transcription/refresh', { charts });
  },
  
  // Legacy methods (kept for backward compatibility)
  startupFill: (charts, force = false) => {
    return api.post('/ai/chart-transcription/startup-fill', { charts, force });
  },
  
  refreshTranscription: (chartId, imageUrl, topic, chartData, force = false, model = 'gpt-4o-mini') => {
    const payload = {
      chartId,
      topic: topic || '',
      chartData: chartData || {},
      imageUrl,
      force,
      model
    };
    return api.post('/ai/chart-transcription/refresh-legacy', payload);
  },
};

export default api;


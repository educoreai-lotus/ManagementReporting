import { useState, useEffect, useRef } from 'react';
import { dashboardAPI, chartTranscriptionAPI } from '../services/api';
import { browserCache } from '../services/cache';
import { apiQueue } from '../utils/apiQueue';

const MAX_TRANSCRIPTION_POINTS = 200;

const sanitizeDataPoint = (entry) => {
  if (!entry || typeof entry !== 'object') {
    return entry;
  }

  const sanitized = {};
  Object.entries(entry).forEach(([key, value]) => {
    if (
      value === null ||
      typeof value === 'number' ||
      typeof value === 'string' ||
      typeof value === 'boolean'
    ) {
      sanitized[key] = value;
    }
  });
  return sanitized;
};

const buildChartTranscriptionPayload = (chart) => {
  if (!chart) {
    return null;
  }

  const metadata = chart.metadata || {};
  const dataArray = Array.isArray(chart.data) ? chart.data : [];
  const trimmedData = dataArray.slice(0, MAX_TRANSCRIPTION_POINTS).map(sanitizeDataPoint);
  const axes = {
    x: metadata.xAxisLabel || metadata.xAxis || metadata.xLabel || null,
    y: metadata.yAxisLabel || metadata.yAxis || metadata.yLabel || null
  };

  const seriesKeys =
    trimmedData.length > 0
      ? Object.keys(trimmedData[0]).filter((key) => key !== 'name' && typeof trimmedData[0][key] === 'number')
      : [];

  return {
    chartId: chart.id || '',
    title: chart.title || '',
    subtitle: chart.subtitle || '',
    description: chart.description || '',
    type: chart.type || metadata.chartType || 'chart',
    axes,
    seriesKeys,
    metadata: {
      services: metadata.services || [],
      chartType: metadata.chartType || chart.type || 'chart',
      colorScheme: metadata.colorScheme || null,
      lastUpdated: metadata.lastUpdated || null
    },
    data: trimmedData
  };
};

const getStoredReportChartsMap = () => {
  try {
    const stored = sessionStorage.getItem('lastGeneratedReportData');
    if (!stored) {
      return new Map();
    }
    const parsed = JSON.parse(stored);
    const charts = parsed?.charts || [];
    return new Map(
      charts.map((chart, idx) => [chart.id || chart.title || `chart-${idx}`, chart])
    );
  } catch (err) {
    console.warn('[useDashboardData] Failed to parse stored report data:', err);
    return new Map();
  }
};

export const useDashboardData = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshStatus, setRefreshStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  // Track if startup transcription has already run in this session
  // Use sessionStorage to persist across page navigations (but reset on browser close)
  const getStartupTranscriptionDone = () => {
    try {
      return sessionStorage.getItem('startupTranscriptionDone') === 'true';
    } catch {
      return false;
    }
  };
  
  const setStartupTranscriptionDone = (value) => {
    try {
      sessionStorage.setItem('startupTranscriptionDone', value ? 'true' : 'false');
    } catch {
      // Ignore if sessionStorage is not available
    }
  };
  
  const startupTranscriptionDoneRef = useRef(getStartupTranscriptionDone());

  const fetchDashboard = async (autoRefreshIfEmpty = false) => {
    try {
      setLoading(true);
      setError(null);
      setRefreshStatus(null);
      
      // ALWAYS check persistent cache first (survives browser close)
      // This ensures we show the last displayed data when reopening the site
      const persistentCached = browserCache.getPersistentData('dashboard');
      let dashboardData;
      let updatedAt;
      
      if (persistentCached && persistentCached.data?.charts?.length > 0) {
        console.log('[Dashboard] ✅ Loading from persistent cache (last session data)');
        setData(persistentCached.data);
        setLastUpdated(persistentCached.lastUpdated);
        setLoading(false);
        
        // ⚠️ CRITICAL: Use cached data for startup-fill, but also fetch fresh data in background
        dashboardData = persistentCached.data;
        updatedAt = persistentCached.lastUpdated;
        
        // Fetch fresh data in background to update cache, but don't block UI
        // Add delay to prevent rate limiting on page load
        setTimeout(async () => {
          try {
            const response = await dashboardAPI.getDashboard();
            const freshData = response.data;
            const freshUpdatedAt = freshData.lastUpdated || new Date().toISOString();
            // Update persistent cache with fresh data
            browserCache.setPersistentData('dashboard', {
              data: freshData,
              lastUpdated: freshUpdatedAt,
            });
            // Update state with fresh data if user is still on page
            setData(freshData);
            setLastUpdated(freshUpdatedAt);
          } catch (err) {
            // Handle 429 errors gracefully - don't spam console
            if (err.response?.status === 429) {
              console.warn('[Dashboard] Background refresh rate limited (429), will retry later');
              // Don't retry immediately - wait longer
            } else {
              console.warn('[Dashboard] Background refresh failed, keeping cached data:', err);
            }
          }
        }, 5000); // Wait 5 seconds before background refresh to avoid rate limiting
      } else {
        // Check temporary cache (sessionStorage) as fallback
        const cached = browserCache.getTempData('dashboard');
        if (cached && cached.data?.charts?.length > 0) {
          console.log('[Dashboard] Loading from temporary cache');
          setData(cached.data);
          setLastUpdated(cached.lastUpdated);
          setLoading(false);
          dashboardData = cached.data;
          updatedAt = cached.lastUpdated;
        } else {
          // No cache - fetch fresh data
          const response = await dashboardAPI.getDashboard();
          dashboardData = response.data;
          updatedAt = dashboardData.lastUpdated || new Date().toISOString();
          
          setData(dashboardData);
          setLastUpdated(updatedAt);
          setLoading(false);
        }
      }
      
      // ⚠️ CRITICAL: Always run startup-fill, even if we loaded from cache
      // This ensures transcriptions are created/updated on every page load
      if (dashboardData) {
        // If no data and autoRefreshIfEmpty is true, trigger refresh (but only once)
        if ((!dashboardData.charts || dashboardData.charts.length === 0) && autoRefreshIfEmpty) {
        console.log('No data found, auto-refreshing...');
        try {
          // Add delay to prevent rate limit issues
          await new Promise(resolve => setTimeout(resolve, 500));
          const refreshResponse = await dashboardAPI.refreshData();
          const refreshedData = refreshResponse.data;
          const refreshedUpdatedAt = refreshedData.lastUpdated || new Date().toISOString();
          
          setData(refreshedData);
          setLastUpdated(refreshedUpdatedAt);
          setRefreshStatus(refreshedData.refreshStatus || null);
          
          browserCache.setTempData('dashboard', {
            data: refreshedData,
            lastUpdated: refreshedUpdatedAt,
          }, 300000);
          
          // Also save to persistent cache
          browserCache.setPersistentData('dashboard', {
            data: refreshedData,
            lastUpdated: refreshedUpdatedAt,
          });
          dashboardData = refreshedData;
          updatedAt = refreshedUpdatedAt;
        } catch (refreshErr) {
          console.error('Auto-refresh error:', refreshErr);
          // Continue with original data even if empty
        }
        }
        
        setData(dashboardData);
        setLastUpdated(updatedAt);
        
        // Cache for 5 minutes (temporary)
        browserCache.setTempData('dashboard', {
          data: dashboardData,
          lastUpdated: updatedAt,
        }, 300000);
        
        // Also save to persistent cache (survives browser close)
        browserCache.setPersistentData('dashboard', {
          data: dashboardData,
          lastUpdated: updatedAt,
        });
        
        // ⚠️ CRITICAL: On startup, send ALL charts (not just priority) to OpenAI for transcription
        // BUT: Only run startup transcription ONCE per session (not every time we navigate to dashboard)
        // This prevents unnecessary OpenAI calls when switching between Dashboard and Reports
        const isStartupDone = getStartupTranscriptionDone();
        if (!isStartupDone) {
          console.log(`[Dashboard] ✅ Dashboard loaded with ${dashboardData.charts?.length || 0} priority charts`);
          console.log(`[Dashboard] 🚀 Starting startup transcription flow for ALL charts (first time only)...`);
          
          // Mark as done immediately to prevent duplicate runs (persist in sessionStorage)
          setStartupTranscriptionDone(true);
          startupTranscriptionDoneRef.current = true;
          
          // Fetch ALL charts (priority + BOX + combined analytics) for transcription
          let allChartsForTranscription = [];
          try {
            const allChartsResponse = await dashboardAPI.getAllCharts();
            allChartsForTranscription = allChartsResponse.data?.charts || [];
            console.log(`[Dashboard Startup] 📊 Fetched ${allChartsForTranscription.length} total charts for transcription`);
            console.log(`[Dashboard Startup] Chart IDs:`, allChartsForTranscription.map(c => c.id));
          } catch (err) {
            console.error(`[Dashboard Startup] ❌ Failed to fetch all charts, falling back to dashboard charts:`, err);
            allChartsForTranscription = dashboardData.charts || [];
          }
          
          // Wait for charts to render, then capture and send to OpenAI
          const waitForChartsStartup = async (maxAttempts = 20, delayMs = 500) => {
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
              const chartElements = document.querySelectorAll('[data-chart-id]');
              const rechartsElements = document.querySelectorAll('.recharts-wrapper');
              
              if (chartElements.length > 0 && rechartsElements.length > 0) {
                console.log(`[Dashboard Startup] ✅ Charts rendered after ${attempt * delayMs}ms`);
                console.log(`[Dashboard Startup] Found ${chartElements.length} chart cards and ${rechartsElements.length} recharts wrappers`);
                return true;
              }
              
              if (attempt < maxAttempts - 1) {
                console.log(`[Dashboard Startup] ⏳ Waiting for charts to render... (attempt ${attempt + 1}/${maxAttempts})`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
              }
            }
            return false;
          };
          
          // Wait for charts to render, then proceed
          const chartsReady = await waitForChartsStartup(20, 500); // Wait up to 10 seconds
          
          if (!chartsReady) {
            console.error(`[Dashboard Startup] ❌ Charts did not render after 10 seconds, aborting startup transcription`);
            return;
          }
          
          // Additional delay to ensure Recharts is fully rendered (including hidden BOX charts)
          await new Promise(resolve => setTimeout(resolve, 2000)); // Increased to 2 seconds to ensure hidden charts render
          
          // Verify that we have enough chart elements in DOM (should match allChartsForTranscription.length)
          const allChartElements = document.querySelectorAll('[data-chart-id]');
          console.log(`[Dashboard Startup] 🔍 DOM Verification: Found ${allChartElements.length} chart elements in DOM`);
          console.log(`[Dashboard Startup] 🔍 Expected ${allChartsForTranscription.length} charts from API`);
          if (allChartElements.length < allChartsForTranscription.length) {
            console.warn(`[Dashboard Startup] ⚠️ WARNING: Only ${allChartElements.length} charts found in DOM, but ${allChartsForTranscription.length} expected!`);
            console.warn(`[Dashboard Startup] ⚠️ Some charts may not be rendered yet. Waiting additional 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Re-check
            const recheckElements = document.querySelectorAll('[data-chart-id]');
            console.log(`[Dashboard Startup] 🔍 After additional wait: Found ${recheckElements.length} chart elements`);
          }
          
          // Build chart payloads and send to startup endpoint
          if (allChartsForTranscription && allChartsForTranscription.length > 0) {
            (async () => {
              try {
                console.log(`[Dashboard Startup] ========================================`);
                console.log(`[Dashboard Startup] 🚀 STARTING STARTUP TRANSCRIPTION FLOW`);
                console.log(`[Dashboard Startup] Total charts to process: ${allChartsForTranscription.length}`);
                console.log(`[Dashboard Startup] Chart IDs:`, allChartsForTranscription.map(c => c.id));

                const chartsForStartup = [];
                for (let i = 0; i < allChartsForTranscription.length; i++) {
                  const chart = allChartsForTranscription[i];
                  const chartId = chart.id || `chart-${i}`;
                  const chartPayload = buildChartTranscriptionPayload(chart);

                  if (!chartPayload || chartPayload.data.length === 0) {
                    console.warn(`[Dashboard Startup] ⚠️ Chart ${chartId} has no data to send for transcription, skipping`);
                    continue;
                  }

                  chartsForStartup.push({
                    chartId,
                    context: chart.title || chartId,
                    chartPayload
                  });
                }

                console.log(`[Dashboard Startup] 📊 PAYLOAD SUMMARY: prepared ${chartsForStartup.length}/${allChartsForTranscription.length} charts`);

                if (chartsForStartup.length > 0) {
                  console.log(`[Dashboard Startup] 📤 SENDING TO BACKEND: ${chartsForStartup.length} charts`);
                  try {
                    const { data } = await chartTranscriptionAPI.startup(chartsForStartup);

                    console.log(`[Dashboard Startup] ========================================`);
                    console.log(`[Dashboard Startup] 📥 BACKEND RESPONSE RECEIVED`);
                    console.log(`[Dashboard Startup] Full response:`, data);

                    if (data.results) {
                      const created = data.results.filter(r => r.status === 'created').length;
                      const errors = data.results.filter(r => r.status === 'error').length;
                      const skipped = data.results.filter(r => r.status === 'skip-invalid').length;
                      console.log(`[Dashboard Startup] Results: ${created} created, ${errors} errors, ${skipped} skipped`);

                      data.results.forEach(result => {
                        console.log(`[Dashboard Startup] Chart ${result.chartId}: ${result.status}${result.error ? ` (${result.error})` : ''}`);
                      });
                    }

                    console.log(`[Dashboard Startup] ✅✅✅ STARTUP TRANSCRIPTION COMPLETED!`);
                    console.log(`[Dashboard Startup] ========================================`);
                  } catch (err) {
                    console.error(`[Dashboard Startup] ❌ Backend startup failed:`, err);
                  }
                } else {
                  console.error(`[Dashboard Startup] ❌❌❌ CRITICAL: NO CHART PAYLOADS WERE GENERATED!`);
                }
              } catch (err) {
                console.error(`[Dashboard Startup] ❌ Error in startup transcription flow:`, err);
              }
            })();
          }
        } else {
          const isDone = getStartupTranscriptionDone();
          console.log(`[Dashboard] ⏭️ Skipping startup transcription - already completed in this session (sessionStorage: ${isDone})`);
        }
      }
    } catch (err) {
      // Handle 429 errors with retry logic
      if (err.response?.status === 429) {
        console.warn('Rate limit hit, waiting before retry...');
        // Wait and retry once
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          const retryResponse = await dashboardAPI.getDashboard();
          const dashboardData = retryResponse.data;
          const updatedAt = dashboardData.lastUpdated || new Date().toISOString();
          setData(dashboardData);
          setLastUpdated(updatedAt);
          browserCache.setTempData('dashboard', {
            data: dashboardData,
            lastUpdated: updatedAt,
          }, 300000);
          
          // Also save to persistent cache
          browserCache.setPersistentData('dashboard', {
            data: dashboardData,
            lastUpdated: updatedAt,
          });
          return;
        } catch (retryErr) {
          setError('Too many requests. Please wait a moment and refresh.');
          console.error('Retry failed:', retryErr);
        }
      } else {
        const errorMessage = err.response?.data?.error || err.message || 'Failed to load dashboard';
        setError(errorMessage);
        console.error('Dashboard fetch error:', {
          error: err,
          message: errorMessage,
          response: err.response,
          config: err.config
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async (services) => {
    try {
      setRefreshing(true);
      setError(null);
      
      // Clear saved report from sessionStorage when refreshing data
      // This ensures that when user clicks "Refresh Data", the report will be regenerated with new data
      try {
        sessionStorage.removeItem('lastGeneratedReportId');
        sessionStorage.removeItem('lastGeneratedReportData');
        sessionStorage.removeItem('lastGeneratedReportConclusions');
        console.log('[Dashboard Refresh] ✅ Cleared saved report from sessionStorage - report will be regenerated with new data');
      } catch (err) {
        console.warn('[Dashboard Refresh] ⚠️ Failed to clear saved report from sessionStorage:', err);
      }
      
      const response = await dashboardAPI.refreshData(services);
      const dashboardData = response.data;
      const updatedAt = dashboardData.lastUpdated || new Date().toISOString();

      setData(dashboardData);
      setLastUpdated(updatedAt);
      setRefreshStatus(dashboardData.refreshStatus || null);

      browserCache.setTempData('dashboard', {
        data: dashboardData,
        lastUpdated: updatedAt,
      }, 300000);
      
      // Also save to persistent cache (survives browser close)
      browserCache.setPersistentData('dashboard', {
        data: dashboardData,
        lastUpdated: updatedAt,
      });

      // ⚠️ CRITICAL: Wait for React to update the DOM with new data before capturing charts
      // React needs time to re-render components with new data, and Recharts needs time to update the charts
      // We need to wait longer to ensure the charts on screen show the NEW data, not the old data
      console.log(`[Dashboard Refresh] ⏳ Waiting for React to update charts with new data...`);
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds for React/Recharts to update

      // After data refresh, refresh ALL chart transcriptions (not just priority) with OpenAI
      // Fetch all charts from backend to ensure we capture everything
      console.log(`[Dashboard Refresh] 📊 Refreshing transcriptions for ALL charts...`);
      
      // Fetch ALL charts (priority + BOX + combined analytics) for transcription
      let allChartsForTranscription = [];
      try {
        const allChartsResponse = await dashboardAPI.getAllCharts();
        allChartsForTranscription = allChartsResponse.data?.charts || [];
        console.log(`[Dashboard Refresh] 📊 Fetched ${allChartsForTranscription.length} total charts for transcription`);
        console.log(`[Dashboard Refresh] Chart IDs:`, allChartsForTranscription.map(c => c.id));
      } catch (err) {
        console.error(`[Dashboard Refresh] ❌ Failed to fetch all charts, falling back to dashboard charts:`, err);
        allChartsForTranscription = dashboardData.charts || [];
      }
      
      // Wait for charts to render first - CRITICAL: Recharts needs time to render
      // Use longer delay and wait for actual chart elements to appear
      const waitForCharts = async (maxAttempts = 20, delayMs = 500) => {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const chartElements = document.querySelectorAll('[data-chart-id]');
          const rechartsElements = document.querySelectorAll('.recharts-wrapper');
          
          if (chartElements.length > 0 && rechartsElements.length > 0) {
            console.log(`[Dashboard Refresh] ✅ Charts rendered after ${attempt * delayMs}ms`);
            console.log(`[Dashboard Refresh] Found ${chartElements.length} chart cards and ${rechartsElements.length} recharts wrappers`);
            return true;
          }
          
          if (attempt < maxAttempts - 1) {
            console.log(`[Dashboard Refresh] ⏳ Waiting for charts to render... (attempt ${attempt + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
        return false;
      };
      
      // Wait for charts to render, then proceed
      const chartsReady = await waitForCharts(20, 500); // Wait up to 10 seconds
      
      if (!chartsReady) {
        console.error(`[Dashboard Refresh] ❌ Charts did not render after 10 seconds, aborting capture`);
        return;
      }
      
      // Additional delay to ensure Recharts is fully rendered with NEW data (including hidden BOX charts)
      console.log(`[Dashboard Refresh] ⏳ Additional wait to ensure charts show NEW data...`);
      await new Promise(resolve => setTimeout(resolve, 3000)); // Increased to 3 seconds to ensure charts show new data
      
      // Verify that we have enough chart elements in DOM (should match allChartsForTranscription.length)
      const allChartElements = document.querySelectorAll('[data-chart-id]');
      console.log(`[Dashboard Refresh] 🔍 DOM Verification: Found ${allChartElements.length} chart elements in DOM`);
      console.log(`[Dashboard Refresh] 🔍 Expected ${allChartsForTranscription.length} charts from API`);
      if (allChartElements.length < allChartsForTranscription.length) {
        console.warn(`[Dashboard Refresh] ⚠️ WARNING: Only ${allChartElements.length} charts found in DOM, but ${allChartsForTranscription.length} expected!`);
        console.warn(`[Dashboard Refresh] ⚠️ Some charts may not be rendered yet. Waiting additional 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Re-check
        const recheckElements = document.querySelectorAll('[data-chart-id]');
        console.log(`[Dashboard Refresh] 🔍 After additional wait: Found ${recheckElements.length} chart elements`);
      }
      
      setTimeout(async () => {
        if (allChartsForTranscription && allChartsForTranscription.length > 0) {
          try {
            console.log(`[Dashboard Refresh] ========================================`);
            console.log(`[Dashboard Refresh] 🚀 STARTING REFRESH FLOW`);
            console.log(`[Dashboard Refresh] Total charts to process: ${allChartsForTranscription.length}`);
            console.log(`[Dashboard Refresh] Chart IDs:`, allChartsForTranscription.map(c => c.id));
            console.log(`[Dashboard Refresh] DOM elements with [data-chart-id]:`, document.querySelectorAll('[data-chart-id]').length);
            console.log(`[Dashboard Refresh] DOM elements with .recharts-wrapper:`, document.querySelectorAll('.recharts-wrapper').length);
            
            // Build chart payloads
            const chartsForRefresh = [];
            for (let i = 0; i < allChartsForTranscription.length; i++) {
              const chart = allChartsForTranscription[i];
              const chartId = chart.id || `chart-${i}`;

              if (!chart.id) {
                console.warn(`[Dashboard Refresh] ⚠️ Chart ${i} has no chart.id, falling back to "chart-${i}"`);
              }

              const chartPayload = buildChartTranscriptionPayload(chart);

              if (!chartPayload || chartPayload.data.length === 0) {
                console.warn(`[Dashboard Refresh] ⚠️ Chart ${chartId} has no data for transcription, skipping`);
                continue;
              }

              chartsForRefresh.push({
                chartId,
                context: chart.title || chartId,
                chartPayload
              });
            }
            
            console.log(`[Dashboard Refresh] ========================================`);
            console.log(`[Dashboard Refresh] 📊 CAPTURE SUMMARY:`);
            console.log(`[Dashboard Refresh] Total charts to process: ${allChartsForTranscription.length}`);
            console.log(`[Dashboard Refresh] Successfully prepared: ${chartsForRefresh.length}`);
            console.log(`[Dashboard Refresh] Chart IDs prepared:`, chartsForRefresh.map(c => c.chartId));
            
            // ⚠️ CRITICAL: Verify all charts were prepared
            if (chartsForRefresh.length < allChartsForTranscription.length) {
              const missingCharts = allChartsForTranscription
                .filter(chart => !chartsForRefresh.find(c => c.chartId === (chart.id || `chart-${allChartsForTranscription.indexOf(chart)}`)))
                .map(chart => chart.id || `chart-${allChartsForTranscription.indexOf(chart)}`);
              console.error(`[Dashboard Refresh] ❌❌❌ MISSING CHART PAYLOADS: ${missingCharts.length} charts were NOT prepared!`);
              console.error(`[Dashboard Refresh] ❌ Missing chart IDs:`, missingCharts);
              console.error(`[Dashboard Refresh] ❌ This means these charts will NOT be sent to OpenAI!`);
            } else {
              console.log(`[Dashboard Refresh] ✅✅✅ ALL CHARTS PREPARED: ${chartsForRefresh.length}/${allChartsForTranscription.length}`);
            }
            
            // ✅ STEP 4: VERIFY ALL CAPTURED CHARTS HAVE STABLE IDs
            console.log(`[Dashboard Refresh] 🔍 VERIFYING CAPTURED CHART IDs:`);
            chartsForRefresh.forEach((chart, idx) => {
              console.log(`[Dashboard Refresh] Captured chart ${idx + 1}: chartId="${chart.chartId}", context="${chart.context}"`);
              if (!chart.chartId || chart.chartId.startsWith('chart-')) {
                console.warn(`[Dashboard Refresh] ⚠️ Chart ${idx + 1} has generic/missing chartId: "${chart.chartId}"`);
              }
            });
            
            // Call /refresh endpoint - processes charts sequentially, always overwrites
            if (chartsForRefresh.length > 0) {
              console.log(`[Dashboard Refresh] ========================================`);
              console.log(`[Dashboard Refresh] 📤 SENDING TO BACKEND: ${chartsForRefresh.length} charts`);
              console.log(`[Dashboard Refresh] Request body structure:`, {
                charts: chartsForRefresh.map(c => ({
                  chartId: c.chartId,
                  context: c.context,
                  hasChartPayload: !!c.chartPayload,
                  dataLength: c.chartPayload?.data?.length || 0
                }))
              });
              
              const { data } = await chartTranscriptionAPI.refresh(chartsForRefresh);
              
              console.log(`[Dashboard Refresh] ========================================`);
              console.log(`[Dashboard Refresh] 📥 BACKEND RESPONSE RECEIVED`);
              console.log(`[Dashboard Refresh] Full response:`, data);
              
              if (data.results) {
                const updated = data.results.filter(r => r.status === 'updated').length;
                const errors = data.results.filter(r => r.status === 'error').length;
                const skipped = data.results.filter(r => r.status === 'skip-invalid').length;
                console.log(`[Dashboard Refresh] Results: ${updated} updated, ${errors} errors, ${skipped} skipped`);
                
                // Log each result
                data.results.forEach(result => {
                  console.log(`[Dashboard Refresh] Chart ${result.chartId}: ${result.status}${result.error ? ` (${result.error})` : ''}`);
                });
              }
            } else {
              console.error(`[Dashboard Refresh] ❌❌❌ CRITICAL: NO CHARTS WERE CAPTURED!`);
              console.error(`[Dashboard Refresh] This means the refresh will NOT call the backend.`);
              console.error(`[Dashboard Refresh] Possible reasons:`);
              console.error(`[Dashboard Refresh] 1. Charts not rendered yet (increase setTimeout delay)`);
              console.error(`[Dashboard Refresh] 2. Chart elements don't have [data-chart-id] attribute`);
              console.error(`[Dashboard Refresh] 3. Charts don't have .recharts-wrapper class`);
            }
            
            console.log(`[Dashboard Refresh] All dashboard chart transcriptions refreshed successfully`);
            
            // Also refresh transcriptions for report charts (if Reports page is active)
            // This ensures that when data is refreshed, report chart transcriptions are updated with new data
            // Wait a bit longer to ensure report charts have updated with new data
            setTimeout(async () => {
              try {
                console.log('[Dashboard Refresh] Checking for report charts to refresh...');
                
                // Find all report chart elements (they have data-chart-only="true" attribute)
                const reportChartElements = document.querySelectorAll('[data-chart-id][data-chart-only="true"]');
                
                if (reportChartElements.length > 0) {
                  console.log(`[Dashboard Refresh] Found ${reportChartElements.length} report charts to refresh`);
                
                const storedReportChartsMap = getStoredReportChartsMap();
                const chartsForFill = [];
                
                for (const chartElement of reportChartElements) {
                  const chartCard = chartElement.closest('[data-chart-id]');
                  if (chartCard) {
                    const chartId = chartCard.getAttribute('data-chart-id');
                    if (chartId) {
                      const storedChart = storedReportChartsMap.get(chartId);
                      if (!storedChart) {
                        console.warn(`[Dashboard Refresh] Report chart ${chartId} not found in stored report data, skipping`);
                        continue;
                      }
                      
                      const chartPayload = buildChartTranscriptionPayload(storedChart);
                      if (!chartPayload || chartPayload.data.length === 0) {
                        console.warn(`[Dashboard Refresh] Report chart ${chartId} has no data for transcription, skipping`);
                        continue;
                      }
                      
                      const reportTitle = document.querySelector('h2')?.textContent || 'Report';
                      const topic = `${reportTitle} - ${storedChart.title || chartId}`;
                      
                      chartsForFill.push({
                        chartId,
                        context: topic || chartId,
                        chartPayload
                      });
                    }
                  }
                }
                
                if (chartsForFill.length > 0) {
                  console.log(`[Dashboard Refresh] Refreshing ${chartsForFill.length} report chart transcriptions with new data...`);
                  
                  const chartsForAPI = chartsForFill;
                  
                  // Call /refresh endpoint - processes charts sequentially, always overwrites
                  const { data } = await chartTranscriptionAPI.refresh(chartsForAPI);
                  console.log(`[Dashboard Refresh] ✅ Report charts refresh completed:`, data);
                  
                  if (data.results) {
                    const updated = data.results.filter(r => r.status === 'updated').length;
                    const errors = data.results.filter(r => r.status === 'error').length;
                    console.log(`[Dashboard Refresh] Report charts results: ${updated} updated, ${errors} errors`);
                  }
                  
                  console.log(`[Dashboard Refresh] All report chart transcriptions refreshed successfully`);
                  
                  // Dispatch custom event to notify Reports page to reload transcriptions
                  window.dispatchEvent(new CustomEvent('reportTranscriptionsRefreshed'));
                } else {
                  console.warn('[Dashboard Refresh] No report charts prepared for transcription');
                }
              } else {
                console.log('[Dashboard Refresh] No report charts found to refresh');
              }
              } catch (err) {
                console.error('[Dashboard Refresh] Failed to refresh report chart transcriptions:', err);
                // Don't fail the whole refresh if report transcription refresh fails
              }
            }, 5000); // Wait 5 seconds to ensure report charts have updated with new data
          } catch (err) {
            console.error('[Dashboard Refresh] Failed to refresh chart transcriptions:', err);
            // Don't fail the whole refresh if transcription refresh fails
          }
        }
      }, 2000); // Wait 2 seconds for charts to render
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to refresh data');
      setRefreshStatus({
        status: 'failed',
        error: err.response?.data?.error || err.message
      });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // On first load, auto-refresh if no data is available
    fetchDashboard(true);
  }, []);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refreshing,
    refreshStatus,
    refresh: refreshData,
    refetch: fetchDashboard,
    retryFailed: (services) => refreshData(services),
    setRefreshStatus,
  };
};


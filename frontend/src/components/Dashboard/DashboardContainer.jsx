import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '../../hooks/useDashboardData';
import { dashboardAPI } from '../../services/api';
import ChartGrid from './ChartGrid';
import DashboardHeader from './DashboardHeader';
import BOXSidebar from '../BOX/BOXSidebar';
import LoadingSpinner from '../Common/LoadingSpinner';
import ErrorMessage from '../Common/ErrorMessage';
import EmptyState from '../Common/EmptyState';
import NotificationBanner from '../Common/NotificationBanner';
import RefreshStatusModal from './RefreshStatusModal';
import { Menu } from 'lucide-react';

const DashboardContainer = () => {
  const navigate = useNavigate();
  const {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
    refreshing,
    refreshStatus,
    retryFailed,
    setRefreshStatus
  } = useDashboardData();
  const [boxOpen, setBoxOpen] = useState(false);
  const [isStatusModalOpen, setStatusModalOpen] = useState(false);
  const [allCharts, setAllCharts] = useState(null); // All charts (priority + BOX) for rendering

  const failedServicesMap = useMemo(() => {
    if (!refreshStatus?.failed) return {};
    return refreshStatus.failed.reduce((acc, item) => {
      acc[item.service] = item;
      return acc;
    }, {});
  }, [refreshStatus]);

  // Load all charts (priority + BOX) for rendering (including hidden charts for transcription)
  // ⚠️ CRITICAL: Always reload when data changes to ensure charts update after Refresh Data
  useEffect(() => {
    const loadAllCharts = async () => {
      try {
        const response = await dashboardAPI.getAllCharts();
        setAllCharts(response.data?.charts || []);
        // Mark as loaded in sessionStorage
        try {
          sessionStorage.setItem('allChartsLoaded', 'true');
        } catch {
          // Ignore if sessionStorage is not available
        }
      } catch (err) {
        console.error('[DashboardContainer] Failed to load all charts:', err);
        // Fallback to dashboard data if available
        setAllCharts(data?.charts || []);
        // Mark as loaded even on error to prevent retries
        try {
          sessionStorage.setItem('allChartsLoaded', 'true');
        } catch {
          // Ignore if sessionStorage is not available
        }
      }
    };

    if (data?.charts) {
      loadAllCharts();
    }
  }, [data?.charts]); // Remove allCharts from dependencies - always reload when data changes

  const priorityCharts = useMemo(() => {
    return allCharts?.filter((chart) => chart.metadata?.isPriority !== false) || data?.charts?.filter((chart) => chart.metadata?.isPriority !== false) || [];
  }, [allCharts, data?.charts]);

  const boxCharts = useMemo(() => {
    return allCharts?.filter((chart) => chart.metadata?.isPriority === false) || [];
  }, [allCharts]);

  // All non-priority charts (BOX + any other charts) for hidden rendering
  // These are rendered off-screen so they can be captured for transcription
  const hiddenCharts = useMemo(() => {
    if (!allCharts) return [];
    // Include all charts that are explicitly marked as non-priority (isPriority === false)
    // This includes BOX charts and any other non-priority charts
    return allCharts.filter((chart) => chart.metadata?.isPriority === false);
  }, [allCharts]);

  const handleChartClick = (chart) => {
    if (!chart || !chart.id) return;
    const service = chart.metadata?.service;
    const failedInfo = failedServicesMap[service];
    navigate(`/dashboard/chart/${chart.id}`, {
      state: {
        isStale: !!failedInfo,
        lastUpdated: chart.metadata?.lastUpdated || failedInfo?.lastSuccessful || null,
        service
      }
    });
  };

  const handleBoxChartClick = (chartId) => {
    navigate(`/dashboard/chart/${chartId}`);
    setBoxOpen(false);
  };

  // Debug logging
  useEffect(() => {
    console.log('📊 Dashboard State:', {
      loading,
      hasData: !!data,
      chartsCount: data?.charts?.length || 0,
      error,
      lastUpdated
    });
  }, [loading, data, error, lastUpdated]);

  if (loading && !data) {
    return <LoadingSpinner />;
  }

  if (error && !data) {
    return (
      <div>
        <ErrorMessage message={error} onRetry={refresh} />
        <div className="mt-4 text-center text-sm text-neutral-500">
          <p>Check Console (F12) for detailed error information</p>
          <p>API URL: {import.meta.env.VITE_API_URL || 'Not set - using localhost'}</p>
        </div>
      </div>
    );
  }

  if (!data || !data.charts || data.charts.length === 0) {
    return (
      <div>
        <EmptyState message="No dashboard data available" />
        <div className="mt-4 text-center">
          <button onClick={refresh} className="btn-primary">
            Load Data
          </button>
        </div>
      </div>
    );
  }

  const showPartialBanner = refreshStatus?.status === 'partial';
  const showFailureBanner = refreshStatus?.status === 'failed';
  const showBanner = showPartialBanner || showFailureBanner;
  const bannerMessage = showPartialBanner
    ? 'Data refresh completed partially — some sources could not be updated.'
    : 'Data refresh failed — showing cached information.';

  const handleDismissBanner = () => setRefreshStatus(null);

  const handleRetryFailed = () => {
    if (refreshStatus?.failed?.length) {
      retryFailed(refreshStatus.failed.map((item) => item.service));
    } else {
      refresh();
    }
  };

  return (
    <div className="relative">
      {showBanner && (
        <NotificationBanner
          variant={showFailureBanner ? 'error' : 'warning'}
          message={bannerMessage}
          actionLabel="View details"
          onAction={() => setStatusModalOpen(true)}
          onRetry={handleRetryFailed}
          onClose={handleDismissBanner}
          retryLabel={showFailureBanner ? 'Retry refresh' : 'Retry failed sources'}
        />
      )}

      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 pt-2">
          <div className="flex-1 min-w-0">
            <DashboardHeader lastUpdated={lastUpdated} onRefresh={refresh} refreshing={refreshing} />
          </div>
          <button
            onClick={() => setBoxOpen(!boxOpen)}
            className="btn-secondary flex items-center space-x-2 flex-shrink-0"
            aria-label="Toggle BOX sidebar"
          >
            <Menu className="h-5 w-5" />
            <span>BOX</span>
          </button>
        </div>
        <ChartGrid
          charts={priorityCharts}
          onChartClick={handleChartClick}
          failedServices={failedServicesMap}
        />
      </div>

      {/* Hidden container to render ALL non-priority charts (BOX + others) for transcription capture */}
      {hiddenCharts.length > 0 && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '-9999px',
            left: '-9999px',
            width: '1200px',
            pointerEvents: 'none',
            opacity: 0,
          }}
        >
          <ChartGrid
            charts={hiddenCharts}
            onChartClick={() => {}}
            failedServices={failedServicesMap}
          />
        </div>
      )}

      <BOXSidebar
        isOpen={boxOpen}
        onClose={() => setBoxOpen(false)}
        onChartClick={handleBoxChartClick}
      />

      <RefreshStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        status={refreshStatus}
        onRetry={handleRetryFailed}
      />

      {/* RAG Chatbot Container - Renders its own floating UI */}
      <div id="edu-bot-dashboard-container" />
    </div>
  );
};

export default DashboardContainer;

import { ChartData } from '../../domain/entities/ChartData.js';

// Color schemes for different services
const COLOR_SCHEMES = {
  directory: {
    primary: '#3b82f6', // Blue
    secondary: '#60a5fa',
    gradient: ['#3b82f6', '#60a5fa', '#93c5fd']
  },
  courseBuilder: {
    primary: '#10b981', // Emerald
    secondary: '#34d399',
    gradient: ['#10b981', '#34d399', '#6ee7b7']
  },
  assessment: {
    primary: '#f59e0b', // Amber
    secondary: '#fbbf24',
    gradient: ['#f59e0b', '#fbbf24', '#fcd34d']
  },
  contentStudio: {
    primary: '#8b5cf6', // Purple
    secondary: '#a78bfa',
    gradient: ['#8b5cf6', '#a78bfa', '#c4b5fd']
  },
  learningAnalytics: {
    primary: '#ef4444', // Red
    secondary: '#f87171',
    gradient: ['#ef4444', '#f87171', '#fca5a5']
  }
};

const SERVICE_CHART_CONFIG = {
  directory: {
    title: 'Organization Directory Overview',
    description: 'Aggregated user and organization metrics',
    type: 'bar',
    colorScheme: COLOR_SCHEMES.directory
  },
  courseBuilder: {
    title: 'Course Completion Metrics',
    description: 'Course completion and enrollment trends',
    type: 'line',
    colorScheme: COLOR_SCHEMES.courseBuilder
  },
  assessment: {
    title: 'Assessment Performance',
    description: 'Assessment scores and skill evaluations',
    type: 'bar',
    colorScheme: COLOR_SCHEMES.assessment
  },
  contentStudio: {
    title: 'Content Engagement',
    description: 'Content usage and effectiveness metrics',
    type: 'area',
    colorScheme: COLOR_SCHEMES.contentStudio
  },
  learningAnalytics: {
    title: 'Learning Analytics Summary',
    description: 'Platform-wide learning performance insights',
    type: 'pie',
    colorScheme: COLOR_SCHEMES.learningAnalytics
  }
};

export class GetDashboardUseCase {
  constructor(cacheRepository) {
    this.cacheRepository = cacheRepository;
  }

  async execute(latestEntries = null) {
    try {
      // Use provided latestEntries if available, otherwise fetch from cache
      if (!latestEntries) {
        latestEntries = await this.cacheRepository.getLatestEntries();
      }

      console.log('GetDashboardUseCase - latestEntries count:', latestEntries.length);
      if (latestEntries.length > 0) {
        const firstEntry = latestEntries[0];
        console.log('GetDashboardUseCase - First entry service:', firstEntry.service);
        console.log('GetDashboardUseCase - First entry keys:', Object.keys(firstEntry || {}));
        console.log('GetDashboardUseCase - First entry.data keys:', Object.keys(firstEntry?.data || {}));
        console.log('GetDashboardUseCase - First entry.data.metrics keys:', Object.keys(firstEntry?.data?.metrics || {}));
        console.log('GetDashboardUseCase - First entry.data.metrics sample:', JSON.stringify(firstEntry?.data?.metrics || {}, null, 2).substring(0, 300));
      }

      const charts = [];
      
      // Priority services for main dashboard (most important for managers)
      const priorityServices = ['directory', 'courseBuilder', 'assessment'];
      
      // Process each service and create multiple charts
      for (const { service, data } of latestEntries) {
        const config = SERVICE_CHART_CONFIG[service] || {
          title: `${service} Metrics`,
          description: `Latest metrics for ${service}`,
          type: 'bar',
          colorScheme: COLOR_SCHEMES.directory
        };

        console.log(`GetDashboardUseCase - Processing ${service}`);
        
        // Only create main overview chart for priority services (for main dashboard)
        // Content Studio and detailed charts will go to BOX
        if (priorityServices.includes(service)) {
          const mainChartData = this.formatChartData(data, service, 'main');
          if (mainChartData.length > 0) {
            const mainChart = new ChartData({
              id: `chart-${service}`,
              title: config.title,
              type: config.type,
              data: mainChartData,
              description: config.description,
              metadata: {
                service,
                lastUpdated: data.metadata?.collected_at || null,
                source: data.metadata?.source || service,
                schemaVersion: data.metadata?.schema_version || '1.0',
                colorScheme: config.colorScheme,
                isPriority: true // Mark as priority for main dashboard
              }
            });
            charts.push(mainChart.toJSON());
          }
        }
        
        // Create detailed charts for BOX (all services, including priority ones)
        // These will be available in BOX sidebar
        const detailedCharts = this.createDetailedCharts(service, data, config.colorScheme);
        // Mark detailed charts as non-priority
        detailedCharts.forEach(chart => {
          chart.metadata.isPriority = false;
        });
        charts.push(...detailedCharts);
      }
      
      // Also create Content Studio main chart for BOX (Learning Analytics removed)
      for (const { service, data } of latestEntries) {
        if (service === 'contentStudio') {
          const config = SERVICE_CHART_CONFIG[service];
          const mainChartData = this.formatChartData(data, service, 'main');
          
          console.log(`[GetDashboardUseCase] Processing ${service}:`, {
            has_data: !!data,
            has_metrics: !!data?.data?.metrics,
            metrics_keys: Object.keys(data?.data?.metrics || {}),
            mainChartData_length: mainChartData.length,
            mainChartData_sample: mainChartData.slice(0, 3)
          });
          
          if (mainChartData.length > 0) {
            const mainChart = new ChartData({
              id: `chart-${service}`,
              title: config.title,
              type: config.type,
              data: mainChartData,
              description: config.description,
              metadata: {
                service,
                lastUpdated: data.metadata?.collected_at || null,
                source: data.metadata?.source || service,
                schemaVersion: data.metadata?.schema_version || '1.0',
                colorScheme: config.colorScheme,
                isPriority: false // Content Studio goes to BOX
              }
            });
            const chartJson = mainChart.toJSON();
            console.log(`[GetDashboardUseCase] ✅ Created chart for ${service}:`, {
              id: chartJson.id,
              type: chartJson.type,
              data_length: chartJson.data?.length,
              data_sample: chartJson.data?.slice(0, 3)
            });
            charts.push(chartJson);
          } else {
            console.log(`[GetDashboardUseCase] ⚠️ No chart data for ${service} - mainChartData is empty`);
          }
        }
      }

      if (charts.length === 0) {
        return {
          charts: this.getDefaultCharts(),
          lastUpdated: null
        };
      }

      // ✅ STEP 4: VERIFY ALL CHARTS HAVE STABLE IDs
      console.log('[GetDashboardUseCase] ========================================');
      console.log('[GetDashboardUseCase] 🔍 CHART ID VERIFICATION:');
      charts.forEach((chart, index) => {
        console.log(`[GetDashboardUseCase] Chart ${index + 1}: id="${chart.id}", title="${chart.title}"`);
        if (!chart.id) {
          console.error(`[GetDashboardUseCase] ❌ ERROR: Chart ${index + 1} has no ID!`);
        }
      });
      console.log('[GetDashboardUseCase] ========================================');

      const lastUpdated = charts
        .map((chart) => chart.metadata?.lastUpdated)
        .filter(Boolean)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;

      return {
        charts,
        lastUpdated
      };
    } catch (error) {
      console.error('GetDashboardUseCase error:', error);
      throw error;
    }
  }

  formatChartData(entry, service, chartType = 'main') {
    // Try to find metrics in the entry
    let metrics = null;
    
    if (entry?.data?.metrics) {
      metrics = entry.data.metrics;
    } else if (entry?.metrics) {
      metrics = entry.metrics;
    } else if (entry?.data && typeof entry.data === 'object' && !Array.isArray(entry.data)) {
      metrics = entry.data.metrics || entry.data;
    }
    
    if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics)) {
      return [];
    }
    
    // For main charts, show key metrics
    if (chartType === 'main') {
      return this.formatMainChartData(service, metrics);
    }
    
    // For detailed charts, format based on chart type
    return this.formatDetailedChartData(service, metrics, chartType, entry);
  }

  formatMainChartData(service, metrics) {
    // Select key metrics for main chart based on service
    const keyMetricsMap = {
      directory: ['totalUsers', 'totalOrganizations', 'activeUsers', 'organizationsActive'],
      courseBuilder: ['totalCourses', 'totalEnrollments', 'activeEnrollments', 'averageCompletionRate', 'averageRating'],
      assessment: ['totalAssessments', 'averageScore', 'passRate', 'completedAssessments', 'passedAssessments'],
      contentStudio: ['totalContentItems', 'totalViews', 'totalLikes', 'averageViewsPerContent', 'engagementScore'],
      learningAnalytics: ['totalLearningHours', 'platformUsageRate', 'userSatisfactionScore', 'activeLearningSessions', 'learningROI']
    };

    const keyMetrics = keyMetricsMap[service] || Object.keys(metrics).slice(0, 5);
    const simpleMetrics = {};

    for (const key of keyMetrics) {
      if (metrics[key] !== undefined && typeof metrics[key] === 'number') {
        // Include even if value is 0 (for learningAnalytics, 0 is valid data)
        simpleMetrics[key] = metrics[key];
      }
    }

    console.log(`[formatMainChartData] ${service}:`, {
      keyMetrics,
      simpleMetrics,
      simpleMetrics_keys: Object.keys(simpleMetrics),
      all_zero: Object.values(simpleMetrics).every(v => v === 0)
    });

    // For learningAnalytics, check if all values are 0
    if (service === 'learningAnalytics') {
      if (Object.keys(simpleMetrics).length === 0) {
        console.log(`[formatMainChartData] ⚠️ ${service}: No metrics found`);
        return [];
      }
      // Check if all values are 0
      const allZero = Object.values(simpleMetrics).every(v => v === 0);
      if (allZero) {
        console.log(`[formatMainChartData] ⚠️ ${service}: All metrics are 0 - chart will be empty`);
        // Still return the data so the chart can show "0" values
      }
    }

    const result = this.formatMetricsArray(simpleMetrics);
    console.log(`[formatMainChartData] ${service} result:`, {
      length: result.length,
      sample: result.slice(0, 3)
    });
    return result;
  }

  formatDetailedChartData(service, metrics, chartType, entry) {
    const details = entry?.data?.details || {};
    
    switch (chartType) {
      case 'usersByRole':
        if (metrics.usersByRole) {
          return Object.entries(metrics.usersByRole).map(([role, count]) => ({
            name: role.charAt(0).toUpperCase() + role.slice(1),
            value: count
          }));
        }
        break;
      case 'usersByDepartment':
        if (metrics.usersByDepartment) {
          return Object.entries(metrics.usersByDepartment).map(([dept, count]) => ({
            name: dept,
            value: count
          }));
        }
        break;
      case 'contentByType':
        if (metrics.contentByType) {
          return Object.entries(metrics.contentByType).map(([type, count]) => ({
            name: type.charAt(0).toUpperCase() + type.slice(1),
            value: count
          }));
        }
        break;
      case 'courseStatus':
        return [
          { name: 'Completed', value: metrics.totalCompletedCourses || 0 },
          { name: 'In Progress', value: metrics.inProgressCourses || 0 },
          { name: 'Not Started', value: (metrics.totalCourses || 0) - (metrics.totalCompletedCourses || 0) - (metrics.inProgressCourses || 0) }
        ].filter(item => item.value > 0);
      case 'assessmentStatus':
        return [
          { name: 'Passed', value: metrics.passedAssessments || 0 },
          { name: 'Failed', value: metrics.failedAssessments || 0 },
          { name: 'In Progress', value: (metrics.completedAssessments || 0) - (metrics.passedAssessments || 0) - (metrics.failedAssessments || 0) }
        ].filter(item => item.value > 0);
    }
    
    return [];
  }

  formatMetricsArray(simpleMetrics) {
    const formatMetricName = (key) => {
      return key
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
    };

    return Object.entries(simpleMetrics).map(([key, value]) => ({
      name: formatMetricName(key),
      value: typeof value === 'number' ? Math.round(value * 100) / 100 : value
    }));
  }

  createDetailedCharts(service, data, colorScheme) {
    const charts = [];
    const metrics = data?.data?.metrics || {};
    const details = data?.data?.details || {};

    switch (service) {
      case 'directory':
        // Users by Role chart
        if (metrics.usersByRole && Object.keys(metrics.usersByRole).length > 0) {
          const roleData = this.formatDetailedChartData(service, metrics, 'usersByRole', data);
          if (roleData.length > 0) {
            charts.push({
              id: `chart-${service}-users-by-role`,
              title: 'Users by Role',
              type: 'pie',
              data: roleData,
              description: 'Distribution of users across different roles',
              metadata: {
                service,
                chartType: 'usersByRole',
                lastUpdated: data.metadata?.collected_at || null,
                colorScheme
              }
            });
          }
        }
        // Users by Department chart
        if (metrics.usersByDepartment && Object.keys(metrics.usersByDepartment).length > 0) {
          const deptData = this.formatDetailedChartData(service, metrics, 'usersByDepartment', data);
          if (deptData.length > 0) {
            charts.push({
              id: `chart-${service}-users-by-department`,
              title: 'Users by Department',
              type: 'bar',
              data: deptData,
              description: 'User distribution across departments',
              metadata: {
                service,
                chartType: 'usersByDepartment',
                lastUpdated: data.metadata?.collected_at || null,
                colorScheme
              }
            });
          }
        }
        break;

      case 'courseBuilder':
        // Course Status chart
        const courseStatusData = this.formatDetailedChartData(service, metrics, 'courseStatus', data);
        if (courseStatusData.length > 0) {
          charts.push({
            id: `chart-${service}-course-status`,
            title: 'Course Completion Status',
            type: 'pie',
            data: courseStatusData,
            description: 'Breakdown of courses by completion status',
            metadata: {
              service,
              chartType: 'courseStatus',
              lastUpdated: data.metadata?.collected_at || null,
              colorScheme
            }
          });
        }
        break;

      case 'assessment':
        // Assessment Status chart
        const assessmentStatusData = this.formatDetailedChartData(service, metrics, 'assessmentStatus', data);
        if (assessmentStatusData.length > 0) {
          charts.push({
            id: `chart-${service}-assessment-status`,
            title: 'Assessment Results',
            type: 'pie',
            data: assessmentStatusData,
            description: 'Breakdown of assessments by result status',
            metadata: {
              service,
              chartType: 'assessmentStatus',
              lastUpdated: data.metadata?.collected_at || null,
              colorScheme
            }
          });
        }
        break;

      case 'contentStudio':
        // Content by Type chart
        if (metrics.contentByType && Object.keys(metrics.contentByType).length > 0) {
          const contentTypeData = this.formatDetailedChartData(service, metrics, 'contentByType', data);
          if (contentTypeData.length > 0) {
            charts.push({
              id: `chart-${service}-content-by-type`,
              title: 'Content by Type',
              type: 'pie',
              data: contentTypeData,
              description: 'Distribution of content across different types',
              metadata: {
                service,
                chartType: 'contentByType',
                lastUpdated: data.metadata?.collected_at || null,
                colorScheme
              }
            });
          }
        }
        break;
    }

    return charts;
  }

  getDefaultCharts() {
    return Object.entries(SERVICE_CHART_CONFIG).map(([service, config]) => ({
      id: `chart-${service}`,
      title: config.title,
      type: config.type,
      data: [],
      description: config.description,
      metadata: {
        service,
        lastUpdated: null
      }
    }));
  }
}


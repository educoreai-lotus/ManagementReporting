import { Report } from '../../domain/entities/Report.js';
import { GetDashboardUseCase } from './GetDashboardUseCase.js';
import { GetCombinedAnalyticsUseCase } from './GetCombinedAnalyticsUseCase.js';

export class GenerateReportUseCase {
  constructor(cacheRepository, pdfGenerator, aiService) {
    this.cacheRepository = cacheRepository;
    this.pdfGenerator = pdfGenerator;
    this.aiService = aiService;
    this.getDashboardUseCase = new GetDashboardUseCase(cacheRepository);
    this.getCombinedAnalyticsUseCase = new GetCombinedAnalyticsUseCase(cacheRepository);
  }

  async execute(reportType, options = {}) {
    try {
      const format = options.format || 'json';
      
      // 1. Get latest entries from cache (once, shared across all use cases)
      const latestEntries = await this.cacheRepository.getLatestEntries();
      
      // 2. Format report data
      const reportData = await this.formatReportData(latestEntries, reportType, options);

      // 3. Create report entity
      const report = new Report({
        id: `${reportType}-${Date.now()}`,
        type: reportType,
        executiveSummary: reportData.executiveSummary,
        charts: reportData.charts,
        dataTable: reportData.dataTable,
        generatedAt: new Date().toISOString()
      });

      // 4. Generate AI insights
      // For JSON: always generate mock insights (fast, no OpenAI call) - provides fallback if reportConclusions fails
      // For PDF: always generate (may call OpenAI if API key available)
      // This ensures aiInsights is available as fallback if reportConclusions fails in frontend
      try {
        if (format === 'pdf') {
          // PDF format: always generate (may call OpenAI)
          const aiInsights = await this.aiService.analyze(reportData, reportType);
          report.setAIInsights(aiInsights);
        } else {
          // JSON format: always generate mock insights (fast, synchronous, no OpenAI call)
          // This provides fallback content if reportConclusions fails in frontend
          const aiInsights = this.aiService.generateMockInsights(reportType, reportData);
          report.setAIInsights(aiInsights);
        }
      } catch (error) {
        console.error('AI analysis failed:', error);
        // Continue without AI insights
      }

      // 5. Generate PDF (only if format is 'pdf' - skip for JSON to improve performance)
      let pdf = null;
      if (format === 'pdf') {
        pdf = await this.pdfGenerator.generate(
          report.toJSON(), 
          options.chartImages || {},
          options.chartNarrations || {},
          options.reportConclusions || null
        );
      }

      return {
        report: report.toJSON(),
        pdf: pdf
      };
    } catch (error) {
      console.error('GenerateReportUseCase error:', error);
      throw error;
    }
  }

  async formatReportData(latestEntries, reportType, options) {
    // Get dashboard charts and combined analytics (pass latestEntries to avoid redundant cache calls)
    const dashboardData = await this.getDashboardUseCase.execute(latestEntries);
    const combinedAnalytics = await this.getCombinedAnalyticsUseCase.execute(latestEntries);
    
    // Aggregate and format data based on report type
    const aggregated = this.aggregateData(latestEntries, reportType);

    // Get relevant charts for this report type
    const relevantCharts = this.getRelevantCharts(
      dashboardData.charts,
      combinedAnalytics.charts,
      reportType
    );

    return {
      executiveSummary: this.generateExecutiveSummary(aggregated, reportType, latestEntries),
      charts: relevantCharts,
      dataTable: this.generateDataTable(aggregated, reportType),
      rawData: this.getRawDataForReport(latestEntries, reportType)
    };
  }

  aggregateData(latestEntries, reportType) {
    // Aggregate data from all services
    const metrics = {
      totalCourses: 0,
      totalUsers: 0,
      totalEnrollments: 0,
      activeEnrollments: 0,
      averageCompletionRate: 0,
      averageRating: 0,
      totalAssessments: 0,
      averageScore: 0,
      passRate: 0,
      totalContentItems: 0,
      totalViews: 0,
      totalLearningHours: 0,
      platformUsageRate: 0,
      userSatisfactionScore: 0
    };

    for (const { service, data } of latestEntries) {
      const serviceMetrics = data?.data?.metrics || data?.metrics || {};
      
      if (service === 'directory') {
        metrics.totalUsers += serviceMetrics.totalUsers || 0;
      } else if (service === 'courseBuilder') {
        metrics.totalCourses += serviceMetrics.totalCourses || 0;
        metrics.totalEnrollments += serviceMetrics.totalEnrollments || 0;
        metrics.activeEnrollments += serviceMetrics.activeEnrollments || 0;
        metrics.averageCompletionRate += serviceMetrics.averageCompletionRate || 0;
        metrics.averageRating += serviceMetrics.averageRating || 0;
      } else if (service === 'assessment') {
        metrics.totalAssessments += serviceMetrics.totalAssessments || 0;
        metrics.averageScore += serviceMetrics.averageScore || 0;
        metrics.passRate += serviceMetrics.passRate || 0;
      } else if (service === 'contentStudio') {
        metrics.totalContentItems += serviceMetrics.totalContentItems || 0;
        metrics.totalViews += serviceMetrics.totalViews || 0;
      } else if (service === 'learningAnalytics') {
        metrics.totalLearningHours += serviceMetrics.totalLearningHours || 0;
        metrics.platformUsageRate += serviceMetrics.platformUsageRate || 0;
        metrics.userSatisfactionScore += serviceMetrics.userSatisfactionScore || 0;
      }
    }

    // Calculate averages
    const courseBuilderCount = latestEntries.filter(e => e.service === 'courseBuilder').length;
    if (courseBuilderCount > 0) {
      metrics.averageCompletionRate = metrics.averageCompletionRate / courseBuilderCount;
      metrics.averageRating = metrics.averageRating / courseBuilderCount;
    }

    const assessmentCount = latestEntries.filter(e => e.service === 'assessment').length;
    if (assessmentCount > 0) {
      metrics.averageScore = metrics.averageScore / assessmentCount;
      metrics.passRate = metrics.passRate / assessmentCount;
    }

    return metrics;
  }

  getRelevantCharts(dashboardCharts, combinedCharts, reportType) {
    const allCharts = [...dashboardCharts, ...combinedCharts];
    
    // Map report types to relevant chart IDs/keywords
    const reportChartMap = {
      'monthly-performance': ['courseBuilder', 'learningAnalytics', 'combined-enrollments-comparison', 'combined-top-courses'],
      'course-completion': ['courseBuilder', 'combined-enrollments-comparison', 'combined-top-courses', 'combined-completion-rate-per-org'],
      'user-engagement': ['directory', 'learningAnalytics', 'combined-users-per-organization', 'combined-rating-vs-engagement'],
      'organizational-benchmark': ['directory', 'combined-users-per-organization', 'combined-completion-rate-per-org'],
      'learning-roi': ['learningAnalytics', 'courseBuilder', 'combined-top-courses'],
      'skill-gap': ['assessment', 'combined-skill-gap-analysis'],
      'compliance': ['assessment', 'courseBuilder'],
      'performance-trend': [
        'courseBuilder', 
        'assessment', 
        'combined-monthly-growth', 
        'combined-rating-vs-engagement', 
        'combined-enrollments-comparison', 
        'combined-top-courses',
        'combined-completion-rate-per-org'
      ],
      'course-performance-deep-dive': ['courseBuilder', 'assessment', 'combined-enrollments-comparison', 'combined-top-courses', 'combined-dropoff'],
      'content-effectiveness': ['contentStudio', 'combined-content-usage-by-creator'],
      'department-performance': ['directory', 'combined-completion-rate-per-org', 'combined-users-per-organization'],
      'drop-off-analysis': ['courseBuilder', 'combined-dropoff', 'combined-enrollments-comparison']
    };

    const relevantKeywords = reportChartMap[reportType] || [];
    
    const filtered = allCharts.filter(chart => {
      const chartId = chart.id || '';
      const service = chart.metadata?.service || '';
      const chartType = chart.metadata?.chartType || '';
      
      return relevantKeywords.some(keyword => 
        chartId.includes(keyword) || 
        service === keyword ||
        chartType === keyword
      );
    }).slice(0, 6); // Limit to 6 most relevant charts
    
    // ✅ STEP 4: VERIFY ALL REPORT CHARTS HAVE STABLE IDs
    console.log('[GenerateReportUseCase] ========================================');
    console.log(`[GenerateReportUseCase] 🔍 REPORT CHART ID VERIFICATION (${reportType}):`);
    filtered.forEach((chart, index) => {
      console.log(`[GenerateReportUseCase] Chart ${index + 1}: id="${chart.id}", title="${chart.title}"`);
      if (!chart.id) {
        console.error(`[GenerateReportUseCase] ❌ ERROR: Chart ${index + 1} has no ID!`);
      }
    });
    console.log('[GenerateReportUseCase] ========================================');
    
    return filtered;
  }

  getRawDataForReport(latestEntries, reportType) {
    // Return relevant raw data for AI analysis
    const dataByService = {};
    for (const { service, data } of latestEntries) {
      dataByService[service] = {
        metrics: data?.data?.metrics || data?.metrics || {},
        details: data?.data?.details || {}
      };
    }
    return dataByService;
  }

  generateExecutiveSummary(aggregated, reportType, latestEntries) {
    const reportTitles = {
      'monthly-performance': 'Monthly Learning Performance Report',
      'course-completion': 'Course Completion Analysis Report',
      'user-engagement': 'User Engagement Summary Report',
      'organizational-benchmark': 'Organizational Benchmark Report',
      'learning-roi': 'Learning ROI Report',
      'skill-gap': 'Skill Gap Analysis Report',
      'compliance': 'Compliance & Certification Tracking Report',
      'performance-trend': 'Performance Trend Analysis Report',
      'course-performance-deep-dive': 'Course Performance Deep Dive Report',
      'content-effectiveness': 'Content Effectiveness Report',
      'department-performance': 'Department Performance Report',
      'drop-off-analysis': 'Drop-off Analysis Report'
    };

    // Generate enhanced metrics for new reports
    let enhancedMetrics = { ...aggregated };
    
    if (reportType === 'course-performance-deep-dive') {
      // Add course-specific metrics
      enhancedMetrics = {
        ...aggregated,
        coursesAnalyzed: aggregated.totalCourses || 0,
        averageCourseDuration: this.calculateAverageCourseDuration(latestEntries),
        coursesByLevel: this.calculateCoursesByLevel(latestEntries),
        topPerformingCourses: this.getTopPerformingCoursesCount(latestEntries)
      };
    } else if (reportType === 'content-effectiveness') {
      // Add content-specific metrics
      enhancedMetrics = {
        ...aggregated,
        contentItemsAnalyzed: aggregated.totalContentItems || 0,
        averageEngagementScore: aggregated.totalViews > 0 ? 
          ((aggregated.totalLikes || 0) / aggregated.totalViews * 100).toFixed(2) : 0,
        contentTypesCount: this.countContentTypes(latestEntries),
        topContentCreators: this.countContentCreators(latestEntries)
      };
    } else if (reportType === 'department-performance') {
      // Add department-specific metrics
      enhancedMetrics = {
        ...aggregated,
        departmentsAnalyzed: this.countDepartments(latestEntries),
        averageDepartmentCompletion: aggregated.averageCompletionRate || 0,
        departmentEngagement: this.calculateDepartmentEngagement(latestEntries)
      };
    } else if (reportType === 'drop-off-analysis') {
      // Add drop-off specific metrics
      enhancedMetrics = {
        ...aggregated,
        totalEnrollments: aggregated.totalEnrollments || 0,
        activeEnrollments: aggregated.activeEnrollments || 0,
        dropOffRate: aggregated.totalEnrollments > 0 ? 
          (((aggregated.totalEnrollments - aggregated.activeEnrollments) / aggregated.totalEnrollments) * 100).toFixed(2) : 0,
        coursesWithHighDropOff: this.countHighDropOffCourses(latestEntries)
      };
    }

    return {
      title: reportTitles[reportType] || `${reportType} Report`,
      keyMetrics: enhancedMetrics,
      generatedAt: new Date().toISOString(),
      dataSources: latestEntries.map(e => e.service),
      period: 'Current Period'
    };
  }

  calculateAverageCourseDuration(latestEntries) {
    const courseBuilder = latestEntries.find(e => e.service === 'courseBuilder');
    if (!courseBuilder) return 0;
    
    const courses = courseBuilder.data?.data?.details?.courses || courseBuilder.data?.details?.courses || [];
    if (courses.length === 0) return 0;
    
    const totalDuration = courses.reduce((sum, c) => sum + (c.duration || 0), 0);
    return Math.round((totalDuration / courses.length) * 10) / 10;
  }

  calculateCoursesByLevel(latestEntries) {
    const courseBuilder = latestEntries.find(e => e.service === 'courseBuilder');
    if (!courseBuilder) return {};
    
    const courses = courseBuilder.data?.data?.details?.courses || courseBuilder.data?.details?.courses || [];
    const byLevel = {};
    
    courses.forEach(course => {
      const level = course.level || 'Unknown';
      byLevel[level] = (byLevel[level] || 0) + 1;
    });
    
    return byLevel;
  }

  getTopPerformingCoursesCount(latestEntries) {
    const courseBuilder = latestEntries.find(e => e.service === 'courseBuilder');
    if (!courseBuilder) return 0;
    
    const courses = courseBuilder.data?.data?.details?.courses || courseBuilder.data?.details?.courses || [];
    return courses.filter(c => (c.completionRate || 0) >= 85 && (c.averageRating || 0) >= 4.0).length;
  }

  countContentTypes(latestEntries) {
    const contentStudio = latestEntries.find(e => e.service === 'contentStudio');
    if (!contentStudio) return 0;
    
    const contentItems = contentStudio.data?.data?.details?.contentItems || contentStudio.data?.details?.contentItems || [];
    const types = new Set(contentItems.map(c => c.content_type).filter(Boolean));
    return types.size;
  }

  countContentCreators(latestEntries) {
    const contentStudio = latestEntries.find(e => e.service === 'contentStudio');
    if (!contentStudio) return 0;
    
    const contentItems = contentStudio.data?.data?.details?.contentItems || contentStudio.data?.details?.contentItems || [];
    const creators = new Set(contentItems.map(c => c.trainer_id).filter(Boolean));
    return creators.size;
  }

  countDepartments(latestEntries) {
    const directory = latestEntries.find(e => e.service === 'directory');
    if (!directory) return 0;
    
    const metrics = directory.data?.data?.metrics || directory.data?.metrics || {};
    const departments = metrics.usersByDepartment || {};
    return Object.keys(departments).length;
  }

  calculateDepartmentEngagement(latestEntries) {
    const directory = latestEntries.find(e => e.service === 'directory');
    if (!directory) return 0;
    
    const metrics = directory.data?.data?.metrics || directory.data?.metrics || {};
    const activeUsers = metrics.activeUsers || 0;
    const totalUsers = metrics.totalUsers || 1;
    
    return Math.round((activeUsers / totalUsers) * 100 * 10) / 10;
  }

  countHighDropOffCourses(latestEntries) {
    const courseBuilder = latestEntries.find(e => e.service === 'courseBuilder');
    if (!courseBuilder) return 0;
    
    const courses = courseBuilder.data?.data?.details?.courses || courseBuilder.data?.details?.courses || [];
    return courses.filter(c => {
      const total = c.totalEnrollments || 0;
      const active = c.activeEnrollments || 0;
      const dropOffRate = total > 0 ? ((total - active) / total) * 100 : 0;
      return dropOffRate > 30; // High drop-off if more than 30%
    }).length;
  }

  // Charts are now retrieved from getRelevantCharts method

  generateDataTable(aggregated, reportType) {
    const rows = [];
    
    // Handle different data types
    for (const [key, value] of Object.entries(aggregated)) {
      // Skip null/undefined values
      if (value === null || value === undefined) continue;
      
      // Handle objects (like coursesByLevel, usersByDepartment, etc.)
      if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        // For objects, create a row for the key and then sub-rows for each property
        rows.push([key, '']);
        for (const [subKey, subValue] of Object.entries(value)) {
          rows.push([`  ${subKey}`, typeof subValue === 'number' ? subValue.toLocaleString() : subValue]);
        }
      } else if (Array.isArray(value)) {
        // For arrays, show count
        rows.push([key, value.length]);
      } else {
        // For simple values
        const formattedValue = typeof value === 'number' 
          ? (value % 1 === 0 ? value.toLocaleString() : value.toFixed(2))
          : value;
        rows.push([key, formattedValue]);
      }
    }
    
    return {
      headers: ['Metric', 'Value'],
      rows: rows
    };
  }
}


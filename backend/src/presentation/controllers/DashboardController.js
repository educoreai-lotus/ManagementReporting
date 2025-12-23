import { GetDashboardUseCase } from '../../application/useCases/GetDashboardUseCase.js';
import { GetCombinedAnalyticsUseCase } from '../../application/useCases/GetCombinedAnalyticsUseCase.js';
import { getCacheRepository } from '../../infrastructure/repositories/CacheRepositorySingleton.js';
import { triggerManualCollection } from '../../infrastructure/jobs/DailyCollectionJob.js';

export class DashboardController {
  constructor() {
    this.cacheRepository = getCacheRepository();
    this.getDashboardUseCase = new GetDashboardUseCase(this.cacheRepository);
    this.getCombinedAnalyticsUseCase = new GetCombinedAnalyticsUseCase(this.cacheRepository);
  }

  /**
   * Get all charts (both priority and non-priority)
   * Used for transcription purposes - ensures all charts are sent to OpenAI
   */
  async getAllCharts(req, res, next) {
    try {
      const dashboardData = await this.getDashboardUseCase.execute();
      const combinedAnalytics = await this.getCombinedAnalyticsUseCase.execute();
      
      // Merge regular charts with combined analytics charts
      const allCharts = [
        ...dashboardData.charts,
        ...combinedAnalytics.charts
      ];

      res.json({
        charts: allCharts,
        lastUpdated: dashboardData.lastUpdated
      });
    } catch (error) {
      console.error('GetAllCharts error:', error);
      next(error);
    }
  }

  async getDashboard(req, res, next) {
    try {
      const dashboardData = await this.getDashboardUseCase.execute();
      const combinedAnalytics = await this.getCombinedAnalyticsUseCase.execute();
      
      // Merge regular charts with combined analytics charts
      const allCharts = [
        ...dashboardData.charts,
        ...combinedAnalytics.charts
      ];

      // Filter only priority charts for main dashboard
      // This includes: main service charts + combined charts marked as priority
      const priorityCharts = allCharts.filter(chart => {
        // Include charts explicitly marked as priority (includes combined charts)
        if (chart.metadata?.isPriority === true) {
          return true;
        }
        // Exclude charts explicitly marked as non-priority
        if (chart.metadata?.isPriority === false) {
          return false;
        }
        // Exclude detailed charts (have chartType)
        if (chart.metadata?.chartType) {
          return false;
        }
        // Exclude Content Studio (goes to BOX)
        if (chart.metadata?.service === 'contentStudio') {
          return false;
        }
        // Include main service charts for priority services (directory, courseBuilder, assessment)
        const priorityServices = ['directory', 'courseBuilder', 'assessment'];
        if (priorityServices.includes(chart.metadata?.service)) {
          return true;
        }
        // Include combined charts that are priority (even אם לא סומנו מפורשות)
        // אלו הגרפים המשולבים שמופיעים בדשבורד הראשי (ללא completion-rate per org)
        const priorityCombinedChartIds = [
          'combined-enrollments-comparison',
          'combined-users-per-organization',
          'combined-top-courses'
        ];
        if (priorityCombinedChartIds.includes(chart.id)) {
          return true;
        }
        return false;
      });

      // If no data available, try to load it automatically (for MVP - both dev and production)
      if (priorityCharts.length === 0) {
        console.log('No dashboard data found, auto-loading mock data...');
        try {
          const token = req.headers.authorization?.substring(7) || process.env.MICROSERVICE_JWT_TOKEN || 'test-token-for-local-development';
          await triggerManualCollection(token);
          
          // Retry fetching dashboard after loading data
          const retryDashboardData = await this.getDashboardUseCase.execute();
          const retryCombinedAnalytics = await this.getCombinedAnalyticsUseCase.execute();
          
          const retryAllCharts = [
            ...retryDashboardData.charts,
            ...retryCombinedAnalytics.charts
          ];
          
          // Filter only priority charts (same logic as above)
          const priorityCombinedChartIds = [
            'combined-enrollments-comparison',
            'combined-users-per-organization',
            'combined-top-courses'
          ];
          const retryPriorityCharts = retryAllCharts.filter(chart => {
            if (chart.metadata?.isPriority === true) return true;
            if (chart.metadata?.isPriority === false) return false;
            if (chart.metadata?.chartType) return false;
            if (chart.metadata?.service === 'contentStudio') return false;
            if (chart.metadata?.service === 'learningAnalytics') return false; // Learning Analytics chart removed
            const priorityServices = ['directory', 'courseBuilder', 'assessment'];
            if (priorityServices.includes(chart.metadata?.service)) return true;
            if (priorityCombinedChartIds.includes(chart.id)) return true;
            return false;
          });
          
          if (retryPriorityCharts.length > 0) {
            return res.json({
              charts: retryPriorityCharts,
              lastUpdated: retryDashboardData.lastUpdated
            });
          }
        } catch (autoLoadError) {
          console.error('Auto-load error:', autoLoadError);
          // Continue with empty charts
        }
      }

      res.json({
        charts: priorityCharts,
        lastUpdated: dashboardData.lastUpdated
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      // Return default structure on error
      res.json({
        charts: this.getDefaultCharts(),
        lastUpdated: null
      });
    }
  }

  async refreshData(req, res, next) {
    try {
      const token = req.headers.authorization?.substring(7);
      const services = Array.isArray(req.body?.services) ? req.body.services : null;
      const results = await triggerManualCollection(token, services);
      
      // Refetch dashboard after refresh - use the same logic as getDashboard
      const dashboardData = await this.getDashboardUseCase.execute();
      const combinedAnalytics = await this.getCombinedAnalyticsUseCase.execute();
      
      // Merge regular charts with combined analytics charts
      const allCharts = [
        ...dashboardData.charts,
        ...combinedAnalytics.charts
      ];

      // Filter only priority charts for main dashboard (same as getDashboard)
      // This includes: main service charts + combined charts marked as priority
      const priorityCharts = allCharts.filter(chart => {
        // Include charts explicitly marked as priority (includes combined charts)
        if (chart.metadata?.isPriority === true) {
          return true;
        }
        // Exclude charts explicitly marked as non-priority
        if (chart.metadata?.isPriority === false) {
          return false;
        }
        // Exclude detailed charts (have chartType)
        if (chart.metadata?.chartType) {
          return false;
        }
        // Exclude Content Studio (goes to BOX)
        if (chart.metadata?.service === 'contentStudio') {
          return false;
        }
        // Include main service charts for priority services (directory, courseBuilder, assessment)
        const priorityServices = ['directory', 'courseBuilder', 'assessment'];
        if (priorityServices.includes(chart.metadata?.service)) {
          return true;
        }
        // Include combined charts that are priority (even אם לא סומנו מפורשות)
        // אלו הגרפים המשולבים שמופיעים בדשבורד הראשי (ללא completion-rate per org)
        const priorityCombinedChartIds = [
          'combined-enrollments-comparison',
          'combined-users-per-organization',
          'combined-top-courses'
        ];
        if (priorityCombinedChartIds.includes(chart.id)) {
          return true;
        }
        return false;
      });

      const failedMap = (results.failed || []).reduce((acc, item) => {
        acc[item.service] = item.lastSuccessful || null;
        return acc;
      }, {});

      // Update all priority charts with refresh status
      const chartsWithStatus = priorityCharts.map((chart) => {
        // For combined charts, check all services
        const services = chart.metadata?.services || 
                        (chart.metadata?.service ? [chart.metadata.service] : []);
        
        // Find the most recent lastSuccessful from all services
        let lastSuccessful = null;
        let isStale = false;
        
        for (const svc of services) {
          const svcLastSuccessful = failedMap[svc];
          if (svcLastSuccessful) {
            isStale = true;
            if (!lastSuccessful || new Date(svcLastSuccessful) > new Date(lastSuccessful)) {
              lastSuccessful = svcLastSuccessful;
            }
          }
        }
        
        // If no failed services, use the chart's existing lastUpdated or current time
        if (!isStale && !chart.metadata?.lastUpdated) {
          lastSuccessful = new Date().toISOString();
        }
        
        const metadata = {
          ...chart.metadata,
          lastUpdated: chart.metadata?.lastUpdated || lastSuccessful || new Date().toISOString(),
          isStale: isStale
        };

        return {
          ...chart,
          metadata
        };
      });

      res.json({
        charts: chartsWithStatus,
        lastUpdated: dashboardData.lastUpdated,
        refreshStatus: {
          status: results.allFailed ? 'failed' : results.partial ? 'partial' : 'success',
          successful: results.successful,
          failed: results.failed,
          partial: results.partial,
          allFailed: results.allFailed || false,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getChart(req, res, next) {
    try {
      const { chartId } = req.params;
      const dashboardData = await this.getDashboardUseCase.execute();
      const combinedAnalytics = await this.getCombinedAnalyticsUseCase.execute();
      
      // Search in both regular charts and combined analytics charts
      const allCharts = [
        ...dashboardData.charts,
        ...combinedAnalytics.charts
      ];
      
      const chart = allCharts.find((c) => c.id === chartId);

      if (!chart) {
        return res.status(404).json({ error: 'Chart not found' });
      }

      res.json(chart);
    } catch (error) {
      next(error);
    }
  }

  async refreshChart(req, res, next) {
    try {
      const { chartId } = req.params;
      const token = req.headers.authorization?.substring(7);
      
      // Get chart to find its service
      const dashboardData = await this.getDashboardUseCase.execute();
      const combinedAnalytics = await this.getCombinedAnalyticsUseCase.execute();
      
      const allCharts = [
        ...dashboardData.charts,
        ...combinedAnalytics.charts
      ];
      
      const chart = allCharts.find((c) => c.id === chartId);

      if (!chart) {
        return res.status(404).json({ error: 'Chart not found' });
      }

      // Get services for this chart
      const services = chart.metadata?.services || 
                      (chart.metadata?.service ? [chart.metadata.service] : null);

      if (!services || services.length === 0) {
        return res.status(400).json({ error: 'Chart does not have associated services' });
      }

      // Refresh data for the chart's services
      const results = await triggerManualCollection(token, services);

      // Refetch the chart after refresh
      const refreshedDashboardData = await this.getDashboardUseCase.execute();
      const refreshedCombinedAnalytics = await this.getCombinedAnalyticsUseCase.execute();
      
      const refreshedAllCharts = [
        ...refreshedDashboardData.charts,
        ...refreshedCombinedAnalytics.charts
      ];
      
      const refreshedChart = refreshedAllCharts.find((c) => c.id === chartId);

      if (!refreshedChart) {
        return res.status(404).json({ error: 'Chart not found after refresh' });
      }

      // Update metadata with refresh status
      const failedMap = (results.failed || []).reduce((acc, item) => {
        acc[item.service] = item.lastSuccessful || null;
        return acc;
      }, {});

      const isStale = services.some(service => failedMap[service]);
      const lastSuccessful = services
        .map(service => failedMap[service])
        .filter(Boolean)[0] || refreshedChart.metadata?.lastUpdated;

      refreshedChart.metadata = {
        ...refreshedChart.metadata,
        lastUpdated: refreshedChart.metadata?.lastUpdated || lastSuccessful || null,
        isStale: isStale
      };

      res.json({
        chart: refreshedChart,
        refreshStatus: {
          status: results.allFailed ? 'failed' : results.partial ? 'partial' : 'success',
          successful: results.successful,
          failed: results.failed,
          partial: results.partial,
          allFailed: results.allFailed || false,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async downloadChartPDF(req, res, next) {
    try {
      const { chartId } = req.params;
      const userId = req.user?.userId || req.user?.sub || 'mvp-user';
      const chartImage = req.body?.chartImage || null; // Base64 image from frontend

      console.log(`[PDF] Starting PDF generation for chart: ${chartId}`);
      console.log(`[PDF] Chart image provided: ${chartImage ? 'Yes' : 'No'}`);

      // Get chart data
      let dashboardData, combinedAnalytics;
      try {
        dashboardData = await this.getDashboardUseCase.execute();
        combinedAnalytics = await this.getCombinedAnalyticsUseCase.execute();
      } catch (dataError) {
        console.error('[PDF] Error fetching chart data:', dataError);
        return res.status(500).json({ 
          error: 'Failed to fetch chart data',
          message: dataError.message
        });
      }
      
      const allCharts = [
        ...(dashboardData?.charts || []),
        ...(combinedAnalytics?.charts || [])
      ];
      
      const chart = allCharts.find((c) => c.id === chartId);

      if (!chart) {
        console.error(`[PDF] Chart not found: ${chartId}`);
        return res.status(404).json({ error: 'Chart not found' });
      }

      console.log(`[PDF] Chart found: ${chart.title}`);

      // Import PDF generator with error handling - Use PDFKit instead of Puppeteer
      let PDFKitGenerator;
      try {
        const pdfModule = await import('../../infrastructure/generators/PDFKitGenerator.js');
        PDFKitGenerator = pdfModule.PDFKitGenerator;
      } catch (importError) {
        console.error('[PDF] Failed to import PDF generator:', importError);
        return res.status(500).json({ 
          error: 'PDF generator not available',
          message: importError.message
        });
      }

      const pdfGenerator = new PDFKitGenerator();

      console.log(`[PDF] Generating PDF with PDFKit...`);
      
      // Generate PDF with timeout and chart image
      let pdf;
      try {
        const pdfPromise = pdfGenerator.generateChartPDF(chart, chartImage);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('PDF generation timeout (30s)')), 30000)
        );
        
        pdf = await Promise.race([pdfPromise, timeoutPromise]);
      } catch (pdfError) {
        console.error('[PDF] PDF generation failed:', pdfError);
        console.error('[PDF] Error details:', {
          message: pdfError.message,
          stack: pdfError.stack,
          name: pdfError.name
        });
        throw pdfError;
      }

      if (!pdf || pdf.length === 0) {
        console.error('[PDF] Generated PDF is empty');
        return res.status(500).json({ error: 'PDF generation failed: empty PDF' });
      }

      console.log(`[PDF] PDF generated successfully, size: ${pdf.length} bytes`);

      // Log PDF generation
      try {
        const { auditLogger } = await import('../../infrastructure/services/AuditLogger.js');
        auditLogger.logReportGeneration(userId, `chart-${chartId}`, 'success', {
          chartTitle: chart.title,
          pdfSize: pdf.length
        });
      } catch (logError) {
        console.warn('[PDF] Failed to log PDF generation:', logError.message);
      }

      // Send PDF as response
      const safeTitle = chart.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}-chart.pdf"`);
      res.setHeader('Content-Length', pdf.length);
      res.send(pdf);
    } catch (error) {
      console.error('[PDF] Chart PDF generation error:', error);
      console.error('[PDF] Error stack:', error.stack);
      console.error('[PDF] Error name:', error.name);
      console.error('[PDF] Error message:', error.message);
      
      // Send error response
      res.status(500).json({ 
        error: 'Failed to generate PDF',
        message: error.message || 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? {
          stack: error.stack,
          name: error.name
        } : undefined
      });
    }
  }

  async getCourses(req, res, next) {
    try {
      const courseBuilderData = await this.cacheRepository.getLatestByService('courseBuilder');
      
      if (!courseBuilderData) {
        return res.json({ courses: [] });
      }

      // Extract courses from nested structure
      const courses = courseBuilderData?.data?.data?.details?.courses || 
                      courseBuilderData?.data?.details?.courses || 
                      [];

      // Format courses for frontend
      const formattedCourses = courses.map(course => ({
        id: course.course_id,
        name: course.course_name,
        description: course.course_description || '',
        topic: course.topic || '',
        duration: course.duration || 0,
        totalEnrollments: course.totalEnrollments || 0,
        activeEnrollments: course.activeEnrollments || 0,
        completionRate: course.completionRate || 0,
        averageRating: course.averageRating || 0
      }));

      res.json({ courses: formattedCourses });
    } catch (error) {
      next(error);
    }
  }

  async getFilteredChart(req, res, next) {
    try {
      const { chartId } = req.params;
      const { courseIds } = req.body; // Array of course IDs to filter by

      if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
        // If no filter, return original chart
        return this.getChart(req, res, next);
      }

      // Get original chart
      const dashboardData = await this.getDashboardUseCase.execute();
      const combinedAnalytics = await this.getCombinedAnalyticsUseCase.execute();
      
      const allCharts = [
        ...dashboardData.charts,
        ...combinedAnalytics.charts
      ];
      
      const chart = allCharts.find((c) => c.id === chartId);

      if (!chart) {
        return res.status(404).json({ error: 'Chart not found' });
      }

      // Check if this chart contains course data
      const isCourseChart = chart.metadata?.services?.includes('courseBuilder') || 
                           chart.metadata?.service === 'courseBuilder' ||
                           chart.metadata?.services?.includes('assessment') ||
                           chart.metadata?.service === 'assessment' ||
                           chart.id?.includes('course') ||
                           chart.id?.includes('enrollments') ||
                           chart.id?.includes('top-courses') ||
                           chart.id?.includes('rating-vs-engagement') ||
                           chart.id?.includes('dropoff');

      if (!isCourseChart) {
        // Not a course chart, return original
        return res.json(chart);
      }

      // Get course data from cache
      const courseBuilderData = await this.cacheRepository.getLatestByService('courseBuilder');
      const assessmentData = await this.cacheRepository.getLatestByService('assessment');
      
      // Helper function to get courses from nested structure
      const getCourses = (data) => {
        if (data?.data?.data?.details?.courses) return data.data.data.details.courses;
        if (data?.data?.details?.courses) return data.data.details.courses;
        if (data?.details?.courses) return data.details.courses;
        return [];
      };
      
      // Helper function to get assessments from nested structure
      const getAssessments = (data) => {
        if (data?.data?.data?.details?.assessments) return data.data.data.details.assessments;
        if (data?.data?.details?.assessments) return data.data.details.assessments;
        if (data?.details?.assessments) return data.details.assessments;
        return [];
      };
      
      const courses = getCourses(courseBuilderData);
      const assessments = getAssessments(assessmentData);

      // Filter courses by selected IDs
      const filteredCourses = courses.filter(c => courseIds.includes(c.course_id));
      const filteredAssessments = assessments.filter(a => courseIds.includes(a.course_id));

      // Rebuild chart data based on filtered courses
      let filteredChartData = [];
      
      if (chart.id === 'combined-enrollments-comparison') {
        filteredChartData = filteredCourses
          .sort((a, b) => (b.totalEnrollments || 0) - (a.totalEnrollments || 0))
          .map(course => ({
            name: (course.course_name || 'Course').substring(0, 18),
            'Total Enrollments': course.totalEnrollments || 0,
            'Active Enrollments': course.activeEnrollments || 0
          }));
      } else if (chart.id === 'combined-top-courses') {
        filteredChartData = filteredCourses
          .map(course => {
            const completionRate = course.completionRate || 0;
            const rating = (course.averageRating || 0) * 20;
            const combinedScore = (completionRate * 0.6) + (rating * 0.4);
            
            return {
              name: (course.course_name || 'Course').substring(0, 18),
              'Completion Rate': Math.round(completionRate * 10) / 10,
              'Average Rating': Math.round(rating * 10) / 10,
              'Combined Score': Math.round(combinedScore * 10) / 10
            };
          })
          .sort((a, b) => b['Combined Score'] - a['Combined Score'])
          .slice(0, 10);
      } else if (chart.id === 'combined-rating-vs-engagement') {
        const laData = await this.cacheRepository.getLatestByService('learningAnalytics');
        const laMetrics = laData?.data?.data?.metrics || laData?.data?.metrics || {};
        const platformUsageRate = laMetrics.platformUsageRate || 85;
        const userSatisfactionScore = laMetrics.userSatisfactionScore || 4.0;
        const baseEngagementIndex = (platformUsageRate + (userSatisfactionScore * 20)) / 2;

        filteredChartData = filteredCourses
          .map(course => {
            const rating = (course.averageRating || 0) * 20;
            const engagement = baseEngagementIndex * (rating / 100) * (course.completionRate / 100);
            
            return {
              name: (course.course_name || 'Course').substring(0, 15),
              'Average Rating': Math.round(course.averageRating * 10) / 10,
              'Engagement Index': Math.round(engagement * 10) / 10
            };
          })
          .sort((a, b) => b['Average Rating'] - a['Average Rating']);
      } else if (chart.id === 'combined-dropoff-by-duration' || chart.id === 'combined-dropoff') {
        filteredChartData = filteredCourses
          .map(course => ({
            name: `${course.duration || 0}h`,
            'Drop-off Rate': Math.round((100 - (course.completionRate || 0)) * 10) / 10
          }))
          .sort((a, b) => parseFloat(a.name) - parseFloat(b.name));
      } else if (chart.id === 'combined-top-courses') {
        // This is already handled above, but ensure it's correct
        filteredChartData = filteredCourses
          .map(course => {
            const completionRate = course.completionRate || 0;
            const rating = (course.averageRating || 0) * 20;
            const combinedScore = (completionRate * 0.6) + (rating * 0.4);
            
            return {
              name: (course.course_name || 'Course').substring(0, 18),
              'Completion Rate': Math.round(completionRate * 10) / 10,
              'Average Rating': Math.round(rating * 10) / 10,
              'Combined Score': Math.round(combinedScore * 10) / 10
            };
          })
          .sort((a, b) => b['Combined Score'] - a['Combined Score'])
          .slice(0, 10);
      } else if (chart.id === 'combined-completion-rate-per-org') {
        // Recalculate completion rate per organization based on filtered courses
        if (filteredCourses.length === 0) {
          filteredChartData = [];
        } else {
          // Calculate average completion rate for filtered courses
          const avgCompletionForFiltered = filteredCourses.reduce((sum, c) => sum + (c.completionRate || 0), 0) / filteredCourses.length;
          if (avgCompletionForFiltered === 0) {
            filteredChartData = [];
          } else {
            // ✅ Get actual organizations from DB
            const directoryData = await this.cacheRepository.getLatestByService('directory');
            const organizations = directoryData?.data?.data?.details?.organizations || 
                                 directoryData?.data?.details?.organizations || 
                                 directoryData?.details?.organizations || [];
            
            if (!organizations || !Array.isArray(organizations) || organizations.length === 0) {
              filteredChartData = [];
            } else {
            // ✅ Calculate completion rates per org based on actual DB data
            // Note: Since we don't have direct course-org mapping in the cache,
            // we use the filtered average completion rate for all organizations.
            // This ensures all data comes from DB only (no estimated factors).
            const orgCompletionRates = {};
            
            for (const org of organizations.slice(0, 10)) { // Limit to top 10 orgs
              const orgName = org.company_name || org.organization || 'Unknown Organization';
              if (!orgName || orgName === 'Unknown Organization') continue;
              
              // Use filtered average completion rate from DB (no estimated factors)
              orgCompletionRates[orgName] = Math.round(avgCompletionForFiltered * 10) / 10;
            }
              
              filteredChartData = Object.entries(orgCompletionRates)
                .map(([org, rate]) => ({ name: org, value: rate }))
                .sort((a, b) => b.value - a.value)
                .filter(item => item.value > 0);
            }
          }
        }
      } else if (chart.metadata?.service === 'courseBuilder') {
        // Main course builder chart - show key metrics for filtered courses
        const metrics = {
          'Total Courses': filteredCourses.length,
          'Total Enrollments': filteredCourses.reduce((sum, c) => sum + (c.totalEnrollments || 0), 0),
          'Active Enrollments': filteredCourses.reduce((sum, c) => sum + (c.activeEnrollments || 0), 0),
          'Average Completion Rate': filteredCourses.length > 0 
            ? filteredCourses.reduce((sum, c) => sum + (c.completionRate || 0), 0) / filteredCourses.length 
            : 0,
          'Average Rating': filteredCourses.length > 0
            ? filteredCourses.reduce((sum, c) => sum + (c.averageRating || 0), 0) / filteredCourses.length
            : 0
        };
        
        filteredChartData = Object.entries(metrics).map(([key, value]) => ({
          name: key,
          value: typeof value === 'number' ? Math.round(value * 100) / 100 : value
        }));
      } else if (chart.metadata?.service === 'assessment') {
        // Assessment chart - filter by course IDs
        const courseAssessments = filteredAssessments;
        const metrics = {
          'Total Assessments': courseAssessments.length,
          'Average Score': courseAssessments.length > 0
            ? courseAssessments.reduce((sum, a) => sum + (a.final_grade || 0), 0) / courseAssessments.length
            : 0,
          'Pass Rate': courseAssessments.length > 0
            ? (courseAssessments.filter(a => (a.final_grade || 0) >= (a.passing_grade || 70)).length / courseAssessments.length) * 100
            : 0,
          'Completed': courseAssessments.filter(a => a.status === 'completed').length,
          'Passed': courseAssessments.filter(a => (a.final_grade || 0) >= (a.passing_grade || 70)).length
        };
        
        filteredChartData = Object.entries(metrics).map(([key, value]) => ({
          name: key,
          value: typeof value === 'number' ? Math.round(value * 100) / 100 : value
        }));
      }

      // If no filtered data was generated, return original chart with warning
      if (filteredChartData.length === 0 && filteredCourses.length > 0) {
        console.warn(`No filtered data generated for chart ${chartId}. Chart type may not be supported for filtering.`);
        // Return original chart but mark as filtered
        return res.json({
          ...chart,
          metadata: {
            ...chart.metadata,
            filtered: true,
            selectedCourseIds: courseIds,
            courseCount: filteredCourses.length,
            warning: 'Filter applied but chart type does not support filtering'
          }
        });
      }

      // If no courses match the filter, return empty chart
      if (filteredCourses.length === 0) {
        return res.json({
          ...chart,
          data: [],
          metadata: {
            ...chart.metadata,
            filtered: true,
            selectedCourseIds: courseIds,
            courseCount: 0,
            warning: 'No courses match the selected filter'
          }
        });
      }

      // Return filtered chart
      const filteredChart = {
        ...chart,
        data: filteredChartData,
        metadata: {
          ...chart.metadata,
          filtered: true,
          selectedCourseIds: courseIds,
          courseCount: filteredCourses.length
        }
      };

      res.json(filteredChart);
    } catch (error) {
      next(error);
    }
  }

  getDefaultCharts() {
    return [
      { id: '1', title: 'Course Completion Rate', type: 'bar', data: [], description: 'Percentage of enrolled users who completed courses' },
      { id: '2', title: 'Engagement Index', type: 'line', data: [], description: 'Overall user engagement metrics across the platform' },
      { id: '3', title: 'Average Rating', type: 'bar', data: [], description: 'Average course and content ratings from learners' },
      { id: '4', title: 'Total Enrollments', type: 'area', data: [], description: 'Total number of course enrollments' },
      { id: '5', title: 'Active Enrollments', type: 'bar', data: [], description: 'Number of currently active enrollments' },
      { id: '6', title: 'Platform Skill Demand', type: 'pie', data: [], description: 'Analysis of which skills are most in demand' },
      { id: '7', title: 'Drop-off Trends', type: 'line', data: [], description: 'Identification of declining performance patterns' },
      { id: '8', title: 'Learning ROI', type: 'bar', data: [], description: 'Return on investment for learning programs' },
    ];
  }
}

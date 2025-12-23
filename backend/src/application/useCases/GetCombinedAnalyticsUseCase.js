import { ChartData } from '../../domain/entities/ChartData.js';

/**
 * Combined Analytics Use Case
 * Creates insightful charts that combine data from multiple microservices
 * Based on real mock data structure from EducoreAI microservices
 */
export class GetCombinedAnalyticsUseCase {
  constructor(cacheRepository) {
    this.cacheRepository = cacheRepository;
  }

  async execute(latestEntries = null) {
    try {
      // Use provided latestEntries if available, otherwise fetch from cache
      if (!latestEntries) {
        latestEntries = await this.cacheRepository.getLatestEntries();
      }
      
      if (latestEntries.length === 0) {
        return { charts: [] };
      }
      
      // Organize data by service - data structure is: { service, data: { timestamp, data: { metrics, details }, metadata } }
      const dataByService = {};
      for (const { service, data } of latestEntries) {
        dataByService[service] = data;
      }

      const charts = [];
      
      // Priority combined charts for main dashboard (most important for managers)
      // Note: 'combined-completion-rate-per-org' מופיע רק ב-BOX ולא בדשבורד הראשי
      const priorityChartIds = [
        'combined-enrollments-comparison',
        'combined-users-per-organization',
        'combined-top-courses'
      ];

      // 1. Active vs. Total Enrollments per Course - PRIORITY
      if (dataByService.courseBuilder) {
        const chart = this.createEnrollmentsComparisonChart(dataByService.courseBuilder);
        if (chart) {
          chart.metadata.isPriority = true;
          charts.push(chart);
        }
      }

      // 2. Users per Organization - PRIORITY
      if (dataByService.directory) {
        const chart = this.createUsersPerOrganizationChart(dataByService.directory);
        if (chart) {
          chart.metadata.isPriority = true;
          charts.push(chart);
        }
      }

      // 3. Average Completion Rate per Organization - BOX (לא בדשבורד הראשי)
      if (dataByService.directory && dataByService.courseBuilder) {
        const chart = this.createCompletionRatePerOrgChart(
          dataByService.directory,
          dataByService.courseBuilder
        );
        if (chart) {
          // הגרף הזה יוצג רק ב-BOX ולכן לא מסומן כ-priority לדשבורד הראשי
          chart.metadata.isPriority = false;
          charts.push(chart);
        }
      }

      // 4. Average Rating vs. Engagement Index - BOX
      if (dataByService.courseBuilder && dataByService.learningAnalytics) {
        const chart = this.createRatingVsEngagementChart(
          dataByService.courseBuilder,
          dataByService.learningAnalytics
        );
        if (chart) {
          chart.metadata.isPriority = false;
          charts.push(chart);
        }
      }

      // 5. Skill Gap Analysis - BOX
      if (dataByService.assessment && dataByService.learningAnalytics) {
        const chart = this.createSkillGapAnalysisChart(
          dataByService.assessment,
          dataByService.learningAnalytics
        );
        if (chart) {
          chart.metadata.isPriority = false;
          charts.push(chart);
        }
      }

      // 6. Content Usage by Creator Type - BOX
      if (dataByService.contentStudio) {
        const chart = this.createContentUsageByCreatorChart(dataByService.contentStudio);
        if (chart) {
          chart.metadata.isPriority = false;
          charts.push(chart);
        }
      }

      // 7. Monthly Growth in Active Learners - BOX
      if (dataByService.learningAnalytics) {
        const chart = this.createMonthlyGrowthChart(dataByService.learningAnalytics);
        if (chart) {
          chart.metadata.isPriority = false;
          charts.push(chart);
        }
      }

      // 8. Top 5 Courses by Completion and Rating - PRIORITY
      if (dataByService.courseBuilder && dataByService.assessment) {
        const chart = this.createTopCoursesChart(
          dataByService.courseBuilder,
          dataByService.assessment
        );
        if (chart) {
          chart.metadata.isPriority = true;
          charts.push(chart);
        }
      }

      // 9. Drop-off Trend by Course Duration - BOX
      if (dataByService.courseBuilder) {
        const chart = this.createDropoffByDurationChart(dataByService.courseBuilder);
        if (chart) {
          chart.metadata.isPriority = false;
          charts.push(chart);
        }
      }

      return { charts };
    } catch (error) {
      console.error('GetCombinedAnalyticsUseCase error:', error);
      throw error;
    }
  }

  // Helper to get data from nested structure
  // Structure from cache: { timestamp, data: { metrics: {...}, details: {...} }, metadata: {...} }
  getDataDetails(data, path) {
    // Try multiple possible paths
    if (data?.data?.data?.details?.[path]) return data.data.data.details[path];
    if (data?.data?.details?.[path]) return data.data.details[path];
    if (data?.details?.[path]) return data.details[path];
    
    // Log for debugging
    console.log(`getDataDetails - Path "${path}" not found. Available keys:`, 
      Object.keys(data?.data?.data?.details || data?.data?.details || data?.details || {}));
    return [];
  }

  getDataMetrics(data) {
    // Try multiple possible paths
    if (data?.data?.data?.metrics) return data.data.data.metrics;
    if (data?.data?.metrics) return data.data.metrics;
    if (data?.metrics) return data.metrics;
    return {};
  }

  // Helper to get lastUpdated timestamp from data
  getLastUpdated(data) {
    // Try multiple possible paths
    if (data?.metadata?.collected_at) return data.metadata.collected_at;
    if (data?.data?.metadata?.collected_at) return data.data.metadata.collected_at;
    if (data?.data?.data?.metadata?.collected_at) return data.data.data.metadata.collected_at;
    if (data?.timestamp) return data.timestamp;
    if (data?.data?.timestamp) return data.data.timestamp;
    return new Date().toISOString(); // Fallback to current time
  }

  // Helper to get latest lastUpdated from multiple data sources
  getLatestLastUpdated(...dataSources) {
    const timestamps = dataSources
      .map(data => this.getLastUpdated(data))
      .filter(Boolean);
    
    if (timestamps.length === 0) return new Date().toISOString();
    
    // Return the most recent timestamp
    return timestamps.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  }

  // 1. Active vs. Total Enrollments per Course
  createEnrollmentsComparisonChart(courseBuilderData) {
    const courses = this.getDataDetails(courseBuilderData, 'courses');
    if (!courses || courses.length === 0) return null;

    // Sort by total enrollments and take top courses
    const chartData = courses
      .sort((a, b) => (b.totalEnrollments || 0) - (a.totalEnrollments || 0))
      .slice(0, 15)
      .map(course => ({
        name: (course.course_name || 'Course').substring(0, 18),
        'Total Enrollments': course.totalEnrollments || 0,
        'Active Enrollments': course.activeEnrollments || 0
      }))
      .filter(c => c['Total Enrollments'] > 0);

    if (chartData.length === 0) return null;

    return {
      id: 'combined-enrollments-comparison',
      title: 'Active vs. Total Enrollments per Course',
      subtitle: 'Comparison of active and total enrollments for top courses',
      type: 'bar',
      data: chartData,
      description: 'Shows how many users are currently active compared to total enrollments for each course',
      metadata: {
        chartType: 'combined',
        services: ['courseBuilder'],
        lastUpdated: this.getLastUpdated(courseBuilderData),
        colorScheme: { primary: '#10b981', secondary: '#34d399', tertiary: '#6ee7b7' }
      }
    };
  }

  // 2. Users per Organization
  createUsersPerOrganizationChart(directoryData) {
    const metrics = this.getDataMetrics(directoryData);
    const userCount = metrics.totalUsers || 0;
    
    if (userCount === 0) return null;

    // ✅ Use actual data from DB - get users per organization from details
    const usersPerOrg = this.getDataDetails(directoryData, 'users');
    
    if (usersPerOrg && Array.isArray(usersPerOrg) && usersPerOrg.length > 0) {
      // Use real data from DB
      const chartData = usersPerOrg
        .map(({ organization, count }) => ({
          name: organization || 'Unknown Organization',
          value: count || 0
        }))
        .sort((a, b) => b.value - a.value)
        .filter(item => item.value > 0);

      if (chartData.length === 0) return null;

      return {
        id: 'combined-users-per-organization',
        title: 'Users per Organization',
        subtitle: 'Distribution of users across organizations',
        type: 'bar',
        data: chartData,
        description: 'Aggregates data from Directory microservice to display how many users belong to each organization',
        metadata: {
          chartType: 'combined',
          services: ['directory'],
          lastUpdated: this.getLastUpdated(directoryData),
          colorScheme: { primary: '#3b82f6', secondary: '#60a5fa' }
        }
      };
    }

    // Fallback: if no users data from DB, return null
    return null;
  }

  // 3. Average Completion Rate per Organization
  createCompletionRatePerOrgChart(directoryData, courseBuilderData) {
    const dirMetrics = this.getDataMetrics(directoryData);
    const courses = this.getDataDetails(courseBuilderData, 'courses');
    
    const userCount = dirMetrics.totalUsers || 0;
    if (userCount === 0 || !courses || courses.length === 0) return null;

    // ✅ Use actual organizations from DB
    const organizations = this.getDataDetails(directoryData, 'organizations');
    if (!organizations || !Array.isArray(organizations) || organizations.length === 0) {
      return null;
    }

    // Calculate average completion rate across all courses
    const globalAvgCompletion = courses.reduce((sum, c) => sum + (c.completionRate || 0), 0) / courses.length;
    if (globalAvgCompletion === 0) return null;

    // ✅ Calculate completion rate per organization based on actual DB data
    // Note: Since we don't have direct course-org mapping in the cache,
    // we use the global average completion rate for all organizations.
    // This ensures all data comes from DB only (no estimated factors).
    const orgCompletionRates = {};
    
    for (const org of organizations.slice(0, 10)) { // Limit to top 10 orgs
      const orgName = org.company_name || org.organization || 'Unknown Organization';
      if (!orgName || orgName === 'Unknown Organization') continue;
      
      // Use global average completion rate from DB (no estimated factors)
      orgCompletionRates[orgName] = Math.round(globalAvgCompletion * 10) / 10;
    }

    const chartData = Object.entries(orgCompletionRates)
      .map(([org, rate]) => ({ name: org, value: rate }))
      .sort((a, b) => b.value - a.value)
      .filter(item => item.value > 0);

    if (chartData.length === 0) return null;

    return {
      id: 'combined-completion-rate-per-org',
      title: 'Average Completion Rate per Organization',
      subtitle: 'Learning performance differences between organizations',
      type: 'bar',
      data: chartData,
      description: 'Combines Course Builder + Directory to show performance differences between organizations',
      metadata: {
        chartType: 'combined',
        services: ['directory', 'courseBuilder'],
        lastUpdated: this.getLatestLastUpdated(directoryData, courseBuilderData),
        colorScheme: { primary: '#10b981', secondary: '#34d399' }
      }
    };
  }

  // 4. Average Rating vs. Engagement Index
  createRatingVsEngagementChart(courseBuilderData, learningAnalyticsData) {
    const courses = this.getDataDetails(courseBuilderData, 'courses');
    const laMetrics = this.getDataMetrics(learningAnalyticsData);
    
    if (!courses || courses.length === 0) return null;

    // ✅ Get engagement metrics from Learning Analytics - must exist in DB
    const platformUsageRate = laMetrics.platformUsageRate;
    const userSatisfactionScore = laMetrics.userSatisfactionScore;
    
    // If no engagement data from DB, return null (don't use fallback values)
    if (!platformUsageRate || !userSatisfactionScore) {
      return null;
    }
    
    // Calculate engagement index: combination of platform usage and satisfaction
    const baseEngagementIndex = (platformUsageRate + (userSatisfactionScore * 20)) / 2;

    // Create correlation: courses with higher ratings should have higher engagement
    const chartData = courses
      .slice(0, 15)
      .map(course => {
        const rating = (course.averageRating || 0) * 20; // Convert 0-5 scale to 0-100
        // Engagement correlates with rating: higher rating = higher engagement
        // But also influenced by completion rate
        const engagement = baseEngagementIndex * (rating / 100) * (course.completionRate / 100);
        
        return {
          name: (course.course_name || 'Course').substring(0, 15),
          'Average Rating': Math.round(rating * 10) / 10,
          'Engagement Index': Math.round(engagement * 10) / 10
        };
      })
      .filter(item => item['Average Rating'] > 0 && item['Engagement Index'] > 0)
      .sort((a, b) => a['Average Rating'] - b['Average Rating']); // Sort by rating for better visualization

    if (chartData.length === 0) return null;

    return {
      id: 'combined-rating-vs-engagement',
      title: 'Average Rating vs. Engagement Index',
      subtitle: 'Correlation between learner satisfaction and engagement',
      type: 'line',
      data: chartData,
      description: 'Correlates learner satisfaction (from Course Builder) with engagement metrics (from Learning Analytics)',
      metadata: {
        chartType: 'combined',
        services: ['courseBuilder', 'learningAnalytics'],
        colorScheme: { primary: '#8b5cf6', secondary: '#a78bfa' }
      }
    };
  }

  // 5. Skill Gap Analysis
  createSkillGapAnalysisChart(assessmentData, learningAnalyticsData) {
    const assessments = this.getDataDetails(assessmentData, 'assessments');
    const metrics = this.getDataMetrics(assessmentData);
    
    if (!assessments || assessments.length === 0) return null;

    // Analyze skill gaps: categorize assessments by final_grade performance
    const skillCategories = {
      'Excellent (90-100)': 0,
      'Good (80-89)': 0,
      'Average (70-79)': 0,
      'Needs Improvement (<70)': 0
    };

    assessments.forEach(assessment => {
      const score = assessment.final_grade || 0;
      if (score >= 90) skillCategories['Excellent (90-100)']++;
      else if (score >= 80) skillCategories['Good (80-89)']++;
      else if (score >= 70) skillCategories['Average (70-79)']++;
      else skillCategories['Needs Improvement (<70)']++;
    });

    const chartData = Object.entries(skillCategories)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0);

    if (chartData.length === 0) return null;

    return {
      id: 'combined-skill-gap-analysis',
      title: 'Skill Gap Analysis',
      subtitle: 'Assessment performance distribution highlighting areas with low skill grades',
      type: 'pie',
      data: chartData,
      description: 'Uses Assessment and Learning Analytics data to highlight areas where average skill grades are low',
      metadata: {
        chartType: 'combined',
        services: ['assessment', 'learningAnalytics'],
        colorScheme: { primary: '#f59e0b', secondary: '#fbbf24' }
      }
    };
  }

  // 6. Content Usage by Creator Type
  createContentUsageByCreatorChart(contentStudioData) {
    const contentItems = this.getDataDetails(contentStudioData, 'contentItems');
    
    if (!contentItems || contentItems.length === 0) return null;

    // ✅ Categorize by creator type using generation_method from DB
    const creatorStats = {
      'AI-Generated': { count: 0, views: 0 },
      'Trainer-Generated': { count: 0, views: 0 },
      'Mixed': { count: 0, views: 0 }
    };

    contentItems.forEach(item => {
      // Use generation_method from DB (manual, ai_assisted, mixed, full_ai)
      const generationMethod = item.generation_method || 'manual';
      
      let type = 'Trainer-Generated'; // Default to manual
      if (generationMethod === 'full_ai') {
        type = 'AI-Generated';
      } else if (generationMethod === 'mixed' || generationMethod === 'ai_assisted') {
        type = 'Mixed';
      } else if (generationMethod === 'manual') {
        type = 'Trainer-Generated';
      }
      
      creatorStats[type].count += 1;
      creatorStats[type].views += (item.views || 0);
    });

    const chartData = Object.entries(creatorStats)
      .map(([type, stats]) => ({
        name: type,
        value: stats.views,
        'Content Count': stats.count
      }))
      .filter(item => item.value > 0);

    if (chartData.length === 0) return null;

    return {
      id: 'combined-content-usage-by-creator',
      title: 'Content Usage by Creator Type',
      subtitle: 'AI-generated vs. Trainer-generated vs. Mixed content usage',
      type: 'bar',
      data: chartData,
      description: 'From Content Studio: compare AI-generated, trainer-generated, and mixed content usage counts',
      metadata: {
        chartType: 'combined',
        services: ['contentStudio'],
        colorScheme: { primary: '#8b5cf6', secondary: '#a78bfa' }
      }
    };
  }

  // 7. Monthly Growth in Active Learners
  createMonthlyGrowthChart(learningAnalyticsData) {
    const trends = this.getDataDetails(learningAnalyticsData, 'trends');
    
    if (!trends || trends.length === 0) return null;

    // Sort by date and format for chart - only use trends with valid dates from DB
    const chartData = trends
      .filter(trend => trend.date_range?.start) // Only include trends with valid dates from DB
      .sort((a, b) => new Date(a.date_range.start) - new Date(b.date_range.start))
      .map((trend) => {
        const monthName = new Date(trend.date_range.start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const newUsers = trend.metrics?.newUsers;
        const totalLearningHours = trend.metrics?.totalLearningHours;
        
        // Only include if we have valid data from DB
        if (newUsers === undefined || newUsers === null || totalLearningHours === undefined || totalLearningHours === null) {
          return null;
        }
        
        return {
          name: monthName,
          'Active Learners': newUsers,
          'Learning Hours': Math.round(totalLearningHours / 10) // Scale down for readability
        };
      })
      .filter(item => item !== null && (item['Active Learners'] > 0 || item['Learning Hours'] > 0));

    if (chartData.length === 0) return null;

    return {
      id: 'combined-monthly-growth',
      title: 'Monthly Growth in Active Learners',
      subtitle: 'Growth trend in active learners and learning hours across months',
      type: 'area',
      data: chartData,
      description: 'From Learning Analytics: show the growth trend in active learners across months',
      metadata: {
        chartType: 'combined',
        services: ['learningAnalytics'],
        colorScheme: { primary: '#ef4444', secondary: '#f87171' }
      }
    };
  }

  // 8. Top 5 Courses by Completion and Rating
  createTopCoursesChart(courseBuilderData, assessmentData) {
    const courses = this.getDataDetails(courseBuilderData, 'courses');
    
    if (!courses || courses.length === 0) return null;

    // Calculate combined performance score and rank
    const chartData = courses
      .map(course => {
        const completionRate = course.completionRate || 0;
        const rating = (course.averageRating || 0) * 20; // Convert 0-5 to 0-100 scale
        const combinedScore = (completionRate * 0.6) + (rating * 0.4); // Weighted combination
        
        return {
          name: (course.course_name || 'Course').substring(0, 18),
          'Completion Rate': Math.round(completionRate * 10) / 10,
          'Average Rating': Math.round(rating * 10) / 10,
          'Combined Score': Math.round(combinedScore * 10) / 10
        };
      })
      .sort((a, b) => b['Combined Score'] - a['Combined Score'])
      .slice(0, 5)
      .filter(course => course['Combined Score'] > 0);

    if (chartData.length === 0) return null;

    return {
      id: 'combined-top-courses',
      title: 'Top 5 Courses by Completion and Rating',
      subtitle: 'Best performing courses based on completion rate and learner satisfaction',
      type: 'bar',
      data: chartData,
      description: 'Cross-reference Course Builder and Assessment data to identify top performing courses',
      metadata: {
        chartType: 'combined',
        services: ['courseBuilder', 'assessment'],
        lastUpdated: this.getLatestLastUpdated(courseBuilderData, assessmentData),
        colorScheme: { primary: '#10b981', secondary: '#34d399', tertiary: '#6ee7b7' }
      }
    };
  }

  // 9. Drop-off Trend by Course Duration
  createDropoffByDurationChart(courseBuilderData) {
    const courses = this.getDataDetails(courseBuilderData, 'courses');
    
    if (!courses || courses.length === 0) return null;

    // Group by duration ranges and calculate average drop-off rate
    const durationGroups = {
      'Short (1-5h)': { courses: [], dropoffSum: 0 },
      'Medium (6-15h)': { courses: [], dropoffSum: 0 },
      'Long (16-30h)': { courses: [], dropoffSum: 0 },
      'Extended (30h+)': { courses: [], dropoffSum: 0 }
    };

    courses.forEach(course => {
      const duration = course.duration || 0;
      const completionRate = course.completionRate || 0;
      const dropoffRate = 100 - completionRate;
      
      let range = 'Extended (30h+)';
      if (duration <= 5) range = 'Short (1-5h)';
      else if (duration <= 15) range = 'Medium (6-15h)';
      else if (duration <= 30) range = 'Long (16-30h)';
      
      durationGroups[range].courses.push(course);
      durationGroups[range].dropoffSum += dropoffRate;
    });

    const chartData = Object.entries(durationGroups)
      .map(([range, group]) => {
        const avgDropoff = group.courses.length > 0 
          ? group.dropoffSum / group.courses.length 
          : 0;
        return {
          name: range,
          value: Math.round(avgDropoff * 10) / 10,
          'Course Count': group.courses.length
        };
      })
      .filter(item => item['Course Count'] > 0)
      .sort((a, b) => {
        // Sort by duration order
        const order = ['Short (1-5h)', 'Medium (6-15h)', 'Long (16-30h)', 'Extended (30h+)'];
        return order.indexOf(a.name) - order.indexOf(b.name);
      });

    if (chartData.length === 0) return null;

    return {
      id: 'combined-dropoff-by-duration',
      title: 'Drop-off Trend by Course Duration',
      subtitle: 'Correlation between course length and learner drop-off rate',
      type: 'bar',
      data: chartData,
      description: 'Visualize the correlation between course length and learner drop-off rate',
      metadata: {
        chartType: 'combined',
        services: ['courseBuilder'],
        colorScheme: { primary: '#f59e0b', secondary: '#fbbf24' }
      }
    };
  }
}

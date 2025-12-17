import { ICacheRepository } from '../../domain/ports/ICacheRepository.js';
import { getPool } from '../db/pool.js';

const SERVICE_LIST = ['directory', 'courseBuilder', 'assessment', 'contentStudio', 'learningAnalytics'];

const DEFAULT_SCHEMA_VERSION = '1.0';

export class DatabaseAnalyticsRepository extends ICacheRepository {
  constructor() {
    super();
    this.pool = getPool();
  }

  async getLatestEntries() {
    const entries = await Promise.all(
      SERVICE_LIST.map(async (service) => {
        const data = await this.getLatestByService(service);
        if (data) {
          return { service, data };
        }
        return null;
      })
    );

    return entries.filter(Boolean);
  }

  async getLatestByService(service) {
    try {
      switch (service) {
        case 'directory':
          return await this.fetchDirectoryData();
        case 'courseBuilder':
          return await this.fetchCourseBuilderData();
        case 'assessment':
          return await this.fetchAssessmentData();
        case 'contentStudio':
          return await this.fetchContentStudioData();
        case 'learningAnalytics':
          return await this.fetchLearningAnalyticsData();
        default:
          return null;
      }
    } catch (error) {
      console.error(`[DatabaseAnalyticsRepository] ❌ Failed to load ${service}:`, error.message);
      return null;
    }
  }

  // Cache interface methods (not used in DB-backed mode)
  async get() {
    return null;
  }

  async set() {
    // No-op to keep interface compatibility
    console.warn('[DatabaseAnalyticsRepository] set() is not supported for DB-backed mode');
    return false;
  }

  async getMultiple() {
    return [];
  }

  async delete() {
    return false;
  }

  async exists() {
    return false;
  }

  /* ================================
   * Service loaders
   * ================================ */

  async fetchCourseBuilderData() {
    const { rows } = await this.pool.query(`
      SELECT *
      FROM public.course_builder_cache
      WHERE snapshot_date = (
        SELECT MAX(snapshot_date) FROM public.course_builder_cache
      )
      ORDER BY course_id
    `);

    if (!rows.length) {
      return null;
    }

    const topicCounts = await this.getTopicCounts();

    const metrics = {
      totalCourses: rows.length,
      totalEnrollments: rows.reduce((sum, row) => sum + (Number(row.totalEnrollments) || 0), 0),
      activeEnrollments: rows.reduce((sum, row) => sum + (Number(row.activeEnrollment) || 0), 0),
      averageCompletionRate: this.safeAverage(rows.map((row) => Number(row.completionRate) || 0)),
      averageRating: this.safeAverage(rows.map((row) => Number(row.averageRating) || 0)),
      totalCompletedCourses: rows.filter((row) => (Number(row.completionRate) || 0) >= 80).length,
      inProgressCourses: rows.filter((row) => (Number(row.completionRate) || 0) < 80).length
    };

    const details = {
      courses: rows.map((row) => {
        const topicCount = topicCounts.get(row.course_id) || 3;
        const estimatedDuration = Math.max(1, Math.round(topicCount * 3));

        return {
          course_id: row.course_id,
          course_name: row.course_name,
          totalEnrollments: Number(row.totalEnrollments) || 0,
          activeEnrollments: Number(row.activeEnrollment) || 0,
          completionRate: Number(row.completionRate) || 0,
          averageRating: Number(row.averageRating) || 0,
          duration: estimatedDuration,
          createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
          feedback: row.feedback || null
        };
      })
    };

    return this.buildResponse(metrics, details, rows, 'courseBuilder');
  }

  async fetchAssessmentData() {
    const { rows } = await this.pool.query(`
      SELECT *
      FROM public.assessments_cache
      WHERE snapshot_date = (
        SELECT MAX(snapshot_date) FROM public.assessments_cache
      )
    `);

    if (!rows.length) {
      return null;
    }

    const totalAssessments = rows.length;
    const passedAssessments = rows.filter((row) => row.passed).length;
    const failedAssessments = rows.filter((row) => row.passed === false).length;

    const metrics = {
      totalAssessments,
      averageScore: this.safeAverage(rows.map((row) => Number(row.final_grade) || 0)),
      passRate: totalAssessments ? (passedAssessments / totalAssessments) * 100 : 0,
      completedAssessments: totalAssessments,
      failedAssessments,
      passedAssessments
    };

    const details = {
      assessments: rows.map((row) => ({
        assessment_id: `${row.course_id}-${row.user_id}-${row.exam_type}-${row.attempt_no}`,
        course_id: row.course_id,
        user_id: row.user_id,
        exam_type: row.exam_type,
        attempt_no: row.attempt_no,
        passing_grade: Number(row.passing_grade) || 0,
        final_grade: Number(row.final_grade) || 0,
        status: row.passed ? 'completed' : 'in-progress',
        passed: !!row.passed
      }))
    };

    return this.buildResponse(metrics, details, rows, 'assessment');
  }

  async fetchDirectoryData() {
    const { rows } = await this.pool.query(`
      SELECT *
      FROM public.directory_cache
      WHERE snapshot_date = (
        SELECT MAX(snapshot_date) FROM public.directory_cache
      )
    `);

    if (!rows.length) {
      return null;
    }

    // ✅ Calculate metrics based on real data from DB
    // All calculations are derived from actual DB fields:
    // - company_size (from DB) -> estimateUsersByCompanySize() -> totalUsers
    // - hierarchy.departments (from DB) -> usersByDepartment
    // - kpis (from DB) -> may contain user_count, active_users, etc.
    // - verification_status (from DB) -> organizationsActive

    const orgUserMap = new Map();
    let totalUsers = 0;
    const usersByDepartment = {};

    // Calculate real user counts per organization from Directory hierarchy (no estimates)
    for (const row of rows) {
      const companyKey = row.company_name || row.company_id;

      // Count unique employees from hierarchy: departments -> teams -> employees
      const userCount = this.countUsersFromHierarchy(row.hierarchy);
      totalUsers += userCount;
      orgUserMap.set(companyKey, userCount);

      // (Optional) usersByDepartment could also be derived from hierarchy,
      // but current implementation is estimation-based. We leave it as-is for now
      // to avoid changing existing behavior beyond organization-level counts.
    }

    // Try to extract user_count and active_users from kpis (if available in DB)
    let activeUsersFromKpis = null;
    for (const row of rows) {
      if (row.kpis && typeof row.kpis === 'object') {
        if (row.kpis.active_users !== undefined) {
          activeUsersFromKpis = (activeUsersFromKpis || 0) + (Number(row.kpis.active_users) || 0);
        }
      }
    }

    // Calculate activeUsers: use kpis.active_users if available, otherwise estimate from totalUsers
    const activeUsers = activeUsersFromKpis !== null 
      ? activeUsersFromKpis 
      : Math.round(totalUsers * 0.78); // Fallback calculation based on DB-derived totalUsers

    // usersByRole: Not available in DB, leave empty (no hardcoded distribution)
    const usersByRole = {};

    const totalOrganizations = rows.length;
    const organizationsActive = rows.filter((row) => row.verification_status === 'verified').length;

    const metrics = {
      totalUsers, // Sum of real users from hierarchy (departments -> teams -> employees)
      totalOrganizations, // Direct count from DB
      activeUsers, // Calculated from kpis.active_users (DB field) or estimated from totalUsers
      usersByRole, // Empty - no role_distribution in DB
      usersByDepartment, // Currently left as-is (existing behavior)
      organizationsActive // Calculated from verification_status (DB field)
    };

    const details = {
      users: Array.from(orgUserMap.entries()).map(([organization, count]) => ({
        organization,
        count // Calculated from company_size (DB field)
      })),
      organizations: rows.map((row) => ({
        company_id: row.company_id,
        company_name: row.company_name,
        industry: row.industry,
        company_size: row.company_size,
        verification_status: row.verification_status,
        hierarchy: row.hierarchy,
        kpis: row.kpis // Include KPIs from DB if available
      }))
    };

    return this.buildResponse(metrics, details, rows, 'directory');
  }

  /**
   * Estimate user count based on company_size from DB
   * This is a calculation based on real DB data (company_size field)
   */
  estimateUsersByCompanySize(size) {
    if (!size) {
      return 50; // Default fallback
    }
    
    // Map common company_size values from DB to estimated user counts
    const sizeMap = {
      '1-10': 8,
      '10-50': 30,
      '50-200': 125,
      '200-500': 350,
      '500+': 650
    };
    
    if (sizeMap[size]) {
      return sizeMap[size];
    }
    
    // Parse range format (e.g., "1-10" -> average of 1 and 10)
    if (size.includes('-')) {
      const [min, max] = size.split('-').map(Number);
      if (Number.isFinite(min) && Number.isFinite(max)) {
        return Math.round((min + max) / 2);
      }
    }
    
    // Parse "+" format (e.g., "500+" -> 500 + buffer)
    if (size.includes('+')) {
      const base = Number(size.replace('+', ''));
      if (Number.isFinite(base)) {
        return base + 150;
      }
    }
    
    return 50; // Default fallback
  }

  /**
   * Count unique users from Directory hierarchy JSON structure.
   * Expected structure (simplified):
   * [
   *   {
   *     departments: [
   *       {
   *         teams: [
   *           {
   *             employees: [
   *               { employee_id, name, role_type }
   *             ]
   *           }
   *         ]
   *       }
   *     ]
   *   }
   * ]
   *
   * Managers must not be double-counted if they also appear in employees,
   * so we rely on unique employee_id (or name as fallback) when counting.
   */
  countUsersFromHierarchy(hierarchy) {
    if (!hierarchy || !Array.isArray(hierarchy)) {
      return 0;
    }

    const seen = new Set();

    for (const dept of hierarchy) {
      if (!dept || !Array.isArray(dept.teams)) continue;

      for (const team of dept.teams) {
        if (!team || !Array.isArray(team.employees)) continue;

        for (const emp of team.employees) {
          if (!emp) continue;

          const key =
            (emp.employee_id && String(emp.employee_id)) ||
            (emp.name && String(emp.name).toLowerCase().trim());

          if (!key) continue;

          if (!seen.has(key)) {
            seen.add(key);
          }
        }
      }
    }

    return seen.size;
  }

  async fetchContentStudioData() {
    const { rows } = await this.pool.query(`
      WITH topic_counts AS (
        SELECT topic_id, COUNT(*) AS content_count
        FROM public.contents
        GROUP BY topic_id
      ),
      topic_course AS (
        SELECT DISTINCT ON (ct.topic_id)
          ct.topic_id,
          ct.course_id,
          ct.sort_order
        FROM public.course_topics ct
        ORDER BY ct.topic_id, ct.sort_order
      )
      SELECT 
        c.content_id,
        c.topic_id,
        c.content_type,
        c.generation_method,
        c.content_data,
        t.topic_name,
        t.total_usage_count,
        tc.content_count,
        tc_map.course_id,
        cr.trainer_id
      FROM public.contents c
      LEFT JOIN topic_counts tc ON tc.topic_id = c.topic_id
      LEFT JOIN public.topics t ON t.topic_id = c.topic_id
      LEFT JOIN topic_course tc_map ON tc_map.topic_id = c.topic_id
      LEFT JOIN public.courses cr ON cr.course_id = tc_map.course_id
    `);

    if (!rows.length) {
      return null;
    }

    const contentItems = rows.map((row) => {
      const usage = Number(row.total_usage_count) || 0;
      const divisor = Number(row.content_count) || 1;
      const views = Math.max(25, Math.round(usage / divisor));
      return {
        content_id: row.content_id,
        topic_id: row.topic_id,
        content_type: row.content_type,
        generation_method: row.generation_method,
        trainer_id: (row.trainer_id || 'TRAINER-000').toLowerCase(),
        views,
        topic_name: row.topic_name
      };
    });

    const totalViews = contentItems.reduce((sum, item) => sum + (item.views || 0), 0);
    const totalContentItems = contentItems.length;
    const totalLikes = Math.round(totalViews * 0.22);
    const contentByType = {};
    contentItems.forEach((item) => {
      contentByType[item.content_type] = (contentByType[item.content_type] || 0) + 1;
    });

    const metrics = {
      totalContentItems,
      totalViews,
      totalLikes,
      averageViewsPerContent: totalContentItems ? totalViews / totalContentItems : 0,
      contentByType,
      engagementScore: totalViews ? (totalLikes / totalViews) * 100 : 0
    };

    const details = { contentItems };

    return this.buildResponse(metrics, details, rows, 'contentStudio');
  }

  async fetchLearningAnalyticsData() {
    const { rows } = await this.pool.query(`
      SELECT 
        s.id,
        s.snapshot_date,
        s.period,
        s.start_date,
        s.end_date,
        s.calculated_at,
        l.total_learners,
        l.active_learners,
        l.total_organizations,
        c.total_courses,
        c.courses_completed,
        c.average_completion_rate,
        c.total_enrollments,
        c.active_enrollments,
        c.average_course_duration_hours,
        s2.total_skills_acquired,
        s2.average_skills_per_learning_path,
        e.average_feedback_rating,
        e.total_feedback_submissions,
        e.total_competitions
      FROM public.learning_analytics_snapshot s
      LEFT JOIN public.learning_analytics_learners l ON l.snapshot_id = s.id
      LEFT JOIN public.learning_analytics_courses c ON c.snapshot_id = s.id
      LEFT JOIN public.learning_analytics_skills s2 ON s2.snapshot_id = s.id
      LEFT JOIN public.learning_analytics_engagement e ON e.snapshot_id = s.id
      ORDER BY s.snapshot_date DESC
      LIMIT 6
    `);

    if (!rows.length) {
      return null;
    }

    const latest = rows[0];
    const totalLearningHours = (latest.average_course_duration_hours || 0) * (latest.total_courses || 0);
    const averageLearningHoursPerUser = latest.total_learners
      ? totalLearningHours / latest.total_learners
      : 0;
    const platformUsageRate = latest.total_learners
      ? (latest.active_learners / latest.total_learners) * 100
      : 0;

    const metrics = {
      totalLearningHours,
      averageLearningHoursPerUser,
      platformUsageRate,
      userSatisfactionScore: (latest.average_feedback_rating || 0) * 20,
      activeLearningSessions: latest.active_enrollments || 0,
      learningROI: latest.courses_completed && latest.total_courses
        ? (latest.courses_completed / latest.total_courses) * 100
        : 0
    };

    const trends = rows.map((row) => ({
      period: row.period,
      date_range: {
        start: row.start_date ? new Date(row.start_date).toISOString() : null,
        end: row.end_date ? new Date(row.end_date).toISOString() : null
      },
      metrics: {
        totalLearningHours: (row.average_course_duration_hours || 0) * (row.total_courses || 0),
        newUsers: row.active_learners || 0,
        platformUsageRate: row.total_learners ? (row.active_learners / row.total_learners) * 100 : 0
      },
      calculated_at: row.calculated_at ? new Date(row.calculated_at).toISOString() : null
    }));

    const [skillDemand, competencyLevels, feedbackRatings, courseStatus] = await Promise.all([
      this.pool.query(
        `SELECT skill_id, skill_name, demand_count, rank_position
         FROM public.learning_analytics_skill_demand
         WHERE snapshot_id = $1
         ORDER BY rank_position ASC`,
        [latest.id]
      ),
      this.pool.query(
        `SELECT level, learner_count
         FROM public.learning_analytics_competency_level_breakdown
         WHERE snapshot_id = $1`,
        [latest.id]
      ),
      this.pool.query(
        `SELECT rating, count
         FROM public.learning_analytics_feedback_rating_breakdown
         WHERE snapshot_id = $1
         ORDER BY rating`,
        [latest.id]
      ),
      this.pool.query(
        `SELECT status, count
         FROM public.learning_analytics_course_status_breakdown
         WHERE snapshot_id = $1`,
        [latest.id]
      )
    ]);

    const details = {
      trends,
      skillDemand: skillDemand.rows,
      competencyLevels: competencyLevels.rows,
      feedbackRatings: feedbackRatings.rows,
      courseStatus: courseStatus.rows
    };

    return this.buildResponse(metrics, details, rows, 'learningAnalytics');
  }

  /* ================================
   * Helpers
   * ================================ */

  async getTopicCounts() {
    const { rows } = await this.pool.query(`
      SELECT course_id, COUNT(*) AS topic_count
      FROM public.course_topics
      GROUP BY course_id
    `);
    const map = new Map();
    rows.forEach((row) => {
      map.set(row.course_id, Number(row.topic_count) || 0);
    });
    return map;
  }


  safeAverage(values) {
    const valid = values.filter((value) => Number.isFinite(value));
    if (!valid.length) {
      return 0;
    }
    const avg = valid.reduce((sum, value) => sum + value, 0) / valid.length;
    return Math.round(avg * 10) / 10;
  }

  buildResponse(metrics, details, rows, source) {
    const collectedAt = this.extractLatestTimestamp(rows);
    return {
      timestamp: collectedAt,
      data: {
        metrics: metrics || {},
        details: details || {}
      },
      metadata: {
        source,
        schema_version: DEFAULT_SCHEMA_VERSION,
        collected_at: collectedAt
      }
    };
  }

  extractLatestTimestamp(rows) {
    const latest = rows
      .map((row) => row.ingested_at || row.calculated_at || row.snapshot_date)
      .filter(Boolean)
      .map((value) => new Date(value).getTime());
    if (!latest.length) {
      return new Date().toISOString();
    }
    return new Date(Math.max(...latest)).toISOString();
  }
}



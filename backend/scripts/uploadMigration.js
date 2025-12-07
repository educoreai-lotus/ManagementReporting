/**
 * Upload Migration File to Coordinator
 * 
 * This script uploads the migration file to the Coordinator service
 * to transition the service from "pending_migration" to "active" status.
 * 
 * Environment variables required:
 * - COORDINATOR_API_URL: Coordinator base URL
 * - SERVICE_ID: Service ID from Stage 1 registration
 * - MR_NAME: Service name
 * - MR_PRIVATE_KEY: Private key for ECDSA signing
 */

import axios from 'axios';
import { generateSignature } from '../src/utils/signature.js';
import dotenv from 'dotenv';

dotenv.config();

// Configuration from environment variables
const COORDINATOR_API_URL = process.env.COORDINATOR_API_URL;
const SERVICE_ID = process.env.SERVICE_ID;
const SERVICE_NAME = process.env.MR_NAME || 'managementreporting-service';
const PRIVATE_KEY = process.env.MR_PRIVATE_KEY;

// Validate required environment variables
if (!COORDINATOR_API_URL) {
  console.error('❌ COORDINATOR_API_URL environment variable is required');
  process.exit(1);
}

if (!SERVICE_ID) {
  console.error('❌ SERVICE_ID environment variable is required');
  process.exit(1);
}

if (!PRIVATE_KEY) {
  console.error('❌ MR_PRIVATE_KEY environment variable is required');
  process.exit(1);
}

// Clean URL (remove trailing slash)
const cleanCoordinatorUrl = COORDINATOR_API_URL.replace(/\/$/, '');

// Migration file structure
const migrationFile = {
  version: '1.0.0',
  description: 'Management Reporting Service - Analytics dashboard and reporting system for learning management platforms. Provides comprehensive analytics, charts, reports, and AI-powered insights for course completion, user engagement, assessments, content effectiveness, and organizational performance.',
  capabilities: [
    'analytics',
    'reporting',
    'dashboard',
    'data visualization',
    'chart generation',
    'report generation',
    'learning analytics',
    'course analytics',
    'user analytics',
    'assessment analytics',
    'content analytics',
    'organizational analytics',
    'performance metrics',
    'data aggregation',
    'ai insights',
    'chart transcription',
    'pdf reports',
    'custom queries'
  ],
  api: {
    endpoints: [
      {
        path: '/api/fill-content-metrics',
        method: 'POST',
        description: 'Main endpoint for receiving requests from coordinator (RAG service)',
        requestSchema: {},
        responseSchema: {}
      },
      {
        path: '/api/v1/dashboard',
        method: 'GET',
        description: 'Get dashboard data with all charts and metrics',
        requestSchema: {},
        responseSchema: {}
      },
      {
        path: '/api/v1/dashboard/all-charts',
        method: 'GET',
        description: 'Get all charts for transcription',
        requestSchema: {},
        responseSchema: {}
      },
      {
        path: '/api/v1/dashboard/refresh',
        method: 'POST',
        description: 'Refresh dashboard data from microservices',
        requestSchema: {},
        responseSchema: {}
      },
      {
        path: '/api/v1/dashboard/chart/:chartId',
        method: 'GET',
        description: 'Get specific chart by ID',
        requestSchema: {},
        responseSchema: {}
      },
      {
        path: '/api/v1/reports/types',
        method: 'GET',
        description: 'Get available report types',
        requestSchema: {},
        responseSchema: {}
      },
      {
        path: '/api/v1/reports/generate',
        method: 'POST',
        description: 'Generate a report (JSON or PDF format)',
        requestSchema: {},
        responseSchema: {}
      },
      {
        path: '/api/v1/data/refresh',
        method: 'POST',
        description: 'Trigger manual data collection from microservices',
        requestSchema: {},
        responseSchema: {}
      },
      {
        path: '/api/v1/data/status',
        method: 'GET',
        description: 'Get data collection status',
        requestSchema: {},
        responseSchema: {}
      },
      {
        path: '/api/v1/openai/report-conclusions',
        method: 'POST',
        description: 'Generate AI-powered report conclusions from chart images',
        requestSchema: {},
        responseSchema: {}
      },
      {
        path: '/api/v1/ai/chart-transcription/startup',
        method: 'POST',
        description: 'Generate chart transcriptions on startup',
        requestSchema: {},
        responseSchema: {}
      },
      {
        path: '/api/v1/ai/chart-transcription/refresh',
        method: 'POST',
        description: 'Refresh chart transcriptions',
        requestSchema: {},
        responseSchema: {}
      },
      {
        path: '/api/v1/ai/chart-transcription/:chartId',
        method: 'GET',
        description: 'Get chart transcription by chart ID',
        requestSchema: {},
        responseSchema: {}
      },
      {
        path: '/api/v1/health/db',
        method: 'GET',
        description: 'Database health check endpoint',
        requestSchema: {},
        responseSchema: {}
      },
      {
        path: '/api/ai-custom/query-data',
        method: 'POST',
        description: 'AI-powered custom SQL query generation and execution',
        requestSchema: {},
        responseSchema: {}
      }
    ]
  },
  tables: [
    'course_builder_cache',
    'assessments_cache',
    'directory_cache',
    'learning_analytics_snapshot',
    'learning_analytics_learners',
    'learning_analytics_courses',
    'learning_analytics_content',
    'learning_analytics_skills',
    'learning_analytics_assessments',
    'learning_analytics_engagement',
    'learning_analytics_competency_level_breakdown',
    'learning_analytics_feedback_rating_breakdown',
    'learning_analytics_course_status_breakdown',
    'learning_analytics_skill_demand',
    'ai_chart_transcriptions',
    'ai_report_conclusions',
    'courses',
    'course_org_permissions',
    'topics',
    'course_topics',
    'topic_skills',
    'contents'
  ],
  database: {
    tables: [
      {
        name: 'course_builder_cache',
        schema: {
          snapshot_date: { type: 'date', notNull: true },
          course_id: { type: 'text', notNull: true },
          course_name: { type: 'text', notNull: true },
          totalEnrollments: { type: 'integer' },
          activeEnrollment: { type: 'integer' },
          completionRate: { type: 'numeric(5,2)' },
          averageRating: { type: 'numeric(3,2)' },
          createdAt: { type: 'timestamptz' },
          feedback: { type: 'text' },
          ingested_at: { type: 'timestamptz', notNull: true, default: 'now()' },
          primaryKey: ['snapshot_date', 'course_id']
        }
      },
      {
        name: 'assessments_cache',
        schema: {
          snapshot_date: { type: 'date', notNull: true },
          user_id: { type: 'text', notNull: true },
          course_id: { type: 'text', notNull: true },
          exam_type: { type: 'text', notNull: true, check: "exam_type in ('precourse','midcourse','postcourse')" },
          attempt_no: { type: 'integer', notNull: true },
          passing_grade: { type: 'integer' },
          final_grade: { type: 'integer' },
          passed: { type: 'boolean' },
          ingested_at: { type: 'timestamptz', notNull: true, default: 'now()' },
          primaryKey: ['snapshot_date', 'user_id', 'course_id', 'exam_type', 'attempt_no']
        }
      },
      {
        name: 'directory_cache',
        schema: {
          snapshot_date: { type: 'date', notNull: true },
          company_id: { type: 'text', notNull: true },
          company_name: { type: 'text' },
          industry: { type: 'text' },
          company_size: { type: 'text' },
          date_registered: { type: 'timestamptz' },
          primary_hr_contact: { type: 'text' },
          approval_policy: { type: 'text' },
          decision_maker: { type: 'text' },
          kpis: { type: 'jsonb' },
          max_test_attempts: { type: 'integer' },
          website_url: { type: 'text' },
          verification_status: { type: 'text' },
          hierarchy: { type: 'jsonb' },
          ingested_at: { type: 'timestamptz', notNull: true, default: 'now()' },
          primaryKey: ['snapshot_date', 'company_id']
        }
      },
      {
        name: 'learning_analytics_snapshot',
        schema: {
          id: { type: 'bigserial', primaryKey: true },
          snapshot_date: { type: 'date', notNull: true },
          period: { type: 'text', notNull: true, check: "period = ANY (ARRAY['daily', 'weekly', 'monthly'])" },
          start_date: { type: 'timestamptz', notNull: true },
          end_date: { type: 'timestamptz', notNull: true },
          calculated_at: { type: 'timestamptz', notNull: true },
          ingested_at: { type: 'timestamptz', notNull: true, default: 'now()' },
          version: { type: 'text', notNull: true, default: "'1.0'" },
          raw_payload: { type: 'jsonb' }
        }
      },
      {
        name: 'learning_analytics_learners',
        schema: {
          snapshot_id: { type: 'bigint', primaryKey: true, references: 'learning_analytics_snapshot(id) ON DELETE CASCADE' },
          total_learners: { type: 'integer', notNull: true },
          active_learners: { type: 'integer', notNull: true },
          total_organizations: { type: 'integer', notNull: true }
        }
      },
      {
        name: 'learning_analytics_courses',
        schema: {
          snapshot_id: { type: 'bigint', primaryKey: true, references: 'learning_analytics_snapshot(id) ON DELETE CASCADE' },
          total_courses: { type: 'integer', notNull: true },
          courses_completed: { type: 'integer', notNull: true },
          average_completion_rate: { type: 'numeric(5,2)', notNull: true },
          total_enrollments: { type: 'integer', notNull: true },
          active_enrollments: { type: 'integer', notNull: true },
          average_course_duration_hours: { type: 'numeric(6,2)', notNull: true },
          average_lessons_per_course: { type: 'numeric(6,2)', notNull: true }
        }
      },
      {
        name: 'learning_analytics_content',
        schema: {
          snapshot_id: { type: 'bigint', primaryKey: true, references: 'learning_analytics_snapshot(id) ON DELETE CASCADE' },
          total_topics: { type: 'integer', notNull: true },
          average_topics_per_content: { type: 'numeric(6,2)', notNull: true }
        }
      },
      {
        name: 'learning_analytics_skills',
        schema: {
          snapshot_id: { type: 'bigint', primaryKey: true, references: 'learning_analytics_snapshot(id) ON DELETE CASCADE' },
          total_skills_acquired: { type: 'integer', notNull: true },
          average_skills_per_competency: { type: 'numeric(6,2)', notNull: true },
          total_unique_learning_paths: { type: 'integer', notNull: true },
          average_skills_per_learning_path: { type: 'numeric(6,2)', notNull: true }
        }
      },
      {
        name: 'learning_analytics_assessments',
        schema: {
          snapshot_id: { type: 'bigint', primaryKey: true, references: 'learning_analytics_snapshot(id) ON DELETE CASCADE' },
          total_assessments: { type: 'integer', notNull: true },
          total_distinct_assessments: { type: 'integer', notNull: true },
          average_attempts_per_assessment: { type: 'numeric(6,2)', notNull: true },
          pass_rate: { type: 'numeric(5,2)', notNull: true },
          average_final_grade: { type: 'numeric(5,2)', notNull: true },
          average_passing_grade: { type: 'numeric(5,2)', notNull: true }
        }
      },
      {
        name: 'learning_analytics_engagement',
        schema: {
          snapshot_id: { type: 'bigint', primaryKey: true, references: 'learning_analytics_snapshot(id) ON DELETE CASCADE' },
          average_feedback_rating: { type: 'numeric(3,2)', notNull: true },
          total_feedback_submissions: { type: 'integer', notNull: true },
          total_competitions: { type: 'integer', notNull: true },
          average_competition_score: { type: 'numeric(5,2)', notNull: true }
        }
      },
      {
        name: 'learning_analytics_competency_level_breakdown',
        schema: {
          id: { type: 'bigserial', primaryKey: true },
          snapshot_id: { type: 'bigint', notNull: true, references: 'learning_analytics_snapshot(id) ON DELETE CASCADE' },
          level: { type: 'text', notNull: true },
          learner_count: { type: 'integer', notNull: true }
        }
      },
      {
        name: 'learning_analytics_feedback_rating_breakdown',
        schema: {
          id: { type: 'bigserial', primaryKey: true },
          snapshot_id: { type: 'bigint', notNull: true, references: 'learning_analytics_snapshot(id) ON DELETE CASCADE' },
          rating: { type: 'integer', notNull: true },
          count: { type: 'integer', notNull: true }
        }
      },
      {
        name: 'learning_analytics_course_status_breakdown',
        schema: {
          id: { type: 'bigserial', primaryKey: true },
          snapshot_id: { type: 'bigint', notNull: true, references: 'learning_analytics_snapshot(id) ON DELETE CASCADE' },
          status: { type: 'text', notNull: true },
          count: { type: 'integer', notNull: true }
        }
      },
      {
        name: 'learning_analytics_skill_demand',
        schema: {
          id: { type: 'bigserial', primaryKey: true },
          snapshot_id: { type: 'bigint', notNull: true, references: 'learning_analytics_snapshot(id) ON DELETE CASCADE' },
          skill_id: { type: 'text', notNull: true },
          skill_name: { type: 'text', notNull: true },
          demand_count: { type: 'integer', notNull: true },
          rank_position: { type: 'integer' }
        }
      },
      {
        name: 'ai_chart_transcriptions',
        schema: {
          id: { type: 'bigserial', primaryKey: true },
          chart_id: { type: 'varchar(128)', notNull: true, unique: true },
          chart_signature: { type: 'varchar(64)', notNull: true },
          model: { type: 'varchar(32)', notNull: true, default: "'gpt-4o'" },
          transcription_text: { type: 'text', notNull: true },
          created_at: { type: 'timestamptz', notNull: true, default: 'now()' },
          updated_at: { type: 'timestamptz', notNull: true, default: 'now()' }
        }
      },
      {
        name: 'ai_report_conclusions',
        schema: {
          id: { type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
          report_id: { type: 'uuid' },
          report_name: { type: 'text', notNull: true },
          conclusions: { type: 'jsonb', notNull: true },
          generated_at: { type: 'timestamptz', notNull: true, default: 'now()' },
          created_at: { type: 'timestamptz', notNull: true, default: 'now()' },
          expires_at: { type: 'timestamptz' }
        }
      },
      {
        name: 'courses',
        schema: {
          course_id: { type: 'text', primaryKey: true },
          course_name: { type: 'text', notNull: true },
          course_language: { type: 'text' },
          trainer_id: { type: 'text' },
          trainer_name: { type: 'text' },
          permission_scope: { type: 'text', notNull: true, default: "'all'" },
          total_usage_count: { type: 'integer', default: 0 },
          created_at: { type: 'timestamptz', notNull: true },
          status: { type: 'course_status', notNull: true, default: "'active'" }
        }
      },
      {
        name: 'course_org_permissions',
        schema: {
          course_id: { type: 'text', notNull: true, references: 'courses(course_id) ON DELETE CASCADE' },
          org_uuid: { type: 'uuid', notNull: true },
          primaryKey: ['course_id', 'org_uuid']
        }
      },
      {
        name: 'topics',
        schema: {
          topic_id: { type: 'text', primaryKey: true },
          topic_name: { type: 'text', notNull: true },
          topic_language: { type: 'text' },
          total_usage_count: { type: 'integer', default: 0 },
          created_at: { type: 'timestamptz', notNull: true },
          status: { type: 'topic_status', notNull: true, default: "'active'" }
        }
      },
      {
        name: 'course_topics',
        schema: {
          course_id: { type: 'text', notNull: true, references: 'courses(course_id) ON DELETE CASCADE' },
          topic_id: { type: 'text', notNull: true, references: 'topics(topic_id) ON DELETE CASCADE' },
          sort_order: { type: 'integer' },
          primaryKey: ['course_id', 'topic_id']
        }
      },
      {
        name: 'topic_skills',
        schema: {
          topic_id: { type: 'text', notNull: true, references: 'topics(topic_id) ON DELETE CASCADE' },
          skill_code: { type: 'text', notNull: true },
          primaryKey: ['topic_id', 'skill_code']
        }
      },
      {
        name: 'contents',
        schema: {
          content_id: { type: 'text', primaryKey: true },
          topic_id: { type: 'text', notNull: true, references: 'topics(topic_id) ON DELETE CASCADE' },
          content_type: { type: 'content_type', notNull: true },
          content_data: { type: 'jsonb', notNull: true },
          generation_method: { type: 'generation_method', notNull: true },
          generation_method_id: { type: 'uuid' }
        }
      }
    ],
    migrations: []
  },
  events: {
    publishes: [
      'report.generated',
      'data.refreshed',
      'chart.transcribed'
    ],
    subscribes: [
      'data.collection.requested',
      'report.generation.requested'
    ]
  },
  dependencies: [
    'assessment-service',
    'contentstudio-service',
    'coursebuilder-service',
    'directory-service',
    'learninganalytics-service'
  ]
};

// Payload
const payload = {
  migrationFile: migrationFile
};

/**
 * Upload migration file to Coordinator
 */
async function uploadMigration() {
  try {
    console.log('📤 Uploading migration file to Coordinator...');
    console.log(`   Service ID: ${SERVICE_ID}`);
    console.log(`   Service Name: ${SERVICE_NAME}`);
    console.log(`   Coordinator URL: ${cleanCoordinatorUrl}`);
    console.log('');

    // Generate signature
    console.log('🔐 Generating signature...');
    const signature = generateSignature(SERVICE_NAME, PRIVATE_KEY, payload);
    console.log('   ✅ Signature generated');
    console.log('');

    // Prepare request
    const url = `${cleanCoordinatorUrl}/register/${SERVICE_ID}/migration`;
    console.log(`📡 Sending POST request to: ${url}`);
    console.log('');

    const response = await axios.post(
      url,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': SERVICE_NAME,
          'X-Signature': signature
        },
        timeout: 30000 // 30 seconds timeout
      }
    );

    console.log('✅ Migration uploaded successfully!');
    console.log('');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('');

    if (response.data.success && response.data.status === 'active') {
      console.log('🎉 Service is now ACTIVE and available for AI routing!');
    }

    return response.data;
  } catch (error) {
    console.error('❌ Migration upload failed:');
    console.error('');

    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Status Text: ${error.response.statusText}`);
      console.error('');
      console.error('   Response Data:');
      console.error(JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('   No response received from server');
      console.error(`   Error: ${error.message}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }

    console.error('');
    console.error('Stack trace:');
    console.error(error.stack);

    process.exit(1);
  }
}

// Run the upload
uploadMigration()
  .then(() => {
    console.log('');
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });


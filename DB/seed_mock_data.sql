-- ====================================================
-- SAFE MOCK DATA SEEDING SCRIPT
-- Non-destructive, idempotent, respects all constraints
-- ====================================================

-- Set timezone for consistent date handling
SET timezone = 'UTC';

-- ====================================================
-- Organizations (directory_cache)
-- ====================================================

INSERT INTO public.directory_cache (
  snapshot_date,
  company_id,
  company_name,
  industry,
  company_size,
  date_registered,
  primary_hr_contact,
  approval_policy,
  decision_maker,
  kpis,
  max_test_attempts,
  website_url,
  verification_status,
  hierarchy
) VALUES
(
  CURRENT_DATE - INTERVAL '15 days',
  'ORG-001',
  'TechCorp Solutions',
  'Technology',
  '500-1000',
  CURRENT_TIMESTAMP - INTERVAL '45 days',
  'hr@techcorp.com',
  'Manager approval required',
  'John Smith',
  '{"employee_satisfaction": 4.5, "retention_rate": 0.87, "training_completion": 0.92}'::jsonb,
  3,
  'https://techcorp.example.com',
  'verified',
  '{"ceo": "John Smith", "departments": ["Engineering", "Sales", "HR"], "total_employees": 750}'::jsonb
),
(
  CURRENT_DATE - INTERVAL '10 days',
  'ORG-002',
  'Global Learning Inc',
  'Education',
  '100-500',
  CURRENT_TIMESTAMP - INTERVAL '38 days',
  'contact@globallearning.com',
  'Auto-approval for courses',
  'Sarah Johnson',
  '{"employee_satisfaction": 4.2, "retention_rate": 0.85, "training_completion": 0.88}'::jsonb,
  5,
  'https://globallearning.example.com',
  'verified',
  '{"ceo": "Sarah Johnson", "departments": ["Training", "Development"], "total_employees": 320}'::jsonb
),
(
  CURRENT_DATE - INTERVAL '5 days',
  'ORG-003',
  'InnovateNow Ltd',
  'Consulting',
  '50-100',
  CURRENT_TIMESTAMP - INTERVAL '30 days',
  'hr@innovatnow.com',
  'HR approval required',
  'Michael Brown',
  '{"employee_satisfaction": 4.7, "retention_rate": 0.90, "training_completion": 0.95}'::jsonb,
  2,
  'https://innovatnow.example.com',
  'pending',
  '{"ceo": "Michael Brown", "departments": ["Consulting", "Operations"], "total_employees": 75}'::jsonb
)
ON CONFLICT (snapshot_date, company_id) DO NOTHING;

-- ====================================================
-- Courses
-- ====================================================

INSERT INTO public.courses (
  course_id,
  course_name,
  course_language,
  trainer_id,
  trainer_name,
  permission_scope,
  total_usage_count,
  created_at,
  status
) VALUES
(
  'COURSE-001',
  'Introduction to Data Science',
  'en',
  'TRAINER-001',
  'Dr. Alice Williams',
  'orgs',
  1250,
  CURRENT_TIMESTAMP - INTERVAL '40 days',
  'active'
),
(
  'COURSE-002',
  'Advanced JavaScript Development',
  'en',
  'TRAINER-002',
  'Bob Martinez',
  'orgs',
  890,
  CURRENT_TIMESTAMP - INTERVAL '35 days',
  'active'
),
(
  'COURSE-003',
  'Project Management Fundamentals',
  'en',
  'TRAINER-003',
  'Carol Davis',
  'all',
  2100,
  CURRENT_TIMESTAMP - INTERVAL '30 days',
  'active'
),
(
  'COURSE-004',
  'Machine Learning Basics',
  'en',
  'TRAINER-001',
  'Dr. Alice Williams',
  'orgs',
  650,
  CURRENT_TIMESTAMP - INTERVAL '25 days',
  'active'
),
(
  'COURSE-005',
  'Leadership and Team Management',
  'en',
  'TRAINER-004',
  'David Wilson',
  'all',
  1750,
  CURRENT_TIMESTAMP - INTERVAL '20 days',
  'active'
)
ON CONFLICT (course_id) DO NOTHING;

-- ====================================================
-- Course-Organization Permissions
-- ====================================================

-- Generate UUIDs for organizations (consistent with directory_cache)
-- Using deterministic UUIDs based on company_id
INSERT INTO public.course_org_permissions (course_id, org_uuid)
SELECT 
  c.course_id,
  ('00000000-0000-0000-0000-' || LPAD(ROW_NUMBER() OVER(), 12, '0'))::uuid as org_uuid
FROM public.courses c
CROSS JOIN (VALUES 
  ('ORG-001'),
  ('ORG-002'),
  ('ORG-003')
) AS orgs(company_id)
WHERE c.permission_scope = 'orgs'
  AND NOT EXISTS (
    SELECT 1 FROM public.course_org_permissions cop
    WHERE cop.course_id = c.course_id
  )
LIMIT 6
ON CONFLICT (course_id, org_uuid) DO NOTHING;

-- More specific mappings
INSERT INTO public.course_org_permissions (course_id, org_uuid) VALUES
('COURSE-001', '550e8400-e29b-41d4-a716-446655440001'::uuid),
('COURSE-001', '550e8400-e29b-41d4-a716-446655440002'::uuid),
('COURSE-002', '550e8400-e29b-41d4-a716-446655440001'::uuid),
('COURSE-002', '550e8400-e29b-41d4-a716-446655440003'::uuid),
('COURSE-004', '550e8400-e29b-41d4-a716-446655440001'::uuid),
('COURSE-004', '550e8400-e29b-41d4-a716-446655440002'::uuid)
ON CONFLICT (course_id, org_uuid) DO NOTHING;

-- ====================================================
-- Topics
-- ====================================================

INSERT INTO public.topics (
  topic_id,
  topic_name,
  topic_language,
  total_usage_count,
  created_at,
  status
) VALUES
('T-101', 'Data Collection and Cleaning', 'en', 450, CURRENT_TIMESTAMP - INTERVAL '40 days', 'active'),
('T-102', 'Statistical Analysis', 'en', 380, CURRENT_TIMESTAMP - INTERVAL '38 days', 'active'),
('T-103', 'Data Visualization', 'en', 520, CURRENT_TIMESTAMP - INTERVAL '36 days', 'active'),
('T-104', 'JavaScript ES6+ Features', 'en', 620, CURRENT_TIMESTAMP - INTERVAL '35 days', 'active'),
('T-105', 'Async Programming', 'en', 480, CURRENT_TIMESTAMP - INTERVAL '34 days', 'active'),
('T-106', 'React Fundamentals', 'en', 750, CURRENT_TIMESTAMP - INTERVAL '33 days', 'active'),
('T-107', 'Project Planning', 'en', 590, CURRENT_TIMESTAMP - INTERVAL '30 days', 'active'),
('T-108', 'Risk Management', 'en', 420, CURRENT_TIMESTAMP - INTERVAL '29 days', 'active'),
('T-109', 'Stakeholder Communication', 'en', 510, CURRENT_TIMESTAMP - INTERVAL '28 days', 'active'),
('T-110', 'Supervised Learning', 'en', 320, CURRENT_TIMESTAMP - INTERVAL '25 days', 'active'),
('T-111', 'Neural Networks', 'en', 280, CURRENT_TIMESTAMP - INTERVAL '24 days', 'active'),
('T-112', 'Communication Skills', 'en', 680, CURRENT_TIMESTAMP - INTERVAL '20 days', 'active'),
('T-113', 'Conflict Resolution', 'en', 540, CURRENT_TIMESTAMP - INTERVAL '19 days', 'active')
ON CONFLICT (topic_id) DO NOTHING;

-- ====================================================
-- Course-Topic Relationships
-- ====================================================

INSERT INTO public.course_topics (course_id, topic_id, sort_order) VALUES
-- Course 001: Data Science
('COURSE-001', 'T-101', 1),
('COURSE-001', 'T-102', 2),
('COURSE-001', 'T-103', 3),
-- Course 002: JavaScript
('COURSE-002', 'T-104', 1),
('COURSE-002', 'T-105', 2),
('COURSE-002', 'T-106', 3),
-- Course 003: Project Management
('COURSE-003', 'T-107', 1),
('COURSE-003', 'T-108', 2),
('COURSE-003', 'T-109', 3),
-- Course 004: Machine Learning
('COURSE-004', 'T-101', 1),
('COURSE-004', 'T-110', 2),
('COURSE-004', 'T-111', 3),
-- Course 005: Leadership
('COURSE-005', 'T-112', 1),
('COURSE-005', 'T-113', 2)
ON CONFLICT (course_id, topic_id) DO NOTHING;

-- ====================================================
-- Topic Skills
-- ====================================================

INSERT INTO public.topic_skills (topic_id, skill_code) VALUES
('T-101', 'DATA-CLEAN'),
('T-101', 'PYTHON'),
('T-102', 'STATS'),
('T-102', 'R'),
('T-103', 'VISUALIZATION'),
('T-103', 'TABLEAU'),
('T-104', 'JS-ES6'),
('T-104', 'JS-ASYNC'),
('T-105', 'PROMISES'),
('T-105', 'ASYNC-AWAIT'),
('T-106', 'REACT'),
('T-106', 'JSX'),
('T-107', 'PLANNING'),
('T-107', 'GANTT'),
('T-108', 'RISK-ANALYSIS'),
('T-108', 'MITIGATION'),
('T-109', 'COMMUNICATION'),
('T-109', 'STAKEHOLDER'),
('T-110', 'ML-SUPERVISED'),
('T-110', 'CLASSIFICATION'),
('T-111', 'NEURAL-NET'),
('T-111', 'DEEP-LEARNING'),
('T-112', 'COMM-SKILLS'),
('T-112', 'PRESENTATION'),
('T-113', 'CONFLICT-RES'),
('T-113', 'NEGOTIATION')
ON CONFLICT (topic_id, skill_code) DO NOTHING;

-- ====================================================
-- Contents
-- ====================================================

INSERT INTO public.contents (
  content_id,
  topic_id,
  content_type,
  content_data,
  generation_method,
  generation_method_id
) VALUES
-- T-101: Data Collection and Cleaning
('C-001', 'T-101', 'avatar_video', '{"duration": 1200, "video_url": "https://example.com/videos/data-cleaning-001", "transcript": "Introduction to data cleaning techniques..."}'::jsonb, 'ai_assisted', gen_random_uuid()),
('C-002', 'T-101', 'text_audio', '{"text": "Data cleaning is essential for accurate analysis...", "audio_duration": 900}'::jsonb, 'manual', gen_random_uuid()),
('C-003', 'T-101', 'mind_map', '{"nodes": [{"id": "1", "label": "Data Sources"}, {"id": "2", "label": "Cleaning Steps"}]}'::jsonb, 'mixed', gen_random_uuid()),
-- T-102: Statistical Analysis
('C-004', 'T-102', 'presentation', '{"slides": 25, "presentation_url": "https://example.com/presentations/stats-001"}'::jsonb, 'ai_assisted', gen_random_uuid()),
('C-005', 'T-102', 'code', '{"language": "R", "code": "library(ggplot2)\n# Statistical analysis code..."}'::jsonb, 'full_ai', gen_random_uuid()),
-- T-103: Data Visualization
('C-006', 'T-103', 'avatar_video', '{"duration": 1500, "video_url": "https://example.com/videos/viz-001"}'::jsonb, 'ai_assisted', gen_random_uuid()),
('C-007', 'T-103', 'presentation', '{"slides": 30, "presentation_url": "https://example.com/presentations/viz-001"}'::jsonb, 'manual', gen_random_uuid()),
-- T-104: JavaScript ES6+
('C-008', 'T-104', 'text_audio', '{"text": "ES6 introduced many new features...", "audio_duration": 1100}'::jsonb, 'ai_assisted', gen_random_uuid()),
('C-009', 'T-104', 'code', '{"language": "javascript", "code": "const arrow = () => console.log(\"ES6\");"}'::jsonb, 'full_ai', gen_random_uuid()),
-- T-105: Async Programming
('C-010', 'T-105', 'avatar_video', '{"duration": 1800, "video_url": "https://example.com/videos/async-001"}'::jsonb, 'ai_assisted', gen_random_uuid()),
('C-011', 'T-105', 'code', '{"language": "javascript", "code": "async function fetchData() {...}"}'::jsonb, 'full_ai', gen_random_uuid()),
-- T-106: React Fundamentals
('C-012', 'T-106', 'presentation', '{"slides": 40, "presentation_url": "https://example.com/presentations/react-001"}'::jsonb, 'manual', gen_random_uuid()),
('C-013', 'T-106', 'code', '{"language": "javascript", "code": "import React from \"react\";"}'::jsonb, 'full_ai', gen_random_uuid()),
-- T-107: Project Planning
('C-014', 'T-107', 'text_audio', '{"text": "Effective project planning requires...", "audio_duration": 1200}'::jsonb, 'manual', gen_random_uuid()),
('C-015', 'T-107', 'mind_map', '{"nodes": [{"id": "1", "label": "Planning Phase"}, {"id": "2", "label": "Execution"}]}'::jsonb, 'mixed', gen_random_uuid()),
-- T-108: Risk Management
('C-016', 'T-108', 'avatar_video', '{"duration": 1400, "video_url": "https://example.com/videos/risk-001"}'::jsonb, 'ai_assisted', gen_random_uuid()),
-- T-109: Stakeholder Communication
('C-017', 'T-109', 'presentation', '{"slides": 20, "presentation_url": "https://example.com/presentations/stakeholder-001"}'::jsonb, 'manual', gen_random_uuid()),
-- T-110: Supervised Learning
('C-018', 'T-110', 'text_audio', '{"text": "Supervised learning uses labeled data...", "audio_duration": 1300}'::jsonb, 'ai_assisted', gen_random_uuid()),
('C-019', 'T-110', 'code', '{"language": "python", "code": "from sklearn import ..."}'::jsonb, 'full_ai', gen_random_uuid()),
-- T-111: Neural Networks
('C-020', 'T-111', 'avatar_video', '{"duration": 2000, "video_url": "https://example.com/videos/nn-001"}'::jsonb, 'ai_assisted', gen_random_uuid()),
-- T-112: Communication Skills
('C-021', 'T-112', 'presentation', '{"slides": 35, "presentation_url": "https://example.com/presentations/comm-001"}'::jsonb, 'manual', gen_random_uuid()),
-- T-113: Conflict Resolution
('C-022', 'T-113', 'text_audio', '{"text": "Conflict resolution strategies...", "audio_duration": 1000}'::jsonb, 'mixed', gen_random_uuid())
ON CONFLICT (content_id) DO NOTHING;

-- ====================================================
-- Course Builder Cache
-- ====================================================

INSERT INTO public.course_builder_cache (
  snapshot_date,
  course_id,
  course_name,
  "totalEnrollments",
  "activeEnrollment",
  "completionRate",
  "averageRating",
  "createdAt",
  feedback
) VALUES
-- Recent snapshots for COURSE-001
(CURRENT_DATE - INTERVAL '15 days', 'COURSE-001', 'Introduction to Data Science', 1250, 890, 85.50, 4.65, CURRENT_TIMESTAMP - INTERVAL '40 days', 'Excellent course with practical examples'),
(CURRENT_DATE - INTERVAL '10 days', 'COURSE-001', 'Introduction to Data Science', 1320, 950, 86.20, 4.68, CURRENT_TIMESTAMP - INTERVAL '40 days', 'Great content and delivery'),
(CURRENT_DATE - INTERVAL '5 days', 'COURSE-001', 'Introduction to Data Science', 1380, 1020, 87.10, 4.70, CURRENT_TIMESTAMP - INTERVAL '40 days', 'Highly recommended'),
-- Recent snapshots for COURSE-002
(CURRENT_DATE - INTERVAL '15 days', 'COURSE-002', 'Advanced JavaScript Development', 890, 620, 78.30, 4.45, CURRENT_TIMESTAMP - INTERVAL '35 days', 'Good coverage of modern JS'),
(CURRENT_DATE - INTERVAL '10 days', 'COURSE-002', 'Advanced JavaScript Development', 920, 650, 79.10, 4.48, CURRENT_TIMESTAMP - INTERVAL '35 days', 'Well structured'),
(CURRENT_DATE - INTERVAL '5 days', 'COURSE-002', 'Advanced JavaScript Development', 950, 680, 79.80, 4.50, CURRENT_TIMESTAMP - INTERVAL '35 days', 'Practical exercises helpful'),
-- Recent snapshots for COURSE-003
(CURRENT_DATE - INTERVAL '15 days', 'COURSE-003', 'Project Management Fundamentals', 2100, 1650, 92.40, 4.85, CURRENT_TIMESTAMP - INTERVAL '30 days', 'Comprehensive and practical'),
(CURRENT_DATE - INTERVAL '10 days', 'COURSE-003', 'Project Management Fundamentals', 2150, 1700, 92.80, 4.87, CURRENT_TIMESTAMP - INTERVAL '30 days', 'Real-world examples'),
(CURRENT_DATE - INTERVAL '5 days', 'COURSE-003', 'Project Management Fundamentals', 2200, 1750, 93.20, 4.88, CURRENT_TIMESTAMP - INTERVAL '30 days', 'Best PM course available'),
-- Recent snapshots for COURSE-004
(CURRENT_DATE - INTERVAL '15 days', 'COURSE-004', 'Machine Learning Basics', 650, 420, 72.50, 4.25, CURRENT_TIMESTAMP - INTERVAL '25 days', 'Good introduction to ML'),
(CURRENT_DATE - INTERVAL '10 days', 'COURSE-004', 'Machine Learning Basics', 680, 450, 73.20, 4.28, CURRENT_TIMESTAMP - INTERVAL '25 days', 'Clear explanations'),
(CURRENT_DATE - INTERVAL '5 days', 'COURSE-004', 'Machine Learning Basics', 710, 480, 74.00, 4.30, CURRENT_TIMESTAMP - INTERVAL '25 days', 'Challenging but rewarding'),
-- Recent snapshots for COURSE-005
(CURRENT_DATE - INTERVAL '15 days', 'COURSE-005', 'Leadership and Team Management', 1750, 1320, 88.60, 4.75, CURRENT_TIMESTAMP - INTERVAL '20 days', 'Valuable leadership insights'),
(CURRENT_DATE - INTERVAL '10 days', 'COURSE-005', 'Leadership and Team Management', 1800, 1370, 89.20, 4.77, CURRENT_TIMESTAMP - INTERVAL '20 days', 'Practical strategies'),
(CURRENT_DATE - INTERVAL '5 days', 'COURSE-005', 'Leadership and Team Management', 1850, 1420, 89.80, 4.79, CURRENT_TIMESTAMP - INTERVAL '20 days', 'Excellent for managers')
ON CONFLICT (snapshot_date, course_id) DO NOTHING;

-- ====================================================
-- Assessments Cache
-- ====================================================

INSERT INTO public.assessments_cache (
  snapshot_date,
  user_id,
  course_id,
  exam_type,
  attempt_no,
  passing_grade,
  final_grade,
  passed
) VALUES
-- COURSE-001 assessments
(CURRENT_DATE - INTERVAL '15 days', 'USER-001', 'COURSE-001', 'precourse', 1, 70, 65, false),
(CURRENT_DATE - INTERVAL '15 days', 'USER-001', 'COURSE-001', 'midcourse', 1, 70, 78, true),
(CURRENT_DATE - INTERVAL '10 days', 'USER-001', 'COURSE-001', 'postcourse', 1, 70, 85, true),
(CURRENT_DATE - INTERVAL '15 days', 'USER-002', 'COURSE-001', 'precourse', 1, 70, 72, true),
(CURRENT_DATE - INTERVAL '10 days', 'USER-002', 'COURSE-001', 'midcourse', 1, 70, 80, true),
(CURRENT_DATE - INTERVAL '5 days', 'USER-002', 'COURSE-001', 'postcourse', 1, 70, 88, true),
(CURRENT_DATE - INTERVAL '15 days', 'USER-003', 'COURSE-001', 'precourse', 1, 70, 68, false),
(CURRENT_DATE - INTERVAL '10 days', 'USER-003', 'COURSE-001', 'precourse', 2, 70, 75, true),
(CURRENT_DATE - INTERVAL '10 days', 'USER-003', 'COURSE-001', 'midcourse', 1, 70, 82, true),
-- COURSE-002 assessments
(CURRENT_DATE - INTERVAL '15 days', 'USER-004', 'COURSE-002', 'precourse', 1, 70, 70, true),
(CURRENT_DATE - INTERVAL '10 days', 'USER-004', 'COURSE-002', 'midcourse', 1, 70, 76, true),
(CURRENT_DATE - INTERVAL '5 days', 'USER-004', 'COURSE-002', 'postcourse', 1, 70, 83, true),
(CURRENT_DATE - INTERVAL '15 days', 'USER-005', 'COURSE-002', 'precourse', 1, 70, 65, false),
(CURRENT_DATE - INTERVAL '10 days', 'USER-005', 'COURSE-002', 'precourse', 2, 70, 73, true),
(CURRENT_DATE - INTERVAL '10 days', 'USER-005', 'COURSE-002', 'midcourse', 1, 70, 79, true),
-- COURSE-003 assessments
(CURRENT_DATE - INTERVAL '15 days', 'USER-006', 'COURSE-003', 'precourse', 1, 70, 75, true),
(CURRENT_DATE - INTERVAL '10 days', 'USER-006', 'COURSE-003', 'midcourse', 1, 70, 85, true),
(CURRENT_DATE - INTERVAL '5 days', 'USER-006', 'COURSE-003', 'postcourse', 1, 70, 92, true),
(CURRENT_DATE - INTERVAL '15 days', 'USER-007', 'COURSE-003', 'precourse', 1, 70, 80, true),
(CURRENT_DATE - INTERVAL '10 days', 'USER-007', 'COURSE-003', 'midcourse', 1, 70, 88, true),
-- COURSE-004 assessments
(CURRENT_DATE - INTERVAL '15 days', 'USER-008', 'COURSE-004', 'precourse', 1, 70, 60, false),
(CURRENT_DATE - INTERVAL '10 days', 'USER-008', 'COURSE-004', 'precourse', 2, 70, 68, false),
(CURRENT_DATE - INTERVAL '5 days', 'USER-008', 'COURSE-004', 'precourse', 3, 70, 74, true),
(CURRENT_DATE - INTERVAL '10 days', 'USER-008', 'COURSE-004', 'midcourse', 1, 70, 77, true),
-- COURSE-005 assessments
(CURRENT_DATE - INTERVAL '15 days', 'USER-009', 'COURSE-005', 'precourse', 1, 70, 78, true),
(CURRENT_DATE - INTERVAL '10 days', 'USER-009', 'COURSE-005', 'midcourse', 1, 70, 84, true),
(CURRENT_DATE - INTERVAL '5 days', 'USER-009', 'COURSE-005', 'postcourse', 1, 70, 90, true),
(CURRENT_DATE - INTERVAL '15 days', 'USER-010', 'COURSE-005', 'precourse', 1, 70, 82, true),
(CURRENT_DATE - INTERVAL '10 days', 'USER-010', 'COURSE-005', 'midcourse', 1, 70, 87, true)
ON CONFLICT (snapshot_date, user_id, course_id, exam_type, attempt_no) DO NOTHING;

-- ====================================================
-- Learning Analytics Snapshot
-- ====================================================

-- Insert snapshots for different periods
INSERT INTO public.learning_analytics_snapshot (
  snapshot_date,
  period,
  start_date,
  end_date,
  calculated_at,
  version,
  raw_payload
) VALUES
-- Daily snapshot
(
  CURRENT_DATE - INTERVAL '5 days',
  'daily',
  (CURRENT_DATE - INTERVAL '5 days')::timestamp with time zone,
  (CURRENT_DATE - INTERVAL '4 days')::timestamp with time zone,
  CURRENT_TIMESTAMP - INTERVAL '5 days',
  '1.0',
  '{"source": "mock_data", "generated": true}'::jsonb
),
-- Weekly snapshot
(
  CURRENT_DATE - INTERVAL '10 days',
  'weekly',
  (CURRENT_DATE - INTERVAL '13 days')::timestamp with time zone,
  (CURRENT_DATE - INTERVAL '6 days')::timestamp with time zone,
  CURRENT_TIMESTAMP - INTERVAL '10 days',
  '1.0',
  '{"source": "mock_data", "generated": true}'::jsonb
),
-- Monthly snapshot
(
  CURRENT_DATE - INTERVAL '30 days',
  'monthly',
  (CURRENT_DATE - INTERVAL '60 days')::timestamp with time zone,
  CURRENT_TIMESTAMP - INTERVAL '30 days',
  CURRENT_TIMESTAMP - INTERVAL '30 days',
  '1.0',
  '{"source": "mock_data", "generated": true}'::jsonb
)
ON CONFLICT DO NOTHING
RETURNING id;

-- Get snapshot IDs for dependent tables
DO $$
DECLARE
  daily_snapshot_id bigint;
  weekly_snapshot_id bigint;
  monthly_snapshot_id bigint;
BEGIN
  -- Get snapshot IDs
  SELECT id INTO daily_snapshot_id
  FROM public.learning_analytics_snapshot
  WHERE snapshot_date = CURRENT_DATE - INTERVAL '5 days' AND period = 'daily'
  LIMIT 1;
  
  SELECT id INTO weekly_snapshot_id
  FROM public.learning_analytics_snapshot
  WHERE snapshot_date = CURRENT_DATE - INTERVAL '10 days' AND period = 'weekly'
  LIMIT 1;
  
  SELECT id INTO monthly_snapshot_id
  FROM public.learning_analytics_snapshot
  WHERE snapshot_date = CURRENT_DATE - INTERVAL '30 days' AND period = 'monthly'
  LIMIT 1;

  -- ====================================================
  -- Learning Analytics Metrics (One-to-One Tables)
  -- ====================================================
  
  -- Learners metrics
  INSERT INTO public.learning_analytics_learners (snapshot_id, total_learners, active_learners, total_organizations)
  VALUES
  (daily_snapshot_id, 1250, 980, 3),
  (weekly_snapshot_id, 1320, 1050, 3),
  (monthly_snapshot_id, 1450, 1150, 3)
  ON CONFLICT (snapshot_id) DO NOTHING;
  
  -- Courses metrics
  INSERT INTO public.learning_analytics_courses (
    snapshot_id,
    total_courses,
    courses_completed,
    average_completion_rate,
    total_enrollments,
    active_enrollments,
    average_course_duration_hours,
    average_lessons_per_course
  )
  VALUES
  (daily_snapshot_id, 5, 420, 85.50, 6950, 5480, 12.5, 3.2),
  (weekly_snapshot_id, 5, 450, 86.20, 7200, 5700, 12.8, 3.3),
  (monthly_snapshot_id, 5, 480, 87.10, 7500, 5950, 13.0, 3.4)
  ON CONFLICT (snapshot_id) DO NOTHING;
  
  -- Content metrics
  INSERT INTO public.learning_analytics_content (snapshot_id, total_topics, average_topics_per_content)
  VALUES
  (daily_snapshot_id, 13, 1.8),
  (weekly_snapshot_id, 13, 1.9),
  (monthly_snapshot_id, 13, 2.0)
  ON CONFLICT (snapshot_id) DO NOTHING;
  
  -- Skills metrics
  INSERT INTO public.learning_analytics_skills (
    snapshot_id,
    total_skills_acquired,
    average_skills_per_competency,
    total_unique_learning_paths,
    average_skills_per_learning_path
  )
  VALUES
  (daily_snapshot_id, 450, 3.2, 25, 18.0),
  (weekly_snapshot_id, 480, 3.3, 28, 18.5),
  (monthly_snapshot_id, 520, 3.4, 30, 19.0)
  ON CONFLICT (snapshot_id) DO NOTHING;
  
  -- Assessments metrics
  INSERT INTO public.learning_analytics_assessments (
    snapshot_id,
    total_assessments,
    total_distinct_assessments,
    average_attempts_per_assessment,
    pass_rate,
    average_final_grade,
    average_passing_grade
  )
  VALUES
  (daily_snapshot_id, 1250, 15, 1.8, 78.50, 76.20, 70.00),
  (weekly_snapshot_id, 1350, 15, 1.9, 79.20, 77.10, 70.00),
  (monthly_snapshot_id, 1450, 15, 2.0, 80.00, 78.00, 70.00)
  ON CONFLICT (snapshot_id) DO NOTHING;
  
  -- Engagement metrics
  INSERT INTO public.learning_analytics_engagement (
    snapshot_id,
    average_feedback_rating,
    total_feedback_submissions,
    total_competitions,
    average_competition_score
  )
  VALUES
  (daily_snapshot_id, 4.65, 890, 15, 82.50),
  (weekly_snapshot_id, 4.68, 950, 18, 83.20),
  (monthly_snapshot_id, 4.70, 1020, 20, 84.00)
  ON CONFLICT (snapshot_id) DO NOTHING;
  
  -- ====================================================
  -- Learning Analytics Breakdown Tables
  -- ====================================================
  
  -- Competency level breakdown
  INSERT INTO public.learning_analytics_competency_level_breakdown (snapshot_id, level, learner_count)
  VALUES
  (daily_snapshot_id, 'beginner', 450),
  (daily_snapshot_id, 'intermediate', 380),
  (daily_snapshot_id, 'advanced', 150),
  (weekly_snapshot_id, 'beginner', 480),
  (weekly_snapshot_id, 'intermediate', 400),
  (weekly_snapshot_id, 'advanced', 170),
  (monthly_snapshot_id, 'beginner', 520),
  (monthly_snapshot_id, 'intermediate', 420),
  (monthly_snapshot_id, 'advanced', 210)
  ON CONFLICT DO NOTHING;
  
  -- Feedback rating breakdown
  INSERT INTO public.learning_analytics_feedback_rating_breakdown (snapshot_id, rating, count)
  VALUES
  (daily_snapshot_id, 5, 520),
  (daily_snapshot_id, 4, 280),
  (daily_snapshot_id, 3, 70),
  (daily_snapshot_id, 2, 15),
  (daily_snapshot_id, 1, 5),
  (weekly_snapshot_id, 5, 560),
  (weekly_snapshot_id, 4, 300),
  (weekly_snapshot_id, 3, 75),
  (weekly_snapshot_id, 2, 12),
  (weekly_snapshot_id, 1, 3),
  (monthly_snapshot_id, 5, 600),
  (monthly_snapshot_id, 4, 320),
  (monthly_snapshot_id, 3, 80),
  (monthly_snapshot_id, 2, 15),
  (monthly_snapshot_id, 1, 5)
  ON CONFLICT DO NOTHING;
  
  -- Course status breakdown
  INSERT INTO public.learning_analytics_course_status_breakdown (snapshot_id, status, count)
  VALUES
  (daily_snapshot_id, 'active', 5),
  (daily_snapshot_id, 'archived', 0),
  (daily_snapshot_id, 'deleted', 0),
  (weekly_snapshot_id, 'active', 5),
  (weekly_snapshot_id, 'archived', 0),
  (weekly_snapshot_id, 'deleted', 0),
  (monthly_snapshot_id, 'active', 5),
  (monthly_snapshot_id, 'archived', 0),
  (monthly_snapshot_id, 'deleted', 0)
  ON CONFLICT DO NOTHING;
  
  -- Skill demand
  INSERT INTO public.learning_analytics_skill_demand (snapshot_id, skill_id, skill_name, demand_count, rank_position)
  VALUES
  (daily_snapshot_id, 'DATA-CLEAN', 'Data Cleaning', 320, 1),
  (daily_snapshot_id, 'REACT', 'React Development', 280, 2),
  (daily_snapshot_id, 'COMM-SKILLS', 'Communication Skills', 250, 3),
  (daily_snapshot_id, 'PLANNING', 'Project Planning', 220, 4),
  (daily_snapshot_id, 'JS-ES6', 'JavaScript ES6+', 200, 5),
  (weekly_snapshot_id, 'DATA-CLEAN', 'Data Cleaning', 350, 1),
  (weekly_snapshot_id, 'REACT', 'React Development', 300, 2),
  (weekly_snapshot_id, 'COMM-SKILLS', 'Communication Skills', 270, 3),
  (weekly_snapshot_id, 'PLANNING', 'Project Planning', 240, 4),
  (weekly_snapshot_id, 'JS-ES6', 'JavaScript ES6+', 220, 5),
  (monthly_snapshot_id, 'DATA-CLEAN', 'Data Cleaning', 380, 1),
  (monthly_snapshot_id, 'REACT', 'React Development', 320, 2),
  (monthly_snapshot_id, 'COMM-SKILLS', 'Communication Skills', 290, 3),
  (monthly_snapshot_id, 'PLANNING', 'Project Planning', 260, 4),
  (monthly_snapshot_id, 'JS-ES6', 'JavaScript ES6+', 240, 5)
  ON CONFLICT DO NOTHING;
END $$;

-- ====================================================
-- Script Complete
-- ====================================================
-- All data inserted safely with ON CONFLICT DO NOTHING
-- No destructive operations performed
-- All constraints respected
-- Cross-table consistency maintained


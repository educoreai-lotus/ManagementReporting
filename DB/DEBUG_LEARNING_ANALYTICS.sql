-- 🔍 שאילתות לבדיקת בעיית Learning Analytics Summary
-- הרץ את השאילתות האלה ב-Supabase SQL Editor כדי לזהות את הבעיה

-- ============================================
-- שאילתה 1: בדיקת הנתונים הקיימים
-- ============================================
SELECT 
  '=== SNAPSHOTS ===' as section,
  s.id,
  s.snapshot_date,
  s.period,
  CASE 
    WHEN s.snapshot_date = CURRENT_DATE THEN '✅ Latest (today)'
    WHEN s.snapshot_date = CURRENT_DATE - INTERVAL '1 day' THEN '⚠️ Yesterday'
    WHEN s.snapshot_date > CURRENT_DATE - INTERVAL '7 days' THEN '⚠️ Last week'
    ELSE '❌ Old'
  END as date_status
FROM public.learning_analytics_snapshot s
ORDER BY s.snapshot_date DESC, s.id DESC
LIMIT 10;

-- ============================================
-- שאילתה 2: בדיקת התאמת snapshot_id
-- ============================================
SELECT 
  '=== SNAPSHOT ID MATCHING ===' as section,
  s.id as snapshot_id,
  s.snapshot_date,
  s.period,
  CASE WHEN l.snapshot_id IS NOT NULL THEN '✅' ELSE '❌' END as has_learners,
  CASE WHEN c.snapshot_id IS NOT NULL THEN '✅' ELSE '❌' END as has_courses,
  CASE WHEN s2.snapshot_id IS NOT NULL THEN '✅' ELSE '❌' END as has_skills,
  CASE WHEN e.snapshot_id IS NOT NULL THEN '✅' ELSE '❌' END as has_engagement,
  CASE 
    WHEN l.snapshot_id IS NULL AND c.snapshot_id IS NULL AND s2.snapshot_id IS NULL AND e.snapshot_id IS NULL
    THEN '❌ NO DATA'
    WHEN l.snapshot_id IS NULL OR c.snapshot_id IS NULL
    THEN '⚠️ PARTIAL'
    ELSE '✅ COMPLETE'
  END as data_completeness
FROM public.learning_analytics_snapshot s
LEFT JOIN public.learning_analytics_learners l ON l.snapshot_id = s.id
LEFT JOIN public.learning_analytics_courses c ON c.snapshot_id = s.id
LEFT JOIN public.learning_analytics_skills s2 ON s2.snapshot_id = s.id
LEFT JOIN public.learning_analytics_engagement e ON e.snapshot_id = s.id
ORDER BY s.snapshot_date DESC
LIMIT 5;

-- ============================================
-- שאילתה 3: השאילתה המדויקת מהקוד (מה שהבקאנד רואה)
-- ============================================
SELECT 
  s.id,
  s.snapshot_date,
  s.period,
  -- נתונים מ-learners
  l.total_learners,
  l.active_learners,
  l.total_organizations,
  -- נתונים מ-courses
  c.total_courses,
  c.courses_completed,
  c.average_completion_rate,
  c.total_enrollments,
  c.active_enrollments,
  c.average_course_duration_hours,
  -- נתונים מ-skills
  s2.total_skills_acquired,
  s2.average_skills_per_learning_path,
  -- נתונים מ-engagement
  e.average_feedback_rating,
  e.total_feedback_submissions,
  e.total_competitions,
  -- בדיקה: האם יש נתונים בכלל?
  CASE 
    WHEN l.total_learners IS NULL AND c.total_courses IS NULL AND s2.total_skills_acquired IS NULL AND e.average_feedback_rating IS NULL 
    THEN '❌ NO DATA - All NULL'
    WHEN l.total_learners IS NULL OR c.total_courses IS NULL 
    THEN '⚠️ PARTIAL DATA - Some NULL'
    ELSE '✅ HAS DATA'
  END as data_status
FROM public.learning_analytics_snapshot s
LEFT JOIN public.learning_analytics_learners l ON l.snapshot_id = s.id
LEFT JOIN public.learning_analytics_courses c ON c.snapshot_id = s.id
LEFT JOIN public.learning_analytics_skills s2 ON s2.snapshot_id = s.id
LEFT JOIN public.learning_analytics_engagement e ON e.snapshot_id = s.id
ORDER BY s.snapshot_date DESC, s.id DESC
LIMIT 10;

-- ============================================
-- שאילתה 4: חישוב ה-metrics כמו בקוד (מה שהגרף אמור לקבל)
-- ============================================
WITH latest_data AS (
  SELECT 
    s.id,
    s.snapshot_date,
    s.period,
    l.total_learners,
    l.active_learners,
    c.total_courses,
    c.courses_completed,
    c.average_course_duration_hours,
    c.active_enrollments,
    e.average_feedback_rating
  FROM public.learning_analytics_snapshot s
  LEFT JOIN public.learning_analytics_learners l ON l.snapshot_id = s.id
  LEFT JOIN public.learning_analytics_courses c ON c.snapshot_id = s.id
  LEFT JOIN public.learning_analytics_skills s2 ON s2.snapshot_id = s.id
  LEFT JOIN public.learning_analytics_engagement e ON e.snapshot_id = s.id
  WHERE l.total_learners IS NOT NULL 
     OR c.total_courses IS NOT NULL 
     OR s2.total_skills_acquired IS NOT NULL
     OR e.average_feedback_rating IS NOT NULL
  ORDER BY s.snapshot_date DESC, s.id DESC
  LIMIT 1
)
SELECT 
  '=== METRICS FOR CHART ===' as section,
  -- חישוב בדיוק כמו בקוד
  ROUND((COALESCE(average_course_duration_hours, 0) * COALESCE(total_courses, 0))::numeric, 2) as totalLearningHours,
  ROUND(
    CASE 
      WHEN COALESCE(total_learners, 0) > 0 
      THEN ((COALESCE(average_course_duration_hours, 0) * COALESCE(total_courses, 0)) / total_learners)::numeric
      ELSE 0 
    END, 2
  ) as averageLearningHoursPerUser,
  ROUND(
    CASE 
      WHEN COALESCE(total_learners, 0) > 0 
      THEN ((COALESCE(active_learners, 0)::numeric / total_learners) * 100)
      ELSE 0 
    END, 2
  ) as platformUsageRate,
  ROUND((COALESCE(average_feedback_rating, 0) * 20)::numeric, 2) as userSatisfactionScore,
  COALESCE(active_enrollments, 0) as activeLearningSessions,
  ROUND(
    CASE 
      WHEN COALESCE(total_courses, 0) > 0 AND COALESCE(courses_completed, 0) > 0
      THEN ((COALESCE(courses_completed, 0)::numeric / total_courses) * 100)
      ELSE 0 
    END, 2
  ) as learningROI,
  -- בדיקה: האם כל הערכים 0?
  CASE 
    WHEN (COALESCE(average_course_duration_hours, 0) * COALESCE(total_courses, 0)) = 0
     AND COALESCE(active_enrollments, 0) = 0
     AND COALESCE(average_feedback_rating, 0) = 0
    THEN '❌ ALL ZEROS - Chart will be empty'
    ELSE '✅ HAS VALUES'
  END as chart_status
FROM latest_data;

-- ============================================
-- שאילתה 5: שאילתה מקיפה - הכל בבת אחת
-- ============================================
SELECT 
  s.id,
  s.snapshot_date,
  s.period,
  l.total_learners,
  c.total_courses,
  c.active_enrollments,
  e.average_feedback_rating,
  -- Metrics
  ROUND((COALESCE(c.average_course_duration_hours, 0) * COALESCE(c.total_courses, 0))::numeric, 2) as totalLearningHours,
  ROUND(
    CASE WHEN COALESCE(l.total_learners, 0) > 0 
    THEN ((COALESCE(l.active_learners, 0)::numeric / l.total_learners) * 100)
    ELSE 0 END, 2
  ) as platformUsageRate,
  ROUND((COALESCE(e.average_feedback_rating, 0) * 20)::numeric, 2) as userSatisfactionScore,
  COALESCE(c.active_enrollments, 0) as activeLearningSessions,
  ROUND(
    CASE WHEN COALESCE(c.total_courses, 0) > 0 AND COALESCE(c.courses_completed, 0) > 0
    THEN ((COALESCE(c.courses_completed, 0)::numeric / c.total_courses) * 100)
    ELSE 0 END, 2
  ) as learningROI
FROM public.learning_analytics_snapshot s
LEFT JOIN public.learning_analytics_learners l ON l.snapshot_id = s.id
LEFT JOIN public.learning_analytics_courses c ON c.snapshot_id = s.id
LEFT JOIN public.learning_analytics_engagement e ON e.snapshot_id = s.id
ORDER BY s.snapshot_date DESC, s.id DESC
LIMIT 1;


-- Quick check: Verify if seed data exists
-- Run this in Supabase SQL Editor to check current state

-- 1. Check if sentinel course exists (indicates seed was applied)
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.courses WHERE course_id = 'COURSE-001') 
    THEN '✅ Seed was applied (COURSE-001 exists)'
    ELSE '❌ Seed NOT applied (COURSE-001 missing)'
  END as seed_status;

-- 2. Count records in each table
SELECT 'courses' as table_name, COUNT(*) as record_count FROM public.courses
UNION ALL
SELECT 'topics', COUNT(*) FROM public.topics
UNION ALL
SELECT 'contents', COUNT(*) FROM public.contents
UNION ALL
SELECT 'directory_cache', COUNT(*) FROM public.directory_cache
UNION ALL
SELECT 'course_builder_cache', COUNT(*) FROM public.course_builder_cache
UNION ALL
SELECT 'assessments_cache', COUNT(*) FROM public.assessments_cache
UNION ALL
SELECT 'learning_analytics_snapshot', COUNT(*) FROM public.learning_analytics_snapshot
ORDER BY table_name;

-- 3. Sample data check
SELECT 'Sample courses:' as info;
SELECT course_id, course_name FROM public.courses LIMIT 5;

SELECT 'Sample assessments:' as info;
SELECT snapshot_date, user_id, course_id, exam_type, final_grade, passed 
FROM public.assessments_cache 
ORDER BY snapshot_date DESC 
LIMIT 10;


-- ====================================================
-- מחיקת כל הנתונים מהטבלאות
-- חוץ מ-ai_chart_transcriptions ו-ai_report_conclusions
-- ====================================================

-- מחיקת נתונים מטבלאות Cache
TRUNCATE TABLE public.course_builder_cache CASCADE;
TRUNCATE TABLE public.assessments_cache CASCADE;
TRUNCATE TABLE public.directory_cache CASCADE;

-- מחיקת נתונים מטבלאות Learning Analytics
-- (TRUNCATE על learning_analytics_snapshot ימחק אוטומטית את כל הטבלאות הקשורות בגלל CASCADE)
TRUNCATE TABLE public.learning_analytics_snapshot CASCADE;

-- טבלאות Courses וקשורות
TRUNCATE TABLE public.courses CASCADE;

-- ====================================================
-- בדיקה: כמה שורות נשארו בכל טבלה
-- ====================================================
SELECT 
  'course_builder_cache' as table_name,
  COUNT(*) as row_count
FROM public.course_builder_cache
UNION ALL
SELECT 
  'assessments_cache',
  COUNT(*)
FROM public.assessments_cache
UNION ALL
SELECT 
  'directory_cache',
  COUNT(*)
FROM public.directory_cache
UNION ALL
SELECT 
  'learning_analytics_snapshot',
  COUNT(*)
FROM public.learning_analytics_snapshot
UNION ALL
SELECT 
  'courses',
  COUNT(*)
FROM public.courses
UNION ALL
SELECT 
  'ai_chart_transcriptions (KEPT)',
  COUNT(*)
FROM public.ai_chart_transcriptions
UNION ALL
SELECT 
  'ai_report_conclusions (KEPT)',
  COUNT(*)
FROM public.ai_report_conclusions;


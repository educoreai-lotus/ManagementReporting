-- 🔍 שאילתות לבדיקת בעיית Organization Directory Overview
-- הרץ את השאילתות האלה ב-Supabase SQL Editor כדי לזהות את הבעיה

-- ============================================
-- שאילתה 1: בדיקת הנתונים הקיימים
-- ============================================
SELECT 
  '=== DIRECTORY CACHE DATA ===' as section,
  company_id,
  company_name,
  snapshot_date,
  verification_status,
  company_size,
  CASE 
    WHEN snapshot_date = CURRENT_DATE THEN '✅ Latest (today)'
    WHEN snapshot_date = CURRENT_DATE - INTERVAL '1 day' THEN '⚠️ Yesterday'
    WHEN snapshot_date > CURRENT_DATE - INTERVAL '7 days' THEN '⚠️ Last week'
    ELSE '❌ Old'
  END as date_status,
  CASE WHEN hierarchy IS NOT NULL THEN '✅' ELSE '❌' END as has_hierarchy,
  CASE WHEN kpis IS NOT NULL THEN '✅' ELSE '❌' END as has_kpis
FROM public.directory_cache
ORDER BY snapshot_date DESC, ingested_at DESC
LIMIT 10;

-- ============================================
-- שאילתה 2: השאילתה המדויקת מהקוד (מה שהבקאנד רואה)
-- ============================================
SELECT DISTINCT ON (company_id) 
  company_id,
  company_name,
  snapshot_date,
  verification_status,
  company_size,
  hierarchy,
  kpis,
  ingested_at
FROM public.directory_cache
WHERE snapshot_date >= COALESCE(
  (SELECT MAX(snapshot_date) - INTERVAL '30 days' FROM public.directory_cache),
  CURRENT_DATE - INTERVAL '30 days'
)
ORDER BY company_id, snapshot_date DESC, ingested_at DESC;

-- ============================================
-- שאילתה 3: חישוב ה-metrics כמו בקוד
-- ============================================
WITH directory_data AS (
  SELECT DISTINCT ON (company_id) 
    company_id,
    company_name,
    snapshot_date,
    verification_status,
    company_size,
    hierarchy,
    kpis
  FROM public.directory_cache
  WHERE snapshot_date >= COALESCE(
    (SELECT MAX(snapshot_date) - INTERVAL '30 days' FROM public.directory_cache),
    CURRENT_DATE - INTERVAL '30 days'
  )
  ORDER BY company_id, snapshot_date DESC, ingested_at DESC
)
SELECT 
  '=== CALCULATED METRICS ===' as section,
  COUNT(*) as totalOrganizations,
  COUNT(CASE WHEN verification_status = 'verified' THEN 1 END) as organizationsActive,
  -- Note: totalUsers and activeUsers require parsing hierarchy/kpis JSON
  -- This query shows the raw data that will be used for calculations
  jsonb_array_length(COALESCE(hierarchy->'departments', '[]'::jsonb)) as departments_count,
  (kpis->>'active_users')::int as active_users_from_kpis
FROM directory_data;

-- ============================================
-- שאילתה 4: בדיקת התפלגות verification_status
-- ============================================
SELECT 
  verification_status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM (
  SELECT DISTINCT ON (company_id) 
    verification_status
  FROM public.directory_cache
  WHERE snapshot_date >= COALESCE(
    (SELECT MAX(snapshot_date) - INTERVAL '30 days' FROM public.directory_cache),
    CURRENT_DATE - INTERVAL '30 days'
  )
  ORDER BY company_id, snapshot_date DESC, ingested_at DESC
) sub
GROUP BY verification_status;

-- ============================================
-- שאילתה 5: בדיקת hierarchy structure (דוגמה)
-- ============================================
SELECT 
  company_id,
  company_name,
  hierarchy,
  CASE 
    WHEN hierarchy IS NULL THEN '❌ No hierarchy'
    WHEN hierarchy->'departments' IS NULL THEN '⚠️ No departments'
    WHEN jsonb_array_length(COALESCE(hierarchy->'departments', '[]'::jsonb)) = 0 THEN '⚠️ Empty departments'
    ELSE '✅ Has departments'
  END as hierarchy_status
FROM (
  SELECT DISTINCT ON (company_id) 
    company_id,
    company_name,
    hierarchy
  FROM public.directory_cache
  WHERE snapshot_date >= COALESCE(
    (SELECT MAX(snapshot_date) - INTERVAL '30 days' FROM public.directory_cache),
    CURRENT_DATE - INTERVAL '30 days'
  )
  ORDER BY company_id, snapshot_date DESC, ingested_at DESC
  LIMIT 5
) sub;


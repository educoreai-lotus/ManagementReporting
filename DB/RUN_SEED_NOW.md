# 🚀 הרצת Seed עכשיו - הוראות מהירות

## הבעיה
ה-seed רץ רק ב-startup. אם האפליקציה כבר רצה לפני שהקוד נדחף, ה-seed לא רץ אוטומטית.

## פתרון: הרצה ידנית

### אופציה 1: Supabase SQL Editor (הכי קל) ⭐

1. **פתח Supabase Dashboard**
   - לך ל-SQL Editor

2. **העתק את התוכן של `DB/seed_mock_data.sql`**
   - פתח את הקובץ
   - העתק הכל (Ctrl+A, Ctrl+C)

3. **הדבק ב-SQL Editor והרץ**
   - הדבק (Ctrl+V)
   - לחץ Run או Ctrl+Enter

4. **אימות**
   - הרץ את `DB/QUICK_SEED_CHECK.sql` כדי לבדוק שהנתונים נטענו

---

### אופציה 2: psql (מהטרמינל)

```bash
# Windows PowerShell
$env:DATABASE_URL = "postgresql://user:password@host:port/database"
psql $env:DATABASE_URL -f DB/seed_mock_data.sql

# Linux/Mac
export DATABASE_URL="postgresql://user:password@host:port/database"
psql "$DATABASE_URL" -f DB/seed_mock_data.sql
```

---

### אופציה 3: Node.js Script (אם יש לך גישה לשרת)

```bash
node backend/scripts/runSeedManually.js
```

---

## אימות שהנתונים נטענו

הרץ את `DB/QUICK_SEED_CHECK.sql` ב-Supabase SQL Editor:

```sql
-- בדוק אם COURSE-001 קיים
SELECT course_id, course_name FROM public.courses WHERE course_id = 'COURSE-001';

-- ספור רשומות בכל טבלה
SELECT 'assessments_cache' as table_name, COUNT(*) as count FROM public.assessments_cache
UNION ALL
SELECT 'courses', COUNT(*) FROM public.courses
UNION ALL
SELECT 'topics', COUNT(*) FROM public.topics;
```

**צפוי לראות:**
- `COURSE-001` קיים
- לפחות 25 רשומות ב-`assessments_cache`
- 5 קורסים ב-`courses`
- 13 נושאים ב-`topics`

---

## למה זה קרה?

1. הקוד נדחף ל-GitHub
2. האפליקציה כבר רצה (לא restart)
3. ה-seed רץ רק ב-startup
4. לכן הוא לא רץ אוטומטית

**בהמשך:** כל deploy חדש יריץ את ה-seed אוטומטית (אם `COURSE-001` לא קיים).

---

## אם יש שגיאות

אם יש שגיאות ב-SQL:
1. בדוק שהטבלאות קיימות (run migration first)
2. בדוק שה-constraints נכונים
3. ה-seed משתמש ב-`ON CONFLICT DO NOTHING` - בטוח להריץ שוב


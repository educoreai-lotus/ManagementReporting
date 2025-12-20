# 🔍 למה הגרפים לא מתעדכנים אחרי הרצת Seed?

## הבעיה

אחרי הרצה ידנית של `DB/seed_mock_data.sql` ב-Supabase SQL Editor, הנתונים התווספו לטבלאות אבל הגרפים לא התעדכנו.

## הסיבה

הבקאנד קורא נתונים מה-DB אבל **בוחר רק את ה-snapshot האחרון** לפי `MAX(snapshot_date)`.

### איך הבקאנד קורא נתונים:

**קובץ:** `backend/src/infrastructure/repositories/DatabaseAnalyticsRepository.js`

```javascript
// Assessments
async fetchAssessmentData() {
  const { rows } = await this.pool.query(`
    SELECT *
    FROM public.assessments_cache
    WHERE snapshot_date = (
      SELECT MAX(snapshot_date) FROM public.assessments_cache
    )
  `);
  // ...
}

// Directory
async fetchDirectoryData() {
  const { rows } = await this.pool.query(`
    SELECT *
    FROM public.directory_cache
    WHERE snapshot_date = (
      SELECT MAX(snapshot_date) FROM public.directory_cache
    )
  `);
  // ...
}
```

### מה קורה ב-Seed:

ה-seed מוסיף נתונים עם תאריכים **בעבר** (15, 10, 5 ימים אחורה):

```sql
-- Assessments
(CURRENT_DATE - INTERVAL '15 days', 'USER-001', 'COURSE-001', ...),
(CURRENT_DATE - INTERVAL '10 days', 'USER-001', 'COURSE-001', ...),
(CURRENT_DATE - INTERVAL '5 days', 'USER-002', 'COURSE-001', ...),
```

**אם יש כבר נתונים עם תאריך יותר חדש ב-DB**, הבקאנד יקרא אותם ולא את הנתונים מה-seed!

---

## פתרונות

### פתרון 1: עדכן את ה-Seed עם תאריכים עדכניים (מומלץ) ⭐

עדכן את `DB/seed_mock_data.sql` להשתמש ב-`CURRENT_DATE` במקום תאריכים בעבר:

```sql
-- במקום:
(CURRENT_DATE - INTERVAL '15 days', ...)

-- שנה ל:
(CURRENT_DATE, ...)
```

**יתרונות:**
- הנתונים יהיו ה-snapshot האחרון
- הגרפים יתעדכנו מיד
- לא צריך לעשות refresh

---

### פתרון 2: מחק נתונים ישנים לפני הרצת Seed

אם יש נתונים ישנים ב-DB, מחק אותם לפני הרצת ה-seed:

```sql
-- ב-Supabase SQL Editor, הרץ לפני seed_mock_data.sql:
DELETE FROM public.assessments_cache;
DELETE FROM public.course_builder_cache;
DELETE FROM public.directory_cache;
DELETE FROM public.learning_analytics_snapshot;
```

**⚠️ אזהרה:** זה ימחק את כל הנתונים הקיימים!

---

### פתרון 3: הרץ "Refresh Data" בחזית

1. פתח את הדשבורד
2. לחץ על כפתור **"Refresh Data"**
3. זה יקרא נתונים מחדש מה-DB

**יתרונות:**
- לא צריך לשנות את ה-seed
- בטוח (לא מוחק נתונים)

**חסרונות:**
- צריך לעשות refresh ידנית
- אם יש נתונים חדשים יותר, הם עדיין יקראו

---

### פתרון 4: עדכן את ה-Seed להשתמש ב-CURRENT_DATE

**הקובץ:** `DB/seed_mock_data.sql`

**שינוי נדרש:**
- החלף את כל `CURRENT_DATE - INTERVAL 'X days'` ל-`CURRENT_DATE`
- זה יבטיח שהנתונים יהיו ה-snapshot האחרון

**דוגמה:**

```sql
-- לפני:
INSERT INTO public.assessments_cache (...) VALUES
(CURRENT_DATE - INTERVAL '15 days', 'USER-001', 'COURSE-001', ...),
(CURRENT_DATE - INTERVAL '10 days', 'USER-001', 'COURSE-001', ...),
(CURRENT_DATE - INTERVAL '5 days', 'USER-002', 'COURSE-001', ...);

-- אחרי:
INSERT INTO public.assessments_cache (...) VALUES
(CURRENT_DATE, 'USER-001', 'COURSE-001', ...),
(CURRENT_DATE, 'USER-002', 'COURSE-001', ...),
(CURRENT_DATE, 'USER-003', 'COURSE-001', ...);
```

---

## אימות

לאחר עדכון ה-seed, בדוק:

```sql
-- בדוק מה ה-snapshot_date האחרון
SELECT MAX(snapshot_date) as latest_date, COUNT(*) as count
FROM public.assessments_cache;

-- צריך להחזיר: latest_date = היום, count > 0
```

---

## המלצה

**עדכן את `DB/seed_mock_data.sql` להשתמש ב-`CURRENT_DATE`** במקום תאריכים בעבר. זה יבטיח שהנתונים יהיו ה-snapshot האחרון והגרפים יתעדכנו מיד.


# 🔄 אסטרטגיית עדכון Seed - האם ייווצרו כפילויות?

## תשובה קצרה

**לא, לא ייווצרו כפילויות**, אבל **גם לא יתעדכנו נתונים קיימים**.

ה-seed משתמש ב-`ON CONFLICT DO NOTHING` - זה אומר:
- ✅ אם הרשומה **לא קיימת** → תתווסף
- ❌ אם הרשומה **כבר קיימת** → **לא תתווסף ולא תתעדכן** (פשוט מדלג)

---

## Primary Keys של הטבלאות

### 1. `assessments_cache`
**Primary Key:** `(snapshot_date, user_id, course_id, exam_type, attempt_no)`

**מה יקרה:**
- אם יש כבר רשומה עם אותו `snapshot_date` + `user_id` + `course_id` + `exam_type` + `attempt_no` → **לא תתווסף**
- אם אין → תתווסף

**דוגמה:**
```sql
-- אם יש כבר:
(CURRENT_DATE, 'USER-001', 'COURSE-001', 'precourse', 1, ...)

-- והסקריפט מנסה להוסיף:
(CURRENT_DATE, 'USER-001', 'COURSE-001', 'precourse', 1, ...)

-- התוצאה: לא תתווסף (ON CONFLICT DO NOTHING)
```

---

### 2. `course_builder_cache`
**Primary Key:** `(snapshot_date, course_id)`

**מה יקרה:**
- אם יש כבר snapshot עם אותו `snapshot_date` + `course_id` → **לא תתווסף**
- אם אין → תתווסף

**דוגמה:**
```sql
-- אם יש כבר:
(CURRENT_DATE, 'COURSE-001', ...)

-- והסקריפט מנסה להוסיף:
(CURRENT_DATE, 'COURSE-001', ...)

-- התוצאה: לא תתווסף
```

---

### 3. `directory_cache`
**Primary Key:** `(snapshot_date, company_id)`

**מה יקרה:**
- אם יש כבר snapshot עם אותו `snapshot_date` + `company_id` → **לא תתווסף**
- אם אין → תתווסף

---

### 4. `learning_analytics_snapshot`
**Primary Key:** `id` (BIGSERIAL - auto-increment)

**מה יקרה:**
- תמיד תתווסף רשומה חדשה (כי ה-ID תמיד חדש)
- **⚠️ זה יכול ליצור כפילויות!**

---

## הבעיה העיקרית

### אם יש כבר נתונים עם `CURRENT_DATE`:

1. **`assessments_cache`** - לא יתווספו נתונים חדשים (כי כבר יש עם אותו primary key)
2. **`course_builder_cache`** - לא יתווספו נתונים חדשים
3. **`directory_cache`** - לא יתווספו נתונים חדשים
4. **`learning_analytics_snapshot`** - **ייווצרו כפילויות!** (כי אין UNIQUE constraint על snapshot_date + period)

---

## פתרונות

### פתרון 1: מחק נתונים ישנים לפני הרצת Seed (מומלץ) ⭐

```sql
-- ב-Supabase SQL Editor, הרץ לפני seed_mock_data.sql:

-- מחק נתונים ישנים (רק אם snapshot_date < CURRENT_DATE)
DELETE FROM public.assessments_cache WHERE snapshot_date < CURRENT_DATE;
DELETE FROM public.course_builder_cache WHERE snapshot_date < CURRENT_DATE;
DELETE FROM public.directory_cache WHERE snapshot_date < CURRENT_DATE;

-- מחק את כל ה-snapshots הישנים של learning_analytics
DELETE FROM public.learning_analytics_snapshot WHERE snapshot_date < CURRENT_DATE;
```

**יתרונות:**
- מבטיח שהנתונים החדשים יתווספו
- לא ייווצרו כפילויות
- הגרפים יתעדכנו מיד

---

### פתרון 2: עדכן את ה-Seed להשתמש ב-UPSERT

**שינוי נדרש ב-`DB/seed_mock_data.sql`:**

```sql
-- במקום:
ON CONFLICT (snapshot_date, course_id) DO NOTHING;

-- שנה ל:
ON CONFLICT (snapshot_date, course_id) DO UPDATE SET
  course_name = EXCLUDED.course_name,
  "totalEnrollments" = EXCLUDED."totalEnrollments",
  "activeEnrollment" = EXCLUDED."activeEnrollment",
  "completionRate" = EXCLUDED."completionRate",
  "averageRating" = EXCLUDED."averageRating",
  feedback = EXCLUDED.feedback;
```

**יתרונות:**
- עדכן נתונים קיימים במקום לדלג
- לא ייווצרו כפילויות
- הגרפים יתעדכנו מיד

**חסרונות:**
- צריך לעדכן את כל הטבלאות
- יותר מורכב

---

### פתרון 3: מחק הכל לפני Seed (פשוט אבל מסוכן)

```sql
-- ⚠️ אזהרה: זה ימחק את כל הנתונים!
TRUNCATE TABLE public.assessments_cache CASCADE;
TRUNCATE TABLE public.course_builder_cache CASCADE;
TRUNCATE TABLE public.directory_cache CASCADE;
TRUNCATE TABLE public.learning_analytics_snapshot CASCADE;
```

**יתרונות:**
- פשוט
- מבטיח שהנתונים החדשים יתווספו

**חסרונות:**
- **מסוכן** - מוחק את כל הנתונים!
- לא מתאים ל-production

---

## המלצה

**לפני הרצת Seed המעודכן:**

1. **בדוק מה יש ב-DB:**
   ```sql
   SELECT MAX(snapshot_date) as latest_date, COUNT(*) as count
   FROM public.assessments_cache;
   
   SELECT MAX(snapshot_date) as latest_date, COUNT(*) as count
   FROM public.course_builder_cache;
   ```

2. **אם יש נתונים עם `CURRENT_DATE`:**
   - מחק אותם (פתרון 1)
   - או עדכן את ה-seed ל-UPSERT (פתרון 2)

3. **אם אין נתונים עם `CURRENT_DATE`:**
   - פשוט הרץ את ה-seed - הוא יתווסף ללא בעיות

---

## סיכום

| טבלה | Primary Key | האם ייווצרו כפילויות? | האם יתעדכנו נתונים קיימים? |
|------|-------------|------------------------|---------------------------|
| `assessments_cache` | `(snapshot_date, user_id, course_id, exam_type, attempt_no)` | ❌ לא | ❌ לא (DO NOTHING) |
| `course_builder_cache` | `(snapshot_date, course_id)` | ❌ לא | ❌ לא (DO NOTHING) |
| `directory_cache` | `(snapshot_date, company_id)` | ❌ לא | ❌ לא (DO NOTHING) |
| `learning_analytics_snapshot` | `id` (auto-increment) | ⚠️ **כן!** | ❌ לא |

**המלצה:** מחק נתונים ישנים לפני הרצת Seed, או עדכן את ה-Seed ל-UPSERT.


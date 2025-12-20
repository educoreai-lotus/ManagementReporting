# 📊 אסטרטגיית קריאת נתונים לגרפים

## מה שונה?

**לפני:** הגרפים קראו רק את ה-snapshot האחרון (`MAX(snapshot_date)`)

**אחרי:** הגרפים קוראים את **כל הנתונים הייחודיים** מהתאריך האחרון + 30 ימים אחורה

---

## איך זה עובד?

### 1. `assessments_cache`

**לפני:**
```sql
SELECT * FROM assessments_cache
WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM assessments_cache)
```

**אחרי:**
```sql
SELECT DISTINCT ON (user_id, course_id, exam_type, attempt_no) *
FROM assessments_cache
WHERE snapshot_date >= (MAX(snapshot_date) - 30 days)
ORDER BY user_id, course_id, exam_type, attempt_no, snapshot_date DESC
```

**מה זה אומר:**
- קורא את כל הנתונים מהתאריך האחרון + 30 ימים אחורה
- לכל `(user_id, course_id, exam_type, attempt_no)` לוקח את הרשומה האחרונה
- כך הגרפים יציגו את כל המשתמשים/קורסים, לא רק את אלה מה-snapshot האחרון

---

### 2. `course_builder_cache`

**לפני:**
```sql
SELECT * FROM course_builder_cache
WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM course_builder_cache)
```

**אחרי:**
```sql
SELECT DISTINCT ON (course_id) *
FROM course_builder_cache
WHERE snapshot_date >= (MAX(snapshot_date) - 30 days)
ORDER BY course_id, snapshot_date DESC
```

**מה זה אומר:**
- קורא את כל הקורסים מהתאריך האחרון + 30 ימים אחורה
- לכל `course_id` לוקח את הרשומה האחרונה
- כך הגרפים יציגו את כל הקורסים, לא רק את אלה מה-snapshot האחרון

---

### 3. `directory_cache`

**לפני:**
```sql
SELECT * FROM directory_cache
WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM directory_cache)
```

**אחרי:**
```sql
SELECT DISTINCT ON (company_id) *
FROM directory_cache
WHERE snapshot_date >= (MAX(snapshot_date) - 30 days)
ORDER BY company_id, snapshot_date DESC
```

**מה זה אומר:**
- קורא את כל הארגונים מהתאריך האחרון + 30 ימים אחורה
- לכל `company_id` לוקח את הרשומה האחרונה
- כך הגרפים יציגו את כל הארגונים, לא רק את אלה מה-snapshot האחרון

---

## יתרונות

1. **גרפים מלאים יותר** - מציגים את כל הנתונים הזמינים, לא רק מה-snapshot האחרון
2. **לא תלוי בתאריך** - גם אם יש נתונים ישנים, הם יוצגו
3. **גמישות** - אם יש נתונים מ-30 ימים אחורה, הם יוצגו
4. **אין צורך בעדכון seed** - הנתונים הקיימים יוצגו אוטומטית

---

## חסרונות

1. **יכול להיות איטי יותר** - אם יש הרבה נתונים (אבל 30 ימים זה סביר)
2. **יכול להציג נתונים ישנים** - אם יש נתונים מ-30 ימים אחורה, הם יוצגו

---

## איך לבדוק?

לאחר השינוי, הגרפים אמורים להציג:
- **כל המשתמשים** שיש להם assessments (לא רק מה-snapshot האחרון)
- **כל הקורסים** שיש להם נתונים (לא רק מה-snapshot האחרון)
- **כל הארגונים** שיש להם נתונים (לא רק מה-snapshot האחרון)

---

## אם רוצים לשנות את טווח התאריכים

אם רוצים לקרוא נתונים מ-60 ימים אחורה במקום 30:

```javascript
// שנה את זה:
MAX(snapshot_date) - INTERVAL '30 days'

// ל:
MAX(snapshot_date) - INTERVAL '60 days'
```

או אם רוצים לקרוא את **כל הנתונים** (ללא הגבלת תאריך):

```javascript
// הסר את ה-WHERE clause:
SELECT DISTINCT ON (user_id, course_id, exam_type, attempt_no) *
FROM assessments_cache
ORDER BY user_id, course_id, exam_type, attempt_no, snapshot_date DESC
```

---

## סיכום

השינוי מבטיח שהגרפים יציגו את **כל הנתונים הזמינים** מהתאריך האחרון + 30 ימים אחורה, ולא רק את הנתונים מה-snapshot האחרון. זה אומר שגם אם יש נתונים ישנים יותר, הם יוצגו בגרפים.


# 📊 מקור המידע המדויק של הגרף "Users per Organization"

## 🎯 סיכום מהיר

הגרף נבנה **רק** משני שדות מטבלת `directory_cache`:
1. **`company_name`** - שם הארגון (זה מה שמוצג ב-X-axis)
2. **`company_size`** - גודל החברה (string) שמתורגם למספר משתמשים משוער

---

## 📋 מקור המידע המדויק

### **1. טבלת Database:**
```
public.directory_cache
```

### **2. השדות הרלוונטיים:**

#### **שדה 1: `company_name` (TEXT)**
- **מה זה:** שם הארגון
- **איך משתמשים בו:** זה ה-`organization` name שמוצג בגרף
- **דוגמה:** `'TechCorp Solutions'`, `'Global Learning Inc'`

#### **שדה 2: `company_size` (TEXT)**
- **מה זה:** גודל החברה כטקסט
- **איך משתמשים בו:** מעבירים דרך `estimateUsersByCompanySize()` לקבלת מספר משתמשים משוער
- **ערכים אפשריים:**
  - `'1-10'` → 8 משתמשים
  - `'10-50'` → 30 משתמשים
  - `'50-200'` → 125 משתמשים
  - `'200-500'` → 350 משתמשים
  - `'500+'` → 650 משתמשים
  - `null` או ערך לא מוכר → 50 משתמשים (default)

---

## 🔄 תהליך העיבוד המדויק

### **שלב 1: שאילתת SQL**
```sql
SELECT DISTINCT ON (company_id) *
FROM public.directory_cache
WHERE snapshot_date >= COALESCE(
  (SELECT MAX(snapshot_date) - INTERVAL '30 days' FROM public.directory_cache),
  CURRENT_DATE - INTERVAL '30 days'
)
ORDER BY company_id, snapshot_date DESC, ingested_at DESC
```

**מה השאילתה מחזירה:**
- כל שורה מכילה: `company_id`, `company_name`, `company_size`, `snapshot_date`, ועוד שדות...
- **רק השורה האחרונה** לכל `company_id` (בגלל `DISTINCT ON`)

### **שלב 2: חישוב מספר משתמשים לכל ארגון**

```javascript
// לכל שורה ב-rows:
for (const row of rows) {
  const companyKey = row.company_name || row.company_id;  // ← שם הארגון
  
  // חישוב מספר משתמשים מ-company_size
  const userCount = this.estimateUsersByCompanySize(row.company_size);  // ← גודל החברה
  
  orgUserMap.set(companyKey, userCount);
}
```

**דוגמה:**
```javascript
// שורה 1:
row.company_name = 'TechCorp Solutions'
row.company_size = '200-500'
→ estimateUsersByCompanySize('200-500') = 350
→ orgUserMap.set('TechCorp Solutions', 350)

// שורה 2:
row.company_name = 'Global Learning Inc'
row.company_size = '50-200'
→ estimateUsersByCompanySize('50-200') = 125
→ orgUserMap.set('Global Learning Inc', 125)
```

### **שלב 3: בניית Details Object**

```javascript
const details = {
  users: Array.from(orgUserMap.entries()).map(([organization, count]) => ({
    organization,  // ← company_name מה-DB
    count          // ← תוצאה של estimateUsersByCompanySize(company_size)
  }))
};
```

**תוצאה:**
```javascript
details.users = [
  { organization: 'TechCorp Solutions', count: 350 },
  { organization: 'Global Learning Inc', count: 125 },
  { organization: 'InnovateNow Ltd', count: 30 }
]
```

### **שלב 4: יצירת הגרף**

```javascript
// ב-GetCombinedAnalyticsUseCase.js
const usersPerOrg = this.getDataDetails(directoryData, 'users');
// usersPerOrg = [{ organization: '...', count: ... }, ...]

const chartData = usersPerOrg
  .map(({ organization, count }) => ({
    name: organization,   // ← company_name מה-DB
    value: count          // ← תוצאה של estimateUsersByCompanySize(company_size)
  }))
  .sort((a, b) => b.value - a.value)
  .filter(item => item.value > 0);
```

---

## ⚠️ נקודות חשובות

### 1. **זה לא מספר משתמשים אמיתי!**
- הגרף **לא** סופר משתמשים אמיתיים מה-`hierarchy` או מטבלאות אחרות
- זה **הערכה** בלבד לפי `company_size`
- אם `company_size = '200-500'` → תמיד יראה 350 משתמשים (לא משנה כמה משתמשים באמת יש)

### 2. **הנתונים הם משוערים (Estimated)**
```javascript
estimateUsersByCompanySize('200-500')  // תמיד מחזיר 350
estimateUsersByCompanySize('50-200')   // תמיד מחזיר 125
```
- זה לא מספר מדויק של משתמשים
- זה מיפוי קבוע של `company_size` → מספר משתמשים

### 3. **רק מ-30 הימים האחרונים**
- השאילתה מסננת רק נתונים מ-30 הימים האחרונים
- אם יש כמה snapshots לאותו ארגון, לוקחים רק את האחרון (`DISTINCT ON`)

### 4. **שם הארגון = company_name**
- אם `company_name` לא קיים, משתמשים ב-`company_id` כ-fallback
- בגרף מוצג ה-`organization` name (שזה ה-`company_name`)

---

## 📊 דוגמה מלאה

### **נתונים ב-DB (`directory_cache`):**

| company_id | company_name | company_size | snapshot_date |
|------------|--------------|--------------|---------------|
| ORG-001 | TechCorp Solutions | '200-500' | 2025-01-19 |
| ORG-002 | Global Learning Inc | '50-200' | 2025-01-19 |
| ORG-003 | InnovateNow Ltd | '10-50' | 2025-01-18 |

### **תהליך העיבוד:**

```javascript
// שורה 1:
company_name = 'TechCorp Solutions'
company_size = '200-500'
→ estimateUsersByCompanySize('200-500') = 350
→ { organization: 'TechCorp Solutions', count: 350 }

// שורה 2:
company_name = 'Global Learning Inc'
company_size = '50-200'
→ estimateUsersByCompanySize('50-200') = 125
→ { organization: 'Global Learning Inc', count: 125 }

// שורה 3:
company_name = 'InnovateNow Ltd'
company_size = '10-50'
→ estimateUsersByCompanySize('10-50') = 30
→ { organization: 'InnovateNow Ltd', count: 30 }
```

### **תוצאה בגרף:**

```javascript
[
  { name: 'TechCorp Solutions', value: 350 },
  { name: 'Global Learning Inc', value: 125 },
  { name: 'InnovateNow Ltd', value: 30 }
]
```

---

## 🔍 שאילתת בדיקה

אם אתה רוצה לראות בדיוק איזה נתונים יש ב-DB:

```sql
SELECT 
  company_id,
  company_name,
  company_size,
  snapshot_date,
  -- מה זה יתרגם למספר משתמשים:
  CASE 
    WHEN company_size = '1-10' THEN 8
    WHEN company_size = '10-50' THEN 30
    WHEN company_size = '50-200' THEN 125
    WHEN company_size = '200-500' THEN 350
    WHEN company_size = '500+' THEN 650
    ELSE 50
  END as estimated_users
FROM public.directory_cache
WHERE snapshot_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY snapshot_date DESC, company_name;
```

---

## 📝 סיכום

**הגרף "Users per Organization" נבנה בדיוק מ:**

1. **טבלה:** `public.directory_cache`
2. **שדה 1:** `company_name` → שם הארגון בגרף
3. **שדה 2:** `company_size` → מתורגם למספר משתמשים משוער דרך `estimateUsersByCompanySize()`
4. **תוצאה:** `[{ organization: company_name, count: estimated_users }]`

**⚠️ חשוב:** זה **לא** מספר משתמשים אמיתי, אלא הערכה לפי גודל החברה!


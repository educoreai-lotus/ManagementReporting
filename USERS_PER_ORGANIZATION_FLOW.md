# 📊 תהליך יצירת הגרף "Users per Organization"

## 🎯 סקירה כללית

הגרף "Users per Organization" מציג את התפלגות המשתמשים בין הארגונים השונים. זהו גרף מסוג **Bar Chart** שמציג כמה משתמשים יש לכל ארגון.

---

## 🔄 תהליך יצירת הגרף (Step-by-Step)

### **שלב 1: איסוף נתונים מה-Database** 
📁 `backend/src/infrastructure/repositories/DatabaseAnalyticsRepository.js` → `fetchDirectoryData()`

#### 1.1 שאילתת SQL
```sql
SELECT DISTINCT ON (company_id) *
FROM public.directory_cache
WHERE snapshot_date >= COALESCE(
  (SELECT MAX(snapshot_date) - INTERVAL '30 days' FROM public.directory_cache),
  CURRENT_DATE - INTERVAL '30 days'
)
ORDER BY company_id, snapshot_date DESC, ingested_at DESC
```

**מה השאילתה עושה:**
- `DISTINCT ON (company_id)` - לוקחת רק את הרשומה האחרונה לכל ארגון
- מסננת נתונים מ-30 הימים האחרונים
- מסדרת לפי `snapshot_date DESC` - הכי עדכני ראשון

#### 1.2 תוצאות השאילתה
השאילתה מחזירה array של rows, כל row מכיל:
- `company_id` - מזהה ייחודי של הארגון
- `company_name` - שם הארגון
- `company_size` - גודל החברה (למשל: '1-10', '10-50', '50-200', '200-500', '500+')
- `verification_status` - סטטוס אימות
- `hierarchy` - מבנה היררכי (JSONB)
- `kpis` - מדדי ביצוע (JSONB)
- ועוד שדות...

---

### **שלב 2: חישוב משתמשים לכל ארגון** 
📁 `backend/src/infrastructure/repositories/DatabaseAnalyticsRepository.js` → `fetchDirectoryData()`

#### 2.1 יצירת Map של ארגונים ומשתמשים
```javascript
const orgUserMap = new Map();
let totalUsers = 0;

for (const row of rows) {
  const companyKey = row.company_name || row.company_id;
  
  // חישוב מספר משתמשים מ-company_size
  const userCount = this.estimateUsersByCompanySize(row.company_size);
  totalUsers += userCount;
  orgUserMap.set(companyKey, userCount);
}
```

**איך `estimateUsersByCompanySize()` עובד:**
```javascript
estimateUsersByCompanySize(size) {
  if (!size) {
    return 50; // Default fallback
  }
  
  // מיפוי של company_size לערכי משתמשים משוערים
  const sizeMap = {
    '1-10': 8,
    '10-50': 30,
    '50-200': 125,
    '200-500': 350,
    '500+': 650
  };
  
  return sizeMap[size] || 50; // מחזיר מספר משתמשים משוער
}
```

**דוגמאות:**
- `company_size = '1-10'` → 8 משתמשים
- `company_size = '10-50'` → 30 משתמשים
- `company_size = '50-200'` → 125 משתמשים
- `company_size = '200-500'` → 350 משתמשים
- `company_size = '500+'` → 650 משתמשים

#### 2.2 בניית Details Object
```javascript
const details = {
  users: Array.from(orgUserMap.entries()).map(([organization, count]) => ({
    organization,
    count // מספר משתמשים לארגון זה
  })),
  organizations: rows.map((row) => ({
    company_id: row.company_id,
    company_name: row.company_name,
    industry: row.industry,
    company_size: row.company_size,
    verification_status: row.verification_status,
    hierarchy: row.hierarchy,
    kpis: row.kpis
  }))
};
```

**המבנה של `details.users`:**
```javascript
[
  { organization: 'TechCorp Solutions', count: 350 },
  { organization: 'Global Learning Inc', count: 125 },
  { organization: 'InnovateNow Ltd', count: 30 },
  // ...
]
```

---

### **שלב 3: בניית Response Object**
📁 `backend/src/infrastructure/repositories/DatabaseAnalyticsRepository.js` → `buildResponse()`

הפונקציה `buildResponse()` בונה את האובייקט המלא:
```javascript
{
  data: {
    metrics: {
      totalUsers: 505,
      totalOrganizations: 3,
      activeUsers: 394,
      // ...
    },
    details: {
      users: [
        { organization: 'TechCorp Solutions', count: 350 },
        { organization: 'Global Learning Inc', count: 125 },
        { organization: 'InnovateNow Ltd', count: 30 }
      ],
      organizations: [/* ... */]
    }
  },
  metadata: {
    service: 'directory',
    collected_at: '2025-01-19T10:30:00.000Z',
    // ...
  }
}
```

---

### **שלב 4: יצירת הגרף ב-Combined Analytics**
📁 `backend/src/application/useCases/GetCombinedAnalyticsUseCase.js` → `createUsersPerOrganizationChart()`

#### 4.1 קבלת הנתונים
```javascript
createUsersPerOrganizationChart(directoryData) {
  const metrics = this.getDataMetrics(directoryData);
  const userCount = metrics.totalUsers || 0;
  
  if (userCount === 0) return null;

  // ✅ שימוש בנתונים אמיתיים מה-DB - מקבל users per organization מ-details
  const usersPerOrg = this.getDataDetails(directoryData, 'users');
```

**מה `getDataDetails()` עושה:**
- מקבל את `directoryData.data.details.users`
- מחזיר את המערך: `[{ organization: '...', count: ... }, ...]`

#### 4.2 עיבוד הנתונים לגרף
```javascript
if (usersPerOrg && Array.isArray(usersPerOrg) && usersPerOrg.length > 0) {
  // שימוש בנתונים אמיתיים מה-DB
  const chartData = usersPerOrg
    .map(({ organization, count }) => ({
      name: organization || 'Unknown Organization',
      value: count || 0
    }))
    .sort((a, b) => b.value - a.value)  // מיון לפי מספר משתמשים (גבוה לנמוך)
    .filter(item => item.value > 0);     // מסנן ארגונים ללא משתמשים

  if (chartData.length === 0) return null;
```

**התוצאה:**
```javascript
[
  { name: 'TechCorp Solutions', value: 350 },
  { name: 'Global Learning Inc', value: 125 },
  { name: 'InnovateNow Ltd', value: 30 }
]
```

#### 4.3 יצירת אובייקט הגרף
```javascript
return {
  id: 'combined-users-per-organization',
  title: 'Users per Organization',
  subtitle: 'Distribution of users across organizations',
  type: 'bar',
  data: chartData,
  description: 'Aggregates data from Directory microservice to display how many users belong to each organization',
  metadata: {
    chartType: 'combined',
    services: ['directory'],
    lastUpdated: this.getLastUpdated(directoryData),
    colorScheme: { primary: '#3b82f6', secondary: '#60a5fa' }
  }
};
```

---

### **שלב 5: שליחה ל-Frontend**
📁 `backend/src/presentation/controllers/DashboardController.js`

הגרף נשלח ל-frontend דרך ה-API:
```
GET /api/v1/dashboard
```

**Response:**
```json
{
  "charts": [
    {
      "id": "combined-users-per-organization",
      "title": "Users per Organization",
      "type": "bar",
      "data": [
        { "name": "TechCorp Solutions", "value": 350 },
        { "name": "Global Learning Inc", "value": 125 },
        { "name": "InnovateNow Ltd", "value": 30 }
      ],
      "metadata": {
        "chartType": "combined",
        "services": ["directory"],
        "colorScheme": { "primary": "#3b82f6", "secondary": "#60a5fa" }
      }
    }
  ]
}
```

---

### **שלב 6: רינדור ב-Frontend**
📁 `frontend/src/components/Dashboard/...`

הגרף מוצג כ-**Bar Chart** באמצעות Recharts:
```jsx
<BarChart data={chartData}>
  <Bar dataKey="value" fill="#3b82f6" />
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
</BarChart>
```

---

## 📊 דיאגרמת זרימה (Flow Diagram)

```
1. Database Query
   ↓
   SELECT DISTINCT ON (company_id) * FROM directory_cache
   ↓
2. Calculate Users per Organization
   ↓
   estimateUsersByCompanySize(company_size) → orgUserMap
   ↓
3. Build Details Object
   ↓
   details.users = [{ organization: '...', count: ... }, ...]
   ↓
4. Build Response
   ↓
   { data: { metrics: {...}, details: { users: [...] } } }
   ↓
5. Get Combined Analytics
   ↓
   createUsersPerOrganizationChart(directoryData)
   ↓
6. Format Chart Data
   ↓
   chartData = usersPerOrg.map(...).sort(...).filter(...)
   ↓
7. Create Chart Object
   ↓
   { id: 'combined-users-per-organization', type: 'bar', data: [...] }
   ↓
8. Send to Frontend
   ↓
   GET /api/v1/dashboard → { charts: [...] }
   ↓
9. Render Chart
   ↓
   <BarChart data={...} /> → Recharts BarChart Component
```

---

## 🔍 נקודות חשובות

### 1. **DISTINCT ON** - למה זה חשוב?
- מבטיח שלכל ארגון יש רק רשומה אחת (הכי עדכנית)
- מונע כפילויות אם יש כמה snapshots לאותו ארגון

### 2. **30 Days Filter** - למה?
- מציג רק נתונים רלוונטיים (30 הימים האחרונים)
- אם אין נתונים מ-30 הימים, לוקח את כל הנתונים

### 3. **estimateUsersByCompanySize()** - איך זה עובד?
- ממיר את `company_size` (string) למספר משתמשים משוער
- מיפוי: '1-10' → 8, '10-50' → 30, '50-200' → 125, '200-500' → 350, '500+' → 650
- אם `company_size` לא קיים או לא מוכר, מחזיר 50 (default)

### 4. **Sorting** - למה מיון?
- הגרף ממוין לפי מספר משתמשים (גבוה לנמוך)
- זה עוזר לראות מי הארגונים הגדולים ביותר

### 5. **Filtering** - למה מסננים?
- מסננים ארגונים עם `value > 0` - רק ארגונים עם משתמשים
- מונע הצגת ארגונים ריקים בגרף

---

## 🐛 Debugging

אם הגרף לא מופיע, בדוק:

### 1. **בדיקת נתונים ב-DB:**
```sql
SELECT 
  company_id,
  company_name,
  company_size,
  snapshot_date
FROM public.directory_cache
WHERE snapshot_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY snapshot_date DESC;
```

### 2. **בדיקת Response מה-Repository:**
```javascript
// ב-DatabaseAnalyticsRepository.js
console.log('[Directory] ✅ Response built:', {
  has_metrics: !!response?.data?.metrics,
  metrics_keys: Object.keys(response?.data?.metrics || {}),
  details_users: response?.data?.details?.users,
  details_users_length: response?.data?.details?.users?.length
});
```

### 3. **בדיקת Chart Creation:**
```javascript
// ב-GetCombinedAnalyticsUseCase.js
console.log('[UsersPerOrg] usersPerOrg:', usersPerOrg);
console.log('[UsersPerOrg] chartData:', chartData);
console.log('[UsersPerOrg] chart object:', chartObject);
```

### 4. **בדיקת Frontend:**
- פתח DevTools → Network → בדוק את ה-Response של `/api/v1/dashboard`
- חפש את `combined-users-per-organization` ב-charts array
- בדוק שהגרף מופיע ב-DOM

---

## 📝 סיכום

הגרף "Users per Organization" נוצר בתהליך הבא:

1. **איסוף נתונים** - שאילתת SQL מטבלת `directory_cache`
2. **חישוב משתמשים** - הערכת מספר משתמשים לפי `company_size`
3. **בניית Details** - יצירת מערך של `{ organization, count }`
4. **יצירת גרף** - עיבוד הנתונים ל-format של Bar Chart
5. **שליחה ל-Frontend** - דרך ה-API endpoint
6. **רינדור** - הצגה כ-Bar Chart באמצעות Recharts

הגרף מציג את התפלגות המשתמשים בין הארגונים השונים, ממוין לפי מספר משתמשים (גבוה לנמוך).


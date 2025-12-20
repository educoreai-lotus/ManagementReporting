# 📊 תהליך יצירת הגרף "Organization Directory Overview"

## 🎯 סקירה כללית

הגרף "Organization Directory Overview" מציג מטריקות ארגוניות מצטברות:
- **Total Users** - סך כל המשתמשים
- **Total Organizations** - סך כל הארגונים
- **Active Users** - משתמשים פעילים
- **Organizations Active** - ארגונים פעילים (מאומתים)

---

## 🔄 תהליך יצירת הגרף (Step-by-Step)

### **שלב 1: איסוף נתונים מה-Database** 
📁 `backend/src/infrastructure/repositories/DatabaseAnalyticsRepository.js`

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
- `verification_status` - סטטוס אימות ('verified', 'approved', וכו')
- `hierarchy` - מבנה היררכי (JSONB): departments → teams → employees
- `kpis` - מדדי ביצוע (JSONB): יכול להכיל `active_users`, `user_count`, וכו'
- `snapshot_date` - תאריך ה-snapshot
- ועוד שדות...

---

### **שלב 2: חישוב Metrics** 
📁 `backend/src/infrastructure/repositories/DatabaseAnalyticsRepository.js` → `fetchDirectoryData()`

#### 2.1 חישוב Total Users
```javascript
const orgUserMap = new Map();
let totalUsers = 0;

for (const row of rows) {
  const companyKey = row.company_name || row.company_id;
  
  // ספירת משתמשים מה-hierarchy
  const userCount = this.countUsersFromHierarchy(row.hierarchy);
  totalUsers += userCount;
  orgUserMap.set(companyKey, userCount);
}
```

**איך `countUsersFromHierarchy()` עובד:**
```javascript
countUsersFromHierarchy(hierarchy) {
  // מבנה ה-hierarchy:
  // [
  //   {
  //     departments: [
  //       {
  //         teams: [
  //           {
  //             employees: [
  //               { employee_id, name, role_type }
  //             ]
  //           }
  //         ]
  //       }
  //     ]
  //   }
  // ]
  
  const seen = new Set(); // למניעת כפילויות
  
  for (const dept of hierarchy) {
    for (const team of dept.teams) {
      for (const emp of team.employees) {
        const key = emp.employee_id || emp.name;
        if (!seen.has(key)) {
          seen.add(key);
        }
      }
    }
  }
  
  return seen.size; // מחזיר מספר משתמשים ייחודיים
}
```

#### 2.2 חישוב Active Users
```javascript
// ניסיון לקחת מ-kpis (אם קיים)
let activeUsersFromKpis = null;
for (const row of rows) {
  if (row.kpis && row.kpis.active_users !== undefined) {
    activeUsersFromKpis = (activeUsersFromKpis || 0) + Number(row.kpis.active_users);
  }
}

// אם אין ב-kpis, מעריך מ-totalUsers
const activeUsers = activeUsersFromKpis !== null 
  ? activeUsersFromKpis 
  : Math.round(totalUsers * 0.78); // 78% מהמשתמשים פעילים
```

#### 2.3 חישוב Total Organizations
```javascript
const totalOrganizations = rows.length; // פשוט מספר ה-rows
```

#### 2.4 חישוב Organizations Active
```javascript
const organizationsActive = rows.filter(
  (row) => row.verification_status === 'verified'
).length;
```

#### 2.5 בניית אובייקט Metrics
```javascript
const metrics = {
  totalUsers,              // סכום משתמשים מה-hierarchy
  totalOrganizations,      // מספר ארגונים
  activeUsers,             // מ-kpis או הערכה
  usersByRole: {},         // ריק (אין נתונים ב-DB)
  usersByDepartment: {},   // ריק (לא מחושב כרגע)
  organizationsActive      // מספר ארגונים מאומתים
};
```

---

### **שלב 3: בניית Response** 
📁 `backend/src/infrastructure/repositories/DatabaseAnalyticsRepository.js` → `buildResponse()`

```javascript
return this.buildResponse(metrics, details, rows, 'directory');
```

**המבנה שנבנה:**
```javascript
{
  timestamp: "2025-12-20T...",
  data: {
    metrics: {
      totalUsers: 45,
      totalOrganizations: 7,
      activeUsers: 35,
      organizationsActive: 2
    },
    details: {
      users: [
        { organization: "TechCorp Global", count: 15 },
        { organization: "EduCore Systems", count: 20 },
        ...
      ],
      organizations: [
        {
          company_id: "...",
          company_name: "TechCorp Global",
          verification_status: "verified",
          ...
        },
        ...
      ]
    }
  },
  metadata: {
    source: "directory",
    schema_version: "1.0",
    collected_at: "2025-12-20T..."
  }
}
```

---

### **שלב 4: יצירת הגרף** 
📁 `backend/src/application/useCases/GetDashboardUseCase.js`

#### 4.1 קבלת הנתונים
```javascript
// GetDashboardUseCase.execute()
const latestEntries = await this.cacheRepository.getLatestEntries();
// latestEntries = [
//   { service: 'directory', data: { ... } },
//   { service: 'courseBuilder', data: { ... } },
//   ...
// ]
```

#### 4.2 עיבוד הנתונים
```javascript
for (const { service, data } of latestEntries) {
  if (service === 'directory') {
    // רק priority services יוצרים גרף ראשי
    if (priorityServices.includes('directory')) {
      const mainChartData = this.formatChartData(data, 'directory', 'main');
      // ...
    }
  }
}
```

#### 4.3 פורמט הנתונים לגרף
```javascript
formatChartData(data, 'directory', 'main') {
  // 1. חילוץ metrics
  const metrics = data?.data?.metrics || {};
  
  // 2. בחירת key metrics
  const keyMetrics = ['totalUsers', 'totalOrganizations', 'activeUsers', 'organizationsActive'];
  
  // 3. יצירת simpleMetrics
  const simpleMetrics = {};
  for (const key of keyMetrics) {
    if (metrics[key] !== undefined && typeof metrics[key] === 'number') {
      simpleMetrics[key] = metrics[key];
    }
  }
  
  // 4. המרה לפורמט הגרף
  return formatMetricsArray(simpleMetrics);
}
```

#### 4.4 המרה לפורמט הגרף
```javascript
formatMetricsArray(simpleMetrics) {
  // Input: { totalUsers: 45, totalOrganizations: 7, activeUsers: 35, organizationsActive: 2 }
  
  // Output: [
  //   { name: "Total Users", value: 45 },
  //   { name: "Total Organizations", value: 7 },
  //   { name: "Active Users", value: 35 },
  //   { name: "Organizations Active", value: 2 }
  // ]
  
  return Object.entries(simpleMetrics).map(([key, value]) => ({
    name: formatMetricName(key), // "Total Users", "Total Organizations", etc.
    value: Math.round(value * 100) / 100
  }));
}
```

#### 4.5 יצירת אובייקט הגרף
```javascript
const mainChart = new ChartData({
  id: 'chart-directory',
  title: 'Organization Directory Overview',
  type: 'bar', // סוג גרף: Bar Chart
  data: [
    { name: "Total Users", value: 45 },
    { name: "Total Organizations", value: 7 },
    { name: "Active Users", value: 35 },
    { name: "Organizations Active", value: 2 }
  ],
  description: 'Aggregated user and organization metrics',
  metadata: {
    service: 'directory',
    lastUpdated: '2025-12-20T...',
    source: 'directory',
    schemaVersion: '1.0',
    colorScheme: {
      primary: '#3b82f6',  // כחול
      secondary: '#60a5fa',
      gradient: ['#3b82f6', '#60a5fa', '#93c5fd']
    },
    isPriority: true
  }
});
```

---

### **שלב 5: שליחה לחזית** 
📁 `backend/src/presentation/controllers/DashboardController.js`

#### 5.1 API Response
```javascript
// GET /api/v1/dashboard
{
  charts: [
    {
      id: "chart-directory",
      title: "Organization Directory Overview",
      type: "bar",
      data: [
        { name: "Total Users", value: 45 },
        { name: "Total Organizations", value: 7 },
        { name: "Active Users", value: 35 },
        { name: "Organizations Active", value: 2 }
      ],
      description: "Aggregated user and organization metrics",
      metadata: { ... }
    },
    ...
  ],
  lastUpdated: "2025-12-20T..."
}
```

#### 5.2 רינדור בחזית
📁 `frontend/src/components/Charts/BarChart.jsx`

```jsx
<BarChart 
  data={[
    { name: "Total Users", value: 45 },
    { name: "Total Organizations", value: 7 },
    { name: "Active Users", value: 35 },
    { name: "Organizations Active", value: 2 }
  ]}
  colorScheme={{ primary: '#3b82f6', ... }}
/>
```

---

## 📋 סיכום התהליך

```
1. Database Query
   ↓
   SELECT DISTINCT ON (company_id) * FROM directory_cache
   ↓
2. Calculate Metrics
   ↓
   - countUsersFromHierarchy() → totalUsers
   - kpis.active_users → activeUsers (או הערכה)
   - rows.length → totalOrganizations
   - filter(verified) → organizationsActive
   ↓
3. Build Response
   ↓
   { metrics: {...}, details: {...}, metadata: {...} }
   ↓
4. Format Chart Data
   ↓
   formatChartData() → formatMainChartData() → formatMetricsArray()
   ↓
5. Create Chart Object
   ↓
   new ChartData({ id, title, type: 'bar', data: [...], ... })
   ↓
6. Send to Frontend
   ↓
   GET /api/v1/dashboard → { charts: [...] }
   ↓
7. Render Chart
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

### 3. **countUsersFromHierarchy()** - למה Set?
- מונע כפילויות אם אותו משתמש מופיע בכמה מחלקות/צוותים
- משתמש ב-`employee_id` או `name` כמפתח ייחודי

### 4. **Active Users Calculation** - למה הערכה?
- אם אין `kpis.active_users` ב-DB, מעריך 78% מ-totalUsers
- זה fallback אם הנתונים לא זמינים

### 5. **formatMetricName()** - איך זה עובד?
```javascript
"totalUsers" → "Total Users"
"totalOrganizations" → "Total Organizations"
"activeUsers" → "Active Users"
"organizationsActive" → "Organizations Active"
```

---

## 🐛 Debugging

אם הגרף לא מופיע, בדוק:

1. **האם יש נתונים ב-DB?**
   ```sql
   SELECT COUNT(*) FROM public.directory_cache;
   ```

2. **האם יש hierarchy?**
   ```sql
   SELECT company_name, hierarchy IS NOT NULL as has_hierarchy
   FROM public.directory_cache
   LIMIT 5;
   ```

3. **האם יש kpis?**
   ```sql
   SELECT company_name, kpis
   FROM public.directory_cache
   WHERE kpis IS NOT NULL
   LIMIT 5;
   ```

4. **בדוק את הלוגים:**
   - `[Directory] Fetched X organizations from database`
   - `[Directory] Calculated metrics: {...}`
   - `[GetDashboardUseCase] Processing directory`

---

## 📝 הערות נוספות

- הגרף מסוג **Bar Chart** (לא Line, לא Pie)
- הצבעים: כחול (#3b82f6) - סכמת צבעים של Directory service
- הגרף מסומן כ-`isPriority: true` - יופיע בדשבורד הראשי
- הנתונים מתעדכנים אוטומטית כל פעם שהדשבורד נטען


# הסבר מלא ומפורט על המערכת - מההתחלה עד הסוף

**מסמך זה נועד לראיונות עבודה - הסבר מקסימלי על כל תהליך במערכת**

---

## 📋 תוכן עניינים

1. [ארכיטקטורה כללית](#ארכיטקטורה-כללית)
2. [תהליך הפעלה (Startup)](#תהליך-הפעלה-startup)
3. [תהליך טעינת Dashboard - מההתחלה עד הסוף](#תהליך-טעינת-dashboard)
4. [תהליך איסוף נתונים (Data Collection)](#תהליך-איסוף-נתונים)
5. [תהליך יצירת Charts](#תהליך-יצירת-charts)
6. [תהליך Chart Transcription עם OpenAI](#תהליך-chart-transcription)
7. [תהליך Refresh Data](#תהליך-refresh-data)
8. [תהליך יצירת Reports](#תהליך-יצירת-reports)
9. [תהליך AI Custom SQL](#תהליך-ai-custom-sql)

---

## 🏗️ ארכיטקטורה כללית

### מבנה הפרויקט

```
lotus_project/
├── frontend/          # React + Vite
│   ├── src/
│   │   ├── components/    # רכיבי UI
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # API calls
│   │   └── context/       # React Context (Theme)
│   └── package.json
│
├── backend/           # Node.js + Express (Onion Architecture)
│   ├── src/
│   │   ├── presentation/  # Routes, Controllers, Middleware
│   │   ├── application/   # Use Cases, Services
│   │   ├── domain/       # Entities, Value Objects
│   │   └── infrastructure/ # DB, Clients, Jobs
│   └── package.json
│
└── DB/                # Database migrations & scripts
```

### Onion Architecture - הסבר

המערכת משתמשת ב-**Onion Architecture** (ארכיטקטורת בצל) - הפרדה ברורה בין שכבות:

```
┌─────────────────────────────────────┐
│   Presentation Layer                │  ← Routes, Controllers, Middleware
│   (מה המשתמש רואה)                  │
├─────────────────────────────────────┤
│   Application Layer                 │  ← Use Cases, Business Logic
│   (מה המערכת עושה)                  │
├─────────────────────────────────────┤
│   Domain Layer                      │  ← Entities, Business Rules
│   (הלוגיקה העסקית)                   │
├─────────────────────────────────────┤
│   Infrastructure Layer              │  ← Database, External APIs, Jobs
│   (איך זה מתחבר לעולם החיצון)        │
└─────────────────────────────────────┘
```

**יתרונות:**
- הפרדה ברורה של אחריות
- קל לבדוק (testing)
- קל לשנות implementation (למשל: Redis → PostgreSQL)
- Business logic לא תלוי ב-infrastructure

---

## 🚀 תהליך הפעלה (Startup)

### 1. Backend Startup - `backend/src/server.js`

**מה קורה כשהשרת מתחיל:**

```javascript
// שורה 89-157: backend/src/server.js
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // ⚠️ CRITICAL: Run initialization in background
  // Railway healthcheck needs server to respond immediately
  (async () => {
    // 1. Run database migration
    await runMigration();
    
    // 2. Seed mock data if database is empty
    if (process.env.DATABASE_URL) {
      const isEmpty = await isDatabaseEmpty();
      if (isEmpty) {
        await seedMockData();
      }
    }
    
    // 3. Test database connection
    const health = await healthCheck();
    
    // 4. Check and fix permissions
    await checkAndFixPermissions();
    
    // 5. Initialize scheduled jobs (CRON)
    await initializeJobs();
  })();
});
```

**תהליך מפורט:**

1. **הגדרת Middleware:**
   - שורה 30-35: Security Headers
   - שורה 38: CORS
   - שורה 41-49: JSON Body Parser (עד 50MB)
   - שורה 63: Rate Limiting
   - שורה 64: Audit Logging

2. **הגדרת Routes:**
   ```javascript
   // שורה 76-83
   app.use('/api/v1/dashboard', dashboardRoutes);
   app.use('/api/v1/reports', reportsRoutes);
   app.use('/api/v1/data', dataRoutes);
   app.use('/api/v1/openai', openaiRoutes);
   app.use('/api/v1/ai', chartTranscriptionRoutes);
   app.use('/api/ai-custom', aiCustomRoutes);
   ```

3. **אתחול Jobs (CRON):**
   - `backend/src/infrastructure/jobs/index.js`
   - שורה 12-31: אתחול כל ה-jobs
   - כל job רץ ב-06:00 בבוקר (Asia/Jerusalem)

### 2. Frontend Startup - `frontend/src/main.jsx`

```javascript
// frontend/src/main.jsx
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**תהליך:**
1. ReactDOM יוצר root
2. טוען `App.jsx`
3. `App.jsx` מגדיר Routes:
   ```javascript
   // frontend/src/App.jsx
   <Routes>
     <Route path="/" element={<Navigate to="/dashboard" replace />} />
     <Route path="/dashboard" element={<Dashboard />} />
     <Route path="/reports" element={<ReportsPage />} />
     <Route path="/ai-custom" element={<AICustomPage />} />
   </Routes>
   ```

---

## 📊 תהליך טעינת Dashboard

### Flow מלא - מההתחלה עד הסוף

```
User opens browser
    ↓
React Router navigates to /dashboard
    ↓
DashboardContainer component mounts
    ↓
useDashboardData hook runs
    ↓
fetchDashboard() called
    ↓
Check browser cache (localStorage)
    ↓
If cache exists → Show cached data immediately
    ↓
Fetch fresh data from backend in background
    ↓
GET /api/v1/dashboard
    ↓
DashboardController.getDashboard()
    ↓
GetDashboardUseCase.execute()
    ↓
CacheRepository.getLatestEntries()
    ↓
Query PostgreSQL database
    ↓
Format data into ChartData entities
    ↓
Return JSON to frontend
    ↓
Frontend updates state
    ↓
Charts render with Recharts
    ↓
Startup transcription flow begins
    ↓
Capture all charts (visible + hidden)
    ↓
Send to /api/v1/ai/chart-transcription/startup
    ↓
OpenAI generates transcriptions
    ↓
Save to database
    ↓
Done!
```

### 1. Frontend - `useDashboardData` Hook

**מיקום:** `frontend/src/hooks/useDashboardData.js`

**שורה 107-401: `fetchDashboard()` function**

```javascript
const fetchDashboard = async (autoRefreshIfEmpty = false) => {
  // 1. Check persistent cache (localStorage)
  const persistentCached = browserCache.getPersistentData('dashboard');
  
  if (persistentCached && persistentCached.data?.charts?.length > 0) {
    // Show cached data immediately
    setData(persistentCached.data);
    setLastUpdated(persistentCached.lastUpdated);
    setLoading(false);
    
    // Fetch fresh data in background (after 5 seconds)
    setTimeout(async () => {
      const response = await dashboardAPI.getDashboard();
      // Update cache and state
    }, 5000);
  } else {
    // No cache - fetch fresh data
    const response = await dashboardAPI.getDashboard();
    const dashboardData = response.data;
    setData(dashboardData);
  }
  
  // 2. Startup transcription flow (only once per session)
  const isStartupDone = getStartupTranscriptionDone();
  if (!isStartupDone) {
    // Fetch ALL charts (priority + BOX)
    const allChartsResponse = await dashboardAPI.getAllCharts();
    const allChartsForTranscription = allChartsResponse.data?.charts || [];
    
    // Wait for charts to render
    await waitForChartsStartup(20, 500);
    
    // Build payloads and send to backend
    const chartsForStartup = allChartsForTranscription.map(chart => ({
      chartId: chart.id,
      context: chart.title,
      chartPayload: buildChartTranscriptionPayload(chart)
    }));
    
    // Send to startup endpoint
    await chartTranscriptionAPI.startup(chartsForStartup);
  }
};
```

**מה קורה כאן:**
1. **שורה 115-127:** בודק cache ב-localStorage
2. **שורה 131-153:** אם יש cache, מציג מיד ומעדכן ברקע
3. **שורה 166-173:** אם אין cache, שולח בקשה לשרת
4. **שורה 229-360:** Startup transcription - רק פעם אחת per session

### 2. API Call - `frontend/src/services/api.js`

**מיקום:** `frontend/src/services/api.js`

```javascript
// שורה 124-128
export const dashboardAPI = {
  getDashboard: () => api.get('/dashboard'),
  getAllCharts: () => api.get('/dashboard/all-charts'),
  refreshData: (services) => api.post('/dashboard/refresh', services?.length ? { services } : {}),
};
```

**Request Interceptor (שורה 33-81):**
- מוסיף JWT token אם קיים
- לוגים עבור chart transcription endpoints

**Response Interceptor (שורה 84-121):**
- מטפל ב-401 (unauthorized) → redirect to login
- מטפל ב-429 (rate limit) → retry logic

### 3. Backend Route - `backend/src/presentation/routes/dashboard.js`

**מיקום:** `backend/src/presentation/routes/dashboard.js`

```javascript
// שורה 17
router.get('/', dashboardController.getDashboard.bind(dashboardController));
```

### 4. Controller - `backend/src/presentation/controllers/DashboardController.js`

**מיקום:** `backend/src/presentation/controllers/DashboardController.js`

**שורה 38-145: `getDashboard()` method**

```javascript
async getDashboard(req, res, next) {
  try {
    // 1. Execute Use Case
    const dashboardData = await this.getDashboardUseCase.execute();
    const combinedAnalytics = await this.getCombinedAnalyticsUseCase.execute();
    
    // 2. Merge charts
    const allCharts = [
      ...dashboardData.charts,
      ...combinedAnalytics.charts
    ];
    
    // 3. Filter only priority charts for main dashboard
    const priorityCharts = allCharts.filter(chart => {
      // Include charts marked as priority
      if (chart.metadata?.isPriority === true) return true;
      // Exclude non-priority
      if (chart.metadata?.isPriority === false) return false;
      // Exclude detailed charts
      if (chart.metadata?.chartType) return false;
      // Exclude Content Studio (goes to BOX)
      if (chart.metadata?.service === 'contentStudio') return false;
      // Include priority services
      const priorityServices = ['directory', 'courseBuilder', 'assessment', 'learningAnalytics'];
      if (priorityServices.includes(chart.metadata?.service)) return true;
      return false;
    });
    
    // 4. If no data, auto-load mock data
    if (priorityCharts.length === 0) {
      const token = req.headers.authorization?.substring(7);
      await triggerManualCollection(token);
      // Retry fetching
      const retryDashboardData = await this.getDashboardUseCase.execute();
      // ...
    }
    
    // 5. Return response
    res.json({
      charts: priorityCharts,
      lastUpdated: dashboardData.lastUpdated
    });
  } catch (error) {
    // Error handling
    res.json({
      charts: this.getDefaultCharts(),
      lastUpdated: null
    });
  }
}
```

### 5. Use Case - `backend/src/application/useCases/GetDashboardUseCase.js`

**מיקום:** `backend/src/application/useCases/GetDashboardUseCase.js`

**שורה 70-194: `execute()` method**

```javascript
async execute(latestEntries = null) {
  // 1. Get latest entries from cache repository
  if (!latestEntries) {
    latestEntries = await this.cacheRepository.getLatestEntries();
  }
  
  // 2. Process each service and create charts
  const charts = [];
  const priorityServices = ['directory', 'courseBuilder', 'assessment', 'learningAnalytics'];
  
  for (const { service, data } of latestEntries) {
    const config = SERVICE_CHART_CONFIG[service];
    
    // 3. Create main chart for priority services
    if (priorityServices.includes(service)) {
      const mainChartData = this.formatChartData(data, service, 'main');
      if (mainChartData.length > 0) {
        const mainChart = new ChartData({
          id: `chart-${service}`,
          title: config.title,
          type: config.type,
          data: mainChartData,
          description: config.description,
          metadata: {
            service,
            lastUpdated: data.metadata?.collected_at || null,
            colorScheme: config.colorScheme,
            isPriority: true
          }
        });
        charts.push(mainChart.toJSON());
      }
    }
    
    // 4. Create detailed charts for BOX
    const detailedCharts = this.createDetailedCharts(service, data, config.colorScheme);
    charts.push(...detailedCharts);
  }
  
  // 5. Return result
  return {
    charts,
    lastUpdated: charts
      .map((chart) => chart.metadata?.lastUpdated)
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null
  };
}
```

**מה קורה כאן:**
1. **שורה 74:** שולף את הנתונים האחרונים מה-cache
2. **שורה 93:** עובר על כל service (directory, courseBuilder, etc.)
3. **שורה 106:** יוצר main chart עבור priority services
4. **שורה 129:** יוצר detailed charts עבור BOX
5. **שורה 186:** מחזיר את התוצאה

### 6. Repository - `backend/src/infrastructure/repositories/DatabaseAnalyticsRepository.js`

**מיקום:** `backend/src/infrastructure/repositories/DatabaseAnalyticsRepository.js`

```javascript
async getLatestEntries() {
  // Query PostgreSQL for latest snapshot from each service
  const query = `
    SELECT 
      service,
      snapshot_data as data,
      snapshot_date as collected_at
    FROM (
      SELECT 
        service,
        snapshot_data,
        snapshot_date,
        ROW_NUMBER() OVER (PARTITION BY service ORDER BY snapshot_date DESC) as rn
      FROM learning_analytics_snapshot
      WHERE service IN ('directory', 'courseBuilder', 'assessment', 'contentStudio', 'learningAnalytics')
    ) ranked
    WHERE rn = 1
    ORDER BY service;
  `;
  
  const result = await pool.query(query);
  return result.rows.map(row => ({
    service: row.service,
    data: {
      metrics: row.data?.metrics || {},
      details: row.data?.details || {},
      metadata: {
        collected_at: row.collected_at,
        source: row.service,
        schema_version: '1.0'
      }
    }
  }));
}
```

**מה קורה כאן:**
- שולף את ה-snapshot האחרון מכל service
- משתמש ב-ROW_NUMBER() כדי לקבל רק את האחרון
- מחזיר את הנתונים בפורמט אחיד

### 7. Frontend Rendering - `frontend/src/components/Dashboard/DashboardContainer.jsx`

**מיקום:** `frontend/src/components/Dashboard/DashboardContainer.jsx`

**שורה 71-77: Filtering charts**

```javascript
const priorityCharts = useMemo(() => {
  return allCharts?.filter((chart) => 
    chart.metadata?.isPriority !== false
  ) || [];
}, [allCharts, data?.charts]);

const boxCharts = useMemo(() => {
  return allCharts?.filter((chart) => 
    chart.metadata?.isPriority === false
  ) || [];
}, [allCharts]);
```

**שורה 191-195: Rendering**

```javascript
<ChartGrid
  charts={priorityCharts}
  onChartClick={handleChartClick}
  failedServices={failedServicesMap}
/>
```

**שורה 199-217: Hidden charts for transcription**

```javascript
{/* Hidden container to render ALL non-priority charts for transcription */}
{hiddenCharts.length > 0 && (
  <div
    aria-hidden="true"
    style={{
      position: 'absolute',
      top: '-9999px',
      left: '-9999px',
      width: '1200px',
      pointerEvents: 'none',
      opacity: 0,
    }}
  >
    <ChartGrid
      charts={hiddenCharts}
      onChartClick={() => {}}
      failedServices={failedServicesMap}
    />
  </div>
)}
```

**מה קורה כאן:**
- Charts עם `isPriority: true` → מוצגים ב-main dashboard
- Charts עם `isPriority: false` → מוצגים ב-BOX sidebar
- Charts נסתרים → מוצגים מחוץ למסך כדי שניתן יהיה לתפוס אותם לתעתוק

---

## 📥 תהליך איסוף נתונים (Data Collection) - CACHE BASED

### ⚠️ חשוב: המערכת היא CACHE BASED

המערכת **לא** משתמשת ב-Redis, אלא ב-**PostgreSQL כמערכת Cache**:
- הנתונים נשמרים כ-**Snapshots** (תמונות מצב) ב-DB
- כל snapshot נשמר עם `snapshot_date` (תאריך)
- הנתונים **לא real-time** - הם snapshots שנאספים פעם ביום
- זה נקרא "Cache Based" כי הנתונים הם cached snapshots, לא live data

### Flow מלא - מאיסוף עד שמירה

```
CRON Job triggers (06:00 AM)
    ↓
Fetch data from Microservice
    ↓
Normalize data
    ↓
Save to PostgreSQL (Cache Tables)
    ↓
Query latest snapshot when needed
    ↓
Format for charts
    ↓
Return to frontend
```

### 1. Scheduled Jobs (CRON)

**מיקום:** `backend/src/infrastructure/jobs/index.js`

**שורה 12-31: Initialize all jobs**

```javascript
export const initializeJobs = async () => {
  // 1. Daily collection at 07:00 AM
  initializeDailyCollection(JWT_TOKEN);
  
  // 2. Individual service syncs at 06:00 AM (Asia/Jerusalem)
  startContentStudioScheduler();
  startAssessmentScheduler();
  startCourseBuilderScheduler();
  startDirectoryScheduler();
  startLearningAnalyticsScheduler();
  
  // 3. Load initial mock data
  await loadInitialMockData();
};
```

### 2. Directory Job - דוגמה מלאה

**מיקום:** `backend/src/infrastructure/jobs/DirectoryJob.js`

**שורה 9-37: `startDirectoryScheduler()`**

```javascript
export function startDirectoryScheduler() {
  // Run every day at 06:00 AM, timezone Asia/Jerusalem
  cron.schedule(
    "0 6 * * *",
    async () => {
      console.log("[CRON] Starting Directory sync at", new Date().toISOString());

      try {
        // 1. Fetch data from Directory microservice
        const companies = await fetchDirectoryDataFromService();

        // 2. Validate response
        if (!Array.isArray(companies) || companies.length === 0) {
          console.warn("[CRON] Directory sync returned an empty or non-array response");
        } else {
          // 3. Save to database cache
          await saveDirectorySnapshot(companies);
          console.log("[CRON] Directory sync finished successfully");
        }
      } catch (err) {
        console.error("[CRON] Directory sync failed:", err.message);
      }
    },
    {
      timezone: "Asia/Jerusalem"
    }
  );

  console.log("[CRON] Directory scheduler initialized - will run daily at 06:00");
}
```

**מה קורה כאן:**
1. **שורה 12:** CRON מתזמן לרוץ כל יום ב-06:00
2. **שורה 17:** קורא ל-`fetchDirectoryDataFromService()` - שולח בקשה למיקרוסרביס
3. **שורה 22:** קורא ל-`saveDirectorySnapshot()` - שומר ב-DB

### 3. Daily Collection Job (Legacy - לא בשימוש עכשיו)

**מיקום:** `backend/src/infrastructure/jobs/DailyCollectionJob.js`

**שורה 9-56: `initializeDailyCollection()`**

```javascript
export const initializeDailyCollection = (jwtToken) => {
  const cacheRepository = getCacheRepository();
  const retryService = new RetryService();
  
  collectDataUseCase = new CollectDataUseCase(
    cacheRepository,
    retryService
  );
  
  // Schedule daily collection at 07:00 AM
  cron.schedule('0 7 * * *', async () => {
    console.log('Starting daily data collection at 07:00 AM');
    
    try {
      // Execute collection
      const results = await collectDataUseCase.execute(jwtToken);
      
      // Log results
      if (results.partial) {
        console.warn('Partial data collection - some services failed:', results.failed);
      }
    } catch (error) {
      console.error('Daily collection error:', error);
    }
  });
};
```

**⚠️ הערה:** זה legacy code - בפועל כל service יש לו job נפרד (DirectoryJob, CourseBuilderJob, etc.)

### 3. Collect Data Use Case

**מיקום:** `backend/src/application/useCases/CollectDataUseCase.js`

**שורה 80-138: `execute()` method**

```javascript
async execute(jwtToken, services = null) {
  const serviceList = services?.length ? services : this.defaultServices;
  // defaultServices = ['directory', 'courseBuilder', 'assessment', 'contentStudio', 'learningAnalytics']
  
  const results = {
    successful: [],
    failed: [],
    partial: false,
    allFailed: false
  };
  
  // Process each service
  for (const service of serviceList) {
    const handler = this.serviceHandlers[service];
    
    try {
      // 1. Fetch data from microservice
      const data = await handler.fetch(jwtToken);
      
      // 2. Normalize data
      const normalized = this.normalizeData(data, service);
      
      // 3. Save to cache
      await this.cacheRepository.save(service, normalized);
      
      results.successful.push({
        service,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      // Handle errors
      results.failed.push({
        service,
        reason: error.message,
        lastSuccessful: null
      });
      results.partial = true;
    }
  }
  
  return results;
}
```

### 4. Service Clients - איך שולפים נתונים מהמיקרוסרביסים

**דוגמה: Directory Client**

**מיקום:** `backend/src/infrastructure/clients/DirectoryClient.js`

**שורה 42-98: `fetchDirectoryDataFromService()`**

```javascript
export async function fetchDirectoryDataFromService() {
  // 1. Build request object (format expected by Directory microservice)
  const requestObject = {
    requester_name: "ManagementReporting",
    payload: {},
    response: {
      companies: [
        {
          company_id: null,
          company_name: "",
          industry: "",
          company_size: "",
          date_registered: "",
          primary_hr_contact: "",
          approval_policy: "",
          decision_maker: "",
          kpis: null,
          max_test_attempts: null,
          website_url: "",
          verification_status: "",
          hierarchy: null
        }
      ]
    }
  };
  
  // 2. Send POST request to coordinator API
  const response = await axios.post(
    COORDINATOR_API_URL,  // e.g., "https://coordinator.educoreai.com"
    JSON.stringify(requestObject),
    {
      headers: { "Content-Type": "application/json" },
      timeout: 30000  // 30 seconds timeout
    }
  );
  
  // 3. Parse response
  // Directory service returns ONLY the "response" object as JSON string
  const parsed = typeof response.data === "string" 
    ? JSON.parse(response.data) 
    : response.data;
  
  // 4. Validate response structure
  if (!parsed.companies || !Array.isArray(parsed.companies)) {
    throw new Error("Expected Directory response to contain { companies: [...] }");
  }
  
  console.log(`[Directory Client] Received ${parsed.companies.length} companies`);
  
  // 5. Return companies array
  return parsed.companies;
}
```

**מה קורה כאן:**
1. **שורה 44-65:** בונה request object עם template
2. **שורה 70-75:** שולח POST request ל-coordinator API
3. **שורה 82-84:** מפרסר את ה-response (JSON string או object)
4. **שורה 87-90:** בודק שהתשובה תקינה
5. **שורה 93:** מחזיר array של companies

**Flow:**
```
DirectoryJob (CRON)
    ↓
fetchDirectoryDataFromService()
    ↓
POST to COORDINATOR_API_URL
    ↓
Directory Microservice processes request
    ↓
Returns { companies: [...] }
    ↓
Parse and validate
    ↓
Return companies array
    ↓
saveDirectorySnapshot(companies)
```

### 5. Save to Database - תהליך שמירה מפורט

**המערכת משתמשת ב-PostgreSQL כמערכת Cache, לא Redis!**

#### 5.1. Directory Cache - דוגמה מלאה

**מיקום:** `backend/src/infrastructure/db/directoryCache.js`

**שורה 13-97: `saveDirectorySnapshot()`**

```javascript
export async function saveDirectorySnapshot(dataArray) {
  if (!Array.isArray(dataArray)) {
    throw new Error("saveDirectorySnapshot expected dataArray to be an array");
  }

  const pool = getPool();
  const client = await pool.connect();

  // 1. Create snapshot date (YYYY-MM-DD format)
  const now = new Date();
  const snapshotDate = now.toISOString().slice(0, 10); // "2025-01-13"

  try {
    // 2. Begin transaction
    await client.query("BEGIN");

    // 3. Save each company as a snapshot row
    for (const data of dataArray) {
      await withRetry(async () => {
        return await client.query(
          `
          INSERT INTO directory_cache (
            snapshot_date,        -- תאריך ה-snapshot
            company_id,
            company_name,
            industry,
            company_size,
            date_registered,
            primary_hr_contact,
            approval_policy,
            decision_maker,
            kpis,                 -- JSONB field
            max_test_attempts,
            website_url,
            verification_status,
            hierarchy,            -- JSONB field
            ingested_at           -- timestamp של השמירה
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
          ON CONFLICT (snapshot_date, company_id)
          DO UPDATE SET
            company_name = EXCLUDED.company_name,
            industry = EXCLUDED.industry,
            company_size = EXCLUDED.company_size,
            -- ... update all fields
            ingested_at = EXCLUDED.ingested_at
          `,
          [
            snapshotDate,           // $1 - תאריך ה-snapshot
            data.company_id ?? "unknown",
            data.company_name ?? null,
            data.industry ?? null,
            data.company_size ?? null,
            data.date_registered ? new Date(data.date_registered) : null,
            data.primary_hr_contact ?? null,
            data.approval_policy ?? null,
            data.decision_maker ?? null,
            data.kpis ?? null,      // JSONB
            data.max_test_attempts ?? null,
            data.website_url ?? null,
            data.verification_status ?? null,
            data.hierarchy ?? null,  // JSONB
            now                     // ingested_at
          ]
        );
      }, 3); // Retry up to 3 times
    }

    // 4. Commit transaction
    await client.query("COMMIT");
    console.log(`[Directory Cache] ✅ Saved ${dataArray.length} directory snapshots for ${snapshotDate}`);
  } catch (err) {
    // 5. Rollback on error
    await client.query("ROLLBACK");
    console.error("[Directory Cache] ❌ Error saving directory snapshots to DB:", err.message);
    throw err;
  } finally {
    // 6. Release connection
    client.release();
  }
}
```

**מה קורה כאן:**
1. **שורה 22:** יוצר snapshot date (YYYY-MM-DD)
2. **שורה 25:** מתחיל transaction
3. **שורה 27-83:** שומר כל company כ-row נפרד ב-`directory_cache`
4. **שורה 49:** `ON CONFLICT` - אם כבר יש snapshot לאותו תאריך + company_id, מעדכן
5. **שורה 86:** Commit transaction
6. **שורה 91:** Rollback אם יש שגיאה

**טבלת directory_cache:**
```sql
CREATE TABLE directory_cache (
  snapshot_date DATE,           -- תאריך ה-snapshot
  company_id VARCHAR,            -- מזהה החברה
  company_name VARCHAR,
  industry VARCHAR,
  company_size VARCHAR,
  kpis JSONB,                    -- נתונים נוספים ב-JSON
  hierarchy JSONB,                -- היררכיה ב-JSON
  ingested_at TIMESTAMP,          -- מתי נשמר
  PRIMARY KEY (snapshot_date, company_id)  -- מפתח ראשי
);
```

#### 5.2. Course Builder Cache

**מיקום:** `backend/src/infrastructure/db/courseBuilderCache.js`

**שורה 12-80: `saveCourseBuilderSnapshots()`**

```javascript
export async function saveCourseBuilderSnapshots(courses) {
  const pool = getPool();
  const client = await pool.connect();
  
  const now = new Date();
  const snapshotDate = now.toISOString().slice(0, 10);

  try {
    await client.query("BEGIN");

    for (const course of courses) {
      await withRetry(async () => {
        return await client.query(
          `
          INSERT INTO course_builder_cache (
            snapshot_date,
            course_id,
            course_name,
            "totalEnrollments",
            "activeEnrollment",
            "completionRate",
            "averageRating",
            "createdAt",
            feedback,
            ingested_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          ON CONFLICT (snapshot_date, course_id)
          DO UPDATE SET
            course_name = EXCLUDED.course_name,
            "totalEnrollments" = EXCLUDED."totalEnrollments",
            -- ... update all fields
            ingested_at = EXCLUDED.ingested_at
          `,
          [
            snapshotDate,
            course.course_id ?? "unknown",
            course.course_name ?? "Unknown Course",
            course.totalEnrollments ?? 0,
            course.activeEnrollment ?? 0,
            course.completionRate ?? 0,
            course.averageRating ?? 0,
            course.createdAt ? new Date(course.createdAt) : null,
            course.feedback ?? null,
            now
          ]
        );
      }, 3);
    }

    await client.query("COMMIT");
    console.log(`[Course Builder Cache] ✅ Saved ${courses.length} course snapshots for ${snapshotDate}`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
```

#### 5.3. Assessment Cache

**מיקום:** `backend/src/infrastructure/db/assessmentCache.js`

**שורה 11-74: `saveAssessmentSnapshot()`**

```javascript
export async function saveAssessmentSnapshot(dataArray) {
  const pool = getPool();
  const client = await pool.connect();
  
  const now = new Date();
  const snapshotDate = now.toISOString().slice(0, 10);

  try {
    await client.query("BEGIN");

    for (const row of dataArray) {
      await client.query(
        `
        INSERT INTO assessments_cache (
          snapshot_date,
          user_id,
          course_id,
          exam_type,
          attempt_no,
          passing_grade,
          final_grade,
          passed,
          ingested_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (snapshot_date, user_id, course_id, exam_type, attempt_no)
        DO UPDATE SET
          passing_grade = EXCLUDED.passing_grade,
          final_grade = EXCLUDED.final_grade,
          passed = EXCLUDED.passed,
          ingested_at = EXCLUDED.ingested_at
        `,
        [
          snapshotDate,
          row.user_id ?? "unknown",
          row.course_id ?? "unknown",
          row.exam_type ?? "postcourse",
          row.attempt_no ?? 1,
          row.passing_grade ?? null,
          row.final_grade ?? null,
          row.passed ?? false,
          now
        ]
      );
    }

    await client.query("COMMIT");
    console.log(`[Assessment Cache] ✅ Saved snapshot for ${snapshotDate} with ${dataArray.length} rows`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
```

#### 5.4. Learning Analytics Snapshot (מורכב יותר)

**מיקום:** `backend/src/infrastructure/db/learningAnalyticsCache.js`

**שורה 11-367: `saveLearningAnalyticsSnapshot()`**

```javascript
export async function saveLearningAnalyticsSnapshot(data) {
  const pool = getPool();
  const client = await pool.connect();
  
  const now = new Date();
  const snapshotDate = now.toISOString().slice(0, 10);

  try {
    await client.query("BEGIN");

    // 1. Insert main snapshot
    const snapshotResult = await client.query(
      `
      INSERT INTO public.learning_analytics_snapshot (
        snapshot_date,
        period,
        start_date,
        end_date,
        calculated_at
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
      `,
      [
        snapshotDate,
        data.period || 'daily',
        data.start_date ? new Date(data.start_date) : null,
        data.end_date ? new Date(data.end_date) : null,
        now
      ]
    );
    
    const snapshotId = snapshotResult.rows[0].id;

    // 2. Insert learners data
    await client.query(
      `
      INSERT INTO public.learning_analytics_learners (
        snapshot_id,
        total_learners,
        active_learners,
        total_organizations
      )
      VALUES ($1, $2, $3, $4)
      `,
      [snapshotId, data.learners?.total || 0, data.learners?.active || 0, data.learners?.orgs || 0]
    );

    // 3. Insert courses data
    await client.query(
      `
      INSERT INTO public.learning_analytics_courses (
        snapshot_id,
        total_courses,
        courses_completed,
        average_completion_rate,
        total_enrollments,
        active_enrollments,
        average_course_duration_hours
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        snapshotId,
        data.courses?.total || 0,
        data.courses?.completed || 0,
        data.courses?.avgCompletion || 0,
        data.courses?.enrollments || 0,
        data.courses?.activeEnrollments || 0,
        data.courses?.avgDuration || 0
      ]
    );

    // 4. Insert skills, engagement, breakdowns, etc.
    // ... (similar pattern)

    await client.query("COMMIT");
    console.log(`[Learning Analytics Cache] ✅ Saved snapshot ${snapshotId} for ${snapshotDate}`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
```

**מה מיוחד כאן:**
- יש טבלה ראשית: `learning_analytics_snapshot`
- יש טבלאות משנה: `learning_analytics_learners`, `learning_analytics_courses`, etc.
- כל טבלת משנה מקושרת ל-snapshot דרך `snapshot_id` (Foreign Key)

### 6. איך הנתונים נקראים מה-Cache

**מיקום:** `backend/src/infrastructure/repositories/DatabaseAnalyticsRepository.js`

**שורה 28-48: `getLatestByService()`**

```javascript
async getLatestByService(service) {
  try {
    switch (service) {
      case 'directory':
        return await this.fetchDirectoryData();
      case 'courseBuilder':
        return await this.fetchCourseBuilderData();
      // ... other services
    }
  } catch (error) {
    console.error(`Failed to load ${service}:`, error.message);
    return null;
  }
}
```

**שורה 168-258: `fetchDirectoryData()` - דוגמה**

```javascript
async fetchDirectoryData() {
  // 1. Query latest snapshot from directory_cache
  const { rows } = await this.pool.query(`
    SELECT *
    FROM public.directory_cache
    WHERE snapshot_date = (
      SELECT MAX(snapshot_date) FROM public.directory_cache
    )
  `);

  if (!rows.length) {
    return null;
  }

  // 2. Calculate metrics from raw data
  const orgUserMap = new Map();
  let totalUsers = 0;
  const usersByDepartment = {};

  for (const row of rows) {
    // Calculate based on company_size from DB
    const approxUsers = this.estimateUsersByCompanySize(row.company_size);
    totalUsers += approxUsers;
    orgUserMap.set(row.company_name, approxUsers);

    // Calculate departments from hierarchy JSONB
    const departments = row.hierarchy?.departments || [];
    if (departments.length) {
      const perDept = Math.max(1, Math.round(approxUsers / departments.length));
      departments.forEach((dept) => {
        usersByDepartment[dept] = (usersByDepartment[dept] || 0) + perDept;
      });
    }
  }

  // 3. Build metrics object
  const metrics = {
    totalUsers,              // Calculated from DB data
    totalOrganizations: rows.length,  // Direct count
    activeUsers: Math.round(totalUsers * 0.78),  // Estimated
    usersByDepartment,       // Calculated from hierarchy JSONB
    organizationsActive: rows.filter(r => r.verification_status === 'verified').length
  };

  // 4. Build details object
  const details = {
    organizations: rows.map((row) => ({
      company_id: row.company_id,
      company_name: row.company_name,
      industry: row.industry,
      company_size: row.company_size,
      hierarchy: row.hierarchy,  // JSONB from DB
      kpis: row.kpis            // JSONB from DB
    }))
  };

  // 5. Return formatted response
  return {
    timestamp: this.extractLatestTimestamp(rows),
    data: {
      metrics,
      details
    },
    metadata: {
      source: 'directory',
      schema_version: '1.0',
      collected_at: this.extractLatestTimestamp(rows)
    }
  };
}
```

**מה קורה כאן:**
1. **שורה 169-175:** שולף את ה-snapshot האחרון (MAX snapshot_date)
2. **שורה 193-209:** מחשב metrics מהנתונים הגולמיים
3. **שורה 232-239:** בונה metrics object
4. **שורה 241-255:** בונה details object
5. **שורה 257:** מחזיר בפורמט אחיד

### 7. מדוע זה נקרא "Cache Based"?

**הסבר:**
- הנתונים **לא real-time** - הם snapshots שנאספים פעם ביום
- כל snapshot נשמר עם `snapshot_date` - אפשר לראות היסטוריה
- הנתונים נשמרים ב-DB אבל **כמו cache** - לא מעדכנים כל הזמן
- כשצריך נתונים, שולפים את ה-snapshot האחרון

**הבדל מ-Redis:**
- **Redis:** In-memory cache, מהיר מאוד, אבל לא persistent
- **PostgreSQL Cache:** Persistent, יכול לשמור היסטוריה, אבל איטי יותר

**יתרונות:**
- ✅ יכול לשמור היסטוריה (60 ימים)
- ✅ Persistent - לא נעלם אם השרת נופל
- ✅ יכול לעשות queries מורכבים
- ✅ יכול לשמור JSONB (hierarchy, kpis)

**חסרונות:**
- ❌ איטי יותר מ-Redis
- ❌ דורש יותר מקום בדיסק
- ❌ לא real-time (snapshots)

### 8. תהליך מלא - מאיסוף עד קריאה

#### 8.1. תהליך השמירה (Write Flow)

```
06:00 AM - CRON Job triggers
    ↓
DirectoryJob.startDirectoryScheduler()
    ↓
fetchDirectoryDataFromService()
    ↓
    ├─ Build request object
    ├─ POST to COORDINATOR_API_URL
    ├─ Wait for response (timeout: 30s)
    └─ Parse JSON response
    ↓
Receive companies array (e.g., 50 companies)
    ↓
saveDirectorySnapshot(companies)
    ↓
    ├─ Get database connection pool
    ├─ Create snapshot_date (YYYY-MM-DD)
    └─ BEGIN TRANSACTION
    ↓
For each company (50 iterations):
    ├─ INSERT INTO directory_cache
    │   VALUES (snapshot_date, company_id, ...)
    │   ON CONFLICT (snapshot_date, company_id)
    │   DO UPDATE SET ...
    └─ Retry up to 3 times if fails
    ↓
COMMIT TRANSACTION
    ↓
Release connection
    ↓
Done! 50 rows saved to directory_cache
```

**דוגמה קונקרטית:**
```
Date: 2025-01-13 06:00:00
Snapshot Date: "2025-01-13"

Companies received: 50

Transaction:
  INSERT INTO directory_cache (snapshot_date='2025-01-13', company_id='COMP-001', ...)
  INSERT INTO directory_cache (snapshot_date='2025-01-13', company_id='COMP-002', ...)
  ...
  INSERT INTO directory_cache (snapshot_date='2025-01-13', company_id='COMP-050', ...)

Result: 50 rows in directory_cache with snapshot_date='2025-01-13'
```

#### 8.2. תהליך הקריאה (Read Flow)

```
User opens dashboard
    ↓
GET /api/v1/dashboard
    ↓
DashboardController.getDashboard()
    ↓
GetDashboardUseCase.execute()
    ↓
DatabaseAnalyticsRepository.getLatestEntries()
    ↓
getLatestByService('directory')
    ↓
fetchDirectoryData()
    ↓
    ├─ Query: SELECT * FROM directory_cache
    │   WHERE snapshot_date = (
    │     SELECT MAX(snapshot_date) FROM directory_cache
    │   )
    └─ Returns: All rows with latest snapshot_date
    ↓
Calculate metrics from rows:
    ├─ totalUsers = sum(estimateUsersByCompanySize(company_size))
    ├─ totalOrganizations = rows.length
    ├─ activeUsers = calculate from kpis or estimate
    ├─ usersByDepartment = calculate from hierarchy JSONB
    └─ organizationsActive = count(verification_status='verified')
    ↓
Build response:
    {
      timestamp: "2025-01-13T06:00:00Z",
      data: {
        metrics: { totalUsers: 5000, ... },
        details: { organizations: [...] }
      },
      metadata: {
        source: "directory",
        collected_at: "2025-01-13T06:00:00Z"
      }
    }
    ↓
Format as ChartData entities
    ↓
Return JSON to frontend
    ↓
Frontend renders charts
```

**דוגמה קונקרטית:**
```
Query: SELECT * FROM directory_cache WHERE snapshot_date = '2025-01-13'
Result: 50 rows

Calculation:
  Row 1: company_size='50-200' → estimateUsersByCompanySize() → 125 users
  Row 2: company_size='200-500' → 350 users
  ...
  Total: 5000 users

Metrics:
  totalUsers: 5000
  totalOrganizations: 50
  activeUsers: 3900 (78% of total)
  organizationsActive: 45 (verified)
```

### 9. מדוע PostgreSQL ולא Redis?

**הסבר טכני:**

**Redis (במקור תוכנן):**
- ✅ מהיר מאוד (in-memory)
- ✅ TTL אוטומטי
- ❌ לא persistent (נעלם אם השרת נופל)
- ❌ לא יכול לעשות queries מורכבים
- ❌ לא יכול לשמור JSONB structures

**PostgreSQL (מה שבפועל):**
- ✅ Persistent - הנתונים נשמרים בדיסק
- ✅ יכול לעשות queries מורכבים (JOIN, GROUP BY, etc.)
- ✅ תומך ב-JSONB (hierarchy, kpis)
- ✅ יכול לשמור היסטוריה (60 ימים)
- ✅ Foreign Keys ו-Constraints
- ❌ איטי יותר מ-Redis (אבל עדיין מהיר מספיק)

**למה שינו ל-PostgreSQL:**
1. צריך לשמור היסטוריה (60 ימים)
2. צריך לעשות queries מורכבים (JOIN בין טבלאות)
3. צריך לשמור JSONB (hierarchy, kpis)
4. צריך persistent storage (לא רוצים לאבד נתונים)

**הטבלאות בפועל:**
```sql
-- Cache tables (snapshots)
directory_cache          -- Companies snapshots
course_builder_cache     -- Courses snapshots
assessments_cache        -- Assessments snapshots
learning_analytics_snapshot  -- Main snapshot table
learning_analytics_learners  -- Related to snapshot
learning_analytics_courses   -- Related to snapshot
-- ... more related tables

-- Content Studio (normalized, not snapshots)
courses                  -- Master courses table
topics                   -- Master topics table
contents                 -- Master contents table
course_topics            -- Many-to-many relationship
```

**הבדל בין Cache Tables ל-Master Tables:**
- **Cache Tables:** Snapshots עם `snapshot_date` - נתונים ישנים נשארים
- **Master Tables:** מעודכנים כל הזמן - רק הנתונים האחרונים

### 10. Cleanup - מחיקת נתונים ישנים

**מיקום:** `DB/migration.sql`

```sql
-- Delete snapshots older than 60 days
DELETE FROM public.learning_analytics_snapshot 
WHERE snapshot_date < CURRENT_DATE - 60;

-- Cascade delete will remove related rows automatically
-- (because of ON DELETE CASCADE in foreign keys)
```

**איך זה עובד:**
- כל יום ב-06:00, ה-CRON job שומר snapshot חדש
- כל 60 יום, הנתונים הישנים נמחקים אוטומטית
- זה נקרא "Rolling Window" - חלון של 60 ימים

**דוגמה:**
```
Today: 2025-01-13
Keep: 2024-11-14 to 2025-01-13 (60 days)
Delete: Everything before 2024-11-14
```

---

## 📈 תהליך יצירת Charts

### 1. Format Chart Data

**מיקום:** `backend/src/application/useCases/GetDashboardUseCase.js`

**שורה 196-301: `formatChartData()` and helpers**

```javascript
formatChartData(entry, service, chartType = 'main') {
  // 1. Extract metrics
  let metrics = entry?.data?.metrics || entry?.metrics || {};
  
  // 2. Format based on chart type
  if (chartType === 'main') {
    return this.formatMainChartData(service, metrics);
  }
  
  return this.formatDetailedChartData(service, metrics, chartType, entry);
}

formatMainChartData(service, metrics) {
  // Select key metrics for main chart
  const keyMetricsMap = {
    directory: ['totalUsers', 'totalOrganizations', 'activeUsers'],
    courseBuilder: ['totalCourses', 'totalEnrollments', 'averageCompletionRate'],
    assessment: ['totalAssessments', 'averageScore', 'passRate'],
    // ...
  };
  
  const keyMetrics = keyMetricsMap[service] || Object.keys(metrics).slice(0, 5);
  
  // Format as array for chart
  return Object.entries(keyMetrics)
    .filter(([key]) => metrics[key] !== undefined && typeof metrics[key] === 'number')
    .map(([key, value]) => ({
      name: formatMetricName(key),
      value: Math.round(value * 100) / 100
    }));
}
```

### 2. Create Chart Entity

**מיקום:** `backend/src/domain/entities/ChartData.js`

```javascript
export class ChartData {
  constructor({ id, title, type, data, description, metadata }) {
    this.id = id;
    this.title = title;
    this.type = type; // 'bar', 'line', 'pie', 'area'
    this.data = data; // Array of { name, value } or { name, series1, series2, ... }
    this.description = description;
    this.metadata = metadata;
  }
  
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      type: this.type,
      data: this.data,
      description: this.description,
      metadata: this.metadata
    };
  }
}
```

### 3. Frontend Chart Rendering

**מיקום:** `frontend/src/components/Charts/BarChart.jsx` (דוגמה)

```javascript
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export const BarChart = ({ data, width = '100%', height = 400, colorScheme }) => {
  return (
    <RechartsBarChart width={width} height={height} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey="value" fill={colorScheme?.primary || '#6366f1'} />
    </RechartsBarChart>
  );
};
```

---

## 🤖 תהליך Chart Transcription

### Flow מלא

```
User opens dashboard
    ↓
Charts render
    ↓
Startup transcription flow begins
    ↓
Fetch ALL charts (priority + BOX)
    ↓
Wait for charts to render (DOM)
    ↓
Build chart payloads (JSON)
    ↓
POST /api/v1/ai/chart-transcription/startup
    ↓
Backend processes charts sequentially
    ↓
For each chart:
    ↓
    Check if transcription exists in DB
    ↓
    If exists → Skip (startup only creates if missing)
    ↓
    If not exists:
        ↓
        Call OpenAI API (JSON payload)
        ↓
        OpenAI returns transcription text
        ↓
        Save to database (UPSERT)
        ↓
        Wait 800ms (rate limiting)
    ↓
Next chart
    ↓
Return results to frontend
    ↓
Done!
```

### 1. Frontend - Startup Flow

**מיקום:** `frontend/src/hooks/useDashboardData.js`

**שורה 229-360: Startup transcription**

```javascript
// Only run once per session
const isStartupDone = getStartupTranscriptionDone();
if (!isStartupDone) {
  // Mark as done immediately
  setStartupTranscriptionDone(true);
  
  // 1. Fetch ALL charts
  const allChartsResponse = await dashboardAPI.getAllCharts();
  const allChartsForTranscription = allChartsResponse.data?.charts || [];
  
  // 2. Wait for charts to render
  await waitForChartsStartup(20, 500); // Wait up to 10 seconds
  await new Promise(resolve => setTimeout(resolve, 2000)); // Additional 2 seconds
  
  // 3. Build payloads
  const chartsForStartup = [];
  for (const chart of allChartsForTranscription) {
    const chartPayload = buildChartTranscriptionPayload(chart);
    chartsForStartup.push({
      chartId: chart.id,
      context: chart.title,
      chartPayload
    });
  }
  
  // 4. Send to backend
  await chartTranscriptionAPI.startup(chartsForStartup);
}
```

**שורה 27-61: `buildChartTranscriptionPayload()`**

```javascript
const buildChartTranscriptionPayload = (chart) => {
  const dataArray = Array.isArray(chart.data) ? chart.data : [];
  const trimmedData = dataArray.slice(0, MAX_TRANSCRIPTION_POINTS).map(sanitizeDataPoint);
  
  return {
    chartId: chart.id || '',
    title: chart.title || '',
    type: chart.type || 'chart',
    axes: {
      x: metadata.xAxisLabel || null,
      y: metadata.yAxisLabel || null
    },
    seriesKeys: trimmedData.length > 0 
      ? Object.keys(trimmedData[0]).filter(key => key !== 'name' && typeof trimmedData[0][key] === 'number')
      : [],
    metadata: {
      services: metadata.services || [],
      colorScheme: metadata.colorScheme || null
    },
    data: trimmedData // Max 200 data points
  };
};
```

### 2. Backend - Startup Endpoint

**מיקום:** `backend/src/presentation/routes/chartTranscription.js`

**שורה 104-503: `/chart-transcription/startup`**

```javascript
router.post('/chart-transcription/startup', async (req, res) => {
  const { charts } = req.body;
  
  // Validate
  if (!Array.isArray(charts) || charts.length === 0) {
    return res.status(400).json({ ok: false, error: 'charts[] required' });
  }
  
  const results = [];
  
  // Process charts sequentially (one at a time)
  for (let i = 0; i < charts.length; i++) {
    const c = charts[i];
    const { chartId, chartPayload, context } = c;
    
    try {
      // 1. Check if transcription already exists
      const existing = await findByChartId(chartId);
      
      if (existing && existing.transcription_text) {
        // Skip - already exists (startup only creates if missing)
        results.push({ chartId, status: 'skipped', reason: 'already_exists' });
        continue;
      }
      
      // 2. Add delay between charts (except first)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      
      // 3. Call OpenAI
      const text = await openaiQueue.enqueue(async () => {
        return await transcribeChartJson({ chartPayload, context });
      });
      
      // 4. Save to database
      const savedData = await upsertTranscriptionSimple({ chartId, text });
      
      results.push({ 
        chartId, 
        status: 'created',
        transcription_text: savedData.transcription_text
      });
    } catch (error) {
      results.push({ chartId, status: 'error', error: error.message });
    }
  }
  
  res.json({ ok: true, results });
});
```

### 3. OpenAI Service

**מיקום:** `backend/src/application/services/transcribeChartService.js`

**שורה 127-199: `transcribeChartJson()`**

```javascript
export async function transcribeChartJson({ chartPayload, context }) {
  if (!openai) {
    // Mock fallback for development
    return `Chart Analysis\n• This chart displays data trends...`;
  }
  
  const model = 'gpt-4o-mini'; // Lower cost, higher TPM limits
  
  // Serialize payload
  const serializedPayload = JSON.stringify(chartPayload, null, 2);
  
  // Call OpenAI
  const response = await withRetry(async () => {
    return await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: JSON_SYSTEM_PROMPT // Instructions for OpenAI
        },
        {
          role: 'user',
          content: `Context: ${context || 'Chart'}\n\nChart JSON:\n${serializedPayload}`
        }
      ],
      max_tokens: 400
    });
  }, 3); // Retry up to 3 times
  
  const text = response.choices[0]?.message?.content?.trim() || '';
  
  if (!text) {
    throw new Error('Empty transcription from OpenAI');
  }
  
  return text;
}
```

**System Prompt (שורה 1-33):**
```javascript
const JSON_SYSTEM_PROMPT = `You are an expert data analyst. Analyze the provided chart JSON data and provide a concise, insightful description.

Focus on:
- Key trends and patterns
- Notable data points
- Comparisons between series
- Business insights

Keep response under 400 tokens.`;
```

### 4. Save to Database

**מיקום:** `backend/src/infrastructure/repositories/ChartTranscriptionsRepository.js`

**שורה 282-425: `upsertTranscriptionSimple()`**

```javascript
export async function upsertTranscriptionSimple({ chartId, text }) {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    // Compute signature (hash of chartId)
    const signature = computeChartSignature(chartId);
    
    // UPSERT (INSERT ... ON CONFLICT ... UPDATE)
    const result = await client.query(
      `INSERT INTO ai_chart_transcriptions 
       (chart_id, chart_signature, model, transcription_text, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (chart_id) 
       DO UPDATE SET 
         transcription_text = EXCLUDED.transcription_text,
         updated_at = NOW()
       RETURNING *`,
      [chartId, signature, 'gpt-4o-mini', text]
    );
    
    return result.rows[0];
  } finally {
    client.release();
  }
}
```

### 5. Read Transcription

**מיקום:** `backend/src/presentation/routes/chartTranscription.js`

**שורה 24-88: `GET /chart-transcription/:chartId`**

```javascript
router.get('/chart-transcription/:chartId', async (req, res) => {
  const chartId = req.params.chartId;
  
  try {
    // Query database
    const row = await findByChartId(chartId);
    
    // Always return 200 (never 404)
    if (!row) {
      return res.status(200).json({ 
        chartId,
        exists: false,
        transcription_text: null
      });
    }
    
    // Return transcription
    res.status(200).json({ 
      chartId: row.chart_id,
      exists: true,
      transcription_text: row.transcription_text
    });
  } catch (err) {
    // Error handling
    res.status(500).json({ 
      exists: false,
      transcription_text: null,
      error: err.message
    });
  }
});
```

---

## 🔄 תהליך Refresh Data

### Flow מלא

```
User clicks "Refresh Data" button
    ↓
POST /api/v1/dashboard/refresh
    ↓
DashboardController.refreshData()
    ↓
triggerManualCollection()
    ↓
CollectDataUseCase.execute()
    ↓
Fetch data from all microservices
    ↓
Save to database
    ↓
Return refresh status
    ↓
Frontend receives response
    ↓
Update charts with new data
    ↓
Wait for charts to render
    ↓
Refresh transcription flow begins
    ↓
POST /api/v1/ai/chart-transcription/refresh
    ↓
Backend processes charts sequentially
    ↓
For each chart:
    ↓
    Always call OpenAI (overwrite)
    ↓
    Save to database
    ↓
    Wait 800ms
    ↓
Next chart
    ↓
Done!
```

### 1. Frontend - Refresh

**מיקום:** `frontend/src/hooks/useDashboardData.js`

**שורה 403-698: `refreshData()`**

```javascript
const refreshData = async (services) => {
  setRefreshing(true);
  
  // 1. Clear saved report from sessionStorage
  sessionStorage.removeItem('lastGeneratedReportData');
  
  // 2. Call backend
  const response = await dashboardAPI.refreshData(services);
  const dashboardData = response.data;
  
  // 3. Update state
  setData(dashboardData);
  setLastUpdated(dashboardData.lastUpdated);
  setRefreshStatus(dashboardData.refreshStatus || null);
  
  // 4. Wait for React to update DOM (3 seconds)
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // 5. Wait for charts to render
  await waitForCharts(20, 500);
  
  // 6. Additional wait to ensure charts show NEW data (3 seconds)
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // 7. Fetch ALL charts
  const allChartsResponse = await dashboardAPI.getAllCharts();
  const allChartsForTranscription = allChartsResponse.data?.charts || [];
  
  // 8. Build payloads and send to refresh endpoint
  const chartsForRefresh = allChartsForTranscription.map(chart => ({
    chartId: chart.id,
    context: chart.title,
    chartPayload: buildChartTranscriptionPayload(chart)
  }));
  
  // 9. Send to backend
  await chartTranscriptionAPI.refresh(chartsForRefresh);
};
```

### 2. Backend - Refresh Endpoint

**מיקום:** `backend/src/presentation/routes/chartTranscription.js`

**שורה 311-503: `/chart-transcription/refresh`**

```javascript
router.post('/chart-transcription/refresh', async (req, res) => {
  const { charts } = req.body;
  
  const results = [];
  
  // Process charts sequentially
  for (let i = 0; i < charts.length; i++) {
    const c = charts[i];
    const { chartId, chartPayload, context } = c;
    
    try {
      // Add delay (except first)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      
      // ALWAYS call OpenAI (refresh always overwrites)
      const text = await openaiQueue.enqueue(async () => {
        return await transcribeChartJson({ chartPayload, context });
      });
      
      // Save to database (always overwrite)
      const savedData = await upsertTranscriptionSimple({ chartId, text });
      
      results.push({ 
        chartId, 
        status: 'updated',
        transcription_text: savedData.transcription_text
      });
    } catch (error) {
      results.push({ chartId, status: 'error', error: error.message });
    }
  }
  
  res.json({ ok: true, results });
});
```

**הבדל בין startup ל-refresh:**
- **Startup:** יוצר transcription רק אם לא קיים
- **Refresh:** תמיד קורא ל-OpenAI ומעדכן (overwrite)

---

## 📄 תהליך יצירת Reports

### Flow מלא

```
User navigates to /reports
    ↓
ReportsPage component mounts
    ↓
Fetch report types
    ↓
User selects report type
    ↓
Click "Generate Report"
    ↓
POST /api/v1/reports/generate
    ↓
GenerateReportUseCase.execute()
    ↓
Collect data from cache
    ↓
Generate charts for report
    ↓
Call OpenAI for report conclusions
    ↓
Generate PDF
    ↓
Return PDF blob
    ↓
Frontend displays PDF
    ↓
User can download
```

### 1. Frontend - Reports Page

**מיקום:** `frontend/src/components/Reports/ReportsPage.jsx`

```javascript
const handleGenerateReport = async (reportType) => {
  setGenerating(true);
  
  try {
    // Call backend
    const response = await reportsAPI.generateReport(reportType, { format: 'pdf' });
    
    // Create blob URL
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    
    // Display in iframe
    setPdfUrl(url);
  } catch (error) {
    setError(error.message);
  } finally {
    setGenerating(false);
  }
};
```

### 2. Backend - Generate Report

**מיקום:** `backend/src/presentation/routes/reports.js`

```javascript
router.post('/generate', async (req, res) => {
  const { reportType, format = 'pdf' } = req.body;
  
  // 1. Execute Use Case
  const reportData = await generateReportUseCase.execute(reportType);
  
  // 2. Generate PDF
  if (format === 'pdf') {
    const pdfBuffer = await pdfGenerator.generate(reportData);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${reportType}.pdf"`);
    res.send(pdfBuffer);
  }
});
```

### 3. Generate Report Use Case

**מיקום:** `backend/src/application/useCases/GenerateReportUseCase.js`

```javascript
async execute(reportType) {
  // 1. Get data from cache
  const latestEntries = await this.cacheRepository.getLatestEntries();
  
  // 2. Generate charts for report
  const charts = this.generateReportCharts(reportType, latestEntries);
  
  // 3. Call OpenAI for conclusions
  const conclusions = await this.reportConclusionsService.generate(
    reportType,
    charts
  );
  
  // 4. Return report data
  return {
    reportType,
    charts,
    conclusions,
    generatedAt: new Date().toISOString()
  };
}
```

---

## 🔍 תהליך AI Custom SQL

### Flow מלא

```
User navigates to /ai-custom
    ↓
User types natural language query
    ↓
Click "Generate graph"
    ↓
POST /api/ai-custom/query-data
    ↓
AICustomSqlService.generateSqlWithOpenAi()
    ↓
OpenAI generates SQL query
    ↓
Validate SQL safety (SELECT only, no dangerous keywords)
    ↓
Add LIMIT if missing
    ↓
Execute query against PostgreSQL
    ↓
Return results (columns, rows)
    ↓
Frontend transforms to chart data
    ↓
Display chart or table
```

### 1. Frontend - AI Custom Page

**מיקום:** `frontend/src/components/AICustom/AICustomPage.jsx`

**שורה 284-342: `handleGenerate()`**

```javascript
const handleGenerate = async () => {
  const trimmedInput = userInput.trim();
  
  setLoading(true);
  
  try {
    // Call backend
    const response = await aiCustomAPI.queryData(trimmedInput);
    const data = response.data;
    
    // Handle different statuses
    if (data.status === 'no_match') {
      setError(data.message || 'No matching tables found');
      return;
    }
    
    if (data.status === 'ok') {
      // Transform to chart/table data
      const transformed = transformToChartData(data.columns, data.rows);
      
      setResult({
        sql: data.sql,
        reason: data.reason,
        rowCount: data.rowCount,
        columns: data.columns,
        rows: data.rows,
        transformed
      });
    }
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

**שורה 196-282: `transformToChartData()`**

```javascript
const transformToChartData = (columns, rows) => {
  // Empty result
  if (!rows || rows.length === 0) {
    return { kind: 'empty' };
  }
  
  // First column is X-axis (labels)
  const xCol = columns[0];
  const xKey = xCol.name;
  
  // Find all numeric columns beyond the first
  const numericColumns = [];
  for (let i = 1; i < columns.length; i++) {
    const col = columns[i];
    const sampleValues = rows.slice(0, 10).map(r => r[col.name]);
    const hasNumeric = sampleValues.some(v => isNumericValue(v));
    
    if (hasNumeric) {
      numericColumns.push(col);
    }
  }
  
  // No numeric columns -> table view
  if (numericColumns.length === 0) {
    return { kind: 'table', columns, rows };
  }
  
  // Extract labels and values
  const labels = rows.map(row => String(row[xKey] || ''));
  const series = numericColumns.map(col => ({
    key: col.name,
    label: col.name,
    values: rows.map(row => {
      const v = row[col.name];
      return typeof v === 'number' ? v : Number(v) || 0;
    })
  }));
  
  // Format chart data
  let chartData;
  if (series.length === 1) {
    // Single series
    chartData = labels.map((label, index) => ({
      name: label,
      value: series[0].values[index]
    }));
  } else {
    // Multiple series
    chartData = labels.map((label, index) => {
      const item = { name: label };
      series.forEach(s => {
        item[s.key] = s.values[index];
      });
      return item;
    });
  }
  
  return {
    kind: 'chart',
    xKey,
    labels,
    series,
    chartData,
    isMultiSeries: series.length > 1
  };
};
```

### 2. Backend - AI Custom Route

**מיקום:** `backend/src/presentation/routes/aiCustom.js`

**שורה 226-355: `/query-data`**

```javascript
router.post('/query-data', async (req, res) => {
  const { queryText } = req.body;
  
  // 1. Validate input
  const validation = validateQueryText(queryText);
  if (!validation.valid) {
    return res.status(400).json({ status: 'error', message: validation.error });
  }
  
  // 2. Generate SQL using OpenAI
  const sqlResult = await aiCustomSqlService.generateSqlWithOpenAi(trimmedText);
  
  if (sqlResult.status === 'no_match') {
    return res.status(200).json({
      status: 'no_match',
      message: sqlResult.reason
    });
  }
  
  // 3. Validate SQL safety
  const safetyCheck = validateSqlSafety(sqlResult.sql);
  if (!safetyCheck.valid) {
    return res.status(400).json({
      status: 'error',
      message: 'SQL safety check failed'
    });
  }
  
  // 4. Add LIMIT if missing
  const safeSql = addLimitIfMissing(sqlResult.sql, 5000);
  
  // 5. Execute query
  try {
    const queryResult = await runAiCustomQuery(safeSql, 30000);
    
    return res.status(200).json({
      status: 'ok',
      sql: safeSql,
      reason: sqlResult.reason,
      rowCount: queryResult.rowCount,
      columns: queryResult.columns,
      rows: queryResult.rows
    });
  } catch (dbError) {
    return res.status(500).json({
      status: 'error',
      message: 'Query execution failed'
    });
  }
});
```

### 3. SQL Safety Validation

**מיקום:** `backend/src/utils/sqlSafety.js`

**שורה 12-54: `validateSqlSafety()`**

```javascript
export function validateSqlSafety(sql) {
  // 1. Must be non-empty string
  if (!sql || typeof sql !== 'string' || sql.trim().length === 0) {
    return { valid: false, error: 'SQL query must be a non-empty string' };
  }
  
  const trimmed = sql.trim();
  
  // 2. Must start with SELECT
  const selectPattern = /^\s*select\b/i;
  if (!selectPattern.test(trimmed)) {
    return { valid: false, error: 'Only SELECT queries are allowed' };
  }
  
  // 3. Check for dangerous keywords
  const dangerousKeywords = [
    'insert', 'update', 'delete', 'drop', 'alter', 'truncate',
    'create', 'grant', 'revoke', 'execute', 'call', 'prepare'
  ];
  
  const upperSql = trimmed.toUpperCase();
  for (const keyword of dangerousKeywords) {
    const keywordPattern = new RegExp(`\\b${keyword}\\b`, 'i');
    if (keywordPattern.test(trimmed)) {
      return { valid: false, error: `Disallowed keyword found: ${keyword}` };
    }
  }
  
  // 4. Check for multiple statements
  const withoutTrailingSemicolon = trimmed.replace(/;\s*$/, '');
  if (withoutTrailingSemicolon.includes(';')) {
    return { valid: false, error: 'Multiple statements are not allowed' };
  }
  
  return { valid: true, error: null };
}
```

### 4. OpenAI SQL Generation

**מיקום:** `backend/src/application/services/AICustomSqlService.js`

**שורה 31-131: `buildAiSqlPrompt()`**

```javascript
buildAiSqlPrompt(userText, migrationSql) {
  const systemMessage = {
    role: 'system',
    content: `You are an expert SQL generator for an analytics dashboard.

CRITICAL SAFETY RULES:
- You must only generate a **single PostgreSQL SELECT query**
- The query must be read-only: no INSERT, UPDATE, DELETE, DROP, ALTER
- Do not use temporary tables or stored procedures
- No multiple statements

MAPPING PHILOSOPHY:
- Always attempt to produce the most reasonable SQL query
- Prefer best-effort queries over "no_match"
- Make reasonable assumptions when information is missing

You receive:
- The full PostgreSQL schema from migration.sql
- A natural language request from the user

Generate the SQL query that best matches the user's request.`
  };
  
  const userMessage = {
    role: 'user',
    content: `User Request: ${userText}\n\nDatabase Schema:\n${migrationSql}`
  };
  
  return [systemMessage, userMessage];
}
```

---

## 📝 סיכום - נקודות מפתח לראיון

### 1. ארכיטקטורה
- **Onion Architecture** - הפרדה בין שכבות
- **Repository Pattern** - הפרדה בין business logic ל-data access
- **Use Cases** - כל business logic ב-use cases

### 2. תהליכים מרכזיים
- **Data Collection:** CRON jobs → Microservices → Database
- **Dashboard Loading:** Cache → Use Case → Format → Frontend
- **Chart Transcription:** Frontend → OpenAI → Database
- **Reports:** Data → Charts → OpenAI → PDF

### 3. טכנולוגיות
- **Frontend:** React + Vite + Recharts + TailwindCSS
- **Backend:** Node.js + Express + PostgreSQL
- **AI:** OpenAI GPT-4o-mini
- **Jobs:** node-cron

### 4. נקודות חשובות
- **Caching:** Browser cache + Database cache
- **Rate Limiting:** OpenAI queue + delays between requests
- **SQL Safety:** Validation לפני execution
- **Error Handling:** Graceful degradation בכל מקום

---

**מסמך זה מכיל הסבר מפורט על כל תהליך במערכת. כל קטע קוד כולל מיקום מדויק בקוד.**

**בהצלחה בראיון! 🚀**


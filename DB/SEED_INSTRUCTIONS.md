# Manual SQL Seed Execution Instructions

## Overview
The file `DB/seed_mock_data.sql` contains safe, idempotent INSERT statements to populate database tables with mock data.

**Safety Features:**
- Uses `INSERT ... ON CONFLICT DO NOTHING` (safe to re-run)
- Does NOT touch: `ai_chart_transcriptions`, `ai_report_conclusions`
- No DROP, TRUNCATE, DELETE, or ALTER statements
- Respects all constraints (PK, FK, ENUM, CHECK)

---

## Method 1: Using psql with DATABASE_URL

### From Command Line

```bash
# Set DATABASE_URL environment variable
export DATABASE_URL="postgresql://user:password@host:port/database"

# Execute the SQL file
psql "$DATABASE_URL" -f DB/seed_mock_data.sql
```

### From PowerShell (Windows)

```powershell
# Set DATABASE_URL environment variable
$env:DATABASE_URL = "postgresql://user:password@host:port/database"

# Execute the SQL file
psql $env:DATABASE_URL -f DB/seed_mock_data.sql
```

### With Connection String Directly

```bash
psql "postgresql://user:password@host:port/database" -f DB/seed_mock_data.sql
```

---

## Method 2: Using Supabase SQL Editor

1. **Open Supabase Dashboard**
   - Navigate to your project
   - Go to **SQL Editor**

2. **Copy SQL Content**
   - Open `DB/seed_mock_data.sql` in your editor
   - Copy the entire file contents

3. **Paste and Execute**
   - Paste the SQL into the SQL Editor
   - Click **Run** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

4. **Verify Execution**
   - Check for success message
   - Any "duplicate key" warnings are expected (ON CONFLICT DO NOTHING)

---

## Method 3: Using pgAdmin or DBeaver

1. **Connect to Database**
   - Open your database client
   - Connect using your credentials

2. **Open SQL File**
   - File → Open → Select `DB/seed_mock_data.sql`

3. **Execute**
   - Click Execute/Run button
   - Or press `F5`

---

## Verification

After execution, verify data was inserted:

```sql
-- Check organizations
SELECT COUNT(*) FROM public.directory_cache;

-- Check courses
SELECT COUNT(*) FROM public.courses;

-- Check topics
SELECT COUNT(*) FROM public.topics;

-- Check learning analytics snapshots
SELECT COUNT(*) FROM public.learning_analytics_snapshot;
```

---

## Notes

- **Idempotent**: Safe to run multiple times
- **Non-destructive**: Will not delete or modify existing data
- **Selective**: Only inserts into allowed tables
- **Recent dates**: All dates are within last 30-60 days

---

## Troubleshooting

### Error: "relation does not exist"
- Ensure migrations have been run first
- Check that all tables exist in the database

### Error: "duplicate key value"
- This is expected and handled by `ON CONFLICT DO NOTHING`
- Data already exists, script safely skips duplicates

### Error: "permission denied"
- Check database user has INSERT permissions
- Verify connection credentials


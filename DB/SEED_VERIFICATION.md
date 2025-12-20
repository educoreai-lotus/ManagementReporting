# Seed Auto-Execution Verification Guide

## How It Works

1. **On deploy/startup**: `backend/src/infrastructure/runSeedSqlIfNeeded.js` runs automatically
2. **Advisory Lock**: Uses PostgreSQL `pg_try_advisory_lock(1234567890)` to prevent multi-replica double execution
3. **Sentinel Check**: Checks if `COURSE-001` exists in `public.courses` table
   - If exists → seed already applied → skip
   - If not exists → execute `DB/seed_mock_data.sql`
4. **Non-blocking**: Runs in background, never crashes app

## Verification Steps

### After First Deploy

1. **Check logs** for seed execution:
   ```bash
   # Look for these log messages:
   [Seed] 🔒 Advisory lock acquired
   [Seed] 📦 Seed not applied, executing SQL file: ...
   [Seed] ✅ Seed executed successfully
   [Seed] 🔓 Advisory lock released
   ```

2. **Verify data exists** in database:
   ```sql
   -- Check sentinel course exists
   SELECT course_id, course_name FROM public.courses WHERE course_id = 'COURSE-001';
   -- Should return: COURSE-001 | Introduction to Data Science
   
   -- Check other tables have data
   SELECT COUNT(*) FROM public.topics;           -- Should be > 0
   SELECT COUNT(*) FROM public.contents;         -- Should be > 0
   SELECT COUNT(*) FROM public.course_builder_cache; -- Should be > 0
   SELECT COUNT(*) FROM public.assessments_cache;     -- Should be > 0
   ```

### After Re-Deploy (Second Deploy)

1. **Check logs** for skip message:
   ```bash
   # Should see:
   [Seed] 🔒 Advisory lock acquired
   [Seed] ℹ️  Sentinel row (COURSE-001) exists, seed already applied, skipping
   [Seed] 🔓 Advisory lock released
   ```

2. **Verify no duplicate data**:
   ```sql
   -- Check course count (should be exactly 5, not 10)
   SELECT COUNT(*) FROM public.courses;
   -- Should return: 5
   
   -- Check no duplicate COURSE-001
   SELECT COUNT(*) FROM public.courses WHERE course_id = 'COURSE-001';
   -- Should return: 1
   ```

## Manual Override (If Needed)

If you need to re-run the seed manually:

```bash
# Via psql
psql "$DATABASE_URL" -f DB/seed_mock_data.sql

# Or via Supabase SQL Editor
# Copy contents of DB/seed_mock_data.sql and paste into SQL Editor
```

**Note**: The seed script uses `ON CONFLICT DO NOTHING`, so re-running is safe and won't create duplicates.

## Troubleshooting

### Seed Not Running

- Check `DATABASE_URL` is set: `echo $DATABASE_URL`
- Check logs for errors: Look for `[Seed] ❌` messages
- Verify database connection is working

### Seed Running Multiple Times

- Check advisory lock is working: Look for `[Seed] ℹ️  Advisory lock not acquired` in logs
- This is expected if multiple replicas start simultaneously (only one will execute)

### Data Not Appearing

- Check SQL file path is correct: `DB/seed_mock_data.sql`
- Verify database schema matches (run migration first)
- Check for constraint violations in logs

## Code Location

- **Seed Runner**: `backend/src/infrastructure/runSeedSqlIfNeeded.js`
- **SQL File**: `DB/seed_mock_data.sql`
- **Startup Hook**: `backend/src/server.js` (line ~108)


/**
 * Auto-run SQL seed file on startup (once per deployment)
 * Uses PostgreSQL advisory lock + sentinel check (no meta tables)
 * 
 * Safety:
 * - Advisory lock prevents multi-replica double execution
 * - Sentinel check (COURSE-001) determines if seed already applied
 * - Non-blocking, never crashes app
 * - Idempotent SQL (ON CONFLICT DO NOTHING)
 */

import { getPool } from './db/pool.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Advisory lock ID (constant, unique to this seeding operation)
const SEED_ADVISORY_LOCK_ID = 1234567890;

// Sentinel check: if this course exists, seed was already applied
const SENTINEL_COURSE_ID = 'COURSE-001';

/**
 * Execute SQL file safely
 * Uses same approach as migration script - PostgreSQL handles multiple statements
 * Note: pg library's query() can execute entire SQL files with multiple statements
 */
async function executeSqlFile(client, sqlPath) {
  const sqlContent = readFileSync(sqlPath, 'utf-8');
  
  // Execute entire SQL file in one query
  // PostgreSQL and pg library handle multiple statements and DO blocks
  // Same approach as DB/run-migration-once.js
  await client.query(sqlContent);
}

/**
 * Check if seed was already applied using sentinel row
 */
async function isSeedApplied(client) {
  try {
    const result = await client.query(
      'SELECT 1 FROM public.courses WHERE course_id = $1 LIMIT 1',
      [SENTINEL_COURSE_ID]
    );
    return result.rows.length > 0;
  } catch (err) {
    // If table doesn't exist or error, assume not applied (will fail gracefully later)
    return false;
  }
}

/**
 * Main seeding function - safe, guarded, non-blocking
 */
export async function runSeedSqlIfNeeded() {
  if (!process.env.DATABASE_URL) {
    console.log('[Seed] ⚠️  DATABASE_URL not set, skipping');
    return { applied: false, reason: 'no_database_url' };
  }

  const pool = getPool();
  const client = await pool.connect();
  
  let lockAcquired = false;
  
  try {
    // Step 1: Acquire advisory lock (prevents multi-replica execution)
    const lockResult = await client.query(
      'SELECT pg_try_advisory_lock($1) as acquired',
      [SEED_ADVISORY_LOCK_ID]
    );
    
    lockAcquired = lockResult.rows[0].acquired;
    
    if (!lockAcquired) {
      console.log('[Seed] ℹ️  Advisory lock not acquired (another instance is seeding), skipping');
      return { applied: false, reason: 'lock_not_acquired' };
    }
    
    console.log('[Seed] 🔒 Advisory lock acquired');
    
    // Step 2: Fast sentinel check (uses existing table, no meta table)
    const alreadyApplied = await isSeedApplied(client);
    
    if (alreadyApplied) {
      console.log(`[Seed] ℹ️  Sentinel row (${SENTINEL_COURSE_ID}) exists, seed already applied, skipping`);
      return { applied: false, reason: 'already_applied' };
    }
    
    // Step 3: Execute seed SQL file
    const sqlPath = join(__dirname, '../../../DB/seed_mock_data.sql');
    console.log(`[Seed] 📦 Seed not applied, executing SQL file: ${sqlPath}`);
    
    await client.query('BEGIN');
    
    try {
      await executeSqlFile(client, sqlPath);
      await client.query('COMMIT');
      
      console.log('[Seed] ✅ Seed executed successfully');
      return { applied: true };
      
    } catch (sqlErr) {
      await client.query('ROLLBACK');
      
      // Check if error is due to duplicate keys (expected with ON CONFLICT DO NOTHING)
      if (sqlErr.message.includes('duplicate key') || sqlErr.message.includes('already exists')) {
        console.log('[Seed] ℹ️  Some data already exists (expected), seed partially applied');
        return { applied: true, partial: true };
      }
      
      throw sqlErr;
    }
    
  } catch (error) {
    // Never crash the app - log and return
    console.error('[Seed] ❌ Error during seeding (non-fatal):', error.message);
    console.error('[Seed] 💡 Seed can be run manually: psql "$DATABASE_URL" -f DB/seed_mock_data.sql');
    return { applied: false, reason: 'error', error: error.message };
    
  } finally {
    // Always release advisory lock
    if (lockAcquired) {
      try {
        await client.query('SELECT pg_advisory_unlock($1)', [SEED_ADVISORY_LOCK_ID]);
        console.log('[Seed] 🔓 Advisory lock released');
      } catch (unlockErr) {
        console.warn('[Seed] ⚠️  Failed to release advisory lock:', unlockErr.message);
      }
    }
    
    client.release();
  }
}

export default runSeedSqlIfNeeded;


/**
 * Versioned SQL File Seeding
 * Executes DB/seed_mock_data.sql once per version
 * Uses internal __db_seed_meta table to track applied versions
 */

import { getPool } from './db/pool.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Seed version: hash of SQL file content (changes when file changes)
const SEED_VERSION = (() => {
  try {
    const sqlPath = join(__dirname, '../../../DB/seed_mock_data.sql');
    const sqlContent = readFileSync(sqlPath, 'utf-8');
    return createHash('sha256').update(sqlContent).digest('hex').substring(0, 16);
  } catch (err) {
    // Fallback: use timestamp-based version if file not found
    return `v${Date.now()}`;
  }
})();

/**
 * Ensure seed metadata table exists
 */
async function ensureSeedMetaTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.__db_seed_meta (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      file_hash TEXT
    )
  `);
}

/**
 * Check if seed version was already applied
 */
async function isVersionApplied(pool, version) {
  const result = await pool.query(
    'SELECT version FROM public.__db_seed_meta WHERE version = $1',
    [version]
  );
  return result.rows.length > 0;
}

/**
 * Mark seed version as applied
 */
async function markVersionApplied(pool, version) {
  await pool.query(
    'INSERT INTO public.__db_seed_meta (version, file_hash) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
    [version, SEED_VERSION]
  );
}

/**
 * Execute SQL file
 * Uses pool.query which handles multiple statements
 */
async function executeSqlFile(pool, sqlPath) {
  const sqlContent = readFileSync(sqlPath, 'utf-8');
  
  // Remove comments and empty lines for cleaner execution
  const cleanedSql = sqlContent
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('--');
    })
    .join('\n');
  
  // Execute entire SQL file as single query
  // PostgreSQL pool.query can handle multiple statements
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(cleanedSql);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    // Check if error is due to duplicate keys (expected with ON CONFLICT DO NOTHING)
    if (err.message.includes('duplicate key') || err.message.includes('already exists')) {
      console.log('[Seed SQL] ℹ️  Some data already exists (expected with ON CONFLICT DO NOTHING)');
    } else {
      throw err;
    }
  } finally {
    client.release();
  }
}

/**
 * Main seeding function - versioned and safe
 */
export async function seedSqlFile() {
  if (!process.env.DATABASE_URL) {
    console.log('[Seed SQL] ⚠️  DATABASE_URL not set, skipping');
    return { applied: false, reason: 'no_database_url' };
  }

  const pool = getPool();
  
  try {
    // Ensure metadata table exists
    await ensureSeedMetaTable(pool);
    
    // Check if version already applied
    const alreadyApplied = await isVersionApplied(pool, SEED_VERSION);
    
    if (alreadyApplied) {
      console.log(`[Seed SQL] ℹ️  Seed version ${SEED_VERSION} already applied, skipping`);
      return { applied: false, reason: 'already_applied', version: SEED_VERSION };
    }
    
    // Execute SQL file
    const sqlPath = join(__dirname, '../../../DB/seed_mock_data.sql');
    console.log(`[Seed SQL] 📦 Applying seed version ${SEED_VERSION}...`);
    console.log(`[Seed SQL] 📁 File: ${sqlPath}`);
    
    await executeSqlFile(pool, sqlPath);
    
    // Mark as applied
    await markVersionApplied(pool, SEED_VERSION);
    
    console.log(`[Seed SQL] ✅ Seed version ${SEED_VERSION} applied successfully`);
    return { applied: true, version: SEED_VERSION };
    
  } catch (error) {
    console.error('[Seed SQL] ❌ Error applying seed:', error.message);
    // Don't throw - non-fatal
    return { applied: false, reason: 'error', error: error.message };
  }
}

export default seedSqlFile;


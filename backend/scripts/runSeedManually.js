/**
 * Manual seed execution script
 * Run this to manually trigger the seed if it didn't run on startup
 * 
 * Usage: node backend/scripts/runSeedManually.js
 */

import runSeedSqlIfNeeded from '../src/infrastructure/runSeedSqlIfNeeded.js';

async function main() {
  console.log('🌱 Starting manual seed execution...');
  console.log('');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.error('💡 Set it before running: export DATABASE_URL="postgresql://..."');
    process.exit(1);
  }
  
  try {
    const result = await runSeedSqlIfNeeded();
    
    console.log('');
    console.log('📊 Seed execution result:', result);
    console.log('');
    
    if (result.applied) {
      console.log('✅ Seed applied successfully!');
      console.log('💡 Check your database tables to verify data was inserted.');
    } else {
      console.log(`ℹ️  Seed was skipped. Reason: ${result.reason}`);
      if (result.reason === 'already_applied') {
        console.log('💡 This is expected if COURSE-001 already exists in the database.');
        console.log('💡 To force re-seed, delete COURSE-001 first:');
        console.log('   DELETE FROM public.courses WHERE course_id = \'COURSE-001\';');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Fatal error during seed execution:');
    console.error(error);
    process.exit(1);
  }
}

main();


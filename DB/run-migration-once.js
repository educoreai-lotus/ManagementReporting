import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import pkg from "pg";
const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const conn = process.env.DATABASE_URL;
  if (!conn) {
    throw new Error("❌ Missing DATABASE_URL environment variable");
  }

  const sql = readFileSync(resolve(__dirname, "migration.sql"), "utf8");

  const client = new Client({
    connectionString: conn,
    ssl: { rejectUnauthorized: false } // required for Supabase/Railway
  });

  console.log("📋 Connecting to database...");
  await client.connect();
  
  try {
    console.log("🔄 Starting migration transaction...");
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("✅ migration.sql applied successfully");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed:", e.message);
    console.error("Full error:", e);
    process.exitCode = 1;
    throw e;
  } finally {
    await client.end();
    console.log("🔌 Database connection closed");
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});


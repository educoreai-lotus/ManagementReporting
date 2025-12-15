import { getPool, withRetry } from "./pool.js";

/**
 * Saves snapshots from the Directory microservice into the directory_cache table.
 *
 * @param {Array<object>} dataArray - array of company objects returned from Directory (parsed JSON)
 *
 * Each object should contain:
 * company_id, company_name, industry, company_size, date_registered,
 * primary_hr_contact, approval_policy, decision_maker,
 * kpis, max_test_attempts, website_url, verification_status, hierarchy
 */
export async function saveDirectorySnapshot(dataArray) {
  if (!Array.isArray(dataArray)) {
    throw new Error("saveDirectorySnapshot expected dataArray to be an array");
  }

  const pool = getPool();
  const client = await pool.connect();

  const now = new Date();
  const snapshotDate = now.toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    await client.query("BEGIN");

    // Debug log full payload before writing to DB (for diagnostics)
    console.log("[Directory Cache] Incoming dataArray:", JSON.stringify(dataArray, null, 2));

    for (const data of dataArray) {
      // Ensure jsonb fields are always null / array / object (never plain string)
      const safeKpis =
        Array.isArray(data.kpis) || (data.kpis && typeof data.kpis === "object")
          ? data.kpis
          : null;

      const safeHierarchy =
        Array.isArray(data.hierarchy) || (data.hierarchy && typeof data.hierarchy === "object")
          ? data.hierarchy
          : null;

      await withRetry(async () => {
        return await client.query(
          `
          INSERT INTO directory_cache (
            snapshot_date,
            company_id,
            company_name,
            industry,
            company_size,
            date_registered,
            primary_hr_contact,
            approval_policy,
            decision_maker,
            kpis,
            max_test_attempts,
            website_url,
            verification_status,
            hierarchy,
            ingested_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
          ON CONFLICT (snapshot_date, company_id)
          DO UPDATE SET
            company_name = EXCLUDED.company_name,
            industry = EXCLUDED.industry,
            company_size = EXCLUDED.company_size,
            date_registered = EXCLUDED.date_registered,
            primary_hr_contact = EXCLUDED.primary_hr_contact,
            approval_policy = EXCLUDED.approval_policy,
            decision_maker = EXCLUDED.decision_maker,
            kpis = EXCLUDED.kpis,
            max_test_attempts = EXCLUDED.max_test_attempts,
            website_url = EXCLUDED.website_url,
            verification_status = EXCLUDED.verification_status,
            hierarchy = EXCLUDED.hierarchy,
            ingested_at = EXCLUDED.ingested_at
          `,
          [
            snapshotDate,
            data.company_id ?? "unknown",
            data.company_name ?? null,
            data.industry ?? null,
            data.company_size ?? null,
            data.date_registered ? new Date(data.date_registered) : null,
            data.primary_hr_contact ?? null,
            data.approval_policy ?? null,
            data.decision_maker ?? null,
            safeKpis, // jsonb (array or object or null)
            data.max_test_attempts ?? null,
            data.website_url ?? null,
            data.verification_status ?? null,
            safeHierarchy, // jsonb (array or object or null)
            now
          ]
        );
      }, 3);
    }

    await client.query("COMMIT");
    console.log(
      `[Directory Cache] ✅ Saved ${dataArray.length} directory snapshots for ${snapshotDate}`
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[Directory Cache] ❌ Error saving directory snapshots to DB:", err.message);
    throw err;
  } finally {
    client.release();
  }
}

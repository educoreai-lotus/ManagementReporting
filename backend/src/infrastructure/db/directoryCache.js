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

      // Node-postgres sends JS values as text; for jsonb columns we explicitly
      // send JSON literals (stringified) so PostgreSQL always receives valid JSON,
      // avoiding "invalid input syntax for type json" errors.
      const jsonKpis = safeKpis === null ? null : JSON.stringify(safeKpis);
      const jsonHierarchy = safeHierarchy === null ? null : JSON.stringify(safeHierarchy);

      // Optional short debug preview for jsonb fields (do not spam full JSON)
      console.log(
        "[Directory Cache] jsonb preview:",
        "kpis type=", typeof safeKpis,
        "hierarchy type=", typeof safeHierarchy
      );

      // Application-level deduplication:
      // A company is considered the same by company_name (case-insensitive, trimmed).
      // If a row with the same normalized company_name exists, we UPDATE it instead of inserting
      // a new row, keeping only one row per company.
      // NOTE: If historical duplicates already exist with the same company_name,
      // this logic intentionally updates only the most recently ingested row.
      // Historical rows are NOT cleaned up here by design.
      let existing = null;
      let normalizedName = null;
      if (data.company_name && typeof data.company_name === "string" && data.company_name.trim() !== "") {
        // Keep JS-side normalization minimal and rely on symmetric SQL normalization
        normalizedName = data.company_name;

        const existingResult = await client.query(
          `
          SELECT snapshot_date, company_id
          FROM public.directory_cache
          WHERE company_name IS NOT NULL
            AND lower(trim(company_name)) = lower(trim($1))
          ORDER BY ingested_at DESC
          LIMIT 1
          `,
          [normalizedName]
        );

        if (existingResult.rowCount > 0) {
          existing = existingResult.rows[0];
        }
      }

      if (existing) {
        // Update existing row for this company (by snapshot_date, company_id PK)
        await withRetry(async () => {
          return await client.query(
            `
            UPDATE public.directory_cache
            SET
              company_name = $1,
              industry = $2,
              company_size = $3,
              date_registered = $4,
              primary_hr_contact = $5,
              approval_policy = $6,
              decision_maker = $7,
              kpis = $8,
              max_test_attempts = $9,
              website_url = $10,
              verification_status = $11,
              hierarchy = $12,
              snapshot_date = $13,
              ingested_at = $14
            WHERE snapshot_date = $15
              AND company_id = $16
            `,
            [
              data.company_name ?? null,
              data.industry ?? null,
              data.company_size ?? null,
              data.date_registered ? new Date(data.date_registered) : null,
              data.primary_hr_contact ?? null,
              data.approval_policy ?? null,
              data.decision_maker ?? null,
              jsonKpis,
              data.max_test_attempts ?? null,
              data.website_url ?? null,
              data.verification_status ?? null,
              jsonHierarchy,
              snapshotDate,
              now,
              existing.snapshot_date,
              existing.company_id,
            ]
          );
        }, 3);

        console.log(
          "[Directory Cache] Updated existing company:",
          data.company_name ?? data.company_id
        );
      } else {
        // No existing company with this name – insert a new row (with PK on snapshot_date, company_id)
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
              jsonKpis, // jsonb: pre-stringified JSON or null
              data.max_test_attempts ?? null,
              data.website_url ?? null,
              data.verification_status ?? null,
              jsonHierarchy, // jsonb: pre-stringified JSON or null
              now
            ]
          );
        }, 3);

        console.log(
          "[Directory Cache] Inserted new company:",
          data.company_name ?? data.company_id
        );
      }
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

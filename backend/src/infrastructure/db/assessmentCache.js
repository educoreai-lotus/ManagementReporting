import { getPool, withRetry } from "./pool.js";

/**
 * Saves a snapshot from the Assessment microservice into the assessments_cache table.
 *
 * @param {Array<object>} dataArray - Array of objects returned from Assessment (parsed JSON).
 *
 * Each object in the array should contain:
 * user_id, course_id, exam_type, attempt_no, passing_grade, final_grade, passed
 */
export async function saveAssessmentSnapshot(dataArray) {
  if (!Array.isArray(dataArray)) {
    throw new Error("saveAssessmentSnapshot expected dataArray to be an array");
  }

  const pool = getPool();
  const client = await pool.connect();

  const now = new Date();
  const snapshotDate = now.toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    await client.query("BEGIN");

    // Application-level deduplication:
    // A logical assessment is identified by (user_id, course_id, exam_type, attempt_no).
    // snapshot_date is NOT part of the business identity.
    // If a row with the same logical identity already exists, we UPDATE it
    // instead of inserting a new one, keeping only one logical row per assessment.
    // NOTE: If historical duplicates already exist, this logic intentionally updates
    // only the most recently ingested row. Historical rows are NOT cleaned up here.
    await withRetry(async () => {
      for (const row of dataArray) {
        const userId = row.user_id ?? "unknown";
        const courseId = row.course_id ?? "unknown";
        const examType = row.exam_type ?? "postcourse";
        const attemptNo = row.attempt_no ?? 1;

        // Find existing assessment by business identity (latest ingested)
        const existingResult = await client.query(
          `
          SELECT snapshot_date, user_id, course_id, exam_type, attempt_no
          FROM public.assessments_cache
          WHERE user_id = $1
            AND course_id = $2
            AND exam_type = $3
            AND attempt_no = $4
          ORDER BY ingested_at DESC
          LIMIT 1
          `,
          [userId, courseId, examType, attemptNo]
        );

        if (existingResult.rowCount > 0) {
          const existing = existingResult.rows[0];

          // Update existing row for this logical assessment (by full PK including snapshot_date)
          await client.query(
            `
            UPDATE public.assessments_cache
            SET
              passing_grade = $1,
              final_grade = $2,
              passed = $3,
              snapshot_date = $4,
              ingested_at = $5
            WHERE snapshot_date = $6
              AND user_id = $7
              AND course_id = $8
              AND exam_type = $9
              AND attempt_no = $10
            `,
            [
              row.passing_grade ?? null,
              row.final_grade ?? null,
              row.passed ?? false,
              snapshotDate,
              now,
              existing.snapshot_date,
              existing.user_id,
              existing.course_id,
              existing.exam_type,
              existing.attempt_no
            ]
          );

          console.log(
            "[Assessment Cache] Updated existing assessment:",
            `user=${userId}, course=${courseId}, exam_type=${examType}, attempt_no=${attemptNo}`
          );
        } else {
          // No existing logical assessment – insert new row using existing PK/ON CONFLICT safety net
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
              userId,
              courseId,
              examType,
              attemptNo,
              row.passing_grade ?? null,
              row.final_grade ?? null,
              row.passed ?? false,
              now
            ]
          );

          console.log(
            "[Assessment Cache] Inserted new assessment:",
            `user=${userId}, course=${courseId}, exam_type=${examType}, attempt_no=${attemptNo}`
          );
        }
      }
    }, 3);

    await client.query("COMMIT");
    console.log(
      `[Assessment Cache] ✅ Saved snapshot for ${snapshotDate} with ${dataArray.length} rows`
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[Assessment Cache] ❌ Error saving assessment snapshot to DB:", err.message);
    throw err;
  } finally {
    client.release();
  }
}

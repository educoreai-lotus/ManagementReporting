import { getPool, withRetry } from './pool.js';

/**
 * שמירה של snapshot ממיקרוסרביס Course Builder אל טבלת course_builder_cache.
 *
 * @param {Array<object>} courses - מערך קורסים כפי שחזרו מ-Course Builder
 *
 * לכל קורס מצופה שיהיו:
 * course_id, course_name, totalEnrollments, activeEnrollment,
 * completionRate, averageRating, createdAt, feedback
 */
export async function saveCourseBuilderSnapshots(courses) {
  if (!Array.isArray(courses)) {
    console.error("saveCourseBuilderSnapshots expected an array, got:", typeof courses);
    return;
  }

  const pool = getPool();
  const client = await pool.connect();

  const now = new Date();
  const snapshotDate = now.toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    await client.query("BEGIN");

    for (const course of courses) {
      // Application-level deduplication:
      // A course is considered the same by course_name (case-insensitive, trimmed).
      // If a row with the same normalized course_name exists, we UPDATE it instead of inserting
      // a new row, keeping only one logical row per course.
      // NOTE: If historical duplicates already exist with the same course_name,
      // this logic intentionally updates only the most recently ingested row.
      // Historical rows are NOT cleaned up here by design.
      let existing = null;
      let normalizedName = null;

      if (course.course_name && typeof course.course_name === "string" && course.course_name.trim() !== "") {
        // Keep JS-side normalization minimal and rely on symmetric SQL normalization
        normalizedName = course.course_name;

        const existingResult = await client.query(
          `
          SELECT snapshot_date, course_id
          FROM public.course_builder_cache
          WHERE course_name IS NOT NULL
            AND lower(trim(course_name)) = lower(trim($1))
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
        // Update existing row for this course (by snapshot_date, course_id PK)
        await withRetry(async () => {
          return await client.query(
            `
            UPDATE public.course_builder_cache
            SET
              course_name = $1,
              "totalEnrollments" = $2,
              "activeEnrollment" = $3,
              "completionRate" = $4,
              "averageRating" = $5,
              "createdAt" = $6,
              feedback = $7,
              snapshot_date = $8,
              ingested_at = $9
            WHERE snapshot_date = $10
              AND course_id = $11
            `,
            [
              course.course_name ?? "Unknown Course",
              course.totalEnrollments ?? 0,
              course.activeEnrollment ?? 0,
              course.completionRate ?? 0,
              course.averageRating ?? 0,
              course.createdAt ? new Date(course.createdAt) : null,
              course.feedback ?? null,
              snapshotDate,
              now,
              existing.snapshot_date,
              existing.course_id
            ]
          );
        }, 3);

        console.log(
          "[Course Builder Cache] Updated existing course:",
          course.course_name ?? course.course_id
        );
      } else {
        // No existing course with this name – insert a new row (with PK on snapshot_date, course_id)
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
              "activeEnrollment" = EXCLUDED."activeEnrollment",
              "completionRate" = EXCLUDED."completionRate",
              "averageRating" = EXCLUDED."averageRating",
              "createdAt" = EXCLUDED."createdAt",
              feedback = EXCLUDED.feedback,
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

        console.log(
          "[Course Builder Cache] Inserted new course:",
          course.course_name ?? course.course_id
        );
      }
    }

    await client.query("COMMIT");
    console.log(`[Course Builder Cache] ✅ Saved ${courses.length} course snapshots for ${snapshotDate}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[Course Builder Cache] ❌ Error saving course builder snapshots to DB:", err.message);
    throw err;
  } finally {
    client.release();
  }
}


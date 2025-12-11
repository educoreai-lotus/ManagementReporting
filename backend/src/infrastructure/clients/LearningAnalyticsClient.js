import { postToCoordinator } from "../coordinatorClient/coordinatorClient.js";
import { verifyCoordinatorSignature } from "../utils/verifyCoordinatorSignature.js";

/**
 * Calls the Learning Analytics microservice.
 *
 * NEW REQUEST FORMAT (similar to Assessment / CourseBuilder / Directory):
 *
 * {
 *   requester_name: "ManagementReporting",
 *   payload: {},
 *   response: {
 *     version: "",
 *     aggregated_statistics: null,
 *     period: "",
 *     date_range: "",
 *     start_date: "",
 *     end_date: "",
 *     calculated_at: "",
 *     metrics: { ... },
 *     category_breakdowns: { ... }
 *   }
 * }
 *
 * The Learning Analytics service fills the "response" object
 * and returns ONLY that object as a JSON string.
 *
 * This function returns the parsed "response" object.
 */
export async function fetchLearningAnalyticsFromService() {
  // Template with the same shape as the previous payloadObject
  const responseTemplate = {
    version: "",
    aggregated_statistics: null,
    period: "",
    date_range: "",
    start_date: "",
    end_date: "",
    calculated_at: "",

    metrics: {
      total_learners: null,
      active_learners: null,
      total_courses: null,
      courses_completed: null,
      average_completion_rate: null,
      total_skills_acquired: null,
      average_competency_level_progression: null,
      engagement_score_average: null,
      drop_off_rate: null,
      total_topics: null,
      average_topics_per_content: null,
      average_lessons_per_course: null,
      average_attempts_per_assessment: null,
      total_assessments: null,
      pass_rate: null,
      total_unique_learning_paths: null,
      average_skills_per_learning_path: null,
      average_skills_per_competency: null,

      platform_skill_demand: null,
      most_demanded_skills: null,
      skill_id: null,
      skill_name: "",
      demand_count: null,
      trend: ""
    },

    category_breakdowns: {
      by_competency_level: {
        beginner: null,
        intermediate: null,
        advanced: null,
        expert: null
      },

      by_content_format_usage: {
        video: null,
        text: null,
        code: null,
        presentation: null,
        mindmap: null
      },

      by_engagement_level: {
        high: null,
        medium: null,
        low: null
      }
    }
  };

  const requestObject = {
    requester_service: "ManagementReporting",
    payload: {
      action: "Collecting system-wide analytics and computed learning metrics"
    },
    response: responseTemplate
  };

  try {
    // Learning analytics can take longer to compute; allow extended timeout (60s)
    const coordinatorResponse = await postToCoordinator(requestObject, { timeout: 60000 });

    if (typeof coordinatorResponse === "undefined" || coordinatorResponse === null) {
      throw new Error("Empty response from Learning Analytics service");
    }

    // Extract response components for signature verification
    const rawBodyString = coordinatorResponse.rawBodyString;
    const headers = coordinatorResponse.headers || {};
    const response = coordinatorResponse.data;

    // Verify Coordinator signature
    const signature = headers['x-service-signature'] || headers['X-Service-Signature'];
    const signer = headers['x-service-name'] || headers['X-Service-Name'];
    const coordinatorPublicKey = process.env.COORDINATOR_PUBLIC_KEY;

    if (!signature || !signer) {
      throw new Error("Missing coordinator signature");
    }

    if (signer !== "coordinator") {
      throw new Error("Unexpected signer: " + signer);
    }

    if (coordinatorPublicKey) {
      const isValid = verifyCoordinatorSignature(coordinatorPublicKey, signature, rawBodyString);
      if (!isValid) {
        throw new Error("Invalid coordinator signature");
      }
    }

    // The service returns ONLY the filled `response` object as JSON string or object
    const parsed = typeof response === "string" ? JSON.parse(response) : response;

    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid Learning Analytics response structure");
    }

    // We expect fields like version, aggregated_statistics, metrics, category_breakdowns, etc.
    // Do NOT enforce strict validation here, leave that to the cache layer.
    console.log("[Learning Analytics Client] Received learning analytics payload");

    return parsed;
  } catch (err) {
    console.error("Error calling Learning Analytics service:", err.message);
    throw err;
  }
}

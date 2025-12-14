import { postToCoordinator } from "../coordinatorClient/coordinatorClient.js";
import { verifyCoordinatorResponse } from "../../utils/coordinatorVerification.js";

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
      action: "Collecting interesting Analytics about various system (learners, trainers)."
    },
    response: responseTemplate
  };

  try {
    // Learning Analytics is a computationally heavy service that performs complex aggregations
    // across large datasets. It may take 90-180+ seconds to complete, especially during peak usage.
    // We use an extended client timeout (180s) and request the Coordinator to use the same timeout
    // for the downstream service to allow sufficient time for the operation to complete.
    const extendedTimeout = 180000; // 3 minutes
    console.log(
      `[Learning Analytics Client] Using extended timeout (${extendedTimeout}ms) for heavy aggregation service`
    );
    const coordinatorResponse = await postToCoordinator(requestObject, { 
      timeout: extendedTimeout,
      requestTimeoutHeader: extendedTimeout
    });

    if (typeof coordinatorResponse === "undefined" || coordinatorResponse === null) {
      throw new Error("Empty response from Learning Analytics service");
    }

    // Verify Coordinator response
    const isValid = await verifyCoordinatorResponse(coordinatorResponse.rawResponse, coordinatorResponse.data);

    if (!isValid) {
      throw new Error("Coordinator response verification failed");
    }

    // The service returns ONLY the filled `response` object as JSON string or object
    const response = coordinatorResponse.data;
    const parsed = typeof response === "string" ? JSON.parse(response) : response;

    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid Learning Analytics response structure");
    }

    // We expect fields like version, aggregated_statistics, metrics, category_breakdowns, etc.
    // Do NOT enforce strict validation here, leave that to the cache layer.
    console.log("[Learning Analytics Client] Received learning analytics payload");

    return parsed;
  } catch (err) {
    // Handle timeout errors explicitly
    // Timeout errors occur when the request exceeds the client timeout (60s)
    // This is expected for a heavy aggregation service and should not affect other services
    const isTimeoutError = err.code === 'ECONNABORTED' || 
                          (err.message && err.message.includes('timeout')) ||
                          (err.message && err.message.includes('exceeded'));
    
    if (isTimeoutError) {
      console.error(
        "[Learning Analytics Client] ⏱️ Request timeout (60s exceeded):",
        "Learning Analytics service did not respond within the allocated time window.",
        "This is expected for heavy aggregation operations. The system will continue using cached data.",
        `Error: ${err.message}`
      );
      // Preserve and rethrow the original error - caller will handle gracefully with cached data
      throw err;
    }

    // Handle 502 Bad Gateway errors from Coordinator
    // The Coordinator returns 502 when the downstream Learning Analytics service
    // does not respond within the Coordinator's internal timeout window, even if our client
    // timeout (60s) has not been exceeded.
    if (err.response?.status === 502) {
      const originalMessage = err.message || "Learning Analytics service timeout";
      const responseData = err.response?.data || "";
      console.error(
        "[Learning Analytics Client] Service unavailable (502 Bad Gateway):",
        "Coordinator reports that Learning Analytics service did not respond in time.",
        "The system will continue using cached data.",
        originalMessage,
        responseData ? `- Response: ${JSON.stringify(responseData)}` : ""
      );
      // Preserve and rethrow the original error with all its context
      throw err;
    }

    // For all other errors, preserve and rethrow the original error
    console.error(
      "[Learning Analytics Client] Error calling Learning Analytics service:",
      err.message
    );
    throw err;
  }
}

import { postToCoordinator } from "../coordinatorClient/coordinatorClient.js";
import { verifyCoordinatorResponse } from "../../utils/coordinatorVerification.js";

/**
 * Calls the Assessment microservice.
 *
 * Request format:
 * Sends JSON in the following structure:
 * {
 *   requester_name: "ManagementReporting",
 *   payload: {},
 *   response: [
 *     {
 *       user_id: null,
 *       course_id: null,
 *       exam_type: "",
 *       attempt_no: null,
 *       passing_grade: null,
 *       final_grade: null,
 *       passed: null
 *     }
 *   ]
 * }
 *
 * The Assessment microservice fills the records under `response`,
 * and returns `response` ONLY as a JSON string (stringified array).
 *
 * This function returns an array of objects, each object:
 * {
 *   user_id,
 *   course_id,
 *   exam_type,
 *   attempt_no,
 *   passing_grade,
 *   final_grade,
 *   passed
 * }
 */
export async function fetchAssessmentDataFromService() {
  // 1. Request object in the new format (response is an array with one "shape" record)
  const requestObject = {
    requester_service: "ManagementReporting",
    payload: {
      action: "Collecting information about exams and assessments creation, learner examination, and Assessments results."
    },    
    response: [
      {
        user_id: null,
        course_id: null,
        exam_type: "",
        attempt_no: null,
        passing_grade: null,
        final_grade: null,
        passed: null
      }
    ]
  };

  try {
    const coordinatorResponse = await postToCoordinator(requestObject, { timeout: 60000 });

    if (typeof coordinatorResponse === "undefined" || coordinatorResponse === null) {
      throw new Error("Empty response from Assessment service");
    }

    // Verify Coordinator response
    const isValid = await verifyCoordinatorResponse(coordinatorResponse.rawResponse, coordinatorResponse.data);

    if (!isValid) {
      throw new Error("Coordinator response verification failed");
    }

    // 3. Assessment returns ONLY the `response` as a JSON string (stringified array).
    const response = coordinatorResponse.data;
    let parsed = typeof response === "string" ? JSON.parse(response) : response;

    // 4. Normalize response to handle all supported formats:
    // Format A (expected): [{...}, {...}] - direct array
    // Format B (legacy): { success: true, data: { "0": {...}, "1": {...} } } - object with numeric keys
    // Format C (Coordinator wrapped): { response: { answer: [...] } } - Coordinator wrapped response
    let filledResponse;
    if (Array.isArray(parsed)) {
      // Format A: already an array, use it directly
      filledResponse = parsed;
    } else if (parsed && typeof parsed === "object" && parsed.response && 
               typeof parsed.response === "object" && parsed.response.answer && 
               Array.isArray(parsed.response.answer)) {
      // Format C: Coordinator wrapped response with answer array
      filledResponse = parsed.response.answer;
    } else if (parsed && typeof parsed === "object" && parsed.data && typeof parsed.data === "object") {
      // Format B: convert object with numeric keys to array
      filledResponse = Object.values(parsed.data);
    } else {
      // None of the supported formats match
      throw new Error(
        `Invalid response from Assessment service: expected array, got ${typeof parsed}`
      );
    }

    // 5. Validate that normalized result is an array
    if (!Array.isArray(filledResponse)) {
      throw new Error(
        `Invalid response from Assessment service: expected array, got ${typeof filledResponse}`
      );
    }

    // 6. Basic validation/logging of expected keys
    const requiredKeys = [
      "user_id",
      "course_id",
      "exam_type",
      "attempt_no",
      "passing_grade",
      "final_grade",
      "passed"
    ];

    filledResponse.forEach((row, index) => {
      const missing = requiredKeys.filter((key) => !(key in row));
      if (missing.length > 0) {
        console.warn(
          `[Assessment Client] Row at index ${index} is missing expected keys: ${missing.join(
            ", "
          )}`
        );
      }
    });

    // Normalize exam_type before saving to DB
    // DB constraint only allows: 'precourse', 'midcourse', 'postcourse'
    // Convert null, undefined, empty string, whitespace, or invalid values to "postcourse"
    const validExamTypes = ['precourse', 'midcourse', 'postcourse'];
    
    const normalizeExamType = (value) => {
      // If null, undefined, empty string, or whitespace
      if (value === null || value === undefined || 
          (typeof value === 'string' && value.trim() === '')) {
        return 'postcourse'; // Default to postcourse for empty values
      }
      
      // Trim and lowercase for comparison
      const trimmed = typeof value === 'string' ? value.trim().toLowerCase() : String(value).trim().toLowerCase();
      
      // If not a valid enum value, default to postcourse
      if (!validExamTypes.includes(trimmed)) {
        return 'postcourse';
      }
      
      // Return the valid trimmed value
      return trimmed;
    };
    
    filledResponse.forEach((row, index) => {
      const originalValue = row.exam_type;
      const normalizedValue = normalizeExamType(originalValue);
      
      if (originalValue !== normalizedValue) {
        console.log(`[Assessment Normalize] exam_type fixed: "${originalValue}" -> "${normalizedValue}"`);
        row.exam_type = normalizedValue;
      }
    });

    console.log(
      `[Assessment Client] Received ${filledResponse.length} assessment rows from Assessment service`
    );

    // Return the array to the rest of the system (cron job + DB)
    return filledResponse;
  } catch (err) {
    console.error("Error calling Assessment service:", err.message);
    throw err;
  }
}

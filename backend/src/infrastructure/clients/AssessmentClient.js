import { postToCoordinator } from "../coordinatorClient/coordinatorClient.js";
import { verifyCoordinatorSignature } from "../utils/verifyCoordinatorSignature.js";

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
      action: "collect information about EXAM AND ASSESSMENT records"
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

    // 3. Assessment returns ONLY the `response` as a JSON string (stringified array).
    let filledResponse = typeof response === "string" ? JSON.parse(response) : response;

    // 4. We expect an array of records
    if (!Array.isArray(filledResponse)) {
      throw new Error(
        `Invalid response from Assessment service: expected array, got ${typeof filledResponse}`
      );
    }

    // 5. Basic validation/logging of expected keys
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

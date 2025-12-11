import { postToCoordinator } from "../coordinatorClient/coordinatorClient.js";
import { verifyCoordinatorSignature } from "../utils/verifyCoordinatorSignature.js";

/**
 * Calls the Course Builder microservice.
 *
 * NEW REQUEST FORMAT:
 * {
 *   requester_name: "ManagementReporting",
 *   payload: {},
 *   response: {
 *     courses: [
 *       {
 *         course_id: null,
 *         course_name: "",
 *         totalEnrollments: null,
 *         activeEnrollment: null,
 *         completionRate: null,
 *         averageRating: null,
 *         createdAt: "",
 *         feedback: ""
 *       }
 *     ]
 *   }
 * }
 *
 * The Course Builder service will fill "response.courses"
 * and return ONLY the response object as a JSON string.
 *
 * This function returns an array of course objects.
 */
export async function fetchCourseBuilderDataFromService() {
  const requestObject = {
    requester_service: "ManagementReporting",
    payload: {
      action: "Collecting information about courses"
    },
    response: {
      courses: [
        {
          course_id: null,
          course_name: "",
          totalEnrollments: null,
          activeEnrollment: null,
          completionRate: null,
          averageRating: null,
          createdAt: "",
          feedback: ""
        }
      ]
    }
  };

  try {
    const coordinatorResponse = await postToCoordinator(requestObject, { timeout: 60000 });

    if (!coordinatorResponse) {
      throw new Error("Empty response from Course Builder service");
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

    const parsed = typeof response === "string" ? JSON.parse(response) : response;

    if (!parsed.courses || !Array.isArray(parsed.courses)) {
      throw new Error("Expected Course Builder response to contain { courses: [...] }");
    }

    console.log(
      `[Course Builder Client] Received ${parsed.courses.length} courses from Course Builder service`
    );

    return parsed.courses;
  } catch (err) {
    console.error("Error calling Course Builder service:", err.message);
    throw err;
  }
}

import { postToCoordinator } from "../coordinatorClient/coordinatorClient.js";
import { verifyCoordinatorResponse } from "../../utils/coordinatorVerification.js";

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
      action: "Collecting information about course creation and course publishing only (no analytics)."
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

    // Verify Coordinator response
    const isValid = await verifyCoordinatorResponse(coordinatorResponse.rawResponse, coordinatorResponse.data);

    if (!isValid) {
      throw new Error("Coordinator response verification failed");
    }

    const response = coordinatorResponse.data;
    const parsed = typeof response === "string" ? JSON.parse(response) : response;

    let courses = null;

    // Priority 1: Coordinator wrapped response { response: { courses: [...] } }
    if (parsed && typeof parsed === "object" && parsed.response && 
        typeof parsed.response === "object" && parsed.response.courses && 
        Array.isArray(parsed.response.courses)) {
      courses = parsed.response.courses;
    }
    // Priority 2: New Coordinator format { success: true, data: { courses: [...] } }
    else if (parsed && typeof parsed === "object" && parsed.data && 
        parsed.data.courses && Array.isArray(parsed.data.courses)) {
      courses = parsed.data.courses;
    }
    // Priority 3: Legacy stringified payload { payload: "<stringified JSON>" }
    else if (parsed && typeof parsed === "object" && parsed.payload && 
             typeof parsed.payload === "string") {
      try {
        const payloadParsed = JSON.parse(parsed.payload);
        if (payloadParsed && typeof payloadParsed === "object" && 
            payloadParsed.courses && Array.isArray(payloadParsed.courses)) {
          courses = payloadParsed.courses;
        }
      } catch (parseErr) {
        // Invalid JSON in payload string - will fall through to Priority 4
      }
    }
    // Priority 4: Direct format { courses: [...] }
    else if (parsed && typeof parsed === "object" && 
             parsed.courses && Array.isArray(parsed.courses)) {
      courses = parsed.courses;
    }

    // Strict validation: courses must exist and be an array
    if (!courses || !Array.isArray(courses)) {
      throw new Error("Expected Course Builder response to contain { courses: [...] }");
    }

    console.log(
      `[Course Builder Client] Received ${courses.length} courses from Course Builder service`
    );

    return courses;
  } catch (err) {
    console.error("Error calling Course Builder service:", err.message);
    throw err;
  }
}

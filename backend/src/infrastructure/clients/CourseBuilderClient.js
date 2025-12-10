import { postToCoordinator } from "../coordinatorClient/coordinatorClient.js";

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
    payload: {},
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
    const response = await postToCoordinator(requestObject);

    if (!response) {
      throw new Error("Empty response from Course Builder service");
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

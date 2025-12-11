import { postToCoordinator } from "../coordinatorClient/coordinatorClient.js";
import { verifyCoordinatorResponse } from "../../utils/coordinatorVerification.js";

/**
 * Calls the Directory microservice.
 *
 * NEW REQUEST FORMAT:
 * {
 *   requester_name: "ManagementReporting",
 *   payload: {},
 *   response: {
 *     companies: [
 *       {
 *         company_id: null,
 *         company_name: "",
 *         industry: "",
 *         company_size: "",
 *         date_registered: "",
 *         primary_hr_contact: "",
 *         approval_policy: "",
 *         decision_maker: "",
 *         kpis: null,
 *         max_test_attempts: null,
 *         website_url: "",
 *         verification_status: "",
 *         hierarchy: null
 *       }
 *     ]
 *   }
 * }
 *
 * The Directory service will fill "response.companies"
 * and return ONLY the response object as a JSON string.
 *
 * This function returns an array of company objects.
 */
export async function fetchDirectoryDataFromService() {
  const requestObject = {
    requester_service: "ManagementReporting",
    payload: {
      action: "Collecting Directory information : organizations registered in the system and the number of people registered in the system."
    },
    response: {
      companies: [
        {
          company_id: null,
          company_name: "",
          industry: "",
          company_size: "",
          date_registered: "",
          primary_hr_contact: "",
          approval_policy: "",
          decision_maker: "",
          kpis: null,
          max_test_attempts: null,
          website_url: "",
          verification_status: "",
          hierarchy: null
        }
      ]
    }
  };

  try {
    const coordinatorResponse = await postToCoordinator(requestObject, { timeout: 60000 });

    if (typeof coordinatorResponse === "undefined" || coordinatorResponse === null) {
      throw new Error("Empty response from Directory service");
    }

    // Verify Coordinator response
    const isValid = await verifyCoordinatorResponse(coordinatorResponse.rawResponse, coordinatorResponse.data);

    if (!isValid) {
      throw new Error("Coordinator response verification failed");
    }

    // Directory returns ONLY the "response" object as a JSON string
    const response = coordinatorResponse.data;
    const parsed = typeof response === "string" ? JSON.parse(response) : response;

    if (!parsed.companies || !Array.isArray(parsed.companies)) {
      throw new Error("Expected Directory response to contain { companies: [...] }");
    }

    console.log(
      `[Directory Client] Received ${parsed.companies.length} companies from Directory service`
    );

    return parsed.companies;
  } catch (err) {
    console.error("Error calling Directory service:", err.message);
    throw err;
  }
}

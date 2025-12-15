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

    // Support multiple response formats:
    // Format A (old): { "companies": [...] }
    // Format B (new): { "success": true, "data": { "companies": [...] } }
    // Format C (nested payload): { "data": { "payload": { "companies": [...] } } }
    // Format D (Coordinator-wrapped): { "response": { "companies": [...] } }
    const companies =
      parsed?.companies ??
      parsed?.data?.companies ??
      parsed?.data?.payload?.companies ??
      parsed?.response?.companies ??
      [];

    if (!Array.isArray(companies)) {
      console.warn("[Directory Client] Warning: Directory returned invalid companies array. Using empty list.");
      return [];
    }

    console.log(
      `[Directory Client] Received ${companies.length} companies from Directory service`
    );

    return companies;
  } catch (err) {
    console.error("Error calling Directory service:", err.message);
    throw err;
  }
}

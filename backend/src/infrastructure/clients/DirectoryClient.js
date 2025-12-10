import { postToCoordinator } from "../coordinatorClient/coordinatorClient.js";

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
    payload: {},
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
    const response = await postToCoordinator(requestObject);

    if (typeof response === "undefined" || response === null) {
      throw new Error("Empty response from Directory service");
    }

    // Directory returns ONLY the "response" object as a JSON string
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

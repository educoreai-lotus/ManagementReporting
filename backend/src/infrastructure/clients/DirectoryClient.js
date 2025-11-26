import axios from "axios";

const COORDINATOR_API_URL = process.env.COORDINATOR_API_URL;

if (!COORDINATOR_API_URL) {
  console.error("Missing COORDINATOR_API_URL env variable");
}

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
    requester_name: "ManagementReporting",
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
    const requestJsonString = JSON.stringify(requestObject);

    const response = await axios.post(COORDINATOR_API_URL, requestJsonString, {
      headers: {
        "Content-Type": "application/json"
      },
      timeout: 30000
    });

    if (!response || typeof response.data === "undefined" || response.data === null) {
      throw new Error("Empty response from Directory service");
    }

    // Directory returns ONLY the "response" object as a JSON string
    const parsed =
      typeof response.data === "string" ? JSON.parse(response.data) : response.data;

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

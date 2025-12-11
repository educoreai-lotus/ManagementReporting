import { postToCoordinator } from "../coordinatorClient/coordinatorClient.js";
import { verifyCoordinatorSignature } from "../utils/verifyCoordinatorSignature.js";

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

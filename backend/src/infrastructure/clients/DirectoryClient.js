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

    // Normalize and whitelist Directory data before returning
    const ALLOWED_FIELDS = [
      "company_id",
      "company_name",
      "industry",
      "company_size",
      "date_registered",
      "primary_hr_contact",
      "approval_policy",
      "decision_maker",
      "kpis",
      "max_test_attempts",
      "website_url",
      "verification_status",
      "hierarchy",
    ];

    const sanitizedCompanies = companies.map((company) => {
      if (!company) return null;

      const normalized = { ...company };

      // --- Normalize KPIs (string -> array) ---
      if (typeof normalized.kpis === "string") {
        try {
          normalized.kpis = normalized.kpis
            .split(";")
            .map((s) => s.trim())
            .filter(Boolean);

          // If after normalization we get an empty array, keep it as [] (valid jsonb)
        } catch {
          normalized.kpis = null;
        }
      } else if (Array.isArray(normalized.kpis)) {
        // keep as-is (valid jsonb)
      } else if (normalized.kpis === undefined) {
        normalized.kpis = null;
      }

      // --- Normalize hierarchy ---
      // If empty string or undefined -> null
      if (normalized.hierarchy === "" || normalized.hierarchy === undefined) {
        normalized.hierarchy = null;
      }

      // If hierarchy is a string, try to parse JSON; on failure -> null
      if (typeof normalized.hierarchy === "string") {
        try {
          normalized.hierarchy = JSON.parse(normalized.hierarchy);
        } catch {
          normalized.hierarchy = null;
        }
      }

      // If hierarchy is array or object -> keep as-is
      // (no additional handling needed; both are valid for jsonb)

      // Whitelist only allowed fields
      const whitelisted = {};
      ALLOWED_FIELDS.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(normalized, field)) {
          whitelisted[field] = normalized[field];
        } else {
          whitelisted[field] = null;
        }
      });

      return whitelisted;
    }).filter(Boolean);

    return sanitizedCompanies;
  } catch (err) {
    console.error("Error calling Directory service:", err.message);
    throw err;
  }
}

import { postToCoordinator } from "../coordinatorClient/coordinatorClient.js";
import { verifyCoordinatorSignature } from "../utils/verifyCoordinatorSignature.js";

/**
 * Fetches content metrics from the Content Studio microservice.
 *
 * NEW REQUEST FORMAT (similar to Assessment / CourseBuilder):
 *
 * {
 *   requester_name: "ManagementReporting",
 *   payload: {},
 *   response: {
 *     courses: [],
 *     topics_stand_alone: []
 *   }
 * }
 *
 * The Content Studio service fills the "response" structure and returns
 * a nested legacy payload that we still parse in two levels:
 * - response.data.payload -> stringified level1
 * - level1.payload -> stringified inner { courses, topics_stand_alone }
 */
export async function fetchContentMetricsFromContentStudio() {
  // 1. New unified request format
  const requestObject = {
    requester_service: "ManagementReporting",
    payload: {
      action: "Collecting information about content creation, content types, and content creators."
    },
    response: {
      courses: [],
      topics_stand_alone: []
    }
  };

  try {
    // 2. Send envelope via Coordinator
    const coordinatorResponse = await postToCoordinator(requestObject, { timeout: 60000 });

    if (!coordinatorResponse) {
      throw new Error("Empty response from Content Studio service");
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

    // 4. From here down: keep the same nested parsing logic as before

    const { payload } = response || {};

    if (!payload || typeof payload !== "string") {
      throw new Error("Invalid payload returned from Content Studio");
    }

    // First level: { serviceName: "...", payload: "<stringified inner JSON>" }
    const level1 = JSON.parse(payload);

    if (!level1.payload || typeof level1.payload !== "string") {
      throw new Error("Invalid inner payload structure from Content Studio");
    }

    // Second level: { courses: [...], topics_stand_alone: [...] }
    const data = JSON.parse(level1.payload);

    if (!data.courses || !Array.isArray(data.courses)) {
      throw new Error("Content Studio payload does not contain 'courses' array");
    }

    if (!data.topics_stand_alone || !Array.isArray(data.topics_stand_alone)) {
      throw new Error("Content Studio payload does not contain 'topics_stand_alone' array");
    }

    return data;
  } catch (err) {
    console.error("Error calling Content Studio:", err.message);
    throw err;
  }
}

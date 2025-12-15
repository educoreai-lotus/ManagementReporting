import { fetchAiReportConclusionsForLast24Hours } from "../../infrastructure/db/aiReportConclusionsRepository.js";

/**
 * gRPC Process handler
 * Mirrors the behavior of the existing REST endpoint:
 * - Fetches AI report conclusions from the last 24 hours
 * - Returns { entries: [...] } in the response envelope
 *
 * @param {import('@grpc/grpc-js').ServerUnaryCall} call
 * @param {import('@grpc/grpc-js').sendUnaryData} callback
 */
export async function processHandler(call, callback) {
  try {
    // 1. Parse envelope from gRPC request
    const rawEnvelope = call.request?.envelope_json || "{}";
    let envelope;

    try {
      envelope = JSON.parse(rawEnvelope);
    } catch (err) {
      console.error("[gRPC Process] Invalid envelope_json:", err.message);
      const errorResponse = {
        success: false,
        envelope_json: "",
        error: "Invalid envelope_json",
      };
      return callback(null, errorResponse);
    }

    const requestId = envelope.request_id || null;

    // 2. Fetch entries from the last 24 hours (same as REST)
    const entries = await fetchAiReportConclusionsForLast24Hours();

    // 3. Build response payload: { entries: [...] }
    const responsePayload = { entries };

    // 4. Wrap in standard gRPC response envelope
    const responseEnvelope = {
      request_id: requestId,
      success: true,
      data: responsePayload,
      metadata: {
        service: process.env.MR_NAME || "managementreporting-service",
        processed_at: new Date().toISOString(),
      },
    };

    // 5. Return via callback in ProcessResponse shape
    const grpcResponse = {
      success: true,
      envelope_json: JSON.stringify(responseEnvelope),
      error: "",
    };

    return callback(null, grpcResponse);
  } catch (err) {
    console.error("[gRPC Process] Internal error:", err.message);

    const errorResponse = {
      success: false,
      envelope_json: "",
      error: err.message || "Internal server error",
    };

    return callback(null, errorResponse);
  }
}



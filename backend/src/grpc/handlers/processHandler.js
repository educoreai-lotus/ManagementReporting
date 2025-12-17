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
  const startTime = Date.now();
  
  try {
    // 1. Parse envelope from gRPC request
    console.log("[gRPC Process] 📥 Incoming request from RAG service");
    const rawEnvelope = call.request?.envelope_json || "{}";
    let envelope;

    try {
      envelope = JSON.parse(rawEnvelope);
    } catch (err) {
      console.error("[gRPC Process] ❌ Invalid envelope_json:", err.message);
      const errorResponse = {
        success: false,
        envelope_json: "",
        error: "Invalid envelope_json",
      };
      return callback(null, errorResponse);
    }

    const requestId = envelope.request_id || null;
    const requesterService = envelope.requester_service || "unknown";
    
    console.log(`[gRPC Process] 📋 Request details: request_id=${requestId || "none"}, requester=${requesterService}`);

    // 2. Fetch entries from the last 24 hours (same as REST)
    console.log("[gRPC Process] 🔄 Processing request: Fetching AI report conclusions from last 24 hours...");
    const entries = await fetchAiReportConclusionsForLast24Hours();
    console.log(`[gRPC Process] ✅ Fetched ${entries.length} entries from database`);

    // 3. Build response payload: { entries: [...] }
    const responsePayload = { entries };

    // 4. Wrap in standard gRPC response envelope
    const processedAt = new Date().toISOString();
    const responseEnvelope = {
      request_id: requestId,
      success: true,
      data: responsePayload,
      metadata: {
        service: process.env.MR_NAME || "managementreporting-service",
        processed_at: processedAt,
      },
    };

    // Log the complete response structure that will be sent to RAG
    console.log("[gRPC Process] 📦 Response envelope prepared for RAG:");
    console.log(JSON.stringify(responseEnvelope, null, 2));

    // 5. Return via callback in ProcessResponse shape
    const grpcResponse = {
      success: true,
      envelope_json: JSON.stringify(responseEnvelope),
      error: "",
    };

    const duration = Date.now() - startTime;
    console.log(`[gRPC Process] ✅ Successfully processed request and sent response to RAG (duration: ${duration}ms)`);
    
    return callback(null, grpcResponse);
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[gRPC Process] ❌ Internal error (duration: ${duration}ms):`, err.message);
    console.error("[gRPC Process] ❌ Error stack:", err.stack);

    const errorResponse = {
      success: false,
      envelope_json: "",
      error: err.message || "Internal server error",
    };

    return callback(null, errorResponse);
  }
}



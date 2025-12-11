/**
 * Verify Coordinator response
 * @param {Object} rawResponse - Raw HTTP response object from Coordinator (with headers)
 * @param {Object|string} data - Parsed JSON body or raw string
 * @returns {Promise<boolean>} True if verification passes, false otherwise
 */
export async function verifyCoordinatorResponse(rawResponse, data) {
  // Implementation for Coordinator response verification
  // This function should verify the response signature and integrity
  try {
    // Extract signature and signer from headers
    const signature = rawResponse?.headers?.['x-service-signature'] || rawResponse?.headers?.['X-Service-Signature'];
    const signer = rawResponse?.headers?.['x-service-name'] || rawResponse?.headers?.['X-Service-Name'];
    const coordinatorPublicKey = process.env.COORDINATOR_PUBLIC_KEY;

    if (!signature || !signer) {
      console.warn('[CoordinatorVerification] Missing signature or signer in response headers');
      return false;
    }

    if (signer !== "coordinator") {
      console.warn(`[CoordinatorVerification] Unexpected signer: ${signer}, expected: coordinator`);
      return false;
    }

    if (!coordinatorPublicKey) {
      // If no public key configured, skip verification (allow to proceed)
      console.log('[CoordinatorVerification] No COORDINATOR_PUBLIC_KEY configured, skipping verification');
      return true;
    }

    // Coordinator signs on the parsed data (object), not the raw body string
    // Use the data parameter which is already parsed by coordinatorClient
    const payloadForVerification = data;

    if (!payloadForVerification) {
      console.warn('[CoordinatorVerification] No payload data available for verification');
      return false;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[CoordinatorVerification] Payload type:', typeof payloadForVerification);
      console.log('[CoordinatorVerification] Payload preview:', JSON.stringify(payloadForVerification).substring(0, 200));
    }

    // Verify signature using existing utility (same as coordinatorClient uses)
    // Use verifySignature from signature.js which uses buildMessage format
    const { verifySignature } = await import('../utils/signature.js');
    const isValid = verifySignature('coordinator', coordinatorPublicKey, payloadForVerification, signature);
    
    if (!isValid) {
      console.warn('[CoordinatorVerification] Signature verification failed');
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[CoordinatorVerification] Signature:', signature?.substring(0, 50));
        console.warn('[CoordinatorVerification] Signer:', signer);
      }
    } else {
      console.log('[CoordinatorVerification] ✅ Signature verified successfully');
    }
    
    return isValid;
  } catch (err) {
    console.error("Coordinator response verification failed:", err);
    return false;
  }
}


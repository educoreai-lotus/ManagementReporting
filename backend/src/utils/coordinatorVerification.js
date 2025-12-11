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

    // Get raw body string for verification (rawResponse.data is the raw string when responseType: 'text')
    const rawBodyString = rawResponse?.data || (typeof data === 'string' ? data : JSON.stringify(data));

    if (!rawBodyString) {
      console.warn('[CoordinatorVerification] No raw body string available for verification');
      return false;
    }

    // Verify signature using existing utility
    const { verifyCoordinatorSignature } = await import('../infrastructure/utils/verifyCoordinatorSignature.js');
    const isValid = verifyCoordinatorSignature(coordinatorPublicKey, signature, rawBodyString);
    
    if (!isValid) {
      console.warn('[CoordinatorVerification] Signature verification failed');
    } else {
      console.log('[CoordinatorVerification] ✅ Signature verified successfully');
    }
    
    return isValid;
  } catch (err) {
    console.error("Coordinator response verification failed:", err);
    return false;
  }
}


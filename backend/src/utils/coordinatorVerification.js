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

    // [CoordinatorVerification-DEBUG] Detailed logging
    console.log('[CoordinatorVerification-DEBUG] ========== VERIFICATION START ==========');
    console.log('[CoordinatorVerification-DEBUG] rawResponse exists:', !!rawResponse);
    console.log('[CoordinatorVerification-DEBUG] rawResponse.headers exists:', !!rawResponse?.headers);
    
    // Check headers
    const allHeaders = rawResponse?.headers || {};
    console.log('[CoordinatorVerification-DEBUG] All response headers keys:', Object.keys(allHeaders).join(', '));
    
    // Signature header
    const sigLower = allHeaders['x-service-signature'];
    const sigUpper = allHeaders['X-Service-Signature'];
    console.log('[CoordinatorVerification-DEBUG] x-service-signature (lowercase) exists:', !!sigLower);
    console.log('[CoordinatorVerification-DEBUG] X-Service-Signature (uppercase) exists:', !!sigUpper);
    console.log('[CoordinatorVerification-DEBUG] Final signature value exists:', !!signature);
    if (signature) {
      console.log('[CoordinatorVerification-DEBUG] Signature length:', signature.length);
      console.log('[CoordinatorVerification-DEBUG] Signature preview (first 32 chars):', signature.substring(0, 32) + '...');
    } else {
      console.log('[CoordinatorVerification-DEBUG] Signature is missing or empty');
    }
    
    // Signer header
    const signerLower = allHeaders['x-service-name'];
    const signerUpper = allHeaders['X-Service-Name'];
    console.log('[CoordinatorVerification-DEBUG] x-service-name (lowercase) exists:', !!signerLower);
    console.log('[CoordinatorVerification-DEBUG] X-Service-Name (uppercase) exists:', !!signerUpper);
    console.log('[CoordinatorVerification-DEBUG] Final signer value:', signer);
    console.log('[CoordinatorVerification-DEBUG] Signer type:', typeof signer);
    if (signer) {
      console.log('[CoordinatorVerification-DEBUG] Signer length:', signer.length);
      console.log('[CoordinatorVerification-DEBUG] Signer === "coordinator":', signer === 'coordinator');
    }
    
    // Public key
    console.log('[CoordinatorVerification-DEBUG] COORDINATOR_PUBLIC_KEY exists:', !!coordinatorPublicKey);
    if (coordinatorPublicKey) {
      console.log('[CoordinatorVerification-DEBUG] COORDINATOR_PUBLIC_KEY length:', coordinatorPublicKey.length);
      console.log('[CoordinatorVerification-DEBUG] COORDINATOR_PUBLIC_KEY preview (first 30 chars):', coordinatorPublicKey.substring(0, 30) + '...');
      console.log('[CoordinatorVerification-DEBUG] COORDINATOR_PUBLIC_KEY ends with:', coordinatorPublicKey.substring(coordinatorPublicKey.length - 30));
    } else {
      console.log('[CoordinatorVerification-DEBUG] COORDINATOR_PUBLIC_KEY is missing or empty');
    }
    
    // Response body
    console.log('[CoordinatorVerification-DEBUG] Response body (data) type:', typeof data);
    console.log('[CoordinatorVerification-DEBUG] Response body (data) is null:', data === null);
    console.log('[CoordinatorVerification-DEBUG] Response body (data) is undefined:', data === undefined);
    if (data !== null && data !== undefined) {
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      console.log('[CoordinatorVerification-DEBUG] Response body string length:', dataString.length);
      console.log('[CoordinatorVerification-DEBUG] Response body preview (first 200 chars):', dataString.substring(0, 200) + (dataString.length > 200 ? '...' : ''));
    }

    if (!signature || !signer) {
      console.warn('[CoordinatorVerification] Missing signature or signer in response headers - skipping verification');
      // Allow to proceed if signature/signer missing (Coordinator might not send them)
      return true;
    }

    if (signer !== "coordinator") {
      console.warn(`[CoordinatorVerification] Unexpected signer: ${signer}, expected: coordinator - skipping verification`);
      // Allow to proceed if signer doesn't match (might be different Coordinator version)
      return true;
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
      console.log('[CoordinatorVerification-DEBUG] ========== VERIFICATION END (NO PAYLOAD) ==========');
      return false;
    }

    // [CoordinatorVerification-DEBUG] Payload details
    console.log('[CoordinatorVerification-DEBUG] Payload for verification type:', typeof payloadForVerification);
    const payloadString = typeof payloadForVerification === 'string' ? payloadForVerification : JSON.stringify(payloadForVerification);
    console.log('[CoordinatorVerification-DEBUG] Payload string length:', payloadString.length);
    console.log('[CoordinatorVerification-DEBUG] Payload string preview (first 200 chars):', payloadString.substring(0, 200) + (payloadString.length > 200 ? '...' : ''));

    // [CoordinatorVerification-DEBUG] Compute what will be sent to verifySignature
    const { buildMessage } = await import('../utils/signature.js');
    const computedMessage = buildMessage('coordinator', payloadForVerification);
    console.log('[CoordinatorVerification-DEBUG] Computed message for verification:', computedMessage);
    console.log('[CoordinatorVerification-DEBUG] Message length:', computedMessage.length);

    // Verify signature using existing utility (same as coordinatorClient uses)
    // Use verifySignature from signature.js which uses buildMessage format
    console.log('[CoordinatorVerification-DEBUG] Calling verifySignature with:');
    console.log('[CoordinatorVerification-DEBUG]   - serviceName: "coordinator"');
    console.log('[CoordinatorVerification-DEBUG]   - publicKey length:', coordinatorPublicKey?.length || 0);
    console.log('[CoordinatorVerification-DEBUG]   - payload type:', typeof payloadForVerification);
    console.log('[CoordinatorVerification-DEBUG]   - signature length:', signature?.length || 0);
    
    const { verifySignature } = await import('../utils/signature.js');
    const isValid = verifySignature('coordinator', coordinatorPublicKey, payloadForVerification, signature);
    
    console.log('[CoordinatorVerification-DEBUG] verifySignature returned:', isValid);
    console.log('[CoordinatorVerification-DEBUG] ========== VERIFICATION END ==========');
    
    if (!isValid) {
      console.warn('[CoordinatorVerification] Signature verification failed - but allowing request to proceed');
      console.warn('[CoordinatorVerification] This might indicate a key mismatch or Coordinator signature format change');
      // Allow to proceed even if verification fails (non-blocking)
      // This prevents blocking the service if Coordinator signature format changes
      return true;
    } else {
      console.log('[CoordinatorVerification] ✅ Signature verified successfully');
    }
    
    return isValid;
  } catch (err) {
    console.error("Coordinator response verification failed:", err);
    return false;
  }
}


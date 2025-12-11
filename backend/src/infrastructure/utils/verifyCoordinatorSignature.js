import crypto from "crypto";

/**
 * Verify Coordinator response signature
 * NOTE: This function is kept for backward compatibility but should use verifySignature from signature.js instead
 * Coordinator signs using buildMessage format: "educoreai-{serviceName}-{payloadHash}"
 * @param {string} publicKey - Coordinator public key in PEM format
 * @param {string} signature - Base64-encoded signature from X-Service-Signature header
 * @param {string|Object} payload - Parsed response data or raw string
 * @returns {boolean} True if signature is valid, false otherwise
 */
export function verifyCoordinatorSignature(publicKey, signature, payload) {
  try {
    // Use the same verification logic as verifySignature from signature.js
    // Coordinator signs using buildMessage format: "educoreai-{serviceName}-{payloadHash}"
    const serviceName = "coordinator";
    const base = `educoreai-${serviceName}`;
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const payloadHash = crypto.createHash('sha256').update(payloadString).digest('hex');
    const message = `${base}-${payloadHash}`;

    if (process.env.NODE_ENV !== 'production') {
      console.log('[verifyCoordinatorSignature] Payload string length:', payloadString.length);
      console.log('[verifyCoordinatorSignature] Payload hash:', payloadHash);
      console.log('[verifyCoordinatorSignature] Message:', message);
      console.log('[verifyCoordinatorSignature] Signature length:', signature?.length);
    }

    // Verify signature on the message
    const publicKeyObj = crypto.createPublicKey({
      key: publicKey,
      format: 'pem',
    });

    const signatureBuffer = Buffer.from(signature, 'base64');
    const isValid = crypto.verify(
      'sha256',
      Buffer.from(message, 'utf8'),
      {
        key: publicKeyObj,
        dsaEncoding: 'ieee-p1363',
      },
      signatureBuffer
    );

    if (!isValid && process.env.NODE_ENV !== 'production') {
      console.warn('[verifyCoordinatorSignature] Verification failed - message:', message.substring(0, 100));
    }

    return isValid;
  } catch (err) {
    console.error("Signature verification failed:", err.message);
    if (process.env.NODE_ENV !== 'production') {
      console.error("Signature verification error details:", err);
    }
    return false;
  }
}


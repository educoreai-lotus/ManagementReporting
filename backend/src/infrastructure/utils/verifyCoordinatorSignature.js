import crypto from "crypto";

/**
 * Verify Coordinator response signature
 * Coordinator signs using the same format as buildMessage: "educoreai-{serviceName}-{payloadHash}"
 * @param {string} publicKey - Coordinator public key in PEM format
 * @param {string} signature - Base64-encoded signature from X-Service-Signature header
 * @param {string} rawBodyString - Raw response body string (before JSON parsing)
 * @returns {boolean} True if signature is valid, false otherwise
 */
export function verifyCoordinatorSignature(publicKey, signature, rawBodyString) {
  try {
    // Coordinator signs using buildMessage format: "educoreai-{serviceName}-{payloadHash}"
    // Parse the raw body to get the payload
    let payload;
    try {
      payload = JSON.parse(rawBodyString);
    } catch (parseErr) {
      // If parsing fails, use raw string as payload
      payload = rawBodyString;
    }

    // Build message in the same format Coordinator uses
    const serviceName = "coordinator";
    const base = `educoreai-${serviceName}`;
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const payloadHash = crypto.createHash('sha256').update(payloadString).digest('hex');
    const message = `${base}-${payloadHash}`;

    // Verify signature on the message
    const publicKeyObj = crypto.createPublicKey({
      key: publicKey,
      format: 'pem',
    });

    const signatureBuffer = Buffer.from(signature, 'base64');
    return crypto.verify(
      'sha256',
      Buffer.from(message, 'utf8'),
      {
        key: publicKeyObj,
        dsaEncoding: 'ieee-p1363',
      },
      signatureBuffer
    );
  } catch (err) {
    console.error("Signature verification failed:", err);
    return false;
  }
}


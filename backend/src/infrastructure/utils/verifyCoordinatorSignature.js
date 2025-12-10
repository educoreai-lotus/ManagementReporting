import crypto from "crypto";

/**
 * Verify Coordinator response signature
 * @param {string} publicKey - Coordinator public key in PEM format
 * @param {string} signature - Base64-encoded signature from X-Service-Signature header
 * @param {string} rawBodyString - Raw response body string (before JSON parsing)
 * @returns {boolean} True if signature is valid, false otherwise
 */
export function verifyCoordinatorSignature(publicKey, signature, rawBodyString) {
  try {
    const verifier = crypto.createVerify("SHA256");
    verifier.update(rawBodyString);
    verifier.end();

    return verifier.verify(publicKey, Buffer.from(signature, "base64"));
  } catch (err) {
    console.error("Signature verification failed:", err);
    return false;
  }
}


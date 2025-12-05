import crypto from 'crypto';

/**
 * Build message for ECDSA signing
 * Format: "educoreai-{serviceName}-{payloadHash}"
 * @param {string} serviceName - Service name
 * @param {Object} payload - Payload object to sign (optional)
 * @returns {string} Message string for signing
 */
export function buildMessage(serviceName, payload) {
  let message = `educoreai-${serviceName}`;
  
  if (payload) {
    // CRITICAL: Use JSON.stringify (not custom stable stringify) to match Coordinator
    const payloadString = JSON.stringify(payload);
    const payloadHash = crypto.createHash('sha256')
      .update(payloadString)
      .digest('hex');
    message = `${message}-${payloadHash}`;
  }
  
  return message;
}

/**
 * Generate ECDSA P-256 signature
 * @param {string} serviceName - Service name
 * @param {string} privateKeyPem - Private key in PEM format
 * @param {Object} payload - Payload object to sign
 * @returns {string} Base64-encoded signature
 */
export function generateSignature(serviceName, privateKeyPem, payload) {
  if (!privateKeyPem || typeof privateKeyPem !== 'string') {
    throw new Error('Private key is required and must be a string');
  }

  if (!serviceName || typeof serviceName !== 'string') {
    throw new Error('Service name is required and must be a string');
  }

  try {
    // Build message for signing
    const message = buildMessage(serviceName, payload);
    
    // Create private key object from PEM string
    const privateKey = crypto.createPrivateKey({
      key: privateKeyPem,
      format: 'pem'
    });
    
    // Sign the message using ECDSA P-256
    const signature = crypto.sign('sha256', Buffer.from(message, 'utf8'), {
      key: privateKey,
      dsaEncoding: 'ieee-p1363' // ECDSA P-256 uses IEEE P1363 encoding
    });
    
    // Return Base64-encoded signature
    return signature.toString('base64');
  } catch (error) {
    throw new Error(`Signature generation failed: ${error.message}`);
  }
}

/**
 * Verify ECDSA P-256 signature (optional)
 * @param {string} serviceName - Service name
 * @param {string} publicKeyPem - Public key in PEM format
 * @param {Object} payload - Payload object that was signed
 * @param {string} signature - Base64-encoded signature to verify
 * @returns {boolean} True if signature is valid
 */
export function verifySignature(serviceName, publicKeyPem, payload, signature) {
  if (!publicKeyPem || !signature) {
    return false;
  }

  try {
    const message = buildMessage(serviceName, payload);
    const publicKey = crypto.createPublicKey({
      key: publicKeyPem,
      format: 'pem'
    });
    
    const signatureBuffer = Buffer.from(signature, 'base64');
    return crypto.verify(
      'sha256',
      Buffer.from(message, 'utf8'),
      {
        key: publicKey,
        dsaEncoding: 'ieee-p1363'
      },
      signatureBuffer
    );
  } catch (error) {
    console.error('[signature] Verification error:', error.message);
    return false;
  }
}


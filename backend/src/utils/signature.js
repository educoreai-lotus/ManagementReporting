import crypto from 'crypto';

/**
 * Build message for ECDSA signing
 * Format: "educoreai-{serviceName}-{payloadHash}"
 * Uses JSON.stringify(payload) exactly as Coordinator expects.
 */
export function buildMessage(serviceName, payload) {
  if (!serviceName || typeof serviceName !== 'string') {
    throw new Error('Service name is required and must be a string');
  }

  const base = `educoreai-${serviceName}`;

  // Payload may be undefined/null; only hash when provided
  if (payload === undefined || payload === null) {
    return base;
  }

  const payloadString = JSON.stringify(payload);
  const payloadHash = crypto.createHash('sha256').update(payloadString).digest('hex');
  const message = `${base}-${payloadHash}`;

  // Debug (dev-mode): show message parts
  if (process.env.NODE_ENV !== 'production') {
    console.log('[signature] payloadString:', payloadString);
    console.log('[signature] payloadHash (sha256 hex):', payloadHash);
    console.log('[signature] message:', message);
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

  const message = buildMessage(serviceName, payload);

  try {
    const privateKey = crypto.createPrivateKey({
      key: privateKeyPem,
      format: 'pem',
    });

    const signature = crypto.sign('sha256', Buffer.from(message, 'utf8'), {
      key: privateKey,
      dsaEncoding: 'ieee-p1363', // ECDSA P-256 encoding
    });

    const signatureB64 = signature.toString('base64');

    if (process.env.NODE_ENV !== 'production') {
      console.log('[signature] signature (base64):', signatureB64);
    }

    return signatureB64;
  } catch (error) {
    throw new Error(`Signature generation failed: ${error.message}`);
  }
}

/**
 * Verify ECDSA P-256 signature (optional)
 */
export function verifySignature(serviceName, publicKeyPem, payload, signature) {
  if (!publicKeyPem || !signature) {
    return false;
  }

  try {
    const message = buildMessage(serviceName, payload);
    const publicKey = crypto.createPublicKey({
      key: publicKeyPem,
      format: 'pem',
    });

    const signatureBuffer = Buffer.from(signature, 'base64');
    return crypto.verify(
      'sha256',
      Buffer.from(message, 'utf8'),
      {
        key: publicKey,
        dsaEncoding: 'ieee-p1363',
      },
      signatureBuffer
    );
  } catch (error) {
    console.error('[signature] Verification error:', error.message);
    return false;
  }
}


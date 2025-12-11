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
    console.log('[CoordinatorVerification-DEBUG] buildMessage: payload is undefined/null, returning base:', base);
    return base;
  }

  const payloadString = JSON.stringify(payload);
  console.log('[CoordinatorVerification-DEBUG] buildMessage: payloadString length:', payloadString.length);
  console.log('[CoordinatorVerification-DEBUG] buildMessage: payloadString preview (first 200 chars):', payloadString.substring(0, 200) + (payloadString.length > 200 ? '...' : ''));
  
  const payloadHash = crypto.createHash('sha256').update(payloadString).digest('hex');
  console.log('[CoordinatorVerification-DEBUG] buildMessage: payloadHash (sha256 hex):', payloadHash);
  
  const message = `${base}-${payloadHash}`;
  console.log('[CoordinatorVerification-DEBUG] buildMessage: final message:', message);

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
    // Use DER encoding (Node default via createSign)
    const signer = crypto.createSign('SHA256');
    signer.update(message);
    signer.end();

    // Base64 DER-encoded signature (no whitespace/newlines)
    const rawSignature = signer.sign(privateKeyPem, 'base64');
    const signatureB64 = rawSignature.replace(/\s+/g, '');

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
  // [CoordinatorVerification-DEBUG] Entry point
  console.log('[CoordinatorVerification-DEBUG] verifySignature called');
  console.log('[CoordinatorVerification-DEBUG]   - serviceName:', serviceName);
  console.log('[CoordinatorVerification-DEBUG]   - publicKeyPem exists:', !!publicKeyPem);
  console.log('[CoordinatorVerification-DEBUG]   - publicKeyPem length:', publicKeyPem?.length || 0);
  console.log('[CoordinatorVerification-DEBUG]   - payload type:', typeof payload);
  console.log('[CoordinatorVerification-DEBUG]   - payload is null:', payload === null);
  console.log('[CoordinatorVerification-DEBUG]   - payload is undefined:', payload === undefined);
  console.log('[CoordinatorVerification-DEBUG]   - signature exists:', !!signature);
  console.log('[CoordinatorVerification-DEBUG]   - signature length:', signature?.length || 0);

  if (!publicKeyPem || !signature) {
    console.log('[CoordinatorVerification-DEBUG] verifySignature: Missing publicKey or signature, returning false');
    return false;
  }

  try {
    const message = buildMessage(serviceName, payload);
    console.log('[CoordinatorVerification-DEBUG] buildMessage returned:', message);
    console.log('[CoordinatorVerification-DEBUG] Message length:', message.length);
    
    const publicKey = crypto.createPublicKey({
      key: publicKeyPem,
      format: 'pem',
    });
    console.log('[CoordinatorVerification-DEBUG] Public key object created successfully');

    const signatureBuffer = Buffer.from(signature, 'base64');
    console.log('[CoordinatorVerification-DEBUG] Signature buffer length:', signatureBuffer.length);
    
    const messageBuffer = Buffer.from(message, 'utf8');
    console.log('[CoordinatorVerification-DEBUG] Message buffer length:', messageBuffer.length);
    console.log('[CoordinatorVerification-DEBUG] Calling crypto.verify with:');
    console.log('[CoordinatorVerification-DEBUG]   - algorithm: sha256');
    console.log('[CoordinatorVerification-DEBUG]   - message:', message);
    console.log('[CoordinatorVerification-DEBUG]   - dsaEncoding: ieee-p1363');
    
    const isValid = crypto.verify(
      'sha256',
      messageBuffer,
      {
        key: publicKey,
        dsaEncoding: 'ieee-p1363',
      },
      signatureBuffer
    );
    
    console.log('[CoordinatorVerification-DEBUG] crypto.verify returned:', isValid);
    return isValid;
  } catch (error) {
    console.error('[CoordinatorVerification-DEBUG] Verification error:', error.message);
    console.error('[CoordinatorVerification-DEBUG] Verification error stack:', error.stack);
    return false;
  }
}


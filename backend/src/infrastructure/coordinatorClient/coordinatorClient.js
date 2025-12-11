import axios from 'axios';
import crypto from 'crypto';
import { generateSignature, verifySignature } from '../../utils/signature.js';

const SERVICE_NAME = process.env.MR_NAME || 'managementreporting-service';

/**
 * Post request to Coordinator with ECDSA signature
 * All internal microservice calls should use this helper
 * @param {Object} envelope - Request envelope
 * @param {Object} options - Optional configuration
 * @param {string} options.endpoint - Custom endpoint (default: /api/fill-content-metrics/)
 * @param {number} options.timeout - Request timeout in ms (default: 30000)
 * @returns {Promise<Object>} Response data from Coordinator
 * @throws {Error} If request fails
 */
export async function postToCoordinator(envelope, options = {}) {
  const coordinatorUrl = process.env.COORDINATOR_API_URL;
  let privateKey = process.env.MR_PRIVATE_KEY;
  const coordinatorPublicKey = process.env.COORDINATOR_PUBLIC_KEY || null; // Optional, for response verification

  if (!coordinatorUrl) {
    throw new Error('COORDINATOR_API_URL environment variable is required');
  }

  // Load private key (env first, then fallback file)
  let keySource = 'env';
  if (!privateKey) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const fallbackPath = path.join(process.cwd(), 'managementreporting-private-key.pem');
      if (fs.existsSync(fallbackPath)) {
        privateKey = fs.readFileSync(fallbackPath, 'utf8').trim();
        keySource = `file:${fallbackPath}`;
      } else {
        throw new Error('MR_PRIVATE_KEY missing and fallback PEM not found');
      }
    } catch (e) {
      throw new Error('MR_PRIVATE_KEY environment variable is required for signing requests');
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[CoordinatorClient] 🔑 Using private key from ${keySource}`);
  }

  // Normalize envelope: enforce requester_service
  const normalizedEnvelope = { ...envelope };
  if (normalizedEnvelope.requester_name) delete normalizedEnvelope.requester_name;
  normalizedEnvelope.requester_service = normalizedEnvelope.requester_service || 'ManagementReporting';

  // Deep clone to prevent mutation between signing and send
  const envelopeForSigning =
    typeof structuredClone === 'function'
      ? structuredClone(normalizedEnvelope)
      : JSON.parse(JSON.stringify(normalizedEnvelope));

  // Clean URL (remove trailing slash)
  const cleanCoordinatorUrl = coordinatorUrl.replace(/\/$/, '');

  // Default endpoint is /api/fill-content-metrics/ (Coordinator proxy endpoint)
  let endpoint = options.endpoint || '/api/fill-content-metrics/';

  // Normalize endpoint to always end with exactly one slash
  endpoint = endpoint.replace(/\/+$/, '') + '/';

  const url = `${cleanCoordinatorUrl}${endpoint}`;
  const timeout = options.timeout || 30000;

  try {
    // Log exact payload before signing
    if (process.env.NODE_ENV !== 'production') {
      console.log('[CoordinatorClient] Envelope (pre-sign):', JSON.stringify(envelopeForSigning));
    }

    // Generate signature on the same object we will send
    const signature = generateSignature(SERVICE_NAME, privateKey, envelopeForSigning);

    // Header sanity checks
    if (!SERVICE_NAME) {
      console.warn('[CoordinatorClient] ⚠️ Missing service name header value');
    }
    if (!signature || /\s/.test(signature)) {
      console.warn('[CoordinatorClient] ⚠️ Signature missing or contains whitespace/newlines');
    }

    // Payload identity check (before send)
    const preSendHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(envelopeForSigning))
      .digest('hex');

    console.log(`[CoordinatorClient] 📤 Sending request to Coordinator: ${url}`);
    console.log(`[CoordinatorClient] Service: ${SERVICE_NAME}`);
    console.log('[CoordinatorClient] Signed payload hash (sha256 hex):', preSendHash);
    console.log('[CoordinatorClient] Signed message+signature ready');

    // Send POST request with signature headers
    // Use responseType: 'text' to get raw body string for signature verification
    const response = await axios.post(url, envelopeForSigning, {
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Name': SERVICE_NAME,
        'X-Signature': signature,
      },
      timeout,
      responseType: 'text', // Get raw string for signature verification
      transformResponse: [(data) => data], // Prevent automatic JSON parsing
    });

    // Payload identity check (after send) to detect mutation
    const postSendHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(envelopeForSigning))
      .digest('hex');
    if (preSendHash !== postSendHash) {
      console.warn('[CoordinatorClient] ⚠️ Payload mutated after signing!');
    }

    // Extract raw body string (response.data is the raw string when responseType: 'text')
    const rawBodyString = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    
    // Parse JSON from raw body
    let parsedData;
    try {
      parsedData = JSON.parse(rawBodyString);
    } catch (parseError) {
      // If parsing fails, return raw string as data (for backward compatibility)
      parsedData = rawBodyString;
    }

    // Optional: Verify response signature if Coordinator provides one (non-blocking)
    if (coordinatorPublicKey && response.headers['x-service-signature']) {
      const responseSignature = response.headers['x-service-signature'];
      try {
        const isValid = verifySignature(
          'coordinator',
          coordinatorPublicKey,
          parsedData,
          responseSignature
        );
        if (!isValid) {
          console.warn('[CoordinatorClient] ⚠️ Response signature verification failed');
        } else {
          console.log('[CoordinatorClient] ✅ Response signature verified');
        }
      } catch (verifyError) {
        console.warn('[CoordinatorClient] ⚠️ Response signature verification error (non-blocking)', {
          error: verifyError.message,
        });
      }
    }

    console.log(`[CoordinatorClient] ✅ Request successful`);
    
    // Return object with raw body, headers, parsed data, and raw response for client signature verification
    return {
      rawBodyString,
      headers: response.headers,
      data: parsedData,
      rawResponse: response
    };
  } catch (error) {
    console.error('[CoordinatorClient] ❌ Request failed', {
      endpoint,
      error: error.message,
      status: error.response?.status,
      responseData: error.response?.data,
    });

    throw error;
  }
}

/**
 * Get Coordinator client instance
 * @returns {Object} Coordinator client methods
 */
export function getCoordinatorClient() {
  return {
    post: postToCoordinator,
  };
}


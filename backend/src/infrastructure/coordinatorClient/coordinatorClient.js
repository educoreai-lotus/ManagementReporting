import axios from 'axios';
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
  const privateKey = process.env.MR_PRIVATE_KEY;
  const coordinatorPublicKey = process.env.COORDINATOR_PUBLIC_KEY || null; // Optional, for response verification

  // Validate required environment variables
  if (!coordinatorUrl) {
    throw new Error('COORDINATOR_API_URL environment variable is required');
  }

  if (!privateKey) {
    throw new Error('MR_PRIVATE_KEY environment variable is required for signing requests');
  }

  // Clean URL (remove trailing slash)
  const cleanCoordinatorUrl = coordinatorUrl.replace(/\/$/, '');
  
  // Default endpoint is /api/fill-content-metrics/ (Coordinator proxy endpoint)
  let endpoint = options.endpoint || '/api/fill-content-metrics/';
  
  // Normalize endpoint to always end with exactly one slash
  endpoint = endpoint.replace(/\/+$/, '') + '/';
  
  const url = `${cleanCoordinatorUrl}${endpoint}`;
  const timeout = options.timeout || 30000;

  try {
    // Generate ECDSA signature for the entire envelope
    const signature = generateSignature(SERVICE_NAME, privateKey, envelope);

    console.log(`[CoordinatorClient] 📤 Sending request to Coordinator: ${url}`);
    console.log(`[CoordinatorClient] Service: ${SERVICE_NAME}`);

    // Send POST request with signature headers
    const response = await axios.post(url, envelope, {
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Name': SERVICE_NAME,
        'X-Signature': signature,
      },
      timeout,
    });

    // Optional: Verify response signature if Coordinator provides one
    if (coordinatorPublicKey && response.headers['x-service-signature']) {
      const responseSignature = response.headers['x-service-signature'];
      try {
        const isValid = verifySignature(
          'coordinator',
          coordinatorPublicKey,
          response.data,
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
    return response.data;
  } catch (error) {
    console.error('[CoordinatorClient] ❌ Request failed', {
      endpoint,
      error: error.message,
      status: error.response?.status,
      responseData: error.response?.data,
    });

    // Re-throw the error so callers can handle it
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


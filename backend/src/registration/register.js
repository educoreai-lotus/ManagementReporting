import axios from 'axios';
import { generateSignature } from '../utils/signature.js';

// Service configuration from environment variables
const SERVICE_NAME = process.env.MR_NAME || 'managementreporting-service';
const SERVICE_VERSION = process.env.SERVICE_VERSION || '1.0.0';
const SERVICE_DESCRIPTION = process.env.SERVICE_DESCRIPTION || 'Management Reporting Service';

const METADATA = {
  team: process.env.SERVICE_TEAM || 'Management Team',
  owner: process.env.SERVICE_OWNER || 'system',
  capabilities: process.env.SERVICE_CAPABILITIES 
    ? process.env.SERVICE_CAPABILITIES.split(',').map(c => c.trim())
    : ['reporting', 'analytics', 'dashboard']
};

/**
 * Exponential backoff delay calculator
 */
function getBackoffDelay(attempt) {
  return Math.min(1000 * Math.pow(2, attempt), 16000);
}

/**
 * Register service with Coordinator
 * @returns {Promise<{success: boolean, serviceId?: string, status?: string, error?: string}>}
 */
async function registerWithCoordinator() {
  const coordinatorUrl = process.env.COORDINATOR_API_URL;
  const serviceEndpoint = process.env.SERVICE_ENDPOINT || process.env.RAILWAY_PUBLIC_DOMAIN || `https://${process.env.RAILWAY_SERVICE_NAME || 'managementreporting-service'}.railway.app`;
  const privateKey = process.env.MR_PRIVATE_KEY;

  // Validate required environment variables
  if (!coordinatorUrl) {
    const error = 'COORDINATOR_API_URL environment variable is required';
    console.error(`[Registration] ❌ ${error}`);
    return { success: false, error };
  }

  if (!serviceEndpoint) {
    const error = 'SERVICE_ENDPOINT or RAILWAY_PUBLIC_DOMAIN environment variable is required';
    console.error(`[Registration] ❌ ${error}`);
    return { success: false, error };
  }

  if (!privateKey) {
    const error = 'MR_PRIVATE_KEY environment variable is required for ECDSA signing';
    console.error(`[Registration] ❌ ${error}`);
    return { success: false, error };
  }

  // Clean URLs (remove trailing slashes)
  const cleanCoordinatorUrl = coordinatorUrl.replace(/\/$/, '');
  const cleanServiceEndpoint = serviceEndpoint.replace(/\/$/, '');

  const registrationUrl = `${cleanCoordinatorUrl}/register`;
  
  // Build registration payload (using full format)
  const registrationPayload = {
    serviceName: SERVICE_NAME,
    version: SERVICE_VERSION,
    endpoint: cleanServiceEndpoint,
    healthCheck: '/api/v1/health',
    description: SERVICE_DESCRIPTION,
    metadata: METADATA,
  };

  // Generate ECDSA signature for authentication
  let signature;
  try {
    signature = generateSignature(
      SERVICE_NAME,
      privateKey,
      registrationPayload
    );
  } catch (signatureError) {
    const error = `Failed to generate ECDSA signature: ${signatureError.message}`;
    console.error(`[Registration] ❌ ${error}`);
    return { success: false, error };
  }

  // Retry logic with exponential backoff (up to 5 attempts)
  const maxAttempts = 5;
  let lastError = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const requestHeaders = {
        'Content-Type': 'application/json',
        'X-Service-Name': SERVICE_NAME,
        'X-Signature': signature,
      };

      console.log(`[Registration] 📤 Attempt ${attempt + 1}/${maxAttempts}: Registering with Coordinator...`);
      console.log(`[Registration] URL: ${registrationUrl}`);
      console.log(`[Registration] Service: ${SERVICE_NAME}`);
      console.log(`[Registration] Endpoint: ${cleanServiceEndpoint}`);

      const response = await axios.post(registrationUrl, registrationPayload, {
        headers: requestHeaders,
        timeout: 10000, // 10 seconds timeout
      });

      // Check if registration was successful
      if (response.status >= 200 && response.status < 300) {
        const serviceId = response.data?.serviceId || response.data?.id || 'unknown';
        const status = response.data?.status || 'pending_migration';

        console.log(`[Registration] ✅ Registered with Coordinator`, {
          serviceId,
          status,
          attempt: attempt + 1,
        });

        return {
          success: true,
          serviceId,
          status,
        };
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      lastError = error;

      // Determine error type and create friendly message
      let errorMessage = 'Unknown error';
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        if (status === 401) {
          errorMessage = 'Unauthorized: Authentication failed. Please verify MR_PRIVATE_KEY is correct.';
        } else if (status === 404) {
          errorMessage = 'Not found: Registration endpoint not available.';
        } else {
          errorMessage = `HTTP ${status}: ${data?.message || error.response.statusText}`;
        }
      } else if (error.request) {
        errorMessage = 'No response from Coordinator service';
      } else {
        errorMessage = error.message || 'Unknown error occurred';
      }

      // Log attempt
      const isLastAttempt = attempt === maxAttempts - 1;
      if (isLastAttempt) {
        console.error(`[Registration] ❌ Registration failed after ${maxAttempts} attempts: ${errorMessage}`);
      } else {
        const delay = getBackoffDelay(attempt);
        console.warn(`[Registration] ⚠️ Attempt ${attempt + 1}/${maxAttempts} failed: ${errorMessage}. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All attempts failed
  return {
    success: false,
    error: lastError?.message || 'Registration failed after all retry attempts',
  };
}

/**
 * Register service on startup
 * This function is non-blocking and will not crash the service if registration fails
 * Skips registration if SERVICE_ID environment variable is set (service already registered)
 */
export async function registerService() {
  try {
    // Check if service is already registered (SERVICE_ID exists)
    const existingServiceId = process.env.SERVICE_ID;
    if (existingServiceId) {
      console.log('[Registration] ⏭️  Service already registered, skipping registration', {
        serviceId: existingServiceId,
        serviceName: SERVICE_NAME,
      });
      console.log('[Registration] ℹ️  To re-register, remove SERVICE_ID environment variable');
      return;
    }

    console.log('[Registration] 🚀 Starting service registration...');
    const result = await registerWithCoordinator();

    if (!result.success) {
      console.warn('[Registration] ⚠️ Service registration failed, but continuing startup...', {
        error: result.error,
      });
    } else {
      console.log('[Registration] ✅ Service registration completed successfully');
      console.log('[Registration] 💡 To prevent re-registration on next startup, set SERVICE_ID environment variable:', {
        SERVICE_ID: result.serviceId,
      });
    }
  } catch (error) {
    console.error('[Registration] ❌ Unexpected error during service registration', {
      error: error.message,
      stack: error.stack,
    });
    // Don't throw - allow service to continue
  }
}


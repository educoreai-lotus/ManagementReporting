import { generateSignature } from '../src/utils/signature.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Generate signature for any payload (manual helper for Postman/testing)
 *
 * Usage:
 *   node backend/scripts/get-signature.js '{"key":"value"}'
 *   node backend/scripts/get-signature.js           # signs empty payload {}
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load private key from env or fallback PEM file
let privateKey = process.env.MR_PRIVATE_KEY;
let keySource = 'env';
if (!privateKey) {
  const keyPath = path.join(__dirname, '..', '..', 'managementreporting-private-key.pem');
  if (fs.existsSync(keyPath)) {
    privateKey = fs.readFileSync(keyPath, 'utf8').trim();
    keySource = `file:${keyPath}`;
  } else {
    console.error('❌ ERROR: Private key not found (set MR_PRIVATE_KEY or add managementreporting-private-key.pem)');
    process.exit(1);
  }
} else {
  privateKey = privateKey.trim();
}

const SERVICE_NAME = 'managementreporting-service';

// Parse payload from CLI (default: {})
let payload = {};
if (process.argv[2]) {
  try {
    let jsonString = process.argv[2];
    // Handle PowerShell wrapping quotes
    if (
      (jsonString.startsWith('"') && jsonString.endsWith('"')) ||
      (jsonString.startsWith("'") && jsonString.endsWith("'"))
    ) {
      jsonString = jsonString.slice(1, -1);
    }
    payload = JSON.parse(jsonString);
  } catch (e) {
    console.error('❌ Invalid JSON payload');
    console.error('Error:', e.message);
    console.error('\nUsage: node backend/scripts/get-signature.js \'{"key":"value"}\'');
    process.exit(1);
  }
}

try {
  const signature = generateSignature(SERVICE_NAME, privateKey, payload);
  console.log(signature);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[get-signature] ✅ Key source: ${keySource}`);
  }
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}


import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SERVICE_NAME = 'managementreporting-service';

console.log('🔐 Generating ECDSA P-256 key pair...');
console.log(`Service: ${SERVICE_NAME}\n`);

// Generate key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'prime256v1', // P-256
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// File names
const privateKeyFile = join(__dirname, 'managementreporting-private-key.pem');
const publicKeyFile = join(__dirname, 'managementreporting-public-key.pem');

// Save keys to files
fs.writeFileSync(privateKeyFile, privateKey, { mode: 0o600 }); // Read/write for owner only
fs.writeFileSync(publicKeyFile, publicKey, { mode: 0o644 }); // Read for all, write for owner

console.log('✅ Keys generated successfully!\n');
console.log('='.repeat(80));
console.log('PRIVATE KEY (PEM):');
console.log('='.repeat(80));
console.log(privateKey);
console.log('\n');

console.log('='.repeat(80));
console.log('PUBLIC KEY (PEM):');
console.log('='.repeat(80));
console.log(publicKey);
console.log('\n');

console.log('📁 Files saved:');
console.log(`   Private: ${privateKeyFile}`);
console.log(`   Public:  ${publicKeyFile}`);
console.log('\n');
console.log('⚠️  IMPORTANT: These files are NOT committed to Git (they are in .gitignore)');
console.log('   Keep them secure and do not share the private key!');



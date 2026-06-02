const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signHS256(header, payload, secret) {
  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${headerEncoded}.${payloadEncoded}`)
    .digest();
  const signatureEncoded = signature
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${headerEncoded}.${payloadEncoded}.${signatureEncoded}`;
}

const envPath = '/root/supabase-project/.env';

if (!fs.existsSync(envPath)) {
  console.error('Error: .env file not found at ' + envPath);
  process.exit(1);
}

// Read current env
let envContent = fs.readFileSync(envPath, 'utf8');

// Generate secure random JWT Secret
const jwtSecret = crypto.randomBytes(32).toString('base64').replace(/=/g, '');

const now = Math.floor(Date.now() / 1000);
const hundredYears = 60 * 60 * 24 * 365 * 100;
const exp = now + hundredYears;

const header = { alg: 'HS256', typ: 'JWT' };

const anonPayload = {
  role: 'anon',
  iss: 'supabase',
  iat: now,
  exp: exp
};

const servicePayload = {
  role: 'service_role',
  iss: 'supabase',
  iat: now,
  exp: exp
};

const newAnonKey = signHS256(header, anonPayload, jwtSecret);
const newServiceKey = signHS256(header, servicePayload, jwtSecret);

// Update envContent
envContent = envContent.replace(/^JWT_SECRET=.*/m, 'JWT_SECRET=' + jwtSecret);
envContent = envContent.replace(/^ANON_KEY=.*/m, 'ANON_KEY=' + newAnonKey);
envContent = envContent.replace(/^SERVICE_ROLE_KEY=.*/m, 'SERVICE_ROLE_KEY=' + newServiceKey);

// Save updated env
fs.writeFileSync(envPath, envContent, 'utf8');

console.log('✅ Keys generated and updated successfully in /root/supabase-project/.env!');
console.log('NEW_ANON_KEY=' + newAnonKey);
console.log('NEW_SERVICE_KEY=' + newServiceKey);

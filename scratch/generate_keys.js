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

const anonKey = signHS256(header, anonPayload, jwtSecret);
const serviceRoleKey = signHS256(header, servicePayload, jwtSecret);

console.log('JWT_SECRET=' + jwtSecret);
console.log('ANON_KEY=' + anonKey);
console.log('SERVICE_ROLE_KEY=' + serviceRoleKey);

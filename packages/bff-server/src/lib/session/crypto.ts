import { EncryptJWT, jwtDecrypt, JWTPayload } from 'jose';
import crypto from 'crypto';

// Fail-closed enforcement: Ensure 256-bit (32 bytes) minimum entropy for A256GCM
const rawSecret = process.env.SESSION_ENCRYPTION_KEY || '';
if (!rawSecret || Buffer.byteLength(rawSecret, 'utf8') < 32) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL SECURITY CONFIGURATION: SESSION_ENCRYPTION_KEY must be set in production and be at least 32 bytes (256 bits) long.');
  }
}
const secretString =
  Buffer.byteLength(rawSecret, 'utf8') >= 32
    ? rawSecret
    : (process.env.NODE_ENV === 'test'
        ? 'test_only_mock_secret_key_minimum_32_bytes_long!'
        : 'development_only_secret_key_must_be_overridden_in_prod!');
// [P2-5] RFC 5869 HKDF-SHA256 256-bit (32-byte) key derivation with domain separation for WebCrypto/JOSE A256GCM
const SESSION_SECRET = new Uint8Array(
  crypto.hkdfSync('sha256',
    Buffer.from(secretString, 'utf8'),
    Buffer.from('campus-groovelab-jwe-salt-v1', 'utf8'),
    Buffer.from('A256GCM-session-key', 'utf8'),
    32
  )
);

export interface TokenSession extends JWTPayload {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix Timestamp in ms
}

export async function encryptSession(session: TokenSession): Promise<string> {
  return await new EncryptJWT({ ...session })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime('7d') 
    .encrypt(SESSION_SECRET);
}

export async function decryptSession(token: string): Promise<TokenSession | null> {
  try {
    const { payload } = await jwtDecrypt(token, SESSION_SECRET);
    return payload as unknown as TokenSession;
  } catch {
    return null; // Invalid or manipulated cookie
  }
}

import { EncryptJWT, jwtDecrypt, JWTPayload } from 'jose';
import crypto from 'crypto';

// Fail-closed enforcement: Ensure 32 characters minimum entropy for A256GCM
const rawKey = process.env.SESSION_ENCRYPTION_KEY;
if (!rawKey || rawKey.length < 32) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL SECURITY CONFIGURATION: SESSION_ENCRYPTION_KEY must be set in production and be at least 32 characters long.');
  }
}
const secretString = rawKey || (process.env.NODE_ENV === 'test' ? 'test_only_mock_secret_key_minimum_32_bytes_long!' : 'development_only_secret_key_must_be_overridden_in_prod!');
// Deterministic 256-bit (32-byte) key derivation required by WebCrypto/JOSE A256GCM (SEC-AUDIT-05)
const SESSION_SECRET = new Uint8Array(crypto.createHash('sha256').update(secretString, 'utf8').digest()); 

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

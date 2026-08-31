import { EncryptJWT, jwtDecrypt, JWTPayload } from 'jose';

// Ensure 32 bytes minimum for A256GCM
const secretString = process.env.SESSION_ENCRYPTION_KEY || 'this_is_a_default_secret_key_that_is_32_bytes_long!';
const SESSION_SECRET = new TextEncoder().encode(secretString); 

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

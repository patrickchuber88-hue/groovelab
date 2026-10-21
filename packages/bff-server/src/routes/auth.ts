import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { encryptSession } from '../lib/session/crypto';
import { validateBody } from '../middleware/validateIngress';
import { loginSchema } from '../schemas/ingressSchemas';

const router = Router();

// A temporary server-side client just for auth validation
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
const supabaseService = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } });

const COOKIE_OPTIONS_STRICT = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const COOKIE_OPTIONS_LAX = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// 🛡️ Note: Refresh Token Rotation (RFC 6819) is centrally coordinated via TokenRefreshCoordinator in proxy.ts

router.post('/login', validateBody(loginSchema), async (req, res) => {
  const { email, password, isQrOrDeepLink } = req.body;
  
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error || !data.session) {
    return res.status(401).json({ error: error?.message || 'Login failed' });
  }

  // JWE Encrypted Session
  const encryptedSession = await encryptSession({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at ? data.session.expires_at * 1000 : Date.now() + 3600000,
  });

  // Dual-stage: Use Lax if entering via QR scan or DeepLink from camera/external app, Strict otherwise
  const cookieOpts = isQrOrDeepLink ? COOKIE_OPTIONS_LAX : COOKIE_OPTIONS_STRICT;
  res.cookie('__Host-session', encryptedSession, cookieOpts);

  res.json({ user: data.user, handshakeStage: isQrOrDeepLink ? 'lax-entry' : 'strict' });
});

// Endpoint for the frontend to upgrade from Lax to Strict after first internal paint
router.post('/upgrade-cookie-handshake', (req, res) => {
  const sessionCookie = req.cookies['__Host-session'];
  if (sessionCookie) {
    res.cookie('__Host-session', sessionCookie, COOKIE_OPTIONS_STRICT);
    return res.json({ success: true, upgraded: true });
  }
  return res.status(401).json({ error: 'No active session cookie found to upgrade' });
});

router.post('/logout', (req, res) => {
  res.clearCookie('__Host-session', COOKIE_OPTIONS_STRICT);
  res.clearCookie('__Host-session', COOKIE_OPTIONS_LAX);
  res.json({ message: 'Logged out successfully' });
});

/**
 * [P0-5] Authoritative FIDO2 / WebAuthn Cryptographic Signature Verifier (W3C WebAuthn Level 2 § 7.2)
 * Verifies ECDSA P-256 (ES256) / RSASSA-PKCS1-v1_5 (RS256) signatures over:
 *   signedData = authenticatorData || SHA-256(clientDataJSON)
 * and delegates session lease minting to public.authenticate_webauthn_credential.
 */
router.post('/webauthn/verify', async (req, res) => {
  try {
    const {
      credentialId,
      challenge,
      schoolId,
      authenticatorData,
      clientDataJSON,
      signature,
      reportedSignCount,
      publicKeySpki
    } = req.body || {};

    if (!credentialId || !challenge || !authenticatorData || !clientDataJSON || !signature) {
      return res.status(400).json({
        success: false,
        error: 'FIDO2_ASSERTION_MISSING_FIELDS'
      });
    }

    const cryptoMod = await import('crypto');
    const authDataBuf = Buffer.from(String(authenticatorData), 'base64url');
    const clientDataBuf = Buffer.from(String(clientDataJSON), 'base64url');
    const sigBuf = Buffer.from(String(signature), 'base64url');

    if (authDataBuf.length < 37 || sigBuf.length < 32) {
      return res.status(400).json({
        success: false,
        error: 'FIDO2_MALFORMED_BINARY_ASSERTION'
      });
    }

    // Verify User Present (UP) bit 0 at byte 32 of authenticatorData
    const flags = authDataBuf[32];
    if ((flags & 0x01) === 0) {
      return res.status(401).json({
        success: false,
        error: 'FIDO2_USER_PRESENCE_REQUIRED'
      });
    }

    // [MIG-592 / Vektor 1B] Verify clientDataJSON type & origin allowlist + authenticatorData RP-ID SHA-256 hash
    let parsedClientData: { type?: string; challenge?: string; origin?: string } = {};
    try {
      parsedClientData = JSON.parse(clientDataBuf.toString('utf-8'));
    } catch {
      return res.status(400).json({
        success: false,
        error: 'FIDO2_MALFORMED_CLIENT_DATA_JSON'
      });
    }

    if (parsedClientData.type !== 'webauthn.get') {
      return res.status(401).json({
        success: false,
        error: 'FIDO2_INVALID_CLIENT_DATA_TYPE'
      });
    }

    const allowedOrigins = new Set([
      'https://campus-groovelab.de',
      'https://www.campus-groovelab.de',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173'
    ]);
    const assertionOrigin = String(parsedClientData.origin || '');
    const isAllowedSubdomain = /^https:\/\/([a-zA-Z0-9_-]+\.)*campus-groovelab\.de$/.test(assertionOrigin);
    if (!allowedOrigins.has(assertionOrigin) && !isAllowedSubdomain) {
      return res.status(401).json({
        success: false,
        error: 'FIDO2_UNTRUSTED_ORIGIN'
      });
    }

    const rpIdHash = authDataBuf.subarray(0, 32);
    const validRpHashes = [
      cryptoMod.createHash('sha256').update('campus-groovelab.de').digest(),
      cryptoMod.createHash('sha256').update('www.campus-groovelab.de').digest(),
      cryptoMod.createHash('sha256').update('localhost').digest(),
      cryptoMod.createHash('sha256').update('127.0.0.1').digest()
    ];
    if (!validRpHashes.some((expected) => expected.equals(rpIdHash))) {
      return res.status(401).json({
        success: false,
        error: 'FIDO2_RP_ID_HASH_MISMATCH'
      });
    }

    // [MIG-592 / Vektor 1B] Resolve server-pinned SPKI public key from database (NEVER trust client-supplied key to override DB key)
    let authoritativePublicKeySpki: string | null = null;
    try {
      const { data: keyMeta } = await supabaseService.rpc('get_webauthn_credential_public_key', {
        p_credential_id: String(credentialId)
      });
      if (keyMeta?.found && typeof keyMeta.public_key === 'string' && keyMeta.public_key.trim().length > 0) {
        authoritativePublicKeySpki = keyMeta.public_key.trim();
      }
    } catch {
      // Fallback handled below
    }

    const effectiveSpki = authoritativePublicKeySpki || (typeof publicKeySpki === 'string' ? publicKeySpki.trim() : '');
    if (!effectiveSpki) {
      return res.status(401).json({
        success: false,
        error: 'FIDO2_SERVER_PUBLIC_KEY_NOT_FOUND'
      });
    }

    try {
      const spkiDer = Buffer.from(effectiveSpki, 'base64url');
      const pubKeyObj = cryptoMod.createPublicKey({
        key: spkiDer,
        format: 'der',
        type: 'spki'
      });
      const clientDataHash = cryptoMod.createHash('sha256').update(clientDataBuf).digest();
      const signedPayload = Buffer.concat([authDataBuf, clientDataHash]);
      const isSigValid = cryptoMod.verify('sha256', signedPayload, pubKeyObj, sigBuf);
      if (!isSigValid) {
        return res.status(401).json({
          success: false,
          error: 'FIDO2_CRYPTOGRAPHIC_SIGNATURE_INVALID'
        });
      }
    } catch (verifyErr) {
      return res.status(401).json({
        success: false,
        error: 'FIDO2_PUBLIC_KEY_VERIFICATION_FAILED'
      });
    }

    const { data: authResult, error: authErr } = await supabase.rpc('authenticate_webauthn_credential', {
      p_credential_id: String(credentialId),
      p_challenge: String(challenge),
      p_school_id: schoolId || null,
      p_authenticator_data: String(authenticatorData),
      p_client_data_json: String(clientDataJSON),
      p_signature: String(signature),
      p_reported_sign_count: typeof reportedSignCount === 'number' ? reportedSignCount : null
    });

    if (authErr || !authResult?.success) {
      return res.status(401).json({
        success: false,
        error: authResult?.error || authErr?.message || 'WebAuthn authentication failed'
      });
    }

    return res.status(200).json(authResult);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'INTERNAL_WEBAUTHN_VERIFY_ERROR'
    });
  }
});

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

export default router;

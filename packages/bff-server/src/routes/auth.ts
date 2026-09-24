import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { encryptSession } from '../lib/session/crypto';

const router = Router();

// A temporary server-side client just for auth validation
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

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

// Replay detection tracker for Refresh Tokens (RFC 6819)
const usedRefreshTokens = new Map<string, number>();

router.post('/login', async (req, res) => {
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

export default router;

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

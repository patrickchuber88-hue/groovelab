import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { encryptSession } from '../lib/session/crypto';

const router = Router();

// A temporary server-side client just for auth validation
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
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

  // Set the single encrypted HttpOnly Cookie
  res.cookie('__Host-session', encryptedSession, COOKIE_OPTIONS);

  res.json({ user: data.user });
});

router.post('/logout', (req, res) => {
  res.clearCookie('__Host-session', COOKIE_OPTIONS);
  res.json({ message: 'Logged out successfully' });
});

export default router;

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

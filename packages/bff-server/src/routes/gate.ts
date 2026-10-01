import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';

const router = Router();

const COOKIE_NAME_PROD = '__Host-cg_site_pass';
const COOKIE_NAME_DEV = 'cg_site_pass';

// IP-based Rate Limiter against Brute-Force and Credential Stuffing
const gateRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 15, // max 15 attempts per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({ error: 'Zu viele Fehlversuche. Bitte warte einige Minuten.' });
  }
});

function getGatePassword(): string {
  return (process.env.SITE_GATE_PASSWORD || '').trim();
}

function getHmacSecret(): string {
  return (
    process.env.SITE_GATE_HMAC_SECRET ||
    process.env.SESSION_ENCRYPTION_KEY ||
    'cg_default_hmac_secret_must_be_set_in_production_env_32_bytes!'
  );
}

function isGateEnabled(): boolean {
  if (process.env.SITE_GATE_ENABLED === 'false') {
    return false;
  }
  // If no password is configured, the gate is inactive (transparent passthrough)
  return getGatePassword().length > 0;
}

function timingSafeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    // Constant-time dummy comparison to prevent timing side-channels on string length
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function verifyToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return false;

  const hmac = crypto.createHmac('sha256', getHmacSecret());
  const expectedSig = hmac.update(payloadB64).digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedSigBuf = Buffer.from(expectedSig);

  if (sigBuf.length !== expectedSigBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expectedSigBuf)) return false;

  try {
    const jsonStr = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const payload = JSON.parse(jsonStr);
    if (!payload.exp || typeof payload.exp !== 'number') return false;
    return payload.exp > Date.now();
  } catch {
    return false;
  }
}

function createToken(validityMs: number = 30 * 24 * 60 * 60 * 1000): string {
  const payload = {
    exp: Date.now() + validityMs,
    iat: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex')
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', getHmacSecret()).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

// ── 1. Nginx auth_request Subrequest Verifier (< 0.1ms) ──
router.get('/verify', (req: Request, res: Response) => {
  if (!isGateEnabled()) {
    return res.status(204).end();
  }

  const token = req.cookies?.[COOKIE_NAME_PROD] || req.cookies?.[COOKIE_NAME_DEV];
  if (!token || !verifyToken(token)) {
    return res.status(401).end();
  }

  return res.status(204).end();
});

// ── 2. Password Submission (JSON fetch or Native Form POST) ──
router.post('/login', gateRateLimiter, async (req: Request, res: Response) => {
  const isForm = req.headers['content-type']?.includes('application/x-www-form-urlencoded');
  const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';

  if (!isGateEnabled()) {
    if (isForm) return res.redirect('/');
    return res.json({ success: true, redirect: '/' });
  }

  const targetPassword = getGatePassword();
  const isValid = targetPassword.length > 0 && timingSafeCompare(password, targetPassword);

  if (!isValid) {
    // 500ms Synthetic Anti-Brute-Force Tarpit
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (isForm) {
      return res.redirect('/gate.html?error=1');
    }
    return res.status(401).json({ error: 'Ungültiger Zugangscode.' });
  }

  const token = createToken(30 * 24 * 60 * 60 * 1000); // 30 days
  const isProd = process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https';

  // Secure HttpOnly Cookie
  if (isProd) {
    res.cookie(COOKIE_NAME_PROD, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
  } else {
    res.cookie(COOKIE_NAME_DEV, token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
  }

  if (isForm) {
    return res.redirect('/');
  }
  return res.status(200).json({ success: true, redirect: '/' });
});

// ── 3. Logout (Revoke Site-Pass) ──
router.all('/logout', (_req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME_PROD, { path: '/' });
  res.clearCookie(COOKIE_NAME_DEV, { path: '/' });
  return res.redirect('/gate.html');
});

// ── 4. Status Check (Zero Secret Leakage) ──
router.get('/status', (req: Request, res: Response) => {
  const enabled = isGateEnabled();
  const token = req.cookies?.[COOKIE_NAME_PROD] || req.cookies?.[COOKIE_NAME_DEV];
  const isUnlocked = !enabled || (!!token && verifyToken(token));

  return res.json({
    enabled,
    isUnlocked
  });
});

export default router;

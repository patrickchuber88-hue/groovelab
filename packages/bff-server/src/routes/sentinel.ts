import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { DeadLetterSentinel } from '../services/deadLetterSentinel';
import { decryptSession } from '../lib/session/crypto';
import { verifySiteGateToken } from './gate';
import { validateBody } from '../middleware/validateIngress';
import { idempotencyBarrier } from '../middleware/idempotencyMiddleware';
import { sentinelIncidentSchema } from '../schemas/ingressSchemas';

const router = Router();

/**
 * 🔒 Middleware: Authenticate internal sentinel callers
 * Standard: OWASP ASVS Level 3 / Zero-Trust Perimeter
 */
function authenticateSentinelInternal(req: Request, res: Response, next: () => void) {
  const sharedSecret = process.env.SENTINEL_SHARED_SECRET || process.env.BFF_INTERNAL_SECRET;
  const authHeader = req.headers['authorization'] || req.headers['x-sentinel-key'];

  // If a shared secret is configured, require either matching Bearer token or exact header in constant time
  if (sharedSecret) {
    const bearer = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : (typeof authHeader === 'string' ? authHeader : '');

    const aBuf = Buffer.from(bearer);
    const bBuf = Buffer.from(sharedSecret);
    if (aBuf.length !== bBuf.length || !crypto.timingSafeEqual(aBuf, bBuf)) {
      return res.status(403).json({ error: 'FORBIDDEN_SENTINEL_UNAUTHORIZED' });
    }
  } else {
    // If no secret configured, restrict strictly to localhost / loopback addresses
    const ip = req.ip || req.socket.remoteAddress || '';
    const isLoopback = ip === '127.0.0.1' || ip === '::1' || ip.includes('127.0.0.1');

    if (!isLoopback && process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'FORBIDDEN_SENTINEL_LOOPBACK_REQUIRED' });
    }
  }

  next();
}

/**
 * POST /api/v1/sentinel/incident
 * Ingests a critical incident from shell scripts, cron jobs or external workers
 * Protected by: Authentication -> Zod Ingress Validation -> Idempotency Barrier
 */
router.post('/incident', authenticateSentinelInternal, validateBody(sentinelIncidentSchema), idempotencyBarrier(), async (req: Request, res: Response) => {
  try {
    const { incidentType, sourceComponent, severity, details, traceId, schoolId } = req.body;

    if (!incidentType || !sourceComponent) {
      return res.status(400).json({ error: 'MISSING_REQUIRED_FIELDS' });
    }

    const sentinel = DeadLetterSentinel.getInstance();
    const incidentId = await sentinel.reportIncident(
      incidentType,
      sourceComponent,
      severity || 'CRITICAL',
      details || {},
      traceId,
      schoolId
    );

    return res.status(201).json({
      success: true,
      incidentId,
      dispatchedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[SENTINEL ROUTE ERROR]', err);
    return res.status(500).json({ error: 'INTERNAL_SENTINEL_ERROR' });
  }
});

// [P1-4 & MIG-592 Vektor 6] Strict IP Rate Limiter & Cryptographic Session/Lease Verifier for Dead-Letter Telemetry
const DEAD_LETTER_RATE_MAP = new Map<string, { count: number; resetAt: number }>();

async function authenticateDeadLetterCaller(req: Request, res: Response, next: () => void) {
  const rawIp =
    (typeof req.headers['x-real-ip'] === 'string' && req.headers['x-real-ip'].trim()) ||
    req.ip ||
    req.socket.remoteAddress ||
    '0.0.0.0';

  const now = Date.now();
  const bucket = DEAD_LETTER_RATE_MAP.get(rawIp);
  if (!bucket || now > bucket.resetAt) {
    if (DEAD_LETTER_RATE_MAP.size >= 2000) {
      const oldest = DEAD_LETTER_RATE_MAP.keys().next().value;
      if (oldest) DEAD_LETTER_RATE_MAP.delete(oldest);
    }
    DEAD_LETTER_RATE_MAP.set(rawIp, { count: 1, resetAt: now + 5 * 60 * 1000 });
  } else {
    bucket.count += 1;
    if (bucket.count > 10) {
      return res.status(429).json({ error: 'DEAD_LETTER_RATE_LIMIT_EXCEEDED' });
    }
  }

  // 1. Constant-time internal shared secret verification
  const sharedSecret = process.env.SENTINEL_SHARED_SECRET || process.env.BFF_INTERNAL_SECRET;
  const sentinelHeader = req.headers['x-sentinel-key'];
  const hasValidSecret =
    !!sharedSecret &&
    typeof sentinelHeader === 'string' &&
    Buffer.byteLength(sentinelHeader) === Buffer.byteLength(sharedSecret) &&
    crypto.timingSafeEqual(Buffer.from(sentinelHeader), Buffer.from(sharedSecret));
  if (hasValidSecret) {
    return next();
  }

  // 2. Cryptographic JWE Session Cookie Verification (__Host-session)
  const jweCookie = req.cookies?.['__Host-session'];
  if (typeof jweCookie === 'string' && jweCookie.length > 0) {
    const decrypted = await decryptSession(jweCookie);
    if (decrypted && decrypted.accessToken) {
      return next();
    }
  }

  // 3. Cryptographic HMAC-SHA256 Site-Gate Cookie Verification (__Host-cg_site_pass / cg_site_pass)
  const gateCookie = req.cookies?.['__Host-cg_site_pass'] || req.cookies?.['cg_site_pass'];
  if (typeof gateCookie === 'string' && verifySiteGateToken(gateCookie)) {
    return next();
  }

  // 4. Authoritative Session Lease UUID Lookup in PostgreSQL (public.session_leases, is_revoked = false)
  const sessionToken =
    (typeof req.headers['x-session-token'] === 'string' && req.headers['x-session-token'].trim()) ||
    (typeof req.headers['x-client-info'] === 'string' &&
      req.headers['x-client-info'].match(/;session_token=([0-9a-fA-F-]{36})/)?.[1]);
  const hasValidLeaseFormat =
    !!sessionToken && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionToken);

  if (hasValidLeaseFormat && sessionToken) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (supabaseUrl && serviceKey) {
      try {
        const leaseClient = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false },
          global: { headers: { 'x-session-token': sessionToken } }
        });
        const { data: activeLease } = await leaseClient
          .from('session_leases')
          .select('id, user_id, is_revoked, last_active_at')
          .eq('id', sessionToken)
          .eq('is_revoked', false)
          .maybeSingle();
        if (activeLease && activeLease.id) {
          const lastActiveMs = activeLease.last_active_at ? new Date(activeLease.last_active_at).getTime() : Date.now();
          if (Number.isNaN(lastActiveMs) || Date.now() - lastActiveMs <= 30 * 24 * 60 * 60 * 1000) {
            return next();
          }
        }
      } catch {
        // Fail closed on DB lookup error
      }
    }
  }

  return res.status(401).json({ error: 'UNAUTHORIZED_DEAD_LETTER_INGESTION' });
}

/**
 * POST /api/sentinel/dead-letter
 * Authenticated & rate-limited ingestion endpoint for client-side offline sync dead-letters ([P1-4])
 */
router.post('/dead-letter', authenticateDeadLetterCaller, idempotencyBarrier(), async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const incidentType = String(body.incidentType || body.type || 'CLIENT_DEAD_LETTER')
      .replace(/[^a-zA-Z0-9_.:-]/g, '')
      .slice(0, 80);
    const sourceComponent = String(body.sourceComponent || body.component || 'pwa-client')
      .replace(/[^a-zA-Z0-9_.:-]/g, '')
      .slice(0, 80);
    const rawSeverity = String(body.severity || '').toUpperCase();
    const severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' =
      rawSeverity === 'INFO' || rawSeverity === 'ERROR' || rawSeverity === 'CRITICAL'
        ? rawSeverity
        : 'WARNING';
    const schoolId =
      typeof body.schoolId === 'string' && /^[0-9a-fA-F-]{36}$/.test(body.schoolId) ? body.schoolId : undefined;
    const traceId =
      typeof body.traceId === 'string' ? body.traceId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) : undefined;

    const sentinel = DeadLetterSentinel.getInstance();
    const incidentId = await sentinel.reportIncident(
      incidentType,
      sourceComponent,
      severity,
      typeof body.details === 'object' && body.details !== null ? body.details : {},
      traceId,
      schoolId
    );

    return res.status(201).json({
      success: true,
      incidentId,
      dispatchedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[SENTINEL DEAD-LETTER ERROR]', err);
    return res.status(500).json({ error: 'INTERNAL_SENTINEL_ERROR' });
  }
});

export default router;

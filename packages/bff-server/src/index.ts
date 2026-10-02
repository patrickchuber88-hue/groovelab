import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import storageRoutes from './routes/storage';
import gateRoutes from './routes/gate';
import { supabaseProxy, silentRefreshMiddleware } from './routes/proxy';

dotenv.config();

const app = express();
const PORT = process.env.BFF_PORT || 4000;

// Trust proxy for Coolify / Traefik / Nginx reverse proxy headers (X-Forwarded-For)
app.set('trust proxy', 1);

// CORS setup to allow the Vite SPA to communicate with credentials (cookies)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Helper to log and forward security alerts
const dispatchSecurityAlert = async (type: string, req: express.Request, details: Record<string, any>) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const alertPayload = {
    timestamp: new Date().toISOString(),
    type,
    ip,
    path: req.originalUrl,
    method: req.method,
    userAgent: req.headers['user-agent'],
    ...details
  };

  console.warn(`🚨 [SECURITY INCIDENT] ${type}:`, JSON.stringify(alertPayload));

  // Optional: Send to external Webhook (Discord / Slack / Telegram) if configured
  const webhookUrl = process.env.ADMIN_ALERT_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🚨 **[Campus-Groovelab Security Alert]**\n**Type:** \`${type}\`\n**IP:** \`${ip}\`\n**Path:** \`${req.originalUrl}\``
        })
      });
    } catch (e) {
      console.error('[Alert Webhook] Failed to dispatch webhook:', e);
    }
  }
};

// --- TIER-1 SECURITY: IP Rate Limiting (Calibrated for School-WLAN / NAT-Gateways) ---
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // 150 login attempts per 15 minutes per IP (supports entire classroom on shared NAT IP)
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    dispatchSecurityAlert('AUTH_RATE_LIMIT_EXCEEDED', req, { threshold: 150, window: '15m' });
    res.status(429).json({ error: 'Too many authentication attempts. Security cooldown active.' });
  }
});

const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1200, // 1,200 requests per minute per IP (prevents throttling during multi-user classroom sessions)
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    dispatchSecurityAlert('API_RATE_LIMIT_EXCEEDED', req, { threshold: 1200, window: '1m' });
    res.status(429).json({ error: 'Too many API requests. Rate limit exceeded.' });
  }
});

const storageRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // 120 presigned upload tickets per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    dispatchSecurityAlert('STORAGE_RATE_LIMIT_EXCEEDED', req, { threshold: 120, window: '1m' });
    res.status(429).json({ error: 'Too many storage requests. Rate limit active.' });
  }
});

// --- TIER-1 SECURITY: In-Memory Multi-Tenant Token-Bucket (Noisy-Neighbor Immunity) ---
interface TenantTokenBucket {
  tokens: number;
  lastRefill: number;
}
const tenantBuckets = new Map<string, TenantTokenBucket>();
const MAX_TENANT_TOKENS = 2400; // 2.400 Anfragen / Minute pro Schule
const REFILL_RATE_PER_MS = MAX_TENANT_TOKENS / (60 * 1000); // 0.04 tokens/ms

export const tenantRateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const schoolId = (req.headers['x-school-id'] as string) || (req.query.school_id as string);
  if (!schoolId) return next();

  const now = Date.now();
  let bucket = tenantBuckets.get(schoolId);
  if (!bucket) {
    bucket = { tokens: MAX_TENANT_TOKENS, lastRefill: now };
    tenantBuckets.set(schoolId, bucket);
  } else {
    const elapsed = now - bucket.lastRefill;
    bucket.tokens = Math.min(MAX_TENANT_TOKENS, bucket.tokens + elapsed * REFILL_RATE_PER_MS);
    bucket.lastRefill = now;
  }

  if (bucket.tokens < 1) {
    dispatchSecurityAlert('TENANT_RATE_LIMIT_EXCEEDED', req, { schoolId, threshold: MAX_TENANT_TOKENS });
    return res.status(429).json({ error: 'TENANT_RATE_LIMIT_EXCEEDED', message: 'Schul-Kontingent vorübergehend erschöpft.' });
  }

  bucket.tokens -= 1;
  next();
};

// --- TIER-1 SECURITY: Advanced Origin-Guard & Anti-CSRF ---
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const secFetchSite = req.headers['sec-fetch-site'];
    
    // 1. Sec-Fetch-Site Block
    if (secFetchSite === 'cross-site' || secFetchSite === 'cross-origin') {
      dispatchSecurityAlert('CSRF_INVALID_FETCH_SITE', req, { secFetchSite });
      return res.status(403).json({ error: 'CSRF blocked: Invalid fetch site' });
    }

    // 2. Referer Fallback
    const originHeader = req.headers.origin;
    const refererHeader = req.headers.referer;
    
    let requestOrigin = originHeader;
    if (!requestOrigin && refererHeader) {
      try {
        requestOrigin = new URL(refererHeader).origin;
      } catch (e) {
        requestOrigin = undefined;
      }
    }

    // 3. Strict Fail-Closed Origin Verification (Supporting Multi-Tenant Subdomains)
    const configuredOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
    const trustedOrigins = new Set([
      configuredOrigin,
      'https://campus-groovelab.de',
      'https://www.campus-groovelab.de',
      'http://localhost:5173',
      'http://localhost:4000',
    ]);

    const isAllowedOrigin = (origin: string | undefined): boolean => {
      if (!origin) return false;
      if (trustedOrigins.has(origin)) return true;
      try {
        const parsed = new URL(origin);
        // Authoritative verification for all multi-tenant school subdomains (*.campus-groovelab.de)
        if (
          parsed.protocol === 'https:' &&
          (parsed.hostname === 'campus-groovelab.de' || parsed.hostname.endsWith('.campus-groovelab.de'))
        ) {
          return true;
        }
      } catch {
        return false;
      }
      return false;
    };

    // 3a. Pre-Auth Site Gate Exception (Allows initial gate unlocks & native form fallbacks)
    const isGateRoute = req.originalUrl.includes('/gate') || req.path.includes('/gate');
    if (isGateRoute) {
      // If an explicit origin is present, ensure it is not malicious/untrusted
      if (requestOrigin && !isAllowedOrigin(requestOrigin)) {
        dispatchSecurityAlert('CSRF_GATE_UNTRUSTED_ORIGIN', req, { requestOrigin });
        return res.status(403).json({ error: 'CSRF blocked: Untrusted gate origin' });
      }
      // If request is from browser navigation / same-site form POST without Origin, allow gate check
      // Gate route is strictly protected by IP-rate limiter & timingSafeEqual password comparison
    } else {
      // Standard API & DB endpoints require strict Origin match
      if (!requestOrigin || !isAllowedOrigin(requestOrigin)) {
        dispatchSecurityAlert('CSRF_ORIGIN_MISMATCH', req, { requestOrigin, configuredOrigin });
        return res.status(403).json({ error: 'CSRF blocked: Untrusted or missing origin' });
      }
    }

    // 4. Host Mismatch Prevention (Host Header Poisoning Defense)
    const hostHeader = req.headers.host;
    if (hostHeader && requestOrigin) {
      try {
        const originHost = new URL(requestOrigin).host;
        const isDomainFamily =
          (originHost === 'campus-groovelab.de' || originHost.endsWith('.campus-groovelab.de')) &&
          (hostHeader === 'campus-groovelab.de' || hostHeader.endsWith('.campus-groovelab.de'));

        if (originHost !== hostHeader && !isDomainFamily) {
          dispatchSecurityAlert('HOST_HEADER_MISMATCH', req, { originHost, hostHeader });
          return res.status(403).json({ error: 'CSRF blocked: Host mismatch' });
        }
      } catch (e) {
        // Parse error
      }
    }
  }
  
  // 5. Inject Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
});

app.use(cookieParser());

// 0. Site-Gate Ingress Routes (Password Protection & Ingress Subrequest Verification)
app.use(
  ['/gate', '/api/gate', '/api/bff/gate'],
  express.json({ limit: '64kb' }),
  express.urlencoded({ extended: true }),
  gateRoutes
);

// 1. Auth Routes with Strict Rate Limiting & 1MB Body Limit
app.use('/api/auth', authRateLimiter, tenantRateLimiter, express.json({ limit: '1mb' }), authRoutes);

// 2. Supabase PostgREST Proxy with API Rate Limiting & Silent Refresh
app.use('/api/db', apiRateLimiter, tenantRateLimiter, silentRefreshMiddleware, supabaseProxy);

// 3. Zero-Memory Direct-to-Storage Presign Routes (Audio & Asset Ingestion)
app.use('/api/storage', storageRateLimiter, tenantRateLimiter, express.json({ limit: '1mb' }), storageRoutes);

app.listen(PORT, () => {
  console.log(`🛡️ BFF Server running on http://localhost:${PORT}`);
  console.log(`🔒 Banking Goldstandard Active: Rate-Limiting, JWE A256GCM, Anti-CSRF & Alert-Telemetry Enabled.`);
});

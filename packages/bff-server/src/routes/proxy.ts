import { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { decryptSession, encryptSession, TokenSession } from '../lib/session/crypto';
import { UpstreamCircuitBreaker } from '../services/upstreamCircuitBreaker';

import { TokenRefreshCoordinator, RefreshOutcome } from '../services/tokenRefreshCoordinator';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://supabase-kong:8000';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * 🛡️ CIRCUIT BREAKER INGRESS BARRIER (OWASP ASVS LEVEL 3 & SRE STANDARD)
 *
 * Fast-fails in < 0.1ms with HTTP 503 and Retry-After if upstream Kong/PostgREST is unhealthy.
 * Prevents socket exhaustion, thread pool starvation, and thundering herd cascades.
 */
export const circuitBreakerMiddleware = (req: Request, res: Response, next: NextFunction): void | Response => {
  const cb = UpstreamCircuitBreaker.getInstance();
  if (cb.isOpen()) {
    const retryAfter = Math.ceil(cb.getRemainingCooldownMs() / 1000) || 3;
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(503).json({
      error: 'UPSTREAM_GATEWAY_CIRCUIT_OPEN',
      message: 'Der Datenbankdienst regeneriert sich nach kurzzeitigen Ausfällen. Bitte in Kürze erneut versuchen.',
      retryAfter
    });
  }
  next();
};

export const silentRefreshMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // 🛡️ Strip any client-supplied internal header to prevent token spoofing
  delete req.headers['x-bff-access-token'];

  const sessionCookie = req.cookies['__Host-session'];

  if (!sessionCookie) {
    return next();
  }

  const session = await decryptSession(sessionCookie);
  if (!session) {
    res.clearCookie('__Host-session');
    return next();
  }

  const now = Date.now();
  const timeToExpiry = session.expiresAt - now;

  // If token expires in less than 60 seconds
  if (timeToExpiry < 60000) {
    const coordinator = TokenRefreshCoordinator.getInstance();
    const outcome = await coordinator.coordinate(session.refreshToken, async (): Promise<RefreshOutcome> => {
      try {
        const authUrl = `${supabaseUrl}/auth/v1/token?grant_type=refresh_token`;

        const refreshRes = await fetch(authUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey
          },
          body: JSON.stringify({ refresh_token: session.refreshToken })
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          
          const updatedSession: TokenSession = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token || session.refreshToken,
            expiresAt: Date.now() + (data.expires_in * 1000),
          };

          const encrypted = await encryptSession(updatedSession);

          return {
            status: 'SUCCESS',
            data: {
              accessToken: updatedSession.accessToken,
              refreshToken: updatedSession.refreshToken,
              expiresAt: updatedSession.expiresAt,
              encryptedCookie: encrypted
            }
          };
        }

        // Authoritative revocation by auth server (e.g. user deleted or password changed)
        if (refreshRes.status === 400 || refreshRes.status === 401) {
          const errData = await refreshRes.json().catch(() => ({}));
          console.warn('[Silent Refresh JWE] Refresh token rejected by auth server:', errData);
          return { status: 'REVOKED', error: errData.error_description || 'INVALID_GRANT' };
        }

        // Upstream temporary glitch (5xx)
        console.warn(`[Silent Refresh JWE] Upstream auth returned HTTP ${refreshRes.status}. Retaining session for retry.`);
        return { status: 'UPSTREAM_ERROR', error: `HTTP_${refreshRes.status}` };
      } catch (e: any) {
        console.error('[Silent Refresh JWE] Network error during refresh:', e?.message || e);
        return { status: 'UPSTREAM_ERROR', error: e?.message || 'NETWORK_ERROR' };
      }
    });

    if (outcome.status === 'SUCCESS' && outcome.data) {
      const cookieOpts = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path: '/'
      };
      res.cookie('__Host-session', outcome.data.encryptedCookie, cookieOpts);
      req.headers['x-bff-access-token'] = outcome.data.accessToken;
      if (outcome.data.isReusedFlight) {
        console.log('[Silent Refresh JWE] Attached to concurrent in-flight refresh (Single-Flight deduplicated).');
      } else {
        console.log('[Silent Refresh JWE] Successfully refreshed and encrypted new tokens.');
      }
    } else if (outcome.status === 'REVOKED') {
      res.clearCookie('__Host-session');
      console.error('[Silent Refresh JWE] Session revoked. Cleared session cookie.');
    } else {
      // UPSTREAM_ERROR: If the current token is not completely expired, allow graceful passthrough
      if (timeToExpiry > 0) {
        req.headers['x-bff-access-token'] = session.accessToken;
      }
    }
  } else {
    // Session is valid, just pass the access token to the proxy
    req.headers['x-bff-access-token'] = session.accessToken;
  }

  next();
};

const proxyOptions: Options = {
  target: supabaseUrl,
  changeOrigin: true,
  timeout: 10000,      // 10s incoming socket timeout
  proxyTimeout: 10000, // 10s upstream Kong timeout
  pathRewrite: {
    '^/api/db': '/rest/v1',
  },
  onProxyReq: (proxyReq, req: any) => {
    proxyReq.setHeader('apikey', supabaseAnonKey);
    // The middleware attached the access token here
    const token = req.headers['x-bff-access-token'];
    if (token) {
      proxyReq.setHeader('Authorization', `Bearer ${token}`);
    }
  },
  onProxyRes: (proxyRes: any, req: any, res: any) => {
    // Upstream responded: evaluate health for circuit breaker
    if (proxyRes.statusCode < 500) {
      UpstreamCircuitBreaker.getInstance().recordSuccess();
    } else {
      UpstreamCircuitBreaker.getInstance().recordFailure(new Error(`Upstream returned HTTP ${proxyRes.statusCode}`));
    }

    // 🔒 Zero-Information-Leakage: Strip internal reverse proxy & server metadata (OWASP ASVS L3 V14.4)
    delete proxyRes.headers['server'];
    delete proxyRes.headers['x-powered-by'];
    delete proxyRes.headers['x-kong-upstream-latency'];
    delete proxyRes.headers['x-kong-proxy-latency'];
    delete proxyRes.headers['via'];
  },
  onError: (err: any, req: any, res: any) => {
    UpstreamCircuitBreaker.getInstance().recordFailure(err);
    console.error('[Supabase Proxy] Upstream communication failure:', err?.message || err);

    if (res.headersSent) {
      return;
    }

    const isTimeout = err?.code === 'ETIMEDOUT' || err?.code === 'ECONNRESET' || String(err).includes('timeout');
    const statusCode = isTimeout ? 504 : 503;
    const errorCode = isTimeout ? 'UPSTREAM_GATEWAY_TIMEOUT' : 'UPSTREAM_SERVICE_UNAVAILABLE';

    res.setHeader('Retry-After', '3');
    res.status(statusCode).json({
      error: errorCode,
      message: 'Der Datenbankdienst konnte nicht rechtzeitig erreicht werden. Bitte in Kürze erneut versuchen.',
      code: err?.code || 'GATEWAY_ERROR'
    });
  }
};

export const supabaseProxy = createProxyMiddleware(proxyOptions);

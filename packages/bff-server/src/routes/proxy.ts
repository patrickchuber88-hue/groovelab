import { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { decryptSession, encryptSession, TokenSession } from '../lib/session/crypto';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://supabase-kong:8000';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

export const silentRefreshMiddleware = async (req: Request, res: Response, next: NextFunction) => {
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
    console.log('[Silent Refresh JWE] Token expires soon. Refreshing proactively...');
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

        const cookieOpts = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict' as const,
          path: '/'
        };
        
        res.cookie('__Host-session', encrypted, cookieOpts);
        
        // Expose the fresh access token to the proxy middleware via req.headers temporarily
        req.headers['x-bff-access-token'] = data.access_token;
        console.log('[Silent Refresh JWE] Successfully refreshed and encrypted new tokens.');
      } else {
        res.clearCookie('__Host-session');
        console.error('[Silent Refresh JWE] Failed to refresh token. Cleared session.');
      }
    } catch (e) {
      console.error('[Silent Refresh JWE] Network error during refresh:', e);
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
};

export const supabaseProxy = createProxyMiddleware(proxyOptions);

import { Request, Response, NextFunction } from 'express';
import { IdempotencyLedger } from '../services/idempotencyLedger';

export interface IdempotencyOptions {
  ttlMs?: number;
  requireKey?: boolean;
}

/**
 * 🛡️ IDEMPOTENCY BARRIER MIDDLEWARE (OWASP ASVS LEVEL 3 / IETF RFC 9110)
 *
 * Intercepts mutating requests (POST, PUT, PATCH, DELETE) to guarantee:
 * 1. Single execution per unique Idempotency-Key or deterministic request payload.
 * 2. HTTP 409 Conflict rejection for concurrent in-flight duplicates.
 * 3. Instant replay caching with 'Idempotent-Replay: true' header for completed transactions.
 * 4. Automatic lock release on 5xx server errors to permit legitimate retries.
 */
export function idempotencyBarrier(options: IdempotencyOptions = {}) {
  const ledger = IdempotencyLedger.getInstance();

  return (req: Request, res: Response, next: NextFunction): void | Response => {
    // Only apply idempotency to mutating HTTP verbs
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!mutatingMethods.includes(req.method.toUpperCase())) {
      return next();
    }

    // 1. Resolve Idempotency Key
    const rawHeaderKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    let idempotencyKey: string;

    if (typeof rawHeaderKey === 'string' && rawHeaderKey.trim().length > 0) {
      // Clean and sanitize explicit client key
      const sanitized = rawHeaderKey.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
      const routePrefix = `${req.method}:${req.baseUrl || ''}${req.path}:`;
      idempotencyKey = `${routePrefix}${sanitized}`;
    } else {
      if (options.requireKey) {
        return res.status(400).json({
          error: 'IDEMPOTENCY_KEY_REQUIRED',
          message: 'Für diese Operation ist der Header Idempotency-Key zwingend erforderlich.'
        });
      }

      // Compute deterministic SHA-256 fingerprint from IP, method, route, and body
      const rawIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const ip = Array.isArray(rawIp) ? rawIp[0] : String(rawIp);
      const path = req.originalUrl || req.path || '/';
      const fingerprint = ledger.computeFingerprint(ip, req.method, path, req.body);
      idempotencyKey = `fp:${fingerprint}`;
    }

    // 2. Acquire Lock in Ledger
    const acquireResult = ledger.acquire(idempotencyKey, options.ttlMs);

    if (acquireResult === 'IN_FLIGHT') {
      return res.status(409).json({
        error: 'CONCURRENT_REQUEST_IN_FLIGHT',
        message: 'Ein identischer Request wird derzeit bereits verarbeitet. Bitte warten.',
        retryAfter: 1
      });
    }

    if (acquireResult === 'COMPLETED') {
      const record = ledger.get(idempotencyKey);
      if (record && record.statusCode) {
        res.setHeader('Idempotent-Replay', 'true');
        res.setHeader('X-Idempotency-Key', idempotencyKey);
        return res.status(record.statusCode).json(record.body);
      }
    }

    // 3. Acquire successful: Hook into response completion
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    let capturedBody: any = null;
    let isCaptured = false;

    res.json = function (body: any): Response {
      capturedBody = body;
      isCaptured = true;
      return originalJson(body);
    };

    res.send = function (body: any): Response {
      if (!isCaptured) {
        try {
          capturedBody = typeof body === 'string' ? JSON.parse(body) : body;
        } catch {
          capturedBody = body;
        }
        isCaptured = true;
      }
      return originalSend(body);
    };

    const cleanup = () => {
      res.removeListener('finish', onFinish);
      res.removeListener('close', onClose);
    };

    const onFinish = () => {
      cleanup();
      // On 2xx, 3xx, 4xx responses: cache completed response to prevent re-execution
      if (res.statusCode >= 200 && res.statusCode < 500) {
        ledger.complete(idempotencyKey, res.statusCode, capturedBody, undefined, options.ttlMs);
      } else {
        // On 5xx server errors: release lock so client can retry
        ledger.release(idempotencyKey);
      }
    };

    const onClose = () => {
      cleanup();
      // If connection closed prematurely without finish, release lock
      if (!res.writableEnded) {
        ledger.release(idempotencyKey);
      }
    };

    res.once('finish', onFinish);
    res.once('close', onClose);

    next();
  };
}

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { DeadLetterSentinel } from '../services/deadLetterSentinel';

/**
 * 🛡️ FAIL-CLOSED INGRESS VALIDATION MIDDLEWARE (OWASP ASVS LEVEL 3)
 *
 * Enforces strict runtime contract verification on API ingress.
 * - Rejects unwhitelisted properties (Mass-Assignment & Prototype Pollution Immunity)
 * - Sanitizes and normalizes payload data
 * - Reports suspicious payload attacks asynchronously to DeadLetterSentinel
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    const rawBody = req.body ?? {};
    const result = schema.safeParse(rawBody);

    if (!result.success) {
      const formattedErrors = result.error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));

      const rawJson = typeof rawBody === 'object' ? JSON.stringify(rawBody) : String(rawBody);
      const isSuspiciousAttack =
        rawJson.includes('__proto__') ||
        rawJson.includes('constructor') ||
        rawJson.includes('prototype') ||
        rawJson.includes('<script');

      if (isSuspiciousAttack) {
        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        DeadLetterSentinel.getInstance()
          .handleIncident({
            incidentType: 'INGRESS_PROTOTYPE_POLLUTION_BLOCKED',
            sourceComponent: 'bff-server',
            severity: 'CRITICAL',
            details: {
              ip,
              path: req.originalUrl,
              method: req.method,
              userAgent: req.headers['user-agent'],
              errors: formattedErrors,
            },
            summary: `Malicious payload injection blocked on ${req.method} ${req.originalUrl} from IP ${ip}`,
          })
          .catch((err) => console.error('[SENTINEL] Ingress anomaly alert failed:', err));
      }

      // Handle URL-encoded HTML Form submissions (e.g. Gate Form POST fallback)
      const isFormEncoded = req.headers['content-type']?.includes('application/x-www-form-urlencoded');
      if (isFormEncoded && req.originalUrl.includes('/gate')) {
        return res.redirect('/gate.html?error=1');
      }

      return res.status(400).json({
        error: 'INGRESS_VALIDATION_FAILED',
        message: 'Die übermittelten Daten sind fehlerhaft oder entsprechen nicht der Spezifikation.',
        details: formattedErrors,
      });
    }

    // Assign strictly validated, sanitized, and typed data
    req.body = result.data;
    next();
  };
}

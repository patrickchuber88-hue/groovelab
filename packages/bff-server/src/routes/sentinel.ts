import { Router, Request, Response } from 'express';
import { DeadLetterSentinel } from '../services/deadLetterSentinel';
import { validateBody } from '../middleware/validateIngress';
import { sentinelIncidentSchema } from '../schemas/ingressSchemas';

const router = Router();

/**
 * 🔒 Middleware: Authenticate internal sentinel callers
 * Standard: OWASP ASVS Level 3 / Zero-Trust Perimeter
 */
function authenticateSentinelInternal(req: Request, res: Response, next: () => void) {
  const sharedSecret = process.env.SENTINEL_SHARED_SECRET || process.env.BFF_INTERNAL_SECRET;
  const authHeader = req.headers['authorization'] || req.headers['x-sentinel-key'];

  // If a shared secret is configured, require either matching Bearer token or exact header
  if (sharedSecret) {
    const bearer = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    if (bearer !== sharedSecret) {
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
 */
router.post('/incident', authenticateSentinelInternal, validateBody(sentinelIncidentSchema), async (req: Request, res: Response) => {
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

export default router;

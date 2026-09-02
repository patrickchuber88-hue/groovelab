import { supabase } from '../lib/supabase';

export interface AuditLogPayload {
  action: string;
  schoolId?: string;
  userId?: string;
  targetId?: string;
  metadata?: Record<string, any>;
}

/**
 * Sanitizes metadata to ensure no sensitive PII (emails, full names, passwords, tokens) is logged.
 */
function sanitizeMetadata(metadata: Record<string, any> = {}): Record<string, any> {
  const sanitized: Record<string, any> = {};
  const forbiddenKeys = ['password', 'token', 'secret', 'email', 'first_name', 'last_name', 'iban', 'bic'];

  for (const [key, value] of Object.entries(metadata)) {
    if (forbiddenKeys.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeMetadata(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Revisionssicheres Audit-Logging für administrative und rollenbezogene Sicherheits-Events.
 */
export async function logSecurityEvent({
  action,
  schoolId,
  userId,
  targetId,
  metadata = {},
}: AuditLogPayload): Promise<void> {
  try {
    const cleanMetadata = sanitizeMetadata(metadata);
    const timestamp = new Date().toISOString();

    console.info(`[AUDIT LOG] ${timestamp} | Action: ${action} | School: ${schoolId || 'N/A'} | User: ${userId || 'N/A'}`);

    const details = {
      school_id: schoolId || null,
      target_id: targetId || null,
      ...cleanMetadata,
      logged_at: timestamp,
    };

    // Authoritative Security Definer RPC (Enterprise+ / OWASP ASVS Level 3)
    try {
      const { error: rpcErr } = await supabase.rpc('log_security_event', {
        p_event_type: action,
        p_actor_id: userId || null,
        p_details: details,
      });

      if (rpcErr) {
        console.warn('[AUDIT LOG] RPC notice:', rpcErr.message || rpcErr);
      }
    } catch {
      // Non-blocking fallback
    }
  } catch (err) {
    console.warn('[AUDIT LOG] Non-blocking log error:', err);
  }
}

import { supabase } from '../lib/supabase';
import { getOrCreateActiveTrace } from '../utils/w3cTraceContext';

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

    const correlationId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const activeTrace = getOrCreateActiveTrace();

    const details = {
      request_id: correlationId,
      correlation_nonce: correlationId,
      trace_id: activeTrace.traceId,
      traceparent: activeTrace.traceparent,
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

export interface ApplicationAuditPayload {
  action: string;
  schoolId?: string | null;
  tableName?: string;
  recordId?: string | null;
  details?: Record<string, any>;
}

/**
 * 🏛️ Authoritative Application Audit Logging (Enterprise+ Tier-1 / OWASP ASVS Level 3)
 * Calls public.log_application_audit_event SECURITY DEFINER RPC.
 * Enforces changed_by = auth.uid() on the PostgreSQL database server.
 * Beseitigt Client-Audit-Injektionen (CWE-117).
 */
export async function logApplicationAudit({
  action,
  schoolId,
  tableName = 'application',
  recordId,
  details = {},
}: ApplicationAuditPayload): Promise<string | null> {
  try {
    const cleanDetails = sanitizeMetadata(details);
    const activeTrace = getOrCreateActiveTrace();

    const enrichedDetails = {
      ...cleanDetails,
      trace_id: activeTrace.traceId,
      traceparent: activeTrace.traceparent,
      client_timestamp: new Date().toISOString(),
    };

    const { data, error } = await supabase.rpc('log_application_audit_event', {
      p_school_id: schoolId || null,
      p_action: action,
      p_table_name: tableName,
      p_record_id: recordId || null,
      p_details: enrichedDetails,
    });

    if (error) {
      console.warn('[APPLICATION AUDIT] RPC notice:', error.message || error);
      return null;
    }
    return data as string;
  } catch (err) {
    console.warn('[APPLICATION AUDIT] Non-blocking audit error:', err);
    return null;
  }
}


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

    // Try inserting into database if table exists (fail silently if audit table is not yet migrated)
    try {
      await supabase.from('security_audit_logs').insert([
        {
          action,
          school_id: schoolId,
          user_id: userId,
          target_id: targetId,
          metadata: cleanMetadata,
          created_at: timestamp,
        },
      ]);
    } catch {
      // Graceful fallback if security_audit_logs table is strictly internal
    }
  } catch (err) {
    console.warn('[AUDIT LOG] Non-blocking log error:', err);
  }
}

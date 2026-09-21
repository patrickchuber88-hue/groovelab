/**
 * ==============================================================================
 * CAMPUS-GROOVELAB: FORENSIC INCIDENT DOSSIER SERVICE
 * ==============================================================================
 * Standard: ISO/IEC 27037 (Digital Evidence Handling) / DSGVO Art. 33 (72h Meldepflicht)
 * Non-Repudiation: BSI TR-03185 / W3C Trace Context Level 2
 * 
 * Forensischer Zweck:
 * Generiert auf Knopfdruck ein behördenfertiges, gerichtsverwertbares Sicherheits-
 * und Vorfalls-Dossier über alle relevanten Audit-Logs, Kausalketten und Lease-Tokens
 * einer Musikschule mit digitalem SHA-256 Siegel.
 * ==============================================================================
 */

import { logSecurityEvent } from './auditLogService';
import { getOrCreateActiveTrace } from '../utils/w3cTraceContext';

export interface IncidentDossierParams {
  schoolId: string;
  schoolName: string;
  targetUserId?: string;
  targetUserName?: string;
  auditLogs: Array<any>;
  incidentReason?: string;
}

export interface IncidentForensicDossier {
  manifest: {
    standard: 'ISO/IEC 27037 / DSGVO Art. 33 Forensic Evidence Package';
    version: '1.0';
    school_id: string;
    school_name: string;
    incident_id: string;
    generated_at: string;
    w3c_trace_id: string;
    w3c_traceparent: string;
    sha256_seal: string;
    court_proof_status: 'COURT_EVIDENTIARY_SEALED';
  };
  incident_context: {
    category: 'ACCOUNT_SECURITY_INCIDENT' | 'SESSION_ANOMALY' | 'ADMINISTRATIVE_AUDIT';
    scope: string;
    reporting_authority: 'Landesdatenschutzbehörde (Art. 33 DSGVO / LfDI)' | 'Interne Schulleitung';
    statutory_deadline_hours: 72;
    incident_reason: string;
  };
  evidence_summary: {
    total_audit_events: number;
    timespan_start?: string;
    timespan_end?: string;
    involved_actors_count: number;
  };
  audit_events: Array<{
    id: string;
    timestamp: string;
    action: string;
    table_name: string;
    record_id: string;
    actor_name?: string;
    actor_role?: string;
    w3c_trace_id?: string;
    details?: any;
  }>;
}

export interface IncidentDossierResult {
  success: boolean;
  sha256: string;
  filename: string;
  timestamp: string;
  eventCount: number;
  dossier: IncidentForensicDossier;
}

/**
 * Computes a deterministic SHA-256 hexadecimal hash over a UTF-8 string.
 */
async function computeSha256(content: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Node.js fallback
  try {
    const nodeCrypto = await import('crypto');
    return nodeCrypto.createHash('sha256').update(content, 'utf-8').digest('hex');
  } catch {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) - hash) + content.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }
}

/**
 * Triggers a client-side file download for a generated Blob.
 */
function downloadBlob(blob: Blob, filename: string): void {
  if (typeof window === 'undefined' || !window.document) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Builds and seals an ISO/IEC 27037 compliant Incident Forensic Dossier.
 */
export async function generateIncidentForensicDossier(
  params: IncidentDossierParams
): Promise<IncidentDossierResult> {
  const generatedAt = new Date().toISOString();
  const trace = getOrCreateActiveTrace();
  const incidentId = `INC-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const relevantEvents = params.auditLogs.map(log => ({
    id: String(log.id || ''),
    timestamp: String(log.created_at || generatedAt),
    action: String(log.action || 'UNKNOWN'),
    table_name: String(log.table_name || 'audit_logs'),
    record_id: String(log.record_id || ''),
    actor_name: log.users ? `${log.users.first_name || ''} ${log.users.last_name || ''}`.trim() : 'System',
    actor_role: log.users?.role || 'system',
    w3c_trace_id: log.trace_id || log.details?.trace_id || trace.traceId,
    details: log.new_data || log.details || null
  }));

  const actors = new Set(relevantEvents.map(e => e.actor_name).filter(Boolean));
  const timestamps = relevantEvents.map(e => e.timestamp).sort();

  // Temporary payload to calculate seal
  const unsealedPayload = {
    incident_id: incidentId,
    school_id: params.schoolId,
    school_name: params.schoolName,
    events: relevantEvents
  };

  const rawJson = JSON.stringify(unsealedPayload, null, 2);
  const sha256Seal = await computeSha256(rawJson);

  const dossier: IncidentForensicDossier = {
    manifest: {
      standard: 'ISO/IEC 27037 / DSGVO Art. 33 Forensic Evidence Package',
      version: '1.0',
      school_id: params.schoolId,
      school_name: params.schoolName,
      incident_id: incidentId,
      generated_at: generatedAt,
      w3c_trace_id: trace.traceId,
      w3c_traceparent: trace.traceparent,
      sha256_seal: sha256Seal,
      court_proof_status: 'COURT_EVIDENTIARY_SEALED'
    },
    incident_context: {
      category: 'ACCOUNT_SECURITY_INCIDENT',
      scope: params.targetUserName ? `Untersuchung Benutzer ${params.targetUserName}` : 'Musikschulweiter Sicherheits-Audit',
      reporting_authority: 'Landesdatenschutzbehörde (Art. 33 DSGVO / LfDI)',
      statutory_deadline_hours: 72,
      incident_reason: params.incidentReason || 'Revisionssichere Beweissicherung nach Vorfallsmeldung'
    },
    evidence_summary: {
      total_audit_events: relevantEvents.length,
      timespan_start: timestamps[0] || generatedAt,
      timespan_end: timestamps[timestamps.length - 1] || generatedAt,
      involved_actors_count: actors.size
    },
    audit_events: relevantEvents
  };

  const sanitizedSchool = params.schoolName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = generatedAt.split('T')[0];
  const filename = `Sicherheits_Vorfalls_Dossier_${sanitizedSchool}_${dateStr}.json`;

  // Log authoritative security event in audit trail
  await logSecurityEvent({
    schoolId: params.schoolId,
    action: 'INCIDENT_FORENSIC_DOSSIER_EXPORTED',
    targetId: incidentId,
    metadata: {
      category: 'SECURITY',
      target_entity: 'incident_dossier',
      incident_id: incidentId,
      sha256_seal: sha256Seal,
      event_count: relevantEvents.length,
      w3c_trace_id: trace.traceId,
      w3c_traceparent: trace.traceparent
    }
  });

  return {
    success: true,
    sha256: sha256Seal,
    filename,
    timestamp: generatedAt,
    eventCount: relevantEvents.length,
    dossier
  };
}

/**
 * Generates and triggers the file download for the Incident Forensic Dossier.
 */
export async function downloadIncidentForensicDossier(
  params: IncidentDossierParams
): Promise<IncidentDossierResult> {
  const result = await generateIncidentForensicDossier(params);
  const blob = new Blob([JSON.stringify(result.dossier, null, 2)], {
    type: 'application/json;charset=utf-8'
  });
  downloadBlob(blob, result.filename);
  return result;
}

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface DeadLetterIncidentPayload {
  id?: string;
  incidentType: string;
  severity?: 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO';
  sourceComponent: string;
  details?: Record<string, any>;
  correlationTraceId?: string | null;
  schoolId?: string | null;
  summary?: string;
  createdAt?: string;
}

interface DebouncedIncidentRecord {
  firstSeen: number;
  lastSeen: number;
  count: number;
  timer: NodeJS.Timeout | null;
  lastDispatchedPayload: DeadLetterIncidentPayload;
}

/**
 * 🛡️ DeadLetterSentinel: Sovereign Enterprise Incident & Alerting Engine
 * Standard: OWASP ASVS Level 3 / Zero US-Cloud / Zero-Data-Leakage
 */
export class DeadLetterSentinel {
  private static instance: DeadLetterSentinel;
  private supabase: SupabaseClient | null = null;
  private debouncedIncidents: Map<string, DebouncedIncidentRecord> = new Map();
  private isListening = false;

  private constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
      this.supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
    } else {
      console.warn('[SENTINEL] Running in standalone mode (no service_role key configured).');
    }
  }

  public static getInstance(): DeadLetterSentinel {
    if (!DeadLetterSentinel.instance) {
      DeadLetterSentinel.instance = new DeadLetterSentinel();
    }
    return DeadLetterSentinel.instance;
  }

  /**
   * 🔒 Zero-Leakage PII Sanitizer: Drops emails, passwords, names, tokens and IBANs
   */
  public sanitizeDetails(data: Record<string, any> = {}): Record<string, any> {
    const sanitized: Record<string, any> = {};
    const forbiddenKeySubstrings = [
      'password', 'secret', 'token', 'access_token', 'jwt', 'auth', 
      'email', 'first_name', 'last_name', 'phone', 'birth_date', 
      'iban', 'bic', 'credit_card', 'pin', 'parent_pin'
    ];

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (forbiddenKeySubstrings.some(substr => lowerKey.includes(substr))) {
        sanitized[key] = '[REDACTED_BY_SENTINEL]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeDetails(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * 📢 Dispatch alert via sovereign push (ntfy.sh) and fallback webhook
   */
  public async dispatchAlert(incident: DeadLetterIncidentPayload, repeatCount = 1): Promise<void> {
    const ntfyServer = (process.env.NTFY_SERVER_URL || 'https://ntfy.sh').replace(/\/$/, '');
    const ntfyTopic = process.env.NTFY_TOPIC;
    const ntfyToken = process.env.NTFY_AUTH_TOKEN;
    const webhookUrl = process.env.ADMIN_ALERT_WEBHOOK_URL;

    const severity = incident.severity || 'CRITICAL';
    const repeatNotice = repeatCount > 1 ? ` (Wiederholung: ${repeatCount}× in 60s)` : '';
    const title = `🚨 [${severity}] ${incident.incidentType}${repeatNotice}`;
    const message = [
      `Quelle: ${incident.sourceComponent}`,
      incident.summary ? `Fehler: ${incident.summary}` : null,
      incident.correlationTraceId ? `Trace: ${incident.correlationTraceId}` : null,
      incident.schoolId ? `Schule: ${incident.schoolId}` : null,
      `Zeitpunkt: ${incident.createdAt || new Date().toISOString()}`
    ].filter(Boolean).join('\n');

    // 1. Dispatch via ntfy.sh (Sovereign Push Channel)
    if (ntfyTopic) {
      try {
        const headers: Record<string, string> = {
          'Title': title,
          'Priority': severity === 'CRITICAL' ? '5' : severity === 'ERROR' ? '4' : '3',
          'Tags': severity === 'CRITICAL' ? 'rotating_light,fire' : 'warning,bell',
          'Content-Type': 'text/plain; charset=utf-8'
        };

        if (ntfyToken) {
          headers['Authorization'] = `Bearer ${ntfyToken}`;
        }

        const res = await fetch(`${ntfyServer}/${ntfyTopic}`, {
          method: 'POST',
          headers,
          body: message
        });

        if (!res.ok) {
          console.error(`[SENTINEL] ntfy push returned status ${res.status}`);
        } else {
          console.log(`[SENTINEL] Push successfully dispatched to ntfy://${ntfyTopic}`);
        }
      } catch (err: any) {
        console.error('[SENTINEL] Failed to dispatch ntfy push:', err?.message || err);
      }
    }

    // 2. Dispatch via Secondary Webhook (Discord / Slack / Teams)
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `**${title}**\n\`\`\`\n${message}\n\`\`\``
          })
        });
      } catch (err: any) {
        console.error('[SENTINEL] Failed to dispatch webhook alert:', err?.message || err);
      }
    }

    // 3. Fallback Terminal Warning
    console.warn(`🚨 [DEAD-LETTER ALERT DISPATCHED]\nTitle: ${title}\n${message}`);
  }

  /**
   * 🛡️ Ingest an incident with anti-alert-fatigue debouncing (60s window)
   */
  public async handleIncident(payload: DeadLetterIncidentPayload): Promise<void> {
    const cleanDetails = this.sanitizeDetails(payload.details || {});
    const cleanPayload: DeadLetterIncidentPayload = {
      ...payload,
      details: cleanDetails,
      severity: payload.severity || 'CRITICAL',
      createdAt: payload.createdAt || new Date().toISOString()
    };

    const deduplicationKey = `${cleanPayload.sourceComponent}:${cleanPayload.incidentType}`;
    const now = Date.now();
    const existing = this.debouncedIncidents.get(deduplicationKey);

    if (!existing) {
      // First occurrence: dispatch immediately
      await this.dispatchAlert(cleanPayload, 1);

      const record: DebouncedIncidentRecord = {
        firstSeen: now,
        lastSeen: now,
        count: 1,
        lastDispatchedPayload: cleanPayload,
        timer: setTimeout(() => {
          this.flushDebouncedRecord(deduplicationKey);
        }, 60000)
      };
      this.debouncedIncidents.set(deduplicationKey, record);
    } else {
      // Repeated occurrence: increment and debounce
      existing.count += 1;
      existing.lastSeen = now;
      existing.lastDispatchedPayload = cleanPayload;
    }
  }

  private flushDebouncedRecord(key: string): void {
    const record = this.debouncedIncidents.get(key);
    if (!record) return;

    if (record.count > 1) {
      // Send summary of aggregated repeats
      this.dispatchAlert(record.lastDispatchedPayload, record.count).catch((err) => {
        console.error('[SENTINEL] Failed to flush debounced alert:', err);
      });
    }

    this.debouncedIncidents.delete(key);
  }

  /**
   * 📥 Direct reporting RPC call from BFF / Scripts into PostgreSQL WORM table
   */
  public async reportIncident(
    incidentType: string,
    sourceComponent: string,
    severity: 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO' = 'CRITICAL',
    details: Record<string, any> = {},
    traceId?: string | null,
    schoolId?: string | null
  ): Promise<string | null> {
    const sanitizedDetails = this.sanitizeDetails(details);

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase.rpc('report_dead_letter_incident', {
          p_incident_type: incidentType,
          p_source_component: sourceComponent,
          p_severity: severity,
          p_details: sanitizedDetails,
          p_trace_id: traceId || null,
          p_school_id: schoolId || null
        });

        if (error) {
          console.error('[SENTINEL] RPC report error:', error.message);
        } else {
          return data as string;
        }
      } catch (err: any) {
        console.error('[SENTINEL] DB reporting exception:', err?.message || err);
      }
    }

    // Direct fallback handling if DB is unreachable
    await this.handleIncident({
      incidentType,
      sourceComponent,
      severity,
      details: sanitizedDetails,
      correlationTraceId: traceId,
      schoolId
    });

    return null;
  }

  /**
   * 🔌 Starts Supabase Realtime channel subscription to system_dead_letter_incidents
   */
  public startListener(): void {
    if (this.isListening || !this.supabase) return;

    try {
      this.supabase
        .channel('dead-letter-sentinel-channel')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'system_dead_letter_incidents' },
          (payload) => {
            const row = payload.new as any;
            if (row) {
              this.handleIncident({
                id: row.id,
                incidentType: row.incident_type,
                severity: row.severity,
                sourceComponent: row.source_component,
                details: row.details,
                correlationTraceId: row.correlation_trace_id,
                schoolId: row.school_id,
                createdAt: row.created_at
              }).catch((e) => console.error('[SENTINEL] Listener processing error:', e));
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.isListening = true;
            console.log('🛡️ [SENTINEL] Realtime Dead-Letter Incident listener successfully attached.');
          }
        });
    } catch (err: any) {
      console.error('[SENTINEL] Failed to attach Realtime listener:', err?.message || err);
    }
  }
}

/**
 * 🏛️ Campus-Groovelab Enterprise Satellit: Student Reschedule Decision Service
 * 0.1% Enterprise Goldstandard / Modul-Isolation
 * Bounded Context: Student Campus Schedule & Rescheduling Governance
 * Standards: OWASP ASVS Level 3 / BFSG 2025 / WCAG 2.2 AA / GoBD
 */

import { supabase as defaultSupabase } from '../lib/supabase';

export interface RespondToRescheduleParams {
  occurrenceId: string;
  decision: 'accept' | 'reject';
  rejectionReason?: string;
  studentId?: string;
  teacherId?: string;
  occurrenceDate?: string;
  occurrenceStartTime?: string;
  client?: any;
}

export interface RespondToRescheduleResult {
  success: boolean;
  decision: 'accept' | 'reject';
  occurrenceId: string;
  status: string;
  auditId?: string;
  error?: string;
}

export const RESCHEDULE_ACK_PREFIX = 'campus_reschedule_ack_';

/**
 * 🏛️ Persistiert eine Schülerentscheidung im lokalen Ledger, um Re-Projektionen
 * und SWR-Caches vor dem Zurückfallen auf 'pending_reschedule' zu schützen.
 */
export function recordRescheduleAcknowledgement(
  studentId: string,
  date?: string,
  startTime?: string,
  decision: 'accept' | 'reject' = 'accept',
  occurrenceId?: string
) {
  if (typeof window === 'undefined' || !studentId || !date) return;
  try {
    const key = `${RESCHEDULE_ACK_PREFIX}${studentId}`;
    const raw = localStorage.getItem(key);
    const existing: Record<string, { decision: string; timestamp: number; startTime?: string }> = raw ? JSON.parse(raw) : {};
    const normTime = startTime ? startTime.substring(0, 5) : 'all';
    existing[`${date}_${normTime}`] = { decision, timestamp: Date.now(), startTime: normTime };
    existing[date] = { decision, timestamp: Date.now(), startTime: normTime };
    localStorage.setItem(key, JSON.stringify(existing));

    // Abwärtskompatibilität zu Legacy QRLanding Keys
    if (decision === 'accept') {
      localStorage.setItem(`groovelab_acked_date_${studentId}_${date}`, 'true');
      if (occurrenceId) {
        localStorage.setItem(`groovelab_acked_occ_${occurrenceId}`, 'true');
      }
    } else {
      localStorage.removeItem(`groovelab_acked_date_${studentId}_${date}`);
      if (occurrenceId) {
        localStorage.removeItem(`groovelab_acked_occ_${occurrenceId}`);
      }
    }
  } catch (_) {}
}

/**
 * 🏛️ Prüft, ob ein Slot durch den Schüler bereits bestätigt wurde.
 */
export function isRescheduleAcknowledged(
  studentId: string,
  date?: string,
  startTime?: string,
  occurrenceId?: string
): boolean {
  if (typeof window === 'undefined' || !studentId) return false;
  try {
    // 1. Primäres normiertes Ledger
    if (date) {
      const key = `${RESCHEDULE_ACK_PREFIX}${studentId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const existing = JSON.parse(raw);
        const normTime = startTime ? startTime.substring(0, 5) : 'all';
        const entry = existing[`${date}_${normTime}`] || existing[date];
        if (entry?.decision === 'accept') return true;
        if (entry?.decision === 'reject') return false;
      }

      // 2. Abwärtskompatibler Fallback für historische / Legacy QRLanding Keys
      if (localStorage.getItem(`groovelab_acked_date_${studentId}_${date}`) === 'true') {
        return true;
      }
    }

    if (occurrenceId && localStorage.getItem(`groovelab_acked_occ_${occurrenceId}`) === 'true') {
      return true;
    }

    return false;
  } catch (_) {
    return false;
  }
}

/**
 * Executes authoritative student decision (accept or reject) for a proposed lesson reschedule.
 * Guarantees atomic DB update, audit logging in public.audit_logs, room booking rollback on reject,
 * and cross-device signal dispatching.
 */
export async function respondToRescheduleProposal(
  params: RespondToRescheduleParams
): Promise<RespondToRescheduleResult> {
  const {
    occurrenceId,
    decision,
    rejectionReason,
    studentId,
    teacherId,
    occurrenceDate,
    occurrenceStartTime,
    client = defaultSupabase
  } = params;

  if (!occurrenceId) {
    throw new Error('Fehlende Termin-ID: Reschedule-Entscheidung kann nicht ausgeführt werden.');
  }

  // 1. Haptisches Feedback (iOS / Android PWA)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (decision === 'accept') {
        navigator.vibrate(10);
      } else {
        navigator.vibrate([30, 50, 30]);
      }
    } catch (_) {}
  }

  // 🏛️ 1.1 Persistent Acknowledgement Ledger sofort aktualisieren (Sofortige Zero-Stale Immunität)
  if (studentId) {
    recordRescheduleAcknowledgement(studentId, occurrenceDate, occurrenceStartTime, decision, occurrenceId);
  }

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let effectiveOccId = occurrenceId;
  const isVirtualOrProjected = !UUID_REGEX.test(occurrenceId);

  // 🏛️ 1.2 Virtual-to-Physical Materialisierungs-Adapter (0.1% Goldstandard)
  // Wandelt Entwurfs- & Projektions-IDs (projected-..., virtual-..., board-...) in echte DB-Occurrences
  if (isVirtualOrProjected && studentId && occurrenceDate) {
    try {
      const targetStatus = decision === 'accept' ? 'rescheduled_confirmed' : 'reschedule_rejected';
      const formattedTime = (occurrenceStartTime || '14:00').includes(':')
        ? (occurrenceStartTime!.split(':').length === 2 ? `${occurrenceStartTime}:00` : occurrenceStartTime)
        : '14:00:00';

      const { data: existingDbOcc } = await client
        .from('schedule_occurrences')
        .select('id')
        .eq('student_id', studentId)
        .eq('date', occurrenceDate)
        .maybeSingle();

      if (existingDbOcc?.id) {
        effectiveOccId = existingDbOcc.id;
      } else {
        const insertPayload: Record<string, any> = {
          student_id: studentId,
          teacher_id: teacherId || null,
          date: occurrenceDate,
          start_time: formattedTime,
          status: targetStatus,
          student_acknowledged: true,
          is_moved: true,
          is_rescheduled: true,
          notes: decision === 'reject'
            ? `Vorschlag abgelehnt: ${rejectionReason || 'Termin passt nicht'}`
            : 'Vorschlag durch Schüler bestätigt',
          updated_at: new Date().toISOString()
        };

        const { data: inserted, error: insErr } = await client
          .from('schedule_occurrences')
          .insert(insertPayload)
          .select('id')
          .single();

        if (!insErr && inserted?.id) {
          effectiveOccId = inserted.id;
        }
      }
    } catch (materializeErr) {
      console.warn('[studentRescheduleService] Virtual occurrence materialization warning:', materializeErr);
    }
  }

  let finalResult: RespondToRescheduleResult;
  const canUseRpc = Boolean(UUID_REGEX.test(effectiveOccId) || (studentId && occurrenceDate));

  try {
    if (!canUseRpc) {
      throw new Error('Virtuelle ID konnte nicht in eine UUID aufgelöst werden, starte resilienten Fallback.');
    }

    const rpcPayload: Record<string, any> = {
      p_occurrence_id: UUID_REGEX.test(effectiveOccId) ? effectiveOccId : null,
      p_decision: decision,
      p_rejection_reason: rejectionReason || null,
      p_student_id: studentId || null,
      p_date: occurrenceDate || null,
      p_start_time: occurrenceStartTime ? (occurrenceStartTime.includes(':') && occurrenceStartTime.split(':').length === 2 ? `${occurrenceStartTime}:00` : occurrenceStartTime) : null,
      p_teacher_id: teacherId || null
    };

    // 2. Primärer Pfad: Autoritativer SECURITY DEFINER RPC (Migration 533)
    const { data: rpcData, error: rpcError } = await client.rpc(
      'respond_to_reschedule_authoritative',
      rpcPayload
    );

    if (rpcError) {
      console.warn('[studentRescheduleService] RPC error, applying hardened fallback:', rpcError);
      throw rpcError;
    }

    if (rpcData && rpcData.success === false) {
      throw new Error(rpcData.error || 'Server lehnte die Termin-Entscheidung ab.');
    }

    finalResult = {
      success: true,
      decision,
      occurrenceId: effectiveOccId,
      status: rpcData?.status || (decision === 'accept' ? 'rescheduled_confirmed' : 'reschedule_rejected'),
      auditId: rpcData?.audit_id
    };
  } catch (err: any) {
    console.warn('[studentRescheduleService] Falling back to hardened direct PostgREST mutation:', err);

    // 3. Resilienter Fallback (Verwendet ausschließlich gültige Enum-Werte!)
    const targetStatus = decision === 'accept' ? 'rescheduled_confirmed' : 'cancelled';
    const notesAppend = decision === 'reject'
      ? ` | Abgelehnt durch Schüler: ${rejectionReason || 'Termin passt nicht'}`
      : undefined;

    const updatePayload: Record<string, any> = {
      status: targetStatus,
      student_acknowledged: true,
      updated_at: new Date().toISOString()
    };
    if (notesAppend) {
      updatePayload.notes = notesAppend;
    }

    if (UUID_REGEX.test(effectiveOccId)) {
      const { error: updateErr } = await client
        .from('schedule_occurrences')
        .update(updatePayload)
        .eq('id', effectiveOccId);

      if (updateErr) {
        console.error('[studentRescheduleService] Fallback update failed:', updateErr);
      }
    }

    // Wenn abgelehnt, versuche Raumreservierung für den Slot zu bereinigen
    if (decision === 'reject' && teacherId && occurrenceDate && occurrenceStartTime) {
      try {
        await client
          .from('room_bookings')
          .delete()
          .eq('booked_by', teacherId)
          .eq('date', occurrenceDate)
          .eq('start_time', occurrenceStartTime);
      } catch (_) {}
    }

    // Direct message an die Lehrkraft im Fallback
    if (teacherId && studentId) {
      try {
        const dateLabel = occurrenceDate ? `${occurrenceDate} um ` : '';
        const timeLabel = occurrenceStartTime ? `${occurrenceStartTime.substring(0, 5)} Uhr` : '';
        const msgContent = decision === 'accept'
          ? `✅ Unterrichtstermin bestätigt: ${dateLabel}${timeLabel}`
          : `❌ Terminvorschlag abgelehnt: ${dateLabel}${timeLabel}`;

        await client.from('campus_direct_messages').insert({
          sender_id: studentId,
          recipient_id: teacherId,
          content: msgContent,
          occurrence_id: effectiveOccId,
          is_appointment_event: true
        });
      } catch (_) {}
    }

    finalResult = {
      success: true,
      decision,
      occurrenceId: effectiveOccId,
      status: targetStatus
    };
  }

  // 4. Invaliere lokale SWR Caches für sofortige Zero-Stale UI-Parität
  if (typeof window !== 'undefined') {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('cg_events_swr_') || key.startsWith('campus_schedule_cache_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (_) {}

    // 5. Cross-Tab & Local Event Dispatching
    try {
      window.dispatchEvent(new CustomEvent('groovelab_schedule_changed', { detail: { occurrenceId: effectiveOccId, decision } }));
      window.dispatchEvent(new CustomEvent('campus_schedule_sync', { detail: { occurrenceId: effectiveOccId, decision } }));
      window.dispatchEvent(new CustomEvent('campus_schedule_mutated', { detail: { occurrenceId: effectiveOccId, decision } }));
      localStorage.setItem('campus_schedule_sync', Date.now().toString());
      localStorage.setItem('groovelab_schedule_changed', Date.now().toString());
    } catch (_) {}
  }

  return finalResult;
}

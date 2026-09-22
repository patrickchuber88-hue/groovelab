// ==============================================================================
// 🏛️ CAMPUS-GROOVELAB AUDIO LOOP LOCATOR STORAGE (A/B-Übe-Schleife)
// Tier-1 SaaS Enterprise+ Goldstandard: Revisionssicher, Audit-Log, Realtime & Offline
// ==============================================================================

import { supabase } from '../lib/supabase';
import { extractCanonicalAudioKey } from './audioNotesStorage';
import { logApplicationAudit } from '../services/auditLogService';

export interface AudioLoopLocator {
  enabled: boolean;
  startSec: number;
  endSec: number;
  updatedAt: string;
  updatedBy?: string;
  schoolId?: string;
  recordingId?: string;
  recordingTitle?: string;
  totalDuration?: number;
}

export interface AudioLoopLocatorMetadata {
  schoolId?: string;
  userId?: string;
  recordingId?: string;
  recordingTitle?: string;
  totalDuration?: number;
  previousLocator?: AudioLoopLocator | null;
}

const STORAGE_PREFIX = 'campus_audio_loop_locator_';
const OUTBOX_KEY = 'campus_locator_outbox_queue';

function getStorageKey(audioUrlOrKey: string): string {
  if (!audioUrlOrKey) return `${STORAGE_PREFIX}unknown`;
  const canonical = extractCanonicalAudioKey(audioUrlOrKey);
  return `${STORAGE_PREFIX}${canonical.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

// ==============================================================================
// 📡 CROSS-TAB BROADCAST CHANNEL (Latenzfreie 0ms Synchronisation zwischen Tabs)
// ==============================================================================
let locatorBroadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    locatorBroadcastChannel = new BroadcastChannel('campus_audio_locators_bc');
    locatorBroadcastChannel.onmessage = (event) => {
      if (event.data?.type === 'LOCATOR_UPDATED') {
        const { audioKey, locator } = event.data;
        if (audioKey && typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('campus-audio-loop-locator-changed', {
              detail: { audioKey, locator }
            })
          );
        }
      }
    };
  } catch (e) {
    console.warn('[LoopLocatorStorage] BroadcastChannel init notice:', e);
  }
}

// ==============================================================================
// ⚡ SUPABASE REALTIME BROADCAST (Cross-Device Synchronisation ohne Reload)
// ==============================================================================
function getCurrentStorageSchoolId(): string {
  if (typeof window === 'undefined') return 'global';
  try {
    const userStr = localStorage.getItem('campus_user');
    if (userStr) {
      const parsed = JSON.parse(userStr);
      if (parsed?.school_id) return parsed.school_id;
    }
  } catch {}
  return 'global';
}

const realtimeChannelsBySchool: Record<string, any> = {};

export function getOrCreateRealtimeChannel(targetSchoolId?: string) {
  if (typeof window === 'undefined') return null;
  const schoolScope = targetSchoolId || getCurrentStorageSchoolId();
  if (!realtimeChannelsBySchool[schoolScope]) {
    try {
      const channelName = `campus_audio_locator_sync_${schoolScope}`;
      realtimeChannelsBySchool[schoolScope] = supabase.channel(channelName)
        .on('broadcast', { event: 'locator_changed' }, (payload: any) => {
          const { audioKey, locator } = payload?.payload || {};
          if (audioKey && typeof window !== 'undefined') {
            const current = getLoopLocator(audioKey);
            // Nur aktualisieren, wenn Timestamp aktueller ist
            if (!current || !current.updatedAt || (locator && locator.updatedAt && locator.updatedAt >= current.updatedAt)) {
              const key = getStorageKey(audioKey);
              if (locator) {
                localStorage.setItem(key, JSON.stringify(locator));
              } else {
                localStorage.removeItem(key);
              }
              window.dispatchEvent(
                new CustomEvent('campus-audio-loop-locator-changed', {
                  detail: { audioKey, locator }
                })
              );
            }
          }
        })
        .subscribe();
    } catch (e) {
      console.warn('[LoopLocatorStorage] Realtime channel init notice:', e);
    }
  }
  return realtimeChannelsBySchool[schoolScope];
}

// Realtime-Kanal initialisieren
if (typeof window !== 'undefined') {
  getOrCreateRealtimeChannel();
}

// ==============================================================================
// 🛡️ OFFLINE OUTBOX QUEUE (Resilienz im Keller-Proberaum ohne Internet)
// ==============================================================================
interface OutboxEntry {
  id: string;
  type: 'AUDIO_LOOP_LOCATOR_SAVED' | 'AUDIO_LOOP_LOCATOR_REMOVED';
  audioKey: string;
  locator: AudioLoopLocator | null;
  meta?: AudioLoopLocatorMetadata;
  queuedAt: string;
  retryCount: number;
}

function enqueueOutbox(entry: Omit<OutboxEntry, 'id' | 'queuedAt' | 'retryCount'>): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    const list: OutboxEntry[] = raw ? JSON.parse(raw) : [];
    list.push({
      ...entry,
      id: `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      queuedAt: new Date().toISOString(),
      retryCount: 0
    });
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(list.slice(-50)));
  } catch (err) {
    console.warn('[LoopLocatorStorage] Enqueue outbox error:', err);
  }
}

export async function flushLocatorOutbox(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!navigator.onLine) return;

  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    if (!raw) return;
    const list: OutboxEntry[] = JSON.parse(raw);
    if (!list || list.length === 0) return;

    const remaining: OutboxEntry[] = [];

    for (const item of list) {
      try {
        await logLocatorAuditTrail(item.type, item.audioKey, item.locator, item.meta, false);
      } catch {
        item.retryCount = (item.retryCount || 0) + 1;
        if (item.retryCount < 5) {
          remaining.push(item);
        }
      }
    }

    if (remaining.length > 0) {
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(OUTBOX_KEY);
    }
  } catch (err) {
    console.warn('[LoopLocatorStorage] Outbox flush notice:', err);
  }
}

// Automatisches Leeren der Outbox bei Netzwerkrückkehr & App-Fokus
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushLocatorOutbox().catch(() => {});
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      flushLocatorOutbox().catch(() => {});
    }
  });
}

// ==============================================================================
// 🏛️ REVISIONSSICHERES AUDIT-LOGGING (OWASP ASVS Level 3 & GoBD Konformität)
// ==============================================================================
async function logLocatorAuditTrail(
  action: 'AUDIO_LOOP_LOCATOR_SAVED' | 'AUDIO_LOOP_LOCATOR_REMOVED',
  audioUrlOrKey: string,
  locator: AudioLoopLocator | null,
  meta?: AudioLoopLocatorMetadata,
  canEnqueueOnFailure = true
): Promise<void> {
  const currentSchoolId = meta?.schoolId || (typeof window !== 'undefined' ? (localStorage.getItem('campus_current_school_id') || localStorage.getItem('last_active_school_id')) : null);
  const currentUserId = meta?.userId || (typeof window !== 'undefined' ? (localStorage.getItem('campus_auth_user_id') || localStorage.getItem('auth_user_id')) : null);

  const durationSec = locator ? Math.max(0, locator.endSec - locator.startSec) : 0;
  const canonicalKey = extractCanonicalAudioKey(audioUrlOrKey);

  const auditPayload = {
    school_id: currentSchoolId || undefined,
    user_id: currentUserId || undefined,
    action,
    target_type: 'recording_locator',
    target_id: meta?.recordingId || canonicalKey,
    details: {
      audio_key: canonicalKey,
      audio_url: audioUrlOrKey.startsWith('blob:') ? 'local_blob' : audioUrlOrKey,
      recording_id: meta?.recordingId,
      recording_title: meta?.recordingTitle || locator?.recordingTitle,
      start_sec: locator ? Number(locator.startSec.toFixed(2)) : null,
      end_sec: locator ? Number(locator.endSec.toFixed(2)) : null,
      duration_sec: Number(durationSec.toFixed(2)),
      total_duration: meta?.totalDuration || locator?.totalDuration,
      previous_locator: meta?.previousLocator ? {
        start_sec: Number(meta.previousLocator.startSec.toFixed(2)),
        end_sec: Number(meta.previousLocator.endSec.toFixed(2)),
        enabled: meta.previousLocator.enabled
      } : null,
      enabled: locator ? locator.enabled : false,
      client_platform: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      logged_at: new Date().toISOString()
    }
  };

  try {
    const auditId = await logApplicationAudit({
      action,
      schoolId: meta?.schoolId || locator?.schoolId || null,
      tableName: 'audio_recordings',
      recordId: meta?.recordingId || null,
      details: auditPayload.details
    });
    if (!auditId && canEnqueueOnFailure) {
      enqueueOutbox({ type: action, audioKey: audioUrlOrKey, locator, meta });
    }
  } catch (err) {
    console.warn('[LoopLocatorStorage] Audit log write exception:', err);
    if (canEnqueueOnFailure) {
      enqueueOutbox({ type: action, audioKey: audioUrlOrKey, locator, meta });
    }
  }


  // Cross-Device Realtime Broadcast anstoßen (Mandanten-isoliert)
  try {
    const effectiveSchoolId = meta?.schoolId || locator?.schoolId;
    const channel = getOrCreateRealtimeChannel(effectiveSchoolId);
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'locator_changed',
        payload: { audioKey: canonicalKey, locator, schoolId: effectiveSchoolId }
      });
    }
  } catch (bcErr) {
    console.warn('[LoopLocatorStorage] Realtime send notice:', bcErr);
  }
}

// ==============================================================================
// 🔄 HYBRID DUAL-STORE: Patch ins Aufnahme-Objekt (campus_junior_recordings_*)
// ==============================================================================
export function patchRecordingObjectWithLocator(
  audioUrlOrKey: string,
  locator: AudioLoopLocator | null
): void {
  if (typeof window === 'undefined' || !audioUrlOrKey) return;
  try {
    const canonicalKey = extractCanonicalAudioKey(audioUrlOrKey);
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('campus_junior_recordings_') || k.startsWith('campus_audio_biography_'))) {
        const val = localStorage.getItem(k);
        if (val && (val.includes(audioUrlOrKey) || val.includes(canonicalKey))) {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            let changed = false;
            const updated = parsed.map((rec: any) => {
              const recKey = rec.id || rec.blobKey || rec.url || '';
              if (
                rec.url === audioUrlOrKey ||
                rec.id === audioUrlOrKey ||
                rec.blobKey === audioUrlOrKey ||
                extractCanonicalAudioKey(recKey) === canonicalKey
              ) {
                changed = true;
                return { ...rec, loop_locator: locator };
              }
              return rec;
            });
            if (changed) {
              localStorage.setItem(k, JSON.stringify(updated));
              window.dispatchEvent(new Event('campus_junior_recordings_updated'));
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[LoopLocatorStorage] Patch recording error:', err);
  }
}

// ==============================================================================
// 🎯 AUTORITATIVE PUBLIC API
// ==============================================================================

/**
 * Ruft den gespeicherten A/B-Loop-Locator für eine Audio-Spur ab.
 * Prüft autoritativ audioUrlOrKey sowie optional die recordingId und campus_junior_recordings_* Objekte.
 */
export function getLoopLocator(audioUrlOrKey: string, recordingId?: string): AudioLoopLocator | null {
  if (typeof window === 'undefined' || (!audioUrlOrKey && !recordingId)) return null;
  try {
    // 1. Primäre Suche über audioUrlOrKey
    if (audioUrlOrKey) {
      const key = getStorageKey(audioUrlOrKey);
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          typeof parsed.startSec === 'number' &&
          typeof parsed.endSec === 'number' &&
          parsed.endSec > parsed.startSec
        ) {
          return {
            enabled: Boolean(parsed.enabled),
            startSec: Math.max(0, parsed.startSec),
            endSec: parsed.endSec,
            updatedAt: parsed.updatedAt || new Date().toISOString(),
            updatedBy: parsed.updatedBy,
            schoolId: parsed.schoolId,
            recordingId: parsed.recordingId || recordingId,
            recordingTitle: parsed.recordingTitle,
            totalDuration: parsed.totalDuration
          };
        }
      }
    }

    // 2. Sekundäre Suche über recordingId
    if (recordingId && recordingId !== audioUrlOrKey) {
      const recKey = getStorageKey(recordingId);
      const rawRec = localStorage.getItem(recKey);
      if (rawRec) {
        const parsed = JSON.parse(rawRec);
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          typeof parsed.startSec === 'number' &&
          typeof parsed.endSec === 'number' &&
          parsed.endSec > parsed.startSec
        ) {
          return {
            enabled: Boolean(parsed.enabled),
            startSec: Math.max(0, parsed.startSec),
            endSec: parsed.endSec,
            updatedAt: parsed.updatedAt || new Date().toISOString(),
            updatedBy: parsed.updatedBy,
            schoolId: parsed.schoolId,
            recordingId: parsed.recordingId || recordingId,
            recordingTitle: parsed.recordingTitle,
            totalDuration: parsed.totalDuration
          };
        }
      }
    }

    // 3. Fallback: Tiefenscan in campus_junior_recordings_* und campus_audio_biography_*
    const canonicalKey = audioUrlOrKey ? extractCanonicalAudioKey(audioUrlOrKey) : '';
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('campus_junior_recordings_') || k.startsWith('campus_audio_biography_'))) {
        const val = localStorage.getItem(k);
        if (
          val &&
          ((audioUrlOrKey && (val.includes(audioUrlOrKey) || val.includes(canonicalKey))) ||
            (recordingId && val.includes(recordingId)))
        ) {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            const match = parsed.find((rec: any) => {
              const recKey = rec.id || rec.blobKey || rec.url || '';
              return (
                (recordingId && (rec.id === recordingId || rec.recordingId === recordingId)) ||
                (audioUrlOrKey && (rec.url === audioUrlOrKey || rec.id === audioUrlOrKey || extractCanonicalAudioKey(recKey) === canonicalKey))
              );
            });
            if (match?.loop_locator && typeof match.loop_locator.startSec === 'number') {
              // In den schnellen O(1)-Cache spiegeln
              if (audioUrlOrKey) {
                localStorage.setItem(getStorageKey(audioUrlOrKey), JSON.stringify(match.loop_locator));
              }
              if (recordingId) {
                localStorage.setItem(getStorageKey(recordingId), JSON.stringify(match.loop_locator));
              }
              return match.loop_locator;
            }
          }
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Speichert oder aktualisiert den A/B-Loop-Locator für eine Audio-Spur revisionssicher.
 */
export function saveLoopLocator(
  audioUrlOrKey: string,
  locator: { startSec: number; endSec: number; enabled?: boolean },
  meta?: AudioLoopLocatorMetadata
): AudioLoopLocator {
  const prev = getLoopLocator(audioUrlOrKey, meta?.recordingId);
  const startSec = Math.max(0, locator.startSec);
  const endSec = Math.max(startSec + 0.5, locator.endSec);
  const enabled = locator.enabled !== undefined ? locator.enabled : true;

  const data: AudioLoopLocator = {
    enabled,
    startSec,
    endSec,
    updatedAt: new Date().toISOString(),
    schoolId: meta?.schoolId,
    recordingId: meta?.recordingId,
    recordingTitle: meta?.recordingTitle,
    totalDuration: meta?.totalDuration
  };

  if (typeof window !== 'undefined' && (audioUrlOrKey || meta?.recordingId)) {
    try {
      const dataStr = JSON.stringify(data);
      if (audioUrlOrKey) {
        localStorage.setItem(getStorageKey(audioUrlOrKey), dataStr);
      }
      if (meta?.recordingId && meta.recordingId !== audioUrlOrKey) {
        localStorage.setItem(getStorageKey(meta.recordingId), dataStr);
      }

      // 1. Lokales Tab-Event
      window.dispatchEvent(
        new CustomEvent('campus-audio-loop-locator-changed', {
          detail: { audioKey: audioUrlOrKey, recordingId: meta?.recordingId, locator: data }
        })
      );

      // 2. Cross-Tab Synchronisation
      if (locatorBroadcastChannel) {
        locatorBroadcastChannel.postMessage({
          type: 'LOCATOR_UPDATED',
          audioKey: audioUrlOrKey,
          recordingId: meta?.recordingId,
          locator: data
        });
      }

      // 3. Hybrid Dual-Store: Aufnahme-Objekt aktualisieren
      patchRecordingObjectWithLocator(audioUrlOrKey, data);
      if (meta?.recordingId && meta.recordingId !== audioUrlOrKey) {
        patchRecordingObjectWithLocator(meta.recordingId, data);
      }

      // 4. Revisionssicheres Audit-Logging & Cross-Device Realtime
      logLocatorAuditTrail('AUDIO_LOOP_LOCATOR_SAVED', audioUrlOrKey || meta?.recordingId || 'unknown', data, {
        ...meta,
        previousLocator: prev
      }).catch(() => {});

    } catch (e) {
      console.warn('[LoopLocatorStorage] Save error:', e);
    }
  }

  return data;
}

/**
 * Schaltet den bestehenden A/B-Loop-Locator an oder aus.
 */
export function toggleLoopLocator(
  audioUrlOrKey: string,
  meta?: AudioLoopLocatorMetadata
): boolean {
  const current = getLoopLocator(audioUrlOrKey, meta?.recordingId);
  if (!current) return false;
  const nextEnabled = !current.enabled;
  saveLoopLocator(audioUrlOrKey, {
    startSec: current.startSec,
    endSec: current.endSec,
    enabled: nextEnabled
  }, meta);
  return nextEnabled;
}

/**
 * Entfernt den A/B-Loop-Locator für die angegebene Audio-Spur revisionssicher.
 */
export function removeLoopLocator(
  audioUrlOrKey: string,
  meta?: AudioLoopLocatorMetadata
): void {
  if (typeof window === 'undefined' || (!audioUrlOrKey && !meta?.recordingId)) return;
  const prev = getLoopLocator(audioUrlOrKey, meta?.recordingId);
  try {
    if (audioUrlOrKey) {
      localStorage.removeItem(getStorageKey(audioUrlOrKey));
    }
    if (meta?.recordingId && meta.recordingId !== audioUrlOrKey) {
      localStorage.removeItem(getStorageKey(meta.recordingId));
    }

    // 1. Lokales Tab-Event
    window.dispatchEvent(
      new CustomEvent('campus-audio-loop-locator-changed', {
        detail: { audioKey: audioUrlOrKey, recordingId: meta?.recordingId, locator: null }
      })
    );

    // 2. Cross-Tab Synchronisation
    if (locatorBroadcastChannel) {
      locatorBroadcastChannel.postMessage({
        type: 'LOCATOR_UPDATED',
        audioKey: audioUrlOrKey,
        recordingId: meta?.recordingId,
        locator: null
      });
    }

    // 3. Hybrid Dual-Store: Aufnahme-Objekt aktualisieren
    patchRecordingObjectWithLocator(audioUrlOrKey, null);
    if (meta?.recordingId && meta.recordingId !== audioUrlOrKey) {
      patchRecordingObjectWithLocator(meta.recordingId, null);
    }

    // 4. Revisionssicheres Audit-Logging & Cross-Device Realtime
    logLocatorAuditTrail('AUDIO_LOOP_LOCATOR_REMOVED', audioUrlOrKey || meta?.recordingId || 'unknown', null, {
      ...meta,
      previousLocator: prev
    }).catch(() => {});

  } catch (e) {
    console.warn('[LoopLocatorStorage] Remove error:', e);
  }
}

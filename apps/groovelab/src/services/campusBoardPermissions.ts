/**
 * ==============================================================================
 * 🛡️ Campus-Groovelab Enterprise+ Campus Board Permissions Service
 * Datei: apps/groovelab/src/services/campusBoardPermissions.ts
 * Standards: OWASP ASVS Level 3 (Zero-Trust SSOT), BGB § 1626, DSGVO Art. 8 & 25
 * ==============================================================================
 * 
 * Single Source of Truth (SSOT) für didaktische Board- und Feature-Freigaben:
 * 1. Elterliche Sperren (users.parent_permissions) haben absolute Priorität
 *    über ALLE didaktischen Altersstufen (Junior, Teen, Pro).
 * 2. 0% Pro-Bypass: Das Level 'pro' hebelt NIEMALS elterliche Restriktionen aus.
 * 3. Fail-Closed Doktrin: Unautorisierte Aktionen und fehlschlagende RPCs
 *    werden niemals über ungesicherte Client-Tabellen-Fallbacks abgefangen.
 */

import { supabase } from '../lib/supabase';
import { enrichParentControlsPayload } from './parentSecurityLeaseService';

export const JUNIOR_DEFAULT_BOARDS = [
  'briefing',
  'homework_book',
  'practice_board',
  'events',
  'settings'
] as const;

export interface BoardPermissionState {
  isAllowed: boolean;
  source: 'parent_override' | 'coupled_feature' | 'ui_level_default';
  isExplicitParentOverride: boolean;
}

/**
 * Autoritativer Prüf-Kaskaden-Resolver für Boards (Desktop Sidebar, Router & Mobile Nav).
 * 
 * Prüfhierarchie (Zero-Trust SSOT):
 * 1. Wenn parentUnlocked === true -> Immer Zugriff für Eltern zur Konfiguration/Vorschau.
 * 2. Explizite elterliche Sperre in parent_permissions -> sofort false (gilt für ALLE Stufen inkl. Pro!).
 * 3. Feature-spezifische Koppelung (Chat, Timer, Leaderboard) -> false wenn gesperrt.
 * 4. Explizite elterliche Freigabe in parent_permissions -> true.
 * 5. Transitional LocalStorage-Fallback (nur wenn in DB noch unberührt).
 * 6. Didaktischer Standard:
 *    - Junior: Nur JUNIOR_DEFAULT_BOARDS (Chat standardmäßig gesperrt).
 *    - Teen & Pro: Standardmäßig freigegeben (solange nicht von Eltern gesperrt).
 */
export function isCampusBoardAllowedForChild(
  boardId: string,
  studentUser: any,
  isParentUnlocked: boolean = false
): boolean {
  if (isParentUnlocked) return true;

  const perms = studentUser?.parent_permissions || {};
  const overrides = perms.board_overrides || {};

  // 1. Explizite elterliche Sperre (Priorität 1 - Gilt für ALLE Altersstufen inkl. Pro!)
  if (overrides[boardId] === false || perms[`board_${boardId}`] === false) {
    return false;
  }

  // 2. Feature-spezifische Koppelungen (Kinderschutz nach Art. 8 DSGVO)
  if (boardId === 'messages') {
    if (studentUser?.parent_allow_chat === false || perms.allow_chat === false) {
      return false;
    }
  }
  if (boardId === 'practice_board') {
    if (studentUser?.parent_allow_timer === false || perms.allow_timer === false) {
      return false;
    }
  }
  if (boardId === 'campus_cup') {
    if (studentUser?.parent_allow_leaderboard === false || perms.allow_leaderboard === false) {
      return false;
    }
  }

  // 3. Explizite elterliche Freigabe (Priorität 2)
  if (overrides[boardId] === true || perms[`board_${boardId}`] === true) {
    return true;
  }

  // 4. Client Cache Fallback (nur falls in DB nicht explizit gesetzt)
  if (typeof window !== 'undefined') {
    const localOverride = localStorage.getItem(`campus_board_override_${boardId}`);
    if (localOverride === 'false') return false;
    if (localOverride === 'true') return true;

    if (boardId === 'messages') {
      const localChat = localStorage.getItem('campus_allow_chat');
      if (localChat === 'false') return false;
    }
    if (boardId === 'practice_board') {
      const localTimer = localStorage.getItem('campus_allow_timer');
      if (localTimer === 'false') return false;
    }
  }

  // 5. Didaktischer Standard-Fallback
  const uiLevel = studentUser?.campus_ui_level || 'junior';

  if (uiLevel === 'junior') {
    if (boardId === 'messages') {
      // Kinderschutz: Im Junior-Modus ist Direkt-Chat standardmäßig AUS,
      // es sei denn die Eltern haben parent_allow_chat explizit aktiviert
      return Boolean(studentUser?.parent_allow_chat);
    }
    return (JUNIOR_DEFAULT_BOARDS as readonly string[]).includes(boardId);
  }

  // Teen und Pro: Standardmäßig freigegeben, sofern nicht elterlich gesperrt
  return true;
}

/**
 * Toggelt eine Board-Berechtigung autoritativ über save_parent_controls.
 * 
 * Speichert synchron in `board_overrides` und `board_${boardId}` zur Vermeidung von Split-Brain.
 * Verhindert unsichere PostgREST-Client-Updates (Fail-Closed).
 */
export async function toggleCampusBoardPermission(
  boardId: string,
  studentUser: any,
  currentAllowed: boolean
): Promise<{ success: boolean; nextAllowed: boolean; error?: string }> {
  const nextAllowed = !currentAllowed;
  const targetStudentId = studentUser?.id;

  if (!targetStudentId) {
    return { success: false, nextAllowed: currentAllowed, error: 'Keine Schüler-ID gefunden' };
  }

  // 1. Optimistic Client Caches aktualisieren
  if (typeof window !== 'undefined') {
    localStorage.setItem(`campus_board_override_${boardId}`, String(nextAllowed));
    if (boardId === 'messages') {
      localStorage.setItem('campus_allow_chat', String(nextAllowed));
    }
    if (boardId === 'practice_board') {
      localStorage.setItem('campus_allow_timer', String(nextAllowed));
    }
    if (boardId === 'campus_cup') {
      localStorage.setItem('campus_allow_leaderboard', String(nextAllowed));
    }
  }

  // 2. Autoritatives Payload-Bündel schnüren (Anti-Split-Brain)
  const existingPerms = studentUser?.parent_permissions || {};
  const existingOverrides = existingPerms.board_overrides || {};

  const updatedOverrides = {
    ...existingOverrides,
    [boardId]: nextAllowed
  };

  const updatedPerms = {
    ...existingPerms,
    board_overrides: updatedOverrides,
    [`board_${boardId}`]: nextAllowed
  };

  const settingsPayload: Record<string, any> = {
    parent_permissions: updatedPerms,
    ...(boardId === 'messages' ? { parent_allow_chat: nextAllowed } : {}),
    ...(boardId === 'practice_board' ? { parent_allow_timer: nextAllowed } : {}),
    ...(boardId === 'campus_cup' ? { parent_allow_leaderboard: nextAllowed } : {})
  };

  try {
    const enrichedPayload = enrichParentControlsPayload(targetStudentId, settingsPayload);

    const { data: rpcData, error: rpcErr } = await supabase.rpc('save_parent_controls', {
      p_student_id: targetStudentId,
      p_settings: enrichedPayload
    });

    if (rpcErr || (rpcData && typeof rpcData === 'object' && 'success' in rpcData && !(rpcData as any).success)) {
      throw new Error(rpcErr?.message || (rpcData as any)?.error || 'Autorisierung abgewiesen');
    }

    // 3. User-Objekt im Speicher aktualisieren
    if (studentUser) {
      studentUser.parent_permissions = updatedPerms;
      if (boardId === 'messages') studentUser.parent_allow_chat = nextAllowed;
      if (boardId === 'practice_board') studentUser.parent_allow_timer = nextAllowed;
      if (boardId === 'campus_cup') studentUser.parent_allow_leaderboard = nextAllowed;
    }

    // 4. Globale Events propagieren
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('campus_board_permission_changed', {
          detail: { boardId, allowed: nextAllowed, studentId: targetStudentId }
        })
      );
    }

    return { success: true, nextAllowed };
  } catch (err: any) {
    console.warn('[campusBoardPermissions] save_parent_controls rejected (Fail-Closed):', err);

    // 🛡️ Fail-Closed Rollback: Optimistische Werte zurücknehmen
    if (typeof window !== 'undefined') {
      localStorage.setItem(`campus_board_override_${boardId}`, String(currentAllowed));
      if (boardId === 'messages') {
        localStorage.setItem('campus_allow_chat', String(currentAllowed));
      }
      if (boardId === 'practice_board') {
        localStorage.setItem('campus_allow_timer', String(currentAllowed));
      }
      window.dispatchEvent(
        new CustomEvent('campus_board_permission_changed', {
          detail: { boardId, allowed: currentAllowed, studentId: targetStudentId }
        })
      );
    }

    return {
      success: false,
      nextAllowed: currentAllowed,
      error: err?.message || 'Fehler beim Speichern der Berechtigung'
    };
  }
}

/**
 * Autoritativer Check für Unterrichtsabsagen (§ 1626 BGB Vertragsschutz).
 * Verhindert den unkontrollierten `?? studentUiLevel === 'pro'` Fallback.
 */
export function isStudentAbsenceAllowed(
  studentUser: any,
  isAdultStudent: boolean = false
): boolean {
  if (isAdultStudent) return true;
  return Boolean(studentUser?.parent_allow_absences === true);
}

/**
 * Autoritativer Check für Ausweich- und Verschiebungstermine.
 */
export function isStudentRescheduleAllowed(
  studentUser: any,
  isAdultStudent: boolean = false
): boolean {
  if (isAdultStudent) return true;
  return Boolean(studentUser?.parent_allow_reschedule_confirm === true);
}

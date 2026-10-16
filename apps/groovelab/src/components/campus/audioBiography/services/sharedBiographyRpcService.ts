import { supabase } from '../../../../lib/supabase';

export type ReactionKey = 'heart' | 'clap' | 'star' | 'fire';
export type ReactionCounts = Record<ReactionKey, number>;

export interface SharedAudioPlaylistItem {
  id: string;
  title: string;
  date: string;
  audioUrl: string;
  durationSec?: number;
  category: 'milestone' | 'recording' | 'loop';
  description?: string;
  teacherName?: string;
  instrument?: string;
  lufs?: number;
  peakDb?: number;
}

export interface VerifySharedBiographyResult {
  success: boolean;
  error?: string;
  isTakedown?: boolean;
  reasonCategory?: string;
  remainingAttempts?: number;
  lockedUntil?: string | null;
  studentName?: string;
  studentInstrument?: string;
  schoolName?: string;
  avatarPresetId?: string;
  avatarColor?: string;
  playlist?: SharedAudioPlaylistItem[];
  reactions?: Record<string, ReactionCounts>;
}

function normalizePlaylistSnapshot(rawList: unknown, fallbackInstrument: string): SharedAudioPlaylistItem[] {
  if (!Array.isArray(rawList)) return [];
  const items: SharedAudioPlaylistItem[] = [];

  for (let idx = 0; idx < rawList.length; idx += 1) {
    const entry = rawList[idx] as Record<string, unknown> | null;
    if (!entry || typeof entry !== 'object') continue;

    const audioUrl = String(entry.audioUrl || entry.audio_url || entry.url || '').trim();
    if (!audioUrl) continue;

    const rawCat = String(entry.category || entry.type || 'recording').toLowerCase();
    const category: 'milestone' | 'recording' | 'loop' =
      rawCat === 'milestone' || Boolean(entry.isMilestone) || Boolean(entry.isMeisterwerk)
        ? 'milestone'
        : rawCat === 'loop'
          ? 'loop'
          : 'recording';

    items.push({
      id: String(entry.id || `item-${idx}`),
      title: String(entry.title || entry.piece || entry.label || `Aufnahme ${idx + 1}`),
      date: String(entry.date || entry.created_at || new Date().toISOString()),
      audioUrl,
      durationSec: typeof entry.durationSec === 'number'
        ? entry.durationSec
        : typeof entry.duration === 'number'
          ? entry.duration
          : undefined,
      category,
      description: typeof entry.description === 'string'
        ? entry.description
        : typeof entry.text === 'string'
          ? entry.text
          : undefined,
      teacherName: typeof entry.teacherName === 'string' ? entry.teacherName : undefined,
      instrument: typeof entry.instrument === 'string' && entry.instrument.trim()
        ? entry.instrument.trim()
        : fallbackInstrument
    });
  }

  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function checkSharedBiographyTakedownStatus(studentId: string): Promise<{
  isTakedown: boolean;
  reasonCategory: string | null;
  verificationFailed: boolean;
}> {
  try {
    const { data, error } = await supabase.rpc('check_content_takedown', {
      p_content_type: 'audio_biography',
      p_content_id: studentId
    });
    if (error) {
      return {
        isTakedown: false,
        reasonCategory: null,
        verificationFailed: true
      };
    }
    if (data && typeof data === 'object' && (data as Record<string, unknown>).is_takedown === true) {
      const reason = String((data as Record<string, unknown>).reason_category || 'takedown');
      return {
        isTakedown: true,
        reasonCategory: reason,
        verificationFailed: false
      };
    }
    return {
      isTakedown: false,
      reasonCategory: null,
      verificationFailed: false
    };
  } catch {
    return {
      isTakedown: false,
      reasonCategory: null,
      verificationFailed: true
    };
  }
}

export async function verifySharedBiographyPin(
  studentId: string,
  pin: string
): Promise<VerifySharedBiographyResult> {
  const cleanPin = pin.trim();
  if (!studentId || !/^[0-9]{4,8}$/.test(cleanPin)) {
    return {
      success: false,
      error: 'INVALID_PIN',
      remainingAttempts: 5
    };
  }

  const { data, error } = await supabase.rpc('verify_shared_biography_pin', {
    p_student_id: studentId,
    p_pin: cleanPin
  });

  if (error || !data || typeof data !== 'object') {
    return {
      success: false,
      error: error?.message || 'RPC_VERIFICATION_FAILED'
    };
  }

  const payload = data as Record<string, unknown>;
  if (payload.success !== true) {
    return {
      success: false,
      error: String(payload.error || 'INVALID_PIN'),
      isTakedown: payload.is_takedown === true,
      reasonCategory: typeof payload.reason_category === 'string' ? payload.reason_category : undefined,
      remainingAttempts: typeof payload.remaining_attempts === 'number' ? payload.remaining_attempts : undefined,
      lockedUntil: typeof payload.locked_until === 'string' ? payload.locked_until : null
    };
  }

  const studentInstrument =
    typeof payload.student_instrument === 'string' && payload.student_instrument.trim()
      ? payload.student_instrument.trim()
      : 'Instrumental- / Vokalunterricht';

  const playlist = normalizePlaylistSnapshot(payload.playlist, studentInstrument);
  const rawReactions =
    payload.reactions && typeof payload.reactions === 'object'
      ? (payload.reactions as Record<string, ReactionCounts>)
      : {};

  return {
    success: true,
    studentName:
      typeof payload.student_name === 'string' && payload.student_name.trim()
        ? payload.student_name.trim()
        : 'Musikschüler/in',
    studentInstrument,
    schoolName:
      typeof payload.school_name === 'string' && payload.school_name.trim()
        ? payload.school_name.trim()
        : 'Musikschule',
    avatarPresetId: typeof payload.avatar_preset_id === 'string' ? payload.avatar_preset_id : undefined,
    avatarColor: typeof payload.avatar_color === 'string' ? payload.avatar_color : undefined,
    playlist,
    reactions: rawReactions
  };
}

export async function recordSharedBiographyReaction(
  studentId: string,
  pin: string,
  itemId: string,
  reactionType: ReactionKey
): Promise<{ success: boolean; reactions?: Record<string, ReactionCounts> }> {
  const { data, error } = await supabase.rpc('record_shared_biography_reaction', {
    p_student_id: studentId,
    p_pin: pin.trim(),
    p_item_id: itemId,
    p_reaction_type: reactionType
  });

  if (error || !data || typeof data !== 'object') {
    return { success: false };
  }

  const payload = data as Record<string, unknown>;
  if (payload.success !== true) {
    return { success: false };
  }

  return {
    success: true,
    reactions:
      payload.reactions && typeof payload.reactions === 'object'
        ? (payload.reactions as Record<string, ReactionCounts>)
        : undefined
  };
}

export async function upsertSharedBiographyLink(params: {
  studentId: string;
  pin: string;
  studentDisplayName?: string;
  studentInstrument?: string;
  schoolDisplayName?: string;
  avatarPresetId?: string;
  avatarColor?: string;
  playlistSnapshot?: unknown[];
}): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('upsert_shared_biography_link', {
    p_student_id: params.studentId,
    p_pin: params.pin.trim(),
    p_student_display_name: params.studentDisplayName ?? null,
    p_student_instrument: params.studentInstrument ?? null,
    p_school_display_name: params.schoolDisplayName ?? null,
    p_avatar_preset_id: params.avatarPresetId ?? null,
    p_avatar_color: params.avatarColor ?? null,
    p_playlist_snapshot: params.playlistSnapshot ?? null
  });

  if (error || !data || typeof data !== 'object') {
    return {
      success: false,
      error: error?.message || 'UPSERT_FAILED'
    };
  }

  const payload = data as Record<string, unknown>;
  return {
    success: payload.success === true,
    error: typeof payload.error === 'string' ? payload.error : undefined
  };
}

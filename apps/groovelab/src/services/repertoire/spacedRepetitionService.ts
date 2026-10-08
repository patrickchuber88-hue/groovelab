/**
 * 🧠 Spaced Repetition Practice Cycle (0,1% Enterprise Goldstandard)
 * Bounded Context: GrooveLab / Repertoire-Gedächtnis
 * 
 * Intervall-Stufen nach wissenschaftlicher Vergessenskurve (Ebbinghaus):
 * - Stufe 1: 4 Wochen (28 Tage)  - Kurzzeit-Festigung
 * - Stufe 2: 12 Wochen (84 Tage) - Mittelfristige Konsolidierung (~3 Monate)
 * - Stufe 3: 26 Wochen (182 Tage)- Halbjahres-Repertoire (~6 Monate)
 * - Stufe 4: 52 Wochen (365 Tage)- Jahres-Klassiker (~1 Jahr)
 * - Stufe 5: Dauerhaftes Meister-Repertoire
 */

export type SpacedRepetitionStage = 1 | 2 | 3 | 4 | 5;

export interface SongRepetitionState {
  songId: string;
  stage: SpacedRepetitionStage;
  lastReviewedAt: string; // ISO 8601
  nextReviewAt: string;   // ISO 8601
  historyCount: number;
}

export interface SongRepetitionSummary {
  songId: string;
  stage: SpacedRepetitionStage;
  stageLabel: string;
  stageBadge: string;
  isDue: boolean;
  daysUntilDue: number;
  lastReviewedAt: string;
  nextReviewAt: string;
}

export const STAGE_INTERVAL_DAYS: Record<SpacedRepetitionStage, number> = {
  1: 28,  // 4 Wochen
  2: 84,  // 12 Wochen
  3: 182, // 26 Wochen
  4: 365, // 52 Wochen
  5: 365  // Dauerhaftes Meisterwerk (jährlicher Check)
};

export const STAGE_LABELS: Record<SpacedRepetitionStage, string> = {
  1: '4 Wochen (Festigung)',
  2: '12 Wochen (Konsolidierung)',
  3: '26 Wochen (Halbjahres-Check)',
  4: '52 Wochen (Jahres-Klassiker)',
  5: 'Meister-Repertoire'
};

export const STAGE_SHORT_BADGES: Record<SpacedRepetitionStage, string> = {
  1: '4W',
  2: '12W',
  3: '26W',
  4: '52W',
  5: '★'
};

const STORAGE_PREFIX = 'cg_spaced_rep_';

/**
 * Lädt alle Wiederholungs-Zustände eines Schülers aus dem sicheren Client-Cache
 */
export function loadRepetitionStates(studentId: string): Record<string, SongRepetitionState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${studentId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (err) {
    console.warn('[SpacedRepetitionService] Failed to load repetition states:', err);
    return {};
  }
}

/**
 * Persistiert Wiederholungs-Zustände eines Schülers
 */
export function saveRepetitionStates(
  studentId: string,
  states: Record<string, SongRepetitionState>
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${studentId}`, JSON.stringify(states));
  } catch (err) {
    console.warn('[SpacedRepetitionService] Failed to save repetition states:', err);
  }
}

/**
 * Ermittelt die Wiederholungs-Zusammenfassung für einen einzelnen Song
 */
export function getSongRepetitionSummary(
  songId: string,
  studentId: string,
  initialMasteryDate?: string | Date
): SongRepetitionSummary {
  const states = loadRepetitionStates(studentId);
  const now = new Date();
  let state = states[songId];

  if (!state) {
    // Initialisierung bei Erstabschluss
    const baseDate = initialMasteryDate ? new Date(initialMasteryDate) : new Date();
    const nextDate = new Date(baseDate.getTime() + STAGE_INTERVAL_DAYS[1] * 24 * 60 * 60 * 1000);
    state = {
      songId,
      stage: 1,
      lastReviewedAt: baseDate.toISOString(),
      nextReviewAt: nextDate.toISOString(),
      historyCount: 0
    };
    states[songId] = state;
    saveRepetitionStates(studentId, states);
  }

  const nextReviewDate = new Date(state.nextReviewAt);
  const diffTime = nextReviewDate.getTime() - now.getTime();
  const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isDue = daysUntilDue <= 0;

  return {
    songId,
    stage: state.stage,
    stageLabel: STAGE_LABELS[state.stage],
    stageBadge: STAGE_SHORT_BADGES[state.stage],
    isDue,
    daysUntilDue,
    lastReviewedAt: state.lastReviewedAt,
    nextReviewAt: state.nextReviewAt
  };
}

/**
 * Befördert einen gemeisterten Song in die nächste Stufe („Sitzt! ✓“)
 */
export function advanceSongRepetition(
  songId: string,
  studentId: string
): SongRepetitionSummary {
  const states = loadRepetitionStates(studentId);
  const current = states[songId] || {
    songId,
    stage: 1,
    lastReviewedAt: new Date().toISOString(),
    nextReviewAt: new Date().toISOString(),
    historyCount: 0
  };

  const nextStage: SpacedRepetitionStage = (Math.min(current.stage + 1, 5)) as SpacedRepetitionStage;
  const now = new Date();
  const nextIntervalDays = STAGE_INTERVAL_DAYS[nextStage];
  const nextReviewDate = new Date(now.getTime() + nextIntervalDays * 24 * 60 * 60 * 1000);

  const updated: SongRepetitionState = {
    songId,
    stage: nextStage,
    lastReviewedAt: now.toISOString(),
    nextReviewAt: nextReviewDate.toISOString(),
    historyCount: current.historyCount + 1
  };

  states[songId] = updated;
  saveRepetitionStates(studentId, states);

  return getSongRepetitionSummary(songId, studentId);
}

/**
 * Setzt einen Song bei Unsicherheit sanft zurück auf Stufe 1 („Braucht Übung ↺“)
 */
export function resetSongRepetition(
  songId: string,
  studentId: string
): SongRepetitionSummary {
  const states = loadRepetitionStates(studentId);
  const now = new Date();
  const nextReviewDate = new Date(now.getTime() + STAGE_INTERVAL_DAYS[1] * 24 * 60 * 60 * 1000);

  const updated: SongRepetitionState = {
    songId,
    stage: 1,
    lastReviewedAt: now.toISOString(),
    nextReviewAt: nextReviewDate.toISOString(),
    historyCount: (states[songId]?.historyCount || 0) + 1
  };

  states[songId] = updated;
  saveRepetitionStates(studentId, states);

  return getSongRepetitionSummary(songId, studentId);
}

/**
 * Aggregiert alle fälligen und stabilen Songs des Repertoires
 */
export function getRepertoireMetrics(
  repertoireSongs: any[],
  studentId: string
): {
  totalCount: number;
  dueSongs: Array<{ song: any; summary: SongRepetitionSummary }>;
  upcomingSongs: Array<{ song: any; summary: SongRepetitionSummary }>;
  masteryCount: number;
  retentionRatePercent: number;
} {
  if (!repertoireSongs || repertoireSongs.length === 0) {
    return {
      totalCount: 0,
      dueSongs: [],
      upcomingSongs: [],
      masteryCount: 0,
      retentionRatePercent: 100
    };
  }

  const dueSongs: Array<{ song: any; summary: SongRepetitionSummary }> = [];
  const upcomingSongs: Array<{ song: any; summary: SongRepetitionSummary }> = [];
  let masteryCount = 0;

  for (const song of repertoireSongs) {
    const songId = song.song_id || song.id;
    if (!songId) continue;

    const summary = getSongRepetitionSummary(songId, studentId, song.created_at || song.updated_at);
    if (summary.stage === 5) {
      masteryCount++;
    }

    if (summary.isDue) {
      dueSongs.push({ song, summary });
    } else {
      upcomingSongs.push({ song, summary });
    }
  }

  // Retention Rate: Anteil der Songs, die stabil (nicht überfällig) sind
  const totalCount = repertoireSongs.length;
  const stableCount = totalCount - dueSongs.length;
  const retentionRatePercent = totalCount > 0 ? Math.round((stableCount / totalCount) * 100) : 100;

  return {
    totalCount,
    dueSongs,
    upcomingSongs,
    masteryCount,
    retentionRatePercent
  };
}

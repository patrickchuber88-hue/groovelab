/**
 * 🏛️ Campus-Groovelab Meisterwerk Homework Token Helper (0,1% Goldstandard)
 * apps/groovelab/src/components/student/meisterwerk/hooks/meisterwerkHomeworkTokenHelper.ts
 *
 * Monolith Ceiling Conformance: Autarke Hilfsfunktionen zur Erkennung und verlustfreien
 * Zusammenführung von didaktischen Spezial-Tokens (Audio, Loops, MicroScores, Fragen, etc.).
 */

export function isSpecialHomeworkToken(n: unknown): boolean {
  if (typeof n !== 'string') return false;
  return (
    n.startsWith('AUDIO:') ||
    n.startsWith('SNAPSHOT_') ||
    n.startsWith('MICROSCORE:') ||
    n.startsWith('LOOP:') ||
    n.startsWith('STUDENT_QUESTION:') ||
    n.startsWith('STICKER:') ||
    n.startsWith('FEEDBACK:') ||
    n.startsWith('STUDENT_NOTE_') ||
    n.startsWith('WORLDTOUR_MASTERY:') ||
    n.startsWith('EARLAB_SCORE:')
  );
}

export function mergeSpecialHomeworkToken(targetList: string[], token: string): void {
  if (!isSpecialHomeworkToken(token)) return;

  if (token.startsWith('SNAPSHOT_LEHRWERKE:') || token.startsWith('SNAPSHOT_SONGS:')) {
    const prefix = token.startsWith('SNAPSHOT_LEHRWERKE:') ? 'SNAPSHOT_LEHRWERKE:' : 'SNAPSHOT_SONGS:';
    if (!targetList.some(m => typeof m === 'string' && m.startsWith(prefix))) {
      targetList.push(token);
    }
  } else if (!targetList.includes(token)) {
    targetList.push(token);
  }
}

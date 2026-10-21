/**
 * 🏛️ Campus-Groovelab Micro-Score Studio (0,1% Goldstandard)
 * microScoreActiveNotesHelper.ts
 * 
 * 100% Audio-Synchrone Visual-Sustain & Polyphonie-Engine:
 * Berechnet für jeden Zeitpunkt exakt die Noten, deren musikalisches Kling-Intervall
 * [noteStart, noteStart + durationSixteenths) aktiv ist — inklusive mehrstimmiger Haltenoten (Polyphonie)
 * und exakter Triolen-Attack-Erkennung.
 */

import { MicroScoreSnippet, MicroScoreNote } from './microScore.types';
import { durationToSixteenthCount, getTimeSignatureFractions } from './microScoreGridEngine';

export function calculateActiveMicroScoreNotes(
  snippet: MicroScoreSnippet,
  isPlaying: boolean,
  playheadPos: { bar: number; fraction: number } | undefined,
  activeBar: number,
  activeFraction: number
): MicroScoreNote[] {
  if (!snippet.notes || snippet.notes.length === 0) return [];

  const fractionsPerBar = getTimeSignatureFractions(snippet.timeSignature);
  const targetBar = isPlaying && playheadPos ? playheadPos.bar : activeBar;
  const targetFrac = isPlaying && playheadPos ? playheadPos.fraction : activeFraction;
  const currentAbsFraction = targetBar * fractionsPerBar + targetFrac;

  // Filtere alle gepitchten Noten (keine Pausen), die zum aktuellen Zeitpunkt (oder am Cursor) aktiv klingen
  return snippet.notes.filter(n => {
    if (!n.pitch || n.pitch === 'REST') return false;

    const noteStart = n.barIndex * fractionsPerBar + n.beatFraction;
    const noteLen = durationToSixteenthCount(n.duration, n.isDotted, n.isTriplet);
    const noteEnd = noteStart + noteLen;

    // 1. Exakter Attack-Treffer (inkl. Triolen-Brüche wie 1.33 / 2.66 auf dem 16tel-Scheduler-Grid)
    const isAtAttack = n.barIndex === targetBar && Math.abs(n.beatFraction - targetFrac) < 0.5;
    if (isAtAttack) return true;

    // 2. Mehrstimmiges Sustain-Fenster: Note wurde früher angeschlagen und klingt über diesen Schlag hinweg weiter
    return currentAbsFraction >= noteStart && currentAbsFraction < noteEnd - 0.1;
  });
}

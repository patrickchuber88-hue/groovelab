/**
 * 🏛️ Campus-Groovelab Micro-Score Studio (0,1% Goldstandard)
 * microScoreActiveNotesHelper.ts
 * 
 * Lückenlose Visual Sustain & Legato-Engine (Halten bis zum nächsten Ton).
 * Berechnet aktiv klingende Noten und Polyphonie-Ereignisse für Instrumenten-Visualizer.
 */

import { MicroScoreSnippet, MicroScoreNote } from './microScore.types';

export function calculateActiveMicroScoreNotes(
  snippet: MicroScoreSnippet,
  isPlaying: boolean,
  playheadPos: { bar: number; fraction: number } | undefined,
  activeBar: number,
  activeFraction: number
): MicroScoreNote[] {
  const fractionsPerBar = snippet.timeSignature === '3/4' || snippet.timeSignature === '6/8' ? 12 : snippet.timeSignature === '2/4' ? 8 : 16;
  const targetBar = isPlaying && playheadPos ? playheadPos.bar : activeBar;
  const targetFrac = isPlaying && playheadPos ? playheadPos.fraction : activeFraction;
  const currentAbsFraction = targetBar * fractionsPerBar + targetFrac;
  const totalSnippetFractions = snippet.barsCount * fractionsPerBar;

  if (!snippet.notes || snippet.notes.length === 0) return [];

  // Sortiere alle Noten chronologisch nach absolutem Startzeitpunkt
  const sortedNotes = [...snippet.notes].sort((a, b) => {
    const aAbs = a.barIndex * fractionsPerBar + a.beatFraction;
    const bAbs = b.barIndex * fractionsPerBar + b.beatFraction;
    return aAbs - bAbs;
  });

  // Gruppiere nach eindeutigen Startzeitpunkten (für simultane Akkorde)
  const events: Array<{ absTime: number; notes: MicroScoreNote[] }> = [];
  sortedNotes.forEach(n => {
    const absTime = n.barIndex * fractionsPerBar + n.beatFraction;
    const last = events[events.length - 1];
    if (last && Math.abs(last.absTime - absTime) < 0.25) {
      last.notes.push(n);
    } else {
      events.push({ absTime, notes: [n] });
    }
  });

  if (events.length === 0) return [];

  // Vor dem allerersten Ton
  if (currentAbsFraction < events[0].absTime) {
    return [];
  }

  // Finde das aktive Intervall [T_k, T_k+1)
  let activeEventIndex = -1;
  for (let i = 0; i < events.length; i++) {
    const eventStart = events[i].absTime;
    const nextEventStart = i + 1 < events.length ? events[i + 1].absTime : totalSnippetFractions;

    if (currentAbsFraction >= eventStart && currentAbsFraction < nextEventStart) {
      activeEventIndex = i;
      break;
    }
  }

  // Falls am/hinter dem letzten Event, aber noch innerhalb des Schnipsels
  if (activeEventIndex === -1 && currentAbsFraction >= events[events.length - 1].absTime && currentAbsFraction < totalSnippetFractions) {
    activeEventIndex = events.length - 1;
  }

  if (activeEventIndex === -1) return [];

  const activeNotes = events[activeEventIndex].notes;
  return activeNotes.filter(n => n.pitch && n.pitch !== 'REST');
}

/**
 * 🏛️ Campus-Groovelab Micro-Score Studio (1–4 Takte)
 * microScoreGridEngine.ts
 * 
 * 2027 0,1% Apple & Music-EdTech Goldstandard Grid-Engine:
 * - Dynamische Berechnung freier Beat-Slots bis zum Taktende
 * - Rhythmische Metamorphose beim Umschalten von Notenwerten
 * - ADSR-Klangdauer gekoppelt an BPM und Zählzeit (Viertel klingen wie Viertel)
 * - VdM / Boomwhacker Farbmodelle & Notennamen im Notenkopf
 * - Quantisierter Melodischer Auto-Advance & Smart-Snapping
 */

import { MicroScoreDuration, MicroScoreNote, MicroScoreTimeSignature } from './microScore.types';

export interface MicroScoreGridSlot {
  barIndex: number;
  fraction: number;           // 0..15 bei 4/4
  durationSixteenths: number; // Z.B. 4 für Viertel, 2 für Achtel
  duration: MicroScoreDuration;
  beatLabel: string;          // Z.B. "1", "2", "3", "4" oder "+", "e", "a"
  isOccupied: boolean;
  hasRest: boolean;
  notes: MicroScoreNote[];    // Gesetzte Noten in diesem Slot
  isCursorHere: boolean;
  isAvailable: boolean;       // Passt der aktive Notenwert hier legal hinein?
}

export interface MeasureProgressInfo {
  totalBeats: number;         // Z.B. 4 bei 4/4
  occupiedSixteenths: number; // 0..16
  filledBeats: number;        // 0..4 (gerundet)
  segments: boolean[];        // [true, true, false, false]
  isFull: boolean;
  label: string;              // "2 / 4 Schläge" oder "✓ Voll"
}

// 🎼 Sechzehntel-Ticks pro Taktart
export function getTimeSignatureFractions(timeSignature: MicroScoreTimeSignature): number {
  switch (timeSignature) {
    case '4/4': return 16;
    case '3/4': return 12;
    case '2/4': return 8;
    case '6/8': return 12;
    default: return 16;
  }
}

// 🎼 Umrechnung Notenwert -> Sechzehntel-Einheiten
export function durationToSixteenthCount(
  duration: MicroScoreDuration,
  isDotted: boolean = false,
  isTriplet: boolean = false
): number {
  let base = 4;
  switch (duration) {
    case '1': base = 16; break;
    case '2': base = 8; break;
    case '4': base = 4; break;
    case '8': base = 2; break;
    case '16': base = 1; break;
  }
  if (isTriplet) return Math.max(1, Math.round((base * 2) / 3));
  if (isDotted) return Math.floor(base * 1.5);
  return base;
}

// 🔊 0,1% Akustische Zählzeit-Dauer (ADSR)
// Berechnet die echte physikalische Klangdauer in Sekunden,
// damit Viertel wie Viertel klingen und Achtel wie Achtel!
export function getDidacticNoteDurationSec(
  duration: MicroScoreDuration,
  bpm: number,
  isDotted: boolean = false,
  isTriplet: boolean = false
): number {
  const safeBpm = Math.max(40, Math.min(240, bpm || 80));
  const sixteenthSec = 60 / (safeBpm * 4);
  const sixteenths = durationToSixteenthCount(duration, isDotted, isTriplet);
  
  // 90% Gate-Zeit für natürliches Sustain + 10% Atempause
  const rawDuration = sixteenths * sixteenthSec * 0.90;
  return Math.max(0.12, Math.min(4.5, rawDuration));
}

// 🎨 Pädagogische Farben (VdM & Boomwhacker Standard)
export const BOOMWHACKER_COLORS: Record<string, { bg: string; border: string; glow: string; text: string }> = {
  'C':  { bg: '#fee2e2', border: '#ef4444', glow: 'rgba(239, 68, 68, 0.35)', text: '#b91c1c' }, // Rot
  'C#': { bg: '#fee2e2', border: '#f87171', glow: 'rgba(248, 113, 113, 0.35)', text: '#b91c1c' },
  'D':  { bg: '#ffedd5', border: '#f97316', glow: 'rgba(249, 115, 22, 0.35)', text: '#c2410c' }, // Orange
  'D#': { bg: '#ffedd5', border: '#fb923c', glow: 'rgba(251, 146, 60, 0.35)', text: '#c2410c' },
  'E':  { bg: '#fef9c3', border: '#eab308', glow: 'rgba(234, 179, 8, 0.35)', text: '#854d0e' },  // Gelb
  'F':  { bg: '#dcfce7', border: '#22c55e', glow: 'rgba(34, 197, 94, 0.35)', text: '#15803d' },  // Hellgrün
  'F#': { bg: '#d1fae5', border: '#10b981', glow: 'rgba(16, 185, 129, 0.35)', text: '#047857' }, // Smaragd
  'G':  { bg: '#cffafe', border: '#06b6d4', glow: 'rgba(6, 182, 212, 0.35)', text: '#0e7490' },  // Türkis
  'G#': { bg: '#e0f2fe', border: '#0ea5e9', glow: 'rgba(14, 165, 233, 0.35)', text: '#0369a1' },
  'A':  { bg: '#dbeafe', border: '#3b82f6', glow: 'rgba(59, 130, 246, 0.35)', text: '#1d4ed8' },  // Blau
  'A#': { bg: '#e0e7ff', border: '#6366f1', glow: 'rgba(99, 102, 241, 0.35)', text: '#4338ca' }, // Indigo
  'B':  { bg: '#f3e8ff', border: '#a855f7', glow: 'rgba(168, 85, 247, 0.35)', text: '#7e22ce' },  // Violett (H)
  'H':  { bg: '#f3e8ff', border: '#a855f7', glow: 'rgba(168, 85, 247, 0.35)', text: '#7e22ce' }
};

// Extrahiert den reinen Notennamen zur Beschriftung (z.B. C4 -> "C", F#5 -> "F♯")
export function getPitchLetter(pitch: string): string {
  if (!pitch || pitch === 'REST') return '';
  const match = pitch.trim().toUpperCase().match(/^([A-G][#B]?)/);
  if (!match) return '';
  let name = match[1];
  if (name === 'B') name = 'H';
  name = name.replace('#', '♯').replace('B', '♭');
  return name;
}

export function getPitchColorTheme(pitch: string) {
  if (!pitch || pitch === 'REST') {
    return { bg: '#f1f5f9', border: '#94a3b8', glow: 'rgba(148, 163, 184, 0.25)', text: '#475569' };
  }
  const match = pitch.trim().toUpperCase().match(/^([A-G][#B]?)/);
  const baseKey = match ? match[1].replace('DB', 'C#').replace('EB', 'D#').replace('GB', 'F#').replace('AB', 'G#').replace('BB', 'A#') : 'C';
  return BOOMWHACKER_COLORS[baseKey] || BOOMWHACKER_COLORS['C'];
}

// Generiert das Beat-Label (z.B. "1", "2", "3", "4" oder "+", "e", "a")
export function getBeatLabel(fraction: number, timeSignature: MicroScoreTimeSignature, stepSize: number): string {
  // 1. Taktarten mit 3er-Gruppierung (6/8 Takt: 12 Sechzehntel = 6 Achtel)
  if (timeSignature === '6/8') {
    const eighthBeat = Math.floor(fraction / 2) + 1;
    return fraction % 2 === 0 ? `${eighthBeat}` : '+';
  }

  // 2. Viertelbasierte Taktarten (4/4, 3/4, 2/4): 4 Sechzehntel = 1 Beat
  const beatNumber = Math.floor(fraction / 4) + 1;
  const subFraction = fraction % 4; // 0 = Hauptschlag, 1 = e, 2 = +, 3 = a

  // A) PRIORITÄT 1: OFF-BEAT STARTS (Synkopen und Teilschläge)
  // Ein Ton, der auf einem Offbeat beginnt (z. B. auf 1+, 2+, 3+, 4+),
  // darf NIEMALS als Hauptschlag (1, 2, 3...) deklariert werden!
  if (subFraction !== 0) {
    if (subFraction === 2) return '+';
    if (subFraction === 1) return 'e';
    if (subFraction === 3) return 'a';
  }

  // B) PRIORITÄT 2: MEHRSCHLÄGIGE NOTEN AUF DEM ON-BEAT (subFraction === 0)
  if (stepSize >= 16) {
    return '1–4'; // Ganze Note im 4/4
  }
  if (stepSize >= 12) {
    return `${beatNumber}–${beatNumber + 2}`; // Punktierte Halbe (z. B. 1–3 in 3/4 oder 4/4)
  }
  if (stepSize >= 8) {
    return `${beatNumber}–${beatNumber + 1}`; // Halbe Note (z. B. 1–2, 2–3, 3–4)
  }

  // C) REGULÄRER START AUF DEM SCHLAG (Viertel, Achtel, 16tel)
  return `${beatNumber}`;
}

// 🎼 Hauptberechnung: Freie Beat-Slots bis zum Taktende
export function calculateMeasureBeatSlots(
  notes: MicroScoreNote[],
  barIndex: number,
  timeSignature: MicroScoreTimeSignature,
  activeDuration: MicroScoreDuration,
  activeFraction: number,
  isDotted: boolean = false,
  isTriplet: boolean = false
): MicroScoreGridSlot[] {
  const totalFractions = getTimeSignatureFractions(timeSignature);
  const activeStep = durationToSixteenthCount(activeDuration, isDotted, isTriplet);
  const barNotes = notes.filter(n => n.barIndex === barIndex);
  
  const slots: MicroScoreGridSlot[] = [];
  let curFraction = 0;

  while (curFraction < totalFractions) {
    // Gibt es an curFraction eine oder mehrere Noten?
    const notesAtSlot = barNotes.filter(
      n => Math.abs(n.beatFraction - curFraction) < 0.5
    );

    if (notesAtSlot.length > 0) {
      // Slot ist besetzt!
      const primaryNote = notesAtSlot[0];
      const occDuration = primaryNote.duration;
      const occStep = durationToSixteenthCount(occDuration, primaryNote.isDotted, primaryNote.isTriplet);
      const isRest = notesAtSlot.every(n => n.pitch === 'REST');

      slots.push({
        barIndex,
        fraction: curFraction,
        durationSixteenths: occStep,
        duration: occDuration,
        beatLabel: getBeatLabel(curFraction, timeSignature, occStep),
        isOccupied: true,
        hasRest: isRest,
        notes: notesAtSlot,
        isCursorHere: Math.abs(activeFraction - curFraction) < 0.5,
        isAvailable: true
      });

      curFraction += Math.max(1, occStep);
    } else {
      // Prüfen, ob dieser Punkt von einer vorherigen Note überdeckt wird
      const isCovered = barNotes.some(n => {
        const noteStep = durationToSixteenthCount(n.duration, n.isDotted, n.isTriplet);
        return curFraction > n.beatFraction && curFraction < n.beatFraction + noteStep;
      });

      if (isCovered) {
        curFraction += 1;
        continue;
      }

      // Freier Slot! Kann hier der aktive Notenwert platziert werden?
      const remainingFractions = totalFractions - curFraction;
      
      // Prüfe, ob eine nachfolgende Note im Weg steht
      const nextNote = barNotes
        .filter(n => n.beatFraction > curFraction)
        .sort((a, b) => a.beatFraction - b.beatFraction)[0];
      
      const availableSpace = nextNote ? nextNote.beatFraction - curFraction : remainingFractions;
      const canFitActive = availableSpace >= activeStep;
      const slotStep = canFitActive ? activeStep : Math.max(1, availableSpace);

      slots.push({
        barIndex,
        fraction: curFraction,
        durationSixteenths: slotStep,
        duration: canFitActive ? activeDuration : '16',
        beatLabel: getBeatLabel(curFraction, timeSignature, slotStep),
        isOccupied: false,
        hasRest: false,
        notes: [],
        isCursorHere: Math.abs(activeFraction - curFraction) < 0.5,
        isAvailable: canFitActive
      });

      curFraction += Math.max(1, slotStep);
    }
  }

  return slots;
}

// 🎯 Ermittelt den nächsten freien Beat-Slot für den Melodischen Auto-Advance
export function getNextFreeBeatSlot(
  slots: MicroScoreGridSlot[],
  currentFraction: number
): MicroScoreGridSlot | null {
  // Suche den nächsten Slot nach der aktuellen Position
  const subsequentSlots = slots.filter(s => s.fraction > currentFraction);
  const nextEmpty = subsequentSlots.find(s => !s.isOccupied);
  if (nextEmpty) return nextEmpty;
  
  // Wenn kein leerer mehr da ist, nimm den nächsten überhaupt
  if (subsequentSlots.length > 0) return subsequentSlots[0];
  
  return null; // Takt ist voll
}

// 📊 Ermittelt den grafischen Takt-Fortschritt (4-Segment-Pille)
export function getMeasureProgress(
  notes: MicroScoreNote[],
  barIndex: number,
  timeSignature: MicroScoreTimeSignature
): MeasureProgressInfo {
  const totalFractions = getTimeSignatureFractions(timeSignature);
  const totalBeats = timeSignature === '3/4' ? 3 : timeSignature === '2/4' ? 2 : timeSignature === '6/8' ? 6 : 4;
  const barNotes = notes.filter(n => n.barIndex === barIndex);
  
  // 🛡️ Polyphonie-Immunität: Wir markieren besetzte Fraktionen auf einem 16-Bit Grid,
  // damit simultane Noten (z. B. Kick + Hi-Hat auf Beat 1) nicht fälschlich doppelt gezählt werden!
  const occupiedGrid = new Array(totalFractions).fill(false);
  barNotes.forEach(n => {
    const start = Math.max(0, Math.min(totalFractions - 1, Math.round(n.beatFraction)));
    const len = durationToSixteenthCount(n.duration, n.isDotted, n.isTriplet);
    for (let f = start; f < Math.min(totalFractions, start + len); f++) {
      occupiedGrid[f] = true;
    }
  });

  const occupiedSixteenths = occupiedGrid.filter(Boolean).length;
  const isFull = occupiedSixteenths >= totalFractions;
  const filledBeats = Math.min(totalBeats, Math.round((occupiedSixteenths / 4) * 10) / 10);
  
  // 4 Segmente für Visualisierung
  const segments: boolean[] = [];
  const fractionsPerBeat = totalFractions / totalBeats;
  for (let b = 0; b < totalBeats; b++) {
    segments.push(occupiedSixteenths >= (b + 1) * fractionsPerBeat - 0.5);
  }

  return {
    totalBeats,
    occupiedSixteenths,
    filledBeats,
    segments,
    isFull,
    label: isFull ? '✓ Takt voll' : `${filledBeats} / ${totalBeats} Schläge`
  };
}

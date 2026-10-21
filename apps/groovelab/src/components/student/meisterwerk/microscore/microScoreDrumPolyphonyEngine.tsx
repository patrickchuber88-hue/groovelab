/**
 * 🏛️ Campus-Groovelab 0,1% Goldstandard Percussion Polyphony Engine
 * microScoreDrumPolyphonyEngine.tsx
 * 
 * Autarker Satellit für PAS-konformen (Percussive Arts Society) Schlagzeug-Notensatz:
 * - Strikte polyphone 2-Stimmigkeit nach Elaine Gould ("Behind Bars"):
 *   - Stimme 1 (Hände): Becken, Hi-Hat, Snare, Toms -> Hälse strikt nach OBEN (stemUp = true)
 *   - Stimme 2 (Füße): Bass Drum, Hi-Hat Pedal -> Hälse strikt nach UNTEN (stemUp = false)
 * - Komplementäre Pausengenerierung für unbesetzte Zählzeiten je Stimme
 * - Kanonische PAS-Tonhöhen- und Notenkopf-Klassifizierung
 * - Hält MicroScoreStaffNotation.tsx stabil unter 1.500 Zeilen (Monolith Ceiling)
 */

import React from 'react';
import { MicroScoreNote } from './microScore.types';
import { SMUFL_GLYPHS } from '../worldtour/worldTourMusicGlyphs';
import { renderStaffRest } from './microScoreRestRenderer';

// 🥁 Kanonischer PAS Percussion-Weltstandard (5 Linien à 12.5px: Linie 5 = 0, Linie 1 = 50)
// Crash (A5 = -12.5), Hi-Hat (G5 = -6.25), Ride (F5 = 0), High Tom (E5 = 6.25), Mid Tom (D5 = 12.5),
// Snare (C5 = 18.75), Floor Tom (A4 = 31.25), Kick (F4 = 43.75), Pedal Hi-Hat (D3/HIHAT_PEDAL = 56.25)
export const PERCUSSION_PITCH_Y: Record<string, number> = {
  'CRASH': -12.5, 'A5': -12.5,
  'HIHAT': -6.25, 'HH': -6.25, 'G5': -6.25, 'G4': -6.25, 'F#4': -6.25, 'GB4': -6.25,
  'HIHAT_OPEN': -6.25, 'OPEN_HIHAT': -6.25, 'G#5': -6.25, 'AB5': -6.25, 'A#4': -6.25, 'BB4': -6.25,
  'RIDE': 0, 'F5': 0,
  'TOM_HI': 6.25, 'TOM1': 6.25, 'E5': 6.25, 'E4': 6.25,
  'TOM_MID': 12.5, 'TOM2': 12.5, 'D5': 12.5, 'D4': 12.5,
  'SNARE': 18.75, 'SD': 18.75, 'C5': 18.75, 'C4': 18.75,
  'TOM_FLOOR': 31.25, 'TOM3': 31.25, 'A4': 31.25, 'A3': 31.25, 'G3': 31.25,
  'KICK': 43.75, 'BD': 43.75, 'BASSDRUM': 43.75, 'F4': 43.75, 'C3': 43.75, 'B2': 43.75,
  'HIHAT_PEDAL': 56.25, 'HIHAT_FOOT': 56.25, 'PEDAL_HH': 56.25, 'D3': 56.25
};

/**
 * Ermittelt, ob ein Schlagzeug-Element als Becken (mit X-Notenkopf) notiert wird
 */
export function isCymbalPitch(pitch: string): boolean {
  if (!pitch) return false;
  const p = pitch.trim().toUpperCase();
  return (
    p === 'A5' || p === 'CRASH' ||
    p === 'G5' || p === 'G4' || p === 'F#4' || p === 'GB4' || p === 'HIHAT' || p === 'HH' ||
    p === 'G#5' || p === 'AB5' || p === 'A#4' || p === 'BB4' || p === 'HIHAT_OPEN' || p === 'OPEN_HIHAT' || p.includes('OPEN') ||
    p === 'F5' || p === 'RIDE' ||
    p === 'D3' || p === 'HIHAT_PEDAL' || p === 'HIHAT_FOOT' || p === 'PEDAL_HH'
  );
}

/**
 * Ermittelt, ob ein Schlagzeug-Element mit den Füßen gespielt wird (Stimme 2: Hälse strikt UNTEN)
 */
export function isDrumFootPitch(pitch: string): boolean {
  if (!pitch) return false;
  const p = pitch.trim().toUpperCase();
  return (
    p === 'F4' || p === 'KICK' || p === 'BD' || p === 'BASSDRUM' || p === 'C3' || p === 'B2' ||
    p === 'D3' || p === 'HIHAT_PEDAL' || p === 'HIHAT_FOOT' || p === 'PEDAL_HH'
  );
}

/**
 * Weist ein Schlagzeug-Element einer der beiden polyphonen Stimmen zu
 */
export function getDrumVoice(pitch: string): 'hands' | 'feet' {
  return isDrumFootPitch(pitch) ? 'feet' : 'hands';
}

export interface PolyphonicDrumSlot {
  handsNotes: MicroScoreNote[];
  feetNotes: MicroScoreNote[];
  handsRest?: { duration: string; y: number };
  feetRest?: { duration: string; y: number };
}

/**
 * Berechnet für einen Taktschlitz die polyphone Aufteilung in Hände und Füße
 * inklusive komplementärer Pausen (0,1% Gould-Goldstandard)
 */
export function analyzeDrumSlot(
  slotNotes: MicroScoreNote[],
  allBarNotes: MicroScoreNote[],
  barIdx: number,
  fractionIdx: number,
  timeSignature: string = '4/4'
): PolyphonicDrumSlot {
  const pitched = slotNotes.filter(n => n.pitch && n.pitch !== 'REST');
  const handsNotes = pitched.filter(n => !isDrumFootPitch(n.pitch));
  const feetNotes = pitched.filter(n => isDrumFootPitch(n.pitch));

  // Takt-Hauptraster: bei 3/4 [0, 4, 8], bei 4/4 [0, 4, 8, 12]
  const isQuarterBeat = fractionIdx % 4 === 0;

  let handsRest: { duration: string; y: number } | undefined;
  let feetRest: { duration: string; y: number } | undefined;

  // Wenn Noten im Takt vorhanden sind, aber in dieser Stimme an diesem Viertelschlag nichts gespielt wird:
  if (isQuarterBeat) {
    const hasAnyHandsInBar = allBarNotes.some(n => n.barIndex === barIdx && n.pitch && n.pitch !== 'REST' && !isDrumFootPitch(n.pitch));
    const hasAnyFeetInBar = allBarNotes.some(n => n.barIndex === barIdx && n.pitch && n.pitch !== 'REST' && isDrumFootPitch(n.pitch));

    // Hands-Pause: Wenn Hände an diesem Beat schweigen, aber im Takt aktiv sind
    if (handsNotes.length === 0 && hasAnyHandsInBar && feetNotes.length > 0) {
      const hasHandsOffbeatInSameBeat = allBarNotes.some(
        n =>
          n.barIndex === barIdx &&
          n.pitch &&
          n.pitch !== 'REST' &&
          !isDrumFootPitch(n.pitch) &&
          n.beatFraction > fractionIdx &&
          n.beatFraction < fractionIdx + 4
      );
      handsRest = { duration: hasHandsOffbeatInSameBeat ? '8' : '4', y: 18.75 }; // Obere Hälfte (3. Zwischenraum)
    }

    // 🥁 PAS / Gould Goldstandard: Für die Fuß-Stimme werden unter aktiven Händen KEINE künstlichen
    // Viertelpausen generiert, um visuelle Überlagerungen und Notensatz-Kollisionen auszuschließen.
  }

  return {
    handsNotes,
    feetNotes,
    handsRest,
    feetRest
  };
}

export interface DrumPieceColorDef {
  pieceId: string;
  label: string;
  shortBadge: string;
  shortCode: string;
  staffColor: string;
  stageFill: string;
  stageGlow: string;
}

// 🎨 0,1% Goldstandard 8-Sektoren-Maximal-Kontrast-Palette (100% disjunkt im Raum & auf den 5 Linien)
export const CANONICAL_DRUM_COLOR_GUIDE: Record<string, DrumPieceColorDef> = {
  snare: { pieceId: 'snare', label: 'Snare 14"', shortBadge: 'SNARE', shortCode: 'SN', staffColor: '#dc2626', stageFill: '#ef4444', stageGlow: '#f87171' },
  kick: { pieceId: 'kick', label: 'Bass Drum 22"', shortBadge: 'KICK', shortCode: 'BD', staffColor: '#7c3aed', stageFill: '#8b5cf6', stageGlow: '#a78bfa' },
  hihat: { pieceId: 'hihat', label: 'Hi-Hat 14"', shortBadge: 'HI-HAT', shortCode: 'HH', staffColor: '#0891b2', stageFill: '#06b6d4', stageGlow: '#22d3ee' },
  crash: { pieceId: 'crash', label: 'Crash 16"', shortBadge: 'CRASH', shortCode: 'CR', staffColor: '#ea580c', stageFill: '#f97316', stageGlow: '#fb923c' },
  ride: { pieceId: 'ride', label: 'Ride 20"', shortBadge: 'RIDE', shortCode: 'RD', staffColor: '#c026d3', stageFill: '#d946ef', stageGlow: '#e879f9' },
  tom_hi: { pieceId: 'tom_hi', label: 'High Tom 10"', shortBadge: 'HI-TOM', shortCode: 'HT', staffColor: '#34a853', stageFill: '#34a853', stageGlow: '#4ade80' },
  tom_mid: { pieceId: 'tom_mid', label: 'Mid Tom 12"', shortBadge: 'MID-TOM', shortCode: 'MT', staffColor: '#d97706', stageFill: '#facc15', stageGlow: '#facc15' },
  tom_floor: { pieceId: 'tom_floor', label: 'Standtom 16"', shortBadge: 'STANDTOM', shortCode: 'ST', staffColor: '#2563eb', stageFill: '#3b82f6', stageGlow: '#60a5fa' },
  hihat_pedal: { pieceId: 'hihat_pedal', label: 'Hi-Hat Fuß', shortBadge: 'HH-FUSS', shortCode: 'HF', staffColor: '#0891b2', stageFill: '#06b6d4', stageGlow: '#22d3ee' }
};

export function getCanonicalDrumPieceColor(pitch: string): DrumPieceColorDef {
  const p = (pitch || '').trim().toUpperCase();
  if (p === 'C5' || p === 'C4' || p === 'SD' || p === 'SNARE') return CANONICAL_DRUM_COLOR_GUIDE.snare;
  if (p === 'F4' || p === 'C3' || p === 'B2' || p === 'BD' || p === 'KICK') return CANONICAL_DRUM_COLOR_GUIDE.kick;
  if (p === 'A5' || p === 'C6' || p === 'CRASH') return CANONICAL_DRUM_COLOR_GUIDE.crash;
  if (p === 'F5' || p === 'RIDE') return CANONICAL_DRUM_COLOR_GUIDE.ride;
  if (p === 'E5' || p === 'E4' || p === 'TOM_HI' || p === 'TOM1') return CANONICAL_DRUM_COLOR_GUIDE.tom_hi;
  if (p === 'D5' || p === 'TOM_MID' || p === 'TOM2') return CANONICAL_DRUM_COLOR_GUIDE.tom_mid;
  if (p === 'A4' || p === 'A3' || p === 'G3' || p === 'TOM_FLOOR' || p === 'TOM3') return CANONICAL_DRUM_COLOR_GUIDE.tom_floor;
  if (p === 'D3' || p === 'HIHAT_PEDAL' || p === 'PEDAL_HH' || p === 'HIHAT_FOOT') return CANONICAL_DRUM_COLOR_GUIDE.hihat_pedal;
  return CANONICAL_DRUM_COLOR_GUIDE.hihat;
}

/**
 * 🥁 0,1% Goldstandard: Klarschrift-Bezeichnung für das schwebende Apple-Callout-Badge beim Noteneintragen
 */
export function getCanonicalDrumCalloutName(pitch: string): string {
  const p = (pitch || '').trim().toUpperCase();
  if (p === 'C5' || p === 'C4' || p === 'SD' || p === 'SNARE') return 'Snare';
  if (p === 'F4' || p === 'C3' || p === 'B2' || p === 'BD' || p === 'KICK') return 'Kick';
  if (p === 'A5' || p === 'C6' || p === 'CRASH') return 'Crash';
  if (p === 'F5' || p === 'RIDE') return 'Ride';
  if (p === 'E5' || p === 'E4' || p === 'TOM_HI' || p === 'TOM1') return 'High Tom';
  if (p === 'D5' || p === 'TOM_MID' || p === 'TOM2') return 'Mid Tom';
  if (p === 'A4' || p === 'A3' || p === 'G3' || p === 'TOM_FLOOR' || p === 'TOM3') return 'Standtom';
  if (p === 'D3' || p === 'HIHAT_PEDAL' || p === 'PEDAL_HH' || p === 'HIHAT_FOOT') return 'HH-Fuß';
  if (p === 'G#5' || p.includes('OPEN') || p === 'A#4') return 'Hi-Hat (offen)';
  return 'Hi-Hat';
}

export interface RenderDrumPolyphonySlotProps {
  slotNotes: MicroScoreNote[];
  allBarNotes: MicroScoreNote[];
  barIdx: number;
  fractionIdx: number;
  fractionX: number;
  staffTopY: number;
  timeSignature?: string;
  isCurrentlyPlaying: boolean;
  hitStatus?: 'hit' | 'near' | 'miss';
  isSelectedSlot: boolean;
  isPlaying: boolean;
  readOnly?: boolean;
  isDrumColorGuide?: boolean;
  getStaffY: (pitch: string, isBass: boolean, isDrum?: boolean) => number;
  measureWidth?: number;
  barStartX?: number;
}

interface DrumBeamColorSegment {
  x1: number;
  x2: number;
  color: string;
}

interface DrumBeamGroup {
  isPartOfBeam: boolean;
  isFirstInBeam: boolean;
  beamY: number;
  xStart: number;
  xEnd: number;
  hasSixteenth: boolean;
  secXStart?: number;
  secXEnd?: number;
  uniformColor?: string;
  primarySegments: DrumBeamColorSegment[];
  secondarySegments: DrumBeamColorSegment[];
}

/**
 * 🎼 0,1% Goldstandard Beaming Engine für Schlagzeug (Elaine Gould / PAS Standard):
 * Berechnet automatische Notenbalken für zusammenhängende 8tel- und 16tel-Gruppen im Beat
 * inklusive pro-Zählzeit farbcodierter Balkensegmente.
 */
function calculateDrumBeamGroup(
  allBarNotes: MicroScoreNote[],
  barIdx: number,
  fractionIdx: number,
  voice: 'hands' | 'feet',
  fractionX: number,
  staffTopY: number,
  getStaffY: (pitch: string, isBass: boolean, isDrum?: boolean) => number,
  barStartX?: number,
  measureWidth?: number,
  timeSignature: string = '4/4'
): DrumBeamGroup {
  // Metrische Gruppierung nach Elaine Gould ("Behind Bars"):
  // Im 6/8-Takt: 2 punktierte Viertelschläge à 3 Achtel (Gruppe 0: 0..5, Gruppe 1: 6..11)
  // Im 4/4- & 3/4-Takt: Viertelschläge à 4 Sechzehntel (0..3, 4..7, 8..11, 12..15)
  const groupSize = timeSignature === '6/8' ? 6 : 4;
  const beatIndex = Math.floor(fractionIdx / groupSize);
  const beatStart = beatIndex * groupSize;
  const beatEnd = beatStart + groupSize - 1;

  // Noten dieses Taktes für diese Stimme im aktuellen Beat
  const beatNotes = allBarNotes.filter(n => {
    if (n.barIndex !== barIdx || !n.pitch || n.pitch === 'REST') return false;
    const isFoot = isDrumFootPitch(n.pitch);
    if (voice === 'hands' && isFoot) return false;
    if (voice === 'feet' && !isFoot) return false;
    return n.beatFraction >= beatStart && n.beatFraction <= beatEnd;
  });

  const uniqueFractions = Array.from(new Set(beatNotes.map(n => n.beatFraction))).sort((a, b) => a - b);

  // 🎼 0,1% Goldstandard Beaming-Erkennung (Elaine Gould Behind Bars):
  // Eine Balkengruppe formiert sich, wenn mindestens 2 rhythmische Zählzeiten im Beat vorhanden sind:
  // Finde Zählzeiten mit schnellen Noten (Achtel '8' oder Sechzehntel '16')
  const beamableNotes = beatNotes.filter(n => n.duration === '8' || n.duration === '16');
  const beamableFractions = Array.from(new Set(beamableNotes.map(n => n.beatFraction))).sort((a, b) => a - b);

  // Wenn mindestens 2 Zählzeiten im Beat 8tel/16tel haben, oder alle Noten im Beat 8tel/16tel sind:
  const isBeamGroup = (beamableFractions.length >= 2) || (uniqueFractions.length >= 2 && beatNotes.every(n => n.duration === '8' || n.duration === '16'));
  const activeFractions = beamableFractions.length >= 2
    ? uniqueFractions.filter(f => beamableFractions.includes(f) || (f >= beamableFractions[0] && f <= beamableFractions[beamableFractions.length - 1]))
    : uniqueFractions;

  if (!isBeamGroup || !activeFractions.includes(fractionIdx)) {
    return {
      isPartOfBeam: false,
      isFirstInBeam: false,
      beamY: 0,
      xStart: 0,
      xEnd: 0,
      hasSixteenth: false,
      primarySegments: [],
      secondarySegments: []
    };
  }

  const totalFractionsInBar = timeSignature === '3/4' || timeSignature === '6/8' ? 12 : timeSignature === '2/4' ? 8 : 16;
  const getFracX = (f: number): number => {
    if (barStartX !== undefined && measureWidth !== undefined) {
      return barStartX + 12 + (f / totalFractionsInBar) * (measureWidth - 24);
    }
    return fractionX + (f - fractionIdx) * 22;
  };

  const getSlotAnchorColor = (f: number): string => {
    const notesAtF = beatNotes.filter(n => Math.abs(n.beatFraction - f) < 0.2);
    if (notesAtF.length === 0) return '#0891b2';
    const sortedAtF = [...notesAtF].sort((a, b) =>
      voice === 'hands'
        ? getStaffY(a.pitch, false, true) - getStaffY(b.pitch, false, true)
        : getStaffY(b.pitch, false, true) - getStaffY(a.pitch, false, true)
    );
    return getCanonicalDrumPieceColor(sortedAtF[0].pitch).staffColor;
  };

  const firstFrac = activeFractions[0];
  const lastFrac = activeFractions[activeFractions.length - 1];
  const stemOffset = voice === 'hands' ? 6.0 : -6.0;
  const xStart = getFracX(firstFrac) + stemOffset;
  const xEnd = getFracX(lastFrac) + stemOffset;

  let beamY = 0;
  if (voice === 'hands') {
    const minStaffRelY = Math.min(...beatNotes.map(n => getStaffY(n.pitch, false, true)));
    beamY = staffTopY + minStaffRelY - 26;
  } else {
    const maxStaffRelY = Math.max(...beatNotes.map(n => getStaffY(n.pitch, false, true)));
    beamY = staffTopY + maxStaffRelY + 26;
  }

  const primarySegments: DrumBeamColorSegment[] = [];
  for (let i = 0; i < activeFractions.length - 1; i++) {
    const f1 = activeFractions[i];
    const f2 = activeFractions[i + 1];
    const sx1 = getFracX(f1) + stemOffset;
    const sx2 = getFracX(f2) + stemOffset;
    const c1 = getSlotAnchorColor(f1);
    const c2 = getSlotAnchorColor(f2);
    if (c1 === c2) {
      primarySegments.push({ x1: sx1, x2: sx2, color: c1 });
    } else {
      const midX = (sx1 + sx2) / 2;
      primarySegments.push({ x1: sx1, x2: midX + 0.25, color: c1 });
      primarySegments.push({ x1: midX - 0.25, x2: sx2, color: c2 });
    }
  }

  const sixteenthNotes = beatNotes.filter(n => n.duration === '16');
  const sixteenthFractions = Array.from(new Set(sixteenthNotes.map(n => n.beatFraction))).sort((a, b) => a - b);
  const hasSixteenth = sixteenthFractions.length > 0;
  let secXStart: number | undefined;
  let secXEnd: number | undefined;
  const secondarySegments: DrumBeamColorSegment[] = [];

  if (sixteenthFractions.length >= 2) {
    secXStart = getFracX(sixteenthFractions[0]) + stemOffset;
    secXEnd = getFracX(sixteenthFractions[sixteenthFractions.length - 1]) + stemOffset;
    for (let i = 0; i < sixteenthFractions.length - 1; i++) {
      const sf1 = sixteenthFractions[i];
      const sf2 = sixteenthFractions[i + 1];
      const sx1 = getFracX(sf1) + stemOffset;
      const sx2 = getFracX(sf2) + stemOffset;
      const c1 = getSlotAnchorColor(sf1);
      const c2 = getSlotAnchorColor(sf2);
      if (c1 === c2) {
        secondarySegments.push({ x1: sx1, x2: sx2, color: c1 });
      } else {
        const midX = (sx1 + sx2) / 2;
        secondarySegments.push({ x1: sx1, x2: midX + 0.25, color: c1 });
        secondarySegments.push({ x1: midX - 0.25, x2: sx2, color: c2 });
      }
    }
  } else if (sixteenthFractions.length === 1) {
    const sFrac = sixteenthFractions[0];
    const sX = getFracX(sFrac) + stemOffset;
    const isAtEnd = sFrac === lastFrac;
    secXStart = isAtEnd ? sX - 9 : sX;
    secXEnd = isAtEnd ? sX : sX + 9;
    secondarySegments.push({
      x1: secXStart,
      x2: secXEnd,
      color: getSlotAnchorColor(sFrac)
    });
  }

  const uniqueColors = Array.from(new Set(beatNotes.map(n => getCanonicalDrumPieceColor(n.pitch).staffColor)));
  const uniformColor = uniqueColors.length === 1 ? uniqueColors[0] : undefined;

  return {
    isPartOfBeam: true,
    isFirstInBeam: firstFrac === fractionIdx,
    beamY,
    xStart,
    xEnd,
    hasSixteenth,
    secXStart,
    secXEnd,
    uniformColor,
    primarySegments,
    secondarySegments
  };
}

/**
 * 0,1% Goldstandard Renderer für polyphone Schlagzeugnoten (PAS-Standard):
 * Rendert Stimme 1 (Hände, Hälse ↑) und Stimme 2 (Füße, Hälse ↓) unabhängig voneinander
 * inklusive komplementärer Pausensymbole und Beaming
 */
export const renderDrumPolyphonySlot = ({
  slotNotes,
  allBarNotes,
  barIdx,
  fractionIdx,
  fractionX,
  staffTopY,
  timeSignature = '4/4',
  isCurrentlyPlaying,
  hitStatus,
  isSelectedSlot,
  isPlaying,
  readOnly = false,
  isDrumColorGuide = false,
  getStaffY,
  measureWidth,
  barStartX
}: RenderDrumPolyphonySlotProps): React.ReactElement => {
  const analysis = analyzeDrumSlot(slotNotes, allBarNotes, barIdx, fractionIdx, timeSignature);
  const { handsNotes, feetNotes, handsRest, feetRest } = analysis;

  const baseNoteColor = isCurrentlyPlaying && !isDrumColorGuide
    ? '#6366f1'
    : hitStatus === 'hit'
    ? '#10b981'
    : hitStatus === 'near'
    ? '#f59e0b'
    : '#0f172a';

  const getNoteHeadColor = (pitch: string): string => {
    if (hitStatus === 'hit') return '#10b981';
    if (hitStatus === 'near') return '#f59e0b';
    if (isDrumColorGuide) return getCanonicalDrumPieceColor(pitch).staffColor;
    return baseNoteColor;
  };

  return (
    <g id={`drum-polyphony-${barIdx}-${fractionIdx}`}>
      {/* 1. Komplementäre Pausen für Hände (oben) oder Füße (unten) */}
      {handsRest && (
        renderStaffRest({
          duration: (handsRest.duration as any) || '4',
          fractionX,
          staffTopY: staffTopY + handsRest.y - 25,
          color: '#475569',
          opacity: 0.88
        })
      )}
      {feetRest && (
        renderStaffRest({
          duration: (feetRest.duration as any) || '4',
          fractionX,
          staffTopY: staffTopY + feetRest.y - 25,
          color: '#475569',
          opacity: 0.88
        })
      )}

      {/* 2. Stimme 1: Hände (Becken, Hi-Hat, Snare, Toms) - Hälse nach OBEN */}
      {handsNotes.length > 0 && (() => {
        const sorted = [...handsNotes].sort((a, b) => getStaffY(b.pitch, false, true) - getStaffY(a.pitch, false, true));
        const staffYs = sorted.map(n => staffTopY + getStaffY(n.pitch, false, true));
        const minY = Math.min(...staffYs);
        const maxY = Math.max(...staffYs);
        const durationRank = (d: string) => d === '16' ? 1 : d === '8' ? 2 : d === '4' ? 3 : d === '2' ? 4 : 5;
        const duration = [...sorted].sort((a, b) => durationRank(a.duration) - durationRank(b.duration))[0]?.duration || sorted[0].duration;

        const beam = calculateDrumBeamGroup(
          allBarNotes,
          barIdx,
          fractionIdx,
          'hands',
          fractionX,
          staffTopY,
          getStaffY,
          barStartX,
          measureWidth,
          timeSignature
        );

        const stemTopY = beam.isPartOfBeam ? beam.beamY : (minY - 28);
        const topHandNote = sorted[sorted.length - 1] || sorted[0];
        const handsTopStemColor = isDrumColorGuide
          ? getNoteHeadColor(topHandNote.pitch)
          : baseNoteColor;
        const useSegmentedBeamColors = isDrumColorGuide && hitStatus !== 'hit' && hitStatus !== 'near';

        return (
          <g id={`hands-voice-${barIdx}-${fractionIdx}`}>
            {/* Primärer Notenbalken (Primary Beam) beim 1. Schlag der Gruppe - pro Zählzeit farbcodiert */}
            {beam.isFirstInBeam && (
              useSegmentedBeamColors && beam.primarySegments.length > 0 ? (
                beam.primarySegments.map((seg, sIdx) => (
                  <rect
                    key={`hands-pbeam-${sIdx}`}
                    x={seg.x1}
                    y={beam.beamY - 1.7}
                    width={Math.max(0.5, seg.x2 - seg.x1)}
                    height={3.4}
                    fill={seg.color}
                    rx={0.5}
                  />
                ))
              ) : (
                <rect
                  x={beam.xStart}
                  y={beam.beamY - 1.7}
                  width={beam.xEnd - beam.xStart}
                  height={3.4}
                  fill={handsTopStemColor}
                  rx={0.5}
                />
              )
            )}
            {/* Sekundärer Notenbalken (16tel-Beam) - pro Zählzeit farbcodiert */}
            {beam.isFirstInBeam && beam.hasSixteenth && beam.secXStart !== undefined && beam.secXEnd !== undefined && (
              useSegmentedBeamColors && beam.secondarySegments.length > 0 ? (
                beam.secondarySegments.map((seg, sIdx) => (
                  <rect
                    key={`hands-sbeam-${sIdx}`}
                    x={seg.x1}
                    y={beam.beamY + 4.5}
                    width={Math.max(0.5, seg.x2 - seg.x1)}
                    height={2.8}
                    fill={seg.color}
                    rx={0.5}
                  />
                ))
              ) : (
                <rect
                  x={beam.secXStart}
                  y={beam.beamY + 4.5}
                  width={beam.secXEnd - beam.secXStart}
                  height={2.8}
                  fill={handsTopStemColor}
                  rx={0.5}
                />
              )
            )}

            {sorted.map((n, idx) => {
              const nY = staffTopY + getStaffY(n.pitch, false, true);
              const isCymbal = isCymbalPitch(n.pitch);
              const isOpen = n.pitch === 'G#5' || n.pitch.includes('OPEN') || n.pitch === 'A#4';
              const headColor = getNoteHeadColor(n.pitch);

              return (
                <g key={`hands-note-${n.id || idx}`}>
                  {/* Hilfslinie oben für Crash-Becken (A5) */}
                  {nY <= staffTopY - 12.5 + 3.125 && (
                    <line
                      x1={fractionX - 11}
                      y1={staffTopY - 12.5}
                      x2={fractionX + 11}
                      y2={staffTopY - 12.5}
                      stroke="#0f172a"
                      strokeWidth="1.2"
                    />
                  )}

                  {/* Notenkopf */}
                  {isCymbal ? (
                    <g>
                      <line
                        x1={fractionX - 5.5}
                        y1={nY - 5}
                        x2={fractionX + 5.5}
                        y2={nY + 5}
                        stroke={headColor}
                        strokeWidth={isDrumColorGuide ? '2.7' : '2.4'}
                        strokeLinecap="round"
                      />
                      <line
                        x1={fractionX - 5.5}
                        y1={nY + 5}
                        x2={fractionX + 5.5}
                        y2={nY - 5}
                        stroke={headColor}
                        strokeWidth={isDrumColorGuide ? '2.7' : '2.4'}
                        strokeLinecap="round"
                      />
                      {isOpen && (
                        <circle
                          cx={fractionX}
                          cy={nY}
                          r="7.5"
                          fill="none"
                          stroke={headColor}
                          strokeWidth="1.6"
                        />
                      )}
                      {isDrumColorGuide && (
                        <text
                          x={fractionX}
                          y={nY + 2.0}
                          textAnchor="middle"
                          fontSize="5.4"
                          fontWeight="900"
                          fill={headColor}
                          stroke="#ffffff"
                          strokeWidth="2.4"
                          paintOrder="stroke"
                          fontFamily="system-ui, -apple-system, sans-serif"
                          style={{ pointerEvents: 'none' }}
                        >
                          {getCanonicalDrumPieceColor(n.pitch).shortCode}
                        </text>
                      )}
                    </g>
                  ) : (
                    <g>
                      <ellipse
                        cx={fractionX}
                        cy={nY}
                        rx={isDrumColorGuide ? '7.8' : '7.0'}
                        ry={isDrumColorGuide ? '5.5' : '5.0'}
                        transform={`rotate(-22 ${fractionX} ${nY})`}
                        fill={duration === '1' || duration === '2' ? '#ffffff' : headColor}
                        stroke={headColor}
                        strokeWidth={duration === '1' || duration === '2' ? '2.4' : '0.6'}
                      />
                      {isDrumColorGuide && (
                        <text
                          x={fractionX}
                          y={nY + 2.1}
                          textAnchor="middle"
                          fontSize="5.8"
                          fontWeight="900"
                          fill={duration === '1' || duration === '2' ? headColor : '#ffffff'}
                          fontFamily="system-ui, -apple-system, sans-serif"
                          style={{ pointerEvents: 'none' }}
                        >
                          {getCanonicalDrumPieceColor(n.pitch).shortCode}
                        </text>
                      )}
                    </g>
                  )}

                  {/* Augmentations-Punkt (Dotted Note) */}
                  {n.isDotted && (
                    <circle
                      cx={fractionX + 11.5}
                      cy={nY}
                      r="2.2"
                      fill={headColor}
                    />
                  )}
                </g>
              );
            })}

            {/* Hals nach OBEN (Stimme 1: Hände) - pro Instrument segmentiert farbcodiert */}
            {duration !== '1' && (
              isDrumColorGuide && sorted.length > 1 ? (
                <g>
                  {sorted.slice(0, -1).map((noteSeg, segIdx) => {
                    const ySegStart = staffTopY + getStaffY(noteSeg.pitch, false, true);
                    const ySegEnd = staffTopY + getStaffY(sorted[segIdx + 1].pitch, false, true);
                    return (
                      <line
                        key={`hands-stem-seg-${segIdx}`}
                        x1={fractionX + 6.0}
                        y1={ySegStart}
                        x2={fractionX + 6.0}
                        y2={ySegEnd}
                        stroke={getNoteHeadColor(noteSeg.pitch)}
                        strokeWidth="1.65"
                      />
                    );
                  })}
                  <line
                    x1={fractionX + 6.0}
                    y1={minY}
                    x2={fractionX + 6.0}
                    y2={stemTopY}
                    stroke={handsTopStemColor}
                    strokeWidth="1.65"
                  />
                </g>
              ) : (
                <line
                  x1={fractionX + 6.0}
                  y1={maxY}
                  x2={fractionX + 6.0}
                  y2={stemTopY}
                  stroke={handsTopStemColor}
                  strokeWidth="1.65"
                />
              )
            )}

            {/* Nur wenn NICHT gebalkt: Einzel-Fähnchen nach oben rendern (feiner 0.032 Urtext-Maßstab) */}
            {!beam.isPartOfBeam && duration === '8' && (
              <path
                d={SMUFL_GLYPHS.flag8thUp}
                transform={`translate(${fractionX + 6.0}, ${stemTopY}) scale(0.032, -0.032)`}
                fill={handsTopStemColor}
              />
            )}
            {!beam.isPartOfBeam && duration === '16' && (
              <path
                d={SMUFL_GLYPHS.flag16thUp}
                transform={`translate(${fractionX + 6.0}, ${stemTopY}) scale(0.032, -0.032)`}
                fill={handsTopStemColor}
              />
            )}
          </g>
        );
      })()}

      {/* 3. Stimme 2: Füße (Bass Drum, Hi-Hat Pedal) - Hälse nach UNTEN */}
      {feetNotes.length > 0 && (() => {
        const sorted = [...feetNotes].sort((a, b) => getStaffY(b.pitch, false, true) - getStaffY(a.pitch, false, true));
        const staffYs = sorted.map(n => staffTopY + getStaffY(n.pitch, false, true));
        const minY = Math.min(...staffYs);
        const maxY = Math.max(...staffYs);
        const durationRank = (d: string) => d === '16' ? 1 : d === '8' ? 2 : d === '4' ? 3 : d === '2' ? 4 : 5;
        const duration = [...sorted].sort((a, b) => durationRank(a.duration) - durationRank(b.duration))[0]?.duration || sorted[0].duration;

        const beam = calculateDrumBeamGroup(
          allBarNotes,
          barIdx,
          fractionIdx,
          'feet',
          fractionX,
          staffTopY,
          getStaffY,
          barStartX,
          measureWidth,
          timeSignature
        );

        const stemBottomY = beam.isPartOfBeam ? beam.beamY : (maxY + 28);
        const bottomFootNote = sorted[0];
        const feetBottomStemColor = isDrumColorGuide
          ? getNoteHeadColor(bottomFootNote.pitch)
          : baseNoteColor;
        const useSegmentedBeamColors = isDrumColorGuide && hitStatus !== 'hit' && hitStatus !== 'near';

        return (
          <g id={`feet-voice-${barIdx}-${fractionIdx}`}>
            {/* Primärer Notenbalken (Primary Beam) beim 1. Schlag der Gruppe - pro Zählzeit farbcodiert */}
            {beam.isFirstInBeam && (
              useSegmentedBeamColors && beam.primarySegments.length > 0 ? (
                beam.primarySegments.map((seg, sIdx) => (
                  <rect
                    key={`feet-pbeam-${sIdx}`}
                    x={seg.x1}
                    y={beam.beamY - 1.7}
                    width={Math.max(0.5, seg.x2 - seg.x1)}
                    height={3.4}
                    fill={seg.color}
                    rx={0.5}
                  />
                ))
              ) : (
                <rect
                  x={beam.xStart}
                  y={beam.beamY - 1.7}
                  width={beam.xEnd - beam.xStart}
                  height={3.4}
                  fill={feetBottomStemColor}
                  rx={0.5}
                />
              )
            )}
            {/* Sekundärer Notenbalken (16tel-Beam) - pro Zählzeit farbcodiert */}
            {beam.isFirstInBeam && beam.hasSixteenth && beam.secXStart !== undefined && beam.secXEnd !== undefined && (
              useSegmentedBeamColors && beam.secondarySegments.length > 0 ? (
                beam.secondarySegments.map((seg, sIdx) => (
                  <rect
                    key={`feet-sbeam-${sIdx}`}
                    x={seg.x1}
                    y={beam.beamY - 6.5}
                    width={Math.max(0.5, seg.x2 - seg.x1)}
                    height={2.8}
                    fill={seg.color}
                    rx={0.5}
                  />
                ))
              ) : (
                <rect
                  x={beam.secXStart}
                  y={beam.beamY - 6.5}
                  width={beam.secXEnd - beam.secXStart}
                  height={2.8}
                  fill={feetBottomStemColor}
                  rx={0.5}
                />
              )
            )}

            {sorted.map((n, idx) => {
              const nY = staffTopY + getStaffY(n.pitch, false, true);
              const isPedalHat = isCymbalPitch(n.pitch);
              const headColor = getNoteHeadColor(n.pitch);

              return (
                <g key={`feet-note-${n.id || idx}`}>
                  {/* Hilfslinie unten für Pedal-HiHat (D3 / D4 unter Linie 1) */}
                  {nY >= staffTopY + 50 + 6.25 && (
                    <line
                      x1={fractionX - 11}
                      y1={staffTopY + 56.25}
                      x2={fractionX + 11}
                      y2={staffTopY + 56.25}
                      stroke="#0f172a"
                      strokeWidth="1.2"
                    />
                  )}

                  {isPedalHat ? (
                    <g>
                      <line
                        x1={fractionX - 5.5}
                        y1={nY - 5}
                        x2={fractionX + 5.5}
                        y2={nY + 5}
                        stroke={headColor}
                        strokeWidth={isDrumColorGuide ? '2.7' : '2.4'}
                        strokeLinecap="round"
                      />
                      <line
                        x1={fractionX - 5.5}
                        y1={nY + 5}
                        x2={fractionX + 5.5}
                        y2={nY - 5}
                        stroke={headColor}
                        strokeWidth={isDrumColorGuide ? '2.7' : '2.4'}
                        strokeLinecap="round"
                      />
                      {isDrumColorGuide && (
                        <text
                          x={fractionX}
                          y={nY + 2.0}
                          textAnchor="middle"
                          fontSize="5.4"
                          fontWeight="900"
                          fill={headColor}
                          stroke="#ffffff"
                          strokeWidth="2.4"
                          paintOrder="stroke"
                          fontFamily="system-ui, -apple-system, sans-serif"
                          style={{ pointerEvents: 'none' }}
                        >
                          {getCanonicalDrumPieceColor(n.pitch).shortCode}
                        </text>
                      )}
                    </g>
                  ) : (
                    <g>
                      <ellipse
                        cx={fractionX}
                        cy={nY}
                        rx={isDrumColorGuide ? '7.8' : '7.0'}
                        ry={isDrumColorGuide ? '5.5' : '5.0'}
                        transform={`rotate(-22 ${fractionX} ${nY})`}
                        fill={duration === '1' || duration === '2' ? '#ffffff' : headColor}
                        stroke={headColor}
                        strokeWidth={duration === '1' || duration === '2' ? '2.4' : '0.6'}
                      />
                      {isDrumColorGuide && (
                        <text
                          x={fractionX}
                          y={nY + 2.1}
                          textAnchor="middle"
                          fontSize="5.8"
                          fontWeight="900"
                          fill={duration === '1' || duration === '2' ? headColor : '#ffffff'}
                          fontFamily="system-ui, -apple-system, sans-serif"
                          style={{ pointerEvents: 'none' }}
                        >
                          {getCanonicalDrumPieceColor(n.pitch).shortCode}
                        </text>
                      )}
                    </g>
                  )}

                  {/* Augmentations-Punkt (Dotted Note) */}
                  {n.isDotted && (
                    <circle
                      cx={fractionX + 11.5}
                      cy={nY}
                      r="2.2"
                      fill={headColor}
                    />
                  )}
                </g>
              );
            })}

            {/* Hals nach UNTEN (Stimme 2: Füße) - pro Instrument segmentiert farbcodiert */}
            {duration !== '1' && (
              isDrumColorGuide && sorted.length > 1 ? (
                <g>
                  {sorted.slice(1).map((noteSeg, segIdx) => {
                    const ySegStart = staffTopY + getStaffY(noteSeg.pitch, false, true);
                    const ySegEnd = staffTopY + getStaffY(sorted[segIdx].pitch, false, true);
                    return (
                      <line
                        key={`feet-stem-seg-${segIdx}`}
                        x1={fractionX - 6.0}
                        y1={ySegStart}
                        x2={fractionX - 6.0}
                        y2={ySegEnd}
                        stroke={getNoteHeadColor(noteSeg.pitch)}
                        strokeWidth="1.65"
                      />
                    );
                  })}
                  <line
                    x1={fractionX - 6.0}
                    y1={maxY}
                    x2={fractionX - 6.0}
                    y2={stemBottomY}
                    stroke={feetBottomStemColor}
                    strokeWidth="1.65"
                  />
                </g>
              ) : (
                <line
                  x1={fractionX - 6.0}
                  y1={minY}
                  x2={fractionX - 6.0}
                  y2={stemBottomY}
                  stroke={feetBottomStemColor}
                  strokeWidth="1.65"
                />
              )
            )}

            {/* Nur wenn NICHT gebalkt: Einzel-Fähnchen nach unten rendern (feiner 0.032 Urtext-Maßstab) */}
            {!beam.isPartOfBeam && duration === '8' && (
              <path
                d={SMUFL_GLYPHS.flag8thDown}
                transform={`translate(${fractionX - 6.0}, ${stemBottomY}) scale(0.032, -0.032)`}
                fill={feetBottomStemColor}
              />
            )}
            {!beam.isPartOfBeam && duration === '16' && (
              <path
                d={SMUFL_GLYPHS.flag16thDown}
                transform={`translate(${fractionX - 6.0}, ${stemBottomY}) scale(0.032, -0.032)`}
                fill={feetBottomStemColor}
              />
            )}
          </g>
        );
      })()}

      {/* 4. Selektions-Rahmen bei aktivem Cursor (nur im Bearbeitungsmodus, exakt auf primärem Notenkopf zentriert) */}
      {isSelectedSlot && !isPlaying && !readOnly && (() => {
        const primaryNote = handsNotes[0] || feetNotes[0];
        const targetY = primaryNote
          ? staffTopY + getStaffY(primaryNote.pitch, false, true)
          : staffTopY + 18.75; // Kanonischer Snare-Zwischenraum als Default
        return (
          <ellipse
            cx={fractionX}
            cy={targetY}
            rx="9.0"
            ry="7.0"
            transform={`rotate(-22 ${fractionX} ${targetY})`}
            fill="none"
            stroke="#4f46e5"
            strokeWidth="1.6"
            strokeDasharray="2.5 2"
          />
        );
      })()}
    </g>
  );
};

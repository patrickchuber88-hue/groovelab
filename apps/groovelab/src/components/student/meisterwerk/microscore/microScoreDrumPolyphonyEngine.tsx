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
      handsRest = { duration: '4', y: 18.75 }; // Obere Hälfte (3. Zwischenraum)
    }

    // Feet-Pause: Wenn Füße an diesem Beat schweigen, aber im Takt aktiv sind
    if (feetNotes.length === 0 && hasAnyFeetInBar && handsNotes.length > 0) {
      feetRest = { duration: '4', y: 43.75 }; // Untere Hälfte (1. Zwischenraum)
    }
  }

  return {
    handsNotes,
    feetNotes,
    handsRest,
    feetRest
  };
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
  getStaffY: (pitch: string, isBass: boolean, isDrum?: boolean) => number;
  measureWidth?: number;
  barStartX?: number;
}

interface DrumBeamGroup {
  isPartOfBeam: boolean;
  isFirstInBeam: boolean;
  beamY: number;
  xStart: number;
  xEnd: number;
  hasSixteenth: boolean;
}

/**
 * 🎼 0,1% Goldstandard Beaming Engine für Schlagzeug (Elaine Gould / PAS Standard):
 * Berechnet automatische Notenbalken für zusammenhängende 8tel- und 16tel-Gruppen im Beat
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
  measureWidth?: number
): DrumBeamGroup {
  // In 4/4 Zeit: 4 Viertelschläge pro Takt (Beat 0: 0..3, Beat 1: 4..7, Beat 2: 8..11, Beat 3: 12..15)
  const beatIndex = Math.floor(fractionIdx / 4);
  const beatStart = beatIndex * 4;
  const beatEnd = beatIndex * 4 + 3;

  // Noten dieses Taktes für diese Stimme im aktuellen Beat
  const beatNotes = allBarNotes.filter(n => {
    if (n.barIndex !== barIdx || !n.pitch || n.pitch === 'REST') return false;
    const isFoot = isDrumFootPitch(n.pitch);
    if (voice === 'hands' && isFoot) return false;
    if (voice === 'feet' && !isFoot) return false;
    return n.beatFraction >= beatStart && n.beatFraction <= beatEnd;
  });

  const uniqueFractions = Array.from(new Set(beatNotes.map(n => n.beatFraction))).sort((a, b) => a - b);

  // Balkung ist aktiv, wenn mindestens 2 rhythmische Zählzeiten im Beat vorhanden sind
  // und alle Noten Achtel ('8') oder Sechzehntel ('16') sind
  const allBeamable = beatNotes.length > 0 && beatNotes.every(n => n.duration === '8' || n.duration === '16');
  const isBeamGroup = uniqueFractions.length >= 2 && allBeamable;

  if (!isBeamGroup || !uniqueFractions.includes(fractionIdx)) {
    return {
      isPartOfBeam: false,
      isFirstInBeam: false,
      beamY: 0,
      xStart: 0,
      xEnd: 0,
      hasSixteenth: false
    };
  }

  const getFracX = (f: number): number => {
    if (barStartX !== undefined && measureWidth !== undefined) {
      return barStartX + 12 + (f / 16) * (measureWidth - 24);
    }
    return fractionX + (f - fractionIdx) * 22;
  };

  const firstFrac = uniqueFractions[0];
  const lastFrac = uniqueFractions[uniqueFractions.length - 1];
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

  const hasSixteenth = beatNotes.some(n => n.duration === '16');

  return {
    isPartOfBeam: true,
    isFirstInBeam: firstFrac === fractionIdx,
    beamY,
    xStart,
    xEnd,
    hasSixteenth
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
  getStaffY,
  measureWidth,
  barStartX
}: RenderDrumPolyphonySlotProps): React.ReactElement => {
  const analysis = analyzeDrumSlot(slotNotes, allBarNotes, barIdx, fractionIdx, timeSignature);
  const { handsNotes, feetNotes, handsRest, feetRest } = analysis;

  const noteColor = isCurrentlyPlaying
    ? '#6366f1'
    : hitStatus === 'hit'
    ? '#10b981'
    : hitStatus === 'near'
    ? '#f59e0b'
    : '#0f172a';

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
        const duration = sorted[0].duration;

        const beam = calculateDrumBeamGroup(
          allBarNotes,
          barIdx,
          fractionIdx,
          'hands',
          fractionX,
          staffTopY,
          getStaffY,
          barStartX,
          measureWidth
        );

        const stemTopY = beam.isPartOfBeam ? beam.beamY : (minY - 28);

        return (
          <g id={`hands-voice-${barIdx}-${fractionIdx}`}>
            {/* Primärer Notenbalken (Primary Beam) beim 1. Schlag der Gruppe */}
            {beam.isFirstInBeam && (
              <rect
                x={beam.xStart}
                y={beam.beamY - 1.7}
                width={beam.xEnd - beam.xStart}
                height={3.4}
                fill={noteColor}
                rx={0.5}
              />
            )}
            {/* Sekundärer Notenbalken (16tel-Beam) */}
            {beam.isFirstInBeam && beam.hasSixteenth && (
              <rect
                x={beam.xStart}
                y={beam.beamY + 4.5}
                width={beam.xEnd - beam.xStart}
                height={3.0}
                fill={noteColor}
                rx={0.5}
              />
            )}

            {sorted.map((n, idx) => {
              const nY = staffTopY + getStaffY(n.pitch, false, true);
              const isCymbal = isCymbalPitch(n.pitch);
              const isOpen = n.pitch === 'G#5' || n.pitch.includes('OPEN') || n.pitch === 'A#4';

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
                        stroke={noteColor}
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      />
                      <line
                        x1={fractionX - 5.5}
                        y1={nY + 5}
                        x2={fractionX + 5.5}
                        y2={nY - 5}
                        stroke={noteColor}
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      />
                      {isOpen && (
                        <circle
                          cx={fractionX}
                          cy={nY}
                          r="7.5"
                          fill="none"
                          stroke={noteColor}
                          strokeWidth="1.5"
                        />
                      )}
                    </g>
                  ) : (
                    <ellipse
                      cx={fractionX}
                      cy={nY}
                      rx="7.0"
                      ry="5.0"
                      transform={`rotate(-22 ${fractionX} ${nY})`}
                      fill={duration === '1' || duration === '2' ? '#ffffff' : noteColor}
                      stroke={noteColor}
                      strokeWidth={duration === '1' || duration === '2' ? '2.2' : '0.6'}
                    />
                  )}
                </g>
              );
            })}

            {/* Hals nach OBEN (Stimme 1: Hände) */}
            {duration !== '1' && (
              <line
                x1={fractionX + 6.0}
                y1={maxY}
                x2={fractionX + 6.0}
                y2={stemTopY}
                stroke={noteColor}
                strokeWidth="1.5"
              />
            )}

            {/* Nur wenn NICHT gebalkt: Einzel-Fähnchen nach oben rendern */}
            {!beam.isPartOfBeam && duration === '8' && (
              <path
                d={SMUFL_GLYPHS.flag8thUp}
                transform={`translate(${fractionX + 6.0}, ${stemTopY}) scale(0.040, -0.040)`}
                fill={noteColor}
              />
            )}
            {!beam.isPartOfBeam && duration === '16' && (
              <path
                d={SMUFL_GLYPHS.flag16thUp}
                transform={`translate(${fractionX + 6.0}, ${stemTopY}) scale(0.040, -0.040)`}
                fill={noteColor}
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
        const duration = sorted[0].duration;

        const beam = calculateDrumBeamGroup(
          allBarNotes,
          barIdx,
          fractionIdx,
          'feet',
          fractionX,
          staffTopY,
          getStaffY,
          barStartX,
          measureWidth
        );

        const stemBottomY = beam.isPartOfBeam ? beam.beamY : (maxY + 28);

        return (
          <g id={`feet-voice-${barIdx}-${fractionIdx}`}>
            {/* Primärer Notenbalken (Primary Beam) beim 1. Schlag der Gruppe */}
            {beam.isFirstInBeam && (
              <rect
                x={beam.xStart}
                y={beam.beamY - 1.7}
                width={beam.xEnd - beam.xStart}
                height={3.4}
                fill={noteColor}
                rx={0.5}
              />
            )}
            {/* Sekundärer Notenbalken (16tel-Beam) */}
            {beam.isFirstInBeam && beam.hasSixteenth && (
              <rect
                x={beam.xStart}
                y={beam.beamY - 6.5}
                width={beam.xEnd - beam.xStart}
                height={3.0}
                fill={noteColor}
                rx={0.5}
              />
            )}

            {sorted.map((n, idx) => {
              const nY = staffTopY + getStaffY(n.pitch, false, true);
              const isPedalHat = isCymbalPitch(n.pitch);

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
                        stroke={noteColor}
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      />
                      <line
                        x1={fractionX - 5.5}
                        y1={nY + 5}
                        x2={fractionX + 5.5}
                        y2={nY - 5}
                        stroke={noteColor}
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      />
                    </g>
                  ) : (
                    <ellipse
                      cx={fractionX}
                      cy={nY}
                      rx="7.0"
                      ry="5.0"
                      transform={`rotate(-22 ${fractionX} ${nY})`}
                      fill={duration === '1' || duration === '2' ? '#ffffff' : noteColor}
                      stroke={noteColor}
                      strokeWidth={duration === '1' || duration === '2' ? '2.2' : '0.6'}
                    />
                  )}
                </g>
              );
            })}

            {/* Hals nach UNTEN (Stimme 2: Füße) */}
            {duration !== '1' && (
              <line
                x1={fractionX - 6.0}
                y1={minY}
                x2={fractionX - 6.0}
                y2={stemBottomY}
                stroke={noteColor}
                strokeWidth="1.5"
              />
            )}

            {/* Nur wenn NICHT gebalkt: Einzel-Fähnchen nach unten rendern */}
            {!beam.isPartOfBeam && duration === '8' && (
              <path
                d={SMUFL_GLYPHS.flag8thDown}
                transform={`translate(${fractionX - 6.0}, ${stemBottomY}) scale(0.040, -0.040)`}
                fill={noteColor}
              />
            )}
            {!beam.isPartOfBeam && duration === '16' && (
              <path
                d={SMUFL_GLYPHS.flag16thDown}
                transform={`translate(${fractionX - 6.0}, ${stemBottomY}) scale(0.040, -0.040)`}
                fill={noteColor}
              />
            )}
          </g>
        );
      })()}

      {/* 4. Selektions-Rahmen bei aktivem Cursor */}
      {isSelectedSlot && !isPlaying && (
        <ellipse
          cx={fractionX}
          cy={staffTopY + 25}
          rx="9.0"
          ry="7.0"
          transform={`rotate(-22 ${fractionX} ${staffTopY + 25})`}
          fill="none"
          stroke={noteColor}
          strokeWidth="1.6"
          strokeDasharray="2.5 2"
        />
      )}
    </g>
  );
};

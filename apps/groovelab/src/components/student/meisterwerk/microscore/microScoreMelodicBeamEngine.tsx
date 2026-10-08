/**
 * 🏛️ Campus-Groovelab 0,1% Goldstandard Melodic Beaming Engine
 * microScoreMelodicBeamEngine.tsx
 * 
 * Autarker Satellit für metrischen Notensatz (Balkenverbindung von Achtel- & Sechzehntelnoten)
 * nach Elaine Gould ("Behind Bars - The Definitive Guide to Music Notation", Faber Music)
 * und den kanonischen Henle/Bärenreiter Urtext-Richtlinien.
 * 
 * Kernfunktionen:
 * - Metrische Gruppierung nach Zählzeiten (4/4: Beat-Integrität & unantastbare Taktmitte)
 * - Reine Achtel-Gruppen: 2er-Beams pro Beat oder 4er-Beams pro Halbtakt (Gould S. 153)
 * - Sechzehntel-Gruppen: Strikt innerhalb des Viertelschlags gebalkt
 * - Schwerpunktsregel (Majority Rule) für einheitliche Halsrichtung (stemUp / stemDown)
 * - Mathematisch deterministische Balkenneigung (Slope) mit Restriktion auf max. 8px
 * - Primär- und Sekundärbalken (Secondary Beams & Fractional Beamlets)
 * - Hält MicroScoreStaffNotation.tsx stabil unter 1.500 Zeilen (Monolith Ceiling)
 */

import React from 'react';
import { MicroScoreNote } from './microScore.types';

export interface MelodicBeamNoteInfo {
  note: MicroScoreNote;
  fractionIdx: number;
  fractionX: number;
  stemX: number;
  stemTipY: number; // Exakte Y-Position am Balken (Elaine Gould Standard)
  headY: number; // Höchste bzw. tiefste Note im Akkord an diesem Slot
  duration: '8' | '16';
  isDotted?: boolean;
}

export interface SecondaryBeamSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface MelodicBeamGroup {
  id: string;
  barIdx: number;
  stemUp: boolean;
  notes: MelodicBeamNoteInfo[];
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
  slope: number;
  beamThickness: number;
  secondarySegments: SecondaryBeamSegment[];
}

export interface MelodicBeamSlotAnalysis {
  isBeamed: boolean;
  stemUp: boolean;
  stemTipY: number;
  beamGroupId?: string;
}

const BEAM_THICKNESS = 3.2;
const SECONDARY_OFFSET = 6.4; // Abstand für 16tel-Doppelbalken
const MIN_STEM_LENGTH = 26;
const STANDARD_STEM_LENGTH = 28;
const MAX_SLOPE_PX = 8; // Maximale Neigung über die gesamte Balkenlänge

/**
 * Berechnet für einen gegebenen Takt alle metrisch korrekten Melodie-Balkengruppen
 */
export function calculateBarMelodicBeamGroups(
  allNotes: MicroScoreNote[],
  barIdx: number,
  timeSignature: string,
  staffTopY: number,
  measureWidth: number,
  barStartX: number,
  getStaffY: (pitch: string, isBass: boolean, isDrum?: boolean) => number,
  isBassClef: boolean = false
): MelodicBeamGroup[] {
  // 1. Sammle alle gepitchten Noten dieses Taktes
  const barNotes = allNotes.filter(
    n => n.barIndex === barIdx && n.pitch && n.pitch !== 'REST'
  );

  if (barNotes.length === 0) return [];

  // Finde alle eindeutigen Zählzeiten mit Noten
  const fractions = Array.from(new Set(barNotes.map(n => Math.round(n.beatFraction)))).sort((a, b) => a - b);

  // Hilfsfunktion: X-Position eines Ticks berechnen
  const getFractionX = (frac: number): number => {
    return barStartX + 12 + (frac / 16) * (measureWidth - 24);
  };

  // Gruppiere Noten nach Zählzeiten
  const slotMap = new Map<number, MicroScoreNote[]>();
  for (const n of barNotes) {
    const f = Math.round(n.beatFraction);
    const existing = slotMap.get(f) || [];
    existing.push(n);
    slotMap.set(f, existing);
  }

  // 2. Metrische Unterteilung nach Taktart
  // Im 4/4-Takt: 4 Viertelschläge (Beat 0: 0..3, Beat 1: 4..7, Beat 2: 8..11, Beat 3: 12..15)
  // Bei 3/4-Takt: 3 Viertelschläge
  const is34 = timeSignature === '3/4';
  const totalBeats = is34 ? 3 : 4;
  const rawGroups: number[][] = [];

  for (let b = 0; b < totalBeats; b++) {
    const beatStart = b * 4;
    const beatEnd = b * 4 + 3;
    const beatFractions = fractions.filter(f => f >= beatStart && f <= beatEnd);

    // Prüfe, ob alle Noten in diesem Beat balkbar sind (Achtel '8' oder Sechzehntel '16')
    const beatSlotsBeamable = beatFractions.every(f => {
      const notes = slotMap.get(f) || [];
      return notes.length > 0 && notes.every(n => n.duration === '8' || n.duration === '16');
    });

    if (beatSlotsBeamable && beatFractions.length >= 2) {
      rawGroups.push(beatFractions);
    }
  }

  // 3. Elaine Gould 4/4-Halbtakt-Fusion für reine Achtelnoten (Halves of the measure, Gould S. 153)
  // Wenn Beat 0 und Beat 1 jeweils exakt 2 Achtelnoten haben (0, 2 und 4, 6), verschmelze zu 4er-Gruppe!
  // Taktmitte (Beat 1 zu Beat 2, d.h. Tick 6 zu 8) darf NIEMALS überbrückt werden!
  const finalFractionGroups: number[][] = [];

  if (!is34) {
    const hasFullHalf1 = rawGroups.some(g => g.length === 2 && g[0] === 0 && g[1] === 2 && g.every(f => (slotMap.get(f) || []).every(n => n.duration === '8'))) &&
                         rawGroups.some(g => g.length === 2 && g[0] === 4 && g[1] === 6 && g.every(f => (slotMap.get(f) || []).every(n => n.duration === '8')));

    const hasFullHalf2 = rawGroups.some(g => g.length === 2 && g[0] === 8 && g[1] === 10 && g.every(f => (slotMap.get(f) || []).every(n => n.duration === '8'))) &&
                         rawGroups.some(g => g.length === 2 && g[0] === 12 && g[1] === 14 && g.every(f => (slotMap.get(f) || []).every(n => n.duration === '8')));

    for (const g of rawGroups) {
      const isH1B0 = g.length === 2 && g[0] === 0 && g[1] === 2;
      const isH1B1 = g.length === 2 && g[0] === 4 && g[1] === 6;
      const isH2B2 = g.length === 2 && g[0] === 8 && g[1] === 10;
      const isH2B3 = g.length === 2 && g[0] === 12 && g[1] === 14;

      if (hasFullHalf1 && isH1B0) {
        finalFractionGroups.push([0, 2, 4, 6]);
      } else if (hasFullHalf1 && isH1B1) {
        // Bereits mit H1B0 fusioniert
        continue;
      } else if (hasFullHalf2 && isH2B2) {
        finalFractionGroups.push([8, 10, 12, 14]);
      } else if (hasFullHalf2 && isH2B3) {
        // Bereits mit H2B2 fusioniert
        continue;
      } else {
        finalFractionGroups.push(g);
      }
    }
  } else {
    // 3/4-Takt: Strikte paarweise Beats beibehalten
    finalFractionGroups.push(...rawGroups);
  }

  // 4. Berechne Geometrie, Schwerpunktsregel & Hälse für jede Gruppe
  const beamGroups: MelodicBeamGroup[] = [];

  finalFractionGroups.forEach((fracGroup, gIdx) => {
    // Ermittle alle Noten der Gruppe
    const groupNotesData: {
      note: MicroScoreNote;
      fractionIdx: number;
      fractionX: number;
      headMinY: number;
      headMaxY: number;
      avgStaffRelY: number;
    }[] = [];

    for (const frac of fracGroup) {
      const notes = slotMap.get(frac) || [];
      if (notes.length === 0) continue;

      const fracX = getFractionX(frac);
      const relYs = notes.map(n => getStaffY(n.pitch, isBassClef, false));
      const headMinY = staffTopY + Math.min(...relYs);
      const headMaxY = staffTopY + Math.max(...relYs);
      const avgStaffRelY = relYs.reduce((a, b) => a + b, 0) / relYs.length;

      groupNotesData.push({
        note: notes[0],
        fractionIdx: frac,
        fractionX: fracX,
        headMinY,
        headMaxY,
        avgStaffRelY
      });
    }

    if (groupNotesData.length < 2) return;

    // Schwerpunktsregel (Majority Rule nach Elaine Gould S. 157):
    // Mittellinie des Systems liegt bei staffTopY + 25px (Linie 3)
    // Wenn Durchschnitt relY > 25 -> Noten liegen unten -> Hälse zeigen nach OBEN (stemUp = true)
    // Wenn Durchschnitt relY <= 25 -> Noten liegen oben -> Hälse zeigen nach UNTEN (stemUp = false)
    const overallAvgRelY = groupNotesData.reduce((acc, d) => acc + d.avgStaffRelY, 0) / groupNotesData.length;
    const stemUp = overallAvgRelY > 25.0;

    const stemOffset = stemUp ? 6.0 : -6.0;

    const first = groupNotesData[0];
    const last = groupNotesData[groupNotesData.length - 1];

    const xStart = first.fractionX + stemOffset;
    const xEnd = last.fractionX + stemOffset;
    const dx = xEnd - xStart;

    // Balkenneigung berechnen: Folgt der melodischen Richtung zwischen erstem und letztem Ton
    // Bei stemUp: Y verringert sich nach oben
    const firstAnchorHead = stemUp ? first.headMinY : first.headMaxY;
    const lastAnchorHead = stemUp ? last.headMinY : last.headMaxY;
    let rawDeltaY = (lastAnchorHead - firstAnchorHead) * 0.45;

    // Restriktion des Neigungswinkels auf max. 8px (keine steilen Balken)
    if (Math.abs(rawDeltaY) > MAX_SLOPE_PX) {
      rawDeltaY = rawDeltaY > 0 ? MAX_SLOPE_PX : -MAX_SLOPE_PX;
    }

    // Wenn Noten horizontal oder extrem nah beieinander liegen: flacher Balken
    if (Math.abs(rawDeltaY) < 1.5) {
      rawDeltaY = 0;
    }

    const slope = dx > 0 ? rawDeltaY / dx : 0;

    // Berechne vertikalen Shift (yRef), sodass JEDER Hals mindestens MIN_STEM_LENGTH lang ist
    let yRef = 0;
    if (stemUp) {
      // Hälse nach oben: Balken muss oberhalb aller Notenköpfe liegen
      // y(x) = yRef + slope * (x - xStart) <= headMinY - MIN_STEM_LENGTH
      // yRef <= headMinY - MIN_STEM_LENGTH - slope * (x - xStart)
      let maxAllowedY = Infinity;
      for (const d of groupNotesData) {
        const x = d.fractionX + stemOffset;
        const noteReqY = d.headMinY - STANDARD_STEM_LENGTH - slope * (x - xStart);
        if (noteReqY < maxAllowedY) {
          maxAllowedY = noteReqY;
        }
      }
      yRef = maxAllowedY;
    } else {
      // Hälse nach unten: Balken muss unterhalb aller Notenköpfe liegen
      // yRef >= headMaxY + MIN_STEM_LENGTH - slope * (x - xStart)
      let minAllowedY = -Infinity;
      for (const d of groupNotesData) {
        const x = d.fractionX + stemOffset;
        const noteReqY = d.headMaxY + STANDARD_STEM_LENGTH - slope * (x - xStart);
        if (noteReqY > minAllowedY) {
          minAllowedY = noteReqY;
        }
      }
      yRef = minAllowedY;
    }

    const yStart = yRef;
    const yEnd = yRef + slope * (xEnd - xStart);

    // Berechne NoteInfo für jede Note der Gruppe
    const notesInfo: MelodicBeamNoteInfo[] = groupNotesData.map(d => {
      const stemX = d.fractionX + stemOffset;
      const beamY = yStart + slope * (stemX - xStart);
      // 0,1% Elaine Gould Präzision: Hals taucht 1.0px in den Balken ein (verhindert Retina-Subpixel-Gaps)
      const stemTipY = stemUp ? beamY - 1.0 : beamY + 1.0;
      return {
        note: d.note,
        fractionIdx: d.fractionIdx,
        fractionX: d.fractionX,
        stemX,
        stemTipY,
        headY: stemUp ? d.headMinY : d.headMaxY,
        duration: d.note.duration as '8' | '16',
        isDotted: d.note.isDotted
      };
    });

    // Sekundärbalken (für 16tel-Noten) berechnen
    const secondarySegments: SecondaryBeamSegment[] = [];
    const secYOffset = stemUp ? SECONDARY_OFFSET : -SECONDARY_OFFSET;

    for (let i = 0; i < notesInfo.length; i++) {
      const curr = notesInfo[i];
      if (curr.duration === '16') {
        // Prüfe Nachbarn auf 16tel
        const next = notesInfo[i + 1];
        if (next && next.duration === '16') {
          // Durchgehender Sekundärbalken zum nächsten 16tel
          secondarySegments.push({
            x1: curr.stemX,
            y1: (yStart + slope * (curr.stemX - xStart)) + secYOffset,
            x2: next.stemX,
            y2: (yStart + slope * (next.stemX - xStart)) + secYOffset
          });
        } else {
          // Isolierte 16tel (z. B. nach oder vor einer 8tel):
          // Erzeuge ein kurzes Fractional Beamlet (nach innen gerichtet)
          const prev = notesInfo[i - 1];
          const isAtEnd = i === notesInfo.length - 1;
          const beamletLen = 9.0;

          if (isAtEnd || (prev && prev.duration === '8')) {
            // Nach links (innen) zeigen
            const x1 = curr.stemX - beamletLen;
            const x2 = curr.stemX;
            secondarySegments.push({
              x1,
              y1: (yStart + slope * (x1 - xStart)) + secYOffset,
              x2,
              y2: (yStart + slope * (x2 - xStart)) + secYOffset
            });
          } else {
            // Nach rechts (innen) zeigen
            const x1 = curr.stemX;
            const x2 = curr.stemX + beamletLen;
            secondarySegments.push({
              x1,
              y1: (yStart + slope * (x1 - xStart)) + secYOffset,
              x2,
              y2: (yStart + slope * (x2 - xStart)) + secYOffset
            });
          }
        }
      }
    }

    beamGroups.push({
      id: `beam-${barIdx}-${gIdx}`,
      barIdx,
      stemUp,
      notes: notesInfo,
      xStart,
      xEnd,
      yStart,
      yEnd,
      slope,
      beamThickness: BEAM_THICKNESS,
      secondarySegments
    });
  });

  return beamGroups;
}

/**
 * Erstellt eine schnelle Lookup-Map für Zählzeiten-Slots im Takt
 */
export function buildMelodicBeamLookup(beamGroups: MelodicBeamGroup[]): Map<number, MelodicBeamSlotAnalysis> {
  const map = new Map<number, MelodicBeamSlotAnalysis>();

  for (const group of beamGroups) {
    for (const n of group.notes) {
      map.set(n.fractionIdx, {
        isBeamed: true,
        stemUp: group.stemUp,
        stemTipY: n.stemTipY,
        beamGroupId: group.id
      });
    }
  }

  return map;
}

/**
 * 0,1% Goldstandard SVG-Renderer für Notenbalken (Primary & Secondary Beams)
 */
export const MicroScoreMelodicBeams: React.FC<{
  beamGroups: MelodicBeamGroup[];
  color?: string;
}> = ({ beamGroups, color = '#0f172a' }) => {
  if (!beamGroups || beamGroups.length === 0) return null;

  return (
    <g id="melodic-beams-layer" style={{ pointerEvents: 'none' }}>
      {beamGroups.map(group => {
        const { id, stemUp, xStart, xEnd, yStart, yEnd, beamThickness, secondarySegments } = group;

        // Primärbalken als mathematisch präzises Parallelogramm / Polygon
        // stemUp: Balken sitzt mit seiner Unterkante auf dem Halsende (yStart .. yEnd)
        // stemDown: Balken sitzt mit seiner Oberkante auf dem Halsende (yStart .. yEnd)
        const polyYOffset = stemUp ? -beamThickness : beamThickness;
        const primaryPoints = `${xStart},${yStart} ${xEnd},${yEnd} ${xEnd},${yEnd + polyYOffset} ${xStart},${yStart + polyYOffset}`;

        return (
          <g key={id} id={id}>
            {/* 1. Primärer Hauptbalken (Achtel & Sechzehntel) */}
            <polygon
              points={primaryPoints}
              fill={color}
              stroke={color}
              strokeWidth="0.3"
            />

            {/* 2. Sekundäre Nebenbalken (für Sechzehntel & Beamlets) */}
            {secondarySegments.map((seg, sIdx) => {
              const secPoints = `${seg.x1},${seg.y1} ${seg.x2},${seg.y2} ${seg.x2},${seg.y2 + polyYOffset} ${seg.x1},${seg.y1 + polyYOffset}`;
              return (
                <polygon
                  key={`sec-${id}-${sIdx}`}
                  points={secPoints}
                  fill={color}
                  stroke={color}
                  strokeWidth="0.3"
                />
              );
            })}
          </g>
        );
      })}
    </g>
  );
};

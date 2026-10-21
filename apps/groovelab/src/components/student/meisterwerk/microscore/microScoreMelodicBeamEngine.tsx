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
import { getPitchColorTheme } from './microScoreGridEngine';

export interface MelodicBeamNoteInfo {
  note: MicroScoreNote;
  fractionIdx: number;
  fractionX: number;
  stemX: number;
  stemTipY: number; // Exakte Y-Position am Balken (Elaine Gould Standard)
  headY: number; // Höchste bzw. tiefste Note im Akkord an diesem Slot
  duration: '8' | '16';
  isDotted?: boolean;
  color: string;
}

export interface SecondaryBeamSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  colorEnd?: string;
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

  const canonFrac = (f: number): number => Math.round(f * 100) / 100;

  // Finde alle eindeutigen Zählzeiten mit Noten (inkl. exakter Triolen-Brüche 1.33 / 2.66)
  const fractions = Array.from(new Set(barNotes.map(n => canonFrac(n.beatFraction)))).sort((a, b) => a - b);

  // Hilfsfunktion: X-Position eines Ticks berechnen (synchron mit totalFractionsInBar in MicroScoreStaffNotation)
  const totalFractionsInBar = timeSignature === '3/4' || timeSignature === '6/8' ? 12 : timeSignature === '2/4' ? 8 : 16;
  const getFractionX = (frac: number): number => {
    return barStartX + 12 + (frac / totalFractionsInBar) * (measureWidth - 24);
  };

  // Gruppiere Noten nach Zählzeiten
  const slotMap = new Map<number, MicroScoreNote[]>();
  for (const n of barNotes) {
    const f = canonFrac(n.beatFraction);
    const existing = slotMap.get(f) || [];
    existing.push(n);
    slotMap.set(f, existing);
  }

  // 2. Metrische Unterteilung nach Taktart
  // Im 6/8-Takt: 2 punktierte Viertelschläge à 6 Sechzehntel (Gruppe 0: 0..5, Gruppe 1: 6..11)
  // Im 4/4-Takt: 4 Viertelschläge (Beat 0: 0..3, Beat 1: 4..7, Beat 2: 8..11, Beat 3: 12..15)
  // Bei 3/4-Takt: 3 Viertelschläge, bei 2/4-Takt: 2 Viertelschläge
  const is68 = timeSignature === '6/8';
  const is34 = timeSignature === '3/4';
  const is24 = timeSignature === '2/4';
  const groupSize = is68 ? 6 : 4;
  const totalBeats = is68 ? 2 : is34 ? 3 : is24 ? 2 : 4;
  const rawGroups: number[][] = [];

  for (let b = 0; b < totalBeats; b++) {
    const beatStart = b * groupSize;
    const beatEnd = (b + 1) * groupSize;
    const beatFractions = fractions.filter(f => f >= beatStart - 0.05 && f < beatEnd - 0.05);

    // Prüfe, ob an den Zählzeiten in diesem Beat balkbare Noten (Achtel '8' oder Sechzehntel '16') liegen
    // (auch bei Polyphonie wie Bass-Viertel + Melodie-Achtel in "Spanische Romanze")
    const beatSlotsBeamable = beatFractions.every(f => {
      const notes = slotMap.get(f) || [];
      return notes.length > 0 && notes.some(n => n.duration === '8' || n.duration === '16');
    });

    if (beatSlotsBeamable && beatFractions.length >= 2) {
      rawGroups.push(beatFractions);
    }
  }

  // 3. Elaine Gould 4/4-Halbtakt-Fusion für reine Achtelnoten (Halves of the measure, Gould S. 153)
  // Wenn Beat 0 und Beat 1 jeweils exakt 2 Achtelnoten haben (0, 2 und 4, 6), verschmelze zu 4er-Gruppe!
  // Taktmitte (Beat 1 zu Beat 2, d.h. Tick 6 zu 8) darf NIEMALS überbrückt werden!
  const finalFractionGroups: number[][] = [];

  if (!is34 && !is68 && !is24) {
    const hasFullHalf1 = rawGroups.some(g => g.length === 2 && g[0] === 0 && g[1] === 2 && g.every(f => (slotMap.get(f) || []).every(n => n.duration === '8' && !n.isTriplet))) &&
                         rawGroups.some(g => g.length === 2 && g[0] === 4 && g[1] === 6 && g.every(f => (slotMap.get(f) || []).every(n => n.duration === '8' && !n.isTriplet)));

    const hasFullHalf2 = rawGroups.some(g => g.length === 2 && g[0] === 8 && g[1] === 10 && g.every(f => (slotMap.get(f) || []).every(n => n.duration === '8' && !n.isTriplet))) &&
                         rawGroups.some(g => g.length === 2 && g[0] === 12 && g[1] === 14 && g.every(f => (slotMap.get(f) || []).every(n => n.duration === '8' && !n.isTriplet)));

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
      allSlotNotes: MicroScoreNote[];
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
      const beamableNotesAtSlot = notes.filter(n => n.duration === '8' || n.duration === '16');
      const melodyRelYs = (beamableNotesAtSlot.length > 0 ? beamableNotesAtSlot : notes).map(n => getStaffY(n.pitch, isBassClef, false));
      const avgStaffRelY = melodyRelYs.reduce((a, b) => a + b, 0) / melodyRelYs.length;
      const shortestNote = notes.find(n => n.duration === '16') || notes.find(n => n.duration === '8') || notes[0];

      groupNotesData.push({
        note: shortestNote,
        allSlotNotes: notes,
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

    // Berechne NoteInfo für jede Note der Gruppe inkl. synästhetischer Tonhöhenfarbe
    const notesInfo: MelodicBeamNoteInfo[] = groupNotesData.map(d => {
      const stemX = d.fractionX + stemOffset;
      const beamY = yStart + slope * (stemX - xStart);
      // 0,1% Elaine Gould Präzision: Hals taucht 1.0px in den Balken ein (verhindert Retina-Subpixel-Gaps)
      const stemTipY = stemUp ? beamY - 1.0 : beamY + 1.0;
      const sortedAtSlot = [...d.allSlotNotes].sort(
        (a, b) => getStaffY(a.pitch, isBassClef, false) - getStaffY(b.pitch, isBassClef, false)
      );
      const anchorNote = stemUp
        ? sortedAtSlot[0]
        : sortedAtSlot[sortedAtSlot.length - 1];
      const noteColor = getPitchColorTheme((anchorNote || d.note).pitch).border;
      return {
        note: d.note,
        fractionIdx: d.fractionIdx,
        fractionX: d.fractionX,
        stemX,
        stemTipY,
        headY: stemUp ? d.headMinY : d.headMaxY,
        duration: (d.note.duration === '16' ? '16' : '8') as '8' | '16',
        isDotted: d.note.isDotted,
        color: noteColor
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
            y2: (yStart + slope * (next.stemX - xStart)) + secYOffset,
            color: curr.color,
            colorEnd: next.color
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
              y2: (yStart + slope * (x2 - xStart)) + secYOffset,
              color: curr.color
            });
          } else {
            // Nach rechts (innen) zeigen
            const x1 = curr.stemX;
            const x2 = curr.stemX + beamletLen;
            secondarySegments.push({
              x1,
              y1: (yStart + slope * (x1 - xStart)) + secYOffset,
              x2,
              y2: (yStart + slope * (x2 - xStart)) + secYOffset,
              color: curr.color
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
 * Erstellt eine schnelle Lookup-Map für Zählzeiten-Slots im Takt (inkl. Triolen-Toleranz)
 */
export function buildMelodicBeamLookup(beamGroups: MelodicBeamGroup[]): Map<number, MelodicBeamSlotAnalysis> {
  const map = new Map<number, MelodicBeamSlotAnalysis>();

  for (const group of beamGroups) {
    for (const n of group.notes) {
      const analysis: MelodicBeamSlotAnalysis = {
        isBeamed: true,
        stemUp: group.stemUp,
        stemTipY: n.stemTipY,
        beamGroupId: group.id
      };
      map.set(n.fractionIdx, analysis);
      map.set(Math.round(n.fractionIdx * 100) / 100, analysis);
    }
  }

  return map;
}

/**
 * 0,1% Goldstandard SVG-Renderer für Notenbalken (Primary & Secondary Beams)
 * mit synästhetischer Pro-Noten-Farbcodierung entlang der Balkensteigung.
 */
export const MicroScoreMelodicBeams: React.FC<{
  beamGroups: MelodicBeamGroup[];
  color?: string;
}> = ({ beamGroups, color }) => {
  if (!beamGroups || beamGroups.length === 0) return null;

  return (
    <g id="melodic-beams-layer" style={{ pointerEvents: 'none' }}>
      {beamGroups.map(group => {
        const { id, stemUp, xStart, yStart, slope, beamThickness, notes, secondarySegments } = group;

        // Primärbalken als mathematisch präzises Parallelogramm / Polygon pro Noten-Spanne
        const polyYOffset = stemUp ? -beamThickness : beamThickness;
        const getBeamY = (x: number): number => yStart + slope * (x - xStart);

        return (
          <g key={id} id={id}>
            {/* 1. Primärer Hauptbalken (Achtel & Sechzehntel) - pro Note farbcodiert */}
            {notes.slice(0, -1).map((curr, nIdx) => {
              const next = notes[nIdx + 1];
              const x1 = curr.stemX;
              const x2 = next.stemX;
              const y1 = getBeamY(x1);
              const y2 = getBeamY(x2);
              const c1 = color || curr.color || '#0f172a';
              const c2 = color || next.color || '#0f172a';

              if (c1 === c2) {
                const pts = `${x1},${y1} ${x2},${y2} ${x2},${y2 + polyYOffset} ${x1},${y1 + polyYOffset}`;
                return (
                  <polygon
                    key={`prim-${id}-${nIdx}`}
                    points={pts}
                    fill={c1}
                    stroke={c1}
                    strokeWidth="0.35"
                  />
                );
              }

              const xMid = (x1 + x2) / 2;
              const yMid = getBeamY(xMid);
              const ptsLeft = `${x1},${y1} ${xMid},${yMid} ${xMid},${yMid + polyYOffset} ${x1},${y1 + polyYOffset}`;
              const ptsRight = `${xMid},${yMid} ${x2},${y2} ${x2},${y2 + polyYOffset} ${xMid},${yMid + polyYOffset}`;
              return (
                <g key={`prim-${id}-${nIdx}`}>
                  <polygon points={ptsLeft} fill={c1} stroke={c1} strokeWidth="0.35" />
                  <polygon points={ptsRight} fill={c2} stroke={c2} strokeWidth="0.35" />
                </g>
              );
            })}

            {/* 2. Sekundäre Nebenbalken (für Sechzehntel & Beamlets) - pro Note farbcodiert */}
            {secondarySegments.map((seg, sIdx) => {
              const c1 = color || seg.color || '#0f172a';
              const c2 = color || seg.colorEnd || c1;
              if (c1 === c2) {
                const secPoints = `${seg.x1},${seg.y1} ${seg.x2},${seg.y2} ${seg.x2},${seg.y2 + polyYOffset} ${seg.x1},${seg.y1 + polyYOffset}`;
                return (
                  <polygon
                    key={`sec-${id}-${sIdx}`}
                    points={secPoints}
                    fill={c1}
                    stroke={c1}
                    strokeWidth="0.35"
                  />
                );
              }
              const xMid = (seg.x1 + seg.x2) / 2;
              const yMid = (seg.y1 + seg.y2) / 2;
              const ptsLeft = `${seg.x1},${seg.y1} ${xMid},${yMid} ${xMid},${yMid + polyYOffset} ${seg.x1},${seg.y1 + polyYOffset}`;
              const ptsRight = `${xMid},${yMid} ${seg.x2},${seg.y2} ${seg.x2},${seg.y2 + polyYOffset} ${xMid},${yMid + polyYOffset}`;
              return (
                <g key={`sec-${id}-${sIdx}`}>
                  <polygon points={ptsLeft} fill={c1} stroke={c1} strokeWidth="0.35" />
                  <polygon points={ptsRight} fill={c2} stroke={c2} strokeWidth="0.35" />
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
};

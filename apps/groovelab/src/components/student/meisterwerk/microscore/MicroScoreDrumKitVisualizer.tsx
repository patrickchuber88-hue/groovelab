/**
 * 🏛️ Campus-Groovelab Micro-Score Studio (0,1% Goldstandard)
 * MicroScoreDrumKitVisualizer.tsx
 * 
 * 2027 Pro 2.5D Isometric Top-Down Drumkit Visualizer (100% Panorama Stage):
 * - 8 Instrumente + Physisches Hi-Hat-Fußpedal (D3 / Taste C) & Bass-Drum-Pedal (F4 / Taste V, N)
 * - Echte Transienten-Physik (Attack-Flash 0-35ms -> Konzentrische Schockwellen -> Natürliches Decay)
 * - Bronze-Becken behalten 100% echte Bronze-Textur mit Specular-Edge-Flash statt unnatürlichem Farb-Toggle
 * - Farbcodierter Extremitäten-Impuls & Stick-Tip-Rebound (R = Blau #3b82f6, L = Pink #ec4899, F = Violett #8b5cf6)
 * - Radiale 0%-Overlap HUD-Badges & On-Head Studio Engraving für 70-90cm Notenständer-Distanz
 * - BFSG 2025 & WCAG 2.2 AA Barrierefreiheit & Tastatur-Vollbedienbarkeit
 */

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { CANONICAL_DRUM_COLOR_GUIDE } from './microScoreDrumPolyphonyEngine';

export interface MicroScoreDrumKitVisualizerProps {
  activePitches: string[];
  activeNotes?: Array<{ id?: string; pitch: string; barIndex?: number; beatFraction?: number }>;
  playheadPos?: { bar: number; fraction: number };
  onHit?: (padId: string, pitch: string) => void;
  isDrumColorGuide?: boolean;
  onToggleDrumColorGuide?: () => void;
  isSoloStage?: boolean;
  readOnly?: boolean;
}

interface DrumPieceDef {
  id: string;
  name: string;
  headLabel: string;
  defaultPitch: string;
  sticking: 'R' | 'L' | 'F';
  shortcut: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  shellHeight: number;
  type: 'drum' | 'cymbal' | 'kick';
  badgePlacement: 'top' | 'bottom';
}

const DRUM_PIECES: DrumPieceDef[] = [
  { id: 'crash', name: 'Crash 16"', headLabel: 'CRASH 16"', defaultPitch: 'A5', sticking: 'R', shortcut: 'E', cx: 158, cy: 62, rx: 46, ry: 29, shellHeight: 0, type: 'cymbal', badgePlacement: 'top' },
  { id: 'hihat', name: 'Hi-Hat 14"', headLabel: 'HI-HAT 14"', defaultPitch: 'G5', sticking: 'R', shortcut: 'D / K', cx: 108, cy: 144, rx: 40, ry: 26, shellHeight: 0, type: 'cymbal', badgePlacement: 'top' },
  { id: 'snare', name: 'Snare 14"', headLabel: 'SNARE 14"', defaultPitch: 'C5', sticking: 'L', shortcut: 'F / J', cx: 218, cy: 168, rx: 39, ry: 27, shellHeight: 16, type: 'drum', badgePlacement: 'bottom' },
  { id: 'tom_hi', name: 'High Tom 10"', headLabel: '10" HI-TOM', defaultPitch: 'E5', sticking: 'R', shortcut: 'G', cx: 292, cy: 84, rx: 30, ry: 21, shellHeight: 14, type: 'drum', badgePlacement: 'top' },
  { id: 'kick', name: 'Bass Drum 22"', headLabel: 'KICK 22"', defaultPitch: 'F4', sticking: 'F', shortcut: 'V / N', cx: 360, cy: 182, rx: 56, ry: 39, shellHeight: 20, type: 'kick', badgePlacement: 'bottom' },
  { id: 'tom_mid', name: 'Mid Tom 12"', headLabel: '12" MID-TOM', defaultPitch: 'D5', sticking: 'R', shortcut: 'H', cx: 428, cy: 88, rx: 33, ry: 23, shellHeight: 15, type: 'drum', badgePlacement: 'top' },
  { id: 'ride', name: 'Ride 20"', headLabel: 'RIDE 20"', defaultPitch: 'F5', sticking: 'R', shortcut: 'I', cx: 556, cy: 68, rx: 52, ry: 34, shellHeight: 0, type: 'cymbal', badgePlacement: 'top' },
  { id: 'tom_floor', name: 'Floor Tom 16"', headLabel: '16" FLOOR', defaultPitch: 'A4', sticking: 'R', shortcut: 'B', cx: 512, cy: 170, rx: 43, ry: 30, shellHeight: 22, type: 'drum', badgePlacement: 'bottom' }
];

function isHiHatOpenPitch(raw: string): boolean {
  if (!raw || raw === 'REST') return false;
  const p = raw.trim().toUpperCase();
  return p === 'G#5' || p === 'AB5' || p === 'A#4' || p === 'BB4' || p === 'HIHAT_OPEN' || p === 'OPEN_HIHAT' || p.includes('OPEN');
}

function isHiHatPedalPitch(raw: string): boolean {
  if (!raw || raw === 'REST') return false;
  const p = raw.trim().toUpperCase();
  return p === 'D3' || p === 'D4' || p === 'HIHAT_PEDAL' || p === 'PEDAL_HH' || p === 'HIHAT_FOOT' || p === '44';
}

function getPitchHz(pitch: string): number {
  if (!pitch || pitch === 'REST') return 0;
  const match = pitch.trim().match(/^([A-Ga-gHh])[#bB♮]?(-?\d+)$/);
  if (!match) return 0;
  const noteName = match[1].toUpperCase();
  const octave = parseInt(match[2], 10);
  const semitoneMap: Record<string, number> = {
    'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11, 'H': 11
  };
  let semi = semitoneMap[noteName] ?? 0;
  if (pitch.includes('#')) semi += 1;
  if (pitch.includes('b') || pitch.includes('B')) semi -= 1;
  const midi = (octave + 1) * 12 + semi;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// 🥁 Kanonische PAS-Zuordnung (Percussive Arts Society) & 100% disjunkte Drum-Map
const CANONICAL_DRUM_PITCH_MAP: Record<string, string> = {
  // 1. Kick (Bass Drum 22")
  'F4': 'kick', 'C3': 'kick', 'B2': 'kick', 'F3': 'kick',
  'BD': 'kick', 'KICK': 'kick', 'BASSDRUM': 'kick', '35': 'kick', '36': 'kick',

  // 2. Snare Drum 14"
  'C5': 'snare', 'C4': 'snare',
  'SD': 'snare', 'SNARE': 'snare', 'SNAREDRUM': 'snare', 'RIM': 'snare', 'SIDESTICK': 'snare', '38': 'snare', '40': 'snare',

  // 3. Hi-Hat 14" (Closed, Open, Pedal)
  'G5': 'hihat', 'G4': 'hihat', 'F#4': 'hihat', 'GB4': 'hihat',
  'G#5': 'hihat', 'AB5': 'hihat', 'A#4': 'hihat', 'BB4': 'hihat',
  'HH': 'hihat', 'HIHAT': 'hihat', 'HI-HAT': 'hihat', 'D3': 'hihat',
  'HIHAT_PEDAL': 'hihat', 'PEDAL_HH': 'hihat', 'HIHAT_FOOT': 'hihat',
  'HIHAT_OPEN': 'hihat', 'OPEN_HIHAT': 'hihat',
  '42': 'hihat', '44': 'hihat', '46': 'hihat',

  // 4. High Tom 10"
  'E5': 'tom_hi', 'E4': 'tom_hi',
  'TOM_HI': 'tom_hi', 'TOM1': 'tom_hi', 'HIGHTOM': 'tom_hi', '48': 'tom_hi', '50': 'tom_hi',

  // 5. Mid Tom 12"
  'D5': 'tom_mid', 'D4': 'tom_mid',
  'TOM_MID': 'tom_mid', 'TOM2': 'tom_mid', 'MIDTOM': 'tom_mid', '45': 'tom_mid', '47': 'tom_mid',

  // 6. Floor Tom 16"
  'A4': 'tom_floor', 'A3': 'tom_floor', 'G3': 'tom_floor',
  'TOM_FLOOR': 'tom_floor', 'TOM3': 'tom_floor', 'FLOORTOM': 'tom_floor', '41': 'tom_floor', '43': 'tom_floor',

  // 7. Crash Cymbal 16"
  'A5': 'crash', 'C6': 'crash',
  'CRASH': 'crash', 'CRASH1': 'crash', '49': 'crash', '57': 'crash',

  // 8. Ride Cymbal 20"
  'F5': 'ride',
  'RIDE': 'ride', 'RIDE1': 'ride', '51': 'ride', '59': 'ride',
  'RIDE_BELL': 'ride', 'RIDEBELL': 'ride', 'BELL': 'ride', 'GLOCKE': 'ride', '53': 'ride'
};

function getDrumPieceForPitch(raw: string): string | null {
  if (!raw || raw === 'REST') return null;
  const p = raw.trim().toUpperCase();

  const matchById = DRUM_PIECES.find(dp => dp.id.toUpperCase() === p);
  if (matchById) return matchById.id;

  const canonical = CANONICAL_DRUM_PITCH_MAP[p];
  if (canonical) return canonical;

  if (isHiHatOpenPitch(p)) return 'hihat';

  const hz = getPitchHz(p);
  if (hz > 0) {
    if (hz <= 150) return 'kick';
    if (hz <= 280) return 'snare';
    if (hz <= 380) return 'tom_floor';
    if (hz <= 520) return 'tom_mid';
    if (hz <= 700) return 'tom_hi';
    if (hz <= 1100) return 'ride';
    return 'hihat';
  }

  return null;
}

function checkPieceActive(piece: DrumPieceDef, activePitches: string[]): boolean {
  if (!activePitches || activePitches.length === 0) return false;
  return activePitches.some(raw => getDrumPieceForPitch(raw) === piece.id);
}

const KEYBOARD_MAP: Record<string, { pieceId: string; pitch: string; preferredHand?: 'R' | 'L' | 'F' }> = {
  'v': { pieceId: 'kick', pitch: 'F4', preferredHand: 'F' }, 'V': { pieceId: 'kick', pitch: 'F4', preferredHand: 'F' }, 'KeyV': { pieceId: 'kick', pitch: 'F4', preferredHand: 'F' },
  'n': { pieceId: 'kick', pitch: 'F4', preferredHand: 'F' }, 'N': { pieceId: 'kick', pitch: 'F4', preferredHand: 'F' }, 'KeyN': { pieceId: 'kick', pitch: 'F4', preferredHand: 'F' },
  'c': { pieceId: 'hihat', pitch: 'D3', preferredHand: 'F' }, 'C': { pieceId: 'hihat', pitch: 'D3', preferredHand: 'F' }, 'KeyC': { pieceId: 'hihat', pitch: 'D3', preferredHand: 'F' },
  'f': { pieceId: 'snare', pitch: 'C5', preferredHand: 'L' }, 'F': { pieceId: 'snare', pitch: 'C5', preferredHand: 'L' }, 'KeyF': { pieceId: 'snare', pitch: 'C5', preferredHand: 'L' },
  'j': { pieceId: 'snare', pitch: 'C5', preferredHand: 'R' }, 'J': { pieceId: 'snare', pitch: 'C5', preferredHand: 'R' }, 'KeyJ': { pieceId: 'snare', pitch: 'C5', preferredHand: 'R' },
  'd': { pieceId: 'hihat', pitch: 'G5' }, 'D': { pieceId: 'hihat', pitch: 'G5' }, 'KeyD': { pieceId: 'hihat', pitch: 'G5' },
  'k': { pieceId: 'hihat', pitch: 'G#5', preferredHand: 'R' }, 'K': { pieceId: 'hihat', pitch: 'G#5', preferredHand: 'R' }, 'KeyK': { pieceId: 'hihat', pitch: 'G#5', preferredHand: 'R' },
  'e': { pieceId: 'crash', pitch: 'A5', preferredHand: 'R' }, 'E': { pieceId: 'crash', pitch: 'A5', preferredHand: 'R' }, 'KeyE': { pieceId: 'crash', pitch: 'A5', preferredHand: 'R' },
  'i': { pieceId: 'ride', pitch: 'F5', preferredHand: 'R' }, 'I': { pieceId: 'ride', pitch: 'F5', preferredHand: 'R' }, 'KeyI': { pieceId: 'ride', pitch: 'F5', preferredHand: 'R' },
  'g': { pieceId: 'tom_hi', pitch: 'E5' }, 'G': { pieceId: 'tom_hi', pitch: 'E5' }, 'KeyG': { pieceId: 'tom_hi', pitch: 'E5' },
  'h': { pieceId: 'tom_mid', pitch: 'D5' }, 'H': { pieceId: 'tom_mid', pitch: 'D5' }, 'KeyH': { pieceId: 'tom_mid', pitch: 'D5' },
  'b': { pieceId: 'tom_floor', pitch: 'A4' }, 'B': { pieceId: 'tom_floor', pitch: 'A4' }, 'KeyB': { pieceId: 'tom_floor', pitch: 'A4' }
};

/**
 * 🥢 Biomechanische 2.5D Stick-Vektor-Geometrie (Symmetrischer Matched-Grip V-Winkel ±36°):
 * - Linke Hand ('L'): Griffende (Butt) liegt unten-links, Stockspitze (Tip) zeigt nach rechts-oben ( / ).
 * - Rechte Hand ('R'): Griffende (Butt) liegt unten-rechts, Stockspitze (Tip) zeigt nach links-oben ( \ ).
 * Garantiert auf jedem Kessel und Becken eine sofort erkennbare, anatomisch realistische Hand-Ausrichtung.
 */
function computeBiomechanicalStickGeometry(piece: DrumPieceDef, hand: 'R' | 'L'): {
  tipX: number;
  tipY: number;
  buttX: number;
  buttY: number;
  gripX: number;
  gripY: number;
  reboundDx: number;
  reboundDy: number;
} {
  const isCymbal = piece.type === 'cymbal';
  const tipX = isCymbal
    ? piece.cx + (hand === 'L' ? -piece.rx * 0.22 : piece.rx * 0.22)
    : piece.cx + (hand === 'L' ? -4.8 : 4.8);
  const tipY = isCymbal
    ? piece.cy + piece.ry * 0.18
    : piece.cy - 2.0;

  // Symmetrischer 36° Matched-Grip V-Winkel relativ zur Vertikalen:
  // 'L' -> Butt unten-links (ux < 0, uy > 0) => Stock zeigt nach rechts-oben (/)
  // 'R' -> Butt unten-rechts (ux > 0, uy > 0) => Stock zeigt nach links-oben (\)
  const angleRad = (36 * Math.PI) / 180;
  const ux = hand === 'L' ? -Math.sin(angleRad) : Math.sin(angleRad);
  const uy = Math.cos(angleRad);

  const stickLength = isCymbal ? 40 : 42;
  const buttX = tipX + ux * stickLength;
  const buttY = tipY + uy * stickLength;
  const gripX = tipX + ux * (stickLength * 0.68);
  const gripY = tipY + uy * (stickLength * 0.68);

  return {
    tipX,
    tipY,
    buttX,
    buttY,
    gripX,
    gripY,
    reboundDx: ux * 9,
    reboundDy: uy * 9 - 4
  };
}

export const MicroScoreDrumKitVisualizer: React.FC<MicroScoreDrumKitVisualizerProps> = ({
  activePitches,
  activeNotes,
  playheadPos,
  onHit,
  isDrumColorGuide,
  onToggleDrumColorGuide,
  isSoloStage = false,
  readOnly = false
}) => {
  const [internalColorGuide, setInternalColorGuide] = useState<boolean>(true);
  const colorGuideActive = isDrumColorGuide !== undefined ? isDrumColorGuide : internalColorGuide;
  const handleToggleColorGuide = useCallback(() => {
    if (onToggleDrumColorGuide) {
      onToggleDrumColorGuide();
    } else {
      setInternalColorGuide(prev => !prev);
    }
  }, [onToggleDrumColorGuide]);

  const [localHits, setLocalHits] = useState<Record<string, number>>({});
  // ⚡ 0,1% Re-Trigger Engine: Deterministische Keys für echten Transienten-Impuls bei jedem Schlag
  const [strikeTicks, setStrikeTicks] = useState<Record<string, number>>({});
  // 🥢 Biomechanische Hand-Zuordnung pro Instrument ('R' | 'L' | 'F') mit intelligentem Wechselschlag (R ⇄ L)
  const [activeHandByPiece, setActiveHandByPiece] = useState<Record<string, 'R' | 'L' | 'F'>>({});
  const lastHandRef = useRef<Record<string, { hand: 'R' | 'L'; timestamp: number }>>({});

  const lastPlayheadRef = useRef<{ bar: number; fraction: number } | undefined>(undefined);
  const lastNotesSigRef = useRef<string>('');
  const lastLocalHitTimeRef = useRef<number>(0);

  const resolveNextHandForPiece = useCallback(
    (pieceId: string, preferredHand?: 'R' | 'L' | 'F', isSimultaneousWithCymbal = false): 'R' | 'L' | 'F' => {
      if (pieceId === 'kick') return 'F';
      if (preferredHand === 'F') return 'F';
      if (preferredHand === 'R' || preferredHand === 'L') {
        lastHandRef.current[pieceId] = { hand: preferredHand, timestamp: Date.now() };
        return preferredHand;
      }
      if (isSimultaneousWithCymbal && (pieceId === 'snare' || pieceId.startsWith('tom_'))) {
        lastHandRef.current[pieceId] = { hand: 'L', timestamp: Date.now() };
        return 'L';
      }
      const now = Date.now();
      const prevEntry = lastHandRef.current[pieceId];
      // Wechselschlag (R -> L -> R -> L), wenn auf derselben Trommel / Hi-Hat innerhalb von 650ms erneut geschlagen wird
      const canAlternate = pieceId === 'snare' || pieceId.startsWith('tom_') || pieceId === 'hihat';
      if (canAlternate && prevEntry && now - prevEntry.timestamp < 650) {
        const nextHand: 'R' | 'L' = prevEntry.hand === 'R' ? 'L' : 'R';
        lastHandRef.current[pieceId] = { hand: nextHand, timestamp: now };
        return nextHand;
      }
      const pieceDef = DRUM_PIECES.find(p => p.id === pieceId);
      const defaultHand: 'R' | 'L' = pieceDef?.sticking === 'L' ? 'L' : 'R';
      lastHandRef.current[pieceId] = { hand: defaultHand, timestamp: now };
      return defaultHand;
    },
    []
  );

  const triggerHit = useCallback((pieceId: string, pitch: string, preferredHand?: 'R' | 'L' | 'F') => {
    const now = Date.now();
    lastLocalHitTimeRef.current = now;

    // ⚡ 0,1% Audio-First Doktrin: Zuerst Audio & Noten-Callback bei t = 0.0 ms feuern!
    if (onHit) onHit(pieceId, pitch);

    const isPedalHat = isHiHatPedalPitch(pitch);
    const resolvedHand = isPedalHat ? 'F' : resolveNextHandForPiece(pieceId, preferredHand, false);
    setActiveHandByPiece(prev => ({
      ...prev,
      [pieceId]: resolvedHand
    }));
    setLocalHits(prev => ({
      ...prev,
      [pieceId]: now,
      ...(pitch === 'G#5' ? { hihat_open: now } : {}),
      ...(isPedalHat ? { hihat_pedal: now } : {})
    }));
    setStrikeTicks(prev => ({
      ...prev,
      [pieceId]: (prev[pieceId] || 0) + 1,
      ...(isPedalHat ? { hihat_pedal: (prev['hihat_pedal'] || 0) + 1 } : {})
    }));
    setTimeout(() => {
      setLocalHits(prev => {
        if (!prev[pieceId] && !prev['hihat_pedal']) return prev;
        const next = { ...prev };
        delete next[pieceId];
        if (pitch === 'G#5') delete next['hihat_open'];
        if (isPedalHat) delete next['hihat_pedal'];
        return next;
      });
    }, 240);
  }, [onHit, resolveNextHandForPiece]);

  // 1. Playback Synchronisation: Bei jedem Playhead-Schritt Schläge auf exakter Zählzeit als Transienten-Impuls feuern
  useEffect(() => {
    if (playheadPos) {
      const isNewPos = !lastPlayheadRef.current || 
        lastPlayheadRef.current.bar !== playheadPos.bar || 
        lastPlayheadRef.current.fraction !== playheadPos.fraction;

      if (isNewPos) {
        lastPlayheadRef.current = playheadPos;
        const struckNotes = (activeNotes || []).filter(
          n => n.barIndex === playheadPos.bar && n.beatFraction != null && Math.abs(n.beatFraction - playheadPos.fraction) < 0.5 && n.pitch && n.pitch !== 'REST'
        );

        if (struckNotes.length > 0) {
          const struckPieceIds = DRUM_PIECES
            .filter(piece => struckNotes.some(n => checkPieceActive(piece, [n.pitch])))
            .map(p => p.id);
          const hasCymbalHit = struckPieceIds.some(
            id => (id === 'hihat' && !struckNotes.some(n => isHiHatPedalPitch(n.pitch))) || id === 'ride' || id === 'crash'
          );

          setActiveHandByPiece(prev => {
            const nextHands = { ...prev };
            struckPieceIds.forEach(id => {
              if (id === 'hihat' && struckNotes.some(n => isHiHatPedalPitch(n.pitch))) {
                nextHands[id] = 'F';
              } else if (id === 'hihat' || id === 'ride' || id === 'crash') {
                nextHands[id] = hasCymbalHit && struckPieceIds.length > 1 ? 'R' : resolveNextHandForPiece(id, undefined, false);
              } else {
                nextHands[id] = resolveNextHandForPiece(id, undefined, hasCymbalHit);
              }
            });
            return nextHands;
          });

          setStrikeTicks(prev => {
            const next = { ...prev };
            DRUM_PIECES.forEach(piece => {
              const isStruck = struckNotes.some(n => checkPieceActive(piece, [n.pitch]));
              if (isStruck) {
                next[piece.id] = (next[piece.id] || 0) + 1;
              }
            });
            if (struckNotes.some(n => isHiHatPedalPitch(n.pitch))) {
              next['hihat_pedal'] = (next['hihat_pedal'] || 0) + 1;
            }
            return next;
          });
        }
      }
    } else {
      lastPlayheadRef.current = undefined;
    }
  }, [playheadPos, activeNotes, resolveNextHandForPiece]);

  // 2. Edit / Auswahl-Modus: Wenn eine Note im Notensystem fokussiert wird (unterdrückt Doppel-Trigger nach lokalem Pad-Klick)
  useEffect(() => {
    if (!playheadPos && activePitches && activePitches.length > 0) {
      const sig = activePitches.slice().sort().join(',');
      if (sig !== lastNotesSigRef.current) {
        lastNotesSigRef.current = sig;
        if (Date.now() - lastLocalHitTimeRef.current < 280) {
          return;
        }
        const struckPieceIds = DRUM_PIECES
          .filter(piece => checkPieceActive(piece, activePitches))
          .map(p => p.id);
        const hasCymbalHit = struckPieceIds.some(
          id => (id === 'hihat' && !activePitches.some(p => isHiHatPedalPitch(p))) || id === 'ride' || id === 'crash'
        );

        setActiveHandByPiece(prev => {
          const nextHands = { ...prev };
          struckPieceIds.forEach(id => {
            if (id === 'hihat' && activePitches.some(p => isHiHatPedalPitch(p))) {
              nextHands[id] = 'F';
            } else if (id === 'hihat' || id === 'ride' || id === 'crash') {
              nextHands[id] = hasCymbalHit && struckPieceIds.length > 1 ? 'R' : resolveNextHandForPiece(id, undefined, false);
            } else {
              nextHands[id] = resolveNextHandForPiece(id, undefined, hasCymbalHit);
            }
          });
          return nextHands;
        });

        setStrikeTicks(prev => {
          const next = { ...prev };
          DRUM_PIECES.forEach(piece => {
            if (checkPieceActive(piece, activePitches)) {
              next[piece.id] = (next[piece.id] || 0) + 1;
            }
          });
          if (activePitches.some(p => isHiHatPedalPitch(p))) {
            next['hihat_pedal'] = (next['hihat_pedal'] || 0) + 1;
          }
          return next;
        });
      }
    } else if (!activePitches || activePitches.length === 0) {
      lastNotesSigRef.current = '';
    }
  }, [playheadPos, activePitches, resolveNextHandForPiece]);

  useEffect(() => {
    if (readOnly) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const mapping = KEYBOARD_MAP[e.key] || KEYBOARD_MAP[e.code];
      if (mapping) {
        e.preventDefault();
        triggerHit(mapping.pieceId, mapping.pitch, mapping.preferredHand);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readOnly, triggerHit]);

  const activeMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    DRUM_PIECES.forEach(piece => {
      const isPitchActive = checkPieceActive(piece, activePitches);
      const isLocalActive = !!localHits[piece.id] && Date.now() - localHits[piece.id] < 240;
      map[piece.id] = isPitchActive || isLocalActive;
    });
    return map;
  }, [activePitches, localHits]);

  const isHiHatOpen = useMemo(() => {
    return activePitches.some(p => isHiHatOpenPitch(p)) || (!!localHits['hihat'] && localHits['hihat_open'] !== undefined);
  }, [activePitches, localHits]);

  const isHiHatPedalActive = useMemo(() => {
    return activePitches.some(p => isHiHatPedalPitch(p)) || !!localHits['hihat_pedal'];
  }, [activePitches, localHits]);

  return (
    <div
      role="region"
      aria-label="Interaktives 2027 Pro 2.5D Schlagzeug-Studio"
      style={{
        width: '100%', maxWidth: '100%', background: 'linear-gradient(180deg, #070a12 0%, #0d1424 100%)',
        borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 10px 28px rgba(0, 0, 0, 0.45)', padding: '10px 14px 12px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', userSelect: 'none'
      }}
    >
      {/* 1. Header: Titel, Farb-Guide Toggle, Sticking-Farbcode & Tastatur-Legende */}
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', padding: '0 4px', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.9rem' }}>🥁</span>
          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Acoustic Pro Drumkit</span>
          <button
            type="button"
            onClick={handleToggleColorGuide}
            aria-pressed={colorGuideActive}
            title="Synästhetischer Farb-Guide: Notenköpfe im Notensystem erhalten exakt dieselbe Farbe wie der zugehörige Kessel bzw. das Becken"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.64rem',
              fontWeight: 800,
              padding: '3px 9px',
              borderRadius: '999px',
              cursor: 'pointer',
              background: colorGuideActive
                ? 'linear-gradient(90deg, rgba(225, 29, 72, 0.28) 0%, rgba(2, 132, 199, 0.28) 50%, rgba(124, 58, 237, 0.28) 100%)'
                : 'rgba(30, 41, 59, 0.85)',
              color: colorGuideActive ? '#ffffff' : '#cbd5e1',
              border: colorGuideActive ? '1.2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.16)',
              boxShadow: colorGuideActive ? '0 0 12px rgba(56, 189, 248, 0.32)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <span>🎨</span>
            <span>{colorGuideActive ? 'Farb-Guide: AN (Noten = Kessel)' : 'Farb-Guide (Noten = Kessel)'}</span>
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.64rem', fontWeight: 700, color: '#94a3b8', flexWrap: 'wrap' }}>
          {colorGuideActive ? (
            <>
              {(['snare', 'tom_hi', 'tom_mid', 'tom_floor', 'kick', 'hihat', 'crash', 'ride'] as const).map(id => {
                const c = CANONICAL_DRUM_COLOR_GUIDE[id];
                return (
                  <span key={id} style={{ display: ' inline-flex', alignItems: 'center', gap: '3.5px', color: '#e2e8f0', fontSize: '0.61rem', fontWeight: 800 }}>
                    <span style={{ padding: '1px 4.5px', borderRadius: '4px', background: c.staffColor, color: '#fff', fontSize: '0.55rem', fontWeight: 900 }}>
                      {c.shortCode}
                    </span>
                    <span>{c.shortBadge}</span>
                  </span>
                );
              })}
            </>
          ) : (
            <>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '15px', height: '15px', borderRadius: '4px', background: '#3b82f6', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.60rem', fontWeight: 900 }}>R</span>Rechts (Blau)</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '15px', height: '15px', borderRadius: '4px', background: '#ec4899', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.60rem', fontWeight: 900 }}>L</span>Links (Pink)</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '15px', height: '15px', borderRadius: '4px', background: '#8b5cf6', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.60rem', fontWeight: 900 }}>F</span>Füße (Violett)</span>
              <span style={{ color: '#94a3b8', fontSize: '0.63rem', borderLeft: '1px solid rgba(255,255,255,0.14)', paddingLeft: '8px' }}>⌨️ V/N (Kick), C (HH-Pedal), F/J (Snare), D/K (Hi-Hat), E, I, G, H, B</span>
            </>
          )}
        </div>
      </div>

      {/* 2. 100% Panorama 2.5D SVG Bühne (eng gefasste viewBox 56..624 für +23% größere Kessel, Solo-Stage bis 436px) */}
      <svg
        viewBox="56 6 568 258"
        style={{
          width: '100%',
          maxHeight: isSoloStage ? '436px' : '264px',
          overflow: 'visible',
          transition: 'max-height 0.22s cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      >
        <defs>
          <style>{`
            @keyframes cymbal-wobble {
              0% { transform: scale(1.055) rotate(0deg); }
              18% { transform: scale(1.04) rotate(-4.2deg) skewX(1.4deg); }
              38% { transform: scale(1.022) rotate(2.8deg) skewX(-1.0deg); }
              60% { transform: scale(1.01) rotate(-1.4deg); }
              82% { transform: scale(1.004) rotate(0.6deg); }
              100% { transform: scale(1) rotate(0deg); }
            }
            @keyframes cymbal-specular-flash {
              0% { opacity: 0.95; transform: scale(0.92); }
              12% { opacity: 1.0; transform: scale(1.02); }
              100% { opacity: 0; transform: scale(1.08); }
            }
            @keyframes drum-hit-pulse {
              0% { transform: scale(1.0); }
              16% { transform: scale(1.048, 0.965); }
              45% { transform: scale(0.985, 1.018); }
              75% { transform: scale(1.008, 0.996); }
              100% { transform: scale(1.0); }
            }
            @keyframes transient-head-flash {
              0% { opacity: 0.92; }
              15% { opacity: 0.85; }
              100% { opacity: 0; }
            }
            @keyframes transient-halo-fade {
              0% { opacity: 1; transform: scale(0.98); }
              25% { opacity: 0.85; transform: scale(1.03); }
              100% { opacity: 0.18; transform: scale(1.0); }
            }
            @keyframes drum-ripple-primary {
              0% { opacity: 0.95; transform: scale(0.22); stroke-width: 3.2px; }
              100% { opacity: 0; transform: scale(1.16); stroke-width: 0.8px; }
            }
            @keyframes drum-ripple-secondary {
              0% { opacity: 0.80; transform: scale(0.14); stroke-width: 2.2px; }
              100% { opacity: 0; transform: scale(0.94); stroke-width: 0.6px; }
            }
            @keyframes stick-tip-rebound {
              0% { opacity: 1; transform: translate(0px, 0px) scale(1.12); }
              28% { opacity: 0.98; transform: translate(calc(var(--rebound-dx, 0px) * 0.45), calc(var(--rebound-dy, -6px) * 0.45)) scale(1.0); }
              100% { opacity: 0; transform: translate(var(--rebound-dx, 0px), var(--rebound-dy, -14px)) scale(0.82); }
            }
            @keyframes beater-stroke {
              0% { transform: translateY(0); }
              28% { transform: translateY(-11px) scaleY(1.06); }
              65% { transform: translateY(1.5px); }
              100% { transform: translateY(0); }
            }
            @keyframes pedal-depress {
              0% { transform: translateY(0) scaleY(1); }
              30% { transform: translateY(3.5px) scaleY(0.88); }
              100% { transform: translateY(0) scaleY(1); }
            }
            @keyframes hihat-shimmer { 0% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: 12; } }
            .wobble-active { animation: cymbal-wobble 0.54s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
            .drum-active { animation: drum-hit-pulse 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
            .beater-active { animation: beater-stroke 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
            .pedal-active { animation: pedal-depress 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
          `}</style>

          <filter id="drum-glow-filter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          {/* Transiente Strike-Overlays pro Sticking-Farbe (R = Blau, L = Pink, F = Violett) */}
          <radialGradient id="strike-flash-R" cx="50%" cy="46%" r="52%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="30%" stopColor="#93c5fd" stopOpacity="0.72" />
            <stop offset="68%" stopColor="#3b82f6" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.0" />
          </radialGradient>

          <radialGradient id="strike-flash-L" cx="50%" cy="46%" r="52%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="30%" stopColor="#fbcfe8" stopOpacity="0.75" />
            <stop offset="68%" stopColor="#ec4899" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#be185d" stopOpacity="0.0" />
          </radialGradient>

          <radialGradient id="strike-flash-F" cx="50%" cy="46%" r="52%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="30%" stopColor="#ddd6fe" stopOpacity="0.72" />
            <stop offset="68%" stopColor="#8b5cf6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#5b21b6" stopOpacity="0.0" />
          </radialGradient>

          {/* Becken-Specular-Highlight (Gold-Weiß + Blau-Schimmer bei Anschlag, erhält 100% Bronze-Look) */}
          <radialGradient id="cymbal-specular-burst" cx="42%" cy="38%" r="56%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="28%" stopColor="#fef08a" stopOpacity="0.75" />
            <stop offset="62%" stopColor="#60a5fa" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
          </radialGradient>

          <radialGradient id="cymbal-bronze" cx="45%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#fef08a" /><stop offset="25%" stopColor="#f59e0b" /><stop offset="65%" stopColor="#d97706" /><stop offset="100%" stopColor="#78350f" />
          </radialGradient>

          <radialGradient id="drum-head-white" cx="50%" cy="46%" r="52%">
            <stop offset="0%" stopColor="#ffffff" /><stop offset="70%" stopColor="#f1f5f9" /><stop offset="90%" stopColor="#e2e8f0" /><stop offset="100%" stopColor="#94a3b8" />
          </radialGradient>

          <radialGradient id="snare-head-coated" cx="50%" cy="46%" r="52%">
            <stop offset="0%" stopColor="#fafafa" /><stop offset="65%" stopColor="#f4f4f5" /><stop offset="88%" stopColor="#e4e4e7" /><stop offset="100%" stopColor="#a1a1aa" />
          </radialGradient>

          <radialGradient id="kick-head-black" cx="50%" cy="44%" r="55%">
            <stop offset="0%" stopColor="#1e293b" /><stop offset="60%" stopColor="#0f172a" /><stop offset="92%" stopColor="#020617" /><stop offset="100%" stopColor="#334155" />
          </radialGradient>

          <linearGradient id="chrome-rim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" /><stop offset="35%" stopColor="#94a3b8" /><stop offset="70%" stopColor="#475569" /><stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>

          <linearGradient id="shell-depth-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0f172a" /><stop offset="25%" stopColor="#334155" /><stop offset="55%" stopColor="#1e293b" /><stop offset="85%" stopColor="#0f172a" /><stop offset="100%" stopColor="#020617" />
          </linearGradient>
        </defs>

        {/* 3. Dezenter Studio-Teppich (Drum Rug) zur räumlichen Verankerung */}
        <ellipse cx="345" cy="168" rx="285" ry="92" fill="rgba(30, 41, 59, 0.28)" stroke="rgba(148, 163, 184, 0.08)" strokeWidth="1.5" />

        {/* 4. Hardware-Bühne: Tom-Mount Gestänge & Kick-Spurs (kollisionsfrei geführt) */}
        <g opacity="0.82">
          <path d="M 360 143 L 360 116 L 292 94" fill="none" stroke="#94a3b8" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M 360 116 L 428 98" fill="none" stroke="#94a3b8" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="360" cy="116" r="4.2" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
          <line x1="306" y1="194" x2="274" y2="220" stroke="#94a3b8" strokeWidth="3.2" strokeLinecap="round" />
          <ellipse cx="272" cy="222" rx="4" ry="2.5" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
          <line x1="414" y1="194" x2="446" y2="220" stroke="#94a3b8" strokeWidth="3.2" strokeLinecap="round" />
          <ellipse cx="448" cy="222" rx="4" ry="2.5" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
          <line x1="482" y1="186" x2="472" y2="216" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
          <line x1="542" y1="186" x2="552" y2="216" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* 5. Physisches Hi-Hat-Fußpedal (D3 · Taste C · Linker Fuß) */}
        <g
          role="button"
          tabIndex={readOnly ? -1 : 0}
          aria-label="Pedal Hi-Hat (Linker Fuß, Ton: D3, Taste: C)"
          aria-keyshortcuts="C"
          onPointerDown={e => {
            if (readOnly || (e.pointerType === 'mouse' && e.button !== 0)) return;
            e.preventDefault();
            triggerHit('hihat', 'D3');
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              triggerHit('hihat', 'D3');
            }
          }}
          style={{ cursor: readOnly ? 'default' : 'pointer', touchAction: 'manipulation' }}
        >
          {/* Zugstange von Hi-Hat zu Fußmaschine */}
          <line x1="108" y1="170" x2="108" y2="202" stroke="#94a3b8" strokeWidth="2.4" strokeLinecap="round" />
          <g
            key={`hh-pedal-${strikeTicks['hihat_pedal'] || 0}`}
            className={isHiHatPedalActive ? 'pedal-active' : undefined}
            style={{ transformOrigin: '108px 212px' }}
          >
            <rect
              x="97"
              y="198"
              width="22"
              height="24"
              rx="4"
              fill={isHiHatPedalActive ? '#6d28d9' : '#1e293b'}
              stroke={isHiHatPedalActive ? '#c4b5fd' : '#64748b'}
              strokeWidth={isHiHatPedalActive ? '1.8' : '1'}
            />
            <line x1="101" y1="204" x2="115" y2="204" stroke="#94a3b8" strokeWidth="1" />
            <line x1="101" y1="209" x2="115" y2="209" stroke="#94a3b8" strokeWidth="1" />
            <line x1="101" y1="214" x2="115" y2="214" stroke="#94a3b8" strokeWidth="1" />
          </g>
          {/* HUD Badge für Hi-Hat Fußpedal */}
          <g transform="translate(108, 236)">
            <rect
              x="-34"
              y="-8.5"
              width="68"
              height="17"
              rx="8.5"
              fill="rgba(15, 23, 42, 0.94)"
              stroke={isHiHatPedalActive ? '#a78bfa' : 'rgba(255, 255, 255, 0.24)'}
              strokeWidth={isHiHatPedalActive ? '1.6' : '0.9'}
              filter="drop-shadow(0 2px 6px rgba(0,0,0,0.6))"
            />
            <circle cx="-22" cy="0" r="5.2" fill="#8b5cf6" />
            <text x="-22" y="2.6" textAnchor="middle" fill="#ffffff" fontSize="7.2" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif">
              F
            </text>
            <text x="6" y="2.8" textAnchor="middle" fill={isHiHatPedalActive ? '#ddd6fe' : '#f1f5f9'} fontSize="7.4" fontWeight="800" fontFamily="system-ui, -apple-system, sans-serif">
              C · PEDAL
            </text>
          </g>
        </g>

        {/* 6. Bass-Drum Pedal Hardware & Dynamischer Beater (F4 · Taste V/N · Rechter Fuß) */}
        <g opacity="0.95">
          <rect x="351" y="216" width="18" height="12" rx="2.5" fill={activeMap['kick'] ? '#5b21b6' : '#334155'} stroke={activeMap['kick'] ? '#c4b5fd' : '#475569'} strokeWidth="1" />
          <line x1="360" y1="204" x2="360" y2="218" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
          <g key={`beater-${strikeTicks['kick'] || 0}`} className={activeMap['kick'] ? 'beater-active' : undefined} style={{ transformOrigin: '360px 204px' }}>
            <line x1="360" y1="184" x2="360" y2="204" stroke="#cbd5e1" strokeWidth="2.2" strokeLinecap="round" />
            <ellipse cx="360" cy="184" rx="4.5" ry="3.2" fill="#f8fafc" stroke="#8b5cf6" strokeWidth="1" />
          </g>
        </g>

        {/* 7. Alle 8 Instrumente mit Transienten-Hüllkurve, biomechanischem Stick-Vektor & optionalem Farb-Guide */}
        {DRUM_PIECES.map(piece => {
          const isActive = !!activeMap[piece.id];
          const strikeKey = strikeTicks[piece.id] || 0;
          const isHiHat = piece.id === 'hihat';
          const isPedalChick = isHiHat && isHiHatPedalActive;
          const dynamicHand = activeHandByPiece[piece.id];
          const effectiveSticking: 'R' | 'L' | 'F' = isPedalChick ? 'F' : (dynamicHand || piece.sticking);
          const handOnly: 'R' | 'L' = effectiveSticking === 'L' ? 'L' : 'R';
          const stickGeo = computeBiomechanicalStickGeometry(piece, handOnly);
          const handBadgeColor = handOnly === 'R' ? '#2563eb' : '#db2777';
          const handBadgeStroke = handOnly === 'R' ? '#93c5fd' : '#f9a8d4';
          const pieceGuide = CANONICAL_DRUM_COLOR_GUIDE[piece.id] || CANONICAL_DRUM_COLOR_GUIDE.hihat;
          const stickingColor = colorGuideActive
            ? pieceGuide.staffColor
            : (effectiveSticking === 'R' ? '#3b82f6' : effectiveSticking === 'L' ? '#ec4899' : '#8b5cf6');
          const stickingGlow = colorGuideActive
            ? pieceGuide.stageGlow
            : (effectiveSticking === 'R' ? '#60a5fa' : effectiveSticking === 'L' ? '#f472b6' : '#a78bfa');
          const flashGradId = effectiveSticking === 'R' ? 'url(#strike-flash-R)' : effectiveSticking === 'L' ? 'url(#strike-flash-L)' : 'url(#strike-flash-F)';
          const isLiftedOpen = isHiHat && isHiHatOpen;
          const badgeY = piece.badgePlacement === 'bottom'
            ? piece.cy + piece.ry + piece.shellHeight + 14
            : piece.cy - piece.ry - 15;

          return (
            <g
              key={piece.id}
              role="button"
              tabIndex={readOnly ? -1 : 0}
              aria-label={`${piece.name} (${piece.sticking === 'R' ? 'Rechte Hand' : piece.sticking === 'L' ? 'Linke Hand' : 'Fuß'}, Ton: ${piece.defaultPitch}, Taste: ${piece.shortcut})${isHiHat ? (isHiHatOpen ? ' - Offen' : ' - Geschlossen') : ''}`}
              aria-keyshortcuts={piece.shortcut}
              onPointerDown={e => {
                if (readOnly || (e.pointerType === 'mouse' && e.button !== 0)) return;
                e.preventDefault();
                triggerHit(piece.id, isHiHat && isHiHatOpen ? 'G#5' : piece.defaultPitch);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  triggerHit(piece.id, isHiHat && isHiHatOpen ? 'G#5' : piece.defaultPitch);
                }
              }}
              style={{
                cursor: readOnly ? 'default' : 'pointer',
                touchAction: 'manipulation'
              }}
            >
              {/* Kesselschatten */}
              <ellipse cx={piece.cx} cy={piece.cy + (piece.shellHeight > 0 ? piece.shellHeight + 2 : 4)} rx={piece.rx + 2} ry={piece.ry + 2} fill="rgba(0, 0, 0, 0.55)" />

              {/* Farbcodierter Sticking-Halo mit natürlicher Attack-Decay-Hüllkurve */}
              {isActive && (
                <ellipse
                  key={`halo-${piece.id}-${strikeKey}`}
                  cx={piece.cx}
                  cy={piece.cy - (isLiftedOpen ? 6 : 0)}
                  rx={piece.rx + 5.5}
                  ry={piece.ry + 5.5}
                  fill="none"
                  stroke={stickingColor}
                  strokeWidth="3.6"
                  filter="url(#drum-glow-filter)"
                  style={{
                    transformOrigin: `${piece.cx}px ${piece.cy}px`,
                    animation: 'transient-halo-fade 0.42s ease-out forwards'
                  }}
                />
              )}

              {/* Animierter Instrumentenkörper mit deterministischem Re-Trigger Key */}
              <g
                key={`anim-${piece.id}-${strikeKey}`}
                className={isActive ? (piece.type === 'cymbal' ? 'wobble-active' : 'drum-active') : undefined}
                style={{
                  transformOrigin: `${piece.cx}px ${piece.cy}px`
                }}
              >
                {/* BECKEN (Crash, Ride, Hi-Hat) — 100% echtes Bronze-Material + Specular-Edge-Flash */}
                {piece.type === 'cymbal' && (
                  <g transform={isLiftedOpen ? 'translate(0, -6)' : isPedalChick ? 'translate(0, 1.5)' : undefined}>
                    {isHiHat && (
                      <g opacity={isLiftedOpen ? 0.92 : 0.45}>
                        <ellipse cx={piece.cx} cy={piece.cy + (isLiftedOpen ? 6 : 2)} rx={piece.rx} ry={piece.ry} fill="url(#cymbal-bronze)" stroke="#78350f" strokeWidth="1" />
                        <ellipse cx={piece.cx} cy={piece.cy + (isLiftedOpen ? 3 : 1)} rx={piece.rx - 2} ry={piece.ry - 2} fill="rgba(0,0,0,0.55)" />
                      </g>
                    )}
                    {/* Echtes Bronze-Becken bleibt immer erhalten */}
                    <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx} ry={piece.ry} fill="url(#cymbal-bronze)" stroke={isActive || colorGuideActive ? stickingGlow : '#b45309'} strokeWidth={isActive || colorGuideActive ? '2.6' : '1.5'} />
                    {/* Synästhetisches Farb-Glaze im Farb-Guide-Modus (Notenfarbe === Beckenfarbe) */}
                    {colorGuideActive && (
                      <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx - 1.5} ry={piece.ry - 1.5} fill={pieceGuide.stageFill} opacity={isActive ? 0.78 : 0.62} style={{ pointerEvents: 'none' }} />
                    )}
                    {/* Transiente Specular-Glanz-Explosion beim Anschlag */}
                    {isActive && (
                      <ellipse
                        key={`cym-flash-${piece.id}-${strikeKey}`}
                        cx={piece.cx}
                        cy={piece.cy}
                        rx={piece.rx - 1}
                        ry={piece.ry - 1}
                        fill="url(#cymbal-specular-burst)"
                        style={{
                          transformOrigin: `${piece.cx}px ${piece.cy}px`,
                          animation: 'cymbal-specular-flash 0.36s ease-out forwards',
                          pointerEvents: 'none'
                        }}
                      />
                    )}
                    {/* Abdreh-Rillen (Lathing Grooves) */}
                    <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx * 0.72} ry={piece.ry * 0.72} fill="none" stroke="rgba(120, 53, 15, 0.38)" strokeWidth="0.75" />
                    <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx * 0.45} ry={piece.ry * 0.45} fill="none" stroke="rgba(120, 53, 15, 0.42)" strokeWidth="0.75" />
                    {/* Becken-Kuppe (Bell) */}
                    <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx * 0.22} ry={piece.ry * 0.22} fill="#92400e" stroke={isActive ? '#fef08a' : '#78350f'} strokeWidth="1.1" />
                    <circle cx={piece.cx} cy={piece.cy} r="3" fill="#1e293b" />
                    <circle cx={piece.cx} cy={piece.cy} r="1.5" fill="#94a3b8" />

                    {/* Konzentrische Becken-Schockwelle in Sticking-Farbe */}
                    {isActive && (
                      <g key={`cym-ripple-${piece.id}-${strikeKey}`} style={{ transformOrigin: `${piece.cx}px ${piece.cy}px`, pointerEvents: 'none' }}>
                        <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx * 0.88} ry={piece.ry * 0.88} fill="none" stroke="#fef08a" style={{ animation: 'drum-ripple-primary 0.42s ease-out forwards' }} />
                        <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx * 0.62} ry={piece.ry * 0.62} fill="none" stroke={stickingGlow} style={{ animation: 'drum-ripple-secondary 0.48s ease-out forwards' }} />
                      </g>
                    )}

                    {/* Biomechanischer Hickory-Stick Impact & Rebound auf der Beckenschulter (echte R/L-Handrichtung) */}
                    {isActive && !isPedalChick && (
                      <g
                        key={`cym-stick-${piece.id}-${strikeKey}`}
                        style={{
                          transformOrigin: `${stickGeo.tipX}px ${stickGeo.tipY}px`,
                          animation: 'stick-tip-rebound 0.27s ease-out forwards',
                          pointerEvents: 'none',
                          ['--rebound-dx' as string]: `${stickGeo.reboundDx.toFixed(1)}px`,
                          ['--rebound-dy' as string]: `${stickGeo.reboundDy.toFixed(1)}px`
                        }}
                      >
                        {/* Konischer Hickory-Schaft vom Hand-Anker zum Becken-Impact */}
                        <line
                          x1={stickGeo.buttX}
                          y1={stickGeo.buttY}
                          x2={stickGeo.tipX}
                          y2={stickGeo.tipY}
                          stroke="#fde68a"
                          strokeWidth="3.6"
                          strokeLinecap="round"
                        />
                        <line
                          x1={stickGeo.buttX}
                          y1={stickGeo.buttY}
                          x2={stickGeo.tipX}
                          y2={stickGeo.tipY}
                          stroke="#fef3c7"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        {/* Teardrop-Stick-Tip am Aufprallpunkt */}
                        <circle cx={stickGeo.tipX} cy={stickGeo.tipY} r="4.8" fill="#ffffff" stroke={handBadgeColor} strokeWidth="2.2" />
                        {/* R/L Hand-Grip-Band am Schaft */}
                        <circle cx={stickGeo.gripX} cy={stickGeo.gripY} r="6.4" fill={handBadgeColor} stroke={handBadgeStroke} strokeWidth="1.2" />
                        <text
                          x={stickGeo.gripX}
                          y={stickGeo.gripY + 2.4}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="6.8"
                          fontWeight="900"
                          fontFamily="system-ui, -apple-system, sans-serif"
                        >
                          {handOnly}
                        </text>
                      </g>
                    )}

                    {/* On-Cymbal Studio Stempel */}
                    <text
                      x={piece.cx}
                      y={piece.cy + piece.ry * 0.56}
                      textAnchor="middle"
                      fill="#451a03"
                      opacity={0.78}
                      fontSize="6.4"
                      fontWeight="900"
                      letterSpacing="0.06em"
                      fontFamily="system-ui, -apple-system, sans-serif"
                      style={{ pointerEvents: 'none' }}
                    >
                      {piece.headLabel}
                    </text>
                    {isLiftedOpen && (
                      <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx + 7} ry={piece.ry + 5} fill="none" stroke="#60a5fa" strokeWidth="1.6" strokeDasharray="4 3" style={{ animation: 'hihat-shimmer 1s linear infinite' }} />
                    )}
                  </g>
                )}

                {/* TROMMELN (Snare, Toms mit 2.5D Kessel-Extrusion) */}
                {piece.type === 'drum' && (
                  <g>
                    <path d={`M ${piece.cx - piece.rx - 1} ${piece.cy} v ${piece.shellHeight} a ${piece.rx + 1} ${piece.ry + 1} 0 0 0 ${(piece.rx + 1) * 2} 0 v -${piece.shellHeight} Z`} fill="url(#shell-depth-grad)" stroke="#334155" strokeWidth="0.8" />
                    <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx + 1.5} ry={piece.ry + 1.5} fill="url(#chrome-rim)" stroke={isActive ? stickingGlow : '#475569'} strokeWidth={isActive ? '2.0' : '1'} />
                    {/* Authentisches Original-Fell */}
                    <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx - 2} ry={piece.ry - 2} fill={piece.id === 'snare' ? 'url(#snare-head-coated)' : 'url(#drum-head-white)'} stroke={isActive || colorGuideActive ? stickingGlow : '#cbd5e1'} strokeWidth={colorGuideActive ? '2.6' : '1.2'} />
                    {/* Synästhetisches Farb-Glaze im Farb-Guide-Modus (Notenfarbe === Kesselfarbe, satt & unverwechselbar) */}
                    {colorGuideActive && (
                      <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx - 2.5} ry={piece.ry - 2.5} fill={pieceGuide.stageFill} opacity={isActive ? 0.82 : 0.66} style={{ pointerEvents: 'none' }} />
                    )}
                    {/* Transientes Attack-Flash-Overlay (klingt nach 320ms natürlich aus!) */}
                    {isActive && (
                      <ellipse
                        key={`head-flash-${piece.id}-${strikeKey}`}
                        cx={piece.cx}
                        cy={piece.cy}
                        rx={piece.rx - 2}
                        ry={piece.ry - 2}
                        fill={flashGradId}
                        style={{ animation: 'transient-head-flash 0.32s ease-out forwards', pointerEvents: 'none' }}
                      />
                    )}
                    {/* On-Head Studio Engraving */}
                    <text
                      x={piece.cx}
                      y={piece.cy + piece.ry * 0.46}
                      textAnchor="middle"
                      fill={colorGuideActive ? '#ffffff' : '#475569'}
                      opacity={colorGuideActive ? 0.96 : 0.76}
                      fontSize="6.3"
                      fontWeight="900"
                      letterSpacing="0.06em"
                      fontFamily="system-ui, -apple-system, sans-serif"
                      style={{ pointerEvents: 'none' }}
                    >
                      {piece.headLabel}
                    </text>
                    {/* Konzentrische Schockwellen in Sticking-Farbe (Blau = R, Pink = L) */}
                    {isActive && (
                      <g key={`ripple-${piece.id}-${strikeKey}`} style={{ transformOrigin: `${piece.cx}px ${piece.cy}px`, pointerEvents: 'none' }}>
                        <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx * 0.9} ry={piece.ry * 0.9} fill="none" stroke={stickingColor} style={{ animation: 'drum-ripple-primary 0.38s ease-out forwards' }} />
                        <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx * 0.65} ry={piece.ry * 0.65} fill="none" stroke={stickingGlow} style={{ animation: 'drum-ripple-secondary 0.44s ease-out forwards' }} />
                      </g>
                    )}
                    {/* Biomechanischer Hickory-Stick-Aufprall & Rebound (~50° Matched-Grip V-Winkel, R/L Wechselschlag) */}
                    {isActive && (
                      <g
                        key={`stick-${piece.id}-${strikeKey}`}
                        style={{
                          transformOrigin: `${stickGeo.tipX}px ${stickGeo.tipY}px`,
                          animation: 'stick-tip-rebound 0.26s ease-out forwards',
                          pointerEvents: 'none',
                          ['--rebound-dx' as string]: `${stickGeo.reboundDx.toFixed(1)}px`,
                          ['--rebound-dy' as string]: `${stickGeo.reboundDy.toFixed(1)}px`
                        }}
                      >
                        {/* Konischer Hickory-Schaft vom linken/rechten Hand-Anker zum Fell-Zentrum */}
                        <line
                          x1={stickGeo.buttX}
                          y1={stickGeo.buttY}
                          x2={stickGeo.tipX}
                          y2={stickGeo.tipY}
                          stroke="#f59e0b"
                          strokeWidth="3.8"
                          strokeLinecap="round"
                        />
                        <line
                          x1={stickGeo.buttX}
                          y1={stickGeo.buttY}
                          x2={stickGeo.tipX}
                          y2={stickGeo.tipY}
                          stroke="#fef3c7"
                          strokeWidth="2.0"
                          strokeLinecap="round"
                        />
                        {/* Teardrop-Stick-Tip am Auftreffpunkt (L leicht links, R leicht rechts) */}
                        <circle cx={stickGeo.tipX} cy={stickGeo.tipY} r="5.0" fill="#ffffff" stroke={handBadgeColor} strokeWidth="2.4" />
                        {/* R/L Hand-Grip-Band am Schaft (zeigt auch im Farb-Guide-Modus klar die aktive Schlaghand) */}
                        <circle cx={stickGeo.gripX} cy={stickGeo.gripY} r="6.6" fill={handBadgeColor} stroke={handBadgeStroke} strokeWidth="1.2" />
                        <text
                          x={stickGeo.gripX}
                          y={stickGeo.gripY + 2.5}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="7.0"
                          fontWeight="900"
                          fontFamily="system-ui, -apple-system, sans-serif"
                        >
                          {handOnly}
                        </text>
                      </g>
                    )}
                    {[30, 75, 120, 165, 210, 255, 300, 345].map(deg => {
                      const rad = (deg * Math.PI) / 180;
                      const lx = piece.cx + Math.cos(rad) * (piece.rx + 0.5);
                      const ly = piece.cy + Math.sin(rad) * (piece.ry + 0.5);
                      return (
                        <g key={deg}>
                          {deg >= 0 && deg <= 180 && <line x1={lx} y1={ly} x2={lx} y2={ly + piece.shellHeight * 0.85} stroke={isActive ? '#ffffff' : '#94a3b8'} strokeWidth={isActive ? '1.2' : '0.9'} />}
                          <circle cx={lx} cy={ly} r="1.6" fill={isActive ? '#ffffff' : '#cbd5e1'} stroke="#475569" strokeWidth="0.5" />
                        </g>
                      );
                    })}
                  </g>
                )}

                {/* BASS DRUM (Kick 22" mit 2.5D Kessel-Tiefe, Schalloch & Sub-Violettem Beater-Impact) */}
                {piece.type === 'kick' && (
                  <g>
                    <ellipse cx={piece.cx} cy={piece.cy - 6} rx={piece.rx + 2} ry={piece.ry + 2} fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
                    <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx + 2.5} ry={piece.ry + 2.5} fill="#1e293b" stroke={isActive ? '#c4b5fd' : '#475569'} strokeWidth={isActive ? '2.5' : '2'} />
                    {/* Authentisches matt-schwarzes Resonanzfell */}
                    <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx - 2} ry={piece.ry - 2} fill="url(#kick-head-black)" stroke={isActive || colorGuideActive ? '#a78bfa' : '#334155'} strokeWidth={colorGuideActive ? '2.6' : '1.5'} />
                    {/* Synästhetisches Farb-Glaze im Farb-Guide-Modus (Notenfarbe === Kickfarbe) */}
                    {colorGuideActive && (
                      <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx - 2.5} ry={piece.ry - 2.5} fill={pieceGuide.stageFill} opacity={isActive ? 0.80 : 0.62} style={{ pointerEvents: 'none' }} />
                    )}
                    {/* Transientes Sub-Bass-Flash-Overlay */}
                    {isActive && (
                      <ellipse
                        key={`kick-flash-${piece.id}-${strikeKey}`}
                        cx={piece.cx}
                        cy={piece.cy}
                        rx={piece.rx - 2}
                        ry={piece.ry - 2}
                        fill={flashGradId}
                        style={{ animation: 'transient-head-flash 0.34s ease-out forwards', pointerEvents: 'none' }}
                      />
                    )}
                    {/* On-Head Studio Engraving */}
                    <text
                      x={piece.cx}
                      y={piece.cy - piece.ry * 0.36}
                      textAnchor="middle"
                      fill="#cbd5e1"
                      opacity={0.74}
                      fontSize="6.9"
                      fontWeight="900"
                      letterSpacing="0.08em"
                      fontFamily="system-ui, -apple-system, sans-serif"
                      style={{ pointerEvents: 'none' }}
                    >
                      {piece.headLabel}
                    </text>
                    {/* Konzentrische Sub-Bass-Schockwellen in Fuß-Violett (#8b5cf6) */}
                    {isActive && (
                      <g key={`ripple-${piece.id}-${strikeKey}`} style={{ transformOrigin: `${piece.cx}px ${piece.cy}px`, pointerEvents: 'none' }}>
                        <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx * 0.9} ry={piece.ry * 0.9} fill="none" stroke="#a78bfa" style={{ animation: 'drum-ripple-primary 0.40s ease-out forwards' }} />
                        <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx * 0.65} ry={piece.ry * 0.65} fill="none" stroke="#ffffff" style={{ animation: 'drum-ripple-secondary 0.46s ease-out forwards' }} />
                      </g>
                    )}
                    <ellipse cx={piece.cx + piece.rx * 0.44} cy={piece.cy - piece.ry * 0.12} rx={piece.rx * 0.22} ry={piece.ry * 0.22} fill="#020617" stroke="#e2e8f0" strokeWidth="1.2" />
                    <circle cx={piece.cx} cy={piece.cy} r={isActive ? 6.5 : 4} fill={isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.18)'} stroke={isActive ? '#8b5cf6' : 'none'} strokeWidth="2" filter={isActive ? 'url(#drum-glow-filter)' : undefined} style={{ transition: 'all 0.1s ease' }} />
                  </g>
                )}
              </g>

              {/* 8. Radialer Außen-HUD-Badge (0% Überlappung; im Farb-Guide-Modus mit Klarnamen + Kürzel) */}
              <g transform={`translate(${piece.cx}, ${badgeY})`}>
                {colorGuideActive ? (
                  <>
                    <rect
                      x="-40"
                      y="-9"
                      width="80"
                      height="18"
                      rx="9"
                      fill="rgba(15, 23, 42, 0.96)"
                      stroke={pieceGuide.stageGlow}
                      strokeWidth={isActive ? '2.0' : '1.3'}
                      filter="drop-shadow(0 2px 6px rgba(0,0,0,0.65))"
                    />
                    <rect x="-36" y="-6" width="16" height="12" rx="4" fill={pieceGuide.staffColor} />
                    <text
                      x="-28"
                      y="2.4"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="6.6"
                      fontWeight="900"
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      {pieceGuide.shortCode}
                    </text>
                    <text
                      x="9"
                      y="2.6"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="6.8"
                      fontWeight="800"
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      {`${pieceGuide.shortBadge} · ${piece.shortcut.split(' ')[0]}`}
                    </text>
                  </>
                ) : (
                  <>
                    <rect
                      x="-26"
                      y="-8.5"
                      width="52"
                      height="17"
                      rx="8.5"
                      fill="rgba(15, 23, 42, 0.94)"
                      stroke={isActive ? stickingGlow : 'rgba(255, 255, 255, 0.24)'}
                      strokeWidth={isActive ? '1.6' : '0.9'}
                      filter="drop-shadow(0 2px 6px rgba(0,0,0,0.6))"
                    />
                    <circle cx="-14" cy="0" r="5.2" fill={stickingColor} />
                    <text
                      x="-14"
                      y="2.6"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="7.2"
                      fontWeight="900"
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      {effectiveSticking}
                    </text>
                    <text
                      x="6.5"
                      y="2.9"
                      textAnchor="middle"
                      fill={isActive ? '#ffffff' : '#f1f5f9'}
                      fontSize="8.0"
                      fontWeight="800"
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      {piece.shortcut.split(' ')[0]}
                    </text>
                  </>
                )}
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

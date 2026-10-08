/**
 * 🏛️ Campus-Groovelab Micro-Score Studio (0,1% Goldstandard)
 * MicroScoreDrumKitVisualizer.tsx
 * 
 * 2027 Pro 2.5D Isometric Top-Down Drumkit Visualizer:
 * - 8 Instrumente: Kick 22", Snare 14", Hi-Hat 14", Toms 10"/12"/16", Crash 16", Ride 20"
 * - 2.5D Kessel-Extrusion: 3D Zylinderwände, Chrome-Spannreifen, Stimmböckchen & Tom-Mounts
 * - Physikalische Dynamik: Becken-Wobble (Harmonic Oscillation), Resonanzwellen & Beater-Stroke
 * - Hi-Hat Dual-State Engine: Offen (A#4 / 6px Hub / Sizzle Glow) vs. Geschlossen (G4 / Tight)
 * - 0ms Latenz Tastatur-Steuerung: Space (Kick), F/J (Snare), D/K (Hi-Hat), E (Crash), I (Ride), G/H/B (Toms)
 * - Apple-Style Keycap Badges & Sticking-Indikatoren (R / L / F)
 * - BFSG 2025 & WCAG 2.2 AA Barrierefreiheit & Tastatur-Vollbedienbarkeit
 * - Monolith Ceiling Axiom: Autarker Satellit (< 450 Zeilen)
 */

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';

export interface MicroScoreDrumKitVisualizerProps {
  activePitches: string[];
  activeNotes?: Array<{ id?: string; pitch: string; barIndex?: number; beatFraction?: number }>;
  playheadPos?: { bar: number; fraction: number };
  onHit?: (padId: string, pitch: string) => void;
  readOnly?: boolean;
}

interface DrumPieceDef {
  id: string;
  name: string;
  defaultPitch: string;
  sticking: 'R' | 'L' | 'F';
  shortcut: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  shellHeight: number;
  type: 'drum' | 'cymbal' | 'kick';
}

const DRUM_PIECES: DrumPieceDef[] = [
  { id: 'crash', name: 'Crash 16"', defaultPitch: 'A5', sticking: 'R', shortcut: 'E', cx: 155, cy: 58, rx: 44, ry: 28, shellHeight: 0, type: 'cymbal' },
  { id: 'hihat', name: 'Hi-Hat 14"', defaultPitch: 'G5', sticking: 'R', shortcut: 'D / K', cx: 115, cy: 135, rx: 38, ry: 25, shellHeight: 0, type: 'cymbal' },
  { id: 'snare', name: 'Snare 14"', defaultPitch: 'C5', sticking: 'L', shortcut: 'F / J', cx: 210, cy: 162, rx: 37, ry: 26, shellHeight: 16, type: 'drum' },
  { id: 'tom_hi', name: 'High Tom 10"', defaultPitch: 'E5', sticking: 'R', shortcut: 'G', cx: 260, cy: 92, rx: 28, ry: 20, shellHeight: 14, type: 'drum' },
  { id: 'kick', name: 'Bass Drum 22"', defaultPitch: 'F4', sticking: 'F', shortcut: 'SPACE', cx: 320, cy: 185, rx: 54, ry: 39, shellHeight: 20, type: 'kick' },
  { id: 'tom_mid', name: 'Mid Tom 12"', defaultPitch: 'D5', sticking: 'R', shortcut: 'H', cx: 362, cy: 98, rx: 30, ry: 22, shellHeight: 15, type: 'drum' },
  { id: 'ride', name: 'Ride 20"', defaultPitch: 'F5', sticking: 'R', shortcut: 'I', cx: 468, cy: 75, rx: 50, ry: 33, shellHeight: 0, type: 'cymbal' },
  { id: 'tom_floor', name: 'Floor Tom 16"', defaultPitch: 'A4', sticking: 'R', shortcut: 'B', cx: 440, cy: 172, rx: 41, ry: 29, shellHeight: 22, type: 'drum' }
];

function isHiHatOpenPitch(raw: string): boolean {
  if (!raw || raw === 'REST') return false;
  const p = raw.trim().toUpperCase();
  return p === 'G#5' || p === 'AB5' || p === 'A#4' || p === 'BB4' || p === 'HIHAT_OPEN' || p === 'OPEN_HIHAT' || p.includes('OPEN');
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

// 🥁 Kanonische PAS-Zuordnung (Percussive Arts Society) & 100% disjunkte Drum-Pad Map
// Jede Tonhöhe / Notation gehört mathematisch exakt ZU EINEM Instrument (Zero Cross-Talk)
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
  'RIDE': 'ride', 'RIDE1': 'ride', '51': 'ride', '59': 'ride'
};

function getDrumPieceForPitch(raw: string): string | null {
  if (!raw || raw === 'REST') return null;
  const p = raw.trim().toUpperCase();

  // 1. Direkter Treffer über DrumPiece-ID
  const matchById = DRUM_PIECES.find(dp => dp.id.toUpperCase() === p);
  if (matchById) return matchById.id;

  // 2. Kanonisches Wörterbuch (100% disjunkt & kollisionsfrei)
  const canonical = CANONICAL_DRUM_PITCH_MAP[p];
  if (canonical) return canonical;

  // 3. Hi-Hat Open Keyword Detection
  if (isHiHatOpenPitch(p)) return 'hihat';

  // 4. Melodischer Frequenz-Fallback (NUR für unbekannte / externe Melodien außerhalb PAS)
  // Weist jede Frequenz bijektiv GENAU EINEM Pad zu
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

const KEYBOARD_MAP: Record<string, { pieceId: string; pitch: string }> = {
  ' ': { pieceId: 'kick', pitch: 'F4' },
  'Space': { pieceId: 'kick', pitch: 'F4' },
  'f': { pieceId: 'snare', pitch: 'C5' }, 'F': { pieceId: 'snare', pitch: 'C5' }, 'KeyF': { pieceId: 'snare', pitch: 'C5' },
  'j': { pieceId: 'snare', pitch: 'C5' }, 'J': { pieceId: 'snare', pitch: 'C5' }, 'KeyJ': { pieceId: 'snare', pitch: 'C5' },
  'd': { pieceId: 'hihat', pitch: 'G5' }, 'D': { pieceId: 'hihat', pitch: 'G5' }, 'KeyD': { pieceId: 'hihat', pitch: 'G5' },
  'k': { pieceId: 'hihat', pitch: 'G#5' }, 'K': { pieceId: 'hihat', pitch: 'G#5' }, 'KeyK': { pieceId: 'hihat', pitch: 'G#5' },
  'e': { pieceId: 'crash', pitch: 'A5' }, 'E': { pieceId: 'crash', pitch: 'A5' }, 'KeyE': { pieceId: 'crash', pitch: 'A5' },
  'i': { pieceId: 'ride', pitch: 'F5' }, 'I': { pieceId: 'ride', pitch: 'F5' }, 'KeyI': { pieceId: 'ride', pitch: 'F5' },
  'g': { pieceId: 'tom_hi', pitch: 'E5' }, 'G': { pieceId: 'tom_hi', pitch: 'E5' }, 'KeyG': { pieceId: 'tom_hi', pitch: 'E5' },
  'h': { pieceId: 'tom_mid', pitch: 'D5' }, 'H': { pieceId: 'tom_mid', pitch: 'D5' }, 'KeyH': { pieceId: 'tom_mid', pitch: 'D5' },
  'b': { pieceId: 'tom_floor', pitch: 'A4' }, 'B': { pieceId: 'tom_floor', pitch: 'A4' }, 'KeyB': { pieceId: 'tom_floor', pitch: 'A4' }
};

export const MicroScoreDrumKitVisualizer: React.FC<MicroScoreDrumKitVisualizerProps> = ({
  activePitches,
  activeNotes,
  playheadPos,
  onHit,
  readOnly = false
}) => {
  const [localHits, setLocalHits] = useState<Record<string, number>>({});
  // ⚡ 0,1% Re-Trigger Engine: Deterministische Keys für Remount der GPU-Keyframe-Animationen
  const [strikeTicks, setStrikeTicks] = useState<Record<string, number>>({});

  const lastPlayheadRef = useRef<{ bar: number; fraction: number } | undefined>(undefined);
  const lastNotesSigRef = useRef<string>('');

  const triggerHit = useCallback((pieceId: string, pitch: string) => {
    setLocalHits(prev => ({ ...prev, [pieceId]: Date.now() }));
    setStrikeTicks(prev => ({ ...prev, [pieceId]: (prev[pieceId] || 0) + 1 }));
    setTimeout(() => {
      setLocalHits(prev => {
        if (!prev[pieceId]) return prev;
        const next = { ...prev };
        delete next[pieceId];
        return next;
      });
    }, 220);
    if (onHit) onHit(pieceId, pitch);
  }, [onHit]);

  // 1. Playback Synchronisation: Bei jedem Playhead-Schritt Schläge auf exakter Zählzeit triggern
  useEffect(() => {
    if (playheadPos) {
      const isNewPos = !lastPlayheadRef.current || 
        lastPlayheadRef.current.bar !== playheadPos.bar || 
        lastPlayheadRef.current.fraction !== playheadPos.fraction;

      if (isNewPos) {
        lastPlayheadRef.current = playheadPos;
        const struckNotes = (activeNotes || []).filter(
          n => n.barIndex === playheadPos.bar && n.beatFraction === playheadPos.fraction && n.pitch && n.pitch !== 'REST'
        );

        if (struckNotes.length > 0) {
          setStrikeTicks(prev => {
            const next = { ...prev };
            DRUM_PIECES.forEach(piece => {
              const isStruck = struckNotes.some(n => checkPieceActive(piece, [n.pitch]));
              if (isStruck) {
                next[piece.id] = (next[piece.id] || 0) + 1;
              }
            });
            return next;
          });
        }
      }
    } else {
      lastPlayheadRef.current = undefined;
    }
  }, [playheadPos, activeNotes]);

  // 2. Edit / Auswahl-Modus: Wenn eine Note im Notensystem fokussiert wird
  useEffect(() => {
    if (!playheadPos && activePitches && activePitches.length > 0) {
      const sig = activePitches.slice().sort().join(',');
      if (sig !== lastNotesSigRef.current) {
        lastNotesSigRef.current = sig;
        setStrikeTicks(prev => {
          const next = { ...prev };
          DRUM_PIECES.forEach(piece => {
            if (checkPieceActive(piece, activePitches)) {
              next[piece.id] = (next[piece.id] || 0) + 1;
            }
          });
          return next;
        });
      }
    } else if (!activePitches || activePitches.length === 0) {
      lastNotesSigRef.current = '';
    }
  }, [playheadPos, activePitches]);

  useEffect(() => {
    if (readOnly) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const mapping = KEYBOARD_MAP[e.key] || KEYBOARD_MAP[e.code];
      if (mapping) {
        if (e.key === ' ' || e.code === 'Space') e.preventDefault();
        triggerHit(mapping.pieceId, mapping.pitch);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readOnly, triggerHit]);

  const activeMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    DRUM_PIECES.forEach(piece => {
      const isPitchActive = checkPieceActive(piece, activePitches);
      const isLocalActive = !!localHits[piece.id] && Date.now() - localHits[piece.id] < 200;
      map[piece.id] = isPitchActive || isLocalActive;
    });
    return map;
  }, [activePitches, localHits]);

  const isHiHatOpen = useMemo(() => {
    return activePitches.some(p => isHiHatOpenPitch(p)) || (!!localHits['hihat'] && localHits['hihat_open'] !== undefined);
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
      {/* 1. Header: Titel, Sticking & Tastatur-Legende */}
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', padding: '0 4px', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.9rem' }}>🥁</span>
          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Acoustic Pro Drumkit</span>
          <span style={{ fontSize: '0.63rem', fontWeight: 700, padding: '2px 7px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.18)', color: '#c7d2fe', border: '1px solid rgba(99, 102, 241, 0.35)' }}>2.5D Physical Engine</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.66rem', fontWeight: 700, color: '#94a3b8' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '15px', height: '15px', borderRadius: '4px', background: '#3b82f6', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.60rem', fontWeight: 900 }}>R</span>Rechts</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '15px', height: '15px', borderRadius: '4px', background: '#ec4899', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.60rem', fontWeight: 900 }}>L</span>Links</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '15px', height: '15px', borderRadius: '4px', background: '#8b5cf6', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.60rem', fontWeight: 900 }}>F</span>Fußpedal</span>
          <span style={{ color: '#64748b', fontSize: '0.62rem', borderLeft: '1px solid rgba(255,255,255,0.12)', paddingLeft: '8px' }}>⌨️ Leertaste, F, J, D, K, E, I, G, H, B spielbar</span>
        </div>
      </div>

      {/* 2. SVG 2.5D Canvas (580 x 240) */}
      <svg viewBox="0 0 580 240" style={{ width: '100%', maxHeight: '220px', overflow: 'visible', filter: 'drop-shadow(0 6px 16px rgba(0, 0, 0, 0.5))' }}>
        <defs>
          <style>{`
            @keyframes cymbal-wobble {
              0% { transform: scale(1.05) rotate(0deg); }
              20% { transform: scale(1.04) rotate(-3.5deg) skewX(1deg); }
              40% { transform: scale(1.025) rotate(2.2deg) skewX(-0.8deg); }
              60% { transform: scale(1.01) rotate(-1.2deg); }
              80% { transform: scale(1.005) rotate(0.5deg); }
              100% { transform: scale(1) rotate(0deg); }
            }
            @keyframes drum-hit-pulse {
              0% { transform: scale(1.0); }
              20% { transform: scale(1.04, 0.97); }
              50% { transform: scale(0.98, 1.02); }
              75% { transform: scale(1.01, 0.995); }
              100% { transform: scale(1.0); }
            }
            @keyframes drum-ripple-primary { 0% { opacity: 0.90; transform: scale(0.35); } 100% { opacity: 0; transform: scale(1.18); } }
            @keyframes drum-ripple-secondary { 0% { opacity: 0.75; transform: scale(0.20); } 100% { opacity: 0; transform: scale(0.95); } }
            @keyframes beater-stroke { 0% { transform: translateY(0); } 35% { transform: translateY(-9px); } 70% { transform: translateY(1px); } 100% { transform: translateY(0); } }
            @keyframes hihat-shimmer { 0% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: 12; } }
            .wobble-active { animation: cymbal-wobble 0.52s ease-out; }
            .drum-active { animation: drum-hit-pulse 0.26s cubic-bezier(0.34, 1.56, 0.64, 1); }
            .beater-active { animation: beater-stroke 0.18s cubic-bezier(0.34, 1.56, 0.64, 1); }
          `}</style>

          <filter id="drum-lila-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          <radialGradient id="drum-hit-overlay" cx="50%" cy="46%" r="52%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.88" />
            <stop offset="28%" stopColor="#c7d2fe" stopOpacity="0.65" />
            <stop offset="60%" stopColor="#818cf8" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
          </radialGradient>

          <radialGradient id="cymbal-bronze" cx="45%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#fef08a" /><stop offset="25%" stopColor="#f59e0b" /><stop offset="65%" stopColor="#d97706" /><stop offset="100%" stopColor="#78350f" />
          </radialGradient>

          <radialGradient id="cymbal-active" cx="45%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#e0e7ff" /><stop offset="35%" stopColor="#818cf8" /><stop offset="75%" stopColor="#6366f1" /><stop offset="100%" stopColor="#3730a3" />
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

        {/* 3. Hardware-Bühne: Tom-Mount Gestänge & Kick-Spurs */}
        <g opacity="0.85">
          <path d="M 320 150 L 320 120 L 260 102" fill="none" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
          <path d="M 320 120 L 362 108" fill="none" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
          <circle cx="320" cy="120" r="4.5" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
          <line x1="270" y1="195" x2="235" y2="225" stroke="#94a3b8" strokeWidth="3.5" strokeLinecap="round" />
          <ellipse cx="233" cy="227" rx="4" ry="2.5" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
          <line x1="370" y1="195" x2="405" y2="225" stroke="#94a3b8" strokeWidth="3.5" strokeLinecap="round" />
          <ellipse cx="407" cy="227" rx="4" ry="2.5" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
          <line x1="412" y1="185" x2="402" y2="218" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
          <line x1="468" y1="185" x2="478" y2="218" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* 4. Bass-Drum Pedal Hardware & Dynamischer Beater */}
        <g opacity="0.9">
          <rect x="312" y="222" width="16" height="12" rx="2.5" fill="#334155" stroke="#475569" strokeWidth="0.8" />
          <line x1="320" y1="210" x2="320" y2="224" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
          <g key={`beater-${strikeTicks['kick'] || 0}`} className={activeMap['kick'] ? 'beater-active' : undefined} style={{ transformOrigin: '320px 210px' }}>
            <line x1="320" y1="188" x2="320" y2="210" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
            <ellipse cx="320" cy="188" rx="4" ry="3" fill="#f8fafc" stroke="#475569" strokeWidth="0.8" />
          </g>
        </g>

        {/* 5. Alle 8 Instrumente rendern */}
        {DRUM_PIECES.map(piece => {
          const isActive = !!activeMap[piece.id];
          const strikeKey = strikeTicks[piece.id] || 0;
          const stickingColor = piece.sticking === 'R' ? '#3b82f6' : piece.sticking === 'L' ? '#ec4899' : '#8b5cf6';
          const isHiHat = piece.id === 'hihat';
          const isLiftedOpen = isHiHat && isHiHatOpen;

          return (
            <g
              key={piece.id}
              role="button"
              tabIndex={readOnly ? -1 : 0}
              aria-label={`${piece.name} (${piece.sticking === 'R' ? 'Rechte Hand' : piece.sticking === 'L' ? 'Linke Hand' : 'Fuß'}, Ton: ${piece.defaultPitch}, Taste: ${piece.shortcut})${isHiHat ? (isHiHatOpen ? ' - Offen' : ' - Geschlossen') : ''}`}
              aria-keyshortcuts={piece.shortcut}
              onClick={() => triggerHit(piece.id, isHiHat && isHiHatOpen ? 'G#5' : piece.defaultPitch)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  triggerHit(piece.id, isHiHat && isHiHatOpen ? 'G#5' : piece.defaultPitch);
                }
              }}
              style={{
                cursor: readOnly ? 'default' : 'pointer'
              }}
            >
              {/* Kesselschatten */}
              <ellipse cx={piece.cx} cy={piece.cy + (piece.shellHeight > 0 ? piece.shellHeight + 2 : 4)} rx={piece.rx + 2} ry={piece.ry + 2} fill="rgba(0, 0, 0, 0.55)" />

              {/* Aktiver Lila-Glow Ring (Orientierungs-Halo) */}
              {isActive && (
                <ellipse cx={piece.cx} cy={piece.cy - (isLiftedOpen ? 6 : 0)} rx={piece.rx + 5} ry={piece.ry + 5} fill="none" stroke="#6366f1" strokeWidth="3.5" filter="url(#drum-lila-glow)" />
              )}

              {/* Animierter Instrumentenkörper mit deterministischem Re-Trigger Key gegen CSS-Freezes */}
              <g
                key={`anim-${piece.id}-${strikeKey}`}
                className={isActive ? (piece.type === 'cymbal' ? 'wobble-active' : 'drum-active') : undefined}
                style={{
                  transformOrigin: `${piece.cx}px ${piece.cy}px`,
                  transition: 'transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
              >
                {/* BECKEN (Crash, Ride, Hi-Hat) */}
                {piece.type === 'cymbal' && (
                  <g transform={isLiftedOpen ? `translate(0, -6)` : undefined}>
                    {isHiHat && (
                      <g opacity={isLiftedOpen ? 0.9 : 0}>
                        <ellipse cx={piece.cx} cy={piece.cy + 6} rx={piece.rx} ry={piece.ry} fill="url(#cymbal-bronze)" stroke="#78350f" strokeWidth="1" />
                        <ellipse cx={piece.cx} cy={piece.cy + 3} rx={piece.rx - 2} ry={piece.ry - 2} fill="rgba(0,0,0,0.6)" />
                      </g>
                    )}
                    <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx} ry={piece.ry} fill={isActive ? 'url(#cymbal-active)' : 'url(#cymbal-bronze)'} stroke={isActive ? '#818cf8' : '#b45309'} strokeWidth="1.5" />
                    <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx * 0.72} ry={piece.ry * 0.72} fill="none" stroke={isActive ? 'rgba(255, 255, 255, 0.35)' : 'rgba(120, 53, 15, 0.35)'} strokeWidth="0.75" />
                    <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx * 0.45} ry={piece.ry * 0.45} fill="none" stroke={isActive ? 'rgba(255, 255, 255, 0.4)' : 'rgba(120, 53, 15, 0.4)'} strokeWidth="0.75" />
                    <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx * 0.22} ry={piece.ry * 0.22} fill={isActive ? '#c7d2fe' : '#92400e'} stroke={isActive ? '#ffffff' : '#78350f'} strokeWidth="1" />
                    <circle cx={piece.cx} cy={piece.cy} r="3" fill="#1e293b" />
                    <circle cx={piece.cx} cy={piece.cy} r="1.5" fill="#94a3b8" />
                    {isLiftedOpen && (
                      <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx + 7} ry={piece.ry + 5} fill="none" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="4 3" style={{ animation: 'hihat-shimmer 1s linear infinite' }} />
                    )}
                  </g>
                )}

                {/* TROMMELN (Snare, Toms mit 2.5D Kessel-Extrusion) */}
                {piece.type === 'drum' && (
                  <g>
                    <path d={`M ${piece.cx - piece.rx - 1} ${piece.cy} v ${piece.shellHeight} a ${piece.rx + 1} ${piece.ry + 1} 0 0 0 ${(piece.rx + 1) * 2} 0 v -${piece.shellHeight} Z`} fill="url(#shell-depth-grad)" stroke="#334155" strokeWidth="0.8" />
                    <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx + 1.5} ry={piece.ry + 1.5} fill="url(#chrome-rim)" stroke={isActive ? '#ffffff' : '#475569'} strokeWidth={isActive ? '1.8' : '1'} />
                    {/* Authentisches Original-Fell (Weißbeschichtung bei Snare, glatt weiß bei Toms) */}
                    <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx - 2} ry={piece.ry - 2} fill={piece.id === 'snare' ? 'url(#snare-head-coated)' : 'url(#drum-head-white)'} stroke={isActive ? '#818cf8' : '#cbd5e1'} strokeWidth="1.2" />
                    {/* Hochenergetisches Strike-Highlight-Overlay (Material bleibt 100% sichtbar) */}
                    {isActive && (
                      <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx - 2} ry={piece.ry - 2} fill="url(#drum-hit-overlay)" />
                    )}
                    {/* Konzentrische Schockwellen (100% Re-Trigger Parität für alle Trommeln) */}
                    {isActive && (
                      <g key={`ripple-${piece.id}-${strikeKey}`} style={{ transformOrigin: `${piece.cx}px ${piece.cy}px`, pointerEvents: 'none' }}>
                        <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx * 0.9} ry={piece.ry * 0.9} fill="none" stroke="#ffffff" strokeWidth="2.0" style={{ animation: 'drum-ripple-primary 0.38s ease-out' }} />
                        <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx * 0.65} ry={piece.ry * 0.65} fill="none" stroke="#a5b4fc" strokeWidth="1.5" style={{ animation: 'drum-ripple-secondary 0.44s ease-out' }} />
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

                {/* BASS DRUM (Kick 22" mit 2.5D Kessel-Tiefe & Schalloch) */}
                {piece.type === 'kick' && (
                  <g>
                    <ellipse cx={piece.cx} cy={piece.cy - 6} rx={piece.rx + 2} ry={piece.ry + 2} fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
                    <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx + 2.5} ry={piece.ry + 2.5} fill="#1e293b" stroke={isActive ? '#ffffff' : '#475569'} strokeWidth={isActive ? '2.5' : '2'} />
                    {/* Authentisches matt-schwarzes Resonanzfell */}
                    <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx - 2} ry={piece.ry - 2} fill="url(#kick-head-black)" stroke={isActive ? '#818cf8' : '#334155'} strokeWidth="1.5" />
                    {/* Hochenergetisches Strike-Highlight-Overlay */}
                    {isActive && (
                      <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx - 2} ry={piece.ry - 2} fill="url(#drum-hit-overlay)" />
                    )}
                    {/* Konzentrische Schockwellen auf 22"-Fell (100% Parität mit Snare & Toms) */}
                    {isActive && (
                      <g key={`ripple-${piece.id}-${strikeKey}`} style={{ transformOrigin: `${piece.cx}px ${piece.cy}px`, pointerEvents: 'none' }}>
                        <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx * 0.9} ry={piece.ry * 0.9} fill="none" stroke="#ffffff" strokeWidth="2.0" style={{ animation: 'drum-ripple-primary 0.38s ease-out' }} />
                        <ellipse cx={piece.cx} cy={piece.cy} rx={piece.rx * 0.65} ry={piece.ry * 0.65} fill="none" stroke="#a5b4fc" strokeWidth="1.5" style={{ animation: 'drum-ripple-secondary 0.44s ease-out' }} />
                      </g>
                    )}
                    <ellipse cx={piece.cx + piece.rx * 0.44} cy={piece.cy - piece.ry * 0.12} rx={piece.rx * 0.22} ry={piece.ry * 0.22} fill="#020617" stroke="#e2e8f0" strokeWidth="1.2" />
                    <circle cx={piece.cx} cy={piece.cy} r={isActive ? 6 : 4} fill={isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.15)'} filter={isActive ? 'url(#drum-lila-glow)' : undefined} style={{ transition: 'all 0.1s ease' }} />
                  </g>
                )}
              </g>

              {/* 6. Schwebender Minimalistischer Apple HUD Badge am Kesselrand (Fell & Kessel 100% frei!) */}
              <g transform={`translate(${piece.cx}, ${piece.cy - piece.ry - (piece.type === 'cymbal' ? 6 : 9)})`}>
                <rect
                  x="-20"
                  y="-7"
                  width="40"
                  height="14"
                  rx="7"
                  fill="rgba(15, 23, 42, 0.82)"
                  stroke={isActive ? '#818cf8' : 'rgba(255, 255, 255, 0.16)'}
                  strokeWidth={isActive ? '1.2' : '0.8'}
                  filter="drop-shadow(0 2px 5px rgba(0,0,0,0.5))"
                />
                <circle cx="-11" cy="0" r="4.2" fill={stickingColor} />
                <text
                  x="-11"
                  y="2.8"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="5.8"
                  fontWeight="900"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {piece.sticking}
                </text>
                <text
                  x="5"
                  y="3"
                  textAnchor="middle"
                  fill={isActive ? '#ffffff' : '#cbd5e1'}
                  fontSize="6.8"
                  fontWeight="800"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {piece.shortcut.split(' ')[0]}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

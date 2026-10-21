/**
 * 🏛️ Campus-Groovelab 0,1% Urtext Goldstandard: Notenschnipsel-Miniatur
 * MicroScoreCalmThumbnail.tsx
 * 
 * Authentische, musikpädagogisch exakte SVG-Notenminiatur für Mediathek & Aufgabenkarten:
 * - Echter Notenschlüssel am Zeilenanfang (Violinschlüssel 𝄞, Bassschlüssel 𝄢 oder Percussion 𝄂)
 * - Kompakte Taktart (4/4, 3/4, 2/4, 6/8) & Taktstriche
 * - Exakte diatonische Notenlinien-Bindung (E4, G4, B4, D5, F5 auf Linien; F4, A4, C5, E5 in Zwischenräumen)
 * - Echte Hilfslinien (C4, A5), Urtext-elliptische Notenköpfe mit Hälsen & Pausenzeichen (𝄽)
 * - Live-Playhead & sanftes Audio-Pulsieren bei aktiver Wiedergabe
 * - BFSG 2025 & WCAG 2.2 AA konform (Dekoratives SVG aria-hidden, kein Kantenrauschen)
 */

import React, { useMemo } from 'react';
import { MicroScoreSnippet } from '../../../student/meisterwerk/microscore/microScore.types';

export interface MicroScoreCalmThumbnailProps {
  snippet: MicroScoreSnippet;
  accentColor: string;
  width?: number | string;
  height?: number;
  isPlaying?: boolean;
}

const STEP_MAP: Record<string, number> = {
  C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6, H: 6
};

function parsePitchDiatonicStep(pitch: string): number | null {
  if (!pitch || pitch === 'REST') return null;
  const match = pitch.trim().match(/^([A-Ga-gHh])([#b]?)(-?\d+)$/);
  if (!match) return null;
  const letter = match[1].toUpperCase();
  const octave = parseInt(match[3], 10);
  const step = STEP_MAP[letter] ?? 0;
  return octave * 7 + step;
}

export const MicroScoreCalmThumbnail: React.FC<MicroScoreCalmThumbnailProps> = ({
  snippet,
  accentColor,
  width = '100%',
  height = 42,
  isPlaying = false
}) => {
  const barsCount = Math.max(1, snippet.barsCount || 2);
  const totalFractions = barsCount * 16;

  // ViewBox Geometrie (280 x 44)
  const viewBoxWidth = 280;
  const viewBoxHeight = 44;

  // 5 Notenlinien (Y-Koordinaten: 10, 16, 22, 28, 34; Abstand 6px)
  const staffLines = [10, 16, 22, 28, 34];
  const startX = 34;
  const endX = 274;
  const usableWidth = endX - startX - 8;

  // Schlüssel-Ermittlung
  const clefType = useMemo<'bass' | 'percussion' | 'treble'>(() => {
    if (snippet.clef === 'percussion' || snippet.instrument === 'drums') return 'percussion';
    if (snippet.clef === 'bass' || snippet.instrument === 'bass' || snippet.instrument === 'trombone') return 'bass';
    return 'treble';
  }, [snippet.clef, snippet.instrument]);

  // Taktart-Ermittlung
  const timeSig = snippet.timeSignature || '4/4';
  const [sigNum, sigDen] = timeSig.includes('/') ? timeSig.split('/') : ['4', '4'];

  // Noten-Kalkulation mit exakter diatonischer Y-Koordinate
  const renderedElements = useMemo(() => {
    const rawNotes = snippet.notes || [];
    if (rawNotes.length === 0) return [];

    return rawNotes.map((n, idx) => {
      const bar = Math.min(barsCount - 1, Math.max(0, n.barIndex || 0));
      const fraction = Math.min(15, Math.max(0, n.beatFraction || 0));
      const totalPos = bar * 16 + fraction;

      // X-Koordinate gleichmäßig im Takt
      const x = startX + 6 + (totalPos / Math.max(1, totalFractions - 1)) * usableWidth;

      if (!n.pitch || n.pitch === 'REST') {
        return {
          id: n.id || `rest-${idx}`,
          isRest: true,
          x,
          y: 22 // Zentriert auf mittlerer Linie
        };
      }

      if (clefType === 'percussion') {
        const p = (n.pitch || '').toUpperCase();
        let y = 19; // Snare Mitte
        let isHiHat = false;
        if (p.includes('C1') || p.includes('B0') || p.includes('KICK') || p.includes('BASS') || p.includes('F4')) {
          y = 31; // Kick unten (Space 1)
        } else if (p.includes('G5') || p.includes('A5') || p.includes('CYMBAL') || p.includes('HAT')) {
          y = 7; // Becken/Hi-Hat oben
          isHiHat = true;
        }

        return {
          id: n.id || `drum-${idx}`,
          isRest: false,
          isHiHat,
          x,
          y,
          stemUp: y >= 22
        };
      }

      // Diatonischer Schritt
      const step = parsePitchDiatonicStep(n.pitch);
      let y = 22; // Default Mitte
      let needsLedgerBelow = false;
      let needsLedgerAbove = false;

      if (step !== null) {
        if (clefType === 'bass') {
          // Bassschlüssel: Line 3 (D3) = Step 24 (3*7 + 3 = 24) -> Y = 22
          const d3Step = 3 * 7 + 1; // D3 = 22
          y = 22 - (step - d3Step) * 3;
          if (y >= 40) needsLedgerBelow = true;
          if (y <= 4) needsLedgerAbove = true;
        } else {
          // Violinschlüssel: Line 3 (B4) = Step 34 (4*7 + 6 = 34) -> Y = 22
          const b4Step = 4 * 7 + 6; // B4 = 34
          y = 22 - (step - b4Step) * 3;
          if (y >= 40) needsLedgerBelow = true; // C4 (y=40)
          if (y <= 4) needsLedgerAbove = true;  // A5 (y=4)
        }
      }

      return {
        id: n.id || `note-${idx}`,
        isRest: false,
        isHiHat: false,
        x,
        y,
        needsLedgerBelow,
        needsLedgerAbove,
        stemUp: y >= 22
      };
    });
  }, [snippet.notes, barsCount, totalFractions, usableWidth, clefType, startX]);

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        borderRadius: '10px',
        background: isPlaying ? `${accentColor}0a` : '#f8fafc',
        border: isPlaying ? `1px solid ${accentColor}30` : '1px solid #f1f5f9',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        transition: 'all 0.2s ease'
      }}
      aria-hidden="true"
    >
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      >
        {/* 5 Hauchzarte Urtext-Notenlinien */}
        {staffLines.map(lineY => (
          <line
            key={lineY}
            x1={8}
            y1={lineY}
            x2={endX}
            y2={lineY}
            stroke="#cbd5e1"
            strokeWidth={0.9}
          />
        ))}

        {/* Notenschlüssel links im System */}
        {clefType === 'treble' && (
          // Violinschlüssel (𝄞)
          <path
            d="M14.2 38.5c-1.3 0-2.3-1-2.3-2.3 0-1.4 1.1-2.3 2.3-2.3 1.3 0 2.3 1 2.3 2.3 0 2.2-2 3.8-4.2 3.8-2.7 0-4.6-2-4.6-4.8 0-3.6 3-6.8 6.8-9.8.8-.6 1.2-1.4 1.2-2.3 0-1.8-1.2-3.1-3-3.1-1.4 0-2.6.9-3.1 2.2l-1-.5c.8-1.8 2.4-2.9 4.2-2.9 2.4 0 4.3 1.8 4.3 4.3 0 1.3-.6 2.3-1.6 3.1-3.4 2.9-6.3 5.8-6.3 9.2 0 2.2 1.4 3.7 3.4 3.7 1.8 0 3.4-1.2 3.7-3.1h-2.5v-1.6h4.6v1.4c0 2.5-1.6 4.6-4.2 4.6z"
            fill="#475569"
          />
        )}
        {clefType === 'bass' && (
          // Bassschlüssel (𝄢)
          <g>
            <path
              d="M9 16.5c0-3 2.2-5.2 5.2-5.2 3.8 0 6.8 2.6 6.8 6.5 0 4.8-3.5 8.2-7.8 11.6l-1-1c3.8-3 6.8-6 6.8-10.2 0-2.8-1.9-4.8-4.8-4.8-2.4 0-4.1 1.7-4.1 4.1 0 1.5 1 2.6 2.6 2.6 1 0 1.9-.7 1.9-1.9 0-1-.7-1.7-1.7-1.7-.4 0-.8.2-1 .4-.2-.4-.3-.9-.3-1.4z"
              fill="#475569"
            />
            <circle cx="21" cy="13" r="1.3" fill="#475569" />
            <circle cx="21" cy="19" r="1.3" fill="#475569" />
          </g>
        )}
        {clefType === 'percussion' && (
          // Percussion-Clef (𝄂)
          <g>
            <rect x="11" y="16" width="2.2" height="12" rx="0.5" fill="#475569" />
            <rect x="15" y="16" width="2.2" height="12" rx="0.5" fill="#475569" />
          </g>
        )}

        {/* Taktart gestapelt (z. B. 4/4, 3/4) */}
        <text x="25.5" y="19" textAnchor="middle" fontSize="9.5" fontWeight="900" fontFamily="serif" fill="#475569">
          {sigNum}
        </text>
        <text x="25.5" y="31" textAnchor="middle" fontSize="9.5" fontWeight="900" fontFamily="serif" fill="#475569">
          {sigDen}
        </text>

        {/* Start-Taktstrich nach Schlüssel & Taktart */}
        <line x1={33} y1={staffLines[0]} x2={33} y2={staffLines[staffLines.length - 1]} stroke="#94a3b8" strokeWidth={1} />

        {/* Taktstriche (Zwischen den Takten) */}
        {barsCount > 1 && Array.from({ length: barsCount - 1 }).map((_, barIdx) => {
          const barDividerX = startX + 6 + ((barIdx + 1) * 16 / totalFractions) * usableWidth;
          return (
            <line
              key={`bar-${barIdx}`}
              x1={barDividerX}
              y1={staffLines[0]}
              x2={barDividerX}
              y2={staffLines[staffLines.length - 1]}
              stroke="#94a3b8"
              strokeWidth={1}
            />
          );
        })}

        {/* Doppelter Schluss-Taktstrich am Ende */}
        <line x1={endX - 3} y1={staffLines[0]} x2={endX - 3} y2={staffLines[staffLines.length - 1]} stroke="#94a3b8" strokeWidth={1} />
        <line x1={endX} y1={staffLines[0]} x2={endX} y2={staffLines[staffLines.length - 1]} stroke="#475569" strokeWidth={2.4} />

        {/* Notenelemente & Pausensymbole */}
        {renderedElements.map(el => {
          if (el.isRest) {
            // Echte Viertelpause (𝄽)
            return (
              <path
                key={el.id}
                d={`M${el.x - 2} 15l4 4-3 3 3 3-4 3`}
                stroke={accentColor}
                strokeWidth={1.8}
                fill="none"
                strokeLinecap="round"
                opacity={0.8}
              />
            );
          }

          if (el.isHiHat) {
            // Schlagzeug Becken/Hi-Hat (X-Notenkopf)
            return (
              <g key={el.id}>
                <line x1={el.x - 2.5} y1={el.y - 2.5} x2={el.x + 2.5} y2={el.y + 2.5} stroke={accentColor} strokeWidth={1.4} strokeLinecap="round" />
                <line x1={el.x + 2.5} y1={el.y - 2.5} x2={el.x - 2.5} y2={el.y + 2.5} stroke={accentColor} strokeWidth={1.4} strokeLinecap="round" />
                <line x1={el.x + 2.5} y1={el.y} x2={el.x + 2.5} y2={el.y + 13} stroke={accentColor} strokeWidth={1} strokeLinecap="round" />
              </g>
            );
          }

          return (
            <g key={el.id}>
              {/* Hilfslinien außerhalb des Fünfliniensystems */}
              {el.needsLedgerBelow && (
                <line x1={el.x - 5} y1={40} x2={el.x + 5} y2={40} stroke="#94a3b8" strokeWidth={1} />
              )}
              {el.needsLedgerAbove && (
                <line x1={el.x - 5} y1={4} x2={el.x + 5} y2={4} stroke="#94a3b8" strokeWidth={1} />
              )}

              {/* Urtext-elliptischer Notenkopf (15° Neigung) */}
              <ellipse
                cx={el.x}
                cy={el.y}
                rx={3.2}
                ry={2.2}
                transform={`rotate(-15 ${el.x} ${el.y})`}
                fill={accentColor}
                opacity={0.95}
              />

              {/* Notenhals (Stem) */}
              {el.stemUp ? (
                <line
                  x1={el.x + 2.8}
                  y1={el.y}
                  x2={el.x + 2.8}
                  y2={el.y - 13}
                  stroke={accentColor}
                  strokeWidth={1}
                  strokeLinecap="round"
                />
              ) : (
                <line
                  x1={el.x - 2.8}
                  y1={el.y}
                  x2={el.x - 2.8}
                  y2={el.y + 13}
                  stroke={accentColor}
                  strokeWidth={1}
                  strokeLinecap="round"
                />
              )}
            </g>
          );
        })}

        {/* Live Playhead Puls-Linie während der Wiedergabe */}
        {isPlaying && (
          <line
            x1={startX + 4}
            y1={staffLines[0] - 2}
            x2={startX + 4}
            y2={staffLines[staffLines.length - 1] + 2}
            stroke={accentColor}
            strokeWidth={2}
            opacity={0.85}
          >
            <animate
              attributeName="x1"
              values={`${startX + 4};${endX - 4};${startX + 4}`}
              dur="2s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="x2"
              values={`${startX + 4};${endX - 4};${startX + 4}`}
              dur="2s"
              repeatCount="indefinite"
            />
          </line>
        )}
      </svg>
    </div>
  );
};

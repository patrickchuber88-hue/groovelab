/**
 * 🏛️ Campus-Groovelab Micro-Score Studio
 * microScoreRestRenderer.tsx
 * 
 * 2027 0,1% Urtext- & SMuFL-Pausen-Engine (Henle / Gould Behind Bars):
 * - Ganze Pause (Semibreve): Hängt von Linie 4 (staffTopY + 12.5px)
 * - Halbe Pause (Minim): Liegt auf Linie 3 (staffTopY + 25px)
 * - Viertelpause (Crotchet): SMuFL Bravura Zickzack-Glyphe
 * - Achtelpause (Quaver): SMuFL-konformer Haken & Tropfen im 3. Raum mit Diagonale auf Linie 2
 * - 16tel-Pause (Semiquaver): Doppelter Haken & Doppel-Tropfen
 */

import React from 'react';
import { MicroScoreDuration } from './microScore.types';
import { SMUFL_GLYPHS } from '../worldtour/worldTourMusicGlyphs';

export interface RenderStaffRestProps {
  duration: MicroScoreDuration;
  fractionX: number;
  staffTopY: number;
  color?: string;
  opacity?: number;
}

export const renderStaffRest = ({
  duration,
  fractionX,
  staffTopY,
  color = '#475569',
  opacity = 1.0
}: RenderStaffRestProps): React.ReactElement => {
  switch (duration) {
    case '1':
      // 🎼 Ganze Pause: Gefülltes Rechteck, hängt von der 4. Linie (staffTopY + 12.5) nach unten
      return (
        <rect
          key={`rest-whole-${fractionX}`}
          x={fractionX - 7}
          y={staffTopY + 12.5}
          width={14}
          height={6.25}
          fill={color}
          opacity={opacity}
          rx={0.5}
        />
      );

    case '2':
      // 🎼 Halbe Pause: Gefülltes Rechteck, liegt auf der 3. Linie (staffTopY + 25) nach oben
      return (
        <rect
          key={`rest-half-${fractionX}`}
          x={fractionX - 7}
          y={staffTopY + 18.75}
          width={14}
          height={6.25}
          fill={color}
          opacity={opacity}
          rx={0.5}
        />
      );

    case '8':
      // 🎼 Achtelpause: Urtext-konformer geschwungener Haken im 3. Zwischenraum mit Diagonale auf Linie 2
      return (
        <g key={`rest-8th-${fractionX}`} opacity={opacity} transform={`translate(${fractionX}, ${staffTopY + 25})`}>
          {/* Tropfen / Notenkopf-Kugel im 3. Zwischenraum (y = -6px) */}
          <circle cx={-3.0} cy={-6.0} r={2.7} fill={color} />
          {/* Geschwungener Bogen nach oben rechts */}
          <path
            d="M -3.0 -8.7 C 0.5 -10.5 4.5 -8.5 4.0 -3.0 C 3.5 0.5 0.5 4.0 -3.5 13.0"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
          {/* Schräger Stamm nach unten links auf Linie 2 (y = +12.5px) */}
          <line
            x1={2.2}
            y1={-5.5}
            x2={-3.8}
            y2={13.0}
            stroke={color}
            strokeWidth="2.0"
            strokeLinecap="round"
          />
        </g>
      );

    case '16':
      // 🎼 16tel-Pause: Doppelter Haken mit zwei Tropfen
      return (
        <g key={`rest-16th-${fractionX}`} opacity={opacity} transform={`translate(${fractionX}, ${staffTopY + 25})`}>
          {/* Oberer Tropfen & Haken */}
          <circle cx={-3.0} cy={-9.5} r={2.4} fill={color} />
          <path
            d="M -3.0 -12.0 C 0.5 -13.5 4.5 -11.5 4.0 -6.5 C 3.5 -3.5 1.5 -1.0 -2.0 6.0"
            stroke={color}
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
          {/* Unterer Tropfen & Haken */}
          <circle cx={-4.5} cy={-1.5} r={2.4} fill={color} />
          <path
            d="M -4.5 -4.0 C -1.0 -5.5 3.0 -3.5 2.5 1.5 C 2.0 4.5 0.0 7.0 -3.5 14.0"
            stroke={color}
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
          {/* Schräger Stamm */}
          <line
            x1={2.5}
            y1={-8.0}
            x2={-4.5}
            y2={14.0}
            stroke={color}
            strokeWidth="2.0"
            strokeLinecap="round"
          />
        </g>
      );

    case '4':
    default:
      // 🎼 Viertelpause: Standard SMuFL Bravura Pfad
      return (
        <path
          key={`rest-quarter-${fractionX}`}
          d={SMUFL_GLYPHS.restQuarter}
          transform={`translate(${fractionX - 6}, ${staffTopY + 20}) scale(0.034, -0.034)`}
          fill={color}
          opacity={opacity}
        />
      );
  }
};

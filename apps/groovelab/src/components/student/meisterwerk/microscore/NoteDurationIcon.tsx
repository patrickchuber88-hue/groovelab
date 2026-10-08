import React from 'react';
import { MicroScoreDuration } from './microScore.types';

interface NoteDurationIconProps {
  duration: MicroScoreDuration;
  color?: string;
  size?: number;
}

/**
 * 🎼 SMuFL-konforme Vektor-Notenwert-Icons (2027 0,1% Goldstandard)
 * Ersetzt unzuverlässige Unicode-Noten (𝅝, 𝅘𝅥 etc.) durch gestochen scharfe SVG-Glyphen.
 */
export const NoteDurationIcon: React.FC<NoteDurationIconProps> = ({
  duration,
  color = 'currentColor',
  size = 18
}) => {
  switch (duration) {
    case '1': // Ganze Note (Semibreve) - offener Notenkopf ohne Hals
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
          <ellipse
            cx="12"
            cy="12"
            rx="6.5"
            ry="4.2"
            transform="rotate(-25 12 12)"
            stroke={color}
            strokeWidth="2.4"
          />
        </svg>
      );

    case '2': // Halbe Note (Minim) - offener Notenkopf mit Hals
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
          <ellipse
            cx="9.5"
            cy="14.5"
            rx="5.2"
            ry="3.4"
            transform="rotate(-25 9.5 14.5)"
            stroke={color}
            strokeWidth="2.2"
          />
          <path
            d="M 13.8 13.5 L 13.8 3.5"
            stroke={color}
            strokeWidth="2.0"
            strokeLinecap="round"
          />
        </svg>
      );

    case '4': // Viertelnote (Crotchet) - gefüllter Notenkopf mit Hals
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
          <ellipse
            cx="9.5"
            cy="14.5"
            rx="5.2"
            ry="3.4"
            transform="rotate(-25 9.5 14.5)"
            fill={color}
          />
          <path
            d="M 13.8 13.5 L 13.8 3.5"
            stroke={color}
            strokeWidth="2.0"
            strokeLinecap="round"
          />
        </svg>
      );

    case '8': // Achtelnote (Quaver) - gefüllter Notenkopf mit Hals & 1 Fähnchen
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
          <ellipse
            cx="8.5"
            cy="15"
            rx="4.8"
            ry="3.2"
            transform="rotate(-25 8.5 15)"
            fill={color}
          />
          <path
            d="M 12.6 14 L 12.6 3"
            stroke={color}
            strokeWidth="2.0"
            strokeLinecap="round"
          />
          <path
            d="M 12.6 3 C 16.5 5 18 8.5 17 11.5"
            stroke={color}
            strokeWidth="2.0"
            strokeLinecap="round"
          />
        </svg>
      );

    case '16': // Sechzehntelnote (Semiquaver) - gefüllter Notenkopf mit Hals & 2 Fähnchen
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
          <ellipse
            cx="8.5"
            cy="15.5"
            rx="4.6"
            ry="3.0"
            transform="rotate(-25 8.5 15.5)"
            fill={color}
          />
          <path
            d="M 12.4 14.5 L 12.4 2.5"
            stroke={color}
            strokeWidth="2.0"
            strokeLinecap="round"
          />
          <path
            d="M 12.4 2.5 C 16.5 4.5 18 7.5 17 10"
            stroke={color}
            strokeWidth="1.9"
            strokeLinecap="round"
          />
          <path
            d="M 12.4 6 C 16.5 8 18 11 17 13.5"
            stroke={color}
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      );

    default:
      return null;
  }
};

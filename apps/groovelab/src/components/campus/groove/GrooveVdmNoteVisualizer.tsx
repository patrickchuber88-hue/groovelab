import React from 'react';

export interface GrooveVdmNoteVisualizerProps {
  subdivisionCount: number;
  stepIndex: number;
  isTarget: boolean;
  isActive: boolean;
  isAnticipating: boolean;
  syllable: string;
  isNotebook?: boolean;
}

/**
 * Gestochen scharfe Vektor-Notenglyphen nach VdM-Musikschulstandard (SVG)
 */
export const GrooveVdmNoteVisualizer: React.FC<GrooveVdmNoteVisualizerProps> = ({
  subdivisionCount,
  stepIndex,
  isTarget,
  isActive,
  isAnticipating,
  syllable,
  isNotebook = false
}) => {
  // Erkennung der musikalischen Notenfigur anhand der Unterteilungen
  const isEighthNote = subdivisionCount === 8;
  const isSixteenthNote = subdivisionCount >= 12;

  // Akzentuierte Farbgebung
  const noteFillColor = isActive
    ? '#ffffff'
    : (isAnticipating ? '#ea580c' : (isTarget ? '#0f172a' : '#cbd5e1'));

  const stemColor = isActive
    ? '#ffffff'
    : (isAnticipating ? '#ea580c' : (isTarget ? '#334155' : '#cbd5e1'));

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        width: '100%',
        height: '100%',
        minWidth: 0,
        userSelect: 'none'
      }}
    >
      {/* 1. Echte Notengrafik (SVG) */}
      <div
        style={{
          width: isNotebook ? '26px' : '22px',
          height: isNotebook ? '26px' : '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.08s ease',
          transform: isActive ? 'scale(1.2)' : 'scale(1)'
        }}
      >
        {isTarget ? (
          // Echte Note mit Notenkopf & Hals
          <svg
            viewBox="0 0 24 28"
            width={isNotebook ? 22 : 18}
            height={isNotebook ? 26 : 22}
            style={{ overflow: 'visible' }}
          >
            {/* Schräger Notenkopf */}
            <ellipse
              cx="9"
              cy="20"
              rx="5.5"
              ry="4"
              transform="rotate(-25 9 20)"
              fill={noteFillColor}
            />
            {/* Notenhals nach oben */}
            <line
              x1="13.5"
              y1="19"
              x2="13.5"
              y2="4"
              stroke={stemColor}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            {/* Achtel- oder 16tel-Fähnchen falls Einzelfigur */}
            {isEighthNote && (
              <path
                d="M 13.5 4 C 18 8, 19 12, 16 15"
                fill="none"
                stroke={stemColor}
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            )}
            {isSixteenthNote && (
              <>
                <path
                  d="M 13.5 4 C 18 7, 18 10, 16 12"
                  fill="none"
                  stroke={stemColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M 13.5 9 C 18 12, 18 15, 16 17"
                  fill="none"
                  stroke={stemColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </>
            )}
          </svg>
        ) : (
          // Pause-Symbol (Viertel- oder Achtelpause VdM-Stil)
          <svg
            viewBox="0 0 20 24"
            width={isNotebook ? 16 : 14}
            height={isNotebook ? 20 : 16}
            style={{ opacity: 0.6 }}
          >
            <path
              d="M 10 4 L 7 10 L 12 14 L 8 20"
              fill="none"
              stroke={stemColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {/* 2. Rhythmische Sprechsilbe (z. B. "Ta", "Ti-Ti", "Ta-Ka-Di-Mi") */}
      <span
        style={{
          fontSize: subdivisionCount >= 12 ? '0.62rem' : '0.72rem',
          fontWeight: 950,
          color: isActive ? '#ffffff' : (isTarget ? '#0f172a' : '#94a3b8'),
          lineHeight: 1,
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%'
        }}
      >
        {syllable || (isTarget ? 'Ta' : '·')}
      </span>
    </div>
  );
};

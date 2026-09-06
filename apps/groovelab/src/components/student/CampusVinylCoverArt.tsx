import React from 'react';

export interface CampusVinylCoverArtProps {
  songColor: { from: string; to: string; text?: string };
  size?: 'sm' | 'md' | 'lg';
}

export const CampusVinylCoverArt: React.FC<CampusVinylCoverArtProps> = ({ songColor, size = 'md' }) => {
  const isSm = size === 'sm';
  const isLg = size === 'lg';
  const sleeveSize = isSm ? 54 : isLg ? 102 : 94;
  const vinylSize = isSm ? 48 : isLg ? 92 : 84;
  const borderRadius = isSm ? 14 : isLg ? 25 : 23;
  const noteWidth = isSm ? 30 : isLg ? 52 : 46;
  const noteHeight = isSm ? 30 : isLg ? 52 : 46;
  const vinylRight = isSm ? -7 : isLg ? -13 : -11;

  const gradId = `studentFineGrad_${(songColor?.from || 'blue').replace(/[^a-zA-Z0-9]/g, '')}_${size}`;
  const highId = `studentFineHigh_${(songColor?.from || 'blue').replace(/[^a-zA-Z0-9]/g, '')}_${size}`;
  const headHigh1 = `studentHead1_${(songColor?.from || 'blue').replace(/[^a-zA-Z0-9]/g, '')}_${size}`;
  const headHigh2 = `studentHead2_${(songColor?.from || 'blue').replace(/[^a-zA-Z0-9]/g, '')}_${size}`;

  return (
    <div style={{
      position: 'relative',
      width: `${sleeveSize + (isSm ? 8 : 12)}px`,
      height: `${sleeveSize}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      marginLeft: isSm ? '-3px' : '-5px',
      flexShrink: 0
    }}>
      {/* 1. Sleek Black Vinyl Disc with Ultra-Fine Grooves */}
      <div style={{
        position: 'absolute',
        right: `${vinylRight}px`,
        width: `${vinylSize}px`,
        height: `${vinylSize}px`,
        borderRadius: '50%',
        boxShadow: '3px 5px 15px rgba(0, 0, 0, 0.32)',
        zIndex: 1,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <svg width={vinylSize} height={vinylSize} viewBox="0 0 100 100" fill="none">
          <defs>
            <radialGradient id={`discBase_${gradId}`} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2c2c30" />
              <stop offset="25%" stopColor="#141416" />
              <stop offset="60%" stopColor="#08080a" />
              <stop offset="90%" stopColor="#18181b" />
              <stop offset="100%" stopColor="#050506" />
            </radialGradient>
            {/* Anisotropic Light Reflection Beams */}
            <linearGradient id={`discSheen1_${gradId}`} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.22)" />
              <stop offset="35%" stopColor="rgba(255, 255, 255, 0)" />
              <stop offset="65%" stopColor="rgba(255, 255, 255, 0)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0.18)" />
            </linearGradient>
            <linearGradient id={`discSheen2_${gradId}`} x1="100" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.15)" />
              <stop offset="40%" stopColor="rgba(255, 255, 255, 0)" />
              <stop offset="60%" stopColor="rgba(255, 255, 255, 0)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0.12)" />
            </linearGradient>
          </defs>
          {/* Disc Body */}
          <circle cx="50" cy="50" r="49.5" fill={`url(#discBase_${gradId})`} />
          <circle cx="50" cy="50" r="49.5" fill={`url(#discSheen1_${gradId})`} />
          <circle cx="50" cy="50" r="49.5" fill={`url(#discSheen2_${gradId})`} />
          
          {/* Distinct, Crisp Concentric Vinyl Grooves */}
          <circle cx="50" cy="50" r="46.5" stroke="rgba(255,255,255,0.32)" strokeWidth="0.85" />
          <circle cx="50" cy="50" r="44" stroke="rgba(0,0,0,0.65)" strokeWidth="0.85" />
          <circle cx="50" cy="50" r="41.5" stroke="rgba(255,255,255,0.26)" strokeWidth="0.85" />
          <circle cx="50" cy="50" r="39" stroke="rgba(0,0,0,0.6)" strokeWidth="0.85" />
          <circle cx="50" cy="50" r="36.5" stroke="rgba(255,255,255,0.28)" strokeWidth="0.85" />
          <circle cx="50" cy="50" r="34" stroke="rgba(0,0,0,0.6)" strokeWidth="0.85" />
          <circle cx="50" cy="50" r="31.5" stroke="rgba(255,255,255,0.22)" strokeWidth="0.85" />
          <circle cx="50" cy="50" r="29" stroke="rgba(0,0,0,0.6)" strokeWidth="0.85" />
          <circle cx="50" cy="50" r="26.5" stroke="rgba(255,255,255,0.18)" strokeWidth="0.85" />
          <circle cx="50" cy="50" r="24" stroke="rgba(0,0,0,0.5)" strokeWidth="0.85" />
          <circle cx="50" cy="50" r="21.5" stroke="rgba(255,255,255,0.16)" strokeWidth="0.85" />
          
          {/* Outer Rim Light Edge */}
          <circle cx="50" cy="50" r="49" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
        </svg>
      </div>

      {/* 2. Soft Pastel Rounded Square Sleeve */}
      <div style={{
        width: `${sleeveSize}px`,
        height: `${sleeveSize}px`,
        background: `linear-gradient(135deg, ${songColor.from} 0%, ${songColor.to} 100%)`,
        borderRadius: `${borderRadius}px`,
        boxShadow: '0 11px 24px -4px rgba(0, 0, 0, 0.1), 0 3px 7px -2px rgba(0, 0, 0, 0.05), inset 0 1.5px 2px rgba(255, 255, 255, 0.9)',
        border: '1.5px solid rgba(255, 255, 255, 0.8)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
        boxSizing: 'border-box'
      }}>
        {/* 3. 10% Feiner 3D Double Music Note (Sleek, Glossy, Precision Engineered) */}
        <svg 
          width={noteWidth} 
          height={noteHeight} 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          style={{ filter: 'drop-shadow(0 4.5px 7px rgba(0, 0, 0, 0.25)) drop-shadow(0 1.5px 2.5px rgba(0, 0, 0, 0.14))' }}
        >
          <defs>
            {/* Main 3D Dark Graphite Body */}
            <linearGradient id={gradId} x1="25" y1="15" x2="75" y2="85" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2c2c30" />
              <stop offset="35%" stopColor="#18181b" />
              <stop offset="75%" stopColor="#0f0f12" />
              <stop offset="100%" stopColor="#08080a" />
            </linearGradient>
            
            {/* Head 1 Specular Glow */}
            <radialGradient id={headHigh1} cx="34" cy="67" r="12" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.45)" />
              <stop offset="45%" stopColor="rgba(255, 255, 255, 0.08)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
            </radialGradient>

            {/* Head 2 Specular Glow */}
            <radialGradient id={headHigh2} cx="67" cy="58" r="12" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.45)" />
              <stop offset="45%" stopColor="rgba(255, 255, 255, 0.08)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
            </radialGradient>

            {/* Top Beam Highlight Line */}
            <linearGradient id={highId} x1="39" y1="21" x2="78" y2="13" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.72)" />
              <stop offset="60%" stopColor="rgba(255, 255, 255, 0.26)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0.05)" />
            </linearGradient>
          </defs>

          {/* Left Note Head (10% feineres 3D-Oval) */}
          <ellipse cx="36" cy="68.5" rx="11.8" ry="8.8" transform="rotate(-19 36 68.5)" fill={`url(#${gradId})`} />
          <ellipse cx="36" cy="68.5" rx="11.8" ry="8.8" transform="rotate(-19 36 68.5)" fill={`url(#${headHigh1})`} />

          {/* Right Note Head (10% feineres 3D-Oval) */}
          <ellipse cx="68" cy="59.5" rx="11.8" ry="8.8" transform="rotate(-19 68 59.5)" fill={`url(#${gradId})`} />
          <ellipse cx="68" cy="59.5" rx="11.8" ry="8.8" transform="rotate(-19 68 59.5)" fill={`url(#${headHigh2})`} />

          {/* Left Stem (5.8px Schlanker Stab) */}
          <rect x="42" y="25" width="5.8" height="44" rx="2.9" fill={`url(#${gradId})`} />

          {/* Right Stem (5.8px Schlanker Stab) */}
          <rect x="74.2" y="16" width="5.8" height="44" rx="2.9" fill={`url(#${gradId})`} />

          {/* Top Beam (10% feinerer Verbindungsbalken) */}
          <path d="M 42 26 C 42 22 45 21 48.5 20.2 L 75.5 13.5 C 78.5 12.8 81.5 14.2 81.5 17.5 L 81.5 24.5 C 81.5 27.5 78.5 28.5 75.5 29.2 L 48.5 35.8 C 45 36.5 42 35.2 42 32 Z" fill={`url(#${gradId})`} />

          {/* Top Beam Specular Light Edge */}
          <path d="M 44.5 23 L 78.5 14.8" stroke={`url(#${highId})`} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
};

export const renderSongVinylCover = (songColor: { from: string; to: string; text?: string }, size: 'sm' | 'md' | 'lg' = 'md') => {
  return <CampusVinylCoverArt songColor={songColor} size={size} />;
};

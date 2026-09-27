import React from 'react';

/**
 * 🗺️ 21 Kanonische Vektor-Nationalflaggen (0,1% Monolith Goldstandard)
 * 
 * Heraldisch saubere Vektor-Nachzeichnungen aller 21 Weltreise-Stationen.
 * 100% Gemeinfrei nach § 5 UrhG (amtliche Werke).
 * Ordnungswidrigkeitenrechtlich immunisiert gegen § 124 OWiG (zivile Bürgerflaggen).
 * Skaliert standardmäßig im 36px-Kreismedaillon (Radius = 18).
 */

interface WorldTourCountryFlagProps {
  countryCode: string;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Star helper polygon generator
 */
const renderStar = (cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number, fill: string, stroke?: string, strokeWidth?: number) => {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;
  let path = `M ${cx} ${cy - outerRadius}`;

  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    path += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    path += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    rot += step;
  }
  path += ' Z';

  return <path d={path} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
};

/**
 * Union Jack Subkomponente für GB, AU, NZ, Hawaii
 */
const UnionJackCanton: React.FC<{ x: number; y: number; width: number; height: number }> = ({
  x, y, width, height
}) => {
  const x2 = x + width;
  const y2 = y + height;
  const cx = x + width / 2;
  const cy = y + height / 2;

  return (
    <g>
      {/* Blauer Grund */}
      <rect x={x} y={y} width={width} height={height} fill="#1e3a8a" />
      {/* Weißes Andreaskreuz (St. Andrew) */}
      <line x1={x} y1={y} x2={x2} y2={y2} stroke="#ffffff" strokeWidth={width * 0.18} />
      <line x1={x} y1={y2} x2={x2} y2={y} stroke="#ffffff" strokeWidth={width * 0.18} />
      {/* Rotes Andreaskreuz (St. Patrick) */}
      <line x1={x} y1={y} x2={x2} y2={y2} stroke="#dc2626" strokeWidth={width * 0.09} />
      <line x1={x} y1={y2} x2={x2} y2={y} stroke="#dc2626" strokeWidth={width * 0.09} />
      {/* Weißes Georgskreuz */}
      <line x1={cx} y1={y} x2={cx} y2={y2} stroke="#ffffff" strokeWidth={width * 0.28} />
      <line x1={x} y1={cy} x2={x2} y2={cy} stroke="#ffffff" strokeWidth={height * 0.28} />
      {/* Rotes Georgskreuz (St. George) */}
      <line x1={cx} y1={y} x2={cx} y2={y2} stroke="#dc2626" strokeWidth={width * 0.16} />
      <line x1={x} y1={cy} x2={x2} y2={cy} stroke="#dc2626" strokeWidth={height * 0.16} />
    </g>
  );
};

/**
 * Render-Funktion für die SVG-Pfade einer Nationalflagge, zentriert auf (0,0) mit R=18
 */
export const renderCountryFlagPaths = (code: string) => {
  const normalizedCode = code.toUpperCase();

  switch (normalizedCode) {
    // 🇩🇪 Deutschland (Schwarz-Rot-Gold)
    case 'DE':
      return (
        <g>
          <rect x="-18" y="-18" width="36" height="12" fill="#0f172a" />
          <rect x="-18" y="-6" width="36" height="12" fill="#dc2626" />
          <rect x="-18" y="6" width="36" height="12" fill="#facc15" />
        </g>
      );

    // 🇫🇷 Frankreich (Blau-Weiß-Rot)
    case 'FR':
      return (
        <g>
          <rect x="-18" y="-18" width="12" height="36" fill="#1e40af" />
          <rect x="-6" y="-18" width="12" height="36" fill="#ffffff" />
          <rect x="6" y="-18" width="12" height="36" fill="#dc2626" />
        </g>
      );

    // 🇬🇧 Vereinigtes Königreich (Union Jack)
    case 'GB':
      return (
        <UnionJackCanton x={-18} y={-18} width={36} height={36} />
      );

    // 🇮🇹 Italien (Grün-Weiß-Rot)
    case 'IT':
      return (
        <g>
          <rect x="-18" y="-18" width="12" height="36" fill="#16a34a" />
          <rect x="-6" y="-18" width="12" height="36" fill="#ffffff" />
          <rect x="6" y="-18" width="12" height="36" fill="#dc2626" />
        </g>
      );

    // 🇪🇸 Spanien (Rot-Gelb-Rot)
    case 'ES':
    case 'ES_FLAMENCO':
      return (
        <g>
          <rect x="-18" y="-18" width="36" height="9" fill="#dc2626" />
          <rect x="-18" y="-9" width="36" height="18" fill="#facc15" />
          <rect x="-18" y="9" width="36" height="9" fill="#dc2626" />
          {/* Heraldisches Wappen-Emblem */}
          <g transform="translate(-7, 0)">
            <rect x="-3" y="-5" width="6" height="8" rx="2" fill="#dc2626" />
            <rect x="-2" y="-4" width="4" height="6" fill="#facc15" />
            <circle cx="0" cy="-6" r="1.5" fill="#f59e0b" />
          </g>
        </g>
      );

    // 🇮🇪 Irland (Grün-Weiß-Orange)
    case 'IE':
    case 'IE_JIG':
      return (
        <g>
          <rect x="-18" y="-18" width="12" height="36" fill="#16a34a" />
          <rect x="-6" y="-18" width="12" height="36" fill="#ffffff" />
          <rect x="6" y="-18" width="12" height="36" fill="#f97316" />
        </g>
      );

    // 🇪🇺 Europäische Union (12 goldene Sterne im Kreis auf Dunkelblau)
    case 'EU': {
      const starRadius = 11;
      const stars = Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const sx = starRadius * Math.cos(angle);
        const sy = starRadius * Math.sin(angle);
        return (
          <g key={i}>
            {renderStar(sx, sy, 5, 1.8, 0.8, '#facc15')}
          </g>
        );
      });
      return (
        <g>
          <rect x="-18" y="-18" width="36" height="36" fill="#1e3a8a" />
          {stars}
        </g>
      );
    }

    // 🇧🇬 Bulgarien (Weiß-Grün-Rot)
    case 'BG':
    case 'BG_HORO':
      return (
        <g>
          <rect x="-18" y="-18" width="36" height="12" fill="#ffffff" />
          <rect x="-18" y="-6" width="36" height="12" fill="#16a34a" />
          <rect x="-18" y="6" width="36" height="12" fill="#dc2626" />
        </g>
      );

    // 🇺🇸 Vereinigte Staaten von Amerika (Stars & Stripes)
    case 'US':
      return (
        <g>
          {/* 13 Streifen */}
          {Array.from({ length: 13 }).map((_, i) => (
            <rect
              key={i}
              x="-18"
              y={-18 + i * (36 / 13)}
              width="36"
              height={36 / 13 + 0.2}
              fill={i % 2 === 0 ? '#dc2626' : '#ffffff'}
            />
          ))}
          {/* Blaues Kanton */}
          <rect x="-18" y="-18" width="18" height="18" fill="#1e3a8a" />
          {/* Sternenmuster */}
          <g fill="#ffffff">
            <circle cx="-14" cy="-14" r="1.1" />
            <circle cx="-10" cy="-14" r="1.1" />
            <circle cx="-6" cy="-14" r="1.1" />
            <circle cx="-2" cy="-14" r="1.1" />
            <circle cx="-12" cy="-10" r="1.1" />
            <circle cx="-8" cy="-10" r="1.1" />
            <circle cx="-4" cy="-10" r="1.1" />
            <circle cx="-14" cy="-6" r="1.1" />
            <circle cx="-10" cy="-6" r="1.1" />
            <circle cx="-6" cy="-6" r="1.1" />
            <circle cx="-2" cy="-6" r="1.1" />
            <circle cx="-12" cy="-2" r="1.1" />
            <circle cx="-8" cy="-2" r="1.1" />
            <circle cx="-4" cy="-2" r="1.1" />
          </g>
        </g>
      );

    // 🌺 Hawaii (Ka Hae Hawaiʻi)
    case 'US_HAWAII':
    case 'HI':
      return (
        <g>
          {/* 8 Streifen: Weiß, Rot, Blau, Weiß, Rot, Blau, Weiß, Rot */}
          <rect x="-18" y="-18" width="36" height="4.5" fill="#ffffff" />
          <rect x="-18" y="-13.5" width="36" height="4.5" fill="#dc2626" />
          <rect x="-18" y="-9" width="36" height="4.5" fill="#1e3a8a" />
          <rect x="-18" y="-4.5" width="36" height="4.5" fill="#ffffff" />
          <rect x="-18" y="0" width="36" height="4.5" fill="#dc2626" />
          <rect x="-18" y="4.5" width="36" height="4.5" fill="#1e3a8a" />
          <rect x="-18" y="9" width="36" height="4.5" fill="#ffffff" />
          <rect x="-18" y="13.5" width="36" height="4.5" fill="#dc2626" />
          {/* Union Jack Kanton */}
          <UnionJackCanton x={-18} y={-18} width={18} height={18} />
        </g>
      );

    // 🇨🇺 Kuba (La Bayamesa)
    case 'CU':
    case 'CU_SON':
      return (
        <g>
          {/* 5 Streifen: Blau / Weiß */}
          <rect x="-18" y="-18" width="36" height="7.2" fill="#1e40af" />
          <rect x="-18" y="-10.8" width="36" height="7.2" fill="#ffffff" />
          <rect x="-18" y="-3.6" width="36" height="7.2" fill="#1e40af" />
          <rect x="-18" y="3.6" width="36" height="7.2" fill="#ffffff" />
          <rect x="-18" y="10.8" width="36" height="7.2" fill="#1e40af" />
          {/* Rotes Dreieck */}
          <polygon points="-18,-18 -18,18 2,0" fill="#dc2626" />
          {/* Weißer Stern im Dreieck */}
          {renderStar(-10, 0, 5, 4, 1.8, '#ffffff')}
        </g>
      );

    // 🇧🇷 Brasilien (Ordem e Progresso)
    case 'BR':
    case 'BR_CHORO':
      return (
        <g>
          <rect x="-18" y="-18" width="36" height="36" fill="#15803d" />
          {/* Gelbe Raute */}
          <polygon points="0,-14 15,0 0,14 -15,0" fill="#facc15" />
          {/* Blauer Himmelsglobus */}
          <circle cx="0" cy="0" r="7.5" fill="#1e3a8a" />
          {/* Weißes Äquatorband */}
          <path d="M -7.2 2 Q 0 -3 7.2 -1" stroke="#ffffff" strokeWidth="1.6" fill="none" />
          {/* Südliche Sterne */}
          <circle cx="-2" cy="3" r="0.7" fill="#ffffff" />
          <circle cx="2" cy="4" r="0.7" fill="#ffffff" />
          <circle cx="0" cy="5" r="0.6" fill="#ffffff" />
        </g>
      );

    // 🇵🇪 Peru (Rot-Weiß-Rot)
    case 'PE':
    case 'PE_KASHWA':
      return (
        <g>
          <rect x="-18" y="-18" width="12" height="36" fill="#dc2626" />
          <rect x="-6" y="-18" width="12" height="36" fill="#ffffff" />
          <rect x="6" y="-18" width="12" height="36" fill="#dc2626" />
        </g>
      );

    // 🇯🇵 Japan (Hinomaru)
    case 'JP':
      return (
        <g>
          <rect x="-18" y="-18" width="36" height="36" fill="#ffffff" />
          <circle cx="0" cy="0" r="10.8" fill="#dc2626" />
        </g>
      );

    // 🇮🇳 Indien (Tiranga mit Ashoka Chakra)
    case 'IN':
    case 'IN_RAGA':
      return (
        <g>
          <rect x="-18" y="-18" width="36" height="12" fill="#ea580c" />
          <rect x="-18" y="-6" width="36" height="12" fill="#ffffff" />
          <rect x="-18" y="6" width="36" height="12" fill="#15803d" />
          {/* Ashoka Chakra */}
          <circle cx="0" cy="0" r="4.5" fill="none" stroke="#1e3a8a" strokeWidth="0.8" />
          <circle cx="0" cy="0" r="1" fill="#1e3a8a" />
          {Array.from({ length: 8 }).map((_, i) => {
            const rad = (i * 45) * (Math.PI / 180);
            return (
              <line
                key={i}
                x1="0"
                y1="0"
                x2={(4.3 * Math.cos(rad)).toFixed(2)}
                y2={(4.3 * Math.sin(rad)).toFixed(2)}
                stroke="#1e3a8a"
                strokeWidth="0.6"
              />
            );
          })}
        </g>
      );

    // 🇪🇬 Ägypten (Bilady mit Saladin-Adler)
    case 'EG':
    case 'EG_MAQAM':
      return (
        <g>
          <rect x="-18" y="-18" width="36" height="12" fill="#dc2626" />
          <rect x="-18" y="-6" width="36" height="12" fill="#ffffff" />
          <rect x="-18" y="6" width="36" height="12" fill="#0f172a" />
          {/* Adler von Saladin im mittleren Streifen */}
          <g transform="translate(0, 0)">
            <ellipse cx="0" cy="0" rx="3.5" ry="4" fill="#ca8a04" />
            <circle cx="0" cy="-3.5" r="1.5" fill="#ca8a04" />
            <line x1="-3" y1="4" x2="3" y2="4" stroke="#ca8a04" strokeWidth="1" />
          </g>
        </g>
      );

    // 🇿🇦 Südafrika (Shosholoza)
    case 'ZA':
    case 'ZA_SHOSHO':
      return (
        <g>
          {/* Oberes Rot, Unteres Blau */}
          <rect x="-18" y="-18" width="36" height="18" fill="#dc2626" />
          <rect x="-18" y="0" width="36" height="18" fill="#1e40af" />
          {/* Weißer Saum */}
          <polygon points="-18,-18 0,0 -18,18 -18,11 -4,0 -18,-11" fill="#ffffff" />
          <rect x="0" y="-6" width="18" height="12" fill="#ffffff" />
          {/* Grünes Y-Band */}
          <polygon points="-18,-15 2,0 -18,15 -18,8 -7,0 -18,-8" fill="#16a34a" />
          <rect x="0" y="-4" width="18" height="8" fill="#16a34a" />
          {/* Goldener Saum Dreieck */}
          <polygon points="-18,-12 -6,0 -18,12" fill="#facc15" />
          {/* Schwarzes Dreieck */}
          <polygon points="-18,-9 -9,0 -18,9" fill="#0f172a" />
        </g>
      );

    // 🇬🇳 Westafrika / Guinea / Mali (Kuku)
    case 'WA_KUKU':
      return (
        <g>
          <rect x="-18" y="-18" width="12" height="36" fill="#dc2626" />
          <rect x="-6" y="-18" width="12" height="36" fill="#facc15" />
          <rect x="6" y="-18" width="12" height="36" fill="#16a34a" />
        </g>
      );

    // 🇸🇳 Senegal (Jarabi - Grün, Gelb, Rot mit grünem Stern)
    case 'WA_JARABI':
      return (
        <g>
          <rect x="-18" y="-18" width="12" height="36" fill="#16a34a" />
          <rect x="-6" y="-18" width="12" height="36" fill="#facc15" />
          <rect x="6" y="-18" width="12" height="36" fill="#dc2626" />
          {/* Grüner Stern im gelben Streifen */}
          {renderStar(0, 0, 5, 4, 1.8, '#16a34a')}
        </g>
      );

    // 🇦🇺 Australien (Advance Australia Fair)
    case 'AU':
      return (
        <g>
          <rect x="-18" y="-18" width="36" height="36" fill="#1e3a8a" />
          {/* Union Jack Kanton */}
          <UnionJackCanton x={-18} y={-18} width={18} height={18} />
          {/* Commonwealth Stern (7-zackig) unter Union Jack */}
          {renderStar(-9, 8, 7, 4.2, 2, '#ffffff')}
          {/* Kreuz des Südens auf rechter Seite */}
          {renderStar(9, -10, 7, 2, 0.9, '#ffffff')}
          {renderStar(5, -2, 7, 2, 0.9, '#ffffff')}
          {renderStar(13, 0, 7, 2, 0.9, '#ffffff')}
          {renderStar(9, 10, 7, 2.4, 1.1, '#ffffff')}
          {renderStar(11, 4, 5, 1.2, 0.5, '#ffffff')}
        </g>
      );

    // 🇳🇿 Neuseeland (God Defend New Zealand)
    case 'NZ':
    case 'NZ_MAORI':
      return (
        <g>
          <rect x="-18" y="-18" width="36" height="36" fill="#1e3a8a" />
          {/* Union Jack Kanton */}
          <UnionJackCanton x={-18} y={-18} width={18} height={18} />
          {/* 4 rote Sterne mit weißem Saum */}
          {renderStar(9, -10, 5, 2.2, 1, '#dc2626', '#ffffff', 0.6)}
          {renderStar(4, -1, 5, 2.2, 1, '#dc2626', '#ffffff', 0.6)}
          {renderStar(14, 0, 5, 2.2, 1, '#dc2626', '#ffffff', 0.6)}
          {renderStar(9, 10, 5, 2.5, 1.1, '#dc2626', '#ffffff', 0.6)}
        </g>
      );

    // Fallback: Neutraler Globus
    default:
      return (
        <g>
          <circle cx="0" cy="0" r="18" fill="#0284c7" />
          <ellipse cx="0" cy="0" rx="10" ry="18" fill="none" stroke="#ffffff" strokeWidth="1.2" />
          <line x1="-18" y1="0" x2="18" y2="0" stroke="#ffffff" strokeWidth="1.2" />
        </g>
      );
  }
};

/**
 * 👑 WorldTourCountryFlag (Standalone React SVG Komponente)
 */
export const WorldTourCountryFlag: React.FC<WorldTourCountryFlagProps> = ({
  countryCode,
  size = 36,
  style,
  className
}) => {
  const clipId = `flag-clip-${countryCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="-18 -18 36 36"
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        borderRadius: '50%',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.12)',
        overflow: 'hidden',
        ...style
      }}
      aria-label={`Flagge ${countryCode}`}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="0" cy="0" r="17.5" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {renderCountryFlagPaths(countryCode)}
      </g>
      <circle cx="0" cy="0" r="17.5" fill="none" stroke="rgba(0, 0, 0, 0.15)" strokeWidth="1" />
    </svg>
  );
};

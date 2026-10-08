import React from 'react';
import { Music } from 'lucide-react';

export interface BrandIconProps {
  size?: number | string;
  color?: string;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 🎵 CampusRibbonNoteIcon
 * Das neue Campus-Markensignet: Elegante, flache Doppel-Achtelnote
 * Symbol für Melodie, Notenlehre, Musikschule und didaktischen Fluss.
 */
export const CampusRibbonNoteIcon: React.FC<BrandIconProps> = ({
  size = 20,
  color = 'currentColor',
  strokeWidth = 2.4,
  className,
  style
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    {/* Schräger oberer Notenbalken (Solid Slanted Beam) */}
    <path
      d="M7 6.8L18 3.8V6.6L7 9.6Z"
      fill={color}
    />
    {/* Linker Schaft */}
    <line
      x1="7"
      y1="7"
      x2="7"
      y2="16.5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    {/* Rechter Schaft */}
    <line
      x1="18"
      y1="4"
      x2="18"
      y2="13.5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    {/* Linker Notenkopf (Organisch rotierte Ellipse) */}
    <ellipse
      cx="5"
      cy="17"
      rx="3.2"
      ry="2.4"
      transform="rotate(-24 5 17)"
      fill={color}
    />
    {/* Rechter Notenkopf (Organisch rotierte Ellipse) */}
    <ellipse
      cx="16"
      cy="14"
      rx="3.2"
      ry="2.4"
      transform="rotate(-24 16 14)"
      fill={color}
    />
  </svg>
);

/**
 * 🥁 GrooveLabSnareIcon
 * Das neue GrooveLab-Markensignet: Flache, moderne Snare-Drum mit gekreuzten Sticks
 * Symbol für Beat-Making, Rhythmus, Groove und Band-Praxis.
 */
export const GrooveLabSnareIcon: React.FC<BrandIconProps> = ({
  size = 20,
  color = 'currentColor',
  strokeWidth = 2,
  className,
  style
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    {/* Gekreuzte Drumsticks oben */}
    <line
      x1="4"
      y1="4"
      x2="14"
      y2="9.5"
      stroke={color}
      strokeWidth={strokeWidth * 0.9}
      strokeLinecap="round"
    />
    <circle cx="4" cy="4" r="1.1" fill={color} />
    <line
      x1="20"
      y1="4"
      x2="10"
      y2="9.5"
      stroke={color}
      strokeWidth={strokeWidth * 0.9}
      strokeLinecap="round"
    />
    <circle cx="20" cy="4" r="1.1" fill={color} />

    {/* Oberer Spannreifen (Top Rim) */}
    <rect
      x="3.5"
      y="9"
      width="17"
      height="2.2"
      rx="1.1"
      fill={color}
    />

    {/* Flacher Snare-Kessel (Shallow Shell - 14"x5.5" Proportion) */}
    <rect
      x="4"
      y="10.5"
      width="16"
      height="6.5"
      rx="0.5"
      stroke={color}
      strokeWidth={strokeWidth}
      fill="none"
    />

    {/* Unterer Spannreifen (Bottom Rim) */}
    <rect
      x="3.5"
      y="16.5"
      width="17"
      height="2.2"
      rx="1.1"
      fill={color}
    />

    {/* Vertikale Spannböckchen (Tension Lugs) */}
    <line
      x1="8"
      y1="10.5"
      x2="8"
      y2="16.5"
      stroke={color}
      strokeWidth={strokeWidth * 0.75}
      strokeLinecap="round"
    />
    <line
      x1="12"
      y1="10.5"
      x2="12"
      y2="16.5"
      stroke={color}
      strokeWidth={strokeWidth * 0.75}
      strokeLinecap="round"
    />
    <line
      x1="16"
      y1="10.5"
      x2="16"
      y2="16.5"
      stroke={color}
      strokeWidth={strokeWidth * 0.75}
      strokeLinecap="round"
    />
  </svg>
);

export interface CampusGroovelabBrandProps {
  size?: number | string;
  fontSize?: string;
  iconSize?: number;
  withIcon?: boolean;
  inline?: boolean;
  fontWeight?: number | string;
  className?: string;
  style?: React.CSSProperties;
  iconColor?: string;
  campusColor?: string;
  hyphenColor?: string;
  groovelabColor?: string;
  asBadge?: boolean;
}

export const CampusGroovelabBrand: React.FC<CampusGroovelabBrandProps> = ({
  size,
  fontSize,
  iconSize,
  withIcon = false,
  inline = true,
  fontWeight = 800,
  className,
  style,
  iconColor = '#34a853',
  campusColor = '#34a853',
  hyphenColor = '#94a3b8',
  groovelabColor = '#eab308',
  asBadge = false
}) => {
  const calculatedFontSize = fontSize || (typeof size === 'string' ? size : (size ? `${size}px` : 'inherit'));
  const calculatedIconSize = iconSize || (typeof size === 'number' ? size : 18);

  const content = (
    <span
      className={className}
      style={{
        display: inline ? 'inline-flex' : 'flex',
        alignItems: 'center',
        gap: withIcon ? '6px' : '0px',
        fontWeight,
        fontSize: calculatedFontSize,
        letterSpacing: '-0.02em',
        verticalAlign: 'baseline',
        whiteSpace: 'nowrap',
        ...style
      }}
    >
      {withIcon && (
        <CampusRibbonNoteIcon 
          size={calculatedIconSize} 
          color={iconColor}
          style={{ 
            marginRight: '2px'
          }} 
        />
      )}
      <span>
        <span style={{ color: campusColor, fontWeight: 'inherit' }}>Campus</span>
        <span style={{ color: hyphenColor, fontWeight: 'inherit', margin: '0 1px' }}>-</span>
        <span style={{ color: groovelabColor, fontWeight: 'inherit' }}>Groovelab</span>
      </span>
    </span>
  );

  if (asBadge) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        padding: '4px 10px',
        borderRadius: '9999px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        {content}
      </span>
    );
  }

  return content;
};

export const CampusGroovelabText: React.FC<Omit<CampusGroovelabBrandProps, 'withIcon'>> = (props) => {
  return <CampusGroovelabBrand withIcon={false} {...props} />;
};

export const CampusGroovelabLogo: React.FC<Omit<CampusGroovelabBrandProps, 'withIcon'>> = (props) => {
  return <CampusGroovelabBrand withIcon={true} {...props} />;
};

export default CampusGroovelabBrand;

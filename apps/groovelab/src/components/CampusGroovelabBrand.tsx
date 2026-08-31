import React from 'react';
import { Music } from 'lucide-react';

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
        <Music 
          size={calculatedIconSize} 
          style={{ 
            color: iconColor, 
            strokeWidth: 2.5,
            flexShrink: 0,
            display: 'inline-block',
            verticalAlign: 'middle',
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

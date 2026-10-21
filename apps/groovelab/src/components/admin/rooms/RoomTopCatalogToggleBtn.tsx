import React from 'react';
import { ChevronUp, ChevronDown, Box } from 'lucide-react';

export interface RoomTopCatalogToggleBtnProps {
  isCollapsed: boolean;
  onToggle: () => void;
  brandColor?: string;
  roomCount?: number;
  variant?: 'calendar-header' | 'catalog-toolbar';
  showDivider?: boolean;
}

export const RoomTopCatalogToggleBtn: React.FC<RoomTopCatalogToggleBtnProps> = ({
  isCollapsed,
  onToggle,
  brandColor = '#34a853',
  roomCount = 14,
  variant = 'calendar-header',
  showDivider = true
}) => {
  if (variant === 'catalog-toolbar') {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!isCollapsed}
        aria-label="Campus Räume Leiste einklappen (Taste R)"
        title="Fokus-Wochenplan aktivieren & Raumleiste einklappen (Taste R)"
        style={{
          border: '1px solid rgba(0, 0, 0, 0.06)',
          background: '#f2f2f7',
          cursor: 'pointer',
          padding: '4px 10px',
          borderRadius: '10px',
          color: '#475569',
          fontSize: '0.70rem',
          fontWeight: 750,
          height: '28px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          transition: 'all 0.15s ease',
          whiteSpace: 'nowrap'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#e5e5ea';
          e.currentTarget.style.color = '#0f172a';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#f2f2f7';
          e.currentTarget.style.color = '#475569';
        }}
        onFocus={(e) => {
          e.currentTarget.style.outline = `2px solid ${brandColor}`;
          e.currentTarget.style.outlineOffset = '2px';
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = 'none';
        }}
      >
        <ChevronUp size={13} strokeWidth={2.4} />
        <span>Einklappen</span>
        <span style={{ fontSize: '0.62rem', background: 'rgba(0,0,0,0.06)', padding: '1px 5px', borderRadius: '4px', color: '#64748b', fontWeight: 800 }}>R</span>
      </button>
    );
  }

  // variant === 'calendar-header' (0,1% Apple Squircle Toolbar Duo)
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      {/* 0,1% Goldstandard Divider: Visual Decoupling of Calendar Date Controls from Layout Action Cluster */}
      {showDivider && (
        <div
          aria-hidden="true"
          style={{
            width: '1px',
            height: '20px',
            background: '#e5e5ea',
            margin: '0 2px'
          }}
        />
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!isCollapsed}
        aria-label={isCollapsed ? 'Campus Räume einblenden (Taste R)' : 'Fokus-Wochenplan: Raumleiste einklappen (Taste R)'}
        title={isCollapsed ? 'Campus Räume Leiste einblenden (Taste R)' : 'Fokus-Wochenplan aktivieren & Raumleiste einklappen (Taste R)'}
        style={{
          border: isCollapsed ? '1.5px solid rgba(52, 168, 83, 0.28)' : '1px solid #e5e5ea',
          background: '#ffffff',
          cursor: 'pointer',
          padding: isCollapsed ? '0 12px' : '0 11px',
          borderRadius: '11px',
          color: isCollapsed ? '#0f172a' : '#475569',
          fontSize: '0.73rem',
          fontWeight: isCollapsed ? 850 : 750,
          height: '36px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          whiteSpace: 'nowrap',
          boxShadow: isCollapsed ? '0 2px 8px rgba(52, 168, 83, 0.08)' : 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f8fafc';
          e.currentTarget.style.borderColor = isCollapsed ? brandColor : '#cbd5e1';
          e.currentTarget.style.color = '#0f172a';
          if (isCollapsed) e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#ffffff';
          e.currentTarget.style.borderColor = isCollapsed ? 'rgba(52, 168, 83, 0.28)' : '#e5e5ea';
          e.currentTarget.style.color = isCollapsed ? '#0f172a' : '#475569';
          if (isCollapsed) e.currentTarget.style.transform = 'translateY(0)';
        }}
        onFocus={(e) => {
          e.currentTarget.style.outline = `2px solid ${brandColor}`;
          e.currentTarget.style.outlineOffset = '2px';
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = 'none';
        }}
      >
        {isCollapsed ? (
          <>
            <Box size={14} strokeWidth={2.5} color={brandColor} />
            <span>Räume</span>
            <span style={{ fontSize: '0.66rem', background: '#dcfce7', color: '#15803d', border: 'none', padding: '1px 6px', borderRadius: '100px', fontWeight: 850 }}>
              {roomCount}
            </span>
            <ChevronDown size={13} strokeWidth={2.4} color="#64748b" />
          </>
        ) : (
          <>
            <ChevronUp size={14} strokeWidth={2.2} color="#64748b" />
            <span>Fokus</span>
            <span style={{ fontSize: '0.62rem', background: '#f1f5f9', color: '#64748b', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>R</span>
          </>
        )}
      </button>
    </div>
  );
};

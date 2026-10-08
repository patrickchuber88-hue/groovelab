import React from 'react';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';

export interface RoomSidebarToggleBtnProps {
  isOpen: boolean;
  onToggle: () => void;
  brandColor?: string;
  variant?: 'header' | 'sidebar-close';
}

export const RoomSidebarToggleBtn: React.FC<RoomSidebarToggleBtnProps> = ({
  isOpen,
  onToggle,
  brandColor = '#34a853',
  variant = 'header'
}) => {
  if (variant === 'sidebar-close') {
    return (
      <button
        type="button"
        onClick={onToggle}
        title="Sidebar einklappen (Taste B)"
        aria-label="Sidebar einklappen"
        style={{
          background: 'transparent',
          border: 'none',
          color: '#8e8e93',
          cursor: 'pointer',
          padding: '6px',
          borderRadius: '10px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#1c1c1e';
          e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#8e8e93';
          e.currentTarget.style.background = 'transparent';
        }}
        onFocus={(e) => {
          e.currentTarget.style.outline = `2px solid ${brandColor}`;
          e.currentTarget.style.outlineOffset = '2px';
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = 'none';
        }}
      >
        <PanelRightClose size={15} strokeWidth={2.2} />
      </button>
    );
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      {/* 0,1% Goldstandard Divider: Visual Decoupling of Calendar Date Controls from Board-Level Layout Action */}
      <div
        aria-hidden="true"
        style={{
          width: '1px',
          height: '20px',
          background: '#e5e5ea',
          margin: '0 2px'
        }}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Buchungs-Sidebar verbergen (Taste B)' : 'Buchungs-Sidebar einblenden (Taste B)'}
        title={isOpen ? 'Buchungs-Sidebar verbergen (Taste B)' : 'Buchungs-Sidebar einblenden (Taste B)'}
        style={{
          border: isOpen ? '1px solid #e5e5ea' : 'none',
          background: isOpen ? '#ffffff' : brandColor,
          cursor: 'pointer',
          padding: isOpen ? '0 12px' : '0 14px',
          borderRadius: '11px',
          color: isOpen ? '#475569' : '#ffffff',
          fontSize: isOpen ? '0.72rem' : '0.74rem',
          fontWeight: isOpen ? 750 : 850,
          height: '36px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          whiteSpace: 'nowrap',
          boxShadow: isOpen ? 'none' : '0 2px 10px rgba(52, 168, 83, 0.32)'
        }}
        onMouseEnter={(e) => {
          if (isOpen) {
            e.currentTarget.style.background = '#f8fafc';
            e.currentTarget.style.borderColor = '#cbd5e1';
            e.currentTarget.style.color = '#1e293b';
          } else {
            e.currentTarget.style.background = '#2d9247';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(52, 168, 83, 0.40)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={(e) => {
          if (isOpen) {
            e.currentTarget.style.background = '#ffffff';
            e.currentTarget.style.borderColor = '#e5e5ea';
            e.currentTarget.style.color = '#475569';
          } else {
            e.currentTarget.style.background = brandColor;
            e.currentTarget.style.boxShadow = '0 2px 10px rgba(52, 168, 83, 0.32)';
            e.currentTarget.style.transform = 'translateY(0)';
          }
        }}
        onFocus={(e) => {
          e.currentTarget.style.outline = `2px solid ${brandColor}`;
          e.currentTarget.style.outlineOffset = '2px';
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = 'none';
        }}
      >
        {isOpen ? (
          <>
            <PanelRightClose size={14} strokeWidth={2.2} color="#64748b" />
            <span>Sidebar</span>
          </>
        ) : (
          <>
            <PanelRightOpen size={15} strokeWidth={2.4} color="#ffffff" />
            <span>Sidebar einblenden</span>
          </>
        )}
      </button>
    </div>
  );
};

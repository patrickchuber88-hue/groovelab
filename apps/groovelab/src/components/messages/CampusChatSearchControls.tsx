import React from 'react';
import { Search } from 'lucide-react';

export interface CampusChatSearchToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  isMobile?: boolean;
}

export const CampusChatSearchToggle: React.FC<CampusChatSearchToggleProps> = ({
  isOpen,
  onToggle,
  isMobile
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={isOpen ? 'Suche schließen' : 'Nachrichten im Verlauf durchsuchen'}
      aria-label="Nachrichten im Chat suchen"
      style={{
        width: isMobile ? '32px' : 'auto',
        height: isMobile ? '32px' : 'auto',
        padding: isMobile ? '0' : '5px 10px',
        borderRadius: isMobile ? '50%' : '8px',
        background: isOpen ? '#ffffff' : 'rgba(255, 255, 255, 0.18)',
        color: isOpen ? '#15803d' : '#ffffff',
        border: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5px',
        cursor: 'pointer',
        fontSize: '0.72rem',
        fontWeight: 750,
        transition: 'all 0.15s ease'
      }}
      className="hover-scale"
    >
      <Search size={14} color={isOpen ? '#15803d' : '#ffffff'} />
      {!isMobile && <span>Suchen</span>}
    </button>
  );
};

export interface CampusChatSearchInputBarProps {
  query: string;
  onChange: (val: string) => void;
  onClear: () => void;
}

export const CampusChatSearchInputBar: React.FC<CampusChatSearchInputBarProps> = ({
  query,
  onChange,
  onClear
}) => {
  return (
    <div
      style={{
        padding: '8px 16px',
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        zIndex: 40
      }}
    >
      <Search size={14} color="#64748b" style={{ flexShrink: 0 }} />
      <input
        type="text"
        placeholder="Im Chat-Verlauf suchen..."
        value={query}
        onChange={e => onChange(e.target.value)}
        autoFocus
        style={{
          flex: 1,
          border: 'none',
          background: 'transparent',
          fontSize: '0.82rem',
          outline: 'none',
          color: '#0f172a',
          fontWeight: 500
        }}
      />
      {query && (
        <button
          type="button"
          onClick={onClear}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '0.74rem',
            fontWeight: 700,
            padding: '2px 6px'
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
};

export interface CampusChatLoadOlderButtonProps {
  totalMessages: number;
  currentLimit: number;
  onLoadMore: () => void;
}

export const CampusChatLoadOlderButton: React.FC<CampusChatLoadOlderButtonProps> = ({
  totalMessages,
  currentLimit,
  onLoadMore
}) => {
  const remaining = Math.max(0, totalMessages - currentLimit);
  if (remaining === 0) return null;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0 12px 0', width: '100%' }}>
      <button
        type="button"
        onClick={onLoadMore}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 14px',
          borderRadius: '100px',
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          color: '#475569',
          fontSize: '0.72rem',
          fontWeight: 750,
          cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          transition: 'background 0.15s ease'
        }}
      >
        <span>⬆️ Ältere Nachrichten laden ({remaining} ältere)</span>
      </button>
    </div>
  );
};

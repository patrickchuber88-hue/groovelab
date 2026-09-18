import React, { useState } from 'react';

export interface AdminBatchiPadModalProps {
  showBatchiPadModal: { roomId: string } | null;
  onClose: () => void;
  onExecuteBatch: (roomId: string, count: number) => Promise<void> | void;
}

export const AdminBatchiPadModal: React.FC<AdminBatchiPadModalProps> = ({
  showBatchiPadModal,
  onClose,
  onExecuteBatch
}) => {
  const [batchCount, setBatchCount] = useState('5');

  if (!showBatchiPadModal) return null;

  const handleConfirm = () => {
    const count = parseInt(batchCount, 10);
    if (!isNaN(count) && count > 0) {
      onExecuteBatch(showBatchiPadModal.roomId, count);
    }
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-ipad-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ 
        position: 'fixed', 
        inset: 0, 
        zIndex: 9999, 
        background: 'rgba(0,0,0,0.3)', 
        backdropFilter: 'blur(15px)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        animation: 'fadeIn 0.25s ease-out'
      }}
    >
      <div 
        className="glass-panel"
        style={{ 
          background: 'rgba(255, 255, 255, 0.88)', 
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          borderRadius: '16px', 
          width: '290px', 
          boxShadow: '0 10px 30px rgba(0,0,0,0.12), 0 1px 8px rgba(0,0,0,0.05)',
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          textAlign: 'center',
          overflow: 'hidden',
          paddingTop: '20px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          animation: 'scaleIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        <div style={{ padding: '0 16px 18px 16px', width: '100%' }}>
          <h3 id="batch-ipad-modal-title" style={{ fontSize: '1.05rem', fontWeight: 600, color: '#000000', margin: '0 0 4px 0', letterSpacing: '-0.01em' }}>iPads hinzufügen</h3>
          <p style={{ fontSize: '0.82rem', color: '#3a3a3c', margin: '0 0 16px 0', lineHeight: '1.35', fontWeight: 400 }}>
            Wie viele iPads sollen der Reihe nach angelegt werden?
          </p>
          <input 
            type="number"
            aria-label="Anzahl der hinzuzufügenden iPads"
            min="1"
            max="50"
            value={batchCount}
            onChange={e => setBatchCount(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px',
              border: '1px solid rgba(0, 0, 0, 0.15)',
              background: 'rgba(255, 255, 255, 0.65)',
              borderRadius: '8px',
              textAlign: 'center',
              fontSize: '1.05rem',
              fontWeight: 700,
              color: '#000000',
              outline: 'none',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)'
            }}
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') handleConfirm();
            }}
          />
        </div>
        <div style={{ display: 'flex', width: '100%', borderTop: '0.5px solid rgba(0, 0, 0, 0.15)' }}>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ 
              flex: 1, 
              height: '44px', 
              background: 'transparent', 
              border: 'none', 
              borderRight: '0.5px solid rgba(0, 0, 0, 0.15)', 
              color: '#007aff', 
              fontSize: '1.05rem', 
              fontWeight: 400, 
              cursor: 'pointer', 
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.1s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Abbrechen
          </button>
          <button 
            type="button" 
            onClick={handleConfirm} 
            style={{ 
              flex: 1, 
              height: '44px', 
              background: 'transparent', 
              border: 'none', 
              color: '#007aff', 
              fontSize: '1.05rem', 
              fontWeight: 600, 
              cursor: 'pointer', 
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.1s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

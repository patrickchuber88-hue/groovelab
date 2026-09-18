import React, { memo } from 'react';
import { DoorOpen } from 'lucide-react';

export interface SecretaryRealtimeBookingToastProps {
  toast: {
    visible: boolean;
    message: string;
  };
  onClose: () => void;
}

/**
 * Slide-in push notification toast displayed when a new pending room booking is received via Supabase Realtime.
 */
export const SecretaryRealtimeBookingToast: React.FC<SecretaryRealtimeBookingToastProps> = memo(({
  toast,
  onClose
}) => {
  if (!toast.visible) return null;

  return (
    <div 
      role="status"
      aria-live="polite"
      className="slide-in-toast"
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 99999,
        background: '#ffffff',
        border: '1px solid #fed7aa',
        borderRadius: '16px',
        padding: '16px 20px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '380px'
      }}
    >
      <div style={{ background: '#fff7ed', color: '#ea580c', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <DoorOpen size={18} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b' }}>
          Neue Raumbuchung erhalten
        </span>
        <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
          {toast.message}
        </span>
      </div>
      <button
        type="button"
        aria-label="Benachrichtigung schließen"
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          fontSize: '1.1rem',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        ✕
      </button>
    </div>
  );
});

SecretaryRealtimeBookingToast.displayName = 'SecretaryRealtimeBookingToast';

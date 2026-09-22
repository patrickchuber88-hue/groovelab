import React, { useEffect, useState } from 'react';
import { RefreshCw, Check } from 'lucide-react';
import { subscribeOfflineState, flushAllOfflineData, OfflineQueueState } from '../../services/offlineSyncService';

interface OfflineStatusBadgeProps {
  floating?: boolean;
  variant?: 'floating' | 'header';
}

export const OfflineStatusBadge: React.FC<OfflineStatusBadgeProps> = () => {
  const [offlineState, setOfflineState] = useState<OfflineQueueState>({
    pendingActionsCount: 0,
    pendingAudioCount: 0,
    totalPending: 0,
    isSyncing: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastSyncTime: null
  });

  const [recentlySynced, setRecentlySynced] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeOfflineState((newState) => {
      setOfflineState((prev) => {
        // If we were syncing and now not syncing, show short success confirmation (1.8s)
        if (prev.isSyncing && !newState.isSyncing) {
          setRecentlySynced(true);
          setTimeout(() => setRecentlySynced(false), 1800);
        }
        return newState;
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 1% Goldstandard Visibility Axiom: ONLY render if syncing, offline, or recently completed
  const shouldShow = !offlineState.isOnline || offlineState.isSyncing || recentlySynced;

  if (!shouldShow) {
    return null;
  }

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 'calc(var(--bottom-bar-height, 0px) + env(safe-area-inset-bottom) + 24px)',
    right: '24px',
    zIndex: 9999,
    pointerEvents: offlineState.isSyncing || recentlySynced ? 'none' : 'auto',
    animation: 'slideUpBadge 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
  };

  const handleManualSync = () => {
    if (offlineState.isOnline && !offlineState.isSyncing) {
      flushAllOfflineData();
    }
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes slideUpBadge {
          0% { transform: translateY(12px) scale(0.96); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes badgeSpin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div 
        role="status"
        aria-live="polite"
        onClick={handleManualSync}
        style={{
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          color: recentlySynced ? '#15803d' : offlineState.isSyncing ? '#0369a1' : '#334155',
          borderRadius: '20px',
          padding: '7px 14px',
          border: recentlySynced ? '1px solid #bbf7d0' : offlineState.isSyncing ? '1px solid #bae6fd' : '1px solid #e2e8f0',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.74rem',
          fontWeight: 750,
          userSelect: 'none',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif"
        }}
      >
        {!offlineState.isOnline ? (
          <>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', flexShrink: 0 }} />
            <span>Offline-Tresor aktiv</span>
          </>
        ) : offlineState.isSyncing ? (
          <>
            <RefreshCw 
              size={13} 
              color="#0284c7" 
              style={{ flexShrink: 0, animation: 'badgeSpin 0.9s linear infinite' }} 
            />
            <span>Synchronisiere...</span>
          </>
        ) : recentlySynced ? (
          <>
            <Check size={14} color="#16a34a" style={{ flexShrink: 0 }} />
            <span>Synchronisiert</span>
          </>
        ) : null}
      </div>
    </div>
  );
};

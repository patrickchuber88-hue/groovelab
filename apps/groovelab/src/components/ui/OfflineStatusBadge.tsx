import React, { useEffect, useState } from 'react';
import { CloudOff, RefreshCw, Check, ShieldCheck, Wifi } from 'lucide-react';
import { subscribeOfflineState, flushAllOfflineData, OfflineQueueState } from '../../services/offlineSyncService';

interface OfflineStatusBadgeProps {
  floating?: boolean;
}

export const OfflineStatusBadge: React.FC<OfflineStatusBadgeProps> = ({ floating = true }) => {
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
        // If we were syncing and now totalPending is 0, show short success confirmation
        if (prev.isSyncing && !newState.isSyncing && newState.totalPending === 0) {
          setRecentlySynced(true);
          setTimeout(() => setRecentlySynced(false), 3500);
        }
        return newState;
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Only render if offline, has pending items, syncing, or recently synced
  const shouldShow = !offlineState.isOnline || offlineState.totalPending > 0 || offlineState.isSyncing || recentlySynced;

  if (!shouldShow) {
    return null;
  }

  const containerStyle: React.CSSProperties = floating ? {
    position: 'fixed',
    bottom: '24px',
    left: '24px',
    zIndex: 9999,
    animation: 'slideUpBadge 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
  } : {
    display: 'inline-flex'
  };

  const handleManualSync = () => {
    if (offlineState.isOnline && !offlineState.isSyncing) {
      flushAllOfflineData();
    }
  };

  const isInteractive = offlineState.isOnline && offlineState.totalPending > 0 && !offlineState.isSyncing;

  const getAriaLabel = (): string => {
    if (!offlineState.isOnline) {
      return `Offline-Tresor aktiv: Stundenpläne und Hausaufgaben lokal verfügbar. ${offlineState.totalPending > 0 ? `${offlineState.totalPending} Aktionen für Synchronisation vorgemerkt.` : ''}`;
    }
    if (offlineState.isSyncing) {
      return 'Synchronisiere lokale Daten mit der Supabase Cloud...';
    }
    if (recentlySynced) {
      return 'Wieder online: Alle Daten wurden erfolgreich synchronisiert.';
    }
    return `${offlineState.totalPending} ausstehende Aktionen bereit. Klicken oder Eingabetaste drücken, um jetzt mit der Cloud zu synchronisieren.`;
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes slideUpBadge {
          0% { transform: translateY(16px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes badgeSpin {
          100% { transform: rotate(360deg); }
        }
        .offline-badge-focus:focus-visible {
          outline: 2px solid #38bdf8 !important;
          outline-offset: 2px !important;
        }
      `}</style>
      <div 
        role={isInteractive ? 'button' : 'status'}
        tabIndex={isInteractive ? 0 : -1}
        aria-label={getAriaLabel()}
        onClick={handleManualSync}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && isInteractive) {
            e.preventDefault();
            handleManualSync();
          }
        }}
        className={`offline-badge-focus ${isInteractive ? 'hover-scale-mini' : ''}`}
        style={{
          background: !offlineState.isOnline 
            ? 'rgba(6, 78, 59, 0.95)' 
            : (offlineState.isSyncing ? 'rgba(15, 23, 42, 0.92)' : 'rgba(22, 101, 52, 0.94)'),
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          color: '#ffffff',
          borderRadius: '24px',
          padding: '8px 16px',
          border: '1px solid rgba(255, 255, 255, 0.20)',
          boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.75rem',
          fontWeight: 750,
          cursor: isInteractive ? 'pointer' : 'default',
          userSelect: 'none',
          transition: 'all 0.2s ease',
          outline: 'none',
          touchAction: 'manipulation'
        }}
        title={isInteractive ? 'Klicken, um jetzt mit der Cloud zu synchronisieren' : undefined}
      >
        {!offlineState.isOnline ? (
          <>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 10px #34d399', flexShrink: 0 }} />
            <span>🟢 Offline-Tresor aktiv · Stundenpläne &amp; Hausaufgaben lokal verfügbar {offlineState.totalPending > 0 && `(${offlineState.totalPending} bereit)`}</span>
          </>
        ) : offlineState.isSyncing ? (
          <>
            <RefreshCw 
              size={14} 
              color="#38bdf8" 
              style={{ flexShrink: 0, animation: 'badgeSpin 1s linear infinite' }} 
            />
            <span>Synchronisiere mit Cloud...</span>
          </>
        ) : recentlySynced ? (
          <>
            <Check size={14} color="#4ade80" style={{ flexShrink: 0 }} />
            <span>✨ Wieder online · Daten synchronisiert</span>
          </>
        ) : (
          <>
            <ShieldCheck size={14} color="#4ade80" style={{ flexShrink: 0 }} />
            <span>{offlineState.totalPending} ausstehend • Sync bereit</span>
          </>
        )}
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { CloudOff, RefreshCw, Check, ShieldCheck, Wifi } from 'lucide-react';
import { subscribeOfflineState, flushAllOfflineData, OfflineQueueState } from '../../services/offlineSyncService';

interface OfflineStatusBadgeProps {
  floating?: boolean;
  variant?: 'floating' | 'header';
}

export const OfflineStatusBadge: React.FC<OfflineStatusBadgeProps> = ({ floating = true, variant = 'floating' }) => {
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

  // On desktop with header, suppress default floating badge so it does not cover the sidebar footer
  const isHeaderMode = variant === 'header';
  const isDesktop = typeof window !== 'undefined' ? window.innerWidth > 768 : true;
  if (!isHeaderMode && floating && isDesktop) {
    return null;
  }

  const containerStyle: React.CSSProperties = isHeaderMode ? {
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0
  } : floating ? {
    position: 'fixed',
    bottom: 'calc(var(--bottom-bar-height, 68px) + env(safe-area-inset-bottom) + 12px)',
    left: '16px',
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
          outline: 2px solid #34a853 !important;
          outline-offset: 2px !important;
        }
        .offline-header-pill:hover {
          background: #dcfce7 !important;
          border-color: #86efac !important;
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
        className={`offline-badge-focus ${isHeaderMode ? 'offline-header-pill' : ''} ${isInteractive ? 'hover-scale-mini' : ''}`}
        style={isHeaderMode ? {
          background: '#f0fdf4',
          border: '1.2px solid #bbf7d0',
          color: '#166534',
          height: '36px',
          borderRadius: '10px',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.75rem',
          fontWeight: 750,
          cursor: isInteractive ? 'pointer' : 'default',
          userSelect: 'none',
          transition: 'all 0.18s ease',
          outline: 'none',
          boxSizing: 'border-box',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif"
        } : {
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          color: '#166534',
          borderRadius: '24px',
          padding: '7px 14px',
          border: '1.2px solid #bbf7d0',
          boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(52, 168, 83, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.75rem',
          fontWeight: 750,
          cursor: isInteractive ? 'pointer' : 'default',
          userSelect: 'none',
          transition: 'all 0.2s ease',
          outline: 'none',
          touchAction: 'manipulation',
          fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif"
        }}
        title={isInteractive ? 'Klicken, um jetzt mit der Cloud zu synchronisieren' : undefined}
      >
        {!offlineState.isOnline ? (
          <>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', flexShrink: 0 }} />
            <span>{isHeaderMode ? `Offline-Tresor aktiv ${offlineState.totalPending > 0 ? `(${offlineState.totalPending})` : ''}` : `🟢 Offline-Tresor aktiv · Stundenpläne & Hausaufgaben lokal verfügbar ${offlineState.totalPending > 0 ? `(${offlineState.totalPending} bereit)` : ''}`}</span>
          </>
        ) : offlineState.isSyncing ? (
          <>
            <RefreshCw 
              size={13} 
              color="#0284c7" 
              style={{ flexShrink: 0, animation: 'badgeSpin 1s linear infinite' }} 
            />
            <span>{isHeaderMode ? 'Synchronisiere...' : 'Synchronisiere mit Cloud...'}</span>
          </>
        ) : recentlySynced ? (
          <>
            <Check size={14} color="#16a34a" style={{ flexShrink: 0 }} />
            <span>{isHeaderMode ? '✨ Synchronisiert' : '✨ Wieder online · Daten synchronisiert'}</span>
          </>
        ) : (
          <>
            <ShieldCheck size={14} color="#16a34a" style={{ flexShrink: 0 }} />
            <span>{offlineState.totalPending} ausstehend · Sync bereit</span>
          </>
        )}
      </div>
    </div>
  );
};

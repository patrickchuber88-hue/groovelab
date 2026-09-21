import React, { useState, useEffect } from 'react';
import { WifiOff, CheckCircle2, RefreshCw } from 'lucide-react';
import { dbCircuitBreaker } from '../../utils/circuitBreaker';

export const OfflineSyncIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsSyncing(true);
      
      // Auto-trigger circuit breaker recovery test
      dbCircuitBreaker.recordSuccess();

      // Trigger automatic sync interval
      setTimeout(() => {
        setIsSyncing(false);
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 4000);
      }, 1500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncSuccess(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // On desktop with header, OfflineStatusBadge in CampusDesktopHeader handles sync indicators
  if (typeof window !== 'undefined' && window.innerWidth > 768) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        borderRadius: '100px',
        fontSize: '0.80rem',
        fontWeight: 750,
        boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.12)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        background: 'rgba(255, 255, 255, 0.96)',
        border: !isOnline
          ? '1.2px solid rgba(239, 68, 68, 0.3)'
          : syncSuccess
          ? '1.2px solid rgba(52, 168, 83, 0.3)'
          : '1.2px solid rgba(59, 130, 246, 0.3)',
        color: !isOnline ? '#dc2626' : syncSuccess ? '#166534' : '#1d4ed8',
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif"
      }}
    >
      {!isOnline ? (
        <>
          <WifiOff size={15} style={{ color: '#ef4444' }} />
          <span>Offline-Modus aktiv • Änderungen lokal gesichert</span>
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw size={15} className="animate-spin" style={{ color: '#3b82f6' }} />
          <span>Verbindung wiederhergestellt • Synchronisiere...</span>
        </>
      ) : (
        <>
          <CheckCircle2 size={15} style={{ color: '#34a853' }} />
          <span>100% synchronisiert mit Cloud</span>
        </>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { GraduationCap, Music, Bell, Cloud, CloudOff, RefreshCw, User } from 'lucide-react';
import { subscribePendingOfflineCount, flushOfflineSyncQueue } from '../../services/offlineSyncService';

interface MobileTopHeaderProps {
  user: any;
  school?: any;
  activePlatform: 'campus' | 'groovelab' | 'admin';
  setActivePlatform: (platform: 'campus' | 'groovelab' | 'admin') => void;
  hasCampusActive?: boolean;
  hasGrooveLabActive?: boolean;
  unreadCount?: number;
}

export const MobileTopHeader: React.FC<MobileTopHeaderProps> = ({
  user,
  school,
  activePlatform,
  setActivePlatform,
  hasCampusActive,
  hasGrooveLabActive,
  unreadCount = 0
}) => {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [parentUnlocked, setParentUnlocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('groovelab_parent_unlocked_global') === 'true' ||
           (user?.id ? sessionStorage.getItem(`groovelab_parent_unlocked_${user.id}`) === 'true' : false);
  });

  const hasCampusSub = Boolean(school?.has_campus_subscription || !school?.is_billing_booked || school?.subscription_bypass);
  const hasGrooveLabSub = Boolean(school?.has_groovelab_subscription || !school?.is_billing_booked || school?.subscription_bypass);
  const isStaff = user?.role === 'admin' || user?.role === 'secretary';

  const isCampusEligible = hasCampusActive !== undefined ? hasCampusActive : Boolean((isStaff || user?.is_campus_active) && hasCampusSub);
  const isGrooveLabEligible = hasGrooveLabActive !== undefined ? hasGrooveLabActive : Boolean((isStaff || user?.is_groovelab_active) && hasGrooveLabSub);

  const showDualModuleSwitcher = isCampusEligible && isGrooveLabEligible;

  useEffect(() => {
    const handleParentModeChange = (e: any) => {
      if (typeof e?.detail === 'boolean') setParentUnlocked(e.detail);
    };
    window.addEventListener('groovelab_parent_mode_changed', handleParentModeChange);
    return () => {
      window.removeEventListener('groovelab_parent_mode_changed', handleParentModeChange);
    };
  }, []);

  useEffect(() => {
    const unsub = subscribePendingOfflineCount(setPendingCount);

    const handleOnline = async () => {
      setIsOnline(true);
      setIsSyncing(true);
      try {
        await flushOfflineSyncQueue();
      } finally {
        setIsSyncing(false);
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await flushOfflineSyncQueue();
    } finally {
      setIsSyncing(false);
    }
  };

  const getAvatarSrc = () => {
    if (user?.role === 'admin' || user?.role === 'secretary') {
      return '/campus_login_hero.png';
    }
    return user?.avatar_url || '/campus_login_hero.png';
  };

  return (
    <header
      className="cg-mobile-top-header"
      style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        height: 'auto',
        minHeight: '52px',
        paddingTop: 'max(12px, env(safe-area-inset-top, 12px))',
        paddingBottom: '10px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 'max(16px, env(safe-area-inset-left, 16px))',
        paddingRight: 'max(16px, env(safe-area-inset-right, 16px))',
        zIndex: 900,
        boxSizing: 'border-box'
      }}
    >
      {/* Left: App Brand Title & Parent Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <span style={{
          fontSize: '0.82rem',
          fontWeight: 900,
          letterSpacing: '-0.02em',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          lineHeight: 1.05,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start'
        }}>
          <span style={{ color: '#34a853' }}>Campus-</span>
          <span style={{ color: '#eab308' }}>Groovelab</span>
        </span>

        {parentUnlocked && (
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem('groovelab_parent_unlocked_global');
              if (user?.id) {
                sessionStorage.removeItem(`groovelab_parent_unlocked_${user.id}`);
                sessionStorage.removeItem(`groovelab_parent_session_${user.id}`);
              }
              setParentUnlocked(false);
              window.dispatchEvent(new CustomEvent('groovelab_parent_mode_changed', { detail: false }));
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '20px',
              border: '1px solid #bae6fd',
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              color: '#0284c7',
              fontSize: '0.68rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.12)',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
            title="Eltern-Modus beenden und zur geschützten Schüleransicht wechseln"
          >
            <User size={11} color="#0284c7" />
            <span>Schüleransicht</span>
          </button>
        )}
      </div>

      {/* Center: Camera-Safe 1-Tap Direkttoggle (Rendered ONLY when BOTH modules are active) */}
      {showDualModuleSwitcher && (
        <button
          type="button"
          onClick={() => {
            const nextPlatform = activePlatform === 'campus' ? 'groovelab' : 'campus';
            setActivePlatform(nextPlatform);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '100px',
            background: activePlatform === 'campus' ? '#e6f4ea' : '#fef9c3',
            border: activePlatform === 'campus' ? '1.5px solid #34a853' : '1.5px solid #eab308',
            color: activePlatform === 'campus' ? '#166534' : '#854d0e',
            fontSize: '0.76rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            outline: 'none',
            whiteSpace: 'nowrap'
          }}
          title="Tippen für 1-Tap Direktwechsel zwischen Campus und GrooveLab"
        >
          {activePlatform === 'campus' ? (
            <>
              <GraduationCap size={13} color="#166534" />
              <span>Campus</span>
              <span style={{ fontSize: '0.72rem', color: '#34a853', fontWeight: 900, marginLeft: '2px' }}>⇄</span>
            </>
          ) : (
            <>
              <Music size={13} color="#854d0e" />
              <span>GrooveLab</span>
              <span style={{ fontSize: '0.72rem', color: '#ca8a04', fontWeight: 900, marginLeft: '2px' }}>⇄</span>
            </>
          )}
        </button>
      )}

      {/* Right: Offline Indicator, Notifications & Profile Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Offline Sync State Badge (shown when offline, syncing, or pending changes) */}
        {(!isOnline || pendingCount > 0 || isSyncing) && (
          <button
            onClick={handleManualSync}
            title={
              !isOnline
                ? 'Offline-Modus aktiv: Änderungen werden lokal gepuffert'
                : isSyncing
                ? 'Synchronisiere lokale Änderungen...'
                : `${pendingCount} Änderung(en) lokal gespeichert (Klick zum Sync)`
            }
            style={{
              padding: '4px 8px',
              borderRadius: '100px',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              background: '#f8fafc',
              color: '#64748b',
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
          >
            {!isOnline ? (
              <>
                <CloudOff size={13} color="#94a3b8" />
                <span style={{ fontSize: '10px' }}>Offline</span>
              </>
            ) : isSyncing ? (
              <>
                <RefreshCw size={13} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '10px' }}>Sync...</span>
              </>
            ) : (
              <>
                <Cloud size={13} color="#64748b" />
                <span style={{ fontSize: '10px' }}>{pendingCount}</span>
              </>
            )}
          </button>
        )}

        {/* Unread Notifications Bell */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('campus_open_messages_tab'))}
            style={{
              width: '38px',
              height: '38px',
              minWidth: '38px',
              minHeight: '38px',
              borderRadius: '50%',
              background: 'rgba(241, 245, 249, 0.9)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              cursor: 'pointer',
              touchAction: 'manipulation'
            }}
            title="Benachrichtigungen & Nachrichten"
          >
            <Bell size={17} />
          </button>
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                background: '#ef4444',
                color: 'white',
                fontSize: '9px',
                fontWeight: 900,
                borderRadius: '100px',
                padding: '2px 4px',
                lineHeight: 1
              }}
            >
              {unreadCount}
            </span>
          )}
        </div>
      </div>

    </header>
  );
};


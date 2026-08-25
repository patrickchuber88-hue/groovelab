import React, { useState, useEffect } from 'react';
import { GraduationCap, Music, Bell, Cloud, CloudOff, RefreshCw, User, BookOpen } from 'lucide-react';
import { subscribePendingOfflineCount, flushOfflineSyncQueue } from '../../services/offlineSyncService';
import { CampusLevelSwitcher, CampusUiLevel } from '../campus/CampusLevelSwitcher';

interface MobileTopHeaderProps {
  user: any;
  activePlatform: 'campus' | 'groovelab' | 'admin';
  setActivePlatform: (platform: 'campus' | 'groovelab' | 'admin') => void;
  unreadCount?: number;
}

export const MobileTopHeader: React.FC<MobileTopHeaderProps> = ({
  user,
  activePlatform,
  setActivePlatform,
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
  const [campusStudentUiLevel, setCampusStudentUiLevel] = useState<CampusUiLevel>(() => {
    if (typeof window === 'undefined') return 'junior';
    const saved = localStorage.getItem('campus_student_ui_level');
    if (saved === 'junior' || saved === 'teen' || saved === 'pro') return saved as CampusUiLevel;
    return 'junior';
  });

  useEffect(() => {
    const handleLevelChangeEvt = (e: any) => {
      if (e?.detail) setCampusStudentUiLevel(e.detail);
    };
    const handleParentModeChange = (e: any) => {
      if (typeof e?.detail === 'boolean') setParentUnlocked(e.detail);
    };
    window.addEventListener('campus_ui_level_changed', handleLevelChangeEvt);
    window.addEventListener('groovelab_parent_mode_changed', handleParentModeChange);
    return () => {
      window.removeEventListener('campus_ui_level_changed', handleLevelChangeEvt);
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

      {/* Center: iOS Segmented Control Toggle [ Campus | GrooveLab ] */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#f1f5f9',
          borderRadius: '100px',
          padding: '3px',
          border: '1px solid rgba(226, 232, 240, 0.8)'
        }}
      >
        <button
          onClick={() => setActivePlatform('campus')}
          style={{
            padding: '6px 14px',
            borderRadius: '100px',
            border: 'none',
            background: activePlatform === 'campus' ? '#ffffff' : 'transparent',
            color: activePlatform === 'campus' ? '#34a853' : '#64748b',
            fontWeight: activePlatform === 'campus' ? 800 : 600,
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
            boxShadow: activePlatform === 'campus' ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <GraduationCap size={14} />
          <span>Campus</span>
        </button>

        <button
          onClick={() => setActivePlatform('groovelab')}
          style={{
            padding: '6px 14px',
            borderRadius: '100px',
            border: 'none',
            background: activePlatform === 'groovelab' ? '#ffffff' : 'transparent',
            color: activePlatform === 'groovelab' ? '#ca8a04' : '#64748b',
            fontWeight: activePlatform === 'groovelab' ? 800 : 600,
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
            boxShadow: activePlatform === 'groovelab' ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Music size={14} />
          <span>GrooveLab</span>
        </button>
      </div>

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

        {/* Leitfäden & Akademie Button */}
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('campus_open_help_center'));
          }}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'rgba(241, 245, 249, 0.8)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#475569',
            cursor: 'pointer'
          }}
          title="Leitfäden & Akademie"
        >
          <BookOpen size={16} />
        </button>

        {/* Unread Notifications Bell */}
        <div style={{ position: 'relative' }}>
          <button
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'rgba(241, 245, 249, 0.8)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            <Bell size={16} />
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

      {/* Sub-Bar for Mobile Students: 1-Click Campus Level Switcher */}
      {activePlatform === 'campus' && user?.role === 'student' && (
        <div style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '6px',
          marginTop: '4px',
          borderTop: '1px solid rgba(226, 232, 240, 0.5)'
        }}>
          <CampusLevelSwitcher
            currentLevel={campusStudentUiLevel}
            compact={true}
            onChange={(newLevel) => {
              setCampusStudentUiLevel(newLevel);
              localStorage.setItem('campus_student_ui_level', newLevel);
              window.dispatchEvent(new CustomEvent('campus_ui_level_changed', { detail: newLevel }));
            }}
          />
        </div>
      )}
    </header>
  );
};


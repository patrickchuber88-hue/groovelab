import React from 'react';
import { Calendar, Sparkles } from 'lucide-react';

export interface StudentBriefingMobileBottomBarProps {
  appointmentAlertsCount?: number;
  feedAlertsCount?: number;
  hasSidebarAppointmentAlerts?: boolean;
  onOpenAppointments: () => void;
  onOpenNews: () => void;
  // Abwärtskompatibilität
  sidebarTotalAlertsCount?: number;
  onOpenSidebar?: () => void;
  isOpen?: boolean;
  activeTab?: 'appointments' | 'news';
}

/**
 * 🏛️ 0,1% Enterprise Goldstandard: StudentBriefingMobileBottomBar
 * 
 * Symmetrisches 2-Button Bottom Dock für das Schüler-Briefing Board.
 * Vollständige Design-Parität zu MeisterwerkMobileBottomBar & CampusEventsMobileBottomBar.
 * Bietet in der Daumenzone 2 autonome Schnellzugriffe mit getrennten Dringlichkeits-Badges:
 * 1. Termine (Unterrichtstermine, Verschiebungen, Ausfälle)
 * 2. News (Campus-Mitteilungen & Klassen-Feed)
 */
export const StudentBriefingMobileBottomBar: React.FC<StudentBriefingMobileBottomBarProps> = ({
  appointmentAlertsCount = 0,
  feedAlertsCount = 0,
  hasSidebarAppointmentAlerts = false,
  onOpenAppointments,
  onOpenNews,
  sidebarTotalAlertsCount,
  onOpenSidebar,
  isOpen = false,
  activeTab = 'appointments'
}) => {
  const triggerHaptic = () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch {}
  };

  const handleTapAppointments = () => {
    triggerHaptic();
    if (onOpenAppointments) {
      onOpenAppointments();
    } else if (onOpenSidebar) {
      onOpenSidebar();
    }
  };

  const handleTapNews = () => {
    triggerHaptic();
    if (onOpenNews) {
      onOpenNews();
    } else if (onOpenSidebar) {
      onOpenSidebar();
    }
  };

  // Fallback falls nur der alte Summen-Badge übergeben wurde
  const effAppointmentCount = appointmentAlertsCount || (hasSidebarAppointmentAlerts ? (sidebarTotalAlertsCount || 0) : 0);
  const effFeedCount = feedAlertsCount || (!hasSidebarAppointmentAlerts ? (sidebarTotalAlertsCount || 0) : 0);

  const BRAND_COLOR = '#34a853';
  
  const isAppointmentsActive = isOpen && activeTab === 'appointments';
  const isNewsActive = isOpen && activeTab === 'news';

  return (
    <nav
      role="tablist"
      aria-label="Briefing Schnellzugriff Navigation"
      className="student-briefing-mobile-bottom-dock"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        zIndex: 900,
        height: 'calc(50px + max(6px, calc(env(safe-area-inset-bottom, 0px) * 0.45)))',
        paddingBottom: 'max(6px, calc(env(safe-area-inset-bottom, 0px) * 0.45))',
        paddingTop: '6px',
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        boxShadow: '0 -4px 20px rgba(15, 23, 42, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        boxSizing: 'border-box',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
      }}
    >
      {/* TAB 1: TERMINE */}
      <button
        type="button"
        role="tab"
        aria-selected={isAppointmentsActive}
        tabIndex={0}
        onClick={handleTapAppointments}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleTapAppointments();
          }
        }}
        aria-label={effAppointmentCount > 0 
          ? `Nächste Termine öffnen, ${effAppointmentCount} wichtige Hinweise` 
          : 'Nächste Termine öffnen'}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          height: '100%',
          minHeight: '44px',
          border: 'none',
          borderRadius: 0,
          background: 'transparent',
          cursor: 'pointer',
          padding: '2px 0',
          outline: 'none',
          WebkitTapHighlightColor: 'transparent',
          boxSizing: 'border-box',
          position: 'relative'
        }}
      >
        {/* 🏛️ 0,1% Goldstandard: Oberer 3px Akzent-Indikator bei Auswahl */}
        {isAppointmentsActive && (
          <div style={{ position: 'absolute', top: 0, width: '28px', height: '3px', borderRadius: '999px', background: BRAND_COLOR }} />
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '46px',
            height: '26px',
            borderRadius: '13px',
            background: isAppointmentsActive ? 'rgba(52, 168, 83, 0.20)' : 'transparent',
            border: isAppointmentsActive ? '1px solid rgba(52, 168, 83, 0.38)' : '1px solid transparent',
            position: 'relative',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <Calendar size={20} color={isAppointmentsActive ? '#15803d' : '#64748b'} strokeWidth={isAppointmentsActive ? 2.5 : 2.0} />
          {effAppointmentCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-5px',
                right: '-6px',
                background: hasSidebarAppointmentAlerts 
                  ? '#f97316' 
                  : '#ef4444',
                color: '#ffffff',
                fontSize: '0.62rem',
                fontWeight: 950,
                minWidth: '15px',
                height: '15px',
                padding: '0 4px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'none',
                lineHeight: 1
              }}
            >
              {effAppointmentCount}
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: '0.78rem',
            fontWeight: isAppointmentsActive ? 800 : 600,
            color: isAppointmentsActive ? '#15803d' : '#64748b',
            letterSpacing: isAppointmentsActive ? '-0.01em' : '0',
            lineHeight: 1
          }}
        >
          Termine
        </span>
      </button>

      {/* Symmetrischer Dezent-Separator */}
      <div 
        style={{ 
          width: '1px', 
          height: '22px', 
          background: 'rgba(0, 0, 0, 0.08)',
          borderRadius: '1px' 
        }} 
      />

      {/* TAB 2: NEWS */}
      <button
        type="button"
        role="tab"
        aria-selected={isNewsActive}
        tabIndex={0}
        onClick={handleTapNews}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleTapNews();
          }
        }}
        aria-label={effFeedCount > 0 
          ? `Mitteilungen und News öffnen, ${effFeedCount} neue Beiträge` 
          : 'Mitteilungen und News öffnen'}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          height: '100%',
          minHeight: '44px',
          border: 'none',
          borderRadius: 0,
          background: 'transparent',
          cursor: 'pointer',
          padding: '2px 0',
          outline: 'none',
          WebkitTapHighlightColor: 'transparent',
          boxSizing: 'border-box',
          position: 'relative'
        }}
      >
        {/* 🏛️ 0,1% Goldstandard: Oberer 3px Akzent-Indikator bei Auswahl */}
        {isNewsActive && (
          <div style={{ position: 'absolute', top: 0, width: '28px', height: '3px', borderRadius: '999px', background: BRAND_COLOR }} />
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '46px',
            height: '26px',
            borderRadius: '13px',
            background: isNewsActive ? 'rgba(52, 168, 83, 0.20)' : 'transparent',
            border: isNewsActive ? '1px solid rgba(52, 168, 83, 0.38)' : '1px solid transparent',
            position: 'relative',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <Sparkles size={20} color={isNewsActive ? '#15803d' : '#64748b'} strokeWidth={isNewsActive ? 2.5 : 2.0} />
          {effFeedCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-5px',
                right: '-6px',
                background: '#3b82f6',
                color: '#ffffff',
                fontSize: '0.62rem',
                fontWeight: 950,
                minWidth: '15px',
                height: '15px',
                padding: '0 4px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'none',
                lineHeight: 1
              }}
            >
              {effFeedCount}
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: '0.78rem',
            fontWeight: isNewsActive ? 800 : 600,
            color: isNewsActive ? '#15803d' : '#64748b',
            letterSpacing: isNewsActive ? '-0.01em' : '0',
            lineHeight: 1
          }}
        >
          News
        </span>
      </button>
    </nav>
  );
};

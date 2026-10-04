import React, { useEffect, useRef, useState } from 'react';
import { Calendar, Sparkles, X } from 'lucide-react';
import { StudentBriefingRightSidebar, StudentBriefingRightSidebarProps } from './StudentBriefingRightSidebar';

export interface StudentBriefingSidebarBottomSheetProps extends Omit<StudentBriefingRightSidebarProps, 'isRightSidebarCollapsed' | 'handleToggleRightSidebar'> {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'appointments' | 'news';
  appointmentAlertsCount?: number;
  feedAlertsCount?: number;
}

/**
 * 🏛️ 0,1% Enterprise Goldstandard: StudentBriefingSidebarBottomSheet
 * 
 * Ephemerer Apple iOS Slide-Up Bottom Sheet für Termine & Mitteilungen im Briefing Board.
 * Ausgestattet mit nativer Segmented Control im Sticky-Header für sofortigen, unterbrechungsfreien
 * Wechsel zwischen Terminen und dem News-Feed (Klassen-Feed & Campus-Mitteilungen).
 */
export const StudentBriefingSidebarBottomSheet: React.FC<StudentBriefingSidebarBottomSheetProps> = ({
  isOpen,
  onClose,
  initialTab = 'appointments',
  appointmentAlertsCount = 0,
  feedAlertsCount = 0,
  ...sidebarProps
}) => {
  const [activeTab, setActiveTab] = useState<'appointments' | 'news'>(initialTab);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchCurrentY, setTouchCurrentY] = useState<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Synchronisiere initialTab beim Öffnen des Sheets
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // ESC-Taste schließt das Sheet
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Body Scroll-Lock bei geöffnetem Sheet
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Touch Swipe-to-Dismiss Berechnung
  const dragDeltaY = (touchStartY !== null && touchCurrentY !== null)
    ? Math.max(0, touchCurrentY - touchStartY)
    : 0;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY !== null) {
      setTouchCurrentY(e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    if (dragDeltaY > 80) {
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(8);
        }
      } catch {}
      onClose();
    }
    setTouchStartY(null);
    setTouchCurrentY(null);
  };

  const effAppointmentCount = appointmentAlertsCount || (sidebarProps.hasSidebarAppointmentAlerts ? (sidebarProps.sidebarTotalAlertsCount || 0) : 0);
  const effFeedCount = feedAlertsCount || (!sidebarProps.hasSidebarAppointmentAlerts ? (sidebarProps.sidebarTotalAlertsCount || 0) : 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="briefing-sidebar-sheet-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10050,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'center'
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.48)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          transition: 'opacity 0.22s ease'
        }}
      />

      {/* Slide-Up Sheet Container */}
      <div
        ref={sheetRef}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '88dvh',
          height: '88dvh',
          background: '#f8fafc',
          borderRadius: '28px 28px 0 0',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(255, 255, 255, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          transform: `translateY(${dragDeltaY}px)`,
          transition: touchStartY !== null ? 'none' : 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
          touchAction: 'pan-y',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}
      >
        {/* Apple HIG Drag Handle Zone */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            width: '100%',
            padding: '10px 0 6px 0',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'grab',
            touchAction: 'none'
          }}
        >
          <div
            style={{
              width: '42px',
              height: '5px',
              borderRadius: '100px',
              background: '#cbd5e1'
            }}
          />
        </div>

        {/* Sticky Sheet Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 20px 10px 20px',
            background: '#f8fafc',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: '#e6f4ea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {activeTab === 'appointments' ? (
                <Calendar size={17} color="#34a853" />
              ) : (
                <Sparkles size={17} color="#34a853" />
              )}
            </div>
            <div>
              <h2
                id="briefing-sidebar-sheet-title"
                style={{
                  margin: 0,
                  fontSize: '1rem',
                  fontWeight: 900,
                  color: '#0f172a',
                  letterSpacing: '-0.02em',
                  fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
                }}
              >
                {activeTab === 'appointments' ? 'Nächste Termine' : 'Mitteilungen & News'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 🏛️ 0,1% Goldstandard: Apple iOS Segmented Control */}
        <div
          role="tablist"
          aria-label="Ansicht auswählen"
          style={{
            display: 'flex',
            background: '#e2e8f0',
            padding: '3px',
            borderRadius: '14px',
            margin: '0 16px 12px 16px',
            gap: '4px',
            flexShrink: 0
          }}
        >
          {/* TAB: TERMINE */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'appointments'}
            tabIndex={0}
            onClick={() => {
              try {
                if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                  navigator.vibrate(8);
                }
              } catch {}
              setActiveTab('appointments');
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '11px',
              border: 'none',
              background: activeTab === 'appointments' ? '#ffffff' : 'transparent',
              boxShadow: activeTab === 'appointments' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              color: activeTab === 'appointments' ? '#0f172a' : '#64748b',
              fontWeight: activeTab === 'appointments' ? 850 : 600,
              fontSize: '0.80rem',
              cursor: 'pointer',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
              outline: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            <Calendar size={15} color={activeTab === 'appointments' ? '#34a853' : '#64748b'} strokeWidth={activeTab === 'appointments' ? 2.4 : 1.9} />
            <span>Termine</span>
            {effAppointmentCount > 0 && (
              <span
                style={{
                  background: sidebarProps.hasSidebarAppointmentAlerts 
                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                    : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
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
                  lineHeight: 1
                }}
              >
                {effAppointmentCount}
              </span>
            )}
          </button>

          {/* TAB: MITTEILUNGEN */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'news'}
            tabIndex={0}
            onClick={() => {
              try {
                if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                  navigator.vibrate(8);
                }
              } catch {}
              setActiveTab('news');
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '11px',
              border: 'none',
              background: activeTab === 'news' ? '#ffffff' : 'transparent',
              boxShadow: activeTab === 'news' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              color: activeTab === 'news' ? '#0f172a' : '#64748b',
              fontWeight: activeTab === 'news' ? 850 : 600,
              fontSize: '0.80rem',
              cursor: 'pointer',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
              outline: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            <Sparkles size={15} color={activeTab === 'news' ? '#34a853' : '#64748b'} strokeWidth={activeTab === 'news' ? 2.4 : 1.9} />
            <span>Mitteilungen</span>
            {effFeedCount > 0 && (
              <span
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
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
                  lineHeight: 1
                }}
              >
                {effFeedCount}
              </span>
            )}
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '4px 16px 20px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* Autarke 1:1 Rendering Engine der Sidebar mit activeSection Filter */}
          <StudentBriefingRightSidebar
            {...sidebarProps}
            isRightSidebarCollapsed={false}
            handleToggleRightSidebar={() => {}}
            isMobileSheet={true}
            activeSection={activeTab}
          />

          {/* Escape-Hatch Button: Zum gesamten Terminkalender (bei aktiven Terminen) */}
          {activeTab === 'appointments' && (
            <div style={{ marginTop: '8px', paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))' }}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  sidebarProps.handleTabChangeLocal('events');
                }}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  minHeight: '48px',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '16px',
                  color: '#0f172a',
                  fontSize: '0.88rem',
                  fontWeight: 850,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.15s ease',
                  touchAction: 'manipulation'
                }}
              >
                <Calendar size={17} color="#34a853" />
                <span>Zum gesamten Termine- &amp; Schulkalender →</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

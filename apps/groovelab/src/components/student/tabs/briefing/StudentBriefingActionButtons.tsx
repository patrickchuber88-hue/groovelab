import React from 'react';
import { Calendar, CalendarX, Lock, MessageSquare, Sliders } from 'lucide-react';

export interface StudentBriefingActionButtonsProps {
  isMobile: boolean;
  nextOcc: any;
  lessonText: string;
  isCanceled: boolean;
  isUnlocked: boolean;
  teacherId?: string;
  hasMessage: boolean;
  unreadMsgCount: number;
  isMusicStandMode?: boolean;
  onOpenAppointmentDetail?: (occ: any) => void;
  onOpenChat: () => void;
  onOpenToolbox?: () => void;
}

/**
 * 🏛️ Campus-Groovelab Student Briefing Action Buttons
 * 0.1% Enterprise Goldstandard / Autarker Satellit für StudentBriefingTab
 * Bounded Context: Student Campus Briefing / Quick Actions
 * Standards: OWASP ASVS Level 3 / BFSG 2025 / WCAG 2.2 AA / WCAG 2.5.5 Touch Targets (>= 44px)
 */
export const StudentBriefingActionButtons: React.FC<StudentBriefingActionButtonsProps> = ({
  isMobile,
  nextOcc,
  lessonText,
  isCanceled,
  isUnlocked,
  teacherId,
  hasMessage,
  unreadMsgCount,
  isMusicStandMode = false,
  onOpenAppointmentDetail,
  onOpenChat,
  onOpenToolbox
}) => {
  return (
    <div 
      style={{ 
        marginTop: '16px', 
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center', 
        gap: '10px', 
        width: isMobile ? '100%' : 'auto',
        flexWrap: isMobile ? 'nowrap' : 'wrap',
        boxSizing: 'border-box'
      }}
    >
      {/* 1. Nächster Unterricht / Status Card */}
      {nextOcc ? (
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenAppointmentDetail) {
              onOpenAppointmentDetail(nextOcc);
            }
          }}
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: isMobile ? 'center' : 'flex-start',
            gap: '8px', 
            background: isCanceled ? '#fee2e2' : 'linear-gradient(135deg, rgba(52, 168, 83, 0.08) 0%, rgba(52, 168, 83, 0.02) 100%)', 
            color: isCanceled ? '#dc2626' : '#15803d', 
            padding: '10px 16px', 
            minHeight: '44px', 
            boxSizing: 'border-box', 
            borderRadius: '14px', 
            fontSize: isMusicStandMode ? '0.88rem' : '0.82rem', 
            fontWeight: 850, 
            border: isCanceled ? '1px dashed rgba(239, 68, 68, 0.5)' : '1px solid rgba(52, 168, 83, 0.22)',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
            transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
            width: isMobile ? '100%' : 'auto',
            touchAction: 'manipulation'
          }}
          className="hover-scale"
          title="Nächster Unterricht – Klicke für Details & Aktionen"
          aria-label={isCanceled ? `Abgesagter Unterricht: ${lessonText}` : `Nächster Unterricht: ${lessonText}`}
        >
          {isCanceled ? (
            <>
              {!isUnlocked ? <Lock size={15} color="currentColor" /> : <CalendarX size={15} color="currentColor" />}
              <span>Abgesagt: {lessonText} <span style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 700 }}>(Reaktivieren)</span></span>
            </>
          ) : (
            <>
              <Calendar size={15} color="currentColor" />
              <span>Nächster Unterricht: {lessonText}</span>
            </>
          )}
        </button>
      ) : (
        <div 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: isMobile ? 'center' : 'flex-start',
            gap: '8px', 
            background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.08) 0%, rgba(52, 168, 83, 0.02) 100%)', 
            color: '#15803d', 
            padding: '10px 16px', 
            minHeight: '44px', 
            boxSizing: 'border-box', 
            borderRadius: '14px', 
            fontSize: '0.82rem', 
            fontWeight: 850, 
            border: '1px solid rgba(52, 168, 83, 0.18)',
            width: isMobile ? '100%' : 'auto'
          }}
        >
          <Calendar size={15} color="currentColor" />
          <span>Nächster Unterricht: Demnächst</span>
        </div>
      )}

      {/* 2. Quick-Action Duo: Nachricht an Lehrkraft & Praxis-Tools (Auf Mobile als 50/50 Grid) */}
      <div 
        style={{
          display: isMobile ? 'grid' : 'inline-flex',
          gridTemplateColumns: (teacherId && onOpenToolbox) ? '1fr 1fr' : '1fr',
          alignItems: 'center',
          gap: '10px',
          width: isMobile ? '100%' : 'auto',
          boxSizing: 'border-box'
        }}
      >
        {/* 2A. Nachricht an Lehrkraft */}
        {teacherId && (
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenChat();
            }}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '8px', 
              background: unreadMsgCount > 0 ? '#f0fdf4' : (hasMessage ? '#f8fafc' : '#ffffff'), 
              color: unreadMsgCount > 0 ? '#15803d' : (hasMessage ? '#1e293b' : '#334155'), 
              padding: isMusicStandMode ? '10px 18px' : '10px 16px', 
              minHeight: '44px', 
              boxSizing: 'border-box', 
              borderRadius: '14px', 
              fontSize: isMusicStandMode ? '0.88rem' : '0.82rem', 
              fontWeight: 850, 
              border: unreadMsgCount > 0 ? '1.5px solid #86efac' : '1px solid #cbd5e1', 
              cursor: 'pointer',
              boxShadow: unreadMsgCount > 0 ? '0 2px 8px rgba(21, 128, 61, 0.15)' : '0 2px 6px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
              width: isMobile ? '100%' : 'auto',
              touchAction: 'manipulation'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.background = unreadMsgCount > 0 ? '#dcfce7' : (hasMessage ? '#f1f5f9' : '#f8fafc');
              e.currentTarget.style.boxShadow = unreadMsgCount > 0 ? '0 4px 12px rgba(21, 128, 61, 0.22)' : '0 4px 12px rgba(0, 0, 0, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.background = unreadMsgCount > 0 ? '#f0fdf4' : (hasMessage ? '#f8fafc' : '#ffffff');
              e.currentTarget.style.boxShadow = unreadMsgCount > 0 ? '0 2px 8px rgba(21, 128, 61, 0.15)' : '0 2px 6px rgba(0, 0, 0, 0.04)';
            }}
            title="1:1 Shoutbox zum Unterrichtstermin"
            aria-label={unreadMsgCount > 0 ? `${unreadMsgCount} neue ungelesene Nachrichten von Lehrkraft öffnen` : 'Nachricht an Lehrkraft öffnen'}
          >
            <MessageSquare 
              size={15} 
              color={unreadMsgCount > 0 ? '#15803d' : (hasMessage ? '#334155' : '#64748b')} 
              fill={unreadMsgCount > 0 ? '#bbf7d0' : (hasMessage ? '#e2e8f0' : 'none')} 
            />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {unreadMsgCount > 0 
                ? (unreadMsgCount === 1 ? '1 Nachricht' : `${unreadMsgCount} Nachrichten`) 
                : (isMobile ? 'Nachricht' : (hasMessage ? 'Chat mit Lehrkraft' : 'Nachricht an Lehrkraft'))}
            </span>
            {unreadMsgCount > 0 && (
              <span style={{
                background: '#15803d',
                color: '#ffffff',
                fontSize: '0.70rem',
                fontWeight: 950,
                padding: '2px 7px',
                borderRadius: '100px',
                letterSpacing: '0.02em',
                boxShadow: '0 2px 6px rgba(21, 128, 61, 0.35)'
              }}>
                {unreadMsgCount}
              </span>
            )}
          </button>
        )}

        {/* 2B. Praxis-Tools / Toolbox */}
        {onOpenToolbox && (
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenToolbox();
            }}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '8px', 
              background: '#ffffff', 
              color: '#0f172a', 
              padding: '10px 16px', 
              minHeight: '44px', 
              boxSizing: 'border-box', 
              borderRadius: '14px', 
              fontSize: '0.82rem', 
              fontWeight: 850, 
              border: '1px solid #cbd5e1', 
              cursor: 'pointer', 
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)', 
              transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
              width: isMobile ? '100%' : 'auto',
              touchAction: 'manipulation'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              e.currentTarget.style.borderColor = '#34a853';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.03)';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
            title="Praxis-Toolbox: Metronom & Stimmgerät öffnen"
            aria-label="Praxis-Toolbox mit Metronom und Stimmgerät öffnen"
          >
            <Sliders size={15} color="#0f172a" />
            <span style={{ whiteSpace: 'nowrap' }}>
              {isMobile ? 'Praxis-Tools' : 'Praxis-Toolbox'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

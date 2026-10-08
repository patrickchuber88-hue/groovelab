import React from 'react';
import { Calendar, CalendarX, Lock, MessageSquare, Sliders, RotateCcw } from 'lucide-react';

import { isOccurrenceCancelled, isOccurrenceRescheduled, isOccurrencePendingReschedule } from './studentNextLessonHelper';

export interface StudentBriefingActionButtonsProps {
  isMobile: boolean;
  nextOcc: any;
  lessonText: string;
  isCanceled?: boolean;
  isRescheduled?: boolean;
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
 * 3-Farben-Doktrin: Regulär = Grün, Verschoben = Gelb, Ausfall = Rot (Zero Color-Clash, Tone-in-Tone)
 */
export const StudentBriefingActionButtons: React.FC<StudentBriefingActionButtonsProps> = ({
  isMobile,
  nextOcc,
  lessonText,
  isCanceled,
  isRescheduled,
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
      {nextOcc ? (() => {
        const effCancelled = Boolean(isCanceled || isOccurrenceCancelled(nextOcc));
        const effRescheduled = Boolean(!effCancelled && (isRescheduled || isOccurrenceRescheduled(nextOcc)));
        const isPendingProposal = Boolean(effRescheduled && isOccurrencePendingReschedule(nextOcc));

        // 🏛️ 0,1% Goldstandard: Tone-in-Tone Unifarben-Doktrin (Zero Color-Clash)
        let cardBg = 'linear-gradient(135deg, rgba(52, 168, 83, 0.08) 0%, rgba(52, 168, 83, 0.02) 100%)';
        let cardColor = '#15803d';
        let cardBorder = '1px solid rgba(52, 168, 83, 0.22)';
        let cardTitle = 'Nächster Unterricht – Klicke für Details & Aktionen';
        let cardAriaLabel = `Nächster Unterricht: ${lessonText}`;

        if (effCancelled) {
          // 🔴 Ausfall = Rot
          cardBg = '#fef2f2';
          cardColor = '#dc2626';
          cardBorder = '1px dashed rgba(239, 68, 68, 0.5)';
          cardTitle = 'Unterricht abgesagt – Klicke für Details oder Reaktivierung';
          cardAriaLabel = `Abgesagter Unterricht: ${lessonText}`;
        } else if (effRescheduled) {
          // 🟡 Verschoben = Gelb / Amber
          cardBg = isPendingProposal 
            ? '#fffbeb' 
            : 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.04) 100%)';
          cardColor = '#b45309';
          cardBorder = isPendingProposal 
            ? '1.5px dashed #f59e0b' 
            : '1px solid rgba(245, 158, 11, 0.35)';
          cardTitle = isPendingProposal 
            ? 'Terminvorschlag prüfen (Bestätigen oder Ablehnen)' 
            : 'Verschobener Unterrichtstermin – Klicke für Details';
          cardAriaLabel = isPendingProposal 
            ? `Terminvorschlag (Verschoben): ${lessonText}` 
            : `Verschobener Unterricht: ${lessonText}`;
        }

        return (
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
              background: cardBg, 
              color: cardColor, 
              padding: '10px 16px', 
              minHeight: '44px', 
              boxSizing: 'border-box', 
              borderRadius: '14px', 
              fontSize: isMusicStandMode ? '0.88rem' : '0.82rem', 
              fontWeight: 850, 
              border: cardBorder,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
              transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
              width: isMobile ? '100%' : 'auto',
              touchAction: 'manipulation'
            }}
            className="hover-scale"
            title={cardTitle}
            aria-label={cardAriaLabel}
          >
            {effCancelled ? (
              <>
                {!isUnlocked ? <Lock size={15} color="currentColor" /> : <CalendarX size={15} color="currentColor" />}
                <span>Abgesagt: {lessonText} <span style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 700 }}>(Reaktivieren)</span></span>
              </>
            ) : effRescheduled ? (
              <>
                <RotateCcw size={15} color="#b45309" strokeWidth={2.4} />
                <span>Verschoben: {lessonText} {isPendingProposal && <span style={{ fontSize: '0.72rem', opacity: 0.9, fontWeight: 800 }}>(Prüfen &amp; Antworten)</span>}</span>
              </>
            ) : (
              <>
                <Calendar size={15} color="currentColor" />
                <span>Nächster Unterricht: {lessonText}</span>
              </>
            )}
          </button>
        );
      })() : (
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
              background: unreadMsgCount > 0 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : (hasMessage ? '#f8fafc' : '#ffffff'), 
              color: unreadMsgCount > 0 ? '#ffffff' : (hasMessage ? '#1e293b' : '#334155'), 
              padding: isMusicStandMode ? '10px 18px' : '10px 16px', 
              minHeight: '44px', 
              boxSizing: 'border-box', 
              borderRadius: '14px', 
              fontSize: isMusicStandMode ? '0.88rem' : '0.82rem', 
              fontWeight: 850, 
              border: unreadMsgCount > 0 ? 'none' : '1px solid #cbd5e1', 
              cursor: 'pointer',
              boxShadow: unreadMsgCount > 0 ? '0 4px 14px rgba(16, 185, 129, 0.35)' : '0 2px 6px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
              width: isMobile ? '100%' : 'auto',
              touchAction: 'manipulation'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.background = unreadMsgCount > 0 ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : (hasMessage ? '#f1f5f9' : '#f8fafc');
              e.currentTarget.style.boxShadow = unreadMsgCount > 0 ? '0 4px 14px rgba(16, 185, 129, 0.40)' : '0 4px 12px rgba(0, 0, 0, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.background = unreadMsgCount > 0 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : (hasMessage ? '#f8fafc' : '#ffffff');
              e.currentTarget.style.boxShadow = unreadMsgCount > 0 ? '0 4px 14px rgba(16, 185, 129, 0.35)' : '0 2px 6px rgba(0, 0, 0, 0.04)';
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

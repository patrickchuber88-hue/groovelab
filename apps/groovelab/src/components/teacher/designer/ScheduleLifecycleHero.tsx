import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Send, 
  Copy, 
  Zap, 
  Sliders, 
  ChevronUp, 
  ChevronDown, 
  Info,
  ShieldCheck
} from 'lucide-react';

export interface ScheduleLifecycleHeroProps {
  unassignedCount: number;
  totalStudents: number;
  totalAssigned: number;
  totalGapsMin: number;
  gapCount: number;
  activeDraftId: string;
  activeDraftName: string;
  submittedDraftId: string;
  scheduleStatus: string;
  hasUnsubmittedEdits: boolean;
  hasSubmittedSchedule: boolean;
  lastSubmittedTime: string | null;
  rejectionNote?: string | null;
  isSecretaryWorkspace: boolean;
  brandColor?: string;
  submitting?: boolean;
  onAutoAssign: () => void;
  onSubmitSchedule: () => void;
  onOpenReportModal: () => void;
  onOpenAvailability: () => void;
  onDuplicateCurrentDraft: () => void;
  onOpenStudentPool?: () => void;
}

export const ScheduleLifecycleHero: React.FC<ScheduleLifecycleHeroProps> = ({
  unassignedCount,
  totalStudents,
  totalAssigned,
  totalGapsMin,
  gapCount,
  activeDraftId,
  activeDraftName,
  submittedDraftId,
  scheduleStatus,
  hasUnsubmittedEdits,
  hasSubmittedSchedule,
  lastSubmittedTime,
  rejectionNote,
  isSecretaryWorkspace,
  brandColor = '#34a853',
  submitting = false,
  onAutoAssign,
  onSubmitSchedule,
  onOpenReportModal,
  onOpenAvailability,
  onDuplicateCurrentDraft,
  onOpenStudentPool
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('groovelab_schedule_hero_collapsed') === 'true';
    }
    return false;
  });

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('groovelab_schedule_hero_collapsed', String(next));
      }
      return next;
    });
  };

  const isCurrentDraftLive = Boolean(hasSubmittedSchedule && activeDraftId === submittedDraftId && scheduleStatus === 'approved' && !hasUnsubmittedEdits);
  const isCurrentDraftPending = Boolean(hasSubmittedSchedule && activeDraftId === submittedDraftId && scheduleStatus !== 'approved' && scheduleStatus !== 'needs_revision' && !hasUnsubmittedEdits);
  const isCurrentDraftNeedsRevision = Boolean(scheduleStatus === 'needs_revision' && activeDraftId === submittedDraftId);
  const isAlternativeSandboxDraft = Boolean(hasSubmittedSchedule && submittedDraftId && activeDraftId !== submittedDraftId);

  // Dynamic Lifecycle State determination
  let heroTheme: {
    bgGradient: string;
    border: string;
    iconBg: string;
    iconColor: string;
    title: string;
    description: string;
    primaryButton?: {
      label: string;
      icon: React.ReactNode;
      onClick: () => void;
      variant: 'primary' | 'success' | 'amber' | 'neutral';
    };
    secondaryButton?: {
      label: string;
      icon?: React.ReactNode;
      onClick: () => void;
    };
    secondaryAction?: {
      label: string;
      onClick: () => void;
    };
    pillTag?: string;
  };

  if (isCurrentDraftNeedsRevision) {
    heroTheme = {
      bgGradient: 'linear-gradient(135deg, rgba(254, 242, 242, 0.95) 0%, rgba(254, 226, 226, 0.85) 100%)',
      border: '1.5px solid rgba(239, 68, 68, 0.4)',
      iconBg: 'rgba(239, 68, 68, 0.12)',
      iconColor: '#dc2626',
      title: 'Klärungsbedarf durch die Schulleitung gemeldet',
      description: rejectionNote 
        ? `Begründung des Sekretariats: „${rejectionNote}“`
        : 'Bitte passe die betroffenen Termine an und reiche den Entwurf erneut zur einvernehmlichen Freigabe ein.',
      pillTag: 'Rücksprache erforderlich',
      primaryButton: {
        label: submitting ? 'Wird übermittelt...' : 'Änderungen erneut zur Freigabe einreichen',
        icon: <Send size={14} style={{ color: 'currentColor' }} />,
        onClick: onSubmitSchedule,
        variant: 'amber'
      },
      secondaryAction: {
        label: 'Auswertung & Konflikte ansehen',
        onClick: onOpenReportModal
      }
    };
  } else if (isCurrentDraftLive) {
    heroTheme = {
      bgGradient: 'linear-gradient(135deg, rgba(240, 253, 244, 0.95) 0%, rgba(220, 252, 231, 0.8) 100%)',
      border: '1.5px solid rgba(34, 197, 94, 0.35)',
      iconBg: 'rgba(34, 197, 94, 0.15)',
      iconColor: '#16a34a',
      title: 'Genehmigter Stundenplan aktiv im Schulbetrieb',
      description: `Dieser Plan ist verbindlich live geschaltet${lastSubmittedTime ? ` (Freigabe: ${lastSubmittedTime})` : ''}. Eltern und Schüler sehen ihre Termine.`,
      pillTag: 'Live & Aktiv',
      primaryButton: {
        label: 'Als neuen Entwurf duplizieren (Szenario)',
        icon: <Copy size={14} style={{ color: 'currentColor' }} />,
        onClick: onDuplicateCurrentDraft,
        variant: 'neutral'
      },
      secondaryAction: {
        label: 'Erfolgsanalyse & Lücken anzeigen',
        onClick: onOpenReportModal
      }
    };
  } else if (isCurrentDraftPending) {
    heroTheme = {
      bgGradient: 'linear-gradient(135deg, rgba(254, 243, 199, 0.95) 0%, rgba(253, 230, 138, 0.75) 100%)',
      border: '1.5px solid rgba(245, 158, 11, 0.35)',
      iconBg: 'rgba(245, 158, 11, 0.15)',
      iconColor: '#d97706',
      title: 'In Prüfung durch das Schulsekretariat',
      description: `Dein Stundenplan-Vorschlag wurde am ${lastSubmittedTime || 'kürzlich'} übermittelt und wird derzeit auf Raumverfügbarkeiten geprüft.`,
      pillTag: 'Wartet auf Freigabe',
      secondaryAction: {
        label: 'Eingereichte Analyse anzeigen',
        onClick: onOpenReportModal
      }
    };
  } else if (isAlternativeSandboxDraft) {
    heroTheme = {
      bgGradient: 'linear-gradient(135deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 0.85) 100%)',
      border: '1.5px solid rgba(148, 163, 184, 0.3)',
      iconBg: 'rgba(100, 116, 139, 0.12)',
      iconColor: '#475569',
      title: `Arbeits-Entwurf: „${activeDraftName}“ (Gefahrlose Sandbox)`,
      description: 'Dein genehmigter Live-Stundenplan bleibt geschützt. Du kannst hier frei experimentieren und diesen Plan bei Bedarf separat einreichen.',
      pillTag: 'Unverbindlicher Entwurf',
      primaryButton: unassignedCount > 0 ? {
        label: 'Automatisch zuteilen',
        icon: <Sparkles size={14} style={{ color: 'currentColor' }} />,
        onClick: onAutoAssign,
        variant: 'primary'
      } : {
        label: submitting ? 'Wird übermittelt...' : `„${activeDraftName}“ zur Freigabe einreichen`,
        icon: <Send size={14} style={{ color: 'currentColor' }} />,
        onClick: onSubmitSchedule,
        variant: 'success'
      },
      secondaryAction: {
        label: 'Auswertung prüfen',
        onClick: onOpenReportModal
      }
    };
  } else if (totalStudents === 0) {
    // 🏛️ 0,1% Goldstandard: Beseitigung des Cold-Start-Paradoxons bei 0 Schülern
    heroTheme = {
      bgGradient: 'linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 250, 252, 0.92) 100%)',
      border: '1px solid rgba(0, 0, 0, 0.08)',
      iconBg: 'rgba(52, 168, 83, 0.12)',
      iconColor: brandColor,
      title: 'Willkommen beim Stundenplan-Designer',
      description: 'Deine Musikschule hat dir für dieses Semester noch keine Schüler zugewiesen. Lege jetzt schon deine Wunsch-Unterrichtstage und Zeitfenster fest.',
      pillTag: 'Schritt 1: Zeiten festlegen',
      primaryButton: {
        label: 'Unterrichtszeiten & Tage festlegen',
        icon: <Clock size={14} style={{ color: 'currentColor' }} />,
        onClick: onOpenAvailability,
        variant: 'primary'
      }
    };
  } else if (unassignedCount > 0) {
    const isFreshStart = totalAssigned === 0;
    heroTheme = {
      bgGradient: 'linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 250, 252, 0.92) 100%)',
      border: '1px solid rgba(0, 0, 0, 0.08)',
      iconBg: 'rgba(52, 168, 83, 0.12)',
      iconColor: brandColor,
      title: isFreshStart 
        ? `${unassignedCount} Schüler warten auf Einteilung • Bereit für deinen Plan`
        : `${unassignedCount} von ${totalStudents} Schülern noch einzuteilen`,
      description: isFreshStart
        ? 'Wähle deinen Weg: Lass den 15-Stufen-Solver alle Wünsche sekundenschnell berechnen oder ziehe deine Schüler von Hand per Drag & Drop ein.'
        : 'Lass den universitären 15-Phasen-Algorithmus alle Schülerwünsche und lückenlose Blöcke in Sekunden berechnen.',
      pillTag: isFreshStart ? 'Schritt 2: Zuteilung' : `${unassignedCount} offen`,
      primaryButton: {
        label: 'Stundenplan automatisch berechnen',
        icon: <Sparkles size={14} style={{ color: 'currentColor' }} />,
        onClick: onAutoAssign,
        variant: 'primary'
      },
      secondaryButton: (isFreshStart && onOpenStudentPool) ? {
        label: 'Manuell per Drag & Drop einteilen',
        icon: <Sliders size={14} style={{ color: 'currentColor' }} />,
        onClick: onOpenStudentPool
      } : undefined,
      secondaryAction: {
        label: 'Unterrichtszeiten anpassen',
        onClick: onOpenAvailability
      }
    };
  } else if (totalGapsMin > 0) {
    heroTheme = {
      bgGradient: 'linear-gradient(135deg, rgba(255, 251, 235, 0.95) 0%, rgba(254, 243, 199, 0.8) 100%)',
      border: '1.5px solid rgba(245, 158, 11, 0.35)',
      iconBg: 'rgba(245, 158, 11, 0.15)',
      iconColor: '#d97706',
      title: `Alle ${totalStudents} Schüler eingeteilt • ${totalGapsMin} Min ${gapCount === 1 ? 'Lücke' : 'Lücken'}`,
      description: 'Dein Entwurf ist vollständig. Du kannst Lücken per Drag & Drop schließen oder den Plan direkt zur Freigabe übermitteln.',
      pillTag: 'Schritt 2: Feinschliff',
      primaryButton: {
        label: submitting ? 'Wird übermittelt...' : 'Stundenplan zur Freigabe einreichen',
        icon: <Send size={14} style={{ color: 'currentColor' }} />,
        onClick: onSubmitSchedule,
        variant: 'success'
      },
      secondaryAction: {
        label: 'Lücken & Score analysieren',
        onClick: onOpenReportModal
      }
    };
  } else {
    heroTheme = {
      bgGradient: 'linear-gradient(135deg, rgba(240, 253, 244, 0.95) 0%, rgba(220, 252, 231, 0.85) 100%)',
      border: '1.5px solid rgba(34, 197, 94, 0.35)',
      iconBg: 'rgba(34, 197, 94, 0.15)',
      iconColor: '#16a34a',
      title: 'Hervorragend! Lückenloser Stundenplan bereit zur Freigabe',
      description: `Alle ${totalStudents} Schüler eingeteilt, 0 Min Lücken. Reiche deinen Entwurf jetzt verbindlich an die Musikschule ein.`,
      pillTag: 'Schritt 3: Bereit',
      primaryButton: {
        label: submitting ? 'Wird übermittelt...' : 'Stundenplan zur Freigabe einreichen',
        icon: <Send size={14} style={{ color: 'currentColor' }} />,
        onClick: onSubmitSchedule,
        variant: 'success'
      },
      secondaryAction: {
        label: 'Erfolgsanalyse anzeigen',
        onClick: onOpenReportModal
      }
    };
  }

  // Collapsed Minimal Strip
  if (isCollapsed) {
    return (
      <div 
        style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: '12px',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
          position: 'relative',
          zIndex: 10,
          transition: 'all 0.2s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: heroTheme.iconColor, flexShrink: 0 }} />
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {heroTheme.title}
          </span>
          {heroTheme.pillTag && (
            <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '1px 7px', borderRadius: '100px', background: 'rgba(0,0,0,0.04)', color: '#64748b' }}>
              {heroTheme.pillTag}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {heroTheme.primaryButton && (
            <button
              type="button"
              onClick={heroTheme.primaryButton.onClick}
              style={{
                background: heroTheme.primaryButton.variant === 'primary' 
                  ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' 
                  : (heroTheme.primaryButton.variant === 'success' 
                    ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
                    : '#ffffff'),
                color: heroTheme.primaryButton.variant === 'neutral' ? '#1e293b' : '#ffffff',
                border: heroTheme.primaryButton.variant === 'neutral' ? '1px solid rgba(0,0,0,0.1)' : 'none',
                fontWeight: 700,
                fontSize: '0.74rem',
                padding: '4px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              {heroTheme.primaryButton.icon}
              <span>{heroTheme.primaryButton.label}</span>
            </button>
          )}

          <button
            type="button"
            onClick={toggleCollapsed}
            title="Lifecycle-Hero aufklappen"
            aria-label="Lifecycle-Hero aufklappen"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ChevronDown size={14} style={{ color: 'currentColor' }} />
          </button>
        </div>
      </div>
    );
  }

  // Expanded Full Autopilot Card
  return (
    <div
      role="region"
      aria-label="Stundenplan-Prozessführung"
      style={{
        background: heroTheme.bgGradient,
        backdropFilter: 'blur(25px) saturate(190%)',
        WebkitBackdropFilter: 'blur(25px) saturate(190%)',
        borderRadius: '16px',
        border: heroTheme.border,
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
        position: 'relative',
        zIndex: 10,
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        flexWrap: 'wrap'
      }}
    >
      {/* Left: Icon & Text Guidance */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: '1 1 360px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: heroTheme.iconBg,
          color: heroTheme.iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}>
          {isCurrentDraftLive ? (
            <ShieldCheck size={20} style={{ color: 'currentColor' }} />
          ) : totalStudents === 0 ? (
            <Clock size={20} style={{ color: 'currentColor' }} />
          ) : isCurrentDraftNeedsRevision ? (
            <AlertCircle size={20} style={{ color: 'currentColor' }} />
          ) : isCurrentDraftPending ? (
            <Clock size={20} style={{ color: 'currentColor' }} />
          ) : (
            <Sparkles size={20} style={{ color: 'currentColor' }} />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.3 }}>
              {heroTheme.title}
            </h3>
            {heroTheme.pillTag && (
              <span style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                padding: '2px 8px',
                borderRadius: '100px',
                background: 'rgba(255, 255, 255, 0.8)',
                color: heroTheme.iconColor,
                border: '1px solid rgba(0,0,0,0.06)'
              }}>
                {heroTheme.pillTag}
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.4, fontWeight: 500 }}>
            {heroTheme.description}
          </p>
        </div>
      </div>

      {/* Right: Primary CTAs & Collapse Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, marginLeft: 'auto', flexWrap: 'wrap' }}>
        {heroTheme.secondaryAction && (
          <button
            type="button"
            onClick={heroTheme.secondaryAction.onClick}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#334155',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: '8px',
              transition: 'background 0.15s ease'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            {heroTheme.secondaryAction.label}
          </button>
        )}

        {heroTheme.secondaryButton && (
          <button
            type="button"
            onClick={heroTheme.secondaryButton.onClick}
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(0, 0, 0, 0.12)',
              color: '#0f172a',
              fontWeight: 700,
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '0.80rem',
              letterSpacing: '-0.01em',
              minHeight: '34px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.16s ease'
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
              e.currentTarget.style.transform = 'none';
            }}
          >
            {heroTheme.secondaryButton.icon}
            <span>{heroTheme.secondaryButton.label}</span>
          </button>
        )}

        {heroTheme.primaryButton && (
          <button
            type="button"
            onClick={heroTheme.primaryButton.onClick}
            disabled={submitting}
            style={{
              background: heroTheme.primaryButton.variant === 'primary' 
                ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' 
                : (heroTheme.primaryButton.variant === 'amber'
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                  : (heroTheme.primaryButton.variant === 'neutral'
                    ? '#ffffff'
                    : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)')),
              color: heroTheme.primaryButton.variant === 'neutral' ? '#0f172a' : '#ffffff',
              border: heroTheme.primaryButton.variant === 'neutral' ? '1.5px solid rgba(0,0,0,0.1)' : 'none',
              fontWeight: 800,
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '0.80rem',
              letterSpacing: '-0.01em',
              minHeight: '34px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              boxShadow: heroTheme.primaryButton.variant === 'neutral' 
                ? '0 1px 3px rgba(0,0,0,0.05)' 
                : '0 4px 14px rgba(22, 163, 74, 0.28), inset 0 1px 0 rgba(255,255,255,0.25)',
              transition: 'all 0.16s ease',
              opacity: submitting ? 0.6 : 1
            }}
            onMouseOver={e => {
              if (!submitting) e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={e => {
              if (!submitting) e.currentTarget.style.transform = 'none';
            }}
          >
            {heroTheme.primaryButton.icon}
            <span>{heroTheme.primaryButton.label}</span>
          </button>
        )}

        {/* Minimalist Collapse Button */}
        <button
          type="button"
          onClick={toggleCollapsed}
          title="Banner einklappen für mehr Kalender-Höhe"
          aria-label="Banner einklappen"
          style={{
            background: 'rgba(0, 0, 0, 0.04)',
            border: 'none',
            borderRadius: '8px',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            cursor: 'pointer',
            marginLeft: '4px',
            transition: 'background 0.15s ease'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.08)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
        >
          <ChevronUp size={14} style={{ color: 'currentColor' }} />
        </button>
      </div>
    </div>
  );
};

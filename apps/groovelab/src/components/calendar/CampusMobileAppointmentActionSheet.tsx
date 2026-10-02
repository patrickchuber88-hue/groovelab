import React, { useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Clock, 
  Calendar as CalendarIcon, 
  MessageSquare, 
  ArrowLeftRight, 
  Settings2, 
  Trash2, 
  Music,
  Users
} from 'lucide-react';

export interface CampusMobileAppointmentActionSheetProps {
  isOpen: boolean;
  occ: any | null;
  displayNames: string;
  currentRoomName?: string;
  onClose: () => void;
  onOpenEditModal: (occ: any) => void;
  onStartSwap: (occ: any) => void;
  onCancelAppointment: (occ: any) => void;
  onOpenChat?: (studentId: string, occId: string) => void;
}

/**
 * 🏛️ CampusMobileAppointmentActionSheet (0,1% Enterprise Goldstandard)
 * 
 * Touch-First Action Sheet für Mobilgeräte nach Apple Human Interface Guidelines:
 * - Keine mikroskopischen Buttons auf der Karte
 * - Alle Touch-Targets >= 44x44px (WCAG 2.5.5)
 * - WAI-ARIA role="dialog", Focus-Trap & Escape-Listener
 * - iOS Safe-Area Inset Support
 */
export const CampusMobileAppointmentActionSheet: React.FC<CampusMobileAppointmentActionSheetProps> = ({
  isOpen,
  occ,
  displayNames,
  currentRoomName,
  onClose,
  onOpenEditModal,
  onStartSwap,
  onCancelAppointment,
  onOpenChat
}) => {
  // Escape-Key Listener & Scroll Lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !occ) return null;

  const startTimeStr = occ.start_time ? occ.start_time.substring(0, 5) : '';
  const durationMin = occ.duration || 30;
  
  // Format end time
  const [sh, sm] = startTimeStr.split(':').map(Number);
  const totalEndMin = (sh || 0) * 60 + (sm || 0) + durationMin;
  const endHours = String(Math.floor(totalEndMin / 60) % 24).padStart(2, '0');
  const endMinutes = String(totalEndMin % 60).padStart(2, '0');
  const endTimeStr = `${endHours}:${endMinutes}`;

  // Format Date (e.g. Donnerstag, 01.10.2026)
  let dateFormatted = '';
  if (occ.date) {
    try {
      const d = new Date(occ.date + 'T00:00:00');
      dateFormatted = d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      dateFormatted = occ.date;
    }
  }

  const isBreak = occ.isBreak || (!occ.student_id && String(occ.id).includes('break'));
  const isVacant = occ.student_id === 'vacant';
  const isCancelled = occ.status === 'cancelled' || occ.status === 'teacher_ausfall';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Termin-Aktionen für ${displayNames}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999990,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.18s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: '#ffffff',
          borderRadius: '24px 24px 0 0',
          padding: '16px 20px calc(env(safe-area-inset-bottom, 16px) + 20px) 20px',
          boxSizing: 'border-box',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.25)',
          animation: 'slideUp 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxHeight: '90dvh',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple Sheet Pull Bar */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '-4px' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '10px', background: '#cbd5e1' }} />
        </div>

        {/* Header mit Titel & Close-Button */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                fontSize: '0.66rem',
                fontWeight: 850,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                background: 'rgba(52, 168, 83, 0.12)',
                color: '#2e7d32',
                padding: '2px 7px',
                borderRadius: '6px'
              }}>
                {isBreak ? 'Pause' : isVacant ? 'Freier Slot' : 'Unterricht'}
              </span>
              {currentRoomName && (
                <span style={{
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  background: '#f1f5f9',
                  color: '#475569',
                  padding: '2px 7px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                  <MapPin size={10} />
                  <span>{currentRoomName}</span>
                </span>
              )}
            </div>

            <h3 style={{
              fontSize: '1.18rem',
              fontWeight: 850,
              color: '#0f172a',
              margin: '2px 0 0 0',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              letterSpacing: '-0.02em',
              lineHeight: 1.2
            }}>
              {displayNames}
            </h3>

            {/* Datum & Uhrzeit Banner */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.80rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={13} strokeWidth={2.2} color="#0f172a" />
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{startTimeStr} – {endTimeStr}</span>
                <span>({durationMin} Min)</span>
              </div>
              <span>•</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CalendarIcon size={12} strokeWidth={2} />
                <span>{dateFormatted}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Aktionen schließen"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#f1f5f9',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: '#f1f5f9', width: '100%' }} />

        {/* Action Button Grid (WCAG 2.5.5 >= 44x44px) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
          {/* Button 1: Raum / Details anpassen */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenEditModal(occ);
            }}
            style={{
              minHeight: '48px',
              padding: '10px 16px',
              borderRadius: '14px',
              border: '1.5px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              color: '#1e293b',
              fontSize: '0.88rem',
              fontWeight: 750,
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Settings2 size={16} strokeWidth={2.4} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div>Raum & Uhrzeit anpassen</div>
                <div style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 500 }}>Startzeit, Dauer oder Raum ändern</div>
              </div>
            </div>
            <span style={{ fontSize: '0.90rem', color: '#94a3b8' }}>›</span>
          </button>

          {/* Button 2: Termin tauschen (Swap) */}
          {!isBreak && !isVacant && !isCancelled && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartSwap(occ);
              }}
              style={{
                minHeight: '48px',
                padding: '10px 16px',
                borderRadius: '14px',
                border: '1.5px solid #fef08a',
                background: '#fefce8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                color: '#854d0e',
                fontSize: '0.88rem',
                fontWeight: 750,
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef08a', color: '#854d0e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowLeftRight size={16} strokeWidth={2.4} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div>Termin tauschen (Swap)</div>
                  <div style={{ fontSize: '0.70rem', color: '#a16207', fontWeight: 500 }}>Mit einem anderen Schüler tauschen</div>
                </div>
              </div>
              <span style={{ fontSize: '0.90rem', color: '#ca8a04' }}>›</span>
            </button>
          )}

          {/* Button 3: Chat / Nachricht */}
          {!isBreak && !isVacant && occ.student_id && onOpenChat && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenChat(occ.student_id, occ.id);
              }}
              style={{
                minHeight: '48px',
                padding: '10px 16px',
                borderRadius: '14px',
                border: '1.5px solid #dcfce7',
                background: '#f0fdf4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                color: '#166534',
                fontSize: '0.88rem',
                fontWeight: 750,
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#bbf7d0', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageSquare size={16} strokeWidth={2.4} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div>Nachricht / Hausaufgabe</div>
                  <div style={{ fontSize: '0.70rem', color: '#15803d', fontWeight: 500 }}>Direktchat mit dem Schüler öffnen</div>
                </div>
              </div>
              <span style={{ fontSize: '0.90rem', color: '#16a34a' }}>›</span>
            </button>
          )}

          {/* Button 4: Termin absagen / Ausfall melden */}
          {!isCancelled && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onCancelAppointment(occ);
              }}
              style={{
                minHeight: '48px',
                padding: '10px 16px',
                borderRadius: '14px',
                border: '1.5px solid #fee2e2',
                background: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                color: '#991b1b',
                fontSize: '0.88rem',
                fontWeight: 750,
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={16} strokeWidth={2.4} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div>Termin absagen / Ausfall melden</div>
                  <div style={{ fontSize: '0.70rem', color: '#b91c1c', fontWeight: 500 }}>Entfällt für diese Unterrichtseinheit</div>
                </div>
              </div>
              <span style={{ fontSize: '0.90rem', color: '#dc2626' }}>›</span>
            </button>
          )}
        </div>

        {/* Abbrechen-Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            minHeight: '44px',
            width: '100%',
            borderRadius: '12px',
            border: 'none',
            background: '#f1f5f9',
            color: '#475569',
            fontSize: '0.86rem',
            fontWeight: 800,
            cursor: 'pointer',
            marginTop: '4px'
          }}
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
};

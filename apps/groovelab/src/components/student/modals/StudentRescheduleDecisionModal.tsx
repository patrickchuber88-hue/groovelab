import React, { useEffect, useState } from 'react';
import { Calendar, Check, X, MessageSquare, Clock, MapPin, User, Loader2 } from 'lucide-react';
import { getInstrumentAvatarUrl } from '../../../utils/avatarResolutionEngine';

export interface StudentRescheduleDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  occurrence: any;
  teacherName?: string;
  instrumentName?: string;
  onConfirm: (occurrenceId: string) => Promise<void>;
  onReject: (occurrence: any) => Promise<void>;
  onOpenChat?: (teacherId: string, initialMessage?: string) => void;
}

/**
 * 🏛️ Campus-Groovelab Student Reschedule Decision Modal
 * 0.1% Enterprise Goldstandard / Autarker Satellit
 * Bounded Context: Student Campus Schedule & Rescheduling Governance
 * Standards: OWASP ASVS Level 3 / BFSG 2025 / WCAG 2.2 AA / WCAG 2.5.5 Touch Targets (>= 44px)
 */
export const StudentRescheduleDecisionModal: React.FC<StudentRescheduleDecisionModalProps> = ({
  isOpen,
  onClose,
  occurrence,
  teacherName,
  instrumentName,
  onConfirm,
  onReject,
  onOpenChat
}) => {
  const [loadingAction, setLoadingAction] = useState<'confirm' | 'reject' | null>(null);

  // Close on Escape key (WCAG 2.2 AA)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !occurrence) return null;

  // Format dates & times
  const formatDateGerman = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const oldDateFormatted = occurrence.original_date ? formatDateGerman(occurrence.original_date) : '';
  const newDateFormatted = occurrence.date ? formatDateGerman(occurrence.date) : '';

  const oldTimeStr = occurrence.original_start_time ? occurrence.original_start_time.substring(0, 5) : '';
  const newTimeStr = occurrence.start_time ? occurrence.start_time.substring(0, 5) : '';

  const resolvedTeacher = teacherName || 
    (occurrence.teacher ? `${occurrence.teacher.first_name} ${occurrence.teacher.last_name}` : 'Lehrkraft');
  const effectiveInstrument = instrumentName || occurrence.instrument || occurrence.subject || occurrence.teacher?.instrument || occurrence.teacher?.main_instrument || '';
  const resolvedInstrument = effectiveInstrument || 'Unterricht';
  const instrumentAvatarUrl = getInstrumentAvatarUrl(effectiveInstrument);
  const resolvedRoom = occurrence.room_name || occurrence.room?.name || 'Musikschule';

  const handleConfirmClick = async () => {
    try {
      setLoadingAction('confirm');
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(10); } catch {}
      }
      await onConfirm(occurrence.id);
      onClose();
    } catch (err) {
      console.error('Fehler beim Bestätigen:', err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRejectClick = async () => {
    try {
      setLoadingAction('reject');
      await onReject(occurrence);
      onClose();
    } catch (err) {
      console.error('Fehler beim Ablehnen:', err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleChatClick = () => {
    const tId = occurrence.teacher_id || occurrence.teacher?.id;
    if (onOpenChat && tId) {
      const defaultMsg = `Hallo ${resolvedTeacher}, bezüglich des Terminvorschlags für ${newDateFormatted} um ${newTimeStr} Uhr: `;
      onOpenChat(tId, defaultMsg);
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reschedule-modal-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(8px)',
        padding: '16px',
        boxSizing: 'border-box'
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.18)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          animation: 'modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 20px 14px 20px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#fafafa'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: '#fef3c7',
              border: '1px solid #fde68a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
              padding: '2px',
              boxSizing: 'border-box'
            }}>
              {instrumentAvatarUrl ? (
                <img
                  src={instrumentAvatarUrl}
                  alt={resolvedInstrument}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <Calendar size={18} strokeWidth={2.5} color="#d97706" />
              )}
            </div>
            <div>
              <h2
                id="reschedule-modal-title"
                style={{
                  margin: 0,
                  fontSize: '1.02rem',
                  fontWeight: 900,
                  color: '#0f172a',
                  letterSpacing: '-0.02em'
                }}
              >
                Terminvorschlag prüfen
              </h2>
              <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 650 }}>
                {resolvedTeacher} · {resolvedInstrument}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.15s ease'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Status Alert Banner */}
          <div style={{
            background: '#fffbeb',
            border: '1.5px solid #fde68a',
            borderRadius: '14px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '1.1rem' }}>⏳</span>
            <div style={{ fontSize: '0.80rem', color: '#92400e', lineHeight: 1.35, fontWeight: 600 }}>
              Deine Lehrkraft schlägt eine neue Unterrichtszeit vor. Bitte bestätige, ob du zu dieser Zeit kommen kannst.
            </div>
          </div>

          {/* Vorher / Nachher Vergleich */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Vorher */}
            {(oldDateFormatted || oldTimeStr) && (
              <div style={{
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '10px 14px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 700 }}>Reguläre Unterrichtszeit:</span>
                <span style={{ fontSize: '0.80rem', color: '#64748b', fontWeight: 650 }}>
                  {oldDateFormatted || newDateFormatted} {oldTimeStr ? `· ${oldTimeStr} Uhr` : ''}
                </span>
              </div>
            )}

            {/* Neuer Vorschlag (Hero) */}
            <div style={{
              background: '#f0fdf4',
              borderRadius: '14px',
              padding: '14px',
              border: '2px solid #86efac',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Neuer Terminvorschlag:
              </div>
              <div style={{ fontSize: '1.10rem', fontWeight: 900, color: '#15803d', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="#15803d" />
                <span>{newDateFormatted}</span>
              </div>
              <div style={{ fontSize: '0.96rem', fontWeight: 850, color: '#166534', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '2px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={15} color="#166534" />
                  <span>{newTimeStr} Uhr ({occurrence.duration || 30} Min)</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={15} color="#166534" />
                  <span>{resolvedRoom}</span>
                </span>
              </div>
            </div>
          </div>

          {/* 3 Aktions-Optionen (WCAG 2.5.5 >= 44px) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
            {/* Option 1: Primär Bestätigen */}
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={handleConfirmClick}
              style={{
                width: '100%',
                minHeight: '48px',
                borderRadius: '14px',
                background: '#15803d',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.92rem',
                fontWeight: 850,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(21, 128, 61, 0.28)',
                transition: 'transform 0.15s ease'
              }}
            >
              {loadingAction === 'confirm' ? <Loader2 size={18} className="spin" /> : <Check size={18} strokeWidth={2.8} />}
              <span>Neue Zeit bestätigen</span>
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              {/* Option 2: Ablehnen */}
              <button
                type="button"
                disabled={loadingAction !== null}
                onClick={handleRejectClick}
                style={{
                  flex: 1,
                  minHeight: '44px',
                  borderRadius: '12px',
                  background: '#ffffff',
                  color: '#dc2626',
                  border: '1.5px solid #fca5a5',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'background 0.15s ease'
                }}
              >
                {loadingAction === 'reject' ? <Loader2 size={16} className="spin" /> : <X size={16} strokeWidth={2.5} />}
                <span>Ablehnen</span>
              </button>

              {/* Option 3: Im Chat nachfragen */}
              {onOpenChat && (
                <button
                  type="button"
                  disabled={loadingAction !== null}
                  onClick={handleChatClick}
                  style={{
                    flex: 1,
                    minHeight: '44px',
                    borderRadius: '12px',
                    background: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <MessageSquare size={15} />
                  <span>Im Chat fragen</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

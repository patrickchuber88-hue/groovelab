import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  AlertTriangle, 
  PhoneCall, 
  Building2, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  ChevronRight, 
  Volume2, 
  Info 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export interface UrgentCancellationItem {
  occurrence_id: string;
  student_id: string;
  student_first_name: string;
  student_last_name: string;
  student_instrument: string;
  lesson_date: string;
  start_time: string;
  duration: number;
  room_name: string;
  status: string;
  student_acknowledged: boolean;
  teacher_contact_status?: 'reached' | 'voicemail' | 'delegated_to_secretariat' | null;
  teacher_contacted_at?: string | null;
  minutes_until_start: number;
}

interface TeacherUrgentCancellationsModalProps {
  isOpen: boolean;
  teacherId: string;
  items: UrgentCancellationItem[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onSnooze: (minutes: number) => void;
}

export const TeacherUrgentCancellationsModal: React.FC<TeacherUrgentCancellationsModalProps> = ({
  isOpen,
  teacherId,
  items,
  onClose,
  onRefresh,
  onSnooze
}) => {
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Auto-clear feedback toast
  useEffect(() => {
    if (!feedbackToast) return;
    const timer = setTimeout(() => setFeedbackToast(null), 3500);
    return () => clearTimeout(timer);
  }, [feedbackToast]);

  // Prüfen, ob alle Schüler einen dokumentierten Kontakt-Status haben
  const allResolved = useMemo(() => {
    if (!items || items.length === 0) return true;
    return items.every(
      item => 
        item.student_acknowledged === true || 
        Boolean(item.teacher_contact_status)
    );
  }, [items]);

  // Frühester Unterrichtsbeginn zur Prüfung des 30-Minuten-Snooze-Limits
  const earliestMinutesRemaining = useMemo(() => {
    if (!items || items.length === 0) return 999;
    return Math.min(...items.map(i => i.minutes_until_start ?? 999));
  }, [items]);

  const canSnooze = earliestMinutesRemaining > 30;

  // 1. Einzelner Schüler: Als telefonisch informiert quittieren
  const handleAcknowledgeSingle = useCallback(async (occurrenceId: string, contactType: 'reached' | 'voicemail') => {
    try {
      setLoadingActionId(occurrenceId);
      const { error } = await supabase.rpc('acknowledge_teacher_cancellation_contact', {
        p_occurrence_id: occurrenceId,
        p_contact_type: contactType,
        p_notes: contactType === 'reached' ? 'Eltern telefonisch erreicht' : 'Mailbox besprochen'
      });

      if (error) throw error;
      setFeedbackToast('✅ Als telefonisch informiert dokumentiert');
      await onRefresh();
    } catch (err: unknown) {
      console.error('Error acknowledging cancellation contact:', err);
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
      alert('Fehler beim Speichern des Status: ' + msg);
    } finally {
      setLoadingActionId(null);
    }
  }, [onRefresh]);

  // 2. Einzelner Schüler: An Sekretariat delegieren
  const handleDelegateToSecretariat = useCallback(async (occurrenceId: string) => {
    try {
      setLoadingActionId(occurrenceId);
      const { error } = await supabase.rpc('delegate_cancellation_to_secretariat', {
        p_occurrence_id: occurrenceId
      });

      if (error) throw error;
      setFeedbackToast('🏢 Notfall-Auftrag an Schulsekretariat übergeben');
      await onRefresh();
    } catch (err: unknown) {
      console.error('Error delegating cancellation to secretariat:', err);
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
      alert('Fehler bei der Übergabe an das Sekretariat: ' + msg);
    } finally {
      setLoadingActionId(null);
    }
  }, [onRefresh]);

  // 3. Batch: Alle verbleibenden als informiert markieren (z. B. nach Rund-SMS)
  const handleBatchAcknowledge = useCallback(async () => {
    const unacknowledgedIds = items
      .filter(i => !i.teacher_contact_status && !i.student_acknowledged)
      .map(i => i.occurrence_id);

    if (unacknowledgedIds.length === 0) return;

    try {
      setIsBatchLoading(true);
      const { error } = await supabase.rpc('batch_acknowledge_teacher_cancellation_contact', {
        p_occurrence_ids: unacknowledgedIds,
        p_contact_type: 'reached'
      });

      if (error) throw error;
      setFeedbackToast(`✅ Alle ${unacknowledgedIds.length} Schüler als informiert markiert`);
      await onRefresh();
    } catch (err: unknown) {
      console.error('Error batch acknowledging cancellations:', err);
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
      alert('Fehler bei der Sammelquittierung: ' + msg);
    } finally {
      setIsBatchLoading(false);
    }
  }, [items, onRefresh]);

  // Escape-Taste fangen: Nur kontrollierter Snooze oder Schließen wenn allResolved
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (allResolved) {
        onClose();
      } else if (canSnooze) {
        onSnooze(15);
      }
    }
  }, [allResolved, canSnooze, onClose, onSnooze]);

  if (!isOpen || !items || items.length === 0) return null;

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="urgent-cancellations-title"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div 
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          borderRadius: '32px',
          border: '1.5px solid #fee2e2',
          boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.25), 0 0 0 1px rgba(239, 68, 68, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}
      >
        {/* Toast Feedback */}
        {feedbackToast && (
          <div 
            style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#0f172a',
              color: '#ffffff',
              padding: '8px 18px',
              borderRadius: '100px',
              fontSize: '0.85rem',
              fontWeight: 700,
              zIndex: 10,
              boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
              pointerEvents: 'none',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            {feedbackToast}
          </div>
        )}

        {/* 🚨 Header-Bereich */}
        <div 
          style={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)',
            borderBottom: '1px solid #fee2e2',
            padding: '24px 28px 20px 28px',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div 
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '18px',
                background: '#ef4444',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 8px 16px rgba(239, 68, 68, 0.3)'
              }}
            >
              <AlertTriangle size={28} strokeWidth={2.5} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span 
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 850,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    background: '#ef4444',
                    color: '#ffffff',
                    padding: '3px 8px',
                    borderRadius: '6px'
                  }}
                >
                  Sicherheits-Radar
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#991b1b' }}>
                  {items.length} unbestätigte{items.length === 1 ? 'r Ausfall' : ' Ausfälle'} heute
                </span>
              </div>

              <h2 
                id="urgent-cancellations-title"
                style={{
                  margin: 0,
                  fontSize: '1.42rem',
                  fontWeight: 950,
                  color: '#0f172a',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.25
                }}
              >
                Dringende Kontaktaufnahme erforderlich
              </h2>
            </div>
          </div>

          {/* Zero-PII Datenschutz- & Subsidiaritäts-Leitplanke */}
          <div 
            style={{
              marginTop: '16px',
              background: '#ffffff',
              border: '1px solid #fecaca',
              borderRadius: '14px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}
          >
            <Info size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
              <strong style={{ color: '#0f172a' }}>Schulrecht & Fürsorgepflicht:</strong> Die folgenden Schüler haben die Ausfallnachricht noch nicht geöffnet. Da Campus-Groovelab nach dem Zero-Knowledge-Prinzip zum Schutz von Minderjährigen <strong>keine Telefonnummern in der Cloud</strong> speichert, kontaktiere die Eltern bitte über deine privaten Kontakte/Schülerkartei oder übergebe den Fall mit 1 Klick an das Schulsekretariat.
            </p>
          </div>
        </div>

        {/* 📋 Liste der betroffenen Schüler (Scrollbereich) */}
        <div 
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          {items.map((item) => {
            const isAcknowledged = item.student_acknowledged;
            const contactStatus = item.teacher_contact_status;
            const isResolved = isAcknowledged || Boolean(contactStatus);
            const isItemLoading = loadingActionId === item.occurrence_id;

            return (
              <div 
                key={item.occurrence_id}
                style={{
                  background: isResolved ? '#f8fafc' : '#ffffff',
                  border: isResolved ? '1.5px solid #e2e8f0' : '1.5px solid #fee2e2',
                  borderRadius: '20px',
                  padding: '16px 18px',
                  boxShadow: isResolved ? 'none' : '0 4px 12px rgba(239, 68, 68, 0.05)',
                  transition: 'all 0.2s ease',
                  opacity: isItemLoading ? 0.6 : 1
                }}
              >
                {/* Obere Zeile: Zeit, Countdown & Status-Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span 
                      style={{
                        fontSize: '0.92rem',
                        fontWeight: 900,
                        color: '#0f172a',
                        background: '#f1f5f9',
                        padding: '3px 8px',
                        borderRadius: '8px',
                        fontFamily: 'monospace'
                      }}
                    >
                      {item.start_time.substring(0, 5)} Uhr
                    </span>

                    <span 
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 750,
                        color: item.minutes_until_start <= 30 ? '#dc2626' : '#ea580c',
                        background: item.minutes_until_start <= 30 ? '#fee2e2' : '#ffedd5',
                        padding: '3px 8px',
                        borderRadius: '100px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Clock size={11} strokeWidth={2.5} />
                      {item.minutes_until_start > 0 
                        ? `in ${item.minutes_until_start} Min.` 
                        : 'Jetzt fällig'}
                    </span>
                  </div>

                  {/* Status Pill */}
                  {isAcknowledged ? (
                    <span 
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: '#15803d',
                        background: '#dcfce7',
                        padding: '3px 10px',
                        borderRadius: '100px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <CheckCircle2 size={12} /> Digital bestätigt
                    </span>
                  ) : contactStatus === 'reached' ? (
                    <span 
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: '#15803d',
                        background: '#dcfce7',
                        padding: '3px 10px',
                        borderRadius: '100px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <PhoneCall size={12} /> Telefonisch erreicht
                    </span>
                  ) : contactStatus === 'voicemail' ? (
                    <span 
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: '#b45309',
                        background: '#fef3c7',
                        padding: '3px 10px',
                        borderRadius: '100px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Volume2 size={12} /> Mailbox besprochen
                    </span>
                  ) : contactStatus === 'delegated_to_secretariat' ? (
                    <span 
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: '#1d4ed8',
                        background: '#dbeafe',
                        padding: '3px 10px',
                        borderRadius: '100px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Building2 size={12} /> An Sekretariat delegiert
                    </span>
                  ) : (
                    <span 
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 850,
                        color: '#dc2626',
                        background: '#fee2e2',
                        padding: '3px 10px',
                        borderRadius: '100px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <AlertTriangle size={12} /> Noch unbestätigt
                    </span>
                  )}
                </div>

                {/* Schüler-Details */}
                <div style={{ marginBottom: '14px' }}>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                    {item.student_first_name} {item.student_last_name}
                  </h4>
                  <div style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>
                    {item.student_instrument} • Raum: {item.room_name}
                  </div>
                </div>

                {/* Aktionsleiste pro Schüler */}
                {!isResolved && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <button
                      type="button"
                      disabled={isItemLoading}
                      onClick={() => handleAcknowledgeSingle(item.occurrence_id, 'reached')}
                      style={{
                        flex: '1 1 auto',
                        minHeight: '38px',
                        background: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '8px 14px',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'background 0.15s'
                      }}
                    >
                      <PhoneCall size={14} />
                      <span>Ich habe Eltern erreicht</span>
                    </button>

                    <button
                      type="button"
                      disabled={isItemLoading}
                      onClick={() => handleAcknowledgeSingle(item.occurrence_id, 'voicemail')}
                      style={{
                        flex: '1 1 auto',
                        minHeight: '38px',
                        background: '#f8fafc',
                        color: '#334155',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '12px',
                        padding: '8px 14px',
                        fontSize: '0.82rem',
                        fontWeight: 750,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Volume2 size={14} />
                      <span>Mailbox besprochen</span>
                    </button>

                    <button
                      type="button"
                      disabled={isItemLoading}
                      onClick={() => handleDelegateToSecretariat(item.occurrence_id)}
                      style={{
                        flex: '1 1 auto',
                        minHeight: '38px',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1.5px solid #bfdbfe',
                        borderRadius: '12px',
                        padding: '8px 14px',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Building2 size={14} />
                      <span>An Sekretariat übergeben</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 🛡️ Footer-Aktionen & Dual-State Safety Gate */}
        <div 
          style={{
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            padding: '18px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          {/* Sammel-Quittierung (falls mehrere offen) */}
          {!allResolved && items.filter(i => !i.teacher_contact_status && !i.student_acknowledged).length > 1 && (
            <button
              type="button"
              disabled={isBatchLoading}
              onClick={handleBatchAcknowledge}
              style={{
                width: '100%',
                minHeight: '40px',
                background: '#ffffff',
                border: '1.5px solid #86efac',
                color: '#15803d',
                borderRadius: '14px',
                padding: '8px 16px',
                fontSize: '0.84rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              <CheckCircle2 size={16} />
              <span>Alle als telefonisch/per Rund-SMS informiert markieren</span>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            {/* Snooze-Option (nur aktiv wenn > 30 Min Restzeit) */}
            {canSnooze ? (
              <button
                type="button"
                onClick={() => onSnooze(15)}
                style={{
                  minHeight: '44px',
                  background: 'transparent',
                  border: '1.5px solid #cbd5e1',
                  color: '#475569',
                  borderRadius: '14px',
                  padding: '10px 18px',
                  fontSize: '0.84rem',
                  fontWeight: 750,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Clock size={15} />
                <span>In 15 Min. erinnern</span>
              </button>
            ) : (
              <div 
                style={{
                  fontSize: '0.75rem',
                  color: '#dc2626',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <AlertTriangle size={13} />
                <span>Unter 30 Min: Snooze gesperrt</span>
              </div>
            )}

            {/* Haupt-Abschluss-Button */}
            <button
              type="button"
              onClick={onClose}
              disabled={!allResolved}
              style={{
                minHeight: '44px',
                background: allResolved ? '#0f172a' : '#e2e8f0',
                color: allResolved ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '14px',
                padding: '10px 24px',
                fontSize: '0.88rem',
                fontWeight: 850,
                cursor: allResolved ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: allResolved ? '0 4px 12px rgba(15, 23, 42, 0.2)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <ShieldCheck size={17} />
              <span>{allResolved ? 'Alle erledigt & Weiter' : 'Bitte alle Schüler klären'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

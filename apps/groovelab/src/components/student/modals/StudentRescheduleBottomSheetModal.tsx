import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Check, X, MessageSquare, Lock, KeyRound, MapPin, User } from 'lucide-react';

export interface StudentRescheduleBottomSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  occurrence?: any;
  isLoading?: boolean;
  parentAllowRescheduleConfirm: boolean;
  studentUiLevel?: 'junior' | 'teen' | 'pro';
  onConfirmReschedule: (occId: string) => Promise<void>;
  onOpenChatInquiry: (teacher: any, suggestedText: string) => void;
  onVerifyParentPin?: (pin: string) => Promise<boolean>;
  teacherName?: string;
  teacherAvatarUrl?: string;
}

export const StudentRescheduleBottomSheetModal: React.FC<StudentRescheduleBottomSheetModalProps> = ({
  isOpen,
  onClose,
  occurrence,
  isLoading = false,
  parentAllowRescheduleConfirm,
  studentUiLevel = 'junior',
  onConfirmReschedule,
  onOpenChatInquiry,
  onVerifyParentPin,
  teacherName,
  teacherAvatarUrl
}) => {
  const [showInlinePin, setShowInlinePin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowInlinePin(false);
      setPinInput('');
      setPinError('');
      setIsVerifyingPin(false);
      setIsConfirming(false);
      setIsSuccess(false);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // ── 🍎 ZERO-FLICKER APPLE SKELETON STATE ───────────────────────────────────────
  if (isLoading || !occurrence) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Terminänderung wird geladen"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          padding: 0
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '480px',
            background: '#ffffff',
            borderRadius: '28px 28px 0 0',
            padding: '16px 20px 32px 20px',
            boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '2px 0 6px 0' }}>
            <div style={{ width: '38px', height: '4px', borderRadius: '2px', background: '#cbd5e1' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#f1f5f9', opacity: 0.8 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <div style={{ width: '35%', height: '12px', borderRadius: '6px', background: '#f1f5f9' }} />
              <div style={{ width: '65%', height: '18px', borderRadius: '6px', background: '#e2e8f0' }} />
            </div>
          </div>

          <div style={{
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '20px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ width: '30%', height: '14px', borderRadius: '6px', background: '#e2e8f0' }} />
            <div style={{ width: '80%', height: '22px', borderRadius: '8px', background: '#cbd5e1' }} />
            <div style={{ width: '45%', height: '26px', borderRadius: '8px', background: '#cbd5e1' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
            <div style={{ width: '100%', height: '52px', borderRadius: '18px', background: '#e2e8f0' }} />
            <div style={{ width: '100%', height: '44px', borderRadius: '16px', background: '#f1f5f9' }} />
          </div>
        </div>
      </div>
    );
  }

  const occ = occurrence;
  const resolvedTeacherName = teacherName || 
    (occ.teacher?.first_name ? `${occ.teacher.first_name} ${occ.teacher.last_name || ''}`.trim() : 'deiner Lehrkraft');
  const roomName = occ.room_override_name || occ.room_name || occ.schedule?.room?.name || 'Groovelab Raum';

  const origDateStr = occ.original_date
    ? new Date(occ.original_date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
    : null;
  const origTimeStr = occ.original_start_time ? occ.original_start_time.substring(0, 5) : null;

  const newDateStr = occ.date
    ? new Date(occ.date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    : '';
  const newTimeStr = occ.start_time ? occ.start_time.substring(0, 5) : '';
  const fullNewDateTime = `${newDateStr} um ${newTimeStr} Uhr`;

  const handleAccept = async () => {
    if (!occ?.id) return;
    setIsConfirming(true);
    try {
      await onConfirmReschedule(occ.id);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([40, 60, 40]);
        } catch (e) {}
      }
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1300);
    } catch (err) {
      console.error('[Reschedule Modal] Error confirming:', err);
      setIsConfirming(false);
    }
  };

  const handlePinSubmit = async (pinToVerify: string) => {
    if (!pinToVerify || pinToVerify.length !== 6) {
      setPinError('Bitte 6-stellige Eltern-Master-PIN eingeben');
      return;
    }
    setIsVerifyingPin(true);
    setPinError('');
    try {
      if (onVerifyParentPin) {
        const isValid = await onVerifyParentPin(pinToVerify);
        if (isValid) {
          await handleAccept();
        } else {
          setPinError('Falsche Eltern-PIN. Bitte erneut versuchen.');
          setPinInput('');
        }
      }
    } catch (err: any) {
      setPinError(err?.message || 'Prüfung fehlgeschlagen');
      setPinInput('');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleInquiry = () => {
    const suggestedText = `Hallo ${resolvedTeacherName}, die vorgeschlagene Verschiebung am ${newDateStr} um ${newTimeStr} Uhr passt mir leider nicht. Hättest du eine alternative Zeit?`;
    onOpenChatInquiry(occ.teacher, suggestedText);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Terminänderung bestätigen"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 0
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          background: '#ffffff',
          borderRadius: '28px 28px 0 0',
          padding: '16px 20px 28px 20px',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxSizing: 'border-box'
        }}
      >
        {/* Mobile Pull Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '2px 0 6px 0' }}>
          <div style={{ width: '38px', height: '4px', borderRadius: '2px', background: '#cbd5e1' }} />
        </div>

        {isSuccess ? (
          <div style={{
            padding: '36px 16px 44px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: '14px'
          }}>
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: '#dcfce7',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 10px rgba(34, 197, 94, 0.15)'
            }}>
              <Check size={38} strokeWidth={3} />
            </div>
            <h3 style={{ margin: '6px 0 0 0', fontSize: '1.28rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Termin bestätigt! 📅
            </h3>
            <p style={{ margin: 0, fontSize: '0.92rem', color: '#475569', fontWeight: 600, maxWidth: '320px', lineHeight: 1.45 }}>
              In deinem Kalender aktualisiert. <strong style={{ color: '#0f172a' }}>{resolvedTeacherName}</strong> wurde automatisch benachrichtigt.
            </p>
          </div>
        ) : (
          <>
        {/* Header with Teacher Profile & Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: '#fef3c7',
              color: '#b45309',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(217, 119, 6, 0.15)'
            }}>
              {teacherAvatarUrl ? (
                <img src={teacherAvatarUrl} alt={resolvedTeacherName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Clock size={22} strokeWidth={2.4} />
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                🔔 Terminänderung
              </span>
              <h3 style={{ margin: '1px 0 0 0', fontSize: '1.08rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                Verschiebung durch Lehrkraft
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        </div>

        {/* Schedule Comparison Card */}
        <div style={{
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          border: '1.5px solid #fde68a',
          borderRadius: '20px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {/* New Date (Highlighted in Green) */}
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '12px 14px',
            border: '1.5px solid #86efac',
            boxShadow: '0 2px 6px rgba(22, 163, 74, 0.08)'
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '3px' }}>
              🟢 Neuer Vorschlag
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 950, color: '#166534', letterSpacing: '-0.01em' }}>
              {newDateStr}
            </div>
            <div style={{ fontSize: '1.18rem', fontWeight: 950, color: '#15803d', marginTop: '2px' }}>
              {newTimeStr} Uhr
            </div>
          </div>

          {/* Original Date (Strikethrough) */}
          {(origDateStr || origTimeStr) && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 8px',
              background: 'rgba(255, 255, 255, 0.65)',
              borderRadius: '10px'
            }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Ursprünglicher Termin:</span>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8', textDecoration: 'line-through', fontWeight: 600 }}>
                {origDateStr ? `${origDateStr}, ` : ''}{origTimeStr ? `${origTimeStr} Uhr` : ''}
              </span>
            </div>
          )}

          {/* Teacher & Room Meta */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', fontSize: '0.76rem', color: '#78350f', fontWeight: 700 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <User size={13} /> {resolvedTeacherName}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={13} /> {roomName}
            </span>
          </div>
        </div>

        {/* Mode Evaluation: Permission Allowed vs Read-Only */}
        {parentAllowRescheduleConfirm ? (
          /* Scenario A: Student is permitted to accept */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={handleAccept}
              disabled={isConfirming}
              style={{
                width: '100%',
                minHeight: '52px',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '18px',
                fontSize: '1.02rem',
                fontWeight: 950,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(34, 197, 94, 0.35)',
                transition: 'transform 0.1s ease',
                opacity: isConfirming ? 0.7 : 1
              }}
            >
              <Check size={20} strokeWidth={3} />
              <span>{isConfirming ? 'Wird bestätigt...' : 'Neuen Termin annehmen'}</span>
            </button>

            <button
              type="button"
              onClick={handleInquiry}
              style={{
                width: '100%',
                minHeight: '48px',
                background: '#f8fafc',
                color: '#475569',
                border: '1.5px solid #cbd5e1',
                borderRadius: '18px',
                fontSize: '0.90rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <MessageSquare size={16} strokeWidth={2.4} />
              <span>Rückfrage / Passt mir nicht</span>
            </button>
          </div>
        ) : (
          /* Scenario B: Read-Only with Inline Parent PIN Option */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '2px' }}>
            {/* Read-Only Notice Box */}
            <div style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '16px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: '#e2e8f0',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Lock size={15} />
              </div>
              <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.4, fontWeight: 600 }}>
                Dieser Termin ist für dich vorgemerkt. Zum verbindlichen Bestätigen ist die Freigabe durch Erziehungsberechtigte hinterlegt.
              </div>
            </div>

            {/* Inline PIN Entry or Open Button */}
            {!showInlinePin ? (
              <button
                type="button"
                onClick={() => setShowInlinePin(true)}
                style={{
                  width: '100%',
                  minHeight: '50px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '18px',
                  fontSize: '0.95rem',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)'
                }}
              >
                <KeyRound size={18} strokeWidth={2.5} />
                <span>Als Elternteil freigeben (PIN)</span>
              </button>
            ) : (
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '20px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                  6-stellige Eltern-Master-PIN eingeben:
                </div>

                {pinError && (
                  <div style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: '#fee2e2',
                    color: '#dc2626',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    textAlign: 'center'
                  }}>
                    {pinError}
                  </div>
                )}

                {/* PIN Dots */}
                <div style={{ display: 'flex', gap: '8px', margin: '4px 0' }}>
                  {[0, 1, 2, 3, 4, 5].map((idx) => {
                    const isFilled = pinInput.length > idx;
                    return (
                      <div
                        key={idx}
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          background: isFilled ? '#0284c7' : '#cbd5e1',
                          transition: 'all 0.12s'
                        }}
                      />
                    );
                  })}
                </div>

                {/* Numeric Keypad */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  width: '100%',
                  maxWidth: '280px'
                }}>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => {
                    const isClear = key === 'C';
                    const isBack = key === '⌫';
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setPinError('');
                          if (isClear) {
                            setPinInput('');
                          } else if (isBack) {
                            setPinInput((prev) => prev.slice(0, -1));
                          } else if (pinInput.length < 6) {
                            const nextVal = pinInput + key;
                            setPinInput(nextVal);
                            if (nextVal.length === 6) {
                              handlePinSubmit(nextVal);
                            }
                          }
                        }}
                        style={{
                          padding: '12px',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          color: isClear ? '#ef4444' : isBack ? '#64748b' : '#0f172a',
                          fontSize: '1.1rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        {key}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setShowInlinePin(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginTop: '4px'
                  }}
                >
                  PIN-Eingabe abbrechen
                </button>
              </div>
            )}

            {/* Inquire Button */}
            <button
              type="button"
              onClick={handleInquiry}
              style={{
                width: '100%',
                minHeight: '48px',
                background: '#f8fafc',
                color: '#475569',
                border: '1.5px solid #cbd5e1',
                borderRadius: '18px',
                fontSize: '0.90rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <MessageSquare size={16} strokeWidth={2.4} />
              <span>Rückfrage / Passt mir nicht</span>
            </button>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert, Loader2 } from 'lucide-react';

export interface StudentToDelete {
  id: string;
  name: string;
  instrument?: string;
  teacherName?: string;
  isCampusActive?: boolean;
  isGroovelabActive?: boolean;
}

interface ConfirmDeleteStudentModalProps {
  isOpen: boolean;
  student: StudentToDelete | null;
  activePlatform?: 'campus' | 'groovelab' | 'all';
  onClose: () => void;
  onConfirm: (studentId: string) => Promise<void>;
}

export const ConfirmDeleteStudentModal: React.FC<ConfirmDeleteStudentModalProps> = ({
  isOpen,
  student,
  activePlatform = 'all',
  onClose,
  onConfirm
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset modal state when opened/closed
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setIsSubmitting(false);
      setError(null);
    }
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  const handleNextStep = () => {
    setStep(2);
  };

  const handleFinalConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(student.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Fehler beim Löschen des Schülers.');
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          animation: 'modalSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: step === 1 ? '#f8fafc' : '#fef2f2'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              backgroundColor: step === 1 ? '#fee2e2' : '#dc2626',
              color: step === 1 ? '#dc2626' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}>
              {step === 1 ? <Trash2 size={20} /> : <ShieldAlert size={20} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                {step === 1 ? 'Schüler entfernen' : 'Doppelte Bestätigung'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                {step === 1 ? 'Schritt 1 von 2' : 'Schritt 2 von 2 (Final)'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '1.5rem' }}>
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              fontWeight: 500
            }}>
              {error}
            </div>
          )}

          {step === 1 ? (
            <div>
              {/* Student Details Card */}
              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '16px',
                padding: '1rem 1.25rem',
                border: '1px solid #e2e8f0',
                marginBottom: '1.25rem'
              }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
                  {student.name}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.85rem', color: '#475569' }}>
                  {student.instrument && (
                    <span><strong>Instrument:</strong> {student.instrument}</span>
                  )}
                  {student.teacherName && (
                    <span><strong>Lehrer:</strong> {student.teacherName}</span>
                  )}
                </div>
              </div>

              {/* Warning Box */}
              <div style={{
                backgroundColor: '#fff1f2',
                border: '1px solid #ffe4e6',
                borderRadius: '16px',
                padding: '1rem 1.25rem',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start'
              }}>
                <AlertTriangle size={20} color="#e11d48" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.875rem', color: '#9f1239', lineHeight: 1.5 }}>
                  <strong>Achtung:</strong> Das Entfernen löscht den Schüler aus der Verwaltung von <strong>Campus-Groovelab</strong>. Alle Fortschritte, Song-Zuordnungen und Termine gehen unwiderruflich verloren.
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Step 2 Danger Confirmation Box */}
              <div style={{
                textAlign: 'center',
                padding: '1rem 0 0.5rem 0'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem auto'
                }}>
                  <ShieldAlert size={36} />
                </div>
                
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#991b1b' }}>
                  Bist du dir absolut sicher?
                </h4>
                <p style={{ margin: 0, fontSize: '0.925rem', color: '#475569', lineHeight: 1.5 }}>
                  Möchtest du den Schüler <strong style={{ color: '#0f172a' }}>"{student.name}"</strong> wirklich endgültig und unwiderruflich aus dem System löschen?
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          backgroundColor: '#fafafa'
        }}>
          {step === 1 ? (
            <>
              <button
                onClick={onClose}
                disabled={isSubmitting}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleNextStep}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#ea4335',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                Löschen fortfahren &rarr;
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(1)}
                disabled={isSubmitting}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer'
                }}
              >
                &larr; Zurück
              </button>
              <button
                onClick={handleFinalConfirm}
                disabled={isSubmitting}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)'
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Lösche Schüler...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Ja, Schüler jetzt unwiderruflich löschen
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

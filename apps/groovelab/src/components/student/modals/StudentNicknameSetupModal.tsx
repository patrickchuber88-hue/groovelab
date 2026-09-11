import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Dices, Check, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { generateRandomNickname, validateNickname } from '../../../utils/grooveNicknameGenerator';
import { supabase } from '../../../lib/supabase';

export interface StudentNicknameSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNickname?: string;
  isPublic?: boolean;
  studentFirstName?: string;
  studentLastName?: string;
  studentId?: string;
  teacherNames?: string[];
  onSaveSuccess: (savedNickname: string, isPublic: boolean) => void;
}

export const StudentNicknameSetupModal: React.FC<StudentNicknameSetupModalProps> = ({
  isOpen,
  onClose,
  currentNickname = '',
  isPublic = true,
  studentFirstName = '',
  studentLastName = '',
  studentId,
  teacherNames = [],
  onSaveSuccess
}) => {
  const [nicknameInput, setNicknameInput] = useState<string>(() => {
    return currentNickname.trim() || generateRandomNickname();
  });
  const [isSaving, setIsSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Sync initial nickname
  useEffect(() => {
    if (isOpen) {
      setNicknameInput(currentNickname.trim() || generateRandomNickname());
      setServerError(null);
    }
  }, [isOpen, currentNickname]);

  // Escape key handler for WCAG AA compliance
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validation = validateNickname(nicknameInput, studentFirstName, studentLastName, teacherNames);

  const handleRollDice = () => {
    let next = generateRandomNickname();
    // Falls zufällig der eigene Name oder ein Lehrername drin vorkommen sollte, nochmals würfeln
    while (!validateNickname(next, studentFirstName, studentLastName, teacherNames).isValid) {
      next = generateRandomNickname();
    }
    setNicknameInput(next);
    setServerError(null);
  };

  const handleSave = async () => {
    if (!validation.isValid) return;

    setIsSaving(true);
    setServerError(null);
    const cleanNick = nicknameInput.trim();

    try {
      // 1. Authoritative Backend RPC Call
      const { data, error } = await supabase.rpc('set_student_ranking_nickname', {
        p_nickname: cleanNick,
        p_is_public: isPublic
      });

      if (error) {
        console.warn('Backend RPC note:', error.message);
        if (
          error.message.includes('Rechtlicher Schutz') || 
          error.message.includes('Jugendschutz') ||
          error.message.includes('Schutz der Lehrkräfte') ||
          error.message.includes('bereits vergeben')
        ) {
          setServerError(error.message);
          setIsSaving(false);
          return;
        }
      }

      // 2. Client Fallback Cache in localStorage for resilience
      if (typeof localStorage !== 'undefined' && studentId) {
        localStorage.setItem(`cg_student_ranking_nickname_${studentId}`, cleanNick);
        localStorage.setItem(`cg_student_ranking_public_${studentId}`, JSON.stringify(isPublic));
      }

      onSaveSuccess(cleanNick, isPublic);
      onClose();
    } catch (err: any) {
      setServerError(err?.message || 'Fehler beim Speichern des Nicknames.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="nickname-modal-title"
    >
      <div
        ref={modalRef}
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          boxSizing: 'border-box'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)',
                flexShrink: 0
              }}
            >
              <Trophy size={22} color="#ffffff" strokeWidth={2.4} />
            </div>
            <div>
              <h2
                id="nickname-modal-title"
                style={{
                  margin: 0,
                  fontSize: '1.20rem',
                  fontWeight: 950,
                  color: '#0f172a',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}
              >
                Musiker-Nickname wählen
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 650 }}>
                Für die Hall of Groove. Dein echter Name bleibt geschützt!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Modal schließen"
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '10px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Info Box: Datenschutz & Jugendschutz */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}
        >
          <ShieldCheck size={18} color="#0284c7" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ margin: 0, fontSize: '0.74rem', color: '#475569', lineHeight: 1.45, fontWeight: 650 }}>
            <strong>100% anonym & sicher:</strong> Dein Nickname wird in allen Ranglisten der Musikschule angezeigt.
            Dein echter Vor- und Nachname wird niemals an Mitschüler weitergegeben.
          </p>
        </div>

        {/* Input & Generator Row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label
            htmlFor="nickname-input"
            style={{ fontSize: '0.80rem', fontWeight: 850, color: '#334155' }}
          >
            Dein Musiker-Spitzname
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              id="nickname-input"
              type="text"
              value={nicknameInput}
              onChange={(e) => {
                setNicknameInput(e.target.value);
                setServerError(null);
              }}
              placeholder="z. B. GroovyPanda"
              maxLength={24}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '12px',
                border: !validation.isValid ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                fontSize: '0.96rem',
                fontWeight: 850,
                color: '#0f172a',
                outline: 'none',
                background: '#ffffff',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}
            />
            <button
              type="button"
              onClick={handleRollDice}
              title="Zufälligen Namen würfeln"
              style={{
                background: '#fef3c7',
                border: '1.5px solid #fde68a',
                borderRadius: '12px',
                padding: '0 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                color: '#b45309',
                fontWeight: 850,
                fontSize: '0.78rem',
                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.15)'
              }}
            >
              <Dices size={18} color="#d97706" />
              <span>Würfeln</span>
            </button>
          </div>

          {/* Validation Feedback */}
          {!validation.isValid && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <AlertCircle size={14} color="#ef4444" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.74rem', color: '#ef4444', fontWeight: 700 }}>
                {validation.error}
              </span>
            </div>
          )}

          {serverError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <AlertCircle size={14} color="#ef4444" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.74rem', color: '#ef4444', fontWeight: 700 }}>
                {serverError}
              </span>
            </div>
          )}

          {validation.isValid && !serverError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <Check size={14} color="#16a34a" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 700 }}>
                Gültiger und geschützter Musiker-Name!
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              color: '#475569',
              fontSize: '0.86rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!validation.isValid || isSaving}
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              background: !validation.isValid || isSaving ? '#94a3b8' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.86rem',
              fontWeight: 950,
              cursor: !validation.isValid || isSaving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: !validation.isValid || isSaving ? 'none' : '0 4px 12px rgba(217, 119, 6, 0.30)'
            }}
          >
            <Check size={16} color="#ffffff" strokeWidth={2.8} />
            <span>{isSaving ? 'Wird gespeichert...' : 'Speichern & Beitreten'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

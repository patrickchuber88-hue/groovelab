import React, { useState, useEffect, useRef } from 'react';
import { Lock, Delete, X, ShieldCheck, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { resolveCampusStudentAvatar } from '../studentAvatars.constants';

export interface SiblingPinUnlockModalProps {
  sibling: {
    id: string;
    first_name: string;
    last_name?: string;
    photo_url?: string | null;
    instrument?: string;
    campus_ui_level?: 'junior' | 'teen' | 'pro';
  };
  onSuccess: (siblingId: string) => void;
  onClose: () => void;
}

export const SiblingPinUnlockModal: React.FC<SiblingPinUnlockModalProps> = ({
  sibling,
  onSuccess,
  onClose
}) => {
  const [pin, setPin] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [attempts, setAttempts] = useState<number>(0);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const avatarSrc = resolveCampusStudentAvatar(sibling);

  // Focus modal on mount & handle Escape / Keyboard input
  useEffect(() => {
    modalRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, isVerifying]);

  const handleDigit = (digit: string) => {
    if (isVerifying || pin.length >= 4) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    setErrorMsg('');

    if (nextPin.length === 4) {
      verifyPin(nextPin);
    }
  };

  const handleBackspace = () => {
    if (isVerifying) return;
    setPin(prev => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    if (isVerifying) return;
    setPin('');
    setErrorMsg('');
  };

  const verifyPin = async (inputPin: string) => {
    setIsVerifying(true);
    setErrorMsg('');

    try {
      // 🛡️ Autoritative Server-Side PIN-Verifikation (OWASP ASVS Level 3)
      const { data: pinOk, error: rpcErr } = await supabase.rpc('verify_personal_pin', {
        user_uuid: sibling.id,
        input_pin: inputPin
      });

      if (rpcErr || pinOk !== true) {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);

        if (nextAttempts >= 5) {
          setErrorMsg('Zu viele Fehlversuche. Bitte frage deine Eltern oder Lehrkraft.');
        } else {
          setErrorMsg(`Falsche PIN. Noch ${5 - nextAttempts} Versuche.`);
        }
        setPin('');
        setIsVerifying(false);
        return;
      }

      // Erfolgreich verifiziert!
      setIsVerifying(false);
      onSuccess(sibling.id);
    } catch (err: any) {
      console.error('[SiblingPinUnlockModal] RPC error:', err);
      setErrorMsg('Verbindungsfehler bei der PIN-Prüfung.');
      setIsVerifying(false);
      setPin('');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Schüler-PIN für ${sibling.first_name} eingeben`}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '32px',
          width: '100%',
          maxWidth: '380px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '30px 24px 26px 24px',
          position: 'relative',
          animation: isShaking ? 'shake 0.4s cubic-bezier(.36,.07,.19,.97) both' : 'none',
          outline: 'none'
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Abbrechen und schließen"
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: 'none',
            background: '#f1f5f9',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 0.15s ease'
          }}
          className="hover-scale"
        >
          <X size={18} />
        </button>

        {/* Sibling Avatar with Lock Badge */}
        <div style={{ position: 'relative', marginBottom: '14px' }}>
          <img
            src={avatarSrc}
            alt={sibling.first_name}
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '24px',
              objectFit: 'cover',
              background: '#f8fafc',
              border: '3px solid #e0f2fe',
              boxShadow: '0 8px 20px -4px rgba(2, 132, 199, 0.25)'
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-4px',
              right: '-4px',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#0284c7',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.4)',
              border: '2px solid #ffffff'
            }}
          >
            <Lock size={14} strokeWidth={2.5} />
          </div>
        </div>

        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: 950,
            color: '#0f172a',
            letterSpacing: '-0.02em'
          }}>
            Zu {sibling.first_name} wechseln
          </h2>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '0.82rem',
            color: '#64748b',
            fontWeight: 600
          }}>
            {sibling.instrument ? `${sibling.instrument} · ` : ''}Bitte gib die 4-stellige Schüler-PIN ein
          </p>
        </div>

        {/* PIN Dots (Visual Feedback) */}
        <div
          style={{
            display: 'flex',
            gap: '14px',
            marginBottom: '16px',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          aria-label={`${pin.length} von 4 Ziffern eingegeben`}
        >
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            const isCurrent = pin.length === idx;
            return (
              <div
                key={idx}
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: isFilled ? '#0284c7' : '#f1f5f9',
                  border: isCurrent
                    ? '2px solid #0284c7'
                    : isFilled
                      ? '2px solid #0284c7'
                      : '2px solid #cbd5e1',
                  transform: isFilled ? 'scale(1.15)' : 'scale(1)',
                  boxShadow: isFilled ? '0 0 8px rgba(2, 132, 199, 0.4)' : 'none',
                  transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              />
            );
          })}
        </div>

        {/* Error message */}
        {errorMsg && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#dc2626',
              fontSize: '0.78rem',
              fontWeight: 750,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              padding: '6px 12px',
              borderRadius: '100px',
              marginBottom: '14px'
            }}
          >
            <AlertCircle size={14} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Keypad Grid (1-9, C, 0, Backspace) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            width: '100%',
            maxWidth: '280px',
            marginBottom: '12px'
          }}
        >
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              disabled={isVerifying}
              style={{
                height: '56px',
                borderRadius: '18px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                fontSize: '1.45rem',
                fontWeight: 850,
                color: '#0f172a',
                cursor: isVerifying ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                transition: 'all 0.12s ease'
              }}
              className="hover-scale"
            >
              {digit}
            </button>
          ))}

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClear}
            disabled={isVerifying || pin.length === 0}
            style={{
              height: '56px',
              borderRadius: '18px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 800,
              color: '#64748b',
              cursor: pin.length === 0 ? 'default' : 'pointer',
              opacity: pin.length === 0 ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.12s ease'
            }}
            className="hover-scale"
          >
            C
          </button>

          {/* Zero */}
          <button
            type="button"
            onClick={() => handleDigit('0')}
            disabled={isVerifying}
            style={{
              height: '56px',
              borderRadius: '18px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              fontSize: '1.45rem',
              fontWeight: 850,
              color: '#0f172a',
              cursor: isVerifying ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              transition: 'all 0.12s ease'
            }}
            className="hover-scale"
          >
            0
          </button>

          {/* Backspace Button */}
          <button
            type="button"
            onClick={handleBackspace}
            disabled={isVerifying || pin.length === 0}
            aria-label="Letzte Ziffer löschen"
            style={{
              height: '56px',
              borderRadius: '18px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#64748b',
              cursor: pin.length === 0 ? 'default' : 'pointer',
              opacity: pin.length === 0 ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.12s ease'
            }}
            className="hover-scale"
          >
            <Delete size={20} />
          </button>
        </div>

        {/* Security Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.72rem',
            color: '#64748b',
            fontWeight: 650,
            marginTop: '4px'
          }}
        >
          <ShieldCheck size={14} color="#0284c7" />
          <span>Geschützter Geschwister-Bereich (Elternfreigabe)</span>
        </div>
      </div>
    </div>
  );
};

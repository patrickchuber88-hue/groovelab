import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Lock, X, Delete, AlertCircle } from 'lucide-react';

interface StepUpPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (pin: string) => Promise<boolean | void> | boolean | void;
  studentName?: string;
  title?: string;
  description?: string;
}

export const StepUpPinModal: React.FC<StepUpPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  studentName,
  title = 'Identitätsnachweis erforderlich',
  description = 'Bitte bestätige deine persönliche 4-stellige Lehrer-PIN, um behördliche Klarnamen für 60 Sekunden freizugeben.'
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
      setIsSubmitting(false);
      // Auto-focus input
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDigit = async (digit: string) => {
    if (isSubmitting || pin.length >= 4) return;
    setError(null);
    const nextPin = pin + digit;
    setPin(nextPin);

    if (nextPin.length === 4) {
      submitPin(nextPin);
    }
  };

  const handleDelete = () => {
    if (isSubmitting || pin.length === 0) return;
    setError(null);
    setPin(prev => prev.slice(0, -1));
  };

  const submitPin = async (pinToSubmit: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const ok = await onSuccess(pinToSubmit);
      if (ok === false) {
        setError('Ungültige PIN. Zugriff verweigert.');
        setPin('');
        setIsSubmitting(false);
        inputRef.current?.focus();
      } else {
        // Success: modal will be closed by caller or auto-close
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Ungültige PIN. Bitte erneut versuchen.');
      setPin('');
      setIsSubmitting(false);
      inputRef.current?.focus();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(val);
    setError(null);
    if (val.length === 4) {
      submitPin(val);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="step-up-title"
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '28px 24px',
          maxWidth: '380px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '36px',
            height: '36px',
            borderRadius: '12px',
            border: 'none',
            background: '#f1f5f9',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        {/* Shield Icon Badge */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '18px',
              background: '#fef3c7',
              color: '#d97706',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
              boxShadow: '0 4px 12px rgba(217, 119, 6, 0.15)'
            }}
          >
            <ShieldCheck size={28} strokeWidth={2.2} />
          </div>
          <h2
            id="step-up-title"
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#0f172a',
              margin: '0 0 6px 0',
              fontFamily: 'Plus Jakarta Sans, sans-serif'
            }}
          >
            {title}
          </h2>
          {studentName && (
            <div
              style={{
                display: 'inline-block',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '3px 10px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#475569',
                marginBottom: '8px'
              }}
            >
              Schüler: {studentName}
            </div>
          )}
          <p
            style={{
              fontSize: '13px',
              color: '#64748b',
              margin: 0,
              lineHeight: 1.45
            }}
          >
            {description}
          </p>
        </div>

        {/* Hidden Native Input for physical/virtual keyboard */}
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={pin}
          onChange={handleInputChange}
          style={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: 'none',
            top: 0,
            left: 0
          }}
          aria-hidden="true"
        />

        {/* 4-Digit PIN Indicators (Anti-Peeking Bullets) */}
        <div
          onClick={() => inputRef.current?.focus()}
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '14px',
            margin: '20px 0 24px 0',
            cursor: 'pointer'
          }}
        >
          {[0, 1, 2, 3].map(idx => {
            const isFilled = pin.length > idx;
            const isCurrent = pin.length === idx;
            return (
              <div
                key={idx}
                style={{
                  width: '52px',
                  height: '56px',
                  borderRadius: '16px',
                  border: isCurrent
                    ? '2px solid #d97706'
                    : isFilled
                    ? '2px solid #f59e0b'
                    : '2px solid #e2e8f0',
                  background: isFilled ? '#fffbeb' : '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  boxShadow: isCurrent ? '0 0 0 3px rgba(245, 158, 11, 0.2)' : 'none'
                }}
              >
                {isFilled ? (
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: '#d97706'
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#cbd5e1'
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 14px',
              background: '#fef2f2',
              border: 'none',
              borderRadius: '12px',
              color: '#dc2626',
              fontSize: '13px',
              fontWeight: 500,
              marginBottom: '16px'
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* On-Screen Numeric Keypad for Tablets & Touch Devices */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            marginBottom: '10px'
          }}
        >
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
            <button
              key={d}
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDigit(d)}
              style={{
                height: '48px',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                fontSize: '18px',
                fontWeight: 600,
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'background 0.1s ease',
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent'
              }}
              onMouseDown={e => (e.currentTarget.style.background = '#f1f5f9')}
              onMouseUp={e => (e.currentTarget.style.background = '#ffffff')}
              onTouchStart={e => (e.currentTarget.style.background = '#f1f5f9')}
              onTouchEnd={e => (e.currentTarget.style.background = '#ffffff')}
            >
              {d}
            </button>
          ))}
          <div />
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleDigit('0')}
            style={{
              height: '48px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              fontSize: '18px',
              fontWeight: 600,
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
            onMouseDown={e => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseUp={e => (e.currentTarget.style.background = '#ffffff')}
            onTouchStart={e => (e.currentTarget.style.background = '#f1f5f9')}
            onTouchEnd={e => (e.currentTarget.style.background = '#ffffff')}
          >
            0
          </button>
          <button
            type="button"
            disabled={isSubmitting || pin.length === 0}
            onClick={handleDelete}
            aria-label="Löschen"
            style={{
              height: '48px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              background: pin.length > 0 ? '#f8fafc' : '#f1f5f9',
              color: pin.length > 0 ? '#475569' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: pin.length > 0 && !isSubmitting ? 'pointer' : 'not-allowed',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            <Delete size={20} />
          </button>
        </div>

        {/* Security Footer Note */}
        <div
          style={{
            textAlign: 'center',
            fontSize: '11px',
            color: '#94a3b8',
            marginTop: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <Lock size={12} />
          <span>5-Minuten-Grace-Period • BSI TR-02102-1</span>
        </div>
      </div>
    </div>
  );
};

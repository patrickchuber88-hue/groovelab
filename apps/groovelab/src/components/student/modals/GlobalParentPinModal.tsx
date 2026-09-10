import React from "react";
import { Lock, Fingerprint } from "lucide-react";
import { isWebAuthnSupported } from "../../../utils/webauthn";

export interface GlobalParentPinModalProps {
  isOpen: boolean;
  studentUiLevel: 'junior' | 'teen' | 'pro';
  globalPinError: string;
  globalPinInput: string;
  setGlobalPinInput: React.Dispatch<React.SetStateAction<string>>;
  setGlobalPinError: React.Dispatch<React.SetStateAction<string>>;
  onVerify: (pin: string) => void;
  onBiometricUnlock?: () => void;
  isVerifyingBiometric?: boolean;
  onClose: () => void;
}

export const GlobalParentPinModal: React.FC<GlobalParentPinModalProps> = ({
  isOpen,
  studentUiLevel,
  globalPinError,
  globalPinInput,
  setGlobalPinInput,
  setGlobalPinError,
  onVerify,
  onBiometricUnlock,
  isVerifyingBiometric,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.15s ease'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '28px',
          maxWidth: '380px',
          width: '100%',
          padding: '30px 24px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}
      >
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '20px',
          background: '#e0f2fe',
          color: '#0284c7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Lock size={28} />
        </div>

        <div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
            {studentUiLevel === 'junior' ? '👨‍👩‍👧 Geschützter Elternbereich' : 'Eltern Master-PIN'}
          </h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4, fontWeight: 500 }}>
            {studentUiLevel === 'junior'
              ? 'Möchtest du eine Musikstunde absagen oder Einstellungen ändern? Gib bitte deinen Eltern Bescheid – Termine können nur Erwachsene mit der 6-stelligen Eltern-PIN verwalten.'
              : 'Diese Funktion ist durch den Elternbereich geschützt. Bitte gib deine 6-stellige Eltern-Master-PIN ein.'}
          </p>
        </div>

        {globalPinError && (
          <div style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '10px',
            background: '#fee2e2',
            color: '#dc2626',
            fontSize: '0.78rem',
            fontWeight: 700
          }}>
            {globalPinError}
          </div>
        )}

        {/* PIN Display Dots (6-stellig) */}
        <div style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'center',
          margin: '8px 0'
        }}>
          {[0, 1, 2, 3, 4, 5].map(idx => {
            const isFilled = globalPinInput.length > idx;
            return (
              <div
                key={idx}
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: isFilled ? '#0284c7' : '#e2e8f0',
                  border: isFilled ? '2px solid #0284c7' : '2px solid #cbd5e1',
                  transition: 'all 0.15s ease',
                  transform: isFilled ? 'scale(1.15)' : 'scale(1)'
                }}
              />
            );
          })}
        </div>

        {/* Touch Keypad */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          width: '100%',
          marginTop: '6px'
        }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => {
            const isClear = key === 'C';
            const isBack = key === '⌫';
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setGlobalPinError('');
                  if (isClear) {
                    setGlobalPinInput('');
                  } else if (isBack) {
                    setGlobalPinInput(prev => prev.slice(0, -1));
                  } else if (globalPinInput.length < 6) {
                    const nextVal = globalPinInput + key;
                    setGlobalPinInput(nextVal);
                    if (nextVal.length === 6) {
                      onVerify(nextVal);
                    }
                  }
                }}
                style={{
                  padding: '14px',
                  borderRadius: '16px',
                  border: '1.5px solid #f1f5f9',
                  background: isClear || isBack ? '#f8fafc' : '#ffffff',
                  color: isClear ? '#ef4444' : isBack ? '#64748b' : '#0f172a',
                  fontSize: isBack ? '1.1rem' : '1.25rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
                  transition: 'all 0.12s ease'
                }}
                className="hover-scale"
              >
                {key}
              </button>
            );
          })}
        </div>

        {/* Biometric Passkey Unlock (Face ID / Touch ID) */}
        {onBiometricUnlock && isWebAuthnSupported() && (
          <button
            type="button"
            disabled={isVerifyingBiometric}
            onClick={onBiometricUnlock}
            style={{
              marginTop: '4px',
              width: '100%',
              padding: '12px 16px',
              borderRadius: '16px',
              border: '1px solid #bae6fd',
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              color: '#0284c7',
              fontSize: '0.88rem',
              fontWeight: 800,
              cursor: isVerifyingBiometric ? 'not-allowed' : 'pointer',
              opacity: isVerifyingBiometric ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.08)',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale"
          >
            <Fingerprint size={20} />
            <span>{isVerifyingBiometric ? 'Wird geprüft...' : 'Mit Face ID / Touch ID entsperren'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: '4px',
            padding: '10px 18px',
            borderRadius: '100px',
            background: '#f1f5f9',
            color: '#64748b',
            border: 'none',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
};

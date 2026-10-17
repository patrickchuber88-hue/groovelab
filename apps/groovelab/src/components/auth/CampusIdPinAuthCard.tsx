import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, Delete, X, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';

export interface CampusIdPinAuthCardProps {
  isGroovelabKiosk?: boolean;
  schoolNumber?: string;
  pinLockoutSeconds?: number;
  loading?: boolean;
  onSubmitId: (idOrCode: string) => Promise<void>;
  brandAccentColor?: string;
  brandPrimaryColor?: string;
  brandActiveTabColor?: string;
}

/**
 * 🪪 CampusIdPinAuthCard (0,1% Apple Goldstandard Architecture)
 * Bounded Context: Core Authentication / Identity Gateway (SEC-92)
 * 
 * Ersetzt das alte, überladene Tastenfeld durch das einheitliche,
 * barrierefreie und haptische Apple HIG Design (100% Parität mit GlobalParentPinModal).
 * 
 * Features:
 * - 0% Cryptic Buttons (vollständige Eliminierung von 001-S-, +S, +L, +V)
 * - Kanonisches 3x4 Squircle Numpad ('1'-'9', 'C', '0', '⌫')
 * - Fitts's Law Touch-Targets (>= 52px, Radius 16px, scale(0.94) Haptik)
 * - Vollständige Tastatur-Bedienbarkeit (0-9, Backspace, Enter)
 * - Nahtlose 2FA-Vorbereitung (Schritt 1: Ausweis-ID -> Schritt 2: Persönliche PIN)
 */
export const CampusIdPinAuthCard: React.FC<CampusIdPinAuthCardProps> = ({
  isGroovelabKiosk = false,
  schoolNumber = '001',
  pinLockoutSeconds = 0,
  loading = false,
  onSubmitId,
  brandAccentColor = '#4ade80',
  brandPrimaryColor = '#16a34a',
  brandActiveTabColor = '#ffffff'
}) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isLocked = pinLockoutSeconds > 0;
  const isSubmitDisabled = loading || isLocked || !inputValue.trim();

  // Tastatur-Listener für native Eingabe ohne Klickzwang (Apple Desktop / Mac)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Wenn der Fokus in einem anderen interaktiven Element liegt, nicht doppelt erfassen
      if (document.activeElement && document.activeElement !== inputRef.current && (
        document.activeElement.tagName === 'INPUT' || 
        document.activeElement.tagName === 'TEXTAREA'
      )) {
        return;
      }

      if (isLocked || loading) return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        setInputValue(prev => (prev + e.key).slice(0, 16));
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setInputValue(prev => prev.slice(0, -1));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setInputValue('');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (inputValue.trim()) {
          handleSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputValue, isLocked, loading]);

  const handleSubmit = () => {
    if (isSubmitDisabled) return;
    onSubmitId(inputValue.trim());
  };

  const handleKeypadPress = (key: string) => {
    if (isLocked || loading) return;

    if (key === 'C') {
      setInputValue('');
      inputRef.current?.focus();
    } else if (key === '⌫') {
      setInputValue(prev => prev.slice(0, -1));
      inputRef.current?.focus();
    } else {
      setInputValue(prev => (prev + key).slice(0, 16));
      inputRef.current?.focus();
    }
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];

  return (
    <div 
      style={{ 
        width: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '14px',
        animation: 'fadeIn 0.18s ease-out'
      }}
    >
      {/* Kopfzeile & Erklärung */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ 
          margin: '0 0 4px 0', 
          fontSize: '13.5px', 
          fontWeight: 700, 
          color: isGroovelabKiosk ? '#fde68a' : '#e2e8f0',
          letterSpacing: '-0.01em'
        }}>
          Ausweis-Nummer eingeben
        </p>
        <p style={{ 
          margin: 0, 
          fontSize: '11px', 
          fontWeight: 500, 
          color: isGroovelabKiosk ? 'rgba(253, 230, 138, 0.75)' : 'rgba(203, 213, 225, 0.75)'
        }}>
          Danach bestätigst du deinen Login mit deiner persönlichen PIN.
        </p>
      </div>

      {/* Eingabefeld mit Floating-Clear Button */}
      <form 
        onSubmit={(e) => { 
          e.preventDefault(); 
          handleSubmit(); 
        }} 
        style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}
      >
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            ref={inputRef}
            id="login-credential-input"
            name="campus_credential_code"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            data-1p-ignore="true"
            data-lpignore="true"
            aria-label="Ausweis-Nummer eingeben"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isLocked ? `Gesperrt (${pinLockoutSeconds}s)` : "z.B. 42 oder 001-S-42"}
            disabled={loading || isLocked}
            autoFocus
            style={{
              width: '100%', 
              boxSizing: 'border-box', 
              padding: '13px 44px 13px 18px', 
              borderRadius: '16px',
              border: isGroovelabKiosk ? '1.5px solid rgba(250, 204, 21, 0.45)' : '1.5px solid rgba(74, 222, 128, 0.40)',
              fontSize: '19px', 
              fontWeight: 800, 
              textAlign: 'center', 
              outline: 'none',
              background: isGroovelabKiosk ? 'rgba(0, 0, 0, 0.40)' : 'rgba(255, 255, 255, 0.10)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.25)',
              color: '#ffffff', 
              letterSpacing: inputValue.length > 0 && /^\d+$/.test(inputValue) ? '0.12em' : 'normal',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = brandAccentColor;
              e.currentTarget.style.boxShadow = `0 0 0 3px ${isGroovelabKiosk ? 'rgba(250, 204, 21, 0.25)' : 'rgba(74, 222, 128, 0.25)'}`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = isGroovelabKiosk ? 'rgba(250, 204, 21, 0.45)' : 'rgba(74, 222, 128, 0.40)';
              e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.25)';
            }}
          />

          {inputValue.length > 0 && !loading && !isLocked && (
            <button
              type="button"
              onClick={() => {
                setInputValue('');
                inputRef.current?.focus();
              }}
              aria-label="Eingabe leeren"
              style={{
                position: 'absolute', 
                right: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                background: 'rgba(255, 255, 255, 0.18)', 
                border: 'none', 
                borderRadius: '50%',
                width: '26px', 
                height: '26px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#ffffff', 
                cursor: 'pointer', 
                padding: 0,
                transition: 'background 0.12s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.28)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* 🔢 Kanonisches 3x4 Apple Numpad (Parität mit GlobalParentPinModal) */}
        <div 
          style={{
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '8px',
            width: '100%', 
            padding: '2px 0'
          }}
        >
          {keys.map((key) => {
            const isClear = key === 'C';
            const isBack = key === '⌫';
            const isAction = isClear || isBack;
            const ariaLabel = isClear ? 'Eingabe vollständig löschen' : isBack ? 'Letztes Zeichen löschen' : `Ziffer ${key}`;

            return (
              <button
                key={key}
                type="button"
                aria-label={ariaLabel}
                disabled={loading || isLocked}
                onClick={() => handleKeypadPress(key)}
                style={{
                  height: '52px', 
                  borderRadius: '16px', 
                  border: isAction 
                    ? '1px solid rgba(255, 255, 255, 0.12)' 
                    : (isGroovelabKiosk ? '1px solid rgba(250, 204, 21, 0.28)' : '1px solid rgba(255, 255, 255, 0.16)'),
                  background: isAction 
                    ? (isClear ? 'rgba(239, 68, 68, 0.14)' : 'rgba(0, 0, 0, 0.32)') 
                    : (isGroovelabKiosk ? 'rgba(250, 204, 21, 0.10)' : 'rgba(255, 255, 255, 0.09)'),
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  color: isClear ? '#fca5a5' : isBack ? '#cbd5e1' : '#ffffff',
                  fontSize: isBack ? '1.15rem' : '1.3rem', 
                  fontWeight: 800, 
                  cursor: (loading || isLocked) ? 'not-allowed' : 'pointer',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  transition: 'transform 0.08s ease, background 0.12s ease', 
                  userSelect: 'none', 
                  touchAction: 'manipulation'
                }}
                onMouseDown={(e) => { 
                  if (!loading && !isLocked) e.currentTarget.style.transform = 'scale(0.92)'; 
                }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'none'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
              >
                {isBack ? <Delete size={20} strokeWidth={2.2} /> : key}
              </button>
            );
          })}
        </div>

        {/* Action Button: Weiter zur PIN-Eingabe */}
        <button
          type="submit"
          disabled={isSubmitDisabled}
          style={{
            width: '100%', 
            padding: '14px 20px', 
            borderRadius: '16px', 
            border: 'none',
            background: isSubmitDisabled
              ? (isLocked ? '#64748b' : 'rgba(255, 255, 255, 0.10)')
              : brandPrimaryColor,
            color: isSubmitDisabled
              ? (isLocked ? '#ffffff' : 'rgba(255, 255, 255, 0.40)')
              : brandActiveTabColor,
            fontSize: '14.5px', 
            fontWeight: 800,
            cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            boxShadow: isSubmitDisabled ? 'none' : '0 4px 16px rgba(0, 0, 0, 0.25)',
            transition: 'all 0.15s ease'
          }}
          onMouseDown={(e) => {
            if (!isSubmitDisabled) e.currentTarget.style.transform = 'scale(0.98)';
          }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'none'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
        >
          {loading ? (
            <span>Prüfe Ausweis-ID...</span>
          ) : isLocked ? (
            <span>Gesperrt ({pinLockoutSeconds}s)</span>
          ) : (
            <>
              <span>Weiter zur PIN-Eingabe</span>
              <ArrowRight size={16} strokeWidth={2.4} />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { GraduationCap, Music2, Building2, Delete, X, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

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

export interface ResolvedAusweisIdentity {
  canonicalId: string;
  displayLabel: string;
  role: 'student' | 'teacher' | 'admin' | 'unknown';
  supportId?: string;
}

/**
 * 0,1% Goldstandard Smart Ausweis-Resolver
 * Löst Rollen und Nummern (z.B. "1-42", "2-1", "3-1", "42", "00110042") nahtlos zur kanonischen ID auf
 * und generiert sowohl ein barrierefreies Display-Label als auch die globale numerische Support-ID.
 * 
 * Rollen-Schema:
 * - 1 = Schüler / Student (Standard)
 * - 2 = Lehrkraft / Dozent
 * - 3 = Schulleitung / Verwaltung
 */
export function resolveAusweisIdentity(rawInput: string, schoolNumber: string = '001'): ResolvedAusweisIdentity {
  const clean = rawInput.trim().toUpperCase().replace(/\s+/g, '');
  if (!clean) {
    return { canonicalId: '', displayLabel: '', role: 'unknown' };
  }

  const snum = (schoolNumber || '001').padStart(3, '0');

  // 1. 6-stellige reine Ziffern (z.B. Schulleitungs-PIN oder Notfall-Bypass):
  if (/^\d{6}$/.test(clean)) {
    return { canonicalId: clean, displayLabel: 'Schulleitungs-Code', role: 'admin', supportId: clean };
  }

  // 2. Bereits kanonisch mit Buchstabe (z.B. 001-S-0042, 001-L-0003, 001-V-0001):
  const canonMatch = clean.match(/^(\d{3})-([SLV])-(\d{1,4})$/);
  if (canonMatch) {
    const [, sch, letter, seq] = canonMatch;
    const padded = seq.padStart(4, '0');
    const role = letter === 'S' ? 'student' : letter === 'L' ? 'teacher' : 'admin';
    const roleDigit = letter === 'S' ? '1' : letter === '2' ? '2' : '3';
    const label = letter === 'S' 
      ? `Schülerausweis #${padded}` 
      : letter === 'L' 
        ? `Lehrerausweis #${padded}` 
        : `Verwaltungsausweis #${padded}`;
    return {
      canonicalId: `${sch}-${letter}-${padded}`,
      displayLabel: label,
      role,
      supportId: `${sch}-${roleDigit}-${padded}`
    };
  }

  // 3. Kurzformat mit Bindestrich: Rolle & Nummer (z.B. "1-42", "2-1", "3-1"):
  const shortRoleMatch = clean.match(/^([123])-(\d{1,4})$/);
  if (shortRoleMatch) {
    const [, roleDigit, seq] = shortRoleMatch;
    const letter = roleDigit === '1' ? 'S' : roleDigit === '2' ? 'L' : 'V';
    const role = roleDigit === '1' ? 'student' : roleDigit === '2' ? 'teacher' : 'admin';
    const padded = seq.padStart(4, '0');
    const label = role === 'student' 
      ? `Schülerausweis #${padded}` 
      : role === 'teacher' 
        ? `Lehrerausweis #${padded}` 
        : `Verwaltungsausweis #${padded}`;
    return {
      canonicalId: `${snum}-${letter}-${padded}`,
      displayLabel: label,
      role,
      supportId: `${snum}-${roleDigit}-${padded}`
    };
  }

  // 4. Vollformat mit Ziffern-Rolle (z.B. "001-1-0042", "001-2-0001") oder 8 Ziffern ("00110042"):
  const fullNumericMatch = clean.match(/^(\d{3})-?([123])-?(\d{1,4})$/);
  if (fullNumericMatch) {
    const [, sch, roleDigit, seq] = fullNumericMatch;
    const letter = roleDigit === '1' ? 'S' : roleDigit === '2' ? 'L' : 'V';
    const role = roleDigit === '1' ? 'student' : roleDigit === '2' ? 'teacher' : 'admin';
    const padded = seq.padStart(4, '0');
    const label = role === 'student' 
      ? `Schülerausweis #${padded}` 
      : role === 'teacher' 
        ? `Lehrerausweis #${padded}` 
        : `Verwaltungsausweis #${padded}`;
    return {
      canonicalId: `${sch}-${letter}-${padded}`,
      displayLabel: label,
      role,
      supportId: `${sch}-${roleDigit}-${padded}`
    };
  }

  // 5. 7 Ziffern (Schulnummer + Schülersequenz, z.B. 0010042):
  const sevenDigitMatch = clean.replace(/-/g, '').match(/^(\d{3})(\d{1,4})$/);
  if (sevenDigitMatch && clean.replace(/-/g, '').length >= 5) {
    const [, sch, seq] = sevenDigitMatch;
    const padded = seq.padStart(4, '0');
    return {
      canonicalId: `${sch}-S-${padded}`,
      displayLabel: `Schülerausweis #${padded}`,
      role: 'student',
      supportId: `${sch}-1-${padded}`
    };
  }

  // 6. Reine kurze Ziffernfolge (1 bis 4 Ziffern, z.B. "42" oder "1"):
  // Permissiver Fallback: Schüler sind Rolle 1!
  if (/^\d{1,4}$/.test(clean)) {
    const padded = clean.padStart(4, '0');
    return {
      canonicalId: `${snum}-S-${padded}`,
      displayLabel: `Schülerausweis #${padded}`,
      role: 'student',
      supportId: `${snum}-1-${padded}`
    };
  }

  return { canonicalId: clean, displayLabel: '', role: 'unknown' };
}

export function resolveCanonicalAusweisId(rawInput: string, schoolNumber: string = '001'): string {
  return resolveAusweisIdentity(rawInput, schoolNumber).canonicalId;
}

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
  // Option C: Schüler (1) ist standardmäßig aktiv
  const [selectedRole, setSelectedRole] = useState<'1' | '2' | '3'>('1');
  const [inputValue, setInputValue] = useState('1-');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLocked = pinLockoutSeconds > 0;
  
  // Submit disabled wenn nur Rolle da steht ("1-") oder leer
  const hasSequence = inputValue.replace(/^[123]-?/, '').trim().length > 0;
  const isSubmitDisabled = loading || isLocked || !hasSequence;

  const detectedIdentity = resolveAusweisIdentity(inputValue, schoolNumber);
  const showPill = hasSequence && !isLocked && detectedIdentity.displayLabel.length > 0;

  // Rolle umschalten via Pills
  const handleSelectRole = (newRole: '1' | '2' | '3') => {
    if (isLocked || loading) return;
    if (errorMessage) setErrorMessage(null);
    setSelectedRole(newRole);
    // Behalte bereits getippte Ziffern bei
    const currentSeq = inputValue.replace(/^[123]-?/, '').replace(/\D/g, '');
    setInputValue(`${newRole}-${currentSeq}`);
    inputRef.current?.focus();
  };

  // Tastatur-Listener für native Eingabe ohne Klickzwang (Apple Desktop / Mac)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement && document.activeElement !== inputRef.current && (
        document.activeElement.tagName === 'INPUT' || 
        document.activeElement.tagName === 'TEXTAREA'
      )) {
        return;
      }

      if (isLocked || loading) return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigitInput(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (!isSubmitDisabled) {
          handleSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputValue, isLocked, loading, selectedRole, isSubmitDisabled]);

  const handleDigitInput = (digit: string) => {
    if (errorMessage) setErrorMessage(null);

    // Wenn das Feld leer ist:
    if (!inputValue) {
      if (digit === '1' || digit === '2' || digit === '3') {
        setSelectedRole(digit as '1' | '2' | '3');
        setInputValue(`${digit}-`);
      } else {
        // Bei anderen Ziffern: Schülerrolle annehmen
        setSelectedRole('1');
        setInputValue(`1-${digit}`);
      }
      return;
    }

    // Wenn nur "1-", "2-", "3-" im Feld steht und der Nutzer tippt eine andere Rolle (1, 2 oder 3):
    if (/^[123]-$/.test(inputValue)) {
      // Wenn der Nutzer die Rolle ändern möchte (z.B. tippt '2' während '1-' steht):
      if ((digit === '2' || digit === '3') && inputValue === '1-') {
        setSelectedRole(digit as '2' | '3');
        setInputValue(`${digit}-`);
        return;
      }
    }

    // Ziffernfolge nach dem Bindestrich anhängen (maximal 4 Ziffern)
    const match = inputValue.match(/^([123]-)(\d*)$/);
    if (match) {
      const prefix = match[1];
      const seq = match[2];
      if (seq.length < 4) {
        setInputValue(`${prefix}${seq}${digit}`);
      }
    } else {
      // Fallback für unformatierte Eingaben
      setInputValue(prev => (prev + digit).slice(0, 10));
    }
  };

  const handleBackspace = () => {
    if (errorMessage) setErrorMessage(null);
    if (!inputValue) return;

    // Wenn Ziffern nach dem '-' stehen (z.B. "1-42"):
    if (/^[123]-\d+$/.test(inputValue)) {
      setInputValue(prev => prev.slice(0, -1));
      return;
    }

    // Wenn genau "1-", "2-" oder "3-" dasteht: komplett leeren!
    if (/^[123]-$/.test(inputValue)) {
      setInputValue('');
      return;
    }

    // Standard-Fallback
    setInputValue(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (errorMessage) setErrorMessage(null);
    setInputValue(`${selectedRole}-`);
    inputRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (isSubmitDisabled) return;
    setErrorMessage(null);
    const finalId = resolveCanonicalAusweisId(inputValue, schoolNumber);
    try {
      await onSubmitId(finalId);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ausweisnummer nicht gefunden.');
    }
  };

  const handleKeypadPress = (key: string) => {
    if (isLocked || loading) return;

    if (key === 'C') {
      handleClear();
    } else if (key === '⌫') {
      handleBackspace();
    } else {
      handleDigitInput(key);
    }
    inputRef.current?.focus();
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];

  return (
    <div 
      style={{ 
        width: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px',
        animation: 'fadeIn 0.18s ease-out'
      }}
    >
      {/* 🎓 Option C: 3 dezente Apple Rollen-Pills */}
      <div 
        role="group" 
        aria-label="Rolle auswählen"
        style={{
          display: 'flex',
          gap: '6px',
          width: '100%',
          justifyContent: 'center',
          padding: '0 2px'
        }}
      >
        {[
          { role: '1', label: 'Schüler', icon: GraduationCap, code: '1' },
          { role: '2', label: 'Lehrkraft', icon: Music2, code: '2' },
          { role: '3', label: 'Verwaltung', icon: Building2, code: '3' },
        ].map((item) => {
          const isActive = selectedRole === item.role;
          const Icon = item.icon;
          return (
            <button
              key={item.role}
              type="button"
              onClick={() => handleSelectRole(item.role as '1' | '2' | '3')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '7px 8px',
                borderRadius: '12px',
                border: isActive
                  ? (isGroovelabKiosk ? '1.5px solid #facc15' : '1.5px solid #4ade80')
                  : '1px solid rgba(255, 255, 255, 0.12)',
                background: isActive
                  ? (isGroovelabKiosk ? 'rgba(250, 204, 21, 0.22)' : 'rgba(74, 222, 128, 0.20)')
                  : 'rgba(255, 255, 255, 0.05)',
                color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                fontSize: '11px',
                fontWeight: isActive ? 800 : 600,
                cursor: 'pointer',
                transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                userSelect: 'none'
              }}
            >
              <Icon size={13} color={isActive ? brandAccentColor : 'rgba(255, 255, 255, 0.65)'} />
              <span>{item.label}</span>
              <span style={{
                fontSize: '9.5px',
                opacity: 0.8,
                fontWeight: 750,
                padding: '1px 4px',
                borderRadius: '4px',
                background: isActive ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.10)'
              }}>
                {item.code}
              </span>
            </button>
          );
        })}
      </div>

      {/* Eingabefeld mit Floating-Clear Button */}
      <form 
        onSubmit={(e) => { 
          e.preventDefault(); 
          handleSubmit(); 
        }} 
        style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}
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
            onChange={(e) => {
              if (errorMessage) setErrorMessage(null);
              setInputValue(e.target.value);
            }}
            placeholder={isLocked ? `Gesperrt (${pinLockoutSeconds}s)` : "z.B. 1-42 oder 2-1"}
            disabled={loading || isLocked}
            autoFocus
            style={{
              width: '100%', 
              boxSizing: 'border-box', 
              padding: '13px 44px 13px 18px', 
              borderRadius: '16px',
              border: errorMessage
                ? '1.5px solid rgba(239, 68, 68, 0.8)'
                : isGroovelabKiosk 
                  ? '1.5px solid rgba(250, 204, 21, 0.45)' 
                  : '1.5px solid rgba(74, 222, 128, 0.40)',
              fontSize: '20px', 
              fontWeight: 800, 
              textAlign: 'center', 
              outline: 'none',
              background: isGroovelabKiosk ? 'rgba(0, 0, 0, 0.40)' : 'rgba(255, 255, 255, 0.10)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: errorMessage 
                ? '0 0 14px rgba(239, 68, 68, 0.25)' 
                : 'inset 0 2px 4px rgba(0, 0, 0, 0.25)',
              color: '#ffffff', 
              letterSpacing: '0.10em',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
            }}
            onFocus={(e) => {
              if (!errorMessage) {
                e.currentTarget.style.borderColor = brandAccentColor;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${isGroovelabKiosk ? 'rgba(250, 204, 21, 0.25)' : 'rgba(74, 222, 128, 0.25)'}`;
              }
            }}
            onBlur={(e) => {
              if (!errorMessage) {
                e.currentTarget.style.borderColor = isGroovelabKiosk ? 'rgba(250, 204, 21, 0.45)' : 'rgba(74, 222, 128, 0.40)';
                e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.25)';
              }
            }}
          />

          {inputValue.length > 0 && !loading && !isLocked && (
            <button
              type="button"
              onClick={handleClear}
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

        {/* 🚨 Visuelle Fehler-Pille bei ungültiger Ausweis-Nummer */}
        {errorMessage && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '100px',
            background: 'rgba(239, 68, 68, 0.20)',
            border: '1px solid rgba(239, 68, 68, 0.45)',
            fontSize: '11px',
            fontWeight: 750,
            color: '#fca5a5',
            alignSelf: 'center',
            animation: 'fadeIn 0.15s ease-out'
          }}>
            <AlertCircle size={13} color="#fca5a5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 🛡️ 0,1% Apple Feedback-Pill: Bestätigung mit Rolle, Sequenz und globaler ID */}
        {!errorMessage && showPill && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '100px',
            background: isGroovelabKiosk ? 'rgba(250, 204, 21, 0.18)' : 'rgba(74, 222, 128, 0.16)',
            border: isGroovelabKiosk ? '1px solid rgba(250, 204, 21, 0.35)' : '1px solid rgba(74, 222, 128, 0.35)',
            fontSize: '11.5px',
            fontWeight: 750,
            color: isGroovelabKiosk ? '#fde68a' : '#86efac',
            alignSelf: 'center',
            animation: 'fadeIn 0.15s ease-out'
          }}>
            <ShieldCheck size={14} color={isGroovelabKiosk ? '#fde68a' : '#86efac'} />
            <span>
              <strong style={{ color: '#ffffff' }}>{detectedIdentity.displayLabel}</strong>
              {detectedIdentity.supportId && (
                <span style={{ opacity: 0.8, marginLeft: '6px', fontSize: '10.5px' }}>
                  • ID: {detectedIdentity.supportId}
                </span>
              )}
            </span>
          </div>
        )}

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
            const ariaLabel = isClear ? 'Eingabe leeren' : isBack ? 'Letztes Zeichen löschen' : `Ziffer ${key}`;

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

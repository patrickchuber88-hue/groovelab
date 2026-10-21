import React, { useState, useEffect } from 'react';
import { Delete, X, ArrowRight, Check, AlertCircle, Camera, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export interface CampusIdPinAuthCardProps {
  isGroovelabKiosk?: boolean;
  schoolNumber?: string;
  schoolId?: string;
  pinLockoutSeconds?: number;
  loading?: boolean;
  onSubmitId: (idOrUser: any) => Promise<void>;
  onSwitchToCamera?: () => void;
  brandAccentColor?: string;
  brandPrimaryColor?: string;
  brandActiveTabColor?: string;
}

export const CampusIdPinAuthCard: React.FC<CampusIdPinAuthCardProps> = ({
  isGroovelabKiosk = false,
  schoolNumber = '001',
  schoolId,
  pinLockoutSeconds = 0,
  loading = false,
  onSubmitId,
  onSwitchToCamera,
  brandAccentColor = '#4ade80',
  brandPrimaryColor = '#16a34a',
  brandActiveTabColor = '#ffffff'
}) => {
  const defaultSchoolNum = (schoolNumber || '001').padStart(3, '0');

  // 🎯 100% PURE DIGIT BUFFER (Adobe / Cubase Serial License Pattern)
  // Der Nutzer tippt die VOLLSTÄNDIGE 10-stellige Ziffernkette selbst ein:
  // [3 Ziffern Schule] ─ [1 Ziffer Rolle] ─ [4 Ziffern Ausweis] ─ [2 Ziffern Geburtstagstag]
  // Keine Verräter-Labels (1,2,3 werden Angreifern nicht verraten).
  const [digitBuffer, setDigitBuffer] = useState('');
  
  // Validierungs-Status
  const [isValidated, setIsValidated] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<any | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shakeActive, setShakeActive] = useState(false);

  const isLocked = pinLockoutSeconds > 0;

  // Shake Animation Trigger
  const triggerShake = (msg?: string) => {
    setShakeActive(true);
    if (msg) setErrorMessage(msg);
    setTimeout(() => setShakeActive(false), 450);
  };

  /**
   * Reiner sequenzieller 10-Ziffern-Parser von links nach rechts:
   * Position 0-2: Schule (3 Ziffern, z.B. 001)
   * Position 3:   Rolle (1 Ziffer, z.B. 1)
   * Position 4-7: Ausweis (4 Ziffern, z.B. 0001)
   * Position 8-9: Geburtstagstag (2 Ziffern, z.B. 17 - nur bei Rolle 1)
   */
  const parseDigits = (digits: string) => {
    const raw = digits.replace(/\D/g, '');
    const sch = raw.slice(0, 3);
    const rol = raw.length >= 4 ? raw.slice(3, 4) : '';
    const seq = raw.length >= 5 ? raw.slice(4, 8) : '';
    const day = raw.length >= 9 ? raw.slice(8, 10) : '';
    const isStudent = rol === '1' || rol === '';

    return { sch, rol, seq, day, isStudent, totalDigits: raw.length };
  };

  const parsed = parseDigits(digitBuffer);

  // Live Auto-Validation (Adobe / Cubase Instant Check)
  useEffect(() => {
    if (isLocked || loading) return;

    // Schul-Nummern Check: Falls 3 Ziffern getippt sind, aber nicht zur Schule gehören
    if (parsed.sch.length === 3 && parsed.sch !== defaultSchoolNum) {
      triggerShake('Dieser Ausweis-Code gehört nicht zu dieser Musikschule.');
      setIsValidated(false);
      setVerifiedUser(null);
      return;
    }

    if (parsed.rol === '1') {
      // Schüler: Benötigt 3 Ziffern Schule + 1 Ziffer Rolle + 4 Ziffern Ausweis + 1-2 Ziffern Tag
      if (parsed.sch.length === 3 && parsed.seq.length === 4 && parsed.day.length >= 1) {
        const dayNum = parseInt(parsed.day, 10);
        if (dayNum >= 1 && dayNum <= 31) {
          // 🌟 0,1% Smart Debounce:
          // Tag >= 4 (4-9) oder 2 Ziffern ("01"-"31") sind sofort vollständig -> 120ms.
          // Ziffern 1-3 können der Beginn von 10-31 sein -> 420ms Toleranz für 2. Ziffer.
          const isEarlyComplete = parsed.day.length === 1 && dayNum >= 4;
          const isTwoDigits = parsed.day.length === 2;
          const debounceMs = (isTwoDigits || isEarlyComplete) ? 120 : 420;

          const timer = setTimeout(async () => {
            setIsVerifying(true);
            try {
              const { data: authResult, error: rpcErr } = await (supabase.rpc as any)('authenticate_student_by_id_and_day', {
                p_school_id: schoolId || null,
                p_ausweis_nummer: parsed.seq,
                p_day_of_birth: dayNum
              });

              if (!rpcErr && authResult?.success && authResult?.user) {
                setIsValidated(true);
                setVerifiedUser(authResult.user);
                setErrorMessage(null);
              } else {
                setIsValidated(false);
                setVerifiedUser(null);
                if (isTwoDigits || isEarlyComplete) {
                  triggerShake(authResult?.error || 'Ausweisnummer oder Geburtstagstag passt nicht.');
                }
              }
            } catch (err: any) {
              setIsValidated(false);
              setVerifiedUser(null);
            } finally {
              setIsVerifying(false);
            }
          }, debounceMs);

          return () => clearTimeout(timer);
        } else if (dayNum > 31) {
          triggerShake('Ein Monat hat maximal 31 Tage 😊');
        }
      } else {
        setIsValidated(false);
        setVerifiedUser(null);
      }
    } else if (parsed.rol === '2' || parsed.rol === '3') {
      // Lehrkraft (2) oder Verwaltung (3): Benötigt 3 Ziffern Schule + 1 Ziffer Rolle + 4 Ziffern Ausweis
      if (parsed.sch.length === 3 && parsed.seq.length === 4) {
        setIsValidated(true);
      } else {
        setIsValidated(false);
        setVerifiedUser(null);
      }
    } else {
      setIsValidated(false);
      setVerifiedUser(null);
    }
  }, [digitBuffer, schoolId, defaultSchoolNum, isLocked, loading]);

  // Digit Input Handler
  const handleDigit = (digit: string) => {
    if (isLocked || loading || isVerifying) return;
    if (errorMessage) setErrorMessage(null);

    // Begrenzung: Maximal 10 Ziffern (3 Schule + 1 Rolle + 4 Ausweis + 2 Tag)
    if (digitBuffer.length < 10) {
      setDigitBuffer(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    if (isLocked || loading) return;
    if (errorMessage) setErrorMessage(null);
    setIsValidated(false);
    setVerifiedUser(null);
    setDigitBuffer(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isLocked || loading) return;
    if (errorMessage) setErrorMessage(null);
    setDigitBuffer('');
    setIsValidated(false);
    setVerifiedUser(null);
  };

  // Submit Handler
  const handleProceed = async () => {
    if (isLocked || loading) return;

    if (parsed.rol === '1') {
      if (!isValidated || !verifiedUser) {
        const dayNum = parseInt(parsed.day, 10);
        if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
          triggerShake('Bitte gib deinen Geburtstagstag ein (1–31).');
          return;
        }

        setIsVerifying(true);
        try {
          const { data: authResult, error: rpcErr } = await (supabase.rpc as any)('authenticate_student_by_id_and_day', {
            p_school_id: schoolId || null,
            p_ausweis_nummer: parsed.seq,
            p_day_of_birth: dayNum
          });

          if (!rpcErr && authResult?.success && authResult?.user) {
            await onSubmitId(authResult.user);
          } else {
            triggerShake(authResult?.error || 'Ausweisnummer oder Geburtstagstag passt nicht.');
          }
        } catch (err: any) {
          triggerShake('Prüfung fehlgeschlagen. Bitte prüfe deine Karte.');
        } finally {
          setIsVerifying(false);
        }
        return;
      }

      await onSubmitId(verifiedUser);
    } else if (parsed.rol === '2' || parsed.rol === '3') {
      // Lehrer / Verwaltung
      const fullId = `${parsed.sch}-${parsed.rol}-${parsed.seq.padStart(4, '0')}`;
      try {
        await onSubmitId(fullId);
      } catch (err: any) {
        triggerShake('Dienstausweis nicht gefunden.');
      }
    }
  };

  // 🌟 0,1% APPLE GOLDSTANDARD AUTO-ADVANCE:
  // Sobald der Ausweis bestätigt ist, leuchtet der Balken kurz grün (Belohnung/Feedback)
  // und schaltet danach vollautomatisch in das PIN-Eingabefeld um (Zero-Click Transition)!
  useEffect(() => {
    if (isValidated && verifiedUser && !isLocked && !loading) {
      const autoTimer = setTimeout(() => {
        handleProceed();
      }, 380);
      return () => clearTimeout(autoTimer);
    }
  }, [isValidated, verifiedUser, isLocked, loading]);

  // Nativer Tastatur-Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement && (
        document.activeElement.tagName === 'INPUT' || 
        document.activeElement.tagName === 'TEXTAREA'
      )) {
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (isValidated) {
          handleProceed();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [digitBuffer, isValidated, verifiedUser, isLocked, loading]);

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
      <style>{`
        @keyframes appleShake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; filter: drop-shadow(0 0 8px rgba(34, 197, 94, 0.7)); }
        }
        @keyframes pulseCursor {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.9; }
        }
      `}</style>

      {/* 🌟 0,1% APPLE GOLDSTANDARD 4-SEGMENT SQUIRCLE GRID */}
      {(() => {
        // Aktives Segment berechnen:
        // 0 = Schule (3 Ziffern)
        // 1 = Code / Rolle (1 Ziffer)
        // 2 = Ausweis (4 Ziffern)
        // 3 = Geburtstagstag (2 Ziffern)
        const activeSegment = parsed.sch.length < 3
          ? 0
          : !parsed.rol
            ? 1
            : parsed.seq.length < 4
              ? 2
              : 3;

        const renderSegmentBox = (
          index: number,
          labelNode: React.ReactNode,
          value: string,
          totalLen: number,
          flexRatio: number
        ) => {
          const isActive = activeSegment === index && !isValidated;
          const isCompleted = value.length === totalLen;

          let cardBg = 'rgba(0, 0, 0, 0.32)';
          let cardBorder = '1px solid rgba(255, 255, 255, 0.10)';
          let cardShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.3)';

          if (isValidated) {
            cardBg = 'rgba(34, 197, 94, 0.20)';
            cardBorder = '1.5px solid #34a853';
            cardShadow = '0 0 16px rgba(34, 197, 94, 0.35)';
          } else if (isActive) {
            cardBg = isGroovelabKiosk ? 'rgba(250, 204, 21, 0.15)' : 'rgba(74, 222, 128, 0.15)';
            cardBorder = isGroovelabKiosk ? '1.5px solid #facc15' : '1.5px solid #4ade80';
            cardShadow = isGroovelabKiosk ? '0 0 14px rgba(250, 204, 21, 0.28)' : '0 0 14px rgba(74, 222, 128, 0.25)';
          } else if (isCompleted) {
            cardBg = 'rgba(255, 255, 255, 0.08)';
            cardBorder = '1px solid rgba(255, 255, 255, 0.22)';
            cardShadow = 'none';
          }

          let labelColor = 'rgba(255, 255, 255, 0.38)';
          if (isValidated) labelColor = '#86efac';
          else if (isActive) labelColor = isGroovelabKiosk ? '#fde047' : '#86efac';
          else if (isCompleted) labelColor = 'rgba(255, 255, 255, 0.70)';

          return (
            <div
              key={`segment-${index}`}
              style={{
                flex: flexRatio,
                minWidth: 0,
                borderRadius: '16px',
                padding: '9px 4px 7px 4px',
                minHeight: '60px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                background: cardBg,
                border: cardBorder,
                boxShadow: cardShadow,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxSizing: 'border-box'
              }}
            >
              <div
                style={{
                  fontSize: '8.5px',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: labelColor,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  lineHeight: 1,
                  userSelect: 'none'
                }}
              >
                {labelNode}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px',
                  width: '100%'
                }}
              >
                {Array.from({ length: totalLen }).map((_, slotIdx) => {
                  const char = value[slotIdx];
                  const isCurrentSlot = isActive && slotIdx === value.length;
                  return (
                    <span
                      key={slotIdx}
                      style={{
                        fontSize: '17.5px',
                        fontWeight: 850,
                        fontFamily: "ui-monospace, 'SF Mono', 'Plus Jakarta Sans', Menlo, monospace",
                        color: char 
                          ? '#ffffff' 
                          : isCurrentSlot 
                            ? (isGroovelabKiosk ? '#facc15' : '#4ade80') 
                            : 'rgba(255, 255, 255, 0.22)',
                        minWidth: '10px',
                        textAlign: 'center',
                        display: 'inline-block',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {char || (isCurrentSlot ? '·' : '—')}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        };

        return (
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              animation: shakeActive ? 'appleShake 0.4s ease-in-out' : 'none'
            }}
          >
            {/* 4 Harmonische Apple-Squircle Kapseln (Volle Breite, 100% Symmetrie) */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                width: '100%',
                boxSizing: 'border-box',
                alignItems: 'stretch'
              }}
            >
              {renderSegmentBox(0, 'SCHULE', parsed.sch, 3, 1.15)}
              {renderSegmentBox(1, 'CODE', parsed.rol, 1, 0.85)}
              {renderSegmentBox(2, 'AUSWEIS', parsed.seq, 4, 1.35)}
              {parsed.isStudent && renderSegmentBox(3, <><Calendar size={10} strokeWidth={2.5} /> TAG</>, parsed.day, 2, 1.05)}
            </div>

            {/* 💡 Intelligente, ruhige Status- & Führungszeile (Zero Redundancy) */}
            <div
              style={{
                fontSize: '12px',
                fontWeight: 750,
                color: isValidated ? '#86efac' : 'rgba(255, 255, 255, 0.85)',
                textAlign: 'center',
                padding: '2px 8px',
                minHeight: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                userSelect: 'none'
              }}
            >
              {isValidated ? (
                <>
                  <Check size={14} strokeWidth={3} />
                  <span>Ausweis bestätigt! Weiter zur PIN...</span>
                </>
              ) : isVerifying ? (
                <span>Prüfe Ausweis...</span>
              ) : activeSegment === 0 ? (
                <span>Schul-Nummer eingeben ({parsed.sch.length}/3)</span>
              ) : activeSegment === 1 ? (
                <span>Kennziffer eingeben</span>
              ) : activeSegment === 2 ? (
                <span>Ausweisnummer eingeben ({parsed.seq.length}/4)</span>
              ) : (
                <span>Geburtstagstag eingeben (1–31)</span>
              )}
            </div>
          </div>
        );
      })()}

      {/* 🚨 Fehlermeldung */}
      {errorMessage && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '6px 14px',
          borderRadius: '100px',
          background: 'rgba(239, 68, 68, 0.22)',
          border: 'none',
          fontSize: '11.5px',
          fontWeight: 750,
          color: '#fca5a5',
          alignSelf: 'center',
          animation: 'fadeIn 0.15s ease-out'
        }}>
          <AlertCircle size={14} color="#fca5a5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 🔢 Kanonisches 3x4 Apple Numpad */}
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
              onClick={() => {
                if (isClear) handleClear();
                else if (isBack) handleBackspace();
                else handleDigit(key);
              }}
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

      {/* Action Button: Weiter zur Geheimzahl (PIN) */}
      <button
        type="button"
        disabled={!isValidated || loading || isLocked}
        onClick={handleProceed}
        style={{
          width: '100%', 
          padding: '14px 20px', 
          borderRadius: '16px', 
          border: 'none',
          background: isValidated 
            ? (brandPrimaryColor || '#16a34a') 
            : 'rgba(255, 255, 255, 0.10)',
          color: isValidated ? (brandActiveTabColor || '#ffffff') : 'rgba(255, 255, 255, 0.35)',
          fontSize: '14.5px', 
          fontWeight: 800,
          cursor: isValidated ? 'pointer' : 'not-allowed',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '8px',
          boxShadow: isValidated ? '0 4px 18px rgba(34, 197, 94, 0.35)' : 'none',
          transition: 'all 0.15s ease'
        }}
        onMouseDown={(e) => {
          if (isValidated) e.currentTarget.style.transform = 'scale(0.98)';
        }}
        onMouseUp={(e) => { e.currentTarget.style.transform = 'none'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
      >
        {loading ? (
          <span>Prüfe Ausweis...</span>
        ) : isLocked ? (
          <span>Gesperrt ({pinLockoutSeconds}s)</span>
        ) : (
          <>
            <span>Weiter zur Geheimzahl (PIN)</span>
            <ArrowRight size={16} strokeWidth={2.4} />
          </>
        )}
      </button>

      {/* 📷 Rettungsanker: Ausweis mit Kamera scannen */}
      {onSwitchToCamera && (
        <button
          type="button"
          onClick={onSwitchToCamera}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.65)',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
            padding: '6px',
            marginTop: '2px',
            transition: 'color 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.65)'}
        >
          <Camera size={15} />
          <span>Lieber Ausweis mit der Kamera scannen</span>
        </button>
      )}
    </div>
  );
};

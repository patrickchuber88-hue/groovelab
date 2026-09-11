import React, { useState, useEffect } from 'react';
import { Key, Delete, X, Lock, ShieldCheck, Fingerprint } from 'lucide-react';
import { validateNewPin } from '../utils/pinValidation';
import { isWebAuthnSupported, authenticateParentBiometricPasskey } from '../utils/webauthn';

interface CampusPinUnlockModalProps {
  user: any;
  supabase: any;
  schoolData: any;
  mode?: 'adaptive' | 'parent_only' | 'student_only';
  title?: string;
  subtitle?: string;
  onUnlock: () => void;
  onClose: () => void;
}

export const CampusPinUnlockModal: React.FC<CampusPinUnlockModalProps> = ({
  user,
  supabase,
  schoolData,
  mode = 'adaptive',
  title,
  subtitle,
  onUnlock,
  onClose
}) => {
  const isParentOnly = mode === 'parent_only';
  const [loading, setLoading] = useState(false);
  const [studentBirthDay, setStudentBirthDay] = useState<string>('');
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isParentMode, setIsParentMode] = useState(isParentOnly);

  const primaryColor = (isParentOnly || isParentMode) ? '#0284c7' : '#34a853';

  // WAI-ARIA Escape Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Determine PIN mode on mount
  useEffect(() => {
    if (isParentOnly) return;
    async function checkPinMode() {
      try {
        setLoading(true);
        const { data: actDay } = await supabase
          .from('activation_days')
          .select('day_of_birth')
          .eq('student_id', user.id)
          .maybeSingle();

        const dayOfBirth = actDay?.day_of_birth;
        const bdayStr = dayOfBirth ? String(dayOfBirth).padStart(2, '0') : '';
        setStudentBirthDay(bdayStr);

        // If they have no birthday in database and PIN is not activated yet, they must set up a new 4-digit PIN.
        if (!bdayStr && !user.is_pin_activated) {
          setIsSetupMode(true);
        }
      } catch (err) {
        console.error('[CampusPinUnlock] Error checking PIN mode:', err);
      } finally {
        setLoading(false);
      }
    }
    checkPinMode();
  }, [user, supabase]);

  const handleKeyPress = (val: string) => {
    if (loading) return;
    if (val === 'back') {
      setPinInput(prev => {
        const next = prev.slice(0, -1);
        if (next.length <= 4 && isParentMode) {
          // Keep parent mode if active
        }
        return next;
      });
    } else if (val === 'clear') {
      setPinInput('');
    } else if (pinInput.length < 6) {
      const nextPin = pinInput + val;
      setPinInput(nextPin);

      // Dynamically detect parent 5th/6th digit
      if (nextPin.length === 5 && !isParentMode && !isParentOnly) {
        setIsParentMode(true);
      }

      // Check verification at 4 digits (student) or 6 digits (parent)
      if (nextPin.length === 4 && !isParentMode && !isSetupMode && !isParentOnly) {
        handleVerify(nextPin, false);
      } else if (nextPin.length === 6) {
        handleVerify(nextPin, true);
      }
    }
  };

  const handleVerify = async (explicitPin?: string, isSixDigits: boolean = false) => {
    const pinToVerify = typeof explicitPin === 'string' ? explicitPin : pinInput;
    if (loading) return;
    if (isParentOnly && pinToVerify.length < 6) return;
    if (!isParentOnly && pinToVerify.length < 4) return;
    setLoading(true);

    try {
      if (isParentOnly) {
        const cleanInput = pinToVerify.trim();
        if (cleanInput.length !== 6) {
          setLoading(false);
          return;
        }

        // 🛡️ Volljährigkeits-Schutz (§ 2 BGB, §§ 1626, 1629 BGB, Art. 6, 8 DSGVO)
        if (user?.is_adult && !user?.adult_allow_parent_access) {
          alert('Dieser Schüler ist volljährig (18+). Der elterliche Einblick wurde zum Schutz der Privatsphäre deaktiviert.');
          setPinInput('');
          setLoading(false);
          return;
        }

        const { data: parentOk } = await supabase.rpc('verify_parent_pin', {
          student_id: user.id,
          input_pin: cleanInput
        });

        if (parentOk === true) {
          sessionStorage.setItem(`groovelab_parent_unlocked_${user.id}`, 'true');
          sessionStorage.setItem(`groovelab_parent_session_${user.id}`, String(Date.now() + 180 * 1000));
          sessionStorage.setItem(`campus_parent_module_unlock_${user.id}`, String(Date.now() + 180 * 1000));
          onUnlock();
        } else {
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          if (newAttempts >= 5) {
            alert('Zu viele Fehlversuche. Bitte wende dich an deine Musikschule.');
            onClose();
          } else {
            alert(`Falsche Eltern-PIN. Noch ${5 - newAttempts} Versuche.`);
            setPinInput('');
          }
        }
        return;
      }

      if (isSetupMode) {
        // Validate proposed PIN against trivial and birthday patterns
        const validation = validateNewPin(pinToVerify, studentBirthDay || user.day_of_birth);
        if (!validation.isValid) {
          alert(validation.error || 'Ungültige PIN.');
          setPinInput('');
          setLoading(false);
          return;
        }

        // Setup new personal 4-digit PIN via Server-Side Security Definer RPC
        const authQrToken = user.qr_token || user.ausweis_nummer || user.id || '';
        
        let setupSuccess = false;
        let lastErrorMessage = '';

        // 1. Primary: set_initial_student_pin RPC
        try {
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('set_initial_student_pin', {
            p_student_id: user.id,
            p_qr_token: authQrToken,
            p_pin: pinToVerify
          });

          if (!rpcErr && rpcRes === true) {
            setupSuccess = true;
          } else if (rpcErr) {
            lastErrorMessage = rpcErr.message;
            console.warn('[CampusPinUnlockModal] set_initial_student_pin fallback:', rpcErr.message);
          }
        } catch (e: any) {
          lastErrorMessage = e?.message || '';
        }

        // 2. Secondary: set_personal_pin RPC
        if (!setupSuccess) {
          try {
            const { data: pRes, error: pErr } = await supabase.rpc('set_personal_pin', {
              p_user_id: user.id,
              p_new_pin: pinToVerify
            });

            if (!pErr && pRes === true) {
              setupSuccess = true;
            } else if (pErr) {
              lastErrorMessage = pErr.message || lastErrorMessage;
              console.warn('[CampusPinUnlockModal] set_personal_pin fallback:', pErr.message);
            }
          } catch (e: any) {
            lastErrorMessage = e?.message || lastErrorMessage;
          }
        }

        if (!setupSuccess) {
          console.error('[CampusPinUnlockModal] PIN setup failed:', lastErrorMessage);
          alert('Fehler beim Speichern der PIN: ' + (lastErrorMessage || 'Serverfehler'));
          setLoading(false);
          return;
        }

        // Update local user object representation (only boolean flags, no plaintext secrets)
        user.is_pin_activated = true;
        user.has_personal_pin = true;
        user.is_campus_active = true;

        alert('Deine PIN wurde erfolgreich eingerichtet!');
        onUnlock();
      } else {
        // Verification Mode (Adaptive: 4-digit student or 6-digit parent) via Server-Side RPC
        let isMatch = false;
        let isParentMatch = false;
        const cleanInput = pinToVerify.trim();

        if (cleanInput.length === 4) {
          const { data: pinOk } = await supabase.rpc('verify_personal_pin', {
            user_uuid: user.id,
            input_pin: cleanInput
          });
          if (pinOk === true) isMatch = true;
        } else if (cleanInput.length === 6 || isSixDigits) {
          // 🛡️ Volljährigkeits-Schutz (§ 2 BGB, §§ 1626, 1629 BGB, Art. 6, 8 DSGVO)
          if (user?.is_adult && !user?.adult_allow_parent_access) {
            alert('Dieser Schüler ist volljährig (18+). Der elterliche Einblick wurde zum Schutz der Privatsphäre deaktiviert.');
            setPinInput('');
            return;
          }
          const { data: parentOk } = await supabase.rpc('verify_parent_pin', {
            student_id: user.id,
            input_pin: cleanInput
          });
          if (parentOk === true) {
            isMatch = true;
            isParentMatch = true;
          }
        }

        if (isMatch) {
          if (isParentMatch) {
            sessionStorage.setItem(`groovelab_parent_unlocked_${user.id}`, 'true');
            sessionStorage.setItem(`groovelab_parent_session_${user.id}`, String(Date.now() + 180 * 1000));
            sessionStorage.setItem(`campus_parent_module_unlock_${user.id}`, String(Date.now() + 180 * 1000));
          }
          onUnlock();
        } else {
          if (cleanInput.length === 6) {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            if (newAttempts >= 5) {
              alert('Zu viele Fehlversuche. Bitte wende dich an deine Musikschule.');
              onClose();
            } else {
              alert(`Falsche PIN. Noch ${5 - newAttempts} Versuche.`);
              setPinInput('');
            }
          }
        }
      }
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricUnlock = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const authRes = await authenticateParentBiometricPasskey(
        supabase,
        user.id,
        user.school_id || null
      );

      if (!authRes.success) {
        if (authRes.error && !authRes.error.includes('abgebrochen')) {
          alert(authRes.error);
        }
        return;
      }

      sessionStorage.setItem(`groovelab_parent_unlocked_${user.id}`, 'true');
      sessionStorage.setItem(`groovelab_parent_session_${user.id}`, String(Date.now() + 180 * 1000));
      sessionStorage.setItem(`campus_parent_module_unlock_${user.id}`, String(Date.now() + 180 * 1000));
      onUnlock();
    } catch (err: any) {
      if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
        alert(err.message || 'Passkey-Entsperrung fehlgeschlagen.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderKeypad = () => {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'back'];
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        width: '100%',
        marginTop: '20px'
      }}>
        {keys.map((key) => {
          const isSpecial = key === 'C' || key === 'back';
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (key === 'C') handleKeyPress('clear');
                else if (key === 'back') handleKeyPress('back');
                else handleKeyPress(key);
              }}
              style={{
                padding: '16px',
                borderRadius: '16px',
                border: 'none',
                background: isSpecial ? '#f1f5f9' : '#f8fafc',
                color: '#0f172a',
                fontSize: '1.2rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                transition: 'all 0.1s'
              }}
              className="hover-scale"
            >
              {key === 'back' ? <Delete size={20} /> : key}
            </button>
          );
        })}
      </div>
    );
  };

  const activeSlotsCount = isParentOnly ? 6 : ((isParentMode || pinInput.length > 4) ? 6 : 4);

  const computedTitle = title || (isParentOnly ? 'Module freischalten' : (isParentMode ? 'Eltern-Master-Zugang' : (isSetupMode ? 'Persönliche PIN einrichten' : 'Campus freischalten')));
  const computedSubtitle = subtitle || (isParentOnly ? (
    <>Eltern-Freigabe erforderlich:<br/>Bitte 6-stellige Eltern-Master-PIN eingeben.</>
  ) : isParentMode ? (
    <>Bitte gib deine 6-stellige Eltern-Master-PIN ein,<br/>um die Eltern-Zentrale zu öffnen.</>
  ) : isSetupMode ? (
    <>Lege eine geheime 4-stellige PIN fest,<br/>um deine privaten Campus-Daten zu schützen.</>
  ) : (
    <>Bitte gib deine 4-stellige Schüler-PIN ein<br/>oder deine 6-stellige Eltern-Master-PIN.</>
  ));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={typeof computedTitle === 'string' ? computedTitle : 'PIN-Eingabe'}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.40)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 11000,
        padding: '20px'
      }}
    >
      <div style={{
        background: '#ffffff',
        borderRadius: '32px',
        padding: '32px',
        width: '100%',
        maxWidth: '360px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        border: '1px solid #f1f5f9',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          aria-label="Schließen"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={20} />
        </button>

        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: (isParentOnly || isParentMode) ? '#e0f2fe' : '#e6f4ea',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: primaryColor,
          marginBottom: '16px'
        }}>
          {(isParentOnly || isParentMode) ? <ShieldCheck size={28} /> : (isSetupMode ? <Key size={28} /> : <Lock size={28} />)}
        </div>

        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
          {computedTitle}
        </h3>
        
        <p style={{ margin: '8px 0 20px 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 600, lineHeight: '1.4' }}>
          {computedSubtitle}
        </p>

        {/* Input indicators with smooth transition */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          {Array.from({ length: activeSlotsCount }).map((_, idx) => (
            <div
              key={idx}
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                border: `2px solid ${pinInput.length > idx ? primaryColor : '#cbd5e1'}`,
                background: pinInput.length > idx ? primaryColor : 'transparent',
                transition: 'all 0.15s ease'
              }}
            />
          ))}
        </div>

        {renderKeypad()}

        {/* Biometric Passkey Unlock (Face ID / Touch ID) */}
        {!isSetupMode && isWebAuthnSupported() && (
          <button
            type="button"
            disabled={loading}
            onClick={handleBiometricUnlock}
            style={{
              marginTop: '12px',
              width: '100%',
              padding: '12px 16px',
              borderRadius: '16px',
              border: '1px solid #bae6fd',
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              color: '#0284c7',
              fontSize: '0.88rem',
              fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
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
            <span>{loading ? 'Wird geprüft...' : 'Mit Face ID / Touch ID entsperren'}</span>
          </button>
        )}

        {/* Mode switcher link - Excluded in parent_only mode */}
        {!isSetupMode && !isParentOnly && (
          <button
            type="button"
            onClick={() => {
              setIsParentMode(!isParentMode);
              setPinInput('');
            }}
            style={{
              marginTop: '16px',
              background: 'none',
              border: 'none',
              color: isParentMode ? '#34a853' : '#0284c7',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isParentMode ? '← Zurück zur Schüler-Eingabe (4 Ziffern)' : 'Als Elternteil anmelden (6-stellige Master-PIN) →'}
          </button>
        )}

        {loading && (
          <div style={{ marginTop: '14px', color: primaryColor, fontWeight: 800, fontSize: '0.9rem' }}>
            Einen Moment bitte...
          </div>
        )}
      </div>
    </div>
  );
};

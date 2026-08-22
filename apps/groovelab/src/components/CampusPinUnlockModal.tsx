import React, { useState, useEffect } from 'react';
import { Key, Delete, X, Lock, ShieldCheck } from 'lucide-react';
import { validateNewPin } from '../utils/pinValidation';

interface CampusPinUnlockModalProps {
  user: any;
  supabase: any;
  schoolData: any;
  onUnlock: () => void;
  onClose: () => void;
}

export const CampusPinUnlockModal: React.FC<CampusPinUnlockModalProps> = ({
  user,
  supabase,
  schoolData,
  onUnlock,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [studentBirthDay, setStudentBirthDay] = useState<string>('');
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isParentMode, setIsParentMode] = useState(false);

  const primaryColor = isParentMode ? '#0284c7' : '#34a853';

  // Determine PIN mode on mount
  useEffect(() => {
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
      if (nextPin.length === 5 && !isParentMode) {
        setIsParentMode(true);
      }

      // Check verification at 4 digits (student) or 6 digits (parent)
      if (nextPin.length === 4 && !isParentMode && !isSetupMode) {
        handleVerify(nextPin, false);
      } else if (nextPin.length === 6) {
        handleVerify(nextPin, true);
      }
    }
  };

  const handleVerify = async (explicitPin?: string, isSixDigits: boolean = false) => {
    const pinToVerify = typeof explicitPin === 'string' ? explicitPin : pinInput;
    if (pinToVerify.length < 4 || loading) return;
    setLoading(true);

    try {
      if (isSetupMode) {
        // Validate proposed PIN against trivial and birthday patterns
        const validation = validateNewPin(pinToVerify, studentBirthDay || user.day_of_birth);
        if (!validation.isValid) {
          alert(validation.error || 'Ungültige PIN.');
          setPinInput('');
          setLoading(false);
          return;
        }

        // Setup new personal 4-digit PIN
        const authQrToken = user.qr_token || user.ausweis_nummer || user.id;
        if (authQrToken) {
          sessionStorage.setItem('groovelab_qr_token', authQrToken);
        }

        try {
          await supabase.from('students').update({
            personal_pin: pinToVerify,
            parent_pin: pinToVerify,
            onboarding_pin: pinToVerify,
            is_pin_activated: true,
            is_campus_active: true
          }).eq('id', user.id);

          await supabase.from('pending_students').update({
            personal_pin: pinToVerify,
            parent_pin: pinToVerify,
            onboarding_pin: pinToVerify,
            is_pin_activated: true,
            is_campus_active: true
          }).eq('id', user.id);
        } catch (e) {}

        try {
          await supabase.from('users_raw').update({
            personal_pin: pinToVerify,
            parent_pin: pinToVerify,
            onboarding_pin: pinToVerify,
            is_pin_activated: true,
            is_campus_active: true
          }).eq('id', user.id);
        } catch (e) {}

        const userUpdatePayload: any = {
          personal_pin: pinToVerify,
          parent_pin: pinToVerify,
          onboarding_pin: pinToVerify,
          is_pin_activated: true,
          is_campus_active: true
        };
        let { error: updateErr } = await supabase
          .from('users')
          .update(userUpdatePayload)
          .eq('id', user.id);

        if (updateErr && (updateErr.message?.includes('onboarding_pin') || updateErr.message?.includes('record "new" has no field'))) {
          delete userUpdatePayload.onboarding_pin;
          const fallbackRes = await supabase
            .from('users')
            .update(userUpdatePayload)
            .eq('id', user.id);
          updateErr = fallbackRes.error;
        }

        if (updateErr && (updateErr.message?.includes('onboarding_pin') || updateErr.message?.includes('record "new" has no field'))) {
          updateErr = null;
        }

        if (updateErr) {
          console.error('[CampusPinUnlockModal] user update error:', updateErr);
          alert('Fehler beim Speichern der PIN: ' + updateErr.message);
          setLoading(false);
          return;
        }

        localStorage.setItem(`groovelab_user_pin_${user.id}`, pinToVerify);
        if (authQrToken) {
          localStorage.setItem(`groovelab_pin_${authQrToken}`, pinToVerify);
        }

        sessionStorage.removeItem('groovelab_qr_token');

        // Ensure activation_days record exists for active student detection
        try {
          const { data: existingAct } = await supabase
            .from('activation_days')
            .select('student_id')
            .eq('student_id', user.id)
            .maybeSingle();

          if (!existingAct) {
            await supabase.from('activation_days').insert({
              student_id: user.id,
              day_of_birth: (user as any).day_of_birth || 1
            });
          }
        } catch (actErr) {
          console.warn('[CampusPinUnlockModal] Warning inserting activation_days:', actErr);
        }

        // Update local user object representation if possible
        user.is_pin_activated = true;
        user.is_campus_active = true;

        alert('Deine PIN wurde erfolgreich eingerichtet!');
        onUnlock();
      } else {
        // Verification Mode (Adaptive: 4-digit student or 6-digit parent)
        let isMatch = false;
        let isParentMatch = false;
        const cleanInput = pinToVerify.trim();
        const userPersonalPin = String(user.personal_pin || user.onboarding_pin || '').trim();
        const userParentPin = String(user.parent_pin || '').trim();
        const cachedPin = localStorage.getItem(`groovelab_user_pin_${user.id}`);

        if (cleanInput.length === 4) {
          if (userPersonalPin && (userPersonalPin === cleanInput || userPersonalPin.padStart(4, '0') === cleanInput)) {
            isMatch = true;
          } else if (cachedPin && cachedPin.trim() === cleanInput) {
            isMatch = true;
          } else {
            const { data: pinOk } = await supabase.rpc('verify_personal_pin', {
              user_uuid: user.id,
              input_pin: cleanInput
            });
            if (pinOk === true) isMatch = true;
          }
        } else if (cleanInput.length === 6 || isSixDigits) {
          const cachedParentPin = localStorage.getItem(`groovelab_parent_pin_${user.id}`);
          if (userParentPin && (userParentPin === cleanInput || userParentPin.padStart(6, '0') === cleanInput)) {
            isMatch = true;
            isParentMatch = true;
          } else if (cachedParentPin && (cachedParentPin.trim() === cleanInput || cachedParentPin.trim() === cleanInput.padStart(6, '0'))) {
            isMatch = true;
            isParentMatch = true;
          } else {
            const { data: parentOk } = await supabase.rpc('verify_parent_pin', {
              student_id: user.id,
              input_pin: cleanInput
            });
            if (parentOk === true) {
              isMatch = true;
              isParentMatch = true;
            } else if (userParentPin) {
              try {
                const msgBuffer = new TextEncoder().encode(cleanInput);
                const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
                const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
                if (userParentPin.toLowerCase() === hashHex.toLowerCase()) {
                  isMatch = true;
                  isParentMatch = true;
                }
              } catch (e) {}
            }
          }
        }

        if (isMatch) {
          if (isParentMatch) {
            sessionStorage.setItem(`groovelab_parent_unlocked_${user.id}`, 'true');
            sessionStorage.setItem(`groovelab_parent_session_${user.id}`, String(Date.now() + 15 * 60 * 1000));
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

  const activeSlotsCount = (isParentMode || pinInput.length > 4) ? 6 : 4;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.40)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 11000,
      padding: '20px'
    }}>
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
          background: isParentMode ? '#f0f9ff' : '#e6f4ea',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: primaryColor,
          marginBottom: '16px'
        }}>
          {isParentMode ? <ShieldCheck size={28} /> : (isSetupMode ? <Key size={28} /> : <Lock size={28} />)}
        </div>

        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
          {isParentMode ? 'Eltern-Master-Zugang' : (isSetupMode ? 'Persönliche PIN einrichten' : 'Campus freischalten')}
        </h3>
        
        <p style={{ margin: '8px 0 20px 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 600, lineHeight: '1.4' }}>
          {isParentMode ? (
            <>Bitte gib deine 6-stellige Eltern-Master-PIN ein,<br/>um die Eltern-Zentrale zu öffnen.</>
          ) : isSetupMode ? (
            <>Lege eine geheime 4-stellige PIN fest,<br/>um deine privaten Campus-Daten zu schützen.</>
          ) : (
            <>Bitte gib deine 4-stellige Schüler-PIN ein<br/>oder deine 6-stellige Eltern-Master-PIN.</>
          )}
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

        {/* Mode switcher link */}
        {!isSetupMode && (
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

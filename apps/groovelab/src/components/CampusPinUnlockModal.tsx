import React, { useState, useEffect } from 'react';
import { Key, Delete, X, Lock } from 'lucide-react';

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

  const primaryColor = '#34a853'; // Campus Green theme color

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

  const expectedLength = isSetupMode ? 4 : (studentBirthDay ? 2 : 4);

  const handleKeyPress = (val: string) => {
    if (val === 'back') {
      setPinInput(prev => prev.slice(0, -1));
    } else if (val === 'clear') {
      setPinInput('');
    } else if (pinInput.length < expectedLength) {
      setPinInput(prev => prev + val);
    }
  };

  const handleVerify = async () => {
    if (pinInput.length !== expectedLength) return;
    setLoading(true);

    try {
      if (isSetupMode) {
        // Setup new personal 4-digit PIN
        const authQrToken = user.qr_token || user.ausweis_nummer || user.id;
        if (authQrToken) {
          sessionStorage.setItem('groovelab_qr_token', authQrToken);
        }

        const { error } = await supabase
          .from('users')
          .update({
            personal_pin: pinInput,
            is_pin_activated: true,
            is_campus_active: true
          })
          .eq('id', user.id);

        sessionStorage.removeItem('groovelab_qr_token');
        if (error) throw error;

        // Update local user object representation if possible
        user.is_pin_activated = true;
        user.is_campus_active = true;

        alert('Deine PIN wurde erfolgreich eingerichtet!');
        onUnlock();
      } else {
        // Verification Mode
        let isMatch = false;

        if (studentBirthDay) {
          isMatch = parseInt(pinInput) === parseInt(studentBirthDay);
        } else {
          // Verify personal PIN using secure RPC
          const { data: pinOk, error: pinErr } = await supabase.rpc('verify_personal_pin', {
            user_uuid: user.id,
            input_pin: pinInput
          });
          if (!pinErr && pinOk === true) {
            isMatch = true;
          }
        }

        if (isMatch) {
          onUnlock();
        } else {
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);

          if (newAttempts >= 3) {
            // Lock user's campus access temporarily
            await supabase
              .from('users')
              .update({ is_campus_active: false })
              .eq('id', user.id);
            alert('Dieses Konto wurde nach 3 Fehlversuchen für den Campus gesperrt. Bitte wende dich an deine Musikschule.');
            onClose();
          } else {
            alert(`Falsche PIN. Noch ${3 - newAttempts} Versuche.`);
            setPinInput('');
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
          background: '#e6f4ea',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: primaryColor,
          marginBottom: '16px'
        }}>
          {isSetupMode ? <Key size={28} /> : <Lock size={28} />}
        </div>

        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
          {isSetupMode ? 'Persönliche PIN einrichten' : 'Campus freischalten'}
        </h3>
        
        <p style={{ margin: '8px 0 20px 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 600, lineHeight: '1.4' }}>
          {isSetupMode ? (
            <>
              Lege eine geheime 4-stellige PIN fest,<br/>
              um deine privaten Campus-Daten zu schützen.
            </>
          ) : studentBirthDay ? (
            <>
              Bitte gib deinen Geburtstag (nur den Tag, z.B. 05)<br/>
              als 2-stellige PIN ein.
            </>
          ) : (
            <>
              Bitte gib deine persönliche 4-stellige PIN ein,<br/>
              um deinen Campus freizuschalten.
            </>
          )}
        </p>

        {/* Input indicators */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
          {Array.from({ length: expectedLength }).map((_, idx) => (
            <div
              key={idx}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                border: '2px solid #cbd5e1',
                background: pinInput.length > idx ? '#cbd5e1' : 'transparent',
                transition: 'all 0.15s ease'
              }}
            />
          ))}
        </div>

        {renderKeypad()}

        <button
          onClick={handleVerify}
          disabled={pinInput.length !== expectedLength || loading}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '16px',
            background: pinInput.length === expectedLength ? primaryColor : '#cbd5e1',
            color: '#ffffff',
            fontWeight: 800,
            border: 'none',
            marginTop: '24px',
            cursor: pinInput.length === expectedLength ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s'
          }}
        >
          {isSetupMode ? 'PIN aktivieren & Freischalten' : 'Verifizieren & Freischalten'}
        </button>
      </div>
    </div>
  );
};

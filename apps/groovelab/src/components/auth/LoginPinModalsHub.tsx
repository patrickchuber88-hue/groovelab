import React, { useState, useEffect } from 'react';
import { Key, Delete } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { validateNewPin } from '../../utils/pinValidation';
import { setRememberedPin, clearRememberedPin } from '../../utils/trustedDevicePin';
import { normalizeCampusIdToNumeric } from '../../utils/campusIdHelper';

interface LoginPinModalsHubProps {
  pinSetupUser: any | null;
  pinVerificationUser: any | null;
  onCloseSetup: () => void;
  onCloseVerify: () => void;
  onFinalizeLogin: (user: any, stationId: string | null, isWithinRoom: boolean, bypass?: boolean) => Promise<void>;
  schoolData: any;
  isGroovelabKiosk: boolean;
  loginStationId: string | null;
  pinVerificationIsWithinRoom: boolean;
  loading: boolean;
  setLoading: (l: boolean) => void;
  pinSetupInput: string;
  setPinSetupInput: React.Dispatch<React.SetStateAction<string>>;
  pinVerificationInput: string;
  setPinVerificationInput: React.Dispatch<React.SetStateAction<string>>;
  rememberPinOnDevice: boolean;
  setRememberPinOnDevice: React.Dispatch<React.SetStateAction<boolean>>;
  pinVerificationAttempts: number;
  setPinVerificationAttempts: React.Dispatch<React.SetStateAction<number>>;
}

export function LoginPinModalsHub({
  pinSetupUser,
  pinVerificationUser,
  onCloseSetup,
  onCloseVerify,
  onFinalizeLogin,
  schoolData,
  isGroovelabKiosk,
  loginStationId,
  pinVerificationIsWithinRoom,
  loading,
  setLoading,
  pinSetupInput,
  setPinSetupInput,
  pinVerificationInput,
  setPinVerificationInput,
  rememberPinOnDevice,
  setRememberPinOnDevice,
  pinVerificationAttempts,
  setPinVerificationAttempts
}: LoginPinModalsHubProps) {
  const [pinVerificationMode, setPinVerificationMode] = useState<'student' | 'parent'>('student');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  const isStudentRole = pinVerificationUser?.role === 'student';

  // 🛡️ Autoritativer PIN-Verifikations-Handler
  const handleVerifyPin = async (overridePin?: string) => {
    if (isVerifyingPin || loading || !pinVerificationUser) return;
    const cleanPin = (overridePin !== undefined ? overridePin : pinVerificationInput).trim();
    const isExpectedLength = isStudentRole 
      ? (cleanPin.length === 4 || cleanPin.length === 6)
      : cleanPin.length === 4;
    if (!isExpectedLength) return;

    setIsVerifyingPin(true);
    setLoading(true);

    try {
      let isMatch = false;
      let isParentMatch = false;

      if (pinVerificationUser.role === 'student') {
        const { data: sOk, error: sErr } = await supabase.rpc('verify_personal_pin', {
          user_uuid: pinVerificationUser.id,
          input_pin: cleanPin
        });
        if (!sErr && sOk === true) {
          isMatch = true;
        } else {
          const { data: pOk, error: pErr } = await supabase.rpc('verify_parent_pin', {
            student_id: pinVerificationUser.id,
            input_pin: cleanPin
          });
          if (!pErr && pOk === true) {
            isMatch = true;
            isParentMatch = true;
          }
        }
      } else {
        const { data: uOk, error: uErr } = await supabase.rpc('verify_personal_pin', {
          user_uuid: pinVerificationUser.id,
          input_pin: cleanPin
        });
        if (!uErr && uOk === true) {
          isMatch = true;
        }
      }

      if (isMatch) {
        if (rememberPinOnDevice) {
          setRememberedPin(pinVerificationUser.id, cleanPin);
        } else {
          clearRememberedPin(pinVerificationUser.id);
        }

        if (isParentMatch) {
          sessionStorage.setItem(`groovelab_parent_unlocked_${pinVerificationUser.id}`, 'true');
          sessionStorage.setItem(`groovelab_parent_session_${pinVerificationUser.id}`, String(Date.now() + 180 * 1000));
        }

        const user = {
          ...pinVerificationUser,
          is_campus_active: pinVerificationUser.is_campus_active ?? true,
          schools: pinVerificationUser.schools || schoolData
        };
        onCloseVerify();
        setPinVerificationAttempts(0);
        
        const isTeacher = user.role?.toLowerCase() === 'teacher' || user.role?.toLowerCase() === 'admin';
        if (isTeacher) {
          if (user.is_observer) {
            await onFinalizeLogin(user, loginStationId, false, true);
          } else {
            const isGroovelabScreen = isGroovelabKiosk;
            if (isGroovelabScreen) {
              await onFinalizeLogin(user, loginStationId, pinVerificationIsWithinRoom, false);
            } else {
              await onFinalizeLogin(user, loginStationId, false, true);
            }
          }
        } else {
          await onFinalizeLogin(user, loginStationId, pinVerificationIsWithinRoom);
        }
      } else {
        const newAttempts = pinVerificationAttempts + 1;
        setPinVerificationAttempts(newAttempts);

        if (pinVerificationUser.role === 'student' && newAttempts >= 3) {
          try {
            await supabase
              .from('users')
              .update({ is_campus_active: false, is_groovelab_active: false })
              .eq('id', pinVerificationUser.id);
            alert('Dieses Konto wurde nach 3 Fehlversuchen aus Sicherheitsgründen gesperrt. Bitte wende dich an die Musikschule.');
          } catch (e) {
            console.error(e);
          }
          onCloseVerify();
        } else if (pinVerificationUser.role !== 'student' && newAttempts >= 3) {
          // 🛡️ Fail-Closed 3-Strike Revocation für Lehrkräfte & Mitarbeiter:
          // Die lokale Gerätebindung wird sofort und unwiderruflich gelöscht.
          clearRememberedPin(pinVerificationUser.id);
          alert('Sicherheits-Warnung: Nach 3 Fehlversuchen wurde die Geräte-Schnell-PIN deaktiviert. Bitte melde dich mit deinem Master-Passwort an.');
          onCloseVerify();
        } else {
          const limit = 3;
          const remaining = limit - newAttempts;
          if (remaining <= 0) {
            alert('Zu viele Fehlversuche. Bitte wende dich an deine Schule.');
            onCloseVerify();
          } else {
            alert(`Die eingegebene PIN ist nicht korrekt. Noch ${remaining} Versuch${remaining === 1 ? '' : 'e'}.`);
          }
        }
        setPinVerificationInput('');
      }
    } catch (err: any) {
      console.error('[PIN Login] Fehler bei Verifikation:', err);
      setPinVerificationInput('');
    } finally {
      setIsVerifyingPin(false);
      setLoading(false);
    }
  };

  // 🌟 0,1% APPLE GOLDSTANDARD AUTO-SUBMIT:
  // Sobald alle Ziffern eingegeben sind (4 bei Schüler, 6 bei Eltern),
  // startet die Verifizierung vollautomatisch nach 150ms – ohne Klick auf "Verifizieren"!
  useEffect(() => {
    if (!pinVerificationUser || isVerifyingPin || loading) return;

    const targetLength = isStudentRole
      ? (pinVerificationMode === 'parent' ? 6 : 4)
      : 4;

    if (pinVerificationInput.length === targetLength) {
      const autoTimer = setTimeout(() => {
        handleVerifyPin(pinVerificationInput);
      }, 150);
      return () => clearTimeout(autoTimer);
    }
  }, [pinVerificationInput, pinVerificationMode, isStudentRole, pinVerificationUser, isVerifyingPin, loading]);

  // ⌨️ Nativer Tastatur-Listener für Desktop & iPad Magic Keyboard
  useEffect(() => {
    if (!pinSetupUser && !pinVerificationUser) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Wenn der Fokus in einem echten Input liegt (z.B. Checkbox), nicht abfangen
      if (document.activeElement && (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA'
      )) {
        return;
      }

      const isStudent = pinVerificationUser?.role === 'student';
      const limit = pinSetupUser ? 4 : (isStudent ? 6 : 4);

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        if (pinSetupUser) {
          if (pinSetupInput.length < 4) setPinSetupInput(prev => prev + e.key);
        } else if (pinVerificationUser) {
          if (pinVerificationInput.length < limit) {
            const nextVal = pinVerificationInput + e.key;
            if (isStudent && nextVal.length > 4 && pinVerificationMode === 'student') {
              setPinVerificationMode('parent');
            }
            setPinVerificationInput(nextVal);
          }
        }
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        if (pinSetupUser) {
          setPinSetupInput(prev => prev.slice(0, -1));
        } else if (pinVerificationUser) {
          setPinVerificationInput(prev => prev.slice(0, -1));
        }
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        if (pinSetupUser) {
          setPinSetupInput('');
        } else if (pinVerificationUser) {
          setPinVerificationInput('');
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (pinVerificationUser) {
          handleVerifyPin();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pinSetupUser, pinVerificationUser, pinSetupInput, pinVerificationInput, pinVerificationMode, isVerifyingPin, loading]);

  if (!pinSetupUser && !pinVerificationUser) {
    return null;
  }

  const renderKeypad = (type: 'setup' | 'verify') => {
    const isSetup = type === 'setup';
    const currentVal = isSetup ? pinSetupInput : pinVerificationInput;
    const setVal = isSetup ? setPinSetupInput : setPinVerificationInput;
    const limit = isSetup ? 4 : (isStudentRole ? 6 : 4);

    const handleKey = (k: string) => {
      if (k === '⌫' || k === 'del') {
        setVal(prev => prev.slice(0, -1));
      } else if (k === 'C') {
        setVal('');
      } else {
        if (currentVal.length < limit) {
          const nextVal = currentVal + k;
          if (isStudentRole && nextVal.length > 4 && pinVerificationMode === 'student') {
            setPinVerificationMode('parent');
          }
          setVal(nextVal);
        }
      }
    };

    // 🌟 0,1% Apple Goldstandard 3x4 Numpad Matrix:
    // Zeile 4 enthält links 'C' (Alles löschen), mittig '0' und rechts das Backspace-Icon (Zeichen löschen)
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
        width: '100%',
        maxWidth: '240px',
        marginTop: '12px'
      }}>
        {keys.map((k, i) => {
          const isClear = k === 'C';
          const isBack = k === '⌫';
          const isAction = isClear || isBack;
          const ariaLabel = isClear 
            ? 'Eingabe leeren (Alles löschen)' 
            : isBack 
              ? 'Letztes Zeichen löschen' 
              : `Ziffer ${k}`;

          return (
            <button
              key={i}
              type="button"
              aria-label={ariaLabel}
              title={ariaLabel}
              onClick={() => handleKey(k)}
              style={{
                height: '48px',
                borderRadius: '14px',
                border: isAction ? '1px solid #e2e8f0' : '1px solid #cbd5e1',
                background: isClear 
                  ? '#fef2f2' 
                  : isBack 
                    ? '#f1f5f9' 
                    : '#ffffff',
                color: isClear 
                  ? '#dc2626' 
                  : isBack 
                    ? '#475569' 
                    : '#0f172a',
                fontSize: isBack ? '14px' : '18px',
                fontWeight: isAction ? 800 : 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.12s ease',
                outline: 'none',
                boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                userSelect: 'none',
                touchAction: 'manipulation'
              }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.93)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'none'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
            >
              {isBack ? <Delete size={20} strokeWidth={2.2} /> : k}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* PIN Setup Modal */}
      {pinSetupUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px',
          fontFamily: 'Inter, system-ui, sans-serif'
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
            textAlign: 'center'
          }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: isGroovelabKiosk ? '#fef3c7' : '#e6f4ea', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isGroovelabKiosk ? '#d97706' : '#34a853', marginBottom: '16px' }}>
              <Key size={28} />
            </div>
            
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>Persönliche PIN einrichten</h3>
            <p style={{ margin: '8px 0 20px 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 600, lineHeight: '1.4' }}>
              Erster Login für <strong>{pinSetupUser.first_name} {pinSetupUser.last_name || ''}</strong>{pinSetupUser.ausweis_nummer ? ` (${normalizeCampusIdToNumeric(pinSetupUser.ausweis_nummer)})` : ''}.<br/>
              Bitte lege eine geheime 4-stellige PIN fest.
            </p>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: '2px solid #cbd5e1',
                  background: pinSetupInput.length > idx ? '#cbd5e1' : 'transparent',
                  transition: 'all 0.15s ease'
                }} />
              ))}
            </div>

            {renderKeypad('setup')}

            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              marginTop: '14px', cursor: 'pointer', userSelect: 'none', fontSize: '12.5px',
              color: '#475569', fontWeight: 600
            }}>
              <input
                type="checkbox"
                checked={rememberPinOnDevice}
                onChange={(e) => setRememberPinOnDevice(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: schoolData?.primary_color || '#16a34a', cursor: 'pointer' }}
              />
              <span>PIN auf diesem Gerät merken</span>
            </label>

            <button
              onClick={async () => {
                if (pinSetupInput.length !== 4) return;
                const validation = validateNewPin(pinSetupInput);
                if (!validation.isValid) {
                  alert(validation.error || 'Ungültige PIN.');
                  setPinSetupInput('');
                  return;
                }

                setLoading(true);
                try {
                  const authQrToken = pinSetupUser.qr_token || pinSetupUser.teacher_qr_token || pinSetupUser.ausweis_nummer || pinSetupUser.id || '';
                  if (authQrToken) {
                    sessionStorage.setItem('groovelab_qr_token', authQrToken);
                  }
                  let rpcSuccess = false;
                  let rpcErrorMsg = '';

                  // 1. Primary RPC
                  try {
                    const { data: rpcRes, error: rpcErr } = await supabase.rpc('set_initial_student_pin', {
                      p_student_id: pinSetupUser.id,
                      p_qr_token: authQrToken,
                      p_pin: pinSetupInput
                    });
                    if (!rpcErr && (rpcRes === true || (rpcRes as any)?.success === true)) {
                      rpcSuccess = true;
                    } else if (rpcErr) {
                      rpcErrorMsg = rpcErr.message;
                    }
                  } catch (e: any) {
                    rpcErrorMsg = e?.message || '';
                  }

                  // 2. Secondary Fallback RPC
                  if (!rpcSuccess) {
                    try {
                      const { data: pRes, error: pErr } = await supabase.rpc('set_personal_pin', {
                        p_user_id: pinSetupUser.id,
                        p_new_pin: pinSetupInput
                      });
                      if (!pErr && pRes === true) {
                        rpcSuccess = true;
                      } else if (pErr) {
                        rpcErrorMsg = pErr.message || rpcErrorMsg;
                      }
                    } catch (e: any) {
                      rpcErrorMsg = e?.message || rpcErrorMsg;
                    }
                  }

                  if (!rpcSuccess) {
                    throw new Error(rpcErrorMsg || 'Serverfehler beim Setzen der PIN.');
                  }

                  sessionStorage.removeItem('groovelab_qr_token');
                  
                  if (rememberPinOnDevice) {
                    setRememberedPin(pinSetupUser.id, pinSetupInput);
                  }

                  const user = {
                    ...pinSetupUser,
                    is_pin_activated: true,
                    has_personal_pin: true,
                    schools: pinSetupUser.schools || schoolData
                  };
                  onCloseSetup();
                  
                  const isTeacher = user.role?.toLowerCase() === 'teacher' || user.role?.toLowerCase() === 'admin';
                  if (isTeacher) {
                    if (user.is_observer) {
                      await onFinalizeLogin(user, loginStationId, false, true);
                    } else {
                      const isGroovelabScreen = isGroovelabKiosk;
                      if (isGroovelabScreen) {
                        await onFinalizeLogin(user, loginStationId, pinVerificationIsWithinRoom, false);
                      } else {
                        await onFinalizeLogin(user, loginStationId, false, true);
                      }
                    }
                  } else {
                    await onFinalizeLogin(user, loginStationId, pinVerificationIsWithinRoom);
                  }
                } catch (err: any) {
                  alert('Fehler beim Einrichten der PIN: ' + err.message);
                  setLoading(false);
                }
              }}
              disabled={pinSetupInput.length !== 4 || loading}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                background: pinSetupInput.length === 4 ? (schoolData?.primary_color || '#facc15') : '#cbd5e1',
                color: '#0f172a',
                fontWeight: 800,
                border: 'none',
                marginTop: '24px',
                cursor: pinSetupInput.length === 4 ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s'
              }}
            >
              PIN aktivieren &amp; Einloggen
            </button>
            
            <button
              onClick={onCloseSetup}
              style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginTop: '16px', cursor: 'pointer' }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* PIN Verification Modal */}
      {pinVerificationUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px',
          fontFamily: 'Inter, system-ui, sans-serif'
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
            textAlign: 'center'
          }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', marginBottom: '16px' }}>
              <Key size={28} />
            </div>
            
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>Persönliche PIN eingeben</h3>
            <p style={{ margin: '8px 0 16px 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 600, lineHeight: '1.4' }}>
              Login für <strong>{pinVerificationUser.name || pinVerificationUser.first_name}</strong>{pinVerificationUser.ausweis_nummer ? ` (${normalizeCampusIdToNumeric(pinVerificationUser.ausweis_nummer)})` : ''}.<br/>
              {pinVerificationUser.role === 'student' ? 'Gib deine 4-stellige Schüler-PIN oder 6-stellige Eltern-PIN ein.' : 'Bitte gib deine 4-stellige PIN ein.'}
            </p>

            {/* 🧒 / 👨‍👩‍👧 Dual-Mode Switcher für Schüler & Eltern */}
            {isStudentRole && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setPinVerificationMode('student');
                    if (pinVerificationInput.length > 4) setPinVerificationInput(prev => prev.slice(0, 4));
                  }}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: pinVerificationMode === 'student' ? '#16a34a' : '#f1f5f9',
                    color: pinVerificationMode === 'student' ? '#ffffff' : '#64748b',
                    fontSize: '11px',
                    fontWeight: 750,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  🧒 Schüler-PIN (4)
                </button>
                <button
                  type="button"
                  onClick={() => setPinVerificationMode('parent')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: pinVerificationMode === 'parent' ? '#16a34a' : '#f1f5f9',
                    color: pinVerificationMode === 'parent' ? '#ffffff' : '#64748b',
                    fontSize: '11px',
                    fontWeight: 750,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  👨‍👩‍👧 Eltern-PIN (6)
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              {Array.from({ length: isStudentRole ? (pinVerificationMode === 'parent' || pinVerificationInput.length > 4 ? 6 : 4) : 4 }).map((_, idx) => {
                const isFilled = pinVerificationInput.length > idx;
                const dotColor = schoolData?.primary_color || '#16a34a';
                return (
                  <div key={idx} style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: isFilled ? `2px solid ${dotColor}` : '2px solid #cbd5e1',
                    background: isFilled ? dotColor : 'transparent',
                    transform: isFilled ? 'scale(1.18)' : 'scale(1)',
                    boxShadow: isFilled ? `0 0 10px ${dotColor}55` : 'none',
                    transition: 'all 0.15s ease'
                  }} />
                );
              })}
            </div>

            {renderKeypad('verify')}

            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              marginTop: '14px', cursor: 'pointer', userSelect: 'none', fontSize: '12.5px',
              color: '#475569', fontWeight: 600
            }}>
              <input
                type="checkbox"
                checked={rememberPinOnDevice}
                onChange={(e) => setRememberPinOnDevice(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: schoolData?.primary_color || '#16a34a', cursor: 'pointer' }}
              />
              <span>PIN auf diesem Gerät merken</span>
            </label>

            <button
              type="button"
              onClick={() => handleVerifyPin()}
              disabled={isVerifyingPin || loading || (isStudentRole ? !(pinVerificationInput.length === 4 || pinVerificationInput.length === 6) : pinVerificationInput.length !== 4)}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                background: (isStudentRole ? (pinVerificationInput.length === 4 || pinVerificationInput.length === 6) : pinVerificationInput.length === 4)
                  ? (schoolData?.primary_color || '#16a34a')
                  : '#cbd5e1',
                color: (isStudentRole ? (pinVerificationInput.length === 4 || pinVerificationInput.length === 6) : pinVerificationInput.length === 4)
                  ? '#ffffff'
                  : '#64748b',
                fontWeight: 800,
                border: 'none',
                marginTop: '20px',
                cursor: (isVerifyingPin || loading) ? 'wait' : ((isStudentRole ? (pinVerificationInput.length === 4 || pinVerificationInput.length === 6) : pinVerificationInput.length === 4) ? 'pointer' : 'not-allowed'),
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {isVerifyingPin || loading ? 'Wird geprüft...' : 'Verifizieren & Einloggen'}
            </button>
            
            <button
              onClick={onCloseVerify}
              style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginTop: '16px', cursor: 'pointer' }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </>
  );
}

import React, { useState } from 'react';
import { Key } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { validateNewPin } from '../../utils/pinValidation';
import { setRememberedPin, clearRememberedPin } from '../../utils/trustedDevicePin';

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
  if (!pinSetupUser && !pinVerificationUser) {
    return null;
  }

  const renderKeypad = (type: 'setup' | 'verify') => {
    const isSetup = type === 'setup';
    const currentVal = isSetup ? pinSetupInput : pinVerificationInput;
    const setVal = isSetup ? setPinSetupInput : setPinVerificationInput;
    const limit = 4;

    const handleKey = (k: string) => {
      if (k === 'del') {
        setVal(prev => prev.slice(0, -1));
      } else {
        if (currentVal.length < limit) {
          setVal(prev => prev + k);
        }
      }
    };

    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

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
          if (k === '') return <div key={i} />;
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleKey(k)}
              style={{
                height: '46px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#0f172a',
                fontSize: k === 'del' ? '13px' : '18px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                outline: 'none',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
            >
              {k}
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
              Erster Login für <strong>{pinSetupUser.first_name} {pinSetupUser.last_name || ''}</strong>{pinSetupUser.ausweis_nummer ? ` (${pinSetupUser.ausweis_nummer})` : ''}.<br/>
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
                background: pinSetupInput.length === 4 ? (schoolData?.primary_color || '#eab308') : '#cbd5e1',
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
            <p style={{ margin: '8px 0 20px 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 600, lineHeight: '1.4' }}>
              Login für <strong>{pinVerificationUser.name || pinVerificationUser.first_name}</strong>{pinVerificationUser.ausweis_nummer ? ` (${pinVerificationUser.ausweis_nummer})` : ''}.<br/>
              {pinVerificationUser.role === 'student' ? 'Bitte gib deine Schüler-PIN oder Eltern-PIN ein.' : 'Bitte gib deine 4-stellige PIN ein.'}
            </p>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
              {[0, 1, 2, 3].map((idx) => {
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
              onClick={async () => {
                if (pinVerificationInput.length !== 4) return;
                const cleanPin = pinVerificationInput.trim();
                
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
                  } else {
                    const limit = pinVerificationUser.role === 'student' ? 3 : 5;
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
              }}
              disabled={pinVerificationInput.length !== 4}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                background: pinVerificationInput.length === 4 ? (schoolData?.primary_color || '#eab308') : '#cbd5e1',
                color: '#0f172a',
                fontWeight: 800,
                border: 'none',
                marginTop: '20px',
                cursor: pinVerificationInput.length === 4 ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s'
              }}
            >
              Verifizieren &amp; Einloggen
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

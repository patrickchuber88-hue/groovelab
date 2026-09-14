import React from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, CheckCheck, CheckCircle, Delete, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { validateNewPin } from "../../../utils/pinValidation";

export interface FirstLoginPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentUser: any;
  studentId: string;
  authQrToken?: string;
  pinFormNew: string;
  setPinFormNew: React.Dispatch<React.SetStateAction<string>>;
  pinFormConfirm: string;
  setPinFormConfirm: React.Dispatch<React.SetStateAction<string>>;
  pinFormError: string;
  setPinFormError: React.Dispatch<React.SetStateAction<string>>;
  firstPinActiveField: "new" | "confirm";
  setFirstPinActiveField: React.Dispatch<React.SetStateAction<"new" | "confirm">>;
  firstPinShowMask: boolean;
  setFirstPinShowMask: React.Dispatch<React.SetStateAction<boolean>>;
  firstPinSavedSuccess: boolean;
  setFirstPinSavedSuccess: React.Dispatch<React.SetStateAction<boolean>>;
  isSavingPin: boolean;
  setIsSavingPin: React.Dispatch<React.SetStateAction<boolean>>;
  setStudentUser: React.Dispatch<React.SetStateAction<any>>;
  onProfileUpdate?: (updatedFields?: any) => void;
}

export const FirstLoginPinModal: React.FC<FirstLoginPinModalProps> = ({
  isOpen,
  onClose,
  studentUser,
  studentId,
  authQrToken,
  pinFormNew,
  setPinFormNew,
  pinFormConfirm,
  setPinFormConfirm,
  pinFormError,
  setPinFormError,
  firstPinActiveField,
  setFirstPinActiveField,
  firstPinShowMask,
  setFirstPinShowMask,
  firstPinSavedSuccess,
  setFirstPinSavedSuccess,
  isSavingPin,
  setIsSavingPin,
  setStudentUser,
  onProfileUpdate,
}) => {
  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
<div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.80)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: 10005,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          overflowY: 'auto'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '28px',
            padding: '28px 24px',
            maxWidth: '390px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            textAlign: 'center',
            position: 'relative'
          }}>
            {/* Header Icon */}
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '22px',
              background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
              border: '1.5px solid #86efac',
              boxShadow: '0 8px 20px rgba(34, 197, 94, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto'
            }}>
              <ShieldCheck size={36} color="#15803d" />
            </div>

            {/* Title & Subtitle */}
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                Dein persönlicher Profil-PIN 🔑
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0, lineHeight: 1.45, fontWeight: 500 }}>
                Wähle eine persönliche 4-stellige PIN, um dein Profil, deine Übe-Fortschritte und Notizen zu schützen:
              </p>
            </div>

            {/* Error / Success Badges */}
            {pinFormError && (
              <div style={{
                padding: '10px 14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '14px',
                color: '#dc2626',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <AlertTriangle size={16} />
                <span>{pinFormError}</span>
              </div>
            )}

            {firstPinSavedSuccess && (
              <div style={{
                padding: '10px 14px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '14px',
                color: '#15803d',
                fontSize: '0.82rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <CheckCircle size={18} />
                <span>PIN erfolgreich gespeichert! 🚀</span>
              </div>
            )}

            {/* Two Pin Display Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Field 1: Neue PIN */}
              <div 
                role="button"
                tabIndex={0}
                aria-label="1. Neue 4-stellige PIN auswählen"
                onClick={() => setFirstPinActiveField('new')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setFirstPinActiveField('new');
                  }
                }}
                style={{
                  padding: '12px 14px',
                  borderRadius: '16px',
                  border: firstPinActiveField === 'new' ? '2px solid #15803d' : '1.5px solid #e2e8f0',
                  background: firstPinActiveField === 'new' ? '#f0fdf4' : '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: firstPinActiveField === 'new' ? '#15803d' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    1. Neue 4-stellige PIN
                  </span>
                  {pinFormNew.length === 4 && (
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#15803d', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Check size={13} strokeWidth={3} /> 4 Ziffern
                    </span>
                  )}
                </div>

                {/* 4 Dots / Numbers Display */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', padding: '4px 0' }}>
                  {[0, 1, 2, 3].map((idx) => {
                    const char = pinFormNew[idx];
                    const isFilled = Boolean(char);
                    return (
                      <div
                        key={idx}
                        style={{
                          width: '42px',
                          height: '46px',
                          borderRadius: '12px',
                          border: isFilled ? '2px solid #15803d' : (firstPinActiveField === 'new' && pinFormNew.length === idx ? '2px solid #3b82f6' : '1.5px solid #cbd5e1'),
                          background: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.25rem',
                          fontWeight: 900,
                          color: '#0f172a',
                          boxShadow: isFilled ? '0 2px 6px rgba(21, 128, 61, 0.15)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isFilled ? (firstPinShowMask ? char : '●') : ''}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Field 2: PIN Bestätigen */}
              <div 
                role="button"
                tabIndex={0}
                aria-label="2. PIN wiederholen auswählen"
                onClick={() => setFirstPinActiveField('confirm')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setFirstPinActiveField('confirm');
                  }
                }}
                style={{
                  padding: '12px 14px',
                  borderRadius: '16px',
                  border: firstPinActiveField === 'confirm' ? '2px solid #15803d' : '1.5px solid #e2e8f0',
                  background: firstPinActiveField === 'confirm' ? '#f0fdf4' : '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: firstPinActiveField === 'confirm' ? '#15803d' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    2. PIN wiederholen
                  </span>
                  {pinFormConfirm.length === 4 && (
                    pinFormNew === pinFormConfirm ? (
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#15803d', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCheck size={14} strokeWidth={2.5} /> Stimmt überein
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#dc2626' }}>
                        Stimmt nicht überein
                      </span>
                    )
                  )}
                </div>

                {/* 4 Dots / Numbers Display */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', padding: '4px 0' }}>
                  {[0, 1, 2, 3].map((idx) => {
                    const char = pinFormConfirm[idx];
                    const isFilled = Boolean(char);
                    return (
                      <div
                        key={idx}
                        style={{
                          width: '42px',
                          height: '46px',
                          borderRadius: '12px',
                          border: isFilled ? (pinFormNew === pinFormConfirm && pinFormConfirm.length === 4 ? '2px solid #15803d' : '2px solid #64748b') : (firstPinActiveField === 'confirm' && pinFormConfirm.length === idx ? '2px solid #3b82f6' : '1.5px solid #cbd5e1'),
                          background: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.25rem',
                          fontWeight: 900,
                          color: '#0f172a',
                          boxShadow: isFilled ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isFilled ? (firstPinShowMask ? char : '●') : ''}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Toggle show/hide numbers */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', margin: '-6px 0 0 0' }}>
              <button
                type="button"
                onClick={() => setFirstPinShowMask(!firstPinShowMask)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '2px 4px'
                }}
              >
                {firstPinShowMask ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{firstPinShowMask ? 'Ziffern verbergen' : 'Ziffern anzeigen'}</span>
              </button>
            </div>

            {/* On-Screen Touch Keypad */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              width: '100%'
            }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'back'].map((key) => {
                const isClear = key === 'C';
                const isBack = key === 'back';
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setPinFormError('');
                      if (firstPinActiveField === 'new') {
                        if (isClear) {
                          setPinFormNew('');
                        } else if (isBack) {
                          setPinFormNew(prev => prev.slice(0, -1));
                        } else if (pinFormNew.length < 4) {
                          const nextVal = pinFormNew + key;
                          setPinFormNew(nextVal);
                          if (nextVal.length === 4) {
                            setFirstPinActiveField('confirm');
                          }
                        }
                      } else {
                        if (isClear) {
                          setPinFormConfirm('');
                        } else if (isBack) {
                          if (pinFormConfirm.length === 0) {
                            setFirstPinActiveField('new');
                          } else {
                            setPinFormConfirm(prev => prev.slice(0, -1));
                          }
                        } else if (pinFormConfirm.length < 4) {
                          setPinFormConfirm(prev => prev + key);
                        }
                      }
                    }}
                    style={{
                      padding: '12px 0',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      background: (isClear || isBack) ? '#f1f5f9' : '#ffffff',
                      color: '#0f172a',
                      fontSize: (isClear || isBack) ? '0.85rem' : '1.25rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.03)',
                      transition: 'all 0.1s ease',
                      userSelect: 'none'
                    }}
                    onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)'; e.currentTarget.style.background = '#e2e8f0'; }}
                    onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = (isClear || isBack) ? '#f1f5f9' : '#ffffff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = (isClear || isBack) ? '#f1f5f9' : '#ffffff'; }}
                  >
                    {isBack ? <Delete size={18} color="#475569" /> : (isClear ? 'Löschen' : key)}
                  </button>
                );
              })}
            </div>

            {/* Submit Action Button */}
            <button
              disabled={isSavingPin || pinFormNew.length !== 4 || pinFormConfirm.length !== 4}
              onClick={async () => {
                if (pinFormNew.length !== 4) {
                  setPinFormError('Bitte gib eine vollständige 4-stellige PIN ein.');
                  setFirstPinActiveField('new');
                  return;
                }
                if (pinFormNew !== pinFormConfirm) {
                  setPinFormError('Die beiden PINs stimmen nicht überein.');
                  setFirstPinActiveField('confirm');
                  return;
                }

                const dayOfBirth = (studentUser as any)?.day_of_birth || (Array.isArray((studentUser as any)?.activation_days) ? (studentUser as any)?.activation_days[0]?.day_of_birth : (studentUser as any)?.activation_days?.day_of_birth);
                const validation = validateNewPin(pinFormNew, dayOfBirth);
                if (!validation.isValid) {
                  setPinFormError(validation.error || 'Ungültige PIN.');
                  return;
                }

                setIsSavingPin(true);
                setPinFormError('');

                try {
                  // Ensure security session tokens are set so RLS authorizes the update
                  if (studentId) {
                    sessionStorage.setItem('groovelab_user_id', studentId);
                    const resolvedAuthQrToken = studentUser?.qr_token || studentUser?.ausweis_nummer || studentId;
                    if (resolvedAuthQrToken) {
                      sessionStorage.setItem('groovelab_qr_token', resolvedAuthQrToken);
                    }
                  }

                  const resolvedAuthQrToken = studentUser?.qr_token || studentUser?.ausweis_nummer || studentId || '';
                  
                  let rpcSuccess = false;
                  let rpcErrorMsg = '';

                  // 1. Primary RPC
                  try {
                    const { data: rpcRes, error } = await supabase.rpc('set_initial_student_pin', {
                      p_student_id: studentId,
                      p_qr_token: resolvedAuthQrToken,
                      p_pin: pinFormNew
                    });
                    if (!error && rpcRes === true) {
                      rpcSuccess = true;
                    } else if (error) {
                      rpcErrorMsg = error.message;
                    }
                  } catch (e: any) {
                    rpcErrorMsg = e?.message || '';
                  }

                  // 2. Secondary Fallback RPC
                  if (!rpcSuccess) {
                    try {
                      const { data: pRes, error: pErr } = await supabase.rpc('set_personal_pin', {
                        p_user_id: studentId,
                        p_new_pin: pinFormNew
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
                    setPinFormError('Fehler beim Speichern: ' + (rpcErrorMsg || 'Serverfehler'));
                  } else {
                    setFirstPinSavedSuccess(true);
                    setStudentUser((prev: any) => prev ? {
                      ...prev,
                      is_pin_activated: true,
                      has_personal_pin: true
                    } : prev);
                    
                    if (onProfileUpdate) {
                      try { onProfileUpdate({ is_pin_activated: true, has_personal_pin: true }); } catch (e) {}
                    }

                    setTimeout(() => {
                      onClose();
                      setFirstPinSavedSuccess(false);
                      setPinFormNew('');
                      setPinFormConfirm('');
                    }, 800);
                  }
                } catch (err: any) {
                  setPinFormError('Fehler: ' + (err?.message || 'Speichern fehlgeschlagen.'));
                } finally {
                  setIsSavingPin(false);
                }
              }}
              style={{
                padding: '15px',
                borderRadius: '16px',
                background: (pinFormNew.length === 4 && pinFormConfirm.length === 4 && pinFormNew === pinFormConfirm) 
                  ? 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)' 
                  : '#cbd5e1',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.88rem',
                fontWeight: 900,
                cursor: (pinFormNew.length === 4 && pinFormConfirm.length === 4 && pinFormNew === pinFormConfirm && !isSavingPin) ? 'pointer' : 'not-allowed',
                boxShadow: (pinFormNew.length === 4 && pinFormConfirm.length === 4 && pinFormNew === pinFormConfirm) 
                  ? '0 6px 20px rgba(21, 128, 61, 0.35)' 
                  : 'none',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {isSavingPin ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTopColor: '#ffffff',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  <span>Wird gespeichert...</span>
                </>
              ) : (
                <>
                  <Lock size={18} />
                  <span>PIN jetzt festlegen &amp; Profil sichern</span>
                </>
              )}
            </button>
          </div>
        </div>
  , document.body);
};

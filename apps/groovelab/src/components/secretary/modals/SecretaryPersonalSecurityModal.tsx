import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Fingerprint,
  KeyRound,
  Lock,
  ShieldCheck,
  Sparkles,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  QrCode,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
  isWebAuthnSupported,
  getStoredBiometricProfiles,
  registerBiometrics,
  saveBiometricProfile,
  authenticateUserBiometrics,
  removeBiometricProfile,
  BiometricVaultProfile
} from '../../../utils/webauthn';
import { validateNewPassword } from '../../../utils/passwordValidation';
import { getCanonicalQrLandingUrl } from '../../../utils/tenantUrlHelper';
import { resolveUserCampusId } from '../../../utils/campusIdHelper';

export interface SecretaryPersonalSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserProfile: any;
  schoolName?: string;
  onOpenQrModal?: () => void;
}

export const SecretaryPersonalSecurityModal: React.FC<SecretaryPersonalSecurityModalProps> = ({
  isOpen,
  onClose,
  currentUserProfile,
  schoolName = 'Musikschule',
  onOpenQrModal
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Biometrics State
  const [biometricsStatus, setBiometricsStatus] = useState<'idle' | 'registering' | 'verifying' | 'success' | 'error'>('idle');
  const [biometricsMessage, setBiometricsMessage] = useState<string>('');
  const [hasDevicePasskey, setHasDevicePasskey] = useState<boolean>(false);

  // 4-Digit Quick PIN State
  const [newPin, setNewPin] = useState<string>('');
  const [savingPin, setSavingPin] = useState<boolean>(false);
  const [pinMessage, setPinMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [hasPersonalPin, setHasPersonalPin] = useState<boolean>(Boolean(currentUserProfile?.has_personal_pin || currentUserProfile?.is_pin_activated));

  // Master Password State
  const [showPasswordSection, setShowPasswordSection] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPasswordText, setShowPasswordText] = useState<boolean>(false);
  const [savingPassword, setSavingPassword] = useState<boolean>(false);
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Ausweis Copy State
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Check stored biometric profiles on open
  useEffect(() => {
    if (!isOpen || !currentUserProfile?.id) return;
    try {
      const profiles = getStoredBiometricProfiles();
      const isActive = profiles.some((p: BiometricVaultProfile) => p.userId === currentUserProfile.id || p.email === currentUserProfile.email);
      setHasDevicePasskey(isActive);
    } catch {
      setHasDevicePasskey(false);
    }
    setHasPersonalPin(Boolean(currentUserProfile?.has_personal_pin || currentUserProfile?.is_pin_activated));
  }, [isOpen, currentUserProfile]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    closeBtnRef.current?.focus();
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !currentUserProfile) return null;

  // --- Handlers: Biometrics ---
  const handleEnrollBiometrics = async () => {
    setBiometricsStatus('registering');
    setBiometricsMessage('');
    try {
      if (!isWebAuthnSupported()) {
        throw new Error('Biometrisches Anmelden (Touch ID / Face ID) wird von diesem Browser/Gerät nicht unterstützt.');
      }

      // 1. Authoritative cryptographic challenge from server
      const { data: chalData, error: chalErr } = await supabase.rpc('generate_webauthn_challenge', {
        p_user_id: currentUserProfile.id,
        p_type: 'register'
      });

      if (chalErr || !chalData?.challenge) {
        throw new Error('Sicherheits-Challenge konnte nicht vom Server bezogen werden.');
      }

      const userHandle = `${currentUserProfile.role || 'secretary'}_${currentUserProfile.id.substring(0, 8)}`;
      const userName = `${currentUserProfile.first_name || ''} ${currentUserProfile.last_name || ''}`.trim() || 'Mitarbeiter';
      const roleLabel = currentUserProfile.role === 'admin' ? 'Schulleitung' : 'Sekretariat';

      const passkeyResult = await registerBiometrics(
        userHandle,
        currentUserProfile.id,
        chalData.challenge,
        `${userName} (${roleLabel})`
      );

      const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
      const isMac = typeof navigator !== 'undefined' && /Macintosh|MacIntel|MacPPC|Mac68K/.test(navigator.userAgent) && !isIOS;
      const deviceName = (isIOS || isMac) ? 'Apple Touch ID / Face ID' : 'Passkey Authenticator';

      // 2. Authoritative server binding
      const { data: regResult, error: regErr } = await supabase.rpc('register_webauthn_credential', {
        p_user_id: currentUserProfile.id,
        p_credential_id: passkeyResult.id,
        p_public_key: JSON.stringify(passkeyResult.response),
        p_device_name: deviceName,
        p_challenge: chalData.challenge
      });

      if (regErr || !regResult?.success) {
        throw new Error(regErr?.message || regResult?.error || 'Registrierung fehlgeschlagen.');
      }

      // 3. 🛡️ Save to local Biometric Device Vault
      saveBiometricProfile({
        userId: currentUserProfile.id,
        firstName: currentUserProfile.first_name || '',
        lastName: currentUserProfile.last_name || '',
        role: currentUserProfile.role || 'secretary',
        schoolName: schoolName || null,
        credentialId: passkeyResult.id,
        sessionToken: currentUserProfile.id,
        createdAt: new Date().toISOString()
      });

      setHasDevicePasskey(true);
      setBiometricsStatus('success');
      setBiometricsMessage('Touch ID / Face ID wurde erfolgreich für dieses Gerät eingerichtet!');
      setTimeout(() => setBiometricsStatus('idle'), 4000);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
        setBiometricsStatus('idle');
        return;
      }
      setBiometricsStatus('error');
      setBiometricsMessage(err.message || 'Die Einrichtung wurde abgebrochen oder ist fehlgeschlagen.');
    }
  };

  const handleTestBiometrics = async () => {
    setBiometricsStatus('verifying');
    setBiometricsMessage('');
    try {
      await authenticateUserBiometrics(currentUserProfile.id);
      setBiometricsStatus('success');
      setBiometricsMessage('✓ Authentifizierung erfolgreich! Touch ID / Face ID funktioniert einwandfrei.');
      setTimeout(() => setBiometricsStatus('idle'), 4000);
    } catch (err: any) {
      setBiometricsStatus('error');
      setBiometricsMessage(err.message || 'Die Verifikation ist fehlgeschlagen oder wurde abgebrochen.');
    }
  };

  const handleRemoveBiometrics = () => {
    if (!currentUserProfile?.id) return;
    const confirm = window.confirm('Möchtest du den Touch ID / Face ID Passkey von diesem Gerät entfernen?');
    if (!confirm) return;
    try {
      removeBiometricProfile(currentUserProfile.id);
      setHasDevicePasskey(false);
      setBiometricsStatus('success');
      setBiometricsMessage('Passkey wurde erfolgreich von diesem Gerät entfernt.');
      setTimeout(() => setBiometricsStatus('idle'), 3000);
    } catch {
      setBiometricsStatus('error');
      setBiometricsMessage('Fehler beim Entfernen des Passkeys.');
    }
  };

  // --- Handlers: 4-Digit Quick PIN ---
  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newPin.trim();

    if (!/^\d{4}$/.test(clean)) {
      setPinMessage({ text: 'Bitte gib genau 4 Ziffern ein (z. B. 4829).', type: 'error' });
      return;
    }

    const trivialPins = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321'];
    if (trivialPins.includes(clean)) {
      setPinMessage({ text: 'Diese PIN ist zu einfach zu erraten. Bitte wähle eine sicherere 4-stellige Zahlenkombination.', type: 'error' });
      return;
    }

    setSavingPin(true);
    setPinMessage(null);

    try {
      const { data, error } = await supabase.rpc('set_personal_pin', {
        p_user_id: currentUserProfile.id,
        p_pin: clean
      });

      if (!error && data === true) {
        setHasPersonalPin(true);
        setNewPin('');
        setPinMessage({ text: 'Deine persönliche 4-stellige Schnell-PIN wurde sicher serverseitig gespeichert!', type: 'success' });
      } else {
        // Fallback parameter name
        const { data: data2, error: error2 } = await supabase.rpc('set_personal_pin', {
          p_user_id: currentUserProfile.id,
          p_new_pin: clean
        });
        if (!error2 && data2 === true) {
          setHasPersonalPin(true);
          setNewPin('');
          setPinMessage({ text: 'Deine persönliche 4-stellige Schnell-PIN wurde sicher serverseitig gespeichert!', type: 'success' });
        } else {
          throw new Error(error2?.message || error?.message || 'Serverfehler beim Speichern der PIN.');
        }
      }
    } catch (err: any) {
      setPinMessage({ text: err.message || 'Verbindungsfehler beim Speichern der PIN.', type: 'error' });
    } finally {
      setSavingPin(false);
    }
  };

  // --- Handlers: Master Password ---
  const passwordValidation = validateNewPassword(newPassword, {
    firstName: currentUserProfile?.first_name || '',
    lastName: currentUserProfile?.last_name || '',
    email: currentUserProfile?.email || '',
    schoolName
  });

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordValidation.isValid) {
      setPasswordMessage({ text: passwordValidation.error || 'Passwort erfüllt nicht die BSI-Kriterien.', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: 'Die Passwörter stimmen nicht überein.', type: 'error' });
      return;
    }

    setSavingPassword(true);
    setPasswordMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMessage({ text: '✓ Dein Passwort wurde erfolgreich aktualisiert!', type: 'success' });
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    } catch (err: any) {
      setPasswordMessage({ text: err.message || 'Fehler beim Ändern des Passworts.', type: 'error' });
    } finally {
      setSavingPassword(false);
    }
  };

  const canonicalLandingUrl = getCanonicalQrLandingUrl(
    currentUserProfile.teacher_qr_token || currentUserProfile.qr_token || currentUserProfile.ausweis_nummer
  );
  const campusId = resolveUserCampusId(currentUserProfile);
  const fullName = `${currentUserProfile.first_name || ''} ${currentUserProfile.last_name || ''}`.trim() || 'Mitarbeiter';
  const roleLabel = currentUserProfile.role === 'admin' ? 'Schulleitung & Administrator' : 'Schulsekretariat & Verwaltung';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="personal-security-modal-title"
      ref={modalRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.70)',
        backdropFilter: 'blur(10px)',
        padding: '16px',
        boxSizing: 'border-box'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '92vh',
          background: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid rgba(226, 232, 240, 0.8)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div style={{
          padding: '24px 28px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)'
            }}>
              <ShieldCheck size={26} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 id="personal-security-modal-title" style={{
                  margin: 0,
                  fontSize: '1.2rem',
                  fontWeight: 900,
                  color: '#0f172a',
                  fontFamily: 'Urbanist'
                }}>
                  Mein Profil &amp; Sicherheit
                </h2>
                <span style={{
                  background: '#e0f2fe',
                  color: '#0369a1',
                  padding: '2px 8px',
                  borderRadius: '100px',
                  fontSize: '0.68rem',
                  fontWeight: 800
                }}>
                  {roleLabel}
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                {fullName} • {schoolName} (Campus-ID: <code>{campusId}</code>)
              </p>
            </div>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Modal schließen"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              border: 'none',
              background: '#f1f5f9',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            className="hover-scale"
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY - SCROLLABLE */}
        <div style={{
          padding: '24px 28px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>

          {/* SÄULE 1: TOUCH ID / FACE ID PASSKEY */}
          <div style={{
            background: hasDevicePasskey ? 'linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%)' : '#f8fafc',
            border: hasDevicePasskey ? '1.5px solid #10b981' : '1.5px solid #e2e8f0',
            borderRadius: '18px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: hasDevicePasskey ? '#d1fae5' : '#f1f5f9',
                  color: hasDevicePasskey ? '#059669' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Fingerprint size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                      Touch ID / Face ID auf diesem Gerät
                    </h4>
                    <span style={{
                      background: hasDevicePasskey ? '#10b981' : '#f1f5f9',
                      color: hasDevicePasskey ? '#ffffff' : '#64748b',
                      padding: '2px 8px',
                      borderRadius: '100px',
                      fontSize: '0.64rem',
                      fontWeight: 800
                    }}>
                      {hasDevicePasskey ? 'Passkey Aktiv' : 'Nicht eingerichtet'}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4 }}>
                    {hasDevicePasskey
                      ? 'Biometrischer 1-Tap-Login ist auf diesem Gerät aktiv. Du kannst dich sekundenschnell per Fingerabdruck oder Gesichtserkennung anmelden.'
                      : 'Aktiviere den passwortlosen 1-Tap-Login über den Fingerabdrucksensor (Mac Touch ID) oder Face ID dieses Geräts.'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {hasDevicePasskey ? (
                  <>
                    <button
                      type="button"
                      onClick={handleTestBiometrics}
                      disabled={biometricsStatus === 'verifying'}
                      style={{
                        background: '#ffffff',
                        border: '1.5px solid #10b981',
                        color: '#059669',
                        padding: '7px 14px',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '0.76rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      className="hover-scale"
                    >
                      <Sparkles size={14} /> {biometricsStatus === 'verifying' ? 'Verifiziere...' : 'Passkey testen'}
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveBiometrics}
                      style={{
                        background: '#fff1f2',
                        border: 'none',
                        color: '#e11d48',
                        padding: '7px 12px',
                        borderRadius: '10px',
                        fontWeight: 750,
                        fontSize: '0.76rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      className="hover-scale"
                    >
                      <Trash2 size={13} /> Entfernen
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleEnrollBiometrics}
                    disabled={biometricsStatus === 'registering'}
                    style={{
                      background: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '10px',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    className="hover-scale"
                  >
                    <Fingerprint size={16} />
                    {biometricsStatus === 'registering' ? 'Warte auf Gerät...' : 'Touch ID / Face ID einrichten'}
                  </button>
                )}
              </div>
            </div>

            {biometricsMessage && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: biometricsStatus === 'error' ? '#fef2f2' : '#ecfdf5',
                border: biometricsStatus === 'error' ? '1px solid #fca5a5' : '1px solid #a7f3d0',
                color: biometricsStatus === 'error' ? '#991b1b' : '#065f46',
                fontSize: '0.74rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {biometricsStatus === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                <span>{biometricsMessage}</span>
              </div>
            )}
          </div>

          {/* SÄULE 2: PERSÖNLICHE 4-STELLIGE SCHNELL-PIN */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '18px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#fef3c7',
                  color: '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <KeyRound size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                      Persönliche 4-stellige Schnell-PIN
                    </h4>
                    <span style={{
                      background: hasPersonalPin ? '#dcfce7' : '#f1f5f9',
                      color: hasPersonalPin ? '#15803d' : '#64748b',
                      padding: '2px 8px',
                      borderRadius: '100px',
                      fontSize: '0.64rem',
                      fontWeight: 800
                    }}>
                      {hasPersonalPin ? 'Aktiv (Geschützt)' : 'Nicht gesetzt'}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4 }}>
                    Ermöglicht nach dem ersten Master-Login das sekundenschnelle Entsperren deines Arbeitsplatzes auf diesem Gerät.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSavePin} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="4 Ziffern"
                style={{
                  width: '130px',
                  padding: '9px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '1rem',
                  fontFamily: 'monospace',
                  letterSpacing: '0.3em',
                  textAlign: 'center',
                  outline: 'none',
                  background: '#f8fafc'
                }}
              />
              <button
                type="submit"
                disabled={savingPin || newPin.length !== 4}
                style={{
                  background: newPin.length === 4 ? '#0284c7' : '#e2e8f0',
                  color: newPin.length === 4 ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  padding: '9px 18px',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: newPin.length === 4 ? 'pointer' : 'default',
                  transition: 'all 0.15s ease'
                }}
              >
                {savingPin ? 'Speichere...' : hasPersonalPin ? 'PIN ändern' : 'PIN speichern'}
              </button>
            </form>

            {pinMessage && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: pinMessage.type === 'error' ? '#fef2f2' : '#ecfdf5',
                border: pinMessage.type === 'error' ? '1px solid #fca5a5' : '1px solid #a7f3d0',
                color: pinMessage.type === 'error' ? '#991b1b' : '#065f46',
                fontSize: '0.74rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {pinMessage.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                <span>{pinMessage.text}</span>
              </div>
            )}
          </div>

          {/* SÄULE 3: MASTER-PASSWORT (BSI / NIST) */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '18px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#f1f5f9',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Lock size={22} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                    Haupt-Passwort (BSI / NIST SP 800-63B)
                  </h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4 }}>
                    Dein Haupt-Passwort für Erstanmeldungen, neue Geräte und administrative Freigaben.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                style={{
                  background: showPasswordSection ? '#f1f5f9' : '#0284c7',
                  color: showPasswordSection ? '#475569' : '#ffffff',
                  border: 'none',
                  padding: '7px 14px',
                  borderRadius: '10px',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
                className="hover-scale"
              >
                {showPasswordSection ? 'Abbrechen' : 'Passwort ändern'}
              </button>
            </div>

            {showPasswordSection && (
              <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPasswordText ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Neues Passwort (mind. 12 Zeichen)"
                      style={{
                        width: '100%',
                        padding: '9px 38px 9px 12px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.8rem',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordText(!showPasswordText)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer'
                      }}
                    >
                      {showPasswordText ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Passwort bestätigen"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.8rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {newPassword && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Passwort-Stärke:</span>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: passwordValidation.strength === 'excellent' ? '#16a34a' : (passwordValidation.strength === 'good' ? '#ca8a04' : '#dc2626')
                    }}>
                      {passwordValidation.strength === 'excellent' ? 'Hervorragend (Passphrase / Hochsicher)' : (passwordValidation.strength === 'good' ? 'Gut' : 'Zu schwach')}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={savingPassword || !passwordValidation.isValid || newPassword !== confirmPassword}
                  style={{
                    background: passwordValidation.isValid && newPassword === confirmPassword ? '#0284c7' : '#e2e8f0',
                    color: passwordValidation.isValid && newPassword === confirmPassword ? '#ffffff' : '#94a3b8',
                    border: 'none',
                    padding: '9px 18px',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: passwordValidation.isValid && newPassword === confirmPassword ? 'pointer' : 'default',
                    alignSelf: 'flex-start'
                  }}
                >
                  {savingPassword ? 'Aktualisiere...' : 'Neues Passwort speichern'}
                </button>
              </form>
            )}

            {passwordMessage && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: passwordMessage.type === 'error' ? '#fef2f2' : '#ecfdf5',
                border: passwordMessage.type === 'error' ? '1px solid #fca5a5' : '1px solid #a7f3d0',
                color: passwordMessage.type === 'error' ? '#991b1b' : '#065f46',
                fontSize: '0.74rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {passwordMessage.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                <span>{passwordMessage.text}</span>
              </div>
            )}
          </div>

          {/* SÄULE 4: MEIN DIGITALER DIENSTAUSWEIS */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '18px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #e2e8f0'
                }}>
                  <QrCode size={22} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                    Mein Digitaler Dienstausweis
                  </h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: '#64748b' }}>
                    Dienstausweis zur Vorlage an Raum-Terminals oder zum Import in Apple Wallet.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {onOpenQrModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenQrModal();
                    }}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      padding: '7px 14px',
                      borderRadius: '10px',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    className="hover-scale"
                  >
                    <QrCode size={14} /> Großen Ausweis öffnen
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(canonicalLandingUrl);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  style={{
                    background: copiedLink ? '#ecfdf5' : '#ffffff',
                    border: copiedLink ? '1px solid #a7f3d0' : '1px solid #cbd5e1',
                    color: copiedLink ? '#047857' : '#475569',
                    padding: '7px 14px',
                    borderRadius: '10px',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  className="hover-scale"
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  {copiedLink ? 'Link kopiert!' : 'Login-Link kopieren'}
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'flex-end',
          background: '#f8fafc'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              padding: '9px 24px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
            className="hover-scale"
          >
            Fertig
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  QrCode, X, Check, Camera, AlertCircle, 
  ShieldCheck, ArrowRight, RefreshCw, Keyboard
} from 'lucide-react';

interface AddSiblingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStudentId: string;
  schoolId?: string | null;
  existingFamilyProfiles: any[];
  onProfileAdded: (profile: any) => void;
}

let jsQRInstance: any = null;
async function getJsQR() {
  if (!jsQRInstance) {
    const mod = await import('jsqr');
    jsQRInstance = mod.default || mod;
  }
  return jsQRInstance;
}

const getFallbackAvatar = (instrument: string | null | undefined): string => {
  if (!instrument) return '/avatars/gitarre_avatar_new.png';
  const inst = instrument.toLowerCase();
  if (inst.includes('gitarre') || inst.includes('guitar')) return '/avatars/gitarre_avatar_new.png';
  if (inst.includes('klavier') || inst.includes('piano') || inst.includes('keyboard')) return '/avatars/klavier_avatar_new.png';
  if (inst.includes('schlagzeug') || inst.includes('drum')) return '/avatars/schlagzeug_avatar_new.png';
  if (inst.includes('bass')) return '/avatars/bass_avatar_new.png';
  if (inst.includes('gesang') || inst.includes('vocal') || inst.includes('voice')) return '/avatars/gesang_avatar_new.png';
  if (inst.includes('geige') || inst.includes('violine')) return '/avatars/geige_avatar_new.png';
  if (inst.includes('sax') || inst.includes('bläser') || inst.includes('trompete')) return '/avatars/saxophon_avatar_new.png';
  return '/avatars/gitarre_avatar_new.png';
};

export const AddSiblingModal: React.FC<AddSiblingModalProps> = ({
  isOpen,
  onClose,
  currentStudentId,
  schoolId,
  existingFamilyProfiles,
  onProfileAdded
}) => {
  const [step, setStep] = useState<'scan' | 'pin' | 'confirm' | 'success'>('scan');
  const [scannedUser, setScannedUser] = useState<any>(null);
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const [pinError, setPinError] = useState<string>('');
  const [scanError, setScanError] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 🛡️ Hardware-Sicherheit: Sofortiger Kamera-Kill
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch (e) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  // 🛡️ Hardware-Sicherheit: Tab-Wechsel-Stopp (visibilitychange)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        stopCamera();
      } else if (isOpen && step === 'scan' && !showManualInput) {
        startCamera();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOpen, step, showManualInput, stopCamera]);

  // Kamera starten
  const startCamera = useCallback(async () => {
    stopCamera();
    setScanError('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setScanError('Kamera wird auf diesem Gerät oder Browser nicht unterstützt.');
      setShowManualInput(true);
      return;
    }

    try {
      await getJsQR();
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 480 },
          height: { ideal: 480 }
        },
        audio: false
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        startScanLoop();
      }
    } catch (err: any) {
      console.warn('[AddSiblingModal] Kamera-Zugriff fehlgeschlagen:', err);
      setScanError('Kamera-Zugriff nicht möglich. Bitte Berechtigung erteilen oder Code manuell eingeben.');
      setShowManualInput(true);
    }
  }, [facingMode, stopCamera]);

  // QR Frame Loop
  const startScanLoop = () => {
    canvasRef.current = document.createElement('canvas');
    let lastScanTime = 0;

    const scanFrame = (timestamp: number) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        if (timestamp - lastScanTime > 150) {
          lastScanTime = timestamp;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = 320;
            canvas.height = 320;
            ctx.drawImage(video, 0, 0, 320, 320);
            const imageData = ctx.getImageData(0, 0, 320, 320);
            if (jsQRInstance) {
              const code = jsQRInstance(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert'
              });
              if (code && code.data) {
                handleCredentialScanned(code.data);
                return;
              }
            }
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameRef.current = requestAnimationFrame(scanFrame);
  };

  // Lifecycle: Kamera beim Öffnen starten und beim Schließen stoppen
  useEffect(() => {
    if (isOpen && step === 'scan' && !showManualInput) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, step, showManualInput, startCamera, stopCamera]);

  // Reset beim Schließen
  const handleModalClose = () => {
    stopCamera();
    setStep('scan');
    setScannedUser(null);
    setPinDigits(['', '', '', '']);
    setPinError('');
    setScanError('');
    setIsVerifying(false);
    setShowManualInput(false);
    setManualCode('');
    onClose();
  };

  // 🛡️ Credential-Auflösung via Auth-RPC (Fail-Closed)
  const handleCredentialScanned = async (rawCredential: string) => {
    stopCamera();
    setIsVerifying(true);
    setScanError('');

    let token = rawCredential.trim();
    try {
      if (token.includes('http://') || token.includes('https://') || token.includes('?')) {
        const url = new URL(token.startsWith('http') ? token : `https://dummy.org/${token}`);
        token = url.searchParams.get('token') || 
                url.searchParams.get('campus_pass') || 
                url.searchParams.get('qr_token') || 
                url.searchParams.get('student') || 
                token;
      }
    } catch (e) {}

    try {
      const { data: authResult, error: rpcErr } = await supabase.rpc('authenticate_by_credential', {
        p_credential: token,
        p_school_id: schoolId || null
      });

      if (rpcErr || !authResult?.success || !authResult?.user) {
        setScanError('QR-Ausweis ungültig oder Schülerprofil an dieser Schule nicht gefunden.');
        setIsVerifying(false);
        return;
      }

      const user = authResult.user;

      // Prüfung auf Duplikate
      if (user.id === currentStudentId) {
        setScanError(`${user.first_name} ist bereits das aktuell ausgewählte Profil.`);
        setIsVerifying(false);
        return;
      }

      if (existingFamilyProfiles.some(p => p.id === user.id)) {
        setScanError(`${user.first_name} ist bereits in deinem Familien-Hub hinterlegt.`);
        setIsVerifying(false);
        return;
      }

      setScannedUser(user);
      setIsVerifying(false);

      // Verzweigung: Schüler-PIN erforderlich (Teen/Pro) oder 1-Klick Eltern-Autorisation (Junior)
      if (user.has_personal_pin) {
        setStep('pin');
        setTimeout(() => {
          pinInputRefs.current[0]?.focus();
        }, 150);
      } else {
        setStep('confirm');
      }
    } catch (err) {
      console.error('[AddSiblingModal] Fehler bei RPC-Authentifizierung:', err);
      setScanError('Verbindung zum Schul-Server fehlgeschlagen. Bitte erneut versuchen.');
      setIsVerifying(false);
    }
  };

  // PIN-Eingabe Handling
  const handlePinChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const digit = val.slice(-1);
    const next = [...pinDigits];
    next[index] = digit;
    setPinDigits(next);
    setPinError('');

    if (digit && index < 3) {
      pinInputRefs.current[index + 1]?.focus();
    }

    if (digit && index === 3) {
      const fullPin = next.join('');
      if (fullPin.length === 4) {
        verifySiblingPin(fullPin);
      }
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

  // 🛡️ Server-Side PIN-Verifikation
  const verifySiblingPin = async (pinToVerify?: string) => {
    const pin = pinToVerify || pinDigits.join('');
    if (pin.length !== 4) {
      setPinError('Bitte gib alle 4 Ziffern der Schüler-PIN ein.');
      return;
    }

    if (!scannedUser) return;
    setIsVerifying(true);
    setPinError('');

    try {
      const { data: pinOk, error: pinErr } = await supabase.rpc('verify_personal_pin', {
        user_uuid: scannedUser.id,
        input_pin: pin
      });

      if (pinErr || pinOk !== true) {
        setPinError('Schüler-PIN ist nicht korrekt. Bitte erneut eingeben.');
        setPinDigits(['', '', '', '']);
        setIsVerifying(false);
        setTimeout(() => pinInputRefs.current[0]?.focus(), 100);
        return;
      }

      finalizeLinking();
    } catch (err) {
      console.error('[AddSiblingModal] Fehler bei PIN-Prüfung:', err);
      setPinError('Fehler bei der PIN-Verifikation.');
      setIsVerifying(false);
    }
  };

  // Profil final hinzufügen
  const finalizeLinking = () => {
    if (!scannedUser) return;
    setIsVerifying(false);
    setStep('success');

    const newProfile = {
      id: scannedUser.id,
      first_name: scannedUser.first_name,
      last_name: scannedUser.last_name || '',
      instrument: scannedUser.instrument || 'Gitarre',
      photo_url: scannedUser.photo_url || null,
      campus_ui_level: scannedUser.campus_ui_level || 'junior',
      has_personal_pin: Boolean(scannedUser.has_personal_pin || scannedUser.is_pin_activated),
      role: 'student'
    };

    setTimeout(() => {
      onProfileAdded(newProfile);
      handleModalClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(20px) saturate(1.8)',
      WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100001,
      padding: '20px'
    }}>
      <div role="dialog" aria-modal="true" style={{
        background: '#ffffff',
        borderRadius: '28px',
        maxWidth: '480px',
        width: '100%',
        maxHeight: '92vh',
        overflowY: 'auto',
        padding: '28px 24px',
        boxShadow: '0 30px 70px -10px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.9) inset',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxSizing: 'border-box',
        position: 'relative',
        textAlign: 'center'
      }}>
        {/* Close Button */}
        <button
          type="button"
          onClick={handleModalClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: '#f1f5f9',
            border: 'none',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          className="hover-scale"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '16px',
            background: '#e0f2fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0284c7'
          }}>
            {step === 'success' ? <ShieldCheck size={26} color="#16a34a" /> : <QrCode size={26} />}
          </div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {step === 'scan' && 'Geschwisterkind hinzufügen'}
            {step === 'pin' && 'Schüler-PIN erforderlich'}
            {step === 'confirm' && 'Kind bestätigen'}
            {step === 'success' && 'Erfolgreich verknüpft!'}
          </h3>
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', fontWeight: 500, maxWidth: '340px', lineHeight: 1.4 }}>
            {step === 'scan' && 'Halte den offiziellen Campus-Groovelab QR-Ausweis deines zweiten Kindes vor die Kamera.'}
            {step === 'pin' && `Gib die 4-stellige Schüler-PIN von ${scannedUser?.first_name} ein, um den Datenschutz zu wahren.`}
            {step === 'confirm' && 'Überprüfe die Angaben und füge das Kind zum Schnellwechsel hinzu.'}
            {step === 'success' && `${scannedUser?.first_name} ist jetzt Teil des Familien-Hubs auf diesem Gerät.`}
          </p>
        </div>

        {/* STEP 1: SCAN */}
        {step === 'scan' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            {!showManualInput ? (
              <div style={{
                position: 'relative',
                width: '260px',
                height: '260px',
                borderRadius: '24px',
                overflow: 'hidden',
                background: '#0f172a',
                border: '3px solid #0284c7',
                boxShadow: '0 12px 30px -4px rgba(2, 132, 199, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <video
                  ref={videoRef}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  muted
                  playsInline
                />
                
                {/* Viewfinder Target Overlay */}
                <div style={{
                  position: 'absolute',
                  inset: '30px',
                  border: '2px dashed rgba(255, 255, 255, 0.7)',
                  borderRadius: '16px',
                  pointerEvents: 'none'
                }} />

                {/* Flip Camera Button */}
                <button
                  type="button"
                  onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    background: 'rgba(15, 23, 42, 0.75)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '34px',
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    backdropFilter: 'blur(4px)'
                  }}
                  title="Kamera wechseln"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            ) : (
              /* Manuelle Code-Eingabe */
              <div style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '20px',
                borderRadius: '20px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', textAlign: 'left' }}>
                  QR-Token oder Ausweis-Code manuell eingeben:
                </div>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="z. B. QR-Token oder Link"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && manualCode.trim()) {
                      handleCredentialScanned(manualCode.trim());
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => manualCode.trim() && handleCredentialScanned(manualCode.trim())}
                  disabled={!manualCode.trim() || isVerifying}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: manualCode.trim() ? 'pointer' : 'not-allowed',
                    opacity: manualCode.trim() ? 1 : 0.6
                  }}
                >
                  {isVerifying ? 'Überprüfe...' : 'Code prüfen & fortfahren'}
                </button>
              </div>
            )}

            {/* Error Message */}
            {scanError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '12px',
                background: '#fee2e2',
                color: '#dc2626',
                fontSize: '0.78rem',
                fontWeight: 700,
                textAlign: 'left',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{scanError}</span>
              </div>
            )}

            {/* Toggle between Camera and Manual Input */}
            <button
              type="button"
              onClick={() => {
                setShowManualInput(!showManualInput);
                setScanError('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#0284c7',
                fontSize: '0.78rem',
                fontWeight: 750,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {showManualInput ? <Camera size={14} /> : <Keyboard size={14} />}
              <span>{showManualInput ? 'Kamera-Scanner nutzen' : 'Keine Kamera? Code manuell eingeben'}</span>
            </button>
          </div>
        )}

        {/* STEP 2: PIN (TEEN / PRO) */}
        {step === 'pin' && scannedUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
            {/* Child Profile Preview */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '12px 18px',
              borderRadius: '18px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              <img
                src={scannedUser.photo_url || getFallbackAvatar(scannedUser.instrument)}
                alt={scannedUser.first_name}
                style={{ width: '48px', height: '48px', borderRadius: '14px', objectFit: 'cover' }}
                onError={(e) => { e.currentTarget.src = getFallbackAvatar(scannedUser.instrument); }}
              />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 850, color: '#0f172a' }}>
                  {scannedUser.first_name} {scannedUser.last_name ? scannedUser.last_name.trim().charAt(0) + '.' : ''}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                  {scannedUser.instrument || 'Schüler'} • {scannedUser.campus_ui_level?.toUpperCase() || 'TEEN'}
                </div>
              </div>
            </div>

            {/* 4-Digit PIN Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                {pinDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (pinInputRefs.current[idx] = el)}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(idx, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(idx, e)}
                    style={{
                      width: '46px',
                      height: '54px',
                      borderRadius: '14px',
                      border: pinError ? '2px solid #ef4444' : (digit ? '2px solid #0284c7' : '1.5px solid #cbd5e1'),
                      fontSize: '1.4rem',
                      fontWeight: 900,
                      textAlign: 'center',
                      background: '#f8fafc',
                      outline: 'none',
                      transition: 'all 0.15s ease'
                    }}
                  />
                ))}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                4-stellige persönliche Schüler-PIN
              </div>
            </div>

            {pinError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '10px',
                background: '#fee2e2',
                color: '#dc2626',
                fontSize: '0.76rem',
                fontWeight: 700
              }}>
                <AlertCircle size={14} />
                <span>{pinError}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button
                type="button"
                onClick={() => {
                  setStep('scan');
                  setPinDigits(['', '', '', '']);
                  setPinError('');
                  startCamera();
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '14px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontWeight: 750,
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                Zurück zum Scan
              </button>
              <button
                type="button"
                onClick={() => verifySiblingPin()}
                disabled={pinDigits.join('').length !== 4 || isVerifying}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '14px',
                  background: '#0284c7',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: pinDigits.join('').length === 4 ? 'pointer' : 'not-allowed',
                  opacity: pinDigits.join('').length === 4 ? 1 : 0.6
                }}
              >
                {isVerifying ? 'Prüfe...' : 'Bestätigen'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: CONFIRM (JUNIOR OHNE PIN) */}
        {step === 'confirm' && scannedUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              padding: '24px',
              borderRadius: '24px',
              background: '#f0fdf4',
              border: '1.5px solid #bbf7d0',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              <img
                src={scannedUser.photo_url || getFallbackAvatar(scannedUser.instrument)}
                alt={scannedUser.first_name}
                style={{
                  width: '76px',
                  height: '76px',
                  borderRadius: '22px',
                  objectFit: 'cover',
                  border: '3px solid #ffffff',
                  boxShadow: '0 8px 20px -4px rgba(22, 163, 74, 0.3)'
                }}
                onError={(e) => { e.currentTarget.src = getFallbackAvatar(scannedUser.instrument); }}
              />
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                  {scannedUser.first_name} {scannedUser.last_name ? scannedUser.last_name.trim().charAt(0) + '.' : ''}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 750, marginTop: '2px' }}>
                  {scannedUser.instrument || 'Schüler'} • Junior-Stufe (6–10 J.)
                </div>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 500, lineHeight: 1.35, marginTop: '4px' }}>
                Als Sorgeberechtigter im entsperrten Kontrollzentrum kannst du {scannedUser.first_name} direkt mit einem Klick zu diesem Gerät hinzufügen.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button
                type="button"
                onClick={() => {
                  setStep('scan');
                  setScannedUser(null);
                  startCamera();
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '14px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontWeight: 750,
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                Anderes Kind scannen
              </button>
              <button
                type="button"
                onClick={finalizeLinking}
                style={{
                  flex: 1.3,
                  padding: '12px',
                  borderRadius: '14px',
                  background: '#16a34a',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 850,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)'
                }}
                className="hover-scale"
              >
                <span>{scannedUser.first_name} hinzufügen</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 'success' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            padding: '24px 0'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#dcfce7',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Check size={36} strokeWidth={3} />
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 850, color: '#0f172a' }}>
              {scannedUser?.first_name} wurde verknüpft!
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
              Du kannst nun jederzeit blitzschnell zwischen den Geschwisterprofilen wechseln.
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

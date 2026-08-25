import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import { supabase } from '../lib/supabase';
import { 
  School, User, Mail, Lock, Phone, MapPin, CheckCircle, 
  ArrowRight, ArrowLeft, RefreshCw, Key, ShieldCheck, ShieldAlert, Check, Sparkles, Download, Fingerprint, Copy
} from 'lucide-react';
import { isWebAuthnSupported, registerBiometrics } from '../utils/webauthn';
import { inlineAllImagesInElement } from './IDBadgeCard';

interface SignupWizardProps {
  onBackToLogin: () => void;
  onSignupSuccess: (userId: string) => void;
}

export function SignupWizard({ onBackToLogin, onSignupSuccess }: SignupWizardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);
  
  const [createdUser, setCreatedUser] = useState<{
    id: string;
    first_name: string;
    last_name: string;
    qr_token: string;
    ausweis_nummer: string;
    schoolName: string;
    birthDay?: number;
  } | null>(null);

  const handleCopyCredentials = () => {
    if (!createdUser) return;
    const text = `Campus-Groovelab Zugangsdaten für ${createdUser.first_name} ${createdUser.last_name}:\nAusweis-PIN: ${createdUser.ausweis_nummer}\nGeräte-PIN: ${String(createdUser.birthDay || '').padStart(2, '0')}`;
    navigator.clipboard.writeText(text);
    setCopiedCredentials(true);
    setTimeout(() => setCopiedCredentials(false), 2500);
  };

  // Biometrische Login-States
  const [biometricsStatus, setBiometricsStatus] = useState<'idle' | 'registering' | 'success' | 'error'>('idle');
  const [biometricsErrorMessage, setBiometricsErrorMessage] = useState('');

  const handleRegisterBiometrics = async () => {
    if (!createdUser) return;
    setBiometricsStatus('registering');
    setBiometricsErrorMessage('');
    try {
      if (!isWebAuthnSupported()) {
        throw new Error('Biometrisches Anmelden wird von diesem Gerät oder Browser nicht unterstützt.');
      }
      const mockChallenge = btoa(crypto.randomUUID());
      const email = `${createdUser.first_name.toLowerCase()}.${createdUser.last_name.toLowerCase()}@campus-groovelab.local`;
      
      const result = await registerBiometrics(
        email,
        createdUser.id,
        mockChallenge
      );

      const { error } = await supabase.from('user_credentials').insert({
        user_id: createdUser.id,
        credential_id: result.id,
        public_key: JSON.stringify(result.response),
        device_name: 'WebAuthn Device'
      });

      if (error) throw error;
      setBiometricsStatus('success');
    } catch (err: any) {
      console.error('Biometrics registration failed:', err);
      setBiometricsStatus('error');
      setBiometricsErrorMessage(err.message || 'Die Einrichtung wurde abgebrochen oder ist fehlgeschlagen.');
    }
  };

  // Step 1: School Info
  const [schoolName, setSchoolName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const primaryColor = '#34a853';
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [city, setCity] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [isAccessGranted, setIsAccessGranted] = useState(true);
  const [accessCodeInput, setAccessCodeInput] = useState('');

  // Step 2: Owner Info
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminBirthDay, setAdminBirthDay] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  // Step 3: OTP
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);

  // Step 4: Progress Animation
  const [provisionProgress, setProvisionProgress] = useState(0);
  const [provisionStatus, setProvisionStatus] = useState('');

  // Check URL for pre-filled email from LandingPage & Sanitize session
  useEffect(() => {
    try {
      sessionStorage.removeItem('groovelab_user_id');
      sessionStorage.removeItem('groovelab_qr_token');
      localStorage.removeItem('groovelab_kiosk_token');
    } catch (e) {
      // ignore
    }
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setSchoolEmail(emailParam);
      setAdminEmail(emailParam);
    }
  }, []);

  // Pre-generate subdomain from school name
  useEffect(() => {
    if (step === 1 && schoolName) {
      const slug = schoolName
        .toLowerCase()
        .trim()
        .replace(/[äöüß]/g, (match) => {
          const mapping: Record<string, string> = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' };
          return mapping[match] || match;
        })
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSubdomain(slug);
    }
  }, [schoolName, step]);

  // Debounced check for subdomain availability
  useEffect(() => {
    if (!subdomain) {
      setSubdomainAvailable(null);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setCheckingSubdomain(true);
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('id')
          .eq('subdomain', subdomain.trim().toLowerCase())
          .maybeSingle();

        if (error) throw error;
        setSubdomainAvailable(data ? false : true);
      } catch (err) {
        console.error('Error checking subdomain:', err);
        setSubdomainAvailable(true); // Fallback
      } finally {
        setCheckingSubdomain(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [subdomain]);

  // Generate OTP code when entering step 3
  useEffect(() => {
    if (step === 3) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      console.log('OTP Verification Code for Campus-Groovelab:', code);
    }
  }, [step]);

  // Run the animated provisioning process
  const runProvisioning = async () => {
    setStep(4);
    
    // Simulate setup steps with progress
    const steps = [
      { progress: 15, status: 'Datenbank-Tenant wird provisioniert...' },
      { progress: 40, status: 'Mandanten-Infrastruktur wird initialisiert...' },
      { progress: 65, status: 'Administrator-Account wird erstellt...' },
      { progress: 85, status: 'Standard-Berechtigungen werden konfiguriert...' },
      { progress: 100, status: 'Campus-Groovelab ist einsatzbereit! 🎉' }
    ];

    let currentStepIdx = 0;
    
    const interval = setInterval(async () => {
      if (currentStepIdx < steps.length) {
        setProvisionProgress(steps[currentStepIdx].progress);
        setProvisionStatus(steps[currentStepIdx].status);
        currentStepIdx++;
      } else {
        clearInterval(interval);
        
        let schoolIdCreated = '';
        // Execute actual database insertions!
        try {
          // Clear any stale session headers right before provisioning
          try {
            sessionStorage.removeItem('groovelab_user_id');
            sessionStorage.removeItem('groovelab_qr_token');
            localStorage.removeItem('groovelab_kiosk_token');
          } catch (e) {}

          let schoolId = '';
          let adminId = '';
          let generatedAdminPin = '';
          let qrToken = '';
          const dummyEmail = schoolEmail.trim().toLowerCase() || `${subdomain.trim().toLowerCase()}@campus-groovelab.de`;

          // 1. Try atomic RPC first (Bypasses all client-side RLS and transaction conflicts)
          const { data: rpcData, error: rpcErr } = await supabase.rpc('register_school_and_admin', {
            p_school_name: schoolName.trim(),
            p_subdomain: subdomain.trim().toLowerCase(),
            p_street: street.trim(),
            p_house_number: houseNumber.trim() || null,
            p_zip_code: zipCode.trim(),
            p_city: city.trim(),
            p_phone: phoneNumber.trim() || null,
            p_school_email: schoolEmail.trim().toLowerCase(),
            p_admin_first_name: adminFirstName.trim(),
            p_admin_last_name: adminLastName.trim()
          });

          if (!rpcErr && rpcData?.success) {
            schoolId = rpcData.school_id;
            adminId = rpcData.admin_id;
            generatedAdminPin = rpcData.pin;
            qrToken = rpcData.qr_token;
          } else {
            if (rpcErr) {
              console.warn('[SignupWizard] RPC attempt notice:', rpcErr);
            }
            // Fallback: Direct table insertion
            schoolId = crypto.randomUUID();
            const { error: schoolErr } = await supabase
              .from('schools')
              .insert({
                id: schoolId,
                name: schoolName.trim(),
                legal_name: schoolName.trim(),
                subdomain: subdomain.trim().toLowerCase(),
                primary_color: primaryColor,
                street: street.trim(),
                house_number: houseNumber.trim() || null,
                zip_code: zipCode.trim(),
                city: city.trim(),
                phone_number: phoneNumber.trim() || null,
                email: schoolEmail.trim().toLowerCase(),
                billing_email: schoolEmail.trim().toLowerCase(),
                billing_contact_person: `${adminFirstName.trim()} ${adminLastName.trim()}`,
                country: 'Deutschland',
                has_campus_subscription: true,
                has_groovelab_subscription: true,
                subscription_bypass: false,
                is_trial: true,
                trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'trial',
                avv_signed_at: new Date().toISOString(),
                avv_signee_name: `${adminFirstName.trim()} ${adminLastName.trim()} (Schulleitung)`
              });

            if (schoolErr) throw schoolErr;
            schoolIdCreated = schoolId;

            // Generate a unique 6-digit Master-PIN for administrator
            generatedAdminPin = Math.floor(100000 + Math.random() * 900000).toString();
            adminId = crypto.randomUUID();
            qrToken = crypto.randomUUID();
            
            // Insert admin user (Enforcing chalkboard avatar /campus_login_hero.png as per Project Rules)
            const { error: userErr } = await supabase
              .from('users')
              .insert({
                id: adminId,
                school_id: schoolId,
                role: 'admin',
                roles: ['admin'],
                first_name: adminFirstName.trim(),
                last_name: adminLastName.trim(),
                email: dummyEmail,
                password_hash: generatedAdminPin, // Auto-generated admin login PIN
                qr_token: qrToken,
                ausweis_nummer: generatedAdminPin,
                photo_url: '/campus_login_hero.png',
                avatar_url: '/campus_login_hero.png',
                is_campus_active: true,
                is_groovelab_active: true,
                is_active: true,
                is_pin_activated: true
              });

            if (userErr) throw userErr;
          }

          // Automatically set complete session in localStorage & sessionStorage for immediate access
          const schoolObj = {
            id: schoolId,
            name: schoolName.trim(),
            subdomain: subdomain.trim().toLowerCase(),
            primary_color: primaryColor,
            street: street.trim(),
            house_number: houseNumber.trim(),
            zip_code: zipCode.trim(),
            city: city.trim(),
            country: 'Deutschland'
          };
          const userObj = {
            id: adminId,
            school_id: schoolId,
            role: 'admin',
            roles: ['admin'],
            first_name: adminFirstName.trim(),
            last_name: adminLastName.trim(),
            email: dummyEmail,
            photo_url: '/campus_login_hero.png',
            avatar_url: '/campus_login_hero.png'
          };
          localStorage.setItem('groovelab_session', JSON.stringify({ user: userObj, school: schoolObj, role: 'admin', token: adminId }));
          localStorage.setItem('groovelab_user', JSON.stringify(userObj));
          localStorage.setItem('groovelab_school', JSON.stringify(schoolObj));
          sessionStorage.setItem('groovelab_user_id', adminId);
          sessionStorage.setItem('groovelab_location_mode', 'home');
          sessionStorage.setItem('groovelab_active_platform', 'campus');
          
          setCreatedUser({
            id: adminId,
            first_name: adminFirstName.trim(),
            last_name: adminLastName.trim(),
            qr_token: qrToken,
            ausweis_nummer: generatedAdminPin,
            schoolName: schoolName.trim(),
            birthDay: adminBirthDay ? parseInt(adminBirthDay, 10) : undefined
          });

          // Transition to Step 3 success view
          setTimeout(() => {
            setStep(3);
          }, 1200);

        } catch (err: any) {
          console.error('Onboarding failed:', err);
          // Rollback: Clean up created school to avoid leaving behind an orphaned tenant
          if (schoolIdCreated) {
            try {
              await supabase.from('schools').delete().eq('id', schoolIdCreated);
            } catch (cleanupErr) {
              console.error('Failed to cleanup school after user insert failure:', cleanupErr);
            }
          }

          let friendlyError = err.message || 'Onboarding fehlgeschlagen. Bitte versuche es erneut.';
          if (err.code === '23505') {
            if (err.message?.includes('subdomain') || err.details?.includes('subdomain')) {
              friendlyError = 'Diese Wunsch-Subdomain wurde leider gerade von einer anderen Musikschule belegt. Bitte wähle eine andere Subdomain.';
            } else if (err.message?.includes('ausweis_nummer') || err.details?.includes('ausweis_nummer')) {
              friendlyError = 'Generierung einer einzigartigen PIN fehlgeschlagen. Bitte versuche es erneut.';
            }
          } else if (err.message?.toLowerCase().includes('unauthorized') || err.code === '42501' || err.status === 401 || err.status === 403) {
            friendlyError = 'Die Registrierung konnte nicht abgeschlossen werden. Bitte überprüfe deine Eingaben und versuche es erneut.';
          }
          setError(friendlyError);
          setStep(2);
        }
      }
    }, 800);
  };

  const downloadQrCode = async () => {
    if (!createdUser || !cardRef.current) return;
    try {
      await inlineAllImagesInElement(cardRef.current);
      const { toJpeg } = await import('html-to-image');
      const dataUrl = await toJpeg(cardRef.current, { 
        quality: 0.98,
        backgroundColor: '#ffffff',
        cacheBust: false,
        pixelRatio: 2
      });
      const downloadLink = document.createElement('a');
      downloadLink.href = dataUrl;
      downloadLink.download = `groovelab_ausweis_${createdUser.first_name}_${createdUser.last_name}.jpg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (e) {
      console.error('Error generating card image:', e);
    }
  };

  const downloadWalletPass = () => {
    if (!createdUser) return;
    const passContent = JSON.stringify({
      passTypeIdentifier: "pass.de.groovelab.admin",
      serialNumber: createdUser.qr_token,
      teamIdentifier: "GROOVELAB",
      organizationName: "Campus-Groovelab",
      description: "Campus-Groovelab Admin Access Pass",
      logoText: "Campus-Groovelab",
      foregroundColor: "rgb(255, 255, 255)",
      backgroundColor: "rgb(10, 54, 28)",
      labelColor: "rgb(230, 244, 234)",
      studentName: `${createdUser.first_name} ${createdUser.last_name}`,
      instrument: "Administrator / Schulleitung",
      qrToken: createdUser.qr_token
    }, null, 2);

    const blob = new Blob([passContent], { type: 'application/vnd.apple.pkpass' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `groovelab-pass-${createdUser.first_name || 'admin'}.pkpass`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedSubdomain = subdomain.trim().toLowerCase();
    if (trimmedSubdomain.length < 3) {
      setError('Die Wunsch-Subdomain muss mindestens 3 Zeichen lang sein.');
      return;
    }
    if (/^-+$/.test(trimmedSubdomain)) {
      setError('Die Wunsch-Subdomain darf nicht nur aus Bindestrichen bestehen.');
      return;
    }
    if (!subdomainAvailable) {
      setError('Bitte wähle eine verfügbare Wunsch-Subdomain.');
      return;
    }
    const zipRegex = /^[0-9]{5}$/;
    if (!zipRegex.test(zipCode.trim())) {
      setError('Die Postleitzahl (PLZ) muss aus genau 5 Ziffern bestehen.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    runProvisioning();
  };

  const presetColors = [
    '#3b82f6', // Blue
    '#34a853', // Green
    '#eab308', // Yellow
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#f97316'  // Orange
  ];

  const inputFocusStyle = {
    borderColor: '#34a853',
    boxShadow: '0 0 0 4px rgba(52, 168, 83, 0.15)',
    background: 'rgba(255, 255, 255, 0.08)'
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"Outfit", "Inter", -apple-system, sans-serif',
      background: 'radial-gradient(circle at 50% 50%, #34a853 0%, #022c22 100%)',
      color: '#ffffff',
      zIndex: 9999,
      overflowY: 'auto',
      padding: '24px 16px',
      boxSizing: 'border-box'
    }}>
      {/* Background Chalk Noise Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.015,
        pointerEvents: 'none',
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")'
      }} />

      <style>{`
        .signup-input {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .signup-input:focus {
          border-color: #34a853 !important;
          background: #ffffff !important;
          box-shadow: 0 0 0 4px rgba(52, 168, 83, 0.12) !important;
        }
        .signup-input::placeholder {
          color: #94a3b8 !important;
          opacity: 0.85 !important;
        }
        .signup-btn-next {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .signup-btn-next:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 24px rgba(52, 168, 83, 0.2) !important;
          filter: brightness(1.03);
        }
        .signup-btn-next:active:not(:disabled) {
          transform: translateY(0);
        }
        .signup-btn-back {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .signup-btn-back:hover:not(:disabled) {
          background: rgba(0, 0, 0, 0.08) !important;
        }
      `}</style>

      <div style={{
        width: '100%',
        maxWidth: (step === 4 || step === 3 || !isAccessGranted) ? '440px' : '580px',
        background: 'rgba(255, 255, 255, 0.94)',
        borderRadius: '24px',
        padding: (step === 3 || !isAccessGranted) ? '24px' : '38px',
        boxShadow: '0 30px 60px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        boxSizing: 'border-box',
        maxHeight: '94vh',
        overflowY: 'auto',
        color: '#1e293b'
      }}>
        {/* Header (except for provisioning step) */}
        {step < 3 && (
          <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(0, 0, 0, 0.08)', paddingBottom: '20px', marginBottom: '24px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(52, 168, 83, 0.1)', display: 'flex', alignItems: 'center', color: '#34a853', justifyContent: 'center' }}>
                <School size={22} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Campus-Groovelab</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'block', letterSpacing: '-0.02em' }}>Musikschule registrieren</span>
              </div>
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, background: 'rgba(0, 0, 0, 0.05)', color: '#334155', padding: '6px 14px', borderRadius: '100px', border: '1px solid rgba(0, 0, 0, 0.03)' }}>
              Schritt {step} von 2
            </span>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '14px', borderRadius: '16px', color: '#b91c1c', fontSize: '13px', fontWeight: 700, marginBottom: '20px', textAlign: 'left' }}>
            {error}
          </div>
        )}

        {/* STEP 1: SCHOOL INFO */}
        {step === 1 && (
          <form onSubmit={handleNextStep1} style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>Name der Musikschule *</label>
              <input
                type="text"
                required
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="z.B. Musterschule für Musik"
                style={inputStyle}
                className="signup-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>Wunsch-Subdomain *</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  required
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="musterschule"
                  style={{ ...inputStyle, paddingRight: '160px' }}
                  className="signup-input"
                />
                <span style={{ position: 'absolute', right: '16px', fontSize: '13px', fontWeight: 600, color: '#94a3b8', pointerEvents: 'none' }}>
                  .campus-groovelab.de
                </span>
              </div>
              <div style={{ marginTop: '6px', fontSize: '12px' }}>
                {checkingSubdomain && <span style={{ color: '#64748b' }}>Prüfe Verfügbarkeit...</span>}
                {!checkingSubdomain && subdomainAvailable === true && (
                  <span style={{ color: '#34a853', fontWeight: 600 }}>✓ Subdomain ist frei und verfügbar!</span>
                )}
                {!checkingSubdomain && subdomainAvailable === false && (
                  <span style={{ color: '#dc2626', fontWeight: 600 }}>✗ Diese Subdomain ist bereits vergeben.</span>
                )}
              </div>
            </div>

            {/* Address Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Straße *</label>
                <input
                  type="text"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Musterstraße"
                  style={inputStyle}
                  className="signup-input"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Nr. *</label>
                <input
                  type="text"
                  required
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  placeholder="12a"
                  style={inputStyle}
                  className="signup-input"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>PLZ *</label>
                <input
                  type="text"
                  required
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="12345"
                  style={inputStyle}
                  className="signup-input"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Ort *</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Musterstadt"
                  style={inputStyle}
                  className="signup-input"
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>Telefonnummer *</label>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+49 123 456789"
                style={inputStyle}
                className="signup-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>E-Mail-Adresse der Musikschule *</label>
              <input
                type="email"
                required
                value={schoolEmail}
                onChange={(e) => setSchoolEmail(e.target.value)}
                placeholder="leitung@musikschule.de"
                style={inputStyle}
                className="signup-input"
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button type="button" onClick={onBackToLogin} style={backButtonStyle} className="signup-btn-back">Zurück</button>
              <button type="submit" style={nextButtonStyle} className="signup-btn-next">
                Weiter zu Account-Details <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: OWNER INFO */}
        {step === 2 && (
          <form onSubmit={handleNextStep2} style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Vorname Schulleitung *</label>
                <input
                  type="text"
                  required
                  value={adminFirstName}
                  onChange={(e) => setAdminFirstName(e.target.value)}
                  placeholder="z.B. Maria"
                  style={inputStyle}
                  className="signup-input"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Nachname Schulleitung *</label>
                <input
                  type="text"
                  required
                  value={adminLastName}
                  onChange={(e) => setAdminLastName(e.target.value)}
                  placeholder="z.B. Musterfrau"
                  style={inputStyle}
                  className="signup-input"
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Tag des Geburtstags (Geräte-PIN für QR-Anmeldung) *</label>
              <select
                required
                value={adminBirthDay}
                onChange={(e) => setAdminBirthDay(e.target.value)}
                style={inputStyle}
                className="signup-input"
              >
                <option value="">Bitte wählen...</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {String(day).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>



            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button type="button" onClick={() => setStep(1)} style={backButtonStyle} className="signup-btn-back">Zurück</button>
              <button type="submit" style={nextButtonStyle} className="signup-btn-next">
                Konto kostenlos erstellen <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: PROVISIONING LOGIC & LOADER */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 0', gap: '20px' }}>
            <div style={{ position: 'relative', width: '120px', height: '120px' }}>
              {/* Circular Progress Ring */}
              <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  stroke="rgba(0, 0, 0, 0.06)"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  stroke={primaryColor}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={326.7}
                  strokeDashoffset={326.7 - (326.7 * provisionProgress) / 100}
                  style={{ transition: 'stroke-dashoffset 0.3s ease-out' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>
                {provisionProgress}%
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>Mandant wird erstellt</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                {provisionStatus}
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: REGISTRATION SUCCESS & QR BADGE PREVIEW */}
        {step === 3 && createdUser && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center', position: 'relative' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#e6f4ea', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d', marginBottom: '0px', boxShadow: '0 4px 12px rgba(52, 168, 83, 0.15)' }}>
              <CheckCircle size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#15803d', fontFamily: '"Outfit", sans-serif', letterSpacing: '-0.02em' }}>Registrierung erfolgreich!</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                Die Schule <strong>{createdUser.schoolName}</strong> wurde erfolgreich angelegt.
              </p>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 550 }}>
                Bitte speichere deinen <strong>Campus-Groovelab</strong> QR-Ausweis für den zukünftigen Login.
              </p>
            </div>

            {/* Admin ID / QR Card (Apple Squircle & Lichtkante) */}
            <div 
              ref={cardRef}
              style={{
                background: 'linear-gradient(135deg, #34a853 0%, #15803d 60%, #eab308 100%)',
                borderRadius: '20px',
                padding: '16px',
                width: '100%',
                maxWidth: '280px',
                boxShadow: '0 16px 32px -4px rgba(52, 168, 83, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.45)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.2)',
                boxSizing: 'border-box',
                position: 'relative'
              }}
            >
              <div style={{ fontSize: '9px', fontWeight: 900, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '10px', opacity: 0.95, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                Campus-Groovelab Ausweis
              </div>
              
              {/* QR Code Inlay */}
              <div style={{
                background: '#ffffff',
                borderRadius: '14px',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)'
              }}>
                <QRCode
                  id="signup-qr-code-svg"
                  value={`${window.location.origin}/qr/${createdUser.qr_token}`}
                  size={118}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox={`0 0 256 256`}
                />
              </div>

              <div style={{ marginTop: '10px', fontWeight: 800, fontSize: '0.95rem', fontFamily: '"Outfit", sans-serif', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                {createdUser.first_name} {createdUser.last_name}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#fef08a', fontWeight: 800, textTransform: 'uppercase', marginTop: '2px', letterSpacing: '0.06em' }}>
                Administrator
              </div>
            </div>

            {/* Credentials Note Box (Monochrome Icon + Copy Support) */}
            <div style={{
              background: '#fffbeb',
              border: '1.5px solid #fef3c7',
              borderRadius: '16px',
              padding: '12px 16px',
              textAlign: 'left',
              width: '100%',
              maxWidth: '280px',
              boxSizing: 'border-box',
              color: '#78350f',
              fontSize: '0.78rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxShadow: '0 4px 10px rgba(251, 191, 36, 0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.04em', color: '#b45309' }}>
                  <ShieldAlert size={13} color="#b45309" />
                  <span>WICHTIGE ZUGANGSDATEN</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  title="Zugangsdaten kopieren"
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '2px 4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: copiedCredentials ? '#15803d' : '#b45309',
                    fontSize: '10px',
                    fontWeight: 700
                  }}
                >
                  {copiedCredentials ? <Check size={12} /> : <Copy size={12} />}
                  {copiedCredentials ? 'Kopiert!' : 'Kopieren'}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #fde68a', paddingBottom: '3px' }}>
                <span style={{ fontWeight: 700 }}>Ausweis-PIN:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.85rem' }}>{createdUser.ausweis_nummer}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700 }}>Geräte-PIN:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.85rem' }}>{String(createdUser.birthDay || '').padStart(2, '0')} (Tag des Geburtstags)</span>
              </div>
            </div>

            {/* Action Stack (2-Column Grid for Downloads) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '280px', marginTop: '2px' }}>
              
              {/* Biometrics Setup Button (Full-width prominence) */}
              {isWebAuthnSupported() && (
                <button
                  onClick={handleRegisterBiometrics}
                  disabled={biometricsStatus === 'registering' || biometricsStatus === 'success'}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: biometricsStatus === 'success' ? '1.5px solid #34a853' : '1.5px solid #d1d5db',
                    background: biometricsStatus === 'success' ? '#e6f4ea' : biometricsStatus === 'error' ? '#fef2f2' : '#f8fafc',
                    color: biometricsStatus === 'success' ? '#34a853' : biometricsStatus === 'error' ? '#dc2626' : '#1e293b',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: (biometricsStatus === 'registering' || biometricsStatus === 'success') ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  <Fingerprint size={15} />
                  {biometricsStatus === 'idle' && 'Fingerabdruck / FaceID einrichten'}
                  {biometricsStatus === 'registering' && 'Einrichtung läuft...'}
                  {biometricsStatus === 'success' && 'Biometrischer Login aktiv ✓'}
                  {biometricsStatus === 'error' && 'Erneut versuchen'}
                </button>
              )}

              {biometricsStatus === 'error' && biometricsErrorMessage && (
                <div style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 650, marginTop: '-4px', textAlign: 'center' }}>
                  {biometricsErrorMessage}
                </div>
              )}

              {/* 2-Column Export Actions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
                <button 
                  onClick={downloadQrCode} 
                  style={{
                    width: '100%',
                    padding: '9px 10px',
                    borderRadius: '12px',
                    border: '1.5px solid #d1d5db',
                    background: 'white',
                    color: '#475569',
                    fontWeight: 800,
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    boxSizing: 'border-box',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}
                >
                  <Download size={13} /> QR-Ausweis
                </button>

                <button 
                  onClick={downloadWalletPass} 
                  style={{
                    width: '100%',
                    padding: '9px 10px',
                    borderRadius: '12px',
                    border: '1.5px solid #d1d5db',
                    background: 'white',
                    color: '#475569',
                    fontWeight: 800,
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    boxSizing: 'border-box',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}
                >
                  <Key size={13} /> Apple Wallet
                </button>
              </div>

              {/* Dominant Primary Call-to-Action */}
              <button 
                onClick={() => onSignupSuccess(createdUser.id)}
                style={{
                  ...nextButtonStyle,
                  width: '100%',
                  margin: '4px 0 0 0',
                  padding: '12px 16px',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box',
                  boxShadow: '0 12px 24px rgba(52, 168, 83, 0.22)'
                }}
              >
                Zum Dashboard fortfahren <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Reusable styling objects
const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px 16px',
  borderRadius: '12px',
  border: '1.5px solid #d1d5db',
  background: '#ffffff',
  color: '#1e293b',
  outline: 'none',
  fontSize: '14px',
  fontWeight: 600,
  transition: 'border-color 0.2s, box-shadow 0.2s',
  fontFamily: 'inherit'
};

const backButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '14px 20px',
  borderRadius: '16px',
  background: 'rgba(0, 0, 0, 0.05)',
  border: 'none',
  color: '#334155',
  fontWeight: 800,
  fontSize: '0.95rem',
  cursor: 'pointer',
  transition: 'background 0.2s',
  outline: 'none'
};

const nextButtonStyle: React.CSSProperties = {
  flex: 1.5,
  padding: '14px 20px',
  borderRadius: '16px',
  background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)',
  border: 'none',
  color: '#ffffff',
  fontWeight: 800,
  fontSize: '0.95rem',
  cursor: 'pointer',
  boxShadow: '0 10px 20px rgba(52, 168, 83, 0.15)',
  transition: 'transform 0.2s, box-shadow 0.2s',
  outline: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px'
};

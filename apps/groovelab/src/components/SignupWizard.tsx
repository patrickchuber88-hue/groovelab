import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  School, User, Mail, Lock, Phone, MapPin, CheckCircle, 
  ArrowRight, ArrowLeft, RefreshCw, Key, ShieldCheck, Check, Sparkles
} from 'lucide-react';

interface SignupWizardProps {
  onBackToLogin: () => void;
  onSignupSuccess: (userId: string) => void;
}

export function SignupWizard({ onBackToLogin, onSignupSuccess }: SignupWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: School Info
  const [schoolName, setSchoolName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const primaryColor = '#16a34a';
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [city, setCity] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Step 2: Owner Info
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Step 3: OTP
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);

  // Step 4: Progress Animation
  const [provisionProgress, setProvisionProgress] = useState(0);
  const [provisionStatus, setProvisionStatus] = useState('');

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
        // Execute actual database insertions!
        try {
          const schoolId = crypto.randomUUID();
          const { error: schoolErr } = await supabase
            .from('schools')
            .insert({
              id: schoolId,
              name: schoolName.trim(),
              subdomain: subdomain.trim().toLowerCase(),
              primary_color: primaryColor,
              street: street.trim(),
              house_number: houseNumber.trim(),
              zip_code: zipCode.trim(),
              city: city.trim(),
              phone_number: phoneNumber.trim(),
              is_trial: true,
              trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'trial'
            });

          if (schoolErr) throw schoolErr;

          const adminId = crypto.randomUUID();
          const qrToken = crypto.randomUUID();
          const dummyEmail = `${subdomain.trim().toLowerCase()}@campus-groovelab.de`;
          
          // Insert admin user
          const { error: userErr } = await supabase
            .from('users')
            .insert({
              id: adminId,
              school_id: schoolId,
              role: 'admin',
              first_name: adminFirstName.trim(),
              last_name: adminLastName.trim(),
              email: dummyEmail,
              password_hash: adminPassword, // Pre-hashed or demo plaintext passwords
              qr_token: qrToken,
              ausweis_nummer: adminPassword.trim(),
              is_campus_active: true,
              is_groovelab_active: true,
              is_active: true,
              roles: ['admin']
            });

          if (userErr) throw userErr;

          // Automatically log the new user in
          sessionStorage.setItem('groovelab_user_id', adminId);
          localStorage.setItem('groovelab_active_platform', 'campus');
          
          // Trigger parent success
          setTimeout(() => {
            onSignupSuccess(adminId);
          }, 1500);

        } catch (err: any) {
          setError(err.message || 'Onboarding fehlgeschlagen.');
          setStep(1);
        }
      }
    }, 800);
  };

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subdomainAvailable) {
      setError('Bitte wähle eine verfügbare Wunsch-Subdomain.');
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
    '#10b981', // Green
    '#eab308', // Yellow
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#f97316'  // Orange
  ];

  const inputFocusStyle = {
    borderColor: '#10b981',
    boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.15)',
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
      background: 'radial-gradient(circle at 50% 50%, #064e3b 0%, #022c22 100%)',
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
          border-color: #10b981 !important;
          background: #ffffff !important;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.12) !important;
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
          box-shadow: 0 12px 24px rgba(16, 185, 129, 0.2) !important;
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
        maxWidth: step === 4 ? '480px' : '580px',
        background: 'rgba(255, 255, 255, 0.94)',
        borderRadius: '24px',
        padding: '38px',
        boxShadow: '0 30px 60px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        boxSizing: 'border-box',
        maxHeight: '90vh',
        overflowY: 'auto',
        color: '#1e293b'
      }}>
        {/* Header (except for provisioning step) */}
        {step < 4 && (
          <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(0, 0, 0, 0.08)', paddingBottom: '20px', marginBottom: '24px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', color: '#10b981', justifyContent: 'center' }}>
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
                  <span style={{ color: '#059669', fontWeight: 600 }}>✓ Subdomain ist frei und verfügbar!</span>
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
              <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Passwort festlegen *</label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="z.B. Geheimnis123"
                style={inputStyle}
                className="signup-input"
              />
              <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Mit diesem Passwort loggst du dich später über den Login-Bereich ein.
              </span>
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
  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  border: 'none',
  color: '#ffffff',
  fontWeight: 800,
  fontSize: '0.95rem',
  cursor: 'pointer',
  boxShadow: '0 10px 20px rgba(16, 185, 129, 0.15)',
  transition: 'transform 0.2s, box-shadow 0.2s',
  outline: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px'
};

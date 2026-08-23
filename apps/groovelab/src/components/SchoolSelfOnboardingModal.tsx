import React, { useState, useRef } from 'react';
import QRCode from 'react-qr-code';
import { supabase } from '../lib/supabase';
import { 
  Building, User, Check, Shield, GraduationCap, 
  Music, Zap, ArrowRight, ArrowLeft, Lock, Mail, MapPin, Key,
  CheckCircle, Fingerprint, Download, Copy, Sparkles, Smartphone, Link, X
} from 'lucide-react';
import { isWebAuthnSupported, registerUserBiometrics } from '../utils/webauthn';
import { inlineAllImagesInElement } from './IDBadgeCard';
import { LegalTextModal } from './LegalTextModal';
import { LEGAL_MASTER_WORDING } from '../constants/legalMasterWording';

interface SchoolSelfOnboardingModalProps {
  onClose: () => void;
  onSuccess: (schoolData: any, userData: any) => void;
}

export const SchoolSelfOnboardingModal: React.FC<SchoolSelfOnboardingModalProps> = ({ onClose, onSuccess }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Ultra-Lean Input, Step 2: Ausweis & Biometrics Stage
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedPin, setCopiedPin] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showLegalModal, setShowLegalModal] = useState<boolean>(false);
  const [legalModalTab, setLegalModalTab] = useState<'terms' | 'privacy' | 'impressum' | 'cancellation'>('terms');

  // Step 1: Ultra-Lean Core Fields
  const [schoolName, setSchoolName] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [street, setStreet] = useState<string>('');
  const [houseNumber, setHouseNumber] = useState<string>('');
  const [zipCode, setZipCode] = useState<string>('');
  const [city, setCity] = useState<string>('');

  // Step 2: Created Tenant & Admin Data
  const [createdData, setCreatedData] = useState<{
    school: any;
    user: any;
    generatedPin: string;
  } | null>(null);

  // Biometrics State
  const [biometricsStatus, setBiometricsStatus] = useState<'idle' | 'registering' | 'success' | 'error'>('idle');
  const [biometricsErrorMessage, setBiometricsErrorMessage] = useState('');

  // Form Validation (5 core essentials)
  const isFormValid = 
    schoolName.trim().length >= 3 && 
    firstName.trim().length >= 2 && 
    lastName.trim().length >= 2 && 
    email.trim().includes('@') && email.trim().includes('.') &&
    street.trim().length >= 2 &&
    zipCode.trim().length >= 4 &&
    city.trim().length >= 2;

  const handleRegisterSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || loading) return;

    try {
      setLoading(true);
      setError(null);

      // Auto-generate subdomain slug
      const slug = schoolName
        .toLowerCase()
        .trim()
        .replace(/[äöüß]/g, (match) => {
          const mapping: Record<string, string> = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' };
          return mapping[match] || match;
        })
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '') || `schule-${Math.floor(1000 + Math.random() * 9000)}`;

      // Generate a unique 6-digit Master-PIN
      const candidatePin = Math.floor(100000 + Math.random() * 900000).toString();
      const qrToken = crypto.randomUUID();

      // 1. Create School Record (with complete § 14 UStG address)
      const { data: school, error: schoolErr } = await supabase
        .from('schools')
        .insert({
          name: schoolName.trim(),
          legal_name: schoolName.trim(),
          subdomain: slug,
          billing_contact_person: `${firstName.trim()} ${lastName.trim()}`,
          billing_email: email.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          street: street.trim(),
          house_number: houseNumber.trim() || null,
          zip_code: zipCode.trim(),
          city: city.trim(),
          country: 'Deutschland',
          primary_color: '#34a853',
          has_campus_subscription: true,
          has_groovelab_subscription: true,
          is_trial: true,
          subscription_bypass: false,
          status: 'trial',
          avv_signed_at: new Date().toISOString(),
          avv_signee_name: `${firstName.trim()} ${lastName.trim()} (Schulleitung)`
        })
        .select()
        .single();

      if (schoolErr) throw schoolErr;

      // 2. Create Admin User Record (Admin photo must be /campus_login_hero.png as per guidelines)
      const { data: user, error: userErr } = await supabase
        .from('users')
        .insert({
          school_id: school.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase(),
          role: 'admin',
          roles: ['admin'],
          ausweis_nummer: candidatePin,
          password_hash: candidatePin,
          qr_token: qrToken,
          photo_url: '/campus_login_hero.png',
          avatar_url: '/campus_login_hero.png',
          is_campus_active: true,
          is_groovelab_active: true,
          is_active: true,
          is_pin_activated: true
        })
        .select()
        .single();

      if (userErr) throw userErr;

      // 3. Set Session in LocalStorage & SessionStorage for immediate access
      const sessionData = {
        user: user,
        school: school,
        role: 'admin',
        token: user.id
      };
      localStorage.setItem('groovelab_session', JSON.stringify(sessionData));
      localStorage.setItem('groovelab_user', JSON.stringify(user));
      localStorage.setItem('groovelab_school', JSON.stringify(school));
      sessionStorage.setItem('groovelab_user_id', user.id);
      sessionStorage.setItem('groovelab_location_mode', 'home');
      sessionStorage.setItem('groovelab_active_platform', 'campus');

      setCreatedData({
        school,
        user,
        generatedPin: candidatePin
      });

      // Transition to Stage 2 (Ausweis & Biometrie Stage)
      setStep(2);
    } catch (err: any) {
      console.error('Fehler bei der Schul-Registrierung:', err);
      let friendlyMsg = err.message || 'Bitte versuchen Sie es erneut.';
      if (err.code === '23505') {
        friendlyMsg = 'Eine Musikschule mit diesem Namen oder dieser Subdomain existiert bereits. Bitte wählen Sie eine leichte Variation.';
      }
      setError(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterBiometrics = async () => {
    if (!createdData) return;
    setBiometricsStatus('registering');
    setBiometricsErrorMessage('');
    try {
      if (!isWebAuthnSupported()) {
        throw new Error('Biometrisches Anmelden (Touch ID / Face ID) wird von diesem Browser/Gerät nicht unterstützt.');
      }

      await registerUserBiometrics(
        createdData.user.email || `${createdData.user.id}@campus-groovelab.de`,
        createdData.user.id,
        createdData.user.first_name,
        createdData.user.last_name,
        'admin',
        createdData.user.id,
        'Schulleitung',
        '/campus_login_hero.png'
      );

      setBiometricsStatus('success');
    } catch (err: any) {
      console.error('Biometrics enrollment failed:', err);
      setBiometricsStatus('error');
      setBiometricsErrorMessage(err.message || 'Die Einrichtung wurde abgebrochen oder ist fehlgeschlagen.');
    }
  };

  const handleCopyPin = () => {
    if (!createdData) return;
    navigator.clipboard.writeText(createdData.generatedPin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2500);
  };

  const handleCopyDirectLink = () => {
    if (!createdData) return;
    const directUrl = `${window.location.origin}/qr/${createdData.user.qr_token}`;
    navigator.clipboard.writeText(directUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const downloadQrCode = async () => {
    if (!createdData || !cardRef.current) return;
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
      downloadLink.download = `Campus_Groovelab_Ausweis_${createdData.user.first_name}_${createdData.user.last_name}.jpg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (e) {
      console.error('Fehler beim Generieren des Ausweises:', e);
    }
  };

  const downloadWalletPass = () => {
    if (!createdData) return;
    const passContent = JSON.stringify({
      passTypeIdentifier: "pass.de.campus-groovelab.admin",
      serialNumber: createdData.user.qr_token,
      teamIdentifier: "CAMPUS_GROOVELAB",
      organizationName: "Campus-Groovelab",
      description: "Campus-Groovelab Schulleiter-Ausweis",
      logoText: "Campus-Groovelab",
      foregroundColor: "rgb(255, 255, 255)",
      backgroundColor: "rgb(21, 128, 61)",
      labelColor: "rgb(230, 244, 234)",
      studentName: `${createdData.user.first_name} ${createdData.user.last_name}`,
      instrument: "Schulleitung / Administrator",
      schoolName: createdData.school.name,
      qrToken: createdData.user.qr_token
    }, null, 2);

    const blob = new Blob([passContent], { type: 'application/vnd.apple.pkpass' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `campus-groovelab-pass-${createdData.user.first_name.toLowerCase()}.pkpass`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFinishAndEnterDashboard = () => {
    if (!createdData) return;
    onSuccess(createdData.school, createdData.user);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      color: '#1e293b',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '"Outfit", "Inter", -apple-system, sans-serif'
    }}>
      <style>{`
        .lean-input {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 16px;
          border-radius: 14px;
          border: 1.5px solid rgba(15, 23, 42, 0.1);
          background: #f8fafc;
          font-size: 0.92rem;
          font-weight: 650;
          color: #0f172a;
          outline: none;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .lean-input:focus {
          border-color: #34a853;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(52, 168, 83, 0.14);
        }
        .lean-btn-primary {
          background: linear-gradient(135deg, #15803d 0%, #34a853 100%);
          color: #ffffff;
          border: none;
          padding: 14px 28px;
          border-radius: 14px;
          font-weight: 800;
          font-size: 0.95rem;
          cursor: pointer;
          display: flex;
          alignItems: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 8px 20px rgba(21, 128, 61, 0.25);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .lean-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(21, 128, 61, 0.35);
          filter: brightness(1.04);
        }
        .lean-btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>

      {/* Main Dialog Container */}
      <div style={{
        width: '100%',
        maxWidth: step === 1 ? '580px' : '520px',
        maxHeight: '94vh',
        background: '#ffffff',
        borderRadius: '28px',
        boxShadow: '0 30px 80px rgba(15, 23, 42, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.8)',
        animation: 'fadeIn 0.25s ease-out'
      }}>
        {/* Glass Header */}
        <div style={{
          padding: '18px 28px',
          background: '#f8fafc',
          borderBottom: '1px solid rgba(15, 23, 42, 0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #15803d 0%, #34a853 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 900,
              boxShadow: '0 4px 10px rgba(21, 128, 61, 0.2)'
            }}>
              <GraduationCap size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                {step === 1 ? 'Campus-Groovelab Registrierung' : '🎉 Registrierung erfolgreich!'}
              </h2>
              <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                {step === 1 ? 'Kostenfreie Bereitstellung für Ihre Musikschule' : 'Ihr Schulleiter-Zugang ist sofort einsatzbereit'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.2rem',
              color: '#94a3b8',
              cursor: 'pointer',
              fontWeight: 800,
              padding: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              padding: '12px 16px',
              borderRadius: '14px',
              color: '#b91c1c',
              fontSize: '0.84rem',
              fontWeight: 700,
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════════
              STAGE 1: ULTRA-LEAN INPUT (5 ESSENZIELLE FELDER INKL. § 14 UStG ANSCHRIFT)
              ═══════════════════════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <form onSubmit={handleRegisterSchool} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Musikschul-Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Name der Musikschule *
                </label>
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="z.B. Musikschule Musterstadt"
                  className="lean-input"
                  autoFocus
                />
              </div>

              {/* Schulleiter Vor- & Nachname */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Vorname Schulleitung *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Max"
                    className="lean-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Nachname Schulleitung *
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Mustermann"
                    className="lean-input"
                  />
                </div>
              </div>

              {/* E-Mail-Adresse */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Offizielle E-Mail-Adresse (Login &amp; Rechnungszustellung) *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="leitung@musikschule-musterstadt.de"
                  className="lean-input"
                />
              </div>

              {/* Adresse Zeile 1: Straße & Nr. (3:1 Grid) */}
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Straße (Rechnungsanschrift) *
                  </label>
                  <input
                    type="text"
                    required
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="z.B. Musterstraße"
                    className="lean-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Nr.
                  </label>
                  <input
                    type="text"
                    value={houseNumber}
                    onChange={(e) => setHouseNumber(e.target.value)}
                    placeholder="12a"
                    className="lean-input"
                  />
                </div>
              </div>

              {/* Adresse Zeile 2: PLZ & Ort (1:2 Grid) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    PLZ *
                  </label>
                  <input
                    type="text"
                    required
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="12345"
                    className="lean-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Ort *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Musterstadt"
                    className="lean-input"
                  />
                </div>
              </div>

              {/* Inklusiv-Feature Pills */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '14px',
                padding: '12px 16px',
                border: '1px solid rgba(15, 23, 42, 0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginTop: '2px'
              }}>
                <Shield size={18} color="#15803d" />
                <div style={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.4 }}>
                  <strong style={{ color: '#0f172a' }}>Software-Bereitstellung: 0,00 € (Inklusive).</strong> Keine Einrichtungsgebühr. Modul-Auswahl (Campus &amp; GrooveLab) flexibel im Dashboard wählbar.
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={!isFormValid || loading}
                className="lean-btn-primary"
                style={{
                  width: '100%',
                  marginTop: '4px',
                  opacity: (!isFormValid || loading) ? 0.6 : 1,
                  cursor: (!isFormValid || loading) ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Mandant wird provisioniert...' : (
                  <>
                    <span>Kostenfrei freischalten &amp; Ausweis erstellen</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              {/* Rechtlicher Hinweis (B2B SaaS / AGB & AVV) */}
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', textAlign: 'center', lineHeight: 1.45, padding: '0 6px' }}>
                Mit Klick auf „Kostenfrei freischalten“ akzeptieren Sie unsere{' '}
                <span
                  onClick={() => {
                    setLegalModalTab('terms');
                    setShowLegalModal(true);
                  }}
                  style={{ color: '#15803d', textDecoration: 'underline', cursor: 'pointer', fontWeight: 750 }}
                >
                  AGB für Bildungseinrichtungen
                </span>{' '}
                sowie die{' '}
                <span
                  onClick={() => {
                    setLegalModalTab('terms');
                    setShowLegalModal(true);
                  }}
                  style={{ color: '#15803d', textDecoration: 'underline', cursor: 'pointer', fontWeight: 750 }}
                >
                  Vereinbarung zur Auftragsverarbeitung (AVV nach Art. 28 DSGVO)
                </span>.
              </div>
            </form>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════════
              STAGE 2: VIP ADMIN AUSWEIS & BIOMETRIE STAGE
              ═══════════════════════════════════════════════════════════════════════════ */}
          {step === 2 && createdData && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', textAlign: 'center' }}>
              
              {/* VIP Admin ID Badge (Keine PIN auf dem Ausweis gem. Sicherheitsaudit) */}
              <div
                ref={cardRef}
                style={{
                  background: 'linear-gradient(135deg, #15803d 0%, #34a853 50%, #fbbc05 100%)',
                  borderRadius: '22px',
                  padding: '18px',
                  width: '100%',
                  maxWidth: '290px',
                  boxShadow: '0 16px 36px rgba(21, 128, 61, 0.22)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px', opacity: 0.95 }}>
                  Campus-Groovelab
                </div>

                {/* QR Code Container */}
                <div style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  padding: '9px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 6px 14px rgba(0,0,0,0.1)'
                }}>
                  <QRCode
                    value={`${window.location.origin}/qr/${createdData.user.qr_token}`}
                    size={120}
                    style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                    viewBox="0 0 256 256"
                  />
                </div>

                <div style={{ marginTop: '10px', fontWeight: 900, fontSize: '1rem', textShadow: '0 1px 3px rgba(0,0,0,0.25)' }}>
                  {createdData.user.first_name} {createdData.user.last_name}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#ffffff', fontWeight: 800, textTransform: 'uppercase', opacity: 0.9, marginTop: '2px' }}>
                  Schulleitung / Admin
                </div>
                <div style={{ fontSize: '0.66rem', color: '#e6f4ea', fontWeight: 600, marginTop: '3px', opacity: 0.85 }}>
                  {createdData.school.name}
                </div>
              </div>

              {/* Notfall-PIN Box (Sicherheits-getrennt vom Ausweis) */}
              <div style={{
                background: '#fffbeb',
                border: '1.5px solid #fef3c7',
                borderRadius: '14px',
                padding: '10px 14px',
                textAlign: 'left',
                width: '100%',
                maxWidth: '310px',
                boxSizing: 'border-box',
                color: '#78350f',
                fontSize: '0.76rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px'
              }}>
                <div style={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.04em', color: '#b45309' }}>
                  <Lock size={11} /> Ihre persönliche Notfall-PIN:
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1.05rem', letterSpacing: '0.1em', color: '#92400e' }}>
                    {createdData.generatedPin}
                  </span>
                  <button
                    onClick={handleCopyPin}
                    style={{
                      background: copiedPin ? '#15803d' : '#fde68a',
                      color: copiedPin ? '#ffffff' : '#78350f',
                      border: 'none',
                      padding: '3px 9px',
                      borderRadius: '7px',
                      fontWeight: 800,
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s'
                    }}
                  >
                    {copiedPin ? <Check size={11} /> : <Copy size={11} />}
                    {copiedPin ? 'Kopiert!' : 'Kopieren'}
                  </button>
                </div>
                <span style={{ fontSize: '0.66rem', color: '#a16207', lineHeight: 1.25 }}>
                  Wird nur für Notfall-Logins benötigt, falls kein Kamera- oder Biometrie-Zugriff verfügbar ist.
                </span>
              </div>

              {/* 1-Click Biometrie Setup Button */}
              {isWebAuthnSupported() && (
                <button
                  onClick={handleRegisterBiometrics}
                  disabled={biometricsStatus === 'registering' || biometricsStatus === 'success'}
                  style={{
                    width: '100%',
                    maxWidth: '310px',
                    padding: '11px 15px',
                    borderRadius: '13px',
                    border: biometricsStatus === 'success' ? '1.5px solid #34a853' : '1.5px solid #cbd5e1',
                    background: biometricsStatus === 'success' ? '#e6f4ea' : biometricsStatus === 'error' ? '#fef2f2' : '#f8fafc',
                    color: biometricsStatus === 'success' ? '#15803d' : biometricsStatus === 'error' ? '#dc2626' : '#0f172a',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: (biometricsStatus === 'registering' || biometricsStatus === 'success') ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s'
                  }}
                >
                  <Fingerprint size={17} color={biometricsStatus === 'success' ? '#15803d' : '#34a853'} />
                  {biometricsStatus === 'idle' && 'Touch ID / Face ID auf diesem Gerät aktivieren'}
                  {biometricsStatus === 'registering' && 'Biometrie wird verknüpft...'}
                  {biometricsStatus === 'success' && 'Biometrischer Login aktiv ✓'}
                  {biometricsStatus === 'error' && 'Biometrie erneut versuchen'}
                </button>
              )}

              {biometricsStatus === 'error' && biometricsErrorMessage && (
                <div style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 600, marginTop: '-4px' }}>
                  {biometricsErrorMessage}
                </div>
              )}

              {/* Direct Link / Zero-Mail Device Handover Button */}
              <button
                onClick={handleCopyDirectLink}
                style={{
                  width: '100%',
                  maxWidth: '310px',
                  padding: '9px 12px',
                  borderRadius: '11px',
                  border: copiedLink ? '1.5px solid #15803d' : '1px solid #cbd5e1',
                  background: copiedLink ? '#e6f4ea' : '#f8fafc',
                  color: copiedLink ? '#15803d' : '#334155',
                  fontWeight: 750,
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
              >
                {copiedLink ? <Check size={13} /> : <Link size={13} />}
                {copiedLink ? 'Zugangslink kopiert! (z.B. für Büro-Mac/AirDrop)' : '🔗 Zugangslink kopieren (für Gerätewechsel)'}
              </button>

              {/* Download Buttons (JPG & Apple Wallet) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', maxWidth: '310px' }}>
                <button
                  onClick={downloadQrCode}
                  style={{
                    padding: '9px 10px',
                    borderRadius: '11px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px'
                  }}
                >
                  <Download size={13} /> Ausweis (JPG)
                </button>

                <button
                  onClick={downloadWalletPass}
                  style={{
                    padding: '9px 10px',
                    borderRadius: '11px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px'
                  }}
                >
                  <Smartphone size={13} /> Apple Wallet
                </button>
              </div>

              {/* Primary Launch Button into Admin Dashboard */}
              <button
                onClick={handleFinishAndEnterDashboard}
                className="lean-btn-primary"
                style={{
                  width: '100%',
                  maxWidth: '310px',
                  marginTop: '4px',
                  fontSize: '0.96rem',
                  padding: '13px 18px'
                }}
              >
                <span>🚀 Direkt zum Admin-Dashboard</span>
                <ArrowRight size={17} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Embedded Legal Modal (AGB & AVV) */}
      <LegalTextModal
        isOpen={showLegalModal}
        onClose={() => setShowLegalModal(false)}
        initialTab={legalModalTab}
      />
    </div>
  );
};

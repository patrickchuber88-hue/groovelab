import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Building, User, Check, Shield, GraduationCap, 
  Music, Zap, ArrowRight, ArrowLeft, Lock, Mail, MapPin, Key
} from 'lucide-react';

interface SchoolSelfOnboardingModalProps {
  onClose: () => void;
  onSuccess: (schoolData: any, userData: any) => void;
}

export const SchoolSelfOnboardingModal: React.FC<SchoolSelfOnboardingModalProps> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);

  // Step 1: School & B2B Billing Data
  const [schoolName, setSchoolName] = useState<string>('');
  const [legalName, setLegalName] = useState<string>('');
  const [billingContactPerson, setBillingContactPerson] = useState<string>('');
  const [billingEmail, setBillingEmail] = useState<string>('');
  const [street, setStreet] = useState<string>('');
  const [houseNumber, setHouseNumber] = useState<string>('');
  const [addressAddition, setAddressAddition] = useState<string>('');
  const [zipCode, setZipCode] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [country, setCountry] = useState<string>('Deutschland');
  const [vatId, setVatId] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');

  // Step 2: Admin User Data
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [ausweisNummer, setAusweisNummer] = useState<string>('');

  // Validation
  const isStep1Valid = schoolName.trim().length > 0 && zipCode.trim().length > 0 && city.trim().length > 0;
  const isStep2Valid = firstName.trim().length > 0 && lastName.trim().length > 0 && ausweisNummer.trim().length >= 4;

  const handleFinishOnboarding = async () => {
    if (!isStep1Valid || !isStep2Valid) return;
    try {
      setLoading(true);

      // 1. Create School Record with Complete B2B Billing Address
      const { data: school, error: schoolErr } = await supabase
        .from('schools')
        .insert({
          name: schoolName.trim(),
          legal_name: legalName.trim() || schoolName.trim(),
          billing_contact_person: billingContactPerson.trim() || null,
          billing_email: billingEmail.trim() || email.trim() || null,
          street: street.trim() || null,
          house_number: houseNumber.trim() || null,
          address_addition: addressAddition.trim() || null,
          zip_code: zipCode.trim(),
          city: city.trim(),
          country: country.trim() || 'Deutschland',
          vat_id: vatId.trim() || null,
          email: email.trim() || null,
          logo_url: logoUrl.trim() || null,
          primary_color: '#34a853',
          has_campus_subscription: true,
          has_groovelab_subscription: true,
          is_trial: true,
          subscription_bypass: false
        })
        .select()
        .single();

      if (schoolErr) throw schoolErr;

      // 2. Create Admin User Record
      const cleanAusweis = ausweisNummer.trim().toUpperCase();
      const { data: user, error: userErr } = await supabase
        .from('users')
        .insert({
          school_id: school.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: adminEmail.trim() || email.trim() || null,
          ausweis_nummer: cleanAusweis,
          role: 'admin',
          is_pin_activated: true
        })
        .select()
        .single();

      if (userErr) throw userErr;

      // 3. Set Session in LocalStorage for seamless Direct Login
      const sessionData = {
        user: user,
        school: school,
        role: 'admin',
        token: user.id
      };
      localStorage.setItem('groovelab_session', JSON.stringify(sessionData));
      localStorage.setItem('groovelab_user', JSON.stringify(user));
      localStorage.setItem('groovelab_school', JSON.stringify(school));

      // 4. Trigger Callback
      onSuccess(school, user);
    } catch (err: any) {
      console.error('Fehler bei der Schul-Registrierung:', err);
      alert('Fehler bei der Schul-Registrierung: ' + (err.message || 'Bitte versuchen Sie es erneut.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      color: '#1e293b',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: '"Outfit", "Inter", -apple-system, sans-serif'
    }}>
      {/* Onboarding Dialog Frame */}
      <div style={{
        width: '100%',
        maxWidth: '820px',
        maxHeight: '92vh',
        background: '#ffffff',
        borderRadius: '32px',
        boxShadow: '0 30px 80px rgba(15, 23, 42, 0.22)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.8)'
      }}>
        {/* Glassmorphic Header */}
        <div style={{
          padding: '24px 36px',
          background: '#f8fafc',
          borderBottom: '1px solid rgba(15, 23, 42, 0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Circular Passepartout Logo Avatar */}
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: logoUrl ? '#ffffff' : 'linear-gradient(135deg, #15803d 0%, #34a853 100%)',
              border: '1px solid rgba(15, 23, 42, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              color: '#ffffff',
              fontSize: '1rem',
              overflow: 'hidden',
              padding: logoUrl ? '4px' : 0,
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
            }}>
              {logoUrl ? (
                <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                schoolName ? schoolName.substring(0, 2).toUpperCase() : 'CG'
              )}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                Campus-Groovelab Schul-Registrierung
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                Kostenfreie Basis-Software-Lizenz für Ihre Musikschule
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
              fontWeight: 800
            }}
          >
            ✕
          </button>
        </div>

        {/* Progress Step Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          background: '#f1f5f9',
          borderBottom: '1px solid rgba(15, 23, 42, 0.05)'
        }}>
          {[
            { num: 1, label: '1. Musikschule' },
            { num: 2, label: '2. Schulleitung' },
            { num: 3, label: '3. Aktivierung' }
          ].map((s) => (
            <div
              key={s.num}
              style={{
                padding: '12px 16px',
                textAlign: 'center',
                fontSize: '0.82rem',
                fontWeight: 800,
                color: step === s.num ? '#15803d' : step > s.num ? '#0f172a' : '#94a3b8',
                borderBottom: step === s.num ? '3px solid #34a853' : '3px solid transparent',
                background: step === s.num ? '#ffffff' : 'transparent',
                transition: 'all 0.2s'
              }}
            >
              {s.label}
            </div>
          ))}
        </div>

        {/* Content Body */}
        <div style={{ padding: '36px', overflowY: 'auto', flex: 1 }}>
          {/* STEP 1: Schul-Stammdaten */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', animation: 'fadeIn 0.25s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '14px' }}>
                <Building size={20} color="#15803d" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                  Stammdaten Ihrer Musikschule
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                    Name der Musikschule *
                  </label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="z.B. Musikschule Bad Säckingen"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(15,23,42,0.1)', background: '#f8fafc', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                    Rechtlicher Trägername
                  </label>
                  <input
                    type="text"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="z.B. Stadtmusikschule e.V. / Stadt Bad Säckingen"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(15,23,42,0.1)', background: '#f8fafc', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                    Rechnungs-E-Mail (E-Invoicing)
                  </label>
                  <input
                    type="email"
                    value={billingEmail}
                    onChange={(e) => setBillingEmail(e.target.value)}
                    placeholder="buchhaltung@musaek.de"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(15,23,42,0.1)', background: '#f8fafc', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                    Ansprechpartner Buchhaltung
                  </label>
                  <input
                    type="text"
                    value={billingContactPerson}
                    onChange={(e) => setBillingContactPerson(e.target.value)}
                    placeholder="z.B. Fr. Maria Muster (Finanzen)"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(15,23,42,0.1)', background: '#f8fafc', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                    Straße
                  </label>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="z.B. Friedrichstraße"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(15,23,42,0.1)', background: '#f8fafc', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                    Nr.
                  </label>
                  <input
                    type="text"
                    value={houseNumber}
                    onChange={(e) => setHouseNumber(e.target.value)}
                    placeholder="12a"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(15,23,42,0.1)', background: '#f8fafc', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                    PLZ *
                  </label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="79713"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(15,23,42,0.1)', background: '#f8fafc', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                    Ort *
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Bad Säckingen"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(15,23,42,0.1)', background: '#f8fafc', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                    Land
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Deutschland"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(15,23,42,0.1)', background: '#f8fafc', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                  USt-IdNr. / Steuernummer (Optional)
                </label>
                <input
                  type="text"
                  value={vatId}
                  onChange={(e) => setVatId(e.target.value)}
                  placeholder="DE123456789 oder Steuer-Nr."
                  style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(15,23,42,0.1)', background: '#f8fafc', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                  Offizielle E-Mail Adresse (Sekretariat / Schulleitung)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="info@musikschule.de"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(15,23,42,0.1)',
                    background: '#f8fafc',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                  Schul-Logo Bild-URL (Optional)
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://domain.de/logo.png"
                    style={{
                      flex: 1,
                      boxSizing: 'border-box',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1px solid rgba(15,23,42,0.1)',
                      background: '#f8fafc',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      outline: 'none'
                    }}
                  />
                  {/* Passepartout Preview */}
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: logoUrl ? '#ffffff' : '#f1f5f9',
                    border: '1px solid rgba(15,23,42,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    padding: logoUrl ? '4px' : 0,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                  }}>
                    {logoUrl ? (
                      <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8' }}>Logo</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Schulleiter-Konto */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', animation: 'fadeIn 0.25s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '14px' }}>
                <User size={20} color="#ea4335" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                  Schulleiter- &amp; Admin-Zugang anlegen
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                    Vorname Schulleiter/in *
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Max"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1px solid rgba(15,23,42,0.1)',
                      background: '#f8fafc',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                    Nachname Schulleiter/in *
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Mustermann"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1px solid rgba(15,23,42,0.1)',
                      background: '#f8fafc',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                  Persönliche E-Mail Adresse (Optional)
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder={email || "max.mustermann@musikschule.de"}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(15,23,42,0.1)',
                    background: '#f8fafc',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                  Ausweisnummer / 4-stellige Master-PIN *
                </label>
                <input
                  type="text"
                  value={ausweisNummer}
                  onChange={(e) => setAusweisNummer(e.target.value)}
                  placeholder="z.B. 1234 oder ADMIN-01"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(15,23,42,0.1)',
                    background: '#f8fafc',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    fontFamily: 'monospace',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Mit dieser Ausweisnummer / PIN loggen Sie sich künftig auf der Schul-Startseite ein.
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: Modul-Bestätigung & Freischaltung */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', animation: 'fadeIn 0.25s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '14px' }}>
                <Zap size={20} color="#15803d" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                  Modul-Übersicht &amp; Sofort-Start
                </h3>
              </div>

              <div style={{
                background: '#f8fafc',
                borderRadius: '20px',
                padding: '24px',
                border: '1px solid rgba(15,23,42,0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                  Inbegriffene Plattform-Module für {schoolName}:
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={{
                    background: 'rgba(52, 168, 83, 0.12)',
                    border: '1px solid rgba(52, 168, 83, 0.3)',
                    borderRadius: '16px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <GraduationCap size={24} color="#15803d" />
                    <div>
                      <div style={{ fontWeight: 900, color: '#15803d', fontSize: '0.92rem' }}>🎓 Campus Modul</div>
                      <div style={{ fontSize: '0.74rem', color: '#166534', marginTop: '2px', fontWeight: 600 }}>
                        Stundenplan, Hausaufgabenheft &amp; Räume
                      </div>
                    </div>
                  </div>

                  <div style={{
                    background: 'rgba(234, 179, 8, 0.15)',
                    border: '1px solid rgba(234, 179, 8, 0.35)',
                    borderRadius: '16px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <Music size={24} color="#a16207" />
                    <div>
                      <div style={{ fontWeight: 900, color: '#a16207', fontSize: '0.92rem' }}>🎸 GrooveLab Modul</div>
                      <div style={{ fontSize: '0.74rem', color: '#854d0e', marginTop: '2px', fontWeight: 600 }}>
                        Bands, Songs, Repertoire &amp; Live Lab
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  padding: '14px 18px',
                  border: '1px solid rgba(15,23,42,0.06)',
                  fontSize: '0.82rem',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <Shield size={18} color="#15803d" />
                  <span>
                    <strong>100% Kostenfreie Basis-Software-Lizenz:</strong> Keine versteckten Einrichtungsgebühren. Die Freischaltung erfolgt sofort.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '20px 36px',
          background: '#f8fafc',
          borderTop: '1px solid rgba(15, 23, 42, 0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                background: '#ffffff',
                border: '1px solid rgba(15,23,42,0.1)',
                color: '#475569',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <ArrowLeft size={16} /> Zurück
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 ? !isStep1Valid : !isStep2Valid}
              style={{
                padding: '12px 28px',
                borderRadius: '12px',
                background: (step === 1 ? isStep1Valid : isStep2Valid) ? '#15803d' : '#cbd5e1',
                border: 'none',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.88rem',
                cursor: (step === 1 ? isStep1Valid : isStep2Valid) ? 'pointer' : 'not-allowed',
                boxShadow: (step === 1 ? isStep1Valid : isStep2Valid) ? '0 4px 15px rgba(21, 128, 61, 0.25)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              Weiter <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleFinishOnboarding}
              disabled={loading}
              style={{
                padding: '12px 32px',
                borderRadius: '12px',
                background: '#15803d',
                border: 'none',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.92rem',
                cursor: loading ? 'wait' : 'pointer',
                boxShadow: '0 4px 18px rgba(21, 128, 61, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading ? 'Wird freigeschaltet...' : '🚀 Musikschule jetzt freischalten & Einloggen'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Music, Tablet, ShieldCheck, FileText, X, Check, School, AlertCircle, ArrowRight, Download, User, Upload, Key, RotateCw } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { getDistanceFromLatLonInM } from '../utils/geo';
import jsQR from 'jsqr';

interface LoginScreenProps {
  onLogin: (userId: string, isHome?: boolean) => void;
  kioskStationId?: string | null;
}



const isWithinOpeningHours = (openingHours: any) => {
  if (!openingHours) return true;
  try {
    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[now.getDay()];
    const dayConfig = openingHours[currentDay];

    if (!dayConfig || !dayConfig.active) return false;

    const [startH, startM] = dayConfig.start.split(':').map(Number);
    const [endH, endM] = dayConfig.end.split(':').map(Number);
    
    const startTime = new Date();
    startTime.setHours(startH, startM, 0, 0);
    
    const endTime = new Date();
    endTime.setHours(endH, endM, 0, 0);
    
    return now >= startTime && now <= endTime;
  } catch (e) {
    console.error("Error checking opening hours:", e);
    return true;
  }
};

const cleanRoomName = (name: string | null | undefined): string => {
  if (!name) return 'Unbenannter Raum';
  return name.replace(/^#\d+\s*[-:]*\s*/, '').trim();
};

export function LoginScreen({ onLogin, kioskStationId }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState<string | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showImpressum, setShowImpressum] = useState(false);
  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [lastNameFocused, setLastNameFocused] = useState(false);

  // Manual PIN Login and Kiosk Activator States
  const [pinInput, setPinInput] = useState('');
  const [kioskRooms, setKioskRooms] = useState<any[]>([]);
  const [kioskStations, setKioskStations] = useState<any[]>([]);
  const [kioskSelectedRoomId, setKioskSelectedRoomId] = useState<string>('');
  const [activeSessionStationIds, setActiveSessionStationIds] = useState<string[]>([]);
  const [loadingKioskData, setLoadingKioskData] = useState(false);

  // Onboarding States
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardSchoolName, setOnboardSchoolName] = useState('');
  const [onboardRepresentedBy, setOnboardRepresentedBy] = useState('');
  const [onboardStreet, setOnboardStreet] = useState('');
  const [onboardZip, setOnboardZip] = useState('');
  const [onboardCity, setOnboardCity] = useState('');
  const [onboardEmail, setOnboardEmail] = useState('');
  const [onboardAdminFirstName, setOnboardAdminFirstName] = useState('');
  const [onboardAdminLastName, setOnboardAdminLastName] = useState('');
  const [onboardDpaAccepted, setOnboardDpaAccepted] = useState(false);
  const [onboardCreatedUser, setOnboardCreatedUser] = useState<any>(null);
  const [onboardIPAddress, setOnboardIPAddress] = useState('unknown');
  const [expandedSection, setExpandedSection] = useState<'none' | 'pin' | 'kiosk'>('none');

  const fetchIpAddress = async () => {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      return data.ip || 'unknown';
    } catch (e) {
      console.warn("Failed to fetch IP address, using fallback", e);
      return 'unknown';
    }
  };

  const downloadQrCode = () => {
    if (!onboardCreatedUser) return;
    const url = `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${onboardCreatedUser.qr_token}`;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = `groovelab_ausweis_${onboardCreatedUser.first_name}_${onboardCreatedUser.last_name}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOnboardingSubmit = async () => {
    if (!onboardSchoolName.trim() || !onboardRepresentedBy.trim() || !onboardStreet.trim() || !onboardZip.trim() || !onboardCity.trim() || !onboardEmail.trim() || !onboardAdminFirstName.trim() || !onboardAdminLastName.trim()) {
      alert("Bitte alle Felder ausfüllen.");
      return;
    }
    
    setLoading(true);
    try {
      // 1. Get client IP address
      const ip = await fetchIpAddress();
      setOnboardIPAddress(ip);

      // 2. Create the school
      const schoolId = crypto.randomUUID();
      const { data: newSchool, error: schoolErr } = await supabase
        .from('schools')
        .insert({
          id: schoolId,
          name: onboardSchoolName.trim(),
          represented_by: onboardRepresentedBy.trim(),
          street: onboardStreet.trim(),
          zip_code: onboardZip.trim(),
          city: onboardCity.trim(),
          email: onboardEmail.trim(),
          primary_color: '#3b82f6'
        })
        .select()
        .single();

      if (schoolErr) throw schoolErr;

      // 3. Create the admin user
      const adminId = crypto.randomUUID();
      const adminQrToken = crypto.randomUUID();
      const { data: newAdmin, error: adminErr } = await supabase
        .from('users')
        .insert({
          id: adminId,
          school_id: schoolId,
          role: 'admin',
          first_name: onboardAdminFirstName.trim(),
          last_name: onboardAdminLastName.trim(),
          qr_token: adminQrToken
        })
        .select()
        .single();

      if (adminErr) throw adminErr;

      // 4. Log the DPA Agreement
      const { error: dpaErr } = await supabase
        .from('dpa_agreements')
        .insert({
          school_id: schoolId,
          user_id: adminId,
          dpa_version: 'v1.0-DSGVO',
          ip_address: ip
        });

      if (dpaErr) throw dpaErr;

      // Save admin info to display QR code in step 3
      setOnboardCreatedUser({
        first_name: onboardAdminFirstName.trim(),
        last_name: onboardAdminLastName.trim(),
        qr_token: adminQrToken,
        schoolName: onboardSchoolName.trim()
      });
      setOnboardingStep(3);
    } catch (err: any) {
      console.error("Onboarding failed:", err);
      alert("Fehler bei der Registrierung: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderOnboardingScreen = () => {
    return (
      <div style={{ 
        position: 'fixed',
        inset: 0,
        backgroundColor: '#f8fafc', 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'Inter, system-ui, sans-serif',
        zIndex: 9999,
        overflowY: 'auto'
      }}>
        <div style={{
          width: '100%',
          maxWidth: onboardingStep === 2 ? '650px' : '550px',
          background: '#ffffff',
          borderRadius: '40px',
          padding: '40px',
          boxShadow: '0 30px 80px rgba(15, 23, 42, 0.06)',
          border: '1px solid #f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eab308' }}>
              <School size={28} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>Musikschule Onboarding</h2>
              <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {onboardingStep === 1 && "Schritt 1: Stammdaten & Administrator"}
                {onboardingStep === 2 && "Schritt 2: AV-Vertrag (DPA)"}
                {onboardingStep === 3 && "Schritt 3: Abschluss & Login-Ausweis"}
              </p>
            </div>
          </div>

          {onboardingStep === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); setOnboardingStep(2); }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>Name der Schule *</label>
                  <input type="text" required value={onboardSchoolName} onChange={e => setOnboardSchoolName(e.target.value)} placeholder="z.B. GrooveLab Musikakademie" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>Vertreten durch (Schulleitung) *</label>
                  <input type="text" required value={onboardRepresentedBy} onChange={e => setOnboardRepresentedBy(e.target.value)} placeholder="z.B. Dr. Armin Wagner" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>E-Mail-Adresse *</label>
                  <input type="email" required value={onboardEmail} onChange={e => setOnboardEmail(e.target.value)} placeholder="leitung@musikschule.de" style={inputStyle} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>Straße & Hausnummer *</label>
                    <input type="text" required value={onboardStreet} onChange={e => setOnboardStreet(e.target.value)} placeholder="Hauptstr. 12" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>PLZ *</label>
                    <input type="text" required value={onboardZip} onChange={e => setOnboardZip(e.target.value)} placeholder="79713" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>Ort *</label>
                    <input type="text" required value={onboardCity} onChange={e => setOnboardCity(e.target.value)} placeholder="Bad Säckingen" style={inputStyle} />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '8px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Administrator / Erstes Lehrer-Konto</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>Vorname *</label>
                      <input type="text" required value={onboardAdminFirstName} onChange={e => setOnboardAdminFirstName(e.target.value)} placeholder="Max" style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>Nachname *</label>
                      <input type="text" required value={onboardAdminLastName} onChange={e => setOnboardAdminLastName(e.target.value)} placeholder="Mustermann" style={inputStyle} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => { setShowOnboarding(false); setOnboardingStep(1); }} style={backButtonStyle}>Abbrechen</button>
                <button type="submit" style={nextButtonStyle}>
                  Weiter zu Schritt 2 <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

          {onboardingStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ 
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px',
                maxHeight: '260px',
                overflowY: 'auto',
                fontSize: '12px',
                lineHeight: '1.6',
                color: '#334155',
                textAlign: 'left'
              }}>
                <h4 style={{ margin: '0 0 10px 0', fontWeight: 800, fontSize: '13px' }}>AV-VERTRAG (VEREINBARUNG ZUR AUFTRAGSVERARBEITUNG NACH ART. 28 DSGVO)</h4>
                <p><strong>Vertragspartner:</strong><br/>
                Plattformbetreiber: GrooveLab App (Betreiber: Patrick Huber) (nachfolgend „Auftragnehmer“)<br/>
                Musikschule: {onboardSchoolName || 'unbenannt'} (nachfolgend „Auftraggeber“)</p>
                
                <h5 style={{ margin: '12px 0 6px 0', fontWeight: 800 }}>§ 1 Gegenstand und Dauer der Verarbeitung</h5>
                <p>Der Auftragnehmer stellt dem Auftraggeber die Software-Plattform „GrooveLab App“ als digitales Logbuch- und Raumverwaltungssystem zur Verfügung. Die Verarbeitung umfasst personenbezogene Daten der Schüler (standardmäßig anonymisierte Nachnamen) und Coaches (Check-ins, Lernfortschritte) des Auftraggebers.</p>
                
                <h5 style={{ margin: '12px 0 6px 0', fontWeight: 800 }}>§ 2 Technische und Organisatorische Maßnahmen (TOM)</h5>
                <p>Der Auftragnehmer sichert angemessene technische und organisatorische Maßnahmen nach Art. 32 DSGVO zu, um die Datensicherheit und Vertraulichkeit zu gewährleisten (z.B. Row Level Security Mandantentrennung, verschlüsselte Verbindungen). Die Datenverarbeitung und das Hosting erfolgen ausschließlich in Deutschland auf der Infrastruktur von Hetzner Online GmbH (Hetzner.com).</p>
                
                <h5 style={{ margin: '12px 0 6px 0', fontWeight: 800 }}>§ 3 Pflichten des Auftragnehmers</h5>
                <p>Die Verarbeitung der Daten erfolgt ausschließlich weisungsgebunden im Rahmen des vertraglich vereinbarten Verwendungszwecks. Der Auftragnehmer verpflichtet sein Personal auf Vertraulichkeit und unterstützt den Auftraggeber bei Betroffenenrechten und Audits nach bestem Wissen.</p>
                
                <h5 style={{ margin: '12px 0 6px 0', fontWeight: 800 }}>§ 4 Pflichten des Auftraggebers</h5>
                <p>Der Auftraggeber ist die „verantwortliche Stelle“ im Sinne der DSGVO und stellt sicher, dass für die Eingabe der Schüler- und Lehrerdaten eine gesetzliche Grundlage oder Einwilligung vorliegt.</p>
              </div>

              <div style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '12px',
                background: '#fefcbf',
                border: '1px solid #fef08a',
                padding: '16px',
                borderRadius: '16px'
              }}>
                <input 
                  type="checkbox" 
                  id="dpa-accept-checkbox"
                  checked={onboardDpaAccepted}
                  onChange={(e) => setOnboardDpaAccepted(e.target.checked)}
                  style={{ marginTop: '3px', cursor: 'pointer', width: '18px', height: '18px' }}
                />
                <label htmlFor="dpa-accept-checkbox" style={{ fontSize: '12px', color: '#854d0e', fontWeight: 700, cursor: 'pointer', textAlign: 'left', lineHeight: '1.4' }}>
                  Ich bestätige die Vereinbarung zur Auftragsverarbeitung (AV-Vertrag / DPA) hiermit rechtsverbindlich für die oben genannte Musikschule „{onboardSchoolName}“ und erkläre, dass ich zur Schulleitung gehöre bzw. zeichnungsberechtigt bin.
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setOnboardingStep(1)} style={backButtonStyle}>Zurück</button>
                <button 
                  type="button" 
                  disabled={!onboardDpaAccepted || loading} 
                  onClick={handleOnboardingSubmit} 
                  style={{
                    ...nextButtonStyle,
                    opacity: (!onboardDpaAccepted || loading) ? 0.5 : 1,
                    cursor: (!onboardDpaAccepted || loading) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? "Verarbeite..." : "Registrierung abschließen"}
                </button>
              </div>
            </div>
          )}

          {onboardingStep === 3 && onboardCreatedUser && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e', marginBottom: '8px' }}>
                <Check size={36} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#16a34a' }}>Registrierung erfolgreich!</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Die Schule „{onboardCreatedUser.schoolName}“ wurde erfolgreich angelegt.</p>
              </div>

              {/* Admin Ausweis Card */}
              <div style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                borderRadius: '32px',
                padding: '24px',
                width: '320px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <div style={{ fontSize: '10px', fontWeight: 900, color: '#eab308', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '16px' }}>GrooveLab Admin-Ausweis</div>
                
                {/* QR Code Container */}
                <div style={{
                  background: 'white',
                  borderRadius: '24px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <img 
                    src={`https://chart.googleapis.com/chart?chs=180x180&cht=qr&chl=${onboardCreatedUser.qr_token}`} 
                    alt="Admin QR Ausweis" 
                    style={{ width: '180px', height: '180px', display: 'block', borderRadius: '12px' }}
                  />
                </div>

                <div style={{ marginTop: '16px', fontWeight: 800, fontSize: '1.1rem' }}>
                  {onboardCreatedUser.first_name} {onboardCreatedUser.last_name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginTop: '2px' }}>
                  Administrator
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '320px' }}>
                <button 
                  onClick={downloadQrCode} 
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    color: '#475569',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <Download size={16} /> Ausweis herunterladen (QR)
                </button>
                <button 
                  onClick={() => {
                    setShowOnboarding(false);
                    setOnboardingStep(1);
                    setOnboardDpaAccepted(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '16px',
                    border: 'none',
                    background: '#eab308',
                    color: '#0f172a',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Zurück zum Login-Bildschirm
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    borderRadius: '10px',
    background: '#f8fafc',
    border: '1px solid #cbd5e1',
    color: '#0f172a',
    fontSize: '0.9rem',
    outline: 'none',
    fontWeight: 700,
    fontFamily: 'Inter, system-ui, sans-serif'
  };

  const backButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: '14px',
    borderRadius: '12px',
    background: 'white',
    border: '1px solid #e2e8f0',
    color: '#64748b',
    fontWeight: 800,
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all 0.2s'
  };

  const nextButtonStyle: React.CSSProperties = {
    flex: 2,
    padding: '14px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
    border: 'none',
    color: '#0f172a',
    fontWeight: 800,
    fontSize: '0.9rem',
    cursor: 'pointer',
    boxShadow: '0 8px 20px rgba(234, 179, 8, 0.2)',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  };

  // Secret Master Admin click combo state
  const [logoClicks, setLogoClicks] = useState(0);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUsernameInput, setAdminUsernameInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);

  // Teacher check-in choice modal state
  const [showTeacherChoiceModal, setShowTeacherChoiceModal] = useState(false);
  const [pendingTeacherUser, setPendingTeacherUser] = useState<{ user: any; isWithinAnyRoom: boolean } | null>(null);

  // Reset logo clicks after 3 seconds of inactivity
  useEffect(() => {
    if (logoClicks > 0) {
      const timer = setTimeout(() => setLogoClicks(0), 3000);
      return () => clearTimeout(timer);
    }
  }, [logoClicks]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsernameInput.trim() || !adminPasswordInput.trim()) return;
    try {
      setAdminLoginLoading(true);
      setError(null);
      
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('*')
        .eq('is_master_admin', true)
        .eq('master_admin_username', adminUsernameInput.trim())
        .eq('master_admin_password', adminPasswordInput.trim())
        .maybeSingle();

      if (userErr || !user) {
        throw new Error('Ungültige Master-Admin Anmeldedaten.');
      }

      console.log('[Login] Master Admin logged in with credentials.');
      setShowAdminModal(false);
      
      // Clean inputs
      setAdminUsernameInput('');
      setAdminPasswordInput('');
      
      finalizeLogin(user, null, true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdminLoginLoading(false);
    }
  };

  // Onboarding parameters for invited school coaches
  const urlParams = new URLSearchParams(window.location.search);
  const inviteSchoolId = urlParams.get('invite_school_id');
  const inviteRole = urlParams.get('role') || 'teacher';
  const schoolIdParam = urlParams.get('school_id');
  const schoolParam = urlParams.get('school') || urlParams.get('subdomain');
  
  const [schoolName, setSchoolName] = useState<string>('');
  const [schoolData, setSchoolData] = useState<any>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [registeredUser, setRegisteredUser] = useState<any>(null);
  const [loadingSchool, setLoadingSchool] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  const [userPos, setUserPos] = useState<{lat: number, lng: number} | null>(null);
  
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn('[Login] Initial geo fetch failed:', err),
        { enableHighAccuracy: true, maximumAge: 30000 }
      );
    }
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const qrToken = urlParams.get('qr_token');
    if (qrToken && !loading) {
      console.log('[Login] Auto-logging in via URL qr_token:', qrToken);
      handlePinLogin(qrToken);
    }
  }, [schoolData]);

  let effectiveStationId = kioskStationId || localStorage.getItem('groovelab_station_id');
  if (effectiveStationId === 'skip') effectiveStationId = null;

  useEffect(() => {
    async function loadSchoolInfo() {
      try {
        setLoadingSchool(true);

        // Subdomain resolution logic
        const getSubdomain = () => {
          let host = window.location.hostname;
          
          // If the hostname ends with the platform's main domain, strip it to isolate the subdomain
          const mainDomains = ['.campus-groovelab.de', '.groovelab.de', '.campus-groovelab.com'];
          for (const domain of mainDomains) {
            if (host.endsWith(domain)) {
              return host.substring(0, host.length - domain.length);
            }
          }
          
          const parts = host.split('.');
          if (parts.length >= 3) {
            const first = parts[0];
            if (first !== 'www' && first !== 'admin' && first !== 'campus-groovelab') {
              return first;
            }
          } else if (parts.length === 2 && parts[1] === 'localhost') {
            return parts[0];
          }
          
          // Check query parameters as fallback (useful for local localhost dev bypass)
          const urlParams = new URLSearchParams(window.location.search);
          const schoolParam = urlParams.get('school') || urlParams.get('subdomain');
          if (schoolParam) {
            return schoolParam;
          }
          return null;
        };

        const subdomain = getSubdomain();

        if (subdomain) {
          const { data: allSchools, error: allSchoolsErr } = await supabase.from('schools').select('*');
          if (!allSchoolsErr && allSchools) {
            const slugify = (name: string) => {
              return name
                .toLowerCase()
                .trim()
                .replace(/[äöüß]/g, (match) => {
                  const mapping: Record<string, string> = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' };
                  return mapping[match] || match;
                })
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-+|-+$/g, '');
            };

            const matchedSchool = allSchools.find(s => {
              const slug = slugify(s.name);
              const cleanSub = subdomain.toLowerCase().trim();
              return slug === cleanSub || 
                     slug.replace(/-/g, '') === cleanSub.replace(/-/g, '') ||
                     slug.startsWith(cleanSub + '-') || 
                     cleanSub.startsWith(slug + '-');
            });
            if (matchedSchool) {
              setSchoolName(matchedSchool.name);
              setSchoolData(matchedSchool);
              return; // Successfully resolved school via subdomain
            }
          }
        }

        if (inviteSchoolId) {
          const { data, error } = await supabase.from('schools').select('*').eq('id', inviteSchoolId).maybeSingle();
          if (!error && data) {
            setSchoolName(data.name);
            setSchoolData(data);
          }
        } else if (schoolIdParam) {
          const { data, error } = await supabase.from('schools').select('*').eq('id', schoolIdParam).maybeSingle();
          if (!error && data) {
            setSchoolName(data.name);
            setSchoolData(data);
          }
        } else if (effectiveStationId) {
          const { data: stData, error: stError } = await supabase
            .from('stations')
            .select('rooms(schools(*))')
            .eq('id', effectiveStationId)
            .maybeSingle() as any;
            
          if (!stError && stData?.rooms?.schools) {
            const sc = Array.isArray(stData.rooms.schools) ? stData.rooms.schools[0] : stData.rooms.schools;
            if (sc) {
              setSchoolName(sc.name);
              setSchoolData(sc);
            }
          }
        }
      } catch (err) {
        console.error("Error loading school info:", err);
      } finally {
        setLoadingSchool(false);
      }
    }
    loadSchoolInfo();
  }, [inviteSchoolId, effectiveStationId, schoolIdParam, schoolParam]);

  const finalizeLogin = async (user: any, stationId: string | null, isWithinAnyRoom: boolean, hidePresence = false) => {
    try {
      setLoading(true);
      sessionStorage.setItem('groovelab_user_id', user.id);
      let finalStationId = null;
      let isHome = false;

      const userSchool = Array.isArray(user.schools) ? user.schools[0] : user.schools;
      const isMaster = user.is_master_admin === true;
      const isTeacher = user.role?.toLowerCase() === 'teacher' || user.role?.toLowerCase() === 'admin';
      
      if (!isMaster) {
        // Enforce school matching check for students using component-level schoolData state
        if (user.role === 'student') {
          if (!schoolData?.id) {
            alert("Login verweigert. Für den Schüler-Login wird ein zugehöriger Schul-Link benötigt.");
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
          if (user.school_id !== schoolData.id) {
            alert("Login verweigert. Dieser Login-Link gehört nicht zu deiner Schule.");
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
        }

        if (userSchool?.is_paused || userSchool?.status === 'suspended') {
          alert("Login ist aktuell nicht möglich (Status gesperrt oder pausiert).");
          await supabase.auth.signOut();
          setLoading(false);
          return;
        } else if (userSchool?.is_trial && userSchool?.trial_ends_at) {
          const trialEnd = new Date(userSchool.trial_ends_at).getTime();
          const nowMs = new Date().getTime();
          if (nowMs > trialEnd) {
            alert("Login ist aktuell nicht möglich (Probezeit abgelaufen).");
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
        } else if (!userSchool?.is_trial && userSchool?.contract_ends_at) {
          const contractEnd = new Date(userSchool.contract_ends_at).getTime();
          const nowMs = new Date().getTime();
          if (nowMs > contractEnd) {
            alert("Login ist aktuell nicht möglich (Vertrag abgelaufen).");
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
        } else if (user.status === 'bypass') {
          alert("Dein Login ist aktuell gesperrt.");
          await supabase.auth.signOut();
          setLoading(false);
          return;
        } else if (user.is_trial && user.trial_ends_at) {
          const trialEnd = new Date(user.trial_ends_at).getTime();
          const nowMs = new Date().getTime();
          if (nowMs > trialEnd) {
            alert("Dein Login ist aktuell nicht möglich (Probezeit abgelaufen).");
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
        } else if (user.role !== 'student' && !user.is_trial && user.contract_ends_at) {
          const contractEnd = new Date(user.contract_ends_at).getTime();
          const nowMs = new Date().getTime();
          if (nowMs > contractEnd) {
            alert("Dein Login ist aktuell nicht möglich (Vertrag abgelaufen).");
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
        }
      }
      
      const now = new Date().toISOString();
      
      if (isTeacher) {
        if (hidePresence) {
          sessionStorage.setItem('groovelab_teacher_hide_presence', 'true');
        } else {
          sessionStorage.setItem('groovelab_teacher_hide_presence', 'false');
        }
      }

      // 1. Determine finalStationId and lookup teacher station if needed
      if (isTeacher) {
        const schoolId = user.school_id || (Array.isArray(user.schools) ? user.schools[0]?.id : user.schools?.id);
        const { data: tStations } = await supabase
          .from('stations')
          .select('id, room_id, name, rooms!inner(school_id)')
          .eq('name', 'Lehrer iPad')
          .eq('rooms.school_id', schoolId);

        if (tStations && tStations.length > 0) {
          let matchedStation = null;
          if (stationId) {
            const { data: scanSt } = await supabase.from('stations').select('room_id').eq('id', stationId).maybeSingle();
            if (scanSt?.room_id) {
              matchedStation = tStations.find(s => s.room_id === scanSt.room_id);
            }
          }
          finalStationId = (matchedStation || tStations[0]).id;
        } else {
          finalStationId = null;
        }
      } else {
        if (stationId) {
          const { data: curStation } = await supabase.from('stations').select('name').eq('id', stationId).maybeSingle();
          const stationName = curStation?.name?.toLowerCase() || '';
          if (stationName.includes('lehrer') || stationName.includes('teacher')) {
            console.log(`[Login] Student tried to log in on teacher station. Forcing Home mode.`);
            alert("Hinweis: Schüler können sich nicht am Lehrer-iPad einloggen. Du wirst automatisch im Home-Modus angemeldet.");
            isHome = true;
            finalStationId = null;
          } else {
            finalStationId = stationId;
          }
        } else {
          finalStationId = null;
        }
      }

      // Geofence check
      // For teachers, we only force Home mode if they explicitly chose to hide presence. We bypass the physical geofence check.
      const shouldForceHome = isTeacher ? hidePresence : (!isWithinAnyRoom);
      if (shouldForceHome) {
        console.log(`[Login] Outside geofence or hiding presence. Forcing Home mode.`);
        isHome = true;
        finalStationId = null;
      }

      // 1.5 Check opening hours for sessions (Students only) - Bypassed per user request
      const withinHours = true;
      const enforceHours = false;
      console.log('[Login] Opening hours check bypassed.');


      console.log(`[Login] Final Station ID: ${finalStationId}, isHome: ${isHome}, withinHours: ${withinHours}`);

      // 2. Session Management (Only for Academy/Lab sessions)
      // 2. Global Cleanup: Always terminate any existing active sessions for THIS USER
      await supabase.from('sessions').update({ check_out_time: now }).eq('user_id', user.id).is('check_out_time', null);

      if (!isHome) {
        // 3. Station Cleanup: If using a station, ensure it's free.
        // We only terminate other sessions if the station is NOT the teacher iPad (i.e. user is not a teacher).
        if (finalStationId && !isTeacher) {
          await supabase.from('sessions').update({ check_out_time: now }).eq('station_id', finalStationId).is('check_out_time', null);
        }
        
        const { data: sess, error: sessErr } = await supabase
          .from('sessions')
          .insert({
            user_id: user.id,
            station_id: finalStationId,
            gps_verified: true,
            check_in_time: now
          })
          .select()
          .single();

        if (sessErr) {
          console.error('[Login] Error creating session:', sessErr);
          alert('Fehler beim Erstellen der Sitzung: ' + sessErr.message);
        } else {
          console.log('[Login] Session created successfully:', sess.id);
        }
      } else {
        console.log(`[Login] Home mode detected. No new session created.`);
      }

      setLoading(false);
      
      onLogin(user.id, isHome);
    } catch (err: any) {
      console.error('[Login] Finalize error:', err.message);
      sessionStorage.removeItem('groovelab_user_id');
      setError(err.message);
      setLoading(false);
    }
  };

  const [prefetchedRooms, setPrefetchedRooms] = useState<any[] | null>(null);

  // Pre-fetch rooms for the current station's school to save time during scan
  useEffect(() => {
    async function prefetch() {
      if (!effectiveStationId) return;
      try {
        // Find the school_id for this station
        const { data: stationData } = await supabase
          .from('stations')
          .select('rooms(school_id)')
          .eq('id', effectiveStationId)
          .single();
        
        const schoolId = (stationData?.rooms as any)?.school_id;
        if (schoolId) {
          const { data: rooms } = await supabase.from('rooms').select('*').eq('school_id', schoolId).order('sort_order', { ascending: true });
          setPrefetchedRooms(rooms);
          console.log(`[Login] Pre-fetched ${rooms?.length} rooms for school: ${schoolId}`);
        }
      } catch (e) {
        console.warn('[Login] Pre-fetch failed', e);
      }
    }
    prefetch();
  }, [effectiveStationId]);

  // Fetch rooms and stations for the Kiosk activator when schoolData is resolved
  useEffect(() => {
    if (!schoolData?.id) return;
    async function fetchKioskData() {
      try {
        setLoadingKioskData(true);
        const [roomsRes, stationsRes, sessionsRes] = await Promise.all([
          supabase.from('rooms').select('*').eq('school_id', schoolData.id).order('sort_order', { ascending: true }),
          supabase.from('stations').select('*').order('name'),
          supabase.from('sessions').select('station_id').is('check_out_time', null)
        ]);
        
        const rData = roomsRes.data || [];
        setKioskRooms(rData);
        if (rData.length > 0) {
          setKioskSelectedRoomId(rData[0].id);
        }
        
        const roomIds = rData.map((r: any) => r.id);
        setKioskStations((stationsRes.data || []).filter((s: any) => roomIds.includes(s.room_id)));
        setActiveSessionStationIds((sessionsRes.data || []).map((s: any) => s.station_id));
      } catch (err) {
        console.error("Error fetching kiosk activator data:", err);
      } finally {
        setLoadingKioskData(false);
      }
    }
    fetchKioskData();
  }, [schoolData]);

  const handlePinLogin = async (pin: string) => {
    if (!pin.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      console.log('[Login] Attempting manual PIN login for:', pin);
      let query = supabase
        .from('users')
        .select('*, schools(*)');
      
      const cleanPin = pin.trim();
      if (cleanPin.includes('-') && cleanPin.length > 20) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanPin);
        if (isUuid) {
          query = query.eq('qr_token', cleanPin);
        } else {
          query = query.eq('teacher_qr_token', cleanPin);
        }
      } else {
        query = query.eq('ausweis_nummer', cleanPin);
      }

      const { data: user, error: userErr } = await query.maybeSingle();

      if (userErr || !user) {
        throw new Error('Ungültiger Ausweis-PIN oder QR-Token.');
      }

      if (user.is_master_admin) {
        finalizeLogin(user, null, true);
        return;
      }

      const userSchool = Array.isArray(user.schools) ? user.schools[0] : user.schools;
      if (!user.school_id && userSchool?.id) {
        user.school_id = userSchool.id;
      }

      if (user.role === 'student') {
        if (!schoolData?.id) {
          throw new Error('Für den Schüler-Login wird ein zugehöriger Schul-Link benötigt.');
        }
        if (user.school_id !== schoolData.id) {
          throw new Error('Login verweigert. Dieser Login-Link gehört nicht zu deiner Schule.');
        }
      }

      let isWithinAnyRoom = true;
      const isBypass = userSchool?.opening_hours?.geofence_bypass === true || !!effectiveStationId;

      if (!isBypass) {
        isWithinAnyRoom = false;
        let currentPos = userPos;
        if (!currentPos && navigator.geolocation) {
          try {
            currentPos = await new Promise<{lat: number, lng: number}>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => reject(err),
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
              );
            });
            setUserPos(currentPos);
          } catch (e) {
            console.warn('[Login] Geolocation fetch failed during PIN login:', e);
          }
        }

        if (currentPos) {
          const { data: rooms } = await supabase.from('rooms').select('*').eq('school_id', user.school_id).order('sort_order', { ascending: true });
          if (rooms) {
            for (const room of rooms) {
              const points = Array.isArray(room.geofence_points) ? room.geofence_points : [];
              const allCoords = [...points];
              if (room.latitude && room.longitude) allCoords.push({ lat: room.latitude, lng: room.longitude });
              
              for (const pt of allCoords) {
                if (pt && pt.lat && pt.lng) {
                  const dist = getDistanceFromLatLonInM(currentPos.lat, currentPos.lng, Number(pt.lat), Number(pt.lng));
                  if (dist < 100) { 
                    isWithinAnyRoom = true;
                    break;
                  }
                }
              }
              if (isWithinAnyRoom) break;
            }
          }

          if (!isWithinAnyRoom && userSchool?.latitude && userSchool?.longitude) {
            const distToSchool = getDistanceFromLatLonInM(currentPos.lat, currentPos.lng, Number(userSchool.latitude), Number(userSchool.longitude));
            const radius = userSchool.geofence_radius_meters || 150;
            if (distToSchool < radius) {
              isWithinAnyRoom = true;
            }
          }
        }
      }

      const isTeacher = user.role?.toLowerCase() === 'teacher' || user.role?.toLowerCase() === 'admin';
      if (isTeacher) {
        if (user.is_observer) {
          await finalizeLogin(user, effectiveStationId, false, true);
          return;
        }

        if (isWithinAnyRoom) {
          setPendingTeacherUser({ user, isWithinAnyRoom: true });
          setShowTeacherChoiceModal(true);
          setLoading(false);
        } else {
          await finalizeLogin(user, effectiveStationId, false, true);
        }
        return;
      }

      await finalizeLogin(user, effectiveStationId, isWithinAnyRoom);
    } catch (err: any) {
      console.error('[Login] PIN login error:', err.message);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setError('Canvas-Kontext konnte nicht erstellt werden.');
          setLoading(false);
          return;
        }
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          handleScan(code.data);
        } else {
          setError('Kein QR-Code im Bild gefunden. Bitte lade ein schärferes Foto hoch.');
          setLoading(false);
        }
      };
      img.onerror = () => {
        setError('Bild konnte nicht geladen werden.');
        setLoading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async (scannedValue: string) => {
    if (loading) return;
    setLoading(true);
    setError(null);

    let qrToken = scannedValue;
    try {
      if (scannedValue.includes('?')) {
        const urlParams = new URLSearchParams(scannedValue.split('?')[1]);
        const parsedToken = urlParams.get('qr_token');
        if (parsedToken) {
          qrToken = parsedToken;
        }
      }
    } catch (e) {
      console.warn("Failed to parse scanned URL", e);
    }

    // 0. Force kill camera immediately upon scan
    try {
      document.querySelectorAll('video').forEach(video => {
        const stream = video.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          video.srcObject = null;
        }
      });
      
      // Secondary fallback to kill any global media streams
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
           stream.getTracks().forEach(t => t.stop());
        }).catch(e => { /* Ignore */ });
    } catch (e) {
      console.warn("Could not kill camera", e);
    }

    try {
      console.log('[Login] Starting scan for token:', qrToken);

      // 1. User finden
      sessionStorage.setItem('groovelab_qr_token', qrToken);
      let query = supabase.from('users').select('*, schools(*)');
      
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(qrToken);
      if (isUuid) {
        query = query.eq('qr_token', qrToken);
      } else {
        query = query.eq('teacher_qr_token', qrToken);
      }
      
      const { data: user, error: userErr } = await query.maybeSingle();
      sessionStorage.removeItem('groovelab_qr_token');

      if (userErr || !user) throw new Error('Nutzer nicht gefunden.');

      // Early exit if the user scanned is the Master Admin
      if (user.is_master_admin) {
        console.log('[Login] Master Admin QR token scanned! Logging in directly.');
        finalizeLogin(user, null, true);
        return;
      }

      const userSchool = Array.isArray(user.schools) ? user.schools[0] : user.schools;
      
      // Ensure school_id is available for room lookups even if not directly on the user object
      if (!user.school_id && userSchool?.id) {
        user.school_id = userSchool.id;
      }

      if (user.role === 'student') {
        if (!schoolData?.id) {
          throw new Error('Für den Schüler-Login wird ein zugehöriger Schul-Link benötigt.');
        }
        if (user.school_id !== schoolData.id) {
          throw new Error('Login verweigert. Dieser Login-Link gehört nicht zu deiner Schule.');
        }
      }

      // 2. Geofence Check (Simpel & Stabil)
      let isWithinAnyRoom = true;
      const isBypass = schoolData?.opening_hours?.geofence_bypass === true || !!effectiveStationId;

      if (!isBypass) {
        isWithinAnyRoom = false;
        console.log('[Login] Geofence check active. Fetching current location...');
        
        let currentPos = userPos;
        if (!currentPos && navigator.geolocation) {
          try {
            currentPos = await new Promise<{lat: number, lng: number}>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => reject(err),
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
              );
            });
            setUserPos(currentPos);
          } catch (e) {
            console.warn('[Login] Geolocation fetch during scan failed:', e);
          }
        }

        if (currentPos) {
          // 1. Check Rooms (Multi-Point)
          const { data: rooms } = await supabase.from('rooms').select('*').eq('school_id', user.school_id).order('sort_order', { ascending: true });
          if (rooms) {
            for (const room of rooms) {
              const points = Array.isArray(room.geofence_points) ? room.geofence_points : [];
              const allCoords = [...points];
              if (room.latitude && room.longitude) allCoords.push({ lat: room.latitude, lng: room.longitude });
              
              for (const pt of allCoords) {
                if (pt && pt.lat && pt.lng) {
                  const dist = getDistanceFromLatLonInM(currentPos.lat, currentPos.lng, Number(pt.lat), Number(pt.lng));
                  if (dist < 100) { 
                    isWithinAnyRoom = true;
                    break;
                  }
                }
              }
              if (isWithinAnyRoom) break;
            }
          }

          // 2. School Fallback (Single Point + Radius)
          if (!isWithinAnyRoom && schoolData?.latitude && schoolData?.longitude) {
            const distToSchool = getDistanceFromLatLonInM(
              currentPos.lat, currentPos.lng, 
              Number(schoolData.latitude), Number(schoolData.longitude)
            );
            const radius = schoolData.geofence_radius_meters || 150;
            if (distToSchool < radius) {
              isWithinAnyRoom = true;
            }
          }
        } else {
          console.warn('[Login] Geofence check failed because user position could not be acquired.');
        }

        setGeoDebug({
          isWithinAnyRoom,
          userPos: currentPos,
          schoolCoords: schoolData ? { lat: schoolData.latitude, lng: schoolData.longitude } : null,
          distToSchool: (currentPos && schoolData?.latitude && schoolData?.longitude)
            ? Math.round(getDistanceFromLatLonInM(currentPos.lat, currentPos.lng, Number(schoolData.latitude), Number(schoolData.longitude)))
            : null,
          withinHours: true
        });
      } else {
        console.log('[Login] Geofence check bypassed per academy settings.');
        setGeoDebug({
          isWithinAnyRoom: true,
          userPos: null,
          schoolCoords: schoolData ? { lat: schoolData.latitude, lng: schoolData.longitude } : null,
          distToSchool: null,
          withinHours: true
        });
      }

      console.log(`[Login] Scan successful. Geofence match: ${isWithinAnyRoom}`);
      
      const isTeacher = user.role?.toLowerCase() === 'teacher' || user.role?.toLowerCase() === 'admin';
      if (isTeacher) {
        if (user.is_observer) {
          // Hospitanten are always sent to home mode without prompt
          await finalizeLogin(user, effectiveStationId, false, true);
          return;
        }

        if (isWithinAnyRoom) {
          // Only show choice modal if within geofence (i.e. groovelab is "open" / accessible)
          setPendingTeacherUser({ user, isWithinAnyRoom: true });
          setShowTeacherChoiceModal(true);
          setLoading(false);
        } else {
          // Directly set to Home mode (hidePresence = true, isWithinAnyRoom = false) without asking
          console.log('[Login] Teacher outside geofence. Directing to Home mode without prompt.');
          await finalizeLogin(user, effectiveStationId, false, true);
        }
        return;
      }

      // Automatically finalize based on geofence detection
      await finalizeLogin(user, effectiveStationId, isWithinAnyRoom);
    } catch (err: any) {
      console.error('[Login] Scan error:', err.message);
      setError(err.message);
      setLoading(false);
    }
  };

  const confirmTeacherLogin = async (hidePresence: boolean) => {
    if (!pendingTeacherUser) return;
    const { user, isWithinAnyRoom } = pendingTeacherUser;
    setShowTeacherChoiceModal(false);
    setPendingTeacherUser(null);
    await finalizeLogin(user, effectiveStationId, isWithinAnyRoom, hidePresence);
  };

  const [geoDebug, setGeoDebug] = useState<any>(null);
  const isLocalhost = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && import.meta.env.DEV;

  // Intercept and render coach self-onboarding if invite parameters are in URL
  if (inviteSchoolId) {
    const isSecretary = inviteRole === 'secretary' || inviteRole === 'admin';

    if (registeredUser) {
      return (
        <div style={{
          position: 'fixed', inset: 0, 
          backgroundColor: isSecretary ? '#f8fafc' : '#0f172a',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '20px', fontFamily: '"Outfit", "Inter", sans-serif', zIndex: 9999, 
          color: isSecretary ? '#1e293b' : '#f8fafc'
        }}>
          <div style={{
            width: '100%', maxWidth: '440px', 
            background: isSecretary ? '#ffffff' : 'rgba(255, 255, 255, 0.03)',
            borderRadius: '24px', padding: '36px',
            border: isSecretary ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)', 
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', 
            boxShadow: isSecretary ? '0 20px 50px rgba(15, 23, 42, 0.04)' : '0 40px 100px rgba(0, 0, 0, 0.4)', 
            boxSizing: 'border-box'
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', 
              background: isSecretary ? '#e6f4ea' : '#22c55e20',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px'
            }}>
              <Check size={36} color={isSecretary ? '#137333' : '#22c55e'} strokeWidth={3} />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: isSecretary ? '#137333' : '#22c55e', margin: '0 0 10px 0', textAlign: 'center', letterSpacing: '-0.02em' }}>
              Registrierung erfolgreich!
            </h1>
            <p style={{ color: isSecretary ? '#5f6368' : '#94a3b8', fontSize: '13px', textAlign: 'center', lineHeight: '1.5', margin: '0 0 24px 0', fontWeight: 600 }}>
              {isSecretary 
                ? 'Dein Campus Administrator-Ausweis wurde erstellt. Mache einen Screenshot oder drucke diesen QR-Code aus, um dich ab sofort einzuloggen.'
                : 'Dein GrooveLab Coach-Ausweis wurde erstellt. Mache einen Screenshot oder drucke diesen QR-Code aus, um dich ab sofort einzuloggen.'}
            </p>
            
            {/* ID Card Wrapper */}
            <div style={{
              width: '100%',
              background: isSecretary ? '#f8fafc' : 'rgba(255, 255, 255, 0.02)',
              borderRadius: '20px',
              border: isSecretary ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.06)',
              padding: '24px',
              boxSizing: 'border-box',
              marginBottom: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <div style={{
                background: 'white', padding: '12px', borderRadius: '16px',
                boxShadow: isSecretary ? '0 8px 24px rgba(0, 0, 0, 0.03)' : '0 10px 30px rgba(0,0,0,0.2)', 
                border: isSecretary ? '1px solid #e2e8f0' : 'none',
                marginBottom: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${registeredUser.qr_token}`} 
                  alt="QR Code" 
                  style={{ width: '180px', height: '180px', display: 'block' }}
                />
              </div>

              <div style={{ width: '100%', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: isSecretary ? '#5f6368' : '#94a3b8', marginBottom: '2px', fontWeight: 600 }}>Name</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: isSecretary ? '#1d1d1f' : 'white', marginBottom: '12px' }}>
                  {registeredUser.first_name} {registeredUser.last_name}
                </div>
                
                <div style={{ fontSize: '0.75rem', color: isSecretary ? '#5f6368' : '#94a3b8', marginBottom: '2px', fontWeight: 600 }}>Schule</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: isSecretary ? '#0b57d0' : '#eab308' }}>
                  {schoolName || 'GrooveLab Academy'}
                </div>
              </div>
            </div>

            <button
              onClick={() => onLogin(registeredUser.id, true)}
              style={{
                width: '100%', padding: '14px 20px', borderRadius: '100px',
                background: isSecretary ? '#0b57d0' : 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                border: 'none', color: isSecretary ? '#ffffff' : '#0f172a', fontWeight: 800, fontSize: '0.95rem',
                cursor: 'pointer', boxShadow: isSecretary ? '0 4px 12px rgba(11, 87, 208, 0.2)' : '0 8px 24px rgba(234, 179, 8, 0.25)',
                transition: 'all 0.2s', outline: 'none'
              }}
            >
              Direkt zum Dashboard einloggen
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{
        position: 'fixed', inset: 0, 
        backgroundColor: isSecretary ? '#f8fafc' : '#0f172a',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '20px', fontFamily: '"Outfit", "Inter", sans-serif', zIndex: 9999, 
        color: isSecretary ? '#1e293b' : '#f8fafc'
      }}>
        <div style={{
          width: '100%', maxWidth: '440px', 
          background: isSecretary ? '#ffffff' : 'rgba(255, 255, 255, 0.03)',
          borderRadius: '24px', padding: '36px',
          border: isSecretary ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)', 
          display: 'flex', flexDirection: 'column',
          boxShadow: isSecretary ? '0 20px 50px rgba(15, 23, 42, 0.04)' : '0 40px 100px rgba(0, 0, 0, 0.4)', 
          boxSizing: 'border-box'
        }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              background: isSecretary ? '#e8f0fe' : '#eab308', 
              padding: '10px', borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isSecretary ? '0 4px 12px rgba(11, 87, 208, 0.08)' : 'none'
            }}>
              {isSecretary ? (
                <School size={24} color="#0b57d0" strokeWidth={2.5} />
              ) : (
                <Music size={24} color="#0f172a" />
              )}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isSecretary ? '#0b57d0' : '#ffffff' }}>
              {isSecretary ? 'Campus Admin Einladung' : 'GrooveLab Einladung'}
            </div>
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em', color: isSecretary ? '#1d1d1f' : '#ffffff' }}>
            {isSecretary ? 'Registriere dich als Administrator' : 'Registriere dich als Coach'}
          </h2>
          <p style={{ color: isSecretary ? '#5f6368' : '#94a3b8', fontSize: '0.85rem', margin: '0 0 24px 0', lineHeight: '1.5', fontWeight: 600 }}>
            {isSecretary 
              ? `Du wurdest eingeladen, als Administrator/Verwaltung für die Schule `
              : `Du wurdest eingeladen, als Coach für die Schule `}
            <strong style={{ color: isSecretary ? '#0b57d0' : '#eab308' }}>{loadingSchool ? 'wird geladen...' : (schoolName || 'GrooveLab Academy')}</strong> beizutreten.
          </p>

          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!firstName.trim() || !lastName.trim()) return;
            try {
              setSigningUp(true);
              
              // Check limits if enabled for the school (only for teachers/admins, secretary might have different or no limits)
              if (schoolData?.limits_enabled && !isSecretary) {
                const { count, error: countErr } = await supabase
                  .from('users')
                  .select('*', { count: 'exact', head: true })
                  .eq('school_id', inviteSchoolId)
                  .in('role', ['teacher', 'admin']);
                  
                if (countErr) throw countErr;
                
                const maxTeachers = schoolData.max_teachers ?? 2;
                if (count !== null && count >= maxTeachers) {
                  alert(`Registrierung fehlgeschlagen: Das Limit für Lehrer/Admins an dieser Schule (${maxTeachers}) wurde erreicht. Bitte kontaktiere deinen System-Admin.`);
                  setSigningUp(false);
                  return;
                }
              }

              const newQrToken = crypto.randomUUID();
              const newUserId = crypto.randomUUID();
              
              let finalRole = inviteRole;
              if (isSecretary) {
                // If it is the first secretary/admin registering, set them as 'admin' automatically!
                const { count, error: checkErr } = await supabase
                  .from('users')
                  .select('*', { count: 'exact', head: true })
                  .eq('school_id', inviteSchoolId)
                  .in('role', ['admin', 'secretary']);
                  
                if (!checkErr && (count === null || count === 0)) {
                  finalRole = 'admin';
                } else {
                  finalRole = 'secretary';
                }
              }
              
              const { data, error } = await supabase
                .from('users')
                .insert({
                  id: newUserId,
                  school_id: inviteSchoolId,
                  role: finalRole,
                  first_name: firstName.trim(),
                  last_name: lastName.trim(),
                  qr_token: newQrToken
                })
                .select()
                .single();

              if (error) throw error;
              setRegisteredUser(data);
            } catch (err: any) {
              console.error("Error signing up user:", err);
              alert("Fehler bei der Registrierung: " + err.message);
            } finally {
              setSigningUp(false);
            }
          }} style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: isSecretary ? '#475569' : '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>Vorname *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Max"
                required
                onFocus={() => setFirstNameFocused(true)}
                onBlur={() => setFirstNameFocused(false)}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '8px',
                  background: isSecretary ? '#f8fafc' : 'rgba(255,255,255,0.05)', 
                  border: isSecretary 
                    ? `1px solid ${firstNameFocused ? '#0b57d0' : '#dadce0'}` 
                    : `1px solid ${firstNameFocused ? '#eab308' : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: firstNameFocused && isSecretary ? '0 0 0 3px rgba(11, 87, 208, 0.12)' : 'none',
                  color: isSecretary ? '#1d1d1f' : 'white', fontSize: '0.95rem', outline: 'none',
                  fontWeight: 600,
                  transition: 'all 0.15s ease'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: isSecretary ? '#475569' : '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>Nachname *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Mustermann"
                required
                onFocus={() => setLastNameFocused(true)}
                onBlur={() => setLastNameFocused(false)}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '8px',
                  background: isSecretary ? '#f8fafc' : 'rgba(255,255,255,0.05)', 
                  border: isSecretary 
                    ? `1px solid ${lastNameFocused ? '#0b57d0' : '#dadce0'}` 
                    : `1px solid ${lastNameFocused ? '#eab308' : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: lastNameFocused && isSecretary ? '0 0 0 3px rgba(11, 87, 208, 0.12)' : 'none',
                  color: isSecretary ? '#1d1d1f' : 'white', fontSize: '0.95rem', outline: 'none',
                  fontWeight: 600,
                  transition: 'all 0.15s ease'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={signingUp}
              style={{
                marginTop: '8px', padding: '14px 20px', borderRadius: '100px',
                background: isSecretary ? '#0b57d0' : 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                border: 'none', color: isSecretary ? '#ffffff' : '#0f172a', fontWeight: 800, fontSize: '0.95rem',
                cursor: 'pointer', boxShadow: isSecretary ? '0 4px 12px rgba(11, 87, 208, 0.2)' : '0 8px 20px rgba(234, 179, 8, 0.2)',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              {signingUp ? 'Registriere...' : 'Registrierung abschließen'}
            </button>
          </form>

        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return renderOnboardingScreen();
  }

  return (
    <div style={{ 
      position: 'fixed',
      inset: 0,
      backgroundColor: '#f8fafc', 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
      fontFamily: 'Inter, system-ui, sans-serif',
      zIndex: 9999,
      overflowY: 'auto'
    }}>
      
      <div className="loading-pulse" style={{
        width: '70px',
        height: '70px',
        background: '#ffffff',
        borderRadius: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e2e8f0'
      }}>
        <Music size={36} color={schoolData?.primary_color || "#eab308"} />
      </div>

      <h1 
        onClick={() => {
          setLogoClicks(prev => {
            const next = prev + 1;
            if (next >= 5) {
              setShowAdminModal(true);
              return 0;
            }
            return next;
          });
        }}
        style={{ 
          fontSize: '30px', 
          fontWeight: 1000, 
          color: '#0f172a', 
          marginBottom: '4px', 
          margin: 0, 
          letterSpacing: '-0.02em',
          cursor: 'default',
          userSelect: 'none',
          textAlign: 'center'
        }}
      >
        Campus-Login
      </h1>
      <p style={{ color: '#64748b', textAlign: 'center', fontSize: '13px', marginBottom: '32px', maxWidth: '300px', lineHeight: '1.4', fontWeight: 600 }}>
        {schoolName ? `für ${schoolName}` : `Halte deinen Ausweis vor die Kamera, um dich einzuloggen.`}
      </p>

      {/* Main Standard QR-Scanner Card */}
      {expandedSection === 'none' && (
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: '#ffffff',
        borderRadius: '40px',
        padding: '24px',
        boxShadow: '0 25px 60px rgba(15, 23, 42, 0.05)',
        border: '1px solid #f1f5f9',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', width: '100%', justifyContent: 'center' }}>
          <Tablet size={14} /> Standard Login über Campus QR-Ausweis
        </div>

        <div style={{
          width: '100%',
          aspectRatio: '1/1',
          borderRadius: '28px',
          overflow: 'hidden',
          background: '#000',
          position: 'relative',
          boxShadow: '0 0 0 4px rgba(0,0,0,0.02)'
        }}>
          <Scanner
            key={`groovelab-scanner-${facingMode}`}
            onScan={(result) => {
              const val = result?.[0]?.rawValue;
              if (val) handleScan(val);
            }}
            paused={loading}
            components={{ finder: true }}
            styles={{
              container: { width: '100%', height: '100%' },
              video: { width: '100%', height: '100%', objectFit: 'cover' }
            }}
            constraints={{ facingMode }}
          />

          {/* Switch Camera Button */}
          <button
            onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              zIndex: 15,
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'; }}
            title="Kamera wechseln"
          >
            <RotateCw size={20} />
          </button>

          {loading && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255,255,255,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ width: '40px', height: '40px', border: '4px solid #eab308', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
          )}
        </div>

        {/* iOS-Style QR Image Upload & Passwort Anmeldung side-by-side */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', width: '100%' }}>
          <div style={{ flex: 1 }}>
            <label 
              htmlFor="qr-image-upload"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px 6px',
                borderRadius: '16px',
                background: '#f8fafc',
                border: '1.5px dashed #cbd5e1',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'center',
                boxSizing: 'border-box',
                height: '46px'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
            >
              <Upload size={16} />
              Foto hochladen
            </label>
            <input 
              id="qr-image-upload"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </div>

          <button 
            onClick={() => setExpandedSection('pin')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 6px',
              borderRadius: '16px',
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'center',
              boxSizing: 'border-box',
              height: '46px',
              outline: 'none'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
          >
            <Key size={16} />
            Passwort Anmeldung
          </button>
        </div>

        {error && (
          <div style={{ marginTop: '16px', background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', padding: '14px', borderRadius: '16px', fontSize: '13px', fontWeight: 800, textAlign: 'center', width: '100%' }}>
            {error}
          </div>
        )}
      </div>
      )}

      {/* Kiosk Modus button under the card if available */}
      {expandedSection === 'none' && schoolData && kioskRooms.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <button 
            onClick={() => setExpandedSection('kiosk')}
            style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', transition: 'color 0.2s' }}
          >
            Im GrooveLab anmelden
          </button>
        </div>
      )}

      {/* Manueller PIN Zugang */}
      {expandedSection === 'pin' && (
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: '#ffffff',
        borderRadius: '32px',
        padding: '24px',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.03)',
        border: '1px solid #f1f5f9',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginTop: '20px'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <User size={14} /> Manueller Zugang über PIN / QR-Token
        </div>
        <form onSubmit={(e) => { e.preventDefault(); handlePinLogin(pinInput); }} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="Support-PIN oder QR-Token..."
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '14px',
              border: '1.5px solid #cbd5e1',
              fontSize: '14px',
              fontWeight: 700,
              outline: 'none',
              transition: 'all 0.2s',
              background: '#f8fafc',
              color: '#0f172a'
            }}
          />
          <button
            type="submit"
            disabled={loading || !pinInput.trim()}
            style={{
              padding: '12px 20px',
              borderRadius: '14px',
              border: 'none',
              background: schoolData?.primary_color || '#eab308',
              color: '#0f172a',
              fontWeight: 800,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              opacity: !pinInput.trim() ? 0.6 : 1
            }}
          >
            Login
          </button>
        </form>
        <button onClick={() => setExpandedSection('none')} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginTop: '12px', cursor: 'pointer', alignSelf: 'center' }}>
          Zurück
        </button>
      </div>
      )}

      {/* Kiosk Activator for internal school rooms */}
      {expandedSection === 'kiosk' && schoolData && kioskRooms.length > 0 && (
        <div style={{
          width: '100%',
          maxWidth: '400px',
          background: '#ffffff',
          borderRadius: '32px',
          padding: '24px',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.03)',
          border: '1px solid #f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          marginTop: '20px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Tablet size={14} /> GrooveLab Kiosk aktivieren (iPad Stationen)
          </div>
          
          {/* Room Selector */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {kioskRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setKioskSelectedRoomId(room.id)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: kioskSelectedRoomId === room.id ? (schoolData?.primary_color || '#eab308') : '#e2e8f0',
                  background: kioskSelectedRoomId === room.id ? (schoolData?.primary_color || '#eab308') : 'transparent',
                  color: '#0f172a',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
              >
                {cleanRoomName(room.name)}
              </button>
            ))}
          </div>

          {/* iPad Stations Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {kioskStations.filter(s => s.room_id === kioskSelectedRoomId).map((station) => {
              const isOccupied = activeSessionStationIds.includes(station.id);
              return (
                <button
                  key={station.id}
                  onClick={async () => {
                    if (isOccupied) {
                      const confirm = window.confirm(`Dieses iPad ist besetzt. Möchtest du die alte Sitzung beenden und dieses iPad übernehmen?`);
                      if (!confirm) return;
                      // End previous session
                      await supabase.from('sessions').update({ check_out_time: new Date().toISOString() }).eq('station_id', station.id).is('check_out_time', null);
                    }
                    sessionStorage.removeItem('groovelab_user_id');
                    localStorage.setItem('groovelab_station_id', station.id);
                    localStorage.setItem('groovelab_school_id', schoolData.id);
                    window.location.reload();
                  }}
                  style={{
                    padding: '12px',
                    borderRadius: '16px',
                    border: '1.5px solid',
                    borderColor: isOccupied ? '#fca5a5' : '#bbf7d0',
                    background: isOccupied ? '#fef2f2' : '#f0fdf4',
                    color: '#1e293b',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>{station.name}</span>
                  <span style={{ fontSize: '10px', color: isOccupied ? '#ef4444' : '#16a34a', fontWeight: 700 }}>
                    {isOccupied ? 'Besetzt (Übernehmen)' : 'Frei'}
                  </span>
                </button>
              );
            })}
          </div>
          <button onClick={() => setExpandedSection('none')} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginTop: '12px', cursor: 'pointer', alignSelf: 'center' }}>
            Zurück
          </button>
        </div>
      )}

      {/* Geofence Diagnostic Panel (Localhost only) */}
      {isLocalhost && geoDebug && (
        <div style={{ 
          marginTop: '24px', 
          padding: '24px', 
          background: 'rgba(15, 23, 42, 0.95)', 
          color: 'white', 
          borderRadius: '32px', 
          fontSize: '13px', 
          width: '100%',
          maxWidth: '400px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontWeight: 900, marginBottom: '16px', color: '#eab308', display: 'flex', justifyContent: 'space-between', letterSpacing: '0.05em' }}>
            <span>DIAGNOSE: GEOFENCING</span>
            <span style={{ color: geoDebug.isWithinAnyRoom ? '#10b981' : '#ef4444' }}>{geoDebug.isWithinAnyRoom ? 'ERFOLGREICH' : 'FEHLGESCHLAGEN'}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8 }}>
              <span>Deine Position:</span>
              <span style={{ fontWeight: 700 }}>{geoDebug.userPos ? `${geoDebug.userPos.lat.toFixed(4)}, ${geoDebug.userPos.lng.toFixed(4)}` : 'Wird gesucht...'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8 }}>
              <span>Ziel (Akademie):</span>
              <span style={{ fontWeight: 700 }}>{geoDebug.schoolCoords ? `${geoDebug.schoolCoords.lat.toFixed(4)}, ${geoDebug.schoolCoords.lng.toFixed(4)}` : 'Nicht gesetzt'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
              <span>Berechnete Distanz:</span>
              <span style={{ fontWeight: 900, color: '#eab308' }}>{geoDebug.distToSchool !== null ? `${geoDebug.distToSchool}m` : '?'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
              <span>Status Öffnungszeiten:</span>
              <span style={{ fontWeight: 900, color: geoDebug.withinHours ? '#10b981' : '#ef4444' }}>{geoDebug.withinHours ? 'GEÖFFNET' : 'GESCHLOSSEN'}</span>
            </div>
          </div>
          
          {(!geoDebug.isWithinAnyRoom || !geoDebug.withinHours) && (
            <button 
              onClick={() => {
                const uid = sessionStorage.getItem('groovelab_user_id');
                if (uid) {
                   supabase.from('users').select('*, schools(*)').eq('id', uid).single().then(({data}) => {
                     if (data) finalizeLogin(data, effectiveStationId, true);
                   });
                } else {
                  alert('Bitte erst einmal scannen, damit ich weiß, wer du bist!');
                }
              }}
              style={{ 
                width: '100%', 
                padding: '14px', 
                background: '#eab308', 
                color: '#0f172a', 
                border: 'none', 
                borderRadius: '16px', 
                fontWeight: 900, 
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
            >
              ENTWICKLER-OVERRIDE: LABOR-MODUS ERZWINGEN
            </button>
          )}
        </div>
      )}

      {/* Admin Bypass for Localhost */}
      {import.meta.env.DEV && (
        <div style={{ marginTop: '24px', width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={async () => {
              try {
                console.log('[Bypass] Attempting Admin login...');
                const { data: user, error } = await supabase
                  .from('users')
                  .select('id, role')
                  .eq('qr_token', '7b8e1a2c-4d5f-6a7b-8c9d-0e1f2a3b4c5d')
                  .maybeSingle();

                if (error) {
                  console.error('[Bypass] Supabase Error:', error);
                  alert('Datenbank-Fehler: ' + error.message);
                  return;
                }

                if (user) {
                  console.log('[Bypass] User found, logging in:', user.id);
                  onLogin(user.id, true);
                } else {
                  console.warn('[Bypass] No user found with this token.');
                  alert('Admin-Nutzer wurde in der Datenbank nicht gefunden.');
                }
              } catch (err: any) {
                console.error('[Bypass] Runtime Error:', err);
                alert('Ein Fehler ist aufgetreten: ' + err.message);
              }
            }}
            style={{
              width: '100%',
              padding: '16px',
              background: '#fef9c3',
              border: '2px solid #fde047',
              borderRadius: '24px',
              color: '#854d0e',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(234,179,8,0.15)',
              textTransform: 'uppercase',
              letterSpacing: '0.02em'
            }}
          >
            🔓 ADMIN BYPASS (LOCAL ONLY)
          </button>
          
        </div>
      )}

      <div style={{ marginTop: '24px', width: '100%', maxWidth: '360px', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 10px' }}>
        {effectiveStationId ? (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Tablet size={14} />
              Kiosk Modus aktiv
            </div>
            <button 
              onClick={() => {
                localStorage.removeItem('groovelab_station_id');
                const savedKioskRoomId = localStorage.getItem('groovelab_kiosk_room_id');
                if (savedKioskRoomId) {
                  // Navigate to setup mode → shows DeviceSetupScreen
                  window.location.href = `${window.location.origin}${window.location.pathname}?kiosk_room_id=${savedKioskRoomId}&kiosk_setup=1`;
                } else {
                  window.location.reload();
                }
              }}
              style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer' }}
            >
              Beenden
            </button>
          </div>
        ) : (
          <button 
            onClick={() => {
              localStorage.removeItem('groovelab_station_id');
              window.location.search = '?kiosk_room_id=setup';
            }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              background: '#ffffff', 
              border: '1px solid #e2e8f0', 
              padding: '12px 24px', 
              borderRadius: '20px', 
              color: '#64748b', 
              fontSize: '12px', 
              fontWeight: 800, 
              textTransform: 'uppercase', 
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
              transition: 'all 0.2s'
            }}
          >
            <Tablet size={16} />
            Kiosk Modus aktivieren
          </button>
        )}
      </div>

      {/* Impressum & Datenschutz Footer */}

      {/* Legal Footer */}
      <div style={{ 
        marginTop: '32px', 
        display: 'flex', 
        gap: '24px', 
        fontSize: '11px', 
        fontWeight: 800, 
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        <span 
          onClick={() => setShowPrivacy(true)} 
          style={{ cursor: 'pointer', transition: 'color 0.2s' }} 
           
          
        >
          Datenschutz
        </span>
        <span style={{ opacity: 0.5 }}>•</span>
        <span 
          onClick={() => setShowImpressum(true)} 
          style={{ cursor: 'pointer', transition: 'color 0.2s' }} 
           
          
        >
          Impressum
        </span>
      </div>

      {/* Privacy Policy Modal */}
      {showPrivacy && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.40)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '32px',
            boxShadow: '0 30px 80px rgba(15, 23, 42, 0.18)',
            border: '1px solid #f1f5f9',
            padding: '36px',
            maxWidth: '560px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <button 
              onClick={() => setShowPrivacy(false)} 
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                background: '#f1f5f9',
                border: 'none',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                transition: 'all 0.2s'
              }}
              
              
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#fef9c3', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: '#eab308' }}>
                <ShieldCheck size={28} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>Datenschutzerklärung</h2>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GrooveLab DSGVO Compliance</p>
              </div>
            </div>

            <div style={{ 
              fontSize: '13px', 
              color: '#475569', 
              lineHeight: '1.6', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px',
              textAlign: 'left'
            }}>
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>1. Allgemeine Hinweise und Pflichtinformationen</h4>
                <p style={{ margin: 0 }}>Der Schutz Ihrer persönlichen Daten ist uns ein wichtiges Anliegen. GrooveLab speichert Daten zur Bereitstellung der Übungs- und Klassenzimmerplattform nach den Vorgaben der DSGVO. Zur Einhaltung der Datenminimierung werden Nachnamen von Schülern standardmäßig anonymisiert (nur die Initiale wird gespeichert, z.B. Max M.).</p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>2. Kamera & QR-Scanner</h4>
                <p style={{ margin: 0 }}>Die Kamera deines Endgeräts wird ausschließlich lokal im Browser verwendet, um deinen GrooveLab-QR-Ausweis zu scannen. Es werden zu keinem Zeitpunkt Videostreams oder Bilder an Server übertragen oder dort gespeichert.</p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>3. Standortermittlung (Geofencing)</h4>
                <p style={{ margin: 0 }}>GrooveLab prüft beim Einloggen kurz deinen Gerätestandort (GPS), um sicherzustellen, dass du dich im GrooveLab-Raum der Musikschule befindest. Diese Standortdaten werden rein lokal in deinem Browser berechnet und nicht an Server übertragen. In der Datenbank wird lediglich ein Bestätigungswert (Erfolgreich/Fehlgeschlagen) für deine aktive Session hinterlegt. Ein kontinuierliches Bewegungsprofil wird nicht erstellt.</p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>4. Rechte der Betroffenen</h4>
                <p style={{ margin: 0 }}>Sie haben das Recht auf Auskunft, Berichtigung, Sperrung oder Löschung Ihrer Daten. Wenden Sie sich hierzu bitte an die Schulleitung Ihrer Musikakademie.</p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>5. Hosting & Datenbank-Infrastruktur</h4>
                <p style={{ margin: 0 }}>Unsere Anwendung wird auf Servern in Deutschland gehostet, um einen sicheren, performanten und datenschutzkonformen Betrieb zu gewährleisten. Sowohl das Web-Frontend als auch die Datenbankinfrastruktur werden über die <strong>Hetzner Online GmbH</strong> (Hetzner.com) betrieben. Mit diesem Dienstleister wurde ein gesetzeskonformer Vertrag zur Auftragsverarbeitung (AV-Vertrag nach Art. 28 DSGVO) geschlossen, um den Schutz Ihrer Daten zu jeder Zeit im Einklang mit der DSGVO zu gewährleisten.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Impressum Modal */}
      {showImpressum && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.40)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '32px',
            boxShadow: '0 30px 80px rgba(15, 23, 42, 0.18)',
            border: '1px solid #f1f5f9',
            padding: '36px',
            maxWidth: '560px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <button 
              onClick={() => setShowImpressum(false)} 
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                background: '#f1f5f9',
                border: 'none',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                transition: 'all 0.2s'
              }}
              
              
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#fef9c3', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: '#eab308' }}>
                <FileText size={28} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>Impressum</h2>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gesetzliche Anbieterkennzeichnung</p>
              </div>
            </div>

            <div style={{ 
              fontSize: '13px', 
              color: '#475569', 
              lineHeight: '1.6', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px',
              textAlign: 'left'
            }}>
              {schoolData?.opening_hours?.impressum ? (
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {schoolData.opening_hours.impressum}
                </div>
              ) : (
                <>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>Angaben gemäß § 5 TMG</h4>
                    <p style={{ margin: 0 }}>
                      Manuel Wagner<br/>
                      Friedrichstr. 33<br/>
                      79713 Bad Säckingen
                    </p>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>Kontakt</h4>
                    <p style={{ margin: 0 }}>
                      Mo-Fr: 08-15 Uhr<br/>
                      Telefon: 07761 – 2416<br/>
                      E-Mail: info@musaek.de
                    </p>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>EU-Streitschlichtung</h4>
                    <p style={{ margin: 0 }}>
                      Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" style={{ color: '#eab308', textDecoration: 'underline' }}>https://ec.europa.eu/consumers/odr/</a>.<br/>
                      Unsere E-Mail-Adresse finden Sie oben im Impressum.
                    </p>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>Verbraucherstreitbeilegung / Universalschlichtungsstelle</h4>
                    <p style={{ margin: 0 }}>
                      Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden Master Admin Credentials Login Modal */}
      {showAdminModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.40)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '32px',
            boxShadow: '0 30px 80px rgba(15, 23, 42, 0.18)',
            border: '1px solid #f1f5f9',
            padding: '36px',
            maxWidth: '440px',
            width: '100%',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            boxSizing: 'border-box'
          }}>
            <button 
              onClick={() => {
                setShowAdminModal(false);
                setAdminUsernameInput('');
                setAdminPasswordInput('');
              }} 
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                background: '#f1f5f9',
                border: 'none',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                transition: 'all 0.2s'
              }}
              
              
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eab308' }}>
                <ShieldCheck size={28} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>Master-Admin Login</h2>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GrooveLab Master Administration</p>
              </div>
            </div>

            <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Benutzername
                </label>
                <input
                  type="text"
                  value={adminUsernameInput}
                  onChange={(e) => setAdminUsernameInput(e.target.value)}
                  placeholder="z.B. admin"
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    color: '#1e293b',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#eab308';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Passwort
                </label>
                <input
                  type="password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    color: '#1e293b',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#eab308';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                />
              </div>

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', padding: '12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={adminLoginLoading}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '10px'
                }}
                
                
              >
                {adminLoginLoading ? 'Verifiziere...' : 'Einloggen'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Teacher Check-in Choice Modal */}
      {showTeacherChoiceModal && pendingTeacherUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.40)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px',
          fontFamily: '"Outfit", "Inter", sans-serif',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '32px',
            boxShadow: '0 30px 80px rgba(15, 23, 42, 0.18)',
            border: '1px solid #f1f5f9',
            padding: '36px',
            maxWidth: '460px',
            width: '100%',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            boxSizing: 'border-box',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16a34a'
              }}>
                <span style={{ fontSize: '28px' }}>👋</span>
              </div>
              <div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                  Hallo {pendingTeacherUser.user.first_name}!
                </h3>
                <p style={{ margin: 0, fontSize: '0.95rem', color: '#64748b', lineHeight: '1.5' }}>
                  Möchtest du dich im GrooveLab anmelden?
                </p>
              </div>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '16px 20px',
              fontSize: '0.85rem',
              color: '#475569',
              textAlign: 'left',
              lineHeight: '1.5',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div>
                🟢 <strong>Ja, anmelden:</strong> Du wirst im GrooveLab (Live Lab) eingecheckt und bist für alle sichtbar.
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                ⚪ <strong>Nein, nur Ansicht:</strong> Du siehst alle Funktionen des Lehrerdashboards, wirst aber selbst im Live Lab nicht angezeigt.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
              <button
                onClick={() => confirmTeacherLogin(false)}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '1rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px rgba(22, 163, 74, 0.25)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                
                
              >
                Ja, im Live Lab anmelden
              </button>

              <button
                onClick={() => confirmTeacherLogin(true)}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '16px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                
                
              >
                Nein, nur Ansicht (ohne Einchecken)
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}

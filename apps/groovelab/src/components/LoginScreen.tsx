import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Music, Tablet, ShieldCheck, FileText, X, Check, School, AlertCircle, ArrowRight, Download, User, Upload, Key, KeyRound, RotateCw, HelpCircle, Lock } from 'lucide-react';
import { getDistanceFromLatLonInM } from '../utils/geo';
import jsQR from 'jsqr';

interface LoginScreenProps {
  onLogin: (userId: string, isHome?: boolean) => void;
  kioskStationId?: string | null;
}

interface CustomQRScannerProps {
  onScan: (value: string) => void;
  onError: (error: any) => void;
  paused?: boolean;
  facingMode: 'user' | 'environment';
}

function CustomQRScanner({ onScan, onError, paused, facingMode }: CustomQRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let active = true;

    async function startCamera() {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: 480 },
            height: { ideal: 480 }
          },
          audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play().catch(err => {
            console.warn('[Scanner] Play failed:', err);
          });
        }
      } catch (err: any) {
        console.error('[Scanner] getUserMedia error:', err);
        onError(err);
      }
    }

    if (!paused) {
      startCamera();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [facingMode, paused]);

  useEffect(() => {
    if (paused) {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      return;
    }

    canvasRef.current = document.createElement('canvas');
    let lastScanTime = 0;

    const scanFrame = (timestamp: number) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        // Only run jsQR every 150ms to save CPU and battery power
        if (timestamp - lastScanTime > 150) {
          lastScanTime = timestamp;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Downscale to 320x320 to reduce parsed pixels by 75%+
            canvas.width = 320;
            canvas.height = 320;
            ctx.drawImage(video, 0, 0, 320, 320);
            const imageData = ctx.getImageData(0, 0, 320, 320);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert'
            });
            if (code && code.data) {
              onScan(code.data);
            }
          }
        }
      }
      requestRef.current = requestAnimationFrame(scanFrame);
    };

    requestRef.current = requestAnimationFrame(scanFrame);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [paused, onScan]);

  return (
    <video
      ref={videoRef}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      playsInline
      muted
    />
  );
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

// Simple layout adjustment to prevent overlapping of iPad stations
const adjustPositions = (stations: any[], containerWidth: number = 364) => {
  // Clone stations with pos_x and pos_y, and save original coordinates to detect alignment
  const items = stations.map(s => ({
    ...s,
    x: s.pos_x !== null && s.pos_x !== undefined ? s.pos_x : 50,
    y: s.pos_y !== null && s.pos_y !== undefined ? s.pos_y : 50,
    origX: s.pos_x !== null && s.pos_x !== undefined ? s.pos_x : 50,
    origY: s.pos_y !== null && s.pos_y !== undefined ? s.pos_y : 50
  }));

  const containerHeight = containerWidth / 1.4;
  
  // Safe margin is button radius (72px * 1.08 / 2 = 38.88px) + box shadow glow (4px) + margin rule (2px) = 44.88px.
  // We round this up to 45px to guarantee at least 2px of empty space to the container borders.
  const safeMarginPx = 45;
  const safeMinX = Math.min(45, (safeMarginPx / containerWidth) * 100);
  const safeMaxX = Math.max(55, 100 - safeMinX);
  const safeMinY = Math.min(45, (safeMarginPx / containerHeight) * 100);
  const safeMaxY = Math.max(55, 100 - safeMinY);
  
  // Minimum gap of 4px: Button width/height is 72px, so minimum center-to-center is 72px + 4px = 76px.
  const minXDistPx = 76;
  const minYDistPx = 76;

  const iterations = 50;
  const minXDist = (minXDistPx / containerWidth) * 100; // minimum X distance in percentage
  const minYDist = (minYDistPx / containerHeight) * 100; // minimum Y distance in percentage

  for (let iter = 0; iter < iterations; iter++) {
    let moved = false;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const dx = items[i].x - items[j].x;
        const dy = items[i].y - items[j].y;
        
        // Check if they overlap (distance in X < minXDist AND Y < minYDist)
        if (Math.abs(dx) < minXDist && Math.abs(dy) < minYDist) {
          moved = true;
          
          // Detect alignment intent from database coordinates (threshold of 6% variation)
          const isVerticallyAligned = Math.abs(items[i].origX - items[j].origX) < 6;
          const isHorizontallyAligned = Math.abs(items[i].origY - items[j].origY) < 6;
          
          if (isVerticallyAligned && !isHorizontallyAligned) {
            // They are aligned vertically: only push them apart vertically, preserving X alignment
            const overlapY = minYDist - Math.abs(dy);
            const forceY = dy === 0 ? (i % 2 === 0 ? 1 : -1) : Math.sign(dy);
            const pushY = forceY * (overlapY / 2);
            
            items[i].y += pushY;
            items[j].y -= pushY;
            
            // Keep X aligned to their original intended column position
            items[i].x = items[i].origX;
            items[j].x = items[j].origX;
          } else if (isHorizontallyAligned && !isVerticallyAligned) {
            // They are aligned horizontally: only push them apart horizontally, preserving Y alignment
            const overlapX = minXDist - Math.abs(dx);
            const forceX = dx === 0 ? (i % 2 === 0 ? 1 : -1) : Math.sign(dx);
            const pushX = forceX * (overlapX / 2);
            
            items[i].x += pushX;
            items[j].x -= pushX;
            
            // Keep Y aligned to their original intended row position
            items[i].y = items[i].origY;
            items[j].y = items[j].origY;
          } else {
            // No strict alignment or both (e.g. direct overlap at same spot): push on both axes
            const overlapX = minXDist - Math.abs(dx);
            const overlapY = minYDist - Math.abs(dy);
            
            const forceX = dx === 0 ? (Math.random() - 0.5 || 0.1) : Math.sign(dx);
            const forceY = dy === 0 ? (Math.random() - 0.5 || 0.1) : Math.sign(dy);
            
            const pushX = forceX * (overlapX / 2);
            const pushY = forceY * (overlapY / 2);
            
            items[i].x += pushX;
            items[j].x -= pushX;
            items[i].y += pushY;
            items[j].y -= pushY;
          }
          
          // Clamp individual positions to keep them inside the safe area during force adjustment
          items[i].x = Math.max(safeMinX, Math.min(safeMaxX, items[i].x));
          items[j].x = Math.max(safeMinX, Math.min(safeMaxX, items[j].x));
          items[i].y = Math.max(safeMinY, Math.min(safeMaxY, items[i].y));
          items[j].y = Math.max(safeMinY, Math.min(safeMaxY, items[j].y));
        }
      }
    }
    if (!moved) break;
  }

  // Ensure ALL items strictly adhere to the minimum edge distance, even if they had no collisions
  items.forEach(item => {
    item.x = Math.max(safeMinX, Math.min(safeMaxX, item.x));
    item.y = Math.max(safeMinY, Math.min(safeMaxY, item.y));
  });

  return items;
};

const cleanRoomName = (name: string | null | undefined): string => {
  if (!name) return 'Unbenannter Raum';
  return name.replace(/^#\d+\s*[-:]*\s*/, '').trim();
};

const getStationColor = (name: string | null | undefined, dbColor?: string | null) => {
  if (!name) return '#64748b';
  
  const isStandardIpad = /^ipad\s*\d+/i.test(name);
  if (dbColor && dbColor !== '#e5e7eb' && dbColor !== '#e2e8f0' && dbColor !== '#cbd5e1') {
    if (isStandardIpad && dbColor === '#64748b') {
      // Fall through to number-based standard color
    } else {
      return dbColor;
    }
  }

  const lowerName = name.toLowerCase();
  if (lowerName.includes('lehrer') || lowerName.includes('teacher')) return '#22c55e'; // Green
  const matches = name.match(/\d+/g);
  if (!matches) return '#64748b';
  const num = parseInt(matches[matches.length - 1]);
  if (num === 1 || num === 2) return '#ef4444'; // Red
  if (num === 3 || num === 4) return '#a855f7'; // Purple
  if (num === 5 || num === 6) return '#3b82f6'; // Blue
  if (num === 7 || num === 8) return '#eab308'; // Yellow
  return '#64748b';
};

export function LoginScreen({ onLogin, kioskStationId }: LoginScreenProps) {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [loading, setLoading] = useState(false);
  const [pinSetupUser, setPinSetupUser] = useState<any>(null);
  const [pinVerificationUser, setPinVerificationUser] = useState<any>(null);
  const [pinSetupInput, setPinSetupInput] = useState('');
  const [pinVerificationInput, setPinVerificationInput] = useState('');
  const [pinVerificationIsWithinRoom, setPinVerificationIsWithinRoom] = useState(false);

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
  const kioskMapRef = useRef<HTMLDivElement>(null);
  const [kioskMapWidth, setKioskMapWidth] = useState<number>(364);
  const [kioskSelectedRoomId, setKioskSelectedRoomId] = useState<string>('');
  const [activeSessionStationIds, setActiveSessionStationIds] = useState<string[]>([]);
  const [loadingKioskData, setLoadingKioskData] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(true);

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
  const [isGroovelabKiosk, setIsGroovelabKiosk] = useState(() => !!kioskStationId);
  const [selectedKioskStationId, setSelectedKioskStationId] = useState<string | null>(null);

  useEffect(() => {
    if (!kioskMapRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.contentRect.width) {
          setKioskMapWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(kioskMapRef.current);
    return () => observer.disconnect();
  }, [kioskMapRef.current, isGroovelabKiosk]);


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
                  <input type="text" required value={onboardRepresentedBy} onChange={e => setOnboardRepresentedBy(e.target.value)} placeholder="z.B. Dr. Max Mustermann" style={inputStyle} />
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
  const [logoTheme, setLogoTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (!schoolData?.logo_url) return;
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setLogoTheme('light');
          return;
        }
        
        canvas.width = 30;
        canvas.height = 30;
        ctx.drawImage(img, 0, 0, 30, 30);
        
        const imgData = ctx.getImageData(0, 0, 30, 30);
        const data = imgData.data;
        
        let darkPixels = 0;
        let lightPixels = 0;
        let totalCount = 0;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          if (a > 50) { // Opaque enough
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
            if (brightness < 140) { // Dark pixel threshold
              darkPixels++;
            } else {
              lightPixels++;
            }
            totalCount++;
          }
        }
        
        if (totalCount > 0) {
          // If more dark pixels than light pixels, it's a dark logo -> needs light background
          if (darkPixels > lightPixels) {
            setLogoTheme('light');
          } else {
            setLogoTheme('dark');
          }
        } else {
          setLogoTheme('light');
        }
      } catch (err) {
        console.warn("[Logo Analysis] CORS or canvas read error, defaulting to light background:", err);
        setLogoTheme('light');
      }
    };
    img.onerror = () => {
      setLogoTheme('light');
    };
    img.src = schoolData.logo_url;
  }, [schoolData?.logo_url]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [registeredUser, setRegisteredUser] = useState<any>(null);
  const [loadingSchool, setLoadingSchool] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  const [userPos, setUserPos] = useState<{lat: number, lng: number} | null>(null);
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);
  


  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const qrToken = urlParams.get('qr_token') || urlParams.get('teacher_qr_token');
    if (qrToken && !loading) {
      console.log('[Login] Auto-logging in via URL qr_token/teacher_qr_token:', qrToken);
      handlePinLogin(qrToken);
    }
  }, [schoolData]);

  let effectiveStationId = kioskStationId || localStorage.getItem('groovelab_station_id');
  if (effectiveStationId === 'skip') effectiveStationId = null;
  const loginStationId = isGroovelabKiosk ? (selectedKioskStationId || effectiveStationId) : null;

  useEffect(() => {
    async function loadSchoolInfo() {
      try {
        setLoadingSchool(true);

        // Subdomain resolution logic
        const getSubdomain = () => {
          let host = window.location.hostname;
          let sub = null;
          
          // If the hostname ends with the platform's main domain, strip it to isolate the subdomain
          const mainDomains = ['.campus-groovelab.de', '.groovelab.de', '.campus-groovelab.com'];
          for (const domain of mainDomains) {
            if (host.endsWith(domain)) {
              sub = host.substring(0, host.length - domain.length);
              break;
            }
          }
          
          if (!sub) {
            const parts = host.split('.');
            if (parts.length >= 3) {
              const first = parts[0];
              if (first !== 'www' && first !== 'admin' && first !== 'campus-groovelab') {
                sub = first;
              }
            } else if (parts.length === 2 && parts[1] === 'localhost') {
              sub = parts[0];
            }
          }
          
          if (!sub) {
            // Check query parameters as fallback (useful for local localhost dev bypass)
            const urlParams = new URLSearchParams(window.location.search);
            sub = urlParams.get('school') || urlParams.get('subdomain');
          }
          
          if (sub) {
            const cleanSub = sub.toLowerCase().trim();
            // Map variants of musaek / muasek subdomain to the correct 'musaek-bad-saeckingen' slug
            const musaekVariants = [
              'musaek', 
              'muasek', 
              'muasek-bad-saeckingen', 
              'musaek-bad-saeckingen'
            ];
            if (musaekVariants.includes(cleanSub)) {
              return 'musaek-bad-saeckingen';
            }
            return cleanSub;
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
      let finalStationId = null;
      let isHome = false;

      const userSchool = Array.isArray(user.schools) ? user.schools[0] : user.schools;
      const isMaster = user.is_master_admin === true;



      const isAdminOrSecretary = user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'secretary';
      const isTeacher = user.role?.toLowerCase() === 'teacher' || isAdminOrSecretary;
      
      if (!isMaster) {
        if (!isAdminOrSecretary) {
          // Enforce activation check (must have at least one active module)
          if (!user.is_campus_active && !user.is_groovelab_active) {
            alert("Dein Zugang ist nicht aktiv. Bitte wende dich an deine Musikschule.");
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }

          // Enforce strict separation: Campus-Login strictly loads Campus, GrooveLab-Login strictly loads GrooveLab
          if (isGroovelabKiosk) {
            if (!user.is_groovelab_active) {
              alert("Login verweigert. Dein Benutzerkonto ist nicht für die GrooveLab-Plattform freigeschaltet.");
              await supabase.auth.signOut();
              setLoading(false);
              return;
            }
            localStorage.setItem('groovelab_active_platform', 'groovelab');
          } else {
            if (!user.is_campus_active) {
              alert("Login verweigert. Dein Benutzerkonto ist nicht für den Campus freigeschaltet.");
              await supabase.auth.signOut();
              setLoading(false);
              return;
            }
            localStorage.setItem('groovelab_active_platform', 'campus');
          }
        } else {
          // Admins and secretaries bypass activation flags but still set the target platform they logged in from
          if (isGroovelabKiosk) {
            localStorage.setItem('groovelab_active_platform', 'groovelab');
          } else {
            localStorage.setItem('groovelab_active_platform', 'campus');
          }
        }

        // Enforce school matching check for students using component-level schoolData state or userSchool fallback
        if (user.role === 'student') {
          const effectiveSchool = schoolData || userSchool;
          if (!effectiveSchool?.id) {
            alert("Login verweigert. Für den Schüler-Login wird ein zugehöriger Schul-Link benötigt.");
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
          if (user.school_id !== effectiveSchool.id) {
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

      // Save station ID to localStorage based on geofence & check-in result
      const activePlatform = localStorage.getItem('groovelab_active_platform') || 'groovelab';
      if (activePlatform === 'groovelab') {
        if (isHome) {
          localStorage.removeItem('groovelab_station_id');
        } else {
          if (finalStationId) {
            localStorage.setItem('groovelab_station_id', finalStationId);
          } else {
            localStorage.setItem('groovelab_station_id', 'skip');
          }
        }
      }

      // 2. Session Management (Only for Academy/Lab sessions)
      // 2. Global Cleanup & Station Cleanup in parallel
      await Promise.all([
        supabase.from('sessions').update({ check_out_time: now }).eq('user_id', user.id).is('check_out_time', null),
        (!isHome && finalStationId && !isTeacher)
          ? supabase.from('sessions').update({ check_out_time: now }).eq('station_id', finalStationId).is('check_out_time', null)
          : Promise.resolve()
      ]);
      if (!isHome) {
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

      sessionStorage.setItem('groovelab_user_id', user.id);
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
          const activePlatform = localStorage.getItem('groovelab_active_platform') || 'groovelab';
          let roomsQuery = supabase.from('rooms').select('*').eq('school_id', schoolId);
          if (activePlatform === 'campus') {
            roomsQuery = roomsQuery.eq('is_campus_active', true);
          } else {
            roomsQuery = roomsQuery.eq('is_groovelab_active', true);
          }
          const { data: rooms } = await roomsQuery.order('sort_order', { ascending: true });
          setPrefetchedRooms(rooms);
          console.log(`[Login] Pre-fetched ${rooms?.length} rooms for school: ${schoolId}`);
        }
      } catch (e) {
        console.warn('[Login] Pre-fetch failed', e);
      }
    }
    prefetch();
  }, [effectiveStationId]);

  // Fetch rooms and stations for the Kiosk activator when schoolData is resolved (or query all active if not set yet)
  useEffect(() => {
    async function fetchKioskData() {
      try {
        setLoadingKioskData(true);
        // The Kiosk Activator is always for GrooveLab Kiosks, so we fetch groovelab-active rooms
        let roomsQuery = supabase.from('rooms').select('*').eq('is_groovelab_active', true);
        if (schoolData?.id) {
          roomsQuery = roomsQuery.eq('school_id', schoolData.id);
        }
        const [roomsRes, stationsRes, sessionsRes] = await Promise.all([
          roomsQuery.order('sort_order', { ascending: true }),
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


  const handleKeypadPress = (val: string, type: 'setup' | 'verify') => {
    if (type === 'setup') {
      if (val === 'back') {
        setPinSetupInput(prev => prev.slice(0, -1));
      } else if (pinSetupInput.length < 4) {
        setPinSetupInput(prev => prev + val);
      }
    } else {
      if (val === 'back') {
        setPinVerificationInput(prev => prev.slice(0, -1));
      } else if (pinVerificationInput.length < 4) {
        setPinVerificationInput(prev => prev + val);
      }
    }
  };

  const renderKeypad = (type: 'setup' | 'verify') => {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        width: '100%',
        maxWidth: '280px',
        margin: '20px auto 0 auto'
      }}>
        {keys.map((k) => {
          return (
            <button
              key={k}
              type="button"
              onClick={() => {
                if (k === 'C') {
                  if (type === 'setup') setPinSetupInput('');
                  else setPinVerificationInput('');
                } else if (k === '⌫') {
                  handleKeypadPress('back', type);
                } else {
                  handleKeypadPress(k, type);
                }
              }}
              style={{
                height: '56px',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#0f172a',
                fontSize: '1.25rem',
                fontWeight: 800,
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

  const handlePinLogin = async (pin: string) => {
    if (!pin.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      console.log('[Login] Attempting manual PIN login for:', pin);
      const cleanPin = pin.trim();
      sessionStorage.setItem('groovelab_qr_token', cleanPin);

      let query = supabase
        .from('users')
        .select('*, schools(*)');
      
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanPin);
      const isTokenLogin = cleanPin.startsWith('t_') || isUuid;

      if (isTokenLogin) {
        if (isUuid) {
          query = query.eq('qr_token', cleanPin);
        } else {
          query = query.eq('teacher_qr_token', cleanPin);
        }
      } else {
        query = query.eq('ausweis_nummer', cleanPin.toUpperCase());
      }

      const { data: user, error: userErr } = await query.maybeSingle();
      sessionStorage.removeItem('groovelab_qr_token');

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

      // Automatically resolve schoolData from the database if not present in the URL parameter
      if (!schoolData && userSchool) {
        setSchoolData(userSchool);
        setSchoolName(userSchool.name);
      }

      if (user.role === 'student') {
        const effectiveSchool = schoolData || userSchool;
        if (!effectiveSchool?.id) {
          throw new Error('Für den Schüler-Login wird ein zugehöriger Schul-Link benötigt.');
        }
        if (user.school_id !== effectiveSchool.id) {
          throw new Error('Login verweigert. Dieser Login-Link gehört nicht zu deiner Schule.');
        }
      }

      const isTeacher = user.role?.toLowerCase() === 'teacher' || user.role?.toLowerCase() === 'admin';
      let isWithinAnyRoom = true;
      const isGroovelabScreen = isGroovelabKiosk;
      const isBypass = !isGroovelabScreen;

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
          const activePlatform = localStorage.getItem('groovelab_active_platform') || 'groovelab';
          let roomsQuery = supabase.from('rooms').select('*').eq('school_id', user.school_id);
          if (activePlatform === 'campus') {
            roomsQuery = roomsQuery.eq('is_campus_active', true);
          } else {
            roomsQuery = roomsQuery.eq('is_groovelab_active', true);
          }
          const { data: rooms } = await roomsQuery.order('sort_order', { ascending: true });
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
      // Intercept login for PIN setup or verification if it's an Ausweis ID login
      const isQrLogin = cleanPin.startsWith('t_') || (cleanPin.includes('-') && cleanPin.length > 20);
      if (!isQrLogin) {
        if (!user.is_pin_activated) {
          setPinSetupUser(user);
          setPinVerificationIsWithinRoom(isWithinAnyRoom);
          setPinSetupInput('');
          setLoading(false);
          return;
        } else {
          setPinVerificationUser(user);
          setPinVerificationIsWithinRoom(isWithinAnyRoom);
          setPinVerificationInput('');
          setLoading(false);
          return;
        }
      }


      if (isTeacher) {
        if (user.is_observer) {
          await finalizeLogin(user, loginStationId, false, true);
          return;
        }

        const isGroovelabScreen = isGroovelabKiosk;
        if (isGroovelabScreen) {
          await finalizeLogin(user, loginStationId, isWithinAnyRoom, false);
        } else {
          // Campus Login strictly bypasses GrooveLab presence check-in
          await finalizeLogin(user, loginStationId, false, true);
        }
        return;
      }

      if (isBypass) {
        await finalizeLogin(user, loginStationId, false);
      } else {
        await finalizeLogin(user, loginStationId, isWithinAnyRoom);
      }
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

    let qrToken = scannedValue.trim();
    try {
      if (scannedValue.includes('?') || scannedValue.startsWith('http://') || scannedValue.startsWith('https://')) {
        // Handle case where it might be a query string or a full URL
        const urlString = scannedValue.includes('?') ? scannedValue : `http://dummy.com/?${scannedValue}`;
        const urlObj = new URL(urlString);
        const parsedToken = urlObj.searchParams.get('qr_token') || 
                            urlObj.searchParams.get('teacher_qr_token') || 
                            urlObj.searchParams.get('token') || 
                            urlObj.searchParams.get('campus_pass');
        if (parsedToken) {
          qrToken = parsedToken.trim();
        }
      }
    } catch (e) {
      console.warn("Failed to parse scanned URL", e);
    }
    console.log('[Login] handleScan scannedValue:', scannedValue, '-> parsed qrToken:', qrToken);

    // Camera stream will be naturally released on page reload, avoiding browser locks.

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

      // Automatically resolve schoolData from the database if not present in the URL parameter
      if (!schoolData && userSchool) {
        setSchoolData(userSchool);
        setSchoolName(userSchool.name);
      }

      if (user.role === 'student') {
        const effectiveSchool = schoolData || userSchool;
        if (!effectiveSchool?.id) {
          throw new Error('Für den Schüler-Login wird ein zugehöriger Schul-Link benötigt.');
        }
        if (user.school_id !== effectiveSchool.id) {
          throw new Error('Login verweigert. Dieser Login-Link gehört nicht zu deiner Schule.');
        }
      }

      // 2. Geofence Check (Simpel & Stabil)
      const isTeacher = user.role?.toLowerCase() === 'teacher' || user.role?.toLowerCase() === 'admin';
      let isWithinAnyRoom = true;
      const isGroovelabScreen = isGroovelabKiosk;
      const isBypass = !isGroovelabScreen;

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
          const activePlatform = localStorage.getItem('groovelab_active_platform') || 'groovelab';
          let roomsQuery = supabase.from('rooms').select('*').eq('school_id', user.school_id);
          if (activePlatform === 'campus') {
            roomsQuery = roomsQuery.eq('is_campus_active', true);
          } else {
            roomsQuery = roomsQuery.eq('is_groovelab_active', true);
          }
          const { data: rooms } = await roomsQuery.order('sort_order', { ascending: true });
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
        console.log('[Login] Geofence check bypassed.');
        setGeoDebug(null);
      }

      console.log(`[Login] Scan successful. Geofence match: ${isWithinAnyRoom}`);
      
      // If the user's PIN is not activated yet, they MUST set their personal PIN first to secure the manual login path
      if (!user.is_pin_activated) {
        setPinSetupUser(user);
        setPinVerificationIsWithinRoom(isWithinAnyRoom);
        setPinSetupInput('');
        setLoading(false);
        return;
      }


      if (isTeacher) {
        if (user.is_observer) {
          // Hospitanten are always sent to home mode without prompt
          await finalizeLogin(user, loginStationId, false, true);
          return;
        }

        const isGroovelabScreen = isGroovelabKiosk;
        if (isGroovelabScreen) {
          await finalizeLogin(user, loginStationId, isWithinAnyRoom, false);
        } else {
          // Campus Login strictly bypasses GrooveLab presence check-in
          await finalizeLogin(user, loginStationId, false, true);
        }
        return;
      }

      if (isBypass) {
        await finalizeLogin(user, loginStationId, false);
      } else {
        await finalizeLogin(user, loginStationId, isWithinAnyRoom);
      }
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
    await finalizeLogin(user, loginStationId, isWithinAnyRoom, hidePresence);
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
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: isGroovelabKiosk ? 'flex-start' : 'center',
      fontFamily: '"Outfit", "Inter", -apple-system, sans-serif',
      background: isGroovelabKiosk ? '#ca8a04' : '#0a361c', // Chalkboard yellow/green
      backgroundImage: isGroovelabKiosk 
        ? 'radial-gradient(circle at 50% 50%, #fef08a 0%, #ca8a04 100%)' 
        : 'radial-gradient(circle at 50% 50%, #11572e 0%, #062413 100%)',
      color: isGroovelabKiosk ? '#062413' : 'white',
      zIndex: 9999,
      overflowY: 'auto',
      padding: '48px 16px 24px 16px',
      boxSizing: 'border-box',
      transition: 'background 0.5s ease, color 0.5s ease'
    }}>
      {/* Subtle Chalk board dust overlays */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.025,
        pointerEvents: 'none',
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")'
      }} />
      {/* Left Presentation Panel: School green chalkboard artwork with Apple-style product presentation */}
      {false && !isMobile && (
        <div style={{
          flex: 1.2,
          background: '#0a361c', // Chalkboard dark green
          backgroundImage: 'radial-gradient(circle at 50% 50%, #11572e 0%, #062413 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'inset -20px 0 40px rgba(0,0,0,0.15)',
          borderRight: '1px solid rgba(255,255,255,0.06)'
        }}>
          {/* Subtle Chalk board dust overlays */}
          <div style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.03,
            pointerEvents: 'none',
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")'
          }} />

          {/* Chalkboard frame/header */}
          <div style={{
            width: '100%',
            maxWidth: '460px',
            marginBottom: '32px',
            textAlign: 'center',
            zIndex: 2
          }}>
            <h2 style={{
              fontSize: '3.2rem',
              fontWeight: 900,
              color: '#ffffff',
              margin: 0,
              letterSpacing: '-0.04em',
              textShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}>
              Campus
            </h2>
            <p style={{
              fontSize: '1.25rem',
              color: '#a7f3d0',
              marginTop: '6px',
              marginBottom: '0',
              fontWeight: 600,
              textShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              Das digitale Musikzimmer.
            </p>
          </div>

          {/* Chalk board illustration frame */}
          <div style={{
            width: '100%',
            maxWidth: '460px',
            aspectRatio: '1/1',
            borderRadius: '24px',
            background: '#ffffff',
            padding: '12px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.25), inset 0 2px 4px rgba(255,255,255,0.2)',
            border: '12px solid #5d4037', // Wooden brown board frame
            boxSizing: 'border-box',
            zIndex: 2,
            transform: 'rotate(-0.5deg)',
            transition: 'transform 0.3s ease'
          }}>
            <img 
              src="/campus_login_hero.png" 
              alt="Campus Chalk Illustration"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '8px'
              }}
            />
          </div>

          {/* Friendly value statements */}
          <div style={{
            marginTop: '36px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxWidth: '420px',
            zIndex: 2
          }}>
            {[
              "🎸 Lerne deine Lieblingssongs spielerisch leicht",
              "📊 Verfolge deine Übezeiten & Ziele in Echtzeit",
              "🏆 Meistere Levels & sammle Helden-Momente"
            ].map((text, idx) => (
              <div key={idx} style={{
                fontSize: '1rem',
                fontWeight: 650,
                color: 'rgba(255,255,255,0.9)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>
                {text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Right Login Panel */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 2
      }}>
        
        {schoolData?.logo_url ? (
          <div style={{
            maxHeight: '70px',
            maxWidth: '240px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            background: logoTheme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            padding: '10px 24px',
            borderRadius: '20px',
            border: logoTheme === 'light' ? '1px solid rgba(255, 255, 255, 0.8)' : '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
          }}>
            <img 
              src={schoolData.logo_url} 
              alt="Logo" 
              style={{ 
                maxHeight: '60px',
                maxWidth: '100%',
                objectFit: 'contain'
              }} 
            />
          </div>
        ) : (
          <div className="loading-pulse" style={{
            width: '60px',
            height: '60px',
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden'
          }}>
            <Music size={28} color="#000000" />
          </div>
        )}

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
            fontSize: '32px', 
            fontWeight: 900, 
            color: isGroovelabKiosk ? '#062413' : '#ffffff', 
            marginBottom: '6px', 
            margin: 0, 
            letterSpacing: '-0.03em',
            cursor: 'default',
            userSelect: 'none',
            textAlign: 'center',
            textShadow: isGroovelabKiosk ? 'none' : '0 2px 8px rgba(0,0,0,0.2)',
            transition: 'color 0.5s ease'
          }}
        >
          {isGroovelabKiosk ? 'GrooveLab-Login' : 'Campus-Login'}
        </h1>
        <p style={{ 
          color: isGroovelabKiosk ? '#78350f' : '#a7f3d0', 
          textAlign: 'center', 
          fontSize: '14px', 
          marginBottom: '32px', 
          maxWidth: '340px', 
          lineHeight: '1.4', 
          fontWeight: 600, 
          textShadow: isGroovelabKiosk ? 'none' : '0 1px 2px rgba(0,0,0,0.1)',
          transition: 'color 0.5s ease'
        }}>
          {schoolName && !schoolData?.logo_url ? `für ${schoolName}` : `Halte deinen Ausweis vor die Kamera, um dich einzuloggen.`}
        </p>

      {/* Main Standard QR-Scanner Card */}
      {expandedSection === 'none' && (
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: isGroovelabKiosk ? 'rgba(255, 255, 255, 0.82)' : 'rgba(255, 255, 255, 0.07)',
        borderRadius: '40px',
        padding: '28px',
        boxShadow: isGroovelabKiosk 
          ? '0 40px 100px rgba(120, 53, 15, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.6)' 
          : '0 40px 100px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        border: isGroovelabKiosk 
          ? '1px solid rgba(255, 255, 255, 0.4)' 
          : '1px solid rgba(255, 255, 255, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        transition: 'background 0.3s ease, border 0.3s ease, box-shadow 0.3s ease'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: isGroovelabKiosk ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', width: '100%', justifyContent: 'center' }}>
          <Tablet size={14} style={{ color: isGroovelabKiosk ? '#78350f' : '#a7f3d0' }} />
          {isGroovelabKiosk ? 'GrooveLab QR-Code scannen' : 'Standard Login über Campus QR-Ausweis'}
        </div>

        <div style={{
          width: '100%',
          aspectRatio: '1/1',
          borderRadius: '32px',
          overflow: 'hidden',
          background: '#ffffff',
          position: 'relative',
          boxShadow: 'inset 0 3px 10px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.05), 0 16px 36px rgba(0, 0, 0, 0.07)',
          border: '1px solid #e2e8f0',
          borderBottomColor: '#cbd5e1', // Skeuomorphic top-down light border
          padding: '4.5px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            borderRadius: '26px',
            overflow: 'hidden',
            position: 'relative',
            background: '#0c0f12'
          }}>
            {/* Recessed physical aperture shadow for 3D depth */}
            <div style={{
              position: 'absolute',
              inset: 0,
              boxShadow: 'inset 0 5px 15px rgba(0, 0, 0, 0.4)',
              borderRadius: '26px',
              pointerEvents: 'none',
              zIndex: 9
            }} />
            {isCameraActive ? (
              <>
                <CustomQRScanner
                  onScan={(val) => {
                    console.log('[Scanner] Extracted QR value:', val);
                    handleScan(val);
                  }}
                  onError={(err: any) => {
                    console.error('[Scanner] Camera error:', err);
                    const errMsg = err?.message || String(err || '');
                    if (!errMsg.toLowerCase().includes('abort') && !errMsg.toLowerCase().includes('aborted')) {
                      setError(`Kamera-Fehler: ${errMsg}`);
                    }
                  }}
                  paused={loading}
                  facingMode={facingMode}
                />

                {/* Scanner UI Overlay: Animated scan laser and bounding target corners */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  zIndex: 10
                }}>
                  {/* 4 Corner brackets for scanner target */}
                  <div style={{ position: 'absolute', top: '20px', left: '20px', width: '24px', height: '24px', borderTop: '3px solid #a7f3d0', borderLeft: '3px solid #a7f3d0', borderTopLeftRadius: '8px' }} />
                  <div style={{ position: 'absolute', top: '20px', right: '20px', width: '24px', height: '24px', borderTop: '3px solid #a7f3d0', borderRight: '3px solid #a7f3d0', borderTopRightRadius: '8px' }} />
                  <div style={{ position: 'absolute', bottom: '20px', left: '20px', width: '24px', height: '24px', borderBottom: '3px solid #a7f3d0', borderLeft: '3px solid #a7f3d0', borderBottomLeftRadius: '8px' }} />
                  <div style={{ position: 'absolute', bottom: '20px', right: '20px', width: '24px', height: '24px', borderBottom: '3px solid #a7f3d0', borderRight: '3px solid #a7f3d0', borderBottomRightRadius: '8px' }} />
                  
                  {/* Animated Laser line */}
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    width: '100%',
                    height: '80px',
                    background: 'linear-gradient(180deg, rgba(167, 243, 208, 0) 0%, rgba(167, 243, 208, 0.08) 50%, rgba(167, 243, 208, 0) 100%)',
                    filter: 'blur(6px)',
                    animation: 'scanLaser 4s ease-in-out infinite',
                    pointerEvents: 'none'
                  }} />
                </div>

                <style dangerouslySetInnerHTML={{__html: `
                  @keyframes scanLaser {
                    0% { top: -20%; }
                    50% { top: 100%; }
                    100% { top: -20%; }
                  }
                `}} />

                {/* Switch Camera Button */}
                <button
                  onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    zIndex: 15,
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'; }}
                  title="Kamera wechseln"
                >
                  <RotateCw size={18} />
                </button>
              </>
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                color: 'white',
                padding: '24px',
                textAlign: 'center'
              }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a7f3d0' }}>
                  <Tablet size={24} />
                </div>
                <button
                  type="button"
                  onClick={() => setIsCameraActive(true)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#a7f3d0',
                    color: '#062413',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(167, 243, 208, 0.2)'
                  }}
                >
                  Kamera aktivieren
                </button>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '8px', lineHeight: '1.4', maxWidth: '240px' }}>
                  Wähle bei der Abfrage <strong>„Erlauben“</strong>. <span onClick={() => setShowPermissionHelp(true)} style={{ color: '#a7f3d0', textDecoration: 'underline', cursor: 'pointer', fontWeight: 800 }}>Hilfe</span>
                </div>
              </div>
            )}

            {loading && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{ width: '36px', height: '36px', border: '3px solid #a7f3d0', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              </div>
            )}
          </div>
        </div>

        {/* Passwort Anmeldung button for Kiosk Mode inside the card under the camera image */}
        {isGroovelabKiosk && (
          <div style={{ marginTop: '20px', width: '100%' }}>
            <button 
              onClick={() => setExpandedSection('pin')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderRadius: '16px',
                background: 'rgba(0, 0, 0, 0.05)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                color: '#062413',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'center',
                boxSizing: 'border-box',
                height: '48px',
                outline: 'none'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'; }}
            >
              <KeyRound size={16} color="#78350f" />
              Passwort Anmeldung
            </button>
          </div>
        )}

        {/* iOS-Style GrooveLab check-in button - Hidden in Kiosk Mode */}
        {!isGroovelabKiosk && (
          <div style={{ marginTop: '20px', width: '100%' }}>
            <button 
              onClick={() => {
                if (navigator.geolocation) {
                  setLoadingLocation(true);
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      const currentPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                      setUserPos(currentPos);
                      console.log('[Kiosk] Geolocation success:', currentPos);
                      setLoadingLocation(false);
                      setIsGroovelabKiosk(true);
                      setIsCameraActive(true);
                    },
                    (err) => {
                      console.warn('[Kiosk] Geolocation failed:', err);
                      setLoadingLocation(false);
                      setIsGroovelabKiosk(true); // Fallback: still show kiosk rooms
                      setIsCameraActive(true);
                    },
                    { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
                  );
                } else {
                  setIsGroovelabKiosk(true);
                  setIsCameraActive(true);
                }
              }}
              disabled={loadingLocation}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: loadingLocation ? 'wait' : 'pointer',
                transition: 'all 0.2s',
                textAlign: 'center',
                boxSizing: 'border-box',
                height: '48px',
                outline: 'none',
                opacity: loadingLocation ? 0.7 : 1
              }}
              onMouseOver={(e) => { if (!loadingLocation) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'; }}
              onMouseOut={(e) => { if (!loadingLocation) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; }}
            >
              {loadingLocation ? (
                <>
                  <div style={{ width: '12px', height: '12px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  Standort wird ermittelt...
                </>
              ) : (
                <>
                  <Tablet size={16} color="#a7f3d0" />
                  Im GrooveLab anmelden
                </>
              )}
            </button>
          </div>
        )}

        {error && (
          <div style={{ marginTop: '16px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '14px', borderRadius: '16px', fontSize: '13px', fontWeight: 800, textAlign: 'center', width: '100%' }}>
            {error}
          </div>
        )}

        {/* Kiosk Activator Nested Inside Scanner Card */}
        {isGroovelabKiosk && (
          <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginTop: '20px',
            borderTop: '1px solid rgba(0, 0, 0, 0.1)',
            paddingTop: '20px'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(0, 0, 0, 0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tablet size={14} style={{ color: '#78350f' }} /> GrooveLab Kiosk aktivieren
            </div>
            
            {kioskRooms.length > 0 ? (
              <>
                {/* Room Selector */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {kioskRooms.map((room, idx) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => setKioskSelectedRoomId(room.id)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '12px',
                        border: '1px solid',
                        borderColor: kioskSelectedRoomId === room.id ? (schoolData?.primary_color || '#eab308') : (isGroovelabKiosk ? 'rgba(0,0,0,0.1)' : 'rgba(255, 255, 255, 0.15)'),
                        background: kioskSelectedRoomId === room.id ? (schoolData?.primary_color || '#eab308') : 'transparent',
                        color: kioskSelectedRoomId === room.id ? '#ffffff' : (isGroovelabKiosk ? '#1e293b' : '#ffffff'),
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s'
                      }}
                    >
                      {`${idx + 1} - ${cleanRoomName(room.name)}`}
                    </button>
                  ))}
                </div>

                 {/* iPad Stations Visual Layout Map */}
                <div 
                  ref={kioskMapRef}
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '1.4', // Standard room shape ratio
                    background: isGroovelabKiosk ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '24px',
                    border: isGroovelabKiosk ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.1)',
                    marginTop: '12px',
                    overflow: 'hidden'
                  }}
                >
                  {adjustPositions(
                    kioskStations.filter(s => s.room_id === kioskSelectedRoomId && !s.name.toLowerCase().includes('lehrer') && !s.name.toLowerCase().includes('teacher')),
                    kioskMapWidth
                  ).map((station) => {
                    const isOccupied = activeSessionStationIds.includes(station.id);
                    const posX = station.x;
                    const posY = station.y;
                    const stationColor = getStationColor(station.name, station.color);

                    const isSelected = selectedKioskStationId === station.id;
                    const isYellow = stationColor.toLowerCase() === '#eab308';

                    return (
                      <button
                        key={station.id}
                        type="button"
                        onClick={async () => {
                          if (isOccupied) {
                            const confirm = window.confirm(`Dieses iPad ist besetzt. Möchtest du die alte Sitzung beenden und dieses iPad übernehmen?`);
                            if (!confirm) return;
                          }
                          setSelectedKioskStationId(isSelected ? null : station.id);
                        }}
                        style={{
                          position: 'absolute',
                          left: `${posX}%`,
                          top: `${posY}%`,
                          transform: isSelected ? 'translate(-50%, -50%) scale(1.08)' : 'translate(-50%, -50%)',
                          width: '72px',
                          height: '72px',
                          borderRadius: '16px',
                          border: isSelected
                            ? '1px solid #ffffff'
                            : `2px solid ${stationColor}`,
                          background: isSelected 
                            ? `linear-gradient(180deg, ${stationColor} 0%, color-mix(in srgb, ${stationColor} 96%, #000000 4%) 100%)`
                            : `${stationColor}15`,
                          color: isSelected
                            ? (isYellow ? '#09090b' : '#ffffff')
                            : (isGroovelabKiosk ? '#1e293b' : '#ffffff'),
                          cursor: 'pointer',
                          transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)', // Spring-like feel
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '2px',
                          textAlign: 'center',
                          boxShadow: isSelected 
                            ? `inset 0 1.5px 0 rgba(255, 255, 255, ${isYellow ? '0.18' : '0.12'}), inset 0 -1px 0 rgba(0, 0, 0, 0.05), 0 0 16px ${stationColor}20, 0 4px 10px rgba(0, 0, 0, 0.08)`
                            : '0 4px 10px rgba(0, 0, 0, 0.05)',
                          outline: 'none',
                          zIndex: isSelected ? 10 : 1,
                          opacity: isSelected ? 1 : (isOccupied ? 0.7 : 1)
                        }}
                        title={`${station.name} (${isOccupied ? 'Besetzt' : 'Frei'})`}
                      >
                        {station.instrument && (
                          <span style={{ fontSize: '7px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: isSelected ? 0.8 : 0.6, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', padding: '0 2px' }}>
                            {station.instrument}
                          </span>
                        )}
                        <span style={{ fontSize: '10px', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', padding: '0 2px', lineHeight: 1.1 }}>
                          {station.name}
                        </span>
                        {isOccupied ? (
                          <Lock size={10} style={{ color: isSelected ? (isYellow ? '#09090b' : '#ffffff') : (isGroovelabKiosk ? '#ef4444' : '#fca5a5'), marginTop: '2px' }} />
                        ) : (
                          <div style={{ 
                            width: '6px', 
                            height: '6px', 
                            borderRadius: '50%', 
                            background: isSelected
                              ? (isYellow ? '#09090b' : '#ffffff')
                              : '#22c55e',
                            border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.2)',
                            marginTop: '3px',
                            boxShadow: isSelected ? `0 0 6px ${isYellow ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.8)'}` : 'none'
                          }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', margin: '8px 0' }}>
                <p style={{ fontSize: '12px', color: isGroovelabKiosk ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)', margin: 0, textAlign: 'center' }}>
                  Keine GrooveLab-iPad-Räume eingerichtet.
                </p>
              </div>
            )}
            
            <button 
              type="button" 
              onClick={() => {
                setIsGroovelabKiosk(false);
              }} 
              style={{ background: 'none', border: 'none', color: isGroovelabKiosk ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.4)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginTop: '12px', cursor: 'pointer', alignSelf: 'center' }}
            >
              Abbrechen
            </button>
          </div>
        )}
      </div>
      )
}

      {/* Passwort Anmeldung button under the card if available */}
      {expandedSection === 'none' && !isGroovelabKiosk && (
        <div style={{ marginTop: '24px' }}>
          <button 
            onClick={() => setExpandedSection('pin')}
            style={{ 
              background: isGroovelabKiosk ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)', 
              border: isGroovelabKiosk ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.15)', 
              padding: '10px 24px',
              borderRadius: '100px',
              color: isGroovelabKiosk ? '#062413' : '#ffffff', 
              fontSize: '12px', 
              fontWeight: 800, 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em', 
              cursor: 'pointer', 
              transition: 'all 0.2s',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = isGroovelabKiosk ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.16)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = isGroovelabKiosk ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)'; }}
          >
            <KeyRound size={14} color={isGroovelabKiosk ? '#062413' : '#a7f3d0'} />
            Passwort Anmeldung
          </button>
        </div>
      )}

      {/* Manueller PIN Zugang */}
      {expandedSection === 'pin' && (
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'rgba(255, 255, 255, 0.07)',
        borderRadius: '40px',
        padding: '28px',
        boxShadow: '0 40px 100px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={14} style={{ color: '#a7f3d0' }} /> Manueller Zugang über PIN / QR-Token
        </div>
        <form onSubmit={(e) => { e.preventDefault(); handlePinLogin(pinInput); }} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="Ausweis ID..."
            style={{
              flex: 1,
              padding: '14px 18px',
              borderRadius: '16px',
              border: '1.5px solid rgba(255, 255, 255, 0.15)',
              fontSize: '14px',
              fontWeight: 700,
              outline: 'none',
              transition: 'all 0.2s',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#ffffff'
            }}
          />
          <button
            type="submit"
            disabled={loading || !pinInput.trim()}
            style={{
              padding: '14px 24px',
              borderRadius: '16px',
              border: 'none',
              background: schoolData?.primary_color || '#a7f3d0',
              color: schoolData?.primary_color ? '#ffffff' : '#062413',
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
        <button onClick={() => setExpandedSection('none')} style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.4)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginTop: '12px', cursor: 'pointer', alignSelf: 'center' }}>
          Zurück
        </button>
      </div>
      )}



      {/* Geofence Diagnostic Panel (Localhost only) */}
      {isLocalhost && isGroovelabKiosk && geoDebug && (
        <div style={{ 
          marginTop: '24px', 
          padding: '24px', 
          background: 'rgba(15, 23, 42, 0.95)', 
          color: 'white', 
          borderRadius: '32px', 
          fontSize: '13px', 
          width: '100%',
          maxWidth: '420px',
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
              <span style={{ fontWeight: 700 }}>{geoDebug.userPos && typeof geoDebug.userPos.lat === 'number' && typeof geoDebug.userPos.lng === 'number' ? `${geoDebug.userPos.lat.toFixed(4)}, ${geoDebug.userPos.lng.toFixed(4)}` : 'Wird gesucht...'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8 }}>
              <span>Ziel (Akademie):</span>
              <span style={{ fontWeight: 700 }}>{geoDebug.schoolCoords && typeof geoDebug.schoolCoords.lat === 'number' && typeof geoDebug.schoolCoords.lng === 'number' ? `${geoDebug.schoolCoords.lat.toFixed(4)}, ${geoDebug.schoolCoords.lng.toFixed(4)}` : 'Nicht gesetzt'}</span>
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
                     if (data) finalizeLogin(data, loginStationId, true);
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
              background: 'rgba(254, 249, 195, 0.08)',
              border: '2px solid rgba(253, 224, 71, 0.25)',
              borderRadius: '24px',
              color: '#fef9c3',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(234,179,8,0.1)',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(254, 249, 195, 0.15)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(254, 249, 195, 0.08)'; }}
          >
            🔓 ADMIN BYPASS (LOCAL ONLY)
          </button>
          
        </div>
      )}



      {/* Legal Footer */}
      <div style={{ 
        marginTop: '40px', 
        display: 'flex', 
        gap: '24px', 
        fontSize: '11px', 
        fontWeight: 800, 
        color: '#047857',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        <span 
          onClick={() => setShowPrivacy(true)} 
          style={{ cursor: 'pointer', transition: 'color 0.2s' }} 
          onMouseOver={(e) => { e.currentTarget.style.color = '#064e3b'; }}
          onMouseOut={(e) => { e.currentTarget.style.color = '#047857'; }}
        >
          Datenschutz
        </span>
        <span style={{ opacity: 0.3 }}>•</span>
        <span 
          onClick={() => setShowImpressum(true)} 
          style={{ cursor: 'pointer', transition: 'color 0.2s' }} 
          onMouseOver={(e) => { e.currentTarget.style.color = '#064e3b'; }}
          onMouseOut={(e) => { e.currentTarget.style.color = '#047857'; }}
        >
          Impressum
        </span>
      </div>

    </div> {/* Closing Right Login Panel */}

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

      {/* Permission Help Modal */}
      {showPermissionHelp && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(9, 9, 11, 0.70)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '24px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'rgba(24, 24, 27, 0.95)',
            borderRadius: '32px',
            boxShadow: '0 30px 80px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '32px',
            maxWidth: '520px',
            width: '100%',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxSizing: 'border-box',
            color: '#ffffff'
          }}>
            <button 
              onClick={() => setShowPermissionHelp(false)} 
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: 'none',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#ffffff',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(167, 243, 208, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a7f3d0' }}>
                <HelpCircle size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, letterSpacing: '-0.02em', color: '#ffffff' }}>
                Berechtigungen dauerhaft erlauben
              </h3>
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: '#a1a1aa', lineHeight: '1.5' }}>
              Aus Sicherheitsgründen schützt dein Browser den Zugriff auf Kamera und Standort. Du kannst diesen Zugriff dauerhaft freigeben, damit der Login beim nächsten Mal automatisch klappt:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Safari / iOS */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 800, color: '#a7f3d0' }}>
                   Safari (iPhone, iPad, Mac)
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#d4d4d8', lineHeight: '1.6' }}>
                  <li>Tippe in der Adressleiste links auf das <strong>„aA“</strong>-Symbol oder das Einstellungen-Symbol.</li>
                  <li>Wähle <strong>„Website-Einstellungen“</strong>.</li>
                  <li>Setze <strong>Kamera</strong> und <strong>Standort</strong> auf <strong>„Erlauben“</strong>.</li>
                </ul>
              </div>

              {/* Google Chrome */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 800, color: '#facc15' }}>
                  🌐 Google Chrome (Android, Mac, PC)
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#d4d4d8', lineHeight: '1.6' }}>
                  <li>Klicke in der Adressleiste links auf das <strong>Schieberegler/Schloss-Symbol</strong> neben der Website-Adresse.</li>
                  <li>Aktiviere dort die Schalter für <strong>Kamera</strong> und <strong>Standort</strong> (auf <strong>„Zulassen“</strong> stellen).</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowPermissionHelp(false)}
              style={{
                background: '#a7f3d0',
                color: '#062413',
                border: 'none',
                padding: '14px',
                borderRadius: '16px',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
            >
              Verstanden
            </button>
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
                    color: '#ffffff',
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
                    color: '#ffffff',
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
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>
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
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', marginBottom: '16px' }}>
              <Key size={28} />
            </div>
            
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>Persönliche PIN einrichten</h3>
            <p style={{ margin: '8px 0 20px 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 600, lineHeight: '1.4' }}>
              Erster Login für <strong>{pinSetupUser.first_name} {pinSetupUser.last_name}</strong> ({pinSetupUser.ausweis_nummer}).<br/>
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

            <button
              onClick={async () => {
                if (pinSetupInput.length !== 4) return;
                setLoading(true);
                try {
                  if (pinSetupUser?.ausweis_nummer) {
                    sessionStorage.setItem('groovelab_qr_token', pinSetupUser.ausweis_nummer);
                  }
                  const { error } = await supabase
                    .from('users')
                    .update({
                      personal_pin: pinSetupInput,
                      is_pin_activated: true
                    })
                    .eq('id', pinSetupUser.id);

                  sessionStorage.removeItem('groovelab_qr_token');

                  if (error) throw error;
                  
                  const user = pinSetupUser;
                  setPinSetupUser(null);
                  
                  const isTeacher = user.role?.toLowerCase() === 'teacher' || user.role?.toLowerCase() === 'admin';
                  if (isTeacher) {
                    if (user.is_observer) {
                      await finalizeLogin(user, loginStationId, false, true);
                    } else {
                      const isGroovelabScreen = isGroovelabKiosk;
                      if (isGroovelabScreen) {
                        await finalizeLogin(user, loginStationId, pinVerificationIsWithinRoom, false);
                      } else {
                        // Campus Login strictly bypasses GrooveLab presence check-in
                        await finalizeLogin(user, loginStationId, false, true);
                      }
                    }
                  } else {
                    await finalizeLogin(user, loginStationId, pinVerificationIsWithinRoom);
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
              onClick={() => {
                setPinSetupUser(null);
                setLoading(false);
              }}
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
              Login für <strong>{pinVerificationUser.first_name} {pinVerificationUser.last_name}</strong> ({pinVerificationUser.ausweis_nummer}).<br/>
              Bitte gib deine 4-stellige PIN ein.
            </p>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: '2px solid #cbd5e1',
                  background: pinVerificationInput.length > idx ? '#cbd5e1' : 'transparent',
                  transition: 'all 0.15s ease'
                }} />
              ))}
            </div>

            {renderKeypad('verify')}

            <button
              onClick={async () => {
                if (pinVerificationInput.length !== 4) return;
                
                if (pinVerificationInput === pinVerificationUser.personal_pin) {
                  const user = pinVerificationUser;
                  setPinVerificationUser(null);
                  
                  const isTeacher = user.role?.toLowerCase() === 'teacher' || user.role?.toLowerCase() === 'admin';
                  if (isTeacher) {
                    if (user.is_observer) {
                      await finalizeLogin(user, loginStationId, false, true);
                    } else {
                      const isGroovelabScreen = isGroovelabKiosk;
                      if (isGroovelabScreen) {
                        await finalizeLogin(user, loginStationId, pinVerificationIsWithinRoom, false);
                      } else {
                        // Campus Login strictly bypasses GrooveLab presence check-in
                        await finalizeLogin(user, loginStationId, false, true);
                      }
                    }
                  } else {
                    await finalizeLogin(user, loginStationId, pinVerificationIsWithinRoom);
                  }
                } else {
                  alert('Die eingegebene PIN ist nicht korrekt.');
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
                marginTop: '24px',
                cursor: pinVerificationInput.length === 4 ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s'
              }}
            >
              Verifizieren &amp; Einloggen
            </button>
            
            <button
              onClick={() => {
                setPinVerificationUser(null);
                setLoading(false);
              }}
              style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginTop: '16px', cursor: 'pointer' }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

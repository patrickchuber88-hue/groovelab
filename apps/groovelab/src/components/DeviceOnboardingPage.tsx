import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Smartphone, Monitor, Check, ArrowRight, Loader2, AlertTriangle, Share2, Tablet } from 'lucide-react';

interface DeviceOnboardingPageProps {
  token: string;
}

export const DeviceOnboardingPage: React.FC<DeviceOnboardingPageProps> = ({ token }) => {
  const [school, setSchool] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [kiosks, setKiosks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [selectedStationId, setSelectedStationId] = useState<string>('');
  const [setupSuccess, setSetupSuccess] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Fetch School
        const { data: schoolData, error: schoolErr } = await supabase
          .from('schools')
          .select('id, name')
          .eq('groovelab_kiosk_token', token)
          .maybeSingle();

        if (schoolErr) throw schoolErr;
        if (!schoolData) {
          throw new Error('Ungültiger Geräte-Kopplungsschlüssel.');
        }
        setSchool(schoolData);

        // 2. Fetch Rooms
        const { data: roomsData, error: roomsErr } = await supabase
          .from('rooms')
          .select('id, name')
          .eq('school_id', schoolData.id)
          .eq('is_groovelab_active', true)
          .order('name');
        if (roomsErr) throw roomsErr;
        setRooms(roomsData || []);
        if (roomsData && roomsData.length > 0) {
          setSelectedRoomId(roomsData[0].id);
        }

        // 3. Fetch Stations
        const { data: stationsData, error: stationsErr } = await supabase
          .from('stations')
          .select('id, name, room_id, rooms!inner(school_id, is_groovelab_active)')
          .eq('rooms.school_id', schoolData.id)
          .eq('rooms.is_groovelab_active', true)
          .order('name');
        if (stationsErr) throw stationsErr;
        setStations(stationsData || []);

        // 4. Fetch Kiosks
        const { data: kiosksData, error: kiosksErr } = await supabase
          .from('kiosks')
          .select('*')
          .eq('school_id', schoolData.id);
        if (kiosksErr) throw kiosksErr;
        setKiosks(kiosksData || []);

      } catch (err: any) {
        console.error('[DeviceOnboarding] Error loading data:', err);
        setError(err.message || 'Fehler beim Laden des Geräte-Setups.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token]);

  // PWA setup hook
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowNotification(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    let timer: any;
    if (!isStandalone) {
      timer = setTimeout(() => {
        setShowNotification(true);
      }, 2500);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install: ${outcome}`);
      setDeferredPrompt(null);
      setShowNotification(false);
    } else {
      const guideSection = document.getElementById('pwa-install-guide');
      if (guideSection) {
        guideSection.scrollIntoView({ behavior: 'smooth' });
        guideSection.style.transform = 'scale(1.02)';
        setTimeout(() => {
          guideSection.style.transform = 'scale(1)';
        }, 300);
      }
      setShowNotification(false);
    }
  };

  const handleSaveSetup = async () => {
    if (!selectedStationId || !school) return;

    try {
      const selectedStation = stations.find(s => s.id === selectedStationId);
      if (!selectedStation) return;

      // Find existing kiosk record or create it
      let kioskRecord = kiosks.find(k => k.station_id === selectedStationId);

      if (!kioskRecord) {
        const { data: insertedRows, error: insertErr } = await supabase
          .from('kiosks')
          .insert({
            school_id: school.id,
            name: selectedStation.name || 'iPad Kiosk',
            room_id: selectedStation.room_id,
            station_id: selectedStation.id
          })
          .select();

        if (insertErr) throw insertErr;
        if (!insertedRows || insertedRows.length === 0) {
          throw new Error('Kopplungs-Eintrag konnte nicht erstellt werden.');
        }
        kioskRecord = insertedRows[0];
      }

      if (kioskRecord && kioskRecord.secret_token) {
        // Save to device storage
        localStorage.setItem('groovelab_kiosk_token', kioskRecord.secret_token);
        localStorage.setItem('groovelab_station_id', selectedStation.id);
        localStorage.setItem('groovelab_kiosk_room_id', selectedStation.room_id);
        localStorage.setItem('groovelab_active_platform', 'groovelab');
        
        setSetupSuccess(true);
        setTimeout(() => {
          // Redirect to home and trigger auto-login with parameters to survive iOS PWA installation isolation
          const pairingUrl = `/?platform=groovelab&kiosk_token=${encodeURIComponent(kioskRecord.secret_token)}&station_id=${encodeURIComponent(selectedStation.id)}&kiosk_room_id=${encodeURIComponent(selectedStation.room_id)}`;
          window.location.replace(pairingUrl);
        }, 1500);
      } else {
        throw new Error('Kopplungs-Token konnte nicht geladen werden.');
      }
    } catch (err: any) {
      console.error('[DeviceOnboarding] Save failed:', err);
      alert('Kopplung fehlgeschlagen: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#000000', color: '#f5f5f7', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <Loader2 className="custom-animate-spin" size={36} style={{ color: '#facc15', marginBottom: '24px' }} />
        <p style={{ fontWeight: 600, fontSize: '0.95rem', letterSpacing: '-0.01em', opacity: 0.8 }}>Geräte-Setup wird geladen...</p>
      </div>
    );
  }

  if (error || !school) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#000000', color: '#ff453a', padding: '24px', textAlign: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ background: 'rgba(255, 69, 58, 0.1)', border: '1px solid rgba(255, 69, 58, 0.2)', borderRadius: '50%', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
          <AlertTriangle size={24} color="#ff453a" />
        </div>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '10px', color: '#ffffff', letterSpacing: '-0.02em' }}>Verbindung fehlgeschlagen</h3>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', maxWidth: '340px', marginBottom: '32px', lineHeight: 1.5 }}>{error || 'Der Setup-Link konnte nicht verifiziert werden.'}</p>
        <button 
          onClick={() => window.location.replace('/')} 
          style={{ 
            background: '#ffffff', 
            border: 'none', 
            color: '#000000', 
            padding: '12px 28px', 
            borderRadius: '9999px', 
            fontSize: '0.85rem', 
            fontWeight: 600, 
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(255, 255, 255, 0.1)',
            transition: 'transform 0.2s, background-color 0.2s'
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Zur Startseite
        </button>
      </div>
    );
  }

  const roomStations = stations.filter(s => s.room_id === selectedRoomId);

  return (
    <div className="apple-glow-container">
      {/* Dynamic Style Block for Apple Senior Design System */}
      <style>{`
        .apple-glow-container {
          position: relative;
          width: 100%;
          min-height: 100vh;
          background: radial-gradient(circle at top, #141416 0%, #000000 100%);
          color: #f5f5f7;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 32px;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Icons", "Helvetica Neue", Helvetica, Arial, sans-serif;
          box-sizing: border-box;
          padding: 48px 24px;
          overflow: hidden;
        }

        .apple-ambient-glow {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 700px;
          height: 350px;
          background: radial-gradient(circle, rgba(250, 204, 21, 0.055) 0%, transparent 70%);
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
        }

        .apple-card {
          background: rgba(28, 28, 30, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          border-radius: 26px;
          padding: 30px;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
          gap: 22px;
          z-index: 1;
        }

        .apple-segmented {
          display: flex;
          background: rgba(120, 120, 128, 0.18);
          border-radius: 12px;
          padding: 2.5px;
          gap: 2px;
          width: 100%;
          border: 0.5px solid rgba(255, 255, 255, 0.02);
        }

        .apple-segmented-item {
          flex: 1;
          padding: 9px 14px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .apple-segmented-item:hover {
          color: #ffffff;
        }

        .apple-segmented-item.active {
          background: rgba(255, 255, 255, 0.12);
          color: #facc15;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        .apple-device-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          width: 100%;
        }

        .apple-device-card {
          padding: 20px 16px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.02);
          color: #ffffff;
          text-align: center;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          position: relative;
          overflow: hidden;
        }

        .apple-device-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: radial-gradient(circle at center, rgba(255,255,255,0.02) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
        }

        .apple-device-card:hover::before {
          opacity: 1;
        }

        .apple-device-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
        }

        .apple-device-card:active {
          transform: scale(0.97);
        }

        .apple-device-card.selected {
          border: 1.5px solid #facc15;
          background: rgba(250, 204, 21, 0.05);
          box-shadow: 0 0 25px rgba(250, 204, 21, 0.12);
        }

        .apple-device-card.selected:hover {
          border-color: #fde047;
        }

        .apple-btn-primary {
          width: 100%;
          border-radius: 9999px;
          padding: 16px;
          font-size: 0.9rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          border: 1px solid rgba(0, 0, 0, 0.15);
        }

        .apple-btn-primary.enabled {
          background: linear-gradient(180deg, #fde047 0%, #facc15 100%);
          color: #000000;
          box-shadow: 0 8px 24px rgba(250, 204, 21, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }

        .apple-btn-primary.enabled:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 28px rgba(250, 204, 21, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.35);
        }

        .apple-btn-primary.enabled:active {
          transform: scale(0.98);
        }

        .apple-btn-primary.disabled {
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.02);
          cursor: not-allowed;
        }

        @keyframes buttonPulse {
          0% { box-shadow: 0 8px 24px rgba(250, 204, 21, 0.2), 0 0 0 0 rgba(250, 204, 21, 0.45); }
          70% { box-shadow: 0 8px 24px rgba(250, 204, 21, 0.25), 0 0 0 10px rgba(250, 204, 21, 0); }
          100% { box-shadow: 0 8px 24px rgba(250, 204, 21, 0.2), 0 0 0 0 rgba(250, 204, 21, 0); }
        }

        .apple-btn-primary.enabled.pulsing {
          animation: buttonPulse 2.2s infinite ease-in-out;
        }

        @keyframes laserSweep {
          0% { transform: translateY(0); }
          50% { transform: translateY(58px); }
          100% { transform: translateY(0); }
        }

        .apple-laser {
          animation: laserSweep 3s ease-in-out infinite;
        }

        @keyframes wirelessPulse {
          0% { opacity: 0.25; transform: scale(0.96); }
          50% { opacity: 0.9; transform: scale(1.04); }
          100% { opacity: 0.25; transform: scale(0.96); }
        }

        .apple-pulse-line {
          animation: wirelessPulse 2s ease-in-out infinite;
          transform-origin: 60px 60px;
        }

        .apple-pulse-delay {
          animation: wirelessPulse 2s ease-in-out infinite;
          animation-delay: 0.7s;
          transform-origin: 60px 60px;
        }
      `}</style>

      {/* Decorative Ambient Radial Glow */}
      <div className="apple-ambient-glow" />

      {/* Header */}
      <div style={{ textAlign: 'center', marginTop: '16px', zIndex: 1 }}>
        <h1 style={{ fontSize: '1.95rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '8px', color: '#ffffff' }}>
          Campus-Groovelab Geräte-Onboarding
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.55)', fontWeight: 500, letterSpacing: '-0.01em' }}>
          Richte dieses Gerät als Kiosk-Scanner ein
        </p>
      </div>

      <div style={{ maxWidth: '480px', width: '100%', display: 'flex', flexDirection: 'column', gap: '28px', zIndex: 1 }}>
        
        {/* Main Setup Card */}
        <div className="apple-card">
          
          {/* Animated SVG Hero Onboarding Indicator */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 4px 20px rgba(250, 204, 21, 0.15))' }}>
              <circle cx="60" cy="60" r="48" stroke="rgba(250, 204, 21, 0.15)" strokeWidth="1" strokeDasharray="4 4" className="apple-pulse-delay" />
              <circle cx="60" cy="60" r="38" stroke="rgba(250, 204, 21, 0.25)" strokeWidth="1.5" className="apple-pulse-line" />
              
              {/* iPad Body */}
              <rect x="36" y="22" width="48" height="76" rx="8" fill="#141416" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="2" />
              {/* Screen */}
              <rect x="40" y="28" width="40" height="64" rx="4" fill="#000000" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
              {/* Camera dot */}
              <circle cx="60" cy="25" r="1.2" fill="rgba(255, 255, 255, 0.3)" />
              {/* Home indicator bar */}
              <line x1="52" y1="89" x2="68" y2="89" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1.5" strokeLinecap="round" />
              
              {/* QR Code framing brackets inside screen */}
              <path d="M46 38v-4h4M74 38v-4h-4M46 66v4h4M74 66v4h-4" stroke="rgba(250, 204, 21, 0.4)" strokeWidth="1" strokeLinecap="round" />
              <rect x="52" y="42" width="5" height="5" fill="#facc15" opacity="0.6" rx="0.5" />
              <rect x="63" y="42" width="5" height="5" fill="#facc15" opacity="0.6" rx="0.5" />
              <rect x="52" y="53" width="5" height="5" fill="#facc15" opacity="0.6" rx="0.5" />
              <rect x="63" y="53" width="5" height="5" fill="#facc15" opacity="0.6" rx="0.5" />
              
              {/* Laser line scanning */}
              <g className="apple-laser">
                <line x1="41" y1="32" x2="79" y2="32" stroke="#facc15" strokeWidth="1.5" strokeLinecap="round" />
                <polygon points="41,32 79,32 79,35 41,35" fill="url(#laserGlow)" style={{ mixBlendMode: 'plus-lighter' }} />
              </g>
              
              <defs>
                <linearGradient id="laserGlow" x1="60" y1="32" x2="60" y2="35" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#facc15" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* School Banner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(250, 204, 21, 0.08)', border: '1px solid rgba(250, 204, 21, 0.15)', padding: '14px 18px', borderRadius: '18px' }}>
            <Monitor size={20} color="#facc15" />
            <div>
              <div style={{ fontSize: '0.68rem', color: '#facc15', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>Musikschule erkannt</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>{school.name}</div>
            </div>
          </div>

          {setupSuccess ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 0', gap: '18px', textAlign: 'center' }}>
              <div style={{ background: '#30d158', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 24px rgba(48,209,88,0.25)' }}>
                <Check size={28} color="#ffffff" strokeWidth={3} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '6px', letterSpacing: '-0.02em' }}>Erfolgreich gekoppelt!</h3>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>Das Kiosk-Gerät startet jetzt...</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Room Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>1. Raum auswählen</label>
                <div className="apple-segmented">
                  {rooms.map(r => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setSelectedRoomId(r.id);
                        setSelectedStationId('');
                      }}
                      className={`apple-segmented-item ${selectedRoomId === r.id ? 'active' : ''}`}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Station Selection */}
              {selectedRoomId && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>2. Geräteplatzierung auswählen</label>
                  {roomStations.length > 0 ? (
                    <div className="apple-device-grid">
                      {roomStations.map(s => {
                        const isSetup = kiosks.some(k => k.station_id === s.id);
                        const isSelected = selectedStationId === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => setSelectedStationId(s.id)}
                            className={`apple-device-card ${isSelected ? 'selected' : ''}`}
                          >
                            <Tablet size={22} style={{ color: isSelected ? '#facc15' : 'rgba(255, 255, 255, 0.45)', transition: 'color 0.25s' }} />
                            <span style={{ fontSize: '0.85rem', fontWeight: 650, letterSpacing: '-0.01em' }}>{s.name}</span>
                            
                            {/* Setup Status Badge */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                              <span style={{ 
                                width: '6px', 
                                height: '6px', 
                                borderRadius: '50%', 
                                background: isSetup ? '#facc15' : 'rgba(255,255,255,0.15)',
                                display: 'inline-block'
                              }} />
                              <span style={{ fontSize: '0.62rem', color: isSetup ? 'rgba(250, 204, 21, 0.85)' : 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                                {isSetup ? 'Bereits gekoppelt' : 'Frei zum Koppeln'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.4)', margin: '8px 0 0 0', textAlign: 'center', fontStyle: 'italic' }}>Keine Geräte in diesem Raum angelegt.</p>
                  )}
                </div>
              )}

              {/* Confirm Setup Action */}
              <button
                onClick={handleSaveSetup}
                disabled={!selectedStationId}
                className={`apple-btn-primary ${selectedStationId ? 'enabled pulsing' : 'disabled'}`}
              >
                Gerät koppeln & Kiosk starten <ArrowRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          )}

        </div>

        {/* PWA / App Installation Guidance */}
        <div id="pwa-install-guide" style={{ 
          background: 'rgba(255, 255, 255, 0.02)', 
          border: '1px solid rgba(255, 255, 255, 0.06)', 
          borderRadius: '24px', 
          padding: '24px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px', 
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' 
        }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', margin: '0', letterSpacing: '-0.015em' }}>
            <Smartphone size={18} color="#facc15" /> Campus-Groovelab App installieren
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.55)', margin: '0', lineHeight: 1.45 }}>
            Installiere die App auf diesem iPad für schnellen Zugriff und verlässlichen Vollbildmodus:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8rem', marginTop: '4px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ background: 'rgba(250, 204, 21, 0.1)', color: '#facc15', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, fontSize: '0.72rem' }}>1</span>
              <div style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
                <span style={{ fontWeight: 650, color: '#ffffff' }}>iOS (Safari):</span> Tippe auf das Teilen-Symbol <Share2 size={13} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px', color: '#facc15' }} /> und wähle <span style={{ fontWeight: 650, color: '#ffffff' }}>"Zum Home-Bildschirm"</span>.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ background: 'rgba(250, 204, 21, 0.1)', color: '#facc15', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, fontSize: '0.72rem' }}>2</span>
              <div style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
                <span style={{ fontWeight: 650, color: '#ffffff' }}>Android (Chrome):</span> Tippe auf die drei Punkte oben rechts und wähle <span style={{ fontWeight: 650, color: '#ffffff' }}>"App installieren"</span>.
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Apple-style Push Notification for PWA Installation */}
      {showNotification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '92%',
          maxWidth: '380px',
          background: 'rgba(28, 28, 30, 0.82)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          borderRadius: '20px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          padding: '14px 16px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          zIndex: 9999,
          animation: 'slideDownNotification 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <style>{`
            @keyframes slideDownNotification {
              0% { transform: translate(-50%, -100px); opacity: 0; }
              100% { transform: translate(-50%, 0); opacity: 1; }
            }
          `}</style>
          
          {/* App Icon */}
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '9px',
            background: 'linear-gradient(135deg, #fde047 0%, #facc15 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
            flexShrink: 0
          }}>
            <Tablet size={18} style={{ color: '#000000' }} />
          </div>
          
          {/* Text Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', marginBottom: '1px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Campus-Groovelab</span>
              <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>JETZT</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.35, fontWeight: 500 }}>
              Möchtest du die Campus-Groovelab App auf diesem Gerät installieren?
            </div>
          </div>
          
          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
            <button
              onClick={handleInstallClick}
              style={{
                background: '#ffffff',
                color: '#000000',
                border: 'none',
                borderRadius: '8px',
                padding: '5px 12px',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              Laden
            </button>
            <button
              onClick={() => setShowNotification(false)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.6)',
                border: 'none',
                borderRadius: '8px',
                padding: '5px 12px',
                fontSize: '0.7rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              Später
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

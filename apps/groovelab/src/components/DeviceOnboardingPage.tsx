import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Smartphone, Monitor, Check, ArrowRight, Loader2 } from 'lucide-react';

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
          throw new Error('Ungültiger Geräte-Lizenzschlüssel.');
        }
        setSchool(schoolData);

        // 2. Fetch Rooms
        const { data: roomsData, error: roomsErr } = await supabase
          .from('rooms')
          .select('id, name')
          .eq('school_id', schoolData.id)
          .order('name');
        if (roomsErr) throw roomsErr;
        setRooms(roomsData || []);
        if (roomsData && roomsData.length > 0) {
          setSelectedRoomId(roomsData[0].id);
        }

        // 3. Fetch Stations
        const { data: stationsData, error: stationsErr } = await supabase
          .from('stations')
          .select('id, name, room_id')
          .eq('school_id', schoolData.id)
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
        const { data, error: insertErr } = await supabase
          .from('kiosks')
          .insert({
            school_id: school.id,
            name: selectedStation.name || 'iPad Kiosk',
            room_id: selectedStation.room_id,
            station_id: selectedStation.id
          })
          .select()
          .single();

        if (insertErr) throw insertErr;
        kioskRecord = data;
      }

      if (kioskRecord && kioskRecord.secret_token) {
        // Save to device storage
        localStorage.setItem('groovelab_kiosk_token', kioskRecord.secret_token);
        localStorage.setItem('groovelab_station_id', selectedStation.id);
        localStorage.setItem('groovelab_kiosk_room_id', selectedStation.room_id);
        
        setSetupSuccess(true);
        setTimeout(() => {
          // Redirect to home and trigger auto-login
          window.location.replace('/');
        }, 1500);
      }
    } catch (err: any) {
      console.error('[DeviceOnboarding] Save failed:', err);
      alert('Kopplung fehlgeschlagen: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#09090b', color: '#64748b', fontFamily: 'system-ui' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: '#eab308', marginBottom: '16px' }} />
        <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>Geräte-Setup wird geladen...</p>
      </div>
    );
  }

  if (error || !school) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#09090b', color: '#ef4444', padding: '24px', textAlign: 'center', fontFamily: 'system-ui' }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '50%', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '2rem' }}>⚠️</span>
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '8px', color: '#fca5a5' }}>Ungültiger Link</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', maxWidth: '320px', marginBottom: '24px', lineHeight: 1.5 }}>{error || 'Der Setup-Link konnte nicht verifiziert werden.'}</p>
        <button onClick={() => window.location.replace('/')} style={{ background: '#1e293b', border: 'none', color: '#ffffff', padding: '12px 24px', borderRadius: '14px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer' }}>Zur Startseite</button>
      </div>
    );
  }

  const roomStations = stations.filter(s => s.room_id === selectedRoomId);

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at top, #1e293b 0%, #09090b 100%)', color: '#f8fafc', padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px', fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box' }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '6px' }}>GrooveLab Geräte-Onboarding</h1>
        <p style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>Richte dieses Gerät als Kiosk-Scanner ein</p>
      </div>

      <div style={{ maxWidth: '480px', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Main Setup Card */}
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1.5px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', borderRadius: '28px', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)', padding: '12px 16px', borderRadius: '16px' }}>
            <Monitor size={22} color="#eab308" />
            <div>
              <div style={{ fontSize: '0.65rem', color: '#eab308', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Musikschule erkannt</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff' }}>{school.name}</div>
            </div>
          </div>

          {setupSuccess ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: '16px', textAlign: 'center' }}>
              <div style={{ background: '#22c55e', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(34,197,94,0.3)' }}>
                <Check size={32} color="#ffffff" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ffffff', marginBottom: '4px' }}>Erfolgreich gekoppelt!</h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Das Gerät startet jetzt...</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Room Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>1. Raum auswählen</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {rooms.map(r => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setSelectedRoomId(r.id);
                        setSelectedStationId('');
                      }}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '12px',
                        border: 'none',
                        background: selectedRoomId === r.id ? '#eab308' : 'rgba(255,255,255,0.06)',
                        color: selectedRoomId === r.id ? '#0f172a' : '#cbd5e1',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Station Selection */}
              {selectedRoomId && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>2. Geräte-Platzplatzierung auswählen</label>
                  {roomStations.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                      {roomStations.map(s => {
                        const isSetup = kiosks.some(k => k.station_id === s.id);
                        const isSelected = selectedStationId === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => setSelectedStationId(s.id)}
                            style={{
                              padding: '16px 12px',
                              borderRadius: '16px',
                              border: isSelected ? '2px solid #eab308' : '1px solid rgba(255,255,255,0.08)',
                              background: isSelected ? 'rgba(234, 179, 8, 0.08)' : 'rgba(255,255,255,0.03)',
                              color: '#ffffff',
                              textAlign: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <span style={{ fontSize: '0.85rem', fontWeight: 850 }}>{s.name}</span>
                            <span style={{ fontSize: '0.62rem', color: isSetup ? '#eab308' : '#64748b', fontWeight: 700 }}>
                              {isSetup ? 'Bereits konfiguriert' : 'Nicht gekoppelt'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '8px 0 0 0' }}>Keine Geräte in diesem Raum angelegt.</p>
                  )}
                </div>
              )}

              {/* Confirm Setup Action */}
              <button
                onClick={handleSaveSetup}
                disabled={!selectedStationId}
                style={{
                  width: '100%',
                  background: selectedStationId ? '#eab308' : 'rgba(255,255,255,0.04)',
                  color: selectedStationId ? '#0f172a' : '#64748b',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '14px',
                  fontSize: '0.85rem',
                  fontWeight: 900,
                  cursor: selectedStationId ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '12px',
                  transition: 'all 0.2s'
                }}
              >
                Gerät koppeln & Kiosk starten <ArrowRight size={16} />
              </button>
            </div>
          )}

        </div>

        {/* PWA / App Installation Guidance */}
        <div id="pwa-install-guide" style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1.5px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 4px 0' }}>
            <Smartphone size={18} color="#eab308" /> GrooveLab App installieren
          </h3>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0', lineHeight: 1.4 }}>
            Installiere die App auf diesem iPad für schnellen Zugriff und verlässlichen Vollbildmodus:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem', marginTop: '4px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <span style={{ background: 'rgba(255,255,255,0.08)', color: '#eab308', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800 }}>1</span>
              <div>
                <span style={{ fontWeight: 800, color: '#ffffff' }}>iOS (Safari):</span> Tippe auf das Teilen-Symbol <span style={{ fontSize: '0.85rem' }}>📤</span> und wähle <span style={{ fontWeight: 800, color: '#ffffff' }}>"Zum Home-Bildschirm"</span>.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <span style={{ background: 'rgba(255,255,255,0.08)', color: '#eab308', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800 }}>2</span>
              <div>
                <span style={{ fontWeight: 800, color: '#ffffff' }}>Android (Chrome):</span> Tippe auf die drei Punkte oben rechts und wähle <span style={{ fontWeight: 800, color: '#ffffff' }}>"App installieren"</span>.
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
          maxWidth: '400px',
          background: 'rgba(21, 21, 28, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '22px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 1px rgba(255, 255, 255, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '16px',
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
            width: '42px',
            height: '42px',
            borderRadius: '11px',
            background: '#eab308',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
            flexShrink: 0
          }}>
            <Smartphone size={20} style={{ color: '#0f172a' }} />
          </div>
          
          {/* Text Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff', marginBottom: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>GrooveLab</span>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500 }}>JETZT</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: 1.3, fontWeight: 500 }}>
              Möchtest du die GrooveLab App auf diesem Gerät installieren?
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
                borderRadius: '10px',
                padding: '6px 12px',
                fontSize: '0.7rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              Laden
            </button>
            <button
              onClick={() => setShowNotification(false)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                color: '#94a3b8',
                border: 'none',
                borderRadius: '10px',
                padding: '6px 12px',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Später
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

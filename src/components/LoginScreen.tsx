import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Music, Tablet, ShieldCheck, FileText, X } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { getDistanceFromLatLonInM } from '../utils/geo';

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

export function LoginScreen({ onLogin, kioskStationId }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showImpressum, setShowImpressum] = useState(false);
  
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

  let effectiveStationId = kioskStationId || localStorage.getItem('groovelab_station_id');
  if (effectiveStationId === 'skip') effectiveStationId = null;

  const finalizeLogin = async (user: any, stationId: string | null, isWithinAnyRoom: boolean) => {
    try {
      setLoading(true);
      const now = new Date().toISOString();
      const isTeacher = user.role?.toLowerCase() === 'teacher' || user.role?.toLowerCase() === 'admin';
      
      let finalStationId = null;
      let isHome = false;

      // 1. Determine finalStationId and lookup teacher station if needed
      if (isTeacher) {
        const { data: tStation } = await supabase.from('stations').select('id').eq('name', 'Lehrer iPad').maybeSingle();
        finalStationId = tStation?.id || null;
      } else {
        finalStationId = stationId;
      }

      // Geofence check
      if (!isWithinAnyRoom) {
        console.log(`[Login] Outside geofence. Forcing Home mode.`);
        isHome = true;
        finalStationId = null;
      }

      // 1.5 Check opening hours for sessions (Students only)
      const schoolData = Array.isArray((user as any).schools) ? (user as any).schools[0] : (user as any).schools;
      const openingHours = schoolData?.opening_hours;
      const withinHours = isWithinOpeningHours(openingHours);
      const enforceHours = openingHours?.enforce_hours !== false; // Default to true if not set
      
      if (!isTeacher && enforceHours && !withinHours) {
        console.log(`[Login] Outside opening hours (STRICT). Forcing Home mode.`);
        isHome = true;
        finalStationId = null;
      } else if (!isTeacher && !withinHours) {
        console.log(`[Login] Outside opening hours but in FLEXIBLE mode. Lab login allowed if geofence matches.`);
      }


      console.log(`[Login] Final Station ID: ${finalStationId}, isHome: ${isHome}, withinHours: ${withinHours}`);

      // 2. Session Management (Only for Academy/Lab sessions)
      // 2. Global Cleanup: Always terminate any existing active sessions for THIS USER
      await supabase.from('sessions').update({ check_out_time: now }).eq('user_id', user.id).is('check_out_time', null);

      if (!isHome) {
        // 3. Station Cleanup: If using a station, ensure it's free
        if (finalStationId) {
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

      localStorage.setItem('groovelab_user_id', user.id);
      setLoading(false);
      
      onLogin(user.id, isHome);
    } catch (err: any) {
      console.error('[Login] Finalize error:', err.message);
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
          const { data: rooms } = await supabase.from('rooms').select('*').eq('school_id', schoolId);
          setPrefetchedRooms(rooms);
          console.log(`[Login] Pre-fetched ${rooms?.length} rooms for school: ${schoolId}`);
        }
      } catch (e) {
        console.warn('[Login] Pre-fetch failed', e);
      }
    }
    prefetch();
  }, [effectiveStationId]);

  const handleScan = async (qrToken: string) => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      console.log('[Login] Starting scan for token:', qrToken);

      // 1. User finden
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('*, schools(*)')
        .eq('qr_token', qrToken)
        .single();

      if (userErr || !user) throw new Error('Nutzer nicht gefunden.');

      const schoolData = Array.isArray(user.schools) ? user.schools[0] : user.schools;
      
      // Ensure school_id is available for room lookups even if not directly on the user object
      if (!user.school_id && schoolData?.id) {
        user.school_id = schoolData.id;
      }

      // 2. Geofence Check (Simpel & Stabil)
      let isWithinAnyRoom = false;
      
      // KIOSK BYPASS: If we are scanning on a configured iPad station, we inherently know it's in the room!
      if (effectiveStationId) {
        console.log('[Login] Kiosk mode detected. Bypassing GPS check entirely for lightning fast login.');
        isWithinAnyRoom = true;
      } else {
        let finalUserPos = userPos;
        
        try {
          if (!finalUserPos) {
            console.log('[Login] No pre-fetched position, attempting quick fetch...');
            finalUserPos = await new Promise<{lat: number, lng: number} | null>((resolve) => {
              navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => resolve(null),
                { enableHighAccuracy: true, timeout: 3000, maximumAge: 60000 }
              );
            });
          }

          if (finalUserPos) {
            console.log(`[Geofence] User position: ${finalUserPos.lat}, ${finalUserPos.lng}`);
            // 1. Check Rooms (Multi-Point)
            const { data: rooms } = await supabase.from('rooms').select('*').eq('school_id', user.school_id);
            if (rooms) {
              for (const room of rooms) {
                const points = Array.isArray(room.geofence_points) ? room.geofence_points : [];
                const allCoords = [...points];
                if (room.latitude && room.longitude) allCoords.push({ lat: room.latitude, lng: room.longitude });
                
                for (const pt of allCoords) {
                  if (pt && pt.lat && pt.lng) {
                    const dist = getDistanceFromLatLonInM(finalUserPos.lat, finalUserPos.lng, Number(pt.lat), Number(pt.lng));
                    console.log(`[Geofence] Room "${room.name}" Point: ${Math.round(dist)}m away`);
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
                finalUserPos.lat, finalUserPos.lng, 
                Number(schoolData.latitude), Number(schoolData.longitude)
              );
              const radius = schoolData.geofence_radius_meters || 150;
              console.log(`[Geofence] School fallback: ${Math.round(distToSchool)}m away (Radius: ${radius}m)`);
              if (distToSchool < radius) {
                isWithinAnyRoom = true;
              }
            }
          } else {
            console.warn('[Geofence] No user position available (Permission denied or timeout)');
          }
        } catch (geoErr) {
          console.warn('[Login] Geolocation failed.', geoErr);
        }
      }

      console.log(`[Login] Scan successful. Geofence match: ${isWithinAnyRoom}`);
      
      // Automatically finalize based on geofence detection
      await finalizeLogin(user, effectiveStationId, isWithinAnyRoom);
    } catch (err: any) {
      console.error('[Login] Scan error:', err.message);
      setError(err.message);
      setLoading(false);
    }
  };

  const [geoDebug, setGeoDebug] = useState<any>(null);
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';


  return (
    <div style={{ 
      position: 'fixed',
      inset: 0,
      backgroundColor: '#ffffff', 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'Inter, system-ui, sans-serif',
      zIndex: 9999
    }}>
      
      <div className="loading-pulse" style={{
        width: '80px',
        height: '80px',
        background: '#f8fafc',
        borderRadius: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e2e8f0'
      }}>
        <Music size={40} color="#eab308" />
      </div>

      <h1 style={{ fontSize: '32px', fontWeight: 1000, color: '#0f172a', marginBottom: '8px', margin: 0, letterSpacing: '-0.02em' }}>GrooveLab</h1>
      <p style={{ color: '#64748b', textAlign: 'center', fontSize: '14px', marginBottom: '48px', maxWidth: '300px', lineHeight: '1.5', fontWeight: 600 }}>
        Halte deinen Ausweis vor die Kamera,<br/>um dich einzuloggen.
      </p>

      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: '#ffffff',
        borderRadius: '56px',
        padding: '32px',
        boxShadow: '0 40px 100px rgba(15, 23, 42, 0.08)',
        border: '1px solid #f1f5f9',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative'
      }}>
        <div style={{
          width: '100%',
          aspectRatio: '1/1',
          borderRadius: '40px',
          overflow: 'hidden',
          background: '#000',
          position: 'relative',
          boxShadow: '0 0 0 4px rgba(0,0,0,0.02)'
        }}>
          <Scanner
            key="groovelab-final-scanner"
            onScan={(result) => {
              const val = result?.[0]?.rawValue;
              if (val) handleScan(val);
            }}
            components={{ finder: true }}
            styles={{
              container: { width: '100%', height: '100%' },
              video: { width: '100%', height: '100%', objectFit: 'cover' }
            }}
            constraints={{ facingMode: 'user' }}
          />
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

        {error && (
          <div style={{ marginTop: '24px', background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', padding: '16px', borderRadius: '20px', fontSize: '13px', fontWeight: 800, textAlign: 'center', width: '100%' }}>
            {error}
          </div>
        )}


      </div>

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
                const uid = localStorage.getItem('groovelab_user_id');
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
                window.location.reload();
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
              window.location.reload();
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
          onMouseEnter={e => e.currentTarget.style.color = '#eab308'} 
          onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
        >
          Datenschutz
        </span>
        <span style={{ opacity: 0.5 }}>•</span>
        <span 
          onClick={() => setShowImpressum(true)} 
          style={{ cursor: 'pointer', transition: 'color 0.2s' }} 
          onMouseEnter={e => e.currentTarget.style.color = '#eab308'} 
          onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
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
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = '#e2e8f0'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#f1f5f9'; }}
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
                <p style={{ margin: 0 }}>Unsere Anwendung wird auf Servern externer Dienstleister gehostet, um einen sicheren und performanten Betrieb zu gewährleisten. Das Frontend wird über <strong>Vercel</strong> (Vercel Inc.) bereitgestellt, und die Datenbankinfrastruktur läuft über <strong>Supabase</strong> (Supabase Inc.). Mit beiden Dienstleistern wurden die gesetzlich vorgeschriebenen Verträge zur Auftragsverarbeitung (AV-Vertrag nach Art. 28 DSGVO) geschlossen, um den Schutz der Daten zu jeder Zeit zu gewährleisten.</p>
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
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = '#e2e8f0'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#f1f5f9'; }}
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

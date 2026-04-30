import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Music, Users, MapPin, Monitor, Tablet } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';

interface LoginScreenProps {
  onLogin: (userId: string, isHome?: boolean) => void;
  kioskStationId?: string | null;
}

// Haversine Formel zur Distanzberechnung in Metern
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Radius der Erde in Metern
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

export function LoginScreen({ onLogin, kioskStationId }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHomeMode, setIsHomeMode] = useState(false);

  const [busySessions, setBusySessions] = useState<any[]>([]);

  const [hasScanned, setHasScanned] = useState(false);
  const [showQuickSetup, setShowQuickSetup] = useState(false);
  const [setupRooms, setSetupRooms] = useState<any[]>([]);
  const [setupRoomId, setSetupRoomId] = useState('');
  const [setupStations, setSetupStations] = useState<any[]>([]);
  const [activeStationIds, setActiveStationIds] = useState<string[]>([]);
  const [showCoachConfirm, setShowCoachConfirm] = useState<{ user: any; stationId: string; isWithinAnyRoom: boolean } | null>(null);


  const handleRealScan = async (qrToken: string) => {
    if (loading || hasScanned) return;
    try {
      setHasScanned(true);
      setLoading(true);
      setError(null);

      // 1. User via QR Token suchen
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, school_id, role')
        .eq('qr_token', qrToken)
        .limit(1)
        .single();
        
      if (userError || !user) {
        throw new Error('Ungültiger QR-Code. Schüler nicht gefunden.');
      }

      // 2. Alle Räume der Schule laden
      const { data: rooms } = await supabase
        .from('rooms')
        .select('id, latitude, longitude, geofence_points')
        .eq('school_id', user.school_id);

      if (!rooms || rooms.length === 0) {
        // Falls gar keine Räume da sind, lassen wir den Login zu (oder Fehlermeldung?)
        // User will Geofencing, also ist ein fehlender Raum ein Konfigurationsfehler
        return;
      }

      // 3. Geofencing prüfen gegen ALLE Räume
      let isWithinAnyRoom = false;
      let minDistance = Infinity;

      // Optimierung: GPS nur EINMAL abfragen statt in der Schleife
      const userPos = await new Promise<{lat: number, lng: number} | null>((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      });

      if (userPos) {
        for (const room of rooms) {
          // Check legacy single point
          if (room.latitude && room.longitude) {
            const dist = getDistanceFromLatLonInM(userPos.lat, userPos.lng, room.latitude, room.longitude);
            if (dist < 20) isWithinAnyRoom = true;
            if (dist < minDistance) minDistance = dist;
          }

          // Check multi-points
          const points = Array.isArray(room.geofence_points) ? room.geofence_points : [];
          for (const pt of points) {
            const dist = getDistanceFromLatLonInM(userPos.lat, userPos.lng, pt.lat, pt.lng);
            if (dist < 20) isWithinAnyRoom = true;
            if (dist < minDistance) minDistance = dist;
          }
        }
      }

      if (!isWithinAnyRoom) {
        setIsHomeMode(true);
      } else {
        setIsHomeMode(false);
      }

      // 3. Login Validierung (Lehrer iPad Check)
      const stationId = localStorage.getItem('groovelab_station_id');
      if (stationId) {
        const { data: currentStation } = await supabase.from('stations').select('name').eq('id', stationId).single();
        if (currentStation?.name?.toLowerCase().includes('lehrer')) {
          if (user.role !== 'teacher' && user.role !== 'admin') {
            throw new Error('Dieses iPad ist nur für Lehrer reserviert.');
          }
        }
      }

      // 4. Radikaler Cleanup: Alle offenen Sessions dieses Users SOFORT schließen
      // Wir setzen die check_out_time auf jetzt, falls sie noch null ist
      await supabase
        .from('sessions')
        .update({ check_out_time: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('check_out_time', null);
        
      // 5. Neue Session starten
      // Wenn wir eine feste Station ID haben (Kiosk/Terminal), nutzen wir diese IMMER, 
      // um sicherzustellen dass der Schüler auf der Karte erscheint.
      // REGEL: Coaches werden gefragt, ob sie an einem iPad einchecken wollen.
      if ((user.role === 'teacher' || user.role === 'admin') && stationId) {
        setShowCoachConfirm({ user, stationId, isWithinAnyRoom });
        setLoading(false);
        return;
      }

      await finalizeLogin(user, stationId, isWithinAnyRoom);
      
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      setHasScanned(false);
    }
  };

  const finalizeLogin = async (user: any, stationId: string | null, isWithinAnyRoom: boolean, skipSession: boolean = false) => {
    try {
      if (!skipSession) {
        await supabase
          .from('sessions')
          .insert({
            user_id: user.id,
            station_id: stationId || (isWithinAnyRoom ? null : null), // stationId hat Vorrang
            check_in_time: new Date().toISOString()
          });
      }

      // 6. Erfolgreicher Login
      const isHome = stationId ? false : !isWithinAnyRoom;
      onLogin(user.id, isHome);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const simulateAdminLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.from('users').select('id').eq('role', 'admin').limit(1).single();
      if (error || !data) throw new Error('Kein Admin in der Datenbank gefunden.');
      onLogin(data.id);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const simulateTeacherLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.from('users').select('id').eq('role', 'teacher').limit(1).single();
      if (error || !data) throw new Error('Kein Lehrer in der Datenbank gefunden.');
      onLogin(data.id);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const startQuickSetup = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch the first school available
      const { data: school } = await supabase.from('schools').select('id').limit(1).single();
      if (!school) throw new Error('Keine Schule gefunden.');
      
      const { data: rooms } = await supabase.from('rooms').select('*').eq('school_id', school.id);
      if (!rooms || rooms.length === 0) throw new Error('Bitte erstelle zuerst einen Raum im Admin-Dashboard!');
      
      setSetupRooms(rooms);
      setSetupRoomId(rooms[0].id);

      // Lade alle existierenden Stationen
      const { data: stations } = await supabase.from('stations').select('*').in('room_id', rooms.map(r => r.id));
      setSetupStations(stations || []);

      // Lade aktive Sessions (nur die letzten 2 Minuten Heartbeat), um zu sehen welche iPads "besetzt" sind
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: activeSessions } = await supabase
        .from('sessions')
        .select('id, station_id, user_id, last_seen, users(first_name, last_name)')
        .is('check_out_time', null)
        .gt('last_seen', tenMinsAgo);
      setActiveStationIds(activeSessions?.map(s => s.station_id) || []);
      setBusySessions(activeSessions || []);

      setShowQuickSetup(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container flex-center" style={{ flexDirection: 'column', padding: '40px 20px', textAlign: 'center', background: '#f9fafb' }}>
      <div className="school-logo" style={{ width: 80, height: 80, borderRadius: 20, marginBottom: 24, boxShadow: '0 8px 24px rgba(234, 179, 8, 0.2)' }}>
        <Music size={40} />
      </div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Groovelab</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '0.875rem', maxWidth: '280px' }}>
        Halte deinen Studentenausweis vor die iPad-Kamera, um dich an diesem Platz einzuchecken.
      </p>

      <div className="glass-panel" style={{ width: '100%', maxWidth: '340px', padding: '16px', background: 'white', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Scanner Bereich */}
        <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: '24px', overflow: 'hidden', background: '#000', position: 'relative', border: '1px solid #f1f5f9' }}>
          {!hasScanned && (
            <Scanner 
              onScan={(result: any) => {
                const code = Array.isArray(result) ? result[0]?.rawValue : result;
                if (code) handleRealScan(code);
              }} 
              components={{
                zoom: false,
                torch: false,
                finder: true
              }}
            />
          )}
          
          {/* Animated Scan Line */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '2px',
            background: `linear-gradient(to right, transparent, var(--primary-color), transparent)`,
            boxShadow: `0 0 15px var(--primary-color)`,
            animation: 'scanLine 3s infinite linear',
            zIndex: 10
          }} />

          {(loading || hasScanned) && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, zIndex: 20 }}>
              Verifiziere GPS & Code...
            </div>
          )}
        </div>

        {error && <div style={{ color: '#ef4444', fontSize: '0.875rem', padding: '8px', background: '#fef2f2', borderRadius: '8px' }}>{error}</div>}
        
        {isHomeMode && (
          <div style={{ background: '#fef3c7', color: '#b45309', padding: '12px', borderRadius: '12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #fde68a' }}>
            <MapPin size={16} /> <strong>Home-Mode:</strong> Du bist nicht im Labor. Übung wird als Heimarbeit gewertet.
          </div>
        )}
        
        {!showQuickSetup && !localStorage.getItem('groovelab_station_id') && (
          <button 
            onClick={startQuickSetup}
            style={{ 
              width: '100%', 
              background: 'white', 
              border: '1px solid #e2e8f0', 
              padding: '16px', 
              borderRadius: '16px', 
              fontWeight: 800, 
              color: '#94a3b8', 
              fontSize: '0.85rem',
              cursor: 'pointer',
              marginTop: '16px'
            }}
          >
            iPad als Terminal einrichten
          </button>
        )}

        {showQuickSetup && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="glass-panel animation-slide-up" style={{ width: '100%', maxWidth: '400px', background: 'white', padding: '24px', borderRadius: '32px', textAlign: 'left' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Monitor size={24} color="var(--primary-color)" /> Schnell-Setup
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>Wähle den Raum und das entsprechende iPad aus.</p>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Raum auswählen</label>
                <select 
                  value={setupRoomId} 
                  onChange={(e) => setSetupRoomId(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem' }}
                >
                  {setupRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>

              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>iPad auswählen</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px', maxHeight: '240px', overflowY: 'auto', padding: '4px', marginBottom: '24px' }}>
                {setupStations.filter(s => s.room_id === setupRoomId).sort((a,b) => a.name.localeCompare(b.name, undefined, {numeric: true})).map(s => {
                  const isTeacherStation = s.name.toLowerCase().includes('lehrer');
                  const isActive = !isTeacherStation && activeStationIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={async () => {
                        if (isActive) {
                          const busy = busySessions.find(bs => bs.station_id === s.id);
                          const confirm = window.confirm(`Dieses iPad ist besetzt durch ${busy?.users?.first_name || 'jemanden'}. Möchtest du die alte Sitzung beenden und dieses iPad übernehmen?`);
                          if (!confirm) return;
                          await supabase.from('sessions').update({ check_out_time: new Date().toISOString() }).eq('id', busy?.id);
                        }
                        localStorage.setItem('groovelab_station_id', s.id);
                        window.location.reload();
                      }}
                      style={{
                        padding: '12px 6px',
                        borderRadius: '16px',
                        border: '2px solid',
                        borderColor: isActive ? '#ef4444' : '#e2e8f0',
                        background: isActive ? '#fef2f2' : (isTeacherStation ? '#fffbeb' : 'white'),
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease',
                        opacity: 1
                      }}
                    >
                      <Tablet size={20} color={isActive ? '#ef4444' : (isTeacherStation ? '#b45309' : 'var(--primary-color)')} />
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>{s.name}</div>
                      {isActive && (
                        <div style={{ fontSize: '0.55rem', color: '#ef4444', fontWeight: 800, textAlign: 'center' }}>
                          BESETZT DURCH<br/>{busySessions.find(bs => bs.station_id === s.id)?.users?.first_name?.toUpperCase() || 'JEMANDEN'}
                        </div>
                      )}
                      {isTeacherStation && !isActive && <div style={{ fontSize: '0.5rem', color: '#b45309', fontWeight: 800 }}>LEHRER</div>}
                    </button>
                  );
                })}
                {setupStations.filter(s => s.room_id === setupRoomId).length === 0 && (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Keine iPads in diesem Raum gefunden.</div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setShowQuickSetup(false)} style={{ flex: 1, padding: '14px', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 700, cursor: 'pointer' }}>Abbrechen</button>
              </div>
            </div>
          </div>
        )}

        {kioskStationId && (
          <div style={{ marginTop: '16px', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Kiosk Modus aktiv</span>
            <button onClick={() => {
              if (window.confirm('Kiosk Modus wirklich beenden?')) {
                localStorage.removeItem('groovelab_station_id');
                window.location.reload();
              }
            }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }}>Beenden</button>
          </div>
        )}

        {showCoachConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="glass-panel animation-slide-up" style={{ width: '100%', maxWidth: '400px', background: 'white', padding: '32px', borderRadius: '32px', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: '#fffbeb', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                 <Tablet size={32} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 1000, marginBottom: '12px', color: '#1e293b' }}>Check-in Modus</h2>
              <p style={{ fontSize: '0.95rem', color: '#64748b', marginBottom: '32px', lineHeight: 1.6 }}>
                Du bist als Coach erkannt. Möchtest du an diesem iPad einchecken oder nur als "Coach vor Ort" erscheinen?
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button 
                  onClick={() => finalizeLogin(showCoachConfirm.user, showCoachConfirm.stationId, showCoachConfirm.isWithinAnyRoom, false)}
                  style={{ width: '100%', padding: '16px', borderRadius: '16px', background: '#eab308', color: 'white', border: 'none', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(234, 179, 8, 0.3)' }}
                >
                  Am iPad einchecken
                </button>
                <button 
                  onClick={() => finalizeLogin(showCoachConfirm.user, showCoachConfirm.stationId, showCoachConfirm.isWithinAnyRoom, true)}
                  style={{ width: '100%', padding: '16px', borderRadius: '16px', background: '#f1f5f9', color: '#64748b', border: 'none', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}
                >
                  Nur Erscheinen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Music, Tablet } from 'lucide-react';

export function DeviceSetupScreen() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [activeStationIds, setActiveStationIds] = useState<string[]>([]);
  const [busySessions, setBusySessions] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: school, error: schoolError } = await supabase.from('schools').select('id').limit(1).single();
      if (schoolError) {
        console.error('Error fetching school:', schoolError);
        setError(`Schule konnte nicht geladen werden: ${schoolError.message}`);
        return;
      }
      if (!school) {
        setError('Keine Schule in der Datenbank gefunden.');
        return;
      }

      const { data: roomsData, error: roomsError } = await supabase.from('rooms').select('*').eq('school_id', school.id);
      if (roomsError) {
        console.error('Error fetching rooms:', roomsError);
        setError(`Räume konnten nicht geladen werden: ${roomsError.message}`);
      } else if (roomsData) {
        setRooms(roomsData);
        if (roomsData.length > 0) setSelectedRoomId(roomsData[0].id);
        else setError('Keine Räume für diese Schule gefunden.');
      }

      const { data: stationsData, error: stationsError } = await supabase.from('stations').select('*');
      if (stationsError) {
        console.error('Error fetching stations:', stationsError);
      } else if (stationsData) {
        setStations(stationsData);
      }

      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: activeSessions, error: sessionError } = await supabase
        .from('sessions')
        .select('id, station_id, user_id, last_seen, users(first_name, last_name)')
        .is('check_out_time', null)
        .gt('last_seen', tenMinsAgo);
      
      if (sessionError) {
        console.error('Error fetching sessions:', sessionError);
      } else if (activeSessions) {
        setActiveStationIds(activeSessions.map(s => s.station_id));
        setBusySessions(activeSessions);
      }

    } catch (err: any) {
      console.error('Unexpected setup error:', err);
      setError(`Ein unerwarteter Fehler ist aufgetreten: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStation = async (stationId: string) => {
    if (loading) return;
    const busySession = busySessions.find(s => s.station_id === stationId);
    if (busySession) {
      const confirm = window.confirm(`Dieses iPad ist besetzt durch ${busySession.users?.first_name || 'jemanden'}. Möchtest du die alte Sitzung beenden und dieses iPad übernehmen?`);
      if (!confirm) return;
      
      // Alte Sitzung beenden
      await supabase.from('sessions').update({ check_out_time: new Date().toISOString() }).eq('id', busySession.id);
    }

    localStorage.setItem('groovelab_station_id', stationId);
    window.location.reload();
  };

  const handleSkip = () => {
    localStorage.setItem('groovelab_station_id', 'skip');
    window.location.reload();
  };

  return (
    <div className="app-container flex-center" style={{ flexDirection: 'column', padding: '40px 20px', textAlign: 'center', background: '#f9fafb' }}>
      <div className="school-logo" style={{ width: 80, height: 80, borderRadius: 20, marginBottom: 24, boxShadow: '0 8px 24px rgba(234, 179, 8, 0.2)' }}>
        <Music size={40} />
      </div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Geräte-Setup</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '0.875rem', maxWidth: '280px' }}>
        Weise diesem Gerät eine feste Nummer zu, um es als Schüler-Terminal zu nutzen.
      </p>

      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '24px', background: 'white', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {error && <div style={{ color: '#ef4444', fontSize: '0.875rem', padding: '8px', background: '#fef2f2', borderRadius: '8px' }}>{error}</div>}
        
        <div style={{ textAlign: 'left' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Raum auswählen</label>
          <select 
            value={selectedRoomId} 
            onChange={(e) => setSelectedRoomId(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem' }}
          >
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        <div style={{ textAlign: 'left' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>iPad auswählen</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px', maxHeight: '240px', overflowY: 'auto', padding: '4px' }}>
            {stations.filter(s => s.room_id === selectedRoomId).sort((a,b) => a.name.localeCompare(b.name, undefined, {numeric: true})).map(s => {
              const isTeacherStation = s.name.toLowerCase().includes('lehrer');
              const isActive = !isTeacherStation && activeStationIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectStation(s.id)}
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
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: s.color || '#e5e7eb', marginBottom: '4px', border: '1px solid rgba(0,0,0,0.1)' }}></div>
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
            {stations.filter(s => s.room_id === selectedRoomId).length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Keine iPads in diesem Raum gefunden.</div>
            )}
          </div>
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button onClick={handleSkip} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
            Setup überspringen (nur Home-Mode)
          </button>
        </div>
      </div>
    </div>
  );
}

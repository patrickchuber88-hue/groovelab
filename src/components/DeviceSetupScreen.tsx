import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Music, Tablet, X, ShieldCheck } from 'lucide-react';

export function DeviceSetupScreen() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [activeStationIds, setActiveStationIds] = useState<string[]>([]);
  const [busySessions, setBusySessions] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Secret Master Admin click combo state
  const [logoClicks, setLogoClicks] = useState(0);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUsernameInput, setAdminUsernameInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Reset logo clicks after 3 seconds of inactivity
  React.useEffect(() => {
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
      setLoginError(null);
      
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

      console.log('[Setup] Master Admin logged in from Device Setup.');
      
      // Clean inputs
      setAdminUsernameInput('');
      setAdminPasswordInput('');
      setShowAdminModal(false);

      // Finalize login (reload to activate Master Admin Dashboard)
      sessionStorage.setItem('groovelab_user_id', user.id);
      window.location.reload();
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setAdminLoginLoading(false);
    }
  };


  React.useEffect(() => {
    const controller = new AbortController();
    fetchData(0, controller.signal);
    return () => controller.abort();
  }, []);

  const fetchData = async (retryCount = 0, signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`[Setup] Fetching school data and stations in parallel (Attempt ${retryCount + 1})...`);
      
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      const [roomsRes, stationsRes, sessionsRes] = await Promise.all([
        supabase.from('rooms').select('*').order('name'),
        supabase.from('stations').select('*').order('name'),
        supabase.from('sessions')
          .select('id, station_id, user_id, last_seen, users(first_name, last_name)')
          .is('check_out_time', null)
          .gt('last_seen', tenMinsAgo)
      ]);

      if (signal?.aborted) return;
      
      if (roomsRes.error && retryCount < 1 && roomsRes.error.message?.includes('Lock')) {
        setTimeout(() => fetchData(retryCount + 1, signal), 500);
        return;
      }

      let finalRooms = roomsRes.data || [];
      if (finalRooms.length === 0) {
        console.warn('[Setup] No rooms found in DB. Using stable fallback room.');
        finalRooms = [{
          id: '22222222-2222-2222-2222-222222222222',
          school_id: '11111111-1111-1111-1111-111111111111',
          name: 'Groovelab'
        }];
      }

      setRooms(finalRooms);
      
      const firstRoomId = finalRooms[0]?.id || '22222222-2222-2222-2222-222222222222';
      setSelectedRoomId(prev => prev || firstRoomId);

      let finalStations = stationsRes.data || [];
      if (finalStations.length === 0) {
        console.warn('[Setup] No stations found in DB. Using stable fallback stations.');
        finalStations = [
          { id: '33333333-3333-3333-3333-333333333331', name: 'iPad 1', room_id: firstRoomId },
          { id: '33333333-3333-3333-3333-333333333332', name: 'iPad 2', room_id: firstRoomId },
          { id: '33333333-3333-3333-3333-333333333333', name: 'iPad 3', room_id: firstRoomId },
          { id: '33333333-3333-3333-3333-333333333334', name: 'iPad 4', room_id: firstRoomId },
          { id: '33333333-3333-3333-3333-333333333335', name: 'iPad 5', room_id: firstRoomId },
          { id: '33333333-3333-3333-3333-333333333336', name: 'iPad 6', room_id: firstRoomId },
          { id: '33333333-3333-3333-3333-333333333337', name: 'iPad 7', room_id: firstRoomId },
          { id: '33333333-3333-3333-3333-333333333338', name: 'iPad 8', room_id: firstRoomId },
          { id: '33333333-3333-3333-3333-333333333339', name: 'Lehrer iPad', room_id: firstRoomId }
        ];
      }
      
      setStations(finalStations);

      if (sessionsRes.error) {
        console.error('Error fetching sessions:', sessionsRes.error);
      } else if (sessionsRes.data) {
        setActiveStationIds(sessionsRes.data.map(s => s.station_id));
        setBusySessions(sessionsRes.data);
      }

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Unexpected setup error:', err);
      setError(`Ein unerwarteter Fehler ist aufgetreten: ${err.message}`);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  const handleSelectStation = async (stationId: string) => {
    if (loading) return;
    const busySession = busySessions.find(s => s.station_id === stationId);
    if (busySession) {
      const confirm = window.confirm(`Dieses iPad ist besetzt. Möchtest du die alte Sitzung beenden und dieses iPad übernehmen?`);
      if (!confirm) return;
      
      // Alte Sitzung beenden
      await supabase.from('sessions').update({ check_out_time: new Date().toISOString() }).eq('id', busySession.id);
    }

    sessionStorage.removeItem('groovelab_user_id');
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
        style={{ fontSize: '1.5rem', marginBottom: '8px', cursor: 'default', userSelect: 'none' }}
      >
        Geräte-Setup
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '0.875rem', maxWidth: '280px' }}>
        Weise diesem Gerät eine feste Nummer zu, um es als Schüler-Terminal zu nutzen.
      </p>

      <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '32px', background: 'white', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {error && (
          <div style={{ color: '#ef4444', fontSize: '0.875rem', padding: '12px', background: '#fef2f2', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span>{error}</span>
            <button 
              onClick={() => fetchData()} 
              style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', alignSelf: 'center' }}
            >
              Erneut versuchen
            </button>
          </div>
        )}
        
        <div style={{ textAlign: 'left' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Raum auswählen</label>
          <select 
            value={rooms.find(r => r.id === selectedRoomId) ? selectedRoomId : (rooms[0]?.id || '')} 
            onChange={(e) => setSelectedRoomId(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem', color: '#1e293b', fontWeight: 600 }}
          >
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name || 'Unbenannter Raum'}</option>)}
          </select>
        </div>

        <div style={{ textAlign: 'left' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>iPad auswählen</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', padding: '4px' }}>
            {(() => {
              const currentRoomStations = stations.filter(s => s.room_id === (rooms.find(r => r.id === selectedRoomId) ? selectedRoomId : rooms[0]?.id));
              
              if (currentRoomStations.length === 0) {
                return <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Keine iPads in diesem Raum gefunden.</div>;
              }

              const renderStation = (idOrNum: number | 'lehrer', gridCol: string, gridRow: string) => {
                const s = currentRoomStations.find(st => {
                  if (idOrNum === 'lehrer') return st.name.toLowerCase().includes('lehrer');
                  const match = st.name.match(/\d+/);
                  return match && parseInt(match[0]) === idOrNum;
                });
                
                if (!s) return null;

                const isTeacherStation = s.name.toLowerCase().includes('lehrer');
                const isActive = !isTeacherStation && activeStationIds.includes(s.id);
                
                const getStationColor = (name: string | null | undefined) => {
                  if (!name) return '#64748b';
                  const lowerName = name.toLowerCase();
                  if (lowerName.includes('lehrer')) return '#22c55e'; // Green
                  const match = name.match(/\d+/);
                  if (!match) return '#64748b';
                  const num = parseInt(match[0]);
                  if (num === 1 || num === 2) return '#ef4444'; // Red
                  if (num === 3 || num === 4) return '#a855f7'; // Purple
                  if (num === 5 || num === 6) return '#3b82f6'; // Blue
                  if (num === 7 || num === 8) return '#eab308'; // Yellow
                  return '#64748b';
                };
                
                const sColor = getStationColor(s.name);

                return (
                  <button
                    key={s.id}
                    onClick={() => handleSelectStation(s.id)}
                    style={{
                      gridColumn: gridCol,
                      gridRow: gridRow,
                      padding: '12px 6px',
                      borderRadius: '16px',
                      border: '2px solid',
                      borderColor: isActive ? '#ef4444' : (sColor + '40'),
                      background: isActive ? '#fef2f2' : (isTeacherStation ? '#f0fdf4' : 'white'),
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                      opacity: 1
                    }}
                  >
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: sColor, marginBottom: '4px', border: '1px solid rgba(0,0,0,0.1)' }}></div>
                    <Tablet size={20} color={isActive ? '#ef4444' : sColor} />
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>{s.name}</div>
                    {isActive && (
                      <div style={{ fontSize: '0.55rem', color: '#ef4444', fontWeight: 800, textAlign: 'center' }}>
                        BESETZT
                      </div>
                    )}
                    {isTeacherStation && !isActive && <div style={{ fontSize: '0.5rem', color: '#22c55e', fontWeight: 800 }}>LEHRER</div>}
                  </button>
                );
              };

              const extraStations = currentRoomStations.filter(st => {
                const low = st.name.toLowerCase();
                if (low.includes('lehrer')) return false;
                const match = st.name.match(/\d+/);
                if (match && parseInt(match[0]) >= 1 && parseInt(match[0]) <= 8) return false;
                return true;
              });

              return (
                <>
                  {renderStation(3, '1', '1')}
                  {renderStation(4, '2', '1')}
                  {renderStation(5, '3', '1')}
                  {renderStation(6, '4', '1')}
                  
                  {renderStation(2, '1', '2')}
                  {renderStation('lehrer', '2 / span 2', '2')}
                  {renderStation(7, '4', '2')}
                  
                  {renderStation(1, '1', '3')}
                  {renderStation(8, '4', '3')}

                  {extraStations.map(s => {
                    const isActive = activeStationIds.includes(s.id);
                    const sColor = '#64748b';
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleSelectStation(s.id)}
                        style={{
                          gridColumn: 'span 1',
                          padding: '12px 6px',
                          borderRadius: '16px',
                          border: '2px solid',
                          borderColor: isActive ? '#ef4444' : (sColor + '40'),
                          background: isActive ? '#fef2f2' : 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: sColor, marginBottom: '4px', border: '1px solid rgba(0,0,0,0.1)' }}></div>
                        <Tablet size={20} color={isActive ? '#ef4444' : sColor} />
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>{s.name}</div>
                      </button>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button onClick={handleSkip} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
            Setup überspringen (nur Home-Mode)
          </button>
        </div>
      </div>

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
                setLoginError(null);
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
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = '#e2e8f0'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#f1f5f9'; }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eab308' }}>
                <ShieldCheck size={28} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a', textAlign: 'left' }}>Master-Admin Login</h2>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>GrooveLab Master Administration</p>
              </div>
            </div>

            <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ textAlign: 'left' }}>
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

              <div style={{ textAlign: 'left' }}>
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

              {loginError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', padding: '12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>
                  {loginError}
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 12px 28px rgba(15, 23, 42, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.15)';
                }}
              >
                {adminLoginLoading ? 'Verifiziere...' : 'Einloggen'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}

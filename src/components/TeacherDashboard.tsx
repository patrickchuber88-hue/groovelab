import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Monitor, Music, Award, Box, Plus, AlertCircle, User, Star, TrendingUp, Shield, Zap, Play, Info } from 'lucide-react';
import { TeacherDetailModal } from './TeacherDetailModal';
import { StudentDetailModal } from './StudentDetailModal';

const INSTRUMENT_ICONS: Record<string, string> = { Guitar: '🎸', Bass: '🎸', Drums: '🥁', Keys: '🎹', Vocals: '🎤' };
const brandColor = 'var(--primary-color)';

interface TeacherDashboardProps {
  userId: string;
  onLogout?: () => void;
  locationMode?: 'lab' | 'home';
  hideHeader?: boolean;
  viewMode?: 'admin' | 'student';
  onTabChange?: (tab: string) => void;
}

export function TeacherDashboard({ userId, onLogout, locationMode = 'lab', hideHeader = false, viewMode = 'admin', onTabChange }: TeacherDashboardProps) {
  const [teacher, setTeacher] = useState<any>(null);
  const [stations, setStations] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [wallSongs, setWallSongs] = useState<any[]>([]);
  const [lastActivity, setLastActivity] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [ticker, setTicker] = useState(0);
  const [selectedCoachProfile, setSelectedCoachProfile] = useState<any>(null);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<any>(null);

  useEffect(() => {
    const interval = setInterval(() => setTicker(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    // 1. Fetch Teacher Info
    const { data: tData } = await supabase.from('users').select('*, schools(*)').eq('id', userId).single();
    setTeacher(tData);

    if (tData?.school_id) {
      // 2. Fetch Rooms and Stations for this school
      const { data: rData } = await supabase.from('rooms').select('id').eq('school_id', tData.school_id);
      const roomIds = rData?.map(r => r.id) || [];
      
      const { data: sData } = await supabase
        .from('stations')
        .select('*')
        .in('room_id', roomIds)
        .order('name');
      setStations(sData || []);

      // 3. Fetch ALL Active Sessions for this school safely
      const { data: sessData, error: sessErr } = await supabase
        .from('sessions')
        .select('*, users!inner(*), stations(*)')
        .is('check_out_time', null)
        .eq('users.school_id', tData.school_id);
      
      if (sessErr) {
        console.error("Session Fetch Error:", sessErr);
      }
      
      // Ensure users is an object (handle Supabase returning arrays sometimes)
      const activeSess = (sessData || []).map(s => ({
        ...s,
        users: Array.isArray(s.users) ? s.users[0] : s.users,
        stations: Array.isArray(s.stations) ? s.stations[0] : s.stations
      }));
      
      setActiveSessions(activeSess);

      // 4. Fetch ALL Coaches/Admins of the school to check heartbeat
      const { data: allCoaches } = await supabase
        .from('users')
        .select('*')
        .in('role', ['teacher', 'admin'])
        .eq('school_id', tData.school_id);

      // A coach is "active" if they have an active session OR were seen in the last 5 minutes
      const fiveMinsAgo = new Date(Date.now() - 5 * 60000).toISOString();
      const activeCoaches = (allCoaches || []).filter(c => {
        const hasSession = activeSess.some(s => s.user_id === c.id);
        const isRecentlySeen = c.last_seen && c.last_seen > fiveMinsAgo;
        return hasSession || isRecentlySeen;
      });
      
      setCoaches(activeCoaches.map(c => ({
        id: c.id,
        users: c,
        session: activeSess.find(s => s.user_id === c.id)
      })));

      // 5. Fetch Wall Songs (Band Matching)
      const { data: skillData } = await supabase
        .from('user_song_skills')
        .select('*, users!inner(school_id), songs(*)')
        .eq('users.school_id', tData.school_id)
        .eq('is_stage_ready', true);

      const grouped: Record<string, any> = {};
      skillData?.forEach(s => {
        if (!grouped[s.song_id]) {
          grouped[s.song_id] = { ...s.songs, counts: { Guitar: 0, Bass: 0, Drums: 0, Keys: 0, Vocals: 0 } };
        }
        grouped[s.song_id].counts[s.instrument] = (grouped[s.song_id].counts[s.instrument] || 0) + 1;
      });
      setWallSongs(Object.values(grouped).filter(s => Object.values(s.counts).some(c => (c as number) > 0)));

      // 6. Challenge Submissions (>90% progress)
      const { data: subData } = await supabase
        .from('user_song_skills')
        .select('*, users!inner(*), songs!inner(*)')
        .eq('users.school_id', tData.school_id)
        .eq('is_pending_approval', true)
        .order('created_at', { ascending: false });
      
      setSubmissions(subData || []);
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('Wirklich alle aktiven iPad-Sessions beenden?')) return;
    const sessionIds = activeSessions.map(s => s.id);
    if (sessionIds.length > 0) {
      const { error } = await supabase.from('sessions').update({ check_out_time: new Date().toISOString() }).in('id', sessionIds);
      if (error) alert('Fehler: ' + error.message);
      else fetchData();
    }
  };

  const handleApproveSubmission = async (subId: string) => {
    const { error } = await supabase.from('user_song_skills').update({ is_pending_approval: false, is_stage_ready: true }).eq('id', subId);
    if (error) alert(error.message);
    else fetchData();
  };

  const handleRejectSubmission = async (subId: string) => {
    const { error } = await supabase.from('user_song_skills').update({ is_pending_approval: false, progress_percent: 85 }).eq('id', subId);
    if (error) alert(error.message);
    else fetchData();
  };

  if (!teacher) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b', fontWeight: 600 }}>Lade Zentrale...</div>;

  const getStationUser = (stationId: string, stationName: string) => {
    return activeSessions.find(s => 
      s.station_id === stationId || 
      (s.stations?.name && s.stations.name.toLowerCase() === stationName.toLowerCase())
    );
  };

  const getStationByNumber = (num: number) => stations.find(s => s.name.includes(num.toString()));

  const StationNode = ({ num, color, inst }: { num: number, color: string, inst: string }) => {
    const station = getStationByNumber(num);
    const stationName = station?.name || `iPad ${num}`;
    const sess = getStationUser(station?.id || '', stationName);
    const isMe = sess?.user_id === userId;
    
    let activeMins = 0;
    if (sess?.check_in_time) {
      activeMins = Math.floor((new Date().getTime() - new Date(sess.check_in_time).getTime()) / 60000);
      activeMins = Math.max(0, activeMins);
    }

    const isActive = !!sess;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Music size={14} /> {inst}
        </div>
        
        <div 
          className="glass-panel" 
          onClick={() => {
            if (isActive) {
              if (sess?.users?.role === 'teacher' || sess?.users?.role === 'admin') {
                setSelectedCoachProfile(sess.users);
              } else {
                setSelectedStudentProfile(sess.users);
              }
            }
          }}
          style={{ 
            background: isActive ? `${color}05` : 'white', 
            padding: '20px', 
            minHeight: '180px', 
            height: '100%',
            display: 'flex', 
            flexDirection: 'column', 
            position: 'relative', 
            border: isMe ? `2px solid #ef4444` : isActive ? `2px solid ${color}` : '1px solid #f1f5f9',
            boxShadow: isMe ? '0 10px 25px -5px rgba(239, 68, 68, 0.2)' : isActive ? `0 10px 25px -5px ${color}30` : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            borderRadius: '24px',
            cursor: isActive ? 'pointer' : 'default',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          onMouseEnter={(e) => {
            if (isActive) {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = isMe ? '0 15px 35px -5px rgba(239, 68, 68, 0.3)' : `0 15px 35px -5px ${color}50`;
            }
          }}
          onMouseLeave={(e) => {
            if (isActive) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = isMe ? '0 10px 25px -5px rgba(239, 68, 68, 0.2)' : `0 10px 25px -5px ${color}30`;
            }
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'auto' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: isMe ? '#ef4444' : isActive ? color : '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {stationName} {isMe && '(DU)'}
            </div>
            {isMe && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></div>}
            {isActive && viewMode === 'admin' && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleLogoutUser(sess.id); }}
                style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', color: '#ef4444', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Ausloggen"
              >
                Logout
              </button>
            )}
          </div>

          {sess ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: 'auto', marginBottom: 'auto' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '20px', overflow: 'hidden', border: `3px solid ${color}`, boxShadow: `0 8px 24px ${color}30`, flexShrink: 0 }}>
                <img src={sess.users?.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 900, fontSize: '1.2rem', color: '#1e293b', lineHeight: 1.1 }}>{sess.users?.first_name}</div>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: color, marginTop: '2px' }}>{activeMins}m <span style={{ opacity: 0.7, fontWeight: 600, color: '#64748b' }}>übt</span></div>
                {sess.songs?.title && (
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {sess.songs.title}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ margin: 'auto', color: '#e2e8f0', fontWeight: 900, fontSize: '0.8rem', letterSpacing: '0.1em' }}>BEREIT</div>
          )}
        </div>
      </div>
    );
  };

  const CoachesNode = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 12px #22c55e' }}></span>
        Coaches vor Ort
      </div>
      <div style={{ 
        position: 'relative', 
        width: '200px', 
        height: '200px', 
        borderRadius: '50%', 
        background: 'rgba(255, 255, 255, 0.7)', 
        backdropFilter: 'blur(10px)',
        border: '2px dashed #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,0.03)'
      }}>
        {coaches.map((c, idx) => {
          // Calculate position for multiple coaches (slight offset and staggered vertical)
          const total = coaches.length;
          const offset = total > 1 ? (idx - (total - 1) / 2) * 60 : 0;
          const verticalOffset = total > 1 ? (idx % 2 === 0 ? -15 : 15) : 0;
          
          return (
            <div 
              key={c.id} 
              onClick={() => setSelectedCoachProfile(c.users)}
              style={{ 
                position: 'absolute',
                transform: `translate(${offset}px, ${verticalOffset}px)`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: 10 - idx,
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = `translate(${offset}px, ${verticalOffset}px) scale(1.1)`;
                e.currentTarget.style.zIndex = '20';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = `translate(${offset}px, ${verticalOffset}px) scale(1)`;
                e.currentTarget.style.zIndex = (10 - idx).toString();
              }}
            >
              <div style={{ 
                width: '76px', 
                height: '76px', 
                borderRadius: '50%', 
                border: '4px solid white', 
                boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                overflow: 'hidden',
                background: '#f8fafc',
                position: 'relative'
              }}>
                <img src={c.users?.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', bottom: 4, right: 4, background: '#22c55e', border: '2px solid white', width: '12px', height: '12px', borderRadius: '50%' }}></div>
              </div>
              <div style={{ 
                marginTop: '8px',
                background: 'white',
                padding: '5px 12px',
                borderRadius: '20px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                border: '1px solid #f1f5f9',
                textAlign: 'center',
                minWidth: '90px'
              }}>
                <div style={{ fontWeight: 900, color: '#1e293b', fontSize: '0.8rem', lineHeight: 1.1 }}>
                  {c.users?.first_name} {c.users?.last_name?.[0]}.
                </div>
                <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', marginTop: '2px', letterSpacing: '0.02em' }}>
                  {c.session?.stations?.name || 'Mobil'}
                </div>
              </div>
            </div>
          );
        })}
        {coaches.length === 0 && (
          <div style={{ color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 700, textAlign: 'center', padding: '20px' }}>Bereit</div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ padding: hideHeader ? '0' : '20px 40px', width: '100%', maxWidth: '1800px', margin: '0 auto', background: hideHeader ? 'transparent' : '#f8fafc', minHeight: '100vh' }}>
      {selectedCoachProfile && (
        <TeacherDetailModal teacher={selectedCoachProfile} onClose={() => setSelectedCoachProfile(null)} />
      )}
      {selectedStudentProfile && (
        <StudentDetailModal student={selectedStudentProfile} onClose={() => setSelectedStudentProfile(null)} />
      )}
      {!hideHeader && (
        <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.03em', color: '#1e293b', marginBottom: '4px' }}>Live Lab</h1>
            <p style={{ color: '#64748b', fontWeight: 600, fontSize: '0.95rem' }}>
              MUSÄK - Groovelab Academy • Management Dashboard
            </p>
          </div>
          {viewMode === 'admin' && onLogout && (
            <button onClick={onLogout} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '12px 24px', borderRadius: '12px', fontWeight: 700, color: '#ef4444', cursor: 'pointer' }}>Zentrale schließen</button>
          )}
        </header>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px', alignItems: 'start' }}>
        {/* Left: Main Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '32px' }}>
          {/* Top Row */}
          <StationNode num={3} color="#a855f7" inst="E-Piano" />
          <StationNode num={4} color="#a855f7" inst="E-Piano" />
          <StationNode num={5} color="#3b82f6" inst="E-Drum" />
          <StationNode num={6} color="#3b82f6" inst="E-Drum" />

          {/* Spacer / Tisch Links Title */}
          <div style={{ gridColumn: '1', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: '0' }}>{'> TISCH LINKS'}</div>
          <div style={{ gridColumn: '2 / span 2' }}></div>
          <div style={{ gridColumn: '4', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: '0' }}>{'> TISCH RECHTS'}</div>

          {/* Tisch Links Column */}
          <div style={{ gridColumn: '1', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <StationNode num={2} color="#ef4444" inst="E-Gitarre" />
            <StationNode num={1} color="#ef4444" inst="E-Gitarre" />
          </div>

          {/* Coaches Column (Spans 2 columns, centered) */}
          <div style={{ gridColumn: '2 / span 2', display: 'flex', justifyContent: 'center', alignItems: 'center', paddingBottom: '0' }}>
            <div style={{ width: viewMode === 'admin' ? '80%' : '50%' }}>
              <CoachesNode />
            </div>
          </div>

          {/* Tisch Rechts Column */}
          <div style={{ gridColumn: '4', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <StationNode num={7} color="#eab308" inst="Bass" />
            <StationNode num={8} color="#eab308" inst="Bass" />
          </div>
        </div>

        {/* Right Sidebar - Shown to everyone, but content varies */}
        {(viewMode === 'admin' || viewMode === 'student') && (
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Band Match Alarm */}
          <div style={{ background: 'linear-gradient(135deg, #fef08a, #fde047)', borderRadius: '24px', padding: '24px', boxShadow: '0 10px 25px -5px rgba(250, 204, 21, 0.3)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#854d0e', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 20px 0' }}>
              <div style={{ background: '#ca8a04', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zap size={18} /></div>
              Band Match Alarm! <Zap size={18} color="#ca8a04" />
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {wallSongs.map(song => (
                <div key={song.id} style={{ background: 'white', borderRadius: '16px', padding: '16px' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>{song.artist}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>{song.title}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ca8a04' }}>
                      {String((Object.values(song.counts) as number[]).reduce((a, b) => a + b, 0))} Musiker bereit
                    </div>
                    <button onClick={() => alert('Band-Matching Funktion wird in Kürze freigeschaltet!')} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}>
                      Beitreten
                    </button>
                  </div>
                </div>
              ))}
              {wallSongs.length === 0 && (
                <div style={{ textAlign: 'center', color: '#a16207', fontWeight: 700, fontSize: '0.85rem' }}>Keine Alarme derzeit.</div>
              )}
            </div>
          </div>

          {/* Challenge Pipeline - The most important teacher action */}
          <div className="glass-panel" style={{ 
            background: submissions.length > 0 ? 'linear-gradient(145deg, #ffffff, #f0fdf4)' : 'white', 
            padding: '24px', 
            borderRadius: '32px', 
            border: submissions.length > 0 ? `2px solid #10b981` : '1px solid #f1f5f9',
            boxShadow: submissions.length > 0 ? '0 15px 35px -5px rgba(16, 185, 129, 0.15)' : '0 4px 12px rgba(0,0,0,0.03)',
            animation: submissions.length > 0 ? 'border-pulse-green 3s infinite' : 'none'
          }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 900, color: submissions.length > 0 ? '#10b981' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 20px 0' }}>
              <TrendingUp size={20} /> Challenge Pipeline
              {submissions.length > 0 && <span className="pulse" style={{ background: '#10b981', width: '8px', height: '8px', borderRadius: '50%' }}></span>}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {submissions.map(sub => (
                <div key={sub.id} className="glass-panel" style={{ padding: '20px', background: 'white', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '16px', overflow: 'hidden', border: '2px solid #f1f5f9' }}>
                      <img src={sub.users?.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900, fontSize: '1rem', color: '#1e293b' }}>{sub.users?.first_name} {sub.users?.last_name?.[0]}.</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {INSTRUMENT_ICONS[sub.instrument]} {sub.instrument} • {sub.songs?.title}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => handleApproveSubmission(sub.id)} 
                      style={{ flex: 2, background: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '14px', fontSize: '0.8rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
                    >
                      <Award size={18} /> Bestätigen
                    </button>
                    <button 
                      onClick={() => handleRejectSubmission(sub.id)} 
                      style={{ flex: 1, background: '#f8fafc', color: '#ef4444', border: '1px solid #fee2e2', padding: '12px', borderRadius: '14px', fontSize: '0.8rem', fontWeight: 900, cursor: 'pointer' }}
                    >
                      Refus
                    </button>
                  </div>
                </div>
              ))}
              {submissions.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 20px' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '12px', opacity: 0.5 }}>⚡</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 700 }}>Keine offenen Challenges. Alles unter Kontrolle!</div>
                </div>
              )}
            </div>
            <style>{`
              @keyframes border-pulse-green {
                0% { border-color: #10b98122; }
                50% { border-color: #10b981aa; }
                100% { border-color: #10b98122; }
              }
            `}</style>
          </div>

          {/* Stage Ready Bands */}
          <div className="glass-panel" style={{ background: 'white', padding: '24px', borderRadius: '24px' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0' }}>
              <Award size={16} /> STAGE READY BANDS
            </h3>
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
              Noch keine Bands startbereit.
            </div>
          </div>

          {/* Lab Auslastung (Shown for everyone) & Functions (Admin only) */}
          <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'admin' ? '1fr 1fr' : '1fr', gap: '16px' }}>
            <div className="glass-panel" style={{ background: 'white', padding: '16px', borderRadius: '16px', textAlign: 'center' }}>
              <Monitor size={20} color={brandColor} style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Lab Auslastung</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>{activeSessions.length}/9</div>
            </div>
            
            {viewMode === 'admin' && (
              <div onClick={handleLogoutAll} className="glass-panel" style={{ background: 'white', padding: '16px', borderRadius: '16px', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <User size={20} color="#ef4444" style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>Alle Ausloggen</div>
              </div>
            )}
          </div>
        </aside>
        )}
      </div>
    </div>
  );
}

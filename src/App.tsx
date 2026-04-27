import { useState, useEffect } from 'react';
import { Music, AlertCircle, Play, Library, Shield, LogOut, Award, Users, Monitor, X, Camera, QrCode, Plus, ExternalLink, BarChart as LucideBarChart, Star } from 'lucide-react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart as RechartsBarChart, Bar, XAxis, Tooltip, Cell
} from 'recharts';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { supabase } from './lib/supabase';
import { LoginScreen } from './components/LoginScreen';
import { QRCodeModal } from './components/QRCodeModal';
import { DeviceSetupScreen } from './components/DeviceSetupScreen';
import { TeacherDashboard } from './components/TeacherDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ElegantBirthdayPicker } from './components/ElegantBirthdayPicker';
import { TeacherDetailModal } from './components/TeacherDetailModal';
import './App.css';

const INSTRUMENT_ICONS: Record<string, string> = { Guitar: '🎸', Bass: '🎸', Drums: '🥁', Keys: '🎹', Vocals: '🎤' };
const INSTRUMENT_COLORS: Record<string, string> = {
  Guitar: '#f59e0b', // Amber
  Bass: '#8b5cf6',   // Violet
  Drums: '#3b82f6',  // Blue
  Keys: '#ec4899',   // Pink
  Vocals: '#10b981'  // Emerald
};
const brandColor = 'var(--primary-color)';


function GroupedSongCard({ songGroup, onUpdateProgress, onSubmitForApproval, isBandReady }: any) {
  const [activeInst, setActiveInst] = useState(songGroup.skills[0].instrument);
  const activeSkill = songGroup.skills.find((s: any) => s.instrument === activeInst) || songGroup.skills[0];

  return (
    <div className={`glass-panel exercise-card animation-slide-up ${isBandReady ? 'band-ready' : ''}`} style={{ padding: '24px', position: 'relative', overflow: 'hidden', borderLeft: isBandReady ? '4px solid #f59e0b' : '' }}>
      {isBandReady && (
        <div style={{ position: 'absolute', top: 0, right: 0, background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', color: 'white', padding: '4px 12px', fontSize: '0.65rem', fontWeight: 900, borderRadius: '0 0 0 12px', boxShadow: '0 2px 10px rgba(245, 158, 11, 0.3)', zIndex: 5, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Award size={12} /> Ready to Gig
        </div>
      )}
      <div className="exercise-header" style={{ marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{songGroup.artist}</div>
          <div className="exercise-title" style={{ fontSize: '1.25rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {songGroup.title}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {songGroup.media_link && (
                <a href={songGroup.media_link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', display: 'flex', alignItems: 'center' }} title="PDF Noten">
                  <ExternalLink size={18} />
                </a>
              )}
              {songGroup.tomplay_url && (
                <a href={songGroup.tomplay_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px', background: '#eff6ff', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, textDecoration: 'none' }}>
                  <Music size={14} /> Tomplay
                </a>
              )}
            </div>
          </div>
        </div>
        <span className="exercise-progress-text" style={{ color: 'var(--primary-color)', fontSize: '1.5rem' }}>{activeSkill.progress}%</span>
      </div>
      
      {/* Instrument Tabs */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        {songGroup.skills.map((skill: any) => {
          const isAct = skill.instrument === activeInst;
          return (
            <div key={skill.instrument} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 900, color: isAct ? (INSTRUMENT_COLORS[skill.instrument] || brandColor) : '#94a3b8', marginBottom: '-2px' }}>
                {skill.progress}%
              </div>
              <button
                onClick={() => setActiveInst(skill.instrument)}
                style={{
                  width: '48px', height: '48px', borderRadius: '50%', border: 'none',
                  background: isAct ? (INSTRUMENT_COLORS[skill.instrument] || brandColor) : '#f3f4f6',
                  color: isAct ? 'white' : 'var(--text-muted)',
                  fontSize: '1.5rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isAct ? `0 4px 12px ${INSTRUMENT_COLORS[skill.instrument] || brandColor}4d` : 'none',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                {INSTRUMENT_ICONS[skill.instrument] || '🎵'}
                {skill.progress >= 90 && (
                  <div style={{ position: 'absolute', top: -2, right: -2, background: '#f59e0b', width: 14, height: 14, borderRadius: '50%', border: '2px solid white' }}></div>
                )}
              </button>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: isAct ? '#1e293b' : '#94a3b8', textTransform: 'uppercase' }}>
                {skill.instrument === 'Guitar' ? 'Gitarre' : skill.instrument}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
        
        {/* Visual Threshold and Slider Wrapper */}
        <div style={{ position: 'relative', height: '40px', display: 'flex', alignItems: 'center' }}>
          {/* 90% Threshold Marker */}
          <div style={{ position: 'absolute', left: '90%', top: '0', bottom: '0', width: '2px', background: '#f59e0b', zIndex: 1, opacity: 0.5 }} />
          <div style={{ position: 'absolute', left: '90%', top: '-25px', transform: 'translateX(-50%)', fontSize: '0.65rem', color: '#b45309', fontWeight: 800, background: '#fef3c7', padding: '2px 8px', borderRadius: '100px', whiteSpace: 'nowrap', zIndex: 5 }}>
            Stage Ready (90%)
          </div>

          {/* Real Slider */}
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={activeSkill.progress} 
            onChange={(e) => !activeSkill.is_pending_approval && onUpdateProgress(activeSkill.id, parseInt(e.target.value))}
            style={{ 
              width: '100%', 
              height: '32px',
              accentColor: INSTRUMENT_COLORS[activeSkill.instrument] || brandColor, 
              cursor: activeSkill.is_pending_approval ? 'not-allowed' : 'pointer', 
              zIndex: 10,
              background: 'transparent',
              appearance: 'none',
              margin: 0
            }}
            disabled={activeSkill.is_pending_approval}
          />

          {/* Visual Track (Underneath) */}
          <div style={{ position: 'absolute', left: 0, right: 0, height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden', zIndex: 2 }}>
             <div style={{ width: `${activeSkill.progress}%`, height: '100%', background: `linear-gradient(90deg, ${INSTRUMENT_COLORS[activeSkill.instrument] || brandColor}, #fbbf24)`, transition: 'width 0.1s linear' }}></div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 900, color: INSTRUMENT_COLORS[activeSkill.instrument] || brandColor }}>
            {activeSkill.progress}% geschafft
          </span>
        </div>
        
        {activeSkill.progress >= 90 && activeSkill.locked && !activeSkill.is_pending_approval && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--status-warning)', display: 'flex', alignItems: 'center', gap: '6px', background: '#fffbeb', padding: '8px 12px', borderRadius: '8px' }}>
              <AlertCircle size={14} />
              Du bist bereit! Klicke unten, um dem Lehrer bescheid zu geben.
            </div>
            <button 
              onClick={() => onSubmitForApproval(activeSkill)}
              style={{ background: INSTRUMENT_COLORS[activeSkill.instrument] || brandColor, color: 'white', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '1rem', boxShadow: `0 4px 12px ${(INSTRUMENT_COLORS[activeSkill.instrument] || brandColor)}4d` }}
            >
              Song beim Lehrer einreichen 🎉
            </button>
          </div>
        )}

        {activeSkill.is_pending_approval && (
           <div style={{ fontSize: '0.875rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', background: '#fffbeb', padding: '12px 16px', borderRadius: '12px', fontWeight: 600, border: '1px solid #fde68a' }}>
             <div className="status-dot" style={{ background: '#f59e0b', animation: 'pulse 1.5s infinite' }}></div>
             Lehrer wurde benachrichtigt – Mach dich bereit!
           </div>
        )}

        {!activeSkill.locked && activeSkill.progress === 100 && (
          <div style={{ fontSize: '0.875rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', background: '#dcfce7', padding: '8px 12px', borderRadius: '8px', fontWeight: 600 }}>
            <Award size={16} />
            Stage Ready! 🎓
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(() => localStorage.getItem('groovelab_user_id'));
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [totalPresenceMins, setTotalPresenceMins] = useState(0);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [userSongs, setUserSongs] = useState<any[]>([]);
  const [wallSongs, setWallSongs] = useState<any[]>([]);
  const [globalSongs, setGlobalSongs] = useState<any[]>([]);
  const [activeStudentTab, setActiveStudentTab] = useState<'practice' | 'repertoire' | 'library' | 'matching' | 'team' | 'profile'>('profile');
  const [showQR, setShowQR] = useState(false);
  const [showConfetti, setShowConfetti] = useState<any>(null);
  const [bandModalData, setBandModalData] = useState<any>(null);
  const [selectedEqCat, setSelectedEqCat] = useState('E-Gitarre');
  const [locationMode, setLocationMode] = useState<'lab' | 'home'>(() => (localStorage.getItem('groovelab_location_mode') as 'lab' | 'home') || 'home');
  const [personalRejections] = useState<any[]>([]);
  const [teachers] = useState<any[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [studentActivity, setStudentActivity] = useState<any[]>([]);
  const { width, height } = useWindowSize();
  
  // Synchronous read to avoid flicker
  const [stationIdFromStorage] = useState(() => localStorage.getItem('groovelab_station_id'));

  useEffect(() => {
    console.log('--- Groovelab Diagnostics ---');
    console.log('Base Origin:', window.location.origin);
    console.log('User Agent:', navigator.userAgent);
    const imgTest = new Image();
    imgTest.onload = () => console.log('Asset Check: avatar_ghost.jpg loaded successfully');
    imgTest.onerror = () => console.warn('Asset Check: avatar_ghost.jpg FAILED to load at root');
    imgTest.src = '/avatar_ghost.jpg';
  }, []);
  const isKioskMode = stationIdFromStorage && stationIdFromStorage !== 'skip';

  useEffect(() => {
    if (loggedInUserId) {
      fetchDashboardData(loggedInUserId);
    }
  }, [loggedInUserId]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (session?.id) {
        // Best effort synchronous cleanup
        supabase.from('sessions').update({ check_out_time: new Date().toISOString() }).eq('id', session.id).then();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [session]);

  const fetchDashboardData = async (userId: string) => {
    try {
      setLoading(true);
      
      const { data: userData } = await supabase
        .from('users')
        .select('*, schools(*)')
        .eq('id', userId)
        .single();
        
      setUser(userData);

      if (userData?.role === 'student') {
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('*, stations(name)')
          .eq('user_id', userId)
          .order('check_in_time', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        setSession(sessionData);

        // Lade alle vergangenen Sessions für die Gesamt-Minuten
        const { data: allSessions } = await supabase
          .from('sessions')
          .select('check_in_time, check_out_time')
          .eq('user_id', userId);
        
        if (allSessions) {
          const totalMins = allSessions.reduce((acc, s) => {
            const start = new Date(s.check_in_time);
            const end = s.check_out_time ? new Date(s.check_out_time) : new Date();
            const diff = Math.floor((end.getTime() - start.getTime()) / 60000);
            return acc + Math.max(0, diff);
          }, 0);
          setTotalPresenceMins(totalMins);
        }

        // Lade persönliche Song-Skills
        const { data: skillsData } = await supabase
          .from('user_song_skills')
          .select(`
            id,
            progress_percent,
            is_stage_ready,
            is_pending_approval,
            instrument,
            songs (
              id,
              title,
              artist,
              media_link,
              tomplay_url
            )
          `)
          .eq('user_id', userId);

        if (skillsData) {
          const formattedSongs = skillsData.map((p: any) => ({
            id: p.id,
            song_id: p.songs.id,
            title: p.songs.title,
            artist: p.songs.artist,
            progress: p.progress_percent,
            instrument: p.instrument,
            locked: !p.is_stage_ready,
            is_pending_approval: p.is_pending_approval,
            media_link: p.songs.media_link,
            tomplay_url: p.songs.tomplay_url
          }));
          setUserSongs(formattedSongs);
        }

        // Lade globale Stage Ready Wall Daten (Band Matching)
        const { data: wallData } = await supabase
          .from('songs')
          .select(`
            id,
            artist,
            title,
            media_link,
            user_song_skills!inner (
              instrument,
              is_stage_ready
            )
          `)
          .eq('school_id', userData.school_id)
          .eq('user_song_skills.is_stage_ready', true);

        if (wallData) {
          const processedWall = wallData.map((song: any) => {
            const counts = { Guitar: 0, Bass: 0, Drums: 0, Keys: 0, Vocals: 0 } as Record<string, number>;
            song.user_song_skills.forEach((skill: any) => {
              if (counts[skill.instrument] !== undefined) counts[skill.instrument]++;
            });
            return {
              id: song.id,
              artist: song.artist,
              title: song.title,
              media_link: song.media_link,
              counts
            };
          });
          setWallSongs(processedWall);
        }

        // Lade alle Songs der Schule für die Bibliothek
        const { data: songsData } = await supabase
          .from('songs')
          .select('*')
          .eq('school_id', userData.school_id)
          .order('level')
          .order('artist');
        
        if (songsData) {
          setGlobalSongs(songsData);
        }

        // Lade die eigenen Bands & checke Konfetti
        const { data: userBandsData } = await supabase
          .from('band_members')
          .select('id, band_id, confetti_seen, instrument, bands(song_id, songs(title))')
          .eq('user_id', userId);
          
        if (userBandsData) {
          const unseen = userBandsData.find(b => !b.confetti_seen);
          if (unseen) setShowConfetti(unseen);
        }

        // Radar Chart Data handled via derived state now

        // Activity Chart Data (Letzte 7 Tage)
        const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
        const last7 = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dayStr = days[d.getDay()];
          const mins = (allSessions || [])
            .filter(s => new Date(s.check_in_time).toDateString() === d.toDateString())
            .reduce((acc, s) => {
              const start = new Date(s.check_in_time);
              const end = s.check_out_time ? new Date(s.check_out_time) : new Date();
              return acc + Math.floor((end.getTime() - start.getTime()) / 60000);
            }, 0);
          last7.push({ day: dayStr, mins });
        }
        setStudentActivity(last7);
      }

    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHelpRequest = async () => {
    if (!session?.station_id || !loggedInUserId) return;
    
    const { error } = await supabase
      .from('help_requests')
      .insert({
        user_id: loggedInUserId,
        station_id: session.station_id,
        status: 'pending'
      });
      
    if (error) {
      alert('Fehler beim Senden: ' + error.message);
    } else {
      alert(`Hilfe wurde angefordert. Der Lehrer sieht deinen Tisch im Dashboard.`);
    }
  };

  const updateProgress = async (skillId: string, newProgress: number) => {
    setUserSongs(userSongs.map(song => {
      if (song.id === skillId) {
        const clampedProgress = song.locked ? Math.min(newProgress, 90) : newProgress;
        return { ...song, progress: clampedProgress };
      }
      return song;
    }));

    const song = userSongs.find(s => s.id === skillId);
    const clampedProgress = song?.locked ? Math.min(newProgress, 90) : newProgress;
    
    await supabase
      .from('user_song_skills')
      .update({ progress_percent: clampedProgress, is_pending_approval: false })
      .eq('id', skillId);
  };

  const handleAddSongToRepertoire = async (song: any) => {
    if (!loggedInUserId) return;
    try {
      setLoading(true);
      
      const req = song.instrumentation || { Guitar: 1, Bass: 1, Drums: 1, Keys: 0, Vocals: 1 };
      const instrumentsToAdd = Object.keys(req).filter(inst => req[inst] > 0);
      
      if (instrumentsToAdd.length === 0) {
        alert('Dieser Song hat keine Instrumente hinterlegt.');
        setLoading(false);
        return;
      }
      
      const insertData = instrumentsToAdd.map(inst => ({
        user_id: loggedInUserId,
        song_id: song.id,
        instrument: inst,
        progress_percent: 0,
        is_stage_ready: false
      }));

      const { error } = await supabase.from('user_song_skills').insert(insertData);
      
      if (error) {
        if (error.code === '23505') {
          alert('Dieser Song ist bereits in deinem Repertoire!');
        } else {
          throw error;
        }
      } else {
        await fetchDashboardData(loggedInUserId);
        setActiveStudentTab('practice');
      }
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = async (skill: any) => {
    try {
      setLoading(true);
      await supabase.from('user_song_skills').update({ is_pending_approval: true }).eq('id', skill.id);
      if (loggedInUserId) await fetchDashboardData(loggedInUserId);
      alert('Der Lehrer wurde benachrichtigt!');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const clearConfetti = async () => {
    if (!showConfetti) return;
    await supabase.from('band_members').update({ confetti_seen: true }).eq('id', showConfetti.id);
    setShowConfetti(null);
  };


  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setCameraStream(stream);
      setShowCamera(true);
    } catch (err) {
      alert('Kamera konnte nicht gestartet werden.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    const video = document.getElementById('camera-video') as HTMLVideoElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setUser({ ...user, photo_url: dataUrl });
      await supabase.from('users').update({ photo_url: dataUrl }).eq('id', user.id);
      stopCamera();
    }
  };

  const handleLogout = async () => {
    try {
      if (session?.id) {
        // Session beenden in DB
        await supabase
          .from('sessions')
          .update({ check_out_time: new Date().toISOString() })
          .eq('id', session.id);
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
    setLoggedInUserId(null);
    setUser(null);
    setSession(null);
    localStorage.removeItem('groovelab_user_id');
    localStorage.removeItem('groovelab_location_mode');
  };

  if (!stationIdFromStorage) {
    return <DeviceSetupScreen />;
  }

  const handleLogin = (userId: string, isHome?: boolean) => {
    const mode = isHome ? 'home' : 'lab';
    setLoggedInUserId(userId);
    setLocationMode(mode);
    localStorage.setItem('groovelab_user_id', userId);
    localStorage.setItem('groovelab_location_mode', mode);
  };

  if (!loggedInUserId) {
    return <LoginScreen onLogin={handleLogin} kioskStationId={isKioskMode ? stationIdFromStorage : null} />;
  }

  if (loading || !user) {
    return <div className="app-container flex-center">Lade Daten aus Supabase...</div>;
  }

  if (user.role === 'admin') {
    return <AdminDashboard userId={user.id} onLogout={handleLogout} />;
  }

  if (user.role === 'teacher') {
    return <TeacherDashboard userId={user.id} onLogout={handleLogout} locationMode={locationMode} />;
  }

  const calculateSkillXP = (skill: any) => {
    if (skill.is_stage_ready || skill.progress === 100) return 500;
    return (skill.progress || 0) * 2;
  };

  const studentRadarData = (() => {
    const radarBase: Record<string, number> = { Guitar: 0, Bass: 0, Drums: 0, Keys: 0, Vocals: 0 };
    userSongs.forEach((s: any) => {
      if (radarBase[s.instrument] !== undefined) {
        radarBase[s.instrument] += calculateSkillXP(s);
      }
    });
    return Object.entries(radarBase).map(([inst, xp]) => ({ instrument: inst, xp }));
  })();

  const totalXp = userSongs.reduce((acc, song) => acc + calculateSkillXP(song), 0);
  const nextLevelXp = 1000;
  const xpPercent = Math.min((totalXp / nextLevelXp) * 100, 100);
  const brandColor = 'var(--primary-color)';

  // Group userSongs by song_id
  const practiceSongs = userSongs.filter((s: any) => !s.locked || s.progress < 100);
  const repertoireSongs = userSongs.filter((s: any) => s.progress === 100 && !s.locked);

  const groupSongs = (songs: any[]) => Object.values(songs.reduce((acc: any, skill: any) => {
    if (!acc[skill.song_id]) {
      const wallMatch = wallSongs.find(ws => ws.id === skill.song_id);
      const uniqueInstruments = wallMatch ? Object.values(wallMatch.counts).filter(c => (c as number) > 0).length : 0;
      
      acc[skill.song_id] = {
        song_id: skill.song_id,
        title: skill.title,
        artist: skill.artist,
        media_link: skill.media_link,
        tomplay_url: skill.tomplay_url,
        isBandReady: uniqueInstruments >= 3,
        skills: []
      };
    }
    // Deduplicate by instrument
    if (!acc[skill.song_id].skills.find((s: any) => s.instrument === skill.instrument)) {
      acc[skill.song_id].skills.push(skill);
    }
    return acc;
  }, {}));

  const groupedPracticeSongs = groupSongs(practiceSongs);
  const groupedRepertoireSongs = groupSongs(repertoireSongs);

  return (
    <div className="app-layout">
      {/* Sidebar Navigation (iPad/Desktop) */}
      <aside className="sidebar-nav">
        <div className="sidebar-logo">
          <div className="school-logo" style={{ color: brandColor, background: 'white', border: '1px solid rgba(0,0,0,0.05)' }}>
            <Music size={24} />
          </div>
          <div className="school-name text-gradient">{user.schools?.name || 'Groovelab'}</div>
        </div>

        <nav className="sidebar-menu">
          <button onClick={() => setActiveStudentTab('profile')} className={`sidebar-item ${activeStudentTab === 'profile' ? 'active' : ''}`}>
            <Shield size={20} /> Profil
          </button>
          <button onClick={() => setActiveStudentTab('practice')} className={`sidebar-item ${activeStudentTab === 'practice' ? 'active' : ''}`}>
            <Play size={20} /> Üben
          </button>
          <button onClick={() => setActiveStudentTab('repertoire')} className={`sidebar-item ${activeStudentTab === 'repertoire' ? 'active' : ''}`}>
            <Award size={20} /> Repertoire
          </button>
          <button onClick={() => setActiveStudentTab('library')} className={`sidebar-item ${activeStudentTab === 'library' ? 'active' : ''}`}>
            <Library size={20} /> Bibliothek
          </button>
          <button onClick={() => setActiveStudentTab('matching')} className={`sidebar-item ${activeStudentTab === 'matching' ? 'active' : ''}`}>
            <Users size={20} /> Band Wall
          </button>
          <button onClick={() => setActiveStudentTab('team')} className={`sidebar-item ${activeStudentTab === 'team' ? 'active' : ''}`}>
            <Music size={20} /> Team
          </button>
        </nav>

        <div style={{ marginTop: 'auto', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
          <button 
            onClick={handleLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '16px', border: 'none', background: 'transparent', color: '#94a3b8', fontWeight: 700, cursor: 'pointer' }}
          >
            <LogOut size={20} /> Abmelden
          </button>
        </div>
      </aside>

      <div className="main-wrapper">
        {/* Header (Mobile only or simplified) */}
        <header className="header">
          <div className="school-brand" style={{ display: width < 1024 ? 'flex' : 'none' }}>
            <div className="school-logo" style={{ color: brandColor, background: 'white', border: '1px solid rgba(0,0,0,0.05)' }}>
              <Music size={24} />
            </div>
            <div className="school-name text-gradient">{user.schools?.name || 'Groovelab'}</div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
            {locationMode === 'lab' ? (
              <div className="status-badge" style={{ background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }}>
                <div className="status-dot" style={{ background: '#f59e0b' }}></div>
                Labor {session?.stations?.name ? `(${session.stations.name})` : ''}
              </div>
            ) : (
              <div className="status-badge" style={{ background: '#eff6ff', color: '#1e40af', borderColor: '#bfdbfe' }}>
                <div className="status-dot" style={{ background: '#3b82f6' }}></div>
                Home
              </div>
            )}
            
            <button 
              onClick={() => setShowQR(true)}
              style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px', color: brandColor, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
            >
              Ausweis <QrCode size={18} />
            </button>
          </div>
        </header>

      <main className="main-content">
        {/* Dashboard (Profile Tab) */}
        {activeStudentTab === 'profile' && (
          <div className="dashboard-grid animation-slide-up">
            {/* Left Column: Personal Hub */}
            <div className="dashboard-sidebar-column">
              <div className="profile-card-premium">
                {(() => {
                  return (
                    <div style={{ textAlign: 'center' }} onClick={() => setShowEditProfile(true)}>
                      <div className="avatar-main-wrapper" style={{ margin: '0 auto 20px auto' }}>
                        <div className="avatar-main-circle" style={{ width: '120px', height: '120px', background: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', border: '4px solid white', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                          <img 
                            src={user.photo_url || '/avatar_ghost.jpg'} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: user.photo_url || !user.first_name ? 'block' : 'none' }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            alt=""
                          />
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', color: 'white', fontWeight: 800 }}>
                            {user.first_name?.[0] || '?'}
                          </div>
                        </div>
                        <div className="level-badge-float" style={{ background: brandColor, bottom: '5px', right: '5px', padding: '4px 12px', fontSize: '0.7rem' }}>
                          {totalXp < 500 ? 'Starter' : totalXp < 2000 ? 'Roadie' : 'Rockstar'}
                        </div>
                      </div>
                      
                      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px 0', color: '#1e293b' }}>
                        {user.first_name} {user.last_name}
                      </h1>
                      <div style={{ color: brandColor, fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {totalPresenceMins} Min. Groovelab-Zeit
                      </div>
                      
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '16px', justifyContent: 'center' }}>
                        {(user.musical_styles || []).map((s: string) => (
                          <span key={s} style={{ fontSize: '0.6rem', fontWeight: 800, background: '#f1f5f9', padding: '4px 10px', borderRadius: '100px', border: '1px solid #e2e8f0', color: '#64748b' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="xp-bar-container" style={{ marginTop: '24px', padding: 0, background: 'transparent', boxShadow: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                    <span>Progress</span>
                    <span>Level {Math.floor(totalXp / 1000) + 1}</span>
                  </div>
                  <div className="xp-progress-compact">
                    <div style={{ width: `${xpPercent}%`, height: '100%', background: brandColor, borderRadius: '4px', transition: 'width 1s ease-out' }}></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8' }}>
                    <span>{totalXp} XP</span>
                    <span>{nextLevelXp} XP</span>
                  </div>
                </div>

                <div style={{ marginTop: '32px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Monitor size={14} /> My Gear
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(user.equipment_list || []).map((item: any, idx: number) => (
                      <div key={idx} className="gear-pill">
                        <div style={{ background: 'white', color: brandColor, padding: '6px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                          <Music size={14} />
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.category}</div>
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.model}</div>
                        </div>
                      </div>
                    ))}
                    {(user.equipment_list || []).length === 0 && (
                      <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#94a3b8', padding: '20px', border: '1px dashed #e2e8f0', borderRadius: '16px' }}>
                        Noch kein Gear eingetragen.
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: '24px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Music size={14} /> Wunsch-Song
                  </div>
                  <input 
                    placeholder="Was willst du lernen? (Enter zum Absenden)"
                    value={user.wish_song || ''}
                    onChange={(e) => setUser({...user, wish_song: e.target.value})}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value;
                        if (!val) return;
                        // Profile update
                        await supabase.from('users').update({ wish_song: val }).eq('id', user.id);
                        // Official request
                        const { error } = await supabase.from('song_requests').insert({
                          school_id: user.school_id,
                          user_id: user.id,
                          title: val,
                          status: 'pending'
                        });
                        if (error) {
                          alert('Fehler: ' + error.message);
                        } else {
                          alert('Song-Wunsch eingereicht! Dein Lehrer sieht ihn jetzt.');
                        }
                      }
                    }}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '0.8rem', background: '#f8fafc', fontWeight: 500 }}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Analytics & Stats */}
            <div className="dashboard-main-column">
              <div className="stats-panel-premium" style={{ height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                  <div style={{ padding: '8px', background: '#fffbeb', borderRadius: '10px', color: brandColor }}>
                    <LucideBarChart size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>Analyse</h3>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>Dein Fortschritt im Detail</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: width < 1200 ? '1fr' : '1fr 1fr', gap: '24px' }}>
                  <div className="chart-container-compact">
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', marginBottom: '16px', textTransform: 'uppercase', textAlign: 'center' }}>Instrumental-Radar</div>
                    <div style={{ width: '100%', height: '220px' }}>
                      <ResponsiveContainer>
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={studentRadarData}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="instrument" tick={({ x, y, payload }) => (
                            <text x={x} y={y} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 9, fontWeight: 800, fill: INSTRUMENT_COLORS[payload.value] || '#64748b' }}>
                              {payload.value}
                            </text>
                          )} />
                          <Radar name="XP" dataKey="xp" stroke={brandColor} fill={brandColor} fillOpacity={0.5} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="chart-container-compact">
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', marginBottom: '16px', textTransform: 'uppercase', textAlign: 'center' }}>Aktivität (7 Tage)</div>
                    <div style={{ width: '100%', height: '220px' }}>
                      <ResponsiveContainer>
                        <RechartsBarChart data={studentActivity}>
                          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} />
                          <Tooltip cursor={{ fill: 'rgba(234, 179, 8, 0.05)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px' }} />
                          <Bar dataKey="mins" radius={[4, 4, 0, 0]}>
                            {studentActivity.map((_entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === studentActivity.length - 1 ? brandColor : '#e2e8f0'} />
                            ))}
                          </Bar>
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '32px' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginBottom: '16px' }}>Letzte Erfolge</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                    {userSongs.filter(s => s.progress === 100).slice(0, 3).map(song => (
                      <div key={song.id} style={{ background: 'linear-gradient(135deg, #fffbeb, #ffffff)', padding: '12px', borderRadius: '20px', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ fontSize: '1.2rem' }}>{INSTRUMENT_ICONS[song.instrument]}</div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#b45309', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
                          <div style={{ fontSize: '0.6rem', color: '#d97706' }}>Meisterstück!</div>
                        </div>
                      </div>
                    ))}
                    {userSongs.filter(s => s.progress === 100).length === 0 && (
                      <div style={{ gridColumn: '1/-1', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', padding: '16px', background: '#f8fafc', borderRadius: '16px' }}>
                        Schließe Songs zu 100% ab, um hier Erfolge zu sehen!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Profile Modal */}
        {showEditProfile && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="glass-panel animation-slide-up" style={{ background: 'white', padding: '24px', borderRadius: '24px', maxWidth: '400px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="flex-between" style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Mein Profil</h2>
                <button onClick={() => setShowEditProfile(false)} style={{ background: 'transparent', border: 'none', color: brandColor, fontWeight: 700 }}>Fertig</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ width: '120px', height: '120px', borderRadius: '50%', margin: '0 auto 16px auto', border: `4px solid ${brandColor}`, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                    <img src={user.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Preview" />
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>Deine aktuelle Auswahl</div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>Profil-Bild wählen</label>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    {/* Ghost Avatar */}
                    <button 
                      onClick={async () => {
                        const url = '/avatar_ghost.jpg';
                        setUser({...user, photo_url: url});
                        await supabase.from('users').update({ photo_url: url }).eq('id', user.id);
                      }}
                      style={{ padding: '4px', borderRadius: '16px', border: (!user.photo_url || user.photo_url?.includes('ghost')) ? `3px solid ${brandColor}` : '1px solid #e2e8f0', background: 'white', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
                    >
                      <img src="/avatar_ghost.jpg" style={{ width: '100%', borderRadius: '12px' }} alt="Ghost" />
                      <div style={{ fontSize: '0.5rem', fontWeight: 800, textTransform: 'uppercase', marginTop: '2px' }}>Ghost</div>
                    </button>

                    {/* Avatar Boy */}
                    <button 
                      onClick={async () => {
                        const url = '/avatar_boy.jpg';
                        setUser({...user, photo_url: url});
                        await supabase.from('users').update({ photo_url: url }).eq('id', user.id);
                      }}
                      style={{ padding: '4px', borderRadius: '16px', border: user.photo_url?.includes('boy.jpg') ? `3px solid ${brandColor}` : '1px solid #e2e8f0', background: 'white', cursor: 'pointer', overflow: 'hidden' }}
                    >
                      <img src="/avatar_boy.jpg" style={{ width: '100%', borderRadius: '12px' }} alt="Boy" />
                      <div style={{ fontSize: '0.5rem', fontWeight: 800, textTransform: 'uppercase', marginTop: '2px' }}>Boy</div>
                    </button>
                    
                    {/* Avatar Girl */}
                    <button 
                      onClick={async () => {
                        const url = '/avatar_girl.jpg';
                        setUser({...user, photo_url: url});
                        await supabase.from('users').update({ photo_url: url }).eq('id', user.id);
                      }}
                      style={{ padding: '4px', borderRadius: '16px', border: user.photo_url?.includes('girl.jpg') ? `3px solid ${brandColor}` : '1px solid #e2e8f0', background: 'white', cursor: 'pointer', overflow: 'hidden' }}
                    >
                      <img src="/avatar_girl.jpg" style={{ width: '100%', borderRadius: '12px' }} alt="Girl" />
                      <div style={{ fontSize: '0.5rem', fontWeight: 800, textTransform: 'uppercase', marginTop: '2px' }}>Girl</div>
                    </button>
                  </div>

                  <button 
                    onClick={startCamera}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '16px', border: '1px solid #e2e8f0', background: user.photo_url?.startsWith('data:') ? '#f0fdf4' : '#f8fafc', color: user.photo_url?.startsWith('data:') ? '#16a34a' : brandColor, cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem' }}
                  >
                    <Camera size={20} />
                    {user.photo_url?.startsWith('data:') ? 'Foto aktualisieren' : 'Eigenes Foto aufnehmen'}
                  </button>
                </div>

                <ElegantBirthdayPicker 
                  label="Geburtsdatum"
                  value={user.birth_date || '2010-01-01'}
                  onChange={async (newVal) => {
                    setUser({...user, birth_date: newVal});
                    await supabase.from('users').update({ birth_date: newVal }).eq('id', user.id);
                  }}
                />

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Stilrichtungen (Mehrfachwahl)</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['Rock', 'Pop', 'Jazz', 'Metal', 'HipHop', 'Classic', 'Blues', 'Funk', 'Electronic'].map(style => {
                      const isActive = (user.musical_styles || []).includes(style);
                      return (
                        <button
                          key={style}
                          onClick={async () => {
                            const current = user.musical_styles || [];
                            const next = isActive ? current.filter((s: string) => s !== style) : [...current, style];
                            setUser({...user, musical_styles: next});
                            await supabase.from('users').update({ musical_styles: next }).eq('id', user.id);
                          }}
                          style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid', borderColor: isActive ? brandColor : '#e5e7eb', background: isActive ? brandColor : 'white', color: isActive ? 'white' : '#64748b', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                        >
                          {style}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>Equipment List</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {(user.equipment_list || []).map((item: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ flex: 1, fontSize: '0.8rem' }}>
                          <strong>{item.category}:</strong> {item.model}
                        </div>
                        <button 
                          onClick={async () => {
                            const next = (user.equipment_list || []).filter((_: any, i: number) => i !== idx);
                            setUser({...user, equipment_list: next});
                            await supabase.from('users').update({ equipment_list: next }).eq('id', user.id);
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      {['E-Gitarre', 'E-Bass', 'E-Drums', 'E-Piano'].map(cat => {
                        const isSel = selectedEqCat === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => setSelectedEqCat(cat)}
                            style={{
                              flex: 1, padding: '12px 4px', borderRadius: '12px', border: '1px solid',
                              borderColor: isSel ? brandColor : '#e2e8f0',
                              background: isSel ? brandColor : 'white',
                              color: isSel ? 'white' : '#64748b',
                              fontSize: '1.2rem', cursor: 'pointer',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                              transition: 'all 0.2s ease',
                              boxShadow: isSel ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                            }}
                          >
                            <span>{INSTRUMENT_ICONS[cat.replace('E-', '')] || '🎵'}</span>
                            <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase' }}>{cat.replace('E-', '')}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        id="eq-details" 
                        placeholder={`${selectedEqCat} Modell...`} 
                        style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.875rem' }} 
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            const details = (e.target as HTMLInputElement).value;
                            if (!details) return;
                            const next = [...(user.equipment_list || []), { category: selectedEqCat, model: details }];
                            setUser({...user, equipment_list: next});
                            await supabase.from('users').update({ equipment_list: next }).eq('id', user.id);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                      <button 
                        onClick={async () => {
                          const details = (document.getElementById('eq-details') as HTMLInputElement).value;
                          if (!details) return;
                          const next = [...(user.equipment_list || []), { category: selectedEqCat, model: details }];
                          setUser({...user, equipment_list: next});
                          await supabase.from('users').update({ equipment_list: next }).eq('id', user.id);
                          (document.getElementById('eq-details') as HTMLInputElement).value = '';
                        }}
                        style={{ background: brandColor, color: 'white', border: 'none', borderRadius: '12px', padding: '0 20px', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      >
                        Hinzufügen
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}



        {/* User Songs List (Practice) */}
        {activeStudentTab === 'practice' && (
          <section className="exercises-section animation-slide-up" style={{ animationDelay: '0.1s' }}>
            {practiceSongs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: '24px', color: 'var(--text-muted)' }}>
                Du hast gerade keine Songs zum Üben.<br/><br/>Tippe auf <strong>Bibliothek</strong>, um neue Herausforderungen zu finden!
              </div>
            )}
            
            <div className="exercises-grid">
              {groupedPracticeSongs.map((group: any) => (
                <div key={group.song_id} style={{ position: 'relative' }}>
                  <GroupedSongCard 
                    songGroup={group} 
                    isBandReady={group.isBandReady} 
                    onUpdateProgress={updateProgress} 
                    onSubmitForApproval={handleSubmitForApproval} 
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* User Songs List (Repertoire) */}
        {activeStudentTab === 'repertoire' && (
          <section className="exercises-section animation-slide-up" style={{ animationDelay: '0.1s' }}>
            {repertoireSongs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: '24px', color: 'var(--text-muted)' }}>
                Dein Repertoire ist noch leer.<br/><br/>Übe fleißig weiter, bis deine Songs 100% erreichen!
              </div>
            )}
            
            <div className="exercises-grid">
              {groupedRepertoireSongs.map((group: any) => (
                <div key={group.song_id} className="repertoire-card-container">
                  <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid #16a34a', background: 'linear-gradient(135deg, white, #f0fdf4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{group.artist}</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{group.title}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {group.skills.map((s: any) => (
                          <div key={s.id} title={s.instrument} style={{ width: '40px', height: '40px', borderRadius: '50%', background: INSTRUMENT_COLORS[s.instrument] || 'white', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '2px solid white' }}>
                            {INSTRUMENT_ICONS[s.instrument]}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeStudentTab === 'team' && (
          <div className="tab-content animation-slide-up">
            <div className="stats-panel-premium" style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', fontWeight: 800, color: '#1e293b' }}>Unser Team</h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '24px' }}>Lerne die Köpfe hinter der Groovelab Academy kennen.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                {teachers.map(t => (
                  <div 
                    key={t.id} 
                    onClick={() => setSelectedTeacher(t)}
                    style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '24px', border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'all 0.3s ease', position: 'relative' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.borderColor = brandColor;
                      e.currentTarget.style.background = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = '#f1f5f9';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                  >
                    <div style={{ 
                      width: '100px', 
                      height: '100px', 
                      borderRadius: '50%', 
                      margin: '0 auto 16px auto', 
                      border: `4px solid white`, 
                      overflow: 'hidden', 
                      boxShadow: '0 10px 20px -5px rgba(0,0,0,0.1)', 
                      background: '#f1f5f9',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <img 
                        src={t.photo_url || '/avatar_ghost.jpg'} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, zIndex: 2 }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        alt={t.first_name}
                      />
                      <span style={{ fontSize: '2rem', fontWeight: 800, color: brandColor, zIndex: 1 }}>{t.first_name?.[0]}</span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>{t.first_name} {t.last_name}</div>
                    <div style={{ fontSize: '0.7rem', color: brandColor, fontWeight: 700, textTransform: 'uppercase', marginTop: '6px', letterSpacing: '0.05em' }}>
                      {t.role === 'admin' ? 'Schulleitung' : 'Lehrkraft'}
                    </div>
                    {t.equipment_list && t.equipment_list.length > 0 && (
                      <div style={{ marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {Array.from(new Set(t.equipment_list.map((e: any) => e.category.replace('E-', '')))).map((instr: any) => (
                          <span key={instr} style={{ fontSize: '1.2rem', color: INSTRUMENT_COLORS[instr] || brandColor }} title={instr}>
                            {INSTRUMENT_ICONS[instr] || '🎵'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Teacher Detail Modal */}
        {selectedTeacher && (
          <TeacherDetailModal 
            teacher={selectedTeacher} 
            onClose={() => setSelectedTeacher(null)} 
          />
        )}

        {activeStudentTab === 'library' && (
          <section className="exercises-section animation-slide-up" style={{ animationDelay: '0.1s' }}>
            {globalSongs.map(song => (
              <div key={song.id} className="glass-panel" style={{ padding: '20px', background: 'white', borderLeft: `4px solid ${brandColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{song.artist}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{song.title}</div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                    <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>Level {song.level}</span>
                    {song.media_link && (
                      <a href={song.media_link} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)', fontSize: '0.75rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ExternalLink size={12} /> Noten / Media
                      </a>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => handleAddSongToRepertoire(song)}
                  style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: '12px', borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={20} color={brandColor} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-main)' }}>Üben</span>
                </button>
              </div>
            ))}
            {globalSongs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: '24px', color: 'var(--text-muted)' }}>
                Die Songbibliothek ist noch leer. Frag deinen Lehrer!
              </div>
            )}
          </section>
        )}

        {/* Student Profile Tab */}
        {activeStudentTab === 'profile' && (
          <div className="tab-content animation-slide-up">
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: brandColor, margin: '0 auto 16px auto', border: '4px solid white', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 800, color: 'white', backgroundImage: user.photo_url ? `url(${user.photo_url})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                {!user.photo_url && (user.avatar_id || user.first_name?.[0])}
              </div>
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{user.first_name} {user.last_name}</h2>
              <div style={{ color: brandColor, fontWeight: 700, fontSize: '0.9rem', marginTop: '4px' }}>XP: {userSongs.reduce((acc: number, s: any) => acc + (s.progress === 100 ? 500 : s.progress * 2), 0)}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {/* Highlights */}
              <div className="glass-panel" style={{ padding: '24px', background: 'white' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309' }}>
                  <Star size={18} fill="#f59e0b" color="#f59e0b" /> Meine Meisterstücke
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {userSongs.filter(s => s.progress === 100).map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#fffbeb', borderRadius: '12px', border: '1px solid #fde68a' }}>
                      <div style={{ fontSize: '1.2rem' }}>{INSTRUMENT_ICONS[s.instrument]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{s.title}</div>
                        <div style={{ fontSize: '0.7rem', color: '#b45309' }}>{s.artist}</div>
                      </div>
                    </div>
                  ))}
                  {userSongs.filter(s => s.progress === 100).length === 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Noch keine Meisterstücke. Übe weiter! 🚀</div>
                  )}
                </div>
              </div>

              {/* Challenges / Niederlagen */}
              <div className="glass-panel" style={{ padding: '24px', background: 'white' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b' }}>
                  <AlertCircle size={18} /> Aktuelle Herausforderungen
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {personalRejections.map(r => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#fff1f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
                      <div style={{ fontSize: '1.2rem' }}>{INSTRUMENT_ICONS[r.instrument]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{r.songs?.title}</div>
                        <div style={{ fontSize: '0.7rem', color: '#991b1b' }}>Fokus-Tag: {new Date(r.rejected_at).toLocaleDateString()}</div>
                      </div>
                      <button 
                        onClick={() => setActiveStudentTab('practice')}
                        style={{ background: '#991b1b', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Üben
                      </button>
                    </div>
                  ))}
                  {personalRejections.length === 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Keine aktuellen Herausforderungen. Top! 🎯</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stage Ready Wall (Band Matching) */}
        {activeStudentTab === 'matching' && (
        <section className="glass-panel stage-ready-wall animation-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="wall-header">
            <h2 className="gold-gradient">
              <Award size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
              Band Matching
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Bühnenreife Songs dieser Woche</p>
          </div>
          
          <div className="wall-songs-list">
            {wallSongs.map(song => (
              <div key={song.id} className="song-match-card">
                <div className="song-match-header">
                  <div>
                    <div className="song-artist">{song.artist}</div>
                    <div className="song-title">{song.title}</div>
                  </div>
                  {song.media_link && (
                    <a href={song.media_link} target="_blank" rel="noreferrer" style={{ color: '#f59e0b', display: 'flex', alignItems: 'center' }}>
                      <ExternalLink size={20} />
                    </a>
                  )}
                </div>
                
                <div className="band-slots-row">
                  {['Guitar', 'Bass', 'Drums', 'Vocals'].map(inst => {
                    const count = song.counts[inst] || 0;
                    const isFilled = count > 0;
                    return (
                      <div key={inst} className={`band-slot ${isFilled ? 'filled' : ''}`}>
                        <div className="slot-icon-circle">{INSTRUMENT_ICONS[inst] || '🎵'}</div>
                        <div className="slot-count-badge">{count > 0 ? count : '-'}</div>
                        <div className="slot-label-text">{inst}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {wallSongs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                Noch keine Songs Stage Ready. Übt fleißig weiter!
              </div>
            )}
          </div>
        </section>
        )}
      </main>

      {/* Confetti Modal */}
      {showConfetti && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)' }}>
          <Confetti width={width} height={height} />
          <div className="glass-panel animation-slide-up" style={{ background: 'white', padding: '40px', borderRadius: '32px', textAlign: 'center', maxWidth: '400px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '16px', color: 'var(--text-main)' }}>🎉 Glückwunsch!</h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Du hast eine vollständige Band für den Song<br/><strong>{showConfetti.bands.songs.title}</strong><br/>gefunden!
            </p>
            <button onClick={clearConfetti} style={{ background: brandColor, color: 'white', border: 'none', padding: '16px 32px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer' }}>
              Awesome!
            </button>
          </div>
        </div>
      )}

      {/* Band Members Modal */}
      {bandModalData && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel animation-slide-up" style={{ background: 'white', padding: '32px', borderRadius: '24px', maxWidth: '360px', width: '100%' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '24px', textAlign: 'center' }}>Deine Band</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {bandModalData.map((m: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                  <div style={{ width: '40px', height: '40px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    {INSTRUMENT_ICONS[m.instrument] || '🎵'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{m.users.first_name} {m.users.last_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.instrument}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setBandModalData(null)} style={{ marginTop: '24px', background: '#f3f4f6', color: 'var(--text-main)', border: 'none', padding: '16px', borderRadius: '12px', width: '100%', fontWeight: 700, cursor: 'pointer' }}>Schließen</button>
          </div>
        </div>
      )}

      {/* Help FAB */}
      <div className="fab-container">
        <button 
          className="fab-button" 
          onClick={handleHelpRequest}
          style={{ background: brandColor }}
        >
          <AlertCircle size={28} />
        </button>
      </div>

      {/* Modal: QR Code anzeigen */}
      {showQR && user?.qr_token && (
        <QRCodeModal user={user} onClose={() => setShowQR(false)} />
      )}
      {/* Camera Modal */}
      {showCamera && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'black', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <video 
            id="camera-video"
            autoPlay 
            playsInline 
            ref={v => { if (v) v.srcObject = cameraStream; }} 
            style={{ width: '100%', maxHeight: '70vh', objectFit: 'cover' }}
          />
          <div style={{ position: 'absolute', bottom: '40px', display: 'flex', gap: '20px' }}>
            <button 
              onClick={stopCamera}
              style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer' }}
            >
              <X size={30} />
            </button>
            <button 
              onClick={capturePhoto}
              style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 0 20px rgba(255,255,255,0.5)' }}
            >
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid black' }}></div>
            </button>
          </div>
        </div>
      )}
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        <button onClick={() => setActiveStudentTab('practice')} className={activeStudentTab === 'practice' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeStudentTab === 'practice' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
          <Play size={24} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Üben</span>
        </button>
        <button onClick={() => setActiveStudentTab('repertoire')} className={activeStudentTab === 'repertoire' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeStudentTab === 'repertoire' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
          <Award size={24} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Repertoire</span>
        </button>
        <button onClick={() => setActiveStudentTab('library')} className={activeStudentTab === 'library' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeStudentTab === 'library' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
          <Library size={24} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Bib</span>
        </button>
        <button onClick={() => setActiveStudentTab('matching')} className={activeStudentTab === 'matching' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeStudentTab === 'matching' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
          <Users size={24} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Wall</span>
        </button>
        <button onClick={() => setActiveStudentTab('profile')} className={activeStudentTab === 'profile' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeStudentTab === 'profile' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
          <Shield size={24} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Profil</span>
        </button>
        <button onClick={() => setActiveStudentTab('team')} className={activeStudentTab === 'team' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeStudentTab === 'team' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
          <Music size={24} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Team</span>
        </button>
      </nav>
      {selectedTeacher && (
        <TeacherDetailModal 
          teacher={selectedTeacher} 
          onClose={() => setSelectedTeacher(null)} 
        />
      )}
    </div>
  );
}

export default App;

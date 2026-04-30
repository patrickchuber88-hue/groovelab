import React, { useState, useEffect } from 'react';
import { Music, AlertCircle, Play, Library, Shield, LogOut, Award, Users, Monitor, X, QrCode, Plus, ExternalLink, BarChart as LucideBarChart, Star, Clock, UserPlus, Check, Radar as RadarIcon } from 'lucide-react';
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
  Drums: '#fbbf24',  // Gold/Yellow
  Keys: '#ec4899',   // Pink
  Vocals: '#10b981'  // Emerald
};



function GroupedSongCard({ songGroup, onUpdateProgress, onSubmitForApproval, onRemoveSong, isBandReady, loggedInUserId, fetchSocialData, brandColor }: any) {
  const [activeInst, setActiveInst] = useState(songGroup.skills[0].instrument);
  const activeSkill = songGroup.skills.find((s: any) => s.instrument === activeInst) || songGroup.skills[0];

  return (
    <div className={`glass-panel exercise-card animation-slide-up ${isBandReady ? 'band-ready' : ''}`} style={{ padding: '24px', position: 'relative', overflow: 'hidden', borderLeft: isBandReady ? '4px solid #f59e0b' : '' }}>
      {isBandReady && (
        <div style={{ position: 'absolute', top: 0, right: 0, background: '#fefce8', color: '#854d0e', padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #fef08a' }}>
          <Award size={12} /> Ready to Gig
        </div>
      )}
      <div className="exercise-header" style={{ marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{ 
          width: '64px', 
          height: '64px', 
          background: INSTRUMENT_COLORS[activeSkill.instrument] || brandColor, 
          borderRadius: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          fontSize: '2rem', 
          color: 'white',
          boxShadow: `0 8px 20px ${(INSTRUMENT_COLORS[activeSkill.instrument] || brandColor)}4d`,
          flexShrink: 0,
          border: '3px solid white'
        }}>
          {INSTRUMENT_ICONS[activeSkill.instrument] || '🎵'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{songGroup.artist}</div>
          <div className="exercise-title" style={{ fontSize: '1.25rem', marginTop: '2px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
            {songGroup.title}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {songGroup.media_link && (
                <a href={songGroup.media_link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', display: 'flex', alignItems: 'center' }} title="PDF Noten">
                  <ExternalLink size={18} />
                </a>
              )}
              {songGroup.tomplay_url && (
                <a href={songGroup.tomplay_url} target="_blank" rel="noopener noreferrer" style={{ color: '#ca8a04', display: 'flex', alignItems: 'center', gap: '4px', background: '#fefce8', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, textDecoration: 'none' }}>
                  <Music size={14} /> Tomplay
                </a>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <span className="exercise-progress-text" style={{ color: 'var(--primary-color)', fontSize: '1.5rem' }}>{activeSkill.progress}%</span>
          <button 
            onClick={() => onRemoveSong(songGroup.song_id)}
            style={{ background: '#fee2e2', color: '#ef4444', border: 'none', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: 0.6, transition: 'opacity 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
            title="Song aus Übe-Liste entfernen"
          >
            <X size={16} />
          </button>
        </div>
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
        
        {/* Progress Slider + Labels */}
        <div style={{ marginTop: '16px', background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
          <div style={{ position: 'relative', height: '32px', display: 'flex', alignItems: 'center' }}>
            <input 
              type="range" 
              min="0" 
              max="90" 
              step="30"
              value={Math.min(90, activeSkill.progress)} 
              onChange={(e) => !activeSkill.is_pending_approval && onUpdateProgress(activeSkill.id, parseInt(e.target.value))}
              className="premium-slider"
              style={{ 
                width: '100%', 
                accentColor: INSTRUMENT_COLORS[activeSkill.instrument] || brandColor, 
                cursor: activeSkill.is_pending_approval ? 'not-allowed' : 'pointer',
                zIndex: 2,
                margin: 0
              }}
              disabled={activeSkill.is_pending_approval}
            />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px', marginTop: '8px' }}>
            {[
              { val: 0, label: 'Start' },
              { val: 30, label: 'First Steps' },
              { val: 60, label: 'Solid' },
              { val: 90, label: 'Challenge' }
            ].map(s => (
              <div key={s.val} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '25%', opacity: activeSkill.progress >= s.val ? 1 : 0.4, transition: 'all 0.3s' }}>
                <div style={{ width: '6px', height: '6px', background: activeSkill.progress >= s.val ? (INSTRUMENT_COLORS[activeSkill.instrument] || brandColor) : '#e2e8f0', borderRadius: '50%', marginBottom: '4px' }}></div>
                <span style={{ fontSize: '0.6rem', fontWeight: 900, color: activeSkill.progress >= s.val ? '#1e293b' : 'var(--text-muted)' }}>{s.val}%</span>
                <span style={{ fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{s.label}</span>
              </div>
            ))}
          </div>
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
              Challenge starten & Lehrer rufen 🚀
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
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button 
            onClick={async () => {
              const msg = window.prompt("Optionale Nachricht (z.B. 'Dienstag 16 Uhr?'):");
              if (msg !== null) {
                await supabase.from('help_requests').insert({ user_id: loggedInUserId, song_id: songGroup.song_id, message: msg });
                alert("Anfrage gesendet! Sie erscheint jetzt im Social-Feed. 🎉");
                fetchSocialData();
              }
            }}
            style={{ fontSize: '0.875rem', fontWeight: 800, color: '#854d0e', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer', background: 'rgba(234, 179, 8, 0.1)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(234, 179, 8, 0.2)', width: '100%' }}
          >
            <Users size={16} /> Jam-Partner suchen
          </button>
        </div>
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
  const [showLabMonitor, setShowLabMonitor] = useState(false);
  const [dailyProgress, setDailyProgress] = useState(65); // Mock daily progress %
  const [coachFeedback] = useState("Fokussiere dich diese Woche auf sauberes Greifen beim C-Dur Akkord. Deine Rhythmik im Song 'Let It Be' ist schon super!");
  const [showConfetti, setShowConfetti] = useState<any>(null);
  const [bandModalData, setBandModalData] = useState<any>(null);
  const [selectedEqCat, setSelectedEqCat] = useState('E-Gitarre');
  const [locationMode, setLocationMode] = useState<'lab' | 'home'>(() => (localStorage.getItem('groovelab_location_mode') as 'lab' | 'home') || 'home');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [friendships, setFriendships] = useState<any[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [studentActivity, setStudentActivity] = useState<any[]>([]);
  const [liveStudentCount, setLiveStudentCount] = useState(0);
  const [communityAvailability, setCommunityAvailability] = useState<any[]>([]);

  const fetchCommunityAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from('user_availability')
        .select('day_of_week, start_time, end_time');
      
      if (error) throw error;
      setCommunityAvailability(data || []);
    } catch (e) {
      console.error('Error fetching community availability:', e);
    }
  };

  const getCommunityHeatmapData = () => {
    const daysArr = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    const hourSlots = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 to 20:00
    
    return daysArr.map((day, dIdx) => {
      const dayData = communityAvailability.filter(a => a.day_of_week === dIdx);
      return {
        day,
        slots: hourSlots.map(hour => {
          const count = dayData.filter(a => {
            const start = parseInt(a.start_time.split(':')[0]);
            const end = parseInt(a.end_time.split(':')[0]);
            return hour >= start && hour < end;
          }).length;
          return { hour, count };
        })
      };
    });
  };
  const [userAvailability, setUserAvailability] = useState<any[]>([]);
  const [allAvailabilities, setAllAvailabilities] = useState<any[]>([]);
  const [jamRequests, setJamRequests] = useState<any[]>([]);
  const [brandColor, setBrandColor] = useState('var(--primary-color)');
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
      fetchSocialData();
      
      // Subscribe to sessions for live counter
      const sessionSub = supabase
        .channel('public:sessions')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
          fetchLiveCount();
        })
        .subscribe();
      
      fetchLiveCount();
      fetchCommunityAvailability();
      return () => { supabase.removeChannel(sessionSub); };
    }
  }, [loggedInUserId]);

  const fetchLiveCount = async () => {
    try {
      const { count } = await supabase
        .from('sessions')
        .select('users!inner(role)', { count: 'exact', head: true })
        .is('check_out_time', null)
        .eq('users.role', 'student');
      setLiveStudentCount(count || 0);
    } catch (e) {
      console.error('Error fetching live count:', e);
    }
  };

  const fetchSocialData = async () => {
    if (!loggedInUserId) return;
    
    // Availability
    const { data: avail } = await supabase
      .from('user_availability')
      .select('*')
      .eq('user_id', loggedInUserId);
    setUserAvailability(avail || []);

    // All Availabilities for heatmap
    const { data: allAvail } = await supabase
      .from('user_availability')
      .select('day_of_week, time_slot');
    setAllAvailabilities(allAvail || []);

    // Jam Requests
    const { data: jams } = await supabase
      .from('jam_requests')
      .select('*, users!inner(first_name, photo_url), songs!inner(title, artist)')
      .order('created_at', { ascending: false });
    setJamRequests(jams || []);

    // Team Data
    const { data: teamData } = await supabase
      .from('users')
      .select('*')
      .neq('id', loggedInUserId);
    
    if (teamData) {
      setTeachers(teamData.filter(u => u.role === 'teacher' || u.role === 'admin'));
      setStudents(teamData.filter(u => u.role === 'student'));
    }

    // Friendships
    try {
      const { data: friendsData } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${loggedInUserId},friend_id.eq.${loggedInUserId}`);
      setFriendships(friendsData || []);
    } catch (e) {
      console.warn('Friendships table might not exist yet');
    }
  };

  const handleFriendRequest = async (friendId: string) => {
    if (!loggedInUserId) return;
    
    const { error } = await supabase
      .from('friendships')
      .insert({ user_id: loggedInUserId, friend_id: friendId, status: 'pending' });
    
    if (error) {
      if (error.message.includes('friendships')) {
        alert('Hinweis: Die "friendships" Tabelle fehlt in deiner Datenbank. Bitte kontaktiere den Admin.');
      } else {
        alert('Fehler: ' + error.message);
      }
    } else {
      fetchSocialData();
      alert('Vernetzungsanfrage gesendet!');
    }
  };


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
    if (!userId) return;
    try {
      setLoading(true);
      
      const { data: userData, error: userErr } = await supabase
        .from('users')
        .select('*, schools(*)')
        .eq('id', userId)
        .maybeSingle();
        
      if (!userData || userErr) {
        setLoading(false);
        return;
      }

      setUser(userData);
      if (userData?.schools?.primary_color) {
        // Enforce the new yellow theme if the database still has the old blue
        // Force the premium yellow theme for Groovelab
        const color = '#eab308';
        setBrandColor(color);
        document.documentElement.style.setProperty('--primary-color', color);
      }

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
            song_id: p.songs?.id || 'unknown',
            title: p.songs?.title || 'Unbekannter Song',
            artist: p.songs?.artist || 'Unbekannter Künstler',
            progress: p.progress_percent || 0,
            instrument: p.instrument || 'Guitar',
            locked: !p.is_stage_ready,
            is_pending_approval: p.is_pending_approval,
            media_link: p.songs?.media_link,
            tomplay_url: p.songs?.tomplay_url
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
            user_song_skills (
              instrument,
              is_stage_ready
            )
          `)
          .eq('school_id', userData.school_id);

        if (wallData) {
          const processedWall = wallData.map((song: any) => {
            const counts = { Guitar: 0, Bass: 0, Drums: 0, Keys: 0, Vocals: 0 } as Record<string, number>;
            const stageReadySkills = (song.user_song_skills || []).filter((sk: any) => sk.is_stage_ready);
            stageReadySkills.forEach((skill: any) => {
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
    if (!loggedInUserId) return;
    
    const { error } = await supabase
      .from('help_requests')
      .insert({
        user_id: loggedInUserId,
        station_id: session?.station_id || null,
        status: 'pending'
      });
      
    if (error) {
      console.error('Help Request Error:', error);
      alert('Fehler beim Senden: ' + error.message);
    } else {
      alert(`Hilfe wurde angefordert. Ein Coach wurde benachrichtigt.`);
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

  const handleRemoveSongFromRepertoire = async (songId: string) => {
    if (!confirm('Möchtest du diesen Song wirklich aus deiner Übe-Liste entfernen? Dein Fortschritt geht dabei verloren.')) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('user_song_skills')
        .delete()
        .eq('user_id', loggedInUserId)
        .eq('song_id', songId);
      
      if (error) throw error;
      
      if (loggedInUserId) await fetchDashboardData(loggedInUserId);
      alert('Song wurde aus deiner Liste entfernt.');
    } catch (err: any) {
      alert('Fehler beim Entfernen: ' + err.message);
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

  // Group userSongs by song_id
  const practiceSongs = userSongs.filter((s: any) => s.progress < 100);
  const repertoireSongs = userSongs.filter((s: any) => s.progress === 100);

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
      <aside className="sidebar">
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', padding: '0 10px' }}>
          <div className="school-logo" style={{ color: brandColor, background: 'white', border: '1px solid rgba(0,0,0,0.05)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Music size={24} />
          </div>
          <div className="school-name text-gradient" style={{ fontWeight: 900, fontSize: '1.25rem' }}>{user.schools?.name || 'Groovelab'}</div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={() => setActiveStudentTab('profile')} className={`sidebar-item ${activeStudentTab === 'profile' ? 'active' : ''}`}>
            <Shield size={20} /> <span>Profil</span>
          </button>
          <button onClick={() => setActiveStudentTab('practice')} className={`sidebar-item ${activeStudentTab === 'practice' ? 'active' : ''}`}>
            <Play size={20} /> <span>Üben</span>
          </button>
          <button onClick={() => setActiveStudentTab('repertoire')} className={`sidebar-item ${activeStudentTab === 'repertoire' ? 'active' : ''}`}>
            <Award size={20} /> <span>Repertoire</span>
          </button>
          <button onClick={() => setActiveStudentTab('library')} className={`sidebar-item ${activeStudentTab === 'library' ? 'active' : ''}`}>
            <Library size={20} /> <span>Bibliothek</span>
          </button>
        </nav>

        <div style={{ marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
          <button 
            onClick={handleLogout}
            className="sidebar-item"
            style={{ color: '#ef4444' }}
          >
            <LogOut size={20} /> <span>Abmelden</span>
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
              <div className="status-badge" style={{ background: '#fefce8', color: '#854d0e', borderColor: '#fef08a' }}>
                <div className="status-dot" style={{ background: '#eab308' }}></div>
                Home
              </div>
            )}
            <button 
              onClick={() => setShowLabMonitor(!showLabMonitor)}
              className="status-badge" 
              style={{ background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0', cursor: 'pointer', position: 'relative' }}
            >
              <div className="status-dot" style={{ background: '#10b981', animation: 'pulse 1.5s infinite' }}></div>
              {liveStudentCount} / 8 im Lab
              
              {showLabMonitor && (
                <div className="glass-panel" style={{ position: 'absolute', top: '120%', right: 0, width: '240px', background: 'white', padding: '20px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', zIndex: 100, border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#1e293b', marginBottom: '16px', textAlign: 'left' }}>LAB AUSLASTUNG</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {[1,2,3,4,5,6,7,8].map(station => (
                      <div 
                        key={station} 
                        style={{ 
                          height: '32px', 
                          borderRadius: '8px', 
                          background: station <= liveStudentCount ? '#eab308' : '#f1f5f9',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.7rem', fontWeight: 800, color: station <= liveStudentCount ? 'white' : '#94a3b8'
                        }}
                      >
                        {station}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '16px', fontSize: '0.65rem', color: '#64748b', textAlign: 'left' }}>Optimal für Jam-Matches</div>
                </div>
              )}
            </button>

            <button 
              onClick={() => setShowQR(true)}
              style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px', color: brandColor, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
            >
              Ausweis <QrCode size={18} />
            </button>
          </div>
        </header>

      <main className="main-content">


        {/* Edit Profile Modal - WIDE GAME HUB DESIGN */}
        {showEditProfile && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div className="glass-panel animation-slide-up" style={{ 
              background: 'white', 
              padding: 0, 
              borderRadius: '40px', 
              maxWidth: '1100px', 
              width: '100%', 
              maxHeight: '90vh', 
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 40px 100px rgba(0,0,0,0.3)'
            }}>
              {/* Modal Header */}
              <div style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, color: '#1e293b' }}>Charakter-Editor</h2>
                  <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600 }}>Gestalte deinen Auftritt im Groovelab</p>
                </div>
                <button 
                  onClick={() => setShowEditProfile(false)} 
                  style={{ background: '#eab308', border: 'none', color: 'white', padding: '12px 32px', borderRadius: '16px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(234, 179, 8, 0.3)' }}
                >
                  Speichern & Fertig
                </button>
              </div>

              {/* Modal Content - Two Column Layout */}
              <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                
                {/* Left Column: Avatar Selection */}
                <div style={{ flex: 1, padding: '40px', overflowY: 'auto', borderRight: '1px solid #f1f5f9', background: '#fcfcfc' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '24px', display: 'block' }}>Wähle deinen Avatar</label>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px' }}>
                    {[
                      { id: 'ghost', url: '/avatar_ghost.jpg', label: 'Ghost' },
                      { id: 'boy_orig', url: '/avatar_boy.jpg', label: 'Boy' },
                      { id: 'girl_orig', url: '/avatar_girl.jpg', label: 'Girl' },
                      { id: 'boy_guitar', url: '/avatar_boy_guitar.jpg', label: 'Gitarre' },
                      { id: 'boy_piano', url: '/avatar_boy_piano.jpg', label: 'Piano' },
                      { id: 'boy_drums', url: '/avatar_boy_drums.jpg', label: 'Drums' },
                      { id: 'boy_bass', url: '/avatar_boy_bass.jpg', label: 'Bass' },
                      { id: 'girl_guitar', url: '/avatar_girl_guitar.jpg', label: 'Gitarre' },
                      { id: 'girl_piano', url: '/avatar_girl_piano.jpg', label: 'Piano' },
                      { id: 'girl_drums', url: '/avatar_girl_drums.jpg', label: 'Drums' },
                      { id: 'girl_bass', url: '/avatar_girl_bass.jpg', label: 'Bass' }
                    ].map((av) => (
                      <button 
                        key={av.id}
                        onClick={async () => {
                          setUser({...user, photo_url: av.url});
                          await supabase.from('users').update({ photo_url: av.url }).eq('id', user.id);
                        }}
                        style={{ 
                          padding: '0', 
                          background: 'white', 
                          border: user.photo_url === av.url ? '4px solid #eab308' : '4px solid white', 
                          borderRadius: '24px', 
                          cursor: 'pointer', 
                          overflow: 'hidden',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                      >
                        <img src={av.url} style={{ width: '100%', height: '140px', objectFit: 'cover' }} alt={av.label} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right Column: Settings */}
                <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '24px', display: 'block' }}>Equipment hinzufügen</label>
                  
                  <div style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      {['E-Gitarre', 'E-Bass', 'Drums', 'Keys'].map(cat => {
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

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '24px', marginTop: '8px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={16} color={brandColor} /> Bevorzugte Übe-Zeiten
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'].map((day, idx) => {
                          const availability = user.availability || {};
                          const isSelected = !!availability[idx]?.active;
                          return (
                            <button
                              key={day}
                              onClick={async () => {
                                const next = { ...availability, [idx]: { ...availability[idx], active: !isSelected, start: availability[idx]?.start || '15:00', end: availability[idx]?.end || '17:00' } };
                                setUser({...user, availability: next});
                                await supabase.from('users').update({ availability: next }).eq('id', user.id);
                              }}
                              style={{ width: '40px', height: '40px', borderRadius: '12px', border: '1px solid', borderColor: isSelected ? brandColor : '#e5e7eb', background: isSelected ? brandColor : 'white', color: isSelected ? 'white' : '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {Object.keys(user.availability || {}).map(dayIdx => {
                          const config = user.availability[dayIdx];
                          if (!config?.active) return null;
                          const dayName = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][parseInt(dayIdx)];
                          return (
                            <div key={dayIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '10px 14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>{dayName}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <input 
                                  type="time" 
                                  value={config.start} 
                                  onChange={async (e) => {
                                    const next = { ...user.availability, [dayIdx]: { ...config, start: e.target.value } };
                                    setUser({...user, availability: next});
                                    await supabase.from('users').update({ availability: next }).eq('id', user.id);
                                  }}
                                  style={{ padding: '4px 8px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.75rem' }} 
                                />
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>-</span>
                                <input 
                                  type="time" 
                                  value={config.end} 
                                  onChange={async (e) => {
                                    const next = { ...user.availability, [dayIdx]: { ...config, end: e.target.value } };
                                    setUser({...user, availability: next});
                                    await supabase.from('users').update({ availability: next }).eq('id', user.id);
                                  }}
                                  style={{ padding: '4px 8px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.75rem' }} 
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}



        {activeStudentTab === 'practice' && (
          <section className="exercises-section animation-slide-up" style={{ animationDelay: '0.1s' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
               {/* Daily Goal Card */}
               <div className="glass-panel" style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)', padding: '24px', borderRadius: '24px', border: '2px solid #fef3c7', boxShadow: '0 10px 25px rgba(234, 179, 8, 0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ background: '#eab308', color: 'white', padding: '8px', borderRadius: '10px' }}><Star size={20} fill="white" /></div>
                      <div style={{ fontWeight: 900, fontSize: '1rem', color: '#854d0e' }}>Tagesziel</div>
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#eab308' }}>+500 XP</div>
                  </div>
                  <div style={{ height: '12px', background: '#fef3c7', borderRadius: '6px', overflow: 'hidden', marginBottom: '12px' }}>
                    <div style={{ width: `${dailyProgress}%`, height: '100%', background: '#eab308', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#92400e' }}>Noch 5 Minuten fokussiertes Üben für heute!</p>
               </div>

               {/* Jam Radar Summary */}
               <div className="glass-panel" style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>Jam Radar</h3>
                    <div style={{ padding: '4px 10px', background: '#fffbeb', borderRadius: '20px', color: '#eab308', fontSize: '0.65rem', fontWeight: 900, border: '1px solid #fef3c7' }}>LIVE</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {wallSongs.slice(0, 2).map(ws => (
                      <div key={ws.id} style={{ flex: 1, padding: '10px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#eab308' }}>{ws.artist}</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ws.title}</div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
              <div style={{ background: 'rgba(234, 179, 8, 0.05)', padding: '24px', borderRadius: '32px', border: '1px solid rgba(234, 179, 8, 0.1)' }}>
                <h2 className="gold-gradient" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', fontSize: '1.5rem' }}>
                  <Users size={28} /> Social Hub
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#854d0e', marginBottom: '24px', opacity: 0.8, fontWeight: 500 }}>
                  Plane deine Sessions, vernetze dich mit anderen Schülern und finde Partner für deine nächsten Jams!
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    {/* HEATMAP CARD */}
                    <div className="glass-panel" style={{ padding: '20px', background: 'white' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 800 }}>
                            <Clock size={18} /> Wochen-Planner
                          </h3>
                      </div>

                  {/* MINI HEATMAP */}
                  <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
                      {(() => {
                        const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
                        const openingHours = user?.schools?.opening_hours || {};
                        const activeDayIndices = [0,1,2,3,4,5,6].filter(i => openingHours[i]?.active);
                        const daysToShow = activeDayIndices.length > 0 ? activeDayIndices : [1,2,3,4,5];
                        
                        let minH = 24, maxH = 0;
                        daysToShow.forEach(i => {
                          const start = parseInt((openingHours[i]?.start || '14:00').split(':')[0]);
                          const end = parseInt((openingHours[i]?.end || '19:00').split(':')[0]);
                          if (start < minH) minH = start;
                          if (end > maxH) maxH = end;
                        });
                        if (minH > maxH) { minH = 14; maxH = 19; }

                        const slots = Array.from({ length: maxH - minH + 1 }, (_, i) => `${minH + i}:00`);

                        return (
                          <div style={{ minWidth: '400px', display: 'grid', gridTemplateColumns: `60px repeat(${daysToShow.length}, 1fr)`, gap: '4px' }}>
                            <div />
                            {daysToShow.map((d: number) => (
                              <div key={d} style={{ textAlign: 'center', fontWeight: 800, fontSize: '0.65rem', color: 'var(--text-muted)' }}>{dayNames[d]}</div>
                            ))}
                            
                            {slots.map(slot => (
                              <React.Fragment key={slot}>
                                <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>{slot}</div>
                                {daysToShow.map((day: number) => {
                                  const dayConfig = openingHours[day];
                                  const startH = parseInt((dayConfig?.start || '14:00').split(':')[0]);
                                  const endH = parseInt((dayConfig?.end || '19:00').split(':')[0]);
                                  const slotH = parseInt(slot.split(':')[0]);
                                  const isClosed = !dayConfig?.active || slotH < startH || slotH > endH;

                                  const count = (allAvailabilities || []).filter((a: any) => a.day_of_week === day && a.time_slot === slot).length;
                                  const isMine = (userAvailability || []).some((a: any) => a.day_of_week === day && a.time_slot === slot);
                                  const intensity = Math.min(count * 30, 100);
                                  
                                  return (
                                    <button
                                      key={`${day}-${slot}`}
                                      disabled={isClosed}
                                      onClick={async () => {
                                        if (isMine) {
                                          await supabase.from('user_availability').delete().eq('user_id', loggedInUserId).eq('day_of_week', day).eq('time_slot', slot);
                                        } else {
                                          await supabase.from('user_availability').insert({ user_id: loggedInUserId, day_of_week: day, time_slot: slot });
                                        }
                                        fetchSocialData();
                                      }}
                                      style={{
                                        height: '32px',
                                        borderRadius: '6px',
                                        border: isMine ? `2px solid ${brandColor}` : '1px solid #f1f5f9',
                                        background: isClosed ? '#f1f5f9' : (intensity > 0 ? `rgba(234, 179, 8, ${intensity / 100})` : '#f8fafc'),
                                        cursor: isClosed ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        opacity: isClosed ? 0.3 : 1
                                      }}
                                    >
                                      {count > 0 && !isClosed && <span style={{ fontSize: '0.6rem', fontWeight: 900, color: intensity > 50 ? 'white' : '#b45309' }}>{count}</span>}
                                    </button>
                                  );
                                })}
                              </React.Fragment>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* JAM RADAR CARD */}
                  <div className="glass-panel" style={{ padding: '20px', background: 'white' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 800, marginBottom: '16px' }}>
                      <Star size={18} fill="#f59e0b" color="#f59e0b" /> Jam Radar
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                      {jamRequests.length > 0 ? (
                        jamRequests.map(jam => (
                          <div key={jam.id} style={{ background: '#fefce8', padding: '12px', borderRadius: '16px', border: '1px solid #fef08a' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                               <img src={jam.users?.photo_url || '/avatar_ghost.jpg'} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                               <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>{jam.users?.first_name || 'Unbekannt'}</span>
                            </div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#ca8a04' }}>{jam.songs?.title || 'Song'}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>"{jam.message || 'Lust auf Jams?'}"</div>
                          </div>
                        ))
                      ) : (
                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                          Noch keine Jam-Anfragen.<br/>Sei der Erste! 🚀
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Coach Feedback Card */}
                <div className="glass-panel" style={{ background: '#fffbeb', padding: '32px', borderRadius: '32px', boxShadow: '0 10px 30px rgba(234, 179, 8, 0.05)', border: '2px solid #fef3c7' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', color: '#854d0e' }}>
                    <Shield size={24} color="#eab308" fill="#eab308" /> Coach Corner
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: '#92400e', fontWeight: 600, lineHeight: '1.6', fontStyle: 'italic', margin: 0 }}>
                    "{coachFeedback}"
                  </p>
                  <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', fontWeight: 900 }}>GL</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#b45309' }}>Dein Coach Team</div>
                  </div>
                </div>

                {/* Social Hub Card */}
                <div className="glass-panel" style={{ background: 'white', padding: '32px', borderRadius: '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Users size={24} color="#eab308" /> Mitschüler
                    </h3>
                    <button style={{ color: '#eab308', background: 'transparent', border: 'none', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>Alle anzeigen</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '16px' }}>
                    {students.slice(0, 4).map((s, idx) => (
                      <div key={s.id} style={{ textAlign: 'center', cursor: 'pointer', position: 'relative' }} className="track-item-hover">
                        <div style={{ width: '64px', height: '64px', borderRadius: '16px', margin: '0 auto 12px auto', overflow: 'hidden', boxShadow: '0 8px 16px rgba(0,0,0,0.05)', border: '2px solid white', position: 'relative' }}>
                          <img src={s.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          {idx % 2 === 0 && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(234, 179, 8, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                               <div style={{ background: 'white', borderRadius: '50%', padding: '4px' }}><Play size={10} fill="#eab308" color="#eab308" /></div>
                            </div>
                          )}
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '0.75rem', color: '#1e293b', marginBottom: '2px' }}>{s.first_name}</div>
                        <div style={{ fontSize: '0.6rem', color: idx % 2 === 0 ? '#eab308' : '#94a3b8', fontWeight: 700 }}>
                          {idx % 2 === 0 ? 'Übt gerade' : (s.musical_styles?.[0] || 'Artist')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

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
                    onRemoveSong={handleRemoveSongFromRepertoire}
                    loggedInUserId={loggedInUserId}
                    fetchSocialData={fetchSocialData}
                    brandColor={brandColor}
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
                  <div className="glass-panel" style={{ padding: '24px', borderLeft: '5px solid #10b981', background: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ display: 'flex', gap: '-10px' }}>
                          {group.skills.map((s: any, idx: number) => (
                            <div key={s.id} title={s.instrument} style={{ width: '44px', height: '44px', borderRadius: '14px', background: INSTRUMENT_COLORS[s.instrument] || 'white', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', border: '2px solid white', zIndex: 10 - idx, marginLeft: idx > 0 ? '-15px' : 0, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                              {INSTRUMENT_ICONS[s.instrument]}
                            </div>
                          ))}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{group.artist}</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>{group.title}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveStudentTab('practice')}
                        style={{ background: '#fefce8', border: '2px solid #f59e0b', color: '#b45309', padding: '8px 16px', borderRadius: '12px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        Wiederholen
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Teacher Detail Modal */}
        {selectedTeacher && (
          <TeacherDetailModal 
            teacher={selectedTeacher} 
            onClose={() => setSelectedTeacher(null)} 
          />
        )}

        {activeStudentTab === 'library' && (
          <section className="exercises-section animation-slide-up" style={{ animationDelay: '0.1s', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
               <h2 className="gold-gradient" style={{ fontSize: '1.5rem', fontWeight: 900 }}>Song-Katalog</h2>
               <button 
                 onClick={() => {
                   if (globalSongs.length > 0) {
                     const randomSong = globalSongs[Math.floor(Math.random() * globalSongs.length)];
                     handleAddSongToRepertoire(randomSong);
                   }
                 }}
                 style={{ 
                   background: '#fefce8', border: '2px solid #f59e0b', color: '#b45309', 
                   padding: '10px 16px', borderRadius: '16px', fontWeight: 800, fontSize: '0.85rem',
                   display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                   boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)'
                 }}
               >
                 <Star size={18} fill="#f59e0b" /> Zufallssong würfeln
               </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {globalSongs.map(song => (
              <div key={song.id} className="glass-panel" style={{ padding: '20px', background: 'white', borderLeft: `4px solid ${brandColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="level-badge">{song.level}</div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e293b' }}>{song.artist}</div>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginLeft: '32px' }}>{song.title}</div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', marginLeft: '32px', alignItems: 'center' }}>
                    {song.media_link && (
                      <a href={song.media_link} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)', fontSize: '0.75rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', background: '#fefce8', padding: '4px 10px', borderRadius: '8px', fontWeight: 700 }}>
                        <ExternalLink size={12} /> Media
                      </a>
                    )}
                  </div>
                </div>
                {(() => {
                  const isInRepertoire = userSongs.some(us => us.song_id === song.id);
                  return (
                    <button 
                      onClick={() => !isInRepertoire && handleAddSongToRepertoire(song)}
                      disabled={isInRepertoire}
                      style={{ 
                        background: isInRepertoire ? '#f0fdf4' : '#f9fafb', 
                        border: `1px solid ${isInRepertoire ? '#10b981' : '#e5e7eb'}`, 
                        padding: '12px', borderRadius: '12px', 
                        cursor: isInRepertoire ? 'default' : 'pointer', 
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                        minWidth: '80px',
                        transition: 'all 0.2s'
                      }}
                    >
                      {isInRepertoire ? <Check size={20} color="#10b981" /> : <Plus size={20} color={brandColor} />}
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: isInRepertoire ? '#059669' : 'var(--text-main)' }}>
                        {isInRepertoire ? 'Bereits dabei' : 'Üben'}
                      </span>
                    </button>
                  );
                })()}
              </div>
            ))}
            {globalSongs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: '24px', color: 'var(--text-muted)' }}>
                Die Songbibliothek ist noch leer. Frag deinen Lehrer!
              </div>
            )}
            </div>
          </section>
        )}

        {/* User Profile Tab - SQUARE ARTIST DESIGN */}
        {activeStudentTab === 'profile' && (
          <div className="tab-content animation-slide-up" style={{ paddingBottom: '80px', maxWidth: '1200px', margin: '0 auto' }}>
            
            {/* Header: Square Artist Info */}
            <div className="glass-panel" style={{ 
              background: 'white', 
              padding: '40px', 
              marginBottom: '32px',
              display: 'flex',
              gap: '40px',
              alignItems: 'flex-end',
              borderRadius: '32px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.02)',
              flexWrap: 'wrap'
            }}>
              {/* Large Square Avatar */}
              <div style={{ 
                width: '220px', 
                height: '220px', 
                borderRadius: '24px', 
                overflow: 'hidden',
                background: '#f1f5f9',
                boxShadow: '0 12px 32px rgba(0,0,0,0.1)',
                border: '4px solid white',
                position: 'relative',
                flexShrink: 0
              }}>
                {user.photo_url ? (
                  <img src={user.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem', fontWeight: 900, color: '#e2e8f0' }}>
                    {user.first_name?.[0]}
                  </div>
                )}
                {/* Level Overlay */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)', padding: '20px 10px 10px 10px', color: 'white', fontSize: '0.7rem', fontWeight: 900, textAlign: 'center', textTransform: 'uppercase' }}>
                  Level {Math.floor(userSongs.reduce((acc: number, s: any) => acc + (s.progress || 0), 0) / 100) + 1} Artist
                </div>
              </div>

              <div style={{ flex: 1, minWidth: '300px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ background: '#eab308', color: 'white', padding: '4px 12px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase' }}>
                    PRO Artist
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600 }}>Groovelab Academy</span>
                </div>
                <h1 style={{ fontSize: '3.5rem', fontWeight: 900, margin: '0 0 16px 0', color: '#1e293b', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {user.first_name} {user.last_name?.[0]}.
                  {user.birth_date && (
                    <span style={{ fontSize: '1.5rem', color: '#94a3b8', fontWeight: 700, marginLeft: '16px' }}>
                      {(() => {
                        const ageDifMs = Date.now() - new Date(user.birth_date).getTime();
                        const ageDate = new Date(ageDifMs);
                        return Math.abs(ageDate.getUTCFullYear() - 1970);
                      })()} Jahre
                    </span>
                  )}
                </h1>
                
                <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(user.musical_styles || ['Rock', 'Metal']).map((style: string) => (
                      <span key={style} style={{ border: '1px solid #e2e8f0', color: '#64748b', padding: '6px 16px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                        {style}
                      </span>
                    ))}
                  </div>
                  <button 
                    onClick={() => setShowEditProfile(true)}
                    style={{ background: 'transparent', border: 'none', color: '#eab308', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    Profil bearbeiten <Plus size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Grid Section: Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginBottom: '40px' }}>
              
              {/* Radar Card */}
              <div className="glass-panel" style={{ background: 'white', padding: '32px', borderRadius: '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <RadarIcon size={24} color="#eab308" /> Skill Radar
                </h3>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                      { subject: 'Guitar', A: userSongs.filter(s => s.instrument === 'Guitar').reduce((acc, s) => acc + s.progress, 0) / 2 || 20 },
                      { subject: 'Bass', A: userSongs.filter(s => s.instrument === 'Bass').reduce((acc, s) => acc + s.progress, 0) / 2 || 10 },
                      { subject: 'Drums', A: userSongs.filter(s => s.instrument === 'Drums').reduce((acc, s) => acc + s.progress, 0) / 2 || 40 },
                      { subject: 'Keys', A: userSongs.filter(s => s.instrument === 'Keys').reduce((acc, s) => acc + s.progress, 0) / 2 || 15 },
                      { subject: 'Vocals', A: userSongs.filter(s => s.instrument === 'Vocals').reduce((acc, s) => acc + s.progress, 0) / 2 || 5 }
                    ]}>
                      <PolarGrid stroke="#f1f5f9" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                      <Radar name="Skills" dataKey="A" stroke="#eab308" fill="#eab308" fillOpacity={0.6} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Hotspots Card */}
              <div className="glass-panel" style={{ background: 'white', padding: '32px', borderRadius: '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Clock size={24} color="#eab308" /> Lab Activity
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {getCommunityHeatmapData().map((dayData: any) => (
                    <div key={dayData.day} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '40px', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>{dayData.day.substring(0, 3)}</div>
                      <div style={{ flex: 1, height: '30px', display: 'flex', gap: '3px' }}>
                        {dayData.slots.map((slot: any, sIdx: number) => {
                          const intensity = Math.min(slot.count * 0.2, 1);
                          return (
                            <div 
                              key={sIdx} 
                              title={`${dayData.day}, ${slot.hour}:00 Uhr`}
                              style={{ 
                                flex: 1, 
                                background: slot.count > 0 ? `rgba(234, 179, 8, ${0.1 + intensity * 0.9})` : '#f8fafc',
                                borderRadius: '6px',
                                border: slot.count > 0 ? '1px solid rgba(234, 179, 8, 0.1)' : 'none'
                              }}
                            ></div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '0.7rem', color: '#cbd5e1', fontWeight: 700 }}>
                  <span>08:00</span>
                  <span>14:00</span>
                  <span>20:00</span>
                </div>
              </div>

              {/* Equipment Card */}
              <div className="glass-panel" style={{ background: 'white', padding: '32px', borderRadius: '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Music size={24} color="#eab308" /> Mein Equipment
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                  {(user.equipment_list || []).map((item: any, idx: number) => (
                    <div key={idx} style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ background: '#eab308', color: 'white', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Music size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>{item.instrument || item.category}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{item.model}</div>
                      </div>
                    </div>
                  ))}
                  {(user.equipment_list || []).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', border: '2px dashed #f1f5f9', borderRadius: '24px' }}>
                      Noch kein Equipment eingetragen.
                    </div>
                  )}
                </div>
              </div>

              {/* Coach Feedback Card */}
              <div className="glass-panel" style={{ background: '#fffbeb', padding: '32px', borderRadius: '32px', boxShadow: '0 10px 30px rgba(234, 179, 8, 0.05)', border: '2px solid #fef3c7' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', color: '#854d0e' }}>
                  <Shield size={24} color="#eab308" fill="#eab308" /> Coach Corner
                </h3>
                <p style={{ fontSize: '0.9rem', color: '#92400e', fontWeight: 600, lineHeight: '1.6', fontStyle: 'italic', margin: 0 }}>
                  "{coachFeedback}"
                </p>
                <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', fontWeight: 900 }}>GL</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#b45309' }}>Dein Coach Team</div>
                </div>
              </div>

              {/* Social Hub Card */}
              <div className="glass-panel" style={{ background: 'white', padding: '32px', borderRadius: '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Users size={24} color="#eab308" /> Mitschüler
                  </h3>
                  <button style={{ color: '#eab308', background: 'transparent', border: 'none', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>Alle anzeigen</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '16px' }}>
                  {students.slice(0, 4).map((s, idx) => (
                    <div key={s.id} style={{ textAlign: 'center', cursor: 'pointer', position: 'relative' }} className="track-item-hover">
                      <div style={{ width: '64px', height: '64px', borderRadius: '16px', margin: '0 auto 12px auto', overflow: 'hidden', boxShadow: '0 8px 16px rgba(0,0,0,0.05)', border: '2px solid white', position: 'relative' }}>
                        <img src={s.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        {idx % 2 === 0 && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(234, 179, 8, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             <div style={{ background: 'white', borderRadius: '50%', padding: '4px' }}><Play size={10} fill="#eab308" color="#eab308" /></div>
                          </div>
                        )}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.75rem', color: '#1e293b', marginBottom: '2px' }}>{s.first_name}</div>
                      <div style={{ fontSize: '0.6rem', color: idx % 2 === 0 ? '#eab308' : '#94a3b8', fontWeight: 700 }}>
                        {idx % 2 === 0 ? 'Übt gerade' : (s.musical_styles?.[0] || 'Artist')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tracklist Section: My Songs */}
            <div className="glass-panel" style={{ background: 'white', padding: '40px', borderRadius: '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '32px', color: '#1e293b' }}>Meine Tracks</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {userSongs.map((song, idx) => (
                  <div key={song.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '16px', 
                    borderRadius: '20px', 
                    transition: 'background 0.2s',
                    cursor: 'pointer',
                    background: '#fcfcfc',
                    border: '1px solid rgba(0,0,0,0.02)'
                  }} className="track-item-hover">
                    <div style={{ width: '32px', color: '#cbd5e1', fontWeight: 800, fontSize: '0.9rem' }}>{idx + 1}</div>
                    
                    {/* Square Track Preview */}
                    <div style={{ 
                      width: '64px', 
                      height: '64px', 
                      borderRadius: '12px', 
                      background: INSTRUMENT_COLORS[song.instrument] || '#eab308', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      marginRight: '24px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      flexShrink: 0
                    }}>
                      {INSTRUMENT_ICONS[song.instrument]}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e293b' }}>{song.title}</div>
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>{song.artist}</div>
                    </div>

                    {/* Progress Bar Alignment */}
                    <div style={{ width: '200px', marginRight: '40px', display: width < 768 ? 'none' : 'block' }}>
                      <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                        <div style={{ width: `${song.progress}%`, height: '100%', background: '#eab308' }}></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
                        <span>Progress</span>
                        <span>{song.progress}%</span>
                      </div>
                    </div>

                    {/* Aligned Interactive Button */}
                    <button 
                      onClick={() => setActiveStudentTab('practice')}
                      style={{ 
                        width: '120px', 
                        background: '#f8fafc', 
                        border: '1px solid #e2e8f0', 
                        padding: '10px', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem', 
                        fontWeight: 800, 
                        color: '#1e293b',
                        cursor: 'pointer'
                      }}
                    >
                      Öffnen
                    </button>
                  </div>
                ))}

                {userSongs.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                    <Music size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
                    <p style={{ fontWeight: 700 }}>Noch keine Tracks in deiner Liste.</p>
                    <button onClick={() => setActiveStudentTab('library')} style={{ color: '#eab308', background: 'transparent', border: 'none', fontWeight: 800, cursor: 'pointer', marginTop: '8px' }}>Bibliothek durchstöbern →</button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Section: Social Hub */}
            <div style={{ marginTop: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b' }}>Mitschüler</h3>
                <button style={{ color: '#eab308', background: 'transparent', border: 'none', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}>Alle anzeigen</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                {students.slice(0, 5).map(s => (
                  <div key={s.id} className="glass-panel" style={{ background: 'white', padding: '24px', borderRadius: '24px', textAlign: 'center', border: '1px solid rgba(0,0,0,0.02)' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '16px', margin: '0 auto 16px auto', overflow: 'hidden', boxShadow: '0 8px 16px rgba(0,0,0,0.05)' }}>
                      <img src={s.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b', marginBottom: '4px' }}>{s.first_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginBottom: '16px' }}>{s.musical_styles?.[0] || 'Artist'}</div>
                    <button 
                      onClick={() => handleFriendRequest(s.id)}
                      style={{ width: '100%', padding: '10px', borderRadius: '12px', border: '1px solid #fef3c7', background: '#fefce8', color: '#b45309', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Connect
                    </button>
                  </div>
                ))}
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
              <div key={song.id} className="song-match-card" style={{ borderLeft: '5px solid #f59e0b' }}>
                <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: '6px' }}>
                  <div style={{ background: '#f59e0b', color: 'white', padding: '3px 10px', borderRadius: '100px', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '6px', height: '6px', background: 'white', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></div>
                    Live Match
                  </div>
                </div>
                
                <div className="song-match-header" style={{ marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{song.artist}</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>{song.title}</div>
                  </div>
                  {song.media_link && (
                    <a href={song.media_link} target="_blank" rel="noreferrer" style={{ color: '#f59e0b', background: '#fffbeb', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fef3c7' }}>
                      <ExternalLink size={18} />
                    </a>
                  )}
                </div>
                
                <div className="band-slots-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '20px' }}>
                  {['Guitar', 'Bass', 'Drums', 'Keys'].map(inst => {
                    const count = song.counts[inst] || 0;
                    const isFilled = count > 0;
                    return (
                      <div key={inst} className={`band-slot-placeholder ${isFilled ? 'active' : 'empty'}`}>
                        <div className="placeholder-icon">
                          {INSTRUMENT_ICONS[inst] || '🎵'}
                        </div>
                        <div className="placeholder-label">
                          {inst === 'Guitar' ? 'Gitarre' : inst}
                        </div>
                        <div className="placeholder-status">
                          {isFilled ? 'READY' : 'FREE'}
                        </div>
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
                    <div style={{ fontWeight: 700 }}>{m.users.first_name} {m.users.last_name?.[0]}.</div>
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
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        <button onClick={() => setActiveStudentTab('profile')} className={activeStudentTab === 'profile' ? 'active' : ''}>
          <Shield size={24} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Profil</span>
        </button>
        <button onClick={() => setActiveStudentTab('practice')} className={activeStudentTab === 'practice' ? 'active' : ''}>
          <Play size={24} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Üben</span>
        </button>
        <button onClick={() => setActiveStudentTab('repertoire')} className={activeStudentTab === 'repertoire' ? 'active' : ''}>
          <Award size={24} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Repertoire</span>
        </button>
        <button onClick={() => setActiveStudentTab('library')} className={activeStudentTab === 'library' ? 'active' : ''}>
          <Library size={24} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Bib</span>
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

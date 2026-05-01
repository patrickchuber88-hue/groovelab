import React, { useState, useEffect } from 'react';
import { Music, AlertCircle, Play, Library, Shield, LogOut, Award, Users, User, Monitor, X, Camera, Clock, QrCode, Plus, ExternalLink, BarChart as LucideBarChart, Star, Box, Settings, Lock, Pencil, Trash2, Zap, RotateCcw, Check } from 'lucide-react';
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
import { TeacherDetailModal } from './components/TeacherDetailModal';
import './App.css';

const INSTRUMENT_ICONS: Record<string, string> = { Guitar: '🎸', Keys: '🎹', Drums: '🥁', Bass: '🎸', Vocals: '🎤' };
const INSTRUMENT_COLORS: Record<string, string> = {
  Guitar: '#ef4444', // Red
  Keys: '#a855f7',   // Purple
  Drums: '#3b82f6',  // Blue
  Bass: '#eab308',   // Yellow
  Vocals: '#10b981'  // Emerald
};
const brandColor = 'var(--primary-color)';


function GroupedSongCard({ songGroup, onUpdateProgress, onSubmitForApproval, isBandReady, onDelete }: any) {
  const [activeInst, setActiveInst] = useState(songGroup.skills[0].instrument);
  const activeSkill = songGroup.skills.find((s: any) => s.instrument === activeInst) || songGroup.skills[0];

  return (
    <div className={`glass-panel animation-slide-up ${isBandReady ? 'band-ready' : ''} ${activeSkill.progress >= 90 && !activeSkill.is_stage_ready ? 'challenge-glow' : ''}`} style={{ 
      padding: '24px', 
      position: 'relative', 
      overflow: 'hidden', 
      borderRadius: '24px', 
      display: 'flex', 
      alignItems: 'center', 
      marginBottom: '16px', 
      background: 'white', 
      borderLeft: `6px solid ${isBandReady ? '#f59e0b' : (INSTRUMENT_COLORS[activeInst] || '#cbd5e1')}`,
      boxShadow: activeSkill.progress >= 90 && !activeSkill.is_stage_ready ? `0 0 20px ${brandColor}33` : '0 4px 20px rgba(0,0,0,0.03)'
    }}>
      {activeSkill.progress >= 90 && !activeSkill.is_stage_ready && (
        <style>{`
          .challenge-glow {
            animation: border-pulse 2s infinite ease-in-out;
          }
          @keyframes border-pulse {
            0% { box-shadow: 0 0 10px ${brandColor}22; }
            50% { box-shadow: 0 0 25px ${brandColor}55; }
            100% { box-shadow: 0 0 10px ${brandColor}22; }
          }
        `}</style>
      )}
      
      {/* Left: Song Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '260px', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          {songGroup.media_link ? (
            <a 
              href={songGroup.media_link} 
              target="_blank" 
              rel="noreferrer" 
              style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '14px', 
                background: '#1e293b', 
                color: 'white', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textDecoration: 'none'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              title="Noten öffnen"
            >
              <Library size={24} />
            </a>
          ) : (
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e293b' }}>
              <Music size={24} />
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{songGroup.artist}</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginTop: '2px' }}>{songGroup.title}</div>
        </div>
      </div>

      {/* Middle: Compact Instrument Icons */}
      <div style={{ display: 'flex', gap: '12px', padding: '0 32px', borderRight: '1px solid #f1f5f9', flexShrink: 0 }}>
        {['Guitar', 'Keys', 'Drums', 'Bass'].map(instName => {
          const skill = songGroup.skills.find((s: any) => s.instrument === instName);
          if (!skill) return null;
          
          const isAct = skill.instrument === activeInst;
          let instColor = INSTRUMENT_COLORS[skill.instrument] || brandColor;
          
          return (
            <div key={skill.instrument} onClick={() => setActiveInst(skill.instrument)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s' }}>
              <div style={{ 
                width: '40px', height: '40px', borderRadius: '12px', 
                background: isAct ? instColor : '#f1f5f9', 
                color: isAct ? 'white' : '#64748b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isAct ? `0 4px 12px ${instColor}44` : 'none',
                transform: isAct ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.2s ease'
              }}>
                <span style={{ fontSize: '1.2rem' }}>{INSTRUMENT_ICONS[skill.instrument] || '🎵'}</span>
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: 900, color: isAct ? instColor : '#94a3b8' }}>
                {skill.progress}%
              </div>
            </div>
          );
        })}
      </div>

      {/* Right: Interaction Area */}
      <div style={{ flex: 1, paddingLeft: '40px', display: 'flex', alignItems: 'center', paddingRight: '40px', position: 'relative' }}>
        <div style={{ width: '100%', position: 'relative', paddingTop: '10px' }}>
          {activeSkill.is_pending_approval ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fef9c3', border: '1px solid #fde047', padding: '12px 20px', borderRadius: '16px', color: '#854d0e', fontWeight: 800, fontSize: '0.9rem' }}>
              <Clock size={20} /> Lehrer wurde informiert - mach dich bereit!
            </div>
          ) : activeSkill.is_stage_ready ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#10b981', border: '1px solid #059669', padding: '16px 24px', borderRadius: '16px', color: 'white', fontWeight: 900, fontSize: '1rem', boxShadow: '0 8px 20px rgba(16, 185, 129, 0.2)' }}>
              <Award size={24} /> 100% starke Leistung. Du bist jetzt bereit für die Bühne!
            </div>
          ) : (
            <>
              <div style={{ position: 'absolute', top: -15, left: `${activeSkill.progress}%`, transform: 'translateX(-50%)', fontSize: '0.85rem', fontWeight: 900, color: INSTRUMENT_COLORS[activeSkill.instrument] || brandColor, whiteSpace: 'nowrap' }}>
                {activeSkill.progress}% Fortschritt
              </div>
              
              <div style={{ position: 'relative', height: '48px', display: 'flex', alignItems: 'center' }}>
                {/* Markers */}
                {[0, 30, 60, 90, 100].map(mark => (
                  <div key={mark} style={{ position: 'absolute', left: `${mark}%`, top: '50%', transform: 'translate(-50%, -50%)', height: '14px', width: '2px', background: '#cbd5e1', zIndex: 1 }}>
                    <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8' }}>
                      {mark}%
                    </div>
                  </div>
                ))}
                
                {/* Visual Track */}
                <div style={{ position: 'absolute', left: 0, right: 0, height: '6px', background: '#f1f5f9', borderRadius: '3px', zIndex: 2 }}>
                  <div style={{ width: `${activeSkill.progress}%`, height: '100%', background: INSTRUMENT_COLORS[activeSkill.instrument] || brandColor, borderRadius: '3px', transition: 'width 0.1s linear' }}></div>
                </div>

                <input 
                  type="range" min="0" max="90" value={activeSkill.progress} 
                  onChange={(e) => onUpdateProgress(activeSkill.id, parseInt(e.target.value))}
                  style={{ 
                    width: '100%', 
                    height: '40px', 
                    appearance: 'none',
                    background: 'transparent',
                    cursor: 'pointer', 
                    zIndex: 10, 
                    margin: 0,
                    position: 'relative'
                  }}
                />
              </div>

              {activeSkill.progress >= 90 && (
                <button 
                  onClick={() => onSubmitForApproval(activeSkill)}
                  style={{ marginTop: '16px', background: brandColor, color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: `0 8px 16px ${brandColor}44` }}
                >
                  Challenge einreichen <Zap size={18} fill="white" />
                </button>
              )}
              
              {/* Custom Thumb Style */}
              <style>{`
                input[type=range]::-webkit-slider-thumb {
                  appearance: none;
                  height: 24px;
                  width: 24px;
                  border-radius: 50%;
                  background: white;
                  border: 4px solid #f1f5f9;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                  cursor: pointer;
                  margin-top: -9px;
                }
                input[type=range]::-moz-range-thumb {
                  height: 24px;
                  width: 24px;
                  border-radius: 50%;
                  background: white;
                  border: 4px solid #f1f5f9;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                  cursor: pointer;
                }
              `}</style>
            </>
          )}
        </div>
      </div>

      {/* Action Buttons & Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Tomplay Link */}
        {songGroup.tomplay_url && (
          <a 
            href={songGroup.tomplay_url} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#000', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 800, textDecoration: 'none', background: '#f8fafc', padding: '10px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ background: '#000', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 900 }}>TOMPLAY</div>
            Noten öffnen
          </a>
        )}

        {/* PDF/Media Link */}
        {songGroup.media_link && (
          <a 
            href={songGroup.media_link} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#64748b', background: '#f8fafc', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <Box size={20} />
          </a>
        )}

        <div style={{ height: '30px', width: '1px', background: '#f1f5f9', margin: '0 8px' }}></div>

        {activeSkill.progress === 100 && !activeSkill.is_stage_ready && (
          <button 
            onClick={() => onSubmitForApproval(activeSkill)}
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '14px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)', transition: 'all 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Challenge einreichen
          </button>
        )}
        
        {activeSkill.is_stage_ready && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#065f46', color: 'white', padding: '10px 20px', borderRadius: '14px', fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', boxShadow: '0 4px 12px rgba(6, 95, 70, 0.3)' }}>
            <Award size={18} /> Ready to Gig
          </div>
        )}

        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(songGroup.song_id);
          }}
          style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '8px', transition: 'all 0.2s' }} 
          onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'} 
          onMouseLeave={(e) => e.currentTarget.style.color = '#cbd5e1'}
        >
          <Trash2 size={24} />
        </button>
      </div>

    </div>
  );
}


function App() {
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(() => sessionStorage.getItem('groovelab_user_id'));
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [totalPresenceMins, setTotalPresenceMins] = useState(0);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !user) return;
    
    const { error } = await supabase.from('users').update({
      first_name: editingProfile.first_name,
      last_name: editingProfile.last_name,
      photo_url: editingProfile.photo_url,
      instrument: editingProfile.instrument
    }).eq('id', user.id);
    
    if (error) alert('Fehler beim Aktualisieren: ' + error.message);
    else {
      setShowEditProfile(false);
      // Refresh local user state
      const { data: updatedUser } = await supabase.from('users').select('*, schools(*)').eq('id', user.id).single();
      if (updatedUser) setUser(updatedUser);
    }
  };
  const [userSongs, setUserSongs] = useState<any[]>([]);
  const [userBands, setUserBands] = useState<any[]>([]);
  const [wallSongs, setWallSongs] = useState<any[]>([]);
  const [globalSongs, setGlobalSongs] = useState<any[]>([]);
  const [plannedSlots, setPlannedSlots] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('groovelab_planned_slots') || '[]');
    } catch {
      return [];
    }
  });
  const [activeStudentTab, setActiveStudentTab] = useState<string>(() => {
    return localStorage.getItem('groovelab_active_tab') || 'profile';
  });
  const [showQR, setShowQR] = useState(false);
  const [showConfetti, setShowConfetti] = useState<any>(null);
  const [bandModalData, setBandModalData] = useState<any>(null);
  const [selectedEqCat, setSelectedEqCat] = useState('E-Gitarre');
  const [activeStudentsCount, setActiveStudentsCount] = useState(0);
  const [locationMode, setLocationMode] = useState<'lab' | 'home'>(() => (sessionStorage.getItem('groovelab_location_mode') as 'lab' | 'home') || 'home');
  const [personalRejections] = useState<any[]>([]);
  const [teachers] = useState<any[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [studentActivity, setStudentActivity] = useState<any[]>([]);

  useEffect(() => {
    localStorage.setItem('groovelab_active_tab', activeStudentTab);
  }, [activeStudentTab]);
  const { width, height } = useWindowSize();
  const [liveSessionMins, setLiveSessionMins] = useState(0);
  
  // Synchronous read to avoid flicker
  const [stationIdFromStorage] = useState(() => localStorage.getItem('groovelab_station_id'));

  useEffect(() => {
    localStorage.setItem('groovelab_active_tab', activeStudentTab);
  }, [activeStudentTab]);

  const toggleSlot = (day: string, time: string) => {
    const key = `${day}-${time}`;
    const newSlots = plannedSlots.includes(key) ? plannedSlots.filter(s => s !== key) : [...plannedSlots, key];
    setPlannedSlots(newSlots);
    localStorage.setItem('groovelab_planned_slots', JSON.stringify(newSlots));
  };

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
    let interval: NodeJS.Timeout;
    if (session && !session.check_out_time) {
      const start = new Date(session.check_in_time).getTime();
      const update = () => {
        const now = new Date().getTime();
        setLiveSessionMins(Math.max(0, Math.floor((now - start) / 60000)));
      };
      update();
      interval = setInterval(update, 60000);
    } else {
      setLiveSessionMins(0);
    }
    return () => clearInterval(interval);
  }, [session]);

  // Realtime Session Monitor (Single Login Rule)
  useEffect(() => {
    if (!session?.id) return;

    const channel = supabase
      .channel(`session_monitor_${session.id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'sessions',
        filter: `id=eq.${session.id}`
      }, (payload) => {
        if (payload.new.check_out_time) {
          // Session was closed externally (e.g. by another login)
          handleLogout();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id]);

  const fetchDashboardData = async (userId: string) => {
    try {
      setLoading(true);
      
      const { data: userData } = await supabase
        .from('users')
        .select('*, schools(*)')
        .eq('id', userId)
        .single();
        
      setUser(userData);
      
      // Fetch latest active session
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('*, stations(name)')
        .eq('user_id', userId)
        .is('check_out_time', null) // Only active sessions
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
          user_id: p.user_id,
          title: p.songs.title,
          artist: p.songs.artist,
          progress: p.is_stage_ready ? 100 : (p.progress_percent || 0),
          instrument: p.instrument,
          is_stage_ready: p.is_stage_ready,
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
          instrumentation,
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

          // A band is complete if all required instruments (excluding Vocals) are covered
          const requiredInsts = song.instrumentation || { Guitar: 1, Bass: 1, Drums: 1, Keys: 0 };
          const isComplete = Object.keys(requiredInsts).every(inst => {
            if (inst === 'Vocals') return true;
            return requiredInsts[inst] === 0 || counts[inst] > 0;
          });

          return {
            id: song.id,
            artist: song.artist,
            title: song.title,
            media_link: song.media_link,
            instrumentation: song.instrumentation,
            counts,
            isComplete
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
        setUserBands(userBandsData);
        const unseen = userBandsData.find(b => !b.confetti_seen);
        if (unseen) setShowConfetti(unseen);
      }

      // Lade aktive Schüler für Statusleiste (gefiltert nach Schule)
      const { count: activeCount } = await supabase
        .from('sessions')
        .select('*, profiles:users!inner(role, school_id)', { count: 'exact', head: true })
        .is('check_out_time', null)
        .eq('profiles.role', 'student')
        .eq('profiles.school_id', userData.school_id);
      setActiveStudentsCount(activeCount || 0);

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

  const handleDeleteSong = async (songId: string) => {
    console.log('Attempting to delete song:', songId, 'for user:', loggedInUserId);
    if (!window.confirm('Möchtest du diesen Song aus deinem Übe-Board entfernen?')) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('user_song_skills').delete().eq('song_id', songId).eq('user_id', loggedInUserId);
      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
      console.log('Delete successful');
      if (loggedInUserId) await fetchDashboardData(loggedInUserId);
    } catch (e: any) {
      alert('Fehler beim Löschen: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSongToRepertoire = async (song: any) => {
    if (!loggedInUserId) return;
    try {
      setLoading(true);
      
      const req = song.instrumentation || { Guitar: 1, Bass: 1, Drums: 1, Keys: 0, Vocals: 1 };
      // By default, don't add Vocals until band is ready
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
    localStorage.removeItem('groovelab_active_tab');
    sessionStorage.removeItem('groovelab_user_id');
    sessionStorage.removeItem('groovelab_location_mode');
  };

  if (!stationIdFromStorage) {
    return <DeviceSetupScreen />;
  }

  const handleLogin = (userId: string, isHome?: boolean) => {
    const mode = isHome ? 'home' : 'lab';
    setLoggedInUserId(userId);
    setLocationMode(mode);
    sessionStorage.setItem('groovelab_user_id', userId);
    sessionStorage.setItem('groovelab_location_mode', mode);
  };

  useEffect(() => {
    if (user && !localStorage.getItem('groovelab_active_tab')) {
      if (user.role === 'admin' || user.role === 'teacher') {
        setActiveStudentTab('live');
      } else {
        setActiveStudentTab('profile');
      }
    }
    // Realtime subscription for sessions (Active Student Count)
    const sessionsChannel = supabase
      .channel('public:sessions_count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        if (user?.school_id) {
          fetchActiveStudentCount(user.school_id);
        }
      })
      .subscribe();

    // Heartbeat: Update last_seen every 60 seconds
    const heartbeat = setInterval(async () => {
      if (user?.id) {
        await supabase
          .from('users')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', user.id);
      }
    }, 60000);

    return () => {
      supabase.removeChannel(sessionsChannel);
      clearInterval(heartbeat);
    };
  }, [user?.id, user?.school_id]);

  const fetchActiveStudentCount = async (schoolId: string) => {
    // Fetch sessions and join users to filter by school
    // Count students OR anyone (including teachers) who is checked into a station
    const { data: activeSessions } = await supabase
      .from('sessions')
      .select('user_id, station_id, users!inner(role, school_id)')
      .is('check_out_time', null)
      .eq('users.school_id', schoolId);
    
    // Filter: (Role is student) OR (Role is teacher/admin AND station_id is NOT null)
    const count = activeSessions?.filter(s => 
      s.users.role === 'student' || 
      ((s.users.role === 'teacher' || s.users.role === 'admin') && s.station_id)
    ).length || 0;
    
    setActiveStudentsCount(count);
  };

  if (!loggedInUserId) {
    return <LoginScreen onLogin={handleLogin} kioskStationId={isKioskMode ? stationIdFromStorage : null} />;
  }

  if (loading || !user) {
    return <div className="app-container flex-center">Lade Daten aus Supabase...</div>;
  }



  const calculateSkillXP = (skill: any) => {
    if (skill.is_stage_ready || skill.progress === 100) return 500;
    return (skill.progress || 0) * 2;
  };

  const studentRadarData = (() => {
    const radarBase: Record<string, number> = { Guitar: 0, Bass: 0, Drums: 0, Keys: 0 };
    userSongs.forEach((s: any) => {
      if (radarBase[s.instrument] !== undefined) {
        radarBase[s.instrument] += calculateSkillXP(s);
      }
    });
    return Object.entries(radarBase).map(([inst, xp]) => ({ instrument: inst, xp }));
  })();

  const totalPracticeMins = totalPresenceMins + liveSessionMins;
  const brandColor = 'var(--primary-color)';

  // Group userSongs by song_id
  const practiceSongs = userSongs.filter((s: any) => s.progress < 100 || s.is_pending_approval);
  const repertoireSongs = userSongs.filter((s: any) => s.progress === 100 && !s.is_pending_approval);

  const groupSongs = (songs: any[]) => Object.values(songs.reduce((acc: any, skill: any) => {
    if (!acc[skill.song_id]) {
      const wallMatch = wallSongs.find(ws => ws.id === skill.song_id);
      
      acc[skill.song_id] = {
        song_id: skill.song_id,
        title: skill.title,
        artist: skill.artist,
        media_link: skill.media_link,
        tomplay_url: skill.tomplay_url,
        isBandReady: wallMatch?.isComplete || false,
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
        <div className="sidebar-logo" style={{ padding: '32px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '42px', 
            height: '42px', 
            background: '#fefce8', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(234, 179, 8, 0.1)'
          }}>
            <Music size={24} color="#eab308" strokeWidth={3} />
          </div>
          <div style={{ 
            fontSize: '1.5rem', 
            fontWeight: 900, 
            color: '#eab308',
            letterSpacing: '-0.02em'
          }}>GrooveLab</div>
        </div>

        <nav className="sidebar-menu" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {user.role === 'student' ? (
            <>
              <button onClick={() => setActiveStudentTab('profile')} className={`sidebar-item ${activeStudentTab === 'profile' ? 'active' : ''}`}>
                <Shield size={20} /> Profil
              </button>
              <button onClick={() => setActiveStudentTab('live')} className={`sidebar-item ${activeStudentTab === 'live' ? 'active' : ''}`}>
                <Monitor size={20} /> Live Lab
              </button>
              <button 
                onClick={() => setActiveStudentTab('practice')} 
                className={`sidebar-item ${activeStudentTab === 'practice' ? 'active' : ''}`}
                style={{
                  background: activeStudentTab === 'practice' ? brandColor : 'transparent',
                  color: activeStudentTab === 'practice' ? 'white' : '#64748b',
                  boxShadow: activeStudentTab === 'practice' ? `0 10px 20px -5px ${brandColor}44` : 'none',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  marginTop: '8px',
                  marginBottom: '8px'
                }}
              >
                <Play size={20} fill={activeStudentTab === 'practice' ? 'white' : 'none'} /> Üben
              </button>
              <button onClick={() => setActiveStudentTab('repertoire')} className={`sidebar-item ${activeStudentTab === 'repertoire' ? 'active' : ''}`}>
                <Award size={20} /> Repertoire
              </button>
              <button onClick={() => setActiveStudentTab('library')} className={`sidebar-item ${activeStudentTab === 'library' ? 'active' : ''}`}>
                <Library size={20} /> Bibliothek
              </button>
              {/* Band-Finder hidden as Vocals are temporarily disabled */}
              <button onClick={() => setActiveStudentTab('team')} className={`sidebar-item ${activeStudentTab === 'team' ? 'active' : ''}`}>
                <Users size={20} /> Lehrer
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setActiveStudentTab('live')} className={`sidebar-item ${activeStudentTab === 'live' ? 'active' : ''}`} style={{
                background: activeStudentTab === 'live' ? '#fffbeb' : 'transparent',
                color: activeStudentTab === 'live' ? '#eab308' : '#64748b',
                borderRadius: '16px',
                padding: '14px 16px',
                marginBottom: '8px'
              }}>
                <Monitor size={20} color={activeStudentTab === 'live' ? '#eab308' : '#64748b'} /> Live Lab
              </button>
              <button onClick={() => setActiveStudentTab('students')} className={`sidebar-item ${activeStudentTab === 'students' ? 'active' : ''}`}>
                <Users size={20} /> Schüler
              </button>
              <button onClick={() => setActiveStudentTab('team')} className={`sidebar-item ${activeStudentTab === 'team' ? 'active' : ''}`}>
                <Shield size={20} /> Team
              </button>
              <button onClick={() => setActiveStudentTab('rooms')} className={`sidebar-item ${activeStudentTab === 'rooms' ? 'active' : ''}`}>
                <Box size={20} /> Räume
              </button>
              <button onClick={() => setActiveStudentTab('songs')} className={`sidebar-item ${activeStudentTab === 'songs' ? 'active' : ''}`}>
                <Library size={20} /> Songs
              </button>
              <button onClick={() => setActiveStudentTab('stats')} className={`sidebar-item ${activeStudentTab === 'stats' ? 'active' : ''}`}>
                <LucideBarChart size={20} /> Statistik
              </button>
              <button onClick={() => setActiveStudentTab('gallery')} className={`sidebar-item ${activeStudentTab === 'gallery' ? 'active' : ''}`}>
                <QrCode size={20} /> ID Galerie
              </button>
              <button onClick={() => setActiveStudentTab('setup')} className={`sidebar-item ${activeStudentTab === 'setup' ? 'active' : ''}`}>
                <Shield size={20} /> Setup
              </button>
            </>
          )}
        </nav>

        <div style={{ marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '24px', paddingBottom: '32px' }}>
          <div style={{ padding: '0 16px', marginBottom: '16px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', overflow: 'hidden', border: '2px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <img src={user.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  </div>
                  {session && <div style={{ position: 'absolute', bottom: -2, right: -2, width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%', border: '2px solid white' }}></div>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>{user.first_name}</div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{user.instrument || 'Musiker'}</div>
                </div>
             </div>
          </div>
          <button 
            onClick={() => setActiveStudentTab('profile')} 
            className={`sidebar-item ${activeStudentTab === 'profile' ? 'active' : ''}`}
            style={{ marginBottom: '4px' }}
          >
            <User size={18} /> Mein Profil
          </button>
          <button 
            onClick={handleLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '14px', border: 'none', background: 'transparent', color: '#ef4444', fontWeight: 800, cursor: 'pointer' }}
          >
            <LogOut size={18} color="#ef4444" /> Abmelden
          </button>
        </div>
      </aside>

      <div className="main-wrapper" style={{ paddingTop: '0' }}>
        <header className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 32px', height: '80px', background: 'transparent' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {/* Common Status Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
               {/* Location Pill */}
               <div style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', 
                background: (user.role === 'admin' || user.role === 'teacher') ? (session?.station_id ? '#f0fdf4' : '#fefce8') : (locationMode === 'lab' ? '#fefce8' : '#eff6ff'), 
                padding: '10px 20px', borderRadius: '100px', 
                border: `1px solid ${(user.role === 'admin' || user.role === 'teacher') ? (session?.station_id ? '#dcfce7' : '#fef3c7') : (locationMode === 'lab' ? '#fef3c7' : '#bfdbfe')}`,
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: (user.role === 'admin' || user.role === 'teacher') ? (session?.station_id ? '#22c55e' : '#eab308') : (locationMode === 'lab' ? '#eab308' : '#3b82f6') }}></div>
                <span style={{ color: (user.role === 'admin' || user.role === 'teacher') ? (session?.station_id ? '#166534' : '#eab308') : (locationMode === 'lab' ? '#92400e' : '#1e40af'), fontWeight: 800, fontSize: '0.85rem' }}>
                  {(user.role === 'admin' || user.role === 'teacher') ? (session?.stations?.name || 'Coach Modus') : (locationMode === 'lab' ? `Labor (${session?.stations?.name || 'iPad'})` : 'Home Mode')}
                </span>
              </div>

              {/* Lab Count Pill */}
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', 
                background: '#f0fdf4', padding: '10px 20px', borderRadius: '100px', 
                border: '1px solid #dcfce7', boxShadow: '0 2px 10px rgba(34, 197, 94, 0.05)'
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}></div>
                <span style={{ color: '#166534', fontWeight: 800, fontSize: '0.85rem' }}>{activeStudentsCount} im Lab</span>
              </div>
            </div>

            {/* Ausweis Button (Only Student) */}
            {user.role === 'student' && (
              <button onClick={() => setShowQR(true)} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '10px 20px', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
                <span style={{ color: '#eab308', fontWeight: 800, fontSize: '0.85rem' }}>Ausweis</span>
                <QrCode size={18} color="#eab308" />
              </button>
            )}

            {/* User Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingLeft: '16px', borderLeft: '1px solid #f1f5f9' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1rem' }}>Hallo {user.first_name}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{user.instrument || 'Groovelab Academy'}</div>
              </div>
              <div style={{ width: '52px', height: '52px', borderRadius: '16px', border: '3px solid white', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <img src={user.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              </div>
            </div>
          </div>
        </header>


      <main className="main-content" style={{ overflow: 'auto' }}>
        {/* Live Lab Tab for Students */}
        {user.role === 'student' && activeStudentTab === 'live' && (
          <div className="animation-slide-up" style={{ width: '100%', padding: '32px 48px' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#1e293b', letterSpacing: '-0.04em', marginBottom: '32px' }}>Live Lab</h1>
            <TeacherDashboard userId={user.id} hideHeader={true} viewMode="student" />
          </div>
        )}

        {/* Profile Tab */}
        {activeStudentTab === 'profile' && (
          <div className="animation-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Top: Massive Hero Card */}
            <div className="glass-panel" style={{ background: 'white', borderRadius: '32px', display: 'flex', overflow: 'hidden', minHeight: '340px' }}>
              <div style={{ flex: '0 0 40%', background: '#f8fafc', position: 'relative', overflow: 'hidden' }}>
                <img 
                  src={user.photo_url || '/avatar_ghost.jpg'} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: user.photo_url || !user.first_name ? 'block' : 'none' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  alt=""
                />
                {!user.photo_url && user.first_name && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem', color: 'white', background: brandColor, fontWeight: 800 }}>
                    {user.first_name?.[0]}
                  </div>
                )}
                <div style={{ position: 'absolute', bottom: '24px', left: '0', right: '0', textAlign: 'center' }}>
                  <div style={{ display: 'inline-block', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', color: 'white', padding: '6px 16px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Level {Math.floor(totalXp / 1000) + 1} Artist
                  </div>
                </div>
              </div>
              
              <div style={{ flex: '1', padding: '48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ background: '#f59e0b', color: 'white', padding: '4px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pro Artist</span>
                  <span style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 700 }}>{user.schools?.name || 'Groovelab Academy'}</span>
                </div>
                
                <h1 style={{ fontSize: '3.5rem', fontWeight: 900, color: '#1e293b', margin: '0 0 16px 0', letterSpacing: '-0.03em' }}>
                  {user.first_name} {user.last_name?.[0]}.
                </h1>
                
                <button onClick={() => {
                  setEditingProfile({ ...user });
                  setShowEditProfile(true);
                }} style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: '#f59e0b', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: 0 }}>
                  Profil bearbeiten <Pencil size={18} />
                </button>
              </div>
            </div>

            {/* Bottom: Radar & Planner */}
            <div style={{ display: 'grid', gridTemplateColumns: width < 1024 ? '1fr' : '1fr 1fr', gap: '24px' }}>
              {/* Skill Radar */}
              <div className="glass-panel" style={{ background: 'white', borderRadius: '32px', padding: '32px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ color: '#f59e0b' }}><LucideBarChart size={24} /></div>
                  Skill Radar
                </h3>
                <div style={{ width: '100%', height: '300px' }}>
                  <ResponsiveContainer>
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={studentRadarData}>
                      <PolarGrid stroke="#f1f5f9" />
                      <PolarAngleAxis dataKey="instrument" tick={({ x, y, payload }) => (
                        <text x={x} y={y} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }}>
                          {payload.value}
                        </text>
                      )} />
                      <Radar name="XP" dataKey="xp" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Wochen-Planner */}
              <div className="glass-panel" style={{ background: 'white', borderRadius: '32px', padding: '32px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ color: '#f59e0b' }}><Clock size={24} /></div>
                  Wochen-Planner
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 24px 0' }}>Plane deine Sessions & vermeide Stoßzeiten.</p>
                
                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 12, height: 12, background: '#f59e0b', borderRadius: 3 }}></div> MEINE ZEIT</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 12, height: 12, background: '#10b981', borderRadius: 3 }}></div> FREUNDE</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <div style={{ width: 12, height: 12, background: '#cbd5e1', borderRadius: 3 }}></div>
                      <div style={{ width: 12, height: 12, background: '#94a3b8', borderRadius: 3 }}></div>
                      <div style={{ width: 12, height: 12, background: '#475569', borderRadius: 3 }}></div>
                    </div> AUSLASTUNG
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr', gap: '8px' }}>
                  <div style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: 800, color: '#cbd5e1' }}></div>
                  <div style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: 800, color: '#64748b' }}>Di</div>
                  <div style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: 800, color: '#64748b' }}>Do</div>

                  {['15:00', '15:15', '15:30', '15:45', '16:00', '16:15', '16:30'].map(time => {
                    const isDi = plannedSlots.includes(`Di-${time}`);
                    const isDo = plannedSlots.includes(`Do-${time}`);
                    return (
                    <React.Fragment key={time}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px' }}>{time}</div>
                      <div 
                        onClick={() => toggleSlot('Di', time)}
                        style={{ cursor: 'pointer', height: '24px', background: isDi ? '#f59e0b' : '#f8fafc', borderRadius: '4px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDi ? 'white' : '#64748b', fontSize: '0.7rem', fontWeight: 800, transition: 'all 0.2s' }}>
                        {isDi ? '✓' : (time === '16:15' ? '3' : time === '16:30' ? '2' : '')}
                      </div>
                      <div 
                        onClick={() => toggleSlot('Do', time)}
                        style={{ cursor: 'pointer', height: '24px', background: isDo ? '#f59e0b' : (time === '16:00' || time === '16:15' ? '#e2e8f0' : '#f8fafc'), borderRadius: '4px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDo ? 'white' : '#64748b', fontSize: '0.7rem', fontWeight: 800, transition: 'all 0.2s' }}>
                        {isDo ? '✓' : (time === '16:00' ? '1' : time === '16:15' ? '1' : '')}
                      </div>
                    </React.Fragment>
                  )})}
                </div>
              </div>
            </div>

            {/* Third Row: Repertoire & Bands */}
            <div style={{ display: 'grid', gridTemplateColumns: width < 1024 ? '1fr' : '1fr 1fr', gap: '24px', paddingBottom: '32px' }}>
              {/* Übesongs & Stage Ready */}
              <div className="glass-panel" style={{ background: 'white', borderRadius: '32px', padding: '32px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ color: brandColor }}><Music size={24} /></div>
                  Aktuelle Songs
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {userSongs.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>Noch keine Songs im Repertoire.</div>
                  ) : (
                    userSongs.map(song => (
                      <div key={song.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                        <div>
                          <div style={{ fontWeight: 800, color: '#1e293b' }}>{song.title}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {INSTRUMENT_ICONS[song.instrument as keyof typeof INSTRUMENT_ICONS] || '🎵'} {song.instrument}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: song.locked ? '#f59e0b' : '#10b981' }}>{song.progress}%</span>
                          {song.locked ? <Lock size={16} color="#94a3b8" /> : <Award size={16} color="#10b981" />}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Meine Bands */}
              <div className="glass-panel" style={{ background: 'white', borderRadius: '32px', padding: '32px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ color: '#ec4899' }}><Users size={24} /></div>
                  Meine Bands
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {userBands.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>Du bist noch in keiner Band. Übe fleißig für dein erstes Stage Ready!</div>
                  ) : (
                    userBands.map(b => (
                      <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'linear-gradient(135deg, #fdf2f8, #fbcfe8)', borderRadius: '16px', border: '1px solid #f9a8d4' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#be185d', textTransform: 'uppercase', marginBottom: '4px' }}>{b.instrument}</div>
                          <div style={{ fontWeight: 800, color: '#831843', fontSize: '1.1rem' }}>{b.bands?.songs?.title}</div>
                        </div>
                        <div style={{ background: '#db2777', color: 'white', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Play size={16} fill="white" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Admin/Teacher Section Tabs (Unified) */}
        {(user.role === 'admin' || user.role === 'teacher') && ['live', 'students', 'team', 'rooms', 'songs', 'stats', 'gallery', 'setup'].includes(activeStudentTab) && (
          <AdminDashboard 
            userId={user.id} 
            onLogout={handleLogout} 
            forceTab={activeStudentTab}
            onTabChange={(tabId) => setActiveStudentTab(tabId)}
          />
        )}

        {/* Practice Tab */}
        {activeStudentTab === 'practice' && (
          <section className="exercises-section animation-slide-up" style={{ padding: '20px' }}>
            {/* Progress Summary Bar */}
            <div className="glass-panel" style={{ 
              background: 'white', 
              padding: '24px 40px', 
              borderRadius: '24px', 
              marginBottom: '32px', 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '40px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
              flexWrap: 'wrap'
            }}>
              {['Guitar', 'Keys', 'Drums', 'Bass'].map(inst => {
                const skills = userSongs.filter(s => s.instrument === inst);
                const avgProgress = skills.length > 0 
                  ? Math.round(skills.reduce((acc, s) => acc + s.progress, 0) / skills.length) 
                  : 0;

                return (
                  <div key={inst} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                      {inst === 'Guitar' ? 'E-GITARRE' : inst === 'Keys' ? 'E-PIANO' : inst === 'Drums' ? 'E-DRUMS' : 'E-BASS'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                      <div style={{ fontSize: '1.75rem', fontWeight: 900, color: INSTRUMENT_COLORS[inst] || brandColor }}>
                        {avgProgress}%
                      </div>
                    </div>
                    <div style={{ width: '80px', height: '4px', background: '#f1f5f9', borderRadius: '2px', marginTop: '8px', margin: '8px auto 0 auto', overflow: 'hidden' }}>
                      <div style={{ width: `${avgProgress}%`, height: '100%', background: INSTRUMENT_COLORS[inst] || brandColor }}></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {practiceSongs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '32px', color: '#64748b', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🎸</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>Dein Üben Board ist leer</h3>
                <p style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>Tippe auf <strong>Bibliothek</strong>, um neue Songs hinzuzufügen und deine Skills zu verbessern!</p>
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
                    onDelete={handleDeleteSong}
                  />
                </div>
              ))}
            </div>
          </section>
        )}


        {/* Repertoire Tab */}
        {activeStudentTab === 'repertoire' && (
          <section className="exercises-section animation-slide-up">
            {repertoireSongs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: '24px', color: 'var(--text-muted)' }}>
                Dein Repertoire ist noch leer.<br/><br/>Übe fleißig weiter, bis deine Songs 100% erreichen!
              </div>
            )}
            <div className="exercises-grid">
              {Object.values(repertoireSongs.reduce((acc: any, skill: any) => {
                if (!acc[skill.song_id]) {
                  acc[skill.song_id] = { ...skill, instruments: [skill.instrument] };
                } else {
                  acc[skill.song_id].instruments.push(skill.instrument);
                }
                return acc;
              }, {})).map((song: any) => (
                <div key={song.id} className="repertoire-card-container">
                  <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid #16a34a', background: 'linear-gradient(135deg, white, #f0fdf4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{song.artist}</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{song.title}</div>
                        <button 
                          onClick={async () => {
                            if (window.confirm('Möchtest du diesen Song wiederholen? Er wird dann wieder im Übe-Board angezeigt.')) {
                              setLoading(true);
                              const { error } = await supabase.from('user_song_skills').update({ progress_percent: 90, is_stage_ready: false }).eq('song_id', song.song_id).eq('user_id', loggedInUserId);
                              if (!error && loggedInUserId) await fetchDashboardData(loggedInUserId);
                              setLoading(false);
                            }
                          }}
                          style={{ marginTop: '12px', background: 'white', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = brandColor; e.currentTarget.style.color = brandColor; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
                        >
                          <RotateCcw size={14} /> Wiederholen
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {song.instruments.map((inst: string) => (
                          <div key={inst} title={inst} style={{ width: '40px', height: '40px', borderRadius: '50%', background: INSTRUMENT_COLORS[inst] || 'white', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '2px solid white' }}>
                            {INSTRUMENT_ICONS[inst]}
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

        {/* Band Matching Tab */}
        {activeStudentTab === 'matching' && (
          <section className="exercises-section animation-slide-up">
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b' }}>Band-Finder</h2>
              <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Diese Instrumental-Bands sind vollständig und suchen nun eine/n Sänger/in!</p>
            </div>
            
            <div className="exercises-grid">
              {wallSongs.filter(ws => ws.isComplete).map(band => (
                <div key={band.id} className="glass-panel" style={{ padding: '24px', background: 'white', borderLeft: '6px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>{band.artist}</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, margin: '4px 0' }}>{band.title}</div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      {Object.entries(band.counts).map(([inst, count]) => (
                        (count as number) > 0 && (
                          <div key={inst} title={`${count}x ${inst}`} style={{ width: '32px', height: '32px', borderRadius: '50%', background: INSTRUMENT_COLORS[inst] || '#f1f5f9', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            {INSTRUMENT_ICONS[inst]}
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      // Check if already in repertoire
                      const isAdded = userSongs.some(us => us.song_id === band.id);
                      if (isAdded) {
                        alert('Dieser Song ist bereits in deinem Üben-Board. Du kannst dich dort als Sänger registrieren!');
                        setActiveStudentTab('practice');
                        return;
                      }
                      // Add only vocals
                      await supabase.from('user_song_skills').insert({
                        user_id: loggedInUserId,
                        song_id: band.id,
                        instrument: 'Vocals',
                        progress_percent: 0,
                        is_stage_ready: false
                      });
                      await fetchDashboardData(loggedInUserId);
                      setActiveStudentTab('practice');
                      alert('Du bist als Sänger/in registriert! Der Song ist nun in deinem Üben-Board.');
                    }}
                    style={{ background: '#10b981', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                  >
                    <Music size={18} /> Als Sänger melden
                  </button>
                </div>
              ))}
              {wallSongs.filter(ws => ws.isComplete).length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '24px', color: '#94a3b8', border: '2px dashed #e2e8f0' }}>
                  Momentan werden keine Sänger gesucht. Sobald eine Band vollständig ist, erscheint sie hier!
                </div>
              )}
            </div>
          </section>
        )}
        {activeStudentTab === 'library' && (
          <section className="exercises-section animation-slide-up">
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
                {userSongs.some(us => us.song_id === song.id) ? (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 800, fontSize: '0.8rem' }}>
                    <Check size={20} /> Hinzugefügt
                  </div>
                ) : (
                  <button 
                    onClick={() => handleAddSongToRepertoire(song)}
                    style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: '12px', borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                    onMouseLeave={e => e.currentTarget.style.background = '#f9fafb'}
                  >
                    <Plus size={20} color={brandColor} />
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-main)' }}>Üben</span>
                  </button>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Stage Ready / Bands Tab */}
        {activeStudentTab === 'bands' && (
          <section className="glass-panel stage-ready-wall animation-slide-up">
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
                  </div>
                  <div className="band-slots-row">
                    {['Guitar', 'Bass', 'Drums', 'Vocals'].map(inst => {
                      const count = song.counts[inst] || 0;
                      return (
                        <div key={inst} className={`band-slot ${count > 0 ? 'filled' : ''}`}>
                          <div className="slot-icon-circle">{INSTRUMENT_ICONS[inst] || '🎵'}</div>
                          <div className="slot-count-badge">{count > 0 ? count : '-'}</div>
                          <div className="slot-label-text">{inst}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Team Tab */}
        {activeStudentTab === 'team' && (
          <div className="tab-content animation-slide-up">
            <div className="stats-panel-premium">
              <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', fontWeight: 800 }}>Unser Team</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', marginTop: '24px' }}>
                {teachers.map(t => (
                  <div key={t.id} onClick={() => setSelectedTeacher(t)} style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '24px', cursor: 'pointer' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 12px auto', border: '4px solid white', overflow: 'hidden' }}>
                      <img src={t.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    </div>
                    <div style={{ fontWeight: 800 }}>{t.first_name} {t.last_name}</div>
                    <div style={{ fontSize: '0.7rem', color: brandColor, fontWeight: 700 }}>{t.role === 'admin' ? 'Schulleitung' : 'Lehrkraft'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
        <button onClick={() => setActiveStudentTab('bands')} className={activeStudentTab === 'bands' ? 'active' : ''} style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeStudentTab === 'bands' ? brandColor : '#94a3b8', cursor: 'pointer' }}>
          <Users size={24} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Bands</span>
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

      {/* Edit Profile Modal */}
      {showEditProfile && editingProfile && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <form onSubmit={handleUpdateProfile} className="glass-panel animation-slide-up" style={{ background: 'white', padding: '32px', borderRadius: '32px', maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Profil bearbeiten</h2>
              <button type="button" onClick={() => setShowEditProfile(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Vorname</label>
                  <input required value={editingProfile.first_name} onChange={e => setEditingProfile({...editingProfile, first_name: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Nachname</label>
                  <input required value={editingProfile.last_name} onChange={e => setEditingProfile({...editingProfile, last_name: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600 }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>Wähle deinen Style:</label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {[
                    '/avatar_boy.jpg', '/avatar_boy_bass.jpg', '/avatar_boy_drums.jpg', '/avatar_boy_guitar.jpg', '/avatar_boy_piano.jpg',
                    '/avatar_girl.jpg', '/avatar_girl_bass.jpg', '/avatar_girl_drums.jpg', '/avatar_girl_guitar.jpg', '/avatar_girl_piano.jpg'
                  ].map(url => (
                    <div 
                      key={url}
                      onClick={() => setEditingProfile({...editingProfile, photo_url: url})}
                      style={{ 
                        width: '64px', 
                        height: '64px', 
                        borderRadius: '20px', 
                        overflow: 'hidden', 
                        border: `3px solid ${editingProfile.photo_url === url ? brandColor : 'white'}`,
                        boxShadow: editingProfile.photo_url === url ? `0 0 0 2px ${brandColor}30` : '0 4px 12px rgba(0,0,0,0.06)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: '#f1f5f9'
                      }}
                    >
                      <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>Dein Hauptinstrument:</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['Guitar', 'Bass', 'Drums', 'Keys', 'Vocals'].map(inst => (
                    <button
                      key={inst}
                      type="button"
                      onClick={() => setEditingProfile({...editingProfile, instrument: inst})}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0',
                        background: editingProfile.instrument === inst ? brandColor : 'white',
                        color: editingProfile.instrument === inst ? 'white' : '#1e293b',
                        fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      {INSTRUMENT_ICONS[inst]} {inst}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="submit" style={{ flex: 1, background: brandColor, color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 800, cursor: 'pointer', fontSize: '1rem' }}>Speichern</button>
                <button type="button" onClick={() => setShowEditProfile(false)} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 700, cursor: 'pointer', fontSize: '1rem' }}>Abbrechen</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;

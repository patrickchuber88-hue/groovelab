import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Monitor, Music, Award, Box, Plus, AlertCircle, User, Users, Star, TrendingUp, Shield, Zap, Play, Info, CheckCircle, Check, Search, Trash2, Bell, X, Clock, ChevronDown } from 'lucide-react';
import { TeacherDetailModal } from './TeacherDetailModal';
import { StudentDetailModal } from './StudentDetailModal';

const TEACHER_INSTRUMENT_ICONS: Record<string, string> = { Guitar: '🎸', Bass: '🎸', Drums: '🥁', Keys: '🎹', Vocals: '🎤' };
const INSTRUMENT_COLORS: Record<string, string> = { 
  Guitar: '#ef4444', 
  Bass: '#eab308', 
  Drums: '#3b82f6', 
  Keys: '#a855f7',
  Vocals: '#10b981'
};

const normalizeInstrument = (name: string) => {
  const n = (name || '').toLowerCase().trim();
  if (n.includes('gitarre') || n.includes('guitar')) return 'Guitar';
  if (n.includes('bass')) return 'Bass';
  if (n.includes('drums') || n.includes('schlagzeug')) return 'Drums';
  if (n.includes('piano') || n.includes('keys') || n.includes('klavier')) return 'Keys';
  if (n.includes('vocals') || n.includes('gesang')) return 'Vocals';
  return name;
};
const renderBandAvatar = (name: string, photoUrl?: string | null, size: string = '64px', borderRadius: string = '18px') => {
  if (photoUrl) {
    return (
      <div style={{ width: size, height: size, borderRadius, overflow: 'hidden', flexShrink: 0 }}>
        <img src={photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={name} />
      </div>
    );
  }
  
  const gradients = [
    'linear-gradient(135deg, #6366f1, #a855f7)', // Indigo to Purple
    'linear-gradient(135deg, #ec4899, #f43f5e)', // Pink to Rose
    'linear-gradient(135deg, #3b82f6, #06b6d4)', // Blue to Cyan
    'linear-gradient(135deg, #10b981, #3b82f6)', // Emerald to Blue
    'linear-gradient(135deg, #f59e0b, #e11d48)'  // Amber to Rose
  ];
  
  let hash = 0;
  const str = name || '';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradient = gradients[Math.abs(hash) % gradients.length];
  const firstLetter = (name || 'B').substring(0, 1).toUpperCase();
  
  return (
    <div style={{ 
      width: size, height: size, borderRadius, 
      background: gradient, 
      display: 'flex', alignItems: 'center', justifyContent: 'center', 
      color: 'white', fontWeight: 950, fontSize: `calc(${size} * 0.4)`,
      textShadow: '0 2px 4px rgba(0,0,0,0.15)',
      flexShrink: 0,
      userSelect: 'none'
    }}>
      {firstLetter}
    </div>
  );
};

const brandColor = 'var(--primary-color)';

// --- ANTI-FLICKER AVATAR SYSTEM ---
const AvatarImage = React.memo(({ src, style, className }: { src: string | null, style?: React.CSSProperties, className?: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const displaySrc = useMemo(() => {
    if (hasError || !src) return '/avatar_ghost.jpg';
    return src;
  }, [src, hasError]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#f1f5f9', overflow: 'hidden', ...style }} className={className}>
      <img 
        src={displaySrc}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'cover', 
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
          willChange: 'opacity',
          backfaceVisibility: 'hidden'
        }} 
        alt=""
      />
      {!isLoaded && !hasError && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <div className="pulse" style={{ width: '20px', height: '20px', background: '#e2e8f0', borderRadius: '50%' }}></div>
        </div>
      )}
    </div>
  );
}, (prev, next) => prev.src === next.src);

const StationNode = React.memo(({ num, color, inst, sess, isMe, viewMode, onProfileSelect, onLogout, hasHelpRequest }: { 
  num: number, color: string, inst: string, sess: any, isMe: boolean, viewMode: string, onProfileSelect: (u: any) => void, onLogout: (id: string) => void, hasHelpRequest?: boolean 
}) => {
  const stationName = sess?.stations?.name || `iPad ${num}`;
  const isActive = !!sess;
  
  const activeMins = useMemo(() => {
    if (!sess?.check_in_time) return 0;
    const mins = Math.floor((new Date().getTime() - new Date(sess.check_in_time).getTime()) / 60000);
    return Math.max(0, mins);
  }, [sess?.check_in_time]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Music size={14} /> {inst}
      </div>
      
      <div 
        className="glass-panel" 
        onClick={() => {
          if (isActive) {
            onProfileSelect(sess.users);
          }
        }}
        style={{ 
          background: 'white', 
          padding: '16px', 
          minHeight: '135px', 
          aspectRatio: '1 / 0.8',
          display: 'flex', 
          flexDirection: 'column', 
          position: 'relative', 
          border: isActive ? `2px solid ${color}` : '1px solid #f1f5f9',
          boxShadow: 'none',
          borderRadius: '24px',
          cursor: isActive ? 'pointer' : 'default',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {stationName}
          </div>
          {hasHelpRequest && (
            <div style={{ 
              position: 'absolute', 
              top: '40px', 
              right: '12px', 
              background: '#ef4444', 
              color: 'white', 
              padding: '4px 10px', 
              borderRadius: '10px', 
              fontSize: '0.65rem', 
              fontWeight: 900, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              animation: 'pulse-red 1s infinite',
              boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)',
              zIndex: 10
            }}>
              <AlertCircle size={10} fill="white" /> HELP
            </div>
          )}
          {isActive && viewMode === 'admin' && (
            <button 
              onClick={(e) => { e.stopPropagation(); onLogout(sess.id); }}
              style={{ 
                background: '#fef2f2', 
                border: '1px solid #fee2e2', 
                padding: '4px 10px', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                color: '#ef4444', 
                fontSize: '0.65rem', 
                fontWeight: 900, 
                textTransform: 'uppercase',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#fef2f2'}
            >
              Logout
            </button>
          )}
        </div>

        {sess ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: 'auto' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '16px', overflow: 'hidden', border: `2px solid ${color}`, boxShadow: `0 8px 20px ${color}20`, flexShrink: 0 }}>
              <AvatarImage src={sess.users?.photo_url} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontWeight: 950, 
                fontSize: '1.1rem', 
                color: '#1e293b', 
                lineHeight: 1.1, 
                marginBottom: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {sess.users?.first_name}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: color }}>{activeMins}m <span style={{ opacity: 0.7, fontWeight: 600, color: '#64748b' }}>übt</span></div>
            </div>
          </div>
        ) : (
          <div style={{ margin: 'auto', color: '#e2e8f0', fontWeight: 900, fontSize: '0.85rem', letterSpacing: '0.15em' }}>BEREIT</div>
        )}
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.sess?.id === next.sess?.id &&
    prev.sess?.users?.photo_url === next.sess?.users?.photo_url &&
    prev.sess?.songs?.title === next.sess?.songs?.title &&
    !!prev.sess === !!next.sess &&
    prev.isMe === next.isMe
  );
});

const CoachesNode = React.memo(({ coaches, onProfileSelect }: { coaches: any[], onProfileSelect: (u: any) => void }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 12px #22c55e' }}></span>
        Coaches vor Ort
      </div>
      <div style={{ 
        position: 'relative', 
        width: '180px', 
        height: '180px', 
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
          const total = coaches.length;
          const offset = total > 1 ? (idx - (total - 1) / 2) * 54 : 0;
          const verticalOffset = total > 1 ? (idx % 2 === 0 ? -12 : 12) : 0;
          return (
            <div 
              key={c.id} 
              onClick={() => onProfileSelect(c.users)}
              style={{ 
                position: 'absolute',
                transform: `translate(${offset}px, ${verticalOffset}px)`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: 10 - idx,
                cursor: 'pointer'
              }}
            >
              <div style={{ width: '84px', height: '84px', borderRadius: '50%', border: '4px solid white', boxShadow: '0 8px 20px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
                <AvatarImage src={c.users?.photo_url} />
              </div>
              <div style={{ marginTop: '8px', background: 'white', padding: '5px 12px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', textAlign: 'center', minWidth: '90px' }}>
                <div style={{ fontWeight: 900, color: '#1e293b', fontSize: '0.8rem' }}>{c.users?.first_name} {c.users?.last_name?.[0]}.</div>
                <div style={{ fontSize: '0.6rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>{c.session?.stations?.name || 'Lehrer'}</div>
              </div>
            </div>
          );
        })}
        {coaches.length === 0 && <div style={{ color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 700 }}>Bereit</div>}
      </div>
    </div>
  );
}, (prev, next) => {
  if (prev.coaches.length !== next.coaches.length) return false;
  return prev.coaches.every((c, i) => c.id === next.coaches[i].id && c.users?.photo_url === next.coaches[i].users?.photo_url);
});

interface TeacherDashboardProps {
  userId: string;
  onLogout?: () => void;
  locationMode?: 'lab' | 'home';
  hideHeader?: boolean;
  viewMode?: 'admin' | 'student';
  onTabChange?: (tab: string) => void;
  onOpenBandProfile?: (band: any) => void;
}

export function TeacherDashboard({ userId, onLogout, locationMode = 'lab', hideHeader = false, viewMode = 'admin', onTabChange, onOpenBandProfile }: TeacherDashboardProps) {
  const [teacher, setTeacher] = useState<any>(null);
  const [stations, setStations] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [wallSongs, setWallSongs] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [showAllSubmissions, setShowAllSubmissions] = useState(false);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [ticker, setTicker] = useState(0);
  const [selectedCoachProfile, setSelectedCoachProfile] = useState<any>(null);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('live');
  const [allBands, setAllBands] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [helpRequests, setHelpRequests] = useState<any[]>([]);
  const [unreadShouts, setUnreadShouts] = useState<any[]>([]);
  const [bandSearch, setBandSearch] = useState('');
  const [bandLetter, setBandLetter] = useState<string | null>(null);
  const [editingBand, setEditingBand] = useState<any>(null);
  const [showAddMember, setShowAddMember] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [externalName, setExternalName] = useState('');
  const [externalInstrument, setExternalInstrument] = useState('Vocals');
  const [rehearsalSuggestions, setRehearsalSuggestions] = useState<any[]>([]);
  const [openProposals, setOpenProposals] = useState<any[]>([]);
  const [collapsedBands, setCollapsedBands] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const interval = setInterval(() => setTicker(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  const fetchData = async () => {
    if (!userId) return;

    // Update coach presence in DB
    supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', userId).then(() => {});

    try {
      // 0. Shoutbox
      let bIds: string[] = [];
      const { data: mBands } = await supabase.from('band_members').select('band_id').eq('user_id', userId);
      if (mBands) bIds.push(...mBands.map(b => b.band_id));
      const { data: cBands } = await supabase.from('bands').select('id').eq('coach_id', userId);
      if (cBands) bIds.push(...cBands.map(b => b.id));
      bIds = [...new Set(bIds)];

      if (bIds.length > 0) {
        const { data: shoutData } = await supabase.from('band_shoutbox').select('*, users(first_name, photo_url), bands(name)').in('band_id', bIds).order('created_at', { ascending: false });
        const unread = (shoutData || []).filter(s => !(s.read_by || []).includes(userId) && s.user_id !== userId);
        setUnreadShouts(unread);
      }

      // 1. Info
      const { data: tData } = await supabase.from('users').select('*, schools(*)').eq('id', userId).single();
      setTeacher(tData);

      if (tData?.school_id) {
        // 2. Stations
        const { data: rData } = await supabase.from('rooms').select('id').eq('school_id', tData.school_id);
        const roomIds = rData?.map(r => r.id) || [];
        const { data: sData } = await supabase.from('stations').select('*').in('room_id', roomIds).order('name');
        setStations(sData || []);

        // 3. Sessions - THE CORE
        const { data: sessData, error: sessErr } = await supabase
          .from('sessions')
          .select('*, users!inner(*), stations(*)')
          .is('check_out_time', null);
        
        if (sessErr) {
          console.error('[Dashboard] Error fetching sessions:', sessErr);
          return;
        }

        const schoolSess = (sessData || [])
          .filter(s => {
            const u = Array.isArray(s.users) ? s.users[0] : s.users;
            // Only show students who are GPS verified (in the lab)
            // Teachers/Admins are shown regardless if they are logged in
            const isStaff = u?.role?.toLowerCase() === 'teacher' || u?.role?.toLowerCase() === 'admin';
            return u?.school_id === tData.school_id && (isStaff || s.gps_verified);
          })
          .map(s => ({
            ...s,
            users: Array.isArray(s.users) ? s.users[0] : s.users,
            stations: Array.isArray(s.stations) ? s.stations[0] : s.stations
          }));

        const trulyActive = schoolSess;
        setActiveSessions(trulyActive);

        // 4. Coaches
        const { data: allCoaches } = await supabase.from('users').select('*').in('role', ['teacher', 'admin']).eq('school_id', tData.school_id);
        const fiveMinsAgoMs = Date.now() - 5 * 60000;
        const activeCoaches = (allCoaches || []).filter(c => {
          const isCurrentTeacher = c.id === userId;
          const isRecentSeen = c.last_seen && (new Date(c.last_seen).getTime() > fiveMinsAgoMs);
          return isCurrentTeacher || isRecentSeen || trulyActive.some(s => s.user_id === c.id);
        });
        setCoaches(activeCoaches.map(c => ({ id: c.id, users: c, session: trulyActive.find(s => s.user_id === c.id) })));

        // 5. Challenges
        const { data: subData } = await supabase.from('user_song_skills').select('*, users!user_id(*), songs(*)').eq('is_pending_approval', true);
        const filteredSubs = (subData || []).filter((s: any) => (Array.isArray(s.users) ? s.users[0] : s.users)?.school_id === tData.school_id);
        const mappedSubs = filteredSubs.map((s: any) => ({ ...s, users: Array.isArray(s.users) ? s.users[0] : s.users, songs: Array.isArray(s.songs) ? s.songs[0] : s.songs }));
        setAllSubmissions(mappedSubs);
        
        // Only show students who are currently in the lab in the sidebar pipeline
        const activeInLabSubs = mappedSubs.filter(sub => trulyActive.some(sess => sess.user_id === sub.user_id));
        setSubmissions(activeInLabSubs);

        // 6. Bands
        const { data: bData } = await supabase.from('bands').select('*, band_members(*, users(*)), band_songs(songs(*))').eq('school_id', tData.school_id).order('name');
        setAllBands(bData || []);

        // 7. Students
        const { data: studData } = await supabase.from('users').select('*').eq('school_id', tData.school_id).eq('role', 'student').order('first_name');
        setAllStudents(studData || []);
        // 8. Help
        const { data: helpData } = await supabase.from('help_requests').select('*, users(*)').eq('school_id', tData.school_id).eq('status', 'pending').order('created_at', { ascending: false });
        setHelpRequests(helpData || []);

        // 9. Band-Matching (Comprehensive Pool)
        // We fetch from 'songs' and also 'band_song_slots' to see who is already occupied
        const { data: wallData, error: wallErr } = await supabase
          .from('songs')
          .select(`
            id, artist, title, media_link, instrumentation,
            user_song_skills (
              id, song_id, progress_percent, instrument, part_number, difficulty_level, is_stage_ready, user_id, created_at, formation_group,
              profiles:users!user_song_skills_user_id_fkey(first_name, photo_url, school_id)
            )
          `)
          .eq('school_id', tData.school_id);

        const { data: occupiedSlots } = await supabase
          .from('band_song_slots')
          .select('user_id, band_songs(song_id)');

        if (wallErr) console.error('[Dashboard] Error fetching wallData:', wallErr);

        const poolFormations: any[] = [];
        (wallData || []).forEach(song => {
          const instrumentation = song.instrumentation || { 'E-Gitarre': 1, 'E-Drums': 1, 'E-Bass': 1 };
          
          ['starter', 'original'].forEach(level => {
            const levelSkills = (song.user_song_skills || []).filter((s: any) => {
              const prof = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
              const isReady = s.is_stage_ready && (s.difficulty_level || 'original') === level && prof?.school_id === tData.school_id;
              
              // Filter out if already in a band for this song
              const isOccupied = (occupiedSlots || []).some(os => 
                os.user_id === s.user_id && (Array.isArray(os.band_songs) ? os.band_songs[0]?.song_id : (os.band_songs as any)?.song_id) === song.id
              );
              
              return isReady && !isOccupied;
            });

            if (levelSkills.length === 0) return;

            const songFormations: any[] = [];
            levelSkills.forEach(skill => {
              const norm = normalizeInstrument(skill.instrument);
              // Find a group that:
              // 1. Matches the formation_group (if set)
              // 2. OR is a "pool" group for this song/level and doesn't have this instrument yet
              let target = songFormations.find(f => {
                if (skill.formation_group) return f.groupKey === skill.formation_group;
                // Only merge into pool groups if it's a pool skill
                return f.groupKey.startsWith('pool_') && !f.members.some((m: any) => normalizeInstrument(m.instrument) === norm);
              });

              if (!target) {
                target = { 
                  groupKey: skill.formation_group || `pool_${song.id}_${level}_${songFormations.length}`, 
                  members: [] 
                };
                songFormations.push(target);
              }
              target.members.push(skill);
            });

            songFormations.forEach(({ groupKey, members }) => {
              const missingInstruments: string[] = [];
              const order = ['E-Gitarre', 'E-Drums', 'E-Piano', 'E-Bass'];
              order.forEach(targetInst => {
                // Find matching keys in instrumentation (could be 'Guitar', 'E-Gitarre', etc.)
                const matchingKeys = Object.entries(instrumentation).filter(([i, c]) => {
                  const low = i.toLowerCase();
                  const targetLow = targetInst.toLowerCase();
                  return low.includes(targetLow.replace('e-', '')) || targetLow.includes(low.replace('e-', ''));
                });

                matchingKeys.forEach(([i, c]) => {
                  const filledForInst = members.filter((s: any) => {
                    const si = (s.instrument || '').toLowerCase();
                    const target = i.toLowerCase();
                    return si.includes(target.replace('e-', '')) || target.includes(si.replace('e-', ''));
                  }).length;

                  for(let k=0; k < (c as number) - filledForInst; k++) {
                    let norm = i;
                    if (i.toLowerCase().includes('guitar')) norm = 'E-Gitarre';
                    else if (i.toLowerCase().includes('drum')) norm = 'E-Drums';
                    else if (i.toLowerCase().includes('bass')) norm = 'E-Bass';
                    else if (i.toLowerCase().includes('piano') || i.toLowerCase().includes('keys')) norm = 'E-Piano';
                    missingInstruments.push(norm);
                  }
                });
              });

              if (missingInstruments.length > 0) {
                poolFormations.push({
                  id: `pool_${song.id}_${level}_${groupKey}`,
                  song: song,
                  members,
                  openSlots: missingInstruments.length,
                  missingInstruments,
                  type: 'pool'
                });
              }
            });
          });
        });

        // Construct schoolSkillsMap for matching checks
        const schoolSkillsMap: Record<string, any[]> = {};
        (wallData || []).forEach((s: any) => {
          (s.user_song_skills || []).forEach((skill: any) => {
            if (!skill.song_id) skill.song_id = s.id;
            if (!schoolSkillsMap[skill.user_id]) schoolSkillsMap[skill.user_id] = [];
            schoolSkillsMap[skill.user_id].push(skill);
          });
        });

        // Part B: Explicit Bands in Formation
        const { data: formingBands } = await supabase
          .from('bands')
          .select('*, band_members(*, profiles:users(id, first_name, last_name, photo_url, created_at, birth_date)), songs(*), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, last_name, photo_url, created_at, birth_date)))')
          .eq('school_id', tData.school_id)
          .eq('status', 'forming');
          
        // Collect all open proposals where logged-in user is a band member
        const userProposals: any[] = [];
        (formingBands || []).forEach(b => {
          const isUserBandMember = (b.band_members || []).some((m: any) => m.user_id === userId);
          if (!isUserBandMember) return;
          
          (b.band_songs || []).forEach((bs: any) => {
            if (bs.status === 'proposal') {
              const song = bs.songs || b.songs;
              if (!song) return;

              const slots = bs.band_song_slots || [];
              const members: any[] = [];
              const addedSlotKeys = new Set<string>();

              slots.filter((sl: any) => sl.user_id).forEach((sl: any) => {
                const normalizedMemberInst = normalizeInstrument(sl.instrument);
                const slPart = sl.part_number || 1;
                const slotKey = `${sl.user_id}_${normalizedMemberInst}_${slPart}`;
                
                if (addedSlotKeys.has(slotKey)) return;
                addedSlotKeys.add(slotKey);
                
                const prof = Array.isArray(sl.profiles) ? sl.profiles[0] : sl.profiles;
                const skills = schoolSkillsMap[sl.user_id] || [];
                const isMastered = skills.some((sk: any) => 
                  sk.song_id === song.id && 
                  normalizeInstrument(sk.instrument) === normalizedMemberInst && 
                  (sk.part_number || 1) === slPart &&
                  (sk.is_stage_ready || (sk.progress_percent || 0) >= 100)
                );

                members.push({
                  user_id: sl.user_id,
                  first_name: prof?.first_name || 'Musiker',
                  last_name: prof?.last_name || '',
                  photo_url: prof?.photo_url,
                  created_at: prof?.created_at,
                  birth_date: prof?.birth_date,
                  instrument: normalizedMemberInst,
                  part_number: slPart,
                  isFromBand: true,
                  isMastered
                });
              });

              let instCount: Record<string, number> = {};
              members.forEach((m: any) => {
                instCount[m.instrument] = Math.max(instCount[m.instrument] || 0, m.part_number || 1);
              });

              const addedUserIds = new Set<string>(members.map(m => m.user_id));
              (b.band_members || []).forEach((bm: any) => {
                if (addedUserIds.has(bm.user_id)) return;
                addedUserIds.add(bm.user_id);
                
                const prof = bm.profiles ? (Array.isArray(bm.profiles) ? bm.profiles[0] : bm.profiles) : null;
                const normalizedMemberInst = normalizeInstrument(bm.instrument);

                if (prof) {
                  const nextPart = (instCount[normalizedMemberInst] || 0) + 1;
                  instCount[normalizedMemberInst] = nextPart;

                  const skills = schoolSkillsMap[bm.user_id] || [];
                  const isMastered = skills.some((sk: any) => 
                    sk.song_id === song.id && 
                    normalizeInstrument(sk.instrument) === normalizedMemberInst && 
                    (sk.part_number || 1) === nextPart &&
                    (sk.is_stage_ready || (sk.progress_percent || 0) >= 100)
                  );

                  members.push({
                    user_id: bm.user_id,
                    first_name: prof.first_name || 'Musiker',
                    last_name: prof.last_name || '',
                    photo_url: prof.photo_url,
                    created_at: prof.created_at,
                    birth_date: prof.birth_date,
                    instrument: normalizedMemberInst,
                    part_number: nextPart,
                    isFromBand: true,
                    isMastered
                  });
                }
              });

              userProposals.push({
                id: `prop_${bs.id}`,
                band: b,
                bandSongId: bs.id,
                band_song: bs,
                song,
                members,
                memberMap: members.reduce((acc, m) => ({ ...acc, [`${m.instrument}_${m.part_number}`]: m }), {})
              });
            }
          });
        });
        setOpenProposals(userProposals);

        const bandFormations: any[] = [];
        (formingBands || []).forEach(b => {
          const mainSong = b.band_songs?.[0];
          const songObj = mainSong?.songs || b.songs;
          if (!songObj) return;

          const isUserBandMember = (b.band_members || []).some((m: any) => m.user_id === userId);
          if (isUserBandMember) return; // Hide own band projects from Matching Board widget!

          // If the band song status is 'proposal' or forming and we check approval status,
          // only show the song publicly if all band members have approved (mastered) it for their instruments.
          if (mainSong && mainSong.status === 'proposal') {
            const bMembers = b.band_members || [];
            if (bMembers.length === 0) return;
            
            const allApproved = bMembers.every((bm: any) => {
              const bmInst = normalizeInstrument(bm.instrument);
              if (bmInst === 'Vocals') return true;
              const userSkills = schoolSkillsMap[bm.user_id] || [];
              return userSkills.some((sk: any) => 
                sk.song_id === songObj.id && 
                normalizeInstrument(sk.instrument) === bmInst && 
                (sk.is_stage_ready || (sk.progress_percent || 0) >= 100)
              );
            });
            
            if (!allApproved) return;
          }

          const slots = mainSong?.band_song_slots || [];
          const filledMembers = slots.filter((s: any) => s.user_id);
          
          const inst = songObj?.instrumentation || { 'E-Gitarre': 1, 'E-Drums': 1, 'E-Bass': 1 };
          const missingInstruments: string[] = [];
          const order = ['E-Gitarre', 'E-Drums', 'E-Piano', 'E-Bass'];
          order.forEach(targetInst => {
            const matchingKeys = Object.entries(inst).filter(([i, c]) => {
              const low = i.toLowerCase();
              const targetLow = targetInst.toLowerCase();
              return low.includes(targetLow.replace('e-', '')) || targetLow.includes(low.replace('e-', ''));
            });

            matchingKeys.forEach(([i, c]) => {
              const filledCount = slots.filter((s: any) => {
                const si = (s.instrument || '').toLowerCase();
                const target = i.toLowerCase();
                return s.user_id && (si.includes(target.replace('e-', '')) || target.includes(si.replace('e-', '')));
              }).length;
              for(let k=0; k < (c as number) - filledCount; k++) {
                let norm = i;
                if (i.toLowerCase().includes('guitar')) norm = 'E-Gitarre';
                else if (i.toLowerCase().includes('drum')) norm = 'E-Drums';
                else if (i.toLowerCase().includes('bass')) norm = 'E-Bass';
                else if (i.toLowerCase().includes('piano') || i.toLowerCase().includes('keys')) norm = 'E-Piano';
                missingInstruments.push(norm);
              }
            });
          });

          bandFormations.push({
            id: b.id,
            song: songObj,
            members: filledMembers,
            openSlots: missingInstruments.length,
            missingInstruments,
            type: 'band'
          });
        });

        // Combine and sort (Limit to 2 for the dashboard widget, prioritizing most complete)
        const allMatching = [...bandFormations, ...poolFormations]
          .filter(f => f.openSlots > 0)
          .sort((a, b) => a.openSlots - b.openSlots)
          .slice(0, 2);

        setWallSongs(allMatching);

        // 10. Rehearsal Suggestions
        let userBandIds: string[] = [];
        const { data: memberOf } = await supabase.from('band_members').select('band_id').eq('user_id', userId);
        if (memberOf) userBandIds.push(...memberOf.map(m => m.band_id));
        const { data: coachOf } = await supabase.from('bands').select('id').eq('coach_id', userId);
        if (coachOf) userBandIds.push(...coachOf.map(b => b.id));
        userBandIds = [...new Set(userBandIds)];

        if (userBandIds.length > 0) {
          const { data: bandsWithMembers } = await supabase.from('bands').select('id, name, band_members(user_id)').in('id', userBandIds);
          const allMemberIds = [...new Set((bandsWithMembers || []).flatMap(b => b.band_members.map((m: any) => m.user_id)))];
          
          if (allMemberIds.length > 0) {
            const { data: planning } = await supabase.from('lab_planning').select('*').in('user_id', allMemberIds);
            
            const suggestions = (bandsWithMembers || []).map(band => {
              const bMemberIds = band.band_members.map((m: any) => m.user_id);
              const bPlanning = (planning || []).filter(p => bMemberIds.includes(p.user_id));
              if (!bPlanning.length) return null;

              const counts: Record<string, number> = {};
              bPlanning.forEach(s => {
                const key = `${s.day}-${s.time}`;
                counts[key] = (counts[key] || 0) + 1;
              });
              const vals = Object.values(counts);
              const maxMatches = vals.length ? Math.max(...vals) : 0;
              if (maxMatches === 0) return null;

              const dayBlocks: Record<string, string[]> = {};
              bPlanning.forEach(s => {
                const count = bPlanning.filter(p => p.day === s.day && p.time === s.time).length;
                if (count === maxMatches) {
                  if (!dayBlocks[s.day]) dayBlocks[s.day] = [];
                  if (!dayBlocks[s.day].includes(s.time)) dayBlocks[s.day].push(s.time);
                }
              });

              let bestDay = '', bestStart = '', bestEnd = '', longestBlock = 0;
              Object.entries(dayBlocks).forEach(([day, times]) => {
                times.sort();
                let currentBlock: string[] = [];
                for (let i = 0; i < times.length; i++) {
                  if (currentBlock.length === 0) currentBlock.push(times[i]);
                  else {
                    const prev = currentBlock[currentBlock.length - 1];
                    const curr = times[i];
                    const prevDate = new Date(`2000-01-01T${prev}:00`);
                    const currDate = new Date(`2000-01-01T${curr}:00`);
                    if ((currDate.getTime() - prevDate.getTime()) / 60000 === 15) currentBlock.push(curr);
                    else {
                      if (currentBlock.length > longestBlock) { longestBlock = currentBlock.length; bestDay = day; bestStart = currentBlock[0]; bestEnd = currentBlock[currentBlock.length - 1]; }
                      currentBlock = [times[i]];
                    }
                  }
                }
                if (currentBlock.length > longestBlock) { longestBlock = currentBlock.length; bestDay = day; bestStart = currentBlock[0]; bestEnd = currentBlock[currentBlock.length - 1]; }
              });

              if (!bestDay) return null;
              const endTimeDate = new Date(`2000-01-01T${bestEnd}:00`);
              endTimeDate.setMinutes(endTimeDate.getMinutes() + 15);
              const formattedEnd = endTimeDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

              return { bandId: band.id, bandName: band.name, day: bestDay, start: bestStart, end: formattedEnd, count: maxMatches };
            }).filter(Boolean);
            setRehearsalSuggestions(suggestions);
          }
        }
      }
    } catch (err) {
      console.error('[Dashboard] Fetch error:', err);
    }
  };

  const handleMarkAsRead = async (shoutId: string) => {
    if (!userId) return;
    const shout = unreadShouts.find(s => s.id === shoutId);
    if (!shout) return;
    
    const newReadBy = [...(shout.read_by || []), userId];
    const { error } = await supabase.from('band_shoutbox').update({ read_by: newReadBy }).eq('id', shoutId);
    if (!error) {
      setUnreadShouts(prev => prev.filter(s => s.id !== shoutId));
    }
  };

  const handleResolveHelp = async (requestId: string) => {
    const { error } = await supabase
      .from('help_requests')
      .update({ status: 'resolved' })
      .eq('id', requestId);
    
    if (!error) {
      setHelpRequests(prev => prev.filter(r => r.id !== requestId));
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userId || unreadShouts.length === 0) return;
    
    // Process all updates
    const updates = unreadShouts.map(shout => ({
      id: shout.id,
      read_by: [...(shout.read_by || []), userId]
    }));

    // For simplicity in a loop (Supabase doesn't easily do batch update with unique values per row)
    // But we can do it with an RPC or just a loop for small sets
    for (const update of updates) {
      await supabase.from('band_shoutbox').update({ read_by: update.read_by }).eq('id', update.id);
    }
    
    setUnreadShouts([]);
  };

  const handleAcknowledgeShout = async (shoutId: string) => {
    try {
      await supabase.rpc('acknowledge_shout_message', { msg_id: shoutId, uid: userId });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleLogoutStudent = useCallback(async (sessionId: string) => {
    if (!window.confirm('Ausloggen?')) return;
    await supabase.from('sessions').update({ check_out_time: new Date().toISOString() }).eq('id', sessionId);
    fetchData();
  }, []);

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Entfernen?')) return;
    await supabase.from('band_members').delete().eq('id', memberId);
    fetchData();
  };

  const handleAddMember = async (bandId: string, uId: string | null, instrument: string, extName?: string) => {
    await supabase.from('band_members').insert({ band_id: bandId, user_id: uId, instrument, external_name: extName, confetti_seen: true });
    
    const { data: bandSongs } = await supabase.from('band_songs').select('id').eq('band_id', bandId);
    if (bandSongs && bandSongs.length > 0) {
       const slotsToInsert = bandSongs.map((bs: any) => ({
          band_song_id: bs.id,
          user_id: uId,
          instrument: instrument,
          status: 'joined',
          external_name: extName || null
       }));
       await supabase.from('band_song_slots').insert(slotsToInsert);
    }
    
    setShowAddMember(null);
    fetchData();
  };

  const handleApproveSubmission = async (subId: string) => {
    const { data: sub } = await supabase.from('user_song_skills').select('user_id, song_id, instrument, difficulty_level').eq('id', subId).single();
    
    await supabase.from('user_song_skills').update({ is_pending_approval: false, is_stage_ready: true, verified_by_id: userId }).eq('id', subId);
    
    if (sub) {
      // Get all bands the student is a member of
      const { data: memberships } = await supabase.from('band_members').select('band_id').eq('user_id', sub.user_id);
      
      if (memberships && memberships.length > 0) {
        const bandIds = memberships.map(m => m.band_id);
        
        // Check which of these bands already have this song in their repertoire (proposal, planned, or active)
        const { data: existingBandSongs } = await supabase
          .from('band_songs')
          .select('band_id')
          .in('band_id', bandIds)
          .eq('song_id', sub.song_id);
          
        const bandsWithSong = new Set(existingBandSongs?.map(bs => bs.band_id) || []);
        
        // 2b. ALSO check if the student is ALREADY assigned to a slot for this song
        const { data: assignedSlots } = await supabase
          .from('band_song_slots')
          .select('band_songs(band_id)')
          .eq('user_id', sub.user_id)
          .eq('band_songs.song_id', sub.song_id);
        
        const bandsWhereAlreadyAssigned = new Set((assignedSlots || []).map((s: any) => 
          Array.isArray(s.band_songs) ? s.band_songs[0]?.band_id : s.band_songs?.band_id
        ).filter(Boolean));

        // Only trigger the proposal popup if there is at least one band where the song is NOT yet present AND student is NOT assigned
        const hasEligibleBands = bandIds.some(id => !bandsWithSong.has(id) && !bandsWhereAlreadyAssigned.has(id));
        
        if (hasEligibleBands) {
          await supabase.from('users').update({ 
            pending_repertoire_proposal: {
              song_id: sub.song_id,
              difficulty_level: sub.difficulty_level,
              instrument: sub.instrument
            }
          }).eq('id', sub.user_id);
        }
      }
    }
    
    fetchData();
  };

  const handleRejectSubmission = async (subId: string) => {
    await supabase.from('user_song_skills').update({ is_pending_approval: false, progress_percent: 85 }).eq('id', subId);
    fetchData();
  };

  if (!teacher) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b', fontWeight: 600 }}>Lade Zentrale...</div>;

  return (
    <div style={{ padding: hideHeader ? '0' : '20px 40px', width: '100%', maxWidth: '1800px', margin: '0 auto', background: hideHeader ? 'transparent' : '#f8fafc', minHeight: '100vh' }}>
      {selectedCoachProfile && <TeacherDetailModal teacher={selectedCoachProfile} onClose={() => setSelectedCoachProfile(null)} />}
      {selectedStudentProfile && <StudentDetailModal student={selectedStudentProfile} onClose={() => setSelectedStudentProfile(null)} />}
      
      {!hideHeader && (
        <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
              <h1 onClick={() => setActiveTab('live')} style={{ fontSize: '2.5rem', fontWeight: 900, color: activeTab === 'live' ? '#1e293b' : '#cbd5e1', cursor: 'pointer' }}>Live Lab</h1>
              <h1 onClick={() => setActiveTab('bands')} style={{ fontSize: '2.5rem', fontWeight: 900, color: activeTab === 'bands' ? '#1e293b' : '#cbd5e1', cursor: 'pointer' }}>Bands</h1>
            </div>
            <p style={{ color: '#64748b', fontWeight: 600, fontSize: '0.9rem', marginTop: '8px' }}>MUSÄK - Groovelab Academy • Management Dashboard</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
             <div style={{ background: '#f0fdf4', padding: '8px 16px', borderRadius: '100px', border: '1px solid #dcfce7', color: '#166534', fontSize: '0.85rem', fontWeight: 800 }}>{activeSessions.length} im Lab</div>
             {viewMode === 'admin' && onLogout && <button onClick={onLogout} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '12px', fontWeight: 700, color: '#ef4444', cursor: 'pointer' }}>Zentrale schließen</button>}
          </div>
        </header>
      )}

      {activeTab === 'live' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', alignItems: 'start' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '32px' }}>
            {[3, 4, 5, 6].map(n => {
              const station = stations.find(s => {
                const match = s.name.match(/\d+$/);
                return match && match[0] === n.toString();
              });
              const sess = activeSessions.find(s => {
                const sName = s.stations?.name?.toLowerCase() || '';
                const sId = s.station_id;
                
                // 1. Check if the station name contains the number 'n'
                const nameMatch = sName.includes(` ${n}`) || sName.includes(`${n}`) || sName.endsWith(`${n}`);
                
                // 2. Check if the station ID matches a station in our list that matches 'n'
                const stationMatch = stations.find(st => {
                  const stName = st.name.toLowerCase();
                  return stName.includes(` ${n}`) || stName.includes(`${n}`) || stName.endsWith(`${n}`);
                });
                const idMatch = sId && stationMatch && sId === stationMatch.id;

                return (nameMatch || idMatch) && (s.users?.role !== 'student' || s.gps_verified);
              });
              const getStationColor = (num: number) => {
                if (num <= 2) return '#ef4444'; // Rot
                if (num <= 4) return '#a855f7'; // Purple
                if (num <= 6) return '#3b82f6'; // Blau
                return '#eab308'; // Gelb
              };
              return (
                <StationNode 
                  key={n} 
                  num={n} 
                  color={getStationColor(n)} 
                  inst={n < 5 ? 'E-Piano' : 'E-Drum'} 
                  sess={sess} 
                  isMe={sess?.user_id === userId} 
                  viewMode={viewMode} 
                  onProfileSelect={setSelectedStudentProfile} 
                  onLogout={handleLogoutStudent}
                  hasHelpRequest={helpRequests.some(r => {
                    const st = stations.find(s => s.id === r.station_id);
                    if (!st) return false;
                    const match = st.name.match(/\d+$/);
                    return match && match[0] === n.toString();
                  })}
                />
              );
            })}
            
            <div style={{ gridColumn: '1', fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{'> TISCH LINKS'}</div>
            <div style={{ gridColumn: '2 / span 2' }}></div>
            <div style={{ gridColumn: '4', fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{'> TISCH RECHTS'}</div>

            <div style={{ gridColumn: '1', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {[2, 1].map(n => {
                const station = stations.find(s => {
                  const match = s.name.match(/\d+$/);
                  return match && match[0] === n.toString();
                });
                const sess = activeSessions.find(s => {
                  const sName = s.stations?.name?.toLowerCase() || '';
                  const sId = s.station_id;
                  const nameMatch = sName.includes(` ${n}`) || sName.includes(`${n}`) || sName.endsWith(`${n}`);
                  const stationMatch = stations.find(st => {
                    const stName = st.name.toLowerCase();
                    return stName.includes(` ${n}`) || stName.includes(`${n}`) || stName.endsWith(`${n}`);
                  });
                  const idMatch = sId && stationMatch && sId === stationMatch.id;
                  return (nameMatch || idMatch) && (s.users?.role !== 'student' || s.gps_verified);
                });
                return (
                  <StationNode 
                    key={n} 
                    num={n} 
                    color="#ef4444" 
                    inst="E-Gitarre" 
                    sess={sess} 
                    isMe={sess?.user_id === userId} 
                    viewMode={viewMode} 
                    onProfileSelect={setSelectedStudentProfile} 
                    onLogout={handleLogoutStudent} 
                    hasHelpRequest={helpRequests.some(r => {
                      const st = stations.find(s => s.id === r.station_id);
                      if (!st) return false;
                      const match = st.name.match(/\d+$/);
                      return match && match[0] === n.toString();
                    })}
                  />
                );
              })}
            </div>

            <div style={{ gridColumn: '2 / span 2', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <CoachesNode coaches={coaches} onProfileSelect={setSelectedCoachProfile} />
            </div>

            <div style={{ gridColumn: '4', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {[7, 8].map(n => {
                const station = stations.find(s => {
                  const match = s.name.match(/\d+$/);
                  return match && match[0] === n.toString();
                });
                const sess = activeSessions.find(s => {
                  const sName = s.stations?.name?.toLowerCase() || '';
                  const sId = s.station_id;
                  const nameMatch = sName.includes(` ${n}`) || sName.includes(`${n}`) || sName.endsWith(`${n}`);
                  const stationMatch = stations.find(st => {
                    const stName = st.name.toLowerCase();
                    return stName.includes(` ${n}`) || stName.includes(`${n}`) || stName.endsWith(`${n}`);
                  });
                  const idMatch = sId && stationMatch && sId === stationMatch.id;
                  return (nameMatch || idMatch) && (s.users?.role !== 'student' || s.gps_verified);
                });
                return (
                  <StationNode 
                    key={n} 
                    num={n} 
                    color="#eab308" 
                    inst="Bass" 
                    sess={sess} 
                    isMe={sess?.user_id === userId} 
                    viewMode={viewMode} 
                    onProfileSelect={setSelectedStudentProfile} 
                    onLogout={handleLogoutStudent} 
                    hasHelpRequest={helpRequests.some(r => {
                      const st = stations.find(s => s.id === r.station_id);
                      if (!st) return false;
                      const match = st.name.match(/\d+$/);
                      return match && match[0] === n.toString();
                    })}
                  />
                );
              })}
            </div>
          </div>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {rehearsalSuggestions.length > 0 && (
               <div className="card" style={{ 
                 padding: '24px', 
                 background: 'linear-gradient(135deg, #f0fdf4 0%, #f0fdfa 100%)', 
                 border: '1px solid #dcfce7',
                 borderRadius: '32px',
                 boxShadow: '0 10px 30px rgba(22, 163, 74, 0.05)'
               }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ background: '#22c55e', color: 'white', padding: '8px', borderRadius: '10px' }}>
                      <Clock size={18} />
                    </div>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 1000, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>Bandprobe Vorschläge</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {rehearsalSuggestions.map((s, idx) => (
                      <div key={idx} style={{ 
                        background: 'rgba(255,255,255,0.6)', 
                        padding: '8px 12px', 
                        borderRadius: '12px', 
                        border: '1px solid rgba(34, 197, 94, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#166534', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{s.bandName}</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap' }}>
                          {s.day.slice(0, 2)} {s.start}-{s.end}
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
            )}

            {/* Band-Repertoire Planer Widget (Very compact & Light-themed purple!) */}
            {viewMode === 'student' && openProposals.length > 0 && (
              <div 
                className="card" 
                onClick={() => setActiveTab('proposals')}
                style={{ 
                  padding: '18px 24px', 
                  background: 'linear-gradient(135deg, #f5f3ff 0%, #fae8ff 100%)', 
                  border: '1px solid #e9d5ff',
                  borderRadius: '32px',
                  boxShadow: '0 10px 30px rgba(139, 92, 246, 0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 15px 35px rgba(139, 92, 246, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(139, 92, 246, 0.05)';
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '80px',
                  height: '80px',
                  background: 'radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%)',
                  pointerEvents: 'none'
                }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    background: 'rgba(168, 85, 247, 0.15)', 
                    color: '#7c3aed', 
                    padding: '8px', 
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2)'
                  }}>
                    <Music size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 1000, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '2px' }}>
                      Band-Repertoire Planer
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 950, color: '#1e1b4b' }}>
                        {openProposals.length} {openProposals.length === 1 ? 'offener Song' : 'offene Songs'}
                      </span>
                    </div>
                  </div>
                  <div style={{ color: '#7c3aed', fontWeight: 950, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    Ansehen →
                  </div>
                </div>
              </div>
            )}

            {/* Band-Matching Section */}
            <div className="card" style={{ 
               padding: '24px', 
               background: 'linear-gradient(135deg, #fefce8 0%, #fffbeb 100%)', 
               border: '1px solid #fef3c7',
               borderRadius: '32px',
               boxShadow: '0 10px 30px rgba(234, 179, 8, 0.05)'
             }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ background: '#eab308', color: 'white', padding: '8px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(234, 179, 8, 0.3)' }}>
                    <Zap size={18} fill="white" />
                  </div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 1000, color: '#eab308', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>Band-Matching</h3>
                </div>
               
                {wallSongs.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                     {wallSongs.map((form: any, fIdx: number) => {
                       const instReq = form.song?.instrumentation || { 'E-Gitarre': 1, 'E-Drums': 1, 'E-Bass': 1 };
                       
                       const order = ['E-Gitarre', 'E-Drums', 'E-Piano', 'E-Bass'];
                       const colors: Record<string, string> = {
                         'E-Gitarre': '#ef4444',
                         'E-Drums': '#3b82f6',
                         'E-Piano': '#a855f7',
                         'E-Bass': '#f59e0b'
                       };

                       const allRequired: { instrument: string; part: number }[] = [];
                       order.forEach(instName => {
                         const count = instReq[instName] || 0;
                         for(let i=0; i < count; i++) {
                           allRequired.push({ instrument: instName, part: i + 1 });
                         }
                       });

                       const getIcon = (inst: string) => {
                         const low = inst.toLowerCase();
                         if (low.includes('guitar') || low.includes('gitarre')) return '🎸';
                         if (low.includes('drum')) return '🥁';
                         if (low.includes('bass')) return '🎸';
                         if (low.includes('piano') || low.includes('keys')) return '🎹';
                         return '🎵';
                       };

                       return (
                         <div key={form.id} style={{ 
                           background: 'white', 
                           padding: '20px', 
                           borderRadius: '24px', 
                           boxShadow: '0 4px 15px rgba(180, 83, 9, 0.02)',
                           display: 'flex',
                           flexDirection: 'column',
                           gap: '16px',
                           position: 'relative',
                           border: '1px solid rgba(254, 243, 199, 0.4)'
                         }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                             <div style={{ flex: 1 }}>
                               <h4 style={{ 
                                 fontWeight: 1000, 
                                 fontSize: '1.1rem', 
                                 color: '#0f172a', 
                                 lineHeight: 1.1,
                                 margin: '0 0 4px 0',
                                 letterSpacing: '-0.02em'
                               }}>
                                 {form.song?.title}
                               </h4>
                               <div style={{ 
                                 fontSize: '0.7rem', 
                                 fontWeight: 800, 
                                 color: '#94a3b8', 
                                 textTransform: 'uppercase', 
                                 letterSpacing: '0.05em'
                               }}>
                                 {form.song?.artist}
                               </div>
                             </div>
                             <div style={{ 
                               background: '#fefce8', 
                               color: '#854d0e', 
                               padding: '4px 8px', 
                               borderRadius: '8px', 
                               fontSize: '0.6rem', 
                               fontWeight: 1000,
                               textTransform: 'uppercase',
                               textAlign: 'center',
                               lineHeight: 1.1
                             }}>
                               BAND<br/>#{fIdx + 1}
                             </div>
                           </div>
                           
                           <div style={{ display: 'flex', gap: '10px', flexWrap: 'nowrap' }}>
                             {allRequired.map((item, idx) => {
                               const inst = item.instrument;
                               const part = item.part;
                               
                               // Accurate instrument-based and part-based fill check
                               const isFilled = form.members.some((m: any) => {
                                 const mi = (m.instrument || '').toLowerCase();
                                 const target = inst.toLowerCase();
                                 const mPart = m.part_number || 1;
                                 const isSameInst = mi.includes(target.replace('e-', '')) || target.includes(mi.replace('e-', ''));
                                 return isSameInst && mPart === part;
                               });
                               
                               const color = colors[inst] || '#10b981';
                               
                               return (
                                 <div key={idx} style={{ 
                                   width: '48px', 
                                   height: '48px', 
                                   borderRadius: '12px', 
                                   border: isFilled ? `2px solid ${color}` : '2px dashed #e2e8f0',
                                   background: isFilled ? `${color}08` : 'transparent',
                                   display: 'flex',
                                   alignItems: 'center',
                                   justifyContent: 'center',
                                   fontSize: '1.25rem',
                                   position: 'relative'
                                 }}>
                                   <span style={{ opacity: isFilled ? 1 : 0.2 }}>{getIcon(inst)}</span>
                                   {!isFilled && (
                                     <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                       <div style={{ width: '14px', height: '1.5px', background: '#cbd5e1', transform: 'rotate(45deg)', position: 'absolute' }} />
                                       <div style={{ width: '14px', height: '1.5px', background: '#cbd5e1', transform: 'rotate(-45deg)', position: 'absolute' }} />
                                     </div>
                                   )}
                                 </div>
                               );
                             })}
                           </div>

                           {form.missingInstruments.length > 0 && (
                              <div style={{ 
                                fontSize: '0.75rem', 
                                fontWeight: 1000, 
                                color: '#eab308', 
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em'
                              }}>
                                GESUCHT: {form.missingInstruments.join(', ').toUpperCase()}
                              </div>
                            )}
                         </div>
                       );
                     })}
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px', 
                    background: 'white', 
                    borderRadius: '24px',
                    border: '1px solid rgba(254, 243, 199, 0.4)'
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '12px', filter: 'grayscale(1)', opacity: 0.5 }}>⌛</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Keine passenden<br/>Formationen
                    </div>
                  </div>
                )}
            </div>

            {/* Band News */}
            {(viewMode === 'student' || unreadShouts.length > 0) && (
              <div className="glass-panel" style={{ 
                background: '#f1f5f9', // Clean app-surface background
                padding: '24px', 
                borderRadius: '32px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 30px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div style={{ background: '#3b82f6', color: 'white', padding: '6px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)', flexShrink: 0 }}>
                      <Bell size={18} />
                    </div>
                    <h3 style={{ 
                      fontSize: '0.8rem', 
                      fontWeight: 950, 
                      color: '#1e293b', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.1em', 
                      margin: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      Band News
                    </h3>
                  </div>
                  {unreadShouts.length > 0 && (
                    <button 
                      onClick={handleMarkAllAsRead}
                      style={{ 
                        background: 'white', color: '#64748b', border: '1px solid #e2e8f0', padding: '6px 14px', borderRadius: '12px', 
                        fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.02)', transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      Alle lesen
                    </button>
                  )}
                </div>
                {unreadShouts.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {unreadShouts.slice(0, 5).map(shout => (
                      <div key={shout.id} className="animation-slide-up" style={{ 
                        background: 'white', 
                        padding: '20px', 
                        borderRadius: '24px', 
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #f1f5f9', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                            <img src={shout.users?.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                              fontWeight: 950, 
                              fontSize: '0.9rem', 
                              color: '#1e293b', 
                              lineHeight: 1.1,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {shout.users?.first_name}
                            </div>
                            <div style={{ 
                              fontSize: '0.6rem', 
                              fontWeight: 800, 
                              color: '#3b82f6', 
                              textTransform: 'uppercase', 
                              marginTop: '2px', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis', 
                              whiteSpace: 'nowrap' 
                            }}>
                              {shout.bands?.name}
                            </div>
                          </div>
                          <button 
                            onClick={() => handleMarkAsRead(shout.id)}
                            style={{ 
                              background: '#f0f9ff', color: '#3b82f6', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}
                            title="Gelesen"
                          >
                            <Check size={18} />
                          </button>
                        </div>
                        
                        <div style={{ 
                          fontSize: '0.9rem', 
                          color: '#334155', 
                          fontWeight: 500, 
                          lineHeight: 1.5,
                          background: '#f8fafc',
                          padding: '12px 16px',
                          borderRadius: '16px',
                          border: '1px solid #f1f5f9',
                          position: 'relative'
                        }}>
                          {shout.content}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px 20px', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700 }}>
                     Keine neuen Nachrichten
                  </div>
                )}
              </div>
            )}

            {/* Help Requests Section */}
            {helpRequests.length > 0 && (
              <div className="glass-panel" style={{ 
                background: '#fff1f2', 
                padding: '24px', 
                borderRadius: '32px',
                border: '1px solid #fecdd3',
                boxShadow: '0 10px 30px rgba(225, 29, 72, 0.05)',
                animation: 'pulse-red 2s infinite'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ background: '#e11d48', color: 'white', padding: '6px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(225, 29, 72, 0.2)' }}>
                    <AlertCircle size={18} />
                  </div>
                  <h3 style={{ 
                    fontSize: '0.8rem', 
                    fontWeight: 950, 
                    color: '#9f1239', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.1em', 
                    margin: 0 
                  }}>
                    Hilfe benötigt!
                  </h3>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {helpRequests.map(req => {
                    const reqUser = Array.isArray(req.users) ? req.users[0] : req.users;
                    return (
                      <div key={req.id} style={{ 
                        background: 'white', 
                        padding: '16px', 
                        borderRadius: '24px', 
                        border: '1px solid #fecdd3',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #fff1f2' }}>
                          <AvatarImage src={reqUser?.photo_url} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 900, fontSize: '0.85rem', color: '#1e293b' }}>{reqUser?.first_name}</div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#e11d48' }}>Station {(stations.find(s => s.id === req.station_id)?.name || '').replace('iPad ', '')}</div>
                        </div>
                        <button 
                          onClick={() => handleResolveHelp(req.id)}
                          style={{ 
                            background: '#f1f5f9', color: '#64748b', border: 'none', width: '32px', height: '32px', borderRadius: '10px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        >
                          <Check size={18} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Challenge Pipeline Section (Only for Admins) */}
            {viewMode === 'admin' && (
              <div className="glass-panel" style={{ 
                background: 'white', 
                padding: '24px', 
                borderRadius: '32px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 30px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', minWidth: 0 }}>
                  <div style={{ background: '#f59e0b', color: 'white', padding: '6px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)', flexShrink: 0 }}>
                    <TrendingUp size={18} />
                  </div>
                  <h3 style={{ 
                    fontSize: '0.8rem', 
                    fontWeight: 950, 
                    color: '#1e293b', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.1em', 
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flex: 1
                  }}>
                    Challenge Pipeline
                  </h3>
                  <button 
                    onClick={() => setShowAllSubmissions(true)}
                    style={{ 
                      background: '#f8fafc', 
                      border: '1px solid #e2e8f0', 
                      color: '#64748b', 
                      fontSize: '0.65rem', 
                      fontWeight: 800, 
                      cursor: 'pointer',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Alle anzeigen <span style={{ background: '#f59e0b', color: 'white', padding: '1px 5px', borderRadius: '4px', fontSize: '0.6rem' }}>{allSubmissions.length}</span>
                  </button>
                </div>
                
                {submissions.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {submissions.slice(0, 5).map(sub => (
                      <div key={sub.id} style={{ 
                        background: '#f8fafc', 
                        padding: '16px', 
                        borderRadius: '24px', 
                        border: '1px solid #f1f5f9',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '44px', height: '44px', borderRadius: '14px', overflow: 'hidden', border: '2px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                            <AvatarImage src={sub.users?.photo_url} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', minWidth: 0 }}>
                                <div style={{ 
                                  fontWeight: 950, 
                                  fontSize: '0.9rem', 
                                  color: '#1e293b', 
                                  lineHeight: 1.1,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {sub.users?.first_name}
                                </div>
                                {(() => {
                                  const norm = normalizeInstrument(sub.instrument);
                                  return (
                                    <div style={{ 
                                      width: '20px', height: '20px', borderRadius: '6px', 
                                      background: INSTRUMENT_COLORS[norm] || '#cbd5e1', 
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                      fontSize: '0.7rem', flexShrink: 0,
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}>
                                      {TEACHER_INSTRUMENT_ICONS[norm] || '🎸'}
                                    </div>
                                  );
                                })()}
                                <div style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '6px', fontSize: '0.6rem', fontWeight: 950, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  {(sub.difficulty_level === 'original' || sub.difficulty_level === 'pro') ? '⚡ PRO' : '🚀 STARTER'}
                                </div>
                              </div>

                              <div style={{ 
                                fontSize: '0.65rem', 
                                fontWeight: 800, 
                                color: '#64748b', 
                                textTransform: 'uppercase', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                whiteSpace: 'nowrap'
                              }}>
                                {sub.songs?.artist}: {sub.songs?.title}
                              </div>
                            </div>
                          </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => handleRejectSubmission(sub.id)}
                            style={{ 
                              flex: 1,
                              background: '#f1f5f9', 
                              color: '#64748b', 
                              border: 'none', 
                              padding: '12px', 
                              borderRadius: '14px', 
                              fontSize: '0.7rem', 
                              fontWeight: 950, 
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                          >
                            Üben
                          </button>
                          <button 
                            onClick={() => handleApproveSubmission(sub.id)}
                            style={{ 
                              flex: 1,
                              background: '#22c55e', 
                              color: 'white', 
                              border: 'none', 
                              padding: '12px', 
                              borderRadius: '14px', 
                              fontSize: '0.7rem', 
                              fontWeight: 950, 
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              cursor: 'pointer',
                              boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                          >
                            GO!
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{ color: '#fcd34d' }}><Zap size={32} fill="#fcd34d" /></div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, lineHeight: 1.4 }}>Keine offenen Challenges. Alles unter Kontrolle!</div>
                  </div>
                )}
              </div>
            )}

            {/* Alle Ausloggen Button (Only for Admins) */}
            {viewMode === 'admin' && (
              <button 
                onClick={async () => {
                  if (window.confirm('Alle Schüler ausloggen?')) {
                    const now = new Date().toISOString();
                    const { error } = await supabase
                      .from('sessions')
                      .update({ check_out_time: now })
                      .is('check_out_time', null)
                      .in('user_id', allStudents.map(s => s.id));
                    
                    if (error) alert('Fehler beim Ausloggen: ' + error.message);
                    else fetchData();
                  }
                }}
                style={{ 
                  marginTop: 'auto',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '12px', 
                  background: 'white', 
                  padding: '20px', 
                  borderRadius: '24px', 
                  border: '1px solid #f1f5f9',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <User size={20} color="#ef4444" />
                <span style={{ color: '#ef4444', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Alle Ausloggen</span>
              </button>
            )}
          </aside>
        </div>
      ) : activeTab === 'proposals' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Header row with Back Button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button 
              onClick={() => setActiveTab('live')}
              style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                padding: '12px 24px',
                borderRadius: '16px',
                fontWeight: 800,
                color: '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                alignSelf: 'flex-start',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
            >
              ← Zurück zum Live Lab
            </button>
            <div>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 950, color: '#1e293b', letterSpacing: '-0.03em', margin: '0 0 8px 0' }}>
                Offene Band-Projekte
              </h1>
              <p style={{ color: '#64748b', fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>
                Hier findest Du alle Lieder, die Deine Bands aktuell vorschlagen. Stimme in Deinem Band-Board ab und übe Deinen Part, um sie bühnenreif zu machen!
              </p>
            </div>
          </div>

          {openProposals.length === 0 ? (
            <div className="card" style={{ 
              padding: '60px 40px', 
              textAlign: 'center', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '16px',
              background: '#f8fafc',
              border: '1px dashed #e2e8f0',
              borderRadius: '32px'
            }}>
              <div style={{ background: '#e0e7ff', color: '#4f46e5', padding: '16px', borderRadius: '24px', boxShadow: '0 8px 20px rgba(79, 70, 229, 0.1)' }}>
                <CheckCircle size={36} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Alles bereit!</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '400px', margin: 0, lineHeight: 1.5 }}>
                Es gibt momentan keine offenen Vorschläge in Deinen Bands. Du bist komplett auf dem Laufenden!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {(() => {
                // Group proposals by band
                const groupedProposals = openProposals.reduce((acc: Record<string, { band: any, proposals: any[] }>, form: any) => {
                  const bandId = form.band.id;
                  if (!acc[bandId]) {
                    acc[bandId] = {
                      band: form.band,
                      proposals: []
                    };
                  }
                  acc[bandId].proposals.push(form);
                  return acc;
                }, {});

                const bandGroups = Object.values(groupedProposals).sort((a: any, b: any) => a.band.name.localeCompare(b.band.name));

                return bandGroups.map((group: any) => {
                  const band = group.band;
                  const proposals = group.proposals;
                  const isCollapsed = !!collapsedBands[band.id];

                  return (
                    <div key={band.id} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Premium Collapsible Band Header */}
                      <div 
                        onClick={() => setCollapsedBands(prev => ({ ...prev, [band.id]: !prev[band.id] }))}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '16px 28px',
                          background: 'linear-gradient(90deg, #1e1b4b 0%, #110e3b 100%)',
                          border: '1px solid rgba(165, 180, 252, 0.15)',
                          borderRadius: '24px',
                          cursor: 'pointer',
                          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.border = '1px solid rgba(165, 180, 252, 0.3)';
                          e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.border = '1px solid rgba(165, 180, 252, 0.15)';
                          e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          {renderBandAvatar(band.name, band.photo_url, '48px', '12px')}
                          <div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 950, color: 'white', margin: 0, letterSpacing: '-0.01em' }}>
                              {band.name}
                            </h3>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>
                              {proposals.length} {proposals.length === 1 ? 'offener Song' : 'offene Songs'}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ 
                            fontSize: '0.65rem', 
                            fontWeight: 900, 
                            color: '#a5b4fc', 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.1em',
                            background: 'rgba(165, 180, 252, 0.1)',
                            padding: '6px 12px',
                            borderRadius: '12px'
                          }}>
                            {isCollapsed ? 'Ausklappen' : 'Einklappen'}
                          </span>
                          <div style={{ 
                            color: '#a5b4fc', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            transition: 'transform 0.3s ease',
                            transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)'
                          }}>
                            <ChevronDown size={20} />
                          </div>
                        </div>
                      </div>

                      {/* Grouped proposals list */}
                      {!isCollapsed && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingLeft: '8px' }}>
                          {proposals.map((form: any) => {
                            const song = form.song;
                            const instReq = song.instrumentation || { 'E-Gitarre': 1, 'E-Drums': 1, 'E-Bass': 1 };
                            const order = ['E-Gitarre', 'E-Drums', 'E-Piano', 'E-Bass'];
                            const colors: Record<string, string> = {
                              'E-Gitarre': '#ef4444',
                              'E-Drums': '#3b82f6',
                              'E-Piano': '#a855f7',
                              'E-Bass': '#f59e0b'
                            };

                            const allRequired: { instrument: string; part: number }[] = [];
                            order.forEach(instName => {
                              const count = instReq[instName] || 0;
                              for(let i=0; i < count; i++) {
                                allRequired.push({ instrument: instName, part: i + 1 });
                              }
                            });

                            const getIcon = (inst: string) => {
                              const low = inst.toLowerCase();
                              if (low.includes('guitar') || low.includes('gitarre')) return '🎸';
                              if (low.includes('drum')) return '🥁';
                              if (low.includes('bass')) return '🎸';
                              if (low.includes('piano') || low.includes('keys')) return '🎹';
                              return '🎵';
                            };

                            const isPro = form.band_song?.difficulty_level === 'original' || form.band_song?.difficulty_level === 'pro';
                            const levelText = isPro ? 'PRO' : 'STARTER';

                            return (
                              <div key={form.id} style={{ 
                                background: 'linear-gradient(135deg, #1e1b4b 0%, #0f0728 100%)', 
                                borderRadius: '28px', 
                                border: '1px solid rgba(165, 180, 252, 0.1)',
                                boxShadow: '0 15px 35px rgba(0, 0, 0, 0.2)',
                                display: 'grid',
                                gridTemplateColumns: '320px 1fr',
                                overflow: 'hidden',
                                minHeight: '260px'
                              }}>
                                {/* Left Panel: Band & Song Info */}
                                <div style={{ 
                                  padding: '32px', 
                                  background: 'rgba(255, 255, 255, 0.03)', 
                                  borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  gap: '24px'
                                }}>
                                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                    {renderBandAvatar(form.band.name, form.band.photo_url, '56px', '16px')}
                                    <div>
                                      <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '2px' }}>
                                        Deine Band
                                      </div>
                                      <div style={{ fontSize: '1.2rem', fontWeight: 950, color: 'white', letterSpacing: '-0.02em' }}>
                                        {form.band.name}
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <span style={{ 
                                      background: 'rgba(168, 85, 247, 0.15)', 
                                      color: '#c084fc', 
                                      border: '1px solid rgba(168, 85, 247, 0.3)',
                                      padding: '4px 10px', 
                                      borderRadius: '8px', 
                                      fontSize: '0.6rem', 
                                      fontWeight: 900,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.08em',
                                      display: 'inline-block',
                                      marginBottom: '8px'
                                    }}>
                                      Abstimmung läuft
                                    </span>
                                    <h3 style={{ fontSize: '1.4rem', fontWeight: 1000, color: 'white', margin: '0 0 4px 0', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                                      {song.title}
                                    </h3>
                                    <p style={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.8rem', margin: 0 }}>
                                      {song.artist || 'Unbekannt'}
                                    </p>
                                  </div>

                                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, lineHeight: 1.4 }}>
                                    Klicke im Hauptmenü auf <strong style={{ color: 'white' }}>"Deine Bands"</strong>, um an der Abstimmung teilzunehmen!
                                  </div>
                                </div>

                                {/* Right Panel: Slot Grid */}
                                <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h4 style={{ fontSize: '0.75rem', fontWeight: 950, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                                      Instrumenten-Belegung & Freischaltung
                                    </h4>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8' }}>
                                      Level: <strong style={{ color: isPro ? '#c084fc' : '#f59e0b', textTransform: 'uppercase' }}>{levelText}</strong>
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'flex-start', flex: 1 }}>
                                    {(() => {
                                      const APP_INSTRUMENT_ICONS: Record<string, string> = {
                                        'E-Gitarre': '🎸',
                                        'E-Bass': '🎸',
                                        'E-Drums': '🥁',
                                        'Vocals': '🎤',
                                        'E-Piano': '🎹',
                                        'Keyboard': '🎹'
                                      };

                                      return allRequired.map(({ instrument, part }) => {
                                        const key = `${instrument}_${part}`;
                                        const member = form.members.find((m: any) => {
                                          const mNorm = normalizeInstrument(m.instrument).toLowerCase();
                                          const targetNorm = normalizeInstrument(instrument).toLowerCase();
                                          return mNorm === targetNorm && m.part_number === part;
                                        });

                                        const isMe = member?.user_id === userId;
                                        const instLabel = (instReq[instrument] || 0) > 1 ? `${instrument} ${part}` : instrument;

                                        return (
                                          <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '80px', position: 'relative' }}>
                                            <div style={{ 
                                              width: '64px', height: '64px', borderRadius: '18px', 
                                              background: member ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)', 
                                              border: (isMe || member?.isMastered) ? `3px solid #ef4444` : (member ? '1px solid rgba(255,255,255,0.1)' : '2px dashed rgba(255,255,255,0.2)'),
                                              boxShadow: isMe ? '0 0 15px rgba(239, 68, 68, 0.3)' : 'none',
                                              display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                                              filter: member && !member.isMastered ? 'grayscale(100%)' : 'none',
                                              opacity: member && !member.isMastered ? 0.6 : 1
                                            }}>
                                              {member ? (
                                                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                                                  <img 
                                                    src={member.photo_url || '/avatar_ghost.jpg'} 
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setSelectedStudentProfile({
                                                        id: member.user_id,
                                                        first_name: member.first_name,
                                                        last_name: member.last_name,
                                                        photo_url: member.photo_url,
                                                        created_at: member.created_at,
                                                        birth_date: member.birth_date,
                                                        instrument: member.instrument
                                                      });
                                                    }}
                                                    style={{ width: '100%', height: '100%', borderRadius: '15px', objectFit: 'cover', cursor: 'pointer' }} 
                                                    alt="" 
                                                  />
                                                  {member.isMastered && (
                                                    <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#22c55e', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', zIndex: 10 }}>
                                                      <Check size={12} strokeWidth={4} />
                                                    </div>
                                                  )}
                                                </div>
                                              ) : (
                                                <div style={{ fontSize: '1.5rem', opacity: 0.2 }}>{APP_INSTRUMENT_ICONS[instrument as keyof typeof APP_INSTRUMENT_ICONS] || '❓'}</div>
                                              )}
                                            </div>
                                            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', width: '100%' }}>
                                              <div style={{ fontSize: '0.65rem', fontWeight: 950, color: member ? 'white' : 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                                                {member ? member.first_name : instLabel}
                                              </div>
                                              {member && (
                                                <div style={{ fontSize: '0.45rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
                                                  {instLabel}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      });
                                    })()}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <input placeholder="Suche..." value={bandSearch} onChange={e => setBandSearch(e.target.value)} style={{ width: '100%', padding: '16px', borderRadius: '24px', border: '2px solid #f1f5f9' }} />
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
             {allBands.filter(b => b.name.toLowerCase().includes(bandSearch.toLowerCase())).map(band => (
               <div key={band.id} onClick={() => onOpenBandProfile?.(band)} className="glass-panel" style={{ padding: '24px', borderRadius: '24px', cursor: 'pointer' }}>
                 <h3 style={{ margin: 0 }}>{band.name}</h3>
                 <p style={{ color: '#64748b', fontSize: '0.8rem' }}>{(() => { const ids = (band.band_members || []).map((m: any) => m.user_id || m.student_id || m.external_name).filter(Boolean); return new Set(ids).size; })()} Mitglieder</p>
               </div>
             ))}
           </div>
        </div>
      )}
      {/* Full Submissions View Overlay */}
      {showAllSubmissions && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(20px)',
          zIndex: 2000,
          padding: '40px',
          overflowY: 'auto'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                 <div style={{ background: '#f59e0b', color: 'white', padding: '12px', borderRadius: '16px', boxShadow: '0 8px 24px rgba(245, 158, 11, 0.2)' }}>
                   <TrendingUp size={28} />
                 </div>
                 <div>
                   <h2 style={{ fontSize: '1.75rem', fontWeight: 1000, color: '#0f172a', margin: 0 }}>Vollständige Pipeline</h2>
                   <p style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600, margin: '4px 0 0 0' }}>{allSubmissions.length} ausstehende Abnahmen</p>
                 </div>
               </div>
               <button 
                 onClick={() => setShowAllSubmissions(false)}
                 style={{ background: '#f1f5f9', border: 'none', width: '48px', height: '48px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
               >
                 <X size={24} />
               </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {allSubmissions.map(sub => {
                const isInLab = activeSessions.some(sess => sess.user_id === sub.user_id);
                return (
                  <div key={sub.id} style={{ 
                    background: 'white', 
                    padding: '24px', 
                    borderRadius: '32px', 
                    border: `2px solid ${isInLab ? '#10b981' : '#ef4444'}`,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    position: 'relative'
                  }}>
                    {/* Status Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: isInLab ? '#10b981' : '#ef4444',
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: '10px',
                      fontSize: '0.6rem',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {isInLab ? 'IM LAB' : 'HOME'}
                    </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                     <div style={{ width: '56px', height: '56px', borderRadius: '18px', overflow: 'hidden', border: '2px solid white', boxShadow: '0 8px 16px rgba(0,0,0,0.05)' }}>
                       <AvatarImage src={sub.users?.photo_url} />
                     </div>
                     <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                          <div style={{ fontWeight: 1000, fontSize: '1.1rem', color: '#0f172a' }}>{sub.users?.first_name}</div>
                          {(() => {
                            const norm = normalizeInstrument(sub.instrument);
                            return (
                              <div style={{ 
                                width: '24px', height: '24px', borderRadius: '8px', 
                                background: INSTRUMENT_COLORS[norm] || '#cbd5e1', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                fontSize: '0.8rem', flexShrink: 0,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                              }}>
                                {TEACHER_INSTRUMENT_ICONS[norm] || '🎸'}
                              </div>
                            );
                          })()}
                          <div style={{ background: '#e2e8f0', padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 950, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {(sub.difficulty_level === 'original' || sub.difficulty_level === 'pro') ? '⚡ PRO' : '🚀 STARTER'}
                          </div>
                        </div>

                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                           {sub.instrument}
                        </div>
                     </div>
                   </div>

                   <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                     <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Song</div>
                     <div style={{ fontWeight: 900, color: '#1e293b' }}>{sub.songs?.artist} - {sub.songs?.title}</div>
                   </div>

                   <div style={{ display: 'flex', gap: '12px' }}>
                     <button 
                       onClick={() => handleApproveSubmission(sub.id)}
                       style={{ flex: 2, background: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '16px', fontWeight: 1000, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(16, 185, 129, 0.2)' }}
                     >
                       BESTÄTIGEN
                     </button>
                     <button 
                       onClick={() => handleRejectSubmission(sub.id)}
                       style={{ flex: 1, background: '#f1f5f9', color: '#ef4444', border: 'none', padding: '12px', borderRadius: '16px', fontWeight: 1000, fontSize: '0.85rem', cursor: 'pointer' }}
                     >
                       <Trash2 size={18} />
                     </button>
                   </div>
                  </div>
                );
              })}
            </div>

            {allSubmissions.length === 0 && (
              <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>✨</div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 1000, color: '#1e293b' }}>Alles erledigt!</h3>
                <p style={{ color: '#64748b', fontWeight: 600 }}>Es gibt aktuell keine ausstehenden Challenges.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Monitor, Music, Award, Box, Plus, AlertCircle, User, Star, TrendingUp, Shield, Zap, Play, Info, CheckCircle, Check, Search, Trash2 } from 'lucide-react';
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
const brandColor = 'var(--primary-color)';

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
  const [lastActivity, setLastActivity] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [ticker, setTicker] = useState(0);
  const [selectedCoachProfile, setSelectedCoachProfile] = useState<any>(null);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('live'); // 'live' or 'bands'
  const [allBands, setAllBands] = useState<any[]>([]);
  const [bandSearch, setBandSearch] = useState('');
  const [bandLetter, setBandLetter] = useState<string | null>(null);
  const [editingBand, setEditingBand] = useState<any>(null);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [showAddMember, setShowAddMember] = useState<string | null>(null); // bandId
  const [memberSearch, setMemberSearch] = useState('');
  const [externalName, setExternalName] = useState('');
  const [externalInstrument, setExternalInstrument] = useState('Vocals');
  const [helpRequests, setHelpRequests] = useState<any[]>([]);
  const [unreadShouts, setUnreadShouts] = useState<any[]>([]);

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
    if (!userId) return;

    // 0. Fetch unread shoutbox messages for bands (Student or Coach) - PRIORITY
    try {
      let bIds: string[] = [];
      const { data: mBands } = await supabase.from('band_members').select('band_id').eq('user_id', userId);
      if (mBands) bIds.push(...mBands.map(b => b.band_id));
      const { data: cBands } = await supabase.from('bands').select('id').eq('coach_id', userId);
      if (cBands) bIds.push(...cBands.map(b => b.id));
      bIds = [...new Set(bIds)];

      if (bIds.length > 0) {
        const { data: shoutData, error: sErr } = await supabase
          .from('band_shoutbox')
          .select('*, users(first_name, last_name, photo_url), bands(name)')
          .in('band_id', bIds)
          .order('created_at', { ascending: false });
          
        if (sErr) console.error('[Shoutbox Fetch Error]:', sErr);
        
        const unread = (shoutData || []).filter(s => {
          const readBy = s.read_by || [];
          return !readBy.includes(userId) && s.user_id !== userId;
        });
        setUnreadShouts(unread);
      }
    } catch (err) {
      console.error('[Shoutbox Logic Error]:', err);
    }

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
      
      // Filter: Only show sessions where user was seen in the last 5 minutes
      const fiveMinsAgo = new Date(Date.now() - 5 * 60000).toISOString();
      const twoMinsAgo = fiveMinsAgo; // Maintain compatibility with variable names below if needed
      
      const trulyActive = activeSess.filter(s => {
        const u: any = s.users;
        if (!u) return false;

        // NEW LOGIC: Anyone at a station (student or teacher) stays logged in
        if (s.station_id || u.role === 'student') return true;

        // Mobile coaches (no station) still use heartbeat for presence
        const lastSeen = u?.last_seen;
        const isRecentSeen = lastSeen && lastSeen > twoMinsAgo;
        return isRecentSeen;
      });
      
      // Filter: Show anyone at a station, OR anyone who is a student
      const sessionPeople = trulyActive.filter(s => s.station_id || s.users?.role === 'student');
      setActiveSessions(sessionPeople);

      // 4. Fetch ALL Coaches/Admins of the school to check heartbeat
      const { data: allCoaches } = await supabase
        .from('users')
        .select('*')
        .in('role', ['teacher', 'admin'])
        .eq('school_id', tData.school_id);

      // A coach is "active" if they were seen in the last 2 minutes
      const activeCoaches = (allCoaches || []).filter(c => {
        return c.last_seen && c.last_seen > twoMinsAgo;
      });
      
      setCoaches(activeCoaches.map(c => ({
        id: c.id,
        users: c,
        session: trulyActive.find(s => s.user_id === c.id)
      })));

      // 5. Fetch Wall Songs (Band Matching) for ALL stage ready students in the school
      const { data: skillData } = await supabase
        .from('user_song_skills')
        .select('*, users!inner(id, school_id), songs(*)')
        .eq('users.school_id', tData.school_id)
        .eq('is_stage_ready', true);

      // Get ALL founded band members to filter out taken musicians
      const { data: allMembers } = await supabase
        .from('band_members')
        .select('user_id, bands(id, song_id, band_songs(song_id))');

      const songsMap: Record<string, any> = {};
      
      skillData?.forEach(skill => {
        // Skip Vocals for now (per user request: only instrumental bands)
        if (skill.instrument === 'Vocals') return;

        // Filter out musicians who are already in a band for this song
        const isTaken = allMembers?.some((m: any) => {
          const bandData = Array.isArray(m.bands) ? m.bands[0] : m.bands;
          if (!bandData) return false;
          const hasSongInRepertoire = bandData.song_id === skill.song_id || bandData.band_songs?.some((bs: any) => bs.song_id === skill.song_id);
          return m.user_id === skill.user_id && hasSongInRepertoire;
        });
        if (isTaken) return;

        if (!songsMap[skill.song_id]) {
          const song = Array.isArray(skill.songs) ? skill.songs[0] : skill.songs;
          if (!song) return;
          const instrumentationData = song.instrumentation || { Guitar: 1, Bass: 1, Drums: 1, Keys: 0 };
          const required = Object.keys(instrumentationData).filter(k => instrumentationData[k] > 0 && k !== 'Vocals');
          
          songsMap[skill.song_id] = {
            ...skill.songs,
            required,
            formations: []
          };
        }

        const song = songsMap[skill.song_id];
        // Find or create slot (Parallel Slot Logic)
        let form = song.formations.find((f: any) => !f.memberMap[skill.instrument]);
        if (!form) {
          form = { id: skill.formation_group || `auto_${song.formations.length}`, members: [], memberMap: {} };
          song.formations.push(form);
        }
        form.members.push(skill);
        form.memberMap[skill.instrument] = skill;
      });

      // Flatten all formations across all songs to find the top 3 "closest to completion"
      const allFormations: any[] = [];
      Object.values(songsMap).forEach((song: any) => {
        song.formations.forEach((form: any) => {
          const present = Object.keys(form.memberMap);
          const missing = song.required.filter((inst: string) => !present.includes(inst));
          if (missing.length > 0) { // Only show incomplete ones for recruiting
            allFormations.push({
              ...song,
              formationId: form.id,
              present,
              missing,
              score: missing.length // lower is better
            });
          }
        });
      });

      const topRecruiting = allFormations
        .sort((a, b) => a.score - b.score)
        .slice(0, 3);

      setWallSongs(topRecruiting);

      // 6. Challenge Submissions (>90% progress)
      const { data: subData, error: subErr } = await supabase
        .from('user_song_skills')
        .select('*, users!user_id(*), songs(*)')
        .eq('is_pending_approval', true);
      
      if (subErr) {
        console.error("[Submission Fetch Error]:", subErr);
      }
      
      const allSubsMapped = (subData || []).map((s: any) => {
        const u = Array.isArray(s.users) ? s.users[0] : s.users;
        const song = Array.isArray(s.songs) ? s.songs[0] : s.songs;
        return { ...s, users: u, songs: song };
      });

      // Filter by school locally
      const schoolSpecific = allSubsMapped.filter(s => s.users?.school_id === tData.school_id);
      
      setSubmissions(schoolSpecific);

      // 5. Fetch ALL Bands
      const { data: bData } = await supabase
        .from('bands')
        .select('*, band_members(*, users(*)), band_songs(songs(*))')
        .eq('school_id', tData.school_id)
        .order('name');
      setAllBands(bData || []);

      // 6. Fetch ALL Students for member management
      const { data: studData } = await supabase
        .from('users')
        .select('*')
        .eq('school_id', tData.school_id)
        .eq('role', 'student')
        .order('first_name');
      setAllStudents(studData || []);

      // 7. Fetch help requests
      const { data: helpData } = await supabase
        .from('help_requests')
        .select('*, users(*)')
        .eq('school_id', tData.school_id)
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      setHelpRequests(helpData || []);
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
    // Get the submission info first to know the song and school
    const { data: sub } = await supabase.from('user_song_skills').select('song_id, user_id, users(school_id)').eq('id', subId).single();
    
    // 1. Update verification with teacher ID
    const { error } = await supabase.from('user_song_skills').update({ 
      is_pending_approval: false, 
      is_stage_ready: true,
      verified_by_id: userId // The teacher logged into the dashboard
    }).eq('id', subId);

    if (error) {
      alert(error.message);
    } else {
      // Data is now ready, but we DON'T form a band automatically anymore.
      // The student will be prompted to suggest/join via their dashboard.
      fetchData();
    }
  };

  const updateBandCoach = async (bandId: string) => {
    try {
      // 1. Check if coach is manually set
      const { data: band } = await supabase.from('bands').select('coach_is_manual').eq('id', bandId).single();
      if (band?.coach_is_manual) return;

      // 2. Get all members and their verifiers for this band's songs
      const { data: members } = await supabase
        .from('band_members')
        .select(`
          user_id,
          bands!inner(song_id),
          users!inner(user_song_skills(*))
        `)
        .eq('band_id', bandId);

      if (!members || members.length === 0) return;

      const verifierCounts: Record<string, number> = {};
      
      members.forEach((m: any) => {
        const songId = m.bands?.song_id;
        const skills = m.users?.user_song_skills || [];
        const verifierId = skills.find((s: any) => s.song_id === songId && s.is_stage_ready)?.verified_by_id;
        
        if (verifierId) {
          verifierCounts[verifierId] = (verifierCounts[verifierId] || 0) + 1;
        }
      });

      // 3. Find teacher with most verifications
      let topTeacherId = null;
      let maxCount = 0;
      for (const [tId, count] of Object.entries(verifierCounts)) {
        if (count > maxCount) {
          maxCount = count;
          topTeacherId = tId;
        }
      }

      // 4. Update band coach
      if (topTeacherId) {
        await supabase.from('bands').update({ coach_id: topTeacherId }).eq('id', bandId);
      }
    } catch (err) {
      console.error('[Coach] Error updating coach:', err);
    }
  };

  const checkAndFormBand = async (songId: string, schoolId: string) => {
    try {
      // 1. Get Song and its required instrumentation
      const { data: song } = await supabase.from('songs').select('*').eq('id', songId).single();
      if (!song) return;

      const instrumentationMap: Record<string, string[]> = {
        'Wonderwall': ['Guitar', 'Bass', 'Drums', 'Vocals'],
        'Seven Nation Army': ['Guitar', 'Bass', 'Drums'],
        'Flowers': ['Keys', 'Bass', 'Drums', 'Vocals'],
        'Perfect': ['Guitar', 'Keys', 'Vocals'],
        'Believer': ['Guitar', 'Drums', 'Vocals', 'Bass']
      };

      const required = instrumentationMap[song.title] || ['Guitar', 'Bass', 'Drums', 'Vocals'];
      
      // 2. For each instrument, find the first available musician (earliest stage_ready)
      // We look for the first person in queue for each instrument
      const candidates: Record<string, any> = {};
      
      for (const inst of required) {
        const { data: firstInQueue } = await supabase
          .from('user_song_skills')
          .select('*, users!inner(*)')
          .eq('song_id', songId)
          .eq('instrument', inst)
          .eq('is_stage_ready', true)
          .eq('users.school_id', schoolId)
          .order('created_at', { ascending: true })
          .limit(1)
          .single();
        
        if (firstInQueue) {
          candidates[inst] = firstInQueue;
        } else {
          // Missing an instrument -> no band yet
          return;
        }
      }

      // 3. All slots filled! Form the band.
      const memberIds = Object.values(candidates).map(c => c.user_id).sort();
      
      // Check if a band with these EXACT members already exists
      const { data: existingBands } = await supabase
        .from('bands')
        .select('*, band_members(*)')
        .eq('school_id', schoolId);
      
      let targetBand = (existingBands || []).find(b => {
        const bMembers = (b.band_members || []).map((m: any) => m.user_id).sort();
        return JSON.stringify(bMembers) === JSON.stringify(memberIds);
      });

      if (!targetBand) {
        // Create new band
        const { data: newBand, error: createErr } = await supabase
          .from('bands')
          .insert({
            school_id: schoolId,
            name: `${song.title} Band`,
            status: 'active'
          })
          .select()
          .single();
        
        if (createErr) throw createErr;
        targetBand = newBand;

        // Add members
        const memberInserts = Object.keys(candidates).map(inst => ({
          band_id: targetBand.id,
          user_id: candidates[inst].user_id,
          instrument: inst
        }));
        await supabase.from('band_members').insert(memberInserts);
        
        // Initial coach calculation
        await updateBandCoach(targetBand.id);
      }

      // 4. Add song to band's repertoire (band_songs)
      await supabase.from('band_songs').insert({
        band_id: targetBand.id,
        song_id: songId
      }).select().single();

      return targetBand.id;

    } catch (err) {
      console.error("Auto Band Error:", err);
    }
  };

  const handleRejectSubmission = async (subId: string) => {
    const { error } = await supabase.from('user_song_skills').update({ is_pending_approval: false, progress_percent: 85 }).eq('id', subId);
    if (error) alert(error.message);
    else fetchData();
  };

  const handleLogoutStudent = async (sessionId: string) => {
    if (!window.confirm('Schüler wirklich ausloggen?')) return;
    const { error } = await supabase.from('sessions').update({ check_out_time: new Date().toISOString() }).eq('id', sessionId);
    if (error) alert(error.message);
    else fetchData();
  };

  const handleAcknowledgeShout = async (shoutId: string) => {
    try {
      // Append current user ID to read_by array using SQL array_append
      const { error } = await supabase.rpc('acknowledge_shout_message', {
        msg_id: shoutId,
        uid: userId
      });

      if (error) {
        // Fallback if RPC is not available: Fetch-Update-Cycle
        const { data: msg } = await supabase.from('band_shoutbox').select('read_by').eq('id', shoutId).single();
        const currentReadBy = msg?.read_by || [];
        if (!currentReadBy.includes(userId)) {
          await supabase.from('band_shoutbox').update({
            read_by: [...currentReadBy, userId]
          }).eq('id', shoutId);
        }
      }
      fetchData();
    } catch (err) {
      console.error('Error acknowledging shout:', err);
    }
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
            padding: '8px 12px', 
            minHeight: '128px', 
            aspectRatio: '1 / 0.8',
            display: 'flex', 
            flexDirection: 'column', 
            position: 'relative', 
            border: isActive ? `2px solid ${color}` : '1px solid #f1f5f9',
            boxShadow: isActive ? `0 10px 25px -5px ${color}30` : 'none',
            borderRadius: '20px',
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
                onClick={(e) => { e.stopPropagation(); handleLogoutStudent(sess.id); }}
                style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', color: '#ef4444', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Ausloggen"
              >
                Logout
              </button>
            )}
          </div>

          {sess ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto', marginBottom: 'auto' }}>
            <div style={{ width: '68px', height: '68px', borderRadius: '18px', overflow: 'hidden', border: `2px solid ${color}`, boxShadow: `0 8px 24px ${color}30`, flexShrink: 0 }}>
              <img src={sess.users?.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 900, fontSize: '1rem', color: '#1e293b', lineHeight: 1.1 }}>{sess.users?.first_name}</div>
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
          // Calculate position for multiple coaches (slight offset and staggered vertical)
          const total = coaches.length;
          const offset = total > 1 ? (idx - (total - 1) / 2) * 54 : 0;
          const verticalOffset = total > 1 ? (idx % 2 === 0 ? -12 : 12) : 0;
          
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
                width: '84px', 
                height: '84px', 
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
                  {c.users?.role === 'admin' ? 'Admin' : 'Lehrer'}
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
  const handleDeleteBand = async (bandId: string) => {
    if (!window.confirm('Möchtest du diese Band wirklich endgültig löschen? Alle Daten gehen verloren.')) return;
    try {
      const { error } = await supabase.from('bands').delete().eq('id', bandId);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert('Fehler beim Löschen der Band: ' + err.message);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Mitglied aus der Band entfernen?')) return;
    try {
      const { error } = await supabase.from('band_members').delete().eq('id', memberId);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    }
  };

  const handleAddMember = async (bandId: string, userId: string | null, instrument: string, extName?: string) => {
    try {
      const { error } = await supabase.from('band_members').insert({
        band_id: bandId,
        user_id: userId,
        instrument: instrument,
        external_name: extName,
        confetti_seen: true
      });
      if (error) throw error;
      setShowAddMember(null);
      setMemberSearch('');
      setExternalName('');
      fetchData();
    } catch (err: any) {
      alert('Fehler beim Hinzufügen: ' + err.message);
    }
  };

  const handleSaveBandEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('bands').update({
        name: editingBand.name,
        bio: editingBand.bio,
        photo_url: editingBand.photo_url,
        genre: editingBand.genre,
        soundcloud_links: editingBand.soundcloud_links || [],
        youtube_links: editingBand.youtube_links || [],
        appointments: editingBand.appointments || []
      }).eq('id', editingBand.id);
      
      if (error) throw error;
      setEditingBand(null);
      fetchData();
    } catch (err: any) {
      alert('Fehler beim Speichern: ' + err.message);
    }
  };
  return (
    <div style={{ padding: hideHeader ? '0' : '20px 40px', width: '100%', maxWidth: '1800px', margin: '0 auto', background: hideHeader ? 'transparent' : '#f8fafc', minHeight: '100vh' }}>
      {selectedCoachProfile && (
        <TeacherDetailModal teacher={selectedCoachProfile} onClose={() => setSelectedCoachProfile(null)} />
      )}
      {selectedStudentProfile && (
        <StudentDetailModal student={selectedStudentProfile} onClose={() => setSelectedStudentProfile(null)} />
      )}
      {!hideHeader && (
        <header style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
              <h1 
                onClick={() => setActiveTab('live')}
                style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.03em', color: activeTab === 'live' ? '#1e293b' : '#cbd5e1', margin: 0, cursor: 'pointer', transition: 'color 0.2s' }}
              >
                Live Lab
              </h1>
              <h1 
                onClick={() => setActiveTab('bands')}
                style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.03em', color: activeTab === 'bands' ? '#1e293b' : '#cbd5e1', margin: 0, cursor: 'pointer', transition: 'color 0.2s' }}
              >
                Bands
              </h1>
            </div>
            <p style={{ color: '#64748b', fontWeight: 600, fontSize: '0.95rem', marginTop: '4px', margin: 0 }}>
              {teacher?.schools?.name || 'Groovelab Academy'} • Management Dashboard
            </p>
          </div>
          {viewMode === 'admin' && onLogout && (
            <button onClick={onLogout} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '12px 24px', borderRadius: '12px', fontWeight: 700, color: '#ef4444', cursor: 'pointer' }}>Zentrale schließen</button>
          )}
        </header>
      )}

      {activeTab === 'live' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', alignItems: 'start' }}>
        {/* Left: Main Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
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
          <div style={{ gridColumn: '1', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
          <div style={{ gridColumn: '4', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <StationNode num={7} color="#eab308" inst="Bass" />
            <StationNode num={8} color="#eab308" inst="Bass" />
          </div>
        </div>

        {/* Right Sidebar - Shown to everyone, but content varies */}
        {(viewMode === 'admin' || viewMode === 'student') && (
          <aside style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* Shoutbox Notifications (Band News) */}
            {unreadShouts.length > 0 && (
              <div className="glass-panel animation-slide-up" style={{ 
                background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', 
                borderRadius: '24px', 
                padding: '16px', 
                boxShadow: '0 15px 35px -5px rgba(245, 158, 11, 0.2)',
                border: '1.5px solid #fbbf24'
              }}>
                <h3 style={{ fontSize: '0.7rem', fontWeight: 900, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0' }}>
                  <div className="pulse" style={{ background: '#f59e0b', color: 'white', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Monitor size={14} /></div>
                  Band News
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {unreadShouts.map(shout => (
                    <div key={shout.id} className="glass-panel" style={{ padding: '16px', background: 'white', borderRadius: '20px', border: '1px solid #fde68a', boxShadow: '0 8px 20px rgba(0,0,0,0.04)' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', overflow: 'hidden', border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                          <img src={shout.users?.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 900, fontSize: '0.9rem', color: '#1e293b', marginBottom: '2px' }}>
                            {shout.users?.first_name}
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 600, lineHeight: 1.4 }}>
                            {shout.content}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>
                            {shout.bands?.name}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '8px' }}>
                        <button 
                          onClick={() => handleAcknowledgeShout(shout.id)}
                          style={{ 
                            background: '#fef3c7', 
                            color: '#b45309', 
                            border: 'none', 
                            padding: '6px 16px', 
                            borderRadius: '8px', 
                            fontSize: '0.65rem', 
                            fontWeight: 950, 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            transition: 'all 0.2s',
                            marginLeft: '48px' // Aligns with the content column (Avatar 36px + gap 12px)
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fde68a'}
                          onMouseLeave={e => e.currentTarget.style.background = '#fef3c7'}
                        >
                          <CheckCircle size={10} /> VERSTANDEN
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          
          {/* Help Requests */}
          {helpRequests.length > 0 && (
            <div className="glass-panel animation-slide-up" style={{ 
              background: 'linear-gradient(135deg, #fef2f2, #fee2e2)', 
              borderRadius: '24px', 
              padding: '16px', 
              boxShadow: '0 15px 35px -5px rgba(239, 68, 68, 0.2)',
              border: '1px solid #fca5a5'
            }}>
              <h3 style={{ fontSize: '0.7rem', fontWeight: 900, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0' }}>
                <div className="pulse" style={{ background: '#ef4444', color: 'white', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zap size={14} /></div>
                Hilfe benötigt
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {helpRequests.map(req => (
                  <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'white', borderRadius: '16px', border: '1px solid #fecaca' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', overflow: 'hidden' }}>
                      <img src={req.users?.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900, fontSize: '0.9rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.users?.first_name} {req.users?.last_name?.[0]}.</div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ef4444' }}>{req.stations?.name || 'Tisch unbekannt'}</div>
                    </div>
                    <button 
                      onClick={async () => {
                        await supabase.from('help_requests').update({ status: 'resolved' }).eq('id', req.id);
                        fetchData();
                      }}
                      style={{ background: '#fef2f2', border: 'none', padding: '10px', borderRadius: '12px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#fecaca'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.transform = 'scale(1)'; }}
                      title="Als erledigt markieren"
                    >
                      <Check size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Band Match & Recruiting (Puzzle Style) */}
          <div className="glass-panel" style={{ 
            background: 'linear-gradient(135deg, #fefce8, #fef9c3)', 
            borderRadius: '24px', 
            padding: '16px', 
            boxShadow: '0 15px 35px -5px rgba(250, 204, 21, 0.2)',
            border: '1px solid #fef08a'
          }}>
            <h3 style={{ fontSize: '0.7rem', fontWeight: 900, color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0' }}>
              <div style={{ background: '#ca8a04', color: 'white', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zap size={14} /></div>
              Band-Matching
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {wallSongs.filter(s => s.missing.length > 0).map(song => (
                <div key={song.id + song.formationId} className="glass-panel" style={{ padding: '16px', background: 'white', borderRadius: '20px', border: '1px solid #fef08a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1e293b' }}>{song.title}</div>
                    <div style={{ fontSize: '0.55rem', fontWeight: 900, color: '#ca8a04', background: '#fefce8', padding: '2px 4px', borderRadius: '4px' }}>
                      {song.formationId.startsWith('auto_') ? `BAND #${parseInt(song.formationId.split('_')[1]) + 1}` : 'BAND'}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '16px' }}>{song.artist}</div>
                  
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {song.required.map((inst: string) => {
                      const isPresent = song.present.includes(inst);
                      const color = INSTRUMENT_COLORS[inst] || '#64748b';
                      return (
                        <div 
                          key={inst} 
                          title={inst}
                          style={{ 
                            width: '48px', 
                            height: '48px', 
                            borderRadius: '14px', 
                            background: isPresent ? `${color}15` : 'transparent', 
                            border: isPresent ? `1.5px solid ${color}` : `2px dashed ${color}40`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.25rem',
                            position: 'relative',
                            filter: isPresent ? 'none' : 'grayscale(0.5)',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {TEACHER_INSTRUMENT_ICONS[inst as keyof typeof TEACHER_INSTRUMENT_ICONS] || '🎸'}
                          {!isPresent && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}>
                              <Plus size={12} color={color} strokeWidth={4} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: '12px', fontSize: '0.7rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase' }}>
                    Gesucht: {song.missing.join(' & ')}
                  </div>
                </div>
              ))}
          {wallSongs.filter(s => s.missing.length > 0).length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                  Alle Bands sind aktuell voll besetzt! 🤘
                </div>
              )}
            </div>
          </div>
          {/* Challenge Pipeline - Teachers/Admins only */}
          {viewMode !== 'student' && (
            <div className="glass-panel" style={{ 
              background: submissions.length > 0 ? 'linear-gradient(145deg, #ffffff, #f0fdf4)' : 'white', 
              padding: '16px', 
              borderRadius: '24px', 
              border: submissions.length > 0 ? `2px solid #10b981` : '1px solid #f1f5f9',
              boxShadow: submissions.length > 0 ? '0 15px 35px -5px rgba(16, 185, 129, 0.15)' : '0 4px 12px rgba(0,0,0,0.03)',
              animation: submissions.length > 0 ? 'border-pulse-green 3s infinite' : 'none'
            }}>
              <h3 style={{ fontSize: '0.7rem', fontWeight: 950, color: submissions.length > 0 ? '#10b981' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0' }}>
                <TrendingUp size={16} /> Challenge Pipeline ({submissions.length})
                {submissions.length > 0 && <span className="pulse" style={{ background: '#10b981', width: '6px', height: '6px', borderRadius: '50%' }}></span>}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {submissions.map(sub => (
                  <div key={sub.id} className="glass-panel" style={{ padding: '14px', background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
                        <img src={sub.users?.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 900, fontSize: '0.9rem', color: '#1e293b' }}>{sub.users?.first_name} {sub.users?.last_name?.[0]}.</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {TEACHER_INSTRUMENT_ICONS[sub.instrument as keyof typeof TEACHER_INSTRUMENT_ICONS]} {sub.instrument} • {sub.songs?.title}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleRejectSubmission(sub.id)} 
                        style={{ flex: 1, background: '#f8fafc', color: '#ef4444', border: '1px solid #fee2e2', padding: '8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer' }}
                      >
                        Üben
                      </button>
                      <button 
                        onClick={() => handleApproveSubmission(sub.id)} 
                        style={{ flex: 2, background: '#10b981', color: 'white', border: 'none', padding: '8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
                      >
                        <Award size={14} /> Bestätigen
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
                @keyframes border-pulse-red {
                  0% { border-color: #ef444422; }
                  50% { border-color: #ef4444aa; }
                  100% { border-color: #ef444422; }
                }
              `}</style>
            </div>
          )}


          {viewMode === 'admin' && (
            <div onClick={handleLogoutAll} className="glass-panel" style={{ background: 'white', padding: '16px', borderRadius: '16px', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <User size={20} color="#ef4444" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>Alle Ausloggen</div>
            </div>
          )}
        </aside>
        )}
        </div>
      ) : (() => {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const filteredBands = allBands.filter(band => {
          const matchesSearch = band.name.toLowerCase().includes(bandSearch.toLowerCase());
          const matchesLetter = !bandLetter || band.name.toUpperCase().startsWith(bandLetter);
          return matchesSearch && matchesLetter;
        });

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  placeholder="Nach Band suchen..." 
                  value={bandSearch}
                  onChange={e => setBandSearch(e.target.value)}
                  style={{ width: '100%', padding: '16px 16px 16px 52px', borderRadius: '24px', border: '2px solid #f1f5f9', background: 'white', outline: 'none', fontSize: '1.1rem', fontWeight: 600, transition: 'all 0.2s' }}
                  onFocus={(e) => e.target.style.borderColor = brandColor}
                  onBlur={(e) => e.target.style.borderColor = '#f1f5f9'}
                />
              </div>
            </div>

            {/* Alphabet Bar */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', padding: '8px', background: 'white', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
              <button 
                onClick={() => setBandLetter(null)}
                style={{ padding: '6px 12px', borderRadius: '10px', border: 'none', background: !bandLetter ? brandColor : 'transparent', color: !bandLetter ? 'white' : '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem' }}
              >
                ALL
              </button>
              {alphabet.map(l => (
                <button 
                  key={l}
                  onClick={() => setBandLetter(bandLetter === l ? null : l)}
                  style={{ 
                    width: '32px', height: '32px', borderRadius: '10px', border: 'none', 
                    background: bandLetter === l ? brandColor : 'transparent', 
                    color: bandLetter === l ? 'white' : '#64748b', 
                    fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem' 
                  }}
                >
                  {l}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredBands.map(band => (
                <div key={band.id} className="glass-panel" 
                  onClick={() => onOpenBandProfile?.(band)}
                  style={{ 
                    background: 'white', borderRadius: '24px', padding: '20px 24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                    display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', alignItems: 'center', gap: '24px', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    {band.photo_url ? (
                      <img src={band.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    ) : (
                      <Music size={24} color="white" />
                    )}
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', margin: '0 0 4px 0' }}>{band.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: brandColor, textTransform: 'uppercase' }}>{band.genre || 'Bandprojekt'}</span>
                      <span style={{ color: '#cbd5e1' }}>•</span>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{band.band_members?.length || 0} Mitglieder</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {(band.band_members || []).slice(0, 5).map((m: any, i: number) => {
                       const u = Array.isArray(m.users) ? m.users[0] : m.users;
                       return (
                        <div key={i} style={{ width: '32px', height: '32px', borderRadius: '10px', overflow: 'hidden', border: '2px solid white', marginLeft: i === 0 ? 0 : '-12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', background: 'white' }} title={`${u?.first_name} (${m.instrument})`}>
                          <img src={u?.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        </div>
                       );
                    })}
                    {(band.band_members || []).length > 5 && (
                      <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#f1f5f9', border: '2px solid white', marginLeft: '-12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#64748b' }}>
                        +{(band.band_members || []).length - 5}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => setEditingBand(band)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '12px', cursor: 'pointer', color: '#64748b' }}><Monitor size={18} /></button>
                    <button 
                      onClick={async () => {
                        if(window.confirm(`Band "${band.name}" wirklich komplett auflösen?`)) {
                          await supabase.from('bands').delete().eq('id', band.id);
                          fetchData();
                        }
                      }}
                      style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', padding: '10px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}
                      title="Band auflösen"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {filteredBands.length === 0 && (
                <div style={{ textAlign: 'center', padding: '80px', background: 'white', borderRadius: '32px', border: '2px dashed #e2e8f0' }}>
                    <div style={{ fontSize: '3rem', margin: '0 auto 20px auto', width: '80px', height: '80px', background: '#f8fafc', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔍</div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>Keine Bands gefunden</h3>
                    <p style={{ color: '#64748b' }}>Probiere einen anderen Suchbegriff oder Buchstaben.</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Edit Band Modal */}
      {editingBand && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <form onSubmit={handleSaveBandEdit} className="glass-panel" style={{ background: 'white', padding: '32px', borderRadius: '32px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '24px' }}>Band bearbeiten</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>Bandname</label>
                <input value={editingBand.name} onChange={e => setEditingBand({...editingBand, name: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '6px', fontWeight: 700 }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>Musikrichtung / Genre</label>
                <input value={editingBand.genre || ''} onChange={e => setEditingBand({...editingBand, genre: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '6px', fontWeight: 700 }} />
              </div>
               <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>Beschreibung (Bio)</label>
                <textarea rows={3} value={editingBand.bio || ''} onChange={e => setEditingBand({...editingBand, bio: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '6px', fontWeight: 700, resize: 'none' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Mitglieder verwalten</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(editingBand.band_members || []).map((m: any) => {
                    const u = Array.isArray(m.users) ? m.users[0] : m.users;
                    return (
                      <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '8px', overflow: 'hidden', background: m.user_id ? '#f1f5f9' : '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {m.user_id ? (
                              <img src={u?.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ color: 'white', fontSize: '0.6rem', fontWeight: 900 }}>{m.external_name?.[0] || 'E'}</span>
                            )}
                          </div>
                          <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                            {m.user_id ? `${u?.first_name} ${u?.last_name || ''}` : m.external_name}
                          </span>
                          <span style={{ fontSize: '0.7rem', background: '#e2e8f0', padding: '2px 8px', borderRadius: '6px', fontWeight: 900 }}>{m.instrument}</span>
                        </div>
                        <button type="button" onClick={() => handleRemoveMember(m.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}><Trash2 size={16} /></button>
                      </div>
                    );
                  })}
                  <button type="button" onClick={() => setShowAddMember(editingBand.id)} style={{ padding: '12px', borderRadius: '12px', border: '2px dashed #cbd5e1', background: 'transparent', color: brandColor, fontWeight: 800, cursor: 'pointer', marginTop: '4px' }}>
                    + Weiteren Schüler hinzufügen
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="submit" style={{ flex: 1, background: brandColor, color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 800, cursor: 'pointer' }}>Speichern</button>
                <button type="button" onClick={() => setEditingBand(null)} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 700, cursor: 'pointer' }}>Abbrechen</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 6000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ background: 'white', padding: '32px', borderRadius: '32px', maxWidth: '450px', width: '100%' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '20px' }}>Schüler hinzufügen</h2>
            <input 
              placeholder="Schüler suchen..." 
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', fontWeight: 700 }}
            />
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px' }}>
              {(() => {
                const currentMemberIds = editingBand?.band_members?.map((m: any) => m.user_id) || [];
                return allStudents.filter(s => 
                  !currentMemberIds.includes(s.id) &&
                  `${s.first_name} ${s.last_name}`.toLowerCase().includes(memberSearch.toLowerCase())
                ).map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '16px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={s.photo_url || '/avatar_ghost.jpg'} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                      <span style={{ fontWeight: 700 }}>{s.first_name} {s.last_name}</span>
                   </div>
                   <select 
                     onChange={(e) => handleAddMember(showAddMember, s.id, e.target.value)}
                     defaultValue=""
                     style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: 700, fontSize: '0.8rem' }}
                   >
                     <option value="" disabled>Instrument?</option>
                     {Object.keys(TEACHER_INSTRUMENT_ICONS).map(inst => <option key={inst} value={inst}>{inst}</option>)}
                   </select>
                </div>
                ));
              })()}
            </div>
            <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '20px', paddingTop: '20px' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' }}>Externen Schüler hinzufügen</h4>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  placeholder="Name" 
                  value={externalName}
                  onChange={e => setExternalName(e.target.value)}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', fontWeight: 700, fontSize: '0.85rem' }}
                />
                <select 
                  value={externalInstrument}
                  onChange={e => setExternalInstrument(e.target.value)}
                  style={{ padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', fontWeight: 700, fontSize: '0.85rem' }}
                >
                  {Object.keys(TEACHER_INSTRUMENT_ICONS).map(inst => <option key={inst} value={inst}>{inst}</option>)}
                </select>
                <button 
                  type="button"
                  onClick={() => handleAddMember(showAddMember!, null, externalInstrument, externalName)}
                  disabled={!externalName}
                  style={{ background: brandColor, color: 'white', border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', opacity: externalName ? 1 : 0.5 }}
                >
                  +
                </button>
              </div>
            </div>
            <button onClick={() => setShowAddMember(null)} style={{ width: '100%', marginTop: '20px', padding: '14px', borderRadius: '12px', border: 'none', background: '#f1f5f9', fontWeight: 700, cursor: 'pointer' }}>Abbrechen</button>
          </div>
        </div>
      )}
    </div>
  );
}

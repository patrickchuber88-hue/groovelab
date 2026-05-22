import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Monitor, Music, Award, Box, Plus, AlertCircle, User, Users, Star, TrendingUp, Shield, Zap, Play, Info, CheckCircle, Check, Search, Trash2, Bell, X, Clock, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { TeacherDetailModal } from './TeacherDetailModal';
import { StudentDetailModal } from './StudentDetailModal';
import { renderInstrumentIcon } from '../utils/instruments';

const TEACHER_INSTRUMENT_ICONS: Record<string, any> = { 
  Guitar: renderInstrumentIcon('Guitar'), 
  Bass: renderInstrumentIcon('Bass'), 
  Drums: renderInstrumentIcon('Drums'), 
  Keys: renderInstrumentIcon('Keys'), 
  Vocals: renderInstrumentIcon('Vocals') 
};
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

const getNormalizedRequiredInsts = (insts: Record<string, number> | null | undefined) => {
  const normalized: Record<string, number> = {};
  if (!insts) return normalized;
  Object.entries(insts).forEach(([key, val]) => {
    normalized[normalizeInstrument(key)] = val;
  });
  return normalized;
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
const AvatarImage = React.memo(({ src, style, className, user, userId, onClick }: { src: string | null, style?: React.CSSProperties, className?: string, user?: any, userId?: string, onClick?: () => void }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const displaySrc = useMemo(() => {
    if (hasError || !src) return '/avatar_ghost.jpg';
    return src;
  }, [src, hasError]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
      return;
    }
    const target = user || userId;
    if (target && (window as any).openUserProfile) {
      (window as any).openUserProfile(target);
    }
  };

  const hasAction = !!(onClick || user || userId);

  return (
    <div 
      onClick={hasAction ? handleClick : undefined}
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative', 
        background: '#f1f5f9', 
        overflow: 'hidden', 
        cursor: hasAction ? 'pointer' : 'default',
        ...style 
      }} 
      className={`avatar-image-wrapper ${hasAction ? 'hover-scale-mini' : ''} ${className || ''}`}
    >
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

const getStationColor = (name: string | null | undefined) => {
  if (!name) return '#64748b';
  const lowerName = name.toLowerCase();
  if (lowerName.includes('lehrer') || lowerName.includes('teacher')) return '#22c55e'; // Green
  const match = name.match(/\d+/);
  if (!match) return '#64748b';
  const num = parseInt(match[0]);
  if (num === 1 || num === 2) return '#ef4444'; // Red
  if (num === 3 || num === 4) return '#a855f7'; // Purple
  if (num === 5 || num === 6) return '#3b82f6'; // Blue
  if (num === 7 || num === 8) return '#eab308'; // Yellow
  return '#64748b';
};

const StationNode = React.memo(({ num, color, inst, sess, isMe, viewMode, onProfileSelect, onLogout, hasHelpRequest, customName }: { 
  num: number, color: string, inst: string, sess: any, isMe: boolean, viewMode: string, onProfileSelect: (u: any) => void, onLogout: (id: string) => void, hasHelpRequest?: boolean, customName?: string
}) => {
  const stationName = customName || sess?.stations?.name || `iPad ${num}`;
  const isActive = !!sess;
  
  const activeMins = useMemo(() => {
    if (!sess?.check_in_time) return 0;
    const mins = Math.floor((new Date().getTime() - new Date(sess.check_in_time).getTime()) / 60000);
    return Math.max(0, mins);
  }, [sess?.check_in_time]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', width: '100%' }}>
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
          width: '100%',
          background: 'white', 
          padding: '10px 12px', 
          minHeight: '150px', 
          aspectRatio: '1',
          display: 'flex', 
          flexDirection: 'column', 
          position: 'relative', 
          border: isActive ? `2.5px solid ${color}` : `1.5px solid ${color}40`,
          boxShadow: isActive ? `0 12px 30px rgba(0,0,0,0.03), 0 2px 8px ${color}10` : `0 4px 12px ${color}08`,
          borderRadius: '24px',
          cursor: isActive ? 'pointer' : 'default',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', width: '100%', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 900, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stationName}</span>
            {sess && <span style={{ color: color, fontWeight: 900, textTransform: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>• {activeMins}m</span>}
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
                padding: '2px 6px', 
                borderRadius: '6px', 
                cursor: 'pointer', 
                color: '#ef4444', 
                fontSize: '0.6rem', 
                fontWeight: 900, 
                textTransform: 'uppercase',
                transition: 'all 0.2s',
                flexShrink: 0,
                marginLeft: '4px'
              }}
              
              
            >
              Logout
            </button>
          )}
        </div>

        {sess ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, marginTop: '2px' }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '20px', 
              overflow: 'hidden', 
              border: `2px solid ${color}`, 
              boxShadow: `0 10px 28px ${color}25`, 
              flexShrink: 0, 
              marginBottom: '6px',
              transition: 'all 0.3s ease'
            }}>
              <AvatarImage src={sess.users?.photo_url} user={sess.users} />
            </div>
            <div style={{ textAlign: 'center', minWidth: 0, width: '100%' }}>
              <div style={{ 
                fontWeight: 600, 
                fontSize: '0.85rem', 
                color: '#1e293b', 
                lineHeight: 1.1, 
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {sess.users?.first_name}
              </div>
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
          const labelAbove = total > 1 && idx % 2 === 0;
          return (
            <div 
              key={c.id} 
              onClick={() => onProfileSelect(c.users)}
              style={{ 
                position: 'absolute',
                transform: `translate(${offset}px, ${verticalOffset}px)`,
                display: 'flex',
                flexDirection: labelAbove ? 'column-reverse' : 'column',
                alignItems: 'center',
                gap: '8px',
                zIndex: 10 - idx,
                cursor: 'pointer'
              }}
            >
              <div style={{ width: '84px', height: '84px', borderRadius: '50%', border: '4px solid white', boxShadow: '0 8px 20px rgba(0,0,0,0.15)', overflow: 'hidden', flexShrink: 0 }}>
                <AvatarImage src={c.users?.photo_url} user={c.users} />
              </div>
              <div style={{ background: 'white', padding: '5px 12px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', textAlign: 'center', minWidth: '90px' }}>
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
  onFoundBand?: (form: any, mySlot: any) => void;
  isSidebarCollapsed?: boolean;
  setIsSidebarCollapsed?: (collapsed: boolean) => void;
  onSidebarNotificationsChange?: (count: number) => void;
}

export function TeacherDashboard({ 
  userId, 
  onLogout, 
  locationMode = 'lab', 
  hideHeader = false, 
  viewMode = 'admin', 
  onTabChange, 
  onOpenBandProfile, 
  onFoundBand,
  isSidebarCollapsed: propsIsSidebarCollapsed,
  setIsSidebarCollapsed: propsSetIsSidebarCollapsed,
  onSidebarNotificationsChange
}: TeacherDashboardProps) {
  const [teacher, setTeacher] = useState<any>(null);
  const [stations, setStations] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [wallSongs, setWallSongs] = useState<any[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
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
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  
  const [lastSeenCounts, setLastSeenCounts] = useState(() => {
    try {
      const saved = localStorage.getItem('groovelab_last_seen_sidebar');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { help: 0, rehearsal: 0, matching: 0 };
  });

  const [localIsSidebarCollapsed, setLocalIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1200;
    }
    return false;
  });

  const isSidebarCollapsed = propsIsSidebarCollapsed !== undefined ? propsIsSidebarCollapsed : localIsSidebarCollapsed;
  const setIsSidebarCollapsed = propsSetIsSidebarCollapsed !== undefined ? propsSetIsSidebarCollapsed : setLocalIsSidebarCollapsed;

  const unreadHelpCount = Math.max(0, helpRequests.length - lastSeenCounts.help);
  const unreadRehearsalCount = Math.max(0, rehearsalSuggestions.length - lastSeenCounts.rehearsal);
  const unreadMatchingCount = Math.max(0, wallSongs.length - lastSeenCounts.matching);
  const sidebarNotificationsCount = unreadHelpCount + unreadRehearsalCount + unreadMatchingCount;

  useEffect(() => {
    if (!isSidebarCollapsed) {
      const currentCounts = {
        help: helpRequests.length,
        rehearsal: rehearsalSuggestions.length,
        matching: wallSongs.length
      };
      setLastSeenCounts(currentCounts);
      localStorage.setItem('groovelab_last_seen_sidebar', JSON.stringify(currentCounts));
    }
  }, [isSidebarCollapsed, helpRequests.length, rehearsalSuggestions.length, wallSongs.length]);

  useEffect(() => {
    if (onSidebarNotificationsChange) {
      onSidebarNotificationsChange(sidebarNotificationsCount);
    }
  }, [sidebarNotificationsCount, onSidebarNotificationsChange]);

  const [containerWidth, setContainerWidth] = useState(1000);
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);

  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const observerRef = useRef<ResizeObserver | null>(null);
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (node) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width || 1000);
        }
      });
      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);

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
    setFetchError(null);

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
        const { data: rData } = await supabase.from('rooms').select('*').eq('school_id', tData.school_id);
        setRooms(rData || []);
        if (rData && rData.length > 0 && !selectedRoomId) {
          const savedRoomId = localStorage.getItem('groovelab_teacher_selected_room_id');
          if (savedRoomId && rData.some(r => r.id === savedRoomId)) {
            setSelectedRoomId(savedRoomId);
          } else {
            setSelectedRoomId(rData[0].id);
          }
        }
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
        const hidePresence = sessionStorage.getItem('groovelab_teacher_hide_presence') === 'true';
        const isHomeMode = sessionStorage.getItem('groovelab_location_mode') === 'home';
        
        const activeCoaches = (allCoaches || []).filter(c => {
          if (c.is_observer) return false; // Hospitanten are never shown in Live Lab
          const isCurrentTeacher = c.id === userId && !hidePresence && !isHomeMode;
          const hasSession = trulyActive.some(s => s.user_id === c.id);
          return isCurrentTeacher || hasSession;
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
        const { data: bData } = await supabase.from('bands').select('*, band_members(*, users(*)), coach:users!coach_id(id, first_name, last_name, photo_url), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url, user_song_skills:user_song_skills!user_song_skills_user_id_fkey(id, song_id, instrument, progress_percent, is_pending_approval, is_stage_ready))))').eq('school_id', tData.school_id).order('name');
        setAllBands(bData || []);

        // 7. Students
        const { data: studData } = await supabase.from('users').select('*').eq('school_id', tData.school_id).eq('role', 'student').order('first_name');
        setAllStudents(studData || []);
        // 8. Help
        if (viewMode !== 'student') {
          const { data: helpData } = await supabase.from('help_requests').select('*, users(*)').eq('school_id', tData.school_id).eq('status', 'pending').order('created_at', { ascending: false });
          setHelpRequests(helpData || []);
        } else {
          setHelpRequests([]);
        }

        // Part B: Explicit Bands in Formation & Active (Fetched early to prevent TDZ errors in poolFormations)
        const { data: formingBands } = await supabase
          .from('bands')
          .select('*, band_members(*, profiles:users(id, first_name, last_name, photo_url, created_at, birth_date)), songs(*), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, last_name, photo_url, created_at, birth_date)))')
          .eq('school_id', tData.school_id)
          .in('status', ['forming', 'active']);

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

        // Construct schoolSkillsMap for matching checks
        const schoolSkillsMap: Record<string, any[]> = {};
        (wallData || []).forEach((s: any) => {
          (s.user_song_skills || []).forEach((skill: any) => {
            if (!skill.song_id) skill.song_id = s.id;
            if (!schoolSkillsMap[skill.user_id]) schoolSkillsMap[skill.user_id] = [];
            schoolSkillsMap[skill.user_id].push(skill);
          });
        });

        const poolFormations: any[] = [];
        (wallData || []).forEach(song => {
          // Pre-calculate all occupied user-instrument slots for this song across all its band projects (forming or active)
          const occupiedUserInstruments = new Set<string>();

          const projectsForThisSongMap = new Map<string, any>();
          
          // Collect band_songs from formingBands
          (formingBands || []).forEach((b: any) => {
            (b.band_songs || []).forEach((bs: any) => {
              if (bs.song_id === song.id && bs.band_id) {
                projectsForThisSongMap.set(b.id, {
                  ...bs,
                  bands: b,
                  band_song_slots: bs.band_song_slots || []
                });
              }
            });
          });

          // Also check forming bands that are currently founding on this song
          (formingBands || []).filter((b: any) => b.song_id === song.id).forEach((b: any) => {
            if (!projectsForThisSongMap.has(b.id)) {
              projectsForThisSongMap.set(b.id, {
                id: `forming_${b.id}`,
                band_id: b.id,
                status: 'forming',
                bands: b,
                band_song_slots: []
              });
            }
          });

          Array.from(projectsForThisSongMap.values()).forEach((bs: any) => {
            if (bs.status === 'mastered') return;
            const band = (formingBands || []).find((b: any) => b.id === bs.band_id) || bs.bands;
            if (!band || band.school_id !== tData.school_id) return;

            const slots = bs.band_song_slots || [];
            const membersList: any[] = [];
            const addedUserIds = new Set<string>();
            const addedSlotKeys = new Set<string>();

            // A. Add participants from slots (guests and suggester)
            slots.filter((sl: any) => sl.user_id).forEach((sl: any) => {
              const normalizedMemberInst = normalizeInstrument(sl.instrument);
              
              // Skip core band members in slots unless it's Vocals, so smart allocation handles them
              const isCoreMember = (band.band_members || []).some((bm: any) => bm.user_id === sl.user_id);
              if (isCoreMember && !normalizedMemberInst.includes('vocal') && !normalizedMemberInst.includes('gesang')) {
                return;
              }

              const slPart = sl.part_number || 1;
              const slotKey = `${sl.user_id}_${normalizedMemberInst}_${slPart}`;
              if (addedSlotKeys.has(slotKey)) return;
              addedSlotKeys.add(slotKey);
              addedUserIds.add(sl.user_id);
              
              occupiedUserInstruments.add(`${sl.user_id}:${normalizedMemberInst}`);
              membersList.push({ user_id: sl.user_id, instrument: normalizedMemberInst, part_number: slPart });
            });

            // B. Add core band members using the smart vacant slot allocation logic
            const requiredInsts = song.instrumentation || { 'E-Gitarre': 1, 'E-Bass': 1, 'E-Drums': 1, 'E-Piano': 1 };
            let instCount: Record<string, number> = {};
            membersList.forEach((m: any) => {
              instCount[m.instrument] = Math.max(instCount[m.instrument] || 0, m.part_number || 1);
            });

            (band.band_members || []).forEach((bm: any) => {
              if (addedUserIds.has(bm.user_id)) return;
              
              const normalizedMemberInst = normalizeInstrument(bm.instrument);
              const skills = schoolSkillsMap[bm.user_id] || [];

              // Determine which instrument this core member should fill for this song
              let targetInstrument = normalizedMemberInst;
              
              const isInstSlotFilled = (instName: string) => {
                const normTarget = normalizeInstrument(instName);
                const matchingKey = Object.keys(requiredInsts).find(k => normalizeInstrument(k) === normTarget);
                const countRequired = matchingKey ? requiredInsts[matchingKey] : 0;
                const countFilled = membersList.filter((m: any) => normalizeInstrument(m.instrument) === normTarget).length;
                return countFilled >= countRequired;
              };

              const coreInstRequired = Object.keys(requiredInsts).some(ri => normalizeInstrument(ri) === normalizedMemberInst);
              const coreInstFilled = isInstSlotFilled(bm.instrument);

              if (coreInstRequired && !coreInstFilled) {
                targetInstrument = normalizedMemberInst;
              } else {
                const alternativeInst = Object.keys(requiredInsts).find(ri => {
                  const normRi = normalizeInstrument(ri);
                  if (isInstSlotFilled(ri)) return false;
                  return skills.some((sk: any) => 
                    sk.song_id === song.id && 
                    normalizeInstrument(sk.instrument) === normRi && 
                    (sk.is_stage_ready || (sk.progress_percent || 0) >= 100)
                  );
                });
                if (alternativeInst) {
                  targetInstrument = normalizeInstrument(alternativeInst);
                }
              }

              addedUserIds.add(bm.user_id);
              occupiedUserInstruments.add(`${bm.user_id}:${targetInstrument}`);
              membersList.push({ user_id: bm.user_id, instrument: targetInstrument, part_number: (instCount[targetInstrument] || 0) + 1 });
            });
          });

          const instrumentation = song.instrumentation || { 'E-Gitarre': 1, 'E-Drums': 1, 'E-Bass': 1 };
          
          ['starter', 'original'].forEach(level => {
            const levelSkills = (song.user_song_skills || []).filter((s: any) => {
              const prof = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
              const isReady = (s.is_stage_ready || (s.progress_percent || 0) >= 100) && (s.difficulty_level || 'original') === level && prof?.school_id === tData.school_id;
              
              // Filter out if already in a band project for this song
              const isOccupied = occupiedUserInstruments.has(`${s.user_id}:${normalizeInstrument(s.instrument)}`);
              
              return isReady && !isOccupied;
            });

            if (levelSkills.length === 0) return;

            const songFormations: any[] = [];
            // Sort levelSkills: skills with a formation_group first, so they establish groups,
            // then free agents (formation_group: null) to merge into them.
            const sortedSkills = [...levelSkills].sort((a, b) => {
              const aHas = !!a.formation_group;
              const bHas = !!b.formation_group;
              if (aHas && !bHas) return -1;
              if (!aHas && bHas) return 1;
              return 0;
            });

            sortedSkills.forEach(skill => {
              const norm = normalizeInstrument(skill.instrument);
              // Find a group that:
              // 1. Matches the formation_group (if set)
              // 2. OR is an automatic group and doesn't have this instrument yet
              let target = songFormations.find(f => {
                if (skill.formation_group) return f.groupKey === skill.formation_group;
                
                // Prevent placing the same student on multiple instruments in a single formation (except Vocals)
                const isVocals = norm.toLowerCase().includes('vocal') || norm.toLowerCase().includes('gesang');
                const userAlreadyIn = f.members.some((m: any) => {
                  const mNorm = normalizeInstrument(m.instrument);
                  const mIsVocals = mNorm.toLowerCase().includes('vocal') || mNorm.toLowerCase().includes('gesang');
                  if (isVocals || mIsVocals) return false;
                  return m.user_id === skill.user_id;
                });
                if (userAlreadyIn) return false;

                // Merge into any group that doesn't have this instrument yet
                return !f.members.some((m: any) => normalizeInstrument(m.instrument) === norm);
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
                  const normTarget = normalizeInstrument(i);
                  const filledForInst = members.filter((s: any) => {
                    return normalizeInstrument(s.instrument) === normTarget;
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

              const isAlreadyFullId = groupKey.startsWith('pool_') || groupKey.startsWith('form_') || groupKey.startsWith('auto_') || groupKey.includes('-') || groupKey.length > 20;
              const formationId = isAlreadyFullId ? groupKey : `pool_${song.id}_${level}_${groupKey}`;

              poolFormations.push({
                id: formationId,
                song: song,
                members,
                openSlots: missingInstruments.length,
                missingInstruments,
                type: 'pool',
                level
              });
            });
          });
        });



        // Collect all open proposals where logged-in user is a band member (or all proposals in school for coaches)
        const userProposals: any[] = [];
        (formingBands || []).forEach(b => {
          if (viewMode === 'student') {
            const isUserBandMember = (b.band_members || []).some((m: any) => m.user_id === userId);
            if (!isUserBandMember) return;
          }
          
          (b.band_songs || []).forEach((bs: any) => {
            if (bs.status === 'proposal') {
              const song = bs.songs || b.songs;
              if (!song) return;

              const slots = bs.band_song_slots || [];
              const members: any[] = [];
              const addedUserIds = new Set<string>();
              const addedSlotKeys = new Set<string>();

              // 1. Add participants from slots (guests only – skip core members so smart allocation handles them)
              slots.filter((sl: any) => sl.user_id).forEach((sl: any) => {
                const normalizedMemberInst = normalizeInstrument(sl.instrument);
                
                // Skip core band members in slots (unless Vocals) – smart allocation (step 2) will place them correctly
                const isCoreMember = (b.band_members || []).some((bm: any) => bm.user_id === sl.user_id);
                if (isCoreMember && !normalizedMemberInst.toLowerCase().includes('vocal') && !normalizedMemberInst.toLowerCase().includes('gesang')) {
                  return;
                }

                const slPart = sl.part_number || 1;
                const slotKey = `${sl.user_id}_${normalizedMemberInst}_${slPart}`;
                
                if (addedSlotKeys.has(slotKey)) return;
                addedSlotKeys.add(slotKey);
                addedUserIds.add(sl.user_id);
                
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

              // 2. Add core band members who aren't in slots yet
              let instCount: Record<string, number> = {};
              members.forEach((m: any) => {
                instCount[m.instrument] = Math.max(instCount[m.instrument] || 0, m.part_number || 1);
              });

              (b.band_members || []).forEach((bm: any) => {
                if (addedUserIds.has(bm.user_id)) return;
                
                const prof = bm.profiles ? (Array.isArray(bm.profiles) ? bm.profiles[0] : bm.profiles) : null;
                if (prof) {
                  const normalizedMemberInst = normalizeInstrument(bm.instrument);
                  const skills = schoolSkillsMap[bm.user_id] || [];

                  // Determine which instrument this core member should fill for this song
                  let targetInstrument = normalizedMemberInst;
                  const requiredInsts = song.instrumentation || { 'E-Gitarre': 1, 'E-Bass': 1, 'E-Drums': 1, 'E-Piano': 1 };
                  
                  // Helper to check if a specific required instrument slot is already fully filled
                  const isInstSlotFilled = (instName: string) => {
                    const normTarget = normalizeInstrument(instName);
                    const matchingKey = Object.keys(requiredInsts).find(k => normalizeInstrument(k) === normTarget);
                    const countRequired = matchingKey ? requiredInsts[matchingKey] : 0;
                    const countFilled = members.filter((m: any) => normalizeInstrument(m.instrument) === normTarget).length;
                    return countFilled >= countRequired;
                  };

                  // If their core instrument is required by the song and not fully filled yet, use it
                  const coreInstRequired = Object.keys(requiredInsts).some(ri => normalizeInstrument(ri) === normalizedMemberInst);
                  const coreInstFilled = isInstSlotFilled(bm.instrument);

                  if (coreInstRequired && !coreInstFilled) {
                    targetInstrument = normalizedMemberInst;
                  } else {
                    // Otherwise, check if they have 100% mastered skills for any of the other required but empty/incomplete slots!
                    const alternativeInst = Object.keys(requiredInsts).find(ri => {
                      const normRi = normalizeInstrument(ri);
                      if (isInstSlotFilled(ri)) return false;
                      
                      // Check if they have 100% skill for this instrument
                      return skills.some((sk: any) => 
                        sk.song_id === song.id && 
                        normalizeInstrument(sk.instrument) === normRi && 
                        (sk.is_stage_ready || (sk.progress_percent || 0) >= 100)
                      );
                    });
                    
                    if (alternativeInst) {
                      targetInstrument = normalizeInstrument(alternativeInst);
                    }
                  }

                  addedUserIds.add(bm.user_id);
                  const nextPart = (instCount[targetInstrument] || 0) + 1;
                  instCount[targetInstrument] = nextPart;

                  const isMastered = skills.some((sk: any) => 
                    sk.song_id === song.id && 
                    normalizeInstrument(sk.instrument) === targetInstrument && 
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
                    instrument: targetInstrument,
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
          const isUserBandMember = (b.band_members || []).some((m: any) => m.user_id === userId);

          (b.band_songs || []).forEach((bs: any) => {
            if (bs.status === 'mastered' || bs.status === 'active') return;
            const songObj = bs.songs;
            if (!songObj) return;

            const slots = bs.band_song_slots || [];
            const members: any[] = [];
            const addedUserIds = new Set<string>();
            const addedSlotKeys = new Set<string>();

            // 1. Add participants from slots (guests only – skip core members so smart allocation handles them)
            slots.filter((sl: any) => sl.user_id).forEach((sl: any) => {
              const normalizedMemberInst = normalizeInstrument(sl.instrument);
              
              // Skip core band members in slots (unless Vocals) – smart allocation (step 2) will place them correctly
              const isCoreMember = (b.band_members || []).some((bm: any) => bm.user_id === sl.user_id);
              if (isCoreMember && !normalizedMemberInst.toLowerCase().includes('vocal') && !normalizedMemberInst.toLowerCase().includes('gesang')) {
                return;
              }

              const slPart = sl.part_number || 1;
              const slotKey = `${sl.user_id}_${normalizedMemberInst}_${slPart}`;
              
              if (addedSlotKeys.has(slotKey)) return;
              addedSlotKeys.add(slotKey);
              addedUserIds.add(sl.user_id);
              
              const prof = Array.isArray(sl.profiles) ? sl.profiles[0] : sl.profiles;
              const skills = schoolSkillsMap[sl.user_id] || [];
              const isMastered = skills.some((sk: any) => 
                sk.song_id === songObj.id && 
                normalizeInstrument(sk.instrument) === normalizedMemberInst && 
                (sk.part_number || 1) === slPart &&
                (sk.is_stage_ready || (sk.progress_percent || 0) >= 100)
              );

              members.push({
                user_id: sl.user_id,
                first_name: prof?.first_name || 'Musiker',
                photo_url: prof?.photo_url,
                instrument: normalizedMemberInst,
                part_number: slPart,
                isFromBand: true,
                isMastered
              });
            });

            // 2. Add core band members who aren't in slots yet
            let instCount: Record<string, number> = {};
            members.forEach((m: any) => {
              instCount[m.instrument] = Math.max(instCount[m.instrument] || 0, m.part_number || 1);
            });

            (b.band_members || []).forEach((bm: any) => {
              if (addedUserIds.has(bm.user_id)) return;
              
              const prof = bm.profiles ? (Array.isArray(bm.profiles) ? bm.profiles[0] : bm.profiles) : null;
              if (prof) {
                const normalizedMemberInst = normalizeInstrument(bm.instrument);
                const skills = schoolSkillsMap[bm.user_id] || [];

                // Determine which instrument this core member should fill for this song
                let targetInstrument = normalizedMemberInst;
                const requiredInsts = songObj.instrumentation || { 'E-Gitarre': 1, 'E-Bass': 1, 'E-Drums': 1, 'E-Piano': 1 };
                
                // Helper to check if a specific required instrument slot is already fully filled
                const isInstSlotFilled = (instName: string) => {
                  const normTarget = normalizeInstrument(instName);
                  const matchingKey = Object.keys(requiredInsts).find(k => normalizeInstrument(k) === normTarget);
                  const countRequired = matchingKey ? requiredInsts[matchingKey] : 0;
                  const countFilled = members.filter((m: any) => normalizeInstrument(m.instrument) === normTarget).length;
                  return countFilled >= countRequired;
                };

                // If their core instrument is required by the song and not fully filled yet, use it
                const coreInstRequired = Object.keys(requiredInsts).some(ri => normalizeInstrument(ri) === normalizedMemberInst);
                const coreInstFilled = isInstSlotFilled(bm.instrument);

                if (coreInstRequired && !coreInstFilled) {
                  targetInstrument = normalizedMemberInst;
                } else {
                  // Otherwise, check if they have 100% mastered skills for any of the other required but empty/incomplete slots!
                  const alternativeInst = Object.keys(requiredInsts).find(ri => {
                    const normRi = normalizeInstrument(ri);
                    if (isInstSlotFilled(ri)) return false;
                    
                    // Check if they have 100% skill for this instrument
                    return skills.some((sk: any) => 
                      sk.song_id === songObj.id && 
                      normalizeInstrument(sk.instrument) === normRi && 
                      (sk.is_stage_ready || (sk.progress_percent || 0) >= 100)
                    );
                  });
                  
                  if (alternativeInst) {
                    targetInstrument = normalizeInstrument(alternativeInst);
                  }
                }

                addedUserIds.add(bm.user_id);
                const nextPart = (instCount[targetInstrument] || 0) + 1;
                instCount[targetInstrument] = nextPart;

                const isMastered = skills.some((sk: any) => 
                  sk.song_id === songObj.id && 
                  normalizeInstrument(sk.instrument) === targetInstrument && 
                  (sk.part_number || 1) === nextPart &&
                  (sk.is_stage_ready || (sk.progress_percent || 0) >= 100)
                );

                members.push({
                  user_id: bm.user_id,
                  first_name: prof.first_name || 'Musiker',
                  photo_url: prof.photo_url,
                  instrument: targetInstrument,
                  part_number: nextPart,
                  isFromBand: true,
                  isMastered
                });
              }
            });

            const requiredInsts = songObj.instrumentation || { 'E-Gitarre': 1, 'E-Bass': 1, 'E-Drums': 1, 'E-Piano': 1 };
            const missingInstruments: string[] = [];
            const order = ['E-Gitarre', 'E-Drums', 'E-Piano', 'E-Bass'];
            
            order.forEach(targetInst => {
              const matchingKeys = Object.entries(requiredInsts).filter(([i, c]) => {
                const low = i.toLowerCase();
                const targetLow = targetInst.toLowerCase();
                return low.includes(targetLow.replace('e-', '')) || targetLow.includes(low.replace('e-', ''));
              });

              matchingKeys.forEach(([i, c]) => {
                const normTarget = normalizeInstrument(i);
                const filledCount = members.filter((m: any) => {
                  return normalizeInstrument(m.instrument) === normTarget;
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
              id: `band_${bs.id}`,
              song: songObj,
              members: members,
              openSlots: missingInstruments.length,
              missingInstruments,
              type: 'band',
              level: bs.difficulty_level || 'original'
            });
          });
        });

        // Combine and sort (Limit to 2 for the dashboard widget, prioritizing most complete. 
        // Completed band projects (openSlots === 0) disappear since they are already founded.
        // Completed pool formations (openSlots === 0) are shown so they can be founded!)
        const allMatching = [
          ...bandFormations.filter(f => f.openSlots > 0),
          ...poolFormations.filter(f => f.openSlots >= 0)
        ]
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
          const allMemberIds = [...new Set((bandsWithMembers || []).flatMap(b => (b.band_members || []).map((m: any) => m.user_id)))];
          
          if (allMemberIds.length > 0) {
            const { data: planning } = await supabase.from('lab_planning').select('*').in('user_id', allMemberIds);
            
            const suggestions = (bandsWithMembers || []).map(band => {
              const bMemberIds = [...new Set((band.band_members || []).map((m: any) => m.user_id))];
              const bPlanning = (planning || []).filter(p => bMemberIds.includes(p.user_id));
              if (!bPlanning.length) return null;

              const slotUsers: Record<string, Set<string>> = {};
              bPlanning.forEach(s => {
                const key = `${s.day}-${s.time}`;
                if (!slotUsers[key]) slotUsers[key] = new Set();
                slotUsers[key].add(s.user_id);
              });

              const counts: Record<string, number> = {};
              Object.entries(slotUsers).forEach(([key, usersSet]) => {
                counts[key] = usersSet.size;
              });

              const vals = Object.values(counts);
              const maxMatches = vals.length ? Math.max(...vals) : 0;
              if (maxMatches <= 1) return null;

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

              return { 
                bandId: band.id, 
                bandName: band.name, 
                day: bestDay, 
                start: bestStart, 
                end: formattedEnd, 
                count: maxMatches,
                totalMembers: bMemberIds.length 
              };
            }).filter(Boolean);
            setRehearsalSuggestions(suggestions);
          }
        }
      }
    } catch (err) {
      console.error('[Dashboard] Fetch error:', err);
      setFetchError(err instanceof Error ? err.message : String(err));
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
    try {
      const insertData: any = {
        band_id: bandId,
        user_id: uId,
        instrument: instrument,
        confetti_seen: true
      };
      if (extName) {
        insertData.external_name = extName;
      }

      let { error } = await supabase.from('band_members').insert(insertData);
      if (error && error.message.includes('external_name')) {
        if (!uId) {
          throw new Error("Der Server unterstützt keine externen Mitglieder. Bitte führen Sie die SQL-Migration aus.");
        }
        const fallbackData = { ...insertData };
        delete fallbackData.external_name;
        const { error: retryErr } = await supabase.from('band_members').insert(fallbackData);
        if (retryErr) throw retryErr;
      } else if (error) {
        throw error;
      }
      
      const { data: bandSongs } = await supabase.from('band_songs').select('id').eq('band_id', bandId);
      if (bandSongs && bandSongs.length > 0) {
         // Fetch existing slots to dynamically calculate non-conflicting part_number
         const songIds = bandSongs.map((bs: any) => bs.id);
         const { data: existingSlots } = await supabase
            .from('band_song_slots')
            .select('band_song_id, instrument, part_number')
            .in('band_song_id', songIds);

         const slotsToInsert = bandSongs.map((bs: any) => {
            const matchingSlots = (existingSlots || []).filter(
               (s: any) => s.band_song_id === bs.id && s.instrument === instrument
            );
            const maxPart = matchingSlots.reduce((max: number, s: any) => Math.max(max, s.part_number || 1), 0);
            const nextPart = maxPart + 1;

            const slotObj: any = {
               band_song_id: bs.id,
               user_id: uId,
               instrument: instrument,
               part_number: nextPart,
               status: 'joined'
            };
            if (extName) {
               slotObj.external_name = extName;
            }
            return slotObj;
         });

         let { error: slotErr } = await supabase.from('band_song_slots').insert(slotsToInsert);
         if (slotErr && slotErr.message.includes('external_name')) {
            if (!uId) {
               console.error("Failed to insert slots for external member:", slotErr);
            } else {
               const cleanedSlots = slotsToInsert.map((s: any) => {
                  const copy = { ...s };
                  delete copy.external_name;
                  return copy;
               });
               const { error: retrySlotErr } = await supabase.from('band_song_slots').insert(cleanedSlots);
               if (retrySlotErr) throw retrySlotErr;
            }
         } else if (slotErr) {
            throw slotErr;
         }
      }
      
      setShowAddMember(null);
      fetchData();
    } catch (err: any) {
      alert('Fehler beim Hinzufügen: ' + err.message);
    }
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

  const school = teacher.schools;
  let trialDaysLeft = null;
  if (school?.is_trial && school?.trial_ends_at) {
    const end = new Date(school.trial_ends_at).getTime();
    const now = new Date().getTime();
    trialDaysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  }

  return (
    <div style={{ padding: hideHeader ? '0' : '20px 40px', width: '100%', maxWidth: '1800px', margin: '0 auto', background: hideHeader ? 'transparent' : '#f8fafc', minHeight: '100vh' }}>
      
      {/* Trial Banner */}
      {viewMode !== 'student' && school?.is_trial && trialDaysLeft !== null && (
        <div style={{
          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
          color: '#fffbeb',
          padding: '12px 24px',
          borderRadius: '16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          boxShadow: '0 4px 15px rgba(245, 158, 11, 0.2)'
        }}>
          <AlertCircle size={20} fill="#fffbeb" color="#f59e0b" />
          <strong style={{ fontSize: '0.95rem', fontWeight: 800 }}>
            {trialDaysLeft > 0 
              ? `Diese Schule befindet sich in der Probezeit. Sie endet in ${trialDaysLeft} Tag(en).`
              : `Die Probezeit ist abgelaufen. Der Login für Schüler ist derzeit nicht möglich.`}
          </strong>
        </div>
      )}
      {selectedCoachProfile && <TeacherDetailModal teacher={selectedCoachProfile} onClose={() => setSelectedCoachProfile(null)} />}
      {selectedStudentProfile && (
        <StudentDetailModal 
          student={selectedStudentProfile} 
          onClose={() => setSelectedStudentProfile(null)} 
          onOpenBandProfile={(band) => {
            setEditingBand(band);
            setSelectedStudentProfile(null);
          }}
        />
      )}
      
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
             {activeTab === 'live' && (
               <button
                 onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                 style={{
                   background: 'white',
                   border: '1.5px solid #e2e8f0',
                   padding: '8px 16px',
                   borderRadius: '12px',
                   fontSize: '0.85rem',
                   fontWeight: 800,
                   color: '#475569',
                   cursor: 'pointer',
                   display: 'flex',
                   alignItems: 'center',
                   gap: '8px',
                   boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                   transition: 'all 0.15s',
                   marginRight: '8px'
                 }}
                 className="hover-scale"
               >
                 {isSidebarCollapsed ? (
                   <>
                     <ChevronLeft size={16} /> Sidebar einblenden
                     {sidebarNotificationsCount > 0 && (
                       <span style={{
                         background: '#ef4444',
                         color: 'white',
                         fontSize: '0.7rem',
                         fontWeight: 900,
                         borderRadius: '10px',
                         padding: '2px 6px',
                         minWidth: '16px',
                         height: '16px',
                         display: 'flex',
                         alignItems: 'center',
                         justifyContent: 'center',
                         boxShadow: '0 2px 8px rgba(239, 68, 68, 0.35)',
                         animation: 'pulse 1.5s infinite',
                         marginLeft: '4px'
                       }}>
                         {sidebarNotificationsCount}
                       </span>
                     )}
                   </>
                 ) : (
                   <>
                     Sidebar ausblenden <ChevronRight size={16} />
                   </>
                 )}
               </button>
             )}
             <div style={{ background: '#f0fdf4', padding: '8px 16px', borderRadius: '100px', border: '1px solid #dcfce7', color: '#166534', fontSize: '0.85rem', fontWeight: 800 }}>{activeSessions.length} im Lab</div>
             {viewMode === 'admin' && onLogout && <button onClick={onLogout} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '12px', fontWeight: 700, color: '#ef4444', cursor: 'pointer' }}>Zentrale schließen</button>}
          </div>
        </header>
      )}
      {activeTab === 'live' ? (
        <div className={`live-lab-grid ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          {(() => {
            const activeRoom = rooms.find(r => r.id === selectedRoomId);
            const roomStations = stations.filter(s => s.room_id === selectedRoomId);
            const hasCustomLayout = activeRoom && 
              activeRoom.room_width && 
              activeRoom.room_height && 
              roomStations.some(s => s.pos_x !== null && s.pos_y !== null);

            if (hasCustomLayout) {
              // Account for the parent dashboard header height
              const parentHeaderHeight = viewMode === 'student' ? 80 : 90;
              const verticalOffset = parentHeaderHeight + (rooms.length > 1 ? 54 : 0);
              const maxH = Math.max(300, windowHeight - verticalOffset - 24);

              // 1. Calculate fitting scale for all custom rooms to find the minimum scale (largest layout space required)
              // This ensures that the scale (and thus iPad card size) is completely uniform across all custom layout rooms,
              // while guaranteeing that even the largest room fits completely within the screen boundaries without overflow.
              let unifiedScale = 1.0;
              const customLayoutScales = rooms.map(r => {
                const rStations = stations.filter(s => s.room_id === r.id);
                const rHasLayout = r.room_width && r.room_height && rStations.some(s => s.pos_x !== null && s.pos_y !== null);
                if (!rHasLayout) return null;

                const aspect = r.room_width / r.room_height;
                const minX = Math.min(...rStations.map(s => {
                  const x = (s.pos_x !== null ? s.pos_x : 50) * 10;
                  return x - 90;
                }));
                const maxX = Math.max(...rStations.map(s => {
                  const x = (s.pos_x !== null ? s.pos_x : 50) * 10;
                  return x + 90;
                }));
                const minY = Math.min(...rStations.map(s => {
                  const y = (s.pos_y !== null ? s.pos_y : 50) * (1000 / aspect) / 100;
                  return y - 110; // Safe top padding to prevent label clipping
                }));
                const maxY = Math.max(...rStations.map(s => {
                  const y = (s.pos_y !== null ? s.pos_y : 50) * (1000 / aspect) / 100;
                  return y + 110; // Safe bottom padding to prevent card shadow/border clipping
                }));

                const bW = Math.max(100, maxX - minX);
                const bH = Math.max(100, maxY - minY);
                return Math.min(containerWidth / bW, maxH / bH);
              }).filter((s): s is number => s !== null);

              if (customLayoutScales.length > 0) {
                unifiedScale = Math.min(...customLayoutScales);
              }

              const rawRoomAspectRatio = (activeRoom && activeRoom.room_width && activeRoom.room_height)
                ? activeRoom.room_width / activeRoom.room_height
                : 1.0;

              // Calculate bounding box of all nodes in reference coordinates (1000px width reference) for active room
              const minBoundX = Math.min(...roomStations.map(s => {
                const x = (s.pos_x !== null ? s.pos_x : 50) * 10;
                return x - 90;
              }));
              const maxBoundX = Math.max(...roomStations.map(s => {
                const x = (s.pos_x !== null ? s.pos_x : 50) * 10;
                return x + 90;
              }));
              const minBoundY = Math.min(...roomStations.map(s => {
                const y = (s.pos_y !== null ? s.pos_y : 50) * (1000 / rawRoomAspectRatio) / 100;
                return y - 110;
              }));
              const maxBoundY = Math.max(...roomStations.map(s => {
                const y = (s.pos_y !== null ? s.pos_y : 50) * (1000 / rawRoomAspectRatio) / 100;
                return y + 110;
              }));

              const boundWidth = Math.max(100, maxBoundX - minBoundX);
              const boundHeight = Math.max(100, maxBoundY - minBoundY);

              // Use the unified scale to keep elements exactly the same size across all custom layout rooms
              const scale = unifiedScale;

              return (
                <div 
                  ref={containerRef}
                  style={{ display: 'flex', flexDirection: 'column', gap: rooms.length > 1 ? '16px' : '0px', maxWidth: 'none', width: '100%', alignItems: 'center' }}
                >
                  {/* Toolbar Row */}
                  {rooms.length > 1 && (
                    <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '6px', borderRadius: '16px', alignSelf: 'flex-start', marginBottom: '8px' }}>
                      {rooms.map(room => {
                        const isSelected = room.id === selectedRoomId;
                        return (
                          <button
                            key={room.id}
                            onClick={() => {
                              setSelectedRoomId(room.id);
                              localStorage.setItem('groovelab_teacher_selected_room_id', room.id);
                            }}
                            style={{
                              border: 'none',
                              background: isSelected ? 'white' : 'transparent',
                              color: isSelected ? '#1e293b' : '#64748b',
                              padding: '8px 16px',
                              borderRadius: '12px',
                              fontSize: '0.85rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              boxShadow: isSelected ? '0 4px 10px rgba(0,0,0,0.05)' : 'none',
                              transition: 'all 0.2s'
                            }}
                            className="hover-scale-mini"
                          >
                            {room.name}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Scaled room blueprint to fit parent width and height without scrolling or overlaps */}
                  <div 
                    style={{ 
                      width: `${boundWidth * scale}px`,
                      height: `${boundHeight * scale}px`,
                      position: 'relative', 
                      overflow: 'hidden',
                      margin: '0 auto'
                    }}
                  >
                    {/* Visual Blueprint Canvas */}
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: `${boundWidth}px`,
                      height: `${boundHeight}px`,
                      transform: `scale(${scale})`,
                      transformOrigin: 'top left',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '0px',
                      boxShadow: 'none',
                      overflow: 'visible'
                    }}>

                      {roomStations.map(station => {
                        const sName = station.name || '';
                        const isTeacher = sName.toLowerCase().includes('lehrer') || sName.toLowerCase().includes('teacher');
                        const instColor = station.color && station.color !== '#e5e7eb' && station.color !== '#e2e8f0'
                          ? station.color
                          : getStationColor(sName);

                        // Calculate raw center coordinates in reference space
                        const x = (station.pos_x !== null ? station.pos_x : 50) * 10;
                        const y = (station.pos_y !== null ? station.pos_y : 50) * (1000 / rawRoomAspectRatio) / 100;

                        // Align center coordinates relative to the bounding box
                        const alignedX = x - minBoundX;
                        const alignedY = y - minBoundY;

                        if (isTeacher) {
                          return (
                            <div 
                              key={station.id} 
                              style={{
                                position: 'absolute',
                                left: `${alignedX}px`,
                                top: `${alignedY}px`,
                                transform: 'translate(-50%, -50%)',
                                zIndex: 100
                              }}
                            >
                              <CoachesNode coaches={coaches} onProfileSelect={setSelectedCoachProfile} />
                            </div>
                          );
                        }

                        const sess = activeSessions.find(se => se.station_id === station.id);
                        const num = parseInt(sName.match(/\d+/)?.[0] || '1');

                        return (
                          <div 
                            key={station.id} 
                            style={{
                              position: 'absolute',
                              left: `${alignedX}px`,
                              top: `${alignedY}px`,
                              transform: 'translate(-50%, -50%)',
                              width: '180px',
                              zIndex: 10
                            }}
                          >
                            <StationNode
                              num={num}
                              customName={station.name}
                              color={instColor}
                              inst={station.instrument || 'Tablet'}
                              sess={sess}
                              isMe={sess?.user_id === userId}
                              viewMode={viewMode}
                              onProfileSelect={setSelectedStudentProfile}
                              onLogout={handleLogoutStudent}
                              hasHelpRequest={helpRequests.some(r => r.station_id === station.id)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            // Fallback grid layout if no custom layout coordinates set
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: rooms.length > 1 ? '16px' : '0px', flex: 1 }}>
                {/* Room Switcher */}
                {rooms.length > 1 && (
                  <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '6px', borderRadius: '16px', alignSelf: 'flex-start', marginBottom: '8px' }}>
                    {rooms.map(room => {
                      const isSelected = room.id === selectedRoomId;
                      return (
                        <button
                          key={room.id}
                          onClick={() => {
                            setSelectedRoomId(room.id);
                            localStorage.setItem('groovelab_teacher_selected_room_id', room.id);
                          }}
                          style={{
                            border: 'none',
                            background: isSelected ? 'white' : 'transparent',
                            color: isSelected ? '#1e293b' : '#64748b',
                            padding: '8px 16px',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            boxShadow: isSelected ? '0 4px 10px rgba(0,0,0,0.05)' : 'none',
                            transition: 'all 0.2s'
                          }}
                        >
                          {room.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                {/* Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '24px', background: '#ffffff', padding: '24px', borderRadius: '32px', border: '1px solid #e2e8f0' }}>
                  {/* Coaches Node */}
                  <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                    <CoachesNode coaches={coaches} onProfileSelect={setSelectedCoachProfile} />
                  </div>
                  {roomStations.filter(s => {
                    const sName = s.name || '';
                    return !(sName.toLowerCase().includes('lehrer') || sName.toLowerCase().includes('teacher'));
                  }).map(station => {
                    const sess = activeSessions.find(se => se.station_id === station.id);
                    const sName = station.name || '';
                    const num = parseInt(sName.match(/\d+/)?.[0] || '1');
                    const instColor = station.color && station.color !== '#e5e7eb' && station.color !== '#e2e8f0'
                      ? station.color
                      : getStationColor(sName);

                    return (
                      <div key={station.id}>
                        <StationNode
                          num={num}
                          customName={station.name}
                          color={instColor}
                          inst={station.instrument || 'Tablet'}
                          sess={sess}
                          isMe={sess?.user_id === userId}
                          viewMode={viewMode}
                          onProfileSelect={setSelectedStudentProfile}
                          onLogout={handleLogoutStudent}
                          hasHelpRequest={helpRequests.some(r => r.station_id === station.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Backdrop for mobile overlay sidebar */}
          {!isSidebarCollapsed && (
            <div 
              className="sidebar-backdrop"
              onClick={() => setIsSidebarCollapsed(true)}
            />
          )}

          <aside style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '24px',
            width: isSidebarCollapsed ? '0px' : '340px',
            opacity: isSidebarCollapsed ? 0 : 1,
            transform: isSidebarCollapsed ? 'translateX(20px)' : 'translateX(0)',
            pointerEvents: isSidebarCollapsed ? 'none' : 'auto',
            overflow: 'hidden',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            {/* Mobile Header (Close Button) */}
            <div className="mobile-sidebar-header" style={{
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '16px'
            }}>
              <span style={{ fontWeight: 900, fontSize: '1rem', color: '#1e293b', letterSpacing: '-0.02em' }}>Zusatz-Infos</span>
              <button 
                onClick={() => setIsSidebarCollapsed(true)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: 0
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Help Requests Section */}
            {viewMode !== 'student' && helpRequests.length > 0 && (
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
                          <AvatarImage src={reqUser?.photo_url} user={reqUser} />
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

            {/* Bandprobe Vorschläge Widget */}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                          fontSize: '0.62rem', 
                          fontWeight: 950, 
                          color: s.count === (s.totalMembers || s.count) ? '#15803d' : '#a16207',
                          background: s.count === (s.totalMembers || s.count) ? '#dcfce7' : '#fef9c3',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          display: 'inline-block'
                        }}>
                          {s.count === (s.totalMembers || s.count) ? '🔥 100%' : `👥 ${s.count}/${s.totalMembers || s.count}`}
                        </span>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap' }}>
                          {s.day.slice(0, 2)} {s.start}-{s.end}
                        </div>
                      </div>
                    </div>
                  ))}
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
                         return renderInstrumentIcon(inst);
                       };

                       return (
                          <div key={form.id} 
                            onClick={() => {
                              if (viewMode === 'student' && onTabChange) {
                                onTabChange('matching');
                              }
                            }}
                            style={{ 
                              background: 'white', 
                              padding: '20px', 
                              borderRadius: '24px', 
                              boxShadow: '0 4px 15px rgba(180, 83, 9, 0.02)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '16px',
                              position: 'relative',
                              border: '1px solid rgba(254, 243, 199, 0.4)',
                              cursor: viewMode === 'student' ? 'pointer' : 'default',
                              transition: 'all 0.2s ease-in-out'
                            }}
                            
                            
                          >
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
                                  const normM = normalizeInstrument(m.instrument);
                                  const normTarget = normalizeInstrument(inst);
                                  const mPart = m.part_number || 1;
                                  return normM === normTarget && mPart === part;
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

                            {form.missingInstruments.length > 0 ? (
                              <div style={{ 
                                fontSize: '0.75rem', 
                                fontWeight: 1000, 
                                color: '#eab308', 
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em'
                              }}>
                                GESUCHT: {form.missingInstruments.join(', ').toUpperCase()}
                              </div>
                            ) : (
                             (() => {
                               const mySlot = viewMode === 'student' && form.members?.find((m: any) => m.user_id === userId);
                               if (mySlot) {
                                 return (
                                   <button
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       if (onFoundBand) {
                                         onFoundBand(form, mySlot);
                                       }
                                     }}
                                     className="hero-cta-artistic"
                                     style={{
                                       width: '100%',
                                       background: 'linear-gradient(135deg, #10b981, #059669)',
                                       border: 'none',
                                       padding: '12px 18px',
                                       borderRadius: '14px',
                                       fontSize: '0.85rem',
                                       fontWeight: 900,
                                       color: 'white',
                                       cursor: 'pointer',
                                       display: 'flex',
                                       alignItems: 'center',
                                       justifyContent: 'center',
                                       gap: '6px',
                                       boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                                       transition: 'all 0.2s',
                                       marginTop: '8px'
                                     }}
                                   >
                                     <Zap size={14} fill="white" /> JETZT BAND GRÜNDEN 🚀
                                   </button>
                                 );
                               }
                               return (
                                 <div style={{ 
                                   fontSize: '0.75rem', 
                                   fontWeight: 1000, 
                                   color: '#166534', 
                                   textTransform: 'uppercase',
                                   letterSpacing: '0.08em',
                                   display: 'flex',
                                   alignItems: 'center',
                                   gap: '6px'
                                 }}>
                                   <span>✨</span> BEREIT FÜR BAND-GRÜNDUNG! 🎸
                                 </div>
                               );
                             })()
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
            {unreadShouts.length > 0 && (
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
                            <AvatarImage src={sub.users?.photo_url} user={sub.users} />
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

            {/* Band-Repertoire Planer Widget (Dark-themed purple to match the song card!) */}
            {openProposals.length > 0 && (
              <div 
                className="glass-panel card hover-scale" 
                onClick={() => setActiveTab('proposals')}
                style={{ 
                  padding: '24px', 
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #0f0728 100%)', 
                  border: '1px solid rgba(165, 180, 252, 0.15)',
                  borderRadius: '32px',
                  boxShadow: '0 15px 35px rgba(0, 0, 0, 0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ 
                    background: 'rgba(165, 180, 252, 0.05)', 
                    color: '#a5b4fc', 
                    padding: '12px', 
                    borderRadius: '16px',
                    border: '1px solid rgba(165, 180, 252, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Music size={22} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>
                      Band-Repertoire Planer
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ffffff' }}>
                        {openProposals.length > 0 ? (
                          `${openProposals.length} ${openProposals.length === 1 ? 'offener Song' : 'offene Songs'}`
                        ) : (
                          'Keine offenen Songs (Alles aktuell!)'
                        )}
                      </span>
                    </div>
                  </div>
                  <div style={{ 
                    color: '#a5b4fc', 
                    fontWeight: 900, 
                    fontSize: '0.7rem', 
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    background: 'rgba(165, 180, 252, 0.1)', 
                    padding: '8px 16px', 
                    borderRadius: '12px',
                    border: '1px solid rgba(165, 180, 252, 0.15)',
                    transition: 'all 0.2s'
                  }}>
                    Ansehen →
                  </div>
                </div>
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
                              return renderInstrumentIcon(inst);
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
                       <AvatarImage src={sub.users?.photo_url} user={sub.users} />
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
                           {sub.instrument}{sub.part_number && sub.part_number > 1 ? ` ${sub.part_number}` : ''}
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

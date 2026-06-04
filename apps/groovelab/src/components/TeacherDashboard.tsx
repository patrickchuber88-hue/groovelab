import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Monitor, Music, Award, Box, Plus, AlertCircle, AlertTriangle, User, Users, Star, TrendingUp, Shield, Zap, Play, Info, CheckCircle, Check, Search, Trash2, Bell, X, Clock, ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, LayoutDashboard, LogOut, Flame, GraduationCap, UserPlus, Edit3, Calendar, Activity, CheckSquare, Mail, Copy, Sparkles } from 'lucide-react';
import { TeacherDetailModal } from './TeacherDetailModal';
import { StudentDetailModal } from './StudentDetailModal';
import { MeisterwerkDocumentationModal } from './MeisterwerkDocumentationModal';
import { renderInstrumentIcon } from '../utils/instruments';

const cleanRoomName = (name: string | null | undefined): string => {
  if (!name) return 'Unbenannter Raum';
  return name.replace(/^#\d+\s*[-:]*\s*/, '').trim();
};


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

const getInstrumentAvatarUrl = (instrument: string | null | undefined): string => {
  if (!instrument) return '/avatars/gitarre_avatar_new.png';
  const inst = instrument.toLowerCase().trim();
  if (inst.includes('e-gitarre')) return '/avatars/egitarre_avatar.png';
  if (inst.includes('guitar') || inst.includes('gitarre')) return '/avatars/gitarre_avatar_new.png';
  if (inst.includes('e-bass')) return '/avatars/ebass_avatar.png';
  if (inst.includes('kontrabass') || inst.includes('double bass')) return '/avatars/kontrabass_avatar.png';
  if (inst.includes('bass')) return '/avatars/bass_avatar.png';
  if (inst.includes('drum') || inst.includes('schlagzeug')) return '/avatars/schlagzeug_avatar.png';
  if (inst.includes('piano') || inst.includes('keys') || inst.includes('klavier') || inst.includes('keyboard')) return '/avatars/klavier_avatar_new.png';
  if (inst.includes('vocal') || inst.includes('gesang') || inst.includes('stimme') || inst.includes('singer')) return '/avatars/gesang_avatar.png';
  if (inst.includes('trompete') || inst.includes('trumpet')) return '/avatars/trompete_avatar_new.png';
  if (inst.includes('posaune') || inst.includes('trombone')) return '/avatars/posaune_avatar.png';
  if (inst.includes('horn')) return '/avatars/horn_avatar_new.png';
  if (inst.includes('cello')) return '/avatars/cello_avatar_new.png';
  if (inst.includes('geige') || inst.includes('violin') || inst.includes('violine')) return '/avatars/violine_avatar_new.png';
  if (inst.includes('klarinette') || inst.includes('clarinet')) return '/avatars/klarinette_avatar_new.png';
  if (inst.includes('querflöte') || inst.includes('flute')) return '/avatars/querfloete_avatar.png';
  if (inst.includes('saxofon') || inst.includes('saxophone') || inst.includes('sax')) return '/avatars/saxophon_avatar_new.png';
  if (inst.includes('blockflöte') || inst.includes('recorder') || inst.includes('blockfloete')) return '/avatars/blockfloete_avatar.png';
  if (inst.includes('bariton') || inst.includes('baritone')) return '/avatars/bariton_avatar.png';
  if (inst.includes('oboe')) return '/avatars/oboe_avatar.png';
  return '/avatars/gitarre_avatar_new.png';
};

const getDefaultMusicianAvatarUrl = (instrument: string | null | undefined, role: string | null | undefined): string => {
  const isTeacher = (role || '').toLowerCase() === 'teacher' || (role || '').toLowerCase() === 'admin';
  if (isTeacher) return '/avatar_teacher_male.jpg';
  
  if (!instrument) return '/avatars/student_eguitar_1.png';
  const inst = instrument.toLowerCase().trim();
  if (inst.includes('guitar') || inst.includes('gitarre')) return '/avatars/student_boy_black_guitar.png';
  if (inst.includes('bass')) return '/avatars/student_boy_black_bass.png';
  if (inst.includes('drum') || inst.includes('schlagzeug')) return '/avatars/student_boy_black_drums.png';
  if (inst.includes('piano') || inst.includes('keys') || inst.includes('klavier') || inst.includes('keyboard')) return '/avatars/student_boy_black_piano.png';
  if (inst.includes('vocal') || inst.includes('gesang') || inst.includes('stimme') || inst.includes('singer')) return '/avatars/student_boy_red_vocals.png';
  return '/avatars/student_eguitar_1.png';
};

// --- ANTI-FLICKER AVATAR SYSTEM ---
const AvatarImage = React.memo(({ src, style, className, user, userId, onClick, activePlatform }: { src: string | null, style?: React.CSSProperties, className?: string, user?: any, userId?: string, onClick?: () => void, activePlatform?: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [resolvedInstrument, setResolvedInstrument] = useState<string | null>(user?.instrument || null);

  useEffect(() => {
    if (user && user.role === 'student' && (!user.instrument || user.instrument === 'Allgemein') && user.teacher_id) {
      supabase
        .from('users')
        .select('instrument')
        .eq('id', user.teacher_id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.instrument) {
            setResolvedInstrument(data.instrument);
          }
        });
    } else {
      setResolvedInstrument(user?.instrument || null);
    }
  }, [user]);

  const displaySrc = useMemo(() => {
    const activePlat = activePlatform || (typeof window !== 'undefined' ? localStorage.getItem('groovelab_active_platform') : 'groovelab');
    const targetUser = user;
    
    if (activePlat === 'campus') {
      if (targetUser && (resolvedInstrument || targetUser.role === 'student' || targetUser.role === 'teacher' || targetUser.role === 'admin')) {
        return getInstrumentAvatarUrl(resolvedInstrument);
      }
      if (src && !src.includes('_avatar.png') && !src.includes('avatar_ghost')) {
        return '/avatars/gitarre_avatar_new.png';
      }
    } else {
      // GrooveLab rules: strictly block instrument avatars and fall back to musician avatars
      const isInstrumentAvatar = src && (
        src.includes('avatar.png') || 
        src.includes('guitar_avatar') || 
        src.includes('gitarre_avatar_new') || 
        src.includes('ebass_avatar') || 
        src.includes('egitarre_avatar') || 
        src.includes('kontrabass_avatar') || 
        src.includes('bass_avatar') || 
        src.includes('drums_avatar') || 
        src.includes('schlagzeug_avatar') || 
        src.includes('piano_avatar') || 
        src.includes('klavier_avatar_new') || 
        src.includes('vocals_avatar') || 
        src.includes('gesang_avatar') || 
        src.includes('trumpet_avatar') || 
        src.includes('trompete_avatar_new') || 
        src.includes('trombone_avatar') || 
        src.includes('posaune_avatar') || 
        src.includes('horn_avatar') || 
        src.includes('horn_avatar_new') || 
        src.includes('cello_avatar') || 
        src.includes('cello_avatar_new') || 
        src.includes('violin_avatar') || 
        src.includes('violine_avatar_new') || 
        src.includes('clarinet_avatar') || 
        src.includes('klarinette_avatar_new') || 
        src.includes('flute_avatar') || 
        src.includes('querfloete_avatar') || 
        src.includes('saxophone_avatar') || 
        src.includes('saxophon_avatar_new') || 
        src.includes('blockfloete_avatar') || 
        src.includes('bariton_avatar') || 
        src.includes('oboe_avatar')
      );
      if (!src || isInstrumentAvatar || src === '/avatar_ghost.jpg') {
        // Fall back to student/teacher musician avatar
        return getDefaultMusicianAvatarUrl(resolvedInstrument, targetUser?.role);
      }
    }
    if (hasError || !src) return '/avatar_ghost.jpg';
    return src;
  }, [src, hasError, user, resolvedInstrument, activePlatform]);

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

interface CompressedCoordsResult {
  stations: Array<{
    id: string;
    x: number;
    y: number;
    cx: number;
    cy: number;
    rawStation: any;
  }>;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  F: number;
}

const getCompressedRoomCoordinates = (rStations: any[], aspect: number): CompressedCoordsResult => {
  if (rStations.length === 0) {
    return {
      stations: [],
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      F: 1.0
    };
  }

  // 1. Calculate raw coordinates in reference space (width reference 1000px)
  const rawCoords = rStations.map(s => {
    const x = (s.pos_x !== null ? s.pos_x : 50) * 10;
    const y = (s.pos_y !== null ? s.pos_y : 50) * (1000 / aspect) / 100;
    return { id: s.id, x, y, rawStation: s };
  });

  if (rawCoords.length <= 1) {
    const x = rawCoords[0]?.x || 500;
    const y = rawCoords[0]?.y || (500 / aspect);
    return {
      stations: rawCoords.map(c => ({ ...c, cx: c.x, cy: c.y })),
      minX: x - 90,
      maxX: x + 90,
      minY: y - 110,
      maxY: y + 110,
      F: 1.0
    };
  }

  // 2. Find center of the bounding box of raw station centers
  const xs = rawCoords.map(c => c.x);
  const ys = rawCoords.map(c => c.y);
  const minRawX = Math.min(...xs);
  const maxRawX = Math.max(...xs);
  const minRawY = Math.min(...ys);
  const maxRawY = Math.max(...ys);

  const centerX = (minRawX + maxRawX) / 2;
  const centerY = (minRawY + maxRawY) / 2;

  // 3. Compute F_min to prevent overlaps
  let F_min = 0.0;
  for (let i = 0; i < rawCoords.length; i++) {
    for (let j = i + 1; j < rawCoords.length; j++) {
      const dx = Math.abs(rawCoords[i].x - rawCoords[j].x);
      const dy = Math.abs(rawCoords[i].y - rawCoords[j].y);

      let pairF = 1.0;
      if (dx === 0 && dy === 0) {
        pairF = 1.0;
      } else if (dx === 0) {
        pairF = 205 / dy;
      } else if (dy === 0) {
        pairF = 185 / dx;
      } else {
        pairF = Math.min(185 / dx, 205 / dy);
      }

      if (pairF > F_min) {
        F_min = pairF;
      }
    }
  }

  // Limit compression factor to be between 0.68 and 1.5
  const F = Math.max(0.68, Math.min(1.5, F_min));

  // 4. Calculate compressed coordinates
  const compressedStations = rawCoords.map(c => {
    const cx = centerX + (c.x - centerX) * F;
    const cy = centerY + (c.y - centerY) * F;
    return {
      ...c,
      cx,
      cy
    };
  });

  // 5. Calculate new bounding box limits based on compressed coordinates
  const minX = Math.min(...compressedStations.map(c => c.cx - 90));
  const maxX = Math.max(...compressedStations.map(c => c.cx + 90));
  const minY = Math.min(...compressedStations.map(c => c.cy - 110));
  const maxY = Math.max(...compressedStations.map(c => c.cy + 110));

  return {
    stations: compressedStations,
    minX,
    maxX,
    minY,
    maxY,
    F
  };
};

const StationNode = React.memo(({ num, color, inst, sess, isMe, viewMode, onProfileSelect, onLogout, hasHelpRequest, customName, activePlatform }: { 
  num: number, color: string, inst: string, sess: any, isMe: boolean, viewMode: string, onProfileSelect: (u: any) => void, onLogout: (id: string) => void, hasHelpRequest?: boolean, customName?: string, activePlatform?: string
}) => {
  const stationName = customName || sess?.stations?.name || `iPad ${num}`;
  const isActive = !!sess;
  
  const activeMins = useMemo(() => {
    if (!sess?.check_in_time) return 0;
    const mins = Math.floor((new Date().getTime() - new Date(sess.check_in_time).getTime()) / 60000);
    return Math.max(0, mins);
  }, [sess?.check_in_time]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', height: '100%', width: '100%', paddingTop: '12px' }}>
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
              width: '104px', 
              height: '104px', 
              borderRadius: '24px', 
              overflow: 'hidden', 
              border: `2px solid ${color}`, 
              boxShadow: `0 10px 28px ${color}25`, 
              flexShrink: 0, 
              marginBottom: '4px',
              transition: 'all 0.3s ease'
            }}>
              <AvatarImage src={sess.users?.photo_url} user={sess.users} activePlatform={activePlatform} />
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

const CoachesNode = React.memo(({ coaches, onProfileSelect, activePlatform }: { coaches: any[], onProfileSelect: (u: any) => void, activePlatform?: string }) => {
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
                <AvatarImage src={c.users?.photo_url} user={c.users} activePlatform={activePlatform} />
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
  hideSidebar?: boolean;
  viewMode?: 'admin' | 'student';
  initialTab?: 'briefing' | 'live' | 'bands' | 'students' | 'proposals';
  onTabChange?: (tab: string) => void;
  onOpenBandProfile?: (band: any) => void;
  onFoundBand?: (form: any, mySlot: any) => void;
  isSidebarCollapsed?: boolean;
  setIsSidebarCollapsed?: (collapsed: boolean) => void;
  onSidebarNotificationsChange?: (count: number) => void;
  activePlatform?: 'campus' | 'groovelab';
  onSwitchPlatform?: (newPlatform: 'campus' | 'groovelab') => void;
}

export function TeacherDashboard({ 
  userId, 
  onLogout, 
  locationMode = 'lab', 
  hideHeader = false,
  hideSidebar = false,
  viewMode = 'admin', 
  initialTab,
  onTabChange, 
  onOpenBandProfile, 
  onFoundBand,
  isSidebarCollapsed: propsIsSidebarCollapsed,
  setIsSidebarCollapsed: propsSetIsSidebarCollapsed,
  onSidebarNotificationsChange,
  activePlatform = 'groovelab'
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
  const [docStudent, setDocStudent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'briefing' | 'live' | 'bands' | 'students' | 'proposals'>(initialTab || (hideHeader ? 'live' : 'briefing'));
  const [allBands, setAllBands] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentLetter, setStudentLetter] = useState<string | null>(null);
  const [studentInstrumentFilter, setStudentInstrumentFilter] = useState<string>('all');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [newStudent, setNewStudent] = useState({
    firstName: '',
    lastName: '',
    email: '',
    birthDate: '',
    photoUrl: '/avatar_ghost.jpg',
    isExternalVocalist: false,
    status: 'active',
    is_trial: false,
    trial_ends_at: '',
    contract_ends_at: ''
  });
  const [showInviteStudent, setShowInviteStudent] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteSaving, setInviteSaving] = useState(false);
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
  const [zoomFactor, setZoomFactor] = useState<number>(1.0);
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [activeDragScheduleId, setActiveDragScheduleId] = useState<string | null>(null);
  const [dragOverSlotKey, setDragOverSlotKey] = useState<string | null>(null);

  // We no longer have local room ordering state/handlers because we use the centralized, database-driven sort_order.


  useEffect(() => {
    if (selectedRoomId && userId) {
      const savedZoom = localStorage.getItem(`groovelab_room_zoom_${userId}_${selectedRoomId}`);
      if (savedZoom) {
        const parsed = parseFloat(savedZoom);
        if (!isNaN(parsed)) {
          setZoomFactor(parsed);
          return;
        }
      }
    }
    setZoomFactor(1.0);
  }, [selectedRoomId, userId]);

  useEffect(() => {
    (window as any).openTageskompass = (std: any) => {
      setDocStudent({
        id: std.id,
        first_name: std.first_name || std.name?.split(' ')[0],
        last_name: std.last_name || std.name?.split(' ').slice(1).join(' '),
        photo_url: std.photo_url || '/avatar_ghost.jpg'
      });
    };
    return () => {
      delete (window as any).openTageskompass;
    };
  }, []);

  const handleZoomChange = (value: number) => {
    setZoomFactor(value);
    if (selectedRoomId && userId) {
      localStorage.setItem(`groovelab_room_zoom_${userId}_${selectedRoomId}`, value.toString());
    }
  };

  const getTrafficLightColor = (draggedSchedId: string, targetSlot: any) => {
    if (!briefingData?.timeline) return 'RED';
    const sourceSlot = briefingData.timeline.find((s: any) => s.scheduleId === draggedSchedId);
    if (!sourceSlot || !sourceSlot.student) return 'RED';

    const studentInstrument = sourceSlot.instrument || 'Klavier';
    const studentId = sourceSlot.student.id;

    // 1. Room Matrix Check
    const room = rooms.find(r => r.id === targetSlot.roomId);
    if (room && room.allowed_instruments && room.allowed_instruments.length > 0) {
      const allowed = room.allowed_instruments.map((i: string) => i.toLowerCase());
      const studentInstLower = studentInstrument.toLowerCase();
      if (!allowed.includes(studentInstLower)) {
        return 'RED';
      }
    }

    // 2. Collision Check: Is the target slot occupied?
    const targetConflictSlot = briefingData.timeline.find((s: any) => 
      s.scheduleId !== draggedSchedId && 
      s.timeSlot === targetSlot.timeSlot && 
      s.status !== 'canceled_by_student' &&
      s.status !== 'teacher_sick' &&
      s.student !== null
    );

    if (targetConflictSlot) {
      // It's a 1:1 swap! Verify original room matrix for target student
      const targetStudentInst = targetConflictSlot.instrument || 'Klavier';
      const originalRoomId = sourceSlot.roomId;
      const originalRoom = rooms.find(r => r.id === originalRoomId);
      if (originalRoom && originalRoom.allowed_instruments && originalRoom.allowed_instruments.length > 0) {
        const allowedOriginal = originalRoom.allowed_instruments.map((i: string) => i.toLowerCase());
        if (!allowedOriginal.includes(targetStudentInst.toLowerCase())) {
          return 'RED'; // Swapped student not allowed in original room
        }
      }

      // Check availability for both students in their new swapped slots
      const todayWeekday = new Date().getDay() === 0 ? 7 : new Date().getDay();
      
      const draggedStudentAvailable = availabilities.some(a => 
        a.user_id === studentId && 
        a.day_of_week === todayWeekday && 
        a.time_slot === targetSlot.timeSlot
      );

      const targetStudentAvailable = availabilities.some(a => 
        a.user_id === targetConflictSlot.student.id && 
        a.day_of_week === todayWeekday && 
        a.time_slot === sourceSlot.timeSlot
      );

      return (draggedStudentAvailable && targetStudentAvailable) ? 'GREEN' : 'YELLOW';
    }

    // 3. Availability Check for regular moves
    const rawDay = new Date().getDay();
    const todayWeekday = rawDay === 0 ? 7 : rawDay;
    const isAvailable = availabilities.some(a => 
      a.user_id === studentId && 
      a.day_of_week === todayWeekday && 
      a.time_slot === targetSlot.timeSlot
    );

    return isAvailable ? 'GREEN' : 'YELLOW';
  };

  const handleDragStart = (e: React.DragEvent, scheduleId: string) => {
    setActiveDragScheduleId(scheduleId);
    e.dataTransfer.setData('text/plain', scheduleId);
  };

  const handleDragOver = (e: React.DragEvent, slotKey: string, color: string) => {
    e.preventDefault();
    if (color !== 'RED') {
      setDragOverSlotKey(slotKey);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetSlot: any) => {
    e.preventDefault();
    const draggedSchedId = activeDragScheduleId;
    setActiveDragScheduleId(null);
    setDragOverSlotKey(null);

    if (!draggedSchedId) return;

    const color = getTrafficLightColor(draggedSchedId, targetSlot);
    if (color === 'RED') {
      alert('Tausch blockiert (Bypass-Schutz): Der Ziel-Slot ist belegt oder verletzt die Raum-Matrix.');
      return;
    }

    const confirmMsg = color === 'YELLOW' 
      ? 'Achtung (GELB): Der Slot liegt außerhalb der Verfügbarkeiten des Schülers. Tausch durchführen und Eltern-Freigabe anfordern?'
      : 'Tausch durchführen (GRÜN)?';

    if (!confirm(confirmMsg)) return;

    try {
      const resp = await fetch('/api/schedule/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId: draggedSchedId,
          targetTimeSlot: targetSlot.timeSlot,
          targetDayOfWeek: new Date().getDay() === 0 ? 7 : new Date().getDay(),
          targetRoomId: targetSlot.roomId
        })
      });

      if (resp.ok) {
        setTicker(t => t + 1);
        return;
      }

      // Fallback: direct Supabase swap
      const status = color === 'GREEN' ? 'approved' : 'pending_parent_approval';
      
      const targetConflict = briefingData.timeline.find((s: any) => 
        s.scheduleId !== draggedSchedId && 
        s.timeSlot === targetSlot.timeSlot && 
        s.status !== 'canceled_by_student' &&
        s.status !== 'teacher_sick' &&
        s.student !== null
      );

      if (targetConflict) {
        // Swap both schedules in Supabase
        const sourceSlot = briefingData.timeline.find((s: any) => s.scheduleId === draggedSchedId);
        if (sourceSlot) {
          const { error: err1 } = await supabase
            .from('schedules')
            .update({
              time_slot: targetSlot.timeSlot,
              status: status
            })
            .eq('id', draggedSchedId);

          const { error: err2 } = await supabase
            .from('schedules')
            .update({
              time_slot: sourceSlot.timeSlot,
              status: status
            })
            .eq('id', targetConflict.scheduleId);

          if (err1 || err2) throw (err1 || err2);
        }
      } else {
        // Direct update for single move
        const { error } = await supabase
          .from('schedules')
          .update({
            time_slot: targetSlot.timeSlot,
            status: status
          })
          .eq('id', draggedSchedId);

        if (error) throw error;
      }
      setTicker(t => t + 1);
    } catch (err) {
      console.error(err);
      alert('Tausch fehlgeschlagen.');
    }
  };

  const handleReportIllness = async () => {
    if (!confirm('Möchtest du dich wirklich für heute krankmelden? Alle heutigen Stunden werden storniert und die Verwaltung benachrichtigt.')) return;

    try {
      const todayStr = new Date().toISOString().substring(0, 10);
      const resp = await fetch('/api/teacher/report-sick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: userId, sickUntilDate: todayStr })
      });

      if (resp.ok) {
        alert('Krankheitsmeldung erfolgreich registriert. Das Sekretariat und die betroffenen Schüler wurden benachrichtigt.');
        setTicker(t => t + 1);
        return;
      }

      // Fallback direct Supabase update
      const { data: teacherProfile } = await supabase
        .from('users')
        .select('school_id, first_name, last_name')
        .eq('id', userId)
        .single();

      if (!teacherProfile) throw new Error("Profile not found");

      const rawDay = new Date().getDay();
      const todayWeekday = rawDay === 0 ? 7 : rawDay;

      // Update today's schedules to canceled_by_teacher_sick
      const { error: scheduleError } = await supabase
        .from('schedules')
        .update({ status: 'canceled_by_teacher_sick' })
        .eq('teacher_id', userId)
        .eq('day_of_week', todayWeekday);

      if (scheduleError) throw scheduleError;

      // Insert crisis notification for today's slots
      const { data: slots } = await supabase
        .from('schedules')
        .select('*')
        .eq('teacher_id', userId)
        .eq('day_of_week', todayWeekday);

      if (slots && slots.length > 0) {
        const notifs = slots.map(s => {
          const [hours, minutes] = (s.time_slot || '00:00').split(':').map(Number);
          const startDateTime = new Date();
          startDateTime.setHours(hours, minutes, 0, 0);
          return {
            teacher_id: userId,
            student_id: s.student_id,
            slot_start_datetime: startDateTime.toISOString(),
            status: 'UNREAD'
          };
        });

        await supabase.from('crisis_notifications').insert(notifs);
      }

      const alertMessage = `🚨 LEHRER-KRANKHEIT: Lehrkraft ${teacherProfile.first_name} ${teacherProfile.last_name} hat sich für heute krankgemeldet.`;
      await supabase.from('system_alerts').insert({
        school_id: teacherProfile.school_id,
        teacher_id: userId,
        type: 'Teacher Illness Alert',
        message: alertMessage,
        resolved: false
      });

      alert('Krankheit erfolgreich gemeldet. Alle Stunden wurden abgesagt.');
      setTicker(t => t + 1);
    } catch (err) {
      console.error(err);
      alert('Fehler beim Melden der Krankheit.');
    }
  };

  const handleReportSick = async () => {
    if (!sickUntilDate) {
      alert('Bitte wähle ein Datum aus.');
      return;
    }

    const confirmMsg = teacher?.sick_until
      ? `Möchtest du deine Krankmeldung wirklich auf den ${new Date(sickUntilDate).toLocaleDateString('de-DE')} anpassen?`
      : `Möchtest du dich wirklich bis zum ${new Date(sickUntilDate).toLocaleDateString('de-DE')} krankmelden?`;

    if (!confirm(confirmMsg)) return;

    try {
      setReportingSick(true);

      // Direct Client-Side Supabase logic matching CampusTeacherDashboard
      const { data: profile, error: profileErr } = await supabase
        .from('users')
        .select('school_id, first_name, last_name, sick_until')
        .eq('id', userId)
        .single();

      if (profileErr || !profile) {
        throw new Error('Teacher profile not found.');
      }

      const prevSickUntilStr = profile.sick_until;

      // 1. Update user table
      const { error: userErr } = await supabase
        .from('users')
        .update({ sick_until: sickUntilDate })
        .eq('id', userId);

      if (userErr) throw userErr;

      // 2. Fetch weekly schedules
      const { data: schedules, error: schedError } = await supabase
        .from('schedules')
        .select('*')
        .eq('teacher_id', userId);

      if (schedError) throw schedError;

      // 2b. Fetch one-off schedule occurrences (for rescheduled slots)
      const { data: occurrences, error: occError } = await supabase
        .from('schedule_occurrences')
        .select('*')
        .eq('teacher_id', userId);

      if (occError) throw occError;

      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const sickUntil = new Date(sickUntilDate);
      const maxDate = new Date(now);
      maxDate.setDate(maxDate.getDate() + 30); // 30 days window

      const currentDate = new Date(todayStart);
      const notificationsToInsert: any[] = [];
      const scheduleIdsToCancel = new Set<string>();
      const scheduleIdsToRestore = new Set<string>();
      const datesToDeleteNotifs: string[] = [];

      // Fetch existing crisis notifications
      const { data: existingNotifs } = await supabase
        .from('crisis_notifications')
        .select('slot_start_datetime, student_id')
        .eq('teacher_id', userId);

      const existingNotifsSet = new Set(
        (existingNotifs || []).map(n => `${new Date(n.slot_start_datetime).toISOString()}-${n.student_id}`)
      );

      while (currentDate <= maxDate) {
        const rawDay = currentDate.getDay();
        const currentDayOfWeek = rawDay === 0 ? 7 : rawDay;
        const daySchedules = (schedules || []).filter(s => s.day_of_week === currentDayOfWeek);

        daySchedules.forEach(sched => {
          const [hours, minutes] = (sched.time_slot || '00:00').split(':').map(Number);
          const startDateTime = new Date(currentDate);
          startDateTime.setHours(hours, minutes, 0, 0);

          if (startDateTime >= now) {
            const isCurrentlySick = startDateTime <= new Date(sickUntil.getTime() + 24 * 60 * 60 * 1000 - 1);
            
            if (isCurrentlySick) {
              scheduleIdsToCancel.add(sched.id);
              if (sched.student_id) {
                const notifKey = `${startDateTime.toISOString()}-${sched.student_id}`;
                if (!existingNotifsSet.has(notifKey)) {
                  notificationsToInsert.push({
                    teacher_id: userId,
                    student_id: sched.student_id,
                    slot_start_datetime: startDateTime.toISOString(),
                    status: 'UNREAD'
                  });
                }
              }
            } else {
              scheduleIdsToRestore.add(sched.id);
              datesToDeleteNotifs.push(startDateTime.toISOString());
            }
          }
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Process one-off schedule occurrences for sickness cancellations and restores
      const occurrenceIdsToCancel = new Set<string>();
      const occurrenceIdsToRestore = new Set<string>();

      (occurrences || []).forEach(occ => {
        const startDateTime = new Date(`${occ.date}T${occ.start_time}`);
        
        if (startDateTime >= now) {
          const isCurrentlySick = startDateTime <= new Date(sickUntil.getTime() + 24 * 60 * 60 * 1000 - 1);
          
          if (isCurrentlySick) {
            occurrenceIdsToCancel.add(occ.id);
            if (occ.student_id) {
              const notifKey = `${startDateTime.toISOString()}-${occ.student_id}`;
              if (!existingNotifsSet.has(notifKey)) {
                notificationsToInsert.push({
                  teacher_id: userId,
                  student_id: occ.student_id,
                  slot_start_datetime: startDateTime.toISOString(),
                  status: 'UNREAD'
                });
              }
            }
          } else {
            occurrenceIdsToRestore.add(occ.id);
            datesToDeleteNotifs.push(startDateTime.toISOString());
          }
        }
      });

      // Apply schedule cancellations
      if (scheduleIdsToCancel.size > 0) {
        await supabase
          .from('schedules')
          .update({ status: 'canceled_by_teacher_sick' })
          .in('id', Array.from(scheduleIdsToCancel));
      }

      // Apply occurrence cancellations
      if (occurrenceIdsToCancel.size > 0) {
        await supabase
          .from('schedule_occurrences')
          .update({ status: 'canceled_by_teacher_sick' })
          .in('id', Array.from(occurrenceIdsToCancel));
      }

      // Restore active schedules
      if (scheduleIdsToRestore.size > 0) {
        await supabase
          .from('schedules')
          .update({ status: 'approved' })
          .in('id', Array.from(scheduleIdsToRestore))
          .eq('status', 'canceled_by_teacher_sick');
      }

      // Restore active occurrences
      if (occurrenceIdsToRestore.size > 0) {
        await supabase
          .from('schedule_occurrences')
          .update({ status: 'rescheduled_confirmed' })
          .in('id', Array.from(occurrenceIdsToRestore))
          .eq('status', 'canceled_by_teacher_sick');
      }

      // Insert new crisis notifications
      if (notificationsToInsert.length > 0) {
        await supabase
          .from('crisis_notifications')
          .insert(notificationsToInsert);
      }

      // Delete future crisis notifications
      if (datesToDeleteNotifs.length > 0) {
        await supabase
          .from('crisis_notifications')
          .delete()
          .eq('teacher_id', userId)
          .in('slot_start_datetime', datesToDeleteNotifs);
      }

      // Add Secretary alarm ticket
      const alertMessage = prevSickUntilStr
        ? `🚨 KRANKHEITS-ANPASSUNG: Lehrkraft ${profile.first_name} ${profile.last_name} hat den Krankmeldungszeitraum auf den ${new Date(sickUntilDate).toLocaleDateString('de-DE')} geändert.`
        : `🚨 NEUE KRANKMELDUNG: Lehrkraft ${profile.first_name} ${profile.last_name} hat sich bis zum ${new Date(sickUntilDate).toLocaleDateString('de-DE')} krankgemeldet.`;

      await supabase
        .from('system_alerts')
        .insert({
          school_id: profile.school_id,
          teacher_id: userId,
          type: 'Teacher Illness Alert',
          message: alertMessage,
          resolved: false
        });

      setSickSuccessShown(true);
      setIsSickWidgetExpanded(false);
      setTicker(t => t + 1);
      setTimeout(() => {
        setSickSuccessShown(false);
        window.location.reload();
      }, 800);
    } catch (err) {
      console.error(err);
      alert('Fehler bei der Krankheitsmeldung.');
    } finally {
      setReportingSick(false);
    }
  };

  const handleEndSick = async () => {
    if (!confirm('Möchtest du dich wirklich wieder gesundmelden? Alle zukünftigen Krankheitsausfälle werden wieder aktiviert.')) return;

    try {
      setReportingSick(true);

      const { data: profile, error: profileErr } = await supabase
        .from('users')
        .select('school_id, first_name, last_name')
        .eq('id', userId)
        .single();

      if (profileErr || !profile) {
        throw new Error('Teacher profile not found.');
      }

      // 1. Clear user sick_until column
      const { error: userErr } = await supabase
        .from('users')
        .update({ sick_until: null })
        .eq('id', userId);

      if (userErr) throw userErr;

      // 2. Fetch weekly schedules
      const { data: schedules, error: schedError } = await supabase
        .from('schedules')
        .select('*')
        .eq('teacher_id', userId);

      if (schedError) throw schedError;

      // 2b. Fetch occurrences
      const { data: occurrences } = await supabase
        .from('schedule_occurrences')
        .select('*')
        .eq('teacher_id', userId);

      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const maxDate = new Date(now);
      maxDate.setDate(maxDate.getDate() + 30); // 30 days window

      const currentDate = new Date(todayStart);
      const scheduleIdsToRestore = new Set<string>();
      const datesToDeleteNotifs: string[] = [];

      while (currentDate <= maxDate) {
        const rawDay = currentDate.getDay();
        const currentDayOfWeek = rawDay === 0 ? 7 : rawDay;
        const daySchedules = (schedules || []).filter(s => s.day_of_week === currentDayOfWeek);

        daySchedules.forEach(sched => {
          const [hours, minutes] = (sched.time_slot || '00:00').split(':').map(Number);
          const startDateTime = new Date(currentDate);
          startDateTime.setHours(hours, minutes, 0, 0);

          if (startDateTime >= now) {
            scheduleIdsToRestore.add(sched.id);
            datesToDeleteNotifs.push(startDateTime.toISOString());
          }
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Process one-off schedule occurrences for restoration
      const occurrenceIdsToRestore = new Set<string>();

      (occurrences || []).forEach(occ => {
        const startDateTime = new Date(`${occ.date}T${occ.start_time}`);
        if (startDateTime >= now) {
          occurrenceIdsToRestore.add(occ.id);
          datesToDeleteNotifs.push(startDateTime.toISOString());
        }
      });

      // Restore all future schedules to approved
      if (scheduleIdsToRestore.size > 0) {
        await supabase
          .from('schedules')
          .update({ status: 'approved' })
          .in('id', Array.from(scheduleIdsToRestore))
          .eq('status', 'canceled_by_teacher_sick');
      }

      // Restore all future occurrences to rescheduled_confirmed
      if (occurrenceIdsToRestore.size > 0) {
        await supabase
          .from('schedule_occurrences')
          .update({ status: 'rescheduled_confirmed' })
          .in('id', Array.from(occurrenceIdsToRestore))
          .eq('status', 'canceled_by_teacher_sick');
      }

      // Delete future crisis notifications
      if (datesToDeleteNotifs.length > 0) {
        await supabase
          .from('crisis_notifications')
          .delete()
          .eq('teacher_id', userId)
          .in('slot_start_datetime', datesToDeleteNotifs);
      }

      // Add healthy notice to system alerts
      const alertMessage = `🍏 LEHRKRAFT GESUND: Lehrkraft ${profile.first_name} ${profile.last_name} hat sich wieder gesund gemeldet.`;
      await supabase
        .from('system_alerts')
        .insert({
          school_id: profile.school_id,
          teacher_id: userId,
          type: 'Teacher Healthy Alert',
          message: alertMessage,
          resolved: false
        });

      alert('Erfolgreich gesundgemeldet! Zukünftige Stundenplandaten wurden wieder aktiviert.');
      setTicker(t => t + 1);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Fehler bei der Gesundmeldung.');
    } finally {
      setReportingSick(false);
    }
  };

  const handleSubmitFeedbackResponse = async (requestId: string) => {
    if (!responseTextInput.trim()) return;
    setSubmittingFeedback(true);
    try {
      const { error } = await supabase
        .from('campus_feedback_responses')
        .insert({
          request_id: requestId,
          teacher_id: userId,
          response_text: responseTextInput.trim()
        });

      if (error) throw error;
      
      setResponseTextInput('');
      setRespondingToRequestId(null);
      alert('Rückmeldung erfolgreich übermittelt! Vielen Dank.');
      setTicker(t => t + 1);
    } catch (err) {
      console.error(err);
      alert('Fehler beim Übermitteln der Rückmeldung.');
    } finally {
      setSubmittingFeedback(false);
    }
  };
  
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

  const [briefingData, setBriefingData] = useState<any>(null);
  const [briefingLoading, setBriefingLoading] = useState(true);



  // New Right Sidebar Sickness & Administrative feedback states
  const [isSickWidgetExpanded, setIsSickWidgetExpanded] = useState(() => {
    const shouldExpand = localStorage.getItem('expand_sick_widget') === 'true';
    if (shouldExpand) {
      localStorage.removeItem('expand_sick_widget');
      return true;
    }
    return false;
  });
  const [sickUntilDate, setSickUntilDate] = useState<string>(() => {
    const saved = localStorage.getItem('selected_sick_date');
    if (saved) {
      localStorage.removeItem('selected_sick_date');
      return saved;
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().substring(0, 10);
  });
  const [reportingSick, setReportingSick] = useState(false);
  const [sickSuccessShown, setSickSuccessShown] = useState(false);
  const [adminFeedbackRequests, setAdminFeedbackRequests] = useState<any[]>([]);
  const [adminFeedbackResponses, setAdminFeedbackResponses] = useState<any[]>([]);
  const [campusFeedAnnouncements, setCampusFeedAnnouncements] = useState<any[]>([]);
  const [respondingToRequestId, setRespondingToRequestId] = useState<string | null>(null);
  const [responseTextInput, setResponseTextInput] = useState<string>('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [adminFeedbackTab, setAdminFeedbackTab] = useState<'open' | 'done'>('open');

  const lastSickUntilRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (teacher?.sick_until) {
      if (teacher.sick_until !== lastSickUntilRef.current) {
        lastSickUntilRef.current = teacher.sick_until;
        setSickUntilDate(teacher.sick_until.substring(0, 10));
      }
    } else {
      lastSickUntilRef.current = undefined;
    }
  }, [teacher?.sick_until]);

  useEffect(() => {
    const handleSelectDate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.date) {
        setSickUntilDate(customEvent.detail.date);
        setIsSickWidgetExpanded(true);
      }
    };
    window.addEventListener('select-appointment-date', handleSelectDate);
    return () => {
      window.removeEventListener('select-appointment-date', handleSelectDate);
    };
  }, []);

  const [currentTimeStr, setCurrentTimeStr] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const isWeekend = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    return day === 0 || day === 6;
  }, []);

  const firstLessonStartMin = useMemo(() => {
    if (!briefingData?.timeline || briefingData.timeline.length === 0) return null;
    const sorted = [...briefingData.timeline]
      .filter((slot: any) => slot.student && slot.status !== 'canceled_by_student' && slot.status !== 'teacher_sick' && slot.status !== 'cancelled' && slot.status !== 'canceled_by_teacher_sick')
      .sort((a: any, b: any) => a.timeSlot.localeCompare(b.timeSlot));
    
    if (sorted.length === 0) return null;
    const firstSlotStart = sorted[0].timeSlot;
    const [h, m] = firstSlotStart.split(':').map(Number);
    return h * 60 + m;
  }, [briefingData?.timeline]);

  const lastLessonEndMin = useMemo(() => {
    if (!briefingData?.timeline || briefingData.timeline.length === 0) return null;
    const sorted = [...briefingData.timeline]
      .filter((slot: any) => slot.student && slot.status !== 'canceled_by_student' && slot.status !== 'teacher_sick' && slot.status !== 'cancelled' && slot.status !== 'canceled_by_teacher_sick')
      .sort((a: any, b: any) => a.timeSlot.localeCompare(b.timeSlot));

    if (sorted.length === 0) return null;
    const lastSlot = sorted[sorted.length - 1];
    const lastSlotStart = lastSlot.timeSlot;
    const [h, m] = lastSlotStart.split(':').map(Number);
    return h * 60 + m + (lastSlot.duration || 30);
  }, [briefingData?.timeline]);

  const currentTimeMin = useMemo(() => {
    if (!currentTimeStr) return 0;
    const [h, m] = currentTimeStr.split(':').map(Number);
    return h * 60 + m;
  }, [currentTimeStr]);

  const firstSlotStartStr = useMemo(() => {
    if (!briefingData?.timeline || briefingData.timeline.length === 0) return '';
    const sorted = [...briefingData.timeline]
      .filter((slot: any) => slot.student && slot.status !== 'canceled_by_student' && slot.status !== 'teacher_sick' && slot.status !== 'cancelled' && slot.status !== 'canceled_by_teacher_sick')
      .sort((a: any, b: any) => a.timeSlot.localeCompare(b.timeSlot));
    return sorted.length > 0 ? sorted[0].timeSlot : '';
  }, [briefingData?.timeline]);

  const prepCutoffTimeStr = useMemo(() => {
    if (firstLessonStartMin === null) return '';
    const cutoffMin = firstLessonStartMin - 15;
    const h = Math.floor(cutoffMin / 60) % 24;
    const m = cutoffMin % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }, [firstLessonStartMin]);

  const widgetState = useMemo(() => {
    if (isWeekend) return 'WEEKEND';
    if (firstLessonStartMin === null || lastLessonEndMin === null) return 'FEIERABEND';
    
    const prepCutoffMin = firstLessonStartMin - 15;
    
    if (currentTimeMin < prepCutoffMin) {
      return 'VORBEREITUNG';
    } else if (currentTimeMin >= prepCutoffMin && currentTimeMin < lastLessonEndMin) {
      return 'ACTIVE';
    } else {
      return 'FEIERABEND';
    }
  }, [isWeekend, firstLessonStartMin, lastLessonEndMin, currentTimeMin]);

  const isWithinActiveHours = useMemo(() => {
    return widgetState === 'ACTIVE';
  }, [widgetState]);

  // Stable daily choices (hellos, subtitles) based on date-based seed
  const dailyBriefingStableChoices = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Simple hash from the date string
    let seed = 0;
    for (let i = 0; i < todayStr.length; i++) {
      seed = (seed << 5) - seed + todayStr.charCodeAt(i);
      seed |= 0;
    }
    
    const random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
    const subtitles = isWeekend
      ? [
          'Wir wünschen dir ein schönes, erholsames Wochenende!',
          'Ruh dich aus und tanke neue Energie für die Woche!',
          'Ein entspanntes Wochenende für dich! Hier ist deine Übersicht.',
          'Zeit zum Durchatmen! Schönes Wochenende!',
          'Hier ist dein Wochenend-Cockpit. Genieße die freien Stunden!',
          'Musik im Herzen, Entspannung im Kopf. Schönes Wochenende!',
          'Dein Groove-Fahrplan fürs Wochenende steht bereit.',
          'Schönes Wochenende! Lass es dir gutgehen!'
        ]
      : [
          'Hier ist dein persönliches Briefing für heute.',
          'Bereit für einen produktiven Tag? Hier ist deine Übersicht.',
          'Dein grooviger Fahrplan für heute steht bereit.',
          'Lass uns heute wieder Großartiges erschaffen! Hier ist dein Plan.',
          'Alle Termine auf einen Blick – dein Tag im Überblick.',
          'Hier ist deine Übersicht für einen erfolgreichen Tag.',
          'Deine Schüler warten schon! Hier ist dein Tagesbriefing.',
          'Dein Groove-Cockpit ist bereit. Hier ist dein Tag im Überblick.'
        ];
    const subtitle = subtitles[Math.floor(random() * subtitles.length)];
    const greetingOptionIndex = Math.floor(random() * 4); // 0 = time-based, 1 = Hallo, 2 = Hi, 3 = Hey

    return { greetingOptionIndex, subtitle };
  }, [userId, new Date().toDateString()]);

  // Dynamic greeting that adapts time greetings to the hour, but keeps others completely stable
  const dynamicGreeting = useMemo(() => {
    const hours = parseInt(currentTimeStr.split(':')[0], 10);
    let greeting = '';

    if (dailyBriefingStableChoices.greetingOptionIndex === 0) {
      if (hours >= 5 && hours < 12) {
        greeting = 'Guten Morgen';
      } else if (hours >= 12 && hours < 18) {
        greeting = 'Guten Mittag';
      } else if (hours >= 18 && hours < 23) {
        greeting = 'Guten Abend';
      } else {
        greeting = 'Gute Nacht';
      }
    } else {
      const generalGreetings = ['Hallo', 'Hi', 'Hey'];
      greeting = generalGreetings[dailyBriefingStableChoices.greetingOptionIndex - 1];
    }

    return { 
      greeting, 
      subtitle: dailyBriefingStableChoices.subtitle 
    };
  }, [dailyBriefingStableChoices, currentTimeStr]);

  const activeStudent = useMemo(() => {
    if (!briefingData?.timeline || briefingData.timeline.length === 0) return null;
    
    // 1. Try to find slot that is currently active by time
    const activeSlot = briefingData.timeline.find((slot: any, idx: number) => {
      const slotStart = slot.timeSlot;
      const slotEnd = (() => {
        const [sh, sm] = slotStart.split(':').map(Number);
        const totalMin = sh * 60 + sm + 30;
        return `${String(Math.floor(totalMin / 60) % 24).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
      })();
      return currentTimeStr >= slotStart && currentTimeStr < slotEnd && slot.student;
    });
    if (activeSlot?.student) return activeSlot.student;

    // 2. Fallback to first upcoming student
    const upcomingSlot = briefingData.timeline.find((slot: any) => {
      return currentTimeStr < slot.timeSlot && slot.student;
    });
    if (upcomingSlot?.student) return upcomingSlot.student;

    // 3. Fallback to first student of the day
    const firstStudentSlot = briefingData.timeline.find((slot: any) => slot.student);
    return firstStudentSlot?.student || null;
  }, [briefingData?.timeline, currentTimeStr]);

  const [dynamicPrepMirror, setDynamicPrepMirror] = useState<any>(null);
  const [loadingPrepMirror, setLoadingPrepMirror] = useState<boolean>(false);

  useEffect(() => {
    if (!activeStudent?.id) {
      setDynamicPrepMirror(null);
      return;
    }

    const loadPrepForStudent = async () => {
      try {
        setLoadingPrepMirror(true);
        const studentId = activeStudent.id;
        
        const [avatarRes, progressRes] = await Promise.all([
          supabase
            .from('avatars')
            .select('evolution_level, xp, avatar_style')
            .eq('user_id', studentId)
            .maybeSingle(),
          supabase
            .from('user_progress')
            .select(`
              current_level,
              stage_ready_badge,
              last_updated,
              exercises (title, description)
            `)
            .eq('user_id', studentId)
            .order('last_updated', { ascending: false })
            .limit(3)
        ]);

        const studentAvatar = avatarRes.data;
        const recentProgress = progressRes.data;

        const verifiedSongs = (recentProgress || []).map((p: any) => ({
          title: p.exercises?.title || 'Übungssong',
          status: p.stage_ready_badge ? 'verifiziert' : 'in_progress',
          level: p.current_level || 1,
          note: p.exercises?.description || ''
        }));

        setDynamicPrepMirror({
          studentId,
          studentName: activeStudent.name,
          timeSlot: briefingData.timeline.find((s: any) => s.student?.id === studentId)?.timeSlot || '',
          streakCount: studentAvatar?.avatar_style === 'Premium_Hero' ? 6 : 0,
          evolutionLevel: studentAvatar?.evolution_level || 1,
          verifiedSongs
        });
      } catch (e) {
        console.error('Error loading dynamic prep:', e);
      } finally {
        setLoadingPrepMirror(false);
      }
    };

    loadPrepForStudent();
  }, [activeStudent?.id, briefingData?.timeline]);

  useEffect(() => {
    const loadBriefing = async () => {
      if (!userId) return;
      try {
        setBriefingLoading(true);
        const resp = await fetch(`/api/briefing/teacher?userId=${userId}`);
        if (resp.ok && resp.headers.get('content-type')?.includes('application/json')) {
          const data = await resp.json();
          if (data && data.success) {
            setBriefingData(data);
            return;
          }
        }
        throw new Error('API offline');
      } catch (e) {
        try {
          const { data: teacherProfile } = await supabase
            .from('users')
            .select('school_id, schools(allow_messages_global)')
            .eq('id', userId)
            .single();

          if (!teacherProfile) return;
          const schoolData = Array.isArray(teacherProfile.schools) ? teacherProfile.schools[0] : teacherProfile.schools;
          const allowMessages = schoolData?.allow_messages_global ?? true;

          const rawDay = new Date().getDay();
          const todayWeekday = rawDay === 0 ? 7 : rawDay;

           const { data: slots } = await supabase
            .from('schedules')
            .select(`
              id,
              time_slot,
              duration,
              status,
              day_of_week,
              rooms (id, name),
              student:users!schedules_student_id_fkey (
                id,
                first_name,
                last_name,
                is_app_user,
                instrument,
                avatars (avatar_style, evolution_level, xp)
              )
            `)
            .eq('teacher_id', userId)
            .eq('day_of_week', todayWeekday);

          const todayStr = new Date().toISOString().substring(0, 10);

          // Fetch occurrences for today for fallback
          const { data: occurrences } = await supabase
            .from('schedule_occurrences')
            .select(`
              id,
              date,
              original_date,
              start_time,
              status,
              schedule_id,
              student_id,
              schedules (
                duration,
                rooms (id, name)
              ),
              student:users!schedule_occurrences_student_id_fkey (
                id,
                first_name,
                last_name,
                is_app_user,
                instrument,
                avatars (avatar_style, evolution_level, xp)
              )
            `)
            .eq('teacher_id', userId)
            .or(`date.eq.${todayStr},original_date.eq.${todayStr}`);

          // Format regular schedules
          let timeline = (slots || []).map((slot: any) => {
            const student = slot.student;
            const avatar = student?.avatars?.[0] || null;
            const isAnalogStickerUser = !student?.is_app_user || avatar?.avatar_style === 'Standard_Silhouette';

            return {
              scheduleId: slot.id,
              timeSlot: slot.time_slot,
              duration: slot.duration,
              status: slot.status,
              roomId: slot.rooms?.id || null,
              room: slot.rooms?.name || 'Hauptraum',
              instrument: student?.instrument || 'Klavier',
              student: student ? {
                id: student.id,
                name: `${student.first_name} ${student.last_name}`,
                isAppUser: student.is_app_user ?? false,
                isAnalogStickerUser
              } : null
            };
          });

          // Merge with occurrences for today
          if (occurrences && occurrences.length > 0) {
            occurrences.forEach((occ: any) => {
              const student = occ.student;
              const avatar = student?.avatars?.[0] || null;
              const isAnalogStickerUser = !student?.is_app_user || avatar?.avatar_style === 'Standard_Silhouette';
              const formattedTime = occ.start_time ? occ.start_time.substring(0, 5) : '00:00';
              const occStudentId = occ.student?.id || occ.student_id;

              if (occ.original_date === todayStr && occ.date !== todayStr) {
                // Rescheduled AWAY from today -> remove from today's timeline
                timeline = timeline.filter((t: any) => t.student?.id !== occStudentId);
              } else if (occ.date === todayStr) {
                // Rescheduled TO today or updated today -> update or insert into today's timeline
                const existingIdx = timeline.findIndex((t: any) => t.student?.id === occStudentId);
                const mappedItem = {
                  scheduleId: occ.schedule_id || occ.id,
                  timeSlot: formattedTime,
                  duration: occ.schedules?.duration || 30,
                  status: occ.status,
                  roomId: occ.schedules?.rooms?.id || null,
                  room: occ.schedules?.rooms?.name || 'Hauptraum',
                  instrument: student?.instrument || 'Klavier',
                  student: student ? {
                    id: student.id,
                    name: `${student.first_name} ${student.last_name}`,
                    isAppUser: student.is_app_user ?? false,
                    isAnalogStickerUser
                  } : null
                };

                if (occ.status === 'cancelled') {
                  mappedItem.status = 'canceled_by_student';
                }

                if (existingIdx !== -1) {
                  timeline[existingIdx] = mappedItem;
                } else {
                  timeline.push(mappedItem);
                }
              }
            });
          }

          timeline.sort((a: any, b: any) => a.timeSlot.localeCompare(b.timeSlot));

          const now = new Date();
          const currentStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          const nextSlot = timeline.find((s: any) => s.timeSlot >= currentStr) || timeline[0] || null;
          let prepMirror = null;

          if (nextSlot && nextSlot.student) {
            const studentId = nextSlot.student.id;
            
            const [avatarRes, progressRes] = await Promise.all([
              supabase
                .from('avatars')
                .select('evolution_level, xp, avatar_style')
                .eq('user_id', studentId)
                .maybeSingle(),
              supabase
                .from('user_progress')
                .select(`
                  current_level,
                  stage_ready_badge,
                  last_updated,
                  exercises (title, description)
                `)
                .eq('user_id', studentId)
                .order('last_updated', { ascending: false })
                .limit(3)
            ]);

            const studentAvatar = avatarRes.data;
            const recentProgress = progressRes.data;

            const verifiedSongs = (recentProgress || []).map((p: any) => ({
              title: p.exercises?.title || 'Übungssong',
              status: p.stage_ready_badge ? 'verifiziert' : 'in_progress',
              level: p.current_level || 1,
              note: allowMessages ? (p.exercises?.description || '') : '[SYSTEM: Nachrichten global stummgeschaltet]'
            }));

            prepMirror = {
              studentId,
              studentName: nextSlot.student.name,
              timeSlot: nextSlot.timeSlot,
              streakCount: studentAvatar?.avatar_style === 'Premium_Hero' ? 6 : 0,
              evolutionLevel: studentAvatar?.evolution_level || 1,
              verifiedSongs
            };
          }

          // Fetch rescheduled reminders for this week in fallback
          let rescheduledReminders: any[] = [];
          try {
            const startOfWeek = new Date();
            const currentDay = startOfWeek.getDay();
            const distance = currentDay === 0 ? -6 : 1 - currentDay; // distance to Monday
            const monday = new Date(startOfWeek);
            monday.setDate(startOfWeek.getDate() + distance);
            monday.setHours(0, 0, 0, 0);

            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);

            const mondayStr = monday.toISOString().substring(0, 10);
            const sundayStr = sunday.toISOString().substring(0, 10);

            const { data: weekOccurrences } = await supabase
              .from('schedule_occurrences')
              .select(`
                id,
                date,
                original_date,
                start_time,
                status,
                student:users!schedule_occurrences_student_id_fkey (
                  first_name,
                  last_name
                )
              `)
              .eq('teacher_id', userId)
              .gte('date', mondayStr)
              .lte('date', sundayStr);

            if (weekOccurrences && weekOccurrences.length > 0) {
              const rescheduledUpcoming = weekOccurrences.filter((occ: any) => {
                const hasDateDiff = occ.original_date && occ.original_date !== occ.date;
                return hasDateDiff && occ.date >= todayStr;
              });

              rescheduledReminders = rescheduledUpcoming.map((occ: any) => {
                const dateObj = new Date(occ.date);
                const weekdayStr = dateObj.toLocaleDateString('de-DE', { weekday: 'long' });
                const dateFormatted = dateObj.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                const timeFormatted = occ.start_time ? occ.start_time.substring(0, 5) : '';
                const originalDateObj = occ.original_date ? new Date(occ.original_date) : null;
                const originalWeekdayStr = originalDateObj ? originalDateObj.toLocaleDateString('de-DE', { weekday: 'long' }) : 'seinem regulären Termin';

                return {
                  id: occ.id,
                  studentName: `${occ.student?.first_name || ''} ${occ.student?.last_name || ''}`.trim(),
                  originalWeekday: originalWeekdayStr,
                  weekday: weekdayStr,
                  dateStr: dateFormatted,
                  time: timeFormatted
                };
              });
            }
          } catch (err) {
            console.warn('Failed to fetch fallback rescheduled reminders', err);
          }

          setBriefingData({
            success: true,
            allowMessagesGlobal: allowMessages,
            todayWeekday,
            timeline,
            prepMirror,
            rescheduledReminders
          });
        } catch (err) {
          console.error('Error loading briefing fallback:', err);
        }
      } finally {
        setBriefingLoading(false);
      }
    };

    loadBriefing();
  }, [userId, ticker]);

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

    if (!userId) return;

    const channelSessions = supabase
      .channel('realtime_teacher_sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        fetchData();
      })
      .subscribe();

    const channelHelp = supabase
      .channel('realtime_teacher_help')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'help_requests' }, () => {
        fetchData();
      })
      .subscribe();

    const channelSkills = supabase
      .channel('realtime_teacher_skills')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_song_skills' }, () => {
        fetchData();
      })
      .subscribe();

    const channelBands = supabase
      .channel('realtime_teacher_bands')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bands' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelSessions);
      supabase.removeChannel(channelHelp);
      supabase.removeChannel(channelSkills);
      supabase.removeChannel(channelBands);
    };
  }, [userId, activePlatform]);

  const fetchData = async () => {
    if (!userId) return;
    setFetchError(null);

    // Update coach presence in DB
    supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', userId).then(() => {});

    try {
      // 0. Shoutbox & Profile Info (Fetched in parallel first)
      let bIds: string[] = [];
      const [mBandsRes, cBandsRes, tDataRes] = await Promise.all([
        supabase.from('band_members').select('band_id').eq('user_id', userId),
        supabase.from('bands').select('id').eq('coach_id', userId),
        supabase.from('users').select('*, schools(*)').eq('id', userId).single()
      ]);

      const mBands = mBandsRes.data;
      const cBands = cBandsRes.data;
      const tData = tDataRes.data;

      if (mBands) bIds.push(...mBands.map(b => b.band_id));
      if (cBands) bIds.push(...cBands.map(b => b.id));
      bIds = [...new Set(bIds)];

      if (bIds.length > 0) {
        const { data: shoutData } = await supabase.from('band_shoutbox').select('*, users(first_name, photo_url), bands(name)').in('band_id', bIds).order('created_at', { ascending: false });
        const unread = (shoutData || []).filter(s => !(s.read_by || []).includes(userId) && s.user_id !== userId);
        setUnreadShouts(unread);
      }

      // 1. Info
      setTeacher(tData);

      if (tData?.school_id) {
        // Prepare Student Query depending on platform
        let studentQuery = supabase.from('users').select('*').eq('school_id', tData.school_id).eq('role', 'student').eq('teacher_id', userId);
        if (activePlatform === 'campus') {
          studentQuery = studentQuery.eq('is_campus_active', true);
        } else {
          studentQuery = studentQuery.eq('is_groovelab_active', true);
        }

        // Prepare dynamic matching board songs query
        let wallSongsQuery = supabase.from('songs').select(`
          id, artist, title, media_link, instrumentation,
          user_song_skills (
            id, song_id, progress_percent, instrument, part_number, difficulty_level, is_stage_ready, user_id, created_at, formation_group,
            profiles:users!user_song_skills_user_id_fkey(first_name, photo_url, school_id)
          )
        `).eq('school_id', tData.school_id).eq('is_groovelab_active', true);

        if (tData.role === 'teacher') {
          wallSongsQuery = wallSongsQuery.eq('teacher_id', userId);
        }

        // Concurrently query all school-based dashboard resources (11 queries in parallel)
        const [
          rRes,
          avRes,
          sessRes,
          coachesRes,
          subRes,
          bRes,
          studRes,
          helpRes,
          formingBandsRes,
          wallRes,
          occRes
        ] = await Promise.all([
          supabase.from('rooms').select('*').eq('school_id', tData.school_id).eq('is_groovelab_active', true).order('sort_order', { ascending: true }),
          supabase.from('user_availability').select('*'),
          supabase.from('sessions').select('*, users!inner(*), stations(*)').is('check_out_time', null),
          supabase.from('users').select('*').in('role', ['teacher', 'admin']).eq('school_id', tData.school_id),
          supabase.from('user_song_skills').select('*, users!user_id(*), songs(*)').eq('is_pending_approval', true),
          supabase.from('bands').select('*, band_members(*, users(*)), coach:users!coach_id(id, first_name, last_name, photo_url), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url, user_song_skills:user_song_skills!user_song_skills_user_id_fkey(id, song_id, instrument, progress_percent, is_pending_approval, is_stage_ready))))').eq('school_id', tData.school_id).order('name'),
          studentQuery.order('first_name'),
          viewMode !== 'student' 
            ? supabase.from('help_requests').select('*, users(*)').eq('school_id', tData.school_id).eq('status', 'pending').order('created_at', { ascending: false })
            : Promise.resolve({ data: null, error: null }),
          supabase.from('bands').select('*, band_members(*, profiles:users(id, first_name, last_name, photo_url, created_at, birth_date)), songs(*), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, last_name, photo_url, created_at, birth_date)))').eq('school_id', tData.school_id).in('status', ['forming', 'active']),
          wallSongsQuery,
          supabase.from('band_song_slots').select('user_id, band_songs(song_id)')
        ]);

        const rData = rRes.data;
        const avData = avRes.data;
        const sessData = sessRes.data;
        const sessErr = sessRes.error;
        const allCoaches = coachesRes.data;
        const subData = subRes.data;
        const bData = bRes.data;
        const studData = studRes.data;
        const helpData = helpRes.data;
        const formingBands = formingBandsRes.data;
        const wallData = wallRes.data;
        const wallErr = wallRes.error;
        const occupiedSlots = occRes.data;

        setRooms(rData || []);
        setAvailabilities(avData || []);
        
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
        const hidePresence = sessionStorage.getItem('groovelab_teacher_hide_presence') === 'true';
        const isHomeMode = sessionStorage.getItem('groovelab_location_mode') === 'home';
        
        const activeCoaches = (allCoaches || []).filter(c => {
          if (c.is_observer) return false; // Hospitanten are never shown in Live Lab
          if (c.id === userId) {
            return !hidePresence && !isHomeMode;
          }
          return trulyActive.some(s => s.user_id === c.id);
        });
        setCoaches(activeCoaches.map(c => ({ id: c.id, users: c, session: trulyActive.find(s => s.user_id === c.id) })));

        // 5. Challenges
        const filteredSubs = (subData || []).filter((s: any) => (Array.isArray(s.users) ? s.users[0] : s.users)?.school_id === tData.school_id);
        const mappedSubs = filteredSubs.map((s: any) => ({ ...s, users: Array.isArray(s.users) ? s.users[0] : s.users, songs: Array.isArray(s.songs) ? s.songs[0] : s.songs }));
        setAllSubmissions(mappedSubs);
        
        // Only show students who are currently in the lab in the sidebar pipeline
        const activeInLabSubs = mappedSubs.filter(sub => trulyActive.some(sess => sess.user_id === sub.user_id));
        setSubmissions(activeInLabSubs);

        // 6. Bands
        setAllBands(bData || []);

        // 7. Students
        setAllStudents(studData || []);

        // 8. Help
        setHelpRequests(helpData || []);

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

        // 9. Fetch Administrative Feedback Requests & Responses
        try {
          const { data: feedbackRequests } = await supabase
            .from('campus_feedback_requests')
            .select('*')
            .eq('school_id', tData.school_id)
            .order('created_at', { ascending: false });

          if (feedbackRequests && feedbackRequests.length > 0) {
            setAdminFeedbackRequests(feedbackRequests);
            
            const requestIds = feedbackRequests.map(r => r.id);
            const { data: feedbackResponses } = await supabase
              .from('campus_feedback_responses')
              .select('*')
              .eq('teacher_id', userId)
              .in('request_id', requestIds);
            
            if (feedbackResponses) {
              setAdminFeedbackResponses(feedbackResponses);
            }
          } else {
            setAdminFeedbackRequests([]);
            setAdminFeedbackResponses([]);
          }
        } catch (fErr) {
          console.error('Error fetching admin feedback:', fErr);
        }

        // 10. Fetch Live Campus Feed Announcements from campus_announcements table
        try {
          const { data: annData, error: annErr } = await supabase
            .from('campus_announcements')
            .select('*, users(first_name, last_name, photo_url)')
            .eq('school_id', tData.school_id)
            .order('created_at', { ascending: false });

          if (!annErr && annData) {
            const parsed = annData.map(ann => ({
              id: ann.id,
              title: ann.title,
              content: ann.message,
              target_type: ann.target_type || 'all',
              created_at: ann.created_at,
              user: ann.users
            }));
            setCampusFeedAnnouncements(parsed);
          } else {
            setCampusFeedAnnouncements([]);
          }
        } catch (aErr) {
          console.error('Error fetching announcements:', aErr);
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

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.firstName) return;
    
    if (teacher?.schools?.limits_enabled) {
      const maxStudents = teacher.schools.max_students ?? 6;
      if (allStudents.length >= maxStudents) {
        alert(`Limit erreicht! Deine Schule darf maximal ${maxStudents} Schüler registrieren. Kontaktiere deinen Master-Admin.`);
        return;
      }
    }
    
    const qrToken = crypto.randomUUID();
    const lName = newStudent.lastName;
    const formattedLastName = lName.length > 1 ? lName.charAt(0) + '.' : lName;
    
    const { data, error } = await supabase.from('users').insert({
      school_id: teacher.school_id, 
      role: 'student', 
      first_name: newStudent.firstName, 
      last_name: formattedLastName,
      email: newStudent.email || null,
      birth_date: newStudent.birthDate ? newStudent.birthDate : null,
      photo_url: newStudent.photoUrl || '/avatar_ghost.jpg',
      qr_token: qrToken,
      is_external_vocalist: newStudent.isExternalVocalist,
      instrument: newStudent.isExternalVocalist ? 'Vocals' : 'Musiker',
      status: newStudent.status || 'active',
      is_trial: newStudent.is_trial || false,
      trial_ends_at: newStudent.is_trial && newStudent.trial_ends_at ? newStudent.trial_ends_at : null,
      contract_ends_at: newStudent.contract_ends_at ? newStudent.contract_ends_at : null,
      is_campus_active: activePlatform === 'campus',
      is_groovelab_active: activePlatform === 'groovelab',
      teacher_id: userId
    }).select().single();
    
    if (error) {
      alert('Fehler beim Hinzufügen: ' + error.message);
    } else if (data) { 
      setAllStudents(prev => [...prev, data]); 
      setShowAddStudent(false); 
      setNewStudent({ 
        firstName: '', 
        lastName: '', 
        email: '',
        birthDate: '', 
        photoUrl: '/avatar_ghost.jpg', 
        isExternalVocalist: false,
        status: 'active',
        is_trial: false,
        trial_ends_at: '',
        contract_ends_at: ''
      }); 
      fetchData();
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    const { error } = await supabase.from('users').update({
      first_name: editingStudent.first_name,
      last_name: editingStudent.last_name,
      birth_date: editingStudent.birth_date || null,
      status: editingStudent.status || 'active',
      is_trial: editingStudent.is_trial || false,
      trial_ends_at: editingStudent.is_trial && editingStudent.trial_ends_at ? editingStudent.trial_ends_at : null,
      contract_ends_at: editingStudent.contract_ends_at || null,
      is_external_vocalist: editingStudent.is_external_vocalist || false,
      instrument: editingStudent.is_external_vocalist ? 'Vocals' : 'Musiker'
    }).eq('id', editingStudent.id);
    
    if (error) {
      alert('Fehler beim Aktualisieren: ' + error.message);
    } else {
      setAllStudents(prev => prev.map(s => s.id === editingStudent.id ? editingStudent : s));
      setEditingStudent(null);
      fetchData();
    }
  };

  const handleDeleteStudent = async (id: string) => {
    const studentToDelete = allStudents.find(s => s.id === id);
    if (!studentToDelete) return;

    const actionText = activePlatform === 'campus' 
      ? 'Möchtest du diesen Schüler wirklich vom Campus entfernen?' 
      : 'Möchtest du diesen Schüler wirklich von GrooveLab entfernen?';

    if (window.confirm(actionText)) {
      try {
        const isCampus = activePlatform === 'campus';
        const otherActive = isCampus ? studentToDelete.is_groovelab_active : studentToDelete.is_campus_active;

        if (otherActive) {
          const updatePayload = isCampus 
            ? { is_campus_active: false } 
            : { is_groovelab_active: false };
          
          const { error } = await supabase.from('users').update(updatePayload).eq('id', id);
          if (error) throw error;
        } else {
          await supabase.from('user_song_skills').delete().eq('user_id', id);
          await supabase.from('band_members').delete().eq('user_id', id);
          await supabase.from('sessions').delete().eq('user_id', id);
          await supabase.from('band_songs').update({ suggested_by: null }).eq('suggested_by', id);
          await supabase.from('lab_planning').delete().eq('user_id', id);
          await supabase.from('band_shoutbox').delete().eq('user_id', id);
          await supabase.from('band_song_slots').delete().eq('user_id', id);
          await supabase.from('help_requests').delete().eq('user_id', id);
          
          const { error } = await supabase.from('users').delete().eq('id', id);
          if (error) throw error;
        }
        
        setAllStudents(prev => prev.filter(s => s.id !== id));
        fetchData();
      } catch (err: any) {
        alert('Fehler beim Entfernen: ' + err.message);
      }
    }
  };

  const handleInviteStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteFirstName.trim()) return;
    setInviteSaving(true);
    try {
      if (teacher?.schools?.limits_enabled) {
        const maxStudents = teacher.schools.max_students ?? 6;
        if (allStudents.length >= maxStudents) {
          alert(`Limit erreicht! Maximal ${maxStudents} Schüler.`);
          return;
        }
      }
      const qrToken = crypto.randomUUID();
      const lName = inviteLastName.trim();
      const formattedLast = lName.length > 1 ? lName.charAt(0) + '.' : lName;
      const { data, error } = await supabase.from('users').insert({
        school_id: teacher.school_id,
        role: 'student',
        first_name: inviteFirstName.trim(),
        last_name: formattedLast,
        email: inviteEmail.trim() || null,
        photo_url: '/avatar_ghost.jpg',
        qr_token: qrToken,
        instrument: 'Musiker',
        status: 'invited',
        is_trial: true,
        is_campus_active: activePlatform === 'campus',
        is_groovelab_active: activePlatform === 'groovelab',
        teacher_id: userId
      }).select().single();
      if (error) {
        alert('Fehler: ' + error.message);
      } else if (data) {
        setAllStudents(prev => [...prev, data]);
        fetchData();
        const link = `${window.location.origin}/?invite=${qrToken}`;
        setInviteLink(link);
      }
    } finally {
      setInviteSaving(false);
    }
  };

  if (!teacher) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b', fontWeight: 600 }}>Lade Zentrale...</div>;

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: hideHeader ? 'transparent' : '#f8fafc',
      color: '#1d1d1f',
      fontFamily: '"Outfit", "Inter", -apple-system, sans-serif',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <style dangerouslySetInnerHTML={{__html: `
        .google-card {
          background: var(--glass-bg);
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          padding: 24px;
          box-shadow: var(--glass-shadow);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          position: relative;
        }
        .google-card:hover {
          transform: translateY(-1px);
          box-shadow: var(--glass-shadow-lg);
        }
        .google-btn-primary {
          background: #d81e05; /* Swiss Red */
          color: #ffffff;
          border: none;
          font-weight: 700;
          font-size: 0.85rem;
          padding: 10px 24px;
          border-radius: var(--radius-pill);
          cursor: pointer;
          transition: all 0.2s;
        }
        .google-btn-primary:hover {
          background: #b71904;
        }
        .google-sidebar-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 16px;
          border-radius: var(--radius-sm);
          border: none;
          font-size: 0.88rem;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
          color: var(--text-secondary);
          text-align: left;
          box-sizing: border-box;
          margin-bottom: 4px;
          position: relative;
        }
        .google-sidebar-item:hover {
          background: rgba(0, 0, 0, 0.04);
          color: var(--text-main);
        }
        .google-sidebar-item.active.briefing {
          background: rgba(216, 30, 5, 0.08) !important;
          color: #d81e05 !important;
          font-weight: 700;
        }
        .google-sidebar-item.active.live {
          background: rgba(19, 115, 51, 0.08) !important;
          color: #137333 !important;
          font-weight: 700;
        }
        .google-sidebar-item.active.bands {
          background: rgba(176, 96, 0, 0.08) !important;
          color: #b06000 !important;
          font-weight: 700;
        }
        .google-sidebar-item.active.students {
          background: rgba(107, 33, 168, 0.08) !important;
          color: #6b21a8 !important;
          font-weight: 700;
        }
        .sidebar-icon-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s ease;
          background: rgba(0, 0, 0, 0.05);
          color: var(--text-secondary);
        }
        .google-sidebar-item:hover .sidebar-icon-circle {
          background: rgba(0, 0, 0, 0.08);
          color: var(--text-main);
        }
        .google-sidebar-item.active.briefing .sidebar-icon-circle {
          background: #d81e05;
          color: #ffffff;
        }
        .google-sidebar-item.active.live .sidebar-icon-circle {
          background: #34a853;
          color: #ffffff;
        }
        .google-sidebar-item.active.bands .sidebar-icon-circle {
          background: #fbbc05;
          color: #ffffff;
        }
        .google-sidebar-item.active.students .sidebar-icon-circle {
          background: #a855f7;
          color: #ffffff;
        }
      `}} />

      {selectedCoachProfile && <TeacherDetailModal teacher={selectedCoachProfile} onClose={() => setSelectedCoachProfile(null)} />}
      {selectedStudentProfile && (
        <StudentDetailModal 
          student={selectedStudentProfile} 
          onClose={() => setSelectedStudentProfile(null)} 
          onOpenBandProfile={(band) => {
            setEditingBand(band);
            setSelectedStudentProfile(null);
          }}
          onOpenTageskompass={(std) => {
            setDocStudent({
              id: std.id,
              first_name: std.first_name,
              last_name: std.last_name,
              photo_url: std.photo_url || '/avatar_ghost.jpg'
            });
            setSelectedStudentProfile(null);
          }}
        />
      )}
      {docStudent && (
        <MeisterwerkDocumentationModal 
          student={docStudent} 
          onClose={() => setDocStudent(null)} 
          teacherId={userId}
        />
      )}

      {/* Invite Student Modal */}
      {showInviteStudent && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)',
          zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
        }}>
          <div style={{
            background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '32px',
            width: '100%', maxWidth: '480px', padding: '32px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 950, color: '#1e293b', margin: '0 0 4px 0' }}>Schüler einladen</h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Profil anlegen &amp; Einladungslink generieren</p>
              </div>
              <button onClick={() => { setShowInviteStudent(false); setInviteLink(null); }}
                style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', flexShrink: 0 }}>
                <X size={18} />
              </button>
            </div>

            {!inviteLink ? (
              <form onSubmit={handleInviteStudent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Vorname *</label>
                    <input type="text" required value={inviteFirstName} onChange={e => setInviteFirstName(e.target.value)} placeholder="Max"
                      style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '0.9rem' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Nachname</label>
                    <input type="text" value={inviteLastName} onChange={e => setInviteLastName(e.target.value)} placeholder="Mustermann"
                      style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '0.9rem' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>E-Mail (optional)</label>
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="max@example.com"
                    style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '0.9rem' }} />
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Wird für den mailto-Link benötigt</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                  <button type="button" onClick={() => { setShowInviteStudent(false); setInviteLink(null); }}
                    style={{ flex: 1, padding: '14px', borderRadius: '16px', border: '1.5px solid #e2e8f0', background: 'white', fontWeight: 800, color: '#475569', cursor: 'pointer' }}>
                    Abbrechen
                  </button>
                  <button type="submit" disabled={inviteSaving}
                    style={{ flex: 2, padding: '14px', borderRadius: '16px', border: 'none', background: '#8b5cf6', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(139,92,246,0.2)', opacity: inviteSaving ? 0.7 : 1 }}>
                    {inviteSaving ? 'Erstelle...' : '🔗 Link erstellen'}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', background: '#22c55e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: 'white', fontSize: '1rem' }}>✓</span>
                    </div>
                    <div>
                      <div style={{ fontWeight: 900, color: '#15803d' }}>Profil angelegt!</div>
                      <div style={{ fontSize: '0.78rem', color: '#4ade80' }}>Teile den Link mit dem Schüler</div>
                    </div>
                  </div>
                  <div style={{ background: 'white', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '12px 16px', wordBreak: 'break-all', fontSize: '0.75rem', color: '#475569', fontFamily: 'monospace' }}>
                    {inviteLink}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button onClick={() => { navigator.clipboard.writeText(inviteLink!).then(() => alert('✓ Link kopiert!')); }}
                    style={{ padding: '14px', borderRadius: '16px', border: 'none', background: '#8b5cf6', color: 'white', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(139,92,246,0.2)' }}>
                    <Copy size={16} /> Link kopieren
                  </button>
                  {inviteEmail && (
                    <a href={`mailto:${inviteEmail}?subject=Deine%20Einladung&body=Hallo%20${encodeURIComponent(inviteFirstName)}%2C%0A%0AHier%20ist%20dein%20persönlicher%20Einladungslink%3A%0A${encodeURIComponent(inviteLink!)}`}
                      style={{ padding: '14px', borderRadius: '16px', border: '1.5px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none', fontSize: '0.9rem' }}>
                      <Mail size={16} /> Per E-Mail senden
                    </a>
                  )}
                  <button onClick={() => { setShowInviteStudent(false); setInviteLink(null); setInviteFirstName(''); setInviteLastName(''); setInviteEmail(''); }}
                    style={{ padding: '10px', borderRadius: '16px', border: 'none', background: 'transparent', color: '#94a3b8', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                    Schließen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sidebar - only render if hideHeader is false AND hideSidebar is false */}
      {!hideHeader && !hideSidebar && (
        <div style={{
          width: '280px',
          background: '#ffffff',
          borderRight: '1px solid #e2e8f0',
          padding: '36px 20px 24px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
          height: '100vh',
          boxSizing: 'border-box',
          overflowY: 'auto',
          flexShrink: 0
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#0b57d0', letterSpacing: '-0.02em' }}>
              GrooveLab
            </h1>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>
              Teacher Portal
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
            {[
              { id: 'briefing', label: 'Briefing', icon: LayoutDashboard },
              { id: 'live', label: 'Live Lab', icon: Music },
              { id: 'bands', label: 'Bands', icon: Users },
              { id: 'students', label: 'Schüler', icon: GraduationCap }
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`google-sidebar-item ${tab.id} ${isSelected ? 'active' : ''}`}
                >
                  <div className={`sidebar-icon-circle ${tab.id}`}>
                    <Icon size={16} />
                  </div>
                  <span style={{ flex: 1 }}>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {viewMode === 'admin' && onLogout && (
            <button
              onClick={onLogout}
              className="google-sidebar-item"
              style={{ color: '#ef4444', marginTop: 'auto' }}
            >
              <div className="sidebar-icon-circle" style={{ color: '#ef4444' }}>
                <LogOut size={16} />
              </div>
              <span>Abmelden</span>
            </button>
          )}
        </div>
      )}

      <div style={{
        flex: 1,
        padding: hideHeader ? '0' : (activeTab === 'briefing' ? '24px 10px 10px 10px' : '10px'),
        overflowY: activeTab === 'briefing' ? 'hidden' : 'auto',
        height: '100vh',
        boxSizing: 'border-box',
        width: '100%'
      }}>
        {/* Header - only if hideHeader is false */}
        {!hideHeader && activeTab !== 'briefing' && (
          <header style={{ marginBottom: activeTab === 'live' ? '16px' : '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {activeTab !== 'live' && (
                <>
                  <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#1e293b', margin: 0 }}>
                    {activeTab === 'students' ? '🎓 Schülerverwaltung' : '👥 Bands'}
                  </h2>
                  <p style={{ color: '#64748b', fontWeight: 600, fontSize: '0.85rem', marginTop: '4px' }}>
                    {teacher ? `${teacher.first_name} ${teacher.last_name} • ${teacher.instrument || 'Coach'}` : 'Zentrale'}
                  </p>
                </>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {activeTab === 'live' && (
                <>
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
                      transition: 'all 0.15s'
                    }}
                    className="hover-scale"
                  >
                    {isSidebarCollapsed ? (
                      <>
                        <ChevronLeft size={16} /> Sidebar einblenden
                      </>
                    ) : (
                      <>
                        Sidebar ausblenden <ChevronRight size={16} />
                      </>
                    )}
                  </button>
                  <div style={{ background: '#e6f4ea', padding: '8px 16px', borderRadius: '100px', border: '1px solid #34a853', color: '#137333', fontSize: '0.85rem', fontWeight: 800 }}>
                    {activeSessions.length} im Lab
                  </div>
                </>
              )}
            </div>
          </header>
        )}
        {activeTab === 'briefing' && !hideHeader ? (
          <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '32px', alignItems: 'start', width: '100%' }} className="dashboard-main-grid">
            
            <div style={{ 
              flex: '1 1 600px',
              minWidth: '320px',
              maxWidth: '100%',
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px',
              maxHeight: 'calc(100vh - 60px)',
              overflowY: 'auto',
              paddingRight: '16px',
              paddingBottom: '80px',
              boxSizing: 'border-box'
            }}>
              {briefingLoading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Briefing wird geladen...</div>
              ) : briefingData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* AdminLTE style KPI Cards row (Bold Swiss design, now super-compact and strictly one-line) */}
                  {!teacher?.sick_until && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '0px' }}>
                    {/* Heutige Schüler Card (Blue) */}
                    <div style={{ 
                      position: 'relative', overflow: 'hidden', background: '#007bff', color: 'white',
                      borderRadius: '12px', boxShadow: '0 4px 12px rgba(0, 123, 255, 0.06)',
                      display: 'flex', alignItems: 'center', minHeight: '44px',
                      transition: 'all 0.25s ease'
                    }} className="hover-scale">
                      <div style={{ padding: '8px 12px', position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, lineHeight: 1, fontFamily: "'Urbanist', sans-serif" }}>
                          {briefingData.timeline ? briefingData.timeline.filter((s: any) => s.student).length : 0}
                        </div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.9, whiteSpace: 'nowrap' }}>Heutige Schüler</div>
                      </div>
                      <div style={{ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', zIndex: 1, opacity: 0.12, pointerEvents: 'none' }}>
                        <Users size={20} color="white" />
                      </div>
                    </div>
 
                    {/* Card 2: Im Live Lab aktiv (Green) */}
                    <div style={{ 
                      position: 'relative', overflow: 'hidden', background: '#28a745', color: 'white',
                      borderRadius: '12px', boxShadow: '0 4px 12px rgba(40, 167, 69, 0.06)',
                      display: 'flex', alignItems: 'center', minHeight: '44px',
                      transition: 'all 0.25s ease'
                    }} className="hover-scale">
                      <div style={{ padding: '8px 12px', position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, lineHeight: 1, fontFamily: "'Urbanist', sans-serif" }}>
                          {activeSessions.length}
                        </div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.9, whiteSpace: 'nowrap' }}>Im Live Lab aktiv</div>
                      </div>
                      <div style={{ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', zIndex: 1, opacity: 0.15, pointerEvents: 'none' }}>
                        <Music size={20} color="white" />
                      </div>
                    </div>
 
                    {/* Card 3: Aktive Bands (Yellow) */}
                    <div style={{ 
                      position: 'relative', overflow: 'hidden', background: '#ffc107', color: '#0f172a',
                      borderRadius: '12px', boxShadow: '0 4px 12px rgba(255, 193, 7, 0.06)',
                      display: 'flex', alignItems: 'center', minHeight: '44px',
                      transition: 'all 0.25s ease'
                    }} className="hover-scale">
                      <div style={{ padding: '8px 12px', position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, lineHeight: 1, fontFamily: "'Urbanist', sans-serif", color: '#0f172a' }}>
                          {allBands.length}
                        </div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.9, color: '#0f172a', whiteSpace: 'nowrap' }}>Aktive Bands</div>
                      </div>
                      <div style={{ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', zIndex: 1, opacity: 0.15, pointerEvents: 'none' }}>
                        <Award size={20} color="#0f172a" />
                      </div>
                    </div>
 
                    {/* Card 4: Ausfälle Heute (Red) */}
                    <div style={{ 
                      position: 'relative', overflow: 'hidden', background: '#dc3545', color: 'white',
                      borderRadius: '12px', boxShadow: '0 4px 12px rgba(220, 53, 69, 0.06)',
                      display: 'flex', alignItems: 'center', minHeight: '44px',
                      transition: 'all 0.25s ease'
                    }} className="hover-scale">
                      <div style={{ padding: '8px 12px', position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 900, lineHeight: 1, fontFamily: "'Urbanist', sans-serif" }}>
                          {briefingData.timeline ? briefingData.timeline.filter((s: any) => s.status === 'canceled_by_student' || s.status === 'teacher_sick').length : 0}
                        </div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.9, whiteSpace: 'nowrap' }}>Ausfälle Heute</div>
                      </div>
                      <div style={{ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', zIndex: 1, opacity: 0.15, pointerEvents: 'none' }}>
                        <AlertCircle size={20} color="white" />
                      </div>
                    </div>
                  </div>
                  )}

                  {/* SCHEDULE & PREP-MIRROR ROW (Two Columns: Left has greeting banner and Schüler Notizen, Right has Tagesplan) */}
                  <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '24px', alignItems: 'start', width: '100%' }}>
                    
                    {/* LEFT COLUMN: Greeting Banner & Schüler Notizen */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: '1 1 350px', minWidth: '300px' }}>
                      {/* Premium Greeting Banner with Avatar & Wave Design */}
                      {!teacher?.sick_until && (
                        <div style={{
                          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.40) 100%)',
                          backdropFilter: 'blur(24px) saturate(1.8)',
                          WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
                          border: '1px solid rgba(255, 255, 255, 0.5)',
                          borderRadius: '24px',
                          padding: '14px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '20px',
                          boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{
                              width: '64px',
                              height: '64px',
                              borderRadius: '50%',
                              border: '4px solid #ffffff',
                              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
                              background: '#ffffff',
                              flexShrink: 0,
                              marginTop: '-18px',
                              marginBottom: '-18px',
                              position: 'relative',
                              zIndex: 10,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                            }}
                            className="hover-scale"
                            >
                              <img src={getInstrumentAvatarUrl(teacher?.instrument)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.15)' }} />
                            </div>
                            <div>
                              <h3 style={{ margin: 0, fontSize: '28px', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {dynamicGreeting.greeting}, <span style={{ 
                                  color: '#007aff', 
                                  fontSize: '1.15rem',
                                  fontWeight: 900,
                                  letterSpacing: '-0.01em',
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}>{teacher?.first_name || 'Coach'}</span>! 
                                <span className="inline-block animate-bounce" style={{ marginLeft: '4px' }}>
                                  {(new Date().getDay() === 0 || new Date().getDay() === 6) ? '☀️' : '👋'}
                                </span>
                              </h3>
                              <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                                {dynamicGreeting.subtitle}
                              </p>
                              {briefingData?.rescheduledReminders && briefingData.rescheduledReminders.length > 0 && (
                                <div style={{ 
                                  marginTop: '10px', 
                                  display: 'flex', 
                                  flexDirection: 'column', 
                                  gap: '6px',
                                  width: 'fit-content'
                                }}>
                                  {briefingData.rescheduledReminders.map((rem: any) => (
                                    <div key={rem.id} style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: '10px', 
                                      background: 'rgba(0, 122, 255, 0.03)', 
                                      border: '1px solid rgba(0, 122, 255, 0.06)', 
                                      borderLeft: '3px solid #007aff',
                                      borderRadius: '8px', 
                                      padding: '5px 12px',
                                      fontSize: '0.74rem', 
                                      color: '#475569',
                                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#007aff', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.62rem', flexShrink: 0 }}>
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.9 }}>
                                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                          <line x1="16" y1="2" x2="16" y2="6" />
                                          <line x1="8" y1="2" x2="8" y2="6" />
                                          <line x1="3" y1="10" x2="21" y2="10" />
                                        </svg>
                                        <span>Verschiebung:</span>
                                      </div>
                                      <span style={{ color: '#334155', fontWeight: 500 }}>
                                        <strong>{rem.studentName}</strong> wurde von {rem.originalWeekday === 'seinem regulären Termin' ? 'seinem regulären Termin' : rem.originalWeekday} auf <strong style={{ color: '#007aff', fontWeight: 700 }}>{rem.weekday}, {rem.dateStr}. um {rem.time} Uhr</strong> verschoben.
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Live Clock Badge */}
                          <div style={{
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '5px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.01)',
                            flexShrink: 0
                          }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.02em', fontFamily: 'monospace' }}>
                              {currentTimeStr || '13:00'} UHR
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Schüler Notizen (former Prep Mirror) */}
                      {!teacher?.sick_until && (
                        <div className="google-card" style={{ 
                          width: '100%', 
                          borderLeft: widgetState === 'VORBEREITUNG' 
                            ? '4px solid #007aff' 
                            : widgetState === 'ACTIVE' 
                            ? '4px solid #10b981' 
                            : widgetState === 'WEEKEND' 
                            ? '4px solid #8b5cf6' 
                            : '4px solid #f59e0b', 
                          opacity: loadingPrepMirror ? 0.6 : 1, 
                          transition: 'opacity 0.2s', 
                          boxSizing: 'border-box' 
                        }}>
                          {(() => {
                            if (widgetState === 'VORBEREITUNG') {
                              const activeLessonsCount = briefingData?.timeline 
                                ? briefingData.timeline.filter((s: any) => s.student && s.status !== 'canceled_by_student' && s.status !== 'teacher_sick' && s.status !== 'cancelled' && s.status !== 'canceled_by_teacher_sick').length 
                                : 0;
                              const cancellations = briefingData?.timeline 
                                ? briefingData.timeline.filter((s: any) => s.student && (s.status === 'canceled_by_student' || s.status === 'teacher_sick' || s.status === 'cancelled' || s.status === 'canceled_by_teacher_sick')) 
                                : [];

                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ background: '#e8f0fe', color: '#1a73e8', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <Calendar size={18} />
                                    </div>
                                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                                      Vorbereitung
                                    </h4>
                                  </div>

                                  <div style={{
                                    background: 'linear-gradient(135deg, #e8f0fe 0%, #d2e3fc 100%)',
                                    border: '1.5px solid #aecbfa',
                                    borderRadius: '16px',
                                    padding: '16px',
                                    color: '#185abc',
                                    boxShadow: '0 4px 12px rgba(26, 115, 232, 0.06)',
                                    fontSize: '0.88rem',
                                    fontWeight: 700
                                  }}>
                                    Heute stehen <strong style={{ fontSize: '0.98rem', fontWeight: 900 }}>{activeLessonsCount} Termine</strong> auf dem Fahrplan.
                                  </div>

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                      Änderungen & Ausfälle heute:
                                    </span>
                                    {cancellations.length > 0 ? (
                                      <div style={{
                                        background: '#fef2f2',
                                        border: '1.5px solid #fca5a5',
                                        borderRadius: '12px',
                                        padding: '12px 14px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px'
                                      }}>
                                        {cancellations.map((slot: any, idx: number) => (
                                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#991b1b', fontWeight: 700 }}>
                                            <AlertCircle size={14} color="#dc2626" />
                                            <span>
                                              <strong>{slot.student?.name}</strong> ({slot.timeSlot} Uhr) – Ausfall
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div style={{
                                        background: '#f0fdf4',
                                        border: '1.5px solid #bbf7d0',
                                        borderRadius: '12px',
                                        padding: '12px 14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        fontSize: '0.8rem',
                                        color: '#15803d',
                                        fontWeight: 700
                                      }}>
                                        <CheckCircle size={14} color="#16a34a" />
                                        <span>Keine Änderungen – alles läuft wie geplant.</span>
                                      </div>
                                    )}
                                  </div>

                                  {firstSlotStartStr && (
                                    <div style={{ 
                                      borderTop: '1px solid #f1f5f9', 
                                      paddingTop: '14px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '4px',
                                      fontSize: '0.78rem',
                                      color: '#64748b',
                                      fontWeight: 600,
                                      textAlign: 'center'
                                    }}>
                                      <div>
                                        Erster Unterricht beginnt um <strong style={{ color: '#0f172a' }}>{firstSlotStartStr} Uhr</strong>.
                                      </div>
                                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                        Das Schüler Notiz Widget aktiviert sich automatisch um {prepCutoffTimeStr} Uhr (15 Min. vorher).
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            if (widgetState === 'ACTIVE') {
                              if (!dynamicPrepMirror && !briefingData?.prepMirror) {
                                return <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Keine Unterrichtsdaten geladen.</div>;
                              }
                              const prep = dynamicPrepMirror || briefingData.prepMirror;
                              return (
                                <>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                    <div style={{ background: '#e6f4ea', color: '#137333', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <Award size={18} />
                                    </div>
                                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                                      {activeStudent?.id === prep.studentId ? 'Schüler Notizen' : 'Schüler Notizen (Nächste)'}
                                    </h4>
                                  </div>

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div 
                                      style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                                      onClick={() => {
                                        setDocStudent({
                                          id: prep.studentId,
                                          first_name: prep.studentName.split(' ')[0],
                                          last_name: prep.studentName.split(' ').slice(1).join(' '),
                                          photo_url: '/avatar_ghost.jpg'
                                        });
                                      }}
                                    >
                                      <div style={{
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '12px',
                                        background: '#34a853',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.25rem',
                                        fontWeight: 800
                                      }}>
                                        {prep.studentName.charAt(0)}
                                      </div>
                                      <div>
                                        <div style={{ fontWeight: 900, color: '#0f172a' }}>{prep.studentName}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                                          Slot: {prep.timeSlot} Uhr • Level {prep.evolutionLevel}
                                        </div>
                                      </div>
                                    </div>

                                    {prep.streakCount > 0 && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fffbeb', border: '1px solid #fef3c7', padding: '10px 14px', borderRadius: '12px', color: '#b45309', fontSize: '0.85rem', fontWeight: 700 }}>
                                        <Flame size={16} fill="#f59e0b" color="#f59e0b" />
                                        <span>Premium-User Flammen-Streak: {prep.streakCount} Tage!</span>
                                      </div>
                                    )}

                                    <div>
                                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                                        Aktuelle Songs / Hausaufgaben
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {prep.verifiedSongs && prep.verifiedSongs.length > 0 ? (
                                          prep.verifiedSongs.map((song: any, idx: number) => (
                                            <div key={idx} style={{
                                              background: '#f8fafc',
                                              padding: '10px 12px',
                                              borderRadius: '12px',
                                              border: '1px solid #e2e8f0',
                                              fontSize: '0.85rem'
                                            }}>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#1e293b' }}>
                                                <span>{song.title}</span>
                                                <span style={{
                                                  color: song.status === 'verifiziert' ? '#137333' : '#b45309',
                                                  fontSize: '0.75rem',
                                                  fontWeight: 800
                                                }}>
                                                  {song.status === 'verifiziert' ? '✓ Verifiziert' : 'Übt gerade'}
                                                </span>
                                              </div>
                                              {song.note && (
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', fontStyle: 'italic' }}>
                                                  "{song.note}"
                                                </div>
                                              )}
                                            </div>
                                          ))
                                        ) : (
                                          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Keine aktiven Songs dokumentiert.</div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Premium Quick Actions */}
                                    <div style={{ 
                                      marginTop: '8px', 
                                      paddingTop: '16px', 
                                      borderTop: '1px solid #f1f5f9', 
                                      display: 'flex', 
                                      gap: '10px' 
                                    }}>
                                      <button
                                        onClick={() => {
                                          setDocStudent({
                                            id: prep.studentId,
                                            first_name: prep.studentName.split(' ')[0],
                                            last_name: prep.studentName.split(' ').slice(1).join(' '),
                                            photo_url: '/avatar_ghost.jpg'
                                          });
                                        }}
                                        style={{
                                          flex: 1,
                                          background: '#007aff',
                                          color: 'white',
                                          border: 'none',
                                          padding: '10px 14px',
                                          borderRadius: '12px',
                                          fontSize: '0.8rem',
                                          fontWeight: 800,
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: '6px',
                                          boxShadow: '0 4px 12px rgba(0, 122, 255, 0.15)',
                                          transition: 'all 0.2s'
                                        }}
                                        className="hover-scale"
                                      >
                                        <Edit3 size={14} />
                                        <span>Hausaufgabe / Notiz</span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedStudentProfile({
                                            id: prep.studentId,
                                            first_name: prep.studentName.split(' ')[0],
                                            last_name: prep.studentName.split(' ').slice(1).join(' '),
                                            photo_url: '/avatar_ghost.jpg'
                                          });
                                        }}
                                        style={{
                                          background: '#f1f5f9',
                                          color: '#475569',
                                          border: '1px solid #cbd5e1',
                                          padding: '10px 14px',
                                          borderRadius: '12px',
                                          fontSize: '0.8rem',
                                          fontWeight: 800,
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: '6px',
                                          transition: 'all 0.2s'
                                        }}
                                        className="hover-scale"
                                      >
                                        <User size={14} />
                                        <span>Profil</span>
                                      </button>
                                    </div>
                                  </div>
                                </>
                              );
                            }

                            // WEEKEND or FEIERABEND (fallback)
                            // 10 Seeded Feierabend wishes
                            const wishes = [
                              "Du hast heute Großartiges geleistet. Entspanne dich, tanke neue Energie und lass den Tag gemütlich ausklingen!",
                              "Der produktive Teil des Tages ist geschafft! Mach es dir bequem, leg die Füße hoch und genieße deinen wohlverdienten Abend.",
                              "Zeit, die Instrumente ruhen zu lassen. Wir wünschen dir einen entspannten Feierabend voller Ruhe und Gelassenheit!",
                              "Ein erfolgreicher Unterrichtstag geht zu Ende. Geh raus, atme durch und genieße deine freie Zeit in vollen Zügen!",
                              "Musik im Kopf und Entspannung im Herzen. Hab einen wundervollen, erholsamen Feierabend!",
                              "Die Notenblätter sind sortiert, die Tasten ruhen. Jetzt ist Zeit für dich! Schönen Feierabend!",
                              "Kopf aus, Entspannung an! Genieße die wohlverdiente Ruhe nach einem fantastischen Unterrichtstag.",
                              "Ein toller Tag voller Rhythmus und Melodie liegt hinter dir. Lass den Abend nun ganz in deinem eigenen Tempo ausklingen.",
                              "Feierabend! Lass den Alltagsstress hinter dir und mach heute Abend genau das, was dir am meisten Freude bringt.",
                              "Schönen Feierabend! Zeit für frische Luft, gutes Essen und eine wohlverdiente Auszeit vom Schulalltag."
                            ];

                            // 10 Seeded Quotes and 10 Musician Jokes
                            const materials = [
                              // Quotes (10)
                              { type: 'quote', text: "Die Musik drückt das aus, was nicht gesagt werden kann und worüber zu schweigen unmöglich ist.", author: "Victor Hugo" },
                              { type: 'quote', text: "Ohne Musik wäre das Leben ein Irrtum.", author: "Friedrich Nietzsche" },
                              { type: 'quote', text: "Musik ist die gemeinsame Sprache der Menschheit.", author: "Henry Wadsworth Longfellow" },
                              { type: 'quote', text: "Wo die Sprache aufhört, fängt die Musik an.", author: "E.T.A. Hoffmann" },
                              { type: 'quote', text: "Musik wäscht den Staub des Alltags von der Seele.", author: "Berthold Auerbach" },
                              { type: 'quote', text: "Musik ist die beste Medizin, die es gibt.", author: "Unbekannt" },
                              { type: 'quote', text: "Im Wesen der Musik liegt es, Freude zu bereiten.", author: "Aristoteles" },
                              { type: 'quote', text: "Musik sagt mehr als tausend Worte.", author: "Sprichwort" },
                              { type: 'quote', text: "Wo man singt, da lass dich ruhig nieder, böse Menschen haben keine Lieder.", author: "Johann Gottfried Seume" },
                              { type: 'quote', text: "Die Musik ist die Sprache der Leidenschaft.", author: "Richard Wagner" },
                              
                              // Jokes (10)
                              { type: 'joke', text: "Was ist der Unterschied zwischen einer Geige und einer Bratsche? Die Bratsche brennt länger.", author: "Bratschisten-Witz" },
                              { type: 'joke', text: "Wie nennt man jemanden, der gerne mit Musikern abhängt? Einen Schlagzeuger.", author: "Schlagzeuger-Witz" },
                              { type: 'joke', text: "Warum sind Dirigenten-Partituren immer so groß? Damit sie sich dahinter verstecken können.", author: "Dirigenten-Witz" },
                              { type: 'joke', text: "Wie bringt man einen Gitarristen dazu, leiser zu spielen? Leg ihm ein Notenblatt vor.", author: "Gitarristen-Witz" },
                              { type: 'joke', text: "Wie viele Tenöre braucht man, um eine Glühbirne einzuschrauben? Fünf. Einer schraubt, und vier sagen, dass sie es höher gekonnt hätten.", author: "Sänger-Witz" },
                              { type: 'joke', text: "Was ist das Erste, was ein Bassist lernt? Wie man das Instrument wieder einpackt.", author: "Bassisten-Witz" },
                              { type: 'joke', text: "Warum spielt ein Keyboarder so gerne Klavier? Weil er da keine Kabel suchen muss.", author: "Keyboarder-Witz" },
                              { type: 'joke', text: "Wie nennt man eine wunderschöne Frau am Arm eines Posaunisten? Ein Tattoo.", author: "Posaunisten-Witz" },
                              { type: 'joke', text: "Was haben ein Triangelspieler und ein Blitz gemeinsam? Beide treffen selten zweimal dieselbe Stelle.", author: "Orchester-Witz" },
                              { type: 'joke', text: "Warum klopft der Schlagzeuger immer an die Tür? Weil er nicht weiß, wann er einsetzen soll.", author: "Schlagzeuger-Witz" }
                            ];

                            const today = new Date();
                            const dateSeed = today.getDate() + today.getMonth() * 31 + today.getFullYear();
                            const dailyWishIndex = dateSeed % wishes.length;
                            const dailyItemIndex = (dateSeed * 7 + 13) % materials.length;

                            const dailyWish = wishes[dailyWishIndex];
                            const dailyItem = materials[dailyItemIndex];

                            if (widgetState === 'WEEKEND') {
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ background: '#e8f0fe', color: '#8b5cf6', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <Award size={18} />
                                    </div>
                                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                                      Wochenende
                                    </h4>
                                  </div>

                                  {/* Premium Weekend Rest Card */}
                                  <div style={{
                                    background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                                    border: '1.5px solid #ddd6fe',
                                    borderRadius: '16px',
                                    padding: '20px 16px',
                                    color: '#6d28d9',
                                    textAlign: 'center',
                                    boxShadow: '0 4px 12px rgba(109, 40, 217, 0.08)'
                                  }}>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '6px' }}>☀️ Schönes Wochenende! ☀️</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.9, lineHeight: '1.4' }}>
                                      Genieße deine wohlverdiente Pause! Keine Termine, kein Schulstress. Erhole dich gut und tanke Kraft für neue musikalische Abenteuer in der kommenden Woche.
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{ background: '#fef3c7', color: '#d97706', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Award size={18} />
                                  </div>
                                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                                    Feierabend
                                  </h4>
                                </div>

                                {/* Premium Feierabend Wishing Card */}
                                <div style={{
                                  background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                                  border: '1.5px solid #fde68a',
                                  borderRadius: '16px',
                                  padding: '16px',
                                  color: '#92400e',
                                  textAlign: 'center',
                                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)'
                                }}>
                                  <div style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '4px' }}>✨ Schönen Feierabend! ✨</div>
                                  <div style={{ fontSize: '0.82rem', fontWeight: 600, opacity: 0.9 }}>
                                    {dailyWish}
                                  </div>
                                </div>

                                <div style={{ 
                                  borderTop: '1px solid #f1f5f9', 
                                  paddingTop: '16px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px',
                                  fontStyle: 'italic',
                                  color: '#475569',
                                  fontSize: '0.85rem',
                                  lineHeight: '1.5',
                                  textAlign: 'center'
                                }}>
                                  <span style={{ fontSize: '1.5rem', color: '#cbd5e1', height: '10px', display: 'block', textIndent: '-6px' }}>“</span>
                                  <span>{dailyItem.text}</span>
                                  <strong style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, fontStyle: 'normal', marginTop: '4px' }}>
                                    — {dailyItem.author} ({dailyItem.type === 'joke' ? 'Witz' : 'Zitat'})
                                  </strong>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* RIGHT COLUMN: TAGESPLAN */}
                    {teacher?.sick_until ? (
                      <div style={{
                        flex: '1.2 1 450px',
                        minWidth: '300px',
                        background: 'linear-gradient(135deg, #fff1f2 0%, #fff5f5 100%)',
                        border: '1.5px solid #fecaca',
                        borderRadius: '20px',
                        padding: '24px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.6), 0 2px 12px rgba(0,0,0,0.02)',
                        boxSizing: 'border-box'
                      }}>
                         <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#9f1239', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '6px' }}>
                           Gute Besserung &amp; gute Erholung! 
                           <svg width="16" height="16" viewBox="0 0 24 24" fill="#9f1239" stroke="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                             <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                           </svg>
                         </h4>
                         <p style={{ margin: 0, fontSize: '0.8rem', color: '#be123c', fontWeight: 600, maxWidth: '420px', lineHeight: 1.4 }}>
                           Ruh dich aus – keine Sorge, wir übernehmen heute für dich!
                         </p>
                      </div>
                    ) : (
                      <div className="google-card" style={{ 
                        flex: '1.2 1 450px', 
                        minWidth: '300px', 
                        padding: '20px 24px', 
                        borderRadius: '20px', 
                        border: '1px solid #f1f5f9', 
                        boxShadow: '0 2px 12px rgba(0,0,0,0.04)', 
                        background: 'white', 
                        boxSizing: 'border-box',
                        maxHeight: '620px',
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#1f2937' }}>
                            <Clock size={20} color="#0b57d0" />
                            <strong style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Tagesplan – {new Date().toLocaleDateString('de-DE')} (Unterrichte Heute)</strong>
                          </div>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '4px 12px',
                            borderRadius: '100px',
                            background: '#e8f0fe',
                            color: '#0b57d0',
                            fontFamily: 'Inter'
                          }}>
                            LIVE
                          </span>
                        </div>
  
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '8px', 
                          position: 'relative',
                          overflowY: 'auto',
                          paddingRight: '6px',
                          maxHeight: '520px'
                        }}>
                          <div style={{ position: 'absolute', top: '16px', bottom: '16px', left: '9px', width: '2px', background: '#e2e8f0' }} />
                            {briefingData.timeline && briefingData.timeline.length > 0 ? (() => {
                          // Find prepIndex: first slot that is not canceled and not finished
                          let prepIndex = -1;
                          for (let i = 0; i < briefingData.timeline.length; i++) {
                            const slot = briefingData.timeline[i];
                            const isCanceled = slot.status === 'canceled_by_student' || slot.status === 'teacher_sick';
                            if (!isCanceled) {
                              const slotStart = slot.timeSlot;
                              const slotEnd = (() => {
                                const [sh, sm] = slotStart.split(':').map(Number);
                                const totalMin = sh * 60 + sm + (slot.duration || 30);
                                return `${String(Math.floor(totalMin / 60) % 24).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
                              })();
                              const isFinished = currentTimeStr >= slotEnd;
                              if (!isFinished) {
                                prepIndex = i;
                                break;
                              }
                            }
                          }
 
                          return briefingData.timeline.map((slot: any, idx: number) => {
                            const slotStart = slot.timeSlot;
                            const slotEnd = (() => {
                              const [sh, sm] = slotStart.split(':').map(Number);
                              const totalMin = sh * 60 + sm + (slot.duration || 30);
                              return `${String(Math.floor(totalMin / 60) % 24).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
                            })();
 
                            const isBreak = !slot.student;
                            const isCanceled = slot.status === 'canceled_by_student' || slot.status === 'teacher_sick' || slot.status === 'cancelled';
                            const isFinished = currentTimeStr >= slotEnd;
                            const isCurrentSlot = currentTimeStr >= slotStart && currentTimeStr < slotEnd;
                            const isRescheduledPending = slot.status === 'rescheduled_pending' || slot.status === 'pending' || slot.status === 'pending_reschedule';
                            const isRescheduledConfirmed = slot.status === 'rescheduled_confirmed';
 
                            let slotBg = '#ffffff';
                            let slotBorder = '1.5px solid #e2e8f0';
                            let slotBorderLeft = 'none';
                            let titleColor = '#1e293b';
                            let dotComponent = null;
 
                            if (isBreak) {
                              slotBg = 'rgba(254, 243, 199, 0.4)';
                              slotBorder = '1.5px dashed rgba(245, 158, 11, 0.25)';
                              slotBorderLeft = '5px solid #f59e0b';
                              titleColor = '#b45309';
                              dotComponent = (
                                <div style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  border: '3px solid #f59e0b',
                                  background: isFinished ? '#f59e0b' : '#ffffff',
                                  boxSizing: 'border-box'
                                }} />
                              );
                            } else if (isCanceled) {
                              slotBg = '#ffffff';
                              slotBorder = '1.5px dashed rgba(239, 68, 68, 0.3)';
                              slotBorderLeft = '5px solid #ef4444';
                              titleColor = '#ef4444';
                              dotComponent = (
                                <div style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  border: '3px solid #ef4444',
                                  background: isFinished ? '#ef4444' : '#ffffff',
                                  boxSizing: 'border-box'
                                }} />
                              );
                            } else if (isCurrentSlot && !isFinished) {
                              slotBg = 'linear-gradient(135deg, #e8f0fe 0%, #f4f8ff 100%)';
                              slotBorder = '1.5px solid #8ab4f8';
                              slotBorderLeft = '5px solid #1a73e8';
                              titleColor = '#174ea6';
                              dotComponent = (
                                <div style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  border: '3px solid #1a73e8',
                                  background: '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxSizing: 'border-box',
                                  animation: 'pulse 1.5s infinite'
                                }}>
                                  <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: '#1a73e8'
                                  }} />
                                </div>
                              );
                            } else if (isFinished) {
                              slotBg = '#ffffff';
                              slotBorder = '1.5px solid #e2e8f0';
                              slotBorderLeft = '5px solid #22c55e';
                              titleColor = '#1e293b';
                              dotComponent = (
                                <div style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  border: '3px solid #22c55e',
                                  background: '#22c55e',
                                  boxSizing: 'border-box'
                                }} />
                              );
                            } else if (isRescheduledConfirmed) {
                              slotBg = 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)';
                              slotBorder = '1px solid rgba(16, 185, 129, 0.25)'; // Premium translucent green border
                              slotBorderLeft = '5px solid #10b981'; // Green left accent
                              titleColor = '#713f12';
                              dotComponent = isCurrentSlot ? (
                                <div style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  border: '3px solid #10b981', // Matches border accent color
                                  background: isFinished ? '#10b981' : '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxSizing: 'border-box'
                                }}>
                                  <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: '#10b981'
                                  }} />
                                </div>
                              ) : (
                                <div style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  border: '3px solid #10b981', // Matches border accent color
                                  background: isFinished ? '#10b981' : '#ffffff',
                                  boxSizing: 'border-box'
                                }} />
                              );
                            } else if (isRescheduledPending) {
                              slotBg = 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)';
                              slotBorder = '1px dashed rgba(251, 188, 5, 0.25)'; // Premium translucent yellow dashed border
                              slotBorderLeft = '5px solid #fbbc05'; // Yellow left accent
                              titleColor = '#1e293b';
                              dotComponent = isCurrentSlot ? (
                                <div style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  border: '3px solid #fbbc05', // Matches border accent color
                                  background: isFinished ? '#fbbc05' : '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxSizing: 'border-box'
                                }}>
                                  <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: '#fbbc05'
                                  }} />
                                </div>
                              ) : (
                                <div style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  border: '3px solid #fbbc05', // Matches border accent color
                                  background: isFinished ? '#fbbc05' : '#ffffff',
                                  boxSizing: 'border-box'
                                }} />
                              );
                            } else {
                              slotBg = '#ffffff';
                              slotBorder = '1.5px solid #e2e8f0';
                              slotBorderLeft = '5px solid #0b57d0';
                              titleColor = '#1e293b';
                              dotComponent = isCurrentSlot ? (
                                <div style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  border: '3px solid #0b57d0',
                                  background: '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxSizing: 'border-box'
                                }}>
                                  <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: '#0b57d0'
                                  }} />
                                </div>
                              ) : (
                                <div style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  border: '3px solid #0b57d0',
                                  background: '#ffffff',
                                  boxSizing: 'border-box'
                                }} />
                              );
                            }
 
                            return (
                               <div 
                                 key={idx}
                                 style={{
                                   display: 'flex',
                                   alignItems: 'center',
                                   gap: '12px',
                                   position: 'relative',
                                   width: '100%'
                                 }}
                                >
                                 {/* Timeline Dot on the left */}
                                 <div style={{ width: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2, flexShrink: 0 }}>
                                   {dotComponent}
                                 </div>
 
                                 {/* Slot card on the right containing Uhrzeit inside */}
                                 <div 
                                   onClick={() => {
                                     if (slot.student) {
                                       setDocStudent({
                                         id: slot.student.id,
                                         first_name: slot.student.name.split(' ')[0],
                                         last_name: slot.student.name.split(' ').slice(1).join(' '),
                                         photo_url: slot.student.photo_url || '/avatar_ghost.jpg'
                                       });
                                     }
                                     // Log the date of the clicked appointment (today's date)
                                     const todayStr = new Date().toISOString().substring(0, 10);
                                     setSickUntilDate(todayStr);
                                     setIsSickWidgetExpanded(true);
                                   }}
                                   style={{
                                     flex: 1,
                                     display: 'flex',
                                     alignItems: 'center',
                                     gap: '12px',
                                     padding: '12px 16px', // taller padding for a premium card feel
                                     background: slotBg,
                                     borderRadius: '12px',
                                     border: slotBorder,
                                     borderLeft: slotBorderLeft,
                                     cursor: slot.student ? 'pointer' : 'default',
                                     transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                     boxShadow: (idx === prepIndex) ? (isRescheduledPending ? '0 6px 18px rgba(234, 179, 8, 0.08)' : '0 6px 18px rgba(59, 130, 246, 0.06)') : '0 1.5px 4px rgba(0, 0, 0, 0.01)',
                                     minWidth: 0,
                                     opacity: (!slot.student || isCanceled) ? 0.75 : 1
                                   }}
                                   className="hover-scale google-timeline-card"
                                 >
                                   {/* Uhrzeit (inside card, pure black, borderless, white bg) */}
                                   <div style={{
                                     fontSize: '0.8rem',
                                     fontWeight: 900,
                                     color: isCurrentSlot && !isFinished && slot.student ? '#1a73e8' : '#0f172a',
                                     fontFamily: "'Plus Jakarta Sans', sans-serif",
                                     whiteSpace: 'nowrap',
                                     flexShrink: 0,
                                     background: '#ffffff',
                                     padding: '4px 8px',
                                     borderRadius: '6px',
                                     border: isCurrentSlot && !isFinished && slot.student ? '1.5px solid #1a73e8' : 'none',
                                     boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                     display: 'inline-flex',
                                     alignItems: 'center',
                                     justifyContent: 'center',
                                     gap: '4px'
                                   }}>
                                     {isCurrentSlot && !isFinished && slot.student && (
                                       <span className="pulse" style={{
                                         width: '6px',
                                         height: '6px',
                                         borderRadius: '50%',
                                         background: '#1a73e8',
                                         display: 'inline-block'
                                       }} />
                                     )}
                                     {slot.timeSlot} Uhr
                                   </div>
 
                                   {/* Vertical separator */}
                                   <div style={{ width: '1.5px', height: '18px', background: '#e2e8f0', flexShrink: 0 }} />
 
                                   <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1 }}>
                                     <div style={{ minWidth: 0, flex: 1 }}>
                                       <div style={{ fontWeight: 800, color: titleColor, display: 'flex', alignItems: 'center', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                         {slot.student ? (
                                           <div style={{ display: 'flex', alignItems: 'center', width: '100%', minWidth: 0 }}>
                                             <span style={{ 
                                               fontWeight: 900, 
                                               color: isFinished ? '#15803d' : '#0f172a', 
                                               fontSize: '0.9rem', 
                                               width: '140px', 
                                               flexShrink: 0, 
                                               overflow: 'hidden', 
                                               textOverflow: 'ellipsis', 
                                               whiteSpace: 'nowrap' 
                                             }}>
                                               {slot.student.name}
                                             </span>
                                             
                                             <span style={{ color: '#94a3b8', margin: '0 8px', fontWeight: 400, flexShrink: 0 }}>•</span>
                                             
                                             <span style={{ 
                                               color: '#64748b', 
                                               fontWeight: 500, 
                                               fontSize: '0.78rem', 
                                               width: '80px', 
                                               flexShrink: 0, 
                                               overflow: 'hidden', 
                                               textOverflow: 'ellipsis', 
                                               whiteSpace: 'nowrap' 
                                             }}>
                                               {slot.instrument || 'Musiker'}
                                             </span>
                                             
                                             <span style={{ color: '#94a3b8', margin: '0 8px', fontWeight: 400, flexShrink: 0 }}>•</span>
                                             
                                             <span style={{ 
                                               color: '#64748b', 
                                               fontWeight: 500, 
                                               fontSize: '0.78rem', 
                                               flex: 1, 
                                               minWidth: 0, 
                                               overflow: 'hidden', 
                                               textOverflow: 'ellipsis', 
                                               whiteSpace: 'nowrap' 
                                             }}>
                                               {slot.room || 'Groovelab'}
                                             </span>
                                           </div>
                                         ) : (
                                           <span style={{ fontWeight: 700, color: '#78350f', fontSize: '0.85rem' }}>☕️ Pause ({slot.duration || 30} Min.)</span>
                                         )}
                                       </div>
                                     </div>
                                   </div>
 
                                  {/* Unbestätigt Badge (on the right) */}
                                  {isRescheduledPending && (
                                    <span style={{
                                      background: '#fffbeb',
                                      color: '#eab308',
                                      border: '1px solid #fde68a',
                                      padding: '4px 10px',
                                      borderRadius: '6px',
                                      fontSize: '0.72rem',
                                      fontWeight: 800,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      flexShrink: 0,
                                      boxShadow: '0 1px 2px rgba(251, 188, 5, 0.04)'
                                    }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" strokeDasharray="3 3" />
                                        <polyline points="12 6 12 12 16 14" />
                                      </svg>
                                      Unbestätigt
                                    </span>
                                  )}
 
                                  {/* Bestätigt Badge (on the right) */}
                                  {isRescheduledConfirmed && (
                                    <span style={{
                                      background: '#f0fdf4',
                                      color: '#16a34a',
                                      border: '1px solid #bbf7d0',
                                      padding: '4px 6px',
                                      borderRadius: '50%',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                      boxShadow: '0 1px 2px rgba(22, 163, 74, 0.04)'
                                    }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })() : (
                          <div style={{
                            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                            borderRadius: '16px',
                            padding: '32px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            border: '1px dashed #cbd5e1',
                            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.6)',
                            textAlign: 'center',
                            marginTop: '8px',
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            {/* Decorative element */}
                            <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.05, transform: 'rotate(15deg)' }}>
                              <Sparkles size={100} color="#0b57d0" />
                            </div>
                            
                            <div style={{ 
                              width: '56px', height: '56px', 
                              background: 'linear-gradient(135deg, #e0e7ff 0%, #dbeafe 100%)', 
                              borderRadius: '50%', 
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: '0 8px 16px rgba(59, 130, 246, 0.12)',
                              position: 'relative',
                              zIndex: 2
                            }}>
                              <Sparkles size={28} color="#3b82f6" />
                            </div>
                            <div style={{ position: 'relative', zIndex: 2 }}>
                              <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>
                                {(() => {
                                  const day = new Date().getDay();
                                  return (day === 0 || day === 6) ? 'Schönes Wochenende! 🎉' : 'Freier Tag!';
                                })()}
                              </h4>
                              <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 600, maxWidth: '250px', lineHeight: 1.5 }}>
                                {(() => {
                                  const day = new Date().getDay();
                                  return (day === 0 || day === 6)
                                    ? 'Genieße die unterrichtsfreie Zeit und erhole dich gut.'
                                    : 'Heute stehen keine Unterrichte an. Zeit zum Durchatmen und Energie tanken.';
                                })()}
                              </p>
                            </div>
                          </div>
                        )}
 

                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>Fehler beim Laden des Briefings.</div>
              )}
            </div>

            {/* briefing-right-sidebar */}
            <aside style={{ 
              flex: '1 1 320px',
              maxWidth: '320px',
              width: '100%',
              display: 'flex', 
              flexDirection: 'column', 
              gap: '20px',
              maxHeight: 'calc(100vh - 80px)',
              overflowY: 'auto',
              paddingRight: '6px',
              paddingBottom: '80px',
              boxSizing: 'border-box'
            }} className="briefing-right-sidebar">
              
              {/* SICKNESS CARD – always red */}
              <div style={{ 
                padding: isSickWidgetExpanded ? '20px 24px' : '12px 20px', 
                borderRadius: '24px',
                background: 'linear-gradient(135deg, #fff1f2 0%, #fff5f5 100%)',
                boxShadow: '0 4px 20px rgba(239,68,68,0.10)',
                border: '1.5px solid #fecaca',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'all 0.35s ease'
              }}>

                {/* Success / Gute Besserung screen */}
                {sickSuccessShown ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '8px 0', textAlign: 'center' }}>
                    <span style={{ fontSize: '2.2rem', lineHeight: 1 }}>🌡️</span>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#b91c1c' }}>Krankmeldung eingereicht!</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#dc2626', lineHeight: 1.4 }}>
                      Die Verwaltung wurde benachrichtigt &amp; betroffene Stunden storniert.
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '1.0rem', fontWeight: 800, color: '#ef4444', background: '#fee2e2', borderRadius: '12px', padding: '8px 18px' }}>
                      Gute Besserung! 💊
                    </div>
                  </div>
                ) : (
                  <>
                    <div 
                      onClick={() => setIsSickWidgetExpanded(!isSickWidgetExpanded)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: '8px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: '1.1rem', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                          </svg>
                        </span>
                        <h3 style={{ 
                          fontSize: '1rem', fontWeight: 850, margin: 0,
                          color: '#7f1d1d',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>
                          Heute kra...
                        </h3>
                      </div>
                      
                      {!isSickWidgetExpanded && !teacher?.sick_until && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsSickWidgetExpanded(true);
                          }}
                          style={{
                            background: '#b91c1c',
                            color: '#ffffff',
                            border: 'none',
                            padding: '7px 18px',
                            borderRadius: '24px',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 8px rgba(185,28,28,0.3)',
                            flexShrink: 0
                          }}
                        >
                          <span>🤒</span>
                          <span>Jetzt krankmelden</span>
                        </button>
                      )}

                      {isSickWidgetExpanded && (
                        <ChevronDown 
                          size={16} 
                          color="#b91c1c"
                          style={{ 
                            transform: 'rotate(180deg)', 
                            transition: 'transform 0.2s ease',
                            flexShrink: 0
                          }} 
                        />
                      )}

                      {teacher?.sick_until && !isSickWidgetExpanded && (
                        <ChevronDown 
                          size={16} 
                          color="#b91c1c"
                          style={{ 
                            transform: 'rotate(0deg)', 
                            transition: 'transform 0.2s ease',
                            flexShrink: 0
                          }} 
                        />
                      )}
                    </div>

                    {teacher?.sick_until && !isSickWidgetExpanded && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '32px', marginTop: '6px' }}>
                        <div style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 700 }}>
                          Bis: {new Date(teacher.sick_until).toLocaleDateString('de-DE')}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEndSick();
                          }}
                          disabled={reportingSick}
                          style={{
                            background: '#ffffff',
                            color: '#166534',
                            border: '1.5px solid #16a34a',
                            padding: '6px 14px',
                            borderRadius: '10px',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            width: 'fit-content',
                            boxShadow: '0 2px 6px rgba(22, 163, 74, 0.1)'
                          }}
                          className="hover-scale"
                        >
                          ✅ Wieder gesund melden
                        </button>
                      </div>
                    )}

                    {isSickWidgetExpanded && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '8px', borderTop: '1px solid #fecaca' }}>
                        {teacher?.sick_until ? (
                          <div style={{ fontSize: '0.78rem', color: '#7f1d1d', fontWeight: 550, lineHeight: 1.4 }}>
                            Du bist aktuell krankgemeldet bis einschließlich:
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#b91c1c', marginTop: '4px' }}>
                              {new Date(teacher.sick_until).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </div>
                          </div>
                        ) : (
                          <p style={{ margin: 0, fontSize: '0.78rem', color: '#9f1239', lineHeight: 1.4, fontWeight: 500 }}>
                            Trage dein voraussichtliches Enddatum ein. Stunden werden storniert und die Verwaltung benachrichtigt.
                          </p>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {teacher?.sick_until ? 'Zeitraum anpassen (bis):' : 'Krank bis einschließlich:'}
                          </label>
                          <input 
                            type="date"
                            value={sickUntilDate}
                            onChange={(e) => setSickUntilDate(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              borderRadius: '12px',
                              border: '1px solid #fca5a5',
                              background: '#fff',
                              fontSize: '0.8rem',
                              fontFamily: 'inherit',
                              outline: 'none',
                              color: '#7f1d1d',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                          <button
                            onClick={handleReportSick}
                            disabled={reportingSick}
                            style={{
                              background: '#dc2626',
                              color: '#ffffff',
                              border: 'none',
                              padding: '10px 14px',
                              borderRadius: '12px',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                              boxShadow: '0 4px 12px rgba(220,38,38,0.25)'
                            }}
                            className="hover-scale"
                          >
                            <span>🌡️</span>
                            {reportingSick ? 'Speichert...' : teacher?.sick_until ? 'Zeitraum anpassen' : 'Krankmeldung absenden'}
                          </button>

                          {teacher?.sick_until && (
                            <button
                              onClick={handleEndSick}
                              disabled={reportingSick}
                              style={{
                                background: '#ffffff',
                                color: '#166534',
                                border: '1.5px solid #16a34a',
                                padding: '10px 14px',
                                borderRadius: '12px',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              className="hover-scale"
                            >
                              ✅ Wieder gesund melden
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {!teacher?.sick_until && (
                <>
                  {/* INFOS DER VERWALTUNG */}
                  <div style={{ 
                background: '#ffffff', 
                borderRadius: '24px', 
                padding: '24px', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
              }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bell size={18} color="#ef4444" />
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Infos der Verwaltung</h3>
                  </div>
                </div>

                {/* Offen / Erledigt Switch */}
                <div style={{
                  display: 'inline-flex',
                  background: '#f1f5f9',
                  borderRadius: '12px',
                  padding: '3px',
                  marginBottom: '16px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  {(['open', 'done'] as const).map(tab => {
                    const isActive = adminFeedbackTab === tab;
                    const openCount = adminFeedbackRequests.filter(r => !adminFeedbackResponses.find(res => res.request_id === r.id)).length;
                    const label = tab === 'open' ? `Offen${openCount > 0 ? ` (${openCount})` : ''}` : 'Erledigt';
                    return (
                      <button
                        key={tab}
                        onClick={() => setAdminFeedbackTab(tab)}
                        style={{
                          flex: 1,
                          padding: '7px 0',
                          borderRadius: '9px',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: '0.76rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          background: isActive ? '#ffffff' : 'transparent',
                          color: isActive ? '#1e293b' : '#64748b',
                          boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {(() => {
                    if (adminFeedbackRequests.length === 0) {
                      return (
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                          Keine aktuellen Mitteilungen oder Anfragen vorhanden.
                        </span>
                      );
                    }

                    if (adminFeedbackTab === 'open') {
                      const openItems = adminFeedbackRequests.filter(r => !adminFeedbackResponses.find(res => res.request_id === r.id));
                      if (openItems.length === 0) {
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '12px 0', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Alle Anfragen beantwortet!</span>
                          </div>
                        );
                      }
                      return openItems.map((item, idx) => {
                        const isResponding = respondingToRequestId === item.id;
                        return (
                          <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 8px', borderRadius: '6px', background: '#fee2e2', color: '#991b1b' }}>
                                Aktion erforderlich
                              </span>
                              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>
                                {new Date(item.created_at).toLocaleDateString('de-DE')}
                              </span>
                            </div>
                            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>{item.title}</h4>
                            {item.description && (
                              <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569', lineHeight: 1.4, fontWeight: 500 }}>{item.description}</p>
                            )}
                            <div style={{ marginTop: '4px' }}>
                              {isResponding ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <textarea
                                    value={responseTextInput}
                                    onChange={(e) => setResponseTextInput(e.target.value)}
                                    placeholder="Schreibe deine Antwort an die Verwaltung..."
                                    rows={2}
                                    style={{
                                      width: '100%',
                                      padding: '8px 10px',
                                      borderRadius: '10px',
                                      border: '1px solid #cbd5e1',
                                      fontSize: '0.78rem',
                                      fontFamily: 'inherit',
                                      outline: 'none',
                                      resize: 'none',
                                      boxSizing: 'border-box'
                                    }}
                                  />
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                      onClick={() => handleSubmitFeedbackResponse(item.id)}
                                      disabled={submittingFeedback || !responseTextInput.trim()}
                                      style={{ flex: 1, background: '#171717', color: '#ffffff', border: 'none', padding: '7px 12px', borderRadius: '8px', fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer' }}
                                    >
                                      Senden
                                    </button>
                                    <button
                                      onClick={() => { setRespondingToRequestId(null); setResponseTextInput(''); }}
                                      style={{ background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', padding: '7px 12px', borderRadius: '8px', fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer' }}
                                    >
                                      Abbrechen
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setRespondingToRequestId(item.id); setResponseTextInput(''); }}
                                  style={{ background: 'transparent', color: '#0b57d0', border: '1px solid #0b57d0', padding: '6px 12px', borderRadius: '8px', fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                  className="hover-scale"
                                >
                                  Rückmeldung geben
                                </button>
                              )}
                            </div>
                            {idx < openItems.length - 1 && <div style={{ height: '1px', background: '#f1f5f9', marginTop: '10px' }} />}
                          </div>
                        );
                      });
                    }

                    // Erledigt tab – max 5 most recent
                    const doneItems = adminFeedbackRequests
                      .filter(r => adminFeedbackResponses.find(res => res.request_id === r.id))
                      .slice(0, 5);
                    if (doneItems.length === 0) {
                      return (
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                          Noch keine erledigten Rückmeldungen.
                        </span>
                      );
                    }
                    return doneItems.map((item, idx) => {
                      const response = adminFeedbackResponses.find(res => res.request_id === item.id);
                      return (
                        <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 8px', borderRadius: '6px', background: '#d1fae5', color: '#065f46' }}>
                              Erledigt
                            </span>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>
                              {new Date(item.created_at).toLocaleDateString('de-DE')}
                            </span>
                          </div>
                          <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>{item.title}</h4>
                          {response && (
                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 12px', borderRadius: '10px', marginTop: '2px' }}>
                              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginBottom: '2px' }}>Deine Rückmeldung:</div>
                              <div style={{ fontSize: '0.78rem', color: '#14532d', fontStyle: 'italic', fontWeight: 500 }}>{response.response_text}</div>
                            </div>
                          )}
                          {idx < doneItems.length - 1 && <div style={{ height: '1px', background: '#f1f5f9', marginTop: '10px' }} />}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* LIVE CAMPUS FEED */}
              <div style={{ 
                background: '#ffffff', 
                borderRadius: '24px', 
                padding: '24px', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <Sparkles size={18} color="#eab308" />
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Campus Feed</h3>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {campusFeedAnnouncements.length === 0 ? (
                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                      Keine aktuellen Campus-Mitteilungen vorhanden.
                    </span>
                  ) : (
                    campusFeedAnnouncements.slice(0, 5).map((item, idx, arr) => {
                      return (
                        <div key={item.id} style={{
                          paddingBottom: idx === arr.length - 1 ? '0' : '16px',
                          borderBottom: idx === arr.length - 1 ? 'none' : '1px solid #f1f5f9',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{
                              fontSize: '9px',
                              fontWeight: 800,
                              color: '#475569',
                              background: '#f1f5f9',
                              padding: '2px 8px',
                              borderRadius: '100px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em'
                            }}>
                              {item.target_type === 'all' ? 'Alle' : item.target_type === 'teachers' ? 'Lehrer' : 'Mitteilung'}
                            </span>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 650 }}>
                              {new Date(item.created_at).toLocaleDateString('de-DE')}
                            </span>
                          </div>
                          
                          <h5 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                            {item.title}
                          </h5>
                          
                          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, fontWeight: 500, lineHeight: 1.4 }}>
                            {item.content}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
                </>
              )}
            </aside>
          </div>
        ) : activeTab === 'live' ? (
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
              const verticalOffset = parentHeaderHeight + (!hideHeader && rooms.length > 1 ? 54 : 0);
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
                const { minX, maxX, minY, maxY } = getCompressedRoomCoordinates(rStations, aspect);

                const bW = Math.max(100, maxX - minX);
                const bH = Math.max(100, maxY - minY);
                return Math.min(containerWidth / bW, maxH / bH);
              }).filter((s): s is number => s !== null);

              if (customLayoutScales.length > 0) {
                unifiedScale = Math.min(1.0, ...customLayoutScales);
              }

              const rawRoomAspectRatio = (activeRoom && activeRoom.room_width && activeRoom.room_height)
                ? activeRoom.room_width / activeRoom.room_height
                : 1.0;

              // Calculate bounding box and compressed coordinates of all nodes for active room
              const compressedActiveLayout = getCompressedRoomCoordinates(roomStations, rawRoomAspectRatio);
              const minBoundX = compressedActiveLayout.minX;
              const maxBoundX = compressedActiveLayout.maxX;
              const minBoundY = compressedActiveLayout.minY;
              const maxBoundY = compressedActiveLayout.maxY;

              const boundWidth = Math.max(100, maxBoundX - minBoundX);
              const boundHeight = Math.max(100, maxBoundY - minBoundY);

              // Use the unified scale scaled by manual zoomFactor
              const scale = unifiedScale * zoomFactor;

              return (
                <div 
                  ref={containerRef}
                  style={{ display: 'flex', flexDirection: 'column', gap: rooms.length > 1 ? '16px' : '0px', maxWidth: 'none', width: '100%', alignItems: 'center' }}
                >
                  {/* Unified Header Row / Toolbar Row */}
                  {hideHeader ? (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                      marginBottom: '16px',
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                        <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#1e293b', letterSpacing: '-0.04em', margin: 0 }}>
                          Live Lab
                        </h1>
                        
                        {/* Room Switcher inline next to title */}
                        {rooms.length > 1 && (
                          <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '5px', borderRadius: '14px' }}>
                            {rooms.map((room, idx) => {
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
                                    padding: '6px 12px',
                                    borderRadius: '10px',
                                    fontSize: '0.8rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                                    transition: 'all 0.2s'
                                  }}
                                  className="hover-scale-mini"
                                >
                                  {(() => {
                                    const cleanName = cleanRoomName(room.name);
                                    return `${idx + 1} - ${cleanName}`;
                                  })()}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Magnifier Zoom Panel inline */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#f1f5f9',
                          padding: '5px',
                          borderRadius: '14px'
                        }}>
                          <button 
                            onClick={() => handleZoomChange(Math.max(0.4, zoomFactor - 0.1))}
                            style={{
                              background: 'white',
                              border: '1px solid rgba(0, 0, 0, 0.05)',
                              borderRadius: '10px',
                              width: '30px',
                              height: '30px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#64748b',
                              cursor: 'pointer',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                              transition: 'all 0.2s'
                            }}
                            className="hover-scale-mini"
                            title="Verkleinern"
                          >
                            <ZoomOut size={15} />
                          </button>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', padding: '0 6px', minWidth: '40px', textAlign: 'center' }}>
                            {Math.round(zoomFactor * 100)}%
                          </span>
                          <button 
                            onClick={() => handleZoomChange(Math.min(2.5, zoomFactor + 0.1))}
                            style={{
                              background: 'white',
                              border: '1px solid rgba(0, 0, 0, 0.05)',
                              borderRadius: '10px',
                              width: '30px',
                              height: '30px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#64748b',
                              cursor: 'pointer',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                              transition: 'all 0.2s'
                            }}
                            className="hover-scale-mini"
                            title="Vergrößern"
                          >
                            <ZoomIn size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Sidebar toggle button on the far right */}
                      {setIsSidebarCollapsed && (
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
                            transition: 'all 0.15s'
                          }}
                          className="hover-scale"
                        >
                          {isSidebarCollapsed ? (
                            <>
                              <ChevronLeft size={16} /> Sidebar einblenden
                              {viewMode === 'student' && sidebarNotificationsCount > 0 && (
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
                    </div>
                  ) : (
                    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '16px', flexWrap: 'wrap' }}>
                      {rooms.length > 1 ? (
                        <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '6px', borderRadius: '16px' }}>
                          {rooms.map((room, idx) => {
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
                                  {(() => {
                                    const cleanName = cleanRoomName(room.name);
                                    return `${idx + 1} - ${cleanName}`;
                                  })()}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div />
                      )}

                      {/* Magnifier Zoom Panel */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#f1f5f9',
                        padding: '6px',
                        borderRadius: '16px'
                      }}>
                        <button 
                          onClick={() => handleZoomChange(Math.max(0.4, zoomFactor - 0.1))}
                          style={{
                            background: 'white',
                            border: '1px solid rgba(0, 0, 0, 0.05)',
                            borderRadius: '12px',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#64748b',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                            transition: 'all 0.2s'
                          }}
                          className="hover-scale-mini"
                          title="Verkleinern"
                        >
                          <ZoomOut size={18} />
                        </button>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748b', padding: '0 8px', minWidth: '48px', textAlign: 'center' }}>
                          {Math.round(zoomFactor * 100)}%
                        </span>
                        <button 
                          onClick={() => handleZoomChange(Math.min(2.5, zoomFactor + 0.1))}
                          style={{
                            background: 'white',
                            border: '1px solid rgba(0, 0, 0, 0.05)',
                            borderRadius: '12px',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#64748b',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                            transition: 'all 0.2s'
                          }}
                          className="hover-scale-mini"
                          title="Vergrößern"
                        >
                          <ZoomIn size={18} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Horizontal Flex Wrapper for Blueprint Layout and Slider */}
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '24px', justifyContent: 'center', width: '100%', position: 'relative' }}>
                    {/* Scaled room blueprint to fit parent width and height without scrolling or overlaps */}
                    <div 
                      className="blueprint-viewport"
                      style={{ 
                        flex: 1, 
                        minWidth: 0,
                        maxWidth: '100%', 
                        height: `${maxH}px`, 
                        overflow: 'auto', 
                        background: 'transparent', 
                        border: '1.5px dashed rgba(99, 102, 241, 0.15)', 
                        borderRadius: '24px', 
                        display: 'block', 
                        boxSizing: 'border-box', 
                        padding: '16px' 
                      }}
                    >
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

                        {compressedActiveLayout.stations.map(station => {
                          const sName = station.rawStation.name || '';
                          const isTeacher = sName.toLowerCase().includes('lehrer') || sName.toLowerCase().includes('teacher');
                          const instColor = station.rawStation.color && station.rawStation.color !== '#e5e7eb' && station.rawStation.color !== '#e2e8f0'
                            ? station.rawStation.color
                            : getStationColor(sName);

                          // Align center coordinates relative to the bounding box
                          const alignedX = station.cx - minBoundX;
                          const alignedY = station.cy - minBoundY;

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
                                <CoachesNode coaches={coaches} onProfileSelect={setSelectedCoachProfile} activePlatform={activePlatform} />
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
                                customName={station.rawStation.name}
                                color={instColor}
                                inst={station.rawStation.instrument || 'Tablet'}
                                sess={sess}
                                isMe={sess?.user_id === userId}
                                viewMode={viewMode}
                                onProfileSelect={setSelectedStudentProfile}
                                onLogout={handleLogoutStudent}
                                hasHelpRequest={helpRequests.some(r => r.station_id === station.id)}
                                activePlatform={activePlatform}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
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
                    {rooms.map((room, idx) => {
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
                          {(() => {
                            const cleanName = cleanRoomName(room.name);
                            return `${idx + 1} - ${cleanName}`;
                          })()}
                        </button>
                      );
                    })}
                  </div>
                )}
                {/* Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '24px', background: '#ffffff', padding: '24px', borderRadius: '32px', border: '1px solid #e2e8f0' }}>
                  {/* Coaches Node */}
                  <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                    <CoachesNode coaches={coaches} onProfileSelect={setSelectedCoachProfile} activePlatform={activePlatform} />
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
                          activePlatform={activePlatform}
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
            overflowY: isSidebarCollapsed ? 'hidden' : 'auto',
            overflowX: 'hidden',
            maxHeight: `${windowHeight - 160}px`,
            paddingRight: '6px',
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
                          <AvatarImage src={reqUser?.photo_url} user={reqUser} activePlatform={activePlatform} />
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
                            <AvatarImage src={sub.users?.photo_url} user={sub.users} activePlatform={activePlatform} />
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

            {/* Band-Repertoire Planer Widget (Dark-themed purple to match the song card!) - Reordered and hover effect removed */}
            {openProposals.length > 0 && (
              <div 
                className="glass-panel card" 
                onClick={() => setActiveTab('proposals')}
                style={{ 
                  padding: '24px', 
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #0f0728 100%)', 
                  border: '1px solid rgba(165, 180, 252, 0.15)',
                  borderRadius: '32px',
                  boxShadow: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  marginBottom: '16px'
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
                                display: 'flex',
                                flexWrap: 'wrap',
                                overflow: 'hidden',
                                minHeight: '260px'
                              }}>
                                {/* Left Panel: Band & Song Info */}
                                <div style={{ 
                                  flex: '1 1 320px',
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
                                <div style={{ flex: '1 1 400px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
      ) : activeTab === 'students' ? (
        <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap', width: '100%' }}>
          {/* Main Column */}
          <div style={{ flex: 3, minWidth: '400px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Search & Actions Bar */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  placeholder="Schüler suchen..." 
                  value={studentSearch} 
                  onChange={e => setStudentSearch(e.target.value)} 
                  style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: '24px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.9rem', outline: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }} 
                />
              </div>
            </div>

            {/* A-Z Schnellsuche */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', background: 'white', padding: '12px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
              <button 
                onClick={() => setStudentLetter(null)}
                style={{
                  background: studentLetter === null ? '#8b5cf6' : 'transparent',
                  color: studentLetter === null ? 'white' : '#64748b',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                ALLE
              </button>
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => {
                const isActive = studentLetter === letter;
                const hasStudents = allStudents.some(s => (s.first_name || '').toUpperCase().startsWith(letter));
                return (
                  <button
                    key={letter}
                    onClick={() => setStudentLetter(isActive ? null : letter)}
                    style={{
                      background: isActive ? '#8b5cf6' : 'transparent',
                      color: isActive ? 'white' : hasStudents ? '#1e293b' : '#cbd5e1',
                      border: 'none',
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      fontSize: '0.78rem',
                      fontWeight: isActive ? 950 : 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>

            {/* Students Grid */}
            {(() => {
              const filtered = allStudents.filter(student => {
                const matchesSearch = (student.first_name || '').toLowerCase().includes(studentSearch.toLowerCase()) || 
                                      (student.last_name || '').toLowerCase().includes(studentSearch.toLowerCase());
                const matchesLetter = studentLetter ? (student.first_name || '').toUpperCase().startsWith(studentLetter) : true;
                const matchesInstrument = studentInstrumentFilter === 'all' || 
                  (student.instrument && student.instrument.toLowerCase().trim() === studentInstrumentFilter.toLowerCase().trim());
                return matchesSearch && matchesLetter && matchesInstrument;
              });

              if (filtered.length === 0) {
                return (
                  <div className="google-card" style={{ padding: '60px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '3rem' }}>🔍</div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Keine Schüler gefunden</h3>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', maxWidth: '360px', margin: 0 }}>
                      Passe deine Suche oder den A-Z Schnellfilter an, oder erstelle einen neuen Schüler.
                    </p>
                  </div>
                );
              }

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                  {filtered.map(student => {
                    const isSessionActive = activeSessions.some(sess => sess.user_id === student.id);
                    return (
                      <div 
                        key={student.id} 
                        className="google-card"
                        style={{ 
                          padding: '24px', 
                          borderRadius: '24px', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '16px',
                          border: isSessionActive ? '2px solid #22c55e' : '1px solid #e2e8f0',
                          cursor: 'pointer'
                        }}
                        onClick={() => setSelectedStudentProfile(student)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '16px', overflow: 'hidden', border: '2px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', flexShrink: 0 }}>
                            <AvatarImage src={student.photo_url} user={student} activePlatform={activePlatform} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 900, fontSize: '1rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {student.first_name} {student.last_name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                              <span style={{ 
                                background: student.status === 'active' ? '#e6f4ea' : '#f1f3f4', 
                                color: student.status === 'active' ? '#137333' : '#5f6368', 
                                padding: '2px 8px', 
                                borderRadius: '6px', 
                                fontSize: '0.62rem', 
                                fontWeight: 900,
                                textTransform: 'uppercase'
                              }}>
                                {student.status === 'active' ? 'Aktiv' : 'Inaktiv'}
                              </span>
                              {student.is_trial && (
                                <span style={{ background: '#fef7e0', color: '#b06000', padding: '2px 8px', borderRadius: '6px', fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase' }}>
                                  Test
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '16px', border: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b', fontWeight: 600 }}>Instrument:</span>
                            <span style={{ fontWeight: 800 }}>{student.instrument || 'Musiker'}</span>
                          </div>
                          {student.contract_ends_at && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#64748b', fontWeight: 600 }}>Vertrag bis:</span>
                              <span style={{ fontWeight: 800 }}>{new Date(student.contract_ends_at).toLocaleDateString('de-DE')}</span>
                            </div>
                          )}
                          {student.is_trial && student.trial_ends_at && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#64748b', fontWeight: 600 }}>Testphase bis:</span>
                              <span style={{ fontWeight: 800 }}>{new Date(student.trial_ends_at).toLocaleDateString('de-DE')}</span>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }} onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setEditingStudent({
                              id: student.id,
                              first_name: student.first_name,
                              last_name: student.last_name,
                              birth_date: student.birth_date || '',
                              status: student.status || 'active',
                              is_trial: student.is_trial || false,
                              trial_ends_at: student.trial_ends_at || '',
                              contract_ends_at: student.contract_ends_at || '',
                              is_external_vocalist: student.is_external_vocalist || false
                            })}
                            style={{
                              flex: 1,
                              background: '#f1f5f9',
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: '12px',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              color: '#475569',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <Edit3 size={14} /> Bearbeiten
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student.id)}
                            style={{
                              background: '#fee2e2',
                              border: 'none',
                              width: '36px',
                              height: '36px',
                              borderRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ef4444',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Schüler Sidebar */}
          <aside style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Schüler-Statistik Card without limit block */}
            <div style={{ padding: '24px', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 900, color: '#1e293b' }}>
                Schüler-Statistik
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: '16px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Gesamt registriert</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 950, color: '#8b5cf6' }}>{allStudents.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: '16px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>In Testphase (Trial)</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 950, color: '#d97706' }}>{allStudents.filter(s => s.is_trial).length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: '16px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Inaktive Schüler</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 950, color: '#64748b' }}>{allStudents.filter(s => s.status === 'inactive').length}</span>
                </div>
              </div>
            </div>

            {/* Premium Instrument Avatar Filter Widget */}
            {(() => {
              const widgetUniqueInstruments = Array.from(new Set(
                allStudents
                  .map((s: any) => s.instrument)
                  .filter((inst: string) => inst && inst.trim().length > 0)
              )) as string[];

              return (
                <div className="google-card" style={{ padding: '20px', borderRadius: '24px', border: '1px solid #cbd5e1', background: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', fontFamily: 'Urbanist' }}>
                    Instrumenten-Filter
                  </h3>
                  
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    width: '100%'
                  }}>
                    {/* ALL Button */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <button
                        onClick={() => setStudentInstrumentFilter('all')}
                        title="Alle Instrumente anzeigen"
                        style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '20px',
                          border: studentInstrumentFilter === 'all' ? '2.5px solid #8b5cf6' : '1px solid #cbd5e1',
                          background: studentInstrumentFilter === 'all' ? '#ffffff' : '#f1f5f9',
                          color: '#1e293b',
                          fontSize: '0.9rem',
                          fontWeight: 900,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          fontFamily: 'Urbanist',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          boxShadow: studentInstrumentFilter === 'all' ? '0 4px 12px -2px rgba(139, 92, 246, 0.2)' : 'none',
                          transform: studentInstrumentFilter === 'all' ? 'scale(1.08)' : 'scale(1)'
                        }}
                        onMouseEnter={(e) => {
                          if (studentInstrumentFilter !== 'all') {
                            e.currentTarget.style.borderColor = '#8b5cf6';
                            e.currentTarget.style.background = '#ffffff';
                            e.currentTarget.style.transform = 'translateY(-1px) scale(1.03)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (studentInstrumentFilter !== 'all') {
                            e.currentTarget.style.borderColor = '#cbd5e1';
                            e.currentTarget.style.background = '#f1f5f9';
                            e.currentTarget.style.transform = 'scale(1)';
                          }
                        }}
                      >
                        ALL
                      </button>
                      <span style={{ fontSize: '0.62rem', color: studentInstrumentFilter === 'all' ? '#0f172a' : '#64748b', fontWeight: 800, fontFamily: 'Urbanist' }}>Alle</span>
                    </div>

                    {/* Dynamic Instrument Avatars */}
                    {widgetUniqueInstruments.map((inst: string) => {
                      const instLower = inst.toLowerCase().trim();
                      
                      // Determine visual photo files based on instrument name
                      let imgFile = 'guitar_avatar.png';
                      if (instLower.includes('klavier') || instLower.includes('piano') || instLower.includes('tasten')) {
                        imgFile = 'piano_avatar.png';
                      } else if (instLower.includes('gitar') || instLower.includes('guitar')) {
                        imgFile = 'guitar_avatar.png';
                      } else if (instLower.includes('bass')) {
                        imgFile = 'bass_avatar.png';
                      } else if (instLower.includes('schlag') || instLower.includes('drum') || instLower.includes('percussion')) {
                        imgFile = 'drums_avatar.png';
                      } else if (instLower.includes('gesang') || instLower.includes('stimme') || instLower.includes('sing') || instLower.includes('vocals')) {
                        imgFile = 'vocals_avatar.png';
                      } else if (instLower.includes('geige') || instLower.includes('violine') || instLower.includes('streich') || instLower.includes('cello')) {
                        imgFile = instLower.includes('cello') ? 'cello_avatar.png' : 'violin_avatar.png';
                      } else if (instLower.includes('sax')) {
                        imgFile = 'saxophone_avatar.png';
                      } else if (instLower.includes('klarinette')) {
                        imgFile = 'clarinet_avatar.png';
                      } else if (instLower.includes('flöte')) {
                        imgFile = 'flute_avatar.png';
                      } else if (instLower.includes('horn')) {
                        imgFile = 'horn_avatar.png';
                      } else if (instLower.includes('posaune')) {
                        imgFile = 'trombone_avatar.png';
                      } else if (instLower.includes('trompete')) {
                        imgFile = 'trumpet_avatar.png';
                      } else {
                        imgFile = 'guitar_avatar.png';
                      }

                      const isActive = studentInstrumentFilter.toLowerCase().trim() === instLower;

                      return (
                        <div key={inst} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <button
                            onClick={() => setStudentInstrumentFilter(inst)}
                            title={inst}
                            style={{
                              width: '60px',
                              height: '60px',
                              borderRadius: '20px',
                              border: isActive ? '2.5px solid #8b5cf6' : '1px solid #cbd5e1',
                              background: isActive ? '#ffffff' : '#f1f5f9',
                              padding: 0,
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                              boxShadow: isActive ? '0 4px 12px -2px rgba(139, 92, 246, 0.2)' : 'none',
                              transform: isActive ? 'scale(1.08)' : 'scale(1)'
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.borderColor = '#8b5cf6';
                                e.currentTarget.style.background = '#ffffff';
                                e.currentTarget.style.transform = 'translateY(-1px) scale(1.03)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive) {
                                  e.currentTarget.style.borderColor = '#cbd5e1';
                                  e.currentTarget.style.background = '#f1f5f9';
                                  e.currentTarget.style.transform = 'scale(1)';
                                }
                            }}
                          >
                            <img 
                              src={`/avatars/${imgFile}`} 
                              alt={inst} 
                              style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'cover',
                                opacity: isActive ? 1 : 0.65,
                                transition: 'opacity 0.2s'
                              }} 
                            />
                          </button>
                          <span style={{ 
                            fontSize: '0.62rem', 
                            color: isActive ? '#0f172a' : '#64748b', 
                            fontWeight: 800, 
                            fontFamily: 'Urbanist',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '70px'
                          }}>
                            {inst}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Active Filter Pill */}
                  {studentInstrumentFilter !== 'all' && (
                    <div style={{
                      alignSelf: 'flex-start',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      background: '#f5f3ff',
                      border: '1px solid #ddd6fe',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      animation: 'fadeIn 0.2s ease-out'
                    }}>
                      <span style={{ fontSize: '0.68rem', color: '#6d28d9', fontWeight: 800, fontFamily: 'Urbanist' }}>
                        Aktiv: {studentInstrumentFilter}
                      </span>
                      <button
                        onClick={() => setStudentInstrumentFilter('all')}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#ef4444',
                          fontSize: '0.75rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          borderRadius: '50%',
                          width: '16px',
                          height: '16px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#fee2e2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                        title="Filter aufheben"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            <div style={{ padding: '24px', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 900, color: '#1e293b' }}>
                Onboarding-Tipps
              </h3>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.78rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '8px', fontWeight: 600, lineHeight: 1.4 }}>
                <li>Der QR-Code wird automatisch generiert und dient als Login-Token.</li>
                <li>Schüler können sich selbst ins Live Lab einchecken, indem sie ihren QR-Code an die iPad-Station halten.</li>
                <li>Mitglieder der Testphase werden besonders markiert.</li>
              </ul>
            </div>
          </aside>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap', width: '100%' }}>
          {/* Main Column */}
          <div style={{ flex: 3, minWidth: '400px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <input 
              placeholder="Band suchen..." 
              value={bandSearch} 
              onChange={e => setBandSearch(e.target.value)} 
              style={{ width: '100%', padding: '16px 20px', borderRadius: '24px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.9rem', outline: 'none' }} 
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {allBands.filter(b => b.name.toLowerCase().includes(bandSearch.toLowerCase())).map(band => (
                <div 
                  key={band.id} 
                  onClick={() => onOpenBandProfile?.(band)} 
                  className="google-card" 
                  style={{ padding: '24px', borderRadius: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px' }}
                >
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 950, color: '#1e293b' }}>{band.name}</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Mitglieder</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0b57d0' }}>
                      {(() => { const ids = (band.band_members || []).map((m: any) => m.user_id || m.student_id || m.external_name).filter(Boolean); return new Set(ids).size; })()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bands Right Sidebar */}
          <aside style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ padding: '24px', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 900, color: '#1e293b' }}>
                Band-Übersicht
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: '16px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Gesamt Bands</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 950, color: '#0b57d0' }}>{allBands.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: '16px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Offene Song-Vorschläge</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 950, color: '#b06000' }}>{openProposals.length}</span>
                </div>
              </div>
            </div>

            <div style={{ padding: '24px', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 900, color: '#1e293b' }}>
                Coaching Leitfaden
              </h3>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.78rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '8px', fontWeight: 600, lineHeight: 1.4 }}>
                <li>🎸 <b>Fokus auf Rhythmus</b>: Lass die Bands langsam starten und das Timing festigen.</li>
                <li>🎤 <b>Gesang lauter</b>: Stelle sicher, dass Sänger klar verständlich über der Band liegen.</li>
                <li>🎹 <b>Klangauswahl</b>: Keys sollten Frequenzlücken füllen, nicht die Gitarren überdecken.</li>
                <li>📝 <b>Abstimmungen</b>: Überprüfe regelmäßig die ausstehenden Songs im Repertoire Planer.</li>
              </ul>
            </div>
          </aside>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudent && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          zIndex: 1500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            background: 'white',
            border: '1.5px solid #e2e8f0',
            borderRadius: '32px',
            width: '100%',
            maxWidth: '500px',
            padding: '32px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 950, color: '#1e293b', margin: 0 }}>Neuen Schüler anlegen</h3>
              <button 
                onClick={() => setShowAddStudent(false)}
                style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddStudent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Vorname *</label>
                  <input 
                    type="text" 
                    required
                    value={newStudent.firstName} 
                    onChange={e => setNewStudent({...newStudent, firstName: e.target.value})} 
                    style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Nachname *</label>
                  <input 
                    type="text" 
                    required
                    value={newStudent.lastName} 
                    onChange={e => setNewStudent({...newStudent, lastName: e.target.value})} 
                    style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>E-Mail (optional)</label>
                <input 
                  type="email"
                  value={newStudent.email} 
                  onChange={e => setNewStudent({...newStudent, email: e.target.value})} 
                  placeholder="schueler@example.com"
                  style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="isExternalVocalist"
                  checked={newStudent.isExternalVocalist} 
                  onChange={e => setNewStudent({...newStudent, isExternalVocalist: e.target.checked})} 
                />
                <label htmlFor="isExternalVocalist" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>Externer Sänger (Vocals)</label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="isTrial"
                  checked={newStudent.is_trial} 
                  onChange={e => setNewStudent({...newStudent, is_trial: e.target.checked})} 
                />
                <label htmlFor="isTrial" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>In Testphase (Trial)</label>
              </div>

              {newStudent.is_trial && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Testphase Ende</label>
                  <input 
                    type="date" 
                    value={newStudent.trial_ends_at} 
                    onChange={e => setNewStudent({...newStudent, trial_ends_at: e.target.value})} 
                    style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Vertragsende (optional)</label>
                <input 
                  type="date" 
                  value={newStudent.contract_ends_at} 
                  onChange={e => setNewStudent({...newStudent, contract_ends_at: e.target.value})} 
                  style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowAddStudent(false)}
                  style={{ flex: 1, padding: '14px', borderRadius: '16px', border: '1.5px solid #e2e8f0', background: 'white', fontWeight: 800, color: '#475569', cursor: 'pointer' }}
                >
                  Abbrechen
                </button>
                <button 
                  type="submit" 
                  style={{ flex: 1, padding: '14px', borderRadius: '16px', border: 'none', background: '#8b5cf6', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)' }}
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          zIndex: 1500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            background: 'white',
            border: '1.5px solid #e2e8f0',
            borderRadius: '32px',
            width: '100%',
            maxWidth: '500px',
            padding: '32px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 950, color: '#1e293b', margin: 0 }}>Schüler bearbeiten</h3>
              <button 
                onClick={() => setEditingStudent(null)}
                style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Vorname</label>
                <input 
                  type="text" 
                  required
                  value={editingStudent.first_name} 
                  onChange={e => setEditingStudent({...editingStudent, first_name: e.target.value})} 
                  style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Nachname</label>
                <input 
                  type="text" 
                  required
                  value={editingStudent.last_name} 
                  onChange={e => setEditingStudent({...editingStudent, last_name: e.target.value})} 
                  style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Status</label>
                <select 
                  value={editingStudent.status}
                  onChange={e => setEditingStudent({...editingStudent, status: e.target.value})}
                  style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '0.9rem', background: 'white' }}
                >
                  <option value="active">Aktiv</option>
                  <option value="inactive">Inaktiv</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="editIsExternalVocalist"
                  checked={editingStudent.is_external_vocalist} 
                  onChange={e => setEditingStudent({...editingStudent, is_external_vocalist: e.target.checked})} 
                />
                <label htmlFor="editIsExternalVocalist" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>Externer Sänger (Vocals)</label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="editIsTrial"
                  checked={editingStudent.is_trial} 
                  onChange={e => setEditingStudent({...editingStudent, is_trial: e.target.checked})} 
                />
                <label htmlFor="editIsTrial" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>In Testphase (Trial)</label>
              </div>

              {editingStudent.is_trial && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Testphase Ende</label>
                  <input 
                    type="date" 
                    value={editingStudent.trial_ends_at ? editingStudent.trial_ends_at.substring(0, 10) : ''} 
                    onChange={e => setEditingStudent({...editingStudent, trial_ends_at: e.target.value})} 
                    style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Vertragsende (optional)</label>
                <input 
                  type="date" 
                  value={editingStudent.contract_ends_at ? editingStudent.contract_ends_at.substring(0, 10) : ''} 
                  onChange={e => setEditingStudent({...editingStudent, contract_ends_at: e.target.value})} 
                  style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setEditingStudent(null)}
                  style={{ flex: 1, padding: '14px', borderRadius: '16px', border: '1.5px solid #e2e8f0', background: 'white', fontWeight: 800, color: '#475569', cursor: 'pointer' }}
                >
                  Abbrechen
                </button>
                <button 
                  type="submit" 
                  style={{ flex: 1, padding: '14px', borderRadius: '16px', border: 'none', background: '#8b5cf6', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)' }}
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
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
                   <h2 style={{ fontSize: '28px', fontWeight: 1000, color: '#0f172a', margin: 0 }}>Vollständige Pipeline</h2>
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
                       <AvatarImage src={sub.users?.photo_url} user={sub.users} activePlatform={activePlatform} />
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

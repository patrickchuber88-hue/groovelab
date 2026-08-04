import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MUSIC_QUOTES, getQuotesForAudience, getDailyQuote } from '@groovelab/shared';
import { usePremiumOnboardingTour, TourStartButton, TourStep } from './PremiumOnboardingTour';
import { supabase, deleteUserStorageAssets } from '../lib/supabase';
import { Monitor, Music, Award, Box, Plus, AlertCircle, AlertTriangle, User, Users, Star, TrendingUp, Shield, Zap, Play, Info, CheckCircle, Check, Search, Trash2, Bell, X, Clock, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, LayoutDashboard, LogOut, Flame, GraduationCap, UserPlus, Edit3, Calendar, Activity, CheckSquare, Mail, Copy, Sparkles, BookOpen, MessageSquare, Lock, Palmtree, Heart, Settings, Key, Sun, ThumbsUp, Building2, Hourglass, Eye, EyeOff, ShieldCheck, CheckCheck, CalendarX, Send } from 'lucide-react';
import { TeacherDetailModal } from './TeacherDetailModal';
import { StudentDetailModal } from './StudentDetailModal';
const MeisterwerkDocumentationModal = React.lazy(() => import('./MeisterwerkDocumentationModal').then(m => ({ default: m.MeisterwerkDocumentationModal })));
import { renderInstrumentIcon } from '../utils/instruments';
import { getDistanceFromLatLonInM } from '../utils/geo';
import { useRealNamesVisibility, maskLastName } from '../utils/nameHelper';
import { ConfirmDeleteStudentModal, StudentToDelete } from './ConfirmDeleteStudentModal';
import { deleteStudentFully } from '../utils/studentDeletionService';

const cleanRoomName = (name: string | null | undefined): string => {
  if (!name) return 'Unbenannter Raum';
  return name.replace(/^#\d+\s*[-:]*\s*/, '').trim();
};

const getSimulatedNow = (): Date => {
  const simStr = typeof window !== 'undefined' ? localStorage.getItem('groovelab_simulated_date') : null;
  if (!simStr) return new Date();
  
  const parts = simStr.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0])) return new Date();

  const baseSim = new Date(parts[0], parts[1] - 1, parts[2], 14, 0, 0);
  const simStartTime = Number(localStorage.getItem('groovelab_simulated_start_timestamp') || Date.now());
  const elapsedMinutes = Math.floor((Date.now() - simStartTime) / 60000);

  return new Date(baseSim.getTime() + elapsedMinutes * 60000);
};

const adjustPositions = (stations: any[], containerWidth: number = 364) => {
  const items = stations.map(s => ({
    ...s,
    x: s.pos_x !== null && s.pos_x !== undefined ? s.pos_x : 50,
    y: s.pos_y !== null && s.pos_y !== undefined ? s.pos_y : 50,
    origX: s.pos_x !== null && s.pos_x !== undefined ? s.pos_x : 50,
    origY: s.pos_y !== null && s.pos_y !== undefined ? s.pos_y : 50
  }));

  const containerHeight = containerWidth / 1.4;
  const safeMarginPx = 45;
  const safeMinX = Math.min(45, (safeMarginPx / containerWidth) * 100);
  const safeMaxX = Math.max(55, 100 - safeMinX);
  const safeMinY = Math.min(45, (safeMarginPx / containerHeight) * 100);
  const safeMaxY = Math.max(55, 100 - safeMinY);
  const minXDistPx = 76;
  const minYDistPx = 76;
  const iterations = 50;
  const minXDist = (minXDistPx / containerWidth) * 100;
  const minYDist = (minYDistPx / containerHeight) * 100;

  for (let iter = 0; iter < iterations; iter++) {
    let moved = false;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const dx = items[i].x - items[j].x;
        const dy = items[i].y - items[j].y;
        if (Math.abs(dx) < minXDist && Math.abs(dy) < minYDist) {
          moved = true;
          const isVerticallyAligned = Math.abs(items[i].origX - items[j].origX) < 6;
          const isHorizontallyAligned = Math.abs(items[i].origY - items[j].origY) < 6;
          if (isVerticallyAligned && !isHorizontallyAligned) {
            const overlapY = minYDist - Math.abs(dy);
            const forceY = dy === 0 ? (i % 2 === 0 ? 1 : -1) : Math.sign(dy);
            const pushY = forceY * (overlapY / 2);
            items[i].y += pushY;
            items[j].y -= pushY;
            items[i].x = items[i].origX;
            items[j].x = items[j].origX;
          } else if (isHorizontallyAligned && !isVerticallyAligned) {
            const overlapX = minXDist - Math.abs(dx);
            const forceX = dx === 0 ? (i % 2 === 0 ? 1 : -1) : Math.sign(dx);
            const pushX = forceX * (overlapX / 2);
            items[i].x += pushX;
            items[j].x -= pushX;
            items[i].y = items[i].origY;
            items[j].y = items[j].origY;
          } else {
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const overlapX = minXDist - Math.abs(dx);
            const overlapY = minYDist - Math.abs(dy);
            const forceX = dx === 0 ? (i % 2 === 0 ? 1 : -1) : dx / dist;
            const forceY = dy === 0 ? (i % 2 === 0 ? -1 : 1) : dy / dist;
            items[i].x += forceX * (overlapX / 2);
            items[i].y += forceY * (overlapY / 2);
            items[j].x -= forceX * (overlapX / 2);
            items[j].y -= forceY * (overlapY / 2);
          }
          items[i].x = Math.max(safeMinX, Math.min(safeMaxX, items[i].x));
          items[i].y = Math.max(safeMinY, Math.min(safeMaxY, items[i].y));
          items[j].x = Math.max(safeMinX, Math.min(safeMaxX, items[j].x));
          items[j].y = Math.max(safeMinY, Math.min(safeMaxY, items[j].y));
        }
      }
    }
    if (!moved) break;
  }
  return items;
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
  Vocals: '#34a853'
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

const getISOWeekRaw = (dateInput?: string | Date, lessonDay: number = 1): string => {
  let date: Date;
  if (!dateInput) {
    date = new Date();
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    const match = String(dateInput).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // 0-indexed
      const day = parseInt(match[3], 10);
      date = new Date(year, month, day);
    } else {
      date = new Date(dateInput);
    }
  }
  if (isNaN(date.getTime())) {
    date = new Date();
  }

  // Adjust the date back to the most recent lesson day
  const currentDay = date.getDay(); // 0 (Sun) to 6 (Sat)
  let diff = currentDay - lessonDay;
  if (diff < 0) {
    diff += 7;
  }
  const lessonStart = new Date(date);
  lessonStart.setDate(date.getDate() - diff);

  const d = new Date(Date.UTC(lessonStart.getFullYear(), lessonStart.getMonth(), lessonStart.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
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
    'linear-gradient(135deg, #34a853, #3b82f6)', // Emerald to Blue
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
  if (isTeacher) return '/avatar_ghost.jpg';
  
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
    
    const r = (targetUser?.role || '').toLowerCase();
    if (activePlat === 'secretary') {
      return '/campus_login_hero.png';
    }
    
    if (activePlat === 'campus') {
      if (targetUser && (resolvedInstrument || targetUser.role === 'student' || targetUser.role === 'teacher')) {
        return getInstrumentAvatarUrl(resolvedInstrument);
      }
      if (src && !src.includes('_avatar.png') && !src.includes('avatar_ghost')) {
        return '/avatars/gitarre_avatar_new.png';
      }
    } else {
      const isStudent = src && (
        src.includes('student_') ||
        src.includes('bandstyle_') ||
        src.includes('teen_') ||
        src.includes('avatar_boy') ||
        src.includes('avatar_girl')
      );
      const isInstrument = !isStudent && src && (
        src.includes('avatar.png') || 
        src.includes('avatar_new') ||
        src.includes('_avatar') ||
        src.includes('guitar_avatar') || 
        src.includes('gitarre_avatar') || 
        src.includes('ebass_avatar') || 
        src.includes('egitarre_avatar') || 
        src.includes('kontrabass_avatar') || 
        src.includes('bass_avatar') || 
        src.includes('drums_avatar') || 
        src.includes('schlagzeug_avatar') || 
        src.includes('piano_avatar') || 
        src.includes('klavier_avatar') || 
        src.includes('vocals_avatar') || 
        src.includes('gesang_avatar') || 
        src.includes('trumpet_avatar') || 
        src.includes('trompete_avatar') || 
        src.includes('trombone_avatar') || 
        src.includes('posaune_avatar') || 
        src.includes('horn_avatar') || 
        src.includes('cello_avatar') || 
        src.includes('violin_avatar') || 
        src.includes('violine_avatar') || 
        src.includes('clarinet_avatar') || 
        src.includes('klarinette_avatar') || 
        src.includes('flute_avatar') || 
        src.includes('querfloete_avatar') || 
        src.includes('saxophone_avatar') || 
        src.includes('saxophon_avatar') || 
        src.includes('blockfloete_avatar') || 
        src.includes('bariton_avatar') || 
        src.includes('oboe_avatar')
      );
      if (r === 'teacher' || r === 'admin' || r === 'secretary') {
        return (src && src !== '/campus_login_hero.png') ? src : '/avatar_ghost.jpg';
      }
      if (!src || isInstrument || src === '/avatar_ghost.jpg') {
        return '/avatar_ghost.jpg';
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
  const isPortraitAvatar = displaySrc && (
    displaySrc.includes('teacher_') ||
    displaySrc.includes('avatar_teacher') ||
    displaySrc.includes('student_') ||
    displaySrc.includes('bandstyle_') ||
    displaySrc.includes('teen_') ||
    displaySrc.includes('avatar_boy') ||
    displaySrc.includes('avatar_girl')
  );

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
        onError={() => setHasError(true)}
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'cover', 
          objectPosition: isPortraitAvatar ? 'center 15%' : 'center',
          backfaceVisibility: 'hidden',
          transform: isPortraitAvatar ? 'scale(1.25)' : 'none',
          transformOrigin: 'center 20%'
        }} 
        alt=""
      />
    </div>
  );
}, (prev, next) => {
  return prev.src === next.src &&
         prev.userId === next.userId &&
         prev.activePlatform === next.activePlatform &&
         prev.user?.id === next.user?.id &&
         prev.user?.photo_url === next.user?.photo_url &&
         prev.user?.role === next.user?.role &&
         prev.user?.instrument === next.user?.instrument;
});

const getStationColor = (name: string | null | undefined, dbColor?: string | null) => {
  if (!name) return '#64748b';
  
  const isStandardIpad = /^ipad\s*\d+/i.test(name);
  if (dbColor && dbColor !== '#e5e7eb' && dbColor !== '#e2e8f0' && dbColor !== '#cbd5e1') {
    if (isStandardIpad && dbColor === '#64748b') {
      // Fall through to number-based standard color
    } else {
      return dbColor;
    }
  }

  const lowerName = name.toLowerCase();
  if (lowerName.includes('lehrer') || lowerName.includes('teacher')) return '#34a853'; // Green
  const matches = name.match(/\d+/g);
  if (!matches) return '#64748b';
  const num = parseInt(matches[matches.length - 1]);
  if (num === 1 || num === 2) return '#eab308'; // Yellow
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
          {isActive && (viewMode === 'admin' || isMe) && (
            <button 
              onClick={(e) => { e.stopPropagation(); onLogout(sess.id); }}
              style={{ 
                background: '#fef2f2', 
                border: '1px solid #fee2e2', 
                width: '20px',
                height: '20px',
                borderRadius: '50%', 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer', 
                color: '#ef4444', 
                fontSize: '10px', 
                fontWeight: 'bold', 
                transition: 'all 0.2s ease',
                flexShrink: 0,
                marginLeft: '4px',
                padding: 0
              }}
              title="Auschecken"
            >
              ✕
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
                fontWeight: isMe ? 800 : 600, 
                fontSize: '0.85rem', 
                color: isMe ? color : '#1e293b', 
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
    prev.sess?.users?.first_name === next.sess?.users?.first_name &&
    prev.sess?.songs?.title === next.sess?.songs?.title &&
    !!prev.sess === !!next.sess &&
    prev.isMe === next.isMe
  );
});

const getUniqueCoaches = (list: any[]) => {
  const filtered = (list || []).filter(Boolean);
  const sorted = [...filtered].sort((a, b) => {
    const aUser = a.users || a;
    const bUser = b.users || b;
    const aHasRole = aUser?.role === 'teacher' || aUser?.role === 'student';
    const bHasRole = bUser?.role === 'teacher' || bUser?.role === 'student';
    if (aHasRole && !bHasRole) return -1;
    if (!aHasRole && bHasRole) return 1;
    return 0;
  });

  const seenNames = new Set();
  const result = [];
  for (const item of sorted) {
    const userObj = item.users || item;
    if (userObj) {
      const fullName = `${userObj.first_name || ''} ${userObj.last_name || ''}`.trim().toLowerCase();
      if (!seenNames.has(fullName)) {
        seenNames.add(fullName);
        result.push(item);
      }
    }
  }
  return result;
};

const CoachesNode = React.memo(({ coaches, onProfileSelect, activePlatform, currentUserId, onSelfCheckout, onCoachCheckout, viewMode }: { coaches: any[], onProfileSelect: (u: any) => void, activePlatform?: string, currentUserId?: string, onSelfCheckout?: () => void, onCoachCheckout?: (coach: any) => void, viewMode?: string }) => {
  const uniqueList = getUniqueCoaches(coaches);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#34a853', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34a853', boxShadow: '0 0 12px #34a853' }}></span>
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
        {uniqueList.map((c, idx) => {
          const total = uniqueList.length;
          const offset = total > 1 ? (idx - (total - 1) / 2) * 54 : 0;
          const verticalOffset = total > 1 ? (idx % 2 === 0 ? -12 : 12) : 0;
          const labelAbove = total > 1 && idx % 2 === 0;
          const isSelf = currentUserId && c.id === currentUserId;
          return (
            <div 
              key={c.id || idx} 
              style={{ 
                position: 'absolute',
                transform: `translate(${offset}px, ${verticalOffset}px)`,
                display: 'flex',
                flexDirection: labelAbove ? 'column-reverse' : 'column',
                alignItems: 'center',
                gap: '8px',
                zIndex: 10 - idx,
              }}
            >
              <div 
                onClick={() => c.users && onProfileSelect(c.users)}
                style={{ width: '84px', height: '84px', borderRadius: '50%', border: isSelf ? '2px solid #34a853' : '2px solid white', boxShadow: isSelf ? '0 8px 20px rgba(52,168,83,0.25)' : '0 8px 20px rgba(0,0,0,0.15)', overflow: 'hidden', flexShrink: 0, cursor: 'pointer' }}>
                <AvatarImage src={c.users?.photo_url} user={c.users} activePlatform={activePlatform} />
              </div>
              <div style={{ background: 'white', padding: '5px 12px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', textAlign: 'center', minWidth: '90px', position: 'relative' }}>
                <div style={{ fontWeight: 900, color: '#1e293b', fontSize: '0.8rem' }}>{c.users?.first_name} {c.users?.last_name || ''}</div>
                <div style={{ fontSize: '0.6rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>{c.session?.stations?.name || 'Lehrer iPad'}</div>
                {viewMode === 'admin' && isSelf && onSelfCheckout ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelfCheckout(); }}
                    title="Vom Lehrer iPad abmelden"
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      background: '#ef4444',
                      border: 'none',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 900,
                      boxShadow: '0 2px 8px rgba(239,68,68,0.4)',
                      flexShrink: 0,
                      padding: 0
                    }}
                  >
                    ✕
                  </button>
                ) : (viewMode === 'admin' && !isSelf && onCoachCheckout) ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onCoachCheckout(c); }}
                    title="Lehrer abmelden"
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      background: '#ef4444',
                      border: 'none',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 900,
                      boxShadow: '0 2px 8px rgba(239,68,68,0.4)',
                      flexShrink: 0,
                      padding: 0
                    }}
                  >
                    ✕
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
        {coaches.filter(Boolean).length === 0 && <div style={{ color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 700 }}>Bereit</div>}
      </div>
    </div>
  );
}, (prev, next) => {
  const prevCoaches = (prev.coaches || []).filter(Boolean);
  const nextCoaches = (next.coaches || []).filter(Boolean);
  if (prevCoaches.length !== nextCoaches.length) return false;
  if (prev.currentUserId !== next.currentUserId) return false;
  return prevCoaches.every((c, i) => {
    const nextCoach = nextCoaches[i];
    if (!nextCoach) return false;
    return c.id === nextCoach.id && 
           c.users?.photo_url === nextCoach.users?.photo_url &&
           c.session?.id === nextCoach.session?.id;
  });
});

interface TeacherDashboardProps {
  userId: string;
  onLogout?: () => void;
  locationMode?: 'lab' | 'home';
  onLocationModeChange?: (mode: 'lab' | 'home') => void;
  session?: any;
  onSessionChange?: (sess: any) => void;
  hideHeader?: boolean;
  hideSidebar?: boolean;
  viewMode?: 'admin' | 'student';
  initialTab?: 'briefing' | 'live' | 'bands' | 'students' | 'proposals' | 'coaches';
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
  onLocationModeChange,
  session,
  onSessionChange,
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
  const { visible: showRealNames, toggleVisibility: toggleRealNames } = useRealNamesVisibility();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [activeChatOccIds, setActiveChatOccIds] = useState<Set<string>>(new Set());
  const [activeChatOcc, setActiveChatOcc] = useState<any | null>(null);
  const [confirmCancelSlotId, setConfirmCancelSlotId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatTypedMessage, setChatTypedMessage] = useState('');
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  const handleCancelSlotWithDoubleConfirm = async (slot: any) => {
    try {
      const targetSlot = slot.isGroup ? slot.slots[0] : slot;
      const slotId = targetSlot?.id;
      const scheduleId = targetSlot?.schedule_id || targetSlot?.scheduleId;
      const studentId = slot.isGroup ? slot.students[0]?.id : slot.student?.id;
      const dateStr = slot.date || (briefingData?.timeline?.[0]?.date);
      const startTime = slot.startTime || slot.timeSlot || slot.start_time || '14:00';
      const duration = slot.duration || 45;
      
      if (!dateStr) return;

      if (targetSlot?.is_virtual || (slotId && String(slotId).startsWith('virt_'))) {
        const { error } = await supabase
          .from('schedule_occurrences')
          .insert({
            schedule_id: scheduleId || null,
            student_id: studentId || null,
            teacher_id: userId,
            date: dateStr,
            start_time: startTime,
            duration: duration,
            status: 'cancelled',
            student_acknowledged: true
          });

        if (error) {
          console.error('Error inserting cancellation:', error);
          alert('Fehler beim Absagen des Termins: ' + error.message);
        } else {
          setToastMessage('Termin erfolgreich abgesagt.');
          fetchData();
        }
      } else if (slotId) {
        const { error } = await supabase
          .from('schedule_occurrences')
          .update({
            status: 'cancelled',
            student_acknowledged: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', slotId);

        if (error) {
          console.error('Error updating cancellation:', error);
          alert('Fehler beim Absagen des Termins: ' + error.message);
        } else {
          setToastMessage('Termin erfolgreich abgesagt.');
          fetchData();
        }
      } else {
        const { error } = await supabase
          .from('schedule_occurrences')
          .insert({
            schedule_id: scheduleId || null,
            student_id: studentId || null,
            teacher_id: userId,
            date: dateStr,
            start_time: startTime,
            duration: duration,
            status: 'cancelled',
            student_acknowledged: true
          });

        if (error) {
          console.error('Error inserting cancellation:', error);
          alert('Fehler beim Absagen des Termins: ' + error.message);
        } else {
          setToastMessage('Termin erfolgreich abgesagt.');
          fetchData();
        }
      }
    } catch (err: any) {
      console.error('Error in handleCancelSlotWithDoubleConfirm:', err);
    } finally {
      setConfirmCancelSlotId(null);
    }
  };

  // Fetch active conversations (occurrence_ids that have messages)
  const fetchActiveChatOccs = async () => {
    try {
      const { data: activeChats } = await supabase
        .from('campus_direct_messages')
        .select('occurrence_id');

      if (activeChats) {
        const occIds = new Set<string>(activeChats.map((c: any) => c.occurrence_id).filter(Boolean));
        setActiveChatOccIds(occIds);
      }
    } catch (err) {
      console.error('Error fetching active chat occurrences:', err);
    }
  };

  const fetchChatMessages = async (occurrenceId: string) => {
    if (!userId || !occurrenceId) return;
    try {
      const { data, error } = await supabase
        .from('campus_direct_messages')
        .select('*')
        .eq('occurrence_id', occurrenceId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (data) {
        setChatMessages(data);
        setTimeout(() => chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
      }
    } catch (err) {
      console.error('Error fetching chat messages for occurrence:', err);
    }
  };

  useEffect(() => {
    fetchActiveChatOccs();

    const channel = supabase
      .channel('realtime_tagesplan_shouts')
      .on('postgres_changes', {
        schema: 'public',
        event: '*',
        table: 'campus_direct_messages'
      }, () => {
        fetchActiveChatOccs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!activeChatOcc) {
      setChatMessages([]);
      return;
    }

    fetchChatMessages(activeChatOcc.id);

    const channel = supabase
      .channel(`chat_occ_dashboard_${activeChatOcc.id}`)
      .on('postgres_changes', { 
        schema: 'public', 
        event: '*', 
        table: 'campus_direct_messages', 
        filter: `occurrence_id=eq.${activeChatOcc.id}` 
      }, () => {
        fetchChatMessages(activeChatOcc.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChatOcc, userId]);

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatTypedMessage.trim() || !activeChatOcc) return;
    
    const recipientId = activeChatOcc.student_id;
    if (!recipientId) return;

    try {
      const { error } = await supabase
        .from('campus_direct_messages')
        .insert({
          sender_id: userId,
          recipient_id: recipientId,
          content: chatTypedMessage.trim(),
          occurrence_id: activeChatOcc.id,
          read_by: [userId]
        });

      if (error) throw error;
      setChatTypedMessage('');
      fetchChatMessages(activeChatOcc.id);
      fetchActiveChatOccs();
    } catch (err) {
      console.error('Error sending chat message:', err);
    }
  };

  // Auto-dismiss toast message after 5 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Listen to school-wide Live Lab events (e.g. band founded)
  useEffect(() => {
    const schoolId = teacher?.school_id || (session?.users?.school_id);
    if (!schoolId) return;

    const liveLabChannel = supabase.channel(`realtime_live_lab_${schoolId}`);
    liveLabChannel
      .on('broadcast', { event: 'band-founded' }, (payload: any) => {
        console.log('[Realtime] Band founded broadcast received:', payload);
        const { bandName, songTitle } = payload.payload || {};
        if (bandName) {
          setToastMessage(`Band gegründet: ${bandName}! 🎸🔥 (${songTitle})`);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(liveLabChannel);
    };
  }, [teacher?.school_id, session?.users?.school_id]);
  const [schoolData, setSchoolData] = useState<any>(null);
  const isTeacher = viewMode === 'admin';
  // localCheckedIn: flips immediately on check-in so the overlay hides without waiting for parent prop updates
  const [localCheckedIn, setLocalCheckedIn] = useState(false);
  // Ref mirrors the state so fetchData closures can read it synchronously (no stale closure problem)
  const localCheckedInRef = useRef(false);
  const isUserCheckedIn = isTeacher || localCheckedIn || (locationMode === 'lab' && !!session && (!!session.station_id || isTeacher));
  const [showKioskView, setShowKioskView] = useState(false);
  const [showKioskPinSetup, setShowKioskPinSetup] = useState(false);
  const [kioskPinInput, setKioskPinInput] = useState('');
  const [targetKioskStation, setTargetKioskStation] = useState<any>(null);
  const [checkingInStatus, setCheckingInStatus] = useState<'idle' | 'locating' | 'verifying' | 'success' | 'error'>('idle');
  const [geoErrorMsg, setGeoErrorMsg] = useState<string>('');
  const [shakeLock, setShakeLock] = useState(false);
  const [stations, setStations] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [wallSongs, setWallSongs] = useState<any[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [expandedResponseIds, setExpandedResponseIds] = useState<Record<string, boolean>>({});
  const [showAllSubmissions, setShowAllSubmissions] = useState(false);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [ticker, setTicker] = useState(0);
  const [selectedCoachProfile, setSelectedCoachProfile] = useState<any>(null);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<any>(null);
  const [docStudent, setDocStudent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'briefing' | 'live' | 'bands' | 'students' | 'proposals' | 'settings' | 'coaches' | 'messages'>(initialTab || (hideHeader ? 'live' : 'briefing'));

  // --- Guided Tour ---
  const tourSteps = useMemo<TourStep[]>(() => {
    switch(activeTab) {
      case 'briefing':
        return [
          { title: "Dein Briefing 👋", description: "Hier findest du eine Übersicht über deinen Tag und alle wichtigen Kennzahlen.", selector: "tour-teacher-briefing" },
          { title: "Kennzahlen 📊", description: "Diese Karten zeigen dir auf einen Blick, wie viele Schüler du heute hast und wie lange deine durchschnittliche Übe-Streak ist.", selector: "tour-teacher-kpis" },
          { title: "Dein Tagesplan 📅", description: "Hier siehst du deine anstehenden Unterrichtstermine für heute.", selector: "tour-teacher-schedule" }
        ];
      case 'live':
        return [
          { title: "Das Live Lab 🎸", description: "Hier siehst du den visuellen Raum und die Belegung der Stationen durch die Schüler.", selector: "tour-teacher-livelab" },
          { title: "Räume verwalten 🚪", description: "Wähle hier einen Raum aus, um die interaktive Sitzverteilung und die angemeldeten Schüler zu sehen.", selector: "tour-teacher-livelab-rooms" }
        ];
      case 'bands':
        return [
          { title: "Band-Verwaltung 🎤", description: "Hier kannst du neue Bands gründen, Mitglieder verwalten und euren Fortschritt verfolgen.", selector: "tour-teacher-bands" }
        ];
      default:
        return [];
    }
  }, [activeTab]);

  const { TourComponent, startTour } = usePremiumOnboardingTour({
    tourKey: `campus_groovelab_tour_completed_${activeTab}_${userId}`,
    steps: tourSteps,
    platformTheme: activePlatform === 'campus' ? 'campus' : 'groovelab'
  });
  const [teacherSettingsTab, setTeacherSettingsTab] = useState<'fokus' | 'profile'>('fokus');
  const [initialSchoolData, setInitialSchoolData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [allBands, setAllBands] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [hoveredCopilotSlotId, setHoveredCopilotSlotId] = useState<string | null>(null);
  const [deleteStudentModalData, setDeleteStudentModalData] = useState<StudentToDelete | null>(null);
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
    contract_ends_at: '',
    app_usage_mode: 'student_only'
  });
  const [showInviteStudent, setShowInviteStudent] = useState(false);
  const op = teacher?.schools?.opening_hours || session?.users?.schools?.opening_hours || {};
  const glTeachersManageStudents = op.gl_setting_groovelab_teachers_manage_students === true;
  const glTeachersManageTeachers = op.gl_setting_groovelab_teachers_manage_teachers === true;
  const campusTeachersManageStudents = op.gl_setting_campus_teachers_manage_students === true;
  const campusTeachersManageTeachers = op.gl_setting_campus_teachers_manage_teachers === true;

  const teachersManageStudents = activePlatform === 'campus' ? campusTeachersManageStudents : glTeachersManageStudents;
  const teachersManageTeachers = activePlatform === 'campus' ? campusTeachersManageTeachers : glTeachersManageTeachers;
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
    if (selectedRoomId) {
      localStorage.setItem('groovelab_teacher_selected_room_id', selectedRoomId);
    }
  }, [selectedRoomId]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`realtime_teacher_challenges_${userId}`);
    channel
      .on('broadcast', { event: 'challenge-submitted' }, (payload: any) => {
        console.log('[Realtime] Challenge submitted broadcast received:', payload);
        fetchData();
        const studentName = payload.payload?.studentName || 'Ein Schüler';
        const songTitle = payload.payload?.songTitle || 'einem Song';
        const instrument = payload.payload?.instrument || '';
        alert(`Neue Challenge von ${studentName} für "${songTitle}" (${instrument}) eingereicht! 🚀`);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    (window as any).openTageskompass = (std: any) => {
      setDocStudent({
        id: std.id,
        first_name: std.first_name || std.name?.split(' ')[0],
        last_name: std.last_name || std.name?.split(' ').slice(1).join(' '),
        photo_url: std.photo_url || '/avatar_ghost.jpg',
        is_campus_active: std.is_campus_active
      });
    };
    return () => {
      delete (window as any).openTageskompass;
    };
  }, []);

  const performDirectTeacherCheckin = async () => {
    setCheckingInStatus('verifying');
    const now = new Date().toISOString();
    try {
      // 1. Terminate existing sessions in DB
      await supabase.from('sessions').update({ check_out_time: now }).eq('user_id', userId).is('check_out_time', null);
      
      // Find the Lehrer iPad station for the selected room
      const lehrerStation = (stations || []).find(s => 
        s.room_id === selectedRoomId && 
        ((s.name || '').toLowerCase().includes('lehrer') || (s.name || '').toLowerCase().includes('teacher'))
      );
      let targetStationId = lehrerStation ? lehrerStation.id : null;

      // Defensive: If not found in memory, query DB directly to get the station ID
      if (!targetStationId && selectedRoomId) {
        console.log('[Teacher Check-in] Lehrer station not found in memory, querying database directly...');
        const { data: dbStations } = await supabase
          .from('stations')
          .select('id, name')
          .eq('room_id', selectedRoomId);
        
        const dbLehrer = (dbStations || []).find(s => 
          (s.name || '').toLowerCase().includes('lehrer') || (s.name || '').toLowerCase().includes('teacher')
        );
        if (dbLehrer) {
          targetStationId = dbLehrer.id;
          console.log('[Teacher Check-in] Found Lehrer station in DB:', targetStationId);
        }
      }

      // 2. Insert session associated with Lehrer iPad station if found
      const { data: sessData, error: sessErr } = await supabase
        .from('sessions')
        .insert({
          user_id: userId,
          station_id: targetStationId,
          gps_verified: true,
          check_in_time: now
        })
        .select('*, stations(name)')
        .single();

      if (sessErr) {
        console.error('[Teacher Check-in] Error:', sessErr);
        alert('Fehler beim Einchecken: ' + sessErr.message);
        setCheckingInStatus('error');
      } else {
        console.log('[Teacher Check-in] Success:', sessData.id);
        setCheckingInStatus('success');
        // Set sessionStorage immediately so fetchData can read it synchronously
        sessionStorage.setItem('groovelab_location_mode', 'lab');
        // Set ref SYNCHRONOUSLY (readable inside fetchData closure immediately)
        localCheckedInRef.current = true;
        // Also set state for re-render
        setLocalCheckedIn(true);
        // Optimistically add the teacher to coaches state right away
        setCoaches(prev => {
          if (!teacher) return prev;
          const alreadyIn = prev.some(c => c && c.id === userId);
          if (alreadyIn) return prev;
          return [{ id: userId, users: teacher, session: sessData }, ...prev];
        });
        if (onSessionChange) onSessionChange(sessData);
        if (onLocationModeChange) onLocationModeChange('lab');
        await fetchData();
        // Re-apply after fetchData in case it overwrote the optimistic entry
        if (localCheckedInRef.current && teacher) {
          setCoaches(prev => {
            const alreadyIn = prev.some(c => c && c.id === userId);
            if (alreadyIn) return prev;
            return [{ id: userId, users: teacher, session: sessData }, ...prev];
          });
        }
      }
    } catch (e: any) {
      console.error('[Teacher Check-in] Unexpected Error:', e);
      setCheckingInStatus('error');
    }
  };

  // Defensively ensure that if viewMode === 'admin', showKioskView is always false and triggers direct check-in instead
  useEffect(() => {
    if (viewMode === 'admin' && showKioskView) {
      console.log('[DEBUG-Teacher] showKioskView was set to true for admin/teacher, auto-closing and performing direct checkin.');
      setShowKioskView(false);
      performDirectTeacherCheckin();
    }
  }, [viewMode, showKioskView]);

  // Silent auto-checkin for teachers if they are on-site (geofence verification)
  useEffect(() => {
    if (isTeacher && locationMode !== 'lab' && !localCheckedIn) {
      console.log('[Geofence] Triggering silent auto-checkin verification for teacher...');
      
      const schoolData = Array.isArray(teacher?.schools) ? teacher?.schools[0] : teacher?.schools;
      const hasGeofenceBypass = !!(schoolData?.opening_hours?.geofence_bypass);
      const isLocalhost = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.endsWith('.local') ||
        /^192\.168\./.test(window.location.hostname) ||
        /^10\./.test(window.location.hostname) ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(window.location.hostname)
      );

      if (isLocalhost || hasGeofenceBypass) {
        console.log('[Geofence] Silent auto-checkin: Bypassing location check (localhost or database bypass active).');
        performDirectTeacherCheckin();
        return;
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const currentPos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };

            let isWithinAnyRoom = false;

            // Check against room coordinates & geofences
            if (rooms && rooms.length > 0) {
              for (const room of rooms) {
                const points = Array.isArray(room.geofence_points) ? room.geofence_points : [];
                const allCoords = [...points];
                if (room.latitude && room.longitude) {
                  allCoords.push({ lat: room.latitude, lng: room.longitude });
                }

                for (const pt of allCoords) {
                  if (pt && pt.lat && pt.lng) {
                    const dist = getDistanceFromLatLonInM(currentPos.lat, currentPos.lng, Number(pt.lat), Number(pt.lng));
                    if (dist < 100) {
                      isWithinAnyRoom = true;
                      break;
                    }
                  }
                }
                if (isWithinAnyRoom) break;
              }
            }

            // Fallback to school coordinates
            if (!isWithinAnyRoom && schoolData?.latitude && schoolData?.longitude) {
              const distToSchool = getDistanceFromLatLonInM(currentPos.lat, currentPos.lng, Number(schoolData.latitude), Number(schoolData.longitude));
              const radius = schoolData.geofence_radius_meters || 150;
              if (distToSchool < radius) {
                isWithinAnyRoom = true;
              }
            }

            if (isWithinAnyRoom) {
              console.log('[Geofence] Silent auto-checkin: Teacher verified on-site. Performing checkin...');
              performDirectTeacherCheckin();
            } else {
              console.log('[Geofence] Silent auto-checkin: Teacher verified off-site. Staying in Home mode.');
            }
          },
          (error) => {
            console.warn('[Geofence] Silent auto-checkin: Geolocation request failed:', error);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      }
    }
  }, [isTeacher, locationMode, localCheckedIn, teacher, rooms]);

  const handleGeofenceCheck = () => {
    // 1. Bypass check on localhost or if geofence bypass is active in the school's database settings
    const schoolData = Array.isArray(teacher?.schools) ? teacher?.schools[0] : teacher?.schools;
    const hasGeofenceBypass = !!(schoolData?.opening_hours?.geofence_bypass);
    const isLocalhost = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.endsWith('.local') ||
      /^192\.168\./.test(window.location.hostname) ||
      /^10\./.test(window.location.hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(window.location.hostname)
    );

    if (isLocalhost || hasGeofenceBypass) {
      console.log('[Geofence] Bypassing location check (localhost or database bypass active).');
      if (isTeacher) {
        performDirectTeacherCheckin();
      } else {
        setCheckingInStatus('success');
        setShowKioskView(true);
      }
      return;
    }

    setCheckingInStatus('locating');
    setGeoErrorMsg('');

    if (!navigator.geolocation) {
      setCheckingInStatus('error');
      setGeoErrorMsg('Geolocation wird von deinem Browser nicht unterstützt.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setCheckingInStatus('verifying');
        const currentPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        let isWithinAnyRoom = false;

        // Check against room coordinates & geofences
        if (rooms && rooms.length > 0) {
          for (const room of rooms) {
            const points = Array.isArray(room.geofence_points) ? room.geofence_points : [];
            const allCoords = [...points];
            if (room.latitude && room.longitude) {
              allCoords.push({ lat: room.latitude, lng: room.longitude });
            }

            for (const pt of allCoords) {
              if (pt && pt.lat && pt.lng) {
                const dist = getDistanceFromLatLonInM(currentPos.lat, currentPos.lng, Number(pt.lat), Number(pt.lng));
                if (dist < 100) {
                  isWithinAnyRoom = true;
                  break;
                }
              }
            }
            if (isWithinAnyRoom) break;
          }
        }

        // If not found in any room geofence, fallback to school coordinates
        const schoolData = teacher?.schools;
        if (!isWithinAnyRoom && schoolData?.latitude && schoolData?.longitude) {
          const distToSchool = getDistanceFromLatLonInM(currentPos.lat, currentPos.lng, Number(schoolData.latitude), Number(schoolData.longitude));
          const radius = schoolData.geofence_radius_meters || 150;
          if (distToSchool < radius) {
            isWithinAnyRoom = true;
          }
        }

        if (isWithinAnyRoom) {
          if (isTeacher) {
            performDirectTeacherCheckin();
          } else {
            setCheckingInStatus('success');
            setShowKioskView(true);
          }
        } else {
          setCheckingInStatus('error');
          setGeoErrorMsg('Du befindest dich anscheinend nicht vor Ort in der Musikschule.');
          setShakeLock(true);
          setTimeout(() => setShakeLock(false), 500);
        }
      },
      (error) => {
        setCheckingInStatus('error');
        setShakeLock(true);
        setTimeout(() => setShakeLock(false), 500);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoErrorMsg('Standortzugriff wurde abgelehnt. Bitte aktiviere den GPS-Zugriff in deinen Browsereinstellungen.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoErrorMsg('Standortinformationen sind nicht verfügbar.');
            break;
          case error.TIMEOUT:
            setGeoErrorMsg('Die GPS-Abfrage dauerte zu lange (Timeout).');
            break;
          default:
            setGeoErrorMsg('Ein unbekannter Fehler bei der Standortabfrage ist aufgetreten.');
            break;
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const handleKioskStationSelect = async (station: any) => {
    if (!userId) return;

    // Check if the student's birthday pin is not set yet (bypassed for GrooveLab module)
    const isStudent = teacher?.role?.toLowerCase() === 'student';
    if (false && isStudent && !teacher?.day_of_birth) {
      setTargetKioskStation(station);
      setKioskPinInput('');
      setShowKioskPinSetup(true);
      return;
    }

    setCheckingInStatus('verifying');
    const now = new Date().toISOString();

    try {
      const isTeacher = teacher?.role?.toLowerCase() === 'teacher' || teacher?.role?.toLowerCase() === 'admin';
      // 1. Global Cleanup & 2. Station Cleanup in parallel
      await Promise.all([
        supabase.from('sessions').update({ 
          check_out_time: now,
          metadata: { is_switching_station: true }
        }).eq('user_id', userId).is('check_out_time', null),
        (!isTeacher)
          ? supabase.from('sessions').update({ check_out_time: now }).eq('station_id', station.id).is('check_out_time', null)
          : Promise.resolve()
      ]);

      // 3. Insert new session
      const { data: sessData, error: sessErr } = await supabase
        .from('sessions')
        .insert({
          user_id: userId,
          station_id: station.id,
          gps_verified: true,
          check_in_time: now
        })
        .select('*, stations(name)')
        .single();

      if (sessErr) {
        console.error('[Kiosk Check-in] Error creating session:', sessErr);
        alert('Fehler beim Einchecken: ' + sessErr.message);
        setCheckingInStatus('error');
        return;
      }

      console.log('[Kiosk Check-in] Session created successfully:', sessData.id);

      // 4. Update parent states if callbacks exist
      if (onSessionChange) {
        onSessionChange(sessData);
      }
      if (onLocationModeChange) {
        onLocationModeChange('lab');
      }

      // 5. Refresh data to update Live Lab board locally
      await fetchData();

      // Close kiosk view
      setShowKioskView(false);
      setCheckingInStatus('idle');
    } catch (err: any) {
      console.error('[Kiosk Check-in] Catch error:', err);
      alert('Fehler beim Einchecken: ' + err.message);
      setCheckingInStatus('error');
    }
  };

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
      const teacherName = teacher ? `${teacher.first_name} ${teacher.last_name}` : 'dein Lehrer';

      // Direct push triggering helper for fallback
      const triggerFallbackPush = async (studentId: string, title: string, body: string, metadata: any) => {
        try {
          const { data: studentProfile } = await supabase
            .from('users')
            .select('is_campus_active, first_name')
            .eq('id', studentId)
            .single();

          if (studentProfile && studentProfile.is_campus_active) {
            // Log in notifications table
            const { data: notification, error: notifErr } = await supabase
              .from('notifications')
              .insert({
                user_id: studentId,
                title,
                message: body,
                metadata
              })
              .select('id')
              .single();

            if (!notifErr && notification) {
              await supabase.functions.invoke('send-push', {
                body: {
                  userId: studentId,
                  title,
                  body,
                  url: '/',
                  notificationId: notification.id
                }
              });
            }
          }
        } catch (pushErr) {
          console.error('Failed to trigger fallback push notification:', pushErr);
        }
      };
      
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

          // Send push notifications
          if (status === 'approved') {
            triggerFallbackPush(
              sourceSlot.student.id,
              'Unterricht verschoben 📅',
              `Hallo ${sourceSlot.student.name.split(' ')[0]}, dein Unterricht bei ${teacherName} wurde verschoben auf heute um ${targetSlot.timeSlot} Uhr.`,
              { schedule_id: draggedSchedId, type: 'rescheduled' }
            );
            triggerFallbackPush(
              targetConflict.student.id,
              'Unterricht verschoben 📅',
              `Hallo ${targetConflict.student.name.split(' ')[0]}, dein Unterricht bei ${teacherName} wurde verschoben auf heute um ${sourceSlot.timeSlot} Uhr.`,
              { schedule_id: targetConflict.scheduleId, type: 'rescheduled' }
            );
          } else {
            triggerFallbackPush(
              sourceSlot.student.id,
              'Terminänderung freigeben? 📅',
              `Hallo ${sourceSlot.student.name.split(' ')[0]}, dein Lehrer ${teacherName} möchte deinen Unterricht auf heute um ${targetSlot.timeSlot} Uhr verschieben. Bitte stimme dem Termin in der App zu.`,
              { schedule_id: draggedSchedId, type: 'pending_parent_approval' }
            );
            triggerFallbackPush(
              targetConflict.student.id,
              'Terminänderung freigeben? 📅',
              `Hallo ${targetConflict.student.name.split(' ')[0]}, dein Lehrer ${teacherName} möchte deinen Unterricht auf heute um ${sourceSlot.timeSlot} Uhr verschieben. Bitte stimme dem Termin in der App zu.`,
              { schedule_id: targetConflict.scheduleId, type: 'pending_parent_approval' }
            );
          }
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

        // Send push notification
        const sourceSlot = briefingData.timeline.find((s: any) => s.scheduleId === draggedSchedId);
        if (sourceSlot && sourceSlot.student) {
          if (status === 'approved') {
            triggerFallbackPush(
              sourceSlot.student.id,
              'Unterricht verschoben 📅',
              `Hallo ${sourceSlot.student.name.split(' ')[0]}, dein Unterricht bei ${teacherName} wurde verschoben auf heute um ${targetSlot.timeSlot} Uhr.`,
              { schedule_id: draggedSchedId, type: 'rescheduled' }
            );
          } else {
            triggerFallbackPush(
              sourceSlot.student.id,
              'Terminänderung freigeben? 📅',
              `Hallo ${sourceSlot.student.name.split(' ')[0]}, dein Lehrer ${teacherName} möchte deinen Unterricht auf heute um ${targetSlot.timeSlot} Uhr verschieben. Bitte stimme dem Termin in der App zu.`,
              { schedule_id: draggedSchedId, type: 'pending_parent_approval' }
            );
          }
        }
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
      const todayStr = new Date().toLocaleDateString('sv-SE');
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

  // 4-week maximum: longer absences must be entered by administration
  const MAX_SELF_REPORT_DAYS = 28;

  const handleReportSick = async () => {
    if (!sickUntilDate) {
      alert('Bitte wähle ein bis-Datum aus.');
      return;
    }
    if (!sickStartDate) {
      alert('Bitte wähle ein von-Datum aus.');
      return;
    }

    // Check if sick period exceeds 4 weeks
    const startD = new Date(sickStartDate);
    const untilD = new Date(sickUntilDate);
    startD.setHours(0, 0, 0, 0);
    untilD.setHours(0, 0, 0, 0);
    const diffDays = Math.round((untilD.getTime() - startD.getTime()) / (24 * 3600 * 1000)) + 1;
    if (diffDays > MAX_SELF_REPORT_DAYS) {
      alert(
        `⚠️ Krankmeldungen von mehr als 4 Wochen (${diffDays} Tage) können nicht selbst eingetragen werden.\n\nBitte wende dich an die Verwaltung, damit diese die Krankmeldung für dich hinterlegt. Es gilt keine 30-Tage-Sperre für Verwaltungseinträge.`
      );
      return;
    }

    const confirmMsg = `Möchtest du dich wirklich vom ${new Date(sickStartDate).toLocaleDateString('de-DE')} bis zum ${new Date(sickUntilDate).toLocaleDateString('de-DE')} krankmelden?`;

    if (!confirm(confirmMsg)) return;

    try {
      setReportingSick(true);

      // Direct Client-Side Supabase logic matching CampusTeacherDashboard
      const { data: profile, error: profileErr } = await supabase
        .from('users')
        .select('school_id, first_name, last_name, sick_start, sick_until')
        .eq('id', userId)
        .single();

      if (profileErr || !profile) {
        throw new Error('Teacher profile not found.');
      }

      const prevSickUntilStr = profile.sick_until;
      const todayD = new Date();
      const localTodayStr = `${todayD.getFullYear()}-${String(todayD.getMonth() + 1).padStart(2, '0')}-${String(todayD.getDate()).padStart(2, '0')}`;
      const sickStartVal = sickStartDate || profile.sick_start || localTodayStr;

      // 1. Update user table
      const { error: userErr } = await supabase
        .from('users')
        .update({ 
          sick_until: sickUntilDate,
          sick_start: sickStartVal
        })
        .eq('id', userId);

      if (userErr) throw userErr;

      // 2. Fetch weekly schedules
      const { data: schedules, error: schedError } = await supabase
        .from('schedules')
        .select('*, student:users!schedules_student_id_fkey(id, first_name, last_name)')
        .eq('teacher_id', userId);

      if (schedError) throw schedError;

      // 2b. Fetch one-off schedule occurrences (for rescheduled slots)
      const { data: occurrences, error: occError } = await supabase
        .from('schedule_occurrences')
        .select('*, student:users!schedule_occurrences_student_id_fkey(id, first_name, last_name)')
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
                  const student = sched.student || allStudents.find(s => s.id === sched.student_id);
                  const studentName = student ? `${student.first_name} ${maskLastName(student.last_name, showRealNames)}`.trim() : null;
                  notificationsToInsert.push({
                    teacher_id: userId,
                    student_id: sched.student_id,
                    slot_start_datetime: startDateTime.toISOString(),
                    status: 'UNREAD',
                    duration: sched.duration || 30,
                    student_name: studentName
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
                const student = occ.student || allStudents.find(s => s.id === occ.student_id);
                const studentName = student ? `${student.first_name} ${maskLastName(student.last_name, showRealNames)}`.trim() : null;
                const matchingSched = (schedules || []).find(s => s.id === occ.schedule_id);
                const durationVal = occ.duration || matchingSched?.duration || 30;
                notificationsToInsert.push({
                  teacher_id: userId,
                  student_id: occ.student_id,
                  slot_start_datetime: startDateTime.toISOString(),
                  status: 'UNREAD',
                  duration: durationVal,
                  student_name: studentName
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
          .update({ status: 'cancelled' })
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
          .eq('status', 'cancelled');
      }

      // Insert new crisis notifications
      if (notificationsToInsert.length > 0) {
        const toInsert = notificationsToInsert.map(n => ({
          teacher_id: n.teacher_id,
          student_id: n.student_id,
          slot_start_datetime: n.slot_start_datetime,
          status: n.status
        }));
        await supabase
          .from('crisis_notifications')
          .insert(toInsert);
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

      // Refresh teacher profile without page reload
      const { data: updatedTeacher } = await supabase
        .from('users')
        .select('*, schools(*)')
        .eq('id', userId)
        .single();
      if (updatedTeacher) setTeacher(updatedTeacher);

      // Open notification modal showing affected students
      setSickNotifModal({
        notifs: notificationsToInsert,
        sickUntilDateStr: sickUntilDate,
      });

      setSickSuccessShown(true);
      setIsSickWidgetExpanded(false);
      setTicker(t => t + 1);
      setTimeout(() => {
        setSickSuccessShown(false);
      }, 2500);
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
        .select('school_id, first_name, last_name, sick_start, sick_until')
        .eq('id', userId)
        .single();

      if (profileErr || !profile) {
        throw new Error('Teacher profile not found.');
      }

      // Compute sickness duration before resetting
      let daysDiff = 0;
      let formattedStartDate = '';
      let formattedEndDate = '';
      if (profile.sick_start) {
        const startD = new Date(profile.sick_start);
        const endD = new Date();
        startD.setHours(0, 0, 0, 0);
        endD.setHours(0, 0, 0, 0);
        daysDiff = Math.round((endD.getTime() - startD.getTime()) / (24 * 3600 * 1000)) + 1;
        if (daysDiff < 1) daysDiff = 1;
        formattedStartDate = startD.toLocaleDateString('de-DE');
        formattedEndDate = endD.toLocaleDateString('de-DE');
      }

      // 1. Reset sick_until and sick_start to null to return to regular mode
      const { error: userErr } = await supabase
        .from('users')
        .update({ 
          sick_until: null,
          sick_start: null
        })
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
          .eq('status', 'cancelled');
      }

      // Instead of deleting future notifications, mark them as reinstated so students get notified
      if (datesToDeleteNotifs.length > 0) {
        await supabase
          .from('crisis_notifications')
          .update({ is_reinstated: true, status: 'UNREAD' })
          .eq('teacher_id', userId)
          .in('slot_start_datetime', datesToDeleteNotifs);
      }

      // Add healthy notice to system alerts with logged duration
      const durationStr = daysDiff > 0 ? ` (Krankheitsdauer: vom ${formattedStartDate} bis zum ${formattedEndDate}, ${daysDiff} ${daysDiff === 1 ? 'Tag' : 'Tage'})` : '';
      const alertMessage = `🍏 LEHRKRAFT GESUND: Lehrkraft ${profile.first_name} ${profile.last_name} hat sich wieder gesund gemeldet.${durationStr}`;
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
      setSickUntilDate('');
      const today = new Date();
      setSickStartDate(today.toISOString().substring(0, 10));
      // Refresh teacher profile without page reload
      const { data: updatedTeacher } = await supabase
        .from('users')
        .select('*, schools(*)')
        .eq('id', userId)
        .single();
      if (updatedTeacher) setTeacher(updatedTeacher);
      setTicker(t => t + 1);
    } catch (err) {
      console.error(err);
      alert('Fehler bei der Gesundmeldung.');
    } finally {
      setReportingSick(false);
    }
  };

  const handleSubmitFeedbackResponse = async (requestId: string) => {
    const request = adminFeedbackRequests.find(r => r.id === requestId);
    const isQuestionnaire = request && request.questions && request.questions.length > 0;
    
    let finalResponseText = '';
    if (isQuestionnaire) {
      const answersObj: Record<string, string> = {};
      let hasAnyAnswer = false;
      request.questions.forEach((q: string) => {
        const ans = (questionnaireAnswers[q] || '').trim();
        answersObj[q] = ans;
        if (ans) hasAnyAnswer = true;
      });
      if (!hasAnyAnswer) {
        alert('Bitte beantworte mindestens eine Frage.');
        return;
      }
      finalResponseText = JSON.stringify(answersObj);
    } else {
      if (!responseTextInput.trim()) return;
      finalResponseText = responseTextInput.trim();
    }

    setSubmittingFeedback(true);
    try {
      const { error } = await supabase
        .from('campus_feedback_responses')
        .insert({
          request_id: requestId,
          teacher_id: userId,
          response_text: finalResponseText
        });

      if (error) throw error;
      
      setResponseTextInput('');
      setQuestionnaireAnswers({});
      setRespondingToRequestId(null);
      setAdminFeedbackTab('done');
      alert('Rückmeldung erfolgreich übermittelt! Vielen Dank.');
      await fetchData();
      setTicker(t => t + 1);
    } catch (err) {
      console.error(err);
      alert('Fehler beim Übermitteln der Rückmeldung.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleMarkRequestAsDone = async (requestId: string) => {
    setSubmittingFeedback(true);
    try {
      const { error } = await supabase
        .from('campus_feedback_responses')
        .insert({
          request_id: requestId,
          teacher_id: userId,
          response_text: 'Erledigt'
        });

      if (error) throw error;
      
      setRespondingToRequestId(null);
      setAdminFeedbackTab('done');
      alert('Aufgabe als erledigt markiert!');
      await fetchData();
      setTicker(t => t + 1);
    } catch (err) {
      console.error(err);
      alert('Fehler beim Markieren als erledigt.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleReactToPost = async (postId: string, emoji: string, type: 'campus' | 'class' = 'campus') => {
    try {
      const list = type === 'campus' ? feedInteractions : classFeedInteractions;
      const existing = list.find(i => i.post_id === postId && i.user_id === userId && i.emoji_unicode === emoji);
      if (existing) {
        await supabase
          .from('feed_interactions')
          .delete()
          .eq('id', existing.id);
      } else {
        await supabase
          .from('feed_interactions')
          .insert({
            post_type: type,
            post_id: postId,
            user_id: userId,
            interaction_type: 'like',
            emoji_unicode: emoji
          });
      }
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateClassPost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) return;
    setSubmittingClassPost(true);
    try {
      if (editingPostId) {
        const { error } = await supabase
          .from('class_feed_posts')
          .update({
            title: newPostTitle.trim(),
            content: newPostContent.trim(),
            post_type: newPostType
          })
          .eq('id', editingPostId)
          .eq('teacher_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('class_feed_posts')
          .insert({
            teacher_id: userId,
            title: newPostTitle.trim(),
            content: newPostContent.trim(),
            post_type: newPostType,
            quiz_data: null,
            attachment_url: null
          });
        if (error) throw error;
      }
      
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostType('announcement');
      setShowClassPostForm(false);
      setEditingPostId(null);
      await fetchData();
    } catch (err) {
      console.error(err);
      alert(editingPostId ? 'Fehler beim Bearbeiten des Beitrags.' : 'Fehler beim Erstellen des Beitrags.');
    } finally {
      setSubmittingClassPost(false);
    }
  };

  const handleDeleteClassPost = async (postId: string) => {
    if (!window.confirm('Möchtest du diesen Beitrag wirklich löschen?')) return;
    try {
      // Delete interactions first since they depend on post_id (clean separation)
      await supabase
        .from('feed_interactions')
        .delete()
        .eq('post_type', 'class')
        .eq('post_id', postId);

      const { error } = await supabase
        .from('class_feed_posts')
        .delete()
        .eq('id', postId)
        .eq('teacher_id', userId);
      if (error) throw error;

      await fetchData();
    } catch (err) {
      console.error('Error deleting class feed post:', err);
      alert('Fehler beim Löschen des Beitrags.');
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
      return window.innerWidth < 1024;
    }
    return false;
  });

  const isSidebarCollapsed = propsIsSidebarCollapsed !== undefined ? propsIsSidebarCollapsed : localIsSidebarCollapsed;
  const setIsSidebarCollapsed = propsSetIsSidebarCollapsed !== undefined ? propsSetIsSidebarCollapsed : setLocalIsSidebarCollapsed;

  const [rawBriefingData, setRawBriefingData] = useState<any>(null);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [briefingRefreshTicker, setBriefingRefreshTicker] = useState(0);

  const [holidays, setHolidays] = useState<{ start: string, end: string, name: string }[]>([]);

  const parseICSDate = (icsDateStr: string): Date => {
    const cleanStr = icsDateStr.includes(':') ? icsDateStr.split(':')[1] : icsDateStr;
    const year = parseInt(cleanStr.substring(0, 4));
    const month = parseInt(cleanStr.substring(4, 6)) - 1;
    const day = parseInt(cleanStr.substring(6, 8));

    if (cleanStr.includes('T')) {
      const hour = parseInt(cleanStr.substring(9, 11));
      const min = parseInt(cleanStr.substring(11, 13));
      const sec = parseInt(cleanStr.substring(13, 15));
      return new Date(Date.UTC(year, month, day, hour, min, sec));
    }
    return new Date(year, month, day);
  };

  const parseICS = (icsText: string): any[] => {
    const events: any[] = [];
    const lines = icsText.split(/\r?\n/);
    let currentEvent: any = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === 'BEGIN:VEVENT') {
        currentEvent = {};
      } else if (line === 'END:VEVENT' && currentEvent) {
        if (currentEvent.summary && currentEvent.dtstart) {
          events.push(currentEvent);
        }
        currentEvent = null;
      } else if (currentEvent) {
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          const key = line.substring(0, colonIdx);
          const value = line.substring(colonIdx + 1);

          if (key.startsWith('SUMMARY')) {
            currentEvent.summary = value;
          } else if (key.startsWith('DESCRIPTION')) {
            currentEvent.description = value.replace(/\\n/g, '\n');
          } else if (key.startsWith('DTSTART')) {
            currentEvent.dtstart = parseICSDate(value);
            currentEvent.isAllDay = !value.includes('T');
          } else if (key.startsWith('DTEND')) {
            currentEvent.dtend = parseICSDate(value);
          } else if (key.startsWith('LOCATION')) {
            currentEvent.location = value;
          }
        }
      }
    }
    return events;
  };

  const loadHolidays = async (url: string) => {
    try {
      const urls = (() => {
        try {
          if (url.startsWith('[')) return JSON.parse(url) as string[];
        } catch (e) {}
        if (url.includes(',')) return url.split(',').map(u => u.trim()).filter(Boolean);
        return [url];
      })();

      let combinedEvents: any[] = [];

      for (const singleUrl of urls) {
        try {
          let text = '';
          try {
            const res = await fetch(singleUrl);
            if (!res.ok) throw new Error();
            text = await res.text();
          } catch (corsErr) {
            const proxies = [
              `https://corsproxy.io/?${singleUrl}`,
              `https://api.allorigins.win/get?url=${encodeURIComponent(singleUrl)}`
            ];

            let success = false;
            for (const proxyUrl of proxies) {
              try {
                const res = await fetch(proxyUrl);
                if (!res.ok) continue;
                if (proxyUrl.includes('allorigins')) {
                  const json = await res.json();
                  text = json.contents;
                } else {
                  text = await res.text();
                }
                if (text && text.includes('BEGIN:VCALENDAR')) {
                  success = true;
                  break;
                }
              } catch (e) {
                console.warn(e);
              }
            }
            if (!success) continue;
          }

          if (text) {
            const parsedSingle = parseICS(text);
            combinedEvents = [...combinedEvents, ...parsedSingle];
          }
        } catch (e) {
          console.warn('Error fetching calendar URL:', singleUrl, e);
        }
      }

      if (combinedEvents.length === 0) return;

      const holidayRanges = combinedEvents
        .filter(ev => {
          const summary = (ev.summary || '').toLowerCase();
          return summary.includes('ferien') || summary.includes('feiertag') || summary.includes('schulfrei');
        })
        .map(ev => {
          const toYYYYMMDD = (d: Date) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
          };
          
          const end = ev.dtend ? new Date(ev.dtend) : new Date(ev.dtstart);
          if (ev.dtend && ev.isAllDay) {
            end.setDate(end.getDate() - 1);
          }
          
          return {
            start: toYYYYMMDD(ev.dtstart),
            end: toYYYYMMDD(end),
            name: ev.summary || 'Ferien'
          };
        });

      setHolidays(holidayRanges);
    } catch (err) {
      console.error('Error loading holidays in TeacherDashboard:', err);
    }
  };

  useEffect(() => {
    const calendarUrl = teacher?.schools?.calendar_url;
    if (calendarUrl) {
      loadHolidays(calendarUrl);
    }
  }, [teacher?.schools?.calendar_url]);

  const isTodayHoliday = useMemo(() => {
    const todayStr = getSimulatedNow().toLocaleDateString('sv-SE');
    return holidays.find(h => todayStr >= h.start && todayStr <= h.end);
  }, [holidays]);

  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [myChangedAppointments, setMyChangedAppointments] = useState<any[]>([]);
  const [showAllChangedAppointments, setShowAllChangedAppointments] = useState<boolean>(false);
  const [showAllBookings, setShowAllBookings] = useState<boolean>(false);
  const [scheduleChangesTimeWindow, setScheduleChangesTimeWindow] = useState<'7days' | 'all'>('7days');

  const briefingData = useMemo(() => {
    if (!rawBriefingData) return null;
    if (isTodayHoliday) {
      return {
        ...rawBriefingData,
        timeline: []
      };
    }

    const simNow = getSimulatedNow();
    const getLocalYYYYMMDD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const todayStr = getLocalYYYYMMDD(simNow);

    const updatedTimeline = (rawBriefingData.timeline || []).map((s: any) => ({ ...s }));
    const allRelevantChanges = [...(myChangedAppointments || []), ...(myBookings || [])];

    allRelevantChanges.forEach((item: any) => {
      if (!item) return;

      let normDate = item.date || '';
      if (normDate.includes('.')) {
        const parts = normDate.split('.');
        if (parts.length === 3) {
          normDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }

      let normOrigDate = item.original_date || '';
      if (normOrigDate.includes('.')) {
        const parts = normOrigDate.split('.');
        if (parts.length === 3) {
          normOrigDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }

      const itemTime = item.startTime || item.start_time || item.timeSlot || item.time_slot;
      const formattedItemTime = itemTime ? itemTime.substring(0, 5) : null;
      const rawName = item.studentName || item.student_name || item.name || item.purpose || '';
      const cleanName = rawName.replace(/^Unterricht:\s*/i, '').trim();
      const itemStudentFirstName = cleanName.split(' ')[0].toLowerCase();
      const itemStudentId = item.student_id || item.studentId || item.student?.id;

      const findIdx = () => {
        return updatedTimeline.findIndex((t: any) => {
          if (item.scheduleId && String(t.scheduleId) === String(item.scheduleId)) return true;
          if (item.id && (String(t.id) === String(item.id) || String(t.scheduleId) === String(item.id))) return true;
          if (itemStudentId && t.student?.id && String(t.student.id) === String(itemStudentId)) return true;
          if (itemStudentFirstName && itemStudentFirstName !== 'schüler' && itemStudentFirstName !== 'unterricht' && t.student?.name && t.student.name.toLowerCase().includes(itemStudentFirstName)) return true;
          return false;
        });
      };

      if (normOrigDate === todayStr && normDate !== todayStr) {
        const existingIdx = findIdx();
        if (existingIdx !== -1) {
          updatedTimeline[existingIdx].status = 'rescheduled_away';
        }
      } else if (normDate === todayStr && formattedItemTime) {
        const existingIdx = findIdx();
        if (existingIdx !== -1) {
          updatedTimeline[existingIdx] = {
            ...updatedTimeline[existingIdx],
            timeSlot: formattedItemTime,
            status: item.status || updatedTimeline[existingIdx].status,
            room: item.roomName || item.room || updatedTimeline[existingIdx].room,
            isRescheduledPending: Boolean(item.is_rescheduled || item.isRescheduled || item.status === 'pending_reschedule' || item.status === 'rescheduled_confirmed' || item.status === 'changed')
          };
        } else if (itemStudentFirstName && itemStudentFirstName !== 'schüler' && itemStudentFirstName !== 'unterricht') {
          updatedTimeline.push({
            id: item.id || `changed-${Math.random()}`,
            scheduleId: item.scheduleId || item.id,
            date: todayStr,
            timeSlot: formattedItemTime,
            duration: item.duration || 45,
            status: item.status || 'approved',
            room: item.roomName || item.room || 'Hauptraum',
            instrument: item.instrument || 'Klavier',
            student_acknowledged: true,
            isRescheduledPending: Boolean(item.is_rescheduled || item.isRescheduled || item.status === 'pending_reschedule' || item.status === 'rescheduled_confirmed' || item.status === 'changed'),
            student: {
              id: itemStudentId || `temp-${itemStudentFirstName}`,
              name: cleanName || 'Schüler',
              first_name: cleanName.split(' ')[0],
              last_name: cleanName.split(' ').slice(1).join(' '),
              isAppUser: false,
              isAnalogStickerUser: false,
              birthDate: null,
              streakFlame: 0
            }
          });
        }
      }
    });

    updatedTimeline.sort((a: any, b: any) => (a.timeSlot || '').localeCompare(b.timeSlot || ''));

    return {
      ...rawBriefingData,
      timeline: updatedTimeline
    };
  }, [rawBriefingData, isTodayHoliday, myChangedAppointments, myBookings]);

  const visibleChangedAppointments = useMemo(() => {
    if (!myChangedAppointments || myChangedAppointments.length === 0) return [];
    if (scheduleChangesTimeWindow === 'all') return myChangedAppointments;
    
    const simStr = typeof window !== 'undefined' ? localStorage.getItem('groovelab_simulated_date') : null;
    const today = simStr ? new Date(simStr + 'T00:00:00') : new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);
    const getLocalYYYYMMDD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const todayStr = getLocalYYYYMMDD(today);
    const maxDateStr = getLocalYYYYMMDD(sevenDaysLater);
    return myChangedAppointments.filter((b: any) => {
      if (!b) return false;
      let normDate = b.date || '';
      if (normDate.includes('.')) {
        const parts = normDate.split('.');
        if (parts.length === 3) {
          normDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      let normOrigDate = b.original_date || '';
      if (normOrigDate.includes('.')) {
        const parts = normOrigDate.split('.');
        if (parts.length === 3) {
          normOrigDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }

      const isNewDateInWindow = Boolean(normDate && normDate >= todayStr && normDate <= maxDateStr);
      const isOrigDateInWindow = Boolean(normOrigDate && normOrigDate >= todayStr && normOrigDate <= maxDateStr);

      return isNewDateInWindow || isOrigDateInWindow;
    });
  }, [myChangedAppointments, scheduleChangesTimeWindow]);

  // Helper to check if today is student's birthday
  const isStudentBirthdayToday = (student: any): boolean => {
    const birthDateStr = student?.birthDate || student?.birth_date;
    if (!birthDateStr) return false;
    const parts = birthDateStr.split('-');
    if (parts.length !== 3) return false;
    const birthMonth = parseInt(parts[1], 10) - 1; // 0-indexed
    const birthDay = parseInt(parts[2], 10);
    const today = new Date();
    return today.getDate() === birthDay && today.getMonth() === birthMonth;
  };

  const activeLessonsCount = briefingData?.timeline 
    ? briefingData.timeline.filter((s: any) => s.student && s.status !== 'canceled_by_student' && s.status !== 'teacher_sick' && s.status !== 'cancelled' && s.status !== 'canceled_by_teacher_sick' && s.status !== 'rescheduled_away').length 
    : 0;

  const avgStreak = useMemo(() => {
    if (!briefingData?.timeline) return '0.0';
    const activeTimelineStudents = briefingData.timeline.filter((s: any) => 
      s.student && 
      s.status !== 'canceled_by_student' && 
      s.status !== 'teacher_sick' && 
      s.status !== 'cancelled' && 
      s.status !== 'canceled_by_teacher_sick' && 
      s.status !== 'rescheduled_away'
    );
    if (activeTimelineStudents.length === 0) return '0.0';
    const totalStreak = activeTimelineStudents.reduce((acc: number, s: any) => acc + (s.student?.streakFlame || 0), 0);
    return (totalStreak / activeTimelineStudents.length).toFixed(1);
  }, [briefingData?.timeline]);

  const workloadMinutes = briefingData?.timeline
    ? briefingData.timeline
        .filter((s: any) => s.status !== 'rescheduled_away')
        .reduce((acc: number, s: any) => acc + (s.duration || 30), 0)
    : 0;
  const workloadHours = Math.floor(workloadMinutes / 60);
  const workloadRemainingMinutes = workloadMinutes % 60;
  const workloadHoursStr = workloadRemainingMinutes > 0 
    ? `${workloadHours}h ${workloadRemainingMinutes}m` 
    : `${workloadHours}h`;

  const cancellationsCount = briefingData?.timeline 
    ? briefingData.timeline.filter((s: any) => s.status === 'canceled_by_student' || s.status === 'teacher_sick' || s.status === 'cancelled' || s.status === 'canceled_by_teacher_sick').length 
    : 0;


  // New Right Sidebar Sickness & Administrative feedback states
  const [isSickWidgetExpanded, setIsSickWidgetExpanded] = useState(() => {
    const shouldExpand = localStorage.getItem('expand_sick_widget') === 'true';
    if (shouldExpand) {
      localStorage.removeItem('expand_sick_widget');
      return true;
    }
    return false;
  });
  const [sickStartDate, setSickStartDate] = useState<string>(() => {
    const today = new Date();
    return today.toLocaleDateString('sv-SE');
  });
  const [sickUntilDate, setSickUntilDate] = useState<string>(() => {
    const saved = localStorage.getItem('selected_sick_date');
    if (saved) {
      localStorage.removeItem('selected_sick_date');
      return saved;
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toLocaleDateString('sv-SE');
  });
  const [showCustomStart, setShowCustomStart] = useState(false);
  const [reportingSick, setReportingSick] = useState(false);
  const [bypassSickView, setBypassSickView] = useState(false);
  const [sickSuccessShown, setSickSuccessShown] = useState(false);
  const [sickNotifModal, setSickNotifModal] = useState<{ notifs: any[]; sickUntilDateStr: string } | null>(null);
  const [crisisNotifications, setCrisisNotifications] = useState<any[]>([]);
  const [isCrisisWidgetExpanded, setIsCrisisWidgetExpanded] = useState(false);
  const [adminFeedbackRequests, setAdminFeedbackRequests] = useState<any[]>([]);
  const [adminFeedbackResponses, setAdminFeedbackResponses] = useState<any[]>([]);
  const [campusFeedAnnouncements, setCampusFeedAnnouncements] = useState<any[]>([]);
  const [feedInteractions, setFeedInteractions] = useState<any[]>([]);
  const [teacherFeedTab, setTeacherFeedTab] = useState<'campus' | 'class'>('campus');
  const [classFeedPosts, setClassFeedPosts] = useState<any[]>([]);
  const [classFeedInteractions, setClassFeedInteractions] = useState<any[]>([]);
  const [showClassPostForm, setShowClassPostForm] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostType, setNewPostType] = useState<'announcement' | 'homework'>('announcement');
  const [submittingClassPost, setSubmittingClassPost] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [respondingToRequestId, setRespondingToRequestId] = useState<string | null>(null);
  const [responseTextInput, setResponseTextInput] = useState<string>('');
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<Record<string, string>>({});
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [adminFeedbackTab, setAdminFeedbackTab] = useState<'open' | 'done'>('open');
  const [planningEvents, setPlanningEvents] = useState<any[]>([]);
  const [mySubmittedProgramPoints, setMySubmittedProgramPoints] = useState<any[]>([]);
  const [dismissedBanners, setDismissedBanners] = useState<Record<string, boolean>>({});

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

  useEffect(() => {
    const loadMyBookings = async () => {
      try {
        let allBookings: any[] = [];
        const stored = localStorage.getItem('groovelab_campus_bookings');
        if (stored) {
          allBookings = JSON.parse(stored);
        }

        // Fetch room_bookings from database for the logged-in teacher
        const { data: dbBookings } = await supabase
          .from('room_bookings')
          .select(`
            id,
            room_id,
            date,
            start_time,
            end_time,
            title,
            rooms (
              id,
              name
            )
          `)
          .eq('booked_by', userId);

        if (dbBookings && dbBookings.length > 0) {
          dbBookings.forEach((db: any) => {
            const startTimeStr = db.start_time ? db.start_time.substring(0, 5) : '00:00';
            const endTimeStr = db.end_time ? db.end_time.substring(0, 5) : '00:00';
            
            const isDup = allBookings.some((b: any) => 
              b.date === db.date && 
              b.startTime === startTimeStr && 
              b.roomId === db.room_id
            );

            if (!isDup) {
              const studentName = db.title && db.title.startsWith('Unterricht: ') 
                ? db.title.substring('Unterricht: '.length) 
                : null;

              allBookings.push({
                id: db.id,
                roomId: db.room_id,
                roomName: db.rooms?.name || 'Raum',
                date: db.date,
                startTime: startTimeStr,
                endTime: endTimeStr,
                purpose: db.title || 'Unterricht',
                teacherId: userId,
                teacherName: '',
                isSchedule: false,
                status: 'approved',
                studentName: studentName
              });
            }
          });
        }

        const { data: occurs } = await supabase
          .from('schedule_occurrences')
          .select(`
            id,
            date,
            original_date,
            start_time,
            original_start_time,
            status,
            room_id,
            teacher_id,
            student_id,
            student_acknowledged,
            schedules (
              duration,
              room_id,
              teacher_id,
              rooms (id, name)
            ),
            student:users!schedule_occurrences_student_id_fkey (
              id,
              first_name,
              last_name
            )
          `);

        let localOccurs: any[] = [];
        try {
          const pendingSaved = typeof window !== 'undefined' ? ((userId ? localStorage.getItem(`groovelab_pending_schedule_changes_${userId}`) : null) || localStorage.getItem('groovelab_pending_schedule_changes')) : null;
          if (pendingSaved) {
            const parsedPending = JSON.parse(pendingSaved);
            Object.values(parsedPending).forEach((item: any) => {
              if (item && item.date) {
                const itemTeacherId = item.teacher_id || item.teacherId;
                if (itemTeacherId && String(itemTeacherId).replace(/^teacher-/i, '') !== String(userId).replace(/^teacher-/i, '')) return;
                localOccurs.push({
                  ...item,
                  is_rescheduled: true,
                  is_moved: true,
                  status: item.status || 'pending_reschedule'
                });
              }
            });
          }
          const latestSaved = typeof window !== 'undefined' ? (userId ? localStorage.getItem('groovelab_calendar_active_occurrences_' + userId) : null) : null;
          if (latestSaved) {
            const parsedLatest = JSON.parse(latestSaved);
            if (Array.isArray(parsedLatest)) {
              parsedLatest.forEach((item: any) => {
                if (item && item.date) {
                  const itemTeacherId = item.teacher_id || item.teacherId;
                  if (itemTeacherId && String(itemTeacherId).replace(/^teacher-/i, '') !== String(userId).replace(/^teacher-/i, '')) return;
                  const isItemChanged = Boolean(
                    item.is_rescheduled || item.isRescheduled || item.is_moved || item.isMoved ||
                    (item.status && item.status !== 'scheduled') ||
                    (item.original_date && item.original_date !== item.date) ||
                    (item.original_start_time && item.start_time && item.original_start_time.substring(0, 5) !== item.start_time.substring(0, 5))
                  );
                  if (isItemChanged && !localOccurs.some(lo => String(lo.id) === String(item.id))) {
                    localOccurs.push({
                      ...item,
                      is_rescheduled: true,
                      is_moved: true
                    });
                  }
                }
              });
            }
          }
        } catch (e) {}

        const combinedRawOccurs = [...(occurs || [])];
        localOccurs.forEach((loc: any) => {
          if (!loc || !loc.date) return;
          const locTeacherId = loc.teacher_id || loc.teacherId;
          if (locTeacherId && String(locTeacherId).replace(/^teacher-/i, '') !== String(userId).replace(/^teacher-/i, '')) return;

          const existingIdx = combinedRawOccurs.findIndex(o => String(o.id) === String(loc.id));
          if (existingIdx >= 0) {
            combinedRawOccurs[existingIdx] = { ...combinedRawOccurs[existingIdx], ...loc };
          } else {
            combinedRawOccurs.push(loc);
          }
        });

        const mappedOccurs = combinedRawOccurs.map((occ: any) => {
          const startTimeStr = occ.start_time ? occ.start_time.substring(0, 5) : '00:00';
          const origStartTimeStr = occ.original_start_time ? occ.original_start_time.substring(0, 5) : null;
          const durationMin = occ.schedules?.duration || occ.duration || 45;
          const [shStr, smStr] = startTimeStr.split(':');
          const sh = parseInt(shStr) || 0;
          const sm = parseInt(smStr) || 0;
          const totalMin = sh * 60 + sm + durationMin;
          const eh = Math.floor(totalMin / 60) % 24;
          const em = totalMin % 60;
          const endTimeStr = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
          
          let rName = occ.schedules?.rooms?.name || occ.schedules?.room?.name || occ.roomName || occ.room_name;
          const rId = occ.room_id || occ.schedules?.room_id || occ.schedules?.rooms?.id;
          if ((!rName || rName === 'Raum') && rId && rooms && rooms.length > 0) {
            const foundRoom = rooms.find((r: any) => String(r.id) === String(rId));
            if (foundRoom) rName = foundRoom.name;
          }

          const studentDisplayName = (() => {
            if (occ.student) {
              const fn = occ.student.first_name || occ.student.firstName || '';
              const ln = occ.student.last_name || occ.student.lastName || '';
              const full = `${fn} ${maskLastName(ln, showRealNames)}`.trim();
              if (full) return full;
            }
            if (occ.student_name || occ.studentName || occ.name) {
              return occ.student_name || occ.studentName || occ.name;
            }
            if (occ.student_id && occ.student_id !== 'vacant' && !occ.student_id.startsWith('break-')) {
              return 'Schüler';
            }
            return null;
          })();

          return {
            id: occ.id,
            roomId: rId,
            roomName: (rName && rName !== 'Raum') ? rName : '',
            date: occ.date,
            original_date: occ.original_date,
            startTime: startTimeStr,
            original_start_time: origStartTimeStr,
            endTime: endTimeStr,
            purpose: studentDisplayName ? `Unterricht: ${studentDisplayName}` : 'Unterricht',
            teacherId: occ.teacher_id || occ.teacherId || userId,
            status: occ.status,
            isSchedule: true,
            studentName: studentDisplayName,
            student_acknowledged: occ.student_acknowledged,
            studentAcknowledged: occ.studentAcknowledged,
            is_rescheduled: occ.is_rescheduled || occ.isRescheduled,
            is_moved: occ.is_moved || occ.isMoved,
            isGroup: occ.isGroup || (studentDisplayName && studentDisplayName.includes('&'))
          };
        });

        const getLocalYYYYMMDD = (d: Date) => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        const simStr = typeof window !== 'undefined' ? localStorage.getItem('groovelab_simulated_date') : null;
        const today = simStr ? new Date(simStr + 'T00:00:00') : new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = getLocalYYYYMMDD(today);
        
        const twoWeeksLater = new Date(today);
        twoWeeksLater.setDate(today.getDate() + 14);
        const twoWeeksLaterStr = getLocalYYYYMMDD(twoWeeksLater);

        const filteredBookings = allBookings.filter((b: any) => {
          const bTeacherId = b.teacherId || b.teacher_id;
          if (bTeacherId && String(bTeacherId).replace(/^teacher-/i, '') !== String(userId).replace(/^teacher-/i, '')) return false;
          if (!b.date) return false;
          return b.date >= todayStr && b.date <= twoWeeksLaterStr;
        });

        const filteredOccurs = mappedOccurs.filter((b: any) => {
          const bTeacherId = b.teacherId || b.teacher_id;
          if (bTeacherId && String(bTeacherId).replace(/^teacher-/i, '') !== String(userId).replace(/^teacher-/i, '')) return false;
          if (!b.date) return false;
          if (b.student_id === 'vacant' || (typeof b.student_id === 'string' && b.student_id.startsWith('break-'))) return false;
          
          const isDateMoved = Boolean(b.original_date && b.original_date !== b.date);
          const isTimeMoved = Boolean(b.original_start_time && b.startTime && b.original_start_time.substring(0, 5) !== b.startTime.substring(0, 5));
          const isChangedStatus = Boolean(b.status && ['pending_reschedule', 'rescheduled_confirmed', 'rescheduled', 'cancelled', 'canceled_by_student', 'teacher_sick', 'canceled_by_teacher_sick', 'open_reschedule', 'changed'].includes(b.status));
          const isExplicitChange = Boolean(b.is_rescheduled || b.isRescheduled || b.is_changed || b.isChanged || b.is_moved || b.isMoved);

          const isRealReschedule = isDateMoved || isTimeMoved || isChangedStatus || isExplicitChange;
          if (!isRealReschedule) return false;

          let normDate = b.date || '';
          if (normDate.includes('.')) {
            const parts = normDate.split('.');
            if (parts.length === 3) {
              normDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }

          let normOrigDate = b.original_date || '';
          if (normOrigDate.includes('.')) {
            const parts = normOrigDate.split('.');
            if (parts.length === 3) {
              normOrigDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }

          return (normDate && normDate >= todayStr) || (normOrigDate && normOrigDate >= todayStr);
        });

        // Group together same date, time, status, and room changes (representing an Ensemble)
        const groupedOccursMap: Record<string, any> = {};
        filteredOccurs.forEach((occ: any) => {
          const key = `${occ.status}_${occ.date}_${occ.startTime}_${occ.roomId || occ.roomName}`;
          if (!groupedOccursMap[key]) {
            groupedOccursMap[key] = {
              ...occ,
              studentNames: occ.studentName ? [occ.studentName] : [],
              ids: [occ.id]
            };
          } else {
            if (occ.studentName && !groupedOccursMap[key].studentNames.includes(occ.studentName)) {
              groupedOccursMap[key].studentNames.push(occ.studentName);
            }
            groupedOccursMap[key].ids.push(occ.id);
          }
        });

        const finalOccurs = Object.values(groupedOccursMap).map((occ: any) => {
          if (occ.studentNames.length > 1) {
            return {
              ...occ,
              studentName: occ.studentNames.join(' & '),
              isGroup: true
            };
          }
          return occ;
        });

        // Sort both by date then start time
        filteredBookings.sort((a: any, b: any) => {
          const dateDiff = a.date.localeCompare(b.date);
          if (dateDiff !== 0) return dateDiff;
          return a.startTime.localeCompare(b.startTime);
        });

        finalOccurs.sort((a: any, b: any) => {
          const dateDiff = a.date.localeCompare(b.date);
          if (dateDiff !== 0) return dateDiff;
          return a.startTime.localeCompare(b.startTime);
        });

        setMyBookings(filteredBookings);
        setMyChangedAppointments(finalOccurs);
      } catch (err) {
        console.error('Failed to load my bookings:', err);
      }
    };

    loadMyBookings();
    window.addEventListener('storage', loadMyBookings);
    window.addEventListener('refresh-bookings', loadMyBookings);
    window.addEventListener('groovelab_schedule_changed', loadMyBookings);
    return () => {
      window.removeEventListener('storage', loadMyBookings);
      window.removeEventListener('refresh-bookings', loadMyBookings);
      window.removeEventListener('groovelab_schedule_changed', loadMyBookings);
    };
  }, [userId, ticker]);

  const handleBookingClick = (b: any) => {
    if (b.date) localStorage.setItem('groovelab_selected_booking_date', b.date);
    const rid = b.roomId || b.rooms?.id || '';
    if (rid) localStorage.setItem('groovelab_selected_booking_room_id', rid);
    if (b.startTime) localStorage.setItem('groovelab_selected_booking_start_time', b.startTime);
    if (b.endTime) localStorage.setItem('groovelab_selected_booking_end_time', b.endTime);
    
    if (onTabChange) {
      onTabChange('rooms');
    }
  };

  const handleDeleteMyBooking = async (b: any) => {
    if (!confirm('Möchtest du diese Buchung wirklich löschen/stornieren?')) {
      return;
    }
    
    try {
      // 1. Check if the booking is term-coupled (has a schedule occurrence)
      const { data: occ, error: occErr } = await supabase
        .from('schedule_occurrences')
        .select('*, schedules(*)')
        .eq('teacher_id', userId)
        .eq('date', b.date)
        .eq('start_time', b.startTime.length === 5 ? `${b.startTime}:00` : b.startTime)
        .maybeSingle();

      if (occErr) {
        console.warn('Error checking schedule occurrence:', occErr);
      }

      if (occ) {
        // This is a term-coupled room booking
        const regularRoomId = occ.schedules?.room_id;
        
        if (regularRoomId) {
          if (b.roomId === regularRoomId) {
            // Revert the occurrence back to its original date/time
            
            // Delete room booking matching rescheduled coordinates to avoid orphans
            const { error: roomBookingDelErr } = await supabase
              .from('room_bookings')
              .delete()
              .eq('booked_by', userId)
              .eq('date', b.date)
              .eq('start_time', b.startTime.length === 5 ? `${b.startTime}:00` : b.startTime);
            if (roomBookingDelErr) {
              console.warn('Error clearing associated room booking by coordinates:', roomBookingDelErr);
            }

            // Update the occurrence to mark it rescheduled-back, resetting student_acknowledged: false
            const { error: updErr } = await supabase
              .from('schedule_occurrences')
              .update({
                date: occ.original_date || occ.date,
                start_time: occ.original_start_time || occ.start_time,
                status: 'scheduled',
                student_acknowledged: false,
                original_date: occ.original_date || occ.date
              })
              .eq('id', occ.id);
            if (updErr) throw updErr;
            
            // Delete the room booking completely
            const { error: delErr } = await supabase
              .from('room_bookings')
              .delete()
              .eq('id', b.id);
            if (delErr) throw delErr;
            
            alert('Die Terminverschiebung wurde storniert und auf die ursprüngliche Zeit zurückgesetzt.');
          } else {
            // Re-assign the regular classroom by updating the room booking row
            const { error: updateErr } = await supabase
              .from('room_bookings')
              .update({ room_id: regularRoomId })
              .eq('id', b.id);
              
            if (updateErr) throw updateErr;
            
            // Fetch the room name for the alert
            const { data: roomData } = await supabase
              .from('rooms')
              .select('name')
              .eq('id', regularRoomId)
              .maybeSingle();
              
            const roomName = roomData?.name || 'regulären Unterrichtsraum';
            alert(`Der Raum für den Termin wurde wieder auf den ${roomName} zurückgesetzt.`);
          }
        } else {
          // No regular room is assigned to the schedule
          alert('Für diesen Termin wurde noch kein regulärer Raum zugeordnet.');
          return;
        }
      } else {
        // Regular manual booking - delete directly from room_bookings
        const { error: delErr } = await supabase
          .from('room_bookings')
          .delete()
          .eq('id', b.id);
          
        if (delErr) throw delErr;
      }
      
      // Dispatch refresh event to update other components/boards
      window.dispatchEvent(new CustomEvent('refresh-bookings'));
      // Trigger a local state refresh
      setTicker(prev => prev + 1);
    } catch (err) {
      console.error('Failed to delete booking:', err);
      alert('Fehler beim Löschen der Buchung.');
    }
  };

  const [currentTimeStr, setCurrentTimeStr] = useState<string>(() => {
    const now = getSimulatedNow();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  useEffect(() => {
    const updateTime = () => {
      const now = getSimulatedNow();
      setCurrentTimeStr(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'groovelab_simulated_date' || e.key === 'groovelab_simulated_start_timestamp') {
        updateTime();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const isWeekend = useMemo(() => {
    const today = getSimulatedNow();
    const day = today.getDay();
    return day === 0 || day === 6;
  }, [currentTimeStr]);

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

  const presenceTimes = useMemo(() => {
    if (!briefingData?.timeline || briefingData.timeline.length === 0) return null;
    const activeTimeline = briefingData.timeline.filter((s: any) => s.status !== 'rescheduled_away');
    if (activeTimeline.length === 0) return null;
    const sorted = [...activeTimeline].sort((a: any, b: any) => a.timeSlot.localeCompare(b.timeSlot));
    
    const firstSlot = sorted[0];
    const [fh, fm] = firstSlot.timeSlot.split(':').map(Number);
    const firstStartMin = fh * 60 + fm;

    const lastSlot = sorted[sorted.length - 1];
    const [lh, lm] = lastSlot.timeSlot.split(':').map(Number);
    const lastEndMin = lh * 60 + lm + (lastSlot.duration || 30);

    return {
      firstStartMin,
      lastEndMin
    };
  }, [briefingData?.timeline]);

  const shiftProgress = useMemo(() => {
    if (!presenceTimes) return { remainingStr: '', progressPercent: 0, remainingMinutes: 0 };
    const { firstStartMin, lastEndMin } = presenceTimes;
    
    // Parse currentTimeStr to minutes
    if (!currentTimeStr) return { remainingStr: '', progressPercent: 0, remainingMinutes: 0 };
    const [h, m] = currentTimeStr.split(':').map(Number);
    const curMin = h * 60 + m;

    const totalShiftMinutes = lastEndMin - firstStartMin;
    if (totalShiftMinutes <= 0) return { remainingStr: '', progressPercent: 0, remainingMinutes: 0 };
    
    let remainingMinutes = 0;
    let progressPercent = 0;

    if (curMin < firstStartMin) {
      remainingMinutes = totalShiftMinutes;
      progressPercent = 0;
    } else if (curMin > lastEndMin) {
      remainingMinutes = 0;
      progressPercent = 100;
    } else {
      remainingMinutes = lastEndMin - curMin;
      progressPercent = ((curMin - firstStartMin) / totalShiftMinutes) * 100;
    }

    const remainingHours = Math.floor(remainingMinutes / 60);
    const remainingMins = remainingMinutes % 60;
    const remainingStr = remainingMins > 0 ? `${remainingHours}h ${remainingMins}m` : `${remainingHours}h`;

    return {
      remainingStr,
      progressPercent,
      remainingMinutes
    };
  }, [presenceTimes, currentTimeStr]);

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

  const isFreeDay = useMemo(() => {
    return !isWeekend && (!briefingData?.timeline || briefingData.timeline.length === 0);
  }, [isWeekend, briefingData?.timeline]);

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
        
        const [avatarRes, progressRes, matrixRes] = await Promise.all([
          supabase
            .from('avatars')
            .select('evolution_level, xp, avatar_style, streak_flame')
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
            .limit(3),
          supabase
            .from('progress_matrix')
            .select('*')
            .eq('student_id', studentId)
            .order('updated_at', { ascending: false })
        ]);

        const studentAvatar = avatarRes.data;
        const recentProgress = progressRes.data;
        
        // Deduplicate matrixItems by topic_name (latest wins)
        const uniqueMatrixItemsMap = new Map<string, any>();
        (matrixRes.data || []).forEach((item: any) => {
          const name = (item.topic_name || '').trim().toLowerCase();
          if (name && !uniqueMatrixItemsMap.has(name)) {
            uniqueMatrixItemsMap.set(name, item);
          }
        });
        const matrixItems = Array.from(uniqueMatrixItemsMap.values());

        const verifiedSongs = (recentProgress || []).map((p: any) => ({
          title: p.exercises?.title || 'Übungssong',
          status: p.stage_ready_badge ? 'verifiziert' : 'in_progress',
          level: p.current_level || 1,
          note: p.exercises?.description || ''
        }));

        const currentWeekStr = getISOWeekRaw(new Date(), 1);
        const prevWeekDate = new Date();
        prevWeekDate.setDate(prevWeekDate.getDate() - 7);
        const prevWeekStr = getISOWeekRaw(prevWeekDate, 1);

        const parseHomeworkNotes = (rawNotes: string): string[] => {
          if (!rawNotes || rawNotes.trim() === '') return [];
          try {
            if (rawNotes.startsWith('[') && rawNotes.endsWith(']')) {
              return JSON.parse(rawNotes);
            }
            return rawNotes.split('\n\n').filter(Boolean);
          } catch (e) {
            return [rawNotes];
          }
        };

        const currentWeekItems = matrixItems.filter(item => 
          !item.topic_name.startsWith('Hausaufgabe KW ') && 
          item.status !== 'MASTERED' && 
          item.status !== 'THEORY_DONE' && 
          item.is_current_homework
        );

        const currentWeekNotesItem = matrixItems.find(item => 
          item.topic_name.startsWith('Hausaufgabe KW ') && 
          (item.is_current_homework || (item.updated_at && getISOWeekRaw(item.updated_at, 1) === currentWeekStr))
        ) || matrixItems.find(item => 
          item.is_current_homework && 
          item.homework_notes && 
          item.homework_notes.trim() !== ''
        );

        const currentWeekNotes = currentWeekNotesItem ? parseHomeworkNotes(currentWeekNotesItem.homework_notes) : [];

        const prevWeekItems = matrixItems.filter(item => 
          !item.topic_name.startsWith('Hausaufgabe KW ') && 
          item.status !== 'MASTERED' && 
          item.status !== 'THEORY_DONE' && 
          item.updated_at && 
          getISOWeekRaw(item.updated_at, 1) === prevWeekStr
        );

        const prevWeekNotesItem = matrixItems.find(item => 
          item.topic_name.startsWith('Hausaufgabe KW ') && 
          item.updated_at && 
          getISOWeekRaw(item.updated_at, 1) === prevWeekStr
        );

        const prevWeekNotes = prevWeekNotesItem ? parseHomeworkNotes(prevWeekNotesItem.homework_notes) : [];

        setDynamicPrepMirror({
          studentId,
          studentName: activeStudent.name,
          timeSlot: briefingData.timeline.find((s: any) => s.student?.id === studentId)?.timeSlot || '',
          streakCount: studentAvatar?.streak_flame || 0,
          evolutionLevel: studentAvatar?.evolution_level || 1,
          verifiedSongs,
          currentWeekNum: currentWeekStr.split('-W')[1] || '',
          currentWeekItems: currentWeekItems.map(item => ({
            title: item.topic_name,
            status: item.status
          })),
          currentWeekNotes,
          prevWeekNum: prevWeekStr.split('-W')[1] || '',
          prevWeekItems: prevWeekItems.map(item => ({
            title: item.topic_name,
            status: item.status
          })),
          prevWeekNotes
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
      const simNow = getSimulatedNow();
      const simDateStr = simNow.toLocaleDateString('sv-SE');
      try {
        setBriefingLoading(true);
        const resp = await fetch(`/api/briefing/teacher?userId=${userId}&date=${simDateStr}`);
        if (resp.ok && resp.headers.get('content-type')?.includes('application/json')) {
          const data = await resp.json();
          if (data && data.success) {
            setRawBriefingData(data);
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

          const rawDay = simNow.getDay();
          const todayWeekday = rawDay === 0 ? 7 : rawDay;

           const dayNamesMap: Record<number, string> = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday' };
           const dayNameStr = dayNamesMap[todayWeekday] || 'Monday';

           const { data: allTeacherSlots } = await supabase
            .from('schedules')
            .select(`
              id,
              time_slot,
              duration,
              status,
              day_of_week,
              instrument,
              rooms (id, name),
              student:users!schedules_student_id_fkey (
                id,
                first_name,
                last_name,
                is_app_user,
                instrument,
                birth_date,
                avatars (avatar_style, evolution_level, xp, streak_flame)
              )
            `)
            .eq('teacher_id', userId)
            .eq('school_id', teacherProfile.school_id)
            .in('status', ['opened', 'approved', 'published']);

           let slots = (allTeacherSlots || []).filter((s: any) => {
             return s.day_of_week === todayWeekday || 
                    s.day_of_week === dayNameStr || 
                    String(s.day_of_week) === String(todayWeekday) ||
                    String(s.day_of_week) === dayNameStr;
           });

           // Fallback to teacher planned_boards if DB schedules are empty
           if (slots.length === 0) {
             try {
               const { data: tUser } = await supabase
                 .from('users')
                 .select('planned_boards')
                 .eq('id', userId)
                 .single();

               if (tUser && tUser.planned_boards) {
                 const pb = typeof tUser.planned_boards === 'string' ? JSON.parse(tUser.planned_boards) : tUser.planned_boards;
                 let boards: any[] = [];
                 if (pb && typeof pb === 'object' && !Array.isArray(pb) && Array.isArray(pb.drafts)) {
                   const targetDraftId = pb.submittedDraftId || pb.activeDraftId;
                   const targetDraft = pb.drafts.find((d: any) => d.id === targetDraftId) || pb.drafts[0];
                   const isOpened = targetDraft && (targetDraft.status === 'opened' || targetDraft.status === 'approved' || targetDraft.status === 'published' || targetDraft.is_opened === true);
                   if (isOpened && Array.isArray(targetDraft.boards)) {
                     boards = targetDraft.boards;
                   }
                 } else if (Array.isArray(pb)) {
                   boards = pb;
                 } else if (pb && typeof pb === 'object') {
                   boards = Object.values(pb);
                 }

                 const todayBoard = boards.find((b: any) => 
                   b.dayOfWeek === todayWeekday || 
                   b.dayOfWeek === dayNameStr || 
                   String(b.dayOfWeek) === String(todayWeekday)
                 );

                 if (todayBoard && Array.isArray(todayBoard.students)) {
                   const { data: schoolStudents } = await supabase
                     .from('users')
                     .select('id, first_name, last_name, instrument, is_app_user, birth_date, avatars(avatar_style, evolution_level, xp, streak_flame)')
                     .eq('school_id', teacherProfile.school_id);

                   const boardStartStr = todayBoard.startTime || '14:00';
                   const [bSh, bSm] = boardStartStr.split(':').map(Number);
                   let currentCumulativeMin = (bSh || 14) * 60 + (bSm || 0);

                   todayBoard.students.forEach((s: any) => {
                     if (s.isBreak || !s.first_name) {
                       if (s.isBreak) {
                         currentCumulativeMin += (s.duration || 15);
                       }
                       return;
                     }
                     const matchedStudent = (schoolStudents || []).find((st: any) => 
                       st.id === s.id || 
                       (st.first_name?.trim().toLowerCase() === s.first_name?.trim().toLowerCase() && 
                        (st.last_name || '').trim().toLowerCase() === (s.last_name || '').trim().toLowerCase())
                     );

                     let studentTime = s.customStartTime || s.assignedTime || s.startTime;
                     if (!studentTime) {
                       const h = Math.floor(currentCumulativeMin / 60) % 24;
                       const m = currentCumulativeMin % 60;
                       studentTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                     }
                     const studentDuration = s.duration || 45;
                     currentCumulativeMin += studentDuration;

                     slots.push({
                       id: `board-${todayBoard.id}-${s.id}`,
                       time_slot: studentTime,
                       duration: studentDuration,
                       status: 'approved',
                       day_of_week: todayWeekday,
                       instrument: matchedStudent?.instrument || s.instrument || 'Klavier',
                       rooms: { id: todayBoard.roomId || null, name: todayBoard.roomName || 'Hauptraum' } as any,
                       student: (matchedStudent ? {
                         id: matchedStudent.id,
                         first_name: matchedStudent.first_name,
                         last_name: matchedStudent.last_name,
                         is_app_user: matchedStudent.is_app_user,
                         instrument: matchedStudent.instrument,
                         birth_date: matchedStudent.birth_date,
                         avatars: matchedStudent.avatars
                       } : {
                         id: s.id || `temp-${s.first_name}`,
                         first_name: s.first_name,
                         last_name: s.last_name || '',
                         is_app_user: false,
                         instrument: s.instrument || 'Klavier',
                         birth_date: null,
                         avatars: []
                       }) as any
                     });
                   });
                 }
               }
             } catch (e) {
               console.warn('Failed to parse planned_boards for briefing fallback:', e);
             }
           }

          const todayStr = new Date().toLocaleDateString('sv-SE');

          // Fetch occurrences for today for fallback
          const { data: dbOccurrences } = await supabase
            .from('schedule_occurrences')
            .select(`
              id,
              date,
              original_date,
              start_time,
              status,
              schedule_id,
              student_id,
              student_acknowledged,
              schedules (
                duration,
                instrument,
                rooms (id, name)
              ),
              student:users!schedule_occurrences_student_id_fkey (
                id,
                first_name,
                last_name,
                is_app_user,
                instrument,
                birth_date,
                avatars (avatar_style, evolution_level, xp, streak_flame)
              )
            `)
            .eq('teacher_id', userId)
            .eq('school_id', teacherProfile.school_id)
            .or(`date.eq.${todayStr},original_date.eq.${todayStr}`);

          // Also collect local occurrences from localStorage
          let localOccursForToday: any[] = [];
          try {
            const pendingSaved = typeof window !== 'undefined' ? ((userId ? localStorage.getItem(`groovelab_pending_schedule_changes_${userId}`) : null) || localStorage.getItem('groovelab_pending_schedule_changes')) : null;
            if (pendingSaved) {
              const parsedPending = JSON.parse(pendingSaved);
              Object.values(parsedPending).forEach((item: any) => {
                if (item && (item.date === todayStr || item.original_date === todayStr)) {
                  const itemTeacherId = item.teacher_id || item.teacherId;
                  if (!itemTeacherId || String(itemTeacherId).replace(/^teacher-/i, '') === String(userId).replace(/^teacher-/i, '')) {
                    localOccursForToday.push(item);
                  }
                }
              });
            }
            const latestSaved = typeof window !== 'undefined' ? (userId ? localStorage.getItem('groovelab_calendar_active_occurrences_' + userId) : null) : null;
            if (latestSaved) {
              const parsedLatest = JSON.parse(latestSaved);
              if (Array.isArray(parsedLatest)) {
                parsedLatest.forEach((item: any) => {
                  if (item && (item.date === todayStr || item.original_date === todayStr)) {
                    const itemTeacherId = item.teacher_id || item.teacherId;
                    if (!itemTeacherId || String(itemTeacherId).replace(/^teacher-/i, '') === String(userId).replace(/^teacher-/i, '')) {
                      localOccursForToday.push(item);
                    }
                  }
                });
              }
            }
          } catch (e) {}

          const combinedOccurrences = [...(dbOccurrences || [])];
          localOccursForToday.forEach((loc: any) => {
            const existingIdx = combinedOccurrences.findIndex(o => String(o.id) === String(loc.id));
            if (existingIdx >= 0) {
              combinedOccurrences[existingIdx] = { ...combinedOccurrences[existingIdx], ...loc };
            } else {
              combinedOccurrences.push(loc);
            }
          });

          // Format regular schedules
          const timeline = (slots || []).map((slot: any) => {
            const student = slot.student;
            const avatar = student?.avatars?.[0] || null;
            const isAnalogStickerUser = !student?.is_app_user || avatar?.avatar_style === 'Standard_Silhouette';

            return {
              id: `virtual-${slot.id}-${todayStr}`,
              scheduleId: slot.id,
              date: todayStr,
              timeSlot: slot.time_slot,
              duration: slot.duration,
              status: slot.status,
              roomId: slot.rooms?.id || null,
              room: slot.rooms?.name || 'Hauptraum',
              instrument: slot.instrument || student?.instrument || 'Klavier',
              student_acknowledged: true,
              original_date: null,
              student: student ? {
                id: student.id,
                name: `${student.first_name} ${maskLastName(student.last_name, showRealNames)}`.trim(),
                first_name: student.first_name,
                last_name: student.last_name,
                isAppUser: student.is_app_user ?? false,
                isAnalogStickerUser,
                birthDate: student.birth_date,
                streakFlame: avatar?.streak_flame || 0
              } : null
            };
          });

          // Merge with occurrences for today
          if (combinedOccurrences && combinedOccurrences.length > 0) {
            combinedOccurrences.forEach((occ: any) => {
              const student = occ.student;
              const avatar = student?.avatars?.[0] || null;
              const isAnalogStickerUser = !student?.is_app_user || avatar?.avatar_style === 'Standard_Silhouette';
              const formattedTime = occ.start_time ? occ.start_time.substring(0, 5) : (occ.startTime ? occ.startTime.substring(0, 5) : '00:00');
              const occStudentId = occ.student?.id || occ.student_id || occ.studentId;
              const occStudentFirstName = (occ.student?.first_name || occ.studentName || occ.student_name || '').split(' ')[0].toLowerCase();

              const findMatchingTimelineIdx = () => {
                return timeline.findIndex((t: any) => {
                  if (occ.schedule_id && String(t.scheduleId) === String(occ.schedule_id)) return true;
                  if (occStudentId && t.student?.id && String(t.student.id) === String(occStudentId)) return true;
                  if (occStudentFirstName && t.student?.name && t.student.name.toLowerCase().startsWith(occStudentFirstName)) return true;
                  return false;
                });
              };

              if (occ.original_date === todayStr && occ.date !== todayStr) {
                // Rescheduled AWAY from today -> mark as rescheduled_away
                const existingIdx = findMatchingTimelineIdx();
                if (existingIdx !== -1) {
                  timeline[existingIdx].status = 'rescheduled_away';
                }
              } else if (occ.date === todayStr) {
                // Rescheduled TO today or updated today -> update or insert into today's timeline
                const existingIdx = findMatchingTimelineIdx();
                const existingItem = existingIdx !== -1 ? timeline[existingIdx] : null;

                const mappedItem = {
                  id: occ.id,
                  scheduleId: occ.schedule_id || occ.id,
                  date: occ.date,
                  timeSlot: formattedTime,
                  duration: occ.schedules?.duration || occ.duration || existingItem?.duration || 30,
                  status: occ.status,
                  roomId: occ.schedules?.rooms?.id || occ.room_id || existingItem?.roomId || null,
                  room: occ.schedules?.rooms?.name || occ.roomName || occ.room_name || existingItem?.room || 'Hauptraum',
                  instrument: occ.schedules?.instrument || occ.instrument || existingItem?.instrument || student?.instrument || 'Klavier',
                  student_acknowledged: occ.student_acknowledged ?? occ.studentAcknowledged ?? true,
                  original_date: occ.original_date,
                  student: student ? {
                    id: student.id,
                    name: `${student.first_name} ${maskLastName(student.last_name, showRealNames)}`.trim(),
                    first_name: student.first_name,
                    last_name: student.last_name,
                    isAppUser: student.is_app_user ?? false,
                    isAnalogStickerUser,
                    birthDate: student.birth_date,
                    streakFlame: avatar?.streak_flame || 0
                  } : (existingItem?.student || null)
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

          const now = simNow;
          const currentStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          const nextSlot = timeline.find((s: any) => s.timeSlot >= currentStr) || timeline[0] || null;
          let prepMirror = null;

          if (nextSlot && nextSlot.student) {
            const studentId = nextSlot.student.id;
            
            const [avatarRes, progressRes, matrixRes] = await Promise.all([
              supabase
                .from('avatars')
                .select('evolution_level, xp, avatar_style, streak_flame')
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
                .limit(3),
              supabase
                .from('progress_matrix')
                .select('*')
                .eq('student_id', studentId)
                .order('updated_at', { ascending: false })
            ]);

            const studentAvatar = avatarRes.data;
            const recentProgress = progressRes.data;
            
            // Deduplicate matrixItems by topic_name (latest wins)
            const uniqueMatrixItemsMap = new Map<string, any>();
            (matrixRes.data || []).forEach((item: any) => {
              const name = (item.topic_name || '').trim().toLowerCase();
              if (name && !uniqueMatrixItemsMap.has(name)) {
                uniqueMatrixItemsMap.set(name, item);
              }
            });
            const matrixItems = Array.from(uniqueMatrixItemsMap.values());

            const verifiedSongs = (recentProgress || []).map((p: any) => ({
              title: p.exercises?.title || 'Übungssong',
              status: p.stage_ready_badge ? 'verifiziert' : 'in_progress',
              level: p.current_level || 1,
              note: allowMessages ? (p.exercises?.description || '') : '[SYSTEM: Nachrichten global stummgeschaltet]'
            }));

            const currentWeekStr = getISOWeekRaw(simNow, 1);
            const prevWeekDate = new Date(simNow);
            prevWeekDate.setDate(prevWeekDate.getDate() - 7);
            const prevWeekStr = getISOWeekRaw(prevWeekDate, 1);

            const parseHomeworkNotes = (rawNotes: string): string[] => {
              if (!rawNotes || rawNotes.trim() === '') return [];
              try {
                if (rawNotes.startsWith('[') && rawNotes.endsWith(']')) {
                  return JSON.parse(rawNotes);
                }
                return rawNotes.split('\n\n').filter(Boolean);
              } catch (e) {
                return [rawNotes];
              }
            };

            const currentWeekItems = matrixItems.filter(item => 
              !item.topic_name.startsWith('Hausaufgabe KW ') && 
              item.status !== 'MASTERED' && 
              item.status !== 'THEORY_DONE' && 
              item.is_current_homework
            );

            const currentWeekNotesItem = matrixItems.find(item => 
              item.topic_name.startsWith('Hausaufgabe KW ') && 
              (item.is_current_homework || (item.updated_at && getISOWeekRaw(item.updated_at, 1) === currentWeekStr))
            ) || matrixItems.find(item => 
              item.is_current_homework && 
              item.homework_notes && 
              item.homework_notes.trim() !== ''
            );

            const currentWeekNotes = currentWeekNotesItem ? parseHomeworkNotes(currentWeekNotesItem.homework_notes) : [];

            const prevWeekItems = matrixItems.filter(item => 
              !item.topic_name.startsWith('Hausaufgabe KW ') && 
              item.status !== 'MASTERED' && 
              item.status !== 'THEORY_DONE' && 
              item.updated_at && 
              getISOWeekRaw(item.updated_at, 1) === prevWeekStr
            );

            const prevWeekNotesItem = matrixItems.find(item => 
              item.topic_name.startsWith('Hausaufgabe KW ') && 
              item.updated_at && 
              getISOWeekRaw(item.updated_at, 1) === prevWeekStr
            );

            const prevWeekNotes = prevWeekNotesItem ? parseHomeworkNotes(prevWeekNotesItem.homework_notes) : [];

            prepMirror = {
              studentId,
              studentName: nextSlot.student.name,
              timeSlot: nextSlot.timeSlot,
              streakCount: studentAvatar?.streak_flame || 0,
              evolutionLevel: studentAvatar?.evolution_level || 1,
              verifiedSongs,
              currentWeekNum: currentWeekStr.split('-W')[1] || '',
              currentWeekItems: currentWeekItems.map(item => ({
                title: item.topic_name,
                status: item.status
              })),
              currentWeekNotes,
              prevWeekNum: prevWeekStr.split('-W')[1] || '',
              prevWeekItems: prevWeekItems.map(item => ({
                title: item.topic_name,
                status: item.status
              })),
              prevWeekNotes
            };
          }

          // Fetch rescheduled reminders for this week in fallback
          let rescheduledReminders: any[] = [];
          try {
            const startOfWeek = new Date(simNow);
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
                  id,
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
                const weekdayShort = dateObj.toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', '');
                const day = String(dateObj.getDate()).padStart(2, '0');
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const dateFormatted = `${day}.${month}`;
                const yearShort = dateObj.getFullYear().toString().substring(2);
                const timeFormatted = occ.start_time ? occ.start_time.substring(0, 5) : '';
                const originalDateObj = occ.original_date ? new Date(occ.original_date) : null;
                const originalWeekdayStr = originalDateObj ? originalDateObj.toLocaleDateString('de-DE', { weekday: 'long' }) : 'seinem regulären Termin';

                return {
                  id: occ.id,
                  studentName: `${occ.student?.first_name || ''} ${maskLastName(occ.student?.last_name, showRealNames)}`.trim(),
                  originalWeekday: originalWeekdayStr,
                  weekday: weekdayStr,
                  weekdayShort,
                  dateStr: dateFormatted,
                  yearShort,
                  time: timeFormatted
                };
              });
            }
          } catch (err) {
            console.warn('Failed to fetch fallback rescheduled reminders', err);
          }

          setRawBriefingData({
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
    const handleSimStorage = (e: Event) => {
      if (e instanceof StorageEvent) {
        if (e.key === 'groovelab_simulated_date' || e.key === 'groovelab_simulated_start_timestamp') {
          setBriefingRefreshTicker(prev => prev + 1);
        }
      } else {
        setBriefingRefreshTicker(prev => prev + 1);
      }
    };
    window.addEventListener('storage', handleSimStorage);
    return () => {
      window.removeEventListener('storage', handleSimStorage);
    };
  }, [userId, ticker, briefingRefreshTicker]);

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
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
      const containerElem = document.querySelector('.live-lab-grid') || document.querySelector('.blueprint-viewport');
      if (containerElem) {
        setContainerWidth((containerElem as HTMLDivElement).offsetWidth || 1000);
      }
    };
    
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleResize();
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);
    
    // Initial call to set correct sizes on mount
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
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

    let debounceTimer: any = null;
    const debouncedFetchData = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchData();
      }, 500);
    };

    const channelSessions = supabase
      .channel('realtime_teacher_sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        debouncedFetchData();
      })
      .subscribe();

    const channelHelp = supabase
      .channel('realtime_teacher_help')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'help_requests' }, () => {
        debouncedFetchData();
      })
      .subscribe();

    const channelSkills = supabase
      .channel('realtime_teacher_skills')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_song_skills' }, () => {
        debouncedFetchData();
      })
      .subscribe();

    const channelBands = supabase
      .channel('realtime_teacher_bands')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bands' }, () => {
        debouncedFetchData();
      })
      .subscribe();

    const channelCrisis = supabase
      .channel('realtime_teacher_crisis')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crisis_notifications' }, () => {
        debouncedFetchData();
      })
      .subscribe();

    const channelOccurrences = supabase
      .channel('realtime_teacher_occurrences')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_occurrences' }, () => {
        debouncedFetchData();
        setBriefingRefreshTicker(prev => prev + 1);
      })
      .subscribe();

    const channelUsers = supabase
      .channel('realtime_teacher_users')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users_raw' }, () => {
        debouncedFetchData();
      })
      .subscribe();

    const channelStudents = supabase
      .channel('realtime_teacher_students')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (payload) => {
        const oldRec = payload.old as any;
        const newRec = payload.new as any;
        if (oldRec?.teacher_id === userId && newRec?.teacher_id !== userId) {
          setToastMessage('ℹ️ Ein Schüler wurde neu zugewiesen.');
        }
        debouncedFetchData();
        setBriefingRefreshTicker(prev => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelSessions);
      supabase.removeChannel(channelHelp);
      supabase.removeChannel(channelSkills);
      supabase.removeChannel(channelBands);
      supabase.removeChannel(channelCrisis);
      supabase.removeChannel(channelOccurrences);
      supabase.removeChannel(channelUsers);
      supabase.removeChannel(channelStudents);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [userId, activePlatform, selectedRoomId, locationMode]);

  const fetchData = async () => {
    if (!userId) return;
    setFetchError(null);

    // Update coach presence in DB
    supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', userId).then(() => {});

    try {
      // 0. Shoutbox & Profile Info (Fetched in parallel first)
      let bIds: string[] = [];
      const [mBandsRes, cBandsRes, tDataRes, actDayRes] = await Promise.all([
        supabase.from('band_members').select('band_id').eq('user_id', userId),
        supabase.from('bands').select('id').eq('coach_id', userId),
        supabase.from('users').select('*, schools(*)').eq('id', userId).single(),
        supabase.from('activation_days').select('day_of_birth').eq('student_id', userId).maybeSingle()
      ]);

      const mBands = mBandsRes.data;
      const cBands = cBandsRes.data;
      let tData = tDataRes.data;

      // Fallback: if schools join failed (e.g. RLS on schools table for student), query users directly
      if (!tData && userId) {
        const { data: fallbackUser } = await supabase.from('users').select('*').eq('id', userId).single();
        if (fallbackUser) {
          tData = fallbackUser;
        }
      }

      if (tData) {
        tData.day_of_birth = actDayRes?.data?.day_of_birth || null;
      }

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
        supabase.from('schools').select('*').eq('id', tData.school_id).single().then(({ data: sd }) => {
          if (sd) {
            setSchoolData(sd);
            setInitialSchoolData(JSON.parse(JSON.stringify(sd)));
          }
        });
        // Prepare Student Query: fetch assigned students in the school
        let studentQuery = supabase.from('users').select('*').eq('school_id', tData.school_id).eq('role', 'student');
        if (tData.role === 'teacher') {
          studentQuery = studentQuery.eq('teacher_id', userId);
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

        // Concurrently query all school-based dashboard resources based on activeTab
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
          occRes,
          crisisRes,
          stationsRes
        ] = await Promise.all([
          // rooms
          (activeTab === 'live' || activeTab === 'briefing')
            ? Promise.resolve(supabase.from('rooms').select('*').eq('school_id', tData.school_id).eq('is_groovelab_active', true).order('sort_order', { ascending: true })).catch(e => ({ data: [], error: e }))
            : Promise.resolve({ data: [], error: null }),
          // user_availability
          (activeTab === 'settings')
            ? Promise.resolve(supabase.from('user_availability').select('*')).catch(e => ({ data: [], error: e }))
            : Promise.resolve({ data: [], error: null }),
          // sessions
          (activeTab === 'live' || activeTab === 'briefing')
            ? Promise.resolve(supabase.from('sessions').select('*, users!inner(*), stations(*)').is('check_out_time', null).eq('users.school_id', tData.school_id)).catch(e => ({ data: [], error: e }))
            : Promise.resolve({ data: [], error: null }),
          // coaches
          (activeTab === 'live' || activeTab === 'briefing' || activeTab === 'coaches')
            ? Promise.resolve(supabase.from('users').select('*').in('role', ['teacher', 'admin']).eq('school_id', tData.school_id)).catch(e => ({ data: [], error: e }))
            : Promise.resolve({ data: [], error: null }),
          // submissions (user_song_skills pending approval)
          (activeTab === 'live' || activeTab === 'briefing' || activeTab === 'proposals')
            ? Promise.resolve(supabase.from('user_song_skills').select('*, users!user_id(*), songs(*)').eq('is_pending_approval', true)).catch(e => ({ data: [], error: e }))
            : Promise.resolve({ data: [], error: null }),
          // bands
          (activeTab === 'briefing' || activeTab === 'bands')
            ? Promise.resolve(supabase.from('bands').select('*, band_members(*, users(*)), coach:users!coach_id(id, first_name, last_name, photo_url), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, last_name, photo_url, user_song_skills:user_song_skills!user_song_skills_user_id_fkey(id, song_id, instrument, progress_percent, is_pending_approval, is_stage_ready))))').eq('school_id', tData.school_id).order('name')).catch(e => ({ data: [], error: e }))
            : Promise.resolve({ data: [], error: null }),
          // student list (always fetched to ensure student roster and messaging board are populated)
          Promise.resolve(studentQuery.order('first_name')).catch(e => ({ data: [], error: e })),
          // help requests
          ((activeTab === 'live' || activeTab === 'briefing') && viewMode !== 'student')
            ? Promise.resolve(supabase.from('help_requests').select('*, users(*)').eq('school_id', tData.school_id).eq('status', 'pending').order('created_at', { ascending: false })).catch(e => ({ data: [], error: e }))
            : Promise.resolve({ data: null, error: null }),
          // forming bands
          (activeTab === 'briefing' || activeTab === 'live')
            ? Promise.resolve(supabase.from('bands').select('*, band_members(*, profiles:users(id, first_name, last_name, photo_url, created_at, birth_date)), songs(*), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, last_name, photo_url, created_at, birth_date)))').eq('school_id', tData.school_id).in('status', ['forming', 'active'])).catch(e => ({ data: [], error: e }))
            : Promise.resolve({ data: [], error: null }),
          // wall songs
          (activeTab === 'briefing' || activeTab === 'proposals' || activeTab === 'live')
            ? Promise.resolve(wallSongsQuery).catch(e => ({ data: [], error: e }))
            : Promise.resolve({ data: [], error: null }),
          // occupied slots (band_song_slots)
          (activeTab === 'briefing' || activeTab === 'live')
            ? Promise.resolve(supabase.from('band_song_slots').select('user_id, band_songs(song_id)')).catch(e => ({ data: [], error: e }))
            : Promise.resolve({ data: [], error: null }),
          // crisis
          (activeTab === 'briefing')
            ? Promise.resolve(supabase.from('crisis_notifications').select('*, student:users!crisis_notifications_student_id_fkey(id, first_name, last_name)').eq('teacher_id', userId).gte('slot_start_datetime', new Date(Date.now() - 24 * 60 * 60 * 1000 * 7).toISOString()).order('slot_start_datetime', { ascending: true })).catch(e => ({ data: [], error: e }))
            : Promise.resolve({ data: [], error: null }),
          // stations
          (activeTab === 'live')
            ? Promise.resolve(supabase.from('stations').select('*, rooms!inner(school_id, is_groovelab_active)').eq('rooms.school_id', tData.school_id).eq('rooms.is_groovelab_active', true).order('name')).catch(e => ({ data: [], error: e }))
            : Promise.resolve({ data: [], error: null })
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
        const crisisData = crisisRes.data;
        const sData = stationsRes.data;

        setCrisisNotifications(crisisData || []);

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
        setStations(sData || []);

        if (sessErr) {
          console.error('[Dashboard] Error fetching sessions:', sessErr);
          if (viewMode !== 'student') return;
        }

        const schoolSess = (sessData || [])
          .filter(s => {
            const u = Array.isArray(s.users) ? s.users[0] : s.users;
            if (!u) return false;

            // Filter out students for whom GrooveLab is not active
            const isStudent = u.role?.toLowerCase() === 'student';
            if (isStudent && !u.is_groovelab_active) return false;

            // Only show students who are GPS verified (in the lab)
            // Teachers/Admins are shown regardless if they are logged in
            const isStaff = u.role?.toLowerCase() === 'teacher' || u.role?.toLowerCase() === 'admin';
            return u.school_id === tData.school_id && (isStaff || s.gps_verified);
          })
          .map(s => ({
            ...s,
            users: Array.isArray(s.users) ? s.users[0] : s.users,
            stations: Array.isArray(s.stations) ? s.stations[0] : s.stations
          }));

        const trulyActive = schoolSess;
        setActiveSessions(trulyActive);

        // Auto-checkout stale session for current student removed to prevent race conditions and login/check-in loops.
        // The frontend should align to the DB state rather than checking out valid sessions.

        // 4. Coaches
        const hidePresence = sessionStorage.getItem('groovelab_teacher_hide_presence') === 'true';

        // Determine if the currently logged-in teacher should be visible.
        const isSelfCheckedIn =
          localCheckedInRef.current ||
          locationMode === 'lab' ||
          sessionStorage.getItem('groovelab_location_mode') === 'lab' ||
          trulyActive.some(s => s && s.user_id === userId);

        const isCurrentTeacher = tData?.role?.toLowerCase() === 'teacher' ||
                                 tData?.role?.toLowerCase() === 'admin' ||
                                 tData?.role?.toLowerCase() === 'secretary';

        // Build the list. The current user goes through the SAME filter path as everyone else
        // (no special exclusion+re-injection) so their data shape (photo_url etc.) is identical.
        const activeCoaches = (allCoaches || []).filter(c => {
          if (!c) return false;
          if (c.is_observer) return false;
          if (activeTab === 'coaches') {
            return true;
          }
          if (c.id === userId) {
            // Self: show when checked in, and always show if the board is visible (isUserCheckedIn is true)
            return isCurrentTeacher && (isUserCheckedIn || isSelfCheckedIn);
          }
          // Others: require an actual active DB session
          return trulyActive.some(s => s && s.user_id === c.id);
        });

        const mappedCoaches = activeCoaches
          .filter(Boolean)
          .map(c => ({
            id: c.id,
            users: c,
            session: trulyActive.find(s => s && s.user_id === c.id)
          }));

        const sortedMapped = [...mappedCoaches].sort((a, b) => {
          const aHasRole = a.users?.role === 'teacher' || a.users?.role === 'student';
          const bHasRole = b.users?.role === 'teacher' || b.users?.role === 'student';
          if (aHasRole && !bHasRole) return -1;
          if (!aHasRole && bHasRole) return 1;
          return 0;
        });

        const seenNames = new Set();
        const uniqueMapped = [];
        for (const coach of sortedMapped) {
          if (coach && coach.users) {
            const fullName = `${coach.users.first_name || ''} ${coach.users.last_name || ''}`.trim().toLowerCase();
            if (!seenNames.has(fullName)) {
              seenNames.add(fullName);
              uniqueMapped.push(coach);
            }
          }
        }

        setCoaches(uniqueMapped);

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
        const deduplicateStudents = (students: any[]): any[] => {
          if (!Array.isArray(students)) return [];
          const seenIds = new Set<string>();
          const studentMap = new Map<string, any>();

          for (const student of students) {
            if (!student) continue;
            if (student.id && seenIds.has(student.id)) continue;

            const fn = (student.first_name || '').trim().toLowerCase();
            const ln = (student.last_name || '').trim().toLowerCase();
            const nameKey = `${fn}_${ln}`;

            if (nameKey !== '_') {
              if (studentMap.has(nameKey)) {
                const existing = studentMap.get(nameKey);
                if (existing.isPendingOnboarding && !student.isPendingOnboarding) {
                  if (existing.id) seenIds.delete(existing.id);
                  studentMap.set(nameKey, student);
                  if (student.id) seenIds.add(student.id);
                }
                continue;
              }
              studentMap.set(nameKey, student);
            } else {
              const fallbackKey = student.id || `anon_${Math.random()}`;
              studentMap.set(fallbackKey, student);
            }

            if (student.id) seenIds.add(student.id);
          }

          return Array.from(studentMap.values());
        };

        const activePlat = activePlatform || (typeof window !== 'undefined' ? localStorage.getItem('groovelab_active_platform') : 'groovelab');

        let filteredStudData = (studData || []).filter((student: any) => {
          const fn = (student.first_name || '').trim().toLowerCase();
          const ln = (student.last_name || '').trim().toLowerCase();
          const email = (student.email || '').trim().toLowerCase();
          const isTest = fn.startsWith('test') || fn.startsWith('jane') || fn.startsWith('bob') || ln === 't.' || ln === 'test' || email.includes('test');
          if (isTest) return false;

          if (activePlat === 'groovelab') {
            const isActivatedBySchool = student.is_groovelab_active === true || student.isGroovelabActive === true;
            const isAddedByTeacher = (student.created_by_teacher_id === userId || student.teacher_id === userId) && student.added_in_groovelab === true;
            return isActivatedBySchool || isAddedByTeacher;
          }
          return true;
        });

        if (new Date().getMonth() === 7) { // 7 is August
          const currentYear = new Date().getFullYear();
          const limitDate = new Date(currentYear, 7, 31, 23, 59, 59).getTime();
          filteredStudData = filteredStudData.filter((student: any) => {
            if (!student.contract_ends_at) return true;
            const endDate = new Date(student.contract_ends_at).getTime();
            return endDate > limitDate;
          });
        }
        const dedupedStudents = deduplicateStudents(filteredStudData);
        setAllStudents(dedupedStudents);
        if (typeof window !== 'undefined') {
          (window as any).__groovelabAllStudents = dedupedStudents;
        }

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
            const instCount: Record<string, number> = {};
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
              const instCount: Record<string, number> = {};
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
            const instCount: Record<string, number> = {};
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

        if (activeTab === 'briefing') {
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

          // Fetch planning events & teacher program points submissions
          try {
            const { data: evs } = await supabase
              .from('campus_events')
              .select('*')
              .eq('school_id', tData.school_id)
              .eq('planning_status', 'planung');
            setPlanningEvents(evs || []);

            const isStaff = tData.role?.toLowerCase() === 'teacher' || tData.role?.toLowerCase() === 'admin';
            if (isStaff) {
              const { data: myPP } = await supabase
                .from('campus_event_program_points')
                .select('*')
                .eq('teacher_id', userId);
              setMySubmittedProgramPoints(myPP || []);
            } else {
              setMySubmittedProgramPoints([]);
            }
          } catch (pErr) {
            console.error('Error fetching planning events:', pErr);
          }

          // 10. Fetch Live Campus Feed Announcements from campus_announcements table
          try {
            const [annDataRes, reactDataRes, classPostsRes, classReactRes] = await Promise.all([
              supabase
                .from('campus_announcements')
                .select('*, users(first_name, last_name, photo_url)')
                .eq('school_id', tData.school_id)
                .order('created_at', { ascending: false }),
              supabase
                .from('feed_interactions')
                .select('*')
                .eq('post_type', 'campus'),
              supabase
                .from('class_feed_posts')
                .select('*')
                .eq('teacher_id', userId)
                .order('created_at', { ascending: false }),
              supabase
                .from('feed_interactions')
                .select('*')
                .eq('post_type', 'class')
            ]);

            if (!annDataRes.error && annDataRes.data) {
              const parsed = annDataRes.data.map(ann => ({
                id: ann.id,
                title: ann.title,
                content: ann.message,
                target_type: ann.target_type || 'all',
                category: ann.category || 'general',
                is_emergency: ann.is_emergency || false,
                attachment_url: ann.attachment_url || null,
                created_at: ann.created_at,
                user: ann.users
              }));
              setCampusFeedAnnouncements(parsed);
            } else {
              setCampusFeedAnnouncements([]);
            }

            if (!reactDataRes.error && reactDataRes.data) {
              setFeedInteractions(reactDataRes.data);
            } else {
              setFeedInteractions([]);
            }

            if (!classPostsRes.error && classPostsRes.data) {
              setClassFeedPosts(classPostsRes.data);
            } else {
              setClassFeedPosts([]);
            }

            if (!classReactRes.error && classReactRes.data) {
              setClassFeedInteractions(classReactRes.data);
            } else {
              setClassFeedInteractions([]);
            }
          } catch (aErr) {
            console.error('Error fetching announcements & interactions:', aErr);
          }
        }
      }
    } catch (err) {
      console.error('[Dashboard] Fetch error:', err);
      setFetchError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

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

  // Allows the logged-in teacher to remove themselves from "Coaches vor Ort" by checking out their session
  const handleTeacherSelfCheckout = useCallback(async () => {
    if (!window.confirm('Vom Lehrer iPad abmelden?')) return;
    const now = new Date().toISOString();
    await supabase.from('sessions').update({ check_out_time: now }).eq('user_id', userId).is('check_out_time', null);
    // Reset ref SYNCHRONOUSLY so fetchData doesn't re-add the teacher
    localCheckedInRef.current = false;
    // Immediately reset state so overlay reappears and self is removed from coaches
    setLocalCheckedIn(false);
    setCoaches(prev => prev.filter(c => c && c.id !== userId));
    if (onSessionChange) onSessionChange(null);
    if (onLocationModeChange) onLocationModeChange('home');
    sessionStorage.setItem('groovelab_location_mode', 'home');
    await fetchData();
  }, [userId, onSessionChange, onLocationModeChange, teacher]);

  // Allows manual checkout of other teachers
  const handleTeacherCheckout = useCallback(async (coach: any) => {
    if (!coach) return;
    const coachName = `${coach.users?.first_name || ''} ${coach.users?.last_name || ''}`.trim();
    if (!window.confirm(`Möchtest du Coach ${coachName} wirklich abmelden?`)) return;
    const now = new Date().toISOString();
    await supabase.from('sessions').update({ check_out_time: now }).eq('user_id', coach.id).is('check_out_time', null);
    await fetchData();
  }, [fetchData]);

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

      const { error } = await supabase.from('band_members').insert(insertData);
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

         const { error: slotErr } = await supabase.from('band_song_slots').insert(slotsToInsert);
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
    const { data: sub } = await supabase.from('user_song_skills').select('user_id, song_id, instrument, difficulty_level, songs(title)').eq('id', subId).single();
    
    await supabase.from('user_song_skills').update({ is_pending_approval: false, is_stage_ready: true, verified_by_id: userId }).eq('id', subId);
    
    if (sub) {
      // Send a realtime broadcast to the student's dashboard!
      const songTitle = Array.isArray((sub as any).songs) ? ((sub as any).songs[0] as any)?.title : ((sub as any).songs as any)?.title;
      const channel = supabase.channel(`realtime_student_progress_${sub.user_id}`);
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'challenge-approved',
            payload: {
              songId: sub.song_id,
              songTitle: songTitle || 'Song',
              instrument: sub.instrument,
              difficultyLevel: sub.difficulty_level
            }
          });
          setTimeout(() => supabase.removeChannel(channel), 1000);
        }
      });
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
    
    const studentId = crypto.randomUUID();
    const qrToken = crypto.randomUUID();
    
    const activeSchool = schoolData || (Array.isArray(teacher?.schools) ? teacher?.schools[0] : teacher?.schools);
    const hasCampus = activeSchool?.has_campus_subscription !== false;
    const finalLastName = hasCampus ? newStudent.lastName : (newStudent.lastName?.trim() ? newStudent.lastName.trim().charAt(0).toUpperCase() + '.' : '');
    const finalBirthDate = hasCampus ? (newStudent.birthDate ? newStudent.birthDate : null) : null;
    
    const { data, error } = await supabase.from('users').insert({
      id: studentId,
      school_id: teacher.school_id, 
      role: 'student', 
      first_name: newStudent.firstName, 
      last_name: finalLastName,
      email: `student.${studentId}@campus-groovelab.local`,
      birth_date: finalBirthDate,
      photo_url: newStudent.photoUrl || '/avatar_ghost.jpg',
      qr_token: qrToken,
      is_external_vocalist: newStudent.isExternalVocalist,
      instrument: newStudent.isExternalVocalist ? 'Vocals' : 'Musiker',
      status: newStudent.status || 'active',
      is_trial: newStudent.is_trial || false,
      trial_ends_at: newStudent.is_trial && newStudent.trial_ends_at ? newStudent.trial_ends_at : null,
      contract_ends_at: newStudent.contract_ends_at ? newStudent.contract_ends_at : null,
      is_campus_active: activeSchool?.student_billing_option === 'option3_3' || activeSchool?.student_billing_option === 'all_inclusive',
      is_groovelab_active: activeSchool?.student_billing_option === 'option3_3' || activeSchool?.student_billing_option === 'all_inclusive',
      teacher_id: userId,
      app_usage_mode: newStudent.app_usage_mode || 'student_only'
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
        contract_ends_at: '',
        app_usage_mode: 'student_only'
      }); 
      fetchData();
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    const activeSchool = schoolData || (Array.isArray(teacher?.schools) ? teacher?.schools[0] : teacher?.schools);
    const hasCampus = activeSchool?.has_campus_subscription !== false;
    const finalLastName = hasCampus ? (editingStudent.last_name || '') : (editingStudent.last_name?.trim() ? editingStudent.last_name.trim().charAt(0).toUpperCase() + '.' : '');
    const finalBirthDate = hasCampus ? (editingStudent.birth_date || null) : null;

    const { error } = await supabase.from('users').update({
      first_name: editingStudent.first_name,
      last_name: finalLastName,
      birth_date: finalBirthDate,
      status: editingStudent.status || 'active',
      is_trial: editingStudent.is_trial || false,
      trial_ends_at: editingStudent.is_trial && editingStudent.trial_ends_at ? editingStudent.trial_ends_at : null,
      contract_ends_at: editingStudent.contract_ends_at || null,
      is_external_vocalist: editingStudent.is_external_vocalist || false,
      instrument: editingStudent.is_external_vocalist ? 'Vocals' : 'Musiker',
      app_usage_mode: editingStudent.app_usage_mode || 'student_only'
    }).eq('id', editingStudent.id);
    
    if (error) {
      alert('Fehler beim Aktualisieren: ' + error.message);
    } else {
      setAllStudents(prev => prev.map(s => s.id === editingStudent.id ? editingStudent : s));
      setEditingStudent(null);
      fetchData();
    }
  };

  const handleDeleteStudent = (id: string) => {
    const studentToDelete = allStudents.find(s => s.id === id);
    if (!studentToDelete) return;

    const teacherName = teacher ? `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() : undefined;
    const studentName = `${studentToDelete.first_name || ''} ${studentToDelete.last_name || ''}`.trim() || 'Schüler';

    setDeleteStudentModalData({
      id: studentToDelete.id,
      name: studentName,
      instrument: studentToDelete.instrument,
      teacherName,
      isCampusActive: studentToDelete.is_campus_active,
      isGroovelabActive: studentToDelete.is_groovelab_active
    });
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
      const activeSchool = schoolData || (Array.isArray(teacher?.schools) ? teacher?.schools[0] : teacher?.schools);
      const studentId = crypto.randomUUID();
      const qrToken = crypto.randomUUID();
      const lName = inviteLastName.trim();
      const formattedLast = lName;
      const { data, error } = await supabase.from('users').insert({
        id: studentId,
        school_id: teacher.school_id,
        role: 'student',
        first_name: inviteFirstName.trim(),
        last_name: formattedLast,
        email: `student.${studentId}@campus-groovelab.local`,
        photo_url: '/avatar_ghost.jpg',
        qr_token: qrToken,
        instrument: 'Musiker',
        status: 'invited',
        is_trial: true,
        is_campus_active: activeSchool?.student_billing_option === 'option3_3' || activeSchool?.student_billing_option === 'all_inclusive',
        is_groovelab_active: activeSchool?.student_billing_option === 'option3_3' || activeSchool?.student_billing_option === 'all_inclusive',
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

  const isStaff = teacher?.role?.toLowerCase() === 'teacher' || teacher?.role?.toLowerCase() === 'admin';
  const activePlanningEvents = isStaff ? planningEvents.filter(ev => {
    if (!ev.is_planning_active) return false;
    const hasSubmitted = mySubmittedProgramPoints.some(pp => pp.event_id === ev.id);
    if (hasSubmitted) return false;
    const hasConfirmedNoSubmission = ev.no_submission_teacher_ids?.includes(userId);
    if (hasConfirmedNoSubmission) return false;
    if (ev.submission_deadline) {
      const deadlineTime = new Date(ev.submission_deadline).getTime();
      if (Date.now() > deadlineTime) return false;
    }
    return true;
  }) : [];

  const getCountdownString = (deadlineStr: string) => {
    const diff = new Date(deadlineStr).getTime() - Date.now();
    if (diff <= 0) return 'Abgelaufen';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}T ${hours}Std übrig`;
    if (hours > 0) return `${hours}Std ${minutes}Min übrig`;
    return `${minutes}Min übrig`;
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
          background: rgba(52, 168, 83, 0.08) !important;
          color: #34a853 !important;
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
              photo_url: std.photo_url || '/avatar_ghost.jpg',
              is_campus_active: std.is_campus_active
            });
            setSelectedStudentProfile(null);
          }}
        />
      )}
      <ConfirmDeleteStudentModal
        isOpen={!!deleteStudentModalData}
        student={deleteStudentModalData}
        activePlatform={activePlatform === 'campus' ? 'campus' : activePlatform === 'groovelab' ? 'groovelab' : 'all'}
        onClose={() => setDeleteStudentModalData(null)}
        onConfirm={async (studentId) => {
          const res = await deleteStudentFully(studentId, {
            activePlatform: activePlatform === 'campus' ? 'campus' : activePlatform === 'groovelab' ? 'groovelab' : 'all',
            isCampusActive: deleteStudentModalData?.isCampusActive,
            isGroovelabActive: deleteStudentModalData?.isGroovelabActive
          });
          if (!res.success) {
            throw new Error(res.error);
          }
          setAllStudents(prev => prev.filter(s => s.id !== studentId));
          fetchData();
        }}
      />
       {docStudent && (
        <MeisterwerkDocumentationModal 
          student={docStudent} 
          onClose={() => setDocStudent(null)} 
          teacherId={userId}
          onProfileClick={(student) => {
            setDocStudent(null);
            setSelectedStudentProfile(student);
          }}
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
                <div style={{ background: '#e6f4ea', border: '1.5px solid #e6f4ea', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', background: '#34a853', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: 'white', fontSize: '1rem' }}>✓</span>
                    </div>
                    <div>
                      <div style={{ fontWeight: 900, color: '#34a853' }}>Profil angelegt!</div>
                      <div style={{ fontSize: '0.78rem', color: '#34a853' }}>Teile den Link mit dem Schüler</div>
                    </div>
                  </div>
                  <div style={{ background: 'white', border: '1px solid #e6f4ea', borderRadius: '12px', padding: '12px 16px', wordBreak: 'break-all', fontSize: '0.75rem', color: '#475569', fontFamily: 'monospace' }}>
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
            {(() => {
              const tabs = [
                { id: 'briefing', label: 'Briefing', icon: LayoutDashboard },
                { id: 'live', label: 'Live Lab', icon: Music },
                { id: 'bands', label: 'Bands', icon: Users },
                { id: 'students', label: 'Schüler', icon: teachersManageTeachers ? Users : GraduationCap }
              ];
              if (teachersManageTeachers) {
                tabs.push({ id: 'coaches', label: 'Lehrer', icon: GraduationCap });
              }
              tabs.push({ id: 'settings', label: 'Einstellungen', icon: Settings });
              return tabs;
            })().map((tab) => {
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
        padding: hideHeader ? '0' : (windowWidth < 768 ? '10px 10px 90px 10px' : '10px'),
        overflowY: (activeTab === 'briefing' && windowWidth >= 768) ? 'hidden' : 'auto',
        height: windowWidth < 768 ? 'auto' : '100vh',
        minHeight: '100vh',
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
                    {activeTab === 'students' ? `🎓 Schülerverwaltung (${allStudents.filter(s => activePlatform === 'campus' ? (s.is_campus_active === true || s.isCampusActive === true) : (s.is_groovelab_active === true || s.isGroovelabActive === true)).length})` : `👥 Bands (${allBands.length})`}
                  </h2>
                  <p style={{ color: '#64748b', fontWeight: 600, fontSize: '0.85rem', marginTop: '4px' }}>
                    {teacher ? `${teacher.first_name} ${teacher.last_name} • ${teacher.instrument || 'Coach'}` : 'Zentrale'}
                  </p>
                </>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <TourStartButton onClick={startTour} platformTheme={activePlatform === 'campus' ? 'campus' : 'groovelab'} />
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
                  <div style={{ background: '#e6f4ea', padding: '8px 16px', borderRadius: '100px', border: '1px solid #34a853', color: '#34a853', fontSize: '0.85rem', fontWeight: 800 }}>
                    {activeSessions.filter(s => {
                      const u = s.users;
                      if (!u) return false;
                      const isStudent = u.role?.toLowerCase() === 'student';
                      const isStaff = u.role?.toLowerCase() === 'teacher' || u.role?.toLowerCase() === 'admin';
                      return isStudent && !isStaff && u.is_groovelab_active && s.gps_verified;
                    }).length} im Lab
                  </div>
                </>
              )}
            </div>
          </header>
        )}
        {activeTab === 'briefing' && !hideHeader ? (
          <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '10px', alignItems: 'start', width: '100%' }} className="dashboard-main-grid">
            
            <div style={{ 
              flex: '1 1 600px',
              minWidth: '320px',
              maxWidth: '100%',
              display: 'flex', 
              flexDirection: 'column', 
              gap: '10px',
              maxHeight: 'calc(100vh - 60px)',
              overflowY: 'auto',
              paddingRight: '10px',
              paddingBottom: '80px',
              boxSizing: 'border-box'
            }}>
              {briefingLoading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Briefing wird geladen...</div>
              ) : briefingData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Planning Active Banners */}
                  {activePlanningEvents.map(ev => {
                    if (dismissedBanners[ev.id]) return null;
                    return (
                      <div
                        key={`planning-banner-${ev.id}`}
                        style={{
                          background: 'linear-gradient(to right, #ffedd5, #fffbeb)',
                          border: '1.5px solid #ffedd5',
                          borderRadius: '16px',
                          padding: '12px 20px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          boxShadow: '0 4px 20px rgba(234, 88, 12, 0.06)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.1rem' }}>📢</span>
                          <div>
                            <strong style={{ fontSize: '0.86rem', color: '#7c2d12' }}>Planung aktiv: {ev.title}</strong>
                            <span style={{ fontSize: '0.78rem', color: '#9a3412', marginLeft: '12px' }}>
                              {ev.submission_deadline
                                ? `Frist endet am ${new Date(ev.submission_deadline).toLocaleString('de-DE', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} Uhr`
                                : 'Reiche jetzt deine Beiträge ein!'}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              localStorage.setItem('groovelab_auto_submit_event_id', ev.id);
                              onTabChange?.('events');
                            }}
                            style={{
                              background: '#ea580c',
                              color: '#ffffff',
                              border: 'none',
                              padding: '6px 14px',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(234, 88, 12, 0.2)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            Jetzt Einreichen
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm('Bist du sicher, dass du für diese Veranstaltung keine Beiträge einreichen möchtest?')) {
                                const currentIds = ev.no_submission_teacher_ids || [];
                                const { error } = await supabase
                                  .from('campus_events')
                                  .update({ no_submission_teacher_ids: [...currentIds, userId] })
                                  .eq('id', ev.id);
                                if (!error) {
                                  fetchData();
                                } else {
                                  alert('Fehler beim Speichern: ' + error.message);
                                }
                              }
                            }}
                            style={{
                              background: 'transparent',
                              color: '#ea580c',
                              border: '1.5px solid #ea580c',
                              padding: '5px 12px',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            Keine Beiträge
                          </button>
                          <button
                            type="button"
                            onClick={() => setDismissedBanners(prev => ({ ...prev, [ev.id]: true }))}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#9a3412',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: 0.7
                            }}
                            title="Schließen"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Holiday Banner */}
                  {isTodayHoliday && (
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.1) 0%, rgba(255, 255, 255, 0.98) 100%)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: '1px solid rgba(52, 168, 83, 0.18)',
                      padding: '18px 24px',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      boxShadow: '0 8px 30px rgba(52, 168, 83, 0.04)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        position: 'absolute',
                        right: '-20px',
                        bottom: '-20px',
                        width: '100px',
                        height: '100px',
                        background: 'radial-gradient(circle, rgba(52, 168, 83, 0.1) 0%, transparent 70%)',
                        pointerEvents: 'none'
                      }} />
                      <div style={{
                        background: 'rgba(52, 168, 83, 0.08)',
                        border: '1.5px solid rgba(52, 168, 83, 0.12)',
                        color: '#34a853',
                        padding: '10px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Palmtree size={20} strokeWidth={2.2} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '0.62rem',
                            fontWeight: 900,
                            color: '#34a853',
                            background: 'rgba(52, 168, 83, 0.08)',
                            padding: '2px 6px',
                            borderRadius: '5px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            Schulfrei
                          </span>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>
                            {isTodayHoliday.name}
                          </h4>
                        </div>
                        <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#475569', fontWeight: 600, lineHeight: 1.4 }}>
                          Vom <strong style={{ color: '#34a853', fontWeight: 800 }}>{new Date(isTodayHoliday.start).toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit'})}</strong> bis zum <strong style={{ color: '#34a853', fontWeight: 800 }}>{new Date(isTodayHoliday.end).toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit'})}</strong> findet kein regulärer Unterricht statt. Genieße die Ferien!
                        </p>
                      </div>
                    </div>
                  )}
                  {/* Sick-week note banner in Briefing Board */}
                  {teacher?.sick_until && (() => {
                    const todayLocal = new Date();
                    todayLocal.setHours(0, 0, 0, 0);
                    const sickUntilLocal = new Date(teacher.sick_until);
                    sickUntilLocal.setHours(23, 59, 59, 999);
                    const sickStartLocal = teacher.sick_start ? new Date(teacher.sick_start) : todayLocal;
                    sickStartLocal.setHours(0, 0, 0, 0);
                    // Show banner if today is within sick period
                    if (todayLocal >= sickStartLocal && todayLocal <= sickUntilLocal) {
                      const endStr = sickUntilLocal.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
                      return (
                        <div style={{
                          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(255, 255, 255, 0.97) 100%)',
                          backdropFilter: 'blur(12px)',
                          WebkitBackdropFilter: 'blur(12px)',
                          border: '1.5px solid rgba(239, 68, 68, 0.2)',
                          padding: '16px 20px',
                          borderRadius: '16px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '14px',
                          boxShadow: '0 4px 16px rgba(239, 68, 68, 0.06)'
                        }}>
                          <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1.5px solid rgba(239, 68, 68, 0.15)',
                            color: '#dc2626',
                            padding: '8px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <span style={{ fontSize: '1.1rem' }}>🤒</span>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                              <span style={{
                                fontSize: '0.6rem',
                                fontWeight: 900,
                                color: '#dc2626',
                                background: 'rgba(239, 68, 68, 0.1)',
                                padding: '2px 6px',
                                borderRadius: '5px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                              }}>Krankmeldung aktiv</span>
                              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>
                                Kein Unterricht diese Woche
                              </h4>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: '#7f1d1d', fontWeight: 600, lineHeight: 1.4 }}>
                              Du bist bis einschließlich <strong>{endStr}</strong> krankgemeldet. Alle betroffenen Schüler wurden benachrichtigt.
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Bypass banner */}
                  {teacher?.sick_until && bypassSickView && (
                    <div style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      backdropFilter: 'blur(20px) saturate(190%)',
                      border: '1.5px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '16px',
                      padding: '12px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.05)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', fontSize: '0.85rem', fontWeight: 700 }}>
                        <span style={{ fontSize: '1.1rem' }}>🩹</span>
                        <span>Du befindest dich im Krank-Modus (Bypass aktiv). Deine Schüler sehen den Krank-Status.</span>
                      </div>
                      <button 
                        onClick={() => setBypassSickView(false)}
                        style={{
                          background: '#ff3b30',
                          color: '#ffffff',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(255, 59, 48, 0.2)',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = '#e03126'}
                        onMouseOut={e => e.currentTarget.style.background = '#ff3b30'}
                      >
                        Zurück zur Krank-Ansicht
                      </button>
                    </div>
                  )}

                  {teacher?.sick_until && !bypassSickView ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '24px',
                      background: 'rgba(255, 255, 255, 0.45)',
                      backdropFilter: 'blur(24px) saturate(190%)',
                      border: '1px solid rgba(255, 255, 255, 0.5)',
                      borderRadius: '24px',
                      padding: '32px',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.03)',
                      boxSizing: 'border-box'
                    }}>
                      {/* Hero Section */}
                      <div style={{
                        background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 50%, #fecdd3 100%)',
                        border: '1px solid rgba(251, 113, 133, 0.2)',
                        borderRadius: '20px',
                        padding: '32px',
                        textAlign: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 10px 30px -5px rgba(251, 113, 133, 0.15)'
                      }}>
                        <Heart size={48} color="#be123c" fill="#be123c" style={{ margin: '0 auto 12px auto' }} />
                        <h2 style={{
                          margin: '0 0 8px 0',
                          fontSize: '1.8rem',
                          fontWeight: 900,
                          color: '#9f1239',
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          letterSpacing: '-0.02em'
                        }}>
                          Gute Besserung, {teacher?.first_name || 'Patrick'}!
                        </h2>
                        <p style={{
                          margin: 0,
                          fontSize: '0.95rem',
                          color: '#be123c',
                          fontWeight: 600,
                          lineHeight: 1.6,
                          maxWidth: '540px',
                          marginLeft: 'auto',
                          marginRight: 'auto'
                        }}>
                          Deine Gesundheit steht an erster Stelle. Ruh dich aus – wir haben den Krankheits-Modus für dich aktiviert. Alle deine betroffenen Schüler wurden automatisch informiert.
                        </p>
                      </div>



                      {/* Actions */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '16px',
                        marginTop: '8px'
                      }}>
                        <button
                          onClick={() => setBypassSickView(true)}
                          style={{
                            background: 'transparent',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            padding: '12px 24px',
                            borderRadius: '12px',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={e => {
                            e.currentTarget.style.background = '#f1f5f9';
                            e.currentTarget.style.borderColor = '#94a3b8';
                          }}
                          onMouseOut={e => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = '#cbd5e1';
                          }}
                        >
                          Briefing Board ansehen
                        </button>

                        <button
                          onClick={handleEndSick}
                          style={{
                            background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '12px 28px',
                            borderRadius: '12px',
                            fontSize: '0.9rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(52, 168, 83, 0.2)',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                          onMouseOut={e => e.currentTarget.style.transform = 'none'}
                        >
                          Ich bin wieder gesund ☀️
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Gamified KPI Cards row */}
                      {(!teacher?.sick_until || bypassSickView) && (
                        <div id="tour-teacher-kpis" style={{ display: 'grid', gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth <= 1024 ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '10px' }}>

                      {/* Card 1: Heutige Schüler (Blue-purple matching Level XP) */}
                      <div style={{
                        position: 'relative', overflow: 'hidden',
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white',
                        borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.3)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '70px',
                        padding: '16px', boxSizing: 'border-box',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }} className="hover-scale">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Schüler Heute</span>
                          <div style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '6px', borderRadius: '10px' }}>
                            <Users size={14} color="white" />
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '8px' }}>
                          <span style={{ fontSize: '1.6rem', fontWeight: 950, letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{activeLessonsCount}</span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, opacity: 0.9 }}>UE</span>
                        </div>
                      </div>

                      {/* Card 2: Ø Übe-Streak Heute (Green matching Songs) */}
                      <div style={{
                        position: 'relative', overflow: 'hidden',
                        background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)', color: 'white',
                        borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(52, 168, 83, 0.3)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '70px',
                        padding: '16px', boxSizing: 'border-box',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }} className="hover-scale">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ø Übe-Streak</span>
                          <div style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '6px', borderRadius: '10px' }}>
                            <Flame size={14} color="white" />
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '8px' }}>
                          <span style={{ fontSize: '1.6rem', fontWeight: 950, letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{avgStreak}</span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, opacity: 0.9 }}>Tage</span>
                        </div>
                      </div>

                      {/* Card 3: Tages-Pensum (Yellow matching Übeminuten) */}
                      <div style={{
                        position: 'relative', overflow: 'hidden',
                        background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)', color: 'white',
                        borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(234, 179, 8, 0.35)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '70px',
                        padding: '16px', boxSizing: 'border-box',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }} className="hover-scale">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tages-Pensum</span>
                          <div style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '6px', borderRadius: '10px' }}>
                            <Clock size={14} color="white" />
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '8px' }}>
                          <span style={{ fontSize: '1.6rem', fontWeight: 950, letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{workloadHoursStr}</span>
                        </div>
                      </div>

                      {/* Card 4: Ausfälle Heute (Red matching Tagesserie) */}
                      <div style={{
                        position: 'relative', overflow: 'hidden',
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white',
                        borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.3)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '70px',
                        padding: '16px', boxSizing: 'border-box',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }} className="hover-scale">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ausfälle</span>
                          <div style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '6px', borderRadius: '10px' }}>
                            <AlertCircle size={14} color="white" />
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '8px' }}>
                          <span style={{ fontSize: '1.6rem', fontWeight: 950, letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{cancellationsCount}</span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, opacity: 0.9 }}>Heute</span>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* SCHEDULE & PREP-MIRROR ROW (Two Columns: Left has greeting banner and Schüler Notizen, Right has Tagesplan) */}
                  <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '24px', alignItems: 'stretch', width: '100%' }}>
                    
                    {/* LEFT COLUMN: Greeting Banner & Schüler Notizen */}
                    <div id="tour-teacher-briefing" style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: (isWeekend || isFreeDay) ? '1 1 100%' : '1 1 350px', minWidth: '300px' }}>
                      {/* Premium Greeting Banner with Avatar & Wave Design */}
                      {(!teacher?.sick_until || bypassSickView) && (
                        <div style={{
                          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.40) 100%)',
                          backdropFilter: 'blur(24px) saturate(1.8)',
                          WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
                          border: '1px solid rgba(255, 255, 255, 0.5)',
                          borderRadius: '24px',
                          display: 'flex',
                          alignItems: 'stretch',
                          justifyContent: 'space-between',
                          boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                          width: '100%',
                          minHeight: windowWidth < 768 ? 'auto' : ((isWeekend || isFreeDay) ? '300px' : '200px'),
                          flex: (isFreeDay || isWeekend) ? 1 : '0 1 auto',
                          boxSizing: 'border-box',
                          overflow: 'hidden'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                            {/* Avatar: Compact Circle on mobile, Full height on desktop */}
                            <div style={{
                              width: windowWidth < 768 ? '54px' : ((isWeekend || isFreeDay) ? '420px' : '190px'),
                              height: windowWidth < 768 ? '54px' : '100%',
                              borderRadius: windowWidth < 768 ? '50%' : '0',
                              margin: windowWidth < 768 ? '12px 0 12px 14px' : '0',
                              flexShrink: 0,
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              borderRight: windowWidth < 768 ? 'none' : '1px solid rgba(0, 0, 0, 0.05)'
                            }}
                            className="hover-scale"
                            >
                              <img 
                                src={getInstrumentAvatarUrl(teacher?.instrument)} 
                                alt="" 
                                style={{ 
                                  width: '100%', 
                                  height: '100%', 
                                  objectFit: 'cover'
                                }} 
                              />
                            </div>
                            
                            <div style={{ 
                              padding: windowWidth < 768 ? '12px 14px' : (isWeekend ? '32px 48px' : '24px 32px'), 
                              display: 'flex', 
                              flexDirection: 'column', 
                              justifyContent: 'center',
                              minWidth: 0,
                              flex: 1 
                            }}>
                              {/* Live Clock Badge above Hey */}
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: '#ffffff',
                                border: '1px solid rgba(0, 0, 0, 0.06)',
                                borderRadius: '100px',
                                padding: '4px 10px',
                                boxShadow: 'none',
                                alignSelf: 'flex-start',
                                marginBottom: windowWidth < 768 ? '2px' : '6px',
                                flexShrink: 0
                              }}>
                                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#34a853', animation: 'pulse 2s infinite' }} />
                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                                  {currentTimeStr || '13:00'} UHR
                                </span>
                              </div>

                              <h3 style={{ 
                                margin: 0, 
                                fontSize: windowWidth < 768 ? '1.25rem' : (isWeekend ? '36px' : '30px'), 
                                fontWeight: 950, 
                                color: '#0f172a', 
                                fontFamily: "'Plus Jakarta Sans', sans-serif", 
                                lineHeight: 1.2
                              }}>
                                {isWeekend ? 'Schönes Wochenende,' : `${dynamicGreeting.greeting},`}{' '}
                                <span style={{ 
                                  color: '#007aff', 
                                  fontWeight: 900,
                                  letterSpacing: '-0.01em',
                                  display: 'inline'
                                }}>{teacher?.first_name || 'Coach'}</span>!{' '}
                                <span className="inline-block animate-bounce" style={{ marginLeft: '4px', display: 'inline-block' }}>
                                  ☀️
                                </span>
                              </h3>
                              {windowWidth >= 768 && (
                                <p style={{ margin: isWeekend ? '14px 0 0 0' : '6px 0 0 0', fontSize: isWeekend ? '1rem' : '0.82rem', color: isWeekend ? '#4b5563' : '#64748b', fontWeight: 600, lineHeight: isWeekend ? 1.5 : 1.25, maxWidth: isWeekend ? '650px' : undefined }}>
                                  {isWeekend 
                                    ? 'Genieße deine wohlverdiente Pause! Keine Termine, kein Schulstress. Erhole dich gut und tanke Kraft für neue musikalische Abenteuer in der kommenden Woche. ✨'
                                    : (isFreeDay ? 'Heute hast du frei! Genieße deinen freien Tag. ✨' : dynamicGreeting.subtitle)
                                  }
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
 
 
 
                      {(!teacher?.sick_until || bypassSickView) && !isFreeDay && !isWeekend && (
                        <div className="google-card" style={{ 
                          width: '100%', 
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          borderLeft: widgetState === 'VORBEREITUNG' 
                            ? '4px solid #fbbc05' 
                            : widgetState === 'ACTIVE' 
                            ? '4px solid #34a853' 
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
                                ? briefingData.timeline.filter((s: any) => s.student && s.status !== 'canceled_by_student' && s.status !== 'teacher_sick' && s.status !== 'cancelled' && s.status !== 'canceled_by_teacher_sick' && s.status !== 'rescheduled_away').length 
                                : 0;
                              const dailyChanges = briefingData?.timeline 
                                ? briefingData.timeline.filter((s: any) => s.student && (
                                    s.status === 'canceled_by_student' || 
                                    s.status === 'teacher_sick' || 
                                    s.status === 'cancelled' || 
                                    s.status === 'canceled_by_teacher_sick' ||
                                    s.status === 'rescheduled_away'
                                  )) 
                                : [];

                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
                                  {/* Title Section: borderless, simple, calm */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Calendar size={18} color="#475569" style={{ opacity: 0.8 }} />
                                    <div>
                                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>
                                        Vorbereitung
                                      </h4>
                                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500, marginTop: '1px' }}>Fahrplan & Änderungen</div>
                                    </div>
                                  </div>

                                  {/* Unified Info Flow Container */}
                                  <div style={{
                                    background: '#fafafa',
                                    borderRadius: '20px',
                                    padding: '24px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '20px'
                                  }}>
                                    {/* 1. Lessons count summary */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                      <Activity size={16} color="#64748b" style={{ marginTop: '2px', flexShrink: 0 }} />
                                      <div style={{ fontSize: '0.86rem', color: '#334155', lineHeight: 1.4 }}>
                                        Heute stehen <span style={{ fontWeight: 700, color: '#0f172a' }}>{activeLessonsCount} Termine</span> auf dem Fahrplan.
                                      </div>
                                    </div>

                                    <div style={{ height: '1px', background: '#f1f5f9' }} />

                                    {/* 2. Daily Changes */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        Änderungen & Ausfälle heute
                                      </span>
                                      {dailyChanges.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                          {dailyChanges.map((slot: any, idx: number) => {
                                            const isCanceled = slot.status !== 'rescheduled_away';
                                            const labelColor = isCanceled ? '#ef4444' : '#f59e0b';
                                            const labelText = isCanceled ? 'Ausfall' : 'Verschoben';
                                            const matchRem = !isCanceled 
                                              ? briefingData.rescheduledReminders?.find((r: any) => r.studentName === slot.student?.name)
                                              : null;
                                            
                                            return (
                                              <div key={idx} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                fontSize: '0.84rem',
                                                color: '#475569'
                                              }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                                  <span style={{ fontWeight: 600, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {slot.student?.name}
                                                  </span>
                                                  <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                                                    ({slot.timeSlot || slot.start_time?.substring(0, 5)} Uhr)
                                                  </span>
                                                  {!isCanceled && matchRem && (
                                                    <span style={{ 
                                                      color: '#f59e0b', 
                                                      fontSize: '0.76rem', 
                                                      fontWeight: 600, 
                                                      marginLeft: '6px'
                                                    }}>
                                                      ➔ {matchRem.weekdayShort}. {matchRem.dateStr}.
                                                    </span>
                                                  )}
                                                </div>
                                                <span style={{
                                                  fontSize: '0.74rem',
                                                  fontWeight: 700,
                                                  color: labelColor
                                                }}>
                                                  {labelText}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.84rem', color: '#475569' }}>
                                          <CheckCircle size={16} color="#64748b" style={{ flexShrink: 0 }} />
                                          <span>Alles läuft nach Plan. Keine heutigen Ausfälle.</span>
                                        </div>
                                      )}

                                      {/* Other weekly rescheduled appointments */}
                                      {(() => {
                                        const otherReschedules = briefingData.rescheduledReminders?.filter((rem: any) => 
                                          !dailyChanges.some((dc: any) => dc.student?.name === rem.studentName)
                                        ) || [];
                                        
                                        if (otherReschedules.length === 0) return null;
                                        
                                        return (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                              Weitere Änderungen diese Woche
                                            </span>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                              {otherReschedules.map((rem: any) => (
                                                <div key={rem.id} style={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'space-between',
                                                  fontSize: '0.84rem',
                                                  color: '#475569'
                                                }}>
                                                  <span style={{ fontWeight: 600, color: '#334155' }}>
                                                    {rem.studentName}
                                                  </span>
                                                  <span style={{ 
                                                    fontSize: '0.76rem', 
                                                    fontWeight: 600, 
                                                    color: '#475569'
                                                  }}>
                                                    {rem.weekdayShort}. {rem.dateStr}., {rem.time.replace(':', '.')} Uhr
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>

                                    {firstSlotStartStr && (
                                      <>
                                        <div style={{ height: '1px', background: '#f1f5f9' }} />
                                        {/* 3. First Lesson starting time & notes automatic activation */}
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                          <Clock size={16} color="#64748b" style={{ marginTop: '2px', flexShrink: 0 }} />
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <div style={{ fontSize: '0.86rem', color: '#334155' }}>
                                              Erster Unterricht beginnt um <span style={{ fontWeight: 700, color: '#0f172a' }}>{firstSlotStartStr} Uhr</span>.
                                            </div>
                                            <div style={{ fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.4 }}>
                                              Das Schüler-Notizwidget aktiviert sich automatisch um {prepCutoffTimeStr} Uhr (15 Min. vorher).
                                            </div>
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            }

                            if (widgetState === 'ACTIVE') {
                              if (!dynamicPrepMirror && !briefingData?.prepMirror) {
                                return <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Keine Unterrichtsdaten geladen.</div>;
                              }
                              const prep = dynamicPrepMirror || briefingData.prepMirror;

                              const cleanTitle = (t: string) => t.replace(/\s*\((gitarre|guitar|e-gitarre|bass|e-bass|drums|schlagzeug|klavier|piano|keys|keyboard|vocals|gesang|stimme|allgemein)\)/i, '');

                              const groupAndFormatItems = (rawItems: any[]) => {
                                const groupedLehrwerke: Record<string, { pages: number[]; statuses: string[] }> = {};
                                const otherItems: any[] = [];

                                (rawItems || []).forEach(item => {
                                  const title = item.title || item.topic_name || '';
                                  if (title.includes(' - Seite ')) {
                                    const parts = title.split(' - Seite ');
                                    const bookTitle = cleanTitle(parts[0].trim());
                                    const pageNum = parseInt(parts[1], 10);
                                    
                                    if (!groupedLehrwerke[bookTitle]) {
                                      groupedLehrwerke[bookTitle] = { pages: [], statuses: [] };
                                    }
                                    if (!isNaN(pageNum) && !groupedLehrwerke[bookTitle].pages.includes(pageNum)) {
                                      groupedLehrwerke[bookTitle].pages.push(pageNum);
                                      groupedLehrwerke[bookTitle].statuses.push(item.status);
                                    }
                                  } else {
                                    otherItems.push(item);
                                  }
                                });

                                const formatPageNumbers = (pages: number[]): string => {
                                  if (pages.length === 0) return '';
                                  const sorted = [...pages].sort((a, b) => a - b);
                                  const ranges: string[] = [];
                                  let start = sorted[0];
                                  let end = start;
                                  
                                  for (let i = 1; i < sorted.length; i++) {
                                    if (sorted[i] === end + 1) {
                                      end = sorted[i];
                                    } else {
                                      if (start === end) {
                                        ranges.push(`${start}`);
                                      } else {
                                        ranges.push(`${start}-${end}`);
                                      }
                                      start = sorted[i];
                                      end = start;
                                    }
                                  }
                                  if (start === end) {
                                    ranges.push(`${start}`);
                                  } else {
                                    ranges.push(`${start}-${end}`);
                                  }
                                  
                                  if (ranges.length === 1) return `S. ${ranges[0]}`;
                                  const last = ranges.pop();
                                  return `S. ${ranges.join(', ')} & ${last}`;
                                };

                                const groupedItems = Object.entries(groupedLehrwerke).map(([bookTitle, info]) => {
                                  const formattedPages = formatPageNumbers(info.pages);
                                  const allDone = info.statuses.every(status => status === 'MASTERED' || status === 'THEORY_DONE');
                                  return {
                                    title: `${bookTitle}: ${formattedPages}`,
                                    status: allDone ? 'MASTERED' : 'IN_PROGRESS',
                                    isBook: true
                                  };
                                });

                                return [
                                  ...groupedItems,
                                  ...otherItems.map(item => ({
                                    title: cleanTitle(item.title || item.topic_name || ''),
                                    status: item.status,
                                    isBook: false
                                  }))
                                ];
                              };

                              const formattedPrevWeekItems = groupAndFormatItems(prep.prevWeekItems);
                              const formattedCurrentWeekItems = groupAndFormatItems(prep.currentWeekItems);

                              return (
                                <>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                                    <div style={{ background: 'rgba(52, 168, 83, 0.08)', color: '#34a853', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <Award size={18} />
                                    </div>
                                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                      {activeStudent?.id === prep.studentId ? 'Aktuelle Hausaufgaben' : 'Aktuelle Hausaufgaben (Nächste)'}
                                    </h4>
                                  </div>

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div 
                                      style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                                      onClick={() => {
                                        const foundStud = allStudents.find(s => s.id === prep.studentId);
                                        setDocStudent({
                                          id: prep.studentId,
                                          first_name: prep.studentName.split(' ')[0],
                                          last_name: prep.studentName.split(' ').slice(1).join(' '),
                                          photo_url: '/avatar_ghost.jpg',
                                          is_campus_active: foundStud ? foundStud.is_campus_active : false
                                        });
                                      }}
                                    >
                                      <div style={{
                                        width: '42px',
                                        height: '42px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.1rem',
                                        fontWeight: 800,
                                        boxShadow: '0 2px 8px rgba(52, 168, 83, 0.15)'
                                      }}>
                                        {prep.studentName.charAt(0)}
                                      </div>
                                      <div>
                                        <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.92rem' }}>{prep.studentName}</div>
                                      </div>
                                    </div>

                                    {prep.streakCount > 0 && (
                                      <div style={{ 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        gap: '6px', 
                                        background: 'rgba(245, 158, 11, 0.08)', 
                                        border: '1px solid rgba(245, 158, 11, 0.15)', 
                                        padding: '6px 12px', 
                                        borderRadius: '100px', 
                                        color: '#b45309', 
                                        fontSize: '0.75rem', 
                                        fontWeight: 750,
                                        alignSelf: 'flex-start'
                                      }}>
                                        <Flame size={14} fill="#f59e0b" color="#f59e0b" />
                                        <span>Premium Flammen-Streak: {prep.streakCount} Tage!</span>
                                      </div>
                                    )}

                                    {/* Hausaufgaben der Vorwoche */}
                                    <div>
                                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                                        Hausaufgaben der Vorwoche (KW {prep.prevWeekNum || '?'})
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {((formattedPrevWeekItems && formattedPrevWeekItems.length > 0) || (prep.prevWeekNotes && prep.prevWeekNotes.length > 0)) ? (
                                          <>
                                            {formattedPrevWeekItems && formattedPrevWeekItems.map((item: any, idx: number) => {
                                              const isBook = item.isBook;
                                              return (
                                                <div key={`prev-item-${idx}`} style={{
                                                  background: '#f8fafc',
                                                  padding: '10px 12px',
                                                  borderRadius: '12px',
                                                  border: '1px solid rgba(0, 0, 0, 0.03)',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'space-between',
                                                  gap: '8px',
                                                  opacity: 0.85
                                                }}>
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                                    {isBook ? <BookOpen size={14} color="#64748b" /> : <Music size={14} color="#64748b" />}
                                                    <span style={{ fontWeight: 800, color: '#475569', fontSize: '0.8rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                      {item.title}
                                                    </span>
                                                  </div>
                                                  {(item.status === 'MASTERED' || item.status === 'THEORY_DONE') && (
                                                    <span style={{
                                                      background: 'rgba(52, 168, 83, 0.08)',
                                                      color: '#34a853',
                                                      fontSize: '0.64rem',
                                                      fontWeight: 800,
                                                      borderRadius: '100px',
                                                      padding: '2px 8px',
                                                      textTransform: 'uppercase',
                                                      flexShrink: 0
                                                    }}>
                                                      Erledigt
                                                    </span>
                                                  )}
                                                </div>
                                              );
                                            })}
                                            {prep.prevWeekNotes && prep.prevWeekNotes
                                              .filter((note: string) => !note.startsWith("STICKER:") && !note.startsWith("LATENCY:") && !note.startsWith("LATENCY_CALIBRATION:") && !note.startsWith("SYSTEM:"))
                                              .map((note: string, idx: number) => {
                                              const isLoop = note.startsWith("LOOP:");
                                              const isAudio = note.startsWith("AUDIO:");
                                              if (isLoop) {
                                                const parts = note.substring(5).split('|');
                                                const label = parts[3] || 'Loop-Mix';
                                                const duration = parts[1] || '8';
                                                return (
                                                  <div key={`prev-note-${idx}`} style={{ margin: '2px 4px' }}>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fefce8', border: '1px solid rgba(234, 179, 8, 0.2)', padding: '2px 6px', borderRadius: '6px', fontSize: '0.68rem', color: '#854d0e', fontStyle: 'normal', fontWeight: 700 }}>
                                                      🎵 Loop-Mix: "{label}" ({duration}s)
                                                    </span>
                                                  </div>
                                                );
                                              }
                                              if (isAudio) {
                                                const parts = note.substring(6).split('|');
                                                const label = parts[3] || 'Aufnahme';
                                                const duration = parts[1] || '60';
                                                const role = parts[4] || 'teacher';
                                                return (
                                                  <div key={`prev-note-${idx}`} style={{ margin: '2px 4px' }}>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e6f4ea', border: '1px solid rgba(52, 168, 83, 0.2)', padding: '2px 6px', borderRadius: '6px', fontSize: '0.68rem', color: '#166534', fontStyle: 'normal', fontWeight: 700 }}>
                                                      🎙️ {role === 'teacher' ? 'Lehrer-Aufnahme' : 'Schüler-Aufnahme'}: "{label}" ({duration}s)
                                                    </span>
                                                  </div>
                                                );
                                              }
                                              return (
                                                <div key={`prev-note-${idx}`} style={{ 
                                                  fontSize: '0.75rem', 
                                                  color: '#64748b', 
                                                  fontWeight: 500, 
                                                  fontStyle: 'italic', 
                                                  borderLeft: '2.5px solid #cbd5e1', 
                                                  paddingLeft: '8px', 
                                                  margin: '2px 4px',
                                                  lineHeight: 1.3,
                                                  opacity: 0.85
                                                }}>
                                                  {note}
                                                </div>
                                              );
                                            })}
                                          </>
                                        ) : (
                                          <div style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            gap: '6px', 
                                            padding: '14px 0', 
                                            background: '#f8fafc',
                                            borderRadius: '12px',
                                            border: '1px dashed #e2e8f0',
                                            fontSize: '0.74rem',
                                            color: '#94a3b8',
                                            fontWeight: 555
                                          }}>
                                            <BookOpen size={14} />
                                            <span>Keine Hausaufgaben erfasst.</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Hausaufgaben dieser Woche */}
                                    <div>
                                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                                        Hausaufgaben dieser Woche (KW {prep.currentWeekNum || '?'})
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {((formattedCurrentWeekItems && formattedCurrentWeekItems.length > 0) || (prep.currentWeekNotes && prep.currentWeekNotes.length > 0)) ? (
                                          <>
                                            {formattedCurrentWeekItems && formattedCurrentWeekItems.map((item: any, idx: number) => {
                                              const isBook = item.isBook;
                                              return (
                                                <div key={`curr-item-${idx}`} style={{
                                                  background: '#f8fafc',
                                                  padding: '10px 12px',
                                                  borderRadius: '12px',
                                                  border: '1px solid rgba(0, 0, 0, 0.03)',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'space-between',
                                                  gap: '8px'
                                                }}>
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                                    {isBook ? <BookOpen size={14} color="#64748b" /> : <Music size={14} color="#64748b" />}
                                                    <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.8rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                      {item.title}
                                                    </span>
                                                  </div>
                                                  {(item.status === 'MASTERED' || item.status === 'THEORY_DONE') && (
                                                    <span style={{
                                                      background: 'rgba(52, 168, 83, 0.08)',
                                                      color: '#34a853',
                                                      fontSize: '0.64rem',
                                                      fontWeight: 800,
                                                      borderRadius: '100px',
                                                      padding: '2px 8px',
                                                      textTransform: 'uppercase',
                                                      flexShrink: 0
                                                    }}>
                                                      Erledigt
                                                    </span>
                                                  )}
                                                </div>
                                              );
                                            })}
                                            {prep.currentWeekNotes && prep.currentWeekNotes
                                              .filter((note: string) => !note.startsWith("STICKER:") && !note.startsWith("LATENCY:") && !note.startsWith("LATENCY_CALIBRATION:") && !note.startsWith("SYSTEM:"))
                                              .map((note: string, idx: number) => {
                                              const isLoop = note.startsWith("LOOP:");
                                              const isAudio = note.startsWith("AUDIO:");
                                              if (isLoop) {
                                                const parts = note.substring(5).split('|');
                                                const label = parts[3] || 'Loop-Mix';
                                                const duration = parts[1] || '8';
                                                return (
                                                  <div key={`curr-note-${idx}`} style={{ margin: '2px 4px' }}>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fefce8', border: '1px solid rgba(234, 179, 8, 0.2)', padding: '2px 6px', borderRadius: '6px', fontSize: '0.68rem', color: '#854d0e', fontStyle: 'normal', fontWeight: 700 }}>
                                                      🎵 Loop-Mix: "{label}" ({duration}s)
                                                    </span>
                                                  </div>
                                                );
                                              }
                                              if (isAudio) {
                                                const parts = note.substring(6).split('|');
                                                const label = parts[3] || 'Aufnahme';
                                                const duration = parts[1] || '60';
                                                const role = parts[4] || 'teacher';
                                                return (
                                                  <div key={`curr-note-${idx}`} style={{ margin: '2px 4px' }}>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e6f4ea', border: '1px solid rgba(52, 168, 83, 0.2)', padding: '2px 6px', borderRadius: '6px', fontSize: '0.68rem', color: '#166534', fontStyle: 'normal', fontWeight: 700 }}>
                                                      🎙️ {role === 'teacher' ? 'Lehrer-Aufnahme' : 'Schüler-Aufnahme'}: "{label}" ({duration}s)
                                                    </span>
                                                  </div>
                                                );
                                              }
                                              return (
                                                <div key={`curr-note-${idx}`} style={{ 
                                                  fontSize: '0.75rem', 
                                                  color: '#475569', 
                                                  fontWeight: 500, 
                                                  fontStyle: 'italic', 
                                                  borderLeft: '2.5px solid #34a853', 
                                                  paddingLeft: '8px', 
                                                  margin: '2px 4px',
                                                  lineHeight: 1.3
                                                }}>
                                                  {note}
                                                </div>
                                              );
                                            })}
                                          </>
                                        ) : (
                                          <div style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            gap: '6px', 
                                            padding: '14px 0', 
                                            background: '#f8fafc',
                                            borderRadius: '12px',
                                            border: '1px dashed #e2e8f0',
                                            fontSize: '0.74rem',
                                            color: '#94a3b8',
                                            fontWeight: 550
                                          }}>
                                            <BookOpen size={14} />
                                            <span>Keine Hausaufgaben erfasst.</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    {/* Premium Quick Actions */}
                                    <div style={{ 
                                      marginTop: '12px', 
                                      paddingTop: '16px', 
                                      borderTop: '1px solid #f1f5f9', 
                                      display: 'flex', 
                                      gap: '10px' 
                                    }}>
                                      <button
                                        onClick={() => {
                                          const foundStud = allStudents.find(s => s.id === prep.studentId);
                                          setDocStudent({
                                            id: prep.studentId,
                                            first_name: prep.studentName.split(' ')[0],
                                            last_name: prep.studentName.split(' ').slice(1).join(' '),
                                            photo_url: '/avatar_ghost.jpg',
                                            is_campus_active: foundStud ? foundStud.is_campus_active : false
                                          });
                                        }}
                                        style={{
                                          flex: 1,
                                          background: '#34a853',
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
                                          boxShadow: '0 4px 12px rgba(52, 168, 83, 0.15)',
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
                                          background: '#fdf6e2',
                                          color: '#b45309',
                                          border: '1px solid rgba(180, 83, 9, 0.1)',
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

                            // Centralized Music Quotes & Facts tailored for teachers
                            const teacherMaterials = getQuotesForAudience('teacher');

                            const today = getSimulatedNow();
                            const dateSeed = today.getDate() + today.getMonth() * 31 + today.getFullYear();
                            const dailyWishIndex = dateSeed % wishes.length;

                            const dailyWish = wishes[dailyWishIndex];
                            const dailyItem = getDailyQuote(dateSeed, 'teacher');

                            if (widgetState === 'WEEKEND') {
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ 
                                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(109, 40, 217, 0.1) 100%)', 
                                      color: '#8b5cf6', 
                                      width: '38px', 
                                      height: '38px', 
                                      borderRadius: '12px', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center',
                                      boxShadow: '0 2px 8px rgba(139, 92, 246, 0.08)'
                                    }}>
                                      <Sparkles size={18} />
                                    </div>
                                    <div>
                                      <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1d1d1f', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>
                                        Wochenende
                                      </h4>
                                      <div style={{ fontSize: '0.72rem', color: '#86868b', fontWeight: 500, marginTop: '1px' }}>Ruhe & Regeneration</div>
                                    </div>
                                  </div>

                                  {/* Premium Weekend Rest Card */}
                                  <div style={{
                                    background: 'linear-gradient(135deg, rgba(245, 243, 255, 0.25) 0%, rgba(237, 233, 254, 0.05) 100%)',
                                    border: '1px solid rgba(139, 92, 246, 0.25)',
                                    borderRadius: '20px',
                                    padding: '24px 20px',
                                    color: '#6d28d9',
                                    textAlign: 'center',
                                    boxShadow: '0 10px 25px -5px rgba(139, 92, 246, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                  }}>
                                    {/* Decorative ambient background glow */}
                                    <div style={{
                                      position: 'absolute',
                                      top: '-50%',
                                      left: '-50%',
                                      width: '200%',
                                      height: '200%',
                                      background: 'radial-gradient(circle, rgba(196, 181, 253, 0.15) 0%, transparent 60%)',
                                      pointerEvents: 'none',
                                      zIndex: 0
                                    }} />

                                    <div style={{ position: 'relative', zIndex: 1 }}>
                                      <div style={{ 
                                        background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        fontSize: '1.35rem', 
                                        fontWeight: 950, 
                                        marginBottom: '10px',
                                        letterSpacing: '-0.02em',
                                        display: 'inline-block',
                                        fontFamily: "'Plus Jakarta Sans', sans-serif"
                                      }}>
                                        ☀️ Schönes Wochenende! ☀️
                                      </div>
                                      <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#4b5563', lineHeight: '1.5' }}>
                                        Genieße deine wohlverdiente Pause! Keine Termine, kein Schulstress. Erhole dich gut und tanke Kraft für neue musikalische Abenteuer in der kommenden Woche.
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{ 
                                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.1) 100%)', 
                                    color: '#f59e0b', 
                                    width: '38px', 
                                    height: '38px', 
                                    borderRadius: '12px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)'
                                  }}>
                                    <Sparkles size={18} />
                                  </div>
                                  <div>
                                    <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1d1d1f', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>
                                      Feierabend
                                    </h4>
                                    <div style={{ fontSize: '0.72rem', color: '#86868b', fontWeight: 500, marginTop: '1px' }}>Entspannung & Inspiration</div>
                                  </div>
                                </div>

                                {/* Premium Feierabend Wishing Card */}
                                <div style={{
                                  background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.2) 0%, rgba(253, 230, 138, 0.05) 100%)',
                                  border: '1px solid rgba(245, 158, 11, 0.25)',
                                  borderRadius: '20px',
                                  padding: '24px 20px',
                                  color: '#78350f',
                                  textAlign: 'center',
                                  boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
                                  position: 'relative',
                                  overflow: 'hidden'
                                }}>
                                  {/* Decorative ambient background glow */}
                                  <div style={{
                                    position: 'absolute',
                                    top: '-50%',
                                    left: '-50%',
                                    width: '200%',
                                    height: '200%',
                                    background: 'radial-gradient(circle, rgba(253, 224, 71, 0.15) 0%, transparent 60%)',
                                    pointerEvents: 'none',
                                    zIndex: 0
                                  }} />

                                  <div style={{ position: 'relative', zIndex: 1 }}>
                                    <div style={{ 
                                      background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)',
                                      WebkitBackgroundClip: 'text',
                                      WebkitTextFillColor: 'transparent',
                                      fontSize: '1.35rem', 
                                      fontWeight: 950, 
                                      marginBottom: '10px',
                                      letterSpacing: '-0.02em',
                                      display: 'inline-block',
                                      fontFamily: "'Plus Jakarta Sans', sans-serif"
                                    }}>
                                      ✨ Schönen Feierabend! ✨
                                    </div>
                                    <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#4b5563', lineHeight: '1.5' }}>
                                      {dailyWish}
                                    </div>
                                  </div>
                                </div>

                                <div style={{ 
                                  borderTop: '1px solid #f1f5f9', 
                                  paddingTop: '18px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px'
                                }}>
                                  <div style={{
                                    background: '#f8fafc',
                                    border: '1px solid #f1f5f9',
                                    borderRadius: '16px',
                                    padding: '16px 20px',
                                    position: 'relative',
                                    textAlign: 'center'
                                  }}>
                                    <span style={{ 
                                      fontSize: '2rem', 
                                      color: 'rgba(203, 213, 225, 0.5)', 
                                      position: 'absolute', 
                                      top: '6px', 
                                      left: '12px',
                                      fontFamily: 'Georgia, serif',
                                      lineHeight: 1
                                    }}>“</span>
                                    <p style={{ 
                                      margin: 0, 
                                      fontSize: '0.85rem', 
                                      color: '#334155', 
                                      fontStyle: 'italic', 
                                      lineHeight: '1.5',
                                      fontWeight: 500,
                                      padding: '0 10px'
                                    }}>
                                      {dailyItem.text}
                                    </p>
                                    <div style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center', 
                                      gap: '6px', 
                                      marginTop: '12px',
                                      fontSize: '0.74rem',
                                      color: '#64748b',
                                      fontWeight: 700
                                    }}>
                                      <span style={{ 
                                        background: dailyItem.type === 'joke' 
                                          ? 'rgba(239, 68, 68, 0.08)' 
                                          : dailyItem.type === 'fact'
                                            ? 'rgba(52, 168, 83, 0.08)'
                                            : 'rgba(99, 102, 241, 0.08)',
                                        color: dailyItem.type === 'joke' 
                                          ? '#ef4444' 
                                          : dailyItem.type === 'fact'
                                            ? '#34a853'
                                            : '#4f46e5',
                                        padding: '2px 8px',
                                        borderRadius: '100px',
                                        fontSize: '0.65rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em'
                                      }}>
                                        {dailyItem.type === 'joke' ? 'Witz' : dailyItem.type === 'fact' ? 'Fakt' : 'Zitat'}
                                      </span>
                                      <span>— {dailyItem.author}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* RIGHT COLUMN: TAGESPLAN */}
                    {!(isWeekend || isFreeDay) && (
                      teacher?.sick_until && !bypassSickView ? (
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
                        flex: isFreeDay ? '0.8 1 300px' : '1.2 1 450px', 
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
                            <strong style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Tagesplan – {getSimulatedNow().toLocaleDateString('de-DE')} (Unterrichte Heute)</strong>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                            <button
                              type="button"
                              onClick={() => toggleRealNames()}
                              title={showRealNames ? "Vollständige Nachnamen anzeigen" : "Nachnamen maskieren (Datenschutz)"}
                              style={{
                                border: 'none',
                                background: showRealNames ? '#f1f5f9' : '#e6f4ea',
                                color: showRealNames ? '#64748b' : '#34a853',
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              {showRealNames ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
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
                          const rawTimeline = briefingData.timeline || [];
                          const groupedTimeline: any[] = [];
                          
                          rawTimeline.forEach((slot: any) => {
                            if (!slot.student) {
                              groupedTimeline.push({ ...slot, isBreak: true });
                            } else {
                              const existing = groupedTimeline.find(item => 
                                !item.isBreak && 
                                item.timeSlot === slot.timeSlot
                              );
                              if (existing) {
                                if (existing.students && !existing.students.some((s: any) => s.id === slot.student.id)) {
                                  existing.students.push(slot.student);
                                  existing.slots.push(slot);
                                  existing.isGroup = true;
                                }
                              } else {
                                groupedTimeline.push({
                                  ...slot,
                                  isBreak: false,
                                  isGroup: false,
                                  students: [slot.student],
                                  slots: [slot]
                                });
                              }
                            }
                          });

                          // Find prepIndex: first slot that is not canceled and not finished
                          let prepIndex = -1;
                          for (let i = 0; i < groupedTimeline.length; i++) {
                            const slot = groupedTimeline[i];
                            const activeSlots = slot.isGroup ? slot.slots : [slot];
                            const isCanceled = activeSlots.every((s: any) => s.status === 'canceled_by_student' || s.status === 'teacher_sick' || s.status === 'cancelled' || s.status === 'canceled_by_teacher_sick');
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
 
                          return groupedTimeline.map((slot: any, idx: number) => {
                            const slotStart = slot.timeSlot;
                            const slotEnd = (() => {
                              const [sh, sm] = slotStart.split(':').map(Number);
                              const totalMin = sh * 60 + sm + (slot.duration || 30);
                              return `${String(Math.floor(totalMin / 60) % 24).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
                            })();
 
                            const isBreak = slot.isBreak;
                            const activeSlots = slot.isGroup ? slot.slots : [slot];
                            
                            const isCanceled = activeSlots.every((s: any) => s.status === 'canceled_by_student' || s.status === 'teacher_sick' || s.status === 'cancelled' || s.status === 'canceled_by_teacher_sick');
                            const isRescheduledAway = activeSlots.every((s: any) => s.status === 'rescheduled_away');
                            const isFinished = currentTimeStr >= slotEnd && !isCanceled && !isRescheduledAway;
                            const isCurrentSlot = currentTimeStr >= slotStart && currentTimeStr < slotEnd;
                            const isRescheduledPending = activeSlots.some((s: any) => s.status === 'rescheduled_pending' || s.status === 'pending' || s.status === 'pending_reschedule');
                            const isRescheduledConfirmed = !isRescheduledPending && activeSlots.every((s: any) => s.status === 'rescheduled_confirmed');
                            const isResetPending = activeSlots.some((s: any) => s.status === 'scheduled' && s.original_date && s.student_acknowledged === false);
                            const isResetAcknowledged = !isResetPending && activeSlots.every((s: any) => s.status === 'scheduled' && s.original_date && s.student_acknowledged === true);
                            const isBirthday = !slot.isGroup && slot.student && isStudentBirthdayToday(slot.student);
 
                            let slotBg = '#ffffff';
                            let slotBorder = '1.5px solid #e2e8f0';
                            let slotBorderLeft = 'none';
                            let titleColor = '#1e293b';
                            let dotComponent = null;
 
                            if (isBreak) {
                              slotBg = '#fffbeb';
                              slotBorder = '1.5px dashed rgba(245, 158, 11, 0.25)';
                              slotBorderLeft = '5px solid #f59e0b';
                              titleColor = '#b45309';
                              dotComponent = isCurrentSlot ? (
                                <div style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  border: '3px solid #f59e0b',
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
                                    background: '#f59e0b'
                                  }} />
                                </div>
                              ) : (
                                <div style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  border: '3px solid #f59e0b',
                                  background: isFinished ? '#f59e0b' : '#ffffff',
                                  boxSizing: 'border-box'
                                }} />
                              );
                            } else if (isCanceled || isRescheduledAway) {
                              const isSlotAck = activeSlots.every((s: any) => s.student_acknowledged === true || s.teacher_acknowledged === true || s.status === 'cancelled_acknowledged' || s.status === 'rescheduled_confirmed');
                              slotBg = isSlotAck 
                                ? '#ffffff' 
                                : (isRescheduledAway ? 'repeating-linear-gradient(-45deg, #fefce8 0px, #fefce8 8px, #ffffff 8px, #ffffff 16px)' : 'repeating-linear-gradient(-45deg, #fef2f2 0px, #fef2f2 8px, #ffffff 8px, #ffffff 16px)');
                              slotBorder = isSlotAck 
                                ? (isRescheduledAway ? '1.5px solid #fef3c7' : '1.5px solid #fee2e2') 
                                : (isRescheduledAway ? '2px dashed #eab308' : '2px dashed #ef4444');
                              slotBorderLeft = isRescheduledAway ? '5px solid #fbbc05' : '5px solid #ef4444';
                              titleColor = '#a1a1aa';
                              dotComponent = isCurrentSlot ? (
                                <div style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  border: `3px solid ${isRescheduledAway ? '#fbbc05' : '#ef4444'}`,
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
                                    background: isRescheduledAway ? '#fbbc05' : '#ef4444'
                                  }} />
                                </div>
                              ) : (
                                <div style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  border: `3px solid ${isRescheduledAway ? '#fbbc05' : '#ef4444'}`,
                                  background: '#ffffff',
                                  boxSizing: 'border-box'
                                }} />
                              );
                            } else if (isCurrentSlot && !isFinished) {
                              slotBg = '#e6f4ea';
                              slotBorder = '1.5px solid #e6f4ea';
                              slotBorderLeft = '5px solid #34a853';
                              titleColor = '#0f172a';
                              dotComponent = (
                                <div style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  border: '3px solid #34a853',
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
                                    background: '#34a853'
                                  }} />
                                </div>
                              );
                            } else if (isFinished) {
                              slotBg = '#ffffff';
                              slotBorder = '1.5px solid #e6f4ea';
                              slotBorderLeft = '5px solid #34a853';
                              titleColor = '#94a3b8';
                              dotComponent = (
                                <div style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  border: '3px solid #34a853',
                                  background: '#34a853',
                                  boxSizing: 'border-box'
                                }} />
                              );
                            } else if (slot.isGroup) {
                              slotBg = '#ffffff';
                              slotBorder = '1.5px solid #e2e8f0';
                              slotBorderLeft = '5px solid #cbd5e1';
                              titleColor = '#0f172a';
                              dotComponent = (
                                <div style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  border: '3px solid #cbd5e1',
                                  background: '#ffffff',
                                  boxSizing: 'border-box'
                                }} />
                              );
                            } else if (isRescheduledConfirmed) {
                              slotBg = '#ffffff';
                              slotBorder = '1.5px solid #e2e8f0';
                              slotBorderLeft = '5px solid #cbd5e1';
                              titleColor = '#0f172a';
                              dotComponent = isCurrentSlot ? (
                                <div style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  border: '3px solid #cbd5e1',
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
                                    background: '#cbd5e1'
                                  }} />
                                </div>
                              ) : (
                                <div style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  border: '3px solid #cbd5e1',
                                  background: '#ffffff',
                                  boxSizing: 'border-box'
                                }} />
                              );
                            } else if (isRescheduledPending) {
                              const isReschAck = activeSlots.every((s: any) => s.student_acknowledged === true || s.status === 'rescheduled_confirmed');
                              slotBg = isReschAck ? '#ffffff' : 'repeating-linear-gradient(-45deg, #fefce8 0px, #fefce8 8px, #ffffff 8px, #ffffff 16px)';
                              slotBorder = isReschAck ? '1.5px solid #fef3c7' : '2px dashed #eab308';
                              slotBorderLeft = '5px solid #fbbc05';
                              titleColor = '#8e8e93';
                              dotComponent = isCurrentSlot ? (
                                <div style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  border: '3px solid #fbbc05',
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
                                  border: '3px solid #fbbc05',
                                  background: isFinished ? '#fbbc05' : '#ffffff',
                                  boxSizing: 'border-box'
                                }} />
                              );
                            } else if (isResetPending) {
                              slotBg = '#ffffff';
                              slotBorder = '1.5px solid #fef3c7';
                              slotBorderLeft = '5px solid #fbbc05';
                              titleColor = '#8e8e93';
                              dotComponent = isCurrentSlot ? (
                                <div style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  border: '3px solid #fbbc05',
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
                                    background: '#fbbc05'
                                  }} />
                                </div>
                              ) : (
                                <div style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  border: '3px solid #fbbc05',
                                  background: isFinished ? '#fbbc05' : '#ffffff',
                                  boxSizing: 'border-box'
                                }} />
                              );
                            } else if (isResetAcknowledged) {
                              slotBg = '#ffffff';
                              slotBorder = '1.5px solid #e2e8f0';
                              slotBorderLeft = '5px solid #cbd5e1';
                              titleColor = '#0f172a';
                              dotComponent = isCurrentSlot ? (
                                <div style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  border: '3px solid #cbd5e1',
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
                                    background: '#cbd5e1'
                                  }} />
                                </div>
                              ) : (
                                <div style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  border: '3px solid #cbd5e1',
                                  background: '#ffffff',
                                  boxSizing: 'border-box'
                                }} />
                              );
                            } else {
                              slotBg = '#ffffff';
                              slotBorder = '1.5px solid #e2e8f0';
                              slotBorderLeft = '5px solid #cbd5e1';
                              titleColor = '#0f172a';
                              dotComponent = isCurrentSlot ? (
                                <div style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  border: '3px solid #cbd5e1',
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
                                    background: '#cbd5e1'
                                  }} />
                                </div>
                              ) : (
                                <div style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  border: '3px solid #cbd5e1',
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
                                     if (isCanceled || isRescheduledAway) return;
                                     const activeStudentObj = slot.isGroup ? slot.students[0] : slot.student;
                                     if (activeStudentObj) {
                                       const foundStud = allStudents.find(s => s.id === activeStudentObj.id);
                                       setDocStudent({
                                         id: activeStudentObj.id,
                                         first_name: activeStudentObj.name.split(' ')[0],
                                         last_name: activeStudentObj.name.split(' ').slice(1).join(' '),
                                         photo_url: activeStudentObj.photo_url || '/avatar_ghost.jpg',
                                         is_campus_active: foundStud ? foundStud.is_campus_active : activeStudentObj.is_campus_active
                                       });
                                     }
                                     // Log the date of the clicked appointment (today's date)
                                     const todayStr = getSimulatedNow().toLocaleDateString('sv-SE');
                                     setSickUntilDate(todayStr);
                                     setIsSickWidgetExpanded(true);
                                   }}
                                   style={{
                                     flex: 1,
                                     display: 'flex',
                                     alignItems: 'center',
                                     gap: '12px',
                                     padding: '12px 16px',
                                     background: isCurrentSlot ? '#e6f4ea' : slotBg,
                                     borderRadius: '12px',
                                     border: slotBorder,
                                     borderLeft: slotBorderLeft,
                                     cursor: ((slot.student || slot.isGroup) && !isCanceled && !isRescheduledAway) ? 'pointer' : 'default',
                                     transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                     boxShadow: isCurrentSlot ? '0 8px 24px rgba(52, 168, 83, 0.12), 0 2px 6px rgba(52, 168, 83, 0.06)' : ((idx === prepIndex) ? (isRescheduledPending ? '0 6px 18px rgba(234, 179, 8, 0.08)' : '0 6px 18px rgba(59, 130, 246, 0.06)') : '0 4px 10px rgba(0, 0, 0, 0.02), 0 1px 3px rgba(0, 0, 0, 0.02)'),
                                     minWidth: 0,
                                     opacity: ((!slot.student && !slot.isGroup) || isCanceled) ? 0.75 : 1
                                   }}
                                   className="hover-scale google-timeline-card"
                                 >
                                    {/* Left part: Time, Separator, and Name/Pause grouped for a single line strike-through */}
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '12px',
                                      position: 'relative',
                                      minWidth: 0,
                                      flexShrink: 0
                                    }}>
                                      {/* Uhrzeit (inside card, pure black, borderless, white bg) */}
                                      <div style={{
                                        fontSize: '0.8rem',
                                        fontWeight: 900,
                                        color: isCurrentSlot && !isFinished && (slot.student || slot.isGroup) ? '#34a853' : '#0f172a',
                                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0,
                                        background: isCurrentSlot && !isFinished && (slot.student || slot.isGroup) ? '#ffffff' : 'transparent',
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        border: isCurrentSlot && !isFinished && (slot.student || slot.isGroup) ? '1.5px solid #34a853' : 'none',
                                        boxShadow: isCurrentSlot && !isFinished && (slot.student || slot.isGroup) ? '0 1px 3px rgba(19,115,51,0.08)' : 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px'
                                      }}>
                                        {isCurrentSlot && !isFinished && (slot.student || slot.isGroup) && (
                                          <span className="pulse" style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            background: '#34a853',
                                            display: 'inline-block'
                                          }} />
                                        )}
                                        {slot.timeSlot} Uhr
                                      </div>

                                      {/* Vertical separator */}
                                      <div style={{ width: '1.5px', height: '18px', background: '#e2e8f0', flexShrink: 0 }} />

                                      {/* Name or Pause text */}
                                      {slot.isGroup ? (
                                        <span style={{ 
                                          fontWeight: 900, 
                                          color: (isCanceled || isRescheduledAway) ? '#8e8e93' : (isFinished ? '#34a853' : '#0f172a'), 
                                          fontSize: '0.9rem', 
                                          whiteSpace: 'nowrap',
                                          marginRight: '12px'
                                        }}>
                                          👥 Ensemble- / Bandstunde
                                        </span>
                                      ) : slot.student ? (
                                        <span style={{ 
                                          fontWeight: 900, 
                                          color: (isCanceled || isRescheduledAway) ? '#8e8e93' : (isFinished ? '#34a853' : '#0f172a'), 
                                          fontSize: '0.9rem', 
                                          flexShrink: 0, 
                                          whiteSpace: 'nowrap'
                                        }}>
                                          {isBirthday ? '🎂 ' : ''}{(() => {
                                            const found = allStudents.find(s => s.id === slot.student?.id);
                                            const fn = slot.student?.first_name || found?.first_name || (slot.student?.name ? slot.student.name.split(' ')[0] : '');
                                            const ln = slot.student?.last_name || found?.last_name || (slot.student?.name ? slot.student.name.split(' ').slice(1).join(' ') : '');
                                            if (fn || ln) {
                                              return `${fn} ${maskLastName(ln, showRealNames)}`.trim();
                                            }
                                            return slot.student?.name || 'Schüler';
                                          })()}
                                        </span>
                                      ) : (
                                        <span style={{ fontWeight: 700, color: '#78350f', fontSize: '0.85rem' }}>☕️ Pause ({slot.duration || 30} Min.)</span>
                                      )}

                                      {/* Single continuous absolute strike-through line */}
                                      {(slot.student || slot.isGroup) && (isRescheduledAway || isCanceled) && (
                                        <div style={{
                                          position: 'absolute',
                                          left: '-6px',
                                          right: '-10px',
                                          height: '2px',
                                          background: isRescheduledAway ? '#fbbc05' : '#ef4444',
                                          top: '50%',
                                          transform: 'translateY(-50%)',
                                          pointerEvents: 'none',
                                          zIndex: 10
                                        }} />
                                      )}
                                    </div>

                                    {/* Right part: Metadata / Status badges */}
                                    <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1 }}>
                                      {slot.isGroup ? (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginLeft: 'auto' }}>
                                          {slot.students.map((stud: any, sIdx: number) => {
                                            const originalSlot = slot.slots[sIdx];
                                            const ack = originalSlot?.student_acknowledged;
                                            const isBirthday = isStudentBirthdayToday(stud);
                                            return (
                                              <span 
                                                key={sIdx}
                                                style={{
                                                  fontSize: '0.72rem',
                                                  fontWeight: 700,
                                                  background: ack ? '#e6f4ea' : '#fef7e0',
                                                  color: ack ? '#34a853' : '#b45309',
                                                  border: ack ? '1px solid rgba(52, 168, 83, 0.15)' : '1px solid rgba(245, 158, 11, 0.25)',
                                                  padding: '2px 8px',
                                                  borderRadius: '6px',
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: '4px',
                                                  whiteSpace: 'nowrap'
                                                }}
                                              >
                                                {isBirthday ? '🎂 ' : ''}{(() => {
                                                  const found = allStudents.find(s => s.id === stud.id);
                                                  const fn = stud.first_name || found?.first_name || (stud.name ? stud.name.split(' ')[0] : '');
                                                  const ln = stud.last_name || found?.last_name || (stud.name ? stud.name.split(' ').slice(1).join(' ') : '');
                                                  if (fn || ln) {
                                                    return `${fn} ${maskLastName(ln, showRealNames)}`.trim();
                                                  }
                                                  return stud.name;
                                                })()}
                                                <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>
                                                  {ack ? '✓' : '🕒'}
                                                </span>
                                              </span>
                                            );
                                          })}
                                        </div>
                                      ) : slot.student && (
                                        <div style={{ display: 'flex', alignItems: 'center', width: '100%', minWidth: 0 }}>
                                          {isCanceled || isRescheduledAway ? (() => {
                                            const isAcked = activeSlots.every((s: any) => s.student_acknowledged === true || s.teacher_acknowledged === true || s.status === 'cancelled_acknowledged' || s.status === 'rescheduled_confirmed');
                                            return (
                                              <>
                                                {isRescheduledAway ? (
                                                  <span style={{ 
                                                    color: '#d97706', 
                                                    fontWeight: 700, 
                                                    fontSize: '0.72rem', 
                                                    background: '#fff7ed', 
                                                    padding: '4px 10px', 
                                                    borderRadius: '6px', 
                                                    marginLeft: 'auto',
                                                    fontFamily: 'Inter',
                                                    letterSpacing: '0.01em',
                                                    flexShrink: 0,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                  }}>
                                                    Termin verschoben
                                                    {isAcked && (
                                                      <span 
                                                        title="Gelesen & Rückgemeldet" 
                                                        style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34a853', display: 'inline-block', flexShrink: 0 }} 
                                                      />
                                                    )}
                                                  </span>
                                                ) : (
                                                  <span style={{ 
                                                    color: '#ef4444', 
                                                    fontWeight: 700, 
                                                    fontSize: '0.72rem', 
                                                    background: 'rgba(239, 68, 68, 0.08)', 
                                                    padding: '2px 8px', 
                                                    borderRadius: '6px', 
                                                    marginLeft: 'auto',
                                                    fontFamily: 'Inter',
                                                    letterSpacing: '0.01em',
                                                    flexShrink: 0,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                  }}>
                                                    Heute abgesagt
                                                    {isAcked && (
                                                      <span 
                                                        title="Gelesen & Rückgemeldet" 
                                                        style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34a853', display: 'inline-block', flexShrink: 0 }} 
                                                      />
                                                    )}
                                                  </span>
                                                )}
                                              </>
                                            );
                                          })() : (
                                            <>
                                              <span style={{ color: '#94a3b8', margin: '0 8px', fontWeight: 400, flexShrink: 0 }}>•</span>
                                              
                                              <span style={{ 
                                                color: '#64748b', 
                                                fontWeight: 500, 
                                                fontSize: '0.78rem', 
                                                flexShrink: 0, 
                                                whiteSpace: 'nowrap' 
                                              }}>
                                                {slot.instrument || 'Musiker'}
                                              </span>
                                              
                                              <span style={{ color: '#94a3b8', margin: '0 8px', fontWeight: 400, flexShrink: 0 }}>•</span>
                                              
                                              <span style={{ 
                                                color: '#64748b', 
                                                fontWeight: 500, 
                                                fontSize: '0.78rem', 
                                                flexShrink: 0, 
                                                whiteSpace: 'nowrap' 
                                              }}>
                                                {slot.room || 'Groovelab'}
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
 
                                  {/* Unbestätigt Badge (on the right) */}
                                  {!slot.isGroup && isRescheduledPending && (
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
                                  {!slot.isGroup && isRescheduledConfirmed && (
                                    <span style={{
                                      background: '#e6f4ea',
                                      color: '#34a853',
                                      border: '1px solid #e6f4ea',
                                      padding: '4px 6px',
                                      borderRadius: '50%',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                      boxShadow: '0 1px 2px rgba(52, 168, 83, 0.04)'
                                    }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                    </span>
                                  )}

                                   {/* 1:1 Shoutbox Icon Button */}
                                  {(slot.student || slot.isGroup) && !isCanceled && !isRescheduledAway && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const targetSlot = slot.isGroup ? slot.slots[0] : slot;
                                        if (targetSlot) {
                                          setActiveChatOcc({
                                            id: targetSlot.id,
                                            student_id: slot.isGroup ? slot.students[0]?.id : slot.student?.id,
                                            teacher_id: targetSlot.teacher_id || userId,
                                            date: targetSlot.date,
                                            start_time: targetSlot.startTime || targetSlot.timeSlot,
                                            student: slot.isGroup ? slot.students[0] : slot.student,
                                            teacher: teacher
                                          });
                                        }
                                      }}
                                      style={{
                                        border: 'none',
                                        background: 'none',
                                        padding: '6px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: activeChatOccIds.has(slot.isGroup ? slot.slots[0]?.id : slot.id) ? '#eab308' : '#94a3b8',
                                        marginLeft: confirmCancelSlotId === (slot.isGroup ? slot.slots[0]?.id : slot.id) ? '0' : 'auto',
                                        transition: 'all 0.2s',
                                        borderRadius: '50%',
                                        flexShrink: 0
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.06)'}
                                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                      title="1:1 Shoutbox öffnen"
                                    >
                                      <MessageSquare 
                                        size={16} 
                                        fill={activeChatOccIds.has(slot.isGroup ? slot.slots[0]?.id : slot.id) ? '#eab308' : 'none'} 
                                        style={{
                                          animation: activeChatOccIds.has(slot.isGroup ? slot.slots[0]?.id : slot.id) ? 'pulse 2s infinite' : 'none'
                                        }}
                                      />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })() : (
                          <div 
                            className="hover-scale"
                            style={{
                              background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #f5f3ff 100%)',
                              borderRadius: '24px',
                              padding: '44px 28px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '16px',
                              border: '1px solid rgba(99, 102, 241, 0.15)',
                              boxShadow: '0 20px 40px -15px rgba(99, 102, 241, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                              textAlign: 'center',
                              marginTop: '12px',
                              position: 'relative',
                              overflow: 'hidden',
                              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}
                          >
                            {/* Decorative ambient background glows */}
                            <div style={{
                              position: 'absolute',
                              top: '-20%',
                              right: '-20%',
                              width: '60%',
                              height: '60%',
                              background: 'radial-gradient(circle, rgba(167, 139, 250, 0.18) 0%, transparent 70%)',
                              pointerEvents: 'none',
                              zIndex: 0
                            }} />
                            <div style={{
                              position: 'absolute',
                              bottom: '-20%',
                              left: '-20%',
                              width: '60%',
                              height: '60%',
                              background: 'radial-gradient(circle, rgba(129, 140, 248, 0.12) 0%, transparent 70%)',
                              pointerEvents: 'none',
                              zIndex: 0
                            }} />
                            
                            <div style={{ 
                              width: '64px', height: '64px', 
                              background: 'linear-gradient(135deg, #818cf8 0%, #4f46e5 100%)', 
                              borderRadius: '18px', 
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: '0 12px 24px -6px rgba(79, 70, 229, 0.3)',
                              position: 'relative',
                              zIndex: 2,
                              transform: 'rotate(-5deg)'
                            }}>
                              <Sparkles size={30} color="#ffffff" />
                            </div>
                            
                            <div style={{ position: 'relative', zIndex: 2 }}>
                              <h4 style={{ 
                                margin: 0, 
                                fontSize: '1.4rem', 
                                fontWeight: 950, 
                                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                fontFamily: "'Plus Jakarta Sans', sans-serif", 
                                letterSpacing: '-0.02em',
                                marginBottom: '6px'
                              }}>
                                {(() => {
                                  const day = new Date().getDay();
                                  return (day === 0 || day === 6) ? 'Schönes Wochenende! 🎉' : 'Freier Tag!';
                                })()}
                              </h4>
                              <p style={{ 
                                margin: '0 auto 10px auto', 
                                fontSize: '0.82rem', 
                                color: '#4f46e5', 
                                fontWeight: 800, 
                                letterSpacing: '0.04em',
                                textTransform: 'uppercase'
                              }}>
                                Ruhe & Regeneration
                              </p>
                              <p style={{ 
                                margin: 0, 
                                fontSize: '0.88rem', 
                                color: '#4b5563', 
                                fontWeight: 550, 
                                maxWidth: '300px', 
                                lineHeight: 1.55 
                              }}>
                                {(() => {
                                  const day = new Date().getDay();
                                  return (day === 0 || day === 6)
                                    ? 'Genieße deine unterrichtsfreie Zeit, lass die Instrumente ruhen und erhole dich gut.'
                                    : 'Heute stehen keine Unterrichte an. Zeit zum Durchatmen, Entspannen und Kraft sammeln.';
                                })()}
                              </p>
                            </div>
                          </div>
                        )}
 

                      </div>
                    </div>
                  ))}
                  </div>
                </>
              )}
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>Fehler beim Laden des Briefings.</div>
            )}
          </div>

            {/* briefing-right-sidebar */}
            <aside style={{ 
              flex: windowWidth < 768 ? '1 1 100%' : '1 1 320px',
              maxWidth: windowWidth < 768 ? '100%' : '320px',
              width: '100%',
              display: 'flex', 
              flexDirection: 'column', 
              gap: '20px',
              maxHeight: windowWidth < 768 ? 'none' : 'calc(100vh - 80px)',
              overflowY: windowWidth < 768 ? 'visible' : 'auto',
              paddingRight: windowWidth < 768 ? '0' : '6px',
              paddingBottom: windowWidth < 768 ? '20px' : '80px',
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
                          fontSize: '1rem', fontWeight: 855, margin: 0,
                          color: '#7f1d1d',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>
                          {teacher?.sick_until ? 'Krankmeldungs-Status' : 'Krankmelden'}
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
                          <Activity size={14} />
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
                        <div style={{ fontSize: '0.75rem', color: '#b91c1c', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ color: '#dc2626', fontWeight: 650 }}>Von: {teacher.sick_start ? new Date(teacher.sick_start).toLocaleDateString('de-DE') : 'Sofort'}</span>
                          <span style={{ color: '#7f1d1d' }}>–</span>
                          <span>Bis: {new Date(teacher.sick_until).toLocaleDateString('de-DE')}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEndSick();
                          }}
                          disabled={reportingSick}
                          style={{
                            background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)',
                            color: '#ffffff',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '10px',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            cursor: reportingSick ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            width: '100%',
                            boxShadow: '0 4px 12px rgba(52, 168, 83, 0.35)',
                            marginTop: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            opacity: reportingSick ? 0.7 : 1
                          }}
                          className="hover-scale"
                        >
                          <Check size={14} strokeWidth={3} />
                          ☀️ Wieder gesund melden
                        </button>
                      </div>
                    )}

                    {isSickWidgetExpanded && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '8px', borderTop: '1px solid #fecaca' }}>
                        {teacher?.sick_until ? (
                          <div style={{ fontSize: '0.78rem', color: '#7f1d1d', fontWeight: 550, lineHeight: 1.4, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div>Zeitraum der Krankmeldung:</div>
                            <div style={{ fontSize: '0.8rem', color: '#991b1b', fontWeight: 600 }}>
                              Von: <strong style={{ color: '#000' }}>{teacher.sick_start ? new Date(teacher.sick_start).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Sofort'}</strong>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: 600 }}>
                              Bis: <strong style={{ color: '#b91c1c', fontWeight: 800 }}>{new Date(teacher.sick_until).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</strong>
                            </div>
                          </div>
                        ) : (
                          <p style={{ margin: 0, fontSize: '0.78rem', color: '#9f1239', lineHeight: 1.4, fontWeight: 500 }}>
                            Trage dein voraussichtliches Enddatum ein. Stunden werden storniert und die Verwaltung benachrichtigt.
                          </p>
                        )}

                        {!showCustomStart ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {teacher?.sick_until ? 'Krankmeldung anpassen (bis):' : 'Krank bis einschließlich:'}
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
                            <button
                              type="button"
                              onClick={() => setShowCustomStart(true)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#be123c',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                textAlign: 'left',
                                padding: '2px 0 0 0',
                                width: 'fit-content',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Calendar size={12} color="#be123c" />
                              Startdatum anpassen (Standard: Heute)
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Krankmeldungs-Zeitraum:
                            </label>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              borderRadius: '12px',
                              border: '1px solid #fca5a5',
                              background: '#fff',
                              fontSize: '0.8rem',
                              color: '#7f1d1d',
                              boxSizing: 'border-box'
                            }}>
                              <span style={{ color: '#991b1b', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>von</span>
                              <input 
                                type="date"
                                value={sickStartDate}
                                onChange={(e) => setSickStartDate(e.target.value)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  outline: 'none',
                                  width: '100%',
                                  color: '#7f1d1d',
                                  fontFamily: 'inherit'
                                }}
                              />
                              <span style={{ color: '#991b1b', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>- bis</span>
                              <input 
                                type="date"
                                value={sickUntilDate}
                                onChange={(e) => setSickUntilDate(e.target.value)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  outline: 'none',
                                  width: '100%',
                                  color: '#7f1d1d',
                                  fontFamily: 'inherit'
                                }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setShowCustomStart(false);
                                const today = new Date();
                                setSickStartDate(today.toLocaleDateString('sv-SE'));
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#64748b',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                textAlign: 'left',
                                padding: '2px 0 0 0',
                                width: 'fit-content'
                              }}
                            >
                              Standard-Startdatum verwenden (Heute)
                            </button>
                          </div>
                        )}

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
                                background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '12px 14px',
                                borderRadius: '12px',
                                fontWeight: 800,
                                fontSize: '0.82rem',
                                cursor: reportingSick ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 6px 18px rgba(52, 168, 83, 0.4)',
                                opacity: reportingSick ? 0.7 : 1,
                                letterSpacing: '-0.01em'
                              }}
                              className="hover-scale"
                            >
                              <Check size={16} strokeWidth={3} />
                              ☀️ Wieder gesund melden
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>



              {myChangedAppointments.length > 0 && (
                <div style={{ 
                  background: '#ffffff', 
                  borderRadius: '24px', 
                  padding: '20px', 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                  marginBottom: '20px'
                }}>
                {/* Header with Title & Time Window Filter */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={18} color="#475569" />
                    <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Terminänderungen
                    </h3>
                  </div>
                  
                  {myChangedAppointments.length > 0 && (
                    <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '2px' }}>
                      <button
                        onClick={() => setScheduleChangesTimeWindow('7days')}
                        style={{
                          border: 'none',
                          background: scheduleChangesTimeWindow === '7days' ? '#ffffff' : 'transparent',
                          color: scheduleChangesTimeWindow === '7days' ? '#0f172a' : '#64748b',
                          fontWeight: scheduleChangesTimeWindow === '7days' ? 800 : 600,
                          fontSize: '0.68rem',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          boxShadow: scheduleChangesTimeWindow === '7days' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        7 Tage
                      </button>
                      <button
                        onClick={() => setScheduleChangesTimeWindow('all')}
                        style={{
                          border: 'none',
                          background: scheduleChangesTimeWindow === 'all' ? '#ffffff' : 'transparent',
                          color: scheduleChangesTimeWindow === 'all' ? '#0f172a' : '#64748b',
                          fontWeight: scheduleChangesTimeWindow === 'all' ? 800 : 600,
                          fontSize: '0.68rem',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          boxShadow: scheduleChangesTimeWindow === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        Alle
                      </button>
                    </div>
                  )}
                </div>

                {/* List of Compact Item Rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {myChangedAppointments.length === 0 ? (
                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', padding: '16px 14px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e6f4ea', color: '#34a853', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle size={18} strokeWidth={2.5} />
                      </div>
                      <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.82rem', fontStyle: 'normal' }}>Keine bevorstehenden Terminänderungen</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'normal' }}>Alle Unterrichtstermine finden regulär nach Stundenplan statt.</div>
                    </div>
                  ) : visibleChangedAppointments.length === 0 ? (
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', padding: '12px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                      Keine Terminänderungen in den nächsten 7 Tagen.
                      <button
                        onClick={() => setScheduleChangesTimeWindow('all')}
                        style={{ display: 'block', margin: '6px auto 0 auto', border: 'none', background: 'none', color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}
                      >
                        Alle {myChangedAppointments.length} Änderungen anzeigen
                      </button>
                    </div>
                  ) : (
                    (showAllChangedAppointments ? visibleChangedAppointments : visibleChangedAppointments.slice(0, 3)).map((b: any) => {
                      const dateObj = new Date(b.date);
                      const isCancelled = ['cancelled', 'canceled_by_student', 'teacher_sick', 'canceled_by_teacher_sick'].includes(b.status);
                      const isRescheduled = ['pending_reschedule', 'rescheduled_confirmed', 'rescheduled', 'open_reschedule', 'changed', 'pending', 'draft'].includes(b.status) || 
                        Boolean(b.original_date && b.original_date !== b.date) ||
                        Boolean(b.original_start_time && b.startTime && b.original_start_time !== b.startTime);
                      const isConfirmed = b.status === 'rescheduled_confirmed' || b.student_acknowledged === true || b.studentAcknowledged === true;
                      const isPending = b.status === 'pending' && !isRescheduled;

                      const isGroup = Boolean(b.isGroup || (b.studentName && b.studentName.includes('&')));

                      // Determine compact colors & icon tags based on status, confirmation & lesson type (Group vs Single)
                      let cardBg = '#f8fafc';
                      let cardBorder = '1px solid #e2e8f0';
                      let dateHeaderBg = '#34a853';
                      let iconSymbol = '✓';
                      let iconBg = '#dcfce7';
                      let iconColor = '#166534';
                      let iconBorder = '1px solid #86efac';
                      let textColor = '#0f172a';
                      let subTextColor = '#64748b';
                      let commentButtonBg = '#ffffff';
                      let commentButtonColor = '#34a853';

                      const rName = b.room_override_name || b.roomOverrideName || ((b.roomName && b.roomName !== 'Raum') ? b.roomName : (b.rooms?.name && b.rooms?.name !== 'Raum' ? b.rooms?.name : (b.room || b.raum || '')));
                      const defaultRoomName = b.schedules?.rooms?.name || b.schedules?.room?.name || b.original_room_name || b.originalRoomName || b.template_room_name;
                      const isRoomChanged = Boolean(
                        b.room_override_id || 
                        b.roomOverrideId || 
                        b.room_override_name || 
                        b.roomOverrideName || 
                        b.is_room_changed || 
                        b.isRoomChanged || 
                        b.is_room_booking || 
                        b.isRoomBooking || 
                        (defaultRoomName && rName && defaultRoomName !== rName) || 
                        (b.original_room_id && b.roomId && String(b.original_room_id) !== String(b.roomId)) ||
                        (b.original_room_id && b.room_id && String(b.original_room_id) !== String(b.room_id))
                      );

                      if (isCancelled) {
                        dateHeaderBg = '#ef4444';
                        iconSymbol = '✕';
                        iconBg = '#fee2e2';
                        iconColor = '#991b1b';
                        iconBorder = '1px solid #fca5a5';
                        textColor = '#991b1b';
                        subTextColor = '#b91c1c';
                        commentButtonBg = '#ffffff';
                        commentButtonColor = '#ef4444';

                        if (isConfirmed) {
                          cardBg = '#fee2e2';
                          cardBorder = '1.5px solid #ef4444';
                        } else {
                          cardBg = 'repeating-linear-gradient(-45deg, #fef2f2 0px, #fef2f2 8px, #ffffff 8px, #ffffff 16px)';
                          cardBorder = '1.5px dashed #ef4444';
                        }
                      } else if (isRoomChanged) {
                        // Lila Theme für Raumbuchungen / Raumwechsel
                        dateHeaderBg = '#7c3aed';
                        textColor = '#6b21a8';
                        subTextColor = '#7c3aed';
                        commentButtonBg = '#ffffff';
                        commentButtonColor = '#7c3aed';

                        if (isConfirmed) {
                          cardBg = '#faf5ff';
                          cardBorder = '1.5px solid #7c3aed';
                          iconSymbol = '✓';
                          iconBg = '#f3e8ff';
                          iconColor = '#6b21a8';
                          iconBorder = '1px solid #ddd6fe';
                        } else {
                          cardBg = 'repeating-linear-gradient(-45deg, #faf5ff 0px, #faf5ff 8px, #ffffff 8px, #ffffff 16px)';
                          cardBorder = '1.5px dashed #7c3aed';
                          iconSymbol = '⏳';
                          iconBg = '#f3e8ff';
                          iconColor = '#7c3aed';
                          iconBorder = '1px solid #ddd6fe';
                        }
                      } else if (isRescheduled) {
                        if (isGroup) {
                          // Gruppentermine: Signature Blue Palette
                          dateHeaderBg = '#0284c7';
                          textColor = '#0369a1';
                          subTextColor = '#0284c7';
                          commentButtonBg = '#ffffff';
                          commentButtonColor = '#0284c7';

                          if (isConfirmed) {
                            // Bestätigte Gruppen-Verschiebung: Vollton Blau
                            cardBg = '#f0f9ff';
                            cardBorder = '1.5px solid #0284c7';
                            iconSymbol = '✓';
                            iconBg = '#dcfce7';
                            iconColor = '#15803d';
                            iconBorder = '1px solid #86efac';
                          } else {
                            // Unbestätigte Gruppen-Verschiebung: Blau gestreift / gestrichelt
                            cardBg = 'repeating-linear-gradient(-45deg, #f0f9ff 0px, #f0f9ff 8px, #ffffff 8px, #ffffff 16px)';
                            cardBorder = '1.5px dashed #0284c7';
                            iconSymbol = '⏳';
                            iconBg = '#e0f2fe';
                            iconColor = '#0284c7';
                            iconBorder = '1px solid #bae6fd';
                          }
                        } else {
                          // Einzeltermine: Gelb Palette
                          dateHeaderBg = '#eab308';
                          textColor = '#854d0e';
                          subTextColor = '#a16207';
                          commentButtonBg = '#ffffff';
                          commentButtonColor = '#ca8a04';

                          if (isConfirmed) {
                            // Bestätigte Einzeltermin-Verschiebung: Vollton Gelb
                            cardBg = '#fffbeb';
                            cardBorder = '1.5px solid #eab308';
                            iconSymbol = '✓';
                            iconBg = '#dcfce7';
                            iconColor = '#15803d';
                            iconBorder = '1px solid #86efac';
                          } else {
                            // Unbestätigte Einzeltermin-Verschiebung: Gelb gestreift / gestrichelt
                            cardBg = 'repeating-linear-gradient(-45deg, #fefce8 0px, #fefce8 8px, #ffffff 8px, #ffffff 16px)';
                            cardBorder = '1.5px dashed #eab308';
                            iconSymbol = '⏳';
                            iconBg = '#fef3c7';
                            iconColor = '#b45309';
                            iconBorder = '1px solid #fde68a';
                          }
                        }
                      } else if (isPending) {
                        cardBg = '#f5f3ff';
                        cardBorder = '1px solid #ddd6fe';
                        dateHeaderBg = '#8b5cf6';
                        iconSymbol = '⏳';
                        iconBg = '#ede9fe';
                        iconColor = '#6d28d9';
                        iconBorder = '1px solid #c4b5fd';
                        textColor = '#5b21b6';
                        subTextColor = '#6d28d9';
                        commentButtonBg = '#ffffff';
                        commentButtonColor = '#7c3aed';
                      }

                      const displayStudentName = (() => {
                        if (!b.studentName) return null;
                        if (b.studentName.includes('&')) {
                          const parts = b.studentName.split('&');
                          const firstNames = parts.map((part: string) => part.trim().split(' ')[0]);
                          return firstNames.join(', ');
                        }
                        return b.studentName;
                      })();

                      return (
                        <div 
                          key={b.id} 
                          onClick={() => handleBookingClick(b)}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px', 
                            background: cardBg, 
                            borderRadius: '12px', 
                            padding: '8px 12px', 
                            cursor: 'pointer',
                            border: cardBorder,
                            transition: 'all 0.15s ease',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                          }}
                          className="hover-scale"
                        >
                          {/* Compact Date Badge */}
                          <div style={{ 
                            width: '38px', 
                            borderRadius: '8px', 
                            overflow: 'hidden', 
                            border: '1px solid rgba(0,0,0,0.08)', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            textAlign: 'center', 
                            flexShrink: 0,
                            background: 'white'
                          }}>
                            <div style={{ background: dateHeaderBg, color: '#ffffff', fontSize: '0.55rem', fontWeight: 800, padding: '2px 0', textTransform: 'uppercase' }}>
                              {dateObj.toLocaleDateString('de-DE', { month: 'short' })}
                            </div>
                            <div style={{ color: '#1e293b', fontSize: '0.95rem', fontWeight: 900, padding: '2px 0', lineHeight: 1 }}>
                              {dateObj.toLocaleDateString('de-DE', { day: '2-digit' })}
                            </div>
                          </div>

                          {/* Content Block */}
                          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', width: '100%' }}>
                              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: textColor, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                {dateObj.toLocaleDateString('de-DE', { weekday: 'short' })} {b.startTime} Uhr
                              </div>

                              <span 
                                title={isCancelled ? 'Ausfall' : (isConfirmed ? 'Bestätigt' : 'Unbestätigt')}
                                style={{ 
                                  fontSize: '0.72rem', 
                                  fontWeight: 900, 
                                  background: iconBg, 
                                  color: iconColor, 
                                  border: iconBorder,
                                  padding: '1px 5px', 
                                  borderRadius: '4px', 
                                  lineHeight: 1,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}
                              >
                                {iconSymbol}
                              </span>
                            </div>

                            <div style={{ fontSize: '0.72rem', color: subTextColor, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {isGroup && <Users size={12} style={{ color: subTextColor, flexShrink: 0 }} />}
                              <span>{displayStudentName ? displayStudentName : ''}</span>
                              {rName && (() => {
                                if (isRoomChanged) {
                                  return (
                                    <span style={{
                                      fontSize: '0.66rem',
                                      fontWeight: 800,
                                      background: '#f3e8ff',
                                      color: '#7c3aed',
                                      border: '1px solid #ddd6fe',
                                      padding: '0.5px 5px',
                                      borderRadius: '5px'
                                    }} title={`Raum geändert zu ${rName}`}>
                                      • {rName}
                                    </span>
                                  );
                                }
                                return (
                                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>
                                    • {rName}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>

                          {/* Shoutbox Chat Button */}
                          {b.isSchedule && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveChatOcc({
                                  ...b,
                                  id: b.id || b.ids?.[0],
                                  date: b.date,
                                  start_time: b.startTime || b.start_time,
                                  student_id: b.student_id || b.studentId || b.id,
                                  student: {
                                    first_name: displayStudentName || b.studentName || 'Schüler'
                                  }
                                });
                              }}
                              title="Termingekoppelte Shoutbox öffnen"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: commentButtonBg,
                                color: commentButtonColor,
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                border: '1px solid rgba(0,0,0,0.06)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                flexShrink: 0,
                                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                              }}
                            >
                              <MessageSquare size={13} />
                            </button>
                          )}
                        </div>
                      );
                    }))}
                  </div>

                  {/* Toggle Button for More Changes */}
                  {visibleChangedAppointments.length > 3 && (
                    <button
                      onClick={() => setShowAllChangedAppointments(!showAllChangedAppointments)}
                      style={{
                        width: '100%',
                        marginTop: '10px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#475569',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {showAllChangedAppointments ? (
                        <>
                          <span>Weniger anzeigen</span>
                          <ChevronUp size={14} />
                        </>
                      ) : (
                        <>
                          <span>Alle {visibleChangedAppointments.length} Terminänderungen anzeigen</span>
                          <ChevronDown size={14} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {myBookings.length > 0 && (
                <div style={{ 
                  background: '#ffffff', 
                  borderRadius: '24px', 
                  padding: '20px', 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <Calendar size={18} color="#475569" />
                    <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Meine Buchungen</h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(showAllBookings ? myBookings : myBookings.slice(0, 3)).map((b: any) => {
                      const dateObj = new Date(b.date);
                      const isCancelled = b.status === 'cancelled';
                      const isRescheduled = b.status === 'pending_reschedule' || b.status === 'rescheduled_confirmed';
                      const isPending = b.status === 'pending';

                      // Determine colors and labels based on status
                      let cardBg = '#f8fafc';
                      let dateHeaderBg = '#8b5cf6';
                      let label = 'Gebucht';
                      let labelBg = 'rgba(139, 92, 246, 0.12)';
                      let labelTextColor = '#7c3aed';
                      let textColor = '#0f172a';
                      let subTextColor = '#64748b';

                      if (isCancelled) {
                        cardBg = '#fef2f2';
                        dateHeaderBg = '#ef4444';
                        label = 'Ausfall';
                        labelBg = '#ef4444';
                        labelTextColor = '#ffffff';
                        textColor = '#991b1b';
                        subTextColor = '#b91c1c';
                      } else if (isRescheduled) {
                        cardBg = '#fefce8';
                        dateHeaderBg = '#eab308';
                        label = 'Verschoben';
                        labelBg = '#eab308';
                        labelTextColor = '#ffffff';
                        textColor = '#854d0e';
                        subTextColor = '#a16207';
                      } else if (isPending) {
                        cardBg = '#f5f3ff';
                        dateHeaderBg = '#8b5cf6';
                        label = 'Reserviert';
                        labelBg = '#8b5cf6';
                        labelTextColor = '#ffffff';
                        textColor = '#5b21b6';
                        subTextColor = '#6d28d9';
                      }

                      const rName = (b.roomName && b.roomName !== 'Raum') ? b.roomName : (b.rooms?.name && b.rooms?.name !== 'Raum' ? b.rooms?.name : '');
                      const isGroup = Boolean(b.isGroup || (b.studentName && b.studentName.includes('&')));
                      const displayStudentName = (() => {
                        if (!b.studentName) return null;
                        if (b.studentName.includes('&')) {
                          const parts = b.studentName.split('&');
                          const firstNames = parts.map((part: string) => part.trim().split(' ')[0]);
                          return firstNames.join(', ');
                        }
                        return b.studentName;
                      })();

                      return (
                        <div 
                          key={b.id} 
                          onClick={() => handleBookingClick(b)}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px', 
                            background: cardBg, 
                            borderRadius: '12px', 
                            padding: '8px 12px', 
                            cursor: 'pointer',
                            border: '1px solid #e2e8f0',
                            transition: 'all 0.15s ease',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                          }}
                          className="hover-scale"
                        >
                          {/* Compact Date Card */}
                          <div style={{ 
                            width: '38px', 
                            borderRadius: '8px', 
                            overflow: 'hidden', 
                            border: '1px solid rgba(0,0,0,0.08)', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            textAlign: 'center', 
                            flexShrink: 0,
                            background: 'white'
                          }}>
                            <div style={{ background: dateHeaderBg, color: '#ffffff', fontSize: '0.55rem', fontWeight: 800, padding: '2px 0', textTransform: 'uppercase' }}>
                              {dateObj.toLocaleDateString('de-DE', { month: 'short' })}
                            </div>
                            <div style={{ color: '#1e293b', fontSize: '0.95rem', fontWeight: 900, padding: '2px 0', lineHeight: 1 }}>
                              {dateObj.toLocaleDateString('de-DE', { day: '2-digit' })}
                            </div>
                          </div>

                          {/* Content details block */}
                          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', width: '100%' }}>
                              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: textColor, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                {dateObj.toLocaleDateString('de-DE', { weekday: 'short' })} {b.startTime} Uhr
                              </div>

                              <span style={{ 
                                fontSize: '0.55rem', 
                                fontWeight: 900, 
                                background: labelBg, 
                                color: labelTextColor, 
                                padding: '2px 6px', 
                                borderRadius: '4px', 
                                textTransform: 'uppercase',
                                letterSpacing: '0.02em',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                              }}>
                                {label}
                              </span>
                            </div>

                            <div style={{ fontSize: '0.72rem', color: subTextColor, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {isGroup && <Users size={12} style={{ color: subTextColor, flexShrink: 0 }} />}
                              <span>
                                {displayStudentName ? displayStudentName : ''}
                                {displayStudentName && rName ? ` • ${rName}` : rName}
                              </span>
                            </div>
                          </div>

                          {/* Deletion button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteMyBooking(b); }}
                            style={{
                              background: '#ff453a15',
                              color: '#ff453a',
                              border: 'none',
                              borderRadius: '8px',
                              width: '28px',
                              height: '28px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              flexShrink: 0
                            }}
                            onMouseOver={e => e.currentTarget.style.background = '#ff453a25'}
                            onMouseOut={e => e.currentTarget.style.background = '#ff453a15'}
                            title="Buchung stornieren"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Toggle Button for More Bookings */}
                  {myBookings.length > 3 && (
                    <button
                      onClick={() => setShowAllBookings(!showAllBookings)}
                      style={{
                        width: '100%',
                        marginTop: '10px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#475569',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {showAllBookings ? (
                        <>
                          <span>Weniger anzeigen</span>
                          <ChevronUp size={14} />
                        </>
                      ) : (
                        <>
                          <span>Alle {myBookings.length} Buchungen anzeigen</span>
                          <ChevronDown size={14} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {(!teacher?.sick_until || bypassSickView) && (
                <>
                  {/* INFOS DER VERWALTUNG */}
                  <div style={{ 
                    background: '#ffffff', 
                    borderRadius: '16px', 
                    padding: '16px', 
                    boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
                    border: '1px solid #e2e8f0'
                  }}>
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Bell size={16} color="#34a853" style={{ strokeWidth: 2.2 }} />
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', margin: 0, letterSpacing: '-0.01em' }}>Infos der Verwaltung</h3>
                      </div>
                    </div>

                    {/* Offen / Erledigt Switch */}
                    <div style={{
                      display: 'inline-flex',
                      background: '#f1f5f9',
                      borderRadius: '8px',
                      padding: '3px',
                      marginBottom: '14px',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}>
                      {(['open', 'done'] as const).map(tab => {
                        const isActive = adminFeedbackTab === tab;
                        const feedbackCount = adminFeedbackRequests.filter(r => !adminFeedbackResponses.find(res => res.request_id === r.id)).length;
                        const pendingFeedbackPoints = mySubmittedProgramPoints.filter(pp => 
                          pp.additional_feedback_responses?.questions?.some((_: any, idx: number) => !pp.additional_feedback_responses.answers?.[idx])
                        );
                        const openCount = feedbackCount + activePlanningEvents.length + pendingFeedbackPoints.length;
                        const label = tab === 'open' ? `Offen${openCount > 0 ? ` (${openCount})` : ''}` : 'Erledigt';
                        return (
                          <button
                            key={tab}
                            onClick={() => setAdminFeedbackTab(tab)}
                            style={{
                              flex: 1,
                              padding: '6px 0',
                              borderRadius: '6px',
                              border: 'none',
                              fontWeight: 600,
                              fontSize: '0.76rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              background: isActive ? '#ffffff' : 'transparent',
                              color: isActive ? '#0f172a' : '#64748b',
                              boxShadow: isActive ? '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)' : 'none',
                            }}
                            onMouseOver={e => {
                              if (!isActive) e.currentTarget.style.color = '#0f172a';
                            }}
                            onMouseOut={e => {
                              if (!isActive) e.currentTarget.style.color = '#64748b';
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {(() => {
                        const pendingFeedbackPoints = mySubmittedProgramPoints.filter(pp => 
                          pp.additional_feedback_responses?.questions?.some((_: any, idx: number) => !pp.additional_feedback_responses.answers?.[idx])
                        );

                        if (adminFeedbackRequests.length === 0 && activePlanningEvents.length === 0 && pendingFeedbackPoints.length === 0) {
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '16px 0', textAlign: 'center', opacity: 0.6 }}>
                              <Bell size={20} color="#94a3b8" style={{ strokeWidth: 1.5 }} />
                              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                                Keine neuen Mitteilungen oder Anfragen vorhanden.
                              </span>
                            </div>
                          );
                        }

                        if (adminFeedbackTab === 'open') {
                          const openItems = adminFeedbackRequests.filter(r => !adminFeedbackResponses.find(res => res.request_id === r.id));
                          if (openItems.length === 0 && activePlanningEvents.length === 0 && pendingFeedbackPoints.length === 0) {
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '16px 0', textAlign: 'center' }}>
                                <CheckCircle size={20} color="#34a853" style={{ strokeWidth: 1.5 }} />
                                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Alle Anfragen beantwortet!</span>
                              </div>
                            );
                          }
                          return (
                            <>
                              {pendingFeedbackPoints.map(pp => {
                                const ev = planningEvents.find(e => e.id === pp.event_id);
                                const evTitle = ev ? ev.title : 'Event';
                                return (
                                  <div
                                    key={`feedback-card-${pp.id}`}
                                    style={{
                                      background: '#ffffff',
                                      border: '1px solid #f1f5f9',
                                      borderLeft: '4px solid #f59e0b',
                                      borderRadius: '12px',
                                      padding: '12px 14px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '8px',
                                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04), 0 1px 4px rgba(0, 0, 0, 0.01)',
                                      marginBottom: '2px'
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <h4 style={{ margin: 0, fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                                          {pp.name} ({evTitle})
                                        </h4>
                                        <p style={{ margin: 0, fontSize: '0.76rem', color: '#475569', lineHeight: 1.4, fontWeight: 500 }}>
                                          Die Verwaltung hat eine Rückfrage zu deiner Einreichung gestellt.
                                        </p>
                                      </div>
                                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                        <AlertTriangle size={11} /> Offene Rückfrage
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px', flexWrap: 'wrap', gap: '8px' }}>
                                      <span style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 600 }}>
                                        Aktion erforderlich
                                      </span>
                                      <button
                                        onClick={() => {
                                          localStorage.setItem('groovelab_auto_submit_event_id', pp.event_id);
                                          localStorage.setItem('groovelab_auto_submit_tab', 'feedback');
                                          onTabChange?.('events');
                                        }}
                                        style={{
                                          background: '#d97706',
                                          color: '#ffffff',
                                          border: 'none',
                                          padding: '5px 12px',
                                          borderRadius: '8px',
                                          fontWeight: 600,
                                          fontSize: '0.74rem',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          transition: 'all 0.15s ease'
                                        }}
                                        className="hover-scale"
                                      >
                                        <MessageSquare size={12} /> Jetzt beantworten
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                              {activePlanningEvents.map(ev => (
                                <div
                                  key={`planning-card-${ev.id}`}
                                  style={{
                                    background: '#ffffff',
                                    border: '1px solid #f1f5f9',
                                    borderLeft: '4px solid #f97316',
                                    borderRadius: '12px',
                                    padding: '12px 14px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04), 0 1px 4px rgba(0, 0, 0, 0.01)',
                                    marginBottom: '2px'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <h4 style={{ margin: 0, fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                                        {ev.title}
                                      </h4>
                                      <p style={{ margin: 0, fontSize: '0.76rem', color: '#475569', lineHeight: 1.4, fontWeight: 500 }}>
                                        Bitte reiche dein Programm für diese Veranstaltung ein.
                                      </p>
                                    </div>
                                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#ea580c', background: '#ffedd5', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                      <Calendar size={11} /> Programmeinreichung
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px', flexWrap: 'wrap', gap: '8px' }}>
                                    {ev.submission_deadline ? (
                                      <span style={{ fontSize: '0.7rem', color: '#f97316', fontWeight: 600 }}>
                                        {getCountdownString(ev.submission_deadline)}
                                      </span>
                                    ) : (
                                      <span />
                                    )}
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      <button
                                        onClick={async () => {
                                          if (confirm('Bist du sicher, dass du für diese Veranstaltung keine Beiträge einreichen möchtest?')) {
                                            const currentIds = ev.no_submission_teacher_ids || [];
                                            const { error } = await supabase
                                              .from('campus_events')
                                              .update({ no_submission_teacher_ids: [...currentIds, userId] })
                                              .eq('id', ev.id);
                                            if (!error) {
                                              fetchData();
                                            } else {
                                              alert('Fehler beim Speichern: ' + error.message);
                                            }
                                          }
                                        }}
                                        style={{
                                          background: 'transparent',
                                          color: '#ea580c',
                                          border: '1px solid #ea580c',
                                          padding: '5px 12px',
                                          borderRadius: '8px',
                                          fontWeight: 600,
                                          fontSize: '0.74rem',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          transition: 'all 0.15s ease'
                                        }}
                                        className="hover-scale"
                                      >
                                        <X size={12} /> Keine Beiträge
                                      </button>
                                      <button
                                        onClick={() => {
                                          localStorage.setItem('groovelab_auto_submit_event_id', ev.id);
                                          onTabChange?.('events');
                                        }}
                                        style={{
                                          background: '#ea580c',
                                          color: '#ffffff',
                                          border: 'none',
                                          padding: '5px 12px',
                                          borderRadius: '8px',
                                          fontWeight: 600,
                                          fontSize: '0.74rem',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          transition: 'all 0.15s ease'
                                        }}
                                        className="hover-scale"
                                      >
                                        <Plus size={12} /> Jetzt Einreichen
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}

                              {openItems.map((item, idx) => {
                                const isResponding = respondingToRequestId === item.id;
                                return (
                                  <div 
                                    key={item.id} 
                                    style={{ 
                                      display: 'flex', 
                                      flexDirection: 'column', 
                                      gap: '8px',
                                      border: '1px solid #f1f5f9',
                                      borderLeft: '4px solid #34a853',
                                      background: '#ffffff',
                                      borderRadius: '12px',
                                      padding: '12px 14px',
                                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04), 0 1px 4px rgba(0, 0, 0, 0.01)',
                                      marginBottom: '2px'
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <h4 style={{ margin: 0, fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{item.title}</h4>
                                        {item.description && (
                                          <p style={{ margin: 0, fontSize: '0.76rem', color: '#475569', lineHeight: 1.4, fontWeight: 500 }}>
                                            {item.description}
                                          </p>
                                        )}
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                                        <span style={{ fontSize: '9px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#e6f4ea', color: '#34a853', display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
                                          <AlertCircle size={11} /> Aktion erforderlich
                                        </span>
                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>
                                          {new Date(item.created_at).toLocaleDateString('de-DE')}
                                        </span>
                                      </div>
                                    </div>

                                    <div style={{ marginTop: '2px' }}>
                                      {isResponding ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                          {item.questions && item.questions.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                              {item.questions.map((q: string, qIdx: number) => (
                                                <div key={qIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569', textAlign: 'left' }}>
                                                    {q}
                                                  </label>
                                                  <textarea
                                                    value={questionnaireAnswers[q] || ''}
                                                    onChange={(e) => setQuestionnaireAnswers(prev => ({
                                                      ...prev,
                                                      [q]: e.target.value
                                                    }))}
                                                    placeholder="Deine Antwort..."
                                                    rows={2}
                                                    style={{
                                                      width: '100%',
                                                      padding: '8px 10px',
                                                      borderRadius: '8px',
                                                      border: '1px solid #cbd5e1',
                                                      fontSize: '0.76rem',
                                                      fontFamily: 'inherit',
                                                      outline: 'none',
                                                      resize: 'vertical',
                                                      boxSizing: 'border-box'
                                                    }}
                                                  />
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <textarea
                                              value={responseTextInput}
                                              onChange={(e) => setResponseTextInput(e.target.value)}
                                              placeholder="Schreibe deine Antwort an die Verwaltung..."
                                              rows={2}
                                              style={{
                                                width: '100%',
                                                padding: '8px 10px',
                                                borderRadius: '8px',
                                                border: '1px solid #cbd5e1',
                                                fontSize: '0.76rem',
                                                fontFamily: 'inherit',
                                                outline: 'none',
                                                resize: 'none',
                                                boxSizing: 'border-box'
                                              }}
                                            />
                                          )}
                                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                            <button
                                              onClick={() => { setRespondingToRequestId(null); setResponseTextInput(''); setQuestionnaireAnswers({}); }}
                                              style={{ background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', padding: '5px 12px', borderRadius: '8px', fontWeight: 600, fontSize: '0.74rem', cursor: 'pointer' }}
                                            >
                                              Abbrechen
                                            </button>
                                            <button
                                              onClick={() => handleSubmitFeedbackResponse(item.id)}
                                              disabled={submittingFeedback || (!item.questions?.length && !responseTextInput.trim())}
                                              style={{ background: '#34a853', color: '#ffffff', border: 'none', padding: '5px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '0.74rem', cursor: 'pointer' }}
                                            >
                                              Senden
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                          <button
                                            onClick={() => { setRespondingToRequestId(item.id); setResponseTextInput(''); setQuestionnaireAnswers({}); }}
                                            style={{ 
                                              background: '#e6f4ea', 
                                              color: '#34a853', 
                                              border: 'none', 
                                              padding: '5px 12px', 
                                              borderRadius: '8px', 
                                              fontWeight: 600, 
                                              fontSize: '0.74rem', 
                                              cursor: 'pointer', 
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                              transition: 'all 0.15s ease' 
                                            }}
                                            className="hover-scale"
                                          >
                                            <MessageSquare size={12} /> Rückmeldung geben
                                          </button>
                                          <button
                                            onClick={() => handleMarkRequestAsDone(item.id)}
                                            disabled={submittingFeedback}
                                            style={{ 
                                              background: '#34a853', 
                                              color: '#ffffff', 
                                              border: 'none', 
                                              padding: '5px 12px', 
                                              borderRadius: '8px', 
                                              fontWeight: 600, 
                                              fontSize: '0.74rem', 
                                              cursor: 'pointer', 
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                              transition: 'all 0.15s ease' 
                                            }}
                                            className="hover-scale"
                                          >
                                            <CheckCircle size={12} /> Erledigt
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </>
                          );
                        }

                        // Erledigt tab – max 5 most recent
                        const doneItems = adminFeedbackRequests
                          .filter(r => adminFeedbackResponses.find(res => res.request_id === r.id))
                          .slice(0, 5);
                        if (doneItems.length === 0) {
                          return (
                            <span style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', padding: '12px 0', textAlign: 'center', display: 'block' }}>
                              Noch keine erledigten Rückmeldungen.
                            </span>
                          );
                        }
                        return doneItems.map((item, idx) => {
                          const response = adminFeedbackResponses.find(res => res.request_id === item.id);
                          return (
                            <div 
                              key={item.id} 
                              style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '8px',
                                border: '1px solid #e2e8f0',
                                borderLeft: '3px solid #34a853',
                                background: '#ffffff',
                                borderRadius: '12px',
                                padding: '12px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.01)',
                                marginBottom: '2px'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#e6f4ea', color: '#34a853', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <CheckCircle size={11} /> Erledigt
                                </span>
                                <span style={{ fontSize: '10px', color: '#8e8e93', fontWeight: 500 }}>
                                  {new Date(item.created_at).toLocaleDateString('de-DE')}
                                </span>
                              </div>
                              <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.3 }}>{item.title}</h4>
                              {response && (
                                <div style={{ marginTop: '4px' }}>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedResponseIds(prev => ({
                                      ...prev,
                                      [response.id]: !prev[response.id]
                                    }))}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      padding: 0,
                                      color: '#34a853',
                                      fontSize: '0.74rem',
                                      fontWeight: 750,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontFamily: 'inherit'
                                    }}
                                  >
                                    {expandedResponseIds[response.id] ? '▲ Rückmeldung einklappen' : '▼ Deine Rückmeldung anzeigen'}
                                  </button>

                                  {expandedResponseIds[response.id] && (() => {
                                    let isJson = false;
                                    let answersObj: Record<string, string> = {};
                                    try {
                                      if (response.response_text.startsWith('{')) {
                                        answersObj = JSON.parse(response.response_text);
                                        isJson = true;
                                      }
                                    } catch (e) {}

                                    return (
                                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 12px', borderRadius: '8px', marginTop: '4px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Deine Rückmeldung:</div>
                                        {isJson ? (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {Object.entries(answersObj).map(([q, ans], ansIdx) => (
                                              <div key={ansIdx} style={{ fontSize: '0.76rem', borderBottom: ansIdx < Object.keys(answersObj).length - 1 ? '1px solid #e2e8f0' : 'none', paddingBottom: '4px' }}>
                                                <div style={{ fontWeight: 800, color: '#475569' }}>{q}</div>
                                                <div style={{ color: '#0f172a', fontStyle: 'italic', marginTop: '2px' }}>{ans || '(keine Antwort)'}</div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div style={{ fontSize: '0.76rem', color: '#334155', fontStyle: 'italic', fontWeight: 500, whiteSpace: 'pre-wrap' }}>{response.response_text}</div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
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
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Sparkles size={18} color="#eab308" />
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mitteilungen</h3>
                </div>

                {/* Campus / Klassen-Feed Switch */}
                <div style={{
                  display: 'inline-flex',
                  background: '#f1f5f9',
                  borderRadius: '8px',
                  padding: '3px',
                  marginBottom: '16px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  {([
                    { id: 'campus', label: 'Campus', icon: <Building2 size={13} style={{ marginRight: '4px' }} /> },
                    { id: 'class', label: 'Klassen-Feed', icon: <Users size={13} style={{ marginRight: '4px' }} /> }
                  ] as const).map(t => {
                    const isActive = teacherFeedTab === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTeacherFeedTab(t.id)}
                        style={{
                          flex: 1,
                          padding: '6px 0',
                          borderRadius: '6px',
                          border: 'none',
                          fontWeight: 600,
                          fontSize: '0.76rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          background: isActive ? '#ffffff' : 'transparent',
                          color: isActive ? '#0f172a' : '#64748b',
                          boxShadow: isActive ? '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)' : 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseOver={e => {
                          if (!isActive) e.currentTarget.style.color = '#0f172a';
                        }}
                        onMouseOut={e => {
                          if (!isActive) e.currentTarget.style.color = '#64748b';
                        }}
                      >
                        {t.icon}
                        {t.label}
                      </button>
                    );
                  })}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {teacherFeedTab === 'campus' ? (
                    campusFeedAnnouncements.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px 0', textAlign: 'center', opacity: 0.6 }}>
                        <Sparkles size={24} color="#94a3b8" style={{ strokeWidth: 1.5 }} />
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                          Keine aktuellen Campus-Mitteilungen vorhanden.
                        </span>
                      </div>
                    ) : (
                      campusFeedAnnouncements.slice(0, 5).map((item, idx, arr) => {
                        const postReactions = feedInteractions.filter(i => i.post_id === item.id);
                        const thumbsUpCount = postReactions.filter(i => i.emoji_unicode === '👍').length;
                        const heartCount = postReactions.filter(i => i.emoji_unicode === '❤️').length;
                        const userHasThumbsUp = postReactions.some(i => i.emoji_unicode === '👍' && i.user_id === userId);
                        const userHasHeart = postReactions.some(i => i.emoji_unicode === '❤️' && i.user_id === userId);

                        let categoryLabel = 'Info';
                        let categoryBg = '#f1f5f9';
                        let categoryColor = '#475569';
                        if (item.category === 'announcement') {
                          categoryLabel = 'Ankündigung';
                        } else if (item.category === 'event') {
                          categoryLabel = 'Event';
                        } else if (item.category === 'holidays') {
                          categoryLabel = 'Ferien';
                        }

                        if (item.is_emergency) {
                          categoryColor = '#b91c1c';
                          categoryBg = '#fce8e6';
                        }

                        return (
                          <div key={item.id} style={{
                            paddingBottom: idx === arr.length - 1 ? '0' : '16px',
                            borderBottom: idx === arr.length - 1 ? 'none' : '1px solid #f1f5f9',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                                  {item.target_type === 'all' ? 'Alle' : item.target_type === 'teachers' ? 'Lehrer' : item.target_type === 'students' ? 'Schüler' : 'Mitteilung'}
                                </span>
                                <span style={{
                                  fontSize: '9px',
                                  fontWeight: 800,
                                  color: categoryColor,
                                  background: categoryBg,
                                  padding: '2px 8px',
                                  borderRadius: '100px',
                                  textTransform: 'uppercase',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}>
                                  {item.is_emergency && <AlertTriangle size={9} color="#b91c1c" />}
                                  {categoryLabel}
                                </span>
                              </div>
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

                            {item.attachment_url && (
                              <div style={{ marginTop: '4px' }}>
                                {item.attachment_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                                  <a href={item.attachment_url} target="_blank" rel="noreferrer">
                                    <img 
                                      src={item.attachment_url} 
                                      alt="Anhang" 
                                      style={{ maxWidth: '100%', maxHeight: '100px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                    />
                                  </a>
                                ) : (
                                  <a 
                                    href={item.attachment_url} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#34a853', textDecoration: 'none', fontWeight: 650 }}
                                  >
                                    📄 Dokument öffnen
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Emoji Reactions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                              <button 
                                onClick={() => handleReactToPost(item.id, '👍', 'campus')}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: userHasThumbsUp ? '#e6f4ea' : 'transparent',
                                  border: '1px solid',
                                  borderColor: userHasThumbsUp ? '#34a853' : '#e2e8f0',
                                  color: userHasThumbsUp ? '#34a853' : '#64748b',
                                  padding: '3px 8px',
                                  borderRadius: '9999px',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <ThumbsUp size={11} color={userHasThumbsUp ? '#34a853' : '#64748b'} />
                                <span>{thumbsUpCount}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Button / Form to create Class Feed Post */}
                      {!showClassPostForm ? (
                        <button
                          onClick={() => setShowClassPostForm(true)}
                          style={{
                            background: '#e6f4ea',
                            color: '#34a853',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.74rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            width: '100%',
                            transition: 'all 0.15s ease'
                          }}
                          className="hover-scale"
                        >
                          <Plus size={12} /> Beitrag erstellen
                        </button>
                      ) : (
                        <div style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e293b' }}>
                              {editingPostId ? 'Beitrag bearbeiten' : 'Neuer Beitrag'}
                            </span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                onClick={() => setNewPostType('announcement')}
                                style={{
                                  background: newPostType === 'announcement' ? '#e6f4ea' : 'transparent',
                                  color: newPostType === 'announcement' ? '#34a853' : '#64748b',
                                  border: 'none',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Info
                              </button>
                              <button
                                onClick={() => setNewPostType('homework')}
                                style={{
                                  background: newPostType === 'homework' ? '#fef3c7' : 'transparent',
                                  color: newPostType === 'homework' ? '#b45309' : '#64748b',
                                  border: 'none',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Hausaufgabe
                              </button>
                            </div>
                          </div>

                          <input
                            type="text"
                            value={newPostTitle}
                            onChange={e => setNewPostTitle(e.target.value)}
                            placeholder="Titel..."
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.74rem',
                              fontFamily: 'inherit',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />

                          <textarea
                            value={newPostContent}
                            onChange={e => setNewPostContent(e.target.value)}
                            placeholder="Inhalt..."
                            rows={3}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.74rem',
                              fontFamily: 'inherit',
                              outline: 'none',
                              resize: 'none',
                              boxSizing: 'border-box'
                            }}
                          />

                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => {
                                setShowClassPostForm(false);
                                setNewPostTitle('');
                                setNewPostContent('');
                                setEditingPostId(null);
                              }}
                              style={{
                                background: 'transparent',
                                color: '#64748b',
                                border: 'none',
                                padding: '4px 10px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Abbrechen
                            </button>
                            <button
                              onClick={handleCreateClassPost}
                              disabled={submittingClassPost || !newPostTitle.trim() || !newPostContent.trim()}
                              style={{
                                background: '#34a853',
                                color: '#ffffff',
                                border: 'none',
                                padding: '5px 12px',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              {editingPostId ? 'Speichern' : 'Veröffentlichen'}
                            </button>
                          </div>
                        </div>
                      )}

                      {classFeedPosts.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px 0', textAlign: 'center', opacity: 0.6 }}>
                          <Users size={24} color="#94a3b8" style={{ strokeWidth: 1.5 }} />
                          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                            Keine Beiträge im Klassen-Feed vorhanden.
                          </span>
                        </div>
                      ) : (
                        classFeedPosts.slice(0, 5).map((item, idx, arr) => {
                          const postReactions = classFeedInteractions.filter(i => i.post_id === item.id);
                          const thumbsUpCount = postReactions.filter(i => i.emoji_unicode === '👍').length;
                          const heartCount = postReactions.filter(i => i.emoji_unicode === '❤️').length;
                          const userHasThumbsUp = postReactions.some(i => i.emoji_unicode === '👍' && i.user_id === userId);
                          const userHasHeart = postReactions.some(i => i.emoji_unicode === '❤️' && i.user_id === userId);

                          let badgeLabel = 'Mitteilung';
                          let badgeBg = '#e6f4ea';
                          let badgeColor = '#34a853';
                          if (item.post_type === 'homework') {
                            badgeLabel = 'Hausaufgabe';
                            badgeBg = '#fef3c7';
                            badgeColor = '#b45309';
                          }

                          return (
                            <div key={item.id} style={{
                              paddingBottom: idx === arr.length - 1 ? '0' : '16px',
                              borderBottom: idx === arr.length - 1 ? 'none' : '1px solid #f1f5f9',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '9px', fontWeight: 800, color: badgeColor, background: badgeBg, padding: '2px 8px', borderRadius: '100px', textTransform: 'uppercase' }}>
                                  {badgeLabel}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 650 }}>
                                    {new Date(item.created_at).toLocaleDateString('de-DE')}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setEditingPostId(item.id);
                                      setNewPostTitle(item.title);
                                      setNewPostContent(item.content);
                                      setNewPostType(item.post_type);
                                      setShowClassPostForm(true);
                                    }}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#94a3b8',
                                      cursor: 'pointer',
                                      padding: '2px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      borderRadius: '4px',
                                      transition: 'all 0.2s'
                                    }}
                                    onMouseOver={e => e.currentTarget.style.color = '#34a853'}
                                    onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
                                    title="Beitrag bearbeiten"
                                  >
                                    <Edit3 size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClassPost(item.id)}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#94a3b8',
                                      cursor: 'pointer',
                                      padding: '2px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      borderRadius: '4px',
                                      transition: 'all 0.2s'
                                    }}
                                    onMouseOver={e => e.currentTarget.style.color = '#ea4335'}
                                    onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
                                    title="Beitrag löschen"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                              
                              <h5 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                                {item.title}
                              </h5>
                              
                              <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, fontWeight: 500, lineHeight: 1.4 }}>
                                {item.content}
                              </p>

                              {/* Emoji Reactions */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                <button 
                                  onClick={() => handleReactToPost(item.id, '👍', 'class')}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: userHasThumbsUp ? '#e6f4ea' : 'transparent',
                                    border: '1px solid',
                                    borderColor: userHasThumbsUp ? '#34a853' : '#e2e8f0',
                                    color: userHasThumbsUp ? '#34a853' : '#64748b',
                                    padding: '3px 8px',
                                    borderRadius: '9999px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <ThumbsUp size={11} color={userHasThumbsUp ? '#34a853' : '#64748b'} />
                                  <span>{thumbsUpCount}</span>
                                </button>
                                <button 
                                  onClick={() => handleReactToPost(item.id, '❤️', 'class')}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: userHasHeart ? '#fce8e6' : 'transparent',
                                    border: '1px solid',
                                    borderColor: userHasHeart ? '#ea4335' : '#e2e8f0',
                                    color: userHasHeart ? '#ea4335' : '#64748b',
                                    padding: '3px 8px',
                                    borderRadius: '9999px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <Heart size={11} color={userHasHeart ? '#ea4335' : '#64748b'} fill={userHasHeart ? '#ea4335' : 'transparent'} />
                                  <span>{heartCount}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>


                </>
              )}
            </aside>
          </div>
        ) : activeTab === 'live' ? (
        <div id="tour-teacher-livelab" className={`live-lab-grid ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          {(() => {
            const isMobileView = windowWidth < 768 || containerWidth < 768 || windowHeight < 500;
            const activeRoom = rooms.find(r => r.id === selectedRoomId);
            const roomStations = stations.filter(s => s.room_id === selectedRoomId);

            if (isMobileView) {
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', minWidth: 0 }}>
                  {/* Mobile Room Switcher Row */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', letterSpacing: '-0.03em', margin: 0 }}>
                        Campus-Groovelab
                      </h2>
                      {setIsSidebarCollapsed && (
                        <button
                          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                          style={{
                            background: 'white',
                            border: '1.5px solid #e2e8f0',
                            padding: '6px 12px',
                            borderRadius: '10px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            color: '#475569',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                          }}
                        >
                          Info {sidebarNotificationsCount > 0 && <span style={{ background: '#ef4444', color: 'white', borderRadius: '50%', width: '6px', height: '6px', display: 'inline-block' }}></span>}
                        </button>
                      )}
                    </div>
                    {rooms.length > 1 && (
                      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
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
                                background: isSelected ? '#eab308' : '#f1f5f9',
                                color: isSelected ? '#0f172a' : '#64748b',
                                padding: '8px 14px',
                                borderRadius: '12px',
                                fontSize: '0.8rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s',
                                boxShadow: isSelected ? '0 4px 10px rgba(234,179,8,0.2)' : 'none'
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
                  </div>

                  {/* Geofence Overlay if not checked in */}
                  {!isUserCheckedIn && (
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.95)',
                      border: '1.5px dashed rgba(234, 179, 8, 0.3)',
                      borderRadius: '24px',
                      padding: '24px',
                      textAlign: 'center',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.04)'
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'rgba(251, 188, 5, 0.08)',
                        border: '1px solid rgba(251, 188, 5, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#eab308',
                        margin: '0 auto 12px auto'
                      }}>
                        <Lock size={20} />
                      </div>
                      <h4 style={{ fontSize: '18px', fontWeight: 900, color: '#1e293b', margin: '0 0 6px 0' }}>
                        Campus-Groovelab Live
                      </h4>
                      <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                        Bitte checke vor Ort in der Musikschule ein, um deine iPad-Station zu aktivieren.
                      </p>
                      {checkingInStatus === 'locating' || checkingInStatus === 'verifying' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <div className="spin-checkin" style={{ width: '20px', height: '20px', border: '3px solid #fbbc05', borderTopColor: 'transparent', borderRadius: '50%' }} />
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#eab308' }}>
                            {checkingInStatus === 'locating' ? 'Bestimme Standort...' : 'Verifiziere Geodaten...'}
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleGeofenceCheck}
                          className="pulse-btn-checkin"
                          style={{
                            padding: '12px 24px',
                            borderRadius: '12px',
                            background: '#fbbc05',
                            border: 'none',
                            color: '#0f172a',
                            fontSize: '14px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            boxShadow: '0 4px 10px rgba(251, 188, 5, 0.2)'
                          }}
                        >
                          Jetzt Einchecken
                        </button>
                      )}
                      {checkingInStatus === 'error' && geoErrorMsg && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', padding: '8px 12px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '10px', color: '#ef4444', fontSize: '12px' }}>
                          <AlertCircle size={14} style={{ flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, textAlign: 'left' }}>{geoErrorMsg}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Checked In Content */}
                  {isUserCheckedIn && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                      {/* Coaches section */}
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.7)',
                        border: '1.5px dashed rgba(52, 168, 83, 0.25)',
                        borderRadius: '24px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#34a853', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34a853' }}></span>
                          Coaches vor Ort
                        </div>
                        {coaches.filter(Boolean).length === 0 ? (
                          <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, fontStyle: 'italic', paddingLeft: '4px' }}>
                            Keine Coaches vor Ort eingeloggt
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {coaches.filter(Boolean).map((c, idx) => {
                              const isSelf = userId && c.id === userId;
                              const coachName = c.users ? `${c.users.first_name} ${maskLastName(c.users.last_name, showRealNames)}` : 'Coach';
                              return (
                                <div
                                  key={c.id || idx}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: 'white',
                                    padding: '6px 12px 6px 8px',
                                    borderRadius: '16px',
                                    border: isSelf ? '1.5px solid #34a853' : '1px solid #e2e8f0',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                                  }}
                                  onClick={() => c.users && setSelectedCoachProfile(c.users)}
                                >
                                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                                    <AvatarImage src={c.users?.photo_url} user={c.users} activePlatform={activePlatform} />
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.75rem', lineHeight: 1.1 }}>{coachName}</span>
                                    <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700 }}>{c.session?.stations?.name || 'Lehrer iPad'}</span>
                                  </div>
                                  {viewMode === 'admin' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isSelf && handleTeacherSelfCheckout) handleTeacherSelfCheckout();
                                        else if (!isSelf && handleTeacherCheckout) handleTeacherCheckout(c);
                                      }}
                                      style={{
                                        background: '#fef2f2',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '16px',
                                        height: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: '#ef4444',
                                        fontSize: '8px',
                                        padding: 0,
                                        marginLeft: '4px'
                                      }}
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Stations section */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {roomStations.filter(s => {
                          const sName = s.name || '';
                          return !(sName.toLowerCase().includes('lehrer') || sName.toLowerCase().includes('teacher'));
                        }).map(station => {
                          const sess = activeSessions.find(se => se.station_id === station.id);
                          const isActive = !!sess;
                          const sName = station.name || '';
                          const instColor = getStationColor(sName, station.color);
                          const activeMins = sess?.check_in_time ? Math.floor((new Date().getTime() - new Date(sess.check_in_time).getTime()) / 60000) : 0;
                          const hasHelp = helpRequests.some(r => r.station_id === station.id);
                          const isMe = sess?.user_id === userId;
                          const studentName = sess?.users ? `${sess.users.first_name} ${maskLastName(sess.users.last_name, showRealNames)}` : '';

                          return (
                            <div
                              key={station.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: 'white',
                                borderRadius: '20px',
                                border: isActive ? `2px solid ${instColor}` : `1px solid ${instColor}40`,
                                padding: '12px 16px',
                                position: 'relative',
                                gap: '12px',
                                boxShadow: isActive ? `0 6px 16px ${instColor}08` : 'none',
                                cursor: isActive ? 'pointer' : 'default',
                                minWidth: 0
                              }}
                              onClick={() => {
                                if (isActive && sess.users) {
                                  setSelectedStudentProfile(sess.users);
                                }
                              }}
                            >
                              {/* Color Left Accent Line */}
                              <div style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: '6px',
                                borderTopLeftRadius: '20px',
                                borderBottomLeftRadius: '20px',
                                background: instColor
                              }} />

                              {/* Station Instrument Icon & Name info */}
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, paddingLeft: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  <Music size={12} style={{ color: instColor }} />
                                  <span>{station.instrument || 'Tablet'}</span>
                                  <span style={{ color: '#cbd5e1' }}>•</span>
                                  <span>{sName}</span>
                                </div>
                                
                                {isActive ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', minWidth: 0 }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', overflow: 'hidden', border: `1.5px solid ${instColor}`, flexShrink: 0 }}>
                                      <AvatarImage src={sess.users?.photo_url} user={sess.users} activePlatform={activePlatform} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                      <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {studentName}
                                      </span>
                                      <span style={{ fontSize: '0.7rem', color: instColor, fontWeight: 700 }}>
                                        Aktiv seit {activeMins}m
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#cbd5e1' }} />
                                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#cbd5e1', letterSpacing: '0.05em' }}>
                                      BEREIT
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Help Request badge */}
                              {hasHelp && (
                                <div style={{
                                  background: '#ef4444',
                                  color: 'white',
                                  padding: '4px 8px',
                                  borderRadius: '8px',
                                  fontSize: '0.6rem',
                                  fontWeight: 900,
                                  animation: 'pulse-red 1s infinite',
                                  boxShadow: '0 2px 6px rgba(239, 68, 68, 0.2)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  marginRight: (viewMode === 'admin' || isMe) ? '4px' : '0px'
                                }}>
                                  <AlertCircle size={10} fill="white" /> HILFE
                                </div>
                              )}

                              {/* Checkout Button */}
                              {isActive && (viewMode === 'admin' || isMe) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleLogoutStudent(sess.id);
                                  }}
                                  style={{
                                    background: '#fef2f2',
                                    border: '1px solid #fee2e2',
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#ef4444',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    padding: 0,
                                    flexShrink: 0
                                  }}
                                  title="Auschecken"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

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

              // Use the original size scaled by manual zoomFactor
              const scale = 1.0 * zoomFactor;

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
                          <div id="tour-teacher-livelab-rooms" style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '5px', borderRadius: '14px' }}>
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
                        <div id="tour-teacher-livelab-rooms" style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '6px', borderRadius: '16px' }}>
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
                    {/* Glass Overlay if user is not checked in */}
                    {!isUserCheckedIn && (
                      <>
                        <style dangerouslySetInnerHTML={{__html: `
                          @keyframes softPulseCheckin {
                            0% {
                              box-shadow: 0 0 0 0 rgba(251, 188, 5, 0.45);
                              transform: scale(1);
                            }
                            50% {
                              box-shadow: 0 0 25px 8px rgba(251, 188, 5, 0.25);
                              transform: scale(1.03);
                            }
                            100% {
                              box-shadow: 0 0 0 0 rgba(251, 188, 5, 0.45);
                              transform: scale(1);
                            }
                          }
                          @keyframes spinCheckin {
                            to { transform: rotate(360deg); }
                          }
                          @keyframes shakeLock {
                            0%, 100% { transform: translateX(0); }
                            20%, 60% { transform: translateX(-6px); }
                            40%, 80% { transform: translateX(6px); }
                          }
                          .pulse-btn-checkin {
                            animation: softPulseCheckin 2.5s infinite ease-in-out;
                          }
                          .spin-checkin {
                            animation: spinCheckin 1s linear infinite;
                          }
                          .shake-lock-active {
                            animation: shakeLock 0.4s ease-in-out;
                          }
                        `}} />
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          borderRadius: '24px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          backdropFilter: 'blur(0.2px)',
                          WebkitBackdropFilter: 'blur(0.2px)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 1000,
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.04)',
                          padding: '24px',
                          textAlign: 'center'
                        }}>
                          {/* Light diagonal stripes overlay (5% opacity) */}
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(15, 23, 42, 0.05) 10px, rgba(15, 23, 42, 0.05) 11px)',
                            pointerEvents: 'none',
                            borderRadius: 'inherit',
                            zIndex: -1
                          }} />
                          <div 
                            className={shakeLock ? 'shake-lock-active' : ''}
                            style={{
                              width: '64px',
                              height: '64px',
                              borderRadius: '50%',
                              background: 'rgba(251, 188, 5, 0.08)',
                              border: '1px solid rgba(251, 188, 5, 0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#eab308',
                              marginBottom: '16px'
                            }}
                          >
                            <Lock size={28} />
                          </div>
                          
                          <h4 style={{ fontSize: '20px', fontWeight: 900, color: '#1e293b', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                            GrooveLab Live-Plattform
                          </h4>
                          <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '300px', margin: '0 0 24px 0', lineHeight: 1.4 }}>
                            Bitte checke vor Ort in der Musikschule ein, um deine iPad-Station zu aktivieren und die Live-Ansicht zu nutzen.
                          </p>

                          {checkingInStatus === 'locating' || checkingInStatus === 'verifying' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                              <div className="spin-checkin" style={{ width: '24px', height: '24px', border: '3px solid #fbbc05', borderTopColor: 'transparent', borderRadius: '50%' }} />
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#eab308' }}>
                                {checkingInStatus === 'locating' ? 'Bestimme Standort...' : 'Verifiziere Geodaten...'}
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={handleGeofenceCheck}
                              className="pulse-btn-checkin"
                              style={{
                                padding: '14px 28px',
                                borderRadius: '16px',
                                background: '#fbbc05',
                                border: 'none',
                                color: '#0f172a',
                                fontSize: '15px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 14px rgba(251, 188, 5, 0.3)'
                              }}
                            >
                              Jetzt Einchecken
                            </button>
                          )}

                          {checkingInStatus === 'error' && geoErrorMsg && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', padding: '10px 16px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', color: '#ef4444', fontSize: '13px', maxWidth: '340px' }}>
                              <AlertCircle size={16} style={{ flexShrink: 0 }} />
                              <span style={{ fontWeight: 600, textAlign: 'left' }}>{geoErrorMsg}</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
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
                        padding: '16px',
                        filter: 'none',
                        pointerEvents: !isUserCheckedIn ? 'none' : 'auto'
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
                          const instColor = getStationColor(sName, station.rawStation.color);

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
                                <CoachesNode coaches={coaches} onProfileSelect={setSelectedCoachProfile} activePlatform={activePlatform} currentUserId={userId} onSelfCheckout={handleTeacherSelfCheckout} onCoachCheckout={handleTeacherCheckout} viewMode={viewMode} />
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
                  <div id="tour-teacher-livelab-rooms" style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '6px', borderRadius: '16px', alignSelf: 'flex-start', marginBottom: '8px' }}>
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
                <div style={{ position: 'relative', width: '100%' }}>
                  {!isUserCheckedIn && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      borderRadius: '32px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(0.2px)',
                      WebkitBackdropFilter: 'blur(0.2px)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1000,
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.04)',
                      padding: '24px',
                      textAlign: 'center'
                    }}>
                      {/* Light diagonal stripes overlay (5% opacity) */}
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(15, 23, 42, 0.05) 10px, rgba(15, 23, 42, 0.05) 11px)',
                        pointerEvents: 'none',
                        borderRadius: 'inherit',
                        zIndex: -1
                      }} />
                      <div 
                        className={shakeLock ? 'shake-lock-active' : ''}
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          background: 'rgba(251, 188, 5, 0.08)',
                          border: '1px solid rgba(251, 188, 5, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#eab308',
                          marginBottom: '16px'
                        }}
                      >
                        <Lock size={28} />
                      </div>
                      
                      <h4 style={{ fontSize: '20px', fontWeight: 900, color: '#1e293b', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                        GrooveLab Live-Plattform
                      </h4>
                      <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '300px', margin: '0 0 24px 0', lineHeight: 1.4 }}>
                        Bitte checke vor Ort in der Musikschule ein, um deine iPad-Station zu aktivieren und die Live-Ansicht zu nutzen.
                      </p>

                      {checkingInStatus === 'locating' || checkingInStatus === 'verifying' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                          <div className="spin-checkin" style={{ width: '24px', height: '24px', border: '3px solid #fbbc05', borderTopColor: 'transparent', borderRadius: '50%' }} />
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#eab308' }}>
                            {checkingInStatus === 'locating' ? 'Bestimme Standort...' : 'Verifiziere Geodaten...'}
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleGeofenceCheck}
                          className="pulse-btn-checkin"
                          style={{
                            padding: '14px 28px',
                            borderRadius: '16px',
                            background: '#fbbc05',
                            border: 'none',
                            color: '#0f172a',
                            fontSize: '15px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 14px rgba(251, 188, 5, 0.3)'
                          }}
                        >
                          Jetzt Einchecken
                        </button>
                      )}

                      {checkingInStatus === 'error' && geoErrorMsg && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', padding: '10px 16px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', color: '#ef4444', fontSize: '13px', maxWidth: '340px' }}>
                          <AlertCircle size={16} style={{ flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, textAlign: 'left' }}>{geoErrorMsg}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
                    gap: '24px', 
                    background: '#ffffff', 
                    padding: '24px', 
                    borderRadius: '32px', 
                    border: '1px solid #e2e8f0',
                    filter: 'none',
                    pointerEvents: !isUserCheckedIn ? 'none' : 'auto'
                  }}>
                    {/* Coaches Node */}
                    <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                      <CoachesNode coaches={coaches} onProfileSelect={setSelectedCoachProfile} activePlatform={activePlatform} currentUserId={userId} onSelfCheckout={handleTeacherSelfCheckout} onCoachCheckout={handleTeacherCheckout} viewMode={viewMode} />
                    </div>
                    {roomStations.filter(s => {
                      const sName = s.name || '';
                      return !(sName.toLowerCase().includes('lehrer') || sName.toLowerCase().includes('teacher'));
                    }).map(station => {
                      const sess = activeSessions.find(se => se.station_id === station.id);
                      const sName = station.name || '';
                      const num = parseInt(sName.match(/\d+/)?.[0] || '1');
                      const instColor = getStationColor(sName, station.color);

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
                background: 'linear-gradient(135deg, #e6f4ea 0%, #f0fdfa 100%)', 
                border: '1px solid #e6f4ea',
                borderRadius: '32px',
                boxShadow: '0 10px 30px rgba(52, 168, 83, 0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ background: '#34a853', color: 'white', padding: '8px', borderRadius: '10px' }}>
                    <Clock size={18} />
                  </div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 1000, color: '#34a853', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>Bandprobe Vorschläge</h3>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {rehearsalSuggestions.map((s, idx) => (
                    <div key={idx} style={{ 
                      background: 'rgba(255,255,255,0.6)', 
                      padding: '8px 12px', 
                      borderRadius: '12px', 
                      border: '1px solid rgba(52, 168, 83, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#34a853', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{s.bandName}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                          fontSize: '0.62rem', 
                          fontWeight: 950, 
                          color: s.count === (s.totalMembers || s.count) ? '#34a853' : '#a16207',
                          background: s.count === (s.totalMembers || s.count) ? '#e6f4ea' : '#fef9c3',
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
                                
                                const color = colors[inst] || '#34a853';
                                
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
                                       background: 'linear-gradient(135deg, #ca8a04, #eab308)',
                                       border: 'none',
                                       padding: '8px 16px',
                                       borderRadius: '12px',
                                       fontSize: '0.8rem',
                                       fontWeight: 900,
                                       color: 'white',
                                       cursor: 'pointer',
                                       display: 'flex',
                                       alignItems: 'center',
                                       justifyContent: 'center',
                                       gap: '6px',
                                       boxShadow: '0 4px 12px rgba(234, 179, 8, 0.2)',
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
                                   color: '#34a853', 
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
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', color: '#94a3b8' }}>
                      <Hourglass size={32} />
                    </div>
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
                    {submissions.slice(0, 5).map(sub => {
                      const studentSession = activeSessions.find(s => s.user_id === sub.user_id);
                      return (
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

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', minWidth: 0 }}>
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
                                      width: '18px', height: '18px', borderRadius: '5px', 
                                      background: INSTRUMENT_COLORS[norm] || '#cbd5e1', 
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                      fontSize: '0.65rem', flexShrink: 0,
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}>
                                      {TEACHER_INSTRUMENT_ICONS[norm] || '🎸'}
                                    </div>
                                  );
                                })()}
                                {studentSession && (
                                  <span style={{ 
                                    color: studentSession.stations?.color || '#3b82f6', 
                                    fontWeight: 900, 
                                    fontSize: '0.75rem',
                                    marginLeft: '2px',
                                    flexShrink: 0
                                  }}>
                                    • {studentSession.stations?.name}
                                  </span>
                                )}
                                <div style={{ 
                                  background: '#e2e8f0', 
                                  padding: '1px 5px', 
                                  borderRadius: '4px', 
                                  fontSize: '0.55rem', 
                                  fontWeight: 950, 
                                  color: '#475569', 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '2px', 
                                  marginLeft: '4px',
                                  flexShrink: 0 
                                }}>
                                  {(sub.difficulty_level === 'original' || sub.difficulty_level === 'pro') ? '⚡ PRO' : '🚀 STARTER'}
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                <div style={{ 
                                  fontSize: '0.65rem', 
                                  fontWeight: 800, 
                                  color: '#64748b', 
                                  textTransform: 'uppercase', 
                                  overflow: 'hidden', 
                                  textOverflow: 'ellipsis', 
                                  whiteSpace: 'nowrap',
                                  flex: 1,
                                  minWidth: 0
                                }}>
                                  {sub.songs?.artist}: {sub.songs?.title}
                                </div>
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
                                background: '#34a853', 
                                color: 'white', 
                                border: 'none', 
                                padding: '12px', 
                                borderRadius: '14px', 
                                fontSize: '0.7rem', 
                                fontWeight: 950, 
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(52, 168, 83, 0.2)',
                                transition: 'all 0.2s'
                              }}
                            >
                              GO!
                            </button>
                          </div>
                        </div>
                      );
                    })}
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
                    
                    // Fetch all active student sessions in this school
                    const { data: activeSess, error: fetchError } = await supabase
                      .from('sessions')
                      .select('user_id, users!inner(role, school_id)')
                      .is('check_out_time', null)
                      .eq('users.school_id', teacher.school_id)
                      .eq('users.role', 'student');

                    if (fetchError) {
                      alert('Fehler beim Abrufen der aktiven Schüler: ' + fetchError.message);
                      return;
                    }

                    if (!activeSess || activeSess.length === 0) {
                      alert('Keine aktiven Schüler-Sessions gefunden.');
                      return;
                    }

                    const studentUserIds = Array.from(new Set(activeSess.map(s => s.user_id)));
                    const { error } = await supabase
                      .from('sessions')
                      .update({ check_out_time: now })
                      .is('check_out_time', null)
                      .in('user_id', studentUserIds);
                    
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

          {showKioskView && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '16px'
            }}>
              <div style={{
                background: '#ffffff',
                borderRadius: '32px',
                width: '100%',
                maxWidth: '650px',
                padding: '32px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                position: 'relative'
              }}>
                {/* Close Button */}
                <button 
                  onClick={() => {
                    setShowKioskView(false);
                    setCheckingInStatus('idle');
                  }}
                  style={{
                    position: 'absolute',
                    top: '24px',
                    right: '24px',
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <X size={18} />
                </button>

                {/* Header */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6366f1', marginBottom: '8px' }}>
                    <Monitor size={20} />
                    <span style={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Einchecken</span>
                  </div>
                  <h3 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Wähle deine iPad-Station</h3>
                  <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>
                    Wähle das iPad aus, an dem du dich anmelden möchtest, um dem Live-Lab beizutreten.
                  </p>
                </div>

                {/* Room Selector inside Kiosk */}
                {rooms.length > 0 && (
                  <div id="tour-teacher-livelab-rooms" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {rooms.map((room, idx) => (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => setSelectedRoomId(room.id)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '12px',
                          border: '1px solid',
                          borderColor: selectedRoomId === room.id ? '#6366f1' : 'rgba(0,0,0,0.1)',
                          background: selectedRoomId === room.id ? '#6366f1' : 'transparent',
                          color: selectedRoomId === room.id ? '#ffffff' : '#1e293b',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s'
                        }}
                      >
                        {`${idx + 1} - ${cleanRoomName(room.name)}`}
                      </button>
                    ))}
                  </div>
                )}

                {/* Kiosk stations map */}
                <div 
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '1.4',
                    background: 'rgba(0, 0, 0, 0.02)',
                    borderRadius: '24px',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    overflow: 'hidden',
                    padding: '16px'
                  }}
                >
                  {(() => {
                    const kioskStations = stations.filter(s => s.room_id === selectedRoomId && !s.name.toLowerCase().includes('lehrer') && !s.name.toLowerCase().includes('teacher'));
                    // Active sessions station IDs
                    const activeSessionStationIds = activeSessions.map(se => se.station_id);

                    return adjustPositions(kioskStations, 586).map((station) => {
                      const isOccupied = activeSessionStationIds.includes(station.id);
                      const posX = station.x;
                      const posY = station.y;
                      const stationColor = getStationColor(station.name, station.color);

                      return (
                        <button
                          key={station.id}
                          type="button"
                          onClick={async () => {
                            if (isOccupied) {
                              const confirm = window.confirm(`Dieses iPad ist besetzt. Möchtest du die alte Sitzung beenden und dieses iPad übernehmen?`);
                              if (!confirm) return;
                            }
                            await handleKioskStationSelect(station);
                          }}
                          style={{
                            position: 'absolute',
                            left: `${posX}%`,
                            top: `${posY}%`,
                            transform: 'translate(-50%, -50%)',
                            width: '72px',
                            height: '72px',
                            borderRadius: '16px',
                            border: `2px solid ${stationColor}`,
                            background: `${stationColor}15`,
                            color: '#1e293b',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2px',
                            textAlign: 'center',
                            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.05)',
                            outline: 'none',
                            zIndex: 1,
                            opacity: isOccupied ? 0.7 : 1
                          }}
                          title={`${station.name} (${isOccupied ? 'Besetzt' : 'Frei'})`}
                        >
                          {station.instrument && (
                            <span style={{ fontSize: '7px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', padding: '0 2px' }}>
                              {station.instrument}
                            </span>
                          )}
                          <span style={{ fontSize: '10px', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', padding: '0 2px', lineHeight: 1.1 }}>
                            {station.name}
                          </span>
                          {isOccupied ? (
                            <Lock size={10} style={{ color: '#ef4444', marginTop: '2px' }} />
                          ) : (
                            <div style={{ 
                              width: '6px', 
                              height: '6px', 
                              borderRadius: '50%', 
                              background: '#34a853',
                              border: '1px solid rgba(255,255,255,0.2)',
                              marginTop: '3px'
                            }} />
                          )}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          )}

          {showKioskPinSetup && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              padding: '16px'
            }}>
              <div style={{
                background: '#ffffff',
                borderRadius: '32px',
                width: '100%',
                maxWidth: '360px',
                padding: '32px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                position: 'relative'
              }}>
                <button 
                  onClick={() => {
                    setShowKioskPinSetup(false);
                    setTargetKioskStation(null);
                    setCheckingInStatus('idle');
                  }}
                  style={{
                    position: 'absolute',
                    top: '24px',
                    right: '24px',
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <X size={18} />
                </button>

                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', marginBottom: '16px' }}>
                  <Key size={28} />
                </div>
                
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>Geburtstag PIN einrichten</h3>
                <p style={{ margin: '8px 0 20px 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 600, lineHeight: '1.4' }}>
                  Bitte gib deinen Geburtstag (nur den Tag, z.B. 20) als PIN ein, um dich einzuloggen.
                </p>

                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                  {[0, 1].map((idx) => (
                    <div key={idx} style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: '2px solid #cbd5e1',
                      background: kioskPinInput.length > idx ? '#cbd5e1' : 'transparent',
                      transition: 'all 0.15s ease'
                    }} />
                  ))}
                </div>

                {/* Keypad */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                  width: '100%',
                  maxWidth: '280px',
                  margin: '20px auto 0 auto'
                }}>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        if (k === 'C') {
                          setKioskPinInput('');
                        } else if (k === '⌫') {
                          setKioskPinInput(prev => prev.slice(0, -1));
                        } else {
                          if (kioskPinInput.length < 2) {
                            setKioskPinInput(prev => prev + k);
                          }
                        }
                      }}
                      style={{
                        height: '56px',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        color: '#0f172a',
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                        outline: 'none',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                      }}
                    >
                      {k}
                    </button>
                  ))}
                </div>

                <button
                  onClick={async () => {
                    if (kioskPinInput.length !== 2) return;
                    const day = parseInt(kioskPinInput, 10);
                    if (isNaN(day) || day < 1 || day > 31) {
                      alert("Bitte gib einen gültigen Tag (01-31) ein.");
                      return;
                    }
                    
                    try {
                      setCheckingInStatus('verifying');
                      const { error: adErr } = await supabase
                        .from('activation_days')
                        .insert({ student_id: userId, day_of_birth: day });
                      if (adErr) throw adErr;

                      const { error: userErr } = await supabase
                        .from('users')
                        .update({ is_pin_activated: true })
                        .eq('id', userId);
                      if (userErr) throw userErr;

                      if (teacher) {
                        teacher.day_of_birth = day;
                        teacher.is_pin_activated = true;
                      }

                      setShowKioskPinSetup(false);
                      
                      if (targetKioskStation) {
                        await handleKioskStationSelect(targetKioskStation);
                      }
                    } catch (err: any) {
                      alert("Fehler beim Speichern: " + err.message);
                      setCheckingInStatus('error');
                    }
                  }}
                  disabled={kioskPinInput.length !== 2}
                  style={{
                    marginTop: '24px',
                    width: '100%',
                    padding: '14px',
                    borderRadius: '16px',
                    background: kioskPinInput.length === 2 ? '#6366f1' : '#cbd5e1',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: kioskPinInput.length === 2 ? 'pointer' : 'default',
                    transition: 'all 0.2s'
                  }}
                >
                  Bestätigen
                </button>
              </div>
            </div>
          )}
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
                                                    <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#34a853', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', zIndex: 10 }}>
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
        <div style={{ display: 'flex', gap: windowWidth < 768 ? '16px' : '32px', alignItems: 'flex-start', flexWrap: 'wrap', width: '100%' }}>
          {/* Main Column */}
          <div style={{ flex: '1 1 300px', minWidth: '0', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
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
              <button
                onClick={() => toggleRealNames()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '24px',
                  padding: '14px 20px',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  background: showRealNames ? '#fee2e2' : '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: showRealNames ? '#ef4444' : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.01)',
                  height: '50px',
                  boxSizing: 'border-box'
                }}
                className="hover-scale"
                title={showRealNames ? "Nachnamen maskieren" : "Nachnamen für 10 Sekunden einblenden"}
              >
                {showRealNames ? <EyeOff size={16} /> : <Eye size={16} />}
                <span>{showRealNames ? "Sperren" : "Anzeigen"}</span>
              </button>
              {teachersManageStudents && (
                <button
                  onClick={() => setShowInviteStudent(true)}
                  style={{
                    padding: '14px 28px',
                    borderRadius: '24px',
                    border: 'none',
                    background: '#8b5cf6',
                    color: 'white',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(139,92,246,0.15)'
                  }}
                  className="hover-scale"
                >
                  <UserPlus size={16} /> Schüler einladen
                </button>
              )}
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
                // Strict Module Activation Filter:
                // GrooveLab tab MUST ONLY show students who have GrooveLab activated (is_groovelab_active === true)
                // Campus tab MUST ONLY show students who have Campus activated (is_campus_active === true)
                const isModuleActive = activePlatform === 'campus'
                  ? (student.is_campus_active === true || student.isCampusActive === true)
                  : (student.is_groovelab_active === true || student.isGroovelabActive === true);

                if (!isModuleActive) return false;

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
                          border: isSessionActive ? '2px solid #34a853' : '1px solid #e2e8f0',
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
                              {student.first_name} {maskLastName(student.last_name, showRealNames)}
                            </div>
                            <div style={{ marginTop: '2px' }}>
                              {(student.is_campus_active || student.isCampusActive) ? (
                                <span style={{ background: '#d1fae5', color: '#065f46', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '100px', display: 'inline-block' }}>
                                  Aktiv
                                </span>
                              ) : (
                                <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '100px', display: 'inline-block' }}>
                                  Inaktiv
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
                        </div>

                        {teachersManageStudents && (
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
                        )}
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
                      let imgFile = 'gitarre_avatar_new.png';
                      if (instLower.includes('klavier') || instLower.includes('piano') || instLower.includes('tasten')) {
                        imgFile = 'klavier_avatar_new.png';
                      } else if (instLower.includes('gitar') || instLower.includes('guitar')) {
                        imgFile = 'gitarre_avatar_new.png';
                      } else if (instLower.includes('bass')) {
                        imgFile = 'bass_avatar.png';
                      } else if (instLower.includes('schlag') || instLower.includes('drum') || instLower.includes('percussion')) {
                        imgFile = 'schlagzeug_avatar.png';
                      } else if (instLower.includes('gesang') || instLower.includes('stimme') || instLower.includes('sing') || instLower.includes('vocals')) {
                        imgFile = 'gesang_avatar.png';
                      } else if (instLower.includes('geige') || instLower.includes('violine') || instLower.includes('streich') || instLower.includes('cello')) {
                        imgFile = instLower.includes('cello') ? 'cello_avatar_new.png' : 'violine_avatar_new.png';
                      } else if (instLower.includes('sax')) {
                        imgFile = 'saxophon_avatar_new.png';
                      } else if (instLower.includes('klarinette')) {
                        imgFile = 'klarinette_avatar_new.png';
                      } else if (instLower.includes('flöte')) {
                        imgFile = 'querfloete_avatar.png';
                      } else if (instLower.includes('horn')) {
                        imgFile = 'horn_avatar_new.png';
                      } else if (instLower.includes('posaune')) {
                        imgFile = 'posaune_avatar.png';
                      } else if (instLower.includes('trompete')) {
                        imgFile = 'trompete_avatar_new.png';
                      } else {
                        imgFile = 'gitarre_avatar_new.png';
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
      ) : activeTab === 'coaches' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 1000, color: '#0f172a', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', textAlign: 'left' }}>
              🎓 Lehrerverwaltung
            </h2>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 600, textAlign: 'left' }}>
              Übersicht über alle aktiven Lehrkräfte und Coaches an deiner Musikschule.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {coaches.map(c => {
              const coach = c.users || c;
              return (
                <div 
                  key={coach.id} 
                  className="google-card"
                style={{ 
                  padding: '24px', 
                  borderRadius: '24px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '16px',
                  border: '1px solid #e2e8f0',
                  background: 'white'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '16px', overflow: 'hidden', border: '2px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', flexShrink: 0 }}>
                    <AvatarImage src={coach.photo_url} user={coach} activePlatform={activePlatform} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: '1rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {coach.first_name} {coach.last_name || ''}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>
                      {coach.role === 'admin' ? 'Administrator' : coach.role === 'secretary' ? 'Sekretariat' : 'Lehrer'}
                    </div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '16px', border: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Instrument:</span>
                    <span style={{ fontWeight: 800 }}>{coach.instrument || 'Allgemein'}</span>
                  </div>
                  {coach.email && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>E-Mail:</span>
                      <span style={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>{coach.email}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      ) : activeTab === 'settings' ? (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 1000, color: '#0f172a', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', textAlign: 'left' }}>
              ⚙️ Einstellungen
            </h2>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 600, textAlign: 'left' }}>
              Passe deine persönlichen Einstellungen und die Fokus-Stufen für deine Schüler an.
            </p>
          </div>

          <div style={{ 
            display: 'flex',
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.02)',
            minHeight: '520px',
            overflow: 'hidden',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
          }}>
            {/* LEFT SIDEBAR */}
            <div style={{
              width: '240px',
              background: '#f8fafc',
              borderRight: '1px solid #e2e8f0',
              padding: '24px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              flexShrink: 0
            }}>
              <h3 style={{ margin: '0 0 16px 8px', fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Bereiche</h3>
              {[
                { id: 'fokus', label: 'Fokus-Stufen' },
                { id: 'profile', label: 'Mein Profil' }
              ].map((item) => {
                const isSelected = teacherSettingsTab === item.id;
                const brandColor = '#34a853';
                const activeColor = isSelected ? brandColor : '#64748b';
                
                const renderIcon = () => {
                  switch (item.id) {
                    case 'fokus': return <Activity size={14} color={activeColor} />;
                    case 'profile': return <User size={14} color={activeColor} />;
                    default: return null;
                  }
                };

                return (
                  <button
                    key={item.id}
                    onClick={() => setTeacherSettingsTab(item.id as any)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: isSelected ? '0 12px 12px 0' : '12px',
                      border: 'none',
                      borderLeft: isSelected ? `3px solid ${brandColor}` : '3px solid transparent',
                      background: isSelected ? '#e6f4ea' : 'transparent',
                      color: isSelected ? brandColor : '#475569',
                      fontSize: '0.84rem',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-scale"
                  >
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      background: isSelected ? '#ffffff' : '#f1f5f9',
                      boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                    }}>{renderIcon()}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* RIGHT PANEL */}
            <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', textAlign: 'left' }}>
              {teacherSettingsTab === 'fokus' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>Fokus-Stufen konfigurieren</h3>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>Definiere die Zeiten in Minuten, die für Flammen in den jeweiligen Leveln benötigt werden.</p>
                  </div>

                  {(() => {
                    const currentConfig = schoolData?.opening_hours?.fokus_levels || {
                      level1: { kleine: 3, mittlere: 5, helden: 10 },
                      level2: { kleine: 5, mittlere: 10, helden: 15 },
                      level3: { kleine: 10, mittlere: 15, helden: 20 }
                    };

                    const levels = [
                      { key: 'level1', label: '🥚 Level 1 (Stufe 1)', defaults: { kleine: 3, mittlere: 5, helden: 10 } },
                      { key: 'level2', label: '🐥 Level 2 (Stufe 2)', defaults: { kleine: 5, mittlere: 10, helden: 15 } },
                      { key: 'level3', label: '🦅 Level 3 (Stufe 3)', defaults: { kleine: 10, mittlere: 15, helden: 20 } }
                    ];

                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                        {levels.map((lvl) => {
                          const conf = currentConfig[lvl.key] || lvl.defaults;
                          return (
                            <div key={lvl.key} style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px 20px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                              <strong style={{ fontSize: '0.86rem', color: '#1e293b' }}>{lvl.label}</strong>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {[
                                  { k: 'kleine', label: 'Kleine Flamme' },
                                  { k: 'mittlere', label: 'Mittlere Flamme' },
                                  { k: 'helden', label: 'Helden-Flamme' }
                                ].map((type) => (
                                  <div key={type.k} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>{type.label} (Minuten)</label>
                                    <input 
                                      type="number"
                                      min="1"
                                      value={conf[type.k] || 1}
                                      onChange={(e) => {
                                        const val = Math.max(1, parseInt(e.target.value) || 1);
                                        const updated = JSON.parse(JSON.stringify(currentConfig));
                                        if (!updated[lvl.key]) updated[lvl.key] = {};
                                        updated[lvl.key][type.k] = val;
                                        setSchoolData((prev: any) => ({
                                          ...prev,
                                          opening_hours: { ...prev.opening_hours, fokus_levels: updated }
                                        }));
                                      }}
                                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.84rem', fontWeight: 700 }}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {teacherSettingsTab === 'profile' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>Mein Profil</h3>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>Deine hinterlegten Daten im Campus-Groovelab.</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: windowWidth < 768 ? '1fr' : '1fr 1fr', gap: '16px', background: '#f8fafc', padding: windowWidth < 768 ? '16px' : '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Vorname</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={teacher?.first_name || ''} 
                        style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#e2e8f0', color: '#64748b', fontSize: '0.84rem', fontWeight: 700, cursor: 'not-allowed', outline: 'none' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Nachname</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={teacher?.last_name || ''} 
                        style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#e2e8f0', color: '#64748b', fontSize: '0.84rem', fontWeight: 700, cursor: 'not-allowed', outline: 'none' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>E-Mail-Adresse</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={teacher?.email || ''} 
                        style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#e2e8f0', color: '#64748b', fontSize: '0.84rem', fontWeight: 700, cursor: 'not-allowed', outline: 'none' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
                      <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Rolle</label>
                      <input 
                        type="text" 
                        readOnly 
                        value="Campus-Lehrkraft" 
                        style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#e2e8f0', color: '#64748b', fontSize: '0.84rem', fontWeight: 700, cursor: 'not-allowed', outline: 'none' }}
                      />
                    </div>
                  </div>

                  {/* AVATAR SELECTION SECTION */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      🖼️ Profil-Avatar auswählen
                    </label>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                      Wähle dein bevorzugtes Avatar-Bild für den Live Lab &amp; die Sidebar aus.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', gap: '12px', marginTop: '8px' }}>
                      {[
                        { url: '/avatars/gitarre_avatar_new.png', name: 'Gitarre' },
                        { url: '/avatars/egitarre_avatar.png', name: 'E-Gitarre' },
                        { url: '/avatars/ebass_avatar.png', name: 'E-Bass' },
                        { url: '/avatars/schlagzeug_avatar.png', name: 'Drums' },
                        { url: '/avatars/klavier_avatar_new.png', name: 'Klavier' },
                        { url: '/avatars/gesang_avatar.png', name: 'Gesang' },
                        { url: '/avatars/trompete_avatar_new.png', name: 'Trompete' },
                        { url: '/avatars/saxophon_avatar_new.png', name: 'Saxophon' },
                        { url: '/avatar_ghost.jpg', name: 'Geist' }
                      ].map((av) => {
                        const isSelected = teacher?.photo_url === av.url || teacher?.avatar_url === av.url;
                        return (
                          <div
                            key={av.url}
                            onClick={async () => {
                              if (!teacher?.id) return;
                              try {
                                const { error } = await supabase
                                  .from('users')
                                  .update({ photo_url: av.url, avatar_url: av.url })
                                  .eq('id', teacher.id);
                                if (error) throw error;
                                setTeacher((prev: any) => ({ ...prev, photo_url: av.url, avatar_url: av.url }));
                              } catch (err: any) {
                                alert('Fehler beim Aktualisieren: ' + err.message);
                              }
                            }}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px',
                              borderRadius: '14px',
                              background: isSelected ? '#e6f4ea' : 'white',
                              border: isSelected ? '2px solid #34a853' : '1px solid #cbd5e1',
                              cursor: 'pointer',
                              boxShadow: isSelected ? '0 4px 12px rgba(52,168,83,0.15)' : 'none',
                              transition: 'all 0.15s'
                            }}
                          >
                            <img
                              src={av.url}
                              alt={av.name}
                              style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: isSelected ? '#34a853' : '#64748b' }}>
                              {av.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* PERSISTENT BOTTOM SAVE BAR */}
          {(() => {
            const isSettingsDirty = initialSchoolData && schoolData && 
              JSON.stringify(schoolData.opening_hours?.fokus_levels) !== JSON.stringify(initialSchoolData.opening_hours?.fokus_levels);
            const brandColor = '#34a853';

            return (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 40px',
                border: '1px solid #e2e8f0',
                background: isSettingsDirty ? '#fef2f2' : '#f8fafc',
                borderRadius: '20px',
                transition: 'background-color 0.3s ease'
              }}>
                {isSettingsDirty ? (
                  <span style={{ fontSize: '0.82rem', color: '#ea4335', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ⚠️ Ungespeicherte Änderungen vorhanden.
                  </span>
                ) : (
                  <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ✓ Alle Änderungen gespeichert.
                  </span>
                )}
                <button
                  onClick={async () => {
                    if (!teacher?.school_id || !schoolData) return;
                    setIsSaving(true);
                    const { error } = await supabase
                      .from('schools')
                      .update({ opening_hours: schoolData.opening_hours })
                      .eq('id', teacher.school_id);
                    setIsSaving(false);
                    if (error) {
                      alert("Fehler beim Speichern der Einstellungen: " + error.message);
                    } else {
                      setInitialSchoolData(JSON.parse(JSON.stringify(schoolData)));
                      alert("Einstellungen erfolgreich gespeichert! 🎉");
                    }
                  }}
                  disabled={!isSettingsDirty || isSaving}
                  style={{
                    padding: '10px 24px',
                    background: isSettingsDirty ? brandColor : '#cbd5e1',
                    color: isSettingsDirty ? 'white' : '#94a3b8',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    cursor: isSettingsDirty ? 'pointer' : 'default',
                    boxShadow: isSettingsDirty ? `0 4px 12px ${brandColor}40` : 'none',
                    transition: 'all 0.2s',
                    opacity: isSaving ? 0.7 : 1
                  }}
                  className={isSettingsDirty ? "hover-scale" : ""}
                >
                  {isSaving ? 'Wird gespeichert...' : 'Einstellungen speichern'}
                </button>
              </div>
            );
          })()}
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
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                    {schoolData?.has_campus_subscription !== false ? 'Nachname *' : 'Nachname (Initial) *'}
                  </label>
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

              {/* Campus app_usage_mode Toggle (Only for Campus) */}
              {activePlatform === 'campus' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Campus-Nutzungsmodus</label>
                  <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '12px', padding: '4px', border: '1px solid #e2e8f0' }}>
                    <button
                      type="button"
                      onClick={() => setNewStudent({...newStudent, app_usage_mode: 'student_only'})}
                      style={{
                        flex: 1, padding: '10px', border: 'none', borderRadius: '8px',
                        background: (newStudent.app_usage_mode || 'student_only') === 'student_only' ? '#ffffff' : 'transparent',
                        color: (newStudent.app_usage_mode || 'student_only') === 'student_only' ? '#8b5cf6' : '#64748b',
                        fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: (newStudent.app_usage_mode || 'student_only') === 'student_only' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                      }}
                    >
                      📱 Selbstnutzer
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewStudent({...newStudent, app_usage_mode: 'parent_hybrid'})}
                      style={{
                        flex: 1, padding: '10px', border: 'none', borderRadius: '8px',
                        background: newStudent.app_usage_mode === 'parent_hybrid' ? '#ffffff' : 'transparent',
                        color: newStudent.app_usage_mode === 'parent_hybrid' ? '#8b5cf6' : '#64748b',
                        fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: newStudent.app_usage_mode === 'parent_hybrid' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                      }}
                    >
                      👪 Eltern-Hybrid
                    </button>
                  </div>
                </div>
              )}

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
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  {schoolData?.has_campus_subscription !== false ? 'Nachname' : 'Nachname (Initial)'}
                </label>
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

              {/* Campus app_usage_mode Toggle (Only for Campus) */}
              {activePlatform === 'campus' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Campus-Nutzungsmodus</label>
                  <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '12px', padding: '4px', border: '1px solid #e2e8f0' }}>
                    <button
                      type="button"
                      onClick={() => setEditingStudent({...editingStudent, app_usage_mode: 'student_only'})}
                      style={{
                        flex: 1, padding: '10px', border: 'none', borderRadius: '8px',
                        background: (editingStudent.app_usage_mode || 'student_only') === 'student_only' ? '#ffffff' : 'transparent',
                        color: (editingStudent.app_usage_mode || 'student_only') === 'student_only' ? '#8b5cf6' : '#64748b',
                        fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: (editingStudent.app_usage_mode || 'student_only') === 'student_only' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                      }}
                    >
                      📱 Selbstnutzer
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingStudent({...editingStudent, app_usage_mode: 'parent_hybrid'})}
                      style={{
                        flex: 1, padding: '10px', border: 'none', borderRadius: '8px',
                        background: editingStudent.app_usage_mode === 'parent_hybrid' ? '#ffffff' : 'transparent',
                        color: editingStudent.app_usage_mode === 'parent_hybrid' ? '#8b5cf6' : '#64748b',
                        fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: editingStudent.app_usage_mode === 'parent_hybrid' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                      }}
                    >
                      👪 Eltern-Hybrid
                    </button>
                  </div>
                </div>
              )}

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
                    border: `2px solid ${isInLab ? '#34a853' : '#ef4444'}`,
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
                      background: isInLab ? '#34a853' : '#ef4444',
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
                       style={{ flex: 2, background: '#34a853', color: 'white', border: 'none', padding: '12px', borderRadius: '16px', fontWeight: 1000, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(52, 168, 83, 0.2)' }}
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

      {/* ── KRANKMELDUNGS-BESTÄTIGUNG MODAL ── */}
      {sickNotifModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setSickNotifModal(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: '28px',
              padding: '32px', width: '100%', maxWidth: '540px',
              maxHeight: '80vh', overflow: 'hidden',
              display: 'flex', flexDirection: 'column', gap: '20px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                borderRadius: '16px', padding: '12px', flexShrink: 0,
                boxShadow: '0 6px 20px rgba(239,68,68,0.3)',
              }}>
                <AlertTriangle size={22} color="white" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Krankmeldung registriert
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Gemeldet bis einschließlich{' '}
                  <strong style={{ color: '#ef4444' }}>
                    {new Date(sickNotifModal.sickUntilDateStr).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                  </strong>
                </p>
              </div>
              <button
                onClick={() => setSickNotifModal(null)}
                style={{
                  background: '#f1f5f9', border: 'none', borderRadius: '10px',
                  padding: '8px', cursor: 'pointer', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={16} color="#64748b" />
              </button>
            </div>

            {/* Status bar */}
            <div style={{
              background: sickNotifModal.notifs.length > 0 ? '#fff5f5' : '#e6f4ea',
              border: `1.5px solid ${sickNotifModal.notifs.length > 0 ? '#fecaca' : '#e6f4ea'}`,
              borderRadius: '16px', padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <span style={{ fontSize: '1.5rem' }}>
                {sickNotifModal.notifs.length > 0 ? '🔔' : '🎉'}
              </span>
              <div>
                <strong style={{ fontSize: '0.85rem', color: '#0f172a', display: 'block', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {sickNotifModal.notifs.length > 0
                    ? `${sickNotifModal.notifs.length} Schüler werden benachrichtigt`
                    : 'Keine Stunden betroffen'}
                </strong>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {sickNotifModal.notifs.length > 0
                    ? 'Die Verwaltung sieht alle Fälle im Krisen-Dashboard und informiert die Schüler.'
                    : 'Für diesen Zeitraum gibt es keine geplanten Stunden.'}
                </span>
              </div>
            </div>

            {/* Affected student list */}
            {sickNotifModal.notifs.length > 0 && (
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Betroffene Stunden ({sickNotifModal.notifs.length})
                </p>
                {sickNotifModal.notifs.map((n, i) => {
                  const dt = new Date(n.slot_start_datetime);
                  const dateStr = dt.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
                  
                  const durationMinutes = n.duration || 30;
                  const dtEnd = new Date(dt.getTime() + durationMinutes * 60 * 1000);
                  const timeStrStart = dt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                  const timeStrEnd = dtEnd.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                  const timeStrRange = `${timeStrStart} - ${timeStrEnd} Uhr`;

                  const studentName = n.student_name || (() => {
                    const student = allStudents.find(s => s.id === n.student_id);
                    return student ? `${student.first_name} ${maskLastName(student.last_name, showRealNames)}`.trim() : `Schüler: ${n.student_id?.substring(0, 8)}…`;
                  })();

                  return (
                    <div
                      key={i}
                      style={{
                        background: '#f8fafc', border: '1.5px solid #e2e8f0',
                        borderLeft: '4px solid #ef4444',
                        borderRadius: '14px', padding: '12px 14px',
                        display: 'flex', alignItems: 'center', gap: '12px',
                      }}
                    >
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                        border: '2px solid #fecaca',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.85rem', fontWeight: 800, color: '#dc2626',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}>
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {studentName}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={13} style={{ color: '#64748b' }} />
                            {dateStr}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={13} style={{ color: '#64748b' }} />
                            {timeStrRange}
                          </span>
                        </div>
                      </div>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 800, padding: '3px 10px',
                        borderRadius: '100px', background: '#fef2f2', color: '#dc2626',
                        border: '1px solid #fecaca', whiteSpace: 'nowrap',
                      }}>Storno</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Info + close button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{
                background: '#eff6ff', border: '1px solid #bfdbfe',
                borderRadius: '12px', padding: '10px 14px',
                fontSize: '0.72rem', color: '#3b82f6', lineHeight: 1.5,
              }}>
                ℹ️ Die <strong>Verwaltung</strong> wurde automatisch alarmiert. Im Krisen-Dashboard können alle Fälle eingesehen und als <em>"Informiert"</em> markiert werden.
              </div>
              <button
                onClick={() => setSickNotifModal(null)}
                style={{
                  background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                  color: 'white', border: 'none', borderRadius: '14px',
                  padding: '14px', fontWeight: 900, fontSize: '0.85rem',
                  cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                  boxShadow: '0 4px 16px rgba(15,23,42,0.2)',
                }}
              >
                ✓ Verstanden — Zurück zum Briefing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1:1 Shoutbox Overlay Modal */}
      {activeChatOcc && (() => {
        const studentName = activeChatOcc.student?.first_name || activeChatOcc.student?.name || 'Schüler';
        const titleText = `1:1 Shoutbox: ${studentName}`;
        
        let isFrozen = false;
        try {
          const timePart = activeChatOcc.start_time.includes(':') ? activeChatOcc.start_time : `${activeChatOcc.start_time}:00`;
          const lessonDateTime = new Date(`${activeChatOcc.date}T${timePart}`);
          isFrozen = Date.now() > lessonDateTime.getTime() + 48 * 60 * 60 * 1000;
        } catch (e) {}

        const isGroupOcc = Boolean(activeChatOcc.isGroup || (activeChatOcc.student?.first_name && activeChatOcc.student?.first_name.includes('&')) || (activeChatOcc.studentName && activeChatOcc.studentName.includes('&')));
        const isCancelledOcc = Boolean(activeChatOcc.status && ['cancelled', 'canceled_by_student', 'teacher_sick', 'canceled_by_teacher_sick'].includes(activeChatOcc.status));
        const isRescheduledOcc = Boolean((activeChatOcc.status && ['pending_reschedule', 'rescheduled_confirmed', 'rescheduled', 'open_reschedule', 'changed', 'pending', 'draft'].includes(activeChatOcc.status)) ||
          Boolean(activeChatOcc.original_date && activeChatOcc.original_date !== activeChatOcc.date) ||
          Boolean(activeChatOcc.original_start_time && activeChatOcc.start_time && activeChatOcc.original_start_time.substring(0, 5) !== activeChatOcc.start_time.substring(0, 5)));
        const isConfirmedOcc = Boolean(activeChatOcc.status === 'rescheduled_confirmed' || activeChatOcc.student_acknowledged === true || activeChatOcc.studentAcknowledged === true);

        let headerBackground = 'linear-gradient(135deg, #34a853 0%, #137333 100%)';
        let headerBorder = 'none';
        let headerTextColor = '#ffffff';
        let headerSubColor = 'rgba(255, 255, 255, 0.95)';
        let headerBadgeBg = 'rgba(255, 255, 255, 0.22)';
        let headerBadgeColor = '#ffffff';
        let headerBadgeBorder = '1px solid rgba(255, 255, 255, 0.3)';
        let statusBadgeText = '✓ Regulärer Termin';

        if (isCancelledOcc) {
          headerBackground = 'repeating-linear-gradient(-45deg, #fef2f2 0px, #fef2f2 8px, #ffffff 8px, #ffffff 16px)';
          headerBorder = '2px dashed #ef4444';
          headerTextColor = '#991b1b';
          headerSubColor = '#ef4444';
          headerBadgeBg = '#fee2e2';
          headerBadgeColor = '#dc2626';
          headerBadgeBorder = '1px solid #fca5a5';
          statusBadgeText = '✕ Ausfall / Absage';
        } else if (isGroupOcc) {
          if (isRescheduledOcc && !isConfirmedOcc) {
            headerBackground = 'repeating-linear-gradient(-45deg, #f0f9ff 0px, #f0f9ff 8px, #ffffff 8px, #ffffff 16px)';
            headerBorder = '2px dashed #0284c7';
            headerTextColor = '#0369a1';
            headerSubColor = '#0284c7';
            headerBadgeBg = '#e0f2fe';
            headerBadgeColor = '#0284c7';
            headerBadgeBorder = '1px solid #bae6fd';
            statusBadgeText = '⏳ Gruppentermin Verschoben (Unbestätigt)';
          } else if (isRescheduledOcc && isConfirmedOcc) {
            headerBackground = 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)';
            headerBorder = '2px solid #0284c7';
            headerTextColor = '#0369a1';
            headerSubColor = '#0284c7';
            headerBadgeBg = '#dcfce7';
            headerBadgeColor = '#15803d';
            headerBadgeBorder = '1px solid #86efac';
            statusBadgeText = '✓ Gruppentermin Verschoben (Bestätigt)';
          } else {
            headerBackground = 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)';
            headerBorder = 'none';
            headerTextColor = '#ffffff';
            headerSubColor = 'rgba(255, 255, 255, 0.95)';
            headerBadgeBg = 'rgba(255, 255, 255, 0.22)';
            headerBadgeColor = '#ffffff';
            headerBadgeBorder = '1px solid rgba(255, 255, 255, 0.3)';
            statusBadgeText = '👥 Gruppentermin';
          }
        } else if (isRescheduledOcc) {
          if (!isConfirmedOcc) {
            headerBackground = 'repeating-linear-gradient(-45deg, #fefce8 0px, #fefce8 8px, #ffffff 8px, #ffffff 16px)';
            headerBorder = '2px dashed #eab308';
            headerTextColor = '#854d0e';
            headerSubColor = '#b45309';
            headerBadgeBg = '#fef3c7';
            headerBadgeColor = '#b45309';
            headerBadgeBorder = '1px solid #fde68a';
            statusBadgeText = '⏳ Einzeltermin Verschoben (Unbestätigt)';
          } else {
            headerBackground = 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)';
            headerBorder = '2px solid #eab308';
            headerTextColor = '#854d0e';
            headerSubColor = '#b45309';
            headerBadgeBg = '#dcfce7';
            headerBadgeColor = '#15803d';
            headerBadgeBorder = '1px solid #86efac';
            statusBadgeText = '✓ Einzeltermin Verschoben (Bestätigt)';
          }
        }

        return (
          <div
            onClick={() => setActiveChatOcc(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1100,
              background: 'rgba(15,23,42,0.65)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              animation: 'fadeIn 0.15s ease'
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '480px',
                boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                maxHeight: '85vh',
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
              }}
            >
              {/* Header */}
              <div style={{
                background: headerBackground,
                borderBottom: headerBorder,
                padding: '20px 24px',
                color: headerTextColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: headerTextColor, display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      <span>💬</span> {titleText}
                    </h3>
                  </div>
                  <p style={{ margin: '4px 0 6px 0', color: headerSubColor, fontSize: '0.75rem', fontWeight: 600 }}>
                    Termin am {new Date(activeChatOcc.date).toLocaleDateString('de-DE')} um {activeChatOcc.start_time ? activeChatOcc.start_time.substring(0, 5) : '00:00'} Uhr
                  </p>
                  
                  {/* Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: headerBadgeBg,
                      color: headerBadgeColor,
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      backdropFilter: 'blur(4px)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      whiteSpace: 'nowrap',
                      border: headerBadgeBorder
                    }}>
                      <span>{statusBadgeText}</span>
                    </span>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: headerBadgeBg,
                      color: headerBadgeColor,
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      backdropFilter: 'blur(4px)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      whiteSpace: 'nowrap',
                      border: headerBadgeBorder
                    }}>
                      <ShieldCheck size={13} color={headerBadgeColor} />
                      <span>DSGVO-konform</span>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveChatOcc(null)}
                  style={{
                    border: headerBadgeBorder,
                    background: headerBadgeBg,
                    color: headerBadgeColor,
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    alignSelf: 'flex-start'
                  }}
                >
                  <X size={18} color={headerBadgeColor} />
                </button>
              </div>

              {/* Messages Viewport */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px',
                background: '#fafbfc',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                minHeight: '280px',
                maxHeight: '400px'
              }} className="custom-scrollbar">
                {isFrozen && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fee2f2', color: '#991b1b', padding: '8px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', textAlign: 'center' }}>
                    🔒 Shoutbox eingefroren (Schreibschutz nach 48h aktiv)
                  </div>
                )}
                {chatMessages.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.82rem', textAlign: 'center', padding: '24px 16px', gap: '8px', background: 'rgba(255,255,255,0.7)', border: '1.5px dashed #cbd5e1', borderRadius: '16px', margin: 'auto 0' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#e6f4ea', color: '#34a853', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                      <Calendar size={20} />
                    </div>
                    <h5 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                      Termingekoppelter Schulchat
                    </h5>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4, maxWidth: '240px' }}>
                      Geschützte Direktnachrichten für diesen Unterrichtstermin – 100% DSGVO- & datenschutzkonform.
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => {
                    const isMe = msg.sender_id === userId;
                    return (
                      <div key={msg.id || idx} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        maxWidth: '82%',
                        alignItems: isMe ? 'flex-end' : 'flex-start',
                        gap: '2px'
                      }}>
                        <div style={{
                          background: isMe ? '#e6f4ea' : '#ffffff',
                          color: '#0f172a',
                          padding: '10px 14px',
                          borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                          fontSize: '0.85rem',
                          lineHeight: 1.4,
                          wordBreak: 'break-word',
                          border: isMe ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                        }}>
                          {msg.content}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px', marginTop: '4px' }}>
                            <span style={{ fontSize: '0.62rem', color: isMe ? '#15803d' : '#64748b', fontWeight: 600 }}>
                              {new Date(msg.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}, {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isMe && <CheckCheck size={14} color="#15803d" style={{ marginLeft: '2px' }} />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatMessagesEndRef} />
              </div>

              {/* Music Pedagogical Quick Reply Chips */}
              {!isFrozen && (
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '10px 20px 4px 20px', background: '#fafbfc' }}>
                  {[
                    '👍 Ja, geht klar!',
                    '❌ Nein, geht leider nicht',
                    '⏳ Bin 5 Min. später',
                    '🎼 Bitte Notenheft mitbringen',
                    '📝 Hausaufgabe im Aufgabenheft',
                    '✅ Termin ist bestätigt'
                  ].map((text, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setChatTypedMessage(text)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '16px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#334155',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}
                    >
                      {text}
                    </button>
                  ))}
                </div>
              )}

              {/* Message Input Form (Styled according to Screenshot 2) */}
              <form onSubmit={handleSendChatMessage} style={{
                padding: '16px 20px',
                borderTop: '1px solid #f1f5f9',
                background: '#fafbfc',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <input
                  type="text"
                  placeholder={isFrozen ? "Eingefroren..." : "Nachricht schreiben..."}
                  disabled={isFrozen}
                  value={chatTypedMessage}
                  onChange={e => setChatTypedMessage(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    borderRadius: '100px',
                    border: '1.5px solid #cbd5e1',
                    background: isFrozen ? '#f1f5f9' : '#ffffff',
                    fontSize: '0.88rem',
                    outline: 'none',
                    color: '#1e293b',
                    boxShadow: 'none',
                    transition: 'all 0.2s'
                  }}
                />
                <button
                  type="submit"
                  disabled={isFrozen || !chatTypedMessage.trim()}
                  style={{
                    background: isFrozen || !chatTypedMessage.trim() ? '#dbe3ea' : '#34a853',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '42px',
                    height: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: (isFrozen || !chatTypedMessage.trim()) ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    flexShrink: 0,
                    transition: 'all 0.2s'
                  }}
                  className={!isFrozen && chatTypedMessage.trim() ? 'hover-scale' : ''}
                  title="Nachricht senden"
                >
                  <Send size={18} color="#ffffff" style={{ marginLeft: '-2px' }} />
                </button>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Realtime Toast Message Overlay */}
      {toastMessage && (
        <div 
          className="animation-slide-up"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'linear-gradient(135deg, #ca8a04, #eab308)',
            color: 'white',
            borderRadius: '16px',
            padding: '16px 24px',
            boxShadow: '0 10px 30px rgba(234, 179, 8, 0.4)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontWeight: 800,
            fontSize: '0.95rem',
            border: '1px solid #fef08a'
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>🎉</span>
          <span>{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '1.2rem',
              fontWeight: 800,
              marginLeft: '8px',
              padding: 0,
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>
      )}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
        <TourStartButton onClick={startTour} platformTheme={activePlatform === 'campus' ? 'campus' : 'groovelab'} />
      </div>
      <TourComponent />
    </div>
  );
}

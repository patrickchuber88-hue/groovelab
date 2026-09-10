import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// --- ANTI-FLICKER AVATAR RESOLUTION SYSTEM ---
import {
  isGenericInstrument,
  isExplicitNonInstrumentSubject,
  hasDedicated3DAvatar,
  getInstrumentAvatarUrl,
  getDefaultMusicianAvatarUrl,
  getInstrumentTypeKey,
  getEffectiveInstrument,
  resolveCampusStudentAvatar,
  resolveGrooveLabTeacherAvatar
} from '../utils/avatarResolutionEngine';

export {
  isGenericInstrument,
  isExplicitNonInstrumentSubject,
  hasDedicated3DAvatar,
  getInstrumentAvatarUrl,
  getDefaultMusicianAvatarUrl,
  getInstrumentTypeKey,
  getEffectiveInstrument,
  resolveCampusStudentAvatar,
  resolveGrooveLabTeacherAvatar
};

export const resolveStudentInstrumentAsync = async (user: any): Promise<string> => {
  if (!user) return '';
  if (user.resolved_instrument && !isGenericInstrument(user.resolved_instrument)) {
    return String(user.resolved_instrument).split(',')[0].trim();
  }
  if (user.instrument && !isGenericInstrument(user.instrument)) {
    return String(user.instrument).split(',')[0].trim();
  }

  // 1. Direct teacher_id check in users table
  if (user.teacher_id) {
    try {
      const { data: teacherData } = await supabase
        .from('users')
        .select('instrument, subject')
        .eq('id', user.teacher_id)
        .maybeSingle();
      if (teacherData?.instrument && !isGenericInstrument(teacherData.instrument)) {
        return String(teacherData.instrument).split(',')[0].trim();
      }
      if (teacherData?.subject && !isGenericInstrument(teacherData.subject)) {
        return String(teacherData.subject).split(',')[0].trim();
      }
    } catch (e) {}
  }

  // 2. Relational student_teachers junction lookup
  if (user.id) {
    try {
      const { data: stData } = await supabase
        .from('student_teachers')
        .select('teacher_id, teacher:users!student_teachers_teacher_id_fkey(instrument, subject)')
        .eq('student_id', user.id)
        .maybeSingle();
      const teacherObj: any = Array.isArray(stData?.teacher) ? stData?.teacher[0] : stData?.teacher;
      if (teacherObj?.instrument && !isGenericInstrument(teacherObj.instrument)) {
        return String(teacherObj.instrument).split(',')[0].trim();
      }
      if (teacherObj?.subject && !isGenericInstrument(teacherObj.subject)) {
        return String(teacherObj.subject).split(',')[0].trim();
      }
    } catch (e) {}
  }

  return '';
};

// ─── Dynamic Level Border & Halo Frame System ─────────────────────────────────
export interface AvatarFrameStyle {
  border: string;
  boxShadow: string;
  badgeLabel: string;
  badgeBg: string;
  badgeColor: string;
  borderColor: string;
  glowColor: string;
  level: number;
}

export const getAvatarLevelFrameStyle = (level: number = 1): AvatarFrameStyle => {
  const safeLevel = Math.max(1, Math.min(3, Number(level) || 1));
  if (safeLevel === 3) {
    return {
      border: '3.5px solid #f59e0b',
      boxShadow: '0 0 18px rgba(245, 158, 11, 0.48), inset 0 0 6px rgba(251, 191, 36, 0.25)',
      badgeLabel: 'Stufe 3 • Gold',
      badgeBg: '#fef3c7',
      badgeColor: '#92400e',
      borderColor: '#f59e0b',
      glowColor: 'rgba(245, 158, 11, 0.48)',
      level: 3
    };
  }
  if (safeLevel === 2) {
    return {
      border: '3px solid #34a853',
      boxShadow: '0 0 14px rgba(52, 168, 83, 0.38)',
      badgeLabel: 'Stufe 2 • Smaragd',
      badgeBg: '#dcfce7',
      badgeColor: '#166534',
      borderColor: '#34a853',
      glowColor: 'rgba(52, 168, 83, 0.38)',
      level: 2
    };
  }
  return {
    border: '2.5px solid #cbd5e1',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
    badgeLabel: 'Stufe 1 • Silber',
    badgeBg: '#f1f5f9',
    badgeColor: '#475569',
    borderColor: '#cbd5e1',
    glowColor: 'rgba(0, 0, 0, 0.04)',
    level: 1
  };
};

export interface StudioAvatarProps {
  src?: string | null;
  style?: React.CSSProperties;
  className?: string;
  user?: any;
  userId?: string;
  onClick?: () => void;
  activePlatform?: string;
  level?: number;
  showLevelRing?: boolean;
}

export const StudioAvatar = React.memo(({ src, style, className, user, userId, onClick, activePlatform, level, showLevelRing }: StudioAvatarProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [resolvedInstrument, setResolvedInstrument] = useState<string | null>(() => user ? getEffectiveInstrument(user) : null);
  
  const activePlat = activePlatform || (typeof window !== 'undefined' ? localStorage.getItem('groovelab_active_platform') : 'groovelab');
  
  useEffect(() => {
    let isCancelled = false;

    const runResolve = async () => {
      if (!user) {
        if (userId) {
          try {
            const { data: uData } = await supabase
              .from('users')
              .select('id, role, roles, instrument, subject, teacher_id, photo_url, avatar_url')
              .eq('id', userId)
              .maybeSingle();
            if (!isCancelled && uData) {
              const inst = await resolveStudentInstrumentAsync(uData);
              if (!isCancelled) setResolvedInstrument(inst);
            }
          } catch (e) {}
        }
        return;
      }

      if (user.role === 'student' && isGenericInstrument(user.instrument) && !user.resolved_instrument) {
        const inst = await resolveStudentInstrumentAsync(user);
        if (!isCancelled) {
          setResolvedInstrument(inst);
        }
      } else {
        if (!isCancelled) {
          setResolvedInstrument(getEffectiveInstrument(user));
        }
      }
    };

    runResolve();
    return () => { isCancelled = true; };
  }, [user, userId]);

  let displaySrc = src;
  const targetUser = user;
  const role = (targetUser?.role || '').toLowerCase();
  const roles = Array.isArray(targetUser?.roles) ? targetUser.roles.map((x: any) => String(x).toLowerCase()) : [];
  const hasTeacherRole = role === 'teacher' || roles.includes('teacher');
  const activeWorkspace = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_active_workspace') || localStorage.getItem('groovelab_active_workspace')) : null;
  const isExplicitTeacher = targetUser?.isTeacherContext === true || targetUser?.isTeacher === true || hasTeacherRole || (activeWorkspace === 'teacher' && (role === 'teacher' || roles.includes('teacher')));
  const isVerwaltungContext = (role === 'admin' || role === 'secretary') && !isExplicitTeacher;

  if (isVerwaltungContext) {
    // Pure Admin & Secretariat users in admin context MUST display the briefing chalkboard image across all modules
    displaySrc = '/campus_login_hero.png';
  } else if (isExplicitTeacher && activePlat === 'campus') {
    // Teachers in Campus module must ALWAYS display their Instrumenten-Avatar!
    displaySrc = resolveCampusStudentAvatar(targetUser ? { ...targetUser, role: 'teacher', isTeacherContext: true, resolved_instrument: resolvedInstrument || targetUser.resolved_instrument } : { instrument: resolvedInstrument, role: 'teacher', isTeacherContext: true });
  } else if (activePlat === 'groovelab') {
    if (isExplicitTeacher) {
      displaySrc = resolveGrooveLabTeacherAvatar(targetUser, src);
    } else {
      const effectiveSrc = (src === '/campus_login_hero.png') ? null : src;
      const userPhoto = (targetUser?.photo_url === '/campus_login_hero.png') ? null : targetUser?.photo_url;
      const userAvatar = (targetUser?.avatar_url === '/campus_login_hero.png') ? null : targetUser?.avatar_url;
      
      const candidate = effectiveSrc || userPhoto || userAvatar;
      const isCustomMusician = candidate && !candidate.includes('campus_login_hero');
      if (isCustomMusician) {
        displaySrc = candidate;
      } else {
        displaySrc = getDefaultMusicianAvatarUrl(resolvedInstrument || getEffectiveInstrument(targetUser), role);
      }
    }
  } else if (activePlat === 'campus') {
    displaySrc = resolveCampusStudentAvatar(targetUser ? { ...targetUser, resolved_instrument: resolvedInstrument || targetUser.resolved_instrument } : { instrument: resolvedInstrument });
  }

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

  const effectiveUserLevel = level || targetUser?.evolution_level || (Array.isArray(targetUser?.avatars) ? targetUser.avatars[0]?.evolution_level : targetUser?.avatars?.evolution_level) || targetUser?.avatar?.evolution_level;
  const shouldApplyRing = showLevelRing || (!!level && role === 'student');
  const levelFrame = shouldApplyRing ? getAvatarLevelFrameStyle(effectiveUserLevel) : null;

  return (
    <div 
      onClick={hasAction ? handleClick : undefined}
      style={{ 
        width: '100%', 
        height: '100%', 
        background: '#f1f5f9', 
        position: 'relative', 
        overflow: 'hidden', 
        cursor: hasAction ? 'pointer' : 'default', 
        border: levelFrame ? levelFrame.border : (style?.border || 'none'),
        boxShadow: levelFrame ? (style?.boxShadow ? `${style.boxShadow}, ${levelFrame.boxShadow}` : levelFrame.boxShadow) : (style?.boxShadow || 'none'),
        ...style 
      }} 
      className={`studio-avatar-wrapper ${hasAction ? 'hover-scale-mini' : ''} ${className || ''}`}
    >
      <img 
        src={displaySrc || '/avatar_ghost.jpg'} 
        onLoad={() => setIsLoaded(true)}
        loading="lazy"
        decoding="async"
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'cover', 
          objectPosition: isPortraitAvatar ? 'center 15%' : 'center',
          opacity: 1,
          transition: 'opacity 0.3s ease-in-out',
          willChange: 'opacity',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden'
        }} 
        onError={(e) => {
          const img = e.target as HTMLImageElement;
          img.src = (activePlat === 'campus' && (role === 'student' || role === 'teacher')) ? '/avatars/gitarre_avatar_new.png' : '/avatar_ghost.jpg';
        }}
      />
    </div>
  );
}, (prev, next) => (
  prev.src === next.src && 
  prev.user?.id === next.user?.id && 
  prev.userId === next.userId && 
  prev.user?.instrument === next.user?.instrument && 
  prev.user?.resolved_instrument === next.user?.resolved_instrument && 
  prev.user?.teacher_id === next.user?.teacher_id && 
  prev.activePlatform === next.activePlatform &&
  prev.level === next.level &&
  prev.showLevelRing === next.showLevelRing
));

export const renderBandAvatar = (name: string, photoUrl?: string | null, size: string = '64px', borderRadius: string = '18px') => {
  if (photoUrl) {
    return (
      <div style={{ width: size, height: size, borderRadius, overflow: 'hidden', flexShrink: 0 }}>
        <img src={photoUrl} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={name} />
      </div>
    );
  }
  
  // Hash the name to pick a beautiful premium gradient
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
  const index = Math.abs(hash) % gradients.length;
  
  return (
    <div 
      style={{ 
        width: size, 
        height: size, 
        borderRadius, 
        background: gradients[index], 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: '#ffffff', 
        fontSize: `calc(${size} * 0.35)`, 
        fontWeight: 900, 
        fontFamily: 'Outfit',
        textTransform: 'uppercase',
        flexShrink: 0,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}
    >
      {str.substring(0, 2)}
    </div>
  );
};

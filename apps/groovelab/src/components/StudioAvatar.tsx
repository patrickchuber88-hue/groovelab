import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// --- ANTI-FLICKER AVATAR SYSTEM ---
export const getInstrumentAvatarUrl = (instrument: string | null | undefined): string => {
  if (!instrument) return '/avatars/neutral_instrument_avatar.png';
  const inst = instrument.toLowerCase().trim();
  if (inst.includes('e-gitarre')) return '/avatars/egitarre_avatar.png';
  if (inst.includes('ukulele')) return '/avatars/gitarre_avatar_new.png';
  if (inst.includes('guitar') || inst.includes('gitarre')) return '/avatars/gitarre_avatar_new.png';
  if (inst.includes('e-bass')) return '/avatars/ebass_avatar.png';
  if (inst.includes('kontrabass') || inst.includes('double bass')) return '/avatars/kontrabass_avatar.png';
  if (inst.includes('bass')) return '/avatars/bass_avatar.png';
  if (inst.includes('drum') || inst.includes('schlagzeug') || inst.includes('percussion') || inst.includes('cajon') || inst.includes('marimba') || inst.includes('xylophon')) return '/avatars/schlagzeug_avatar.png';
  if (inst.includes('piano') || inst.includes('keys') || inst.includes('klavier') || inst.includes('keyboard') || inst.includes('flügel') || inst.includes('akkordeon') || inst.includes('accordion') || inst.includes('synthesizer') || inst.includes('synth')) return '/avatars/klavier_avatar_new.png';
  if (inst.includes('vocal') || inst.includes('gesang') || inst.includes('stimme') || inst.includes('singer') || inst.includes('chor')) return '/avatars/gesang_avatar.png';
  if (inst.includes('trompete') || inst.includes('trumpet') || inst.includes('tuba') || inst.includes('flügelhorn') || inst.includes('kornett')) return '/avatars/trompete_avatar_new.png';
  if (inst.includes('posaune') || inst.includes('trombone')) return '/avatars/posaune_avatar.png';
  if (inst.includes('waldhorn') || inst.includes('horn')) return '/avatars/horn_avatar_new.png';
  if (inst.includes('cello') || inst.includes('violoncello')) return '/avatars/cello_avatar_new.png';
  if (inst.includes('geige') || inst.includes('violin') || inst.includes('violine') || inst.includes('bratsche') || inst.includes('viola') || inst.includes('harfe') || inst.includes('harp')) return '/avatars/violine_avatar_new.png';
  if (inst.includes('klarinette') || inst.includes('clarinet') || inst.includes('fagott') || inst.includes('bassoon')) return '/avatars/klarinette_avatar_new.png';
  if (inst.includes('querflöte') || inst.includes('flute')) return '/avatars/querfloete_avatar.png';
  if (inst.includes('saxofon') || inst.includes('saxophone') || inst.includes('sax')) return '/avatars/saxophon_avatar_new.png';
  if (inst.includes('blockflöte') || inst.includes('recorder') || inst.includes('blockfloete')) return '/avatars/blockfloete_avatar.png';
  if (inst.includes('bariton') || inst.includes('baritone') || inst.includes('euphonium')) return '/avatars/bariton_avatar.png';
  if (inst.includes('oboe')) return '/avatars/oboe_avatar.png';
  return '/avatars/neutral_instrument_avatar.png';
};

export const getDefaultMusicianAvatarUrl = (instrument: string | null | undefined, role: string | null | undefined): string => {
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

export const isGenericInstrument = (inst: string | null | undefined): boolean => {
  if (!inst) return true;
  const clean = String(inst).trim().toLowerCase();
  return !clean || clean === 'allgemein' || clean === 'musiker' || clean === 'schüler' || clean === 'schueler' || clean === 'instrument' || clean === 'ohne zuweisung' || clean === 'ohne';
};

export const getEffectiveInstrument = (user: any): string => {
  if (!user) return 'Gitarre';
  if (user.resolved_instrument && !isGenericInstrument(user.resolved_instrument)) {
    return String(user.resolved_instrument).split(',')[0].trim();
  }
  if (user.instrument && !isGenericInstrument(user.instrument)) {
    return String(user.instrument).split(',')[0].trim();
  }
  if (user.subject && !isGenericInstrument(user.subject)) {
    return String(user.subject).split(',')[0].trim();
  }
  if (user.teacher?.instrument && !isGenericInstrument(user.teacher.instrument)) {
    return String(user.teacher.instrument).split(',')[0].trim();
  }
  if (user.teacher?.subject && !isGenericInstrument(user.teacher.subject)) {
    return String(user.teacher.subject).split(',')[0].trim();
  }
  return 'Gitarre';
};

export const resolveStudentInstrumentAsync = async (user: any): Promise<string> => {
  if (!user) return 'Gitarre';
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

  return 'Gitarre';
};

export const StudioAvatar = React.memo(({ src, style, className, user, userId, onClick, activePlatform }: { src: string | null | undefined, style?: React.CSSProperties, className?: string, user?: any, userId?: string, onClick?: () => void, activePlatform?: string }) => {
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
  const isTeacher = role === 'teacher' || (Array.isArray(targetUser?.roles) && targetUser.roles.includes('teacher'));

  if ((role === 'admin' || role === 'secretary') && !isTeacher) {
    // Pure Admin & Secretariat users MUST display the briefing chalkboard image across all modules
    displaySrc = '/campus_login_hero.png';
  } else if (isTeacher && activePlat === 'campus') {
    // Teachers in Campus module must ALWAYS display their Instrumenten-Avatar!
    displaySrc = getInstrumentAvatarUrl(resolvedInstrument || getEffectiveInstrument(targetUser));
  } else if (activePlat === 'groovelab') {
    const effectiveSrc = (src === '/campus_login_hero.png') ? null : src;
    const userPhoto = (targetUser?.photo_url === '/campus_login_hero.png') ? null : targetUser?.photo_url;
    const userAvatar = (targetUser?.avatar_url === '/campus_login_hero.png') ? null : targetUser?.avatar_url;
    
    const candidate = effectiveSrc || userPhoto || userAvatar;
    if (candidate) {
      displaySrc = candidate;
    } else {
      if (isTeacher) {
        displaySrc = '/avatar_ghost.jpg';
      } else {
        displaySrc = getDefaultMusicianAvatarUrl(resolvedInstrument || getEffectiveInstrument(targetUser), role);
      }
    }
  } else if (activePlat === 'campus') {
    displaySrc = getInstrumentAvatarUrl(resolvedInstrument || getEffectiveInstrument(targetUser));
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
        ...style 
      }} 
      className={`studio-avatar-wrapper ${hasAction ? 'hover-scale-mini' : ''} ${className || ''}`}
    >
      <img 
        src={displaySrc || '/avatar_ghost.jpg'} 
        onLoad={() => setIsLoaded(true)}
        loading="lazy"
        decoding="async"
        crossOrigin="anonymous"
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
        alt=""
        onError={(e) => { (e.target as HTMLImageElement).src = '/avatar_ghost.jpg'; }}
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
  prev.activePlatform === next.activePlatform
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

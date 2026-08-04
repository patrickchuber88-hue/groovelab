import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// --- ANTI-FLICKER AVATAR SYSTEM ---
export const getInstrumentAvatarUrl = (instrument: string | null | undefined): string => {
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

export const StudioAvatar = React.memo(({ src, style, className, user, userId, onClick, activePlatform }: { src: string | null | undefined, style?: React.CSSProperties, className?: string, user?: any, userId?: string, onClick?: () => void, activePlatform?: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [resolvedInstrument, setResolvedInstrument] = useState<string | null>(user?.instrument || null);
  
  const activePlat = activePlatform || (typeof window !== 'undefined' ? localStorage.getItem('groovelab_active_platform') : 'groovelab');
  
  useEffect(() => {
    if (user && user.role === 'student' && (!user.instrument || user.instrument === 'Allgemein' || user.instrument === 'ohne Zuweisung') && user.teacher_id) {
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

  let displaySrc = src;
  const targetUser = user;
  const role = (targetUser?.role || '').toLowerCase();
  const isTeacher = role === 'teacher' || (Array.isArray(targetUser?.roles) && targetUser.roles.includes('teacher'));

  if (isTeacher && activePlat === 'campus') {
    // Teachers in Campus module must ALWAYS display their Instrumenten-Avatar!
    displaySrc = getInstrumentAvatarUrl(resolvedInstrument || targetUser?.instrument);
  } else if ((role === 'admin' || role === 'secretary') && !isTeacher) {
    // Pure Admin & Secretariat users display the briefing chalkboard image
    displaySrc = '/campus_login_hero.png';
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
        displaySrc = getDefaultMusicianAvatarUrl(resolvedInstrument || targetUser?.instrument, role);
      }
    }
  } else if (activePlat === 'campus') {
    displaySrc = getInstrumentAvatarUrl(resolvedInstrument || targetUser?.instrument);
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
}, (prev, next) => prev.src === next.src && prev.user?.id === next.user?.id && prev.userId === next.userId && prev.user?.instrument === next.user?.instrument && prev.activePlatform === next.activePlatform);

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

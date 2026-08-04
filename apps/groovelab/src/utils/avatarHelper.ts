// Centralized Single Source of Truth for Instrument Avatars & Icons
// Enforces DRY principle across Login, StudentAvatarDashboard, StudioAvatar, and TeacherDashboard

export const getInstrumentAvatarUrl = (instr: string): string => {
  const low = (instr || '').toLowerCase();
  if (low.includes('gitarre') || low.includes('guitar')) return '/gitarre_avatar_new.png';
  if (low.includes('bass') || low.includes('kontrabass') || low.includes('contrabass')) return '/bass_avatar.png';
  if (low.includes('schlagzeug') || low.includes('drums')) return '/schlagzeug_avatar.png';
  if (low.includes('klavier') || low.includes('piano')) return '/klavier_avatar_new.png';
  if (low.includes('gesang') || low.includes('vocals') || low.includes('vocal')) return '/gesang_avatar.png';
  if (low.includes('trompete') || low.includes('trumpet')) return '/trompete_avatar_new.png';
  if (low.includes('posaune') || low.includes('trombone')) return '/posaune_avatar.png';
  return '/avatar_ghost.jpg';
};

export const getDefaultMusicianAvatarUrl = (role: string, instrument?: string | null): string => {
  if (role === 'admin' || role === 'secretary') {
    return '/campus_login_hero.png';
  }
  return getInstrumentAvatarUrl(instrument || '');
};

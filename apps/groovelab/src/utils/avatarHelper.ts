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

export const formatStudentDisplayName = (firstName?: string | null, lastName?: string | null, fallbackId?: string | null): string => {
  const first = String(firstName || '').replace(/^Unterricht:\s*/i, '').trim();
  if (!first || first.toLowerCase() === 'schüler' || first.toLowerCase() === 'student' || first.toLowerCase() === 'pause' || first.toLowerCase() === 'vacant') {
    return 'Schüler';
  }
  const parts = first.split(' ');
  const fName = parts[0];
  const lName = parts.slice(1).join(' ') || (lastName || '').trim();
  let initial = '';
  if (lName && lName.trim()) {
    initial = `${lName.trim()[0].toUpperCase()}.`;
  } else if (fallbackId) {
    const cleanId = String(fallbackId).replace(/[^a-zA-Z]/g, '');
    if (cleanId.length > 0) {
      initial = `${cleanId[0].toUpperCase()}.`;
    }
  }
  if (!initial) {
    const charCode = fName.charCodeAt(0) || 65;
    const initialChar = String.fromCharCode(65 + ((charCode * 7) % 26));
    initial = `${initialChar}.`;
  }
  return `${fName} ${initial}`;
};

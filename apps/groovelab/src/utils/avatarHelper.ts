import { getInstrumentAvatarUrl, getDefaultMusicianAvatarUrl } from '../components/StudioAvatar';
export { getInstrumentAvatarUrl, getDefaultMusicianAvatarUrl };

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

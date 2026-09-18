/**
 * Utility functions for secretary dashboard schedule and room formatting.
 */

export function checkTimeOverlap(t1Start: string, t1End: string, t2Start: string, t2End: string): boolean {
  if (!t1Start || !t1End || !t2Start || !t2End) return false;
  return t1Start < t2End && t2Start < t1End;
}

export function formatInstrumentName(name: string): string {
  if (!name) return '';
  const mapping: Record<string, string> = {
    akustisches_klavier: 'Akustisches Klavier',
    ensemble_geeignet: 'Ensembles/Bands',
    ensembles_geeignet: 'Ensembles/Bands',
    e_piano: 'E-Piano',
    e_gitarre: 'E-Gitarre',
    akustische_gitarre: 'Akustische Gitarre',
    schlagzeug: 'Schlagzeug',
    piano: 'Piano',
    gitarre: 'Gitarre',
    gesang: 'Gesang',
    geige: 'Geige',
    querfloete: 'Querflöte',
    blockfloete: 'Blockflöte',
    saxophon: 'Saxophon',
    bass: 'Bass',
    keyboard: 'Keyboard',
    trompete: 'Trompete',
    blaeser: 'Bläser',
    tasteninstrumente: 'Tasteninstrumente',
    saiteninstrumente: 'Saiteninstrumente',
    blasinstrumente: 'Blasinstrumente',
    percussion: 'Percussion'
  };

  const key = name.toLowerCase().trim();
  if (mapping[key]) return mapping[key];

  return name
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

import { getAlphabeticalHue, getAlphabeticalUniColor } from '../../../utils/adminColorHelpers';
export { getAlphabeticalUniColor };

export const parseRoomName = (name: string): { prefix: string; number: number | null } => {
  const trimmed = (name || '').trim();
  const match = trimmed.match(/^(.*?)\s*(\d+)$/);
  if (match) {
    return {
      prefix: match[1].trim(),
      number: parseInt(match[2], 10)
    };
  }
  return {
    prefix: trimmed,
    number: null
  };
};

export const getAlphabeticalColor = (name: string): { avatarBg: string; avatarColor: string } => {
  const trimmed = (name || '').trim();
  if (trimmed.toLowerCase() === 'ohne zuweisung') {
    return {
      avatarBg: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
      avatarColor: '#475569'
    };
  }
  const hue = getAlphabeticalHue(trimmed);
  const avatarBg = `linear-gradient(135deg, hsl(${hue}, 85%, 94%) 0%, hsl(${hue}, 80%, 84%) 100%)`;
  const avatarColor = `hsl(${hue}, 90%, 25%)`;
  return { avatarBg, avatarColor };
};

export const getFloorColor = (name: string): { avatarBg: string; avatarColor: string } => {
  const trimmed = (name || '').trim();
  const normalized = trimmed.toLowerCase();
  
  // Check if it has a number or is EG/UG
  const hasNumber = /\d+/.test(normalized);
  const isEg = normalized.includes('eg') || normalized.includes('erdgeschoss');
  const isUg = normalized.includes('ug') || normalized.includes('untergeschoss') || normalized.includes('keller') || normalized.includes('-');
  
  if (hasNumber || isEg || isUg) {
    // Parse floor number N
    let N = 0;
    if (isEg) {
      N = 0;
    } else {
      const isNegative = isUg;
      const match = normalized.match(/\d+/);
      if (match) {
        const val = parseInt(match[0]);
        N = isNegative ? -val : val;
      } else {
        N = isNegative ? -1 : 0;
      }
    }
    
    // Clamp N to [-3, 8]
    const clampedN = Math.max(-3, Math.min(8, N));
    // Map [-3, 8] to index [0, 11]
    const mappedIndex = clampedN + 3;
    // Map [0, 11] to [65, 90] (A-Z)
    const clampedCode = 65 + Math.round((mappedIndex / 11) * 25);
    const hue = Math.round(((clampedCode - 65) / 25) * 360);
    const avatarBg = `linear-gradient(135deg, hsl(${hue}, 85%, 94%) 0%, hsl(${hue}, 80%, 84%) 100%)`;
    const avatarColor = `hsl(${hue}, 90%, 25%)`;
    return { avatarBg, avatarColor };
  }
  
  return getAlphabeticalColor(name);
};


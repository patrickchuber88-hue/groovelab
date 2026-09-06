// =========================================================================
// 🌟 CAMPUS-GROOVELAB: KINDGERECHTE STREAK & SCHUTZSCHILD INTERFACES
// =========================================================================
export type WeeklyDayState = 'mastered' | 'shielded' | 'pause' | 'today_standby' | 'future';

export interface WeeklyStreakDay {
  dayName: string;
  dayFullName: string;
  dayNumber: number;
  dateStr: string;
  isToday: boolean;
  isFuture: boolean;
  totalDaySecs: number;
  totalMins: number;
  hasMastered: boolean;
  isJoker: boolean;
  shieldNumber: number;
  dayState: WeeklyDayState;
}

export interface WeeklyStreakMetrics {
  monday: Date;
  now: Date;
  weekDays: WeeklyStreakDay[];
  weekPracticedCount: number;
  weekShieldedCount: number;
  weekTotalSeconds: number;
  weekTotalMins: number;
  consumedShieldsCount: number;
  availableShields: number;
  calculatedStreak: number;
  newlyShieldedDates: string[];
}

export interface Avatar {
  avatar_style: string;
  instrument_type: string;
  evolution_level: number;
  xp: number;
  asset_path: string;
  streak_flame?: number;
  current_streak?: number;
}

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

export const maskEmail = (email: string | null | undefined): string => {
  if (!email) return 'Nicht hinterlegt';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [prefix, domain] = parts;
  if (prefix.length <= 2) {
    return `${prefix.charAt(0)}...@${domain}`;
  }
  return `${prefix.substring(0, 2)}...${prefix.charAt(prefix.length - 1)}@${domain}`;
};

export const STUDENT_AVATARS = [
  // E-Gitarre (15)
  { id: 'student_boy_guitar_1', label: 'E-Gitarre (Boy Black)', url: '/avatars/student_boy_black_guitar.png', category: 'E-Gitarre' },
  { id: 'student_girl_guitar_1', label: 'E-Gitarre (Girl Blonde)', url: '/avatars/student_girl_blonde_guitar.png', category: 'E-Gitarre' },
  { id: 'student_boy_blonde_guitar', label: 'E-Gitarre (Boy Blonde)', url: '/avatars/student_boy_blonde_guitar.png', category: 'E-Gitarre' },
  { id: 'student_girl_black_guitar', label: 'E-Gitarre (Girl Black)', url: '/avatars/student_girl_black_guitar.png', category: 'E-Gitarre' },
  { id: 'student_eguitar_alt', label: 'E-Gitarre (Hero)', url: '/avatars/student_eguitar_1.png', category: 'E-Gitarre' },
  { id: 'bandstyle_boy_eguitar', label: 'Band E-Gitarre (Boy)', url: '/avatars/bandstyle_boy_eguitar.png', category: 'E-Gitarre' },
  { id: 'bandstyle_girl_eguitar', label: 'Band E-Gitarre (Girl)', url: '/avatars/bandstyle_girl_eguitar.png', category: 'E-Gitarre' },
  { id: 'teen_boy_eguitar_realistic', label: 'E-Gitarre (Realistic Boy)', url: '/avatars/teen_boy_eguitar_realistic.png', category: 'E-Gitarre' },
  { id: 'teen_girl_eguitar_focused', label: 'E-Gitarre (Focused Girl)', url: '/avatars/teen_girl_eguitar_focused.png', category: 'E-Gitarre' },
  { id: 'teen_boy_eguitar_17', label: 'E-Gitarre (Hero Boy)', url: '/avatars/teen_boy_eguitar_17.png', category: 'E-Gitarre' },
  { id: 'teen_boy_acoustic_guitar', label: 'Akustik-Gitarre (Boy)', url: '/avatars/teen_boy_acoustic_guitar.png', category: 'E-Gitarre' },
  { id: 'teen_girl_acoustic_guitar', label: 'Akustik-Gitarre (Girl)', url: '/avatars/teen_girl_acoustic_guitar.png', category: 'E-Gitarre' },
  { id: 'student_eguitar_new_1', label: 'E-Gitarre (Neu 1)', url: '/avatars/student_eguitar_new_1.png', category: 'E-Gitarre' },
  { id: 'student_eguitar_new_2', label: 'E-Gitarre (Neu 2)', url: '/avatars/student_eguitar_new_2.png', category: 'E-Gitarre' },
  { id: 'student_eguitar_new_3', label: 'E-Gitarre (Neu 3)', url: '/avatars/student_eguitar_new_3.png', category: 'E-Gitarre' },

  // E-Piano / Keyboard (15)
  { id: 'student_boy_piano_1', label: 'E-Piano (Boy)', url: '/avatars/student_boy_black_piano.png', category: 'E-Piano' },
  { id: 'student_girl_piano_1', label: 'E-Piano (Girl)', url: '/avatars/student_girl_black_piano.png', category: 'E-Piano' },
  { id: 'student_piano_alt', label: 'E-Piano (Hero)', url: '/avatars/student_piano_1.png', category: 'E-Piano' },
  { id: 'student_boy_piano_2', label: 'E-Piano (Boy 2)', url: '/avatars/student_boy_piano_2.png', category: 'E-Piano' },
  { id: 'student_girl_piano_2', label: 'E-Piano (Girl 2)', url: '/avatars/student_girl_piano_2.png', category: 'E-Piano' },
  { id: 'student_girl_lightbrown_piano', label: 'E-Piano (Girl Lightbrown)', url: '/avatars/student_girl_lightbrown_piano.png', category: 'E-Piano' },
  { id: 'student_boy_lightbrown_piano', label: 'E-Piano (Boy Lightbrown)', url: '/avatars/student_boy_lightbrown_piano.png', category: 'E-Piano' },
  { id: 'student_boy_keyboard_1', label: 'Keyboard (Boy)', url: '/avatars/student_boy_keyboard_1.png', category: 'E-Piano' },
  { id: 'student_boy_producer_1', label: 'Keyboard-Producer (Boy)', url: '/avatars/student_boy_producer_1.png', category: 'E-Piano' },
  { id: 'student_tech_1', label: 'Keyboard-Tech (Hero)', url: '/avatars/student_tech_1.png', category: 'E-Piano' },
  { id: 'bandstyle_boy_epiano', label: 'Band E-Piano (Boy)', url: '/avatars/bandstyle_boy_epiano.png', category: 'E-Piano' },
  { id: 'bandstyle_girl_epiano', label: 'Band E-Piano (Girl)', url: '/avatars/bandstyle_girl_epiano.png', category: 'E-Piano' },
  { id: 'avatar_boy_piano', label: 'Klassen-Piano (Boy)', url: '/avatar_boy_piano.jpg', category: 'E-Piano' },
  { id: 'avatar_girl_piano', label: 'Klassen-Piano (Girl)', url: '/avatar_girl_piano.jpg', category: 'E-Piano' },
  { id: 'student_epiano_new_1', label: 'E-Piano (Neu 1)', url: '/avatars/student_epiano_new_1.png', category: 'E-Piano' },

  // E-Drums (15)
  { id: 'student_boy_drums_1', label: 'E-Drum (Boy Black)', url: '/avatars/student_boy_black_drums.png', category: 'E-Drum' },
  { id: 'student_girl_drums_1', label: 'E-Drum (Girl Blonde)', url: '/avatars/student_girl_blonde_drums.png', category: 'E-Drum' },
  { id: 'student_boy_blonde_drums', label: 'E-Drum (Boy Blonde)', url: '/avatars/student_boy_blonde_drums.png', category: 'E-Drum' },
  { id: 'student_girl_black_drums', label: 'E-Drum (Girl Black)', url: '/avatars/student_girl_black_drums.png', category: 'E-Drum' },
  { id: 'student_drums_alt', label: 'E-Drum (Hero)', url: '/avatars/student_drums_1.png', category: 'E-Drum' },
  { id: 'student_boy_drums_2', label: 'E-Drum (Boy 2)', url: '/avatars/student_boy_drums_2.png', category: 'E-Drum' },
  { id: 'student_girl_drums_2', label: 'E-Drum (Girl 2)', url: '/avatars/student_girl_drums_2.png', category: 'E-Drum' },
  { id: 'student_boy_drums_3', label: 'E-Drum (Boy 3)', url: '/avatars/student_boy_drums_3.png', category: 'E-Drum' },
  { id: 'student_girl_drums_3', label: 'E-Drum (Girl 3)', url: '/avatars/student_girl_drums_3.png', category: 'E-Drum' },
  { id: 'bandstyle_boy_edrums', label: 'Band E-Drum (Boy)', url: '/avatars/bandstyle_boy_edrums.png', category: 'E-Drum' },
  { id: 'bandstyle_girl_edrums', label: 'Band E-Drum (Girl)', url: '/avatars/bandstyle_girl_edrums.png', category: 'E-Drum' },
  { id: 'avatar_boy_drums', label: 'Klassen-Drums (Boy)', url: '/avatar_boy_drums.jpg', category: 'E-Drum' },
  { id: 'avatar_girl_drums', label: 'Klassen-Drums (Girl)', url: '/avatar_girl_drums.jpg', category: 'E-Drum' },
  { id: 'student_edrums_new_1', label: 'E-Drum (Neu 1)', url: '/avatars/student_edrums_new_1.png', category: 'E-Drum' },
  { id: 'student_edrums_new_2', label: 'E-Drum (Neu 2)', url: '/avatars/student_edrums_new_2.png', category: 'E-Drum' },

  // E-Bass (15)
  { id: 'student_girl_bass_1', label: 'E-Bass (Girl Black)', url: '/avatars/student_girl_black_bass.png', category: 'E-Bass' },
  { id: 'student_bass_alt', label: 'E-Bass (Hero)', url: '/avatars/student_bass_1.png', category: 'E-Bass' },
  { id: 'student_girl_ebass_1', label: 'E-Bass (Girl 1)', url: '/avatars/student_girl_ebass_1.png', category: 'E-Bass' },
  { id: 'bandstyle_boy_ebass', label: 'Band E-Bass (Boy)', url: '/avatars/bandstyle_boy_ebass.png', category: 'E-Bass' },
  { id: 'bandstyle_girl_ebass', label: 'Band E-Bass (Girl)', url: '/avatars/bandstyle_girl_ebass.png', category: 'E-Bass' },
  { id: 'avatar_boy_bass', label: 'Klassen-Bass (Boy)', url: '/avatar_boy_bass.jpg', category: 'E-Bass' },
  { id: 'avatar_girl_bass', label: 'Klassen-Bass (Girl)', url: '/avatar_girl_bass.jpg', category: 'E-Bass' },
  { id: 'student_ebass_new_1', label: 'E-Bass (Neu 1)', url: '/avatars/student_ebass_new_1.png', category: 'E-Bass' },
  { id: 'student_ebass_new_2', label: 'E-Bass (Neu 2)', url: '/avatars/student_ebass_new_2.png', category: 'E-Bass' },
  { id: 'student_ebass_new_3', label: 'E-Bass (Neu 3)', url: '/avatars/student_ebass_new_3.png', category: 'E-Bass' },
  { id: 'student_ebass_new_4', label: 'E-Bass (Neu 4)', url: '/avatars/student_ebass_new_4.png', category: 'E-Bass' },
  { id: 'student_ebass_new_5', label: 'E-Bass (Neu 5)', url: '/avatars/student_ebass_new_5.png', category: 'E-Bass' },
  { id: 'student_ebass_new_6', label: 'E-Bass (Neu 6)', url: '/avatars/student_ebass_new_6.png', category: 'E-Bass' },
  { id: 'student_ebass_new_7', label: 'E-Bass (Neu 7)', url: '/avatars/student_ebass_new_7.png', category: 'E-Bass' },
  { id: 'student_ebass_new_8', label: 'E-Bass (Neu 8)', url: '/avatars/student_ebass_new_8.png', category: 'E-Bass' },

  // Gesang (15)
  { id: 'student_boy_vocals_1', label: 'Gesang (Boy Red)', url: '/avatars/student_boy_red_vocals.png', category: 'Gesang' },
  { id: 'student_girl_vocals_1', label: 'Gesang (Girl Red)', url: '/avatars/student_girl_red_vocals.png', category: 'Gesang' },
  { id: 'student_boy_vocals_new', label: 'Gesang (Boy 1)', url: '/avatars/student_boy_vocals_1.png', category: 'Gesang' },
  { id: 'student_girl_vocals_new', label: 'Gesang (Girl 1)', url: '/avatars/student_girl_vocals_1.png', category: 'Gesang' },
  { id: 'student_vocals_alt', label: 'Gesang (Hero)', url: '/avatars/student_vocals_1.png', category: 'Gesang' },
  { id: 'student_vocals_new_2', label: 'Gesang (Neu 2)', url: '/avatars/student_vocals_new_2.png', category: 'Gesang' },
  { id: 'student_vocals_new_3', label: 'Gesang (Neu 3)', url: '/avatars/student_vocals_new_3.png', category: 'Gesang' },
  { id: 'student_vocals_new_4', label: 'Gesang (Neu 4)', url: '/avatars/student_vocals_new_4.png', category: 'Gesang' },
  { id: 'student_vocals_new_5', label: 'Gesang (Neu 5)', url: '/avatars/student_vocals_new_5.png', category: 'Gesang' },
  { id: 'student_vocals_new_6', label: 'Gesang (Neu 6)', url: '/avatars/student_vocals_new_6.png', category: 'Gesang' },
  { id: 'student_vocals_new_7', label: 'Gesang (Neu 7)', url: '/avatars/student_vocals_new_7.png', category: 'Gesang' },
  { id: 'student_vocals_new_8', label: 'Gesang (Neu 8)', url: '/avatars/student_vocals_new_8.png', category: 'Gesang' },
  { id: 'student_vocals_new_9', label: 'Gesang (Neu 9)', url: '/avatars/student_vocals_new_9.png', category: 'Gesang' },
  { id: 'student_vocals_new_10', label: 'Gesang (Neu 10)', url: '/avatars/student_vocals_new_10.png', category: 'Gesang' },
  { id: 'student_vocals_new_11', label: 'Gesang (Neu 11)', url: '/avatars/student_vocals_new_11.png', category: 'Gesang' },

  // Allgemein / Sonstige
  { id: 'avatar_boy_general', label: 'Klassen-Schüler (Boy)', url: '/avatar_boy.jpg', category: 'Sonstige' },
  { id: 'avatar_girl_general', label: 'Klassen-Schülerin (Girl)', url: '/avatar_girl.jpg', category: 'Sonstige' }
];

export const LEVEL_NAMES: Record<string, Record<number, string>> = {
  guitarist: {
    1: 'Garagen-Gitarrist (Lvl 1)',
    2: 'Band-Mitglied (Lvl 2)',
    3: 'Rockstar (Lvl 3)'
  },
  drummer: {
    1: 'Takt-Anfänger (Lvl 1)',
    2: 'Studio-Drummer (Lvl 2)',
    3: 'Rhythmus-Gott (Lvl 3)'
  },
  keyboardist: {
    1: 'Melodien-Sucher (Lvl 1)',
    2: 'Synthie-Pionier (Lvl 2)',
    3: 'Tasten-Virtuose (Lvl 3)'
  },
  vocalist: {
    1: 'Dusch-Sänger (Lvl 1)',
    2: 'Bühnen-Neuling (Lvl 2)',
    3: 'Stimm-König/in (Lvl 3)'
  }
};

export interface LevelProgress {
  levelTitle: string;
  prevThreshold: number;
  nextThreshold: number;
  xpInCurrentLevel: number;
  totalXpInLevel: number;
  xpPercentage: number;
}

export const getLevelProgress = (level: number, xp: number, instrumentType: string): LevelProgress => {
  const currentLevel = level || 1;
  const currentXp = xp || 0;
  const levelTitle = LEVEL_NAMES[instrumentType]?.[currentLevel] || `Stufe ${currentLevel}`;

  let nextThreshold = 500;
  let prevThreshold = 0;
  if (currentLevel === 2) {
    prevThreshold = 500;
    nextThreshold = 2500;
  } else if (currentLevel === 3) {
    prevThreshold = 2500;
    nextThreshold = 99999;
  }

  const xpInCurrentLevel = Math.max(0, currentXp - prevThreshold);
  const totalXpInLevel = nextThreshold - prevThreshold;
  const xpPercentage = currentLevel === 3 ? 100 : Math.min(100, (xpInCurrentLevel / totalXpInLevel) * 100);

  return {
    levelTitle,
    prevThreshold,
    nextThreshold,
    xpInCurrentLevel,
    totalXpInLevel,
    xpPercentage
  };
};

export const HERO_CLASSES = [
  { id: 'guitarist', name: 'Gitarren-Held', icon: '🎸', desc: 'Melodien und Soli rocken' },
  { id: 'drummer', name: 'Beat-Master', icon: '🥁', desc: 'Den Groove und Takt angeben' },
  { id: 'keyboardist', name: 'Tasten-Magier', icon: '🎹', desc: 'Synthesizer und Klavier beherrschen' },
  { id: 'vocalist', name: 'Vocal-Star', icon: '🎤', desc: 'Die Bühne mit deiner Stimme erobern' }
];

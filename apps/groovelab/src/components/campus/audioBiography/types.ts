export type { ReverbRoomType, MasteringProfile } from '../../../utils/audioMasteringEngine';
import type { ReverbRoomType, MasteringProfile } from '../../../utils/audioMasteringEngine';

export interface AudioVersion {
  id: string;
  versionNumber: number;
  recordedAt: string;
  schoolYear?: string;
  audioUrl?: string;
  masteredAudioUrl?: string;
  duration?: number;
  stickerEmoji?: string;
  personalNote?: string;
}

export interface MilestoneData {
  id: string;
  type: 'first_tone' | 'first_scale' | 'first_song' | 'happy_birthday' | 'family_share' | 'first_christmas_song' | 'first_solo' | 'first_own_song' | 'hardest_piece' | 'favorite_song' | 'masterpiece';
  title: string;
  subtitle: string;
  stepNumber: number;
  iconName: 'sparkles' | 'sliders' | 'music' | 'gift' | 'bell' | 'zap' | 'lightbulb' | 'flame' | 'heart' | 'crown';
  audioUrl?: string;
  masteredAudioUrl?: string;
  duration?: number;
  recordedAt?: string;
  isVerified?: boolean;
  isUnerasable?: boolean;
  visibility: 'private' | 'teacher_allowed';
  version: number;
  personalNote?: string;
  schoolYear?: string;
  preferredVersion?: 'master' | 'raw';
  reverbRoomType?: ReverbRoomType;
  reverbWetMix?: number;
  history?: AudioVersion[];
}

export interface CustomPlaylistTrack {
  id: string;
  title: string;
  subtitle?: string;
  audioUrl: string;
  masteredAudioUrl?: string;
  duration?: number;
  recordedAt?: string;
  personalNote?: string;
  preferredVersion?: 'master' | 'raw';
  reverbRoomType?: ReverbRoomType;
  reverbWetMix?: number;
}

export interface CustomPlaylist {
  id: string;
  title: string;
  description?: string;
  vibeTheme: 'sunset_gold' | 'midnight_neon' | 'forest_emerald' | 'royal_ruby' | 'vintage_charcoal' | 'ocean_cyan' | 'vintage_tape' | 'ocean_breeze' | 'cyber_neon' | 'royal_velvet' | 'emerald_studio' | 'christmas_gold';
  iconName: string;
  coverPresetId?: string;
  schoolYear?: string;
  tracks: CustomPlaylistTrack[];
  createdAt: string;
}

export interface SchoolYearCoverConfig {
  vol: number;
  volLabel: string;
  themeTitle: string;
  subTitle: string;
  gradient: string;
  accentColor: string;
  badge: string;
  iconName: string;
}

export const SCHOOL_YEAR_COVERS: SchoolYearCoverConfig[] = [
  { vol: 1, volLabel: 'VOL. 01', themeTitle: 'FIRST NOTES', subTitle: '1. Lernjahr • Start & Erste Töne', gradient: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)', accentColor: '#10b981', badge: '1. LERNJAHR', iconName: 'sparkles' },
  { vol: 2, volLabel: 'VOL. 02', themeTitle: 'RISING RHYTHM', subTitle: '2. Lernjahr • Timing & Rhythmus', gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fbbf24 100%)', accentColor: '#f97316', badge: '2. LERNJAHR', iconName: 'sliders' },
  { vol: 3, volLabel: 'VOL. 03', themeTitle: 'MELODY FLOW', subTitle: '3. Lernjahr • Melodien & Phrasierung', gradient: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 50%, #38bdf8 100%)', accentColor: '#06b6d4', badge: '3. LERNJAHR', iconName: 'music' },
  { vol: 4, volLabel: 'VOL. 04', themeTitle: 'SOUND HORIZON', subTitle: '4. Lernjahr • Harmonik & Klangfarben', gradient: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #c084fc 100%)', accentColor: '#8b5cf6', badge: '4. LERNJAHR', iconName: 'zap' },
  { vol: 5, volLabel: 'VOL. 05', themeTitle: 'HALFTIME MASTER', subTitle: '5. Lernjahr • Halbzeit & Meilensteine', gradient: 'linear-gradient(135deg, #b45309 0%, #d97706 50%, #fde047 100%)', accentColor: '#f59e0b', badge: '5. LERNJAHR', iconName: 'trophy' },
  { vol: 6, volLabel: 'VOL. 06', themeTitle: 'GROOVE ENGINE', subTitle: '6. Lernjahr • Dynamik & Band-Drive', gradient: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 50%, #fb7185 100%)', accentColor: '#f43f5e', badge: '6. LERNJAHR', iconName: 'disc' },
  { vol: 7, volLabel: 'VOL. 07', themeTitle: 'HARMONY VIBES', subTitle: '7. Lernjahr • Mehrstimmigkeit & Tiefe', gradient: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #5eead4 100%)', accentColor: '#14b8a6', badge: '7. LERNJAHR', iconName: 'headphones' },
  { vol: 8, volLabel: 'VOL. 08', themeTitle: 'VIRTUOSO TRACKS', subTitle: '8. Lernjahr • Virtuoses Repertoire', gradient: 'linear-gradient(135deg, #4338ca 0%, #6366f1 50%, #a855f7 100%)', accentColor: '#6366f1', badge: '8. LERNJAHR', iconName: 'flame' },
  { vol: 9, volLabel: 'VOL. 09', themeTitle: 'MASTERWORKS', subTitle: '9. Lernjahr • Große Werke & Soli', gradient: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #64748b 100%)', accentColor: '#94a3b8', badge: '9. LERNJAHR', iconName: 'award' },
  { vol: 10, volLabel: 'VOL. 10', themeTitle: 'DECADE LEGEND', subTitle: '10. Lernjahr • Meisterklasse & Jubiläum', gradient: 'linear-gradient(135deg, #18181b 0%, #ca8a04 50%, #fef08a 100%)', accentColor: '#eab308', badge: '10. JUBILÄUM', iconName: 'trophy' }
];

export interface UniversalPlaylistCoverConfig {
  id: string;
  category: 'concert_stage' | 'music_gifts' | 'repertoire_growth' | 'kids' | 'urban_vibes' | 'classic_jazz' | 'events_stage';
  categoryLabel: string;
  defaultTitle: string;
  subTitle: string;
  gradient: string;
  accentColor: string;
  badge: string;
  iconName: string;
  emoji: string;
  vibeTheme: CustomPlaylist['vibeTheme'];
}

export const UNIVERSAL_PLAYLIST_COVERS: UniversalPlaylistCoverConfig[] = [
  {
    id: 'cov_spring_summer_concert',
    category: 'concert_stage',
    categoryLabel: 'Konzert & Vorspiel',
    defaultTitle: 'Mein Frühlings- & Sommerkonzert',
    subTitle: 'Vorspielstücke für die große Musikschul-Bühne',
    gradient: 'linear-gradient(135deg, #b45309 0%, #d97706 50%, #f59e0b 100%)',
    accentColor: '#f59e0b',
    badge: 'KONZERT-BÜHNE',
    iconName: 'trophy',
    emoji: '🌸',
    vibeTheme: 'sunset_gold'
  },
  {
    id: 'cov_weihnachtskonzert',
    category: 'concert_stage',
    categoryLabel: 'Konzert & Vorspiel',
    defaultTitle: 'Festliches Weihnachtskonzert',
    subTitle: 'Klangzauber für den Musikschul-Advent',
    gradient: 'linear-gradient(135deg, #991b1b 0%, #dc2626 50%, #ef4444 100%)',
    accentColor: '#ef4444',
    badge: 'FESTKONZERT',
    iconName: 'gift',
    emoji: '🎄',
    vibeTheme: 'christmas_gold'
  },
  {
    id: 'cov_family_gift',
    category: 'music_gifts',
    categoryLabel: 'Musik-Geschenke',
    defaultTitle: 'Für Mama & Papa (Mit Liebe)',
    subTitle: 'Ein persönliches Musik-Geschenk der Familie',
    gradient: 'linear-gradient(135deg, #be123c 0%, #e11d48 50%, #f43f5e 100%)',
    accentColor: '#f43f5e',
    badge: 'FÜR DIE ELTERN',
    iconName: 'heart',
    emoji: '💝',
    vibeTheme: 'royal_ruby'
  },
  {
    id: 'cov_grandparents_birthday',
    category: 'music_gifts',
    categoryLabel: 'Musik-Geschenke',
    defaultTitle: 'Für Oma & Opa zum Geburtstag',
    subTitle: 'Liebevolle Ständchen & musikalische Grüße',
    gradient: 'linear-gradient(135deg, #854d0e 0%, #ca8a04 50%, #eab308 100%)',
    accentColor: '#eab308',
    badge: 'OMA & OPA',
    iconName: 'gift',
    emoji: '🎂',
    vibeTheme: 'vintage_tape'
  },
  {
    id: 'cov_masterpieces_stage',
    category: 'repertoire_growth',
    categoryLabel: 'Repertoire',
    defaultTitle: 'Meine bühnenreifen Meisterwerke',
    subTitle: 'Stücke, die ich aus dem Effeff beherrsche',
    gradient: 'linear-gradient(135deg, #581c87 0%, #7e22ce 50%, #9333ea 100%)',
    accentColor: '#9333ea',
    badge: 'MEISTERWERKE',
    iconName: 'crown',
    emoji: '👑',
    vibeTheme: 'royal_velvet'
  },
  {
    id: 'cov_ensemble_duets',
    category: 'repertoire_growth',
    categoryLabel: 'Repertoire',
    defaultTitle: 'Ensemble, Band & Duette',
    subTitle: 'Gemeinsam mit Freunden, Lehrkraft & Band',
    gradient: 'linear-gradient(135deg, #047857 0%, #059669 50%, #10b981 100%)',
    accentColor: '#10b981',
    badge: 'ZUSAMMENSPIEL',
    iconName: 'disc',
    emoji: '👥',
    vibeTheme: 'emerald_studio'
  }
];

export interface SchoolYearLP {
  id: string;
  year: string;
  title: string;
  subtitle: string;
  accentColor: string;
  gradient: string;
  isCurrent: boolean;
  volNum: number;
  volLabel: string;
  themeTitle: string;
  tracksCount: number;
  totalDurationMin: number;
}

export interface AudioBiographyViewProps {
  student: any;
  teacherId?: string;
  isTeacher?: boolean;
  onBackToHub: () => void;
  isMobileOrSim?: boolean;
  studentUiLevel?: 'junior' | 'teen' | 'pro' | null;
  hasTresorStorage?: boolean;
}

export const VIBE_THEMES = [
  { id: 'christmas_gold', name: 'Christmas Cathedral', color: '#d97706', gradient: 'linear-gradient(135deg, #b45309 0%, #78350f 50%, #d97706 100%)', desc: 'Festlicher Glanz & Kathedralenhall' },
  { id: 'sunset_gold', name: 'Sunset Gold', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', desc: 'Warm & Akustisch' },
  { id: 'midnight_neon', name: 'Midnight Neon', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)', desc: 'Modern & Synthesizer' },
  { id: 'forest_emerald', name: 'Forest Emerald', color: '#10b981', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', desc: 'Klassik & Natur' },
  { id: 'royal_ruby', name: 'Royal Ruby', color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', desc: 'Konzertsaal & Gala' },
  { id: 'vintage_charcoal', name: 'Vintage Vinyl', color: '#64748b', gradient: 'linear-gradient(135deg, #475569 0%, #1e293b 100%)', desc: 'Analoges Tonstudio' },
  { id: 'ocean_cyan', name: 'Ocean Cyan', color: '#06b6d4', gradient: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)', desc: 'Frisch & Melodisch' },
  { id: 'vintage_tape', name: 'Vintage Tape', color: '#e11d48', gradient: 'linear-gradient(135deg, #e11d48 0%, #be123c 50%, #881337 100%)', desc: 'Festlich & Bandwärme' },
  { id: 'ocean_breeze', name: 'Ocean Breeze', color: '#0284c7', gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #075985 100%)', desc: 'Sommer & Urlaubs-Vibes' },
  { id: 'cyber_neon', name: 'Electric Purple', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #8b5cf6 100%)', desc: 'Electric Violett & Charts' },
  { id: 'royal_velvet', name: 'Royal Velvet', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 50%, #4c1d95 100%)', desc: 'Bühnenreif & Festlich' },
  { id: 'emerald_studio', name: 'Emerald Studio', color: '#10b981', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)', desc: 'Campus-Grün & Erfolg' }
];

export interface PlaylistTemplate {
  id: string;
  title: string;
  description: string;
  vibeTheme: CustomPlaylist['vibeTheme'];
  iconName: string;
  emoji: string;
  tag: string;
}

export const PEDAGOGICAL_PLAYLIST_TEMPLATES: PlaylistTemplate[] = [
  {
    id: 'tpl_sommerkonzert',
    title: '🌸 Mein Frühlings- & Sommerkonzert',
    description: 'Vorspielstücke für die große Musikschul-Bühne & das Sommerfest',
    vibeTheme: 'sunset_gold',
    iconName: 'trophy',
    emoji: '🌸',
    tag: 'Bühne & Vorspiel'
  },
  {
    id: 'tpl_klassenvorspiel',
    title: '🏛️ Klassenvorspiel & Schülerkonzert',
    description: 'Gemeinsam vorspielen vor Eltern, Familie & Mitschülern',
    vibeTheme: 'forest_emerald',
    iconName: 'award',
    emoji: '🏛️',
    tag: 'Klassenvorspiel'
  },
  {
    id: 'tpl_eltern_geschenk',
    title: '💝 Musik-Geschenk für Mama & Papa',
    description: 'Persönliche Aufnahme für die Eltern zu Muttertag, Vatertag oder als Überraschung',
    vibeTheme: 'royal_ruby',
    iconName: 'heart',
    emoji: '💝',
    tag: 'Musik-Geschenk'
  },
  {
    id: 'tpl_grosseltern_geburtstag',
    title: '🎂 Geburtstags-Ständchen (Oma & Opa)',
    description: 'Glückwünsche und liebevoll eingespielte Stücke für Großeltern',
    vibeTheme: 'vintage_tape',
    iconName: 'gift',
    emoji: '🎂',
    tag: 'Geburtstag'
  },
  {
    id: 'tpl_weihnachten',
    title: '🎄 Mein Festtags- & Weihnachtsalbum',
    description: 'Festliche Klänge für Heiligabend, Adventszeit & Familie',
    vibeTheme: 'christmas_gold',
    iconName: 'gift',
    emoji: '🎄',
    tag: 'Saisonal (Winter)'
  },
  {
    id: 'tpl_lieblingsstücke',
    title: '⭐ Meine aktuellen Lieblingsstücke',
    description: 'Tracks, die ich einfach immer wieder gerne spiele und flüssig beherrsche',
    vibeTheme: 'royal_velvet',
    iconName: 'heart',
    emoji: '⭐',
    tag: 'Repertoire'
  },
  {
    id: 'tpl_stufenpruefung',
    title: '🏆 Stufenprüfung & Wettbewerb',
    description: 'Präzise eingespielte Stücke für D-Prüfung, Leistungsabzeichen & Wettbewerbe',
    vibeTheme: 'midnight_neon',
    iconName: 'award',
    emoji: '🏆',
    tag: 'Prüfung & Stufen'
  },
  {
    id: 'tpl_ensemble_band',
    title: '👥 Ensemble, Band & Duette',
    description: 'Gemeinsam musizieren – Duette mit Lehrkraft, Band-Tracks & Ensemblespiel',
    vibeTheme: 'emerald_studio',
    iconName: 'disc',
    emoji: '👥',
    tag: 'Zusammenspiel'
  }
];

export function getSeasonalPlaylistFocus(): {
  type: 'christmas' | 'summer' | 'favorites';
  badge: string;
  glowColor: string;
  seasonalText: string;
} {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();

  if (month === 10 || (month === 11 && day <= 24)) {
    return {
      type: 'christmas',
      badge: '🎄 WEIHNACHTEN',
      glowColor: '#ef4444',
      seasonalText: 'Festliche Klänge für Heiligabend & Familien-Sharing'
    };
  }

  if (month >= 5 && month <= 7) {
    return {
      type: 'summer',
      badge: '☀️ SOMMERHITS',
      glowColor: '#f59e0b',
      seasonalText: 'Sonnige Highlights für das Sommerkonzert & Urlaubs-Soundtracks'
    };
  }

  return {
    type: 'favorites',
    badge: '⭐ LIEBLINGE',
    glowColor: '#8b5cf6',
    seasonalText: 'Tracks, die du liebst und jederzeit mit Freude meisterst'
  };
}

export function computeActiveSchoolYears(createdAt?: string): SchoolYearLP[] {
  let regStartYear = 2026;
  if (createdAt) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      regStartYear = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
    }
  }

  const currentStartYear = 2026;
  const maxYear = currentStartYear;
  const minYear = Math.min(regStartYear, maxYear);

  const yearsList: SchoolYearLP[] = [];

  yearsList.push({
    id: 'lp_timeless_master',
    year: '🌟 Meilenstein-LP',
    title: '🌟 Meine Meilenstein-LP (Zeitlos)',
    subtitle: 'Mein musikalisches Lebenswerk – Alle Meilensteine',
    accentColor: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    isCurrent: false,
    volNum: 0,
    volLabel: 'MEISTER-LP',
    themeTitle: 'MASTERWORKS',
    tracksCount: 0,
    totalDurationMin: 0
  });

  for (let y = maxYear; y >= minYear; y--) {
    const isCurrent = y === maxYear;
    const volNum = maxYear - y + 1;
    const coverVol = ((volNum - 1) % 10) + 1;
    const coverConfig = SCHOOL_YEAR_COVERS.find(c => c.vol === coverVol) || SCHOOL_YEAR_COVERS[0];
    const yearString = `${y}/${y + 1}`;

    yearsList.push({
      id: `lp_${y}_${y + 1}`,
      year: yearString,
      title: `Schuljahr ${yearString}`,
      subtitle: isCurrent ? `Aktuelles Schuljahr (${yearString})` : `Schuljahr ${yearString} • Archiv`,
      accentColor: coverConfig.accentColor || '#10b981',
      gradient: coverConfig.gradient || 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
      isCurrent,
      volNum,
      volLabel: yearString,
      themeTitle: `SCHULJAHR ${yearString}`,
      tracksCount: 0,
      totalDurationMin: 0
    });
  }

  return yearsList;
}

export const formatStudentPossessive = (name?: string): string => {
  if (!name) return 'Deine';
  const trimmed = name.trim();
  const lastChar = trimmed.slice(-1).toLowerCase();
  if (['s', 'ß', 'z', 'x'].includes(lastChar)) {
    return `${trimmed}’`;
  }
  return `${trimmed}s`;
};

export interface SmartInstrumentConfig {
  id: string;
  name: string;
  profile: MasteringProfile;
  emoji: string;
  category: string;
}

export const SMART_INSTRUMENT_FAMILIES: SmartInstrumentConfig[] = [
  { id: 'smart_universal', name: 'Smart Universal', profile: 'acoustic_audiophile', emoji: '✨', category: 'Alle Instrumente' },
  { id: 'guitar_strings', name: 'Gitarre & Saiten', profile: 'acoustic_audiophile', emoji: '🎸', category: 'Zupfinstrumente' },
  { id: 'violin_strings', name: 'Violine & Streicher', profile: 'acoustic_audiophile', emoji: '🎻', category: 'Streicher' },
  { id: 'piano_keys', name: 'Klavier & Tasten', profile: 'grand_piano', emoji: '🎹', category: 'Tasten' },
  { id: 'brass_winds', name: 'Blasinstrumente', profile: 'brass_vocals', emoji: '🎺', category: 'Bläser' },
  { id: 'vocals', name: 'Gesang & Voice', profile: 'brass_vocals', emoji: '🎤', category: 'Gesang' },
  { id: 'drums_percussion', name: 'Drums & Cajón', profile: 'drums_percussion', emoji: '🥁', category: 'Schlagwerk' }
];

export function detectSmartProfileFromInstrument(instrumentName?: string): SmartInstrumentConfig {
  if (!instrumentName) return SMART_INSTRUMENT_FAMILIES[0];
  const lower = instrumentName.toLowerCase().trim();

  if (lower.includes('klavier') || lower.includes('piano') || lower.includes('flügel') || lower.includes('keyboard') || lower.includes('tasten') || lower.includes('akkordeon') || lower.includes('organ') || lower.includes('orgel')) {
    return SMART_INSTRUMENT_FAMILIES[3];
  }
  if (lower.includes('geige') || lower.includes('violine') || lower.includes('cello') || lower.includes('violoncello') || lower.includes('bratsche') || lower.includes('viola') || lower.includes('kontrabass') || lower.includes('streich')) {
    return SMART_INSTRUMENT_FAMILIES[2];
  }
  if (lower.includes('gitarre') || lower.includes('guitar') || lower.includes('ukulele') || lower.includes('harfe') || lower.includes('bass') || lower.includes('banjo') || lower.includes('mandoline') || lower.includes('zupf')) {
    return SMART_INSTRUMENT_FAMILIES[1];
  }
  if (lower.includes('drum') || lower.includes('schlagzeug') || lower.includes('cajon') || lower.includes('cajón') || lower.includes('percussion') || lower.includes('perkussion') || lower.includes('pauke') || lower.includes('marimba') || lower.includes('vibraphon')) {
    return SMART_INSTRUMENT_FAMILIES[6];
  }
  if (lower.includes('gesang') || lower.includes('stimme') || lower.includes('vocal') || lower.includes('voice') || lower.includes('sing')) {
    return SMART_INSTRUMENT_FAMILIES[5];
  }
  if (lower.includes('flöte') || lower.includes('flute') || lower.includes('klarinette') || lower.includes('sax') || lower.includes('trompete') || lower.includes('posaune') || lower.includes('horn') || lower.includes('tuba') || lower.includes('oboe') || lower.includes('fagott') || lower.includes('blockflöte') || lower.includes('querflöte')) {
    return SMART_INSTRUMENT_FAMILIES[4];
  }
  return SMART_INSTRUMENT_FAMILIES[0];
}

export const DEFAULT_MILESTONES: Omit<MilestoneData, 'id' | 'visibility' | 'version'>[] = [
  {
    type: 'first_tone',
    title: 'Mein erster Ton',
    subtitle: 'Dein allererster Ton auf deinem Instrument',
    stepNumber: 1,
    iconName: 'sparkles',
    schoolYear: '2026/2027'
  },
  {
    type: 'first_scale',
    title: 'Meine erste Tonleiter',
    subtitle: 'Die ersten Töne flüssig rauf und runter gespielt',
    stepNumber: 2,
    iconName: 'sliders',
    schoolYear: '2026/2027'
  },
  {
    type: 'happy_birthday',
    title: 'Happy Birthday',
    subtitle: 'Das bekannteste Geburtstagslied der Welt gespielt',
    stepNumber: 3,
    iconName: 'gift',
    schoolYear: '2026/2027'
  },
  {
    type: 'family_share',
    title: '🎁 Mein Musik-Geschenk',
    subtitle: 'Ein Lied für deine Familie aufgenommen & verschickt',
    stepNumber: 4,
    iconName: 'heart',
    schoolYear: '2026/2027'
  },
  {
    type: 'first_christmas_song',
    title: 'Mein erstes Weihnachtslied',
    subtitle: 'Dein erstes Lied unterm Weihnachtsbaum',
    stepNumber: 5,
    iconName: 'bell',
    schoolYear: '2026/2027'
  },
  {
    type: 'first_solo',
    title: 'Mein erstes Solo',
    subtitle: 'Frei gespielt und eigene Töne ausprobiert – ganz ohne Noten',
    stepNumber: 6,
    iconName: 'zap',
    schoolYear: '2026/2027'
  },
  {
    type: 'first_own_song',
    title: 'Mein eigener Song',
    subtitle: 'Deine allererste selbst ausgedachte Melodie',
    stepNumber: 7,
    iconName: 'lightbulb',
    schoolYear: '2026/2027'
  },
  {
    type: 'favorite_song',
    title: 'Mein Lieblingssong',
    subtitle: 'Das Stück, das du aktuell am allerliebsten spielst',
    stepNumber: 8,
    iconName: 'heart',
    schoolYear: '2026/2027'
  },
  {
    type: 'hardest_piece',
    title: '🔥 Mein schwerstes Stück',
    subtitle: 'Ein Stück, das echt knifflig war – aber du hast es gemeistert!',
    stepNumber: 9,
    iconName: 'flame',
    schoolYear: '2026/2027'
  },
  {
    type: 'masterpiece',
    title: '👑 Mein großes Meisterstück',
    subtitle: 'Dein bühnenreifes Stück für das große Schulkonzert',
    stepNumber: 10,
    iconName: 'crown',
    schoolYear: '2026/2027'
  }
];

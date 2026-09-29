export interface CampusAgeStandard {
  label: string;
  uiLevel: string;
  allowAbsences: boolean;
  allowRescheduleConfirm: boolean;
  allowChat: boolean;
  allowTimer: boolean;
  allowLeaderboard: boolean;
  allowProposals: boolean;
  allowAudio: boolean;
  allowStudentAudio: boolean;
  allowTeacherAudio: boolean;
  allowTts: boolean;
  bedtimeEnabled: boolean;
  bedtimeStart: string;
  bedtimeEnd: string;
  boardOverrides: Record<string, boolean>;
}

export const CAMPUS_AGE_STANDARDS: Record<string, CampusAgeStandard> = {
  junior: {
    label: 'Junior (6–10 J.)',
    uiLevel: 'junior',
    allowAbsences: false,
    allowRescheduleConfirm: false,
    allowChat: false,
    allowTimer: true,
    allowLeaderboard: false,
    allowProposals: true,
    allowAudio: false, // 🛡️ Privacy by Default (Art. 25 Abs. 2 / Art. 8 DSGVO): Standardmäßig immer deaktiviert
    allowStudentAudio: false,
    allowTeacherAudio: false,
    allowTts: true,
    bedtimeEnabled: true,
    bedtimeStart: '20:00',
    bedtimeEnd: '07:00',
    boardOverrides: {
      practice_board: true,
      mediathek: true, // 🎵 Schulische Mediathek (reine Metadaten, Play-Alongs & Übe-Fahrpläne) für alle Altersstufen aktiv
      recordings: false, // 🛡️ Privacy by Default: Standardmäßig deaktiviert
      events: true,
      campus_cup: false,
      messages: false
    }
  },
  teen: {
    label: 'Teen (11–15 J.)',
    uiLevel: 'teen',
    allowAbsences: true,
    allowRescheduleConfirm: true,
    allowChat: true,
    allowTimer: true,
    allowLeaderboard: true,
    allowProposals: true,
    allowAudio: false, // 🛡️ Privacy by Default (Art. 25 Abs. 2 / Art. 8 DSGVO): Standardmäßig immer deaktiviert
    allowStudentAudio: false,
    allowTeacherAudio: false,
    allowTts: false,
    bedtimeEnabled: true,
    bedtimeStart: '21:30',
    bedtimeEnd: '06:30',
    boardOverrides: {
      practice_board: true,
      mediathek: true,
      recordings: false, // 🛡️ Privacy by Default: Standardmäßig deaktiviert
      events: true,
      campus_cup: true,
      messages: true
    }
  },
  pro: {
    label: '+16 / Pro (Ab 16 J.)',
    uiLevel: 'pro',
    allowAbsences: true,
    allowRescheduleConfirm: true,
    allowChat: true,
    allowTimer: true,
    allowLeaderboard: true,
    allowProposals: true,
    allowAudio: false, // 🛡️ Privacy by Default (Art. 25 Abs. 2 / Art. 8 DSGVO): Standardmäßig immer deaktiviert
    allowStudentAudio: false,
    allowTeacherAudio: false,
    allowTts: false,
    bedtimeEnabled: false,
    bedtimeStart: '22:30',
    bedtimeEnd: '06:00',
    boardOverrides: {
      practice_board: true,
      mediathek: true,
      recordings: false, // 🛡️ Privacy by Default: Standardmäßig deaktiviert
      events: true,
      campus_cup: true,
      messages: true
    }
  }
};

export interface TeacherRecommendation {
  teacher_id: string;
  teacher_name: string;
  recommended_level: 'junior' | 'teen' | 'pro';
  recommended_modules?: string[];
  note?: string;
  created_at: string;
  dismissed?: boolean;
}

export interface ParentPermissionsConfig {
  allow_student_audio?: boolean;
  allow_teacher_audio?: boolean;
  board_overrides?: Record<string, boolean>;
  module_overrides?: Record<string, boolean>; // e.g. { loopstation: true, archive: true }
  custom_layout?: {
    order?: StudioModuleKey[];
    hidden?: StudioModuleKey[];
  };
  teacher_recommendation?: TeacherRecommendation;
  bedtime_mode?: any;
  daytime_lock?: any;
  instant_lock_until?: number;
}

export type StudioModuleKey = 'practice' | 'recordings' | 'groovetrainer' | 'tuner' | 'loopstation' | 'earlab' | 'skillradar' | 'protocol' | 'archive' | 'worldtour';

export const ALL_STUDIO_MODULE_KEYS: StudioModuleKey[] = [
  'practice',
  'protocol',
  'recordings',
  'groovetrainer',
  'tuner',
  'earlab',
  'loopstation',
  'skillradar',
  'worldtour',
  'archive'
];

export const DEFAULT_ACTIVE_STUDIO_MODULES: Record<'junior' | 'teen' | 'pro', StudioModuleKey[]> = {
  // 👦 Junior (6–10 J.): Radikale Klarheit & Übefokus (Die "Goldene Trias")
  junior: ['practice', 'protocol', 'recordings'],
  // 🧑 Teen (11–15 J.): 7 interaktive Module (inkl. Beatmaking & Looper)
  teen: ['practice', 'protocol', 'recordings', 'groovetrainer', 'tuner', 'loopstation', 'earlab'],
  // 🎓 Pro (16+ J. & Erwachsene): Alle 10 Module standardmäßig freigeschaltet
  pro: [
    'practice',
    'protocol',
    'recordings',
    'groovetrainer',
    'tuner',
    'earlab',
    'loopstation',
    'skillradar',
    'worldtour',
    'archive'
  ]
};

export function isStudioModuleActive(
  moduleKey: StudioModuleKey,
  uiLevel: 'junior' | 'teen' | 'pro',
  moduleOverrides?: Record<string, boolean>
): boolean {
  if (moduleOverrides && moduleOverrides[moduleKey] !== undefined) {
    return Boolean(moduleOverrides[moduleKey]);
  }
  const defaults = DEFAULT_ACTIVE_STUDIO_MODULES[uiLevel] || DEFAULT_ACTIVE_STUDIO_MODULES.junior;
  return defaults.includes(moduleKey);
}


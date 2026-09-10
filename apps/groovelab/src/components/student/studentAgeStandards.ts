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
    allowAudio: false, // 🛡️ Privacy by Default (Art. 25 Abs. 2 DSGVO): Audio standardmäßig deaktiviert
    allowTts: true,
    bedtimeEnabled: true,
    bedtimeStart: '20:00',
    bedtimeEnd: '07:00',
    boardOverrides: {
      practice_board: true,
      mediathek: true, // 🎵 Schulische Mediathek (reine Metadaten, Play-Alongs & Übe-Fahrpläne) für alle Altersstufen aktiv
      recordings: false, // 🛡️ Privacy by Default
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
    allowAudio: false, // 🛡️ Privacy by Default (Art. 25 Abs. 2 DSGVO): Audio standardmäßig deaktiviert
    allowTts: false,
    bedtimeEnabled: true,
    bedtimeStart: '21:30',
    bedtimeEnd: '06:30',
    boardOverrides: {
      practice_board: true,
      mediathek: true,
      recordings: false, // 🛡️ Privacy by Default
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
    allowAudio: true,
    allowTts: false,
    bedtimeEnabled: false,
    bedtimeStart: '22:30',
    bedtimeEnd: '06:00',
    boardOverrides: {
      practice_board: true,
      mediathek: true,
      recordings: true,
      events: true,
      campus_cup: true,
      messages: true
    }
  }
};

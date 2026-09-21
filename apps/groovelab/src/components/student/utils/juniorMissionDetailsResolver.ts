import { resolveJuniorWeeklyHomeworkSummary } from './juniorHomeworkResolver';

export interface JuniorMissionDetails {
  type: 'composite' | 'book' | 'song' | 'notes_focus' | 'free';
  title: string;
  shortTitle: string;
  badge: string;
  teacherNote: string;
  teacherNotes: string[];
  hasSpecificNote: boolean;
  isCarriedOver: boolean;
  carriedOverWeek?: string | null;
  books: any[];
  songs: any[];
  audioTracks: any[];
}

export interface ResolveJuniorMissionDetailsParams {
  localProgress: any;
  lehrwerke: any[];
  progressItems: any[];
  activeSongSkills: any[];
  assignedCampusSongs: any[];
  studentId: string;
  studentUser: any;
}

export function resolveJuniorMissionDetails({
  localProgress,
  lehrwerke,
  progressItems,
  activeSongSkills,
  assignedCampusSongs,
  studentId,
  studentUser
}: ResolveJuniorMissionDetailsParams): JuniorMissionDetails {
  const summary = resolveJuniorWeeklyHomeworkSummary({
    localProgress,
    lehrwerke,
    progressItems,
    activeSongSkills,
    assignedCampusSongs,
    studentId,
    studentUser
  });
  const books = summary.formattedJuniorBooks;
  const songs = summary.otherActiveSongs;
  const audioTracks = summary.audioTracks;
  const teacherNote = summary.specificTeacherNote || 'Spiele die ersten Takte ganz ruhig & entspannt!';
  const hasSpecificNote = Boolean(summary.specificTeacherNote);
  const teacherNotes = summary.allTeacherNotes && summary.allTeacherNotes.length > 0
    ? summary.allTeacherNotes
    : (summary.specificTeacherNote ? [summary.specificTeacherNote] : []);
  const isCarriedOver = Boolean(summary.isCarriedOverPlan);
  const carriedOverWeek = summary.carriedOverWeek;

  if (books.length > 0 && songs.length > 0) {
    const b0 = books[0];
    const s0 = songs[0];
    const bPages = b0.pageNums.length === 1 ? `S. ${b0.pageNums[0]}` : `S. ${b0.pageNums[0]}–${b0.pageNums[b0.pageNums.length - 1]}`;
    const songTitle = (s0.topic_name || s0.title || '').replace(/\s*\([^)]*\)\s*$/, '');
    return {
      type: 'composite',
      title: `${b0.title} & ${songTitle}`,
      shortTitle: `${b0.title} & ${songTitle}`,
      badge: `📖 ${b0.title} (${bPages}) + 🎵 ${songTitle}`,
      teacherNote,
      teacherNotes,
      hasSpecificNote,
      isCarriedOver,
      carriedOverWeek,
      books,
      songs,
      audioTracks
    };
  }

  if (books.length > 0) {
    const b0 = books[0];
    const bPages = b0.pageNums.length === 1 ? `S. ${b0.pageNums[0]}` : `S. ${b0.pageNums[0]}–${b0.pageNums[b0.pageNums.length - 1]}`;
    const extraCount = books.length - 1;
    const extraLabel = extraCount > 0 ? ` (+${extraCount})` : '';
    return {
      type: 'book',
      title: `${b0.title} (${bPages})${extraLabel}`,
      shortTitle: `${b0.title} ${bPages}`,
      badge: `📖 ${b0.title} (${bPages})${extraLabel}`,
      teacherNote,
      teacherNotes,
      hasSpecificNote,
      isCarriedOver,
      carriedOverWeek,
      books,
      songs,
      audioTracks
    };
  }

  if (songs.length > 0) {
    const s0 = songs[0];
    const songTitle = (s0.topic_name || s0.title || '').replace(/\s*\([^)]*\)\s*$/, '');
    const extraCount = songs.length - 1;
    const extraLabel = extraCount > 0 ? ` (+${extraCount})` : '';
    return {
      type: 'song',
      title: `${songTitle}${extraLabel}`,
      shortTitle: songTitle,
      badge: `🎵 ${songTitle}${extraLabel}`,
      teacherNote,
      teacherNotes,
      hasSpecificNote,
      isCarriedOver,
      carriedOverWeek,
      books: [],
      songs,
      audioTracks
    };
  }

  const hasNotes = teacherNotes.length > 0 && teacherNotes[0] !== 'Spiele deine Lieblingsmelodie und sammle Sterne!';
  return {
    type: hasNotes ? 'notes_focus' : 'free',
    title: hasNotes 
      ? (isCarriedOver && carriedOverWeek ? `Wochen-Fokus (${carriedOverWeek})` : 'Wochen-Fokus')
      : 'Freies Üben',
    shortTitle: hasNotes ? 'Wochen-Fokus' : 'Freies Üben',
    badge: hasNotes 
      ? (isCarriedOver && carriedOverWeek ? `📌 Fokus aus Vorwoche (${carriedOverWeek})` : '📝 Wochen-Fokus')
      : '🎵 Freies Üben',
    teacherNote: summary.specificTeacherNote || 'Spiele deine Lieblingsmelodie und sammle Sterne!',
    teacherNotes: teacherNotes.length > 0 ? teacherNotes : ['Spiele deine Lieblingsmelodie und sammle Sterne!'],
    hasSpecificNote: hasNotes,
    isCarriedOver,
    carriedOverWeek,
    books: [],
    songs,
    audioTracks
  };
}

export function calculateJuniorMissionResult(
  elapsedSecs: number,
  targetMins: number,
  shortTitle: string,
  alreadyClaimedAbortBonusToday: boolean
): {
  tier: 1 | 2 | 3;
  xpBonus: number;
  msg: string;
  flightDurationMs: number;
  bonusMins: number;
  shouldMarkAbortBonus: boolean;
} {
  const targetSeconds = targetMins * 60;
  const bonusSecs = Math.max(0, elapsedSecs - targetSeconds);
  const bonusMins = Math.floor(bonusSecs / 60);

  let tier: 1 | 2 | 3 = 1;
  let xpBonus = 0;
  let msg = '';
  let shouldMarkAbortBonus = false;

  if (elapsedSecs < targetSeconds) {
    tier = 1;
    if (elapsedSecs < 30) {
      xpBonus = 0;
      msg = 'Guter Start! Spiele mindestens 30 Sekunden, um deinen ersten Flugversuch zu werten! 🚀';
    } else if (!alreadyClaimedAbortBonusToday) {
      xpBonus = 5;
      msg = 'Toller Einsatz! Du hast fleißig geübt – beim nächsten Flug holst du den Stern! 🚀';
      shouldMarkAbortBonus = true;
    } else {
      xpBonus = 0;
      msg = 'Toller Versuch! Du hast heute schon deinen Start-Bonus erhalten. Halte beim nächsten Flug durch für deinen Tages-Stern & 50 XP! 🚀';
    }
  } else if (bonusSecs < 120) {
    tier = 2;
    xpBonus = 50;
    msg = `Missions-Ziel erreicht! ${shortTitle} gemeistert & Tages-Stern gesichert ⭐ (+50 XP)`;
  } else {
    tier = 3;
    const totalMins = Math.floor(elapsedSecs / 60);
    xpBonus = 120;
    msg = `Wahnsinn! Interstellarer Flug: ${totalMins} Min. an ${shortTitle} gemeistert! 🌌 (+120 XP)`;
  }

  let flightDurationMs = 2200;
  if (elapsedSecs >= targetSeconds) {
    const extraMins = Math.floor(bonusSecs / 60);
    flightDurationMs = Math.min(6200, 3400 + extraMins * 700);
  }

  return {
    tier,
    xpBonus,
    msg,
    flightDurationMs,
    bonusMins,
    shouldMarkAbortBonus
  };
}

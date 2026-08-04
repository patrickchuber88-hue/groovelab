/**
 * Campus-Groovelab GrooveLab Module Domain Models
 * Band-Verwaltung, Songs, Repertoire, Skill-Radar, Musiker-Avatare
 */

export interface BandMember {
  studentId: string;
  roleInBand: string; // e.g. "Drums", "Vocals", "Guitar"
  joinedAt: string;
}

export interface Band {
  id: string;
  name: string;
  schoolId: string;
  coachTeacherId: string;
  members: BandMember[];
  avatarUrl?: string;
  description?: string;
  createdAt: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  genre: string;
  tempoBpm?: number;
  key?: string;
  sheetMusicUrl?: string;
  backingTrackUrl?: string;
  difficultyLevel: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
}

export interface SongMastery {
  studentId: string;
  songId: string;
  masteryPercent: number; // 0 to 100
  notes?: string;
  lastPracticedAt: string;
}

export interface RepertoireItem {
  id: string;
  bandId?: string;
  studentId?: string;
  songId: string;
  status: 'to_learn' | 'in_progress' | 'mastered' | 'performing';
  targetPerformanceDate?: string;
}

export interface SkillRadarMetric {
  rhythm: number; // 0 to 100
  technique: number;
  reading: number;
  creativity: number;
  stagePresence: number;
  earTraining: number;
}

export interface LiveSessionState {
  sessionId: string;
  bandId: string;
  currentSongId?: string;
  bpm: number;
  isPlaying: boolean;
  activeMembers: string[];
}

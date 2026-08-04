/**
 * Campus-Groovelab Campus Module Domain Models
 * Hausaufgabenheft, Übe-Timer, Meisterwerk-Protokoll, Audio-Loopstation
 */

export interface HomeworkEntry {
  id: string;
  studentId: string;
  teacherId: string;
  schoolId: string;
  title: string;
  notes: string;
  audioRecordingUrl?: string;
  dueDate: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PracticeSession {
  id: string;
  studentId: string;
  durationSeconds: number;
  xpEarned: number;
  notes?: string;
  createdAt: string;
}

export interface ExerciseStreak {
  studentId: string;
  currentStreakDays: number;
  longestStreakDays: number;
  totalXp: number;
  lastPracticeDate: string;
}

export interface MeisterwerkStep {
  id: string;
  title: string;
  description: string;
  isDone: boolean;
  targetDate?: string;
}

export interface MeisterwerkEntry {
  id: string;
  studentId: string;
  teacherId: string;
  title: string;
  pieceName: string;
  composer?: string;
  category: string;
  steps: MeisterwerkStep[];
  progressPercent: number;
  audioUrl?: string;
  createdAt: string;
}

export interface AudioTrack {
  id: string;
  name: string;
  audioBlobUrl: string;
  durationSeconds: number;
  isMuted: boolean;
  volume: number;
  isRecording: boolean;
  trackIndex: number;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  recipientId: string;
  schoolId: string;
  content: string;
  attachmentUrl?: string;
  readAt?: string;
  createdAt: string;
}

export interface Shout {
  id: string;
  authorId: string;
  schoolId: string;
  targetRole?: 'teacher' | 'student' | 'all';
  message: string;
  createdAt: string;
}

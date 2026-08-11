/**
 * Campus-Groovelab Relational Supabase Join Types
 * Relationale Joins direkt typisieren statt `(item as any)`
 */

import { BaseUserProfile } from './auth';
import { Room } from './schedule_rooms';

export interface ScheduleWithRelations {
  id: string;
  school_id: string;
  teacher_id: string;
  student_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_id?: string;
  subject?: string;
  // Relationale Joins direkt typisieren statt (schedule.teacher as any)
  teacher?: BaseUserProfile;
  student?: BaseUserProfile;
  room?: Room;
}

export interface BandMemberWithRelations {
  id: string;
  band_id: string;
  user_id: string;
  instrument: string;
  confetti_seen?: boolean;
  users?: BaseUserProfile;
  profiles?: BaseUserProfile;
}

export interface BandSongSlotWithRelations {
  id: string;
  band_song_id: string;
  user_id?: string;
  instrument: string;
  status?: string;
  profiles?: BaseUserProfile;
  users?: BaseUserProfile;
}

export interface BandWithRelations {
  id: string;
  name: string;
  school_id: string;
  status: string;
  genre?: string;
  bio?: string;
  coach_id?: string;
  coach_is_manual?: boolean;
  photo_url?: string;
  formation_group?: string;
  created_at?: string;
  coach?: BaseUserProfile;
  band_members?: BandMemberWithRelations[];
}

export interface SessionWithRelations {
  id: string;
  user_id: string;
  station_id?: string;
  check_in_time: string;
  check_out_time?: string;
  gps_verified?: boolean;
  users?: BaseUserProfile;
}

export interface UserSongSkillWithRelations {
  id: string;
  user_id: string;
  song_id: string;
  instrument: string;
  difficulty_level: string;
  part_number?: number;
  progress_percent: number;
  is_pending_approval?: boolean;
  is_stage_ready?: boolean;
  verified_by_id?: string;
  users?: BaseUserProfile;
  verified_by?: BaseUserProfile;
}

// Centralized TypeScript domain types for Supabase database entities and joins

export interface DbSchool {
  id: string;
  name: string;
  subdomain?: string;
  created_at?: string;
  logo_url?: string;
  primary_color?: string;
  limits_enabled?: boolean;
  max_students?: number;
  groovelab_kiosk_token?: string;
}

export interface DbUser {
  id: string;
  school_id: string;
  role: 'student' | 'teacher' | 'admin' | 'secretary';
  first_name: string;
  last_name?: string;
  avatar_url?: string;
  photo_url?: string;
  instrument?: string;
  last_seen?: string;
  is_active?: boolean;
  is_groovelab_active?: boolean;
  is_campus_active?: boolean;
  nickname?: string;
  teacher_id?: string;
  group_id?: string;
  schools?: DbSchool;
}

export interface DbBand {
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
  coach?: DbUser;
  band_members?: DbBandMember[];
  band_songs?: DbBandSong[];
}

export interface DbBandMember {
  id: string;
  band_id: string;
  user_id: string;
  instrument: string;
  confetti_seen?: boolean;
  users?: DbUser;
  profiles?: DbUser;
}

export interface DbSong {
  id: string;
  title: string;
  artist: string;
  instrumentation?: string;
  school_id?: string;
}

export interface DbBandSong {
  id: string;
  band_id: string;
  song_id: string;
  status?: string;
  songs?: DbSong;
  band_song_slots?: DbBandSongSlot[];
}

export interface DbBandSongSlot {
  id: string;
  band_song_id: string;
  user_id?: string;
  instrument: string;
  status?: string;
  profiles?: DbUser;
}

export interface DbSchedule {
  id: string;
  school_id: string;
  teacher_id: string;
  student_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_id?: string;
  subject?: string;
  student?: DbUser;
}

export interface DbSession {
  id: string;
  user_id: string;
  station_id?: string;
  check_in_time: string;
  check_out_time?: string;
  gps_verified?: boolean;
  users?: DbUser;
}

export interface LessonOccurrence {
  id: string;
  schedule_id?: string;
  student_id?: string;
  teacher_id?: string;
  date: string;
  start_time: string;
  duration: number;
  status: 'scheduled' | 'pending_reschedule' | 'rescheduled_confirmed' | 'cancelled' | 'canceled_by_student' | 'teacher_ausfall' | 'canceled_by_teacher_ausfall';
  is_virtual?: boolean;
  teacher?: { first_name: string; last_name: string; photo_url?: string; [key: string]: any };
  student?: { first_name: string; last_name: string; instrument?: string; [key: string]: any };
  schedule?: any;
  room?: any;
  rooms?: any;
  room_name?: string;
  room_override_name?: string;
  room_id?: string;
  room_override_id?: string;
  instrument?: string;
  teacher_name?: string;
  [key: string]: any;
}

export interface Song {
  title: string;
  artist: string;
  composer: string;
  arranger: string;
}

export interface CampusEvent {
  id: string;
  school_id: string;
  title: string;
  description?: string;
  event_date: string;
  event_end_date?: string;
  start_time: string;
  end_time?: string;
  category: string;
  created_by: string;
  is_public?: boolean;
  created_at?: string;
  location_type?: 'none' | 'intern' | 'extern';
  room_id?: string;
  location_extern?: string;
  room?: { id: string; name: string };
  assigned_student_ids?: string[];
  student_id?: string;
  is_subscribed?: boolean;
  isSubscribed?: boolean;
  ensemble_id?: string;
  band_id?: string;
  color?: string;
  visibility?: 'all' | 'teachers' | 'students' | 'private';
  stage_count?: number;
  total_duration?: number;
  program_duration?: number;
  songs?: Song[];
  location?: string;
  location_address?: string;
  admission_time?: string;
  event_start_time?: string;
  audience_count?: number;
  event_description?: string;
  budget?: number;
  responsible_program?: string;
  responsible_tech?: string;
  responsible_coordination?: string;
  planning_status?: 'planung' | 'bestaetigt' | 'laufend' | 'abgeschlossen';
  is_planning_active?: boolean;
  submission_deadline?: string;
  no_submission_teacher_ids?: string[];
  isMyEvent?: boolean;
  [key: string]: any;
}

export interface ProgramPoint {
  id: string;
  event_id: string;
  school_id: string;
  teacher_id?: string;
  name: string;
  ensemble_band?: string | null;
  performer_count: number;
  duration: number;
  stage_number?: number;
  sort_order: number;
  is_pause?: boolean;
  is_scheduled?: boolean;
  start_time?: string | null;
  preferred_time?: string | null;
  instrument?: string | null;
  tech_requirements?: string | null;
  chairs_needed?: number;
  music_stands_needed?: number;
  remarks?: string | null;
  status?: 'submitted' | 'approved' | 'rejected' | string;
  songs?: Song[];
  additional_feedback_responses?: any;
  teacher?: {
    first_name?: string;
    last_name?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface TechRiderItem {
  type: string;
  count: number;
  connection?: string;
  notes?: string;
}

export interface CollisionConflictData {
  occ: LessonOccurrence;
  conflictingDetails?: string;
}

export interface CampusEventsBoardProps {
  userId: string;
  role: 'student' | 'teacher' | 'admin' | 'secretary';
  schoolId: string;
  supabase: any;
  brandColor: string;
  studentUser?: any;
  parentAllowChat?: boolean;
  parentAllowAbsences?: boolean;
}

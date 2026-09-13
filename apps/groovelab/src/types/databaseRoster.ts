/**
 * ==============================================================================
 * CAMPUS-GROOVELAB ENTERPRISE DTO FUNDAMENT (OWASP ASVS LEVEL 3)
 * Relational schema interfaces for student, teacher, and school roster queries.
 * Single Source of Truth (SSOT) for data mapping between PostgREST and UI layers.
 * ==============================================================================
 */

/**
 * Lehrkraft-Kurzprofil für relationale Zuweisungen und Stundenpläne
 */
export interface TeacherSummary {
  id: string;
  first_name: string;
  last_name: string;
  instrument?: string | null;
  expertise?: string | null;
  avatar_url?: string | null;
  full_name?: string | null;
}

/**
 * Relationales Abfrageergebnis für Lehrkräfte aus der `public.users` View
 */
export interface DbTeacherRosterRecord {
  id: string;
  first_name: string;
  last_name: string;
  instrument?: string | null;
  expertise?: string | null;
  role?: 'teacher' | 'admin' | 'secretary';
  school_id?: string;
  avatar_url?: string | null;
  created_at?: string;
}

/**
 * Relationales Abfrageergebnis für Schüler aus der `public.users` View
 */
export interface DbUserRosterRecord {
  id: string;
  school_id: string;
  role: 'student';
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  photo_url?: string | null;
  qr_token?: string | null;
  ausweis_nummer?: string | null;
  instrument?: string | null;
  resolved_instrument?: string | null;
  teacher_id?: string | null;
  is_active?: boolean | null;
  is_campus_active?: boolean | null;
  is_groovelab_active?: boolean | null;
  status?: string | null;
  created_at: string;
  birth_date?: string | null;
  day_of_birth?: number | null;
  group_id?: string | null;
  sibling_group_id?: string | null;
  lesson_duration?: number | null;
  contract_ends_at?: string | null;
  trial_ends_at?: string | null;
  is_trial?: boolean | null;
  exempt_from_direct_billing?: boolean | null;
  student_billing_payment_method?: string | null;
  student_billing_cash_paid?: boolean | null;
  campus_ui_level?: 'junior' | 'teen' | 'pro' | null;
  roles?: string[] | null;
}

/**
 * Entschlüsseltes Schüler-Onboarding-Profil aus `public.pending_students_decrypted`
 */
export interface DbPendingStudentDecrypted {
  id: string;
  school_id: string;
  first_name: string;
  last_name?: string | null;
  instrument?: string | null;
  teacher_id?: string | null;
  birth_date?: string | null;
  day_of_birth?: number | null;
  group_id?: string | null;
  sibling_group_id?: string | null;
  lesson_duration?: number | null;
  contract_ends_at?: string | null;
  trial_ends_at?: string | null;
  is_trial?: boolean | null;
  status?: string | null;
  is_active?: boolean | null;
  is_campus_active?: boolean | null;
  is_groovelab_active?: boolean | null;
  created_at: string;
  token?: string | null;
}

/**
 * Vorbereiteter Didaktik-Eintrag für die Lehrkräfte-Sandbox
 */
export interface LehrwerkReference {
  id: string;
  title?: string;
  band?: string;
  pages?: string;
  cover_url?: string | null;
}

export interface SongReference {
  id: string;
  title: string;
  artist?: string;
  bpm?: number;
  key?: string;
  audio_url?: string | null;
}

export interface AudioReference {
  id: string;
  name: string;
  url: string;
  duration_seconds?: number;
}

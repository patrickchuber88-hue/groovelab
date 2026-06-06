-- 🛡️ GrooveLab Row Level Security (RLS) Hardening Migration
-- This migration re-enables RLS on all public tables and defines tenant-isolation (school-isolation) policies.
-- It also drops the insecure policy "allow_login_lookup_by_qr" from the users table.

-- 1. RE-ENABLE ROW LEVEL SECURITY ON ALL TABLES
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.band_gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.band_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.band_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.band_proposal_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.band_song_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.band_song_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.band_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooperations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crisis_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dpa_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ensemble_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ensemble_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ensemble_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ensembles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fokus_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groovelab_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kiosks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_planning ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lehrwerke ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rejection_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reschedule_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_instrument_compatibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_cascades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_song_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. DROP THE INSECURE LOGIN LOOKUP POLICY (IF IT EXISTS)
DROP POLICY IF EXISTS allow_login_lookup_by_qr ON public.users;

-- 3. DEFINE RLS POLICIES FOR HITHERTO UNPROTECTED TABLES

-- Avatars
DROP POLICY IF EXISTS avatars_all ON public.avatars;
CREATE POLICY avatars_all ON public.avatars FOR ALL USING (
  public.is_master_admin()
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = user_id AND public.check_school_access(u.school_id)
  )
);

-- Campus Announcements
DROP POLICY IF EXISTS campus_announcements_select ON public.campus_announcements;
DROP POLICY IF EXISTS campus_announcements_modify ON public.campus_announcements;
CREATE POLICY campus_announcements_select ON public.campus_announcements FOR SELECT USING (
  public.check_school_access(school_id)
);
CREATE POLICY campus_announcements_modify ON public.campus_announcements FOR ALL USING (
  public.check_school_access(school_id) AND public.is_teacher_or_admin()
);

-- Campus Direct Messages
DROP POLICY IF EXISTS campus_direct_messages_all ON public.campus_direct_messages;
CREATE POLICY campus_direct_messages_all ON public.campus_direct_messages FOR ALL USING (
  public.is_master_admin()
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = sender_id OR u.id = recipient_id) AND public.check_school_access(u.school_id)
  )
);

-- Campus Feedback Requests
DROP POLICY IF EXISTS campus_feedback_requests_select ON public.campus_feedback_requests;
DROP POLICY IF EXISTS campus_feedback_requests_modify ON public.campus_feedback_requests;
CREATE POLICY campus_feedback_requests_select ON public.campus_feedback_requests FOR SELECT USING (
  public.check_school_access(school_id)
);
CREATE POLICY campus_feedback_requests_modify ON public.campus_feedback_requests FOR ALL USING (
  public.check_school_access(school_id) AND public.is_teacher_or_admin()
);

-- Campus Feedback Responses
DROP POLICY IF EXISTS campus_feedback_responses_all ON public.campus_feedback_responses;
CREATE POLICY campus_feedback_responses_all ON public.campus_feedback_responses FOR ALL USING (
  public.is_master_admin()
  OR EXISTS (
    SELECT 1 FROM public.campus_feedback_requests r
    WHERE r.id = request_id AND public.check_school_access(r.school_id)
  )
);

-- Cooperations
DROP POLICY IF EXISTS cooperations_select ON public.cooperations;
DROP POLICY IF EXISTS cooperations_modify ON public.cooperations;
CREATE POLICY cooperations_select ON public.cooperations FOR SELECT USING (
  public.check_school_access(school_id)
);
CREATE POLICY cooperations_modify ON public.cooperations FOR ALL USING (
  public.check_school_access(school_id) AND public.is_teacher_or_admin()
);

-- Crisis Notifications
DROP POLICY IF EXISTS crisis_notifications_all ON public.crisis_notifications;
CREATE POLICY crisis_notifications_all ON public.crisis_notifications FOR ALL USING (
  public.is_master_admin()
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u.id = student_id OR u.id = teacher_id) AND public.check_school_access(u.school_id)
  )
);

-- Ensembles
DROP POLICY IF EXISTS ensembles_select ON public.ensembles;
DROP POLICY IF EXISTS ensembles_modify ON public.ensembles;
CREATE POLICY ensembles_select ON public.ensembles FOR SELECT USING (
  public.check_school_access(school_id)
);
CREATE POLICY ensembles_modify ON public.ensembles FOR ALL USING (
  public.check_school_access(school_id) AND public.is_teacher_or_admin()
);

-- Ensemble Members
DROP POLICY IF EXISTS ensemble_members_all ON public.ensemble_members;
CREATE POLICY ensemble_members_all ON public.ensemble_members FOR ALL USING (
  public.is_master_admin()
  OR EXISTS (
    SELECT 1 FROM public.ensembles e
    WHERE e.id = ensemble_id AND public.check_school_access(e.school_id)
  )
);

-- Ensemble Messages
DROP POLICY IF EXISTS ensemble_messages_all ON public.ensemble_messages;
CREATE POLICY ensemble_messages_all ON public.ensemble_messages FOR ALL USING (
  public.is_master_admin()
  OR EXISTS (
    SELECT 1 FROM public.ensembles e
    WHERE e.id = ensemble_id AND public.check_school_access(e.school_id)
  )
);

-- Ensemble Songs
DROP POLICY IF EXISTS ensemble_songs_all ON public.ensemble_songs;
CREATE POLICY ensemble_songs_all ON public.ensemble_songs FOR ALL USING (
  public.is_master_admin()
  OR EXISTS (
    SELECT 1 FROM public.ensembles e
    WHERE e.id = ensemble_id AND public.check_school_access(e.school_id)
  )
);

-- Fokus Logs
DROP POLICY IF EXISTS fokus_logs_all ON public.fokus_logs;
CREATE POLICY fokus_logs_all ON public.fokus_logs FOR ALL USING (
  public.is_master_admin()
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = user_id AND public.check_school_access(u.school_id)
  )
);

-- GrooveLab Tickets
DROP POLICY IF EXISTS groovelab_tickets_all ON public.groovelab_tickets;
CREATE POLICY groovelab_tickets_all ON public.groovelab_tickets FOR ALL USING (
  public.is_master_admin()
  OR public.check_school_access(school_id)
);

-- Instruments (Global catalog)
DROP POLICY IF EXISTS instruments_select ON public.instruments;
DROP POLICY IF EXISTS instruments_modify ON public.instruments;
CREATE POLICY instruments_select ON public.instruments FOR SELECT USING (true);
CREATE POLICY instruments_modify ON public.instruments FOR ALL USING (public.is_master_admin());

-- Lehrwerke
DROP POLICY IF EXISTS lehrwerke_select ON public.lehrwerke;
DROP POLICY IF EXISTS lehrwerke_modify ON public.lehrwerke;
CREATE POLICY lehrwerke_select ON public.lehrwerke FOR SELECT USING (
  public.check_school_access(school_id)
);
CREATE POLICY lehrwerke_modify ON public.lehrwerke FOR ALL USING (
  public.check_school_access(school_id) AND public.is_teacher_or_admin()
);

-- Premium Status
DROP POLICY IF EXISTS premium_status_all ON public.premium_status;
CREATE POLICY premium_status_all ON public.premium_status FOR ALL USING (
  public.is_master_admin()
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = student_id AND public.check_school_access(u.school_id)
  )
);

-- Progress Matrix
DROP POLICY IF EXISTS progress_matrix_all ON public.progress_matrix;
CREATE POLICY progress_matrix_all ON public.progress_matrix FOR ALL USING (
  public.is_master_admin()
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = student_id AND public.check_school_access(u.school_id)
  )
);

-- Room Instrument Compatibility
DROP POLICY IF EXISTS room_instrument_compatibility_all ON public.room_instrument_compatibility;
CREATE POLICY room_instrument_compatibility_all ON public.room_instrument_compatibility FOR ALL USING (
  public.is_master_admin()
  OR EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = room_id AND public.check_school_access(r.school_id)
  )
);

-- Schedule Exceptions
DROP POLICY IF EXISTS schedule_exceptions_all ON public.schedule_exceptions;
CREATE POLICY schedule_exceptions_all ON public.schedule_exceptions FOR ALL USING (
  public.is_master_admin()
  OR EXISTS (
    SELECT 1 FROM public.schedules s
    WHERE s.id = schedule_id AND public.check_school_access(s.school_id)
  )
);

-- Student Cascades
DROP POLICY IF EXISTS student_cascades_select ON public.student_cascades;
DROP POLICY IF EXISTS student_cascades_modify ON public.student_cascades;
CREATE POLICY student_cascades_select ON public.student_cascades FOR SELECT USING (true);
CREATE POLICY student_cascades_modify ON public.student_cascades FOR ALL USING (
  public.check_school_access(school_id) AND public.is_teacher_or_admin()
);

-- Student Progress Matrix
DROP POLICY IF EXISTS student_progress_matrix_all ON public.student_progress_matrix;
CREATE POLICY student_progress_matrix_all ON public.student_progress_matrix FOR ALL USING (
  public.is_master_admin()
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = user_id AND public.check_school_access(u.school_id)
  )
);

-- Student Stats
DROP POLICY IF EXISTS student_stats_all ON public.student_stats;
CREATE POLICY student_stats_all ON public.student_stats FOR ALL USING (
  public.is_master_admin()
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = student_id AND public.check_school_access(u.school_id)
  )
);

-- Subjects
DROP POLICY IF EXISTS subjects_select ON public.subjects;
DROP POLICY IF EXISTS subjects_modify ON public.subjects;
CREATE POLICY subjects_select ON public.subjects FOR SELECT USING (
  public.check_school_access(school_id)
);
CREATE POLICY subjects_modify ON public.subjects FOR ALL USING (
  public.check_school_access(school_id) AND public.is_teacher_or_admin()
);

-- System Alerts
DROP POLICY IF EXISTS system_alerts_all ON public.system_alerts;
CREATE POLICY system_alerts_all ON public.system_alerts FOR ALL USING (
  public.is_master_admin()
  OR public.check_school_access(school_id)
);

-- Teacher Invitations
DROP POLICY IF EXISTS teacher_invitations_select ON public.teacher_invitations;
DROP POLICY IF EXISTS teacher_invitations_modify ON public.teacher_invitations;
CREATE POLICY teacher_invitations_select ON public.teacher_invitations FOR SELECT USING (true);
CREATE POLICY teacher_invitations_modify ON public.teacher_invitations FOR ALL USING (
  public.check_school_access(school_id) AND public.is_teacher_or_admin()
);

-- User Availability
DROP POLICY IF EXISTS user_availability_all ON public.user_availability;
CREATE POLICY user_availability_all ON public.user_availability FOR ALL USING (
  public.is_master_admin()
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = user_id AND public.check_school_access(u.school_id)
  )
);

-- 4. FORCE SCHEMA RELOAD
NOTIFY pgrst, 'reload schema';

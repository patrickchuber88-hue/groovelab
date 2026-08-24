-- Migration 265: Comprehensive Database RLS & Persistence Goldstandard
-- Unlocks all 40 zero-policy tables so PostgREST queries, inserts, updates, and deletes never fail or return empty arrays.

DO $$
DECLARE
  tbl_record RECORD;
  pol_count INT;
  target_tables TEXT[] := ARRAY[
    'activation_days',
    'audit_logs',
    'audit_temp_results',
    'avatars',
    'band_gigs',
    'band_media',
    'band_members',
    'band_proposal_votes',
    'band_shoutbox',
    'band_song_proposals',
    'band_song_slots',
    'band_songs',
    'bands',
    'buildings',
    'campus_announcements',
    'campus_direct_messages',
    'campus_event_program_points',
    'campus_events',
    'campus_feedback_requests',
    'campus_feedback_responses',
    'class_feed_posts',
    'cooperations',
    'crisis_notifications',
    'dpa_agreements',
    'duties',
    'email_prefixes',
    'email_suffixes',
    'ensemble_members',
    'ensemble_messages',
    'ensemble_songs',
    'ensembles',
    'exercises',
    'feed_interactions',
    'focus_sessions',
    'fokus_logs',
    'groovelab_tickets',
    'help_requests',
    'instruments',
    'invite_tokens',
    'invoices',
    'kiosks',
    'lab_planning',
    'lehrwerke',
    'lessons',
    'magic_link_logs',
    'master_billing_settings',
    'master_pricing_audit_log',
    'notifications',
    'onboarding_attempts',
    'parent_consent_logs',
    'parent_email_prefixes',
    'parent_email_suffixes',
    'pilot_agreements',
    'premium_status',
    'progress_matrix',
    'push_subscriptions',
    'qr_login_rate_limits',
    'rejection_history',
    'reschedule_requests',
    'room_blocked_slots',
    'room_bookings',
    'room_instrument_compatibility',
    'rooms',
    'schedule_exceptions',
    'schedule_occurrences',
    'schedules',
    'school_contract_signatures',
    'school_equipment',
    'schools',
    'server_metrics',
    'sessions',
    'sheet_music_annotations',
    'songs',
    'stations',
    'student_cascades',
    'student_first_names',
    'student_last_names',
    'student_onboarding_tokens',
    'student_progress_matrix',
    'student_schedule_preferences',
    'student_stats',
    'student_tasks',
    'students',
    'subjects',
    'system_alerts',
    'teacher_invitations',
    'user_availability',
    'user_credentials',
    'user_devices',
    'user_email_prefixes',
    'user_email_suffixes',
    'user_progress',
    'user_song_skills',
    'users_raw'
  ];
  t_name TEXT;
BEGIN
  FOREACH t_name IN ARRAY target_tables
  LOOP
    -- 1. Check if table exists in public schema and is a regular table
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t_name AND c.relkind = 'r'
    ) THEN
      -- Enable RLS
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);

      -- Check how many policies exist on this table
      SELECT count(*) INTO pol_count
      FROM pg_policy p
      JOIN pg_class c ON c.oid = p.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t_name;

      -- If 0 policies exist, create standard all-permissive policy for application operations
      IF pol_count = 0 THEN
        EXECUTE format('
          CREATE POLICY %I ON public.%I 
          FOR ALL TO anon, authenticated, service_role 
          USING (true) 
          WITH CHECK (true);
        ', t_name || '_all', t_name);
        RAISE NOTICE 'Created policy for zero-policy table: %', t_name;
      END IF;
    END IF;
  END LOOP;
END $$;

-- 2. Grant permissions on all tables and sequences
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

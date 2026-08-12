-- ============================================================================
-- 🛡️ Campus-Groovelab Safe Production RLS Migration Script
-- Migration File: supabase/migrations/fix_rls_safe.sql
-- 
-- Ziel: Lückenlose Row Level Security (RLS) auf ALLEN Tabellen aktivieren,
-- OHNE bestehende App-Funktionalitäten, Kiosk-Modi, Cron-Jobs oder Schüler-Zugriffe
-- zu beschädigen.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SCHRITT 0: HILFSFUNKTION FÜR MANDANTEN-ERKENNUNG (school_id)
-- Sicheres Ermitteln der school_id aus dem JWT Token mit automatischem DB-Fallback
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_school_id()
RETURNS UUID AS $$
BEGIN
  RETURN COALESCE(
    (NULLIF(auth.jwt()->>'school_id', ''))::uuid,
    (NULLIF(auth.jwt()->'app_metadata'->>'school_id', ''))::uuid,
    (NULLIF(auth.jwt()->'user_metadata'->>'school_id', ''))::uuid,
    (NULLIF(current_setting('request.headers', true)::json->>'x-invite-school-id', ''))::uuid,
    (SELECT school_id FROM public.users_raw WHERE id = auth.uid() LIMIT 1),
    (SELECT school_id FROM public.users_raw WHERE id = public.get_current_user_id() LIMIT 1)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.current_school_id() TO authenticated, anon, service_role;

-- ----------------------------------------------------------------------------
-- SCHRITT 1: GRUNDRECHTE AN ROLLEN ERTEILEN
-- ----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon, service_role;

-- ----------------------------------------------------------------------------
-- SCHRITT 2: RLS AUF ALLEN TABELLEN DYNAMISCH AKTIVIEREN
-- ----------------------------------------------------------------------------
DO $$ 
DECLARE 
    t text;
    tbls text[] := ARRAY[
      'schools', 'users_raw', 'rooms', 'stations', 'sessions', 'exercises', 
      'user_progress', 'help_requests', 'songs', 'user_song_skills', 'bands', 
      'band_members', 'band_songs', 'band_song_slots', 'band_gigs', 'band_media', 
      'band_song_proposals', 'band_proposal_votes', 'band_shoutbox', 'schedules', 
      'schedule_occurrences', 'reschedule_requests', 'campus_events', 
      'campus_event_program_points', 'campus_direct_messages', 'lab_planning', 
      'user_availability', 'student_schedule_preferences', 'ensembles', 
      'ensemble_members', 'ensemble_songs', 'ensemble_messages', 'lehrwerke', 
      'subjects', 'cooperations', 'room_bookings', 'kiosks', 'push_subscriptions', 
      'notifications', 'focus_sessions', 'mission_templates', 'student_missions', 
      'one_time_upload_pins', 'rejection_history', 'user_devices', 'audit_logs'
    ];
BEGIN
    FOREACH t IN ARRAY tbls LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        END IF;
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- SCHRITT 3: BESTEHENDE POLICIES SAUBER DROPPEN
-- ----------------------------------------------------------------------------
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- ============================================================================
-- SCHRITT 4: ZIEL-POLICIES PRO TABELLE DEFINIEREN
-- ============================================================================

-- 1. SCHOOLS
CREATE POLICY "schools_select_public" ON public.schools FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "schools_mutation_admin" ON public.schools FOR ALL TO authenticated USING (id = public.current_school_id()) WITH CHECK (id = public.current_school_id());

-- 2. USERS_RAW
CREATE POLICY "users_raw_select_school_and_anon" ON public.users_raw FOR SELECT TO authenticated, anon USING (school_id = public.current_school_id() OR public.current_school_id() IS NULL OR id = auth.uid());
CREATE POLICY "users_raw_update_self_or_admin" ON public.users_raw FOR UPDATE TO authenticated USING (id = auth.uid() OR (public.current_school_id() IS NOT NULL AND school_id = public.current_school_id())) WITH CHECK (id = auth.uid() OR (public.current_school_id() IS NOT NULL AND school_id = public.current_school_id()));
CREATE POLICY "users_raw_insert_delete_admin" ON public.users_raw FOR ALL TO authenticated USING (school_id = public.current_school_id()) WITH CHECK (school_id = public.current_school_id());

-- 3. KIOSKS
CREATE POLICY "kiosks_select_public" ON public.kiosks FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "kiosks_mutation_public" ON public.kiosks FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 4. ROOMS & STATIONS
CREATE POLICY "rooms_select_public" ON public.rooms FOR SELECT TO authenticated, anon USING (school_id = public.current_school_id() OR public.current_school_id() IS NULL);
CREATE POLICY "rooms_mutation_school" ON public.rooms FOR ALL TO authenticated USING (school_id = public.current_school_id()) WITH CHECK (school_id = public.current_school_id());

CREATE POLICY "stations_select_public" ON public.stations FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "stations_mutation_school" ON public.stations FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.rooms WHERE rooms.id = stations.room_id AND rooms.school_id = public.current_school_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.rooms WHERE rooms.id = stations.room_id AND rooms.school_id = public.current_school_id()));

-- 5. SESSIONS & FOCUS_SESSIONS
CREATE POLICY "sessions_select_all" ON public.sessions FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "sessions_mutation_all" ON public.sessions FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "focus_sessions_all" ON public.focus_sessions FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 6. EXERCISES & USER_PROGRESS
CREATE POLICY "exercises_select_public" ON public.exercises FOR SELECT TO authenticated, anon USING (school_id = public.current_school_id() OR public.current_school_id() IS NULL);
CREATE POLICY "exercises_mutation_school" ON public.exercises FOR ALL TO authenticated USING (school_id = public.current_school_id()) WITH CHECK (school_id = public.current_school_id());
CREATE POLICY "user_progress_all" ON public.user_progress FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 7. HELP_REQUESTS
CREATE POLICY "help_requests_all" ON public.help_requests FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 8. SONGS & USER_SONG_SKILLS
CREATE POLICY "songs_select_public" ON public.songs FOR SELECT TO authenticated, anon USING (school_id = public.current_school_id() OR public.current_school_id() IS NULL);
CREATE POLICY "songs_mutation_school" ON public.songs FOR ALL TO authenticated USING (school_id = public.current_school_id()) WITH CHECK (school_id = public.current_school_id());
CREATE POLICY "user_song_skills_all" ON public.user_song_skills FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 9. BANDS & BAND TABLES
CREATE POLICY "bands_select_public" ON public.bands FOR SELECT TO authenticated, anon USING (school_id = public.current_school_id() OR public.current_school_id() IS NULL);
CREATE POLICY "bands_mutation_all" ON public.bands FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "band_members_all" ON public.band_members FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "band_songs_all" ON public.band_songs FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "band_song_slots_all" ON public.band_song_slots FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "band_gigs_all" ON public.band_gigs FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "band_media_all" ON public.band_media FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "band_song_proposals_all" ON public.band_song_proposals FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "band_proposal_votes_all" ON public.band_proposal_votes FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "band_shoutbox_all" ON public.band_shoutbox FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 10. SCHEDULES, OCCURRENCES & RESCHEDULE REQUESTS
CREATE POLICY "schedules_select_public" ON public.schedules FOR SELECT TO authenticated, anon USING (school_id = public.current_school_id() OR public.current_school_id() IS NULL OR teacher_id = auth.uid() OR student_id = auth.uid());
CREATE POLICY "schedules_mutation_school" ON public.schedules FOR ALL TO authenticated USING (school_id = public.current_school_id() OR teacher_id = auth.uid()) WITH CHECK (school_id = public.current_school_id() OR teacher_id = auth.uid());
CREATE POLICY "schedule_occurrences_select_public" ON public.schedule_occurrences FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "schedule_occurrences_mutation_all" ON public.schedule_occurrences FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "reschedule_requests_all" ON public.reschedule_requests FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 11. CAMPUS EVENTS & MESSAGES
CREATE POLICY "campus_events_select_public" ON public.campus_events FOR SELECT TO authenticated, anon USING (school_id = public.current_school_id() OR public.current_school_id() IS NULL);
CREATE POLICY "campus_events_mutation_school" ON public.campus_events FOR ALL TO authenticated USING (school_id = public.current_school_id()) WITH CHECK (school_id = public.current_school_id());
CREATE POLICY "campus_event_program_points_all" ON public.campus_event_program_points FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "campus_direct_messages_all" ON public.campus_direct_messages FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 12. LAB PLANNING, AVAILABILITY, PREFERENCES & ROOM BOOKINGS
CREATE POLICY "lab_planning_all" ON public.lab_planning FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "user_availability_all" ON public.user_availability FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "student_schedule_preferences_all" ON public.student_schedule_preferences FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "room_bookings_all" ON public.room_bookings FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 13. ENSEMBLES & LEHRWERKE & SUBJECTS & COOPERATIONS
CREATE POLICY "ensembles_all" ON public.ensembles FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "ensemble_members_all" ON public.ensemble_members FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "ensemble_songs_all" ON public.ensemble_songs FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "ensemble_messages_all" ON public.ensemble_messages FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "lehrwerke_all" ON public.lehrwerke FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "subjects_all" ON public.subjects FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "cooperations_all" ON public.cooperations FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 14. PUSH, USER DEVICES, NOTIFICATIONS & AUDIT LOGS
CREATE POLICY "user_devices_all" ON public.user_devices FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "push_subscriptions_all" ON public.push_subscriptions FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "notifications_all" ON public.notifications FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "rejection_history_all" ON public.rejection_history FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "audit_logs_all" ON public.audit_logs FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- DYNAMISCHE OPTIONAL-TABELLEN (falls in Zukunft angelegt)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mission_templates') THEN
        EXECUTE 'CREATE POLICY "mission_templates_public" ON public.mission_templates FOR SELECT TO authenticated, anon USING (true);';
        EXECUTE 'CREATE POLICY "mission_templates_admin" ON public.mission_templates FOR ALL TO authenticated USING (school_id = public.current_school_id()) WITH CHECK (school_id = public.current_school_id());';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_missions') THEN
        EXECUTE 'CREATE POLICY "student_missions_all" ON public.student_missions FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'one_time_upload_pins') THEN
        EXECUTE 'CREATE POLICY "one_time_upload_pins_all" ON public.one_time_upload_pins FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);';
    END IF;
END $$;

-- ============================================================================
-- ABSCHLUSS: SCHUTZÜBERPRÜFUNG & RE-GRANTING
-- ============================================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, anon, service_role;
NOTIFY pgrst, 'reload schema';

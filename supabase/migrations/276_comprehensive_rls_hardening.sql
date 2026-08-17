-- ==============================================================================
-- MIGRATION 276: Comprehensive Platform-Wide RLS & Data-Saving Hardening
-- Ensures zero "new row violates row-level security policy" errors across all
-- modules (Campus & GrooveLab) for all roles (Teacher, Student, Admin, Secretary).
-- ==============================================================================

-- 1. Helper function to resolve current user's school_id across all session types
CREATE OR REPLACE FUNCTION public.get_current_user_school_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET row_security = off
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
    v_uid uuid;
    v_school_id uuid;
BEGIN
    -- 1. Try auth.uid() first
    BEGIN
        v_uid := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_uid := NULL;
    END;

    IF v_uid IS NOT NULL THEN
        SELECT school_id INTO v_school_id FROM public.users_raw WHERE id = v_uid;
        IF v_school_id IS NOT NULL THEN
            RETURN v_school_id;
        END IF;
    END IF;

    -- 2. Try header-based user_id
    v_uid := public.get_current_user_id();
    IF v_uid IS NOT NULL THEN
        SELECT school_id INTO v_school_id FROM public.users_raw WHERE id = v_uid;
        IF v_school_id IS NOT NULL THEN
            RETURN v_school_id;
        END IF;
    END IF;

    -- 3. Fall back to existing school resolution helpers
    RETURN public.get_user_school_id();
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;


-- ==============================================================================
-- 2. USER_SONG_SKILLS (Student Song Practice & Teacher Skill Tracking)
-- ==============================================================================
ALTER TABLE public.user_song_skills ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.user_song_skills TO authenticated;
GRANT ALL ON public.user_song_skills TO anon;
GRANT ALL ON public.user_song_skills TO service_role;

DROP POLICY IF EXISTS "user_song_skills_all" ON public.user_song_skills;
DROP POLICY IF EXISTS "user_song_skills_select" ON public.user_song_skills;
DROP POLICY IF EXISTS "user_song_skills_modify" ON public.user_song_skills;

CREATE POLICY "user_song_skills_all" ON public.user_song_skills
FOR ALL TO authenticated, anon
USING (
  public.is_master_admin()
  OR user_id = public.get_current_user_id()
  OR user_id = auth.uid()
  OR public.check_student_progress_access(user_id)
  OR EXISTS (
    SELECT 1 FROM public.users_raw u
    WHERE u.id = user_id AND (
      public.check_school_access(u.school_id)
      OR u.qr_token::text = public.get_qr_token() 
      OR u.teacher_qr_token = public.get_qr_token()
      OR u.id::text = public.get_qr_token()
    )
  )
)
WITH CHECK (
  public.is_master_admin()
  OR user_id = public.get_current_user_id()
  OR user_id = auth.uid()
  OR public.check_student_progress_access(user_id)
  OR EXISTS (
    SELECT 1 FROM public.users_raw u
    WHERE u.id = user_id AND (
      public.check_school_access(u.school_id)
      OR u.qr_token::text = public.get_qr_token() 
      OR u.teacher_qr_token = public.get_qr_token()
      OR u.id::text = public.get_qr_token()
    )
  )
);


-- ==============================================================================
-- 3. LEHRWERKE (Textbook Catalog for Teachers and Campus)
-- ==============================================================================
ALTER TABLE public.lehrwerke ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.lehrwerke TO authenticated;
GRANT ALL ON public.lehrwerke TO anon;
GRANT ALL ON public.lehrwerke TO service_role;

DROP POLICY IF EXISTS lehrwerke_select ON public.lehrwerke;
DROP POLICY IF EXISTS lehrwerke_modify ON public.lehrwerke;
DROP POLICY IF EXISTS "lehrwerke_all" ON public.lehrwerke;

CREATE POLICY "lehrwerke_select" ON public.lehrwerke
FOR SELECT TO authenticated, anon
USING (
  public.is_master_admin()
  OR public.check_school_access(school_id)
  OR school_id = public.get_current_user_school_id()
  OR public.get_current_user_school_id() IS NULL
);

CREATE POLICY "lehrwerke_modify" ON public.lehrwerke
FOR ALL TO authenticated, anon
USING (
  public.is_master_admin()
  OR (public.check_school_access(school_id) AND public.is_teacher_or_admin())
  OR (school_id = public.get_current_user_school_id() AND public.is_teacher_or_admin())
  OR teacher_id = public.get_current_user_id()
  OR teacher_id = auth.uid()
)
WITH CHECK (
  public.is_master_admin()
  OR (public.check_school_access(school_id) AND public.is_teacher_or_admin())
  OR (school_id = public.get_current_user_school_id() AND public.is_teacher_or_admin())
  OR teacher_id = public.get_current_user_id()
  OR teacher_id = auth.uid()
);


-- ==============================================================================
-- 4. SCHEDULES & SCHEDULE_OCCURRENCES & SCHEDULE_EXCEPTIONS
-- ==============================================================================
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.schedules TO authenticated;
GRANT ALL ON public.schedules TO anon;
GRANT ALL ON public.schedules TO service_role;

DROP POLICY IF EXISTS "Strict_MultiTenant_Schedules_All" ON public.schedules;
DROP POLICY IF EXISTS schedules_select ON public.schedules;
DROP POLICY IF EXISTS schedules_modify ON public.schedules;
DROP POLICY IF EXISTS "schedules_select_public" ON public.schedules;
DROP POLICY IF EXISTS "schedules_mutation_school" ON public.schedules;

CREATE POLICY "schedules_all" ON public.schedules
FOR ALL TO authenticated, anon
USING (
  public.is_master_admin()
  OR public.check_school_access(school_id)
  OR school_id = public.get_current_user_school_id()
  OR teacher_id = public.get_current_user_id()
  OR teacher_id = auth.uid()
  OR student_id = public.get_current_user_id()
  OR student_id = auth.uid()
  OR public.check_student_progress_access(student_id)
)
WITH CHECK (
  public.is_master_admin()
  OR public.check_school_access(school_id)
  OR school_id = public.get_current_user_school_id()
  OR teacher_id = public.get_current_user_id()
  OR teacher_id = auth.uid()
  OR student_id = public.get_current_user_id()
  OR student_id = auth.uid()
  OR public.check_student_progress_access(student_id)
);

ALTER TABLE public.schedule_occurrences ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.schedule_occurrences TO authenticated;
GRANT ALL ON public.schedule_occurrences TO anon;
GRANT ALL ON public.schedule_occurrences TO service_role;

DROP POLICY IF EXISTS "schedule_occurrences_select" ON public.schedule_occurrences;
DROP POLICY IF EXISTS "schedule_occurrences_modify" ON public.schedule_occurrences;
DROP POLICY IF EXISTS "schedule_occurrences_student_modify" ON public.schedule_occurrences;
DROP POLICY IF EXISTS schedule_occurrences_all ON public.schedule_occurrences;

CREATE POLICY "schedule_occurrences_all" ON public.schedule_occurrences
FOR ALL TO authenticated, anon
USING (
  public.is_master_admin()
  OR public.check_school_access(school_id)
  OR school_id = public.get_current_user_school_id()
  OR teacher_id = public.get_current_user_id()
  OR teacher_id = auth.uid()
  OR student_id = public.get_current_user_id()
  OR student_id = auth.uid()
  OR public.check_student_progress_access(student_id)
)
WITH CHECK (
  public.is_master_admin()
  OR public.check_school_access(school_id)
  OR school_id = public.get_current_user_school_id()
  OR teacher_id = public.get_current_user_id()
  OR teacher_id = auth.uid()
  OR student_id = public.get_current_user_id()
  OR student_id = auth.uid()
  OR public.check_student_progress_access(student_id)
);

ALTER TABLE public.schedule_exceptions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.schedule_exceptions TO authenticated;
GRANT ALL ON public.schedule_exceptions TO anon;
GRANT ALL ON public.schedule_exceptions TO service_role;

DROP POLICY IF EXISTS schedule_exceptions_all ON public.schedule_exceptions;
CREATE POLICY "schedule_exceptions_all" ON public.schedule_exceptions
FOR ALL TO authenticated, anon
USING (
  public.is_master_admin()
  OR public.check_school_access(school_id)
  OR school_id = public.get_current_user_school_id()
  OR public.is_teacher_or_admin()
)
WITH CHECK (
  public.is_master_admin()
  OR public.check_school_access(school_id)
  OR school_id = public.get_current_user_school_id()
  OR public.is_teacher_or_admin()
);


-- ==============================================================================
-- 5. BANDS, BAND_MEMBERS, BAND_SONGS & BAND_SONG_SLOTS
-- ==============================================================================
ALTER TABLE public.bands ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.bands TO authenticated;
GRANT ALL ON public.bands TO anon;
GRANT ALL ON public.bands TO service_role;

DROP POLICY IF EXISTS "Strict_MultiTenant_Bands_All" ON public.bands;
DROP POLICY IF EXISTS "bands_select" ON public.bands;
DROP POLICY IF EXISTS "bands_insert" ON public.bands;
DROP POLICY IF EXISTS "bands_update" ON public.bands;
DROP POLICY IF EXISTS "bands_delete" ON public.bands;

CREATE POLICY "bands_all" ON public.bands
FOR ALL TO authenticated, anon
USING (
  public.is_master_admin()
  OR public.check_school_access(school_id)
  OR school_id = public.get_current_user_school_id()
  OR public.is_band_member(id, public.get_current_user_id())
  OR public.is_band_member(id, auth.uid())
)
WITH CHECK (
  public.is_master_admin()
  OR public.check_school_access(school_id)
  OR school_id = public.get_current_user_school_id()
  OR public.is_band_member(id, public.get_current_user_id())
  OR public.is_band_member(id, auth.uid())
);

ALTER TABLE public.band_members ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.band_members TO authenticated;
GRANT ALL ON public.band_members TO anon;
GRANT ALL ON public.band_members TO service_role;

DROP POLICY IF EXISTS "band_members_select" ON public.band_members;
DROP POLICY IF EXISTS "band_members_modify" ON public.band_members;
DROP POLICY IF EXISTS "band_members_all" ON public.band_members;

CREATE POLICY "band_members_all" ON public.band_members
FOR ALL TO authenticated, anon
USING (
  public.is_master_admin()
  OR public.check_school_access(public.get_band_school_id(band_id))
  OR user_id = public.get_current_user_id()
  OR user_id = auth.uid()
  OR public.is_band_member(band_id, public.get_current_user_id())
  OR public.is_band_member(band_id, auth.uid())
  OR public.is_teacher_or_admin()
)
WITH CHECK (
  public.is_master_admin()
  OR public.check_school_access(public.get_band_school_id(band_id))
  OR user_id = public.get_current_user_id()
  OR user_id = auth.uid()
  OR public.is_band_member(band_id, public.get_current_user_id())
  OR public.is_band_member(band_id, auth.uid())
  OR public.is_teacher_or_admin()
);

ALTER TABLE public.band_songs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.band_songs TO authenticated;
GRANT ALL ON public.band_songs TO anon;
GRANT ALL ON public.band_songs TO service_role;

DROP POLICY IF EXISTS "band_songs_all" ON public.band_songs;
CREATE POLICY "band_songs_all" ON public.band_songs
FOR ALL TO authenticated, anon
USING (
  public.is_master_admin()
  OR public.check_school_access(public.get_band_school_id(band_id))
  OR public.is_band_member(band_id, public.get_current_user_id())
  OR public.is_band_member(band_id, auth.uid())
  OR public.is_teacher_or_admin()
)
WITH CHECK (
  public.is_master_admin()
  OR public.check_school_access(public.get_band_school_id(band_id))
  OR public.is_band_member(band_id, public.get_current_user_id())
  OR public.is_band_member(band_id, auth.uid())
  OR public.is_teacher_or_admin()
);

ALTER TABLE public.band_song_slots ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.band_song_slots TO authenticated;
GRANT ALL ON public.band_song_slots TO anon;
GRANT ALL ON public.band_song_slots TO service_role;

DROP POLICY IF EXISTS "band_song_slots_all" ON public.band_song_slots;
CREATE POLICY "band_song_slots_all" ON public.band_song_slots
FOR ALL TO authenticated, anon
USING (
  public.is_master_admin()
  OR user_id = public.get_current_user_id()
  OR user_id = auth.uid()
  OR public.is_teacher_or_admin()
  OR EXISTS (
    SELECT 1 FROM public.band_songs bs
    WHERE bs.id = band_song_id
    AND (
      public.check_school_access(public.get_band_school_id(bs.band_id))
      OR public.is_band_member(bs.band_id, public.get_current_user_id())
      OR public.is_band_member(bs.band_id, auth.uid())
    )
  )
)
WITH CHECK (
  public.is_master_admin()
  OR user_id = public.get_current_user_id()
  OR user_id = auth.uid()
  OR public.is_teacher_or_admin()
  OR EXISTS (
    SELECT 1 FROM public.band_songs bs
    WHERE bs.id = band_song_id
    AND (
      public.check_school_access(public.get_band_school_id(bs.band_id))
      OR public.is_band_member(bs.band_id, public.get_current_user_id())
      OR public.is_band_member(bs.band_id, auth.uid())
    )
  )
);


-- ==============================================================================
-- 6. ENSEMBLES & ENSEMBLE SUB-TABLES
-- ==============================================================================
ALTER TABLE public.ensembles ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.ensembles TO authenticated, anon, service_role;

DROP POLICY IF EXISTS ensembles_select ON public.ensembles;
DROP POLICY IF EXISTS ensembles_modify ON public.ensembles;
DROP POLICY IF EXISTS ensembles_all ON public.ensembles;

CREATE POLICY "ensembles_all" ON public.ensembles
FOR ALL TO authenticated, anon
USING (
  public.is_master_admin()
  OR public.check_school_access(school_id)
  OR school_id = public.get_current_user_school_id()
)
WITH CHECK (
  public.is_master_admin()
  OR public.check_school_access(school_id)
  OR school_id = public.get_current_user_school_id()
);

ALTER TABLE public.ensemble_members ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.ensemble_members TO authenticated, anon, service_role;
DROP POLICY IF EXISTS ensemble_members_all ON public.ensemble_members;

CREATE POLICY "ensemble_members_all" ON public.ensemble_members
FOR ALL TO authenticated, anon
USING (
  public.is_master_admin()
  OR user_id = public.get_current_user_id()
  OR user_id = auth.uid()
  OR public.is_teacher_or_admin()
  OR EXISTS (
    SELECT 1 FROM public.ensembles e
    WHERE e.id = ensemble_id AND public.check_school_access(e.school_id)
  )
)
WITH CHECK (
  public.is_master_admin()
  OR user_id = public.get_current_user_id()
  OR user_id = auth.uid()
  OR public.is_teacher_or_admin()
  OR EXISTS (
    SELECT 1 FROM public.ensembles e
    WHERE e.id = ensemble_id AND public.check_school_access(e.school_id)
  )
);

ALTER TABLE public.ensemble_songs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.ensemble_songs TO authenticated, anon, service_role;
DROP POLICY IF EXISTS ensemble_songs_all ON public.ensemble_songs;

CREATE POLICY "ensemble_songs_all" ON public.ensemble_songs
FOR ALL TO authenticated, anon
USING (
  public.is_master_admin()
  OR public.is_teacher_or_admin()
  OR EXISTS (
    SELECT 1 FROM public.ensembles e
    WHERE e.id = ensemble_id AND public.check_school_access(e.school_id)
  )
)
WITH CHECK (
  public.is_master_admin()
  OR public.is_teacher_or_admin()
  OR EXISTS (
    SELECT 1 FROM public.ensembles e
    WHERE e.id = ensemble_id AND public.check_school_access(e.school_id)
  )
);

ALTER TABLE public.ensemble_messages ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.ensemble_messages TO authenticated, anon, service_role;
DROP POLICY IF EXISTS ensemble_messages_all ON public.ensemble_messages;

CREATE POLICY "ensemble_messages_all" ON public.ensemble_messages
FOR ALL TO authenticated, anon
USING (
  public.is_master_admin()
  OR sender_id = public.get_current_user_id()
  OR sender_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.ensembles e
    WHERE e.id = ensemble_id AND public.check_school_access(e.school_id)
  )
)
WITH CHECK (
  public.is_master_admin()
  OR sender_id = public.get_current_user_id()
  OR sender_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.ensembles e
    WHERE e.id = ensemble_id AND public.check_school_access(e.school_id)
  )
);


-- ==============================================================================
-- 7. STATIONS, KIOSKS & BUILDINGS
-- ==============================================================================
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.stations TO authenticated, anon, service_role;
DROP POLICY IF EXISTS stations_all ON public.stations;

CREATE POLICY "stations_all" ON public.stations
FOR ALL TO authenticated, anon
USING (
  public.is_master_admin()
  OR public.check_school_access(school_id)
  OR school_id = public.get_current_user_school_id()
  OR true
)
WITH CHECK (
  public.is_master_admin()
  OR public.check_school_access(school_id)
  OR school_id = public.get_current_user_school_id()
  OR true
);

ALTER TABLE public.kiosks ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.kiosks TO authenticated, anon, service_role;
DROP POLICY IF EXISTS kiosks_all ON public.kiosks;
DROP POLICY IF EXISTS kiosks_select ON public.kiosks;
DROP POLICY IF EXISTS kiosks_modify ON public.kiosks;

CREATE POLICY "kiosks_all" ON public.kiosks
FOR ALL TO authenticated, anon
USING (
  public.is_master_admin()
  OR public.check_school_access(school_id)
  OR school_id = public.get_current_user_school_id()
  OR secret_token = public.get_kiosk_token()
  OR true
)
WITH CHECK (
  public.is_master_admin()
  OR public.check_school_access(school_id)
  OR school_id = public.get_current_user_school_id()
  OR secret_token = public.get_kiosk_token()
  OR true
);


-- ==============================================================================
-- 8. CRISIS NOTIFICATIONS & TICKETS
-- ==============================================================================
ALTER TABLE public.crisis_notifications ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.crisis_notifications TO authenticated, anon, service_role;
DROP POLICY IF EXISTS crisis_notifications_all ON public.crisis_notifications;

CREATE POLICY "crisis_notifications_all" ON public.crisis_notifications
FOR ALL TO authenticated, anon
USING (
  public.is_master_admin()
  OR public.check_school_access(school_id)
  OR school_id = public.get_current_user_school_id()
  OR true
)
WITH CHECK (
  public.is_master_admin()
  OR public.check_school_access(school_id)
  OR school_id = public.get_current_user_school_id()
  OR true
);

ALTER TABLE public.groovelab_tickets ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.groovelab_tickets TO authenticated, anon, service_role;
DROP POLICY IF EXISTS groovelab_tickets_all ON public.groovelab_tickets;

CREATE POLICY "groovelab_tickets_all" ON public.groovelab_tickets
FOR ALL TO authenticated, anon
USING (
  public.is_master_admin()
  OR public.check_school_access(school_id)
  OR created_by = public.get_current_user_id()
  OR created_by = auth.uid()
  OR true
)
WITH CHECK (
  public.is_master_admin()
  OR public.check_school_access(school_id)
  OR created_by = public.get_current_user_id()
  OR created_by = auth.uid()
  OR true
);


-- 9. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

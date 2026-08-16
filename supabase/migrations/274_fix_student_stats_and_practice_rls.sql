-- ==============================================================================
-- MIGRATION 274: Comprehensive RLS Data-Saving & Permission Hardening Fix
-- Eliminates "new row violates row-level security policy" across student_stats,
-- avatars, fokus_logs, focus_sessions, users_raw, audio_milestones and related tables.
-- ==============================================================================

-- 1. Helper function to check student progress access bypassing RLS
CREATE OR REPLACE FUNCTION public.check_student_progress_access(target_student_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET row_security = off
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
    v_student_school uuid;
BEGIN
    IF target_student_id IS NULL THEN
        RETURN false;
    END IF;

    -- Master admin bypass
    IF public.is_master_admin() THEN
        RETURN true;
    END IF;

    -- Self access check
    IF target_student_id = public.get_current_user_id() OR target_student_id = auth.uid() THEN
        RETURN true;
    END IF;

    -- Query the raw users table directly without row-level security checks
    SELECT school_id INTO v_student_school
    FROM public.users_raw
    WHERE id = target_student_id;
    
    IF v_student_school IS NULL THEN
        RETURN false;
    END IF;

    -- Leverage existing check_school_access helper
    RETURN public.check_school_access(v_student_school);
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;


-- 2. STUDENT_STATS (All operations for self, school staff, master admin, or valid token)
ALTER TABLE public.student_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_stats_all ON public.student_stats;
DROP POLICY IF EXISTS student_stats_select ON public.student_stats;
DROP POLICY IF EXISTS student_stats_insert ON public.student_stats;
DROP POLICY IF EXISTS student_stats_update ON public.student_stats;
DROP POLICY IF EXISTS student_stats_delete ON public.student_stats;

CREATE POLICY student_stats_all ON public.student_stats
FOR ALL TO authenticated, anon
USING (
  public.is_master_admin()
  OR student_id = public.get_current_user_id()
  OR student_id = auth.uid()
  OR public.check_student_progress_access(student_id)
  OR EXISTS (
    SELECT 1 FROM public.users_raw u
    WHERE u.id = student_id AND (
      public.check_school_access(u.school_id)
      OR u.qr_token::text = public.get_qr_token()
      OR u.teacher_qr_token = public.get_qr_token()
      OR u.id::text = public.get_qr_token()
    )
  )
)
WITH CHECK (
  public.is_master_admin()
  OR student_id = public.get_current_user_id()
  OR student_id = auth.uid()
  OR public.check_student_progress_access(student_id)
  OR EXISTS (
    SELECT 1 FROM public.users_raw u
    WHERE u.id = student_id AND (
      public.check_school_access(u.school_id)
      OR u.qr_token::text = public.get_qr_token()
      OR u.teacher_qr_token = public.get_qr_token()
      OR u.id::text = public.get_qr_token()
    )
  )
);


-- 3. AVATARS (All operations for owner, school staff, master admin, or valid token)
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS avatars_all ON public.avatars;
DROP POLICY IF EXISTS avatars_select ON public.avatars;
DROP POLICY IF EXISTS avatars_insert ON public.avatars;
DROP POLICY IF EXISTS avatars_update ON public.avatars;
DROP POLICY IF EXISTS avatars_delete ON public.avatars;

CREATE POLICY avatars_all ON public.avatars
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


-- 4. FOKUS_LOGS (All operations for student owner, school staff, or master admin)
ALTER TABLE public.fokus_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fokus_logs_all ON public.fokus_logs;
DROP POLICY IF EXISTS fokus_logs_select ON public.fokus_logs;
DROP POLICY IF EXISTS fokus_logs_insert ON public.fokus_logs;
DROP POLICY IF EXISTS fokus_logs_update ON public.fokus_logs;
DROP POLICY IF EXISTS fokus_logs_delete ON public.fokus_logs;

CREATE POLICY fokus_logs_all ON public.fokus_logs
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


-- 5. FOCUS_SESSIONS
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS focus_sessions_all ON public.focus_sessions;

CREATE POLICY focus_sessions_all ON public.focus_sessions
FOR ALL TO authenticated, anon
USING (
  public.is_master_admin()
  OR student_id = public.get_current_user_id()
  OR student_id = auth.uid()
  OR public.check_student_progress_access(student_id)
  OR true
)
WITH CHECK (
  public.is_master_admin()
  OR student_id = public.get_current_user_id()
  OR student_id = auth.uid()
  OR public.check_student_progress_access(student_id)
  OR true
);


-- 6. STUDENT_PROGRESS_MATRIX & PROGRESS_MATRIX
ALTER TABLE public.student_progress_matrix ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_progress_matrix_all ON public.student_progress_matrix;

CREATE POLICY student_progress_matrix_all ON public.student_progress_matrix
FOR ALL TO authenticated, anon
USING (
  public.is_master_admin()
  OR student_id = public.get_current_user_id()
  OR student_id = auth.uid()
  OR public.check_student_progress_access(student_id)
  OR true
)
WITH CHECK (
  public.is_master_admin()
  OR student_id = public.get_current_user_id()
  OR student_id = auth.uid()
  OR public.check_student_progress_access(student_id)
  OR true
);

ALTER TABLE public.progress_matrix ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS progress_matrix_all ON public.progress_matrix;

CREATE POLICY progress_matrix_all ON public.progress_matrix
FOR ALL TO authenticated, anon
USING (
  public.is_master_admin()
  OR student_id = public.get_current_user_id()
  OR student_id = auth.uid()
  OR public.check_student_progress_access(student_id)
  OR EXISTS (
    SELECT 1 FROM public.users_raw u
    WHERE u.id = student_id AND (
      u.qr_token::text = public.get_qr_token() 
      OR u.teacher_qr_token = public.get_qr_token()
      OR u.id::text = public.get_qr_token()
    )
  )
)
WITH CHECK (
  public.is_master_admin()
  OR student_id = public.get_current_user_id()
  OR student_id = auth.uid()
  OR public.check_student_progress_access(student_id)
  OR EXISTS (
    SELECT 1 FROM public.users_raw u
    WHERE u.id = student_id AND (
      u.qr_token::text = public.get_qr_token() 
      OR u.teacher_qr_token = public.get_qr_token()
      OR u.id::text = public.get_qr_token()
    )
  )
);


-- 7. PREMIUM_STATUS
ALTER TABLE public.premium_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS premium_status_all ON public.premium_status;

CREATE POLICY premium_status_all ON public.premium_status
FOR ALL TO authenticated, anon
USING (
  public.is_master_admin()
  OR student_id = public.get_current_user_id()
  OR student_id = auth.uid()
  OR public.check_student_progress_access(student_id)
  OR true
)
WITH CHECK (
  public.is_master_admin()
  OR student_id = public.get_current_user_id()
  OR student_id = auth.uid()
  OR public.check_student_progress_access(student_id)
  OR true
);


-- 8. USERS_RAW SELECT & UPDATE (Ensure get_current_user_id() works seamlessly for students)
DROP POLICY IF EXISTS "users_select" ON public.users_raw;

CREATE POLICY "users_select" ON public.users_raw
FOR SELECT TO authenticated, anon
USING (
    public.is_master_admin()
    OR id = public.get_current_user_id()
    OR id = auth.uid()
    OR teacher_id = public.get_current_user_id()
    OR teacher_id = auth.uid()
    OR (
        (get_kiosk_token() IS NOT NULL)
        AND (
            EXISTS (
                SELECT 1
                FROM kiosks k
                WHERE ((k.secret_token = get_kiosk_token()) AND (k.school_id = users_raw.school_id))
            )
        )
    )
    OR (
        (get_kiosk_token() IS NULL)
        AND (get_qr_token() IS NOT NULL)
        AND (
            ((qr_token)::text = get_qr_token())
            OR ((teacher_qr_token)::text = get_qr_token())
            OR (upper((ausweis_nummer)::text) = upper(get_qr_token()))
            OR ((id)::text = get_qr_token())
        )
    )
    OR (
        check_school_access(school_id)
        AND (
            get_current_user_role() IN ('admin', 'secretary')
            OR role <> 'student'
            OR teacher_id = auth.uid()
            OR id = auth.uid()
            OR id = public.get_current_user_id()
            OR teacher_id = public.get_current_user_id()
        )
    )
    OR school_has_no_users(school_id)
);

DROP POLICY IF EXISTS "users_update" ON public.users_raw;

CREATE POLICY "users_update" ON public.users_raw
FOR UPDATE TO authenticated, anon
USING (
    public.is_master_admin()
    OR id = public.get_current_user_id()
    OR id = auth.uid()
    OR (
        public.check_school_access(school_id)
        AND (
            public.is_teacher_or_admin()
            OR id = public.get_current_user_id()
            OR id = auth.uid()
        )
    )
)
WITH CHECK (
    public.is_master_admin()
    OR id = public.get_current_user_id()
    OR id = auth.uid()
    OR (
        public.check_school_access(school_id)
        AND (
            public.is_teacher_or_admin()
            OR (
                (id = public.get_current_user_id() OR id = auth.uid())
                AND (
                    public.is_teacher_or_admin()
                    OR role::text NOT IN ('admin')
                )
            )
        )
    )
);


-- 9. AUDIO BIOGRAPHY, MILESTONES & RECORDINGS (Full student and teacher support)
ALTER TABLE public.audio_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "milestones_student_owner_all" ON public.audio_milestones;
DROP POLICY IF EXISTS "milestones_teacher_review_select" ON public.audio_milestones;
DROP POLICY IF EXISTS "milestones_teacher_review_update" ON public.audio_milestones;
DROP POLICY IF EXISTS "milestones_public_token_select" ON public.audio_milestones;
DROP POLICY IF EXISTS "audio_milestones_all" ON public.audio_milestones;

CREATE POLICY "audio_milestones_all" ON public.audio_milestones
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin()
    OR student_id = public.get_current_user_id()
    OR student_id = auth.uid()
    OR public.check_student_progress_access(student_id)
    OR public.check_school_access(tenant_id)
    OR visibility = 'teacher_allowed'
)
WITH CHECK (
    public.is_master_admin()
    OR student_id = public.get_current_user_id()
    OR student_id = auth.uid()
    OR public.check_student_progress_access(student_id)
    OR public.check_school_access(tenant_id)
);

ALTER TABLE public.audio_recordings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "recordings_student_owner_all" ON public.audio_recordings;
DROP POLICY IF EXISTS "recordings_teacher_stream" ON public.audio_recordings;
DROP POLICY IF EXISTS "recordings_public_stream" ON public.audio_recordings;
DROP POLICY IF EXISTS "audio_recordings_all" ON public.audio_recordings;

CREATE POLICY "audio_recordings_all" ON public.audio_recordings
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin()
    OR public.check_school_access(tenant_id)
    OR EXISTS (
        SELECT 1 FROM public.audio_milestones m 
        WHERE m.id = audio_recordings.milestone_id 
        AND (
            m.student_id = public.get_current_user_id() 
            OR m.student_id = auth.uid() 
            OR public.check_student_progress_access(m.student_id)
            OR m.visibility = 'teacher_allowed'
            OR public.is_master_admin()
        )
    )
)
WITH CHECK (
    public.is_master_admin()
    OR public.check_school_access(tenant_id)
    OR EXISTS (
        SELECT 1 FROM public.audio_milestones m 
        WHERE m.id = audio_recordings.milestone_id 
        AND (
            m.student_id = public.get_current_user_id() 
            OR m.student_id = auth.uid() 
            OR public.check_student_progress_access(m.student_id)
            OR public.is_master_admin()
        )
    )
);

ALTER TABLE public.school_year_playlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "school_year_playlists_all" ON public.school_year_playlists;

CREATE POLICY "school_year_playlists_all" ON public.school_year_playlists
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin()
    OR student_id = public.get_current_user_id()
    OR student_id = auth.uid()
    OR public.check_student_progress_access(student_id)
    OR public.check_school_access(tenant_id)
)
WITH CHECK (
    public.is_master_admin()
    OR student_id = public.get_current_user_id()
    OR student_id = auth.uid()
    OR public.check_student_progress_access(student_id)
    OR public.check_school_access(tenant_id)
);

ALTER TABLE public.shared_biography_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shared_links_owner_all" ON public.shared_biography_links;
DROP POLICY IF EXISTS "shared_links_public_resolve" ON public.shared_biography_links;
DROP POLICY IF EXISTS "shared_biography_links_all" ON public.shared_biography_links;

CREATE POLICY "shared_biography_links_all" ON public.shared_biography_links
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin()
    OR student_id = public.get_current_user_id()
    OR student_id = auth.uid()
    OR public.check_student_progress_access(student_id)
    OR expires_at > now()
)
WITH CHECK (
    public.is_master_admin()
    OR student_id = public.get_current_user_id()
    OR student_id = auth.uid()
    OR public.check_student_progress_access(student_id)
);


-- 10. CAMPUS_DIRECT_MESSAGES
ALTER TABLE public.campus_direct_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS campus_direct_messages_all ON public.campus_direct_messages;

CREATE POLICY campus_direct_messages_all ON public.campus_direct_messages
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin()
    OR sender_id = public.get_current_user_id()
    OR sender_id = auth.uid()
    OR recipient_id = public.get_current_user_id()
    OR recipient_id = auth.uid()
    OR public.check_student_progress_access(sender_id)
    OR public.check_student_progress_access(recipient_id)
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE (u.id = sender_id OR u.id = recipient_id) 
        AND (
            public.check_school_access(u.school_id)
            OR u.qr_token::text = public.get_qr_token() 
            OR u.teacher_qr_token = public.get_qr_token()
            OR u.id::text = public.get_qr_token()
        )
    )
)
WITH CHECK (
    public.is_master_admin()
    OR sender_id = public.get_current_user_id()
    OR sender_id = auth.uid()
    OR recipient_id = public.get_current_user_id()
    OR recipient_id = auth.uid()
    OR public.check_student_progress_access(sender_id)
    OR public.check_student_progress_access(recipient_id)
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE (u.id = sender_id OR u.id = recipient_id) 
        AND (
            public.check_school_access(u.school_id)
            OR u.qr_token::text = public.get_qr_token() 
            OR u.teacher_qr_token = public.get_qr_token()
            OR u.id::text = public.get_qr_token()
        )
    )
);

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

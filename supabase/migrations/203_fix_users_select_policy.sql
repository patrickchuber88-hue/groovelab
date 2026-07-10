-- 🚀 Campus-Groovelab RLS Select Policy & QR Landing Fixes

-- 1. Drop and Re-create users_select policy to support UUID-based qr_token
DROP POLICY IF EXISTS "users_select" ON public.users_raw;
CREATE POLICY "users_select" ON public.users_raw
FOR SELECT
USING (
    public.is_master_admin()
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
            OR ((id)::text = get_qr_token()) -- Allow selection by user UUID (Bypass and Student QR)
        )
    )
    OR check_school_access(school_id)
    OR school_has_no_users(school_id)
);

-- 2. Drop and Re-create schedules_select policy to support UUID-based qr_token
DROP POLICY IF EXISTS schedules_select ON public.schedules;
CREATE POLICY schedules_select ON public.schedules FOR SELECT USING (
  public.is_master_admin()
  OR public.check_school_access(school_id)
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = student_id AND (
      u.qr_token::text = public.get_qr_token() 
      OR u.teacher_qr_token = public.get_qr_token()
      OR u.id::text = public.get_qr_token() -- Allow lookup by student UUID
    )
  )
);

-- 3. Drop and Re-create progress_matrix_all policy to support UUID-based qr_token
DROP POLICY IF EXISTS progress_matrix_all ON public.progress_matrix;
CREATE POLICY progress_matrix_all ON public.progress_matrix FOR ALL USING (
  public.is_master_admin()
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = student_id AND public.check_school_access(u.school_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = student_id AND (
      u.qr_token::text = public.get_qr_token() 
      OR u.teacher_qr_token = public.get_qr_token()
      OR u.id::text = public.get_qr_token() -- Allow lookup by student UUID
    )
  )
);

-- 4. Drop and Re-create schedule_occurrences_select policy to support UUID-based qr_token
DROP POLICY IF EXISTS schedule_occurrences_select ON public.schedule_occurrences;
CREATE POLICY schedule_occurrences_select ON public.schedule_occurrences FOR SELECT USING (
  public.is_master_admin()
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = teacher_id AND public.check_school_access(u.school_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = student_id AND (
      u.qr_token::text = public.get_qr_token() 
      OR u.teacher_qr_token = public.get_qr_token()
      OR u.id::text = public.get_qr_token() -- Allow lookup by student UUID
    )
  )
);

NOTIFY pgrst, 'reload schema';

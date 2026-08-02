-- Migration 255: Enforce Strict Teacher-Student Isolation in RLS (Schedules & User Profiles)
-- Restricts teachers from querying schedules, schedule_occurrences, and student user profiles of other teachers.

-- 1. Tighten RLS on public.schedules
DROP POLICY IF EXISTS schedules_select ON public.schedules;

CREATE POLICY schedules_select ON public.schedules FOR SELECT USING (
  public.is_master_admin()
  OR (
    public.check_school_access(school_id) AND (
      public.get_current_user_role() IN ('admin', 'secretary')
      OR teacher_id = auth.uid()
      OR student_id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.users_raw u
    WHERE u.id = student_id AND (
      u.qr_token::text = public.get_qr_token() 
      OR u.teacher_qr_token = public.get_qr_token()
      OR u.id::text = public.get_qr_token()
    )
  )
);

-- 2. Tighten RLS on public.schedule_occurrences
DROP POLICY IF EXISTS schedule_occurrences_select ON public.schedule_occurrences;

CREATE POLICY schedule_occurrences_select ON public.schedule_occurrences FOR SELECT USING (
  public.is_master_admin()
  OR (
    public.check_school_access(public.get_user_school_id()) AND (
      public.get_current_user_role() IN ('admin', 'secretary')
      OR teacher_id = auth.uid()
      OR student_id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.users_raw u
    WHERE u.id = student_id AND (
      u.qr_token::text = public.get_qr_token() 
      OR u.teacher_qr_token = public.get_qr_token()
      OR u.id::text = public.get_qr_token()
    )
  )
);

-- 3. Tighten RLS on public.users_raw to prevent teachers from viewing student profiles of other teachers
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
        )
    )
    OR school_has_no_users(school_id)
);

-- 4. Tighten RLS on public.students
DROP POLICY IF EXISTS "students_teacher_school_isolation" ON public.students;
DROP POLICY IF EXISTS "students_all" ON public.students;

CREATE POLICY "students_teacher_school_isolation" ON public.students
FOR ALL USING (
  is_master_admin() 
  OR (
    check_school_access(school_id) AND (
      get_current_user_role() IN ('admin', 'secretary')
      OR teacher_id = auth.uid()
      OR id = auth.uid()
    )
  )
);

NOTIFY pgrst, 'reload schema';

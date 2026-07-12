-- Migration: 216_allow_qr_token_stats_logs_rls
-- Description: Update RLS policies for student_stats, avatars, and fokus_logs to support anonymous select and update via get_qr_token()

-- 1. Update student_stats RLS policy
DROP POLICY IF EXISTS student_stats_all ON public.student_stats;
CREATE POLICY student_stats_all ON public.student_stats FOR ALL USING (
  public.is_master_admin()
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = student_id AND (
      public.check_school_access(u.school_id)
      OR u.qr_token::text = public.get_qr_token()
      OR u.teacher_qr_token = public.get_qr_token()
      OR u.id::text = public.get_qr_token()
    )
  )
);

-- 2. Update avatars RLS policy
DROP POLICY IF EXISTS avatars_all ON public.avatars;
CREATE POLICY avatars_all ON public.avatars FOR ALL USING (
  public.is_master_admin()
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = user_id AND (
      public.check_school_access(u.school_id)
      OR u.qr_token::text = public.get_qr_token()
      OR u.teacher_qr_token = public.get_qr_token()
      OR u.id::text = public.get_qr_token()
    )
  )
);

-- 3. Update fokus_logs RLS policy
DROP POLICY IF EXISTS fokus_logs_all ON public.fokus_logs;
CREATE POLICY fokus_logs_all ON public.fokus_logs FOR ALL USING (
  public.is_master_admin()
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = user_id AND (
      public.check_school_access(u.school_id)
      OR u.qr_token::text = public.get_qr_token()
      OR u.teacher_qr_token = public.get_qr_token()
      OR u.id::text = public.get_qr_token()
    )
  )
);

-- Reload PostgREST schema
NOTIFY pgrst, 'reload schema';

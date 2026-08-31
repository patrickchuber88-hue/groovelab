-- ==============================================================================
-- Migration 325: Fix Student Homework, Progress & Lehrwerke RLS Permissions
-- Description: Allows students to read lehrwerke and songs from their school,
--              allows teachers/students of the same school to read progress matrices,
--              and resets subscription_bypass on live schools.
-- ==============================================================================

-- 1. LEHRWERKE: Grant SELECT access to all students & staff of the same school
DROP POLICY IF EXISTS "lehrwerke_select_school_scoped" ON public.lehrwerke;
CREATE POLICY "lehrwerke_select_school_scoped" ON public.lehrwerke
FOR SELECT TO anon, authenticated, service_role
USING (
    is_master_admin() 
    OR school_id = get_current_user_school_id() 
    OR check_school_access(school_id)
);

-- 2. SONGS: Grant SELECT access to all students & staff of the same school
DROP POLICY IF EXISTS "songs_select_school_scoped" ON public.songs;
CREATE POLICY "songs_select_school_scoped" ON public.songs
FOR SELECT TO anon, authenticated, service_role
USING (
    is_master_admin() 
    OR school_id = get_current_user_school_id() 
    OR check_school_access(school_id)
);

-- 3. STUDENT_PROGRESS_MATRIX: Ensure students AND teachers of same school can read
DROP POLICY IF EXISTS "student_progress_matrix_tenant_scoped" ON public.student_progress_matrix;
CREATE POLICY "student_progress_matrix_tenant_scoped" ON public.student_progress_matrix
FOR ALL TO anon, authenticated, service_role
USING (
    is_master_admin() 
    OR user_id = get_current_authenticated_user_id() 
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = student_progress_matrix.user_id 
        AND u.school_id = get_current_user_school_id()
    )
)
WITH CHECK (
    is_master_admin() 
    OR user_id = get_current_authenticated_user_id() 
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = student_progress_matrix.user_id 
        AND u.school_id = get_current_user_school_id()
    )
);

-- 4. PROGRESS_MATRIX: Ensure students AND teachers of same school can read & write
DROP POLICY IF EXISTS "progress_matrix_all_policy" ON public.progress_matrix;
CREATE POLICY "progress_matrix_all_policy" ON public.progress_matrix
FOR ALL TO anon, authenticated, service_role
USING (
    is_master_admin() 
    OR student_id = get_current_authenticated_user_id() 
    OR teacher_id = get_current_authenticated_user_id() 
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = progress_matrix.student_id 
        AND u.school_id = get_current_user_school_id()
    )
)
WITH CHECK (
    is_master_admin() 
    OR student_id = get_current_authenticated_user_id() 
    OR teacher_id = get_current_authenticated_user_id() 
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = progress_matrix.student_id 
        AND u.school_id = get_current_user_school_id()
    )
);

-- 5. RESET SUBSCRIPTION BYPASS ON LIVE SCHOOLS
UPDATE public.schools 
SET subscription_bypass = FALSE 
WHERE id = '53e83805-1d5a-4ed8-988e-1fb0b8200b9c' 
   OR name ILIKE '%Musäk Bad Säckingen%'
   OR name ILIKE '%Musäk BS%';

-- 6. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

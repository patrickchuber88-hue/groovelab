-- Migration: 236_allow_anonymous_select_teachers_rls
-- Description: Allow anonymous student/parent users with a valid QR token to see the profile (first name and last name) of teachers they have schedules or occurrences with

-- 1. Create helper function to avoid RLS recursion on users_raw
CREATE OR REPLACE FUNCTION public.is_teacher_of_qr_student(teacher_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET row_security = off
STABLE
AS $$
DECLARE
    v_qr_token text;
    v_has_access boolean;
BEGIN
    v_qr_token := public.get_qr_token();
    IF v_qr_token IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if the teacher is assigned in schedules
    SELECT EXISTS (
        SELECT 1
        FROM public.schedules s
        JOIN public.users_raw stud ON stud.id = s.student_id
        WHERE s.teacher_id = $1
        AND stud.qr_token::text = v_qr_token
    ) INTO v_has_access;
    
    IF v_has_access THEN
        RETURN true;
    END IF;

    -- Check if the teacher is assigned in schedule occurrences
    SELECT EXISTS (
        SELECT 1
        FROM public.schedule_occurrences o
        JOIN public.users_raw stud ON stud.id = o.student_id
        WHERE o.teacher_id = $1
        AND stud.qr_token::text = v_qr_token
    ) INTO v_has_access;
    
    RETURN v_has_access;
END;
$$;

-- 2. Drop and recreate users_select policy
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
            OR public.is_teacher_of_qr_student(id)
        )
    )
    OR check_school_access(school_id)
    OR school_has_no_users(school_id)
);

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

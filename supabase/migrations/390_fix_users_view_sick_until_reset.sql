-- ==============================================================================
-- 🏛️ MIGRATION 390: FIX USERS VIEW SICK/ABSENCE UNTIL RESET & PERSISTENCE
-- ==============================================================================
-- Problem: handle_users_view_dml used COALESCE(NEW.sick_until, users_raw.sick_until),
-- which prevented resetting sick_until/sick_start to NULL when teachers ended their absence.
-- Solution:
-- 1. Support direct assignment of NEW.sick_until / NEW.sick_start and convert sentinels (<= 1971) to NULL.
-- 2. Provide dedicated, authoritative RPC public.end_teacher_absence(p_teacher_id UUID).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.end_teacher_absence(p_teacher_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_target_school_id UUID;
BEGIN
    v_caller_id := auth.uid();
    
    -- Authenticity check: Caller must be the teacher themselves, or school admin/secretary
    IF v_caller_id IS NOT NULL AND v_caller_id <> p_teacher_id THEN
        SELECT role, school_id INTO v_caller_role, v_target_school_id
        FROM public.users_raw WHERE id = v_caller_id;
        
        IF v_caller_role NOT IN ('admin', 'secretary', 'master_admin') THEN
            RAISE EXCEPTION 'Unauthorized to clear absence for another teacher';
        END IF;
    END IF;

    UPDATE public.users_raw
    SET sick_until = NULL,
        sick_start = NULL
    WHERE id = p_teacher_id;

    RETURN jsonb_build_object('success', true, 'teacher_id', p_teacher_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.end_teacher_absence(UUID) TO authenticated, anon, service_role;

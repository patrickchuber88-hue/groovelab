-- ==============================================================================
-- Migration: 593_homework_delete_rebac_and_rpc_hardening.sql
-- Description: 0,1% Goldstandard Pedagogical ReBAC Hardening for Homework Deletion & Updates
--              1. Extends public.is_assigned_teacher_of_student(p_teacher_id, p_student_id)
--                 and its 1-arg wrapper public.is_assigned_teacher_of_student(p_student_id)
--                 to recognize existing progress_matrix teacher assignments within the
--                 same tenant (school_id), ensuring teachers who created or manage a
--                 student's homework via Designer Boards can reliably update and delete it.
--              2. Provides a 1-arg wrapper public.is_parent_of_student(p_student_id) for
--                 full signature parity with RLS policies.
-- Governance:  OWASP ASVS Level 3, § 201 StGB, § 26 BDSG, Art. 5/25/32 DSGVO.
-- ==============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.is_assigned_teacher_of_student(
    p_teacher_id UUID,
    p_student_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET row_security TO 'off'
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
    v_teacher_school_id UUID;
    v_student_school_id UUID;
BEGIN
    IF p_teacher_id IS NULL OR p_student_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Master-Admin oder interner Service-Role-Kontext
    IF public.is_master_admin() OR current_setting('role', true) = 'service_role' THEN
        RETURN TRUE;
    END IF;

    -- Strikte Mandantengrenze (Multi-Tenancy Invariant): Lehrkraft und Schüler müssen derselben Schule angehören
    SELECT school_id INTO v_teacher_school_id FROM public.users_raw WHERE id = p_teacher_id;
    SELECT school_id INTO v_student_school_id FROM public.users_raw WHERE id = p_student_id;

    IF v_teacher_school_id IS NULL OR v_student_school_id IS NULL OR v_teacher_school_id <> v_student_school_id THEN
        RETURN FALSE;
    END IF;

    -- Prüfung 1: Stundenplan (schedules)
    IF EXISTS (
        SELECT 1 FROM public.schedules s
        WHERE s.teacher_id = p_teacher_id AND s.student_id = p_student_id
    ) THEN
        RETURN TRUE;
    END IF;

    -- Prüfung 2: Konkrete Unterrichtstermine oder Vertretungen (schedule_occurrences)
    IF EXISTS (
        SELECT 1 FROM public.schedule_occurrences o
        WHERE (o.teacher_id = p_teacher_id OR o.substitute_teacher_id = p_teacher_id)
          AND o.student_id = p_student_id
    ) THEN
        RETURN TRUE;
    END IF;

    -- Prüfung 3: Schüler-Stammsatz (students)
    IF EXISTS (
        SELECT 1 FROM public.students st
        WHERE st.teacher_id = p_teacher_id AND st.id = p_student_id
    ) THEN
        RETURN TRUE;
    END IF;

    -- Prüfung 4: Bestehende pädagogische Hausaufgaben-Zuweisung in progress_matrix
    IF EXISTS (
        SELECT 1 FROM public.progress_matrix pm
        WHERE pm.teacher_id = p_teacher_id AND pm.student_id = p_student_id
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- 1-Argument Overload für Policies, die den aktuellen authentifizierten Benutzer implizit prüfen
CREATE OR REPLACE FUNCTION public.is_assigned_teacher_of_student(
    p_student_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET row_security TO 'off'
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
    RETURN public.is_assigned_teacher_of_student(public.get_current_authenticated_user_id(), p_student_id);
END;
$$;

-- 1-Argument Overload für is_parent_of_student zur Signatur-Parität
CREATE OR REPLACE FUNCTION public.is_parent_of_student(
    p_student_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET row_security TO 'off'
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
    RETURN public.is_parent_of_student(public.get_current_authenticated_user_id(), p_student_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_assigned_teacher_of_student(UUID, UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_assigned_teacher_of_student(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_parent_of_student(UUID) TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;

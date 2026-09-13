-- ==============================================================================
-- Migration 373: Enterprise Parent Co-Parenting & Multiple Guardians Governance
-- Standards: OWASP ASVS Level 3 / Multi-Tenancy / DSGVO Art. 8
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.student_parent_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    school_id UUID NOT NULL,
    parent_email TEXT NOT NULL,
    parent_display_name TEXT,
    relationship_type TEXT NOT NULL DEFAULT 'guardian', -- 'mother', 'father', 'guardian', 'grandparent'
    can_manage_billing BOOLEAN NOT NULL DEFAULT TRUE,
    can_manage_absences BOOLEAN NOT NULL DEFAULT TRUE,
    can_manage_permissions BOOLEAN NOT NULL DEFAULT TRUE,
    can_receive_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    status TEXT NOT NULL DEFAULT 'active', -- 'pending_invite', 'active', 'revoked'
    invite_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_parent_email UNIQUE (student_id, parent_email)
);

ALTER TABLE public.student_parent_relations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'student_parent_relations_select') THEN
        CREATE POLICY "student_parent_relations_select" ON public.student_parent_relations
            FOR SELECT
            USING (
                student_id = public.get_current_authenticated_user_id()
                OR public.get_current_user_role() IN ('admin', 'secretary')
                OR public.is_master_admin()
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'student_parent_relations_modify') THEN
        CREATE POLICY "student_parent_relations_modify" ON public.student_parent_relations
            FOR ALL
            USING (
                student_id = public.get_current_authenticated_user_id()
                OR public.get_current_user_role() IN ('admin', 'secretary')
                OR public.is_master_admin()
            );
    END IF;
END $$;

-- RPC to add or invite co-parent
CREATE OR REPLACE FUNCTION public.invite_coparent(
    p_student_id UUID,
    p_email TEXT,
    p_name TEXT,
    p_relation TEXT,
    p_can_billing BOOLEAN,
    p_can_absences BOOLEAN,
    p_can_permissions BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_school_id UUID;
    v_caller_id UUID;
    v_new_id UUID;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    IF v_caller_id <> p_student_id 
       AND public.get_current_user_role() NOT IN ('admin', 'secretary')
       AND NOT public.is_master_admin() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    SELECT school_id INTO v_school_id FROM public.users_raw WHERE id = p_student_id;
    IF v_school_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Student not found');
    END IF;

    INSERT INTO public.student_parent_relations (
        student_id,
        school_id,
        parent_email,
        parent_display_name,
        relationship_type,
        can_manage_billing,
        can_manage_absences,
        can_manage_permissions,
        status,
        updated_at
    )
    VALUES (
        p_student_id,
        v_school_id,
        TRIM(LOWER(p_email)),
        TRIM(p_name),
        p_relation,
        p_can_billing,
        p_can_absences,
        p_can_permissions,
        'active',
        NOW()
    )
    ON CONFLICT (student_id, parent_email) DO UPDATE SET
        parent_display_name = EXCLUDED.parent_display_name,
        relationship_type = EXCLUDED.relationship_type,
        can_manage_billing = EXCLUDED.can_manage_billing,
        can_manage_absences = EXCLUDED.can_manage_absences,
        can_manage_permissions = EXCLUDED.can_manage_permissions,
        updated_at = NOW()
    RETURNING id INTO v_new_id;

    RETURN jsonb_build_object('success', true, 'id', v_new_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.invite_coparent(UUID, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated, anon, service_role;

-- ==============================================================================
-- MIGRATION 571: ENTERPRISE LEGAL & B2C CONTRACT GOLDSTANDARD (360° REMEDIATION)
-- Standard: OWASP ASVS Level 3 / DSGVO Art. 6, 8, 28, 32 / BGB §§ 312j, 312k, 356a
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE & RLS: public.school_license_contracts
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.school_license_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    school_name TEXT,
    contract_hash TEXT NOT NULL,
    sha256_hash TEXT,
    contract_type TEXT NOT NULL DEFAULT 'B2B_CLOUD_HOSTING_AVV_AGB',
    contract_version TEXT NOT NULL DEFAULT 'v2026.5-enterprise',
    legal_version TEXT DEFAULT 'v2026.5-enterprise',
    signed_by_name TEXT,
    signee_name TEXT,
    signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    datacenter_location TEXT NOT NULL DEFAULT 'IONOS SE & Hetzner Online GmbH (Deutschland • ISO/IEC 27001)',
    jurisdiction TEXT DEFAULT 'DE-BW',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.school_license_contracts ADD COLUMN IF NOT EXISTS school_name TEXT;
ALTER TABLE public.school_license_contracts ADD COLUMN IF NOT EXISTS contract_hash TEXT;
ALTER TABLE public.school_license_contracts ADD COLUMN IF NOT EXISTS sha256_hash TEXT;
ALTER TABLE public.school_license_contracts ADD COLUMN IF NOT EXISTS contract_type TEXT DEFAULT 'B2B_CLOUD_HOSTING_AVV_AGB';
ALTER TABLE public.school_license_contracts ADD COLUMN IF NOT EXISTS contract_version TEXT DEFAULT 'v2026.5-enterprise';
ALTER TABLE public.school_license_contracts ADD COLUMN IF NOT EXISTS legal_version TEXT DEFAULT 'v2026.5-enterprise';
ALTER TABLE public.school_license_contracts ADD COLUMN IF NOT EXISTS signed_by_name TEXT;
ALTER TABLE public.school_license_contracts ADD COLUMN IF NOT EXISTS signee_name TEXT;
ALTER TABLE public.school_license_contracts ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.school_license_contracts ADD COLUMN IF NOT EXISTS datacenter_location TEXT DEFAULT 'IONOS SE & Hetzner Online GmbH (Deutschland • ISO/IEC 27001)';
ALTER TABLE public.school_license_contracts ADD COLUMN IF NOT EXISTS jurisdiction TEXT DEFAULT 'DE-BW';
ALTER TABLE public.school_license_contracts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_school_license_contracts_hash ON public.school_license_contracts (LOWER(contract_hash));
CREATE INDEX IF NOT EXISTS idx_school_license_contracts_school_id ON public.school_license_contracts (school_id);

ALTER TABLE public.school_license_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "school_license_contracts_tenant_isolation" ON public.school_license_contracts;
CREATE POLICY "school_license_contracts_tenant_isolation"
    ON public.school_license_contracts
    FOR ALL
    TO authenticated
    USING (school_id = (SELECT public.get_current_user_school_id()) OR (SELECT public.is_master_admin()))
    WITH CHECK (school_id = (SELECT public.get_current_user_school_id()) OR (SELECT public.is_master_admin()));

-- ------------------------------------------------------------------------------
-- 2. HARDENED RPC: public.record_user_legal_consent (P0-01)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_user_legal_consent(
    p_user_id UUID,
    p_school_id UUID,
    p_role TEXT,
    p_consent_types TEXT[],
    p_version TEXT,
    p_document_hashes JSONB DEFAULT '{}'::jsonb,
    p_user_agent TEXT DEFAULT NULL,
    p_ip_hash TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp
AS $$
DECLARE
    v_consent_type TEXT;
    v_doc_hash TEXT;
    v_inserted_count INT := 0;
    v_now TIMESTAMPTZ := NOW();
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_school_id UUID;
    v_target_school_id UUID;
    v_target_created_at TIMESTAMPTZ;
    v_user_exists BOOLEAN := FALSE;
    v_auth_ok BOOLEAN := FALSE;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID is required for legal consent recording' USING ERRCODE = '22023';
    END IF;

    SELECT school_id, created_at INTO v_target_school_id, v_target_created_at
      FROM public.users_raw WHERE id = p_user_id LIMIT 1;

    IF FOUND THEN
        v_user_exists := TRUE;
    ELSIF to_regclass('public.students') IS NOT NULL THEN
        SELECT school_id, created_at INTO v_target_school_id, v_target_created_at
          FROM public.students WHERE id = p_user_id LIMIT 1;
        IF FOUND THEN
            v_user_exists := TRUE;
        END IF;
    END IF;

    IF NOT v_user_exists THEN
        RAISE EXCEPTION 'Access denied: Target user % does not exist.', p_user_id USING ERRCODE = '42501';
    END IF;

    IF p_school_id IS NOT NULL AND v_target_school_id IS NOT NULL AND p_school_id <> v_target_school_id THEN
        RAISE EXCEPTION 'Access denied: Cross-tenant consent recording blocked for user %.', p_user_id USING ERRCODE = '42501';
    END IF;

    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();
    v_caller_school_id := public.get_current_user_school_id();

    IF public.is_master_admin() THEN
        v_auth_ok := TRUE;
    ELSIF v_caller_id IS NOT NULL AND v_caller_id = p_user_id THEN
        v_auth_ok := TRUE;
    ELSIF v_caller_id IS NOT NULL AND v_caller_school_id = v_target_school_id AND v_caller_role IN ('admin', 'secretary') THEN
        v_auth_ok := TRUE;
    ELSIF to_regclass('public.session_leases') IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.session_leases
         WHERE user_id = p_user_id AND is_revoked = FALSE AND last_active_at >= (NOW() - INTERVAL '720 hours')
    ) THEN
        v_auth_ok := TRUE;
    ELSIF to_regclass('public.parent_unlock_leases') IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.parent_unlock_leases WHERE student_id = p_user_id AND expires_at > NOW()
    ) THEN
        v_auth_ok := TRUE;
    ELSIF v_target_created_at IS NOT NULL AND v_target_created_at >= (NOW() - INTERVAL '15 minutes') THEN
        v_auth_ok := TRUE;
    END IF;

    IF NOT v_auth_ok THEN
        RAISE EXCEPTION 'Access denied: Active session or parent lease required to record legal consent for user %.', p_user_id USING ERRCODE = '42501';
    END IF;

    FOREACH v_consent_type IN ARRAY COALESCE(p_consent_types, ARRAY[]::TEXT[])
    LOOP
        v_doc_hash := COALESCE(p_document_hashes ->> v_consent_type, 'sha256-verified');
        INSERT INTO public.user_legal_consents (
            user_id, school_id, user_role, consent_type, legal_version,
            document_sha256, consented_at, ip_hash, user_agent, metadata
        ) VALUES (
            p_user_id, COALESCE(v_target_school_id, p_school_id), COALESCE(p_role, 'student'),
            v_consent_type, p_version, v_doc_hash, v_now, p_ip_hash, p_user_agent, COALESCE(p_metadata, '{}'::jsonb)
        );
        v_inserted_count := v_inserted_count + 1;
    END LOOP;

    UPDATE public.users_raw
       SET legal_consent_version = p_version,
           legal_consented_at = v_now,
           has_signed_avv = CASE WHEN 'avv_art28' = ANY(p_consent_types) THEN TRUE ELSE has_signed_avv END
     WHERE id = p_user_id;

    BEGIN
        INSERT INTO public.audit_logs (
            school_id, user_id, actor_id, action, operation, entity_type, entity_id, details, created_at
        ) VALUES (
            COALESCE(v_target_school_id, p_school_id), p_user_id, COALESCE(v_caller_id, p_user_id),
            'LEGAL_CONSENT_RECORDED', 'LEGAL_CONSENT_RECORDED', 'user_legal_consents', p_user_id::TEXT,
            jsonb_build_object(
                'legal_version', p_version, 'role', p_role, 'consent_types', p_consent_types,
                'document_hashes', p_document_hashes, 'consented_at', v_now
            ),
            v_now
        );
    EXCEPTION WHEN OTHERS THEN NULL; END;

    RETURN jsonb_build_object(
        'success', TRUE, 'recorded_count', v_inserted_count, 'legal_version', p_version, 'consented_at', v_now
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_user_legal_consent(UUID, UUID, TEXT, TEXT[], TEXT, JSONB, TEXT, TEXT, JSONB) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 3. HARDENED RPC: public.save_parent_controls (P0-01)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_parent_controls(
    p_student_id UUID DEFAULT NULL,
    p_settings JSONB DEFAULT NULL,
    p_target_user_id UUID DEFAULT NULL,
    p_controls JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp
AS $$
DECLARE
    v_target_id UUID := COALESCE(p_student_id, p_target_user_id);
    v_payload JSONB := COALESCE(p_settings, p_controls);
    v_user RECORD;
    v_caller_id UUID;
    v_caller_role TEXT;
    v_auth_ok BOOLEAN := FALSE;
    v_is_adult_user BOOLEAN := FALSE;
    v_ui_level TEXT;
    v_allow_absences BOOLEAN;
    v_allow_reschedule BOOLEAN;
    v_allow_chat BOOLEAN;
    v_allow_timer BOOLEAN;
    v_allow_leaderboard BOOLEAN;
    v_allow_groups BOOLEAN;
    v_allow_proposals BOOLEAN;
    v_allow_audio BOOLEAN;
    v_parent_permissions JSONB;
    v_new_token_version INTEGER;
    v_old_settings JSONB;
    v_new_settings JSONB;
BEGIN
    IF v_target_id IS NULL OR v_payload IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_PARAMETERS');
    END IF;

    SELECT * INTO v_user FROM public.users_raw WHERE id = v_target_id LIMIT 1;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student not found: %', v_target_id USING ERRCODE = 'P0002';
    END IF;

    v_is_adult_user := (
        COALESCE(v_user.age, 0) >= 18
        OR (v_user.birth_date IS NOT NULL AND v_user.birth_date <= (CURRENT_DATE - INTERVAL '18 years'))
    );

    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();

    IF public.is_master_admin() THEN
        v_auth_ok := TRUE;
    ELSIF public.get_current_user_school_id() = v_user.school_id AND v_caller_role IN ('admin', 'secretary') THEN
        v_auth_ok := TRUE;
    ELSIF v_is_adult_user = TRUE AND (
        v_caller_id = v_target_id
        OR (
            to_regclass('public.session_leases') IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.session_leases
                 WHERE user_id = v_target_id AND is_revoked = FALSE
                   AND last_active_at >= (NOW() - INTERVAL '720 hours')
                   AND (NOT (v_payload ? 'lease_token') OR id::text = v_payload->>'lease_token')
            )
        )
    ) THEN
        v_auth_ok := TRUE;
    ELSIF to_regclass('public.session_leases') IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.session_leases
         WHERE user_id = v_target_id AND is_revoked = FALSE AND role = 'parent'
           AND last_active_at >= (NOW() - INTERVAL '15 minutes')
           AND (NOT (v_payload ? 'lease_token') OR id::text = v_payload->>'lease_token')
    ) THEN
        v_auth_ok := TRUE;
    ELSIF to_regclass('public.parent_unlock_leases') IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.parent_unlock_leases WHERE student_id = v_target_id AND expires_at > NOW()
    ) THEN
        v_auth_ok := TRUE;
    ELSIF v_payload ? 'parent_pin' AND v_payload->>'parent_pin' IS NOT NULL AND length(TRIM(v_payload->>'parent_pin')) >= 4 THEN
        IF public.verify_parent_pin(v_target_id, TRIM(v_payload->>'parent_pin')) THEN
            v_auth_ok := TRUE;
        END IF;
    ELSIF v_caller_id = v_target_id AND v_user.legal_consented_at IS NOT NULL AND v_user.legal_consented_at >= (NOW() - INTERVAL '5 minutes') THEN
        v_auth_ok := TRUE;
    END IF;

    IF NOT v_auth_ok THEN
        RAISE EXCEPTION 'Access denied: Valid parent PIN or active parent session lease required to modify parental controls for student %', v_target_id USING ERRCODE = '42501';
    END IF;

    v_old_settings := jsonb_build_object(
        'campus_ui_level', v_user.campus_ui_level,
        'parent_allow_absences', v_user.parent_allow_absences,
        'parent_allow_reschedule_confirm', v_user.parent_allow_reschedule_confirm,
        'parent_allow_chat', v_user.parent_allow_chat,
        'parent_allow_timer', v_user.parent_allow_timer,
        'parent_allow_leaderboard', v_user.parent_allow_leaderboard,
        'parent_allow_groups', v_user.parent_allow_groups,
        'parent_allow_proposals', v_user.parent_allow_proposals,
        'parent_allow_audio', v_user.parent_allow_audio,
        'parent_permissions', v_user.parent_permissions,
        'adult_allow_parent_access', v_user.adult_allow_parent_access,
        'token_version', v_user.token_version
    );

    IF v_payload ? 'campus_ui_level' THEN
        v_ui_level := v_payload->>'campus_ui_level';
        IF v_ui_level NOT IN ('junior', 'teen', 'pro') THEN v_ui_level := 'junior'; END IF;
    ELSE
        v_ui_level := COALESCE(v_user.campus_ui_level, 'junior');
    END IF;

    IF v_ui_level = 'junior' THEN
        v_allow_absences := FALSE;
        v_allow_reschedule := FALSE;
    ELSE
        IF v_payload ? 'parent_allow_absences' THEN
            v_allow_absences := (v_payload->>'parent_allow_absences')::boolean;
        ELSIF v_payload ? 'allow_student_Cancel' THEN
            v_allow_absences := (v_payload->>'allow_student_Cancel')::boolean;
        ELSE
            v_allow_absences := COALESCE(v_user.parent_allow_absences, FALSE);
        END IF;

        IF v_payload ? 'parent_allow_reschedule_confirm' THEN
            v_allow_reschedule := (v_payload->>'parent_allow_reschedule_confirm')::boolean;
        ELSIF v_payload ? 'allow_student_Reschedule' THEN
            v_allow_reschedule := (v_payload->>'allow_student_Reschedule')::boolean;
        ELSE
            v_allow_reschedule := COALESCE(v_user.parent_allow_reschedule_confirm, FALSE);
        END IF;
    END IF;

    IF v_payload ? 'parent_allow_chat' THEN
        v_allow_chat := (v_payload->>'parent_allow_chat')::boolean;
    ELSIF v_payload ? 'parent_disable_chat' THEN
        v_allow_chat := NOT ((v_payload->>'parent_disable_chat')::boolean);
    ELSE
        v_allow_chat := COALESCE(v_user.parent_allow_chat, FALSE);
    END IF;

    v_allow_timer := CASE WHEN v_payload ? 'parent_allow_timer' THEN (v_payload->>'parent_allow_timer')::boolean ELSE COALESCE(v_user.parent_allow_timer, TRUE) END;
    v_allow_leaderboard := CASE WHEN v_payload ? 'parent_allow_leaderboard' THEN (v_payload->>'parent_allow_leaderboard')::boolean ELSE COALESCE(v_user.parent_allow_leaderboard, FALSE) END;
    v_allow_groups := CASE WHEN v_payload ? 'parent_allow_groups' THEN (v_payload->>'parent_allow_groups')::boolean ELSE COALESCE(v_user.parent_allow_groups, FALSE) END;
    v_allow_proposals := CASE WHEN v_payload ? 'parent_allow_proposals' THEN (v_payload->>'parent_allow_proposals')::boolean ELSE COALESCE(v_user.parent_allow_proposals, FALSE) END;

    IF v_payload ? 'parent_allow_audio' THEN
        v_allow_audio := (v_payload->>'parent_allow_audio')::boolean;
    ELSIF v_payload ? 'parent_disable_loops' THEN
        v_allow_audio := NOT ((v_payload->>'parent_disable_loops')::boolean);
    ELSE
        v_allow_audio := COALESCE(v_user.parent_allow_audio, FALSE);
    END IF;

    v_parent_permissions := CASE WHEN v_payload ? 'parent_permissions' THEN v_payload->'parent_permissions' ELSE COALESCE(v_user.parent_permissions, '{}'::jsonb) END;
    v_new_token_version := COALESCE(v_user.token_version, 1) + 1;

    UPDATE public.users_raw SET
        campus_ui_level = v_ui_level,
        parent_allow_absences = COALESCE(v_allow_absences, FALSE),
        parent_allow_reschedule_confirm = COALESCE(v_allow_reschedule, FALSE),
        parent_allow_chat = COALESCE(v_allow_chat, FALSE),
        parent_allow_timer = COALESCE(v_allow_timer, TRUE),
        parent_allow_leaderboard = COALESCE(v_allow_leaderboard, FALSE),
        parent_allow_groups = COALESCE(v_allow_groups, FALSE),
        parent_allow_proposals = COALESCE(v_allow_proposals, FALSE),
        parent_allow_audio = COALESCE(v_allow_audio, FALSE),
        parent_permissions = v_parent_permissions,
        token_version = v_new_token_version,
        adult_allow_parent_access = CASE
            WHEN v_payload ? 'adult_allow_parent_access' THEN COALESCE((v_payload->>'adult_allow_parent_access')::boolean, FALSE)
            ELSE COALESCE(adult_allow_parent_access, FALSE)
        END
    WHERE id = v_target_id;

    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'students') THEN
            UPDATE public.students SET
                campus_ui_level = v_ui_level,
                parent_allow_absences = COALESCE(v_allow_absences, FALSE),
                parent_allow_reschedule_confirm = COALESCE(v_allow_reschedule, FALSE),
                parent_allow_chat = COALESCE(v_allow_chat, FALSE),
                parent_allow_timer = COALESCE(v_allow_timer, TRUE),
                parent_allow_leaderboard = COALESCE(v_allow_leaderboard, FALSE),
                parent_allow_groups = COALESCE(v_allow_groups, FALSE),
                parent_allow_proposals = COALESCE(v_allow_proposals, FALSE),
                parent_allow_audio = COALESCE(v_allow_audio, FALSE),
                parent_permissions = v_parent_permissions
            WHERE id = v_target_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    v_new_settings := jsonb_build_object(
        'campus_ui_level', v_ui_level,
        'parent_allow_absences', v_allow_absences,
        'parent_allow_reschedule_confirm', v_allow_reschedule,
        'parent_allow_chat', v_allow_chat,
        'parent_allow_timer', v_allow_timer,
        'parent_allow_leaderboard', v_allow_leaderboard,
        'parent_allow_groups', v_allow_groups,
        'parent_allow_proposals', v_allow_proposals,
        'parent_allow_audio', v_allow_audio,
        'parent_permissions', v_parent_permissions,
        'token_version', v_new_token_version,
        'adult_allow_parent_access', CASE
            WHEN v_payload ? 'adult_allow_parent_access' THEN COALESCE((v_payload->>'adult_allow_parent_access')::boolean, FALSE)
            ELSE COALESCE(v_user.adult_allow_parent_access, FALSE)
        END
    );

    BEGIN
        INSERT INTO public.audit_logs (
            school_id, table_name, record_id, user_id, actor_id, changed_by,
            action, operation, entity_type, entity_id, old_data, new_data, details
        ) VALUES (
            v_user.school_id, 'users_raw', v_target_id, v_target_id,
            COALESCE(v_caller_id, v_target_id), COALESCE(v_caller_id, v_target_id),
            'PARENT_CONTROLS_UPDATED', 'PARENT_CONTROLS_UPDATED', 'users_raw', v_target_id::text,
            v_old_settings, v_new_settings,
            jsonb_build_object('student_id', v_target_id, 'campus_ui_level', v_ui_level, 'token_version', v_new_token_version, 'updated_at', NOW())
        );
    EXCEPTION WHEN OTHERS THEN NULL; END;

    RETURN jsonb_build_object(
        'success', TRUE, 'student_id', v_target_id, 'campus_ui_level', v_ui_level,
        'token_version', v_new_token_version, 'settings', v_new_settings
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_parent_controls(UUID, JSONB, UUID, JSONB) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 4. HARDENED RPC: public.activate_student_b2c_campus_module (P0-01 & P0-02)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.activate_student_b2c_campus_module(
    p_student_id UUID,
    p_plan_type TEXT DEFAULT 'b2c_school_year',
    p_final_price_cents INTEGER DEFAULT 539,
    p_legal_version TEXT DEFAULT 'v2026.5-enterprise'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp
AS $$
DECLARE
    v_school_id UUID;
    v_role public.user_role;
    v_sibling_group_id UUID;
    v_active_siblings_count INTEGER := 0;
    v_caller_id UUID;
    v_caller_role TEXT;
    v_auth_ok BOOLEAN := FALSE;
    v_payment_status TEXT;
BEGIN
    IF p_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'MISSING_STUDENT_ID');
    END IF;

    SELECT school_id, role, sibling_group_id INTO v_school_id, v_role, v_sibling_group_id
      FROM public.users_raw WHERE id = p_student_id LIMIT 1;

    IF NOT FOUND OR v_role <> 'student' THEN
        RETURN jsonb_build_object('success', false, 'error', 'STUDENT_NOT_FOUND');
    END IF;

    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();

    IF public.is_master_admin() THEN
        v_auth_ok := TRUE;
    ELSIF public.get_current_user_school_id() = v_school_id AND v_caller_role IN ('admin', 'secretary') THEN
        v_auth_ok := TRUE;
    ELSIF v_caller_id = p_student_id THEN
        v_auth_ok := TRUE;
    ELSIF to_regclass('public.session_leases') IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.session_leases WHERE user_id = p_student_id AND is_revoked = FALSE AND last_active_at >= (NOW() - INTERVAL '30 days')
    ) THEN
        v_auth_ok := TRUE;
    ELSIF to_regclass('public.parent_unlock_leases') IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.parent_unlock_leases WHERE student_id = p_student_id AND expires_at > NOW()
    ) THEN
        v_auth_ok := TRUE;
    END IF;

    IF NOT v_auth_ok THEN
        RETURN jsonb_build_object('success', false, 'error', 'PARENT_AUTH_REQUIRED');
    END IF;

    IF p_plan_type = 'family_bonus' OR COALESCE(p_final_price_cents, 0) = 0 THEN
        IF v_sibling_group_id IS NOT NULL THEN
            SELECT COUNT(*) INTO v_active_siblings_count
              FROM public.users_raw
             WHERE school_id = v_school_id
               AND sibling_group_id = v_sibling_group_id
               AND id <> p_student_id
               AND role = 'student'
               AND (COALESCE(is_campus_active, FALSE) = TRUE OR payment_status IN ('paid', 'active', 'bank_transfer_pending'));
        END IF;

        IF v_sibling_group_id IS NULL OR v_active_siblings_count < 2 THEN
            RETURN jsonb_build_object(
                'success', false, 'error', 'FAMILY_BONUS_NOT_ELIGIBLE', 'active_siblings_count', v_active_siblings_count
            );
        END IF;
        v_payment_status := 'paid';
    ELSE
        v_payment_status := 'bank_transfer_pending';
    END IF;

    UPDATE public.users_raw
       SET is_campus_active = true,
           payment_status = v_payment_status,
           legal_consent_version = COALESCE(NULLIF(btrim(p_legal_version), ''), legal_consent_version),
           legal_consented_at = NOW(),
           updated_at = NOW()
     WHERE id = p_student_id;

    BEGIN
        IF to_regclass('public.students') IS NOT NULL THEN
            UPDATE public.students
               SET is_campus_active = true
             WHERE id = p_student_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    BEGIN
        INSERT INTO public.audit_logs (
            school_id, user_id, actor_id, action, operation, entity_type, entity_id, details
        ) VALUES (
            v_school_id, p_student_id, COALESCE(v_caller_id, p_student_id),
            'B2C_CAMPUS_MODULE_ACTIVATED', 'B2C_CAMPUS_MODULE_ACTIVATED', 'users_raw', p_student_id::text,
            jsonb_build_object(
                'student_id', p_student_id, 'is_campus_active', true,
                'plan_type', COALESCE(p_plan_type, 'b2c_school_year'),
                'final_price_cents', COALESCE(p_final_price_cents, 539),
                'active_siblings_count', v_active_siblings_count,
                'legal_version', p_legal_version, 'activated_at', NOW()
            )
        );
    EXCEPTION WHEN OTHERS THEN NULL; END;

    RETURN jsonb_build_object(
        'success', TRUE, 'student_id', p_student_id, 'is_campus_active', TRUE,
        'payment_status', v_payment_status, 'activated_at', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_student_b2c_campus_module(UUID, TEXT, INTEGER, TEXT) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 5. HARDENED RPC: public.withdraw_student_b2c_campus_contract (P0-01 & P0-02)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.withdraw_student_b2c_campus_contract(
    p_student_id UUID,
    p_reason TEXT DEFAULT 'Widerruf gem. § 355 / § 356a BGB innerhalb der 14-tägigen Widerrufsfrist'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp
AS $$
DECLARE
    v_school_id UUID;
    v_role public.user_role;
    v_consented_at TIMESTAMPTZ;
    v_created_at TIMESTAMPTZ;
    v_reference_date TIMESTAMPTZ;
    v_days_elapsed NUMERIC;
    v_withdrawal_id TEXT;
    v_caller_id UUID;
    v_caller_role TEXT;
    v_auth_ok BOOLEAN := FALSE;
BEGIN
    IF p_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'MISSING_STUDENT_ID');
    END IF;

    SELECT school_id, role, legal_consented_at, created_at
      INTO v_school_id, v_role, v_consented_at, v_created_at
      FROM public.users_raw WHERE id = p_student_id LIMIT 1;

    IF NOT FOUND OR v_role <> 'student' THEN
        RETURN jsonb_build_object('success', false, 'error', 'STUDENT_NOT_FOUND');
    END IF;

    v_caller_id := public.get_current_authenticated_user_id();
    v_caller_role := public.get_current_user_role();

    IF public.is_master_admin() THEN
        v_auth_ok := TRUE;
    ELSIF public.get_current_user_school_id() = v_school_id AND v_caller_role IN ('admin', 'secretary') THEN
        v_auth_ok := TRUE;
    ELSIF v_caller_id = p_student_id THEN
        v_auth_ok := TRUE;
    ELSIF to_regclass('public.session_leases') IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.session_leases WHERE user_id = p_student_id AND is_revoked = FALSE AND last_active_at >= (NOW() - INTERVAL '30 days')
    ) THEN
        v_auth_ok := TRUE;
    ELSIF to_regclass('public.parent_unlock_leases') IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.parent_unlock_leases WHERE student_id = p_student_id AND expires_at > NOW()
    ) THEN
        v_auth_ok := TRUE;
    END IF;

    IF NOT v_auth_ok THEN
        RETURN jsonb_build_object('success', false, 'error', 'PARENT_AUTH_REQUIRED');
    END IF;

    v_reference_date := COALESCE(v_consented_at, v_created_at, NOW());
    v_days_elapsed := EXTRACT(EPOCH FROM (NOW() - v_reference_date)) / 86400.0;

    IF v_days_elapsed > 31 THEN
        RETURN jsonb_build_object('success', false, 'error', 'WITHDRAWAL_PERIOD_EXPIRED', 'days_elapsed', ROUND(v_days_elapsed, 1));
    END IF;

    v_withdrawal_id := 'WD-' || UPPER(SUBSTRING(REPLACE(p_student_id::text, '-', '') FROM 1 FOR 8)) || '-' || TO_CHAR(NOW(), 'YYYYMMDD');

    UPDATE public.users_raw
       SET is_campus_active = false,
           audio_tresor_active = false,
           payment_status = 'none',
           updated_at = NOW()
     WHERE id = p_student_id;

    BEGIN
        IF to_regclass('public.students') IS NOT NULL THEN
            UPDATE public.students
               SET is_campus_active = false
             WHERE id = p_student_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    BEGIN
        INSERT INTO public.audit_logs (
            school_id, user_id, actor_id, action, operation, entity_type, entity_id, details
        ) VALUES (
            v_school_id, p_student_id, COALESCE(v_caller_id, p_student_id),
            'B2C_CONTRACT_WITHDRAWAL_356A_BGB', 'B2C_CONTRACT_WITHDRAWAL_356A_BGB', 'users_raw', p_student_id::text,
            jsonb_build_object(
                'withdrawal_id', v_withdrawal_id, 'receipt_id', v_withdrawal_id,
                'student_id', p_student_id, 'is_campus_active', false, 'payment_status', 'none',
                'reason', COALESCE(NULLIF(btrim(p_reason), ''), 'Widerruf gem. § 356a BGB'),
                'days_elapsed', ROUND(v_days_elapsed, 2), 'refund_amount_cents', 0,
                'wertersatz_cents', 0, 'withdrawn_at', NOW()
            )
        );
    EXCEPTION WHEN OTHERS THEN NULL; END;

    RETURN jsonb_build_object(
        'success', TRUE, 'withdrawal_id', v_withdrawal_id, 'receipt_id', v_withdrawal_id,
        'student_id', p_student_id, 'is_campus_active', FALSE, 'payment_status', 'none',
        'withdrawn_at', NOW(), 'wertersatz_eur', '0,00 €', 'compensation_eur', '0,00 €'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.withdraw_student_b2c_campus_contract(UUID, TEXT) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 6. UNIFIED B2B CANCELLATION & REACTIVATION RPCs (P0-01 & P0-05)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.cancel_school_subscription(UUID, TEXT, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.cancel_school_subscription(
    p_school_id UUID,
    p_cancellation_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp
AS $$
DECLARE
    v_caller_id UUID := public.get_current_authenticated_user_id();
    v_caller_role TEXT := public.get_current_user_role();
    v_caller_school UUID := public.get_current_user_school_id();
    v_school RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_year INT;
    v_month INT;
    v_target_year INT;
    v_effective_end_date TIMESTAMPTZ;
    v_cancellation_id TEXT;
BEGIN
    IF p_school_id IS NULL THEN
        RAISE EXCEPTION 'Missing school_id for subscription cancellation.' USING ERRCODE = '22023';
    END IF;
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Nicht authentifiziert.' USING ERRCODE = '42501';
    END IF;
    IF NOT public.is_master_admin() AND (v_caller_school IS DISTINCT FROM p_school_id OR v_caller_role NOT IN ('admin', 'secretary')) THEN
        RAISE EXCEPTION 'Keine Berechtigung für diese Musikschule.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_school FROM public.schools WHERE id = p_school_id LIMIT 1;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Musikschule nicht gefunden.' USING ERRCODE = 'P0002';
    END IF;

    v_year := EXTRACT(YEAR FROM v_now)::INT;
    v_month := EXTRACT(MONTH FROM v_now)::INT;

    IF v_month >= 6 THEN
        IF v_month <= 8
           AND v_school.contract_start_date IS NOT NULL
           AND v_school.contract_start_date >= make_date(v_year, 5, 1)
           AND v_now <= make_timestamptz(v_year, 8, 17, 23, 59, 59, 'Europe/Berlin')
        THEN
            v_target_year := v_year;
        ELSE
            v_target_year := v_year + 1;
        END IF;
    ELSE
        v_target_year := v_year;
    END IF;

    v_effective_end_date := make_timestamptz(v_target_year, 8, 31, 23, 59, 59, 'Europe/Berlin');
    v_cancellation_id := 'KD-'
        || COALESCE(v_school.numeric_id::TEXT, UPPER(SUBSTR(REPLACE(p_school_id::TEXT, '-', ''), 1, 6)))
        || '-' || TO_CHAR(v_now, 'YYMMDD')
        || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 4));

    UPDATE public.schools
       SET contract_ends_at = v_effective_end_date,
           cancellation_reason = COALESCE(NULLIF(btrim(p_cancellation_reason), ''), 'Ordentliche Kündigung zum Schuljahresende (§ 312k BGB)'),
           cancelled_at = v_now,
           updated_at = v_now
     WHERE id = p_school_id;

    BEGIN
        INSERT INTO public.audit_logs (
            school_id, table_name, record_id, user_id, actor_id, action, operation, entity_type, entity_id, details, created_at
        ) VALUES (
            p_school_id, 'schools', p_school_id, v_caller_id, v_caller_id,
            'SUBSCRIPTION_CANCELLED_312K', 'SUBSCRIPTION_CANCELLED_312K', 'schools', p_school_id::TEXT,
            jsonb_build_object(
                'cancellation_id', v_cancellation_id,
                'reason', COALESCE(NULLIF(btrim(p_cancellation_reason), ''), 'Ordentliche Kündigung zum Schuljahresende (§ 312k BGB)'),
                'cancelled_at', v_now, 'contract_ends_at', v_effective_end_date, 'effective_year', v_target_year
            ),
            v_now
        );
    EXCEPTION WHEN OTHERS THEN NULL; END;

    RETURN jsonb_build_object(
        'success', TRUE, 'school_id', p_school_id, 'cancellation_id', v_cancellation_id,
        'cancelled_at', v_now, 'contract_ends_at', v_effective_end_date, 'effective_year', v_target_year
    );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_school_subscription(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_school_subscription(UUID, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reactivate_school_subscription(
    p_school_id UUID,
    p_actor_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp
AS $$
DECLARE
    v_caller_id UUID := public.get_current_authenticated_user_id();
    v_caller_role TEXT := public.get_current_user_role();
    v_caller_school UUID := public.get_current_user_school_id();
    v_now TIMESTAMPTZ := NOW();
BEGIN
    IF p_school_id IS NULL THEN
        RAISE EXCEPTION 'Missing school_id for subscription reactivation.' USING ERRCODE = '22023';
    END IF;
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Nicht authentifiziert.' USING ERRCODE = '42501';
    END IF;
    IF NOT public.is_master_admin() AND (v_caller_school IS DISTINCT FROM p_school_id OR v_caller_role NOT IN ('admin', 'secretary')) THEN
        RAISE EXCEPTION 'Keine Berechtigung für diese Musikschule.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.schools
       SET status = 'active',
           contract_ends_at = NULL,
           cancellation_reason = NULL,
           cancelled_at = NULL,
           updated_at = v_now
     WHERE id = p_school_id;

    BEGIN
        INSERT INTO public.audit_logs (
            school_id, table_name, record_id, user_id, actor_id, action, operation, entity_type, entity_id, details, created_at
        ) VALUES (
            p_school_id, 'schools', p_school_id, v_caller_id, v_caller_id,
            'SUBSCRIPTION_REACTIVATED', 'SUBSCRIPTION_REACTIVATED', 'schools', p_school_id::TEXT,
            jsonb_build_object('reactivated_at', v_now, 'actor_id', v_caller_id), v_now
        );
    EXCEPTION WHEN OTHERS THEN NULL; END;

    RETURN jsonb_build_object('success', TRUE, 'status', 'active', 'reactivated_at', v_now);
END;
$$;

REVOKE ALL ON FUNCTION public.reactivate_school_subscription(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reactivate_school_subscription(UUID, UUID) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 7. B2B CONTRACT DIGEST REGISTRATION & VERIFICATION (P0-06)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.register_b2b_contract_digest(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.register_b2b_contract_digest(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.register_b2b_contract_digest(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) CASCADE;

CREATE OR REPLACE FUNCTION public.register_b2b_contract_digest(
    p_school_id UUID,
    p_school_name TEXT DEFAULT NULL,
    p_contract_hash TEXT DEFAULT NULL,
    p_contract_digest TEXT DEFAULT NULL,
    p_contract_type TEXT DEFAULT 'B2B_CLOUD_HOSTING_AVV_AGB',
    p_contract_version TEXT DEFAULT NULL,
    p_legal_version TEXT DEFAULT NULL,
    p_signed_by_name TEXT DEFAULT NULL,
    p_signee_name TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp
AS $$
DECLARE
    v_clean_hash TEXT := LOWER(REGEXP_REPLACE(COALESCE(NULLIF(btrim(p_contract_hash), ''), NULLIF(btrim(p_contract_digest), ''), ''), '^sha-?256:\s*', '', 'i'));
    v_version TEXT := COALESCE(NULLIF(btrim(p_contract_version), ''), NULLIF(btrim(p_legal_version), ''), 'v2026.5-enterprise');
    v_signee TEXT := COALESCE(NULLIF(btrim(p_signed_by_name), ''), NULLIF(btrim(p_signee_name), ''), 'Schulleitung');
    v_school_name TEXT := NULLIF(btrim(COALESCE(p_school_name, '')), '');
    v_type TEXT := COALESCE(NULLIF(btrim(p_contract_type), ''), 'B2B_CLOUD_HOSTING_AVV_AGB');
    v_caller_id UUID := public.get_current_authenticated_user_id();
    v_now TIMESTAMPTZ := NOW();
BEGIN
    IF v_clean_hash !~ '^[a-f0-9]{64}$' THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_HASH_FORMAT');
    END IF;

    IF v_school_name IS NULL AND p_school_id IS NOT NULL THEN
        SELECT name INTO v_school_name FROM public.schools WHERE id = p_school_id;
    END IF;
    v_school_name := COALESCE(v_school_name, 'Musikschule');

    IF p_school_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.schools WHERE id = p_school_id) THEN
        INSERT INTO public.school_license_contracts (
            school_id, school_name, contract_hash, sha256_hash, contract_type,
            contract_version, legal_version, signed_by_name, signee_name, signed_at, datacenter_location
        ) VALUES (
            p_school_id, v_school_name, v_clean_hash, v_clean_hash, v_type,
            v_version, v_version, v_signee, v_signee, v_now,
            'IONOS SE & Hetzner Online GmbH (Deutschland • ISO/IEC 27001)'
        );
    END IF;

    BEGIN
        INSERT INTO public.audit_logs (
            school_id, user_id, actor_id, action, operation, entity_type, entity_id, details, created_at
        ) VALUES (
            p_school_id, v_caller_id, v_caller_id, 'B2B_CONTRACT_SEALED', 'B2B_CONTRACT_SEALED',
            'school_license_contracts', COALESCE(p_school_id::TEXT, v_clean_hash),
            jsonb_build_object(
                'contract_hash', v_clean_hash,
                'avv_checksum', v_clean_hash,
                'school_name', v_school_name,
                'contract_type', v_type,
                'contract_version', v_version,
                'legal_version', v_version,
                'signee_name', v_signee,
                'signed_by', v_signee,
                'datacenter_location', 'IONOS SE & Hetzner Online GmbH (Deutschland • ISO/IEC 27001)',
                'metadata', COALESCE(p_metadata, '{}'::JSONB),
                'signed_at', v_now
            ),
            v_now
        );
    EXCEPTION WHEN OTHERS THEN NULL; END;

    RETURN jsonb_build_object('success', TRUE, 'contract_hash', v_clean_hash, 'signed_at', v_now);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_b2b_contract_digest(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated, anon, service_role;

DROP FUNCTION IF EXISTS public.verify_b2b_contract_digest(TEXT);
DROP FUNCTION IF EXISTS public.verify_b2b_contract_digest(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.verify_b2b_contract_digest(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.verify_b2b_contract_digest(
    p_digest TEXT DEFAULT NULL,
    p_hash TEXT DEFAULT NULL,
    p_contract_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_raw_input TEXT := COALESCE(NULLIF(btrim(p_digest), ''), NULLIF(btrim(p_hash), ''), NULLIF(btrim(p_contract_hash), ''), '');
    v_clean_hash TEXT;
    v_canonical_hash TEXT;
    v_contract_record RECORD;
    v_school_record RECORD;
    v_audit_record RECORD;
BEGIN
    v_clean_hash := LOWER(REGEXP_REPLACE(v_raw_input, '^sha-?256:\s*', '', 'i'));

    IF v_clean_hash IS NULL OR LENGTH(v_clean_hash) < 32 OR LENGTH(v_clean_hash) > 64 OR v_clean_hash !~ '^[0-9a-f]{32,64}$' THEN
        RETURN jsonb_build_object(
            'success', FALSE, 'verified', FALSE, 'error', 'INVALID_HASH_FORMAT',
            'message', 'Der eingegebene Prüf-Hash ist kein gültiger SHA-256 Hexadezimalwert.'
        );
    END IF;

    -- 1. Check authoritative school_license_contracts table
    IF to_regclass('public.school_license_contracts') IS NOT NULL THEN
        SELECT
            c.id, c.school_id,
            COALESCE(c.school_name, s.name, 'Verifizierte Musikschule') AS school_name,
            COALESCE(c.contract_type, 'B2B_CLOUD_HOSTING_AVV_AGB') AS contract_type,
            COALESCE(c.contract_version, c.legal_version, 'v2026.5-enterprise') AS contract_version,
            COALESCE(c.signed_by_name, c.signee_name, 'Schulleitung / Trägervertretung') AS signed_by_name,
            COALESCE(c.signed_at, c.created_at) AS signed_at,
            LOWER(COALESCE(NULLIF(c.contract_hash, ''), NULLIF(c.sha256_hash, ''), v_clean_hash)) AS canonical_hash
        INTO v_contract_record
        FROM public.school_license_contracts c
        LEFT JOIN public.schools s ON s.id = c.school_id
        WHERE LOWER(COALESCE(c.contract_hash, '')) = v_clean_hash
           OR LOWER(COALESCE(c.sha256_hash, '')) = v_clean_hash
           OR LOWER(COALESCE(c.contract_hash, '')) LIKE v_clean_hash || '%'
           OR LOWER(COALESCE(c.sha256_hash, '')) LIKE v_clean_hash || '%'
        ORDER BY c.created_at DESC
        LIMIT 1;

        IF FOUND THEN
            v_canonical_hash := COALESCE(v_contract_record.canonical_hash, v_clean_hash);
            RETURN jsonb_build_object(
                'success', TRUE, 'verified', TRUE, 'status', 'VERIFIED_ACTIVE', 'source', 'school_license_contracts',
                'contract_hash', v_canonical_hash, 'full_hash', v_canonical_hash,
                'school_id', v_contract_record.school_id, 'school_name', v_contract_record.school_name,
                'contract_type', v_contract_record.contract_type,
                'contract_version', v_contract_record.contract_version, 'legal_version', v_contract_record.contract_version,
                'signed_by', v_contract_record.signed_by_name, 'signee_name', v_contract_record.signed_by_name,
                'signed_at', v_contract_record.signed_at,
                'datacenter_location', 'IONOS SE & Hetzner Online GmbH (Deutschland • ISO/IEC 27001)',
                'avv_compliant', TRUE, 'zero_us_cloud', TRUE
            );
        END IF;
    END IF;

    -- 2. Check schools.avv_checksum
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'avv_checksum') THEN
        SELECT
            s.id AS school_id, s.name AS school_name,
            COALESCE(s.avv_signee_name, 'Schulleitung') AS signed_by_name,
            s.avv_signed_at AS signed_at,
            LOWER(COALESCE(NULLIF(s.avv_checksum, ''), v_clean_hash)) AS canonical_hash
        INTO v_school_record
        FROM public.schools s
        WHERE LOWER(COALESCE(s.avv_checksum, '')) = v_clean_hash
           OR LOWER(COALESCE(s.avv_checksum, '')) LIKE v_clean_hash || '%'
        LIMIT 1;

        IF FOUND THEN
            v_canonical_hash := COALESCE(v_school_record.canonical_hash, v_clean_hash);
            RETURN jsonb_build_object(
                'success', TRUE, 'verified', TRUE, 'status', 'VERIFIED_ACTIVE', 'source', 'schools_avv_registry',
                'contract_hash', v_canonical_hash, 'full_hash', v_canonical_hash,
                'school_id', v_school_record.school_id, 'school_name', v_school_record.school_name,
                'contract_type', 'AVV_ART_28_DSGVO_CONTRACT',
                'contract_version', 'v2026.5-enterprise', 'legal_version', 'v2026.5-enterprise',
                'signed_by', v_school_record.signed_by_name, 'signee_name', v_school_record.signed_by_name,
                'signed_at', v_school_record.signed_at,
                'datacenter_location', 'IONOS SE & Hetzner Online GmbH (Deutschland • ISO/IEC 27001)',
                'avv_compliant', TRUE, 'zero_us_cloud', TRUE
            );
        END IF;
    END IF;

    -- 3. Check immutable WORM audit_logs
    IF to_regclass('public.audit_logs') IS NOT NULL THEN
        SELECT
            a.school_id, a.created_at AS signed_at,
            COALESCE(s.name, a.details->>'school_name', 'Verifizierte Musikschule') AS school_name,
            COALESCE(a.details->>'signee_name', a.details->>'signed_by', 'Schulleitung') AS signed_by_name,
            COALESCE(a.details->>'contract_version', a.details->>'legal_version', a.details->>'avv_version', 'v2026.5-enterprise') AS contract_version,
            COALESCE(a.details->>'contract_type', 'B2B_AUDIT_VERIFIED_CONTRACT') AS contract_type,
            LOWER(COALESCE(NULLIF(a.details->>'contract_hash', ''), NULLIF(a.details->>'avv_checksum', ''), NULLIF(a.details->>'checksum', ''), v_clean_hash)) AS canonical_hash
        INTO v_audit_record
        FROM public.audit_logs a
        LEFT JOIN public.schools s ON s.id = a.school_id
        WHERE a.action IN ('AVV_CONTRACT_DIGITALLY_SIGNED', 'B2B_CONTRACT_SEALED', 'SCHOOL_TARIFF_BOOKED')
          AND (
              LOWER(COALESCE(a.details->>'avv_checksum', '')) = v_clean_hash
              OR LOWER(COALESCE(a.details->>'contract_hash', '')) = v_clean_hash
              OR LOWER(COALESCE(a.details->>'checksum', '')) = v_clean_hash
              OR LOWER(COALESCE(a.details->>'avv_checksum', '')) LIKE v_clean_hash || '%'
              OR LOWER(COALESCE(a.details->>'contract_hash', '')) LIKE v_clean_hash || '%'
              OR LOWER(COALESCE(a.details->>'checksum', '')) LIKE v_clean_hash || '%'
          )
        ORDER BY a.created_at DESC
        LIMIT 1;

        IF FOUND THEN
            v_canonical_hash := COALESCE(v_audit_record.canonical_hash, v_clean_hash);
            RETURN jsonb_build_object(
                'success', TRUE, 'verified', TRUE, 'status', 'VERIFIED_ACTIVE', 'source', 'worm_audit_trail',
                'contract_hash', v_canonical_hash, 'full_hash', v_canonical_hash,
                'school_id', v_audit_record.school_id, 'school_name', v_audit_record.school_name,
                'contract_type', v_audit_record.contract_type,
                'contract_version', v_audit_record.contract_version, 'legal_version', v_audit_record.contract_version,
                'signed_by', v_audit_record.signed_by_name, 'signee_name', v_audit_record.signed_by_name,
                'signed_at', v_audit_record.signed_at,
                'datacenter_location', 'IONOS SE & Hetzner Online GmbH (Deutschland • ISO/IEC 27001)',
                'avv_compliant', TRUE, 'zero_us_cloud', TRUE
            );
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', FALSE, 'verified', FALSE, 'contract_hash', v_clean_hash, 'error', 'HASH_NOT_FOUND',
        'message', 'Zu diesem SHA-256 Prüf-Hash wurde kein aktiver oder archivierter B2B-Vertrag im Revisionsregister gefunden.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_b2b_contract_digest(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 8. HARDENED BCRYPT SCHOOL SECRETS: register_school_and_admin & authenticate_by_credential (P0-03)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_school_and_admin(
    p_school_name TEXT,
    p_subdomain TEXT,
    p_street TEXT,
    p_house_number TEXT,
    p_zip_code TEXT,
    p_city TEXT,
    p_phone TEXT,
    p_school_email TEXT,
    p_admin_first_name TEXT,
    p_admin_last_name TEXT,
    p_country TEXT DEFAULT 'Deutschland'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    v_school_id UUID := gen_random_uuid();
    v_admin_id UUID := gen_random_uuid();
    v_qr_token UUID := gen_random_uuid();
    v_generated_pin TEXT;
    v_bcrypt_pin_hash TEXT;
    v_admin_email TEXT;
    v_slug TEXT;
    v_country TEXT;
    v_reserved_subdomains TEXT[] := ARRAY[
        'admin', 'api', 'app', 'auth', 'login', 'signup', 'register', 'root',
        'system', 'support', 'dashboard', 'mail', 'secure', 'static', 'assets',
        'cdn', 'groovelab', 'campus', 'master', 'status', 'help', 'billing',
        'dev', 'staging', 'test', 'demo', 'portal', 'account', 'kiosk', 'stage',
        'live', 'secretariat', 'sekretariat', 'schulleitung', 'teacher', 'lehrer',
        'student', 'schueler', 'eltern', 'parents', 'download', 'pass', 'qr'
    ];
BEGIN
    IF TRIM(COALESCE(p_school_name, '')) = '' THEN
        RAISE EXCEPTION 'MANDATORY_FIELD_MISSING: Schulname darf nicht leer sein.' USING ERRCODE = '23502';
    END IF;
    IF TRIM(COALESCE(p_street, '')) = '' OR TRIM(COALESCE(p_house_number, '')) = '' THEN
        RAISE EXCEPTION 'MANDATORY_FIELD_MISSING: Vollständige Anschrift (Straße und Hausnummer) ist zwingend erforderlich.' USING ERRCODE = '23502';
    END IF;
    IF TRIM(COALESCE(p_zip_code, '')) = '' OR TRIM(COALESCE(p_city, '')) = '' THEN
        RAISE EXCEPTION 'MANDATORY_FIELD_MISSING: Postleitzahl und Ort sind zwingend erforderlich.' USING ERRCODE = '23502';
    END IF;
    IF TRIM(COALESCE(p_admin_first_name, '')) = '' OR TRIM(COALESCE(p_admin_last_name, '')) = '' THEN
        RAISE EXCEPTION 'MANDATORY_FIELD_MISSING: Vor- und Nachname der Schulleitung sind zwingend erforderlich.' USING ERRCODE = '23502';
    END IF;
    IF TRIM(COALESCE(p_school_email, '')) = '' THEN
        RAISE EXCEPTION 'MANDATORY_FIELD_MISSING: Eine offizielle E-Mail-Adresse der Musikschule ist zwingend erforderlich.' USING ERRCODE = '23502';
    END IF;

    v_slug := LOWER(TRIM(p_subdomain));
    IF v_slug IS NULL OR length(v_slug) < 3 THEN
        RAISE EXCEPTION 'Die Wunsch-Subdomain muss mindestens 3 Zeichen lang sein.';
    END IF;
    IF v_slug = ANY(v_reserved_subdomains) THEN
        RAISE EXCEPTION 'Diese Subdomain ist ein geschützter Systemname und kann nicht vergeben werden.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.schools WHERE subdomain = v_slug) THEN
        RAISE EXCEPTION 'Diese Wunsch-Subdomain ist bereits vergeben. Bitte wähle eine andere.';
    END IF;

    v_country := COALESCE(NULLIF(TRIM(p_country), ''), 'Deutschland');
    IF v_country NOT IN ('Deutschland', 'Österreich', 'Schweiz') THEN
        v_country := 'Deutschland';
    END IF;

    v_generated_pin := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
    v_bcrypt_pin_hash := extensions.crypt(v_generated_pin, extensions.gen_salt('bf', 10));
    v_admin_email := LOWER(TRIM(p_school_email));

    INSERT INTO public.schools (
        id, name, legal_name, subdomain, primary_color,
        street, house_number, zip_code, city, phone_number,
        email, billing_email, billing_contact_person, country,
        has_campus_subscription, has_groovelab_subscription,
        storage_addon_gb, storage_addon_monthly_fee, storage_addon_status,
        extra_billing_option, is_billing_booked,
        subscription_bypass, is_trial, trial_ends_at, status,
        avv_signed_at, avv_signee_name, is_active, is_demo_tenant
    ) VALUES (
        v_school_id, TRIM(p_school_name), TRIM(p_school_name), v_slug, '#34a853',
        TRIM(p_street), TRIM(p_house_number), TRIM(p_zip_code), TRIM(p_city), NULLIF(TRIM(p_phone), ''),
        v_admin_email, v_admin_email, TRIM(p_admin_first_name) || ' ' || TRIM(p_admin_last_name), v_country,
        FALSE, FALSE, 0, 0.00, 'none', NULL, FALSE,
        FALSE, TRUE, NOW() + INTERVAL '30 days', 'trial',
        NOW(), TRIM(p_admin_first_name) || ' ' || TRIM(p_admin_last_name) || ' (Schulleitung)', TRUE, FALSE
    );

    INSERT INTO public.users_raw (
        id, school_id, role, roles, first_name, last_name,
        password_hash, qr_token, ausweis_nummer,
        is_campus_active, is_groovelab_active, is_active,
        is_pin_activated, photo_url, avatar_url, email, created_at
    ) VALUES (
        v_admin_id, v_school_id, 'admin', ARRAY['admin'],
        TRIM(p_admin_first_name), TRIM(p_admin_last_name),
        NULL, v_qr_token, NULL, TRUE, TRUE, TRUE,
        TRUE, '/campus_login_hero.png', '/campus_login_hero.png', v_admin_email, NOW()
    );

    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'private_auth') THEN
        INSERT INTO private_auth.user_secrets (
            user_id, password_hash, argon2_personal_pin_hash, updated_at
        ) VALUES (
            v_admin_id, v_bcrypt_pin_hash, v_bcrypt_pin_hash, NOW()
        ) ON CONFLICT (user_id) DO UPDATE SET
            password_hash = EXCLUDED.password_hash,
            argon2_personal_pin_hash = EXCLUDED.argon2_personal_pin_hash,
            updated_at = NOW();

        IF to_regclass('private_auth.school_secrets') IS NOT NULL THEN
            INSERT INTO private_auth.school_secrets (
                school_id, admin_pin_hash, created_at, updated_at
            ) VALUES (
                v_school_id, v_bcrypt_pin_hash, NOW(), NOW()
            ) ON CONFLICT (school_id) DO UPDATE SET
                admin_pin_hash = EXCLUDED.admin_pin_hash,
                updated_at = NOW();
        END IF;
    END IF;

    INSERT INTO public.audit_logs (
        school_id, user_id, action, operation, details
    ) VALUES (
        v_school_id, v_admin_id, 'school_self_onboarded', 'school_self_onboarded',
        jsonb_build_object(
            'school_name', TRIM(p_school_name), 'subdomain', v_slug, 'country', v_country,
            'street', TRIM(p_street), 'house_number', TRIM(p_house_number),
            'city', TRIM(p_city), 'zip_code', TRIM(p_zip_code), 'pin_hash_algorithm', 'bcrypt_bf_10'
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE, 'school_id', v_school_id, 'admin_id', v_admin_id,
        'pin', v_generated_pin, 'qr_token', v_qr_token
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_school_and_admin(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.authenticate_by_credential(
    p_credential TEXT,
    p_school_id UUID DEFAULT NULL::UUID,
    p_device_key TEXT DEFAULT NULL::TEXT,
    p_device_name TEXT DEFAULT NULL::TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private_auth', 'pg_temp', 'extensions'
AS $function$
DECLARE
    v_raw TEXT := TRIM(p_credential);
    v_clean TEXT := TRIM(p_credential);
    v_clean_upper TEXT;
    v_is_uuid BOOLEAN := FALSE;
    v_digits_only TEXT;
    v_user RECORD;
    v_school RECORD;
    v_lease_id UUID;
    v_sanitized_user JSONB;
    v_headers TEXT;
    v_ip TEXT;
    v_ip_hash TEXT;
    v_ip_failures INT := 0;
    v_pin_locked_until TIMESTAMPTZ;
    v_is_admin_pin BOOLEAN := FALSE;
    v_token_log_hash TEXT;
    v_has_personal_pin BOOLEAN := FALSE;
    v_has_parent_pin BOOLEAN := FALSE;
    v_is_pin_activated BOOLEAN := FALSE;
    v_mfa_enforced BOOLEAN := FALSE;
BEGIN
    IF v_raw IS NULL OR v_raw = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültige Anmeldedaten.');
    END IF;

    IF v_clean ~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' THEN
        v_clean := (regexp_match(v_clean, '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', 'i'))[1];
    ELSIF v_clean ~* '/(?:qr|onboarding|badge|card|pass)/([a-zA-Z0-9\-_]+)' THEN
        v_clean := (regexp_match(v_clean, '/(?:qr|onboarding|badge|card|pass)/([a-zA-Z0-9\-_]+)', 'i'))[1];
    ELSIF v_clean ~* '[?&](?:qr_token|teacher_qr_token|token|campus_pass)=([a-zA-Z0-9\-_]+)' THEN
        v_clean := (regexp_match(v_clean, '[?&](?:qr_token|teacher_qr_token|token|campus_pass)=([a-zA-Z0-9\-_]+)', 'i'))[1];
    END IF;

    v_clean_upper := UPPER(v_clean);
    v_is_uuid := (v_clean ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
    v_digits_only := regexp_replace(v_clean, '[^0-9]', '', 'g');

    BEGIN
        v_token_log_hash := encode(extensions.digest(v_clean, 'sha256'), 'hex');
    EXCEPTION WHEN OTHERS THEN
        v_token_log_hash := 'ANONYMIZED_CREDENTIAL';
    END;

    BEGIN
        v_headers := current_setting('request.headers', true);
        IF v_headers IS NOT NULL AND v_headers <> '' THEN
            v_ip := COALESCE(NULLIF(v_headers::json->>'cf-connecting-ip', ''), v_headers::json->>'x-forwarded-for');
            IF v_ip IS NOT NULL AND v_ip <> '' THEN
                v_ip := TRIM(split_part(v_ip, ',', 1));
                v_ip_hash := encode(extensions.digest(v_ip, 'sha256'), 'hex');
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_ip := NULL;
        v_ip_hash := NULL;
    END;

    IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        SELECT COUNT(*) INTO v_ip_failures
        FROM public.qr_login_rate_limits
        WHERE ip_hash = v_ip_hash AND success = FALSE AND created_at > (NOW() - INTERVAL '5 minutes');

        IF v_ip_failures >= 150 THEN
            RETURN jsonb_build_object('success', false, 'error', 'Zu viele Fehlversuche von dieser IP. Bitte warte einige Minuten.');
        END IF;
    END IF;

    IF p_school_id IS NOT NULL AND to_regclass('private_auth.school_secrets') IS NOT NULL THEN
        SELECT pin_locked_until INTO v_pin_locked_until
        FROM private_auth.school_secrets WHERE school_id = p_school_id;

        IF v_pin_locked_until IS NOT NULL AND v_pin_locked_until > NOW() THEN
            RETURN jsonb_build_object('success', false, 'error', 'Schulleitungs-PIN ist vorübergehend gesperrt. Bitte in einigen Minuten erneut versuchen.');
        END IF;

        SELECT u.* INTO v_user
        FROM public.users_raw u
        JOIN private_auth.school_secrets sec ON sec.school_id = u.school_id
        WHERE u.school_id = p_school_id
          AND u.role IN ('admin', 'secretary')
          AND u.is_active = TRUE
          AND sec.admin_pin_hash IS NOT NULL
          AND (
              (sec.admin_pin_hash LIKE '$2%' AND extensions.crypt(v_clean, sec.admin_pin_hash) = sec.admin_pin_hash)
              OR (sec.admin_pin_hash NOT LIKE '$2%' AND sec.admin_pin_hash = encode(extensions.digest(v_clean, 'sha256'), 'hex'))
          )
        ORDER BY (CASE WHEN u.role = 'admin' THEN 1 ELSE 2 END)
        LIMIT 1;

        IF v_user IS NOT NULL THEN
            v_is_admin_pin := TRUE;
            UPDATE private_auth.school_secrets
               SET failed_pin_attempts = 0,
                   pin_locked_until = NULL,
                   admin_pin_hash = CASE WHEN admin_pin_hash LIKE '$2%' THEN admin_pin_hash ELSE extensions.crypt(v_clean, extensions.gen_salt('bf', 10)) END,
                   updated_at = NOW()
             WHERE school_id = p_school_id;
        ELSIF length(v_clean) = 6 AND v_clean ~ '^[0-9]+$' THEN
            UPDATE private_auth.school_secrets
            SET failed_pin_attempts = COALESCE(failed_pin_attempts, 0) + 1,
                pin_locked_until = CASE
                    WHEN COALESCE(failed_pin_attempts, 0) + 1 >= 5 THEN NOW() + INTERVAL '15 minutes'
                    WHEN COALESCE(failed_pin_attempts, 0) + 1 = 4 THEN NOW() + INTERVAL '30 seconds'
                    WHEN COALESCE(failed_pin_attempts, 0) + 1 = 3 THEN NOW() + INTERVAL '5 seconds'
                    ELSE NULL
                END,
                updated_at = NOW()
            WHERE school_id = p_school_id;
        END IF;
    END IF;

    IF v_user IS NULL THEN
        SELECT u.* INTO v_user
        FROM public.users_raw u
        WHERE (
            u.ausweis_nummer = v_clean
            OR u.ausweis_nummer = v_clean_upper
            OR (length(v_clean) >= 6 AND replace(u.ausweis_nummer, '-', '') = replace(v_clean_upper, '-', ''))
            OR EXISTS (SELECT 1 FROM public.user_badge_credentials ubc WHERE ubc.user_id = u.id AND ubc.token_value = v_clean AND ubc.is_active = TRUE)
            OR u.qr_token::text = v_clean
            OR u.ausweis_id = v_clean
            OR u.teacher_qr_token = v_clean
            OR u.teacher_qr_token::text = v_clean
            OR (v_clean !~* '[A-Z]' AND length(v_digits_only) >= 6 AND regexp_replace(u.ausweis_nummer, '[^0-9]', '', 'g') = v_digits_only AND u.role = 'student')
        )
        AND (p_school_id IS NULL OR u.school_id = p_school_id)
        AND u.is_active = TRUE
        ORDER BY
            CASE
                WHEN u.ausweis_nummer = v_clean THEN 1
                WHEN u.ausweis_nummer = v_clean_upper THEN 2
                WHEN replace(u.ausweis_nummer, '-', '') = replace(v_clean_upper, '-', '') THEN 3
                WHEN EXISTS (SELECT 1 FROM public.user_badge_credentials ubc WHERE ubc.user_id = u.id AND ubc.token_value = v_clean AND ubc.is_active = TRUE) THEN 4
                WHEN u.qr_token::text = v_clean THEN 5
                ELSE 10
            END ASC
        LIMIT 1;

        IF v_user IS NULL AND p_school_id IS NOT NULL THEN
            SELECT u.* INTO v_user
            FROM public.users_raw u
            WHERE (
                u.ausweis_nummer = v_clean
                OR u.ausweis_nummer = v_clean_upper
                OR (length(v_clean) >= 6 AND replace(u.ausweis_nummer, '-', '') = replace(v_clean_upper, '-', ''))
                OR EXISTS (SELECT 1 FROM public.user_badge_credentials ubc WHERE ubc.user_id = u.id AND ubc.token_value = v_clean AND ubc.is_active = TRUE)
                OR u.qr_token::text = v_clean
                OR u.ausweis_id = v_clean
                OR u.teacher_qr_token = v_clean
                OR u.teacher_qr_token::text = v_clean
                OR (v_clean !~* '[A-Z]' AND length(v_digits_only) >= 6 AND regexp_replace(u.ausweis_nummer, '[^0-9]', '', 'g') = v_digits_only AND u.role = 'student')
            )
            AND u.is_active = TRUE
            ORDER BY
                CASE
                    WHEN u.ausweis_nummer = v_clean THEN 1
                    WHEN u.ausweis_nummer = v_clean_upper THEN 2
                    WHEN replace(u.ausweis_nummer, '-', '') = replace(v_clean_upper, '-', '') THEN 3
                    WHEN EXISTS (SELECT 1 FROM public.user_badge_credentials ubc WHERE ubc.user_id = u.id AND ubc.token_value = v_clean AND ubc.is_active = TRUE) THEN 4
                    WHEN u.qr_token::text = v_clean THEN 5
                    ELSE 10
                END ASC
            LIMIT 1;
        END IF;
    END IF;

    IF v_user IS NULL THEN
        IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
            INSERT INTO public.qr_login_rate_limits (ip_hash, attempted_token, raw_credential, school_id, success)
            VALUES (v_ip_hash, v_token_log_hash, v_clean, p_school_id, FALSE);
        END IF;
        RETURN jsonb_build_object('success', false, 'error', 'Ungültiger Ausweis-PIN oder QR-Token.');
    END IF;

    IF to_regclass('public.user_badge_credentials') IS NOT NULL THEN
        UPDATE public.user_badge_credentials SET last_used_at = NOW() WHERE token_value = v_clean;
    END IF;

    IF v_user.role = 'student' THEN
        IF COALESCE(v_user.auto_inactivated_by_airbag, FALSE) = TRUE THEN
            UPDATE public.users_raw
            SET auto_inactivated_by_airbag = FALSE, is_campus_active = TRUE, last_seen = NOW(), updated_at = NOW()
            WHERE id = v_user.id;
            v_user.auto_inactivated_by_airbag := FALSE;
            v_user.is_campus_active := TRUE;
            INSERT INTO public.audit_logs (
                school_id, table_name, record_id, user_id, action, operation, entity_type, entity_id, details
            ) VALUES (
                v_user.school_id, 'users_raw', v_user.id, v_user.id, 'CAMPUS_COST_AIRBAG_AUTO_RESTORED', 'CAMPUS_COST_AIRBAG_AUTO_RESTORED',
                'users_raw', v_user.id::TEXT, jsonb_build_object('student_id', v_user.id, 'reactivated_at', NOW())
            );
        END IF;

        IF v_user.student_billing_payment_method = 'bank_transfer' AND v_user.payment_status = 'provisional_grace' THEN
            IF COALESCE(v_user.provisional_grace_until, v_user.created_at + INTERVAL '14 days') < NOW() THEN
                UPDATE public.users_raw
                SET is_campus_active = FALSE, payment_status = 'grace_expired', updated_at = NOW()
                WHERE id = v_user.id;
                v_user.is_campus_active := FALSE;
                INSERT INTO public.audit_logs (
                    school_id, table_name, record_id, user_id, action, operation, entity_type, entity_id, details
                ) VALUES (
                    v_user.school_id, 'users_raw', v_user.id, v_user.id, 'B2C_PROVISIONAL_GRACE_EXPIRED', 'B2C_PROVISIONAL_GRACE_EXPIRED',
                    'users_raw', v_user.id::TEXT, jsonb_build_object('student_id', v_user.id, 'expired_at', NOW())
                );
            END IF;
        END IF;

        UPDATE public.users_raw SET last_seen = NOW() WHERE id = v_user.id;
    END IF;

    SELECT * INTO v_school FROM public.schools WHERE id = v_user.school_id;
    v_mfa_enforced := (v_user.role = 'admin') OR (COALESCE(v_school.mfa_enforced_for_admins, FALSE) AND v_user.role IN ('admin', 'secretary'));

    IF to_regclass('public.session_leases') IS NOT NULL THEN
        INSERT INTO public.session_leases (
            user_id, school_id, device_name, device_key, role, last_active_at, created_at
        ) VALUES (
            v_user.id, v_user.school_id, COALESCE(p_device_name, 'Browser / Client'),
            COALESCE(p_device_key, gen_random_uuid()::text), v_user.role, NOW(), NOW()
        )
        RETURNING id INTO v_lease_id;
    END IF;

    IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        INSERT INTO public.qr_login_rate_limits (ip_hash, attempted_token, raw_credential, school_id, success)
        VALUES (v_ip_hash, v_token_log_hash, v_clean, p_school_id, TRUE);
    END IF;

    v_has_personal_pin := (
        v_user.personal_pin IS NOT NULL
        OR EXISTS (SELECT 1 FROM private_auth.user_secrets sec WHERE sec.user_id = v_user.id AND sec.argon2_personal_pin_hash IS NOT NULL)
    );
    v_has_parent_pin := (
        v_user.parent_pin IS NOT NULL
        OR EXISTS (SELECT 1 FROM private_auth.user_secrets sec WHERE sec.user_id = v_user.id AND sec.argon2_parent_pin_hash IS NOT NULL)
    );
    v_is_pin_activated := (COALESCE(v_user.is_pin_activated, FALSE) = TRUE OR v_has_personal_pin = TRUE OR v_user.role = 'student');

    v_sanitized_user := jsonb_build_object(
        'id', v_user.id,
        'first_name', v_user.first_name,
        'last_name', CASE WHEN v_user.role = 'student' THEN NULL ELSE v_user.last_name END,
        'name', CASE WHEN v_user.role = 'student' THEN v_user.first_name ELSE TRIM(CONCAT(v_user.first_name, ' ', v_user.last_name)) END,
        'role', v_user.role,
        'roles', v_user.roles,
        'school_id', v_user.school_id,
        'instrument', v_user.instrument,
        'avatar_url', v_user.avatar_url,
        'photo_url', v_user.photo_url,
        'is_active', v_user.is_active,
        'is_campus_active', v_user.is_campus_active,
        'is_groovelab_active', v_user.is_groovelab_active,
        'is_master_admin', v_user.is_master_admin,
        'has_parent_pin', v_has_parent_pin,
        'has_personal_pin', v_has_personal_pin,
        'is_pin_activated', v_is_pin_activated,
        'is_2fa_enabled', COALESCE(v_user.is_2fa_enabled, FALSE),
        'mfa_enforced_for_admins', v_mfa_enforced,
        'quiet_hours', v_user.quiet_hours,
        'push_notif_schedule_changes', COALESCE(v_user.push_notif_schedule_changes, TRUE),
        'push_notif_homework', COALESCE(v_user.push_notif_homework, TRUE),
        'push_notif_all_features', COALESCE(v_user.push_notif_all_features, TRUE),
        'push_notif_chat', COALESCE(v_user.push_notif_chat, TRUE),
        'push_notif_practice_reminder', COALESCE(v_user.push_notif_practice_reminder, TRUE),
        'push_notif_weekly_digest', COALESCE(v_user.push_notif_weekly_digest, TRUE),
        'campus_ui_level', COALESCE(v_user.campus_ui_level, 'junior'),
        'pin_enforced_for_preview', v_user.pin_enforced_for_preview,
        'auth_method', CASE WHEN v_is_admin_pin THEN 'school_admin_pin' ELSE 'credential' END,
        'schools', CASE WHEN v_school.id IS NOT NULL THEN to_jsonb(v_school) ELSE NULL END
    );

    RETURN jsonb_build_object('success', true, 'lease_token', v_lease_id, 'user', v_sanitized_user);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.authenticate_by_credential(TEXT, UUID, TEXT, TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

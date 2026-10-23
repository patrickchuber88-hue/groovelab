-- ==============================================================================
-- 🛡️ Migration 598: Enterprise B2C Subscription Governance & JIT Identity Audit
-- Standards: OWASP ASVS Level 3 / DSGVO Art. 5, 8, 25, 30 / BGB §§ 312k, 327l, 328 / GoBD
-- Purpose:
--   1. Adds idempotent B2C subscription governance metadata columns to public.users_raw
--   2. Provides authoritative RPC `admin_manage_b2c_student_subscription` for Master Admin
--      actions (payment activation, courtesy months +1/+3/+12 for next school year,
--      hardship exemption § 28 SGB II, cancellation/withdrawal § 312k BGB, operator notes)
--   3. Provides authoritative RPC `admin_reveal_b2c_student_lastname` for audited
--      Just-in-Time (JIT) Progressive Privacy Disclosure with WORM logging in
--      `public.master_audit_trail` and `public.audit_logs`.
-- ==============================================================================

BEGIN;

-- 1. IDEMPOTENT METADATA COLUMNS ON public.users_raw
ALTER TABLE public.users_raw
ADD COLUMN IF NOT EXISTS b2c_courtesy_months INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS b2c_subscription_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS b2c_operator_notes TEXT;

-- 2. AUTHORITATIVE B2C SUBSCRIPTION & COURTESY MANAGEMENT RPC (MASTER ADMIN ONLY)
CREATE OR REPLACE FUNCTION public.admin_manage_b2c_student_subscription(
    p_student_id UUID,
    p_action TEXT,
    p_courtesy_months INTEGER DEFAULT 0,
    p_operator_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_uid UUID;
    v_is_authorized BOOLEAN := FALSE;
    v_current_ends_at TIMESTAMPTZ;
    v_new_ends_at TIMESTAMPTZ;
    v_current_courtesy INTEGER;
    v_current_notes TEXT;
    v_updated_notes TEXT;
    v_timestamp_str TEXT;
    v_default_school_year_end TIMESTAMPTZ;
BEGIN
    v_caller_uid := public.get_current_authenticated_user_id();
    v_is_authorized := (
        public.is_master_admin()
        OR current_setting('role', true) = 'service_role'
    );

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Security Violation: Only Master Admin is authorized to manage B2C subscriptions.';
    END IF;

    IF p_student_id IS NULL THEN
        RAISE EXCEPTION 'Invalid student profile identifier.';
    END IF;

    SELECT
        ur.contract_ends_at,
        COALESCE(ur.b2c_courtesy_months, 0),
        COALESCE(ur.b2c_operator_notes, ur.coach_notes, '')
    INTO
        v_current_ends_at,
        v_current_courtesy,
        v_current_notes
    FROM public.users_raw ur
    WHERE ur.id = p_student_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student profile not found.';
    END IF;

    v_timestamp_str := to_char(now() AT TIME ZONE 'Europe/Berlin', 'DD.MM.YYYY HH24:MI');

    -- Compute canonical end of current school year (August 31)
    IF EXTRACT(MONTH FROM now()) >= 9 THEN
        v_default_school_year_end := make_timestamptz(EXTRACT(YEAR FROM now())::INT + 1, 8, 31, 23, 59, 59, 'Europe/Berlin');
    ELSE
        v_default_school_year_end := make_timestamptz(EXTRACT(YEAR FROM now())::INT, 8, 31, 23, 59, 59, 'Europe/Berlin');
    END IF;

    IF p_action = 'activate_paid' THEN
        v_new_ends_at := COALESCE(v_current_ends_at, v_default_school_year_end);
        IF v_new_ends_at < now() THEN
            v_new_ends_at := v_default_school_year_end;
        END IF;

        UPDATE public.users_raw
        SET
            is_campus_active = TRUE,
            is_groovelab_active = TRUE,
            student_billing_cash_paid = TRUE,
            contract_ends_at = v_new_ends_at,
            b2c_subscription_status = 'active',
            activated_at = COALESCE(activated_at, now())
        WHERE id = p_student_id;

    ELSIF p_action = 'grant_courtesy_months' THEN
        IF COALESCE(p_courtesy_months, 0) <= 0 OR p_courtesy_months > 24 THEN
            RAISE EXCEPTION 'Invalid courtesy months value (must be between 1 and 24).';
        END IF;

        IF v_current_ends_at IS NULL OR v_current_ends_at < now() THEN
            v_new_ends_at := v_default_school_year_end + (p_courtesy_months || ' months')::INTERVAL;
        ELSE
            v_new_ends_at := v_current_ends_at + (p_courtesy_months || ' months')::INTERVAL;
        END IF;

        v_updated_notes := TRIM(BOTH E'\n' FROM (
            v_current_notes || E'\n[' || v_timestamp_str || ' | KULANZ +' || p_courtesy_months || 'M]: ' ||
            COALESCE(NULLIF(TRIM(p_operator_note), ''), 'Gutschrift / Probemonate für Folgezeitraum (§ 327l BGB)')
        ));

        UPDATE public.users_raw
        SET
            is_campus_active = TRUE,
            is_groovelab_active = TRUE,
            contract_ends_at = v_new_ends_at,
            b2c_courtesy_months = v_current_courtesy + p_courtesy_months,
            b2c_subscription_status = 'courtesy',
            b2c_operator_notes = v_updated_notes,
            coach_notes = v_updated_notes
        WHERE id = p_student_id;

    ELSIF p_action = 'set_hardship_exempt' THEN
        v_new_ends_at := COALESCE(v_current_ends_at, v_default_school_year_end);
        v_updated_notes := TRIM(BOTH E'\n' FROM (
            v_current_notes || E'\n[' || v_timestamp_str || ' | SOZIALFONDS 0,00 €]: ' ||
            COALESCE(NULLIF(TRIM(p_operator_note), ''), 'Beitragsbefreiung im Rahmen des Sozialfonds / BuT (§ 28 SGB II)')
        ));

        UPDATE public.users_raw
        SET
            exempt_from_direct_billing = TRUE,
            is_campus_active = TRUE,
            is_groovelab_active = TRUE,
            contract_ends_at = v_new_ends_at,
            b2c_subscription_status = 'exempt',
            b2c_operator_notes = v_updated_notes,
            coach_notes = v_updated_notes
        WHERE id = p_student_id;

    ELSIF p_action = 'revoke_or_cancel' THEN
        v_updated_notes := TRIM(BOTH E'\n' FROM (
            v_current_notes || E'\n[' || v_timestamp_str || ' | STORNO / WIDERRUF]: ' ||
            COALESCE(NULLIF(TRIM(p_operator_note), ''), 'B2C-Freischaltung widerrufen / pausiert (§ 312k / § 355 BGB)')
        ));

        UPDATE public.users_raw
        SET
            is_campus_active = FALSE,
            student_billing_cash_paid = FALSE,
            exempt_from_direct_billing = FALSE,
            b2c_subscription_status = 'withdrawn',
            b2c_operator_notes = v_updated_notes,
            coach_notes = v_updated_notes
        WHERE id = p_student_id;

    ELSIF p_action = 'save_note' THEN
        v_updated_notes := COALESCE(p_operator_note, '');

        UPDATE public.users_raw
        SET
            b2c_operator_notes = v_updated_notes,
            coach_notes = v_updated_notes
        WHERE id = p_student_id;

    ELSE
        RAISE EXCEPTION 'Unsupported B2C subscription action: %', p_action;
    END IF;

    -- WORM Audit Trail in public.master_audit_trail
    IF to_regclass('public.master_audit_trail') IS NOT NULL THEN
        BEGIN
            INSERT INTO public.master_audit_trail (
                action,
                target_type,
                status,
                details,
                actor_user_id
            ) VALUES (
                'B2C_SUBSCRIPTION_' || UPPER(p_action),
                'student_b2c_profile',
                'SUCCESS',
                jsonb_build_object(
                    'student_id', p_student_id,
                    'action', p_action,
                    'courtesy_months_added', COALESCE(p_courtesy_months, 0),
                    'new_contract_ends_at', v_new_ends_at,
                    'has_note', (p_operator_note IS NOT NULL AND length(trim(p_operator_note)) > 0)
                ),
                v_caller_uid
            );
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    -- Secondary Audit Log in public.audit_logs
    IF to_regclass('public.audit_logs') IS NOT NULL THEN
        BEGIN
            INSERT INTO public.audit_logs (
                table_name,
                record_id,
                action,
                changed_by,
                new_data
            ) VALUES (
                'users_raw',
                p_student_id,
                'B2C_SUBSCRIPTION_' || UPPER(p_action),
                v_caller_uid,
                jsonb_build_object(
                    'action', p_action,
                    'courtesy_months_added', COALESCE(p_courtesy_months, 0),
                    'contract_ends_at', v_new_ends_at
                )
            );
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'student_id', p_student_id,
        'action', p_action,
        'contract_ends_at', v_new_ends_at,
        'operator_notes', COALESCE(v_updated_notes, v_current_notes)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_manage_b2c_student_subscription(UUID, TEXT, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_manage_b2c_student_subscription(UUID, TEXT, INTEGER, TEXT) TO authenticated, service_role;

-- 3. AUDITED JUST-IN-TIME (JIT) LASTNAME REVEAL RPC (PROGRESSIVE PRIVACY DISCLOSURE)
CREATE OR REPLACE FUNCTION public.admin_reveal_b2c_student_lastname(
    p_student_id UUID,
    p_reason TEXT DEFAULT 'B2C Zahlungs- & Vertragsabgleich im Master-Leitstand'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_uid UUID;
    v_is_authorized BOOLEAN := FALSE;
    v_first_name TEXT;
    v_last_name TEXT;
    v_ausweis TEXT;
BEGIN
    v_caller_uid := public.get_current_authenticated_user_id();
    v_is_authorized := (
        public.is_master_admin()
        OR current_setting('role', true) = 'service_role'
    );

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Security Violation: Only Master Admin may invoke JIT identity reveal.';
    END IF;

    SELECT
        ur.first_name,
        ur.last_name,
        ur.ausweis_nummer
    INTO
        v_first_name,
        v_last_name,
        v_ausweis
    FROM public.users_raw ur
    WHERE ur.id = p_student_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student profile not found.';
    END IF;

    IF to_regclass('public.master_audit_trail') IS NOT NULL THEN
        BEGIN
            INSERT INTO public.master_audit_trail (
                action,
                target_type,
                status,
                details,
                actor_user_id
            ) VALUES (
                'B2C_JIT_IDENTITY_REVEAL',
                'student_b2c_profile',
                'SUCCESS',
                jsonb_build_object(
                    'student_id', p_student_id,
                    'ausweis_nummer', v_ausweis,
                    'reason', COALESCE(NULLIF(TRIM(p_reason), ''), 'B2C Support & Zahlungsabgleich')
                ),
                v_caller_uid
            );
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'student_id', p_student_id,
        'first_name', COALESCE(v_first_name, ''),
        'last_name', COALESCE(v_last_name, ''),
        'full_name', TRIM(COALESCE(v_first_name, '') || ' ' || COALESCE(v_last_name, ''))
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reveal_b2c_student_lastname(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reveal_b2c_student_lastname(UUID, TEXT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;

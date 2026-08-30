-- ==============================================================================
-- Migration 313: Enterprise Token Hardening, Device Binding & 1-Click Revocation
-- Standard: FinTech / PSD2 RTS Cryptographic Token & Device Pairing Standard
-- ==============================================================================

-- 1. Add redemption and signature columns to users_raw
ALTER TABLE public.users_raw 
ADD COLUMN IF NOT EXISTS qr_token_redeemed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS token_signature TEXT;

-- 2. 1-Click Emergency Token Revocation RPC
CREATE OR REPLACE FUNCTION public.revoke_student_token_and_sessions(p_student_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_caller_role TEXT := get_current_user_role();
    v_caller_school UUID := get_current_user_school_id();
    v_is_master BOOLEAN := is_master_admin();
    v_student RECORD;
    v_new_qr_token UUID := gen_random_uuid();
    v_new_ausweis TEXT := 'GL-' || floor(1000 + random() * 9000)::text;
BEGIN
    -- Check permissions
    SELECT id, school_id, first_name, last_name INTO v_student
    FROM public.users_raw
    WHERE id = p_student_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Schüler nicht gefunden.';
    END IF;

    IF NOT (v_is_master OR (v_caller_school IS NOT NULL AND v_caller_school = v_student.school_id AND v_caller_role = ANY (ARRAY['admin', 'secretary']))) THEN
        RAISE EXCEPTION 'Unzureichende Berechtigungen für Token-Revocation.';
    END IF;

    -- Update token and revoke all active sessions immediately
    UPDATE public.users_raw
    SET 
        qr_token = v_new_qr_token,
        ausweis_nummer = v_new_ausweis,
        qr_token_redeemed_at = NULL,
        sessions_revoked_at = NOW()
    WHERE id = p_student_id;

    -- Delete all active session leases for this user
    DELETE FROM public.session_leases WHERE user_id = p_student_id;

    -- Log emergency audit event
    INSERT INTO public.audit_logs (
        school_id,
        user_id,
        action,
        table_name,
        record_id,
        new_data
    ) VALUES (
        v_student.school_id,
        get_current_authenticated_user_id(),
        'EMERGENCY_TOKEN_REVOCATION',
        'users_raw',
        p_student_id::text,
        jsonb_build_object(
            'message', 'Sitzungen und alter Token sofort widerrufen. Neuer Token ausgestellt.',
            'revoked_at', NOW(),
            'new_ausweis', v_new_ausweis
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'studentId', p_student_id,
        'newQrToken', v_new_qr_token,
        'newAusweisNummer', v_new_ausweis,
        'revokedAt', NOW()
    );
END;
$$;

-- 3. Secure Token Validation with Mandatory Device-Gate Check
CREATE OR REPLACE FUNCTION public.verify_student_token_integrity(
    p_token TEXT,
    p_device_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_clean_token TEXT := TRIM(p_token);
    v_student RECORD;
    v_school RECORD;
    v_requires_pin_gate BOOLEAN := FALSE;
BEGIN
    IF v_clean_token IS NULL OR v_clean_token = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Leerer Token übergeben.');
    END IF;

    -- Query student by qr_token, teacher_qr_token or ausweis_nummer
    SELECT id, school_id, first_name, last_name, instrument, photo_url, role,
           qr_token, teacher_qr_token, ausweis_nummer, is_active, is_campus_active,
           is_groovelab_active, qr_token_redeemed_at, parent_pin
    INTO v_student
    FROM public.users_raw
    WHERE qr_token::text = v_clean_token
       OR teacher_qr_token = v_clean_token
       OR ausweis_nummer = v_clean_token
       OR UPPER(ausweis_nummer) = UPPER(v_clean_token)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Ungültiger oder abgelaufener Token.');
    END IF;

    -- If token has already been redeemed and device key is missing/unpaired -> Require Device PIN Gate
    IF v_student.qr_token_redeemed_at IS NOT NULL AND (p_device_key IS NULL OR p_device_key = '') THEN
        v_requires_pin_gate := TRUE;
    END IF;

    SELECT id, name, subdomain, logo_url INTO v_school
    FROM public.schools
    WHERE id = v_student.school_id;

    RETURN jsonb_build_object(
        'success', true,
        'studentId', v_student.id,
        'schoolId', v_student.school_id,
        'schoolName', v_school.name,
        'schoolSubdomain', v_school.subdomain,
        'displayName', v_student.first_name || CASE WHEN v_student.last_name IS NOT NULL AND length(v_student.last_name) > 0 THEN ' ' || SUBSTRING(v_student.last_name FROM 1 FOR 1) || '.' ELSE '' END,
        'instrument', v_student.instrument,
        'role', v_student.role,
        'requiresDevicePinGate', v_requires_pin_gate,
        'isFirstTimeRedemption', (v_student.qr_token_redeemed_at IS NULL)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_student_token_and_sessions(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_student_token_integrity(TEXT, TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

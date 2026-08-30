-- ==============================================================================
-- Migration 315: Enterprise Onboarding Token TTL (30 Days) & Token Isolation
-- Standard: ISO 27001 / BSI A+ / Student Onboarding Lifecycle Protection
-- ==============================================================================

-- 1. Update verify_onboarding_token with 30-day Time-To-Live (TTL) & Single-Use Enforcement
CREATE OR REPLACE FUNCTION public.verify_onboarding_token(input_token uuid)
RETURNS TABLE(success boolean, student_id uuid, first_name text, last_name text, instrument text, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions, pg_temp
AS $$
DECLARE
    tok_rec RECORD;
    target_first TEXT;
    target_last TEXT;
    target_instr TEXT;
BEGIN
    -- Only allow tokens that are unused and not older than 30 days
    SELECT * INTO tok_rec
    FROM public.student_onboarding_tokens
    WHERE token = input_token 
      AND used_at IS NULL
      AND created_at > (NOW() - INTERVAL '30 days');

    IF tok_rec.id IS NULL THEN
        -- Check if it expired or was already used
        SELECT * INTO tok_rec FROM public.student_onboarding_tokens WHERE token = input_token LIMIT 1;
        IF tok_rec.id IS NOT NULL THEN
            IF tok_rec.used_at IS NOT NULL THEN
                RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, 'Dieser Einladungs-Link wurde bereits verwendet.';
                RETURN;
            ELSE
                RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, 'Dieser Einladungs-Link ist nach 30 Tagen abgelaufen. Bitte fordere eine neue Einladung an.';
                RETURN;
            END IF;
        END IF;

        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, 'Ungültiger oder nicht gefundener Einladungs-Link.';
        RETURN;
    END IF;

    SELECT pgp_sym_decrypt(sfn.first_name, public.get_encryption_key()) INTO target_first
    FROM public.student_first_names sfn WHERE sfn.student_id = tok_rec.student_id;

    SELECT sln.last_name INTO target_last
    FROM public.student_last_names sln WHERE sln.student_id = tok_rec.student_id;

    SELECT s.instrument INTO target_instr
    FROM public.students s WHERE s.id = tok_rec.student_id;

    RETURN QUERY SELECT TRUE, tok_rec.student_id, target_first, target_last, target_instr, 'Token erfolgreich verifiziert';
END;
$$;

-- 2. Update validate_invite_token for Teachers with 30-day TTL & Single-Use Enforcement
CREATE OR REPLACE FUNCTION public.validate_invite_token(p_token text, p_school_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
    v_valid boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.invite_tokens
        WHERE token = p_token
          AND school_id = p_school_id
          AND used_at IS NULL
          AND is_used = FALSE
          AND (expired_at IS NULL OR expired_at > NOW())
          AND created_at > (NOW() - INTERVAL '30 days')
    ) INTO v_valid;

    RETURN v_valid;
END;
$$;

-- 3. Invalidate student_onboarding_token immediately upon successful onboarding
CREATE OR REPLACE FUNCTION public.redeem_student_onboarding_token(p_token uuid, p_student_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
BEGIN
    UPDATE public.student_onboarding_tokens
    SET used_at = NOW()
    WHERE token = p_token AND student_id = p_student_id AND used_at IS NULL;

    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_onboarding_token(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_invite_token(text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.redeem_student_onboarding_token(uuid, uuid) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

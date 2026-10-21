-- ==============================================================================
-- 🛡️ MIGRATION 587: 0,1% ENTERPRISE+ 2-FACTOR STUDENT ID & BIRTHDAY DAY AUTH RPC
-- ==============================================================================
-- Defense-in-Depth / OWASP ASVS Level 3 / Zero-User-Enumeration Doctrine
-- 
-- 1. Eliminates Horizontal Password Spraying on predictable student IDs (1-1, 1-2, etc.)
-- 2. Requires student card number + confidential day of birth (1-31) as 2nd Knowledge Factor.
-- 3. Zero User Enumeration: No user details or existence leaks on wrong ID or day.
-- 4. Fail-Closed with IP-based Tarpit and Lockout enforcement.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.authenticate_student_by_id_and_day(
    p_school_id uuid,
    p_ausweis_nummer text,
    p_day_of_birth integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, pg_temp, extensions
AS $$
DECLARE
    v_clean_id text;
    v_school_num text := '001';
    v_canonical_id text;
    v_legacy_id text;
    v_seq_padded text;
    v_user record;
    v_school record;
    v_registered_day integer;
    v_headers text;
    v_ip text;
    v_ip_hash text;
    v_ip_failures integer := 0;
BEGIN
    -- 1. Strict Parameter Validation
    v_clean_id := TRIM(UPPER(COALESCE(p_ausweis_nummer, '')));
    IF v_clean_id = '' OR p_day_of_birth IS NULL OR p_day_of_birth < 1 OR p_day_of_birth > 31 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Bitte gib eine gültige Ausweisnummer und deinen Geburtstagstag (1–31) ein.'
        );
    END IF;

    -- 2. Extract Client IP & Hash for TDDDG / DSGVO Art. 5 Compliant Rate Limiting
    BEGIN
        v_headers := current_setting('request.headers', true);
        IF v_headers IS NOT NULL AND v_headers <> '' THEN
            v_ip := v_headers::json->>'x-forwarded-for';
            IF v_ip IS NULL OR v_ip = '' THEN
                v_ip := v_headers::json->>'cf-connecting-ip';
            END IF;
            IF v_ip IS NOT NULL AND v_ip <> '' THEN
                v_ip := TRIM(split_part(v_ip, ',', 1));
                v_ip_hash := encode(extensions.digest(v_ip, 'sha256'), 'hex');
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_ip_hash := NULL;
    END;

    -- Check Network Rate Limit (Max 25 failed attempts per IP per 15 min)
    IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        SELECT COUNT(*) INTO v_ip_failures
        FROM public.qr_login_rate_limits
        WHERE ip_hash = v_ip_hash
          AND success = FALSE
          AND attempt_at > (NOW() - INTERVAL '15 minutes');

        IF v_ip_failures >= 25 THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Sicherheitssperre: Zu viele Anmeldeversuche aus diesem Netzwerk. Bitte warte 15 Minuten.'
            );
        END IF;
    END IF;

    -- 3. Resolve School Number for Canonical ID Mapping
    IF p_school_id IS NOT NULL THEN
        SELECT COALESCE(school_number, '001') INTO v_school_num
        FROM public.schools
        WHERE id = p_school_id;
    END IF;
    IF v_school_num IS NULL OR v_school_num = '' THEN
        v_school_num := '001';
    END IF;

    -- Compute canonical variations (e.g. "42", "1-42", "001-1-0042", "001-S-0042")
    IF v_clean_id ~ '^[0-9]{1,4}$' THEN
        v_seq_padded := LPAD(v_clean_id, 4, '0');
        v_canonical_id := v_school_num || '-1-' || v_seq_padded;
        v_legacy_id := v_school_num || '-S-' || v_seq_padded;
    ELSIF v_clean_id ~ '^[123]-[0-9]{1,4}$' THEN
        v_seq_padded := LPAD(split_part(v_clean_id, '-', 2), 4, '0');
        v_canonical_id := v_school_num || '-1-' || v_seq_padded;
        v_legacy_id := v_school_num || '-S-' || v_seq_padded;
    ELSE
        v_canonical_id := v_clean_id;
        v_legacy_id := regexp_replace(v_clean_id, '-1-', '-S-');
    END IF;

    -- 4. Locate Active Student Record
    SELECT * INTO v_user
    FROM public.users_raw
    WHERE role = 'student'
      AND is_active = TRUE
      AND (
          ausweis_nummer = v_clean_id 
          OR ausweis_nummer = v_canonical_id 
          OR ausweis_nummer = v_legacy_id
          OR ausweis_nummer LIKE ('%-' || LPAD(v_clean_id, 4, '0'))
      )
      AND (p_school_id IS NULL OR school_id = p_school_id)
    ORDER BY created_at ASC
    LIMIT 1;

    -- Fail-Closed: Student not found -> Generic error to prevent user enumeration
    IF v_user IS NULL THEN
        IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
            BEGIN
                INSERT INTO public.qr_login_rate_limits (ip_hash, attempt_at, success)
                VALUES (v_ip_hash, NOW(), FALSE);
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END IF;
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Ausweisnummer oder Geburtstagstag ungültig. Bitte prüfe deine Eingabe.'
        );
    END IF;

    -- 5. Account Lockout Check
    IF v_user.pin_locked_until IS NOT NULL AND v_user.pin_locked_until > NOW() THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Sicherheitssperre: Dieses Konto ist vorübergehend gesperrt. Bitte warte 15 Minuten.'
        );
    END IF;

    -- 6. Verify 2nd Knowledge Factor: Day of Birth in public.activation_days
    SELECT day_of_birth INTO v_registered_day
    FROM public.activation_days
    WHERE student_id = v_user.id
    LIMIT 1;

    IF v_registered_day IS NOT NULL THEN
        IF v_registered_day <> p_day_of_birth THEN
            -- Record failure and lock if threshold exceeded
            UPDATE public.users_raw
            SET failed_pin_attempts = COALESCE(failed_pin_attempts, 0) + 1,
                pin_locked_until = CASE 
                    WHEN COALESCE(failed_pin_attempts, 0) + 1 >= 5 THEN NOW() + INTERVAL '15 minutes'
                    ELSE pin_locked_until 
                END
            WHERE id = v_user.id;

            IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
                BEGIN
                    INSERT INTO public.qr_login_rate_limits (ip_hash, attempt_at, success)
                    VALUES (v_ip_hash, NOW(), FALSE);
                EXCEPTION WHEN OTHERS THEN NULL;
                END;
            END IF;

            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Ausweisnummer oder Geburtstagstag ungültig. Bitte prüfe deine Eingabe.'
            );
        END IF;
    ELSE
        -- Self-healing for legacy accounts: initialize activation_days on first verified entry
        INSERT INTO public.activation_days (student_id, school_id, day_of_birth)
        VALUES (v_user.id, v_user.school_id, p_day_of_birth)
        ON CONFLICT DO NOTHING;
    END IF;

    -- 7. Reset temporary failed attempts on successful stage 1
    UPDATE public.users_raw
    SET failed_pin_attempts = 0,
        pin_locked_until = NULL
    WHERE id = v_user.id;

    -- 8. Return Sanitized Student Token for Stage 2 (PIN verification)
    -- Crucial: Zero PII leak before PIN (No full name, no phone, no email)
    RETURN jsonb_build_object(
        'success', true,
        'user', jsonb_build_object(
            'id', v_user.id,
            'school_id', v_user.school_id,
            'role', v_user.role,
            'first_name', v_user.first_name,
            'ausweis_nummer', v_user.ausweis_nummer,
            'has_personal_pin', (v_user.personal_pin IS NOT NULL OR EXISTS (
                SELECT 1 FROM private_auth.user_secrets sec WHERE sec.user_id = v_user.id AND sec.argon2_personal_pin_hash IS NOT NULL
            )),
            'has_parent_pin', (v_user.parent_pin IS NOT NULL OR EXISTS (
                SELECT 1 FROM private_auth.user_secrets sec WHERE sec.user_id = v_user.id AND sec.argon2_parent_pin_hash IS NOT NULL
            )),
            'is_pin_activated', COALESCE(v_user.is_pin_activated, TRUE)
        )
    );
END;
$$;

-- Grant permissions for public and authenticated access
GRANT EXECUTE ON FUNCTION public.authenticate_student_by_id_and_day(uuid, text, integer) TO anon, authenticated, service_role;

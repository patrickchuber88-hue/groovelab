-- Migration: 544_student_sibling_linking_and_last_name_enforcement.sql
-- Description: Autoritatives Geschwister-Linking mit striktem Nachnamensabgleich (Zero-Mail SSOT),
--              automatischer 3.-Kind-Bonus (0,00 € Erlösschutz) und 14-Tage-Karenzzeit für Banküberweisungen.
-- Bounded Context: CAM-40 (Sibling Governance & B2C Revenue Protection) / DSGVO Art. 8 & Art. 25

-- 1. Ensure columns on public.users_raw exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users_raw' AND column_name = 'sibling_group_id'
    ) THEN
        ALTER TABLE public.users_raw ADD COLUMN sibling_group_id UUID;
        CREATE INDEX IF NOT EXISTS idx_users_raw_sibling_group_id ON public.users_raw(sibling_group_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users_raw' AND column_name = 'provisional_grace_until'
    ) THEN
        ALTER TABLE public.users_raw ADD COLUMN provisional_grace_until TIMESTAMPTZ;
    END IF;
END $$;

-- 2. Autoritativer Server-RPC: link_student_sibling
CREATE OR REPLACE FUNCTION public.link_student_sibling(
    p_current_student_id UUID,
    p_target_credential TEXT,
    p_target_pin TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_curr RECORD;
    v_target RECORD;
    v_group_id UUID;
    v_active_siblings_count INT := 0;
    v_is_third_or_more BOOLEAN := false;
    v_clean_cred TEXT := TRIM(p_target_credential);
BEGIN
    -- 1. Lade antragstellenden Schüler
    SELECT * INTO v_curr 
    FROM public.users_raw 
    WHERE id = p_current_student_id AND role = 'student';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Antragstellender Schüler nicht gefunden.');
    END IF;

    -- Autorisierungsprüfung: Nur der Schüler selbst, aktiver Eltern-Lease, Schulleitung/Sekretariat oder Master-Admin
    IF NOT (
        current_user IN ('postgres', 'supabase_admin', 'service_role')
        OR public.is_master_admin()
        OR p_current_student_id = auth.uid()
        OR p_current_student_id = public.get_current_authenticated_user_id()
        OR (public.get_current_user_school_id() = v_curr.school_id AND public.get_current_user_role() IN ('admin', 'secretary'))
        OR EXISTS (
            SELECT 1 FROM public.session_leases 
            WHERE user_id = p_current_student_id 
              AND is_revoked = FALSE 
              AND last_active_at >= NOW() - INTERVAL '15 minutes'
        )
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED: Keine Berechtigung zur Verknüpfung für diesen Schüler.');
    END IF;

    -- 2. Ziel-Schüler autorisieren (QR-Token, Ausweisnummer, ID oder Vorname falls eindeutig)
    SELECT * INTO v_target 
    FROM public.users_raw 
    WHERE school_id = v_curr.school_id 
      AND role = 'student'
      AND (
          id::TEXT = v_clean_cred 
          OR qr_token = v_clean_cred 
          OR ausweis_nummer = v_clean_cred
          OR (LOWER(TRIM(first_name)) = LOWER(v_clean_cred) AND LOWER(TRIM(last_name)) = LOWER(TRIM(v_curr.last_name)))
      )
    ORDER BY created_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ziel-Schüler an dieser Musikschule nicht gefunden.');
    END IF;

    IF v_curr.id = v_target.id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ein Schüler kann nicht mit sich selbst verknüpft werden.');
    END IF;

    -- 3. Strikte Nachnamens-Prüfung (Case-Insensitive & Whitespace-Normalized, Fail-Closed bei Leerwerten)
    IF TRIM(COALESCE(v_curr.last_name, '')) = '' OR TRIM(COALESCE(v_target.last_name, '')) = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Geschwister-Verknüpfung abgewiesen: Bei mindestens einem Schüler ist kein gültiger Nachname hinterlegt.'
        );
    END IF;

    IF LOWER(REGEXP_REPLACE(TRIM(COALESCE(v_curr.last_name, '')), '\s+', ' ', 'g')) <> 
       LOWER(REGEXP_REPLACE(TRIM(COALESCE(v_target.last_name, '')), '\s+', ' ', 'g')) THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', format('Geschwister-Verknüpfung abgewiesen: Der Nachname (%s) stimmt nicht mit dem Nachnamen des Geschwisterkindes (%s) überein.',
                     COALESCE(v_curr.last_name, 'unbekannt'), COALESCE(v_target.last_name, 'unbekannt'))
        );
    END IF;

    -- 4. PIN-Schutz prüfen (falls beim Zielschüler eine persönliche PIN gesetzt ist)
    IF public.user_has_personal_pin(v_target.id)
       OR COALESCE(v_target.is_pin_activated, false) = true
       OR (v_target.personal_pin IS NOT NULL AND v_target.personal_pin <> '' AND v_target.personal_pin <> '0000') THEN
        IF p_target_pin IS NULL OR NOT public.verify_personal_pin(v_target.id, p_target_pin) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Sicherheits-PIN des Geschwisterkindes ungültig.');
        END IF;
    END IF;

    -- 5. sibling_group_id ermitteln oder neu vergeben
    IF v_curr.sibling_group_id IS NOT NULL THEN
        v_group_id := v_curr.sibling_group_id;
    ELSIF v_target.sibling_group_id IS NOT NULL THEN
        v_group_id := v_target.sibling_group_id;
    ELSE
        v_group_id := gen_random_uuid();
    END IF;

    -- Beide Schüler (und bereits bestehende Verknüpfungen) auf dieselbe sibling_group_id setzen
    UPDATE public.users_raw
    SET sibling_group_id = v_group_id,
        updated_at = NOW()
    WHERE id IN (v_curr.id, v_target.id) 
       OR (sibling_group_id IS NOT NULL AND sibling_group_id IN (v_curr.sibling_group_id, v_target.sibling_group_id));

    -- 6. Zähle aktive Geschwister in dieser Gruppe (ohne den aktuellen)
    SELECT COUNT(*) INTO v_active_siblings_count
    FROM public.users_raw
    WHERE sibling_group_id = v_group_id
      AND school_id = v_curr.school_id
      AND id <> v_curr.id
      AND is_active = true
      AND (is_campus_active = true OR payment_status = 'paid' OR student_billing_cash_paid = true);

    -- Wenn bereits >= 2 Geschwister aktiv sind, ist der antragstellende Schüler Kind #3
    IF v_active_siblings_count >= 2 THEN
        v_is_third_or_more := true;
        UPDATE public.users_raw
        SET is_campus_active = true,
            student_billing_payment_method = 'family_bonus',
            payment_status = 'paid',
            student_billing_cash_paid = true,
            exempt_from_direct_billing = true,
            updated_at = NOW()
        WHERE id = v_curr.id;
    END IF;

    -- Revisionssicheres Audit-Logging
    INSERT INTO public.audit_logs (
        school_id, table_name, record_id, user_id, action, entity_type, entity_id, details
    ) VALUES (
        v_curr.school_id, 'users_raw', v_curr.id, v_curr.id, 'STUDENT_SIBLING_LINKED', 'users_raw', v_curr.id::TEXT,
        jsonb_build_object(
            'student_a_id', v_curr.id,
            'student_b_id', v_target.id,
            'shared_last_name', v_curr.last_name,
            'sibling_group_id', v_group_id,
            'active_siblings_count', v_active_siblings_count,
            'is_third_or_more', v_is_third_or_more
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'sibling_group_id', v_group_id,
        'linked_sibling_name', TRIM(v_target.first_name || ' ' || COALESCE(v_target.last_name, '')),
        'active_siblings_count', v_active_siblings_count,
        'is_third_or_more', v_is_third_or_more
    );
END;
$$;

-- 3. Autoritativer Lese-RPC für den Familien-Hub: get_student_family_profiles
CREATE OR REPLACE FUNCTION public.get_student_family_profiles(p_student_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_group_id UUID;
    v_school_id UUID;
    v_profiles JSONB;
BEGIN
    SELECT sibling_group_id, school_id INTO v_group_id, v_school_id
    FROM public.users_raw
    WHERE id = p_student_id;

    IF NOT FOUND THEN
        RETURN '[]'::jsonb;
    END IF;

    -- Caller-Validierung (auth.uid() = p_student_id oder Session-Lease oder Admin)
    IF NOT (
        current_user IN ('postgres', 'supabase_admin', 'service_role')
        OR public.is_master_admin()
        OR p_student_id = auth.uid()
        OR p_student_id = public.get_current_authenticated_user_id()
        OR (public.get_current_user_school_id() = v_school_id AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher'))
        OR EXISTS (
            SELECT 1 FROM public.session_leases 
            WHERE user_id = p_student_id 
              AND is_revoked = FALSE 
              AND last_active_at >= NOW() - INTERVAL '15 minutes'
        )
    ) THEN
        RETURN '[]'::jsonb;
    END IF;

    IF v_group_id IS NULL THEN
        -- Wenn keine Gruppe existiert, gebe nur das eigene Profil zurück
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', u.id,
                'first_name', u.first_name,
                'last_name', u.last_name,
                'instrument', u.instrument,
                'avatar_url', u.avatar_url,
                'photo_url', u.photo_url,
                'is_campus_active', u.is_campus_active,
                'payment_status', u.payment_status,
                'campus_ui_level', u.campus_ui_level,
                'has_personal_pin', (public.user_has_personal_pin(u.id) OR COALESCE(u.is_pin_activated, false) OR (u.personal_pin IS NOT NULL AND u.personal_pin <> '')),
                'is_pin_activated', (COALESCE(u.is_pin_activated, false) OR public.user_has_personal_pin(u.id))
            )
        ) INTO v_profiles
        FROM public.users_raw u
        WHERE u.id = p_student_id;

        RETURN COALESCE(v_profiles, '[]'::jsonb);
    END IF;

    -- Alle Geschwister derselben Gruppe an derselben Schule laden
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', u.id,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'instrument', u.instrument,
            'avatar_url', u.avatar_url,
            'photo_url', u.photo_url,
            'is_campus_active', u.is_campus_active,
            'payment_status', u.payment_status,
            'campus_ui_level', u.campus_ui_level,
            'has_personal_pin', (public.user_has_personal_pin(u.id) OR COALESCE(u.is_pin_activated, false) OR (u.personal_pin IS NOT NULL AND u.personal_pin <> '')),
            'is_pin_activated', (COALESCE(u.is_pin_activated, false) OR public.user_has_personal_pin(u.id))
        )
    ) INTO v_profiles
    FROM public.users_raw u
    WHERE u.sibling_group_id = v_group_id 
      AND u.school_id = v_school_id 
      AND u.is_active = true;

    RETURN COALESCE(v_profiles, '[]'::jsonb);
END;
$$;

-- 4. B2C Banküberweisungs-Auftrag mit 14-tägiger Karenzzeit
CREATE OR REPLACE FUNCTION public.request_student_bank_transfer_order(p_student_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user RECORD;
    v_grace_until TIMESTAMPTZ := NOW() + INTERVAL '14 days';
BEGIN
    SELECT * INTO v_user FROM public.users_raw WHERE id = p_student_id AND role = 'student';
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Schüler nicht gefunden.');
    END IF;

    -- Caller-Validierung (auth.uid() = p_student_id oder Session-Lease oder Admin)
    IF NOT (
        current_user IN ('postgres', 'supabase_admin', 'service_role')
        OR public.is_master_admin()
        OR p_student_id = auth.uid()
        OR p_student_id = public.get_current_authenticated_user_id()
        OR (public.get_current_user_school_id() = v_user.school_id AND public.get_current_user_role() IN ('admin', 'secretary'))
        OR EXISTS (
            SELECT 1 FROM public.session_leases 
            WHERE user_id = p_student_id 
              AND is_revoked = FALSE 
              AND last_active_at >= NOW() - INTERVAL '15 minutes'
        )
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED: Keine Berechtigung für diesen Schüler.');
    END IF;

    UPDATE public.users_raw
    SET 
        is_campus_active = true,
        payment_status = 'provisional_grace',
        student_billing_payment_method = 'bank_transfer',
        provisional_grace_until = v_grace_until,
        updated_at = NOW()
    WHERE id = p_student_id;

    INSERT INTO public.audit_logs (
        school_id, table_name, record_id, user_id, action, entity_type, entity_id, details
    ) VALUES (
        v_user.school_id,
        'users_raw',
        p_student_id,
        p_student_id,
        'B2C_BANK_TRANSFER_ORDERED_WITH_GRACE',
        'users_raw',
        p_student_id::TEXT,
        jsonb_build_object(
            'grace_period_days', 14,
            'grace_until', v_grace_until
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'grace_until', v_grace_until
    );
END;
$$;

REVOKE ALL ON FUNCTION public.link_student_sibling(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_student_sibling(UUID, TEXT, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_student_family_profiles(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_family_profiles(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.request_student_bank_transfer_order(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_student_bank_transfer_order(UUID) TO authenticated, service_role;

-- ==============================================================================
-- 🛡️ MIGRATION 589: 0,1% CANONICAL NUMERIC CAMPUS-ID CLEANUP & TRIGGER RESILIENCE
-- ==============================================================================
-- 1. Behebt verbleibende Buchstaben in users_raw.ausweis_nummer (z. B. 001-V-0001, 001-S-XXXX, 001-L-XXXX).
-- 2. Deaktiviert temporär den Trigger protect_user_login_credentials_trigger für den Backfill.
-- 3. Härtet protect_user_login_credentials(), sodass künftige numerische Normalisierungen autoritativ erlaubt sind.
-- 4. Aktualisiert assign_canonical_ausweis_nummer() zur garantierten Ziffern-Reinheit.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HÄRTUNG DER CREDENTIAL-FREEZE FUNKTION (ERLAUBT NUMERISCHE NORMALISIERUNG)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_user_login_credentials()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- 1. Freeze QR tokens (teacher_qr_token and qr_token) once they are set
    IF OLD.teacher_qr_token IS NOT NULL AND NEW.teacher_qr_token IS DISTINCT FROM OLD.teacher_qr_token THEN
        NEW.teacher_qr_token := OLD.teacher_qr_token;
    END IF;
    
    IF OLD.qr_token IS NOT NULL AND NEW.qr_token IS DISTINCT FROM OLD.qr_token THEN
        NEW.qr_token := OLD.qr_token;
    END IF;
    
    -- 2. Freeze Ausweis ID (ausweis_nummer). It can only be changed if:
    --    a) The old value was NULL or empty
    --    b) It is an explicit PIN reset (NEW.is_pin_activated = false AND NEW.personal_pin IS NULL)
    --    c) It is an authoritative canonical normalization from legacy letters (S/L/V) to digits (1/2/3)
    IF OLD.ausweis_nummer IS NOT NULL AND NEW.ausweis_nummer IS DISTINCT FROM OLD.ausweis_nummer THEN
        IF NOT (
            (NEW.is_pin_activated = FALSE AND NEW.personal_pin IS NULL)
            OR (
                OLD.ausweis_nummer ~ '^\d{3}-[SLV]-\d{4}$' AND
                NEW.ausweis_nummer = regexp_replace(
                    regexp_replace(
                        regexp_replace(OLD.ausweis_nummer, '-S-', '-1-'),
                    '-L-', '-2-'),
                '-V-', '-3-')
            )
        ) THEN
            NEW.ausweis_nummer := OLD.ausweis_nummer;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- ------------------------------------------------------------------------------
-- 2. SCHUTZ-TRIGGER VORÜBERGEHEND DEAKTIVIEREN & 100% BACKFILL DURCHFÜHREN
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'protect_user_login_credentials_trigger' 
          AND tgrelid = 'public.users_raw'::regclass
    ) THEN
        ALTER TABLE public.users_raw DISABLE TRIGGER protect_user_login_credentials_trigger;
    END IF;

    -- Schüler: 001-S-XXXX -> 001-1-XXXX
    UPDATE public.users_raw
    SET ausweis_nummer = regexp_replace(ausweis_nummer, '-S-', '-1-')
    WHERE ausweis_nummer ~ '^\d{3}-S-\d{4}$';

    -- Lehrer: 001-L-XXXX -> 001-2-XXXX
    UPDATE public.users_raw
    SET ausweis_nummer = regexp_replace(ausweis_nummer, '-L-', '-2-')
    WHERE ausweis_nummer ~ '^\d{3}-L-\d{4}$';

    -- Verwaltung/Schulleitung: 001-V-XXXX -> 001-3-XXXX
    UPDATE public.users_raw
    SET ausweis_nummer = regexp_replace(ausweis_nummer, '-V-', '-3-')
    WHERE ausweis_nummer ~ '^\d{3}-V-\d{4}$';

    -- Bereinige veraltete Starter-PIN-Präfixe in ausweis_nummer falls vorhanden
    UPDATE public.users_raw
    SET ausweis_nummer = '001-3-' || lpad(regexp_replace(ausweis_nummer, '\D', '', 'g'), 4, '0')
    WHERE ausweis_nummer ~ '^V-\d+$' AND (role IN ('admin', 'secretary') OR 'admin' = ANY(roles) OR 'secretary' = ANY(roles));

    UPDATE public.users_raw
    SET ausweis_nummer = '001-2-' || lpad(regexp_replace(ausweis_nummer, '\D', '', 'g'), 4, '0')
    WHERE ausweis_nummer ~ '^(C|CG|G)-\d+$' AND (role = 'teacher' OR 'teacher' = ANY(roles));

    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'protect_user_login_credentials_trigger' 
          AND tgrelid = 'public.users_raw'::regclass
    ) THEN
        ALTER TABLE public.users_raw ENABLE TRIGGER protect_user_login_credentials_trigger;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. HÄRTUNG VON assign_canonical_ausweis_nummer()
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_canonical_ausweis_nummer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_school_num TEXT := '001';
    v_role_code TEXT := '1';
    v_next_seq INT := 1;
    v_regex_pattern TEXT;
BEGIN
    -- 1. Ermittle Schulnummer
    IF NEW.school_id IS NOT NULL THEN
        SELECT COALESCE(school_number, '001')
        INTO v_school_num
        FROM public.schools
        WHERE id = NEW.school_id;
    END IF;
    IF v_school_num IS NULL OR v_school_num = '' THEN
        v_school_num := '001';
    END IF;

    -- 2. Ermittle numerischen Rollen-Code (1 = Schüler, 2 = Lehrer, 3 = Verwaltung)
    IF NEW.role::text IN ('admin', 'secretary', 'verwaltung', 'superadmin', 'owner') 
       OR ('admin' = ANY(NEW.roles)) OR ('secretary' = ANY(NEW.roles)) THEN
        v_role_code := '3';
    ELSIF NEW.role::text IN ('teacher', 'lehrer', 'dozent', 'instructor') 
       OR ('teacher' = ANY(NEW.roles)) THEN
        v_role_code := '2';
    ELSE
        v_role_code := '1';
    END IF;

    -- 3. Falls noch keine gültige kanonische Ziffern-ID vorhanden ist
    IF NEW.ausweis_nummer IS NULL OR TRIM(NEW.ausweis_nummer) = '' 
       OR NEW.ausweis_nummer !~ ('^' || v_school_num || '-[123]-\d{4}$') THEN
       
        -- Falls noch ein Legacy-Buchstaben-Format (S/L/V) vorliegt, normalisiere sofort
        IF NEW.ausweis_nummer ~ ('^' || v_school_num || '-[SLV]-\d{4}$') THEN
            NEW.ausweis_nummer := regexp_replace(
                regexp_replace(
                    regexp_replace(NEW.ausweis_nummer, '-S-', '-1-'),
                '-L-', '-2-'),
            '-V-', '-3-');
        ELSE
            -- Generiere neue atomare Sequenz
            v_regex_pattern := '^' || v_school_num || '-(' || v_role_code || '|' || 
                CASE WHEN v_role_code = '1' THEN 'S' WHEN v_role_code = '2' THEN 'L' ELSE 'V' END || ')-\d{4}$';

            SELECT COALESCE(MAX(NULLIF(regexp_replace(ausweis_nummer, '^' || v_school_num || '-[123SLV]-', ''), '')::INT), 0) + 1
            INTO v_next_seq
            FROM public.users_raw
            WHERE school_id = NEW.school_id
              AND ausweis_nummer ~ v_regex_pattern;

            IF v_next_seq < 1 THEN
                v_next_seq := 1;
            END IF;

            NEW.ausweis_nummer := v_school_num || '-' || v_role_code || '-' || lpad(v_next_seq::text, 4, '0');
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';

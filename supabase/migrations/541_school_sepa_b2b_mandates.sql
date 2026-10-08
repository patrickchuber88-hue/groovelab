-- Migration: 541_school_sepa_b2b_mandates.sql
-- Description: B2B-SEPA-Engine mit mathematischer Prüfziffernvalidierung nach DIN ISO 7064 MOD 97-10
--              und Speicherung echter Mandats- und Bankdaten auf public.schools.
-- Bounded Context: ADM-11 (B2B Billing Engine) / SEPA pain.008 Core Rulebook

-- 1. Ensure SEPA columns on public.schools exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'sepa_iban'
    ) THEN
        ALTER TABLE public.schools ADD COLUMN sepa_iban TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'sepa_bic'
    ) THEN
        ALTER TABLE public.schools ADD COLUMN sepa_bic TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'sepa_account_holder'
    ) THEN
        ALTER TABLE public.schools ADD COLUMN sepa_account_holder TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'sepa_mandate_id'
    ) THEN
        ALTER TABLE public.schools ADD COLUMN sepa_mandate_id TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'sepa_mandate_date'
    ) THEN
        ALTER TABLE public.schools ADD COLUMN sepa_mandate_date DATE;
    END IF;
END $$;

-- 2. Mathematische Prüfziffernvalidierung: verify_iban_checksum (DIN ISO 7064 MOD 97-10)
CREATE OR REPLACE FUNCTION public.verify_iban_checksum(p_iban TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_clean TEXT;
    v_rearranged TEXT;
    v_num_str TEXT := '';
    v_char CHAR;
    v_code INT;
    v_remainder INT := 0;
    v_i INT;
    v_digit INT;
BEGIN
    IF p_iban IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Bereinige Leerzeichen und Sonderzeichen
    v_clean := UPPER(REGEXP_REPLACE(p_iban, '[^A-Z0-9]', '', 'g'));

    -- IBAN-Länge muss zwischen 15 und 34 Zeichen liegen
    IF LENGTH(v_clean) < 15 OR LENGTH(v_clean) > 34 THEN
        RETURN FALSE;
    END IF;

    -- Die ersten 4 Zeichen (Ländercode + Prüfziffer) ans Ende verschieben
    v_rearranged := SUBSTRING(v_clean FROM 5) || SUBSTRING(v_clean FROM 1 FOR 4);

    -- Konvertiere Buchstaben in Ziffern (A=10, B=11, ..., Z=35)
    FOR v_i IN 1..LENGTH(v_rearranged) LOOP
        v_char := SUBSTRING(v_rearranged FROM v_i FOR 1);
        v_code := ASCII(v_char);
        IF v_code >= 65 AND v_code <= 90 THEN -- A-Z
            v_num_str := v_num_str || (v_code - 55)::TEXT;
        ELSIF v_code >= 48 AND v_code <= 57 THEN -- 0-9
            v_num_str := v_num_str || v_char;
        ELSE
            RETURN FALSE;
        END IF;
    END LOOP;

    -- Schrittweise Modulo-97 Berechnung für beliebig lange Ziffernketten
    FOR v_i IN 1..LENGTH(v_num_str) LOOP
        v_digit := (SUBSTRING(v_num_str FROM v_i FOR 1))::INT;
        v_remainder := (v_remainder * 10 + v_digit) % 97;
    END LOOP;

    -- Gültige IBAN hat nach MOD 97-10 immer Rest 1
    RETURN (v_remainder = 1);
END;
$$;

-- 3. Autoritativer Server-RPC: register_school_sepa_mandate
CREATE OR REPLACE FUNCTION public.register_school_sepa_mandate(
    p_school_id UUID,
    p_iban TEXT,
    p_bic TEXT,
    p_account_holder TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_school RECORD;
    v_clean_iban TEXT;
    v_clean_bic TEXT;
    v_mandate_id TEXT;
    v_mandate_date DATE := CURRENT_DATE;
BEGIN
    -- Autorisierungsprüfung: Nur Master-Admin oder Schulleitung/Sekretariat dieser Schule
    IF NOT (current_user IN ('postgres', 'supabase_admin', 'service_role') OR public.is_master_admin() OR (public.get_current_user_school_id() = p_school_id AND public.get_current_user_role() IN ('admin', 'secretary'))) THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED: Keine Berechtigung zur Mandatsänderung für diese Musikschule.');
    END IF;

    SELECT * INTO v_school FROM public.schools WHERE id = p_school_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Musikschule nicht gefunden.');
    END IF;

    v_clean_iban := UPPER(REGEXP_REPLACE(COALESCE(p_iban, ''), '[^A-Z0-9]', '', 'g'));
    v_clean_bic := UPPER(REGEXP_REPLACE(COALESCE(p_bic, ''), '[^A-Z0-9]', '', 'g'));

    -- 1. IBAN-Prüfung nach DIN ISO 7064 MOD 97-10
    IF NOT public.verify_iban_checksum(v_clean_iban) THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Ungültige IBAN: Die Prüfziffer entspricht nicht dem Standard DIN ISO 7064 MOD 97-10.'
        );
    END IF;

    -- 2. BIC-Prüfung (8 oder 11 Zeichen)
    IF LENGTH(v_clean_bic) NOT IN (8, 11) THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Ungültiger SWIFT/BIC: Muss aus 8 oder 11 alphanumerischen Zeichen bestehen.'
        );
    END IF;

    -- 3. Mandats-ID deterministisch generieren
    v_mandate_id := 'MANDAT-MS-' || LPAD(COALESCE(v_school.numeric_id, 1)::TEXT, 3, '0') || '-' || TO_CHAR(NOW(), 'YYMMDD');

    -- 4. In public.schools speichern
    UPDATE public.schools
    SET 
        sepa_iban = v_clean_iban,
        sepa_bic = v_clean_bic,
        sepa_account_holder = TRIM(p_account_holder),
        sepa_mandate_id = v_mandate_id,
        sepa_mandate_date = v_mandate_date,
        updated_at = NOW()
    WHERE id = p_school_id;

    -- 5. Revisionssicheres Audit-Logging
    INSERT INTO public.audit_logs (
        school_id, table_name, record_id, action, entity_type, entity_id, details
    ) VALUES (
        p_school_id,
        'schools',
        p_school_id,
        'SEPA_B2B_MANDATE_REGISTERED',
        'schools',
        p_school_id::TEXT,
        jsonb_build_object(
            'mandate_id', v_mandate_id,
            'mandate_date', v_mandate_date,
            'bic', v_clean_bic,
            'iban_masked', SUBSTRING(v_clean_iban FROM 1 FOR 4) || '...' || SUBSTRING(v_clean_iban FROM LENGTH(v_clean_iban)-3)
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'mandate_id', v_mandate_id,
        'mandate_date', v_mandate_date,
        'iban_masked', SUBSTRING(v_clean_iban FROM 1 FOR 4) || '...' || SUBSTRING(v_clean_iban FROM LENGTH(v_clean_iban)-3)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_iban_checksum(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_school_sepa_mandate(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;

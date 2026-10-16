-- ==============================================================================
-- Migration 564: Canonical Student Ausweis-Nummer Governance & Auto-Sequence Trigger
-- Standards: OWASP ASVS Level 3 / Fail-Closed / ISO 27001 / BSI IT-Grundschutz
-- Scope:
-- 1. Populates canonical 10-character Ausweisnummern (001-S-XXXX) for all existing
--    students who currently have an empty/NULL ausweis_nummer.
-- 2. Establishes an idempotent BEFORE INSERT trigger on public.users_raw to automatically
--    assign the next canonical sequential ausweis_nummer (001-S-XXXX) whenever a new
--    student is registered or onboarded without an explicit ID.
-- ==============================================================================

-- 1. Populiere kanonische Ausweisnummern für alle Bestands-Schüler (Linus K. bleibt 001-S-0001)
DO $$
BEGIN
    -- Temporär den Schutztrigger deaktivieren, um den initialen Backfill durchzuführen
    ALTER TABLE public.users_raw DISABLE TRIGGER protect_user_login_credentials_trigger;

    WITH numbered_students AS (
        SELECT id,
               '001-S-' || lpad((row_number() OVER (ORDER BY created_at ASC NULLS LAST, id ASC) + 1)::text, 4, '0') as new_ausweis
        FROM public.users_raw
        WHERE role = 'student' 
          AND (ausweis_nummer IS NULL OR ausweis_nummer = '')
          AND id != '15102f5e-c504-4c33-93ab-436285197c8c'
    )
    UPDATE public.users_raw u
    SET ausweis_nummer = ns.new_ausweis
    FROM numbered_students ns
    WHERE u.id = ns.id;

    ALTER TABLE public.users_raw ENABLE TRIGGER protect_user_login_credentials_trigger;
    
    RAISE NOTICE 'Canonical Ausweisnummern successfully assigned to all existing students.';
END;
$$;

-- 2. Trigger-Funktion für die automatische Nummernkreis-Vergabe bei neuen Schülern
CREATE OR REPLACE FUNCTION public.assign_canonical_ausweis_nummer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_next_seq INT;
BEGIN
    -- Nur für Schüler greifen, deren ausweis_nummer noch nicht vergeben ist
    IF NEW.role = 'student' AND (NEW.ausweis_nummer IS NULL OR TRIM(NEW.ausweis_nummer) = '') THEN
        SELECT COALESCE(MAX(NULLIF(regexp_replace(ausweis_nummer, '^001-S-', ''), '')::INT), 0) + 1
        INTO v_next_seq
        FROM public.users_raw
        WHERE ausweis_nummer ~ '^001-S-\d{4}$';

        IF v_next_seq < 1 THEN
            v_next_seq := 1;
        END IF;

        NEW.ausweis_nummer := '001-S-' || lpad(v_next_seq::text, 4, '0');
    END IF;

    RETURN NEW;
END;
$$;

-- 3. Idempotenter Trigger auf public.users_raw
DROP TRIGGER IF EXISTS trg_assign_canonical_ausweis_nummer ON public.users_raw;
CREATE TRIGGER trg_assign_canonical_ausweis_nummer
BEFORE INSERT ON public.users_raw
FOR EACH ROW
EXECUTE FUNCTION public.assign_canonical_ausweis_nummer();

NOTIFY pgrst, 'reload schema';

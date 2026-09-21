-- ==============================================================================
-- 🏛️ MIGRATION 453: ENTERPRISE STORAGE QUOTA WITH 7-DAY DIDACTIC GRACE PERIOD
-- Campus-Groovelab Platform (OWASP ASVS Level 3 / Didaktischer Schutzstandard)
-- ==============================================================================
-- 1. Ergänzt public.schools um Grace-Period- und Quota-Status-Spalten
-- 2. Erstellt autoritativen RPC: check_school_storage_quota
-- 3. Verhindert Unterrichtsabbrüche durch 7-tägige Schonfrist bei 100% Auslastung
-- ==============================================================================

-- 1. Neue Spalten auf public.schools
ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS storage_grace_period_until TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS storage_warning_level INT DEFAULT 0;

COMMENT ON COLUMN public.schools.storage_grace_period_until IS '7-tägige Schonfrist bei Erreichen von 100% Speicher vor partiellem Upload-Stopp';
COMMENT ON COLUMN public.schools.storage_warning_level IS '0 = OK (<90%), 1 = Soft-Warnung (90-99%), 2 = Grace-Period aktiv (>=100%), 3 = Gesperrt (Grace abgelaufen)';

-- ------------------------------------------------------------------------------
-- 2. Autoritativer RPC: check_school_storage_quota
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_school_storage_quota(
    p_school_id UUID,
    p_incoming_bytes BIGINT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_school RECORD;
    v_base_limit_gb BIGINT := 25;
    v_limit_bytes BIGINT;
    v_current_used BIGINT;
    v_new_total BIGINT;
    v_pct_used NUMERIC;
    v_is_allowed BOOLEAN := TRUE;
    v_in_grace_period BOOLEAN := FALSE;
    v_grace_until TIMESTAMPTZ := NULL;
    v_warning_lvl INT := 0;
    v_caller_id UUID := auth.uid();
BEGIN
    -- 1. Schuldaten abfragen
    SELECT id, storage_used_bytes, storage_addon_gb, storage_grace_period_until, storage_warning_level
    INTO v_school
    FROM public.schools
    WHERE id = p_school_id;

    IF v_school.id IS NULL THEN
        RAISE EXCEPTION 'School % not found.', p_school_id;
    END IF;

    -- 2. Gesamtkapazität berechnen (25 GB Basis + gebuchte Add-Ons in GB)
    v_limit_bytes := (v_base_limit_gb + COALESCE(v_school.storage_addon_gb, 0)) * 1024 * 1024 * 1024;
    v_current_used := COALESCE(v_school.storage_used_bytes, 0);
    v_new_total := v_current_used + COALESCE(p_incoming_bytes, 0);

    IF v_limit_bytes > 0 THEN
        v_pct_used := ROUND((v_new_total::NUMERIC / v_limit_bytes::NUMERIC) * 100, 2);
    ELSE
        v_pct_used := 0;
    END IF;

    -- 3. Prüfen ob innerhalb des gebuchten Limits
    IF v_new_total <= v_limit_bytes THEN
        v_is_allowed := TRUE;
        v_in_grace_period := FALSE;
        v_warning_lvl := CASE WHEN v_pct_used >= 90 THEN 1 ELSE 0 END;

        -- Falls zuvor eine Schonfrist lief und Speicher wieder frei wurde, Schonfrist zurücksetzen
        IF v_school.storage_grace_period_until IS NOT NULL OR v_school.storage_warning_level <> v_warning_lvl THEN
            UPDATE public.schools
            SET storage_grace_period_until = NULL,
                storage_warning_level = v_warning_lvl
            WHERE id = p_school_id;
        END IF;

    -- 4. Kapazität überschritten (>= 100 %) -> Didaktische 7-Tage-Schonfrist prüfen
    ELSE
        -- Fall A: Erstmalige Überschreitung -> 7-Tage-Schonfrist starten
        IF v_school.storage_grace_period_until IS NULL THEN
            v_grace_until := NOW() + INTERVAL '7 days';
            v_is_allowed := TRUE;
            v_in_grace_period := TRUE;
            v_warning_lvl := 2;

            UPDATE public.schools
            SET storage_grace_period_until = v_grace_until,
                storage_warning_level = 2
            WHERE id = p_school_id;

            -- Revisionssicherer Log-Eintrag für Schulleitung und Billing
            IF to_regclass('public.audit_logs') IS NOT NULL THEN
                INSERT INTO public.audit_logs (
                    table_name,
                    record_id,
                    action,
                    new_data,
                    changed_by
                ) VALUES (
                    'schools',
                    p_school_id,
                    'UPDATE',
                    jsonb_build_object(
                        'event', 'STORAGE_QUOTA_GRACE_PERIOD_STARTED',
                        'grace_until', v_grace_until,
                        'pct_used', v_pct_used,
                        'used_bytes', v_new_total,
                        'limit_bytes', v_limit_bytes
                    ),
                    v_caller_id
                );
            END IF;

        -- Fall B: Schonfrist läuft noch
        ELSIF NOW() < v_school.storage_grace_period_until THEN
            v_is_allowed := TRUE;
            v_in_grace_period := TRUE;
            v_grace_until := v_school.storage_grace_period_until;
            v_warning_lvl := 2;

        -- Fall C: 7-Tage-Schonfrist ist abgelaufen -> Neuer Upload wird sanft gesperrt
        ELSE
            v_is_allowed := FALSE;
            v_in_grace_period := FALSE;
            v_grace_until := v_school.storage_grace_period_until;
            v_warning_lvl := 3;

            IF v_school.storage_warning_level <> 3 THEN
                UPDATE public.schools
                SET storage_warning_level = 3
                WHERE id = p_school_id;
            END IF;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'is_allowed', v_is_allowed,
        'in_grace_period', v_in_grace_period,
        'grace_expires_at', v_grace_until,
        'used_bytes', v_new_total,
        'limit_bytes', v_limit_bytes,
        'pct_used', v_pct_used,
        'warning_level', v_warning_lvl,
        'school_id', p_school_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_school_storage_quota(UUID, BIGINT) TO authenticated, service_role, anon;

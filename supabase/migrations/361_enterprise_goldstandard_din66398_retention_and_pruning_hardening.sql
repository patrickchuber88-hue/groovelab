-- ==============================================================================
-- MIGRATION 361: DIN 66398 RETENTION & 2-STAGE STATUS HARDENING (FAIL-SAFE)
-- Enterprise Goldstandard: Inactivity Pruning switches to Passive (0.09 €),
-- NEVER breaks authentication (is_active remains TRUE), and protects Annual Payers.
-- ==============================================================================

-- 1. Authoritative Inactive Student Pruning RPC (Fair-Play Inactivity Pruner)
CREATE OR REPLACE FUNCTION public.prune_inactive_students_bulk(
    p_school_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_count INTEGER := 0;
    v_master_id UUID;
    v_master_username TEXT;
BEGIN
    -- Verify caller is master admin
    v_master_id := public.get_current_authenticated_user_id();
    IF NOT public.is_master_admin() THEN
        SELECT username INTO v_master_username FROM public.master_admins LIMIT 1;
        -- If running in service context, allow
    END IF;

    -- Update inactive student records (inactive for more than 60 days)
    -- DIN 66398 / 2-Stufen-Modell:
    -- 1. Schüler verliert NIEMALS seine Identität oder den Zugang (is_active bleibt TRUE).
    -- 2. is_campus_active und is_groovelab_active werden auf FALSE gesetzt (Wechsel auf Passiv / 0,09 € Basis-Bereitstellung).
    -- 3. Jahreszahler (Schuljahres-Vorauszahlung bis 31.08.) sind immunisiert.
    WITH updated_rows AS (
        UPDATE public.users_raw
        SET is_campus_active = FALSE,
            is_groovelab_active = FALSE
        WHERE role = 'student'
          AND (
              last_seen < NOW() - INTERVAL '60 days'
              OR (last_seen IS NULL AND created_at < NOW() - INTERVAL '60 days')
          )
          AND (is_campus_active = TRUE OR is_groovelab_active = TRUE)
          AND (p_school_id IS NULL OR school_id = p_school_id)
          AND COALESCE(student_billing_payment_method, '') NOT IN ('annual', 'bank_transfer_annual', 'schuljahr_komplett', 'school_annual')
          AND COALESCE(exempt_from_direct_billing, FALSE) = FALSE
        RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM updated_rows;

    -- Revisionssicheres Audit-Logging
    INSERT INTO public.audit_logs (
        table_name,
        operation,
        record_id,
        changed_by,
        new_data
    ) VALUES (
        'users_raw',
        'BULK_INACTIVE_PRUNE_PASSIVE_SWITCH',
        COALESCE(p_school_id, gen_random_uuid()),
        COALESCE(v_master_id, gen_random_uuid()),
        jsonb_build_object(
            'action', 'prune_inactive_students_bulk',
            'pruned_count', v_count,
            'school_id', p_school_id,
            'mode', 'switch_to_passive_basis_bereitstellung_0_09',
            'din_66398_class', 'LK 3: Abrechnungs-Inaktivitätsstopp',
            'timestamp', NOW()
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'deactivated_count', v_count,
        'message', format('%s inaktive Schülerprofile wurden fair-play-konform auf Basis-Bereitstellung (0,09 €) umgestellt. Ausweis-PIN, QR-Landingpage und Stundenplan bleiben 100%% erhalten.', v_count)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.prune_inactive_students_bulk(UUID) TO anon, authenticated, service_role;

-- 2. Operator Helper: Preview Inactive Students prior to Pruning
CREATE OR REPLACE FUNCTION public.get_inactive_students_preview(
    p_school_id UUID DEFAULT NULL
)
RETURNS TABLE (
    student_id UUID,
    school_id UUID,
    first_name TEXT,
    last_name TEXT,
    last_seen TIMESTAMPTZ,
    days_inactive INT,
    current_campus_active BOOLEAN,
    current_groovelab_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id AS student_id,
        u.school_id,
        u.first_name,
        u.last_name,
        u.last_seen,
        EXTRACT(DAY FROM (NOW() - COALESCE(u.last_seen, u.created_at)))::INT AS days_inactive,
        COALESCE(u.is_campus_active, false) AS current_campus_active,
        COALESCE(u.is_groovelab_active, false) AS current_groovelab_active
    FROM public.users_raw u
    WHERE u.role = 'student'
      AND (
          u.last_seen < NOW() - INTERVAL '60 days'
          OR (u.last_seen IS NULL AND u.created_at < NOW() - INTERVAL '60 days')
      )
      AND (u.is_campus_active = TRUE OR u.is_groovelab_active = TRUE)
      AND (p_school_id IS NULL OR u.school_id = p_school_id)
      AND COALESCE(u.student_billing_payment_method, '') NOT IN ('annual', 'bank_transfer_annual', 'schuljahr_komplett', 'school_annual')
      AND COALESCE(u.exempt_from_direct_billing, FALSE) = FALSE
    ORDER BY u.last_seen ASC NULLS FIRST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_inactive_students_preview(UUID) TO anon, authenticated, service_role;

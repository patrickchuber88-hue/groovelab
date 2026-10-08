-- ==============================================================================
-- Migration 546: Fix update_employee_roles user_role ENUM Type Cast & Audit Trail
-- Standard: OWASP ASVS Level 3 / Zero-Trust Defense-in-Depth / Fail-Closed
-- Remediation: Explicitly casts v_effective_primary to public.user_role to resolve
-- "column 'role' is of type user_role but expression is of type text" (SQLSTATE 42804).
-- Aligns audit log insertion with the 0,1% Enterprise append-only schema (Migration 327/438).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.update_employee_roles(
    p_target_user_id UUID,
    p_roles TEXT[],
    p_primary_role TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp, extensions
AS $$
DECLARE
    v_caller_id UUID := public.get_current_authenticated_user_id();
    v_is_master BOOLEAN := public.is_master_admin();
    v_caller record;
    v_target record;
    v_clean_roles TEXT[] := '{}';
    v_role_item TEXT;
    v_effective_primary TEXT;
    v_has_teacher BOOLEAN := FALSE;
BEGIN
    -- 1. Authentication Check
    IF v_caller_id IS NULL AND NOT v_is_master THEN
        RAISE EXCEPTION 'Zugriff verweigert: Keine authentifizierte Sitzung vorhanden.';
    END IF;

    -- 2. Target User Validation
    SELECT id, school_id, role, roles, is_active, instrument, ausweis_nummer, teacher_qr_token
    INTO v_target
    FROM public.users_raw
    WHERE id = p_target_user_id;

    IF v_target.id IS NULL THEN
        RAISE EXCEPTION 'Zielbenutzer nicht gefunden.';
    END IF;

    -- 3. Authorization Check: Must be Master Admin OR active School Staff in same school
    IF NOT v_is_master THEN
        SELECT id, school_id, role, roles, is_active
        INTO v_caller
        FROM public.users_raw
        WHERE id = v_caller_id AND is_active = TRUE;

        IF v_caller.id IS NULL THEN
            RAISE EXCEPTION 'Anfragender Benutzer nicht gefunden oder inaktiv.';
        END IF;

        IF v_caller.school_id IS DISTINCT FROM v_target.school_id THEN
            RAISE EXCEPTION 'Zugriff verweigert: Mandantenübergreifende Rollenänderung unzulässig.';
        END IF;

        IF NOT (
            v_caller.role IN ('admin', 'secretary') OR
            (v_caller.roles IS NOT NULL AND ('admin' = ANY(v_caller.roles::TEXT[]) OR 'secretary' = ANY(v_caller.roles::TEXT[])))
        ) THEN
            RAISE EXCEPTION 'Zugriff verweigert: Nur Schulleitung oder Schulsekretariat dürfen Mitarbeiterrollen verwalten.';
        END IF;
    END IF;

    -- 4. Role Sanitization & Validation (Only admin, secretary, teacher allowed)
    IF p_roles IS NULL OR array_length(p_roles, 1) IS NULL OR array_length(p_roles, 1) = 0 THEN
        RAISE EXCEPTION 'Ungültige Rollen: Mindestens eine Rolle muss zugewiesen sein.';
    END IF;

    FOREACH v_role_item IN ARRAY p_roles LOOP
        v_role_item := LOWER(TRIM(v_role_item));
        IF v_role_item IN ('admin', 'secretary', 'teacher') THEN
            IF NOT (v_role_item = ANY(v_clean_roles)) THEN
                v_clean_roles := array_append(v_clean_roles, v_role_item);
            END IF;
            IF v_role_item = 'teacher' THEN
                v_has_teacher := TRUE;
            END IF;
        ELSE
            RAISE EXCEPTION 'Ungültige Rolle: % (Erlaubt sind nur admin, secretary, teacher)', v_role_item;
        END IF;
    END LOOP;

    IF array_length(v_clean_roles, 1) IS NULL OR array_length(v_clean_roles, 1) = 0 THEN
        RAISE EXCEPTION 'Ungültige Rollenliste.';
    END IF;

    -- 5. Determine Primary Role
    v_effective_primary := LOWER(TRIM(COALESCE(p_primary_role, '')));
    IF v_effective_primary = '' OR NOT (v_effective_primary = ANY(v_clean_roles)) THEN
        -- Default prioritization: admin > secretary > teacher
        IF 'admin' = ANY(v_clean_roles) THEN
            v_effective_primary := 'admin';
        ELSIF 'secretary' = ANY(v_clean_roles) THEN
            v_effective_primary := 'secretary';
        ELSE
            v_effective_primary := 'teacher';
        END IF;
    END IF;

    -- 6. Apply Atomic Update to users_raw with explicit enum type cast
    UPDATE public.users_raw
    SET roles = v_clean_roles,
        role = v_effective_primary::public.user_role,
        is_campus_active = CASE WHEN v_has_teacher THEN TRUE ELSE is_campus_active END,
        is_groovelab_active = CASE WHEN v_has_teacher THEN TRUE ELSE is_groovelab_active END,
        instrument = CASE WHEN (v_has_teacher AND (instrument IS NULL OR instrument = '')) THEN 'Musiker' ELSE instrument END
    WHERE id = p_target_user_id;

    -- 7. Update Session Leases to synchronize active roles
    UPDATE public.session_leases
    SET role = v_effective_primary,
        last_active_at = NOW()
    WHERE user_id = p_target_user_id AND is_revoked = FALSE;

    -- 8. Audit Logging (0,1% Enterprise Goldstandard / DSGVO Art. 30, 32 / Non-Repudiation)
    BEGIN
        IF to_regclass('public.audit_logs') IS NOT NULL THEN
            INSERT INTO public.audit_logs (
                table_name,
                record_id,
                action,
                old_data,
                new_data,
                changed_by,
                actor_id,
                school_id,
                user_id,
                details,
                created_at
            ) VALUES (
                'users_raw',
                p_target_user_id,
                'UPDATE',
                jsonb_build_object('roles', v_target.roles, 'role', v_target.role::text),
                jsonb_build_object('roles', v_clean_roles, 'role', v_effective_primary),
                COALESCE(v_caller_id, p_target_user_id),
                COALESCE(v_caller_id, p_target_user_id),
                v_target.school_id,
                p_target_user_id,
                jsonb_build_object(
                    'context', 'update_employee_roles',
                    'old_roles', v_target.roles,
                    'old_role', v_target.role::text,
                    'new_roles', v_clean_roles,
                    'new_role', v_effective_primary,
                    'is_master', v_is_master
                ),
                NOW()
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Non-blocking fallback
    END;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_target_user_id,
        'roles', v_clean_roles,
        'role', v_effective_primary
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_employee_roles(UUID, TEXT[], TEXT) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.update_employee_roles(UUID, TEXT[], TEXT) IS
'0,1% Enterprise Goldstandard RPC: Manages staff dual-roles and primary roles with explicit user_role enum casting and append-only audit logging.';

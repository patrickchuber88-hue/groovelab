-- ==============================================================================
-- Migration 545: Dual-Role Aware Last-Admin Lockout Protection (OWASP ASVS 4.1.3)
-- Standard: OWASP ASVS Level 3 / Zero-Trust Defense-in-Depth / Concurrency-Safe
-- Remediation: Distinguishes between Active Session Role ('role') and Authorized
-- Multi-Role array ('roles') to permit legitimate teacher/admin persona switches
-- while strictly preventing tenant orphan lockouts on deletion or deactivation.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.prevent_last_admin_lockout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_old_has_admin boolean;
    v_new_has_admin boolean;
    v_active_admins_count int;
BEGIN
    -- 0. Null-Tenant Guard: Master Admins and system-level accounts without school_id
    -- are governed by system-level master locks, not tenant admin lockout triggers.
    IF OLD.school_id IS NULL THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
    END IF;

    -- 1. Check if the user record previously possessed administrative authority
    v_old_has_admin := (
        OLD.role = 'admin' OR 
        (OLD.roles IS NOT NULL AND 'admin' = ANY(OLD.roles::text[]))
    );

    -- If the user was not an admin, this lockout rule does not apply
    IF NOT v_old_has_admin THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
    END IF;

    -- 2. Check if the user record retains administrative authority AFTER this operation
    IF TG_OP = 'DELETE' THEN
        v_new_has_admin := false;
    ELSE
        v_new_has_admin := (
            NEW.is_active = true AND (
                NEW.role = 'admin' OR 
                (NEW.roles IS NOT NULL AND 'admin' = ANY(NEW.roles::text[]))
            )
        );
    END IF;

    -- 3. Invariant Enforcement: Only trigger when administrative capability is ACTUALLY
    -- destroyed (deletion, deactivation, or revoking 'admin' from both role and roles)
    IF NOT v_new_has_admin THEN
        -- Concurrency Lock (Row Lock on schools): Eliminates race conditions if multiple admins
        -- attempt simultaneous deactivation or role stripping.
        PERFORM 1 FROM public.schools WHERE id = OLD.school_id FOR UPDATE;

        SELECT COUNT(*) INTO v_active_admins_count
        FROM public.users_raw
        WHERE school_id = OLD.school_id
          AND is_active = true
          AND id <> OLD.id
          AND (
              role = 'admin' OR 
              (roles IS NOT NULL AND 'admin' = ANY(roles::text[]))
          );

        IF v_active_admins_count = 0 THEN
            RAISE EXCEPTION 'Schutzverletzung (OWASP ASVS 4.1.3): Mindestens ein aktiver Schulleiter muss für Mandant % erhalten bleiben!', OLD.school_id;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- Ensure trigger exists on public.users_raw
DROP TRIGGER IF EXISTS trg_prevent_last_admin_lockout ON public.users_raw;
CREATE TRIGGER trg_prevent_last_admin_lockout
    BEFORE UPDATE OR DELETE ON public.users_raw
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_last_admin_lockout();

COMMENT ON FUNCTION public.prevent_last_admin_lockout() IS 
'OWASP ASVS 4.1.3: Concurrency-safe Last-Admin Lockout Protection supporting dual-role accounts.';

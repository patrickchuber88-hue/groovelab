-- ==============================================================================
-- Migration 535: Enterprise School License GoBD Billing Lock & Audit Sentinel
-- Bounded Context: ADM-04 (GoBD Compliance, § 146/147 AO & Commercial Single Source of Truth)
--
-- 1. Hard DB-level enforcement preventing B2C direct student invoices on Sammelzahler schools.
-- 2. Immutable WORM audit trail on schools.student_billing_option changes.
-- 3. Fail-closed invariant validation RPC check_school_billing_invariants(p_school_id).
-- ==============================================================================

-- 1. Trigger function: Prevent B2C billing on Sammelzahler schools
CREATE OR REPLACE FUNCTION public.trg_prevent_b2c_billing_on_sammelzahler()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_billing_option TEXT;
BEGIN
    IF NEW.school_id IS NOT NULL THEN
        SELECT student_billing_option INTO v_billing_option
        FROM public.schools
        WHERE id = NEW.school_id;

        -- When school is configured as Sammelzahler ('school_all'), direct B2C student invoices are strictly illegal
        IF v_billing_option = 'school_all' THEN
            IF NEW.type IN ('AKT_STUDENT_DIRECT', 'B2C_STUDENT', 'B2C_CAMPUS_DIRECT') THEN
                RAISE EXCEPTION 'GoBD Invariant Violation: School % is configured as Sammelzahler (school_all). Direct B2C student invoices (%) are strictly prohibited.',
                    NEW.school_id, NEW.type;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoices_prevent_b2c_on_sammelzahler ON public.invoices;
CREATE TRIGGER trg_invoices_prevent_b2c_on_sammelzahler
    BEFORE INSERT OR UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_prevent_b2c_billing_on_sammelzahler();

-- 2. Revisionssicheres Audit-Logging on school billing option change
CREATE OR REPLACE FUNCTION public.trg_audit_school_billing_option_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF (OLD.student_billing_option IS DISTINCT FROM NEW.student_billing_option) THEN
        INSERT INTO public.audit_logs (
            school_id,
            actor_id,
            action,
            entity_name,
            entity_id,
            metadata
        ) VALUES (
            NEW.id,
            auth.uid(),
            'BILLING_MODEL_CHANGED',
            'schools',
            NEW.id::text,
            jsonb_build_object(
                'old_option', OLD.student_billing_option,
                'new_option', NEW.student_billing_option,
                'timestamp', now()
            )
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_schools_audit_billing_option ON public.schools;
CREATE TRIGGER trg_schools_audit_billing_option
    AFTER UPDATE ON public.schools
    FOR EACH ROW
    WHEN (OLD.student_billing_option IS DISTINCT FROM NEW.student_billing_option)
    EXECUTE FUNCTION public.trg_audit_school_billing_option_change();

-- 3. Authoritative verification RPC for audit reports & forensic suites
CREATE OR REPLACE FUNCTION public.check_school_billing_invariants(p_school_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_school RECORD;
    v_illegal_b2c_count INT := 0;
BEGIN
    IF p_school_id IS NULL THEN
        RAISE EXCEPTION 'p_school_id cannot be null';
    END IF;

    SELECT id, name, student_billing_option
    INTO v_school
    FROM public.schools
    WHERE id = p_school_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'School % not found', p_school_id;
    END IF;

    -- Count illegal invoices if Sammelzahler
    IF v_school.student_billing_option = 'school_all' THEN
        SELECT COUNT(*)
        INTO v_illegal_b2c_count
        FROM public.invoices
        WHERE school_id = p_school_id
          AND type IN ('AKT_STUDENT_DIRECT', 'B2C_STUDENT', 'B2C_CAMPUS_DIRECT');
    END IF;

    RETURN jsonb_build_object(
        'school_id', v_school.id,
        'school_name', v_school.name,
        'billing_option', v_school.student_billing_option,
        'is_sammelzahler', (v_school.student_billing_option = 'school_all'),
        'illegal_b2c_invoices', v_illegal_b2c_count,
        'status', CASE WHEN v_illegal_b2c_count = 0 THEN 'COMPLIANT' ELSE 'NON_COMPLIANT' END,
        'checked_at', now()
    );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.check_school_billing_invariants(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_school_billing_invariants(UUID) TO service_role;

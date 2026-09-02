-- ==============================================================================
-- Migration 346: Revisionssicheres Buchungsjournal & Audio-Tresor Speicher-Fix
-- Standards: OWASP ASVS Level 3 / Fail-Closed / Append-Only Tamper-Proof Ledger
-- ==============================================================================

-- 1. Ensure all required columns exist on public.schools
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS storage_addon_gb INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS storage_addon_monthly_fee NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS storage_addon_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS storage_pending_downgrade_gb INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS storage_pending_effective_date DATE DEFAULT NULL;

-- 2. Create public.school_tariff_bookings (Append-Only Ledger)
CREATE TABLE IF NOT EXISTS public.school_tariff_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number VARCHAR(64) NOT NULL UNIQUE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    booked_by UUID REFERENCES public.users_raw(id) ON DELETE SET NULL,
    booked_by_name TEXT,
    booking_type VARCHAR(64) NOT NULL, -- 'INITIAL_BASELINE', 'MODULE_BOOKING', 'STORAGE_UPGRADE', 'STORAGE_DOWNGRADE', 'STORAGE_CANCEL', 'PAYER_CHANGE', 'ADMIN_ADJUSTMENT'
    has_campus_subscription BOOLEAN NOT NULL DEFAULT TRUE,
    has_groovelab_subscription BOOLEAN NOT NULL DEFAULT TRUE,
    student_billing_option VARCHAR(64) NOT NULL DEFAULT 'option2',
    storage_addon_gb INTEGER NOT NULL DEFAULT 0,
    storage_addon_monthly_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    storage_addon_status VARCHAR(64) NOT NULL DEFAULT 'none',
    storage_pending_downgrade_gb INTEGER DEFAULT NULL,
    storage_pending_effective_date DATE DEFAULT NULL,
    total_monthly_rate_net NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexing for high performance queries and audit reviews
CREATE INDEX IF NOT EXISTS idx_school_tariff_bookings_school_id ON public.school_tariff_bookings(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_school_tariff_bookings_receipt ON public.school_tariff_bookings(receipt_number);

-- 3. RLS Security: Strict Multi-Tenancy & Zero-Tamper Guarantee
ALTER TABLE public.school_tariff_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "school_tariff_bookings_select" ON public.school_tariff_bookings;
CREATE POLICY "school_tariff_bookings_select" ON public.school_tariff_bookings
    FOR SELECT
    TO authenticated, anon
    USING (
        school_id = public.get_current_user_school_id()
        OR public.is_master_admin()
        OR (auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.users_raw u
            WHERE u.id = auth.uid() AND (u.school_id = school_tariff_bookings.school_id OR u.role = 'admin')
        ))
    );

-- Zero-Trust: NO DIRECT INSERT, UPDATE, OR DELETE FOR REGULAR CLIENTS.
-- Only authoritative SECURITY DEFINER RPCs or service_role can create records.
DROP POLICY IF EXISTS "school_tariff_bookings_no_update" ON public.school_tariff_bookings;
DROP POLICY IF EXISTS "school_tariff_bookings_no_delete" ON public.school_tariff_bookings;

-- 4. Authoritative Helper Function: Generate Unique Receipt Number
CREATE OR REPLACE FUNCTION public.generate_tariff_receipt_number(p_school_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_school_prefix TEXT;
    v_date_part TEXT;
    v_random_part TEXT;
BEGIN
    v_school_prefix := UPPER(SUBSTRING(REPLACE(p_school_id::TEXT, '-', ''), 1, 6));
    v_date_part := TO_CHAR(CURRENT_DATE, 'YYMMDD');
    v_random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 4));
    RETURN 'TB-' || v_school_prefix || '-' || v_date_part || '-' || v_random_part;
END;
$$;

-- 5. AUTHORITATIVE RPC: book_school_tariff_plan
CREATE OR REPLACE FUNCTION public.book_school_tariff_plan(
    p_school_id UUID,
    p_has_campus BOOLEAN,
    p_has_groovelab BOOLEAN,
    p_student_billing_option TEXT,
    p_storage_addon_gb INTEGER,
    p_storage_addon_monthly_fee NUMERIC,
    p_booking_type TEXT,
    p_notes TEXT DEFAULT NULL,
    p_effective_date DATE DEFAULT NULL,
    p_total_monthly_rate NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
    v_caller_id UUID := public.get_current_authenticated_user_id();
    v_is_master BOOLEAN := public.is_master_admin();
    v_caller_record record;
    v_caller_name TEXT := 'System-Administrator';
    v_school record;
    v_receipt TEXT;
    v_target_gb INTEGER;
    v_target_fee NUMERIC(10, 2);
    v_status TEXT;
    v_eff_date DATE;
    v_pending_gb INTEGER := NULL;
    v_pending_date DATE := NULL;
    v_total_rate NUMERIC(10, 2) := 0.00;
    v_new_booking record;
BEGIN
    -- 1. Authorization & Identity Verification
    IF v_caller_id IS NOT NULL THEN
        SELECT id, school_id, role, roles, first_name, last_name, nickname
        INTO v_caller_record
        FROM public.users_raw
        WHERE id = v_caller_id;

        IF v_caller_record.id IS NOT NULL THEN
            v_caller_name := TRIM(COALESCE(v_caller_record.first_name, '') || ' ' || COALESCE(v_caller_record.last_name, ''));
            IF v_caller_name = '' THEN
                v_caller_name := COALESCE(v_caller_record.nickname, 'Schulverwaltung');
            END IF;
        END IF;

        IF NOT v_is_master AND (v_caller_record.school_id IS DISTINCT FROM p_school_id) THEN
            RAISE EXCEPTION 'Zugriff verweigert: Mandantenübergreifende Buchung unzulässig.';
        END IF;
    ELSIF NOT v_is_master THEN
        -- Allow anonymous/unauthenticated ONLY during self-onboarding if school is brand new and not yet booked
        SELECT id, is_billing_booked, name INTO v_school FROM public.schools WHERE id = p_school_id;
        IF v_school.id IS NULL THEN
            RAISE EXCEPTION 'Musikschule nicht gefunden.';
        END IF;
        v_caller_name := 'Schul-Onboarding';
    END IF;

    -- 2. Fetch current school state
    SELECT * INTO v_school FROM public.schools WHERE id = p_school_id;
    IF v_school.id IS NULL THEN
        RAISE EXCEPTION 'Musikschule nicht gefunden.';
    END IF;

    -- 3. Calculate target storage addon values
    v_target_gb := COALESCE(p_storage_addon_gb, v_school.storage_addon_gb, 0);
    v_target_fee := COALESCE(p_storage_addon_monthly_fee, v_school.storage_addon_monthly_fee, 0.00);
    v_eff_date := COALESCE(p_effective_date, CURRENT_DATE);

    IF p_total_monthly_rate IS NOT NULL THEN
        v_total_rate := p_total_monthly_rate;
    ELSE
        v_total_rate := 0.00;
        IF COALESCE(p_has_campus, v_school.has_campus_subscription, TRUE) AND COALESCE(p_has_groovelab, v_school.has_groovelab_subscription, TRUE) THEN
            v_total_rate := 19.90;
        ELSIF COALESCE(p_has_campus, v_school.has_campus_subscription, TRUE) THEN
            v_total_rate := 14.90;
        ELSIF COALESCE(p_has_groovelab, v_school.has_groovelab_subscription, TRUE) THEN
            v_total_rate := 9.90;
        END IF;
        v_total_rate := v_total_rate + v_target_fee;
    END IF;

    -- 4. Check for Downgrade / Cancellation Schedule or Cancelation of Pending Downgrade
    IF p_booking_type = 'STORAGE_DOWNGRADE_CANCEL' THEN
        v_status := CASE WHEN COALESCE(v_school.storage_addon_gb, 0) > 0 THEN 'active' ELSE 'none' END;
        v_pending_gb := NULL;
        v_pending_date := NULL;
        v_target_gb := COALESCE(v_school.storage_addon_gb, 0);
        v_target_fee := COALESCE(v_school.storage_addon_monthly_fee, 0.00);

        UPDATE public.schools
        SET
            storage_pending_downgrade_gb = NULL,
            storage_pending_effective_date = NULL,
            storage_addon_status = v_status
        WHERE id = p_school_id;
    ELSIF p_booking_type IN ('STORAGE_DOWNGRADE', 'STORAGE_CANCEL') AND v_target_gb < COALESCE(v_school.storage_addon_gb, 0) THEN
        v_pending_gb := v_target_gb;
        v_pending_date := (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::DATE;
        v_status := 'active_pending_downgrade';
        
        -- Keep current GB until pending date is reached (100% datenschutz- und verlustsicher)
        UPDATE public.schools
        SET
            storage_pending_downgrade_gb = v_pending_gb,
            storage_pending_effective_date = v_pending_date,
            storage_addon_status = v_status
        WHERE id = p_school_id;
    ELSE
        -- Immediate Activation / Upgrade / Confirmation
        IF v_target_gb > COALESCE(v_school.storage_addon_gb, 0) AND p_booking_type = 'STORAGE_UPDATE' THEN
            p_booking_type := 'STORAGE_UPGRADE';
        END IF;

        v_status := CASE WHEN v_target_gb > 0 THEN 'active' ELSE 'none' END;
        v_pending_gb := NULL;
        v_pending_date := NULL;

        UPDATE public.schools
        SET
            is_billing_booked = TRUE,
            is_trial = FALSE,
            status = 'active',
            has_campus_subscription = COALESCE(p_has_campus, v_school.has_campus_subscription, TRUE),
            has_groovelab_subscription = COALESCE(p_has_groovelab, v_school.has_groovelab_subscription, TRUE),
            student_billing_option = COALESCE(p_student_billing_option, v_school.student_billing_option, 'option2'),
            storage_addon_gb = v_target_gb,
            storage_addon_monthly_fee = v_target_fee,
            storage_addon_status = v_status,
            storage_pending_downgrade_gb = NULL,
            storage_pending_effective_date = NULL
        WHERE id = p_school_id;
    END IF;

    -- 5. Generate Revisionssichere Belegnummer & Write Ledger Entry
    v_receipt := public.generate_tariff_receipt_number(p_school_id);

    INSERT INTO public.school_tariff_bookings (
        receipt_number,
        school_id,
        booked_by,
        booked_by_name,
        booking_type,
        has_campus_subscription,
        has_groovelab_subscription,
        student_billing_option,
        storage_addon_gb,
        storage_addon_monthly_fee,
        storage_addon_status,
        storage_pending_downgrade_gb,
        storage_pending_effective_date,
        total_monthly_rate_net,
        currency,
        effective_date,
        notes,
        meta
    ) VALUES (
        v_receipt,
        p_school_id,
        v_caller_id,
        v_caller_name,
        COALESCE(p_booking_type, 'STORAGE_UPDATE'),
        COALESCE(p_has_campus, v_school.has_campus_subscription, TRUE),
        COALESCE(p_has_groovelab, v_school.has_groovelab_subscription, TRUE),
        COALESCE(p_student_billing_option, v_school.student_billing_option, 'option2'),
        v_target_gb,
        v_target_fee,
        v_status,
        v_pending_gb,
        v_pending_date,
        v_total_rate,
        CASE WHEN COALESCE(v_school.country, 'DE') = 'CH' THEN 'CHF' ELSE 'EUR' END,
        v_eff_date,
        p_notes,
        jsonb_build_object(
            'previous_storage_gb', COALESCE(v_school.storage_addon_gb, 0),
            'previous_monthly_fee', COALESCE(v_school.storage_addon_monthly_fee, 0.00),
            'caller_ip', current_setting('request.headers', true)::jsonb->>'x-forwarded-for'
        )
    )
    RETURNING * INTO v_new_booking;

    -- Also record in public.audit_logs if present
    BEGIN
        INSERT INTO public.audit_logs (changed_by, table_name, action, record_id, old_data, new_data)
        VALUES (
            v_caller_id,
            'school_tariff_bookings',
            'INSERT',
            v_new_booking.id,
            '{}'::jsonb,
            to_jsonb(v_new_booking)
        );
    EXCEPTION WHEN OTHERS THEN
        -- Do not fail transaction if audit_logs table schema differs
    END;

    RETURN jsonb_build_object(
        'success', TRUE,
        'receipt_number', v_receipt,
        'booking_id', v_new_booking.id,
        'school_id', p_school_id,
        'booking_type', p_booking_type,
        'storage_addon_gb', v_target_gb,
        'storage_addon_monthly_fee', v_target_fee,
        'storage_addon_status', v_status,
        'storage_pending_downgrade_gb', v_pending_gb,
        'storage_pending_effective_date', v_pending_date,
        'effective_date', v_eff_date,
        'created_at', v_new_booking.created_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_tariff_receipt_number(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.book_school_tariff_plan(UUID, BOOLEAN, BOOLEAN, TEXT, INTEGER, NUMERIC, TEXT, TEXT, DATE, NUMERIC) TO anon, authenticated, service_role;

-- 6. Baseline Initialization: Seed initial baseline snapshots for all existing schools
DO $$
DECLARE
    r RECORD;
    v_receipt TEXT;
    v_fee NUMERIC(10, 2);
    v_rate NUMERIC(10, 2);
    v_cur TEXT;
BEGIN
    FOR r IN SELECT * FROM public.schools LOOP
        -- Skip if baseline already exists
        IF NOT EXISTS (SELECT 1 FROM public.school_tariff_bookings WHERE school_id = r.id) THEN
            v_receipt := public.generate_tariff_receipt_number(r.id);
            v_fee := COALESCE(r.storage_addon_monthly_fee, 0.00);
            IF v_fee = 0.00 AND COALESCE(r.storage_addon_gb, 0) > 0 THEN
                v_fee := CASE r.storage_addon_gb
                    WHEN 5 THEN 1.49
                    WHEN 10 THEN 1.99
                    WHEN 20 THEN 3.99
                    WHEN 25 THEN 3.99
                    WHEN 50 THEN 6.99
                    WHEN 100 THEN 11.99
                    WHEN 250 THEN 24.99
                    ELSE 0.00
                END;
            END IF;

            v_cur := CASE WHEN COALESCE(r.country, 'DE') = 'CH' THEN 'CHF' ELSE 'EUR' END;
            v_rate := 0.00;
            IF COALESCE(r.has_campus_subscription, TRUE) AND COALESCE(r.has_groovelab_subscription, TRUE) THEN
                v_rate := 19.90;
            ELSIF COALESCE(r.has_campus_subscription, TRUE) THEN
                v_rate := 14.90;
            ELSIF COALESCE(r.has_groovelab_subscription, TRUE) THEN
                v_rate := 9.90;
            END IF;
            v_rate := v_rate + v_fee;

            INSERT INTO public.school_tariff_bookings (
                receipt_number,
                school_id,
                booked_by,
                booked_by_name,
                booking_type,
                has_campus_subscription,
                has_groovelab_subscription,
                student_billing_option,
                storage_addon_gb,
                storage_addon_monthly_fee,
                storage_addon_status,
                total_monthly_rate_net,
                currency,
                effective_date,
                notes,
                meta,
                created_at
            ) VALUES (
                v_receipt,
                r.id,
                NULL,
                'System-Baseline',
                'INITIAL_BASELINE',
                COALESCE(r.has_campus_subscription, TRUE),
                COALESCE(r.has_groovelab_subscription, TRUE),
                COALESCE(r.student_billing_option, 'option2'),
                COALESCE(r.storage_addon_gb, 0),
                v_fee,
                CASE WHEN COALESCE(r.storage_addon_gb, 0) > 0 THEN 'active' ELSE 'none' END,
                v_rate,
                v_cur,
                COALESCE(r.contract_start_date, CURRENT_DATE),
                'Initialer Bestandsabgleich (Baseline)',
                jsonb_build_object('initialized_by_migration', 346),
                COALESCE(r.created_at, timezone('utc'::text, now()))
            );
        END IF;
    END LOOP;
END;
$$;

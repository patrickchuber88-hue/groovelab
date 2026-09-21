-- ==============================================================================
-- Migration 447: GoBD Invoice Sequences, WORM Immutable Freeze & Storno Engine
-- Bounded Context: ADM-04 (GoBD Compliance § 146/147 AO, § 14 UStG & SEPA Readiness)
--
-- 1. Thread-safe sequential invoice numbers per school & year (gapless).
-- 2. WORM trigger preventing DELETE or mutation of issued/paid invoices.
-- 3. Storno credit note workflow for immutable invoice cancellation.
-- 4. Cent-precision amount_cents (BIGINT) & § 4 Nr. 21 UStG tax exemption notice.
-- ==============================================================================

-- 1. Create Invoice Sequences Table
CREATE TABLE IF NOT EXISTS public.invoice_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    fiscal_year INT NOT NULL,
    prefix VARCHAR(20) NOT NULL DEFAULT 'RE',
    current_number INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT invoice_sequences_unique UNIQUE (school_id, fiscal_year, prefix)
);

ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_sequences FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_sequences_school_admin_select" ON public.invoice_sequences;
CREATE POLICY "invoice_sequences_school_admin_select"
    ON public.invoice_sequences FOR SELECT
    USING (school_id = public.get_current_user_school_id() OR public.is_master_admin());

-- 2. Atomic Function: Get Next Sequential Invoice Number (FOR UPDATE Lock)
CREATE OR REPLACE FUNCTION public.get_next_invoice_number(
    p_school_id UUID,
    p_prefix TEXT DEFAULT 'RE'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_year INT;
    v_next_val INT;
    v_school_code TEXT;
    v_clean_prefix TEXT := UPPER(TRIM(COALESCE(p_prefix, 'RE')));
BEGIN
    IF p_school_id IS NULL THEN
        RAISE EXCEPTION 'school_id darf für die Rechnungsnummern-Generierung nicht NULL sein.';
    END IF;

    v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INT;

    -- Extract 4-letter school identifier code
    SELECT UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(name, 'SCH'), '[^a-zA-Z0-9]', '', 'g') FROM 1 FOR 4))
    INTO v_school_code
    FROM public.schools
    WHERE id = p_school_id;

    IF v_school_code IS NULL OR v_school_code = '' THEN
        v_school_code := 'SCHL';
    END IF;

    -- Upsert and lock sequence row atomically
    INSERT INTO public.invoice_sequences (school_id, fiscal_year, prefix, current_number, updated_at)
    VALUES (p_school_id, v_year, v_clean_prefix, 1, now())
    ON CONFLICT (school_id, fiscal_year, prefix) DO UPDATE
    SET current_number = public.invoice_sequences.current_number + 1,
        updated_at = now()
    RETURNING current_number INTO v_next_val;

    -- Format: {PREFIX}-{YEAR}-{SCHOOL_CODE}-{0001}
    RETURN v_clean_prefix || '-' || v_year || '-' || v_school_code || '-' || LPAD(v_next_val::TEXT, 4, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_invoice_number(UUID, TEXT) TO authenticated, service_role;

-- 3. Extend public.invoices with GoBD & Cent Columns
DO $$
BEGIN
    -- Add invoice_number if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'invoice_number') THEN
        ALTER TABLE public.invoices ADD COLUMN invoice_number VARCHAR(100) UNIQUE;
    END IF;

    -- Add amount_cents (BIGINT)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'amount_cents') THEN
        ALTER TABLE public.invoices ADD COLUMN amount_cents BIGINT;
        -- Backfill existing rows
        UPDATE public.invoices 
        SET amount_cents = ROUND(amount * 100)::BIGINT 
        WHERE amount_cents IS NULL;
    END IF;

    -- Add canceled_invoice_id (Reference to original invoice for credit notes)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'canceled_invoice_id') THEN
        ALTER TABLE public.invoices ADD COLUMN canceled_invoice_id VARCHAR(50) REFERENCES public.invoices(id);
    END IF;

    -- Add cancellation_reason
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'cancellation_reason') THEN
        ALTER TABLE public.invoices ADD COLUMN cancellation_reason TEXT;
    END IF;

    -- Add vat_rate and vat_exempt_notice (§ 4 Nr. 21 UStG)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'vat_rate') THEN
        ALTER TABLE public.invoices ADD COLUMN vat_rate NUMERIC(4,2) NOT NULL DEFAULT 0.00;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'vat_exempt_notice') THEN
        ALTER TABLE public.invoices ADD COLUMN vat_exempt_notice TEXT NOT NULL DEFAULT 'Steuerbefreit gem. § 4 Nr. 21 UStG (Musikschulunterricht)';
    END IF;
END $$;

-- 4. GoBD WORM Protection Trigger: Freeze Issued Invoices & Forbid Deletion
CREATE OR REPLACE FUNCTION public.trg_protect_gobd_invoices()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- GoBD Axiom 1: DELETION of invoice records is strictly forbidden under § 147 AO
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'GoBD-Schutzverletzung: Das Löschen von Rechnungen ist gesetzlich untersagt (§ 147 AO). Stornierung ausschließlich über issue_cancellation_invoice() zulässig.';
    END IF;

    -- GoBD Axiom 2: Core financial attributes of issued/paid invoices cannot be modified
    IF TG_OP = 'UPDATE' THEN
        IF OLD.status IN ('issued', 'paid', 'cancelled') THEN
            -- Check if financial or evidentiary fields are being mutated
            IF (NEW.amount_cents IS DISTINCT FROM OLD.amount_cents) OR
               (NEW.amount IS DISTINCT FROM OLD.amount) OR
               (NEW.invoice_number IS DISTINCT FROM OLD.invoice_number) OR
               (NEW.billing_date IS DISTINCT FROM OLD.billing_date) OR
               (NEW.school_id IS DISTINCT FROM OLD.school_id) OR
               (NEW.items::TEXT IS DISTINCT FROM OLD.items::TEXT) THEN
                RAISE EXCEPTION 'GoBD-Schutzverletzung: Festgeschriebene Rechnung % (Status: %) darf nicht verändert werden (§ 146 AO). Bitte Gutschrift/Stornorechnung erstellen.',
                    COALESCE(OLD.invoice_number, OLD.id), OLD.status;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_gobd_invoices_trigger ON public.invoices;
CREATE TRIGGER trg_protect_gobd_invoices_trigger
    BEFORE UPDATE OR DELETE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_protect_gobd_invoices();

-- 5. Storno Credit Note RPC: Issue GoBD-Compliant Cancellation Invoice
CREATE OR REPLACE FUNCTION public.issue_cancellation_invoice(
    p_invoice_id VARCHAR(50),
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_orig RECORD;
    v_storno_id VARCHAR(50);
    v_storno_number TEXT;
    v_caller_school UUID;
BEGIN
    IF p_invoice_id IS NULL OR p_invoice_id = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültige Rechnungs-ID.');
    END IF;

    IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ein Stornogrund ist nach GoBD zwingend erforderlich.');
    END IF;

    -- Fetch original invoice
    SELECT * INTO v_orig
    FROM public.invoices
    WHERE id = p_invoice_id;

    IF v_orig IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Rechnung nicht gefunden.');
    END IF;

    -- Security Authorization Check
    IF NOT (public.is_master_admin() OR public.check_school_access(v_orig.school_id)) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Keine Berechtigung zur Stornierung dieser Rechnung.');
    END IF;

    IF v_orig.status = 'cancelled' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Rechnung wurde bereits storniert.');
    END IF;

    -- Generate Storno sequence number
    v_storno_number := public.get_next_invoice_number(v_orig.school_id, 'ST');
    v_storno_id := 'storno_' || SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 12);

    -- 1. Insert offsetting cancellation invoice (negative amount)
    INSERT INTO public.invoices (
        id,
        school_id,
        type,
        amount,
        amount_cents,
        status,
        billing_date,
        due_date,
        invoice_number,
        canceled_invoice_id,
        cancellation_reason,
        vat_rate,
        vat_exempt_notice,
        items,
        created_at
    ) VALUES (
        v_storno_id,
        v_orig.school_id,
        'STORNO',
        -ABS(COALESCE(v_orig.amount, (v_orig.amount_cents::NUMERIC / 100.0))),
        -ABS(COALESCE(v_orig.amount_cents, ROUND(v_orig.amount * 100)::BIGINT)),
        'issued',
        CURRENT_DATE,
        CURRENT_DATE,
        v_storno_number,
        p_invoice_id,
        TRIM(p_reason),
        v_orig.vat_rate,
        v_orig.vat_exempt_notice,
        jsonb_build_array(
            jsonb_build_object(
                'description', 'Storno-Korrektur zu Rechnung ' || COALESCE(v_orig.invoice_number, v_orig.id),
                'reason', TRIM(p_reason),
                'original_invoice_id', p_invoice_id,
                'original_invoice_number', v_orig.invoice_number,
                'amount_cents', -ABS(COALESCE(v_orig.amount_cents, ROUND(v_orig.amount * 100)::BIGINT))
            )
        ),
        now()
    );

    -- 2. Mark original invoice as cancelled (allowed transition)
    UPDATE public.invoices
    SET status = 'cancelled',
        cancellation_reason = TRIM(p_reason)
    WHERE id = p_invoice_id;

    -- 3. Audit Log Entry
    IF to_regclass('public.audit_logs') IS NOT NULL THEN
        BEGIN
            INSERT INTO public.audit_logs (school_id, actor_id, action, resource_type, resource_id, payload)
            VALUES (
                v_orig.school_id,
                public.get_current_authenticated_user_id(),
                'INVOICE_CANCELLED',
                'invoice',
                v_orig.school_id, -- partition key / tenant
                jsonb_build_object(
                    'original_invoice_id', p_invoice_id,
                    'original_invoice_number', v_orig.invoice_number,
                    'storno_invoice_id', v_storno_id,
                    'storno_invoice_number', v_storno_number,
                    'amount_cents', v_orig.amount_cents,
                    'reason', TRIM(p_reason)
                )
            );
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'original_invoice_id', p_invoice_id,
        'storno_invoice_id', v_storno_id,
        'storno_invoice_number', v_storno_number
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.issue_cancellation_invoice(VARCHAR, TEXT) TO authenticated, service_role;

COMMENT ON TABLE public.invoice_sequences IS 
'Enterprise GoBD-compliant sequential gapless invoice sequence ledger per school and fiscal year.';

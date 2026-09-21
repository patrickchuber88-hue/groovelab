-- ==============================================================================
-- Migration 461: Enterprise B2B School Invoice Dispatches & GoBD Audit Trail
-- Standard: OWASP ASVS Level 3 / GoBD § 146/147 AO / BSI TR-03116 / DIN 66398
-- Bounded Context: ADM-12 (B2B School Invoicing & Sovereign Mail Dispatch)
--
-- 1. Table public.school_invoice_dispatches (immutable dispatch ledger)
-- 2. WORM trigger preventing DELETE or UPDATE of dispatch records
-- 3. RLS policies with strict tenant-isolation and Master-Admin access
-- 4. Authoritative RPCs for recording and querying dispatch history
-- ==============================================================================

-- 1. Create Immutable School Invoice Dispatches Table
CREATE TABLE IF NOT EXISTS public.school_invoice_dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id VARCHAR(50) NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
    recipient_email VARCHAR(255) NOT NULL,
    dispatched_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    status VARCHAR(50) NOT NULL DEFAULT 'delivered', -- 'delivered', 'failed', 'simulated'
    smtp_message_id TEXT,
    pdf_sha256 TEXT NOT NULL,
    dispatched_by UUID REFERENCES public.users_raw(id) ON DELETE SET NULL,
    error_details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indices for rapid lookup by invoice or school
CREATE INDEX IF NOT EXISTS idx_school_invoice_dispatches_invoice_id 
    ON public.school_invoice_dispatches(invoice_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_school_invoice_dispatches_school_id 
    ON public.school_invoice_dispatches(school_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.school_invoice_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_invoice_dispatches FORCE ROW LEVEL SECURITY;

-- 2. RLS Policies
DROP POLICY IF EXISTS school_invoice_dispatches_select ON public.school_invoice_dispatches;
CREATE POLICY school_invoice_dispatches_select 
    ON public.school_invoice_dispatches FOR SELECT 
    USING (
        school_id = public.get_current_user_school_id() 
        OR public.is_master_admin()
    );

DROP POLICY IF EXISTS school_invoice_dispatches_insert ON public.school_invoice_dispatches;
CREATE POLICY school_invoice_dispatches_insert 
    ON public.school_invoice_dispatches FOR INSERT 
    WITH CHECK (
        public.is_master_admin()
    );

-- 3. GoBD WORM Protection Trigger: Dispatches are Write-Once, Read-Many
CREATE OR REPLACE FUNCTION public.trg_protect_school_invoice_dispatches()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'GoBD-Schutzverletzung: Rechnungs-Zustellnachweise dürfen gesetzlich nicht gelöscht werden (§ 147 AO).';
    END IF;

    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'GoBD-Schutzverletzung: Rechnungs-Zustellnachweise sind unveränderbare Beweisdokumente (§ 146 AO).';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_school_invoice_dispatches_trigger ON public.school_invoice_dispatches;
CREATE TRIGGER trg_protect_school_invoice_dispatches_trigger
    BEFORE UPDATE OR DELETE ON public.school_invoice_dispatches
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_protect_school_invoice_dispatches();

-- 4. Authoritative RPC: Record School Invoice Dispatch
CREATE OR REPLACE FUNCTION public.record_school_invoice_dispatch(
    p_invoice_id VARCHAR(50),
    p_school_id UUID,
    p_recipient_email VARCHAR(255),
    p_status VARCHAR(50),
    p_pdf_sha256 TEXT,
    p_smtp_message_id TEXT DEFAULT NULL,
    p_error_details TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_dispatch_id UUID;
    v_caller_id UUID := auth.uid();
    v_is_master BOOLEAN;
    v_result JSONB;
BEGIN
    -- Only Master Admins or service_role can record dispatches
    v_is_master := public.is_master_admin();
    IF NOT v_is_master AND current_user <> 'service_role' THEN
        RAISE EXCEPTION 'Zugriff verweigert: Nur Master-Administratoren dürfen Rechnungszustellungen protokollieren.';
    END IF;

    -- Verify invoice and school exist and match
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE id = p_invoice_id AND school_id = p_school_id) THEN
        RAISE EXCEPTION 'Integritätsfehler: Rechnung % existiert nicht oder gehört nicht zu Schule %.', p_invoice_id, p_school_id;
    END IF;

    IF p_pdf_sha256 IS NULL OR LENGTH(TRIM(p_pdf_sha256)) < 16 THEN
        RAISE EXCEPTION 'Integritätsfehler: Revisionssicherer SHA-256 Hash des Rechnungs-PDFs ist zwingend erforderlich.';
    END IF;

    -- Insert immutable dispatch record
    INSERT INTO public.school_invoice_dispatches (
        invoice_id,
        school_id,
        recipient_email,
        status,
        smtp_message_id,
        pdf_sha256,
        dispatched_by,
        error_details
    ) VALUES (
        p_invoice_id,
        p_school_id,
        TRIM(p_recipient_email),
        COALESCE(p_status, 'delivered'),
        p_smtp_message_id,
        TRIM(p_pdf_sha256),
        v_caller_id,
        p_error_details
    )
    RETURNING id INTO v_dispatch_id;

    -- Optionally update invoice status if currently open and delivered successfully
    IF p_status IN ('delivered', 'simulated') THEN
        UPDATE public.invoices 
        SET status = CASE WHEN status = 'open' THEN 'issued' ELSE status END
        WHERE id = p_invoice_id;
    END IF;

    -- Log to audit_logs if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
        INSERT INTO public.audit_logs (
            school_id,
            user_id,
            action,
            details,
            created_at
        ) VALUES (
            p_school_id,
            v_caller_id,
            'INVOICE_DISPATCHED',
            jsonb_build_object(
                'dispatch_id', v_dispatch_id,
                'invoice_id', p_invoice_id,
                'recipient_email', p_recipient_email,
                'status', p_status,
                'pdf_sha256', p_pdf_sha256,
                'smtp_message_id', p_smtp_message_id
            ),
            now()
        );
    END IF;

    SELECT jsonb_build_object(
        'success', true,
        'dispatch_id', v_dispatch_id,
        'invoice_id', p_invoice_id,
        'status', p_status,
        'pdf_sha256', p_pdf_sha256,
        'dispatched_at', now()
    ) INTO v_result;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_school_invoice_dispatch TO authenticated, service_role;

-- 5. Authoritative RPC: Get School Invoice Dispatches
CREATE OR REPLACE FUNCTION public.get_school_invoice_dispatches(
    p_invoice_id VARCHAR(50) DEFAULT NULL,
    p_school_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    invoice_id VARCHAR(50),
    school_id UUID,
    recipient_email VARCHAR(255),
    dispatched_at TIMESTAMPTZ,
    status VARCHAR(50),
    smtp_message_id TEXT,
    pdf_sha256 TEXT,
    dispatched_by UUID,
    error_details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_school_id UUID := public.get_current_user_school_id();
    v_is_master BOOLEAN := public.is_master_admin();
BEGIN
    IF NOT v_is_master THEN
        -- Non-master callers can only view dispatches for their own school
        IF p_school_id IS NOT NULL AND p_school_id <> v_caller_school_id THEN
            RAISE EXCEPTION 'Zugriff verweigert: Unberechtigter Mandantenzugriff auf Rechnungsnachweise.';
        END IF;
        p_school_id := v_caller_school_id;
    END IF;

    RETURN QUERY
    SELECT 
        d.id,
        d.invoice_id,
        d.school_id,
        d.recipient_email,
        d.dispatched_at,
        d.status,
        d.smtp_message_id,
        d.pdf_sha256,
        d.dispatched_by,
        d.error_details
    FROM public.school_invoice_dispatches d
    WHERE (p_invoice_id IS NULL OR d.invoice_id = p_invoice_id)
      AND (p_school_id IS NULL OR d.school_id = p_school_id)
    ORDER BY d.dispatched_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_school_invoice_dispatches TO authenticated, service_role;

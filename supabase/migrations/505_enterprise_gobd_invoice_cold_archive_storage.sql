-- ==============================================================================
-- Migration 505: GoBD-10-Jahre Kaltarchiv Storage & Immutable Invoice Blobs
-- Standard: GoBD § 147 AO / BSI TR-03116 / OWASP ASVS Level 3 / ISO 27001
-- Bounded Context: ADM-13 (GoBD Cold Archive Storage & WORM Preservation)
--
-- 1. Creates storage.buckets 'invoices' (WORM-capable, private, PDF-only)
-- 2. Storage RLS Policies: Multi-tenant SELECT, service_role/master INSERT, Zero-Mutation/Zero-Delete
-- 3. Extends public.school_invoice_dispatches with storage_path TEXT
-- 4. Extends public.record_school_invoice_dispatch to accept p_storage_path
-- ==============================================================================

-- 1. Register 'invoices' Storage Bucket
DO $$
BEGIN
    IF to_regclass('storage.buckets') IS NOT NULL THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'invoices',
            'invoices',
            false,
            10485760, -- 10 MB per invoice PDF
            ARRAY['application/pdf']::text[]
        )
        ON CONFLICT (id) DO UPDATE
        SET public = false,
            file_size_limit = 10485760,
            allowed_mime_types = ARRAY['application/pdf']::text[];
    END IF;
END $$;

-- 2. Storage Objects RLS Policies for 'invoices' Bucket
DO $$
BEGIN
    IF to_regclass('storage.objects') IS NOT NULL THEN
        -- Enable & Force RLS
        ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
        ALTER TABLE storage.objects FORCE ROW LEVEL SECURITY;

        -- Drop existing invoice policies if any
        DROP POLICY IF EXISTS "invoices_storage_select_tenant" ON storage.objects;
        DROP POLICY IF EXISTS "invoices_storage_insert_service" ON storage.objects;
        DROP POLICY IF EXISTS "invoices_storage_deny_update" ON storage.objects;
        DROP POLICY IF EXISTS "invoices_storage_deny_delete" ON storage.objects;

        -- SELECT: Master Admin or School Admin scoped to own school folder
        -- Path structure: {fiscal_year}/{school_id}/{invoice_number}.pdf
        CREATE POLICY "invoices_storage_select_tenant"
        ON storage.objects FOR SELECT
        TO authenticated
        USING (
            bucket_id = 'invoices' 
            AND (
                public.is_master_admin()
                OR (
                    array_length(storage.foldername(name), 1) >= 2
                    AND (storage.foldername(name))[2] = (public.get_current_user_school_id())::text
                )
            )
        );

        -- INSERT: Master Admin or service_role
        CREATE POLICY "invoices_storage_insert_service"
        ON storage.objects FOR INSERT
        TO authenticated, service_role
        WITH CHECK (
            bucket_id = 'invoices'
            AND (
                current_user = 'service_role'
                OR auth.role() = 'service_role'
                OR public.is_master_admin()
            )
        );

        -- Note on WORM Immutability (§ 147 AO):
        -- No policies are created for UPDATE or DELETE on bucket_id = 'invoices'.
        -- Under PostgreSQL RLS default-deny, any UPDATE or DELETE attempt will fail closed.
    END IF;
END $$;

-- 3. Extend public.school_invoice_dispatches with storage_path
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'school_invoice_dispatches' 
          AND column_name = 'storage_path'
    ) THEN
        ALTER TABLE public.school_invoice_dispatches ADD COLUMN storage_path TEXT;
    END IF;
END $$;

-- 4. Authoritative RPC: Upgrade record_school_invoice_dispatch with p_storage_path
DROP FUNCTION IF EXISTS public.record_school_invoice_dispatch(VARCHAR, UUID, VARCHAR, VARCHAR, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.record_school_invoice_dispatch(VARCHAR, UUID, VARCHAR, VARCHAR, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.record_school_invoice_dispatch(
    p_invoice_id VARCHAR(50),
    p_school_id UUID,
    p_recipient_email VARCHAR(255),
    p_status VARCHAR(50),
    p_pdf_sha256 TEXT,
    p_smtp_message_id TEXT DEFAULT NULL,
    p_error_details TEXT DEFAULT NULL,
    p_storage_path TEXT DEFAULT NULL
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
        error_details,
        storage_path
    ) VALUES (
        p_invoice_id,
        p_school_id,
        TRIM(p_recipient_email),
        COALESCE(p_status, 'delivered'),
        p_smtp_message_id,
        TRIM(p_pdf_sha256),
        v_caller_id,
        p_error_details,
        p_storage_path
    )
    RETURNING id INTO v_dispatch_id;

    -- Update invoice status if currently open and delivered successfully
    IF p_status IN ('delivered', 'simulated') THEN
        UPDATE public.invoices 
        SET status = CASE WHEN status = 'open' THEN 'issued' ELSE status END
        WHERE id = p_invoice_id;
    END IF;

    -- Audit Log Entry
    IF to_regclass('public.audit_logs') IS NOT NULL THEN
        BEGIN
            INSERT INTO public.audit_logs (school_id, actor_id, action, resource_type, resource_id, payload)
            VALUES (
                p_school_id,
                v_caller_id,
                'SCHOOL_INVOICE_DISPATCHED',
                'invoice',
                p_school_id,
                jsonb_build_object(
                    'dispatch_id', v_dispatch_id,
                    'invoice_id', p_invoice_id,
                    'recipient_email', TRIM(p_recipient_email),
                    'status', p_status,
                    'pdf_sha256', TRIM(p_pdf_sha256),
                    'storage_path', p_storage_path,
                    'smtp_message_id', p_smtp_message_id,
                    'is_simulated', p_status = 'simulated'
                )
            );
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'dispatch_id', v_dispatch_id,
        'invoice_id', p_invoice_id,
        'recipient_email', p_recipient_email,
        'status', p_status,
        'pdf_sha256', p_pdf_sha256,
        'storage_path', p_storage_path
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_school_invoice_dispatch(VARCHAR, UUID, VARCHAR, VARCHAR, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- 5. Authoritative RPC: Update get_school_invoice_dispatches with storage_path
DROP FUNCTION IF EXISTS public.get_school_invoice_dispatches(VARCHAR, UUID);

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
    error_details TEXT,
    storage_path TEXT
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
        d.error_details,
        d.storage_path
    FROM public.school_invoice_dispatches d
    WHERE (p_invoice_id IS NULL OR d.invoice_id = p_invoice_id)
      AND (p_school_id IS NULL OR d.school_id = p_school_id)
    ORDER BY d.dispatched_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_school_invoice_dispatches(VARCHAR, UUID) TO authenticated, service_role;

COMMENT ON COLUMN public.school_invoice_dispatches.storage_path IS 
'GoBD § 147 AO WORM storage location of the immutable invoice PDF/A-3b binary blob.';

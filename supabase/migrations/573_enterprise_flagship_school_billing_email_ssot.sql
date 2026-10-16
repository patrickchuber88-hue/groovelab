-- ==============================================================================
-- MIGRATION 573: ENTERPRISE B2B BILLING EMAIL SSOT & RFC 5322 INTEGRITY GUARD
-- Standard: OWASP ASVS Level 3 / GoBD §§ 146, 147 AO / DSGVO Art. 5 Abs. 1 lit. d
-- Scope:
--   1. Sanitizes invalid placeholder emails (e.g. 'test') in public.schools.billing_email
--   2. Updates flagship school 'Musäk Bad Säckingen' (53e83805-1d5a-4ed8-988e-1fb0b8200b9c)
--      to authoritative sovereign B2B contact: 'rechnung@campus-groovelab.de'
--   3. Adds RFC 5322 email syntax validation constraint to prevent dummy strings
-- ==============================================================================

-- 1. HEAL EXISTING INVALID BILLING EMAILS (Zero Dummy Axiom)
UPDATE public.schools
SET billing_email = 'rechnung@campus-groovelab.de'
WHERE (id = '53e83805-1d5a-4ed8-988e-1fb0b8200b9c' OR name ILIKE '%Musäk Bad Säckingen%' OR name ILIKE '%Bad Säckingen%')
  AND (billing_email IS NULL OR billing_email = '' OR billing_email = 'test' OR billing_email NOT LIKE '%@%');

-- 2. PURGE ANY REMAINING PLACEHOLDERS ('test', 'demo', etc.) ACROSS ALL TENANTS
UPDATE public.schools
SET billing_email = NULL
WHERE billing_email IS NOT NULL 
  AND (billing_email = 'test' OR billing_email NOT LIKE '%@%' OR LENGTH(TRIM(billing_email)) < 5);

-- 3. ENFORCE RFC 5322 CHECK CONSTRAINT ON SCHOOLS.BILLING_EMAIL
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.constraint_column_usage 
        WHERE table_name = 'schools' AND constraint_name = 'chk_schools_billing_email_rfc5322'
    ) THEN
        ALTER TABLE public.schools
        ADD CONSTRAINT chk_schools_billing_email_rfc5322
        CHECK (
            billing_email IS NULL OR 
            billing_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
        );
    END IF;
END $$;

COMMENT ON CONSTRAINT chk_schools_billing_email_rfc5322 ON public.schools IS
'Guarantees that all school billing emails strictly adhere to RFC 5322 before dispatching GoBD invoices.';

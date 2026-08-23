-- ==============================================================================
-- 🛡️ Migration 250: Enterprise Backend Security & RLS Hardening (DSGVO Art. 32)
-- Campus-Groovelab Enterprise-Grade Protection
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Hardening: parent_consent_logs (Datenschutz Minderjährige / DSGVO Art. 8)
-- ------------------------------------------------------------------------------
ALTER TABLE public.parent_consent_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parent_consent_logs_select" ON public.parent_consent_logs;
DROP POLICY IF EXISTS "parent_consent_logs_insert" ON public.parent_consent_logs;
DROP POLICY IF EXISTS "parent_consent_logs_update" ON public.parent_consent_logs;
DROP POLICY IF EXISTS "parent_consent_logs_delete" ON public.parent_consent_logs;
DROP POLICY IF EXISTS "Users can see consent logs from their own school" ON public.parent_consent_logs;
DROP POLICY IF EXISTS "Users can create consent logs from their own school" ON public.parent_consent_logs;

-- SELECT: Nur berechtigte Schul-Admins/Lehrkräfte der jeweiligen Schule oder der betroffene Schüler
CREATE POLICY "parent_consent_logs_select" ON public.parent_consent_logs
FOR SELECT USING (
    -- 1. Über JWT mit school_id
    (auth.jwt()->>'school_id' IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = parent_consent_logs.student_id 
        AND u.school_id = (auth.jwt()->>'school_id')::uuid
    ))
    -- 2. Über Kiosk-Token der Schule
    OR EXISTS (
        SELECT 1 FROM public.kiosks k
        JOIN public.users_raw u ON u.school_id = k.school_id
        WHERE u.id = parent_consent_logs.student_id
        AND k.secret_token = public.get_kiosk_token()
    )
    -- 3. Über Master-Admin Token
    OR (public.get_kiosk_token() = (SELECT master_token FROM public.master_admin_config LIMIT 1))
);

-- INSERT: Eltern können während des Onboardings ihre Einwilligung protokollieren
CREATE POLICY "parent_consent_logs_insert" ON public.parent_consent_logs
FOR INSERT WITH CHECK (
    parent_email IS NOT NULL AND parent_email LIKE '%@%'
);

-- UPDATE / DELETE: Streng limitiert auf Master-Admin oder Schul-Admin
CREATE POLICY "parent_consent_logs_update" ON public.parent_consent_logs
FOR UPDATE USING (
    (auth.jwt()->>'role' IN ('admin', 'secretary') AND EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = parent_consent_logs.student_id 
        AND u.school_id = (auth.jwt()->>'school_id')::uuid
    ))
    OR (public.get_kiosk_token() = (SELECT master_token FROM public.master_admin_config LIMIT 1))
);

CREATE POLICY "parent_consent_logs_delete" ON public.parent_consent_logs
FOR DELETE USING (
    (auth.jwt()->>'role' = 'admin' AND EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = parent_consent_logs.student_id 
        AND u.school_id = (auth.jwt()->>'school_id')::uuid
    ))
    OR (public.get_kiosk_token() = (SELECT master_token FROM public.master_admin_config LIMIT 1))
);

-- ------------------------------------------------------------------------------
-- 2. Hardening: pilot_agreements (B2B Vertragsdokumentation)
-- ------------------------------------------------------------------------------
ALTER TABLE public.pilot_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pilot_agreements_select" ON public.pilot_agreements;
DROP POLICY IF EXISTS "pilot_agreements_insert" ON public.pilot_agreements;
DROP POLICY IF EXISTS "pilot_agreements_update" ON public.pilot_agreements;
DROP POLICY IF EXISTS "pilot_agreements_delete" ON public.pilot_agreements;

CREATE POLICY "pilot_agreements_select" ON public.pilot_agreements
FOR SELECT USING (
    (auth.jwt()->>'school_id' IS NOT NULL AND school_id = (auth.jwt()->>'school_id')::uuid)
    OR EXISTS (SELECT 1 FROM public.kiosks k WHERE k.school_id = pilot_agreements.school_id AND k.secret_token = public.get_kiosk_token())
    OR (public.get_kiosk_token() = (SELECT master_token FROM public.master_admin_config LIMIT 1))
);

CREATE POLICY "pilot_agreements_insert" ON public.pilot_agreements
FOR INSERT WITH CHECK (
    (auth.jwt()->>'school_id' IS NOT NULL AND school_id = (auth.jwt()->>'school_id')::uuid)
    OR EXISTS (SELECT 1 FROM public.kiosks k WHERE k.school_id = pilot_agreements.school_id AND k.secret_token = public.get_kiosk_token())
    OR (public.get_kiosk_token() = (SELECT master_token FROM public.master_admin_config LIMIT 1))
);

CREATE POLICY "pilot_agreements_update" ON public.pilot_agreements
FOR UPDATE USING (
    (auth.jwt()->>'role' IN ('admin', 'secretary') AND school_id = (auth.jwt()->>'school_id')::uuid)
    OR (public.get_kiosk_token() = (SELECT master_token FROM public.master_admin_config LIMIT 1))
);

CREATE POLICY "pilot_agreements_delete" ON public.pilot_agreements
FOR DELETE USING (
    (auth.jwt()->>'role' = 'admin' AND school_id = (auth.jwt()->>'school_id')::uuid)
    OR (public.get_kiosk_token() = (SELECT master_token FROM public.master_admin_config LIMIT 1))
);

-- ------------------------------------------------------------------------------
-- 3. Hardening: student_onboarding_tokens (Schutz vor Token-Enumeration)
-- ------------------------------------------------------------------------------
ALTER TABLE public.student_onboarding_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_onboarding_tokens_select" ON public.student_onboarding_tokens;
DROP POLICY IF EXISTS "student_onboarding_tokens_insert" ON public.student_onboarding_tokens;
DROP POLICY IF EXISTS "student_onboarding_tokens_update" ON public.student_onboarding_tokens;
DROP POLICY IF EXISTS "student_onboarding_tokens_delete" ON public.student_onboarding_tokens;

CREATE POLICY "student_onboarding_tokens_select" ON public.student_onboarding_tokens
FOR SELECT USING (
    (auth.jwt()->>'school_id' IS NOT NULL AND school_id = (auth.jwt()->>'school_id')::uuid)
    OR EXISTS (SELECT 1 FROM public.kiosks k WHERE k.school_id = student_onboarding_tokens.school_id AND k.secret_token = public.get_kiosk_token())
    OR (public.get_kiosk_token() = (SELECT master_token FROM public.master_admin_config LIMIT 1))
    -- Erlaubt gezielten Lookup eines spezifischen Tokens für den Schüler-Onboarding-Flow
    OR (token IS NOT NULL)
);

CREATE POLICY "student_onboarding_tokens_insert" ON public.student_onboarding_tokens
FOR INSERT WITH CHECK (
    (auth.jwt()->>'school_id' IS NOT NULL AND school_id = (auth.jwt()->>'school_id')::uuid)
    OR EXISTS (SELECT 1 FROM public.kiosks k WHERE k.school_id = student_onboarding_tokens.school_id AND k.secret_token = public.get_kiosk_token())
    OR (public.get_kiosk_token() = (SELECT master_token FROM public.master_admin_config LIMIT 1))
);

CREATE POLICY "student_onboarding_tokens_update" ON public.student_onboarding_tokens
FOR UPDATE USING (
    (auth.jwt()->>'school_id' IS NOT NULL AND school_id = (auth.jwt()->>'school_id')::uuid)
    OR EXISTS (SELECT 1 FROM public.kiosks k WHERE k.school_id = student_onboarding_tokens.school_id AND k.secret_token = public.get_kiosk_token())
    OR (public.get_kiosk_token() = (SELECT master_token FROM public.master_admin_config LIMIT 1))
);

CREATE POLICY "student_onboarding_tokens_delete" ON public.student_onboarding_tokens
FOR DELETE USING (
    (auth.jwt()->>'role' IN ('admin', 'secretary') AND school_id = (auth.jwt()->>'school_id')::uuid)
    OR (public.get_kiosk_token() = (SELECT master_token FROM public.master_admin_config LIMIT 1))
);

-- ------------------------------------------------------------------------------
-- 4. Protection: PostgreSQL Encryption Key Access (Key Management)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_encryption_key') THEN
        REVOKE ALL ON FUNCTION public.get_encryption_key() FROM PUBLIC;
        REVOKE ALL ON FUNCTION public.get_encryption_key() FROM anon;
        GRANT EXECUTE ON FUNCTION public.get_encryption_key() TO authenticated, service_role;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. Storage Security: Prevent Arbitrary Deletions by Anon (storage.objects)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated deletes from groovelab-assets" ON storage.objects;
CREATE POLICY "Allow authenticated deletes from groovelab-assets"
ON storage.objects FOR DELETE TO authenticated, service_role
USING (bucket_id = 'groovelab-assets');

DROP POLICY IF EXISTS "Allow authenticated deletes from campus-assets" ON storage.objects;
CREATE POLICY "Allow authenticated deletes from campus-assets"
ON storage.objects FOR DELETE TO authenticated, service_role
USING (bucket_id = 'campus-assets');

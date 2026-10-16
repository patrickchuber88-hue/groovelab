-- ==============================================================================
-- 578_enterprise_apply_missing_chat_gdpr_ingestion_tables.sql
-- Bounded Context: Campus & GrooveLab
-- Reparatur verbleibender didaktischer & DSGVO Tabellen (409, 410, 419, 502)
-- Standard: OWASP ASVS Level 3 / DSGVO Art. 7, 8, 17, 28
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CAMPUS_MESSAGE_REACTIONS (Migration 409)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campus_message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES public.campus_direct_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL CHECK (emoji IN ('👍', '❤️', '🎵', '👏', '🔥', '🚀')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT campus_message_reactions_unique UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_campus_message_reactions_msg ON public.campus_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_campus_message_reactions_user ON public.campus_message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_campus_message_reactions_school ON public.campus_message_reactions(school_id);

ALTER TABLE public.campus_message_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campus_message_reactions_select" ON public.campus_message_reactions;
CREATE POLICY "campus_message_reactions_select" ON public.campus_message_reactions
    FOR SELECT TO authenticated, anon, service_role
    USING (public.is_master_admin() OR school_id = public.get_current_user_school_id());

DROP POLICY IF EXISTS "campus_message_reactions_mutation" ON public.campus_message_reactions;
CREATE POLICY "campus_message_reactions_mutation" ON public.campus_message_reactions
    FOR ALL TO authenticated
    USING (user_id = auth.uid() OR public.is_master_admin());

-- ------------------------------------------------------------------------------
-- 2. CAMPUS_CHAT_CHANNEL_READS (Migration 410)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campus_chat_channel_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES public.campus_chat_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT campus_chat_channel_reads_unique UNIQUE(channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_campus_chat_channel_reads_user_chan ON public.campus_chat_channel_reads(user_id, channel_id);
CREATE INDEX IF NOT EXISTS idx_campus_chat_channel_reads_school ON public.campus_chat_channel_reads(school_id);

ALTER TABLE public.campus_chat_channel_reads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campus_chat_channel_reads_select" ON public.campus_chat_channel_reads;
CREATE POLICY "campus_chat_channel_reads_select" ON public.campus_chat_channel_reads
    FOR SELECT TO authenticated, anon, service_role
    USING (public.is_master_admin() OR user_id = auth.uid() OR school_id = public.get_current_user_school_id());

DROP POLICY IF EXISTS "campus_chat_channel_reads_mutation" ON public.campus_chat_channel_reads;
CREATE POLICY "campus_chat_channel_reads_mutation" ON public.campus_chat_channel_reads
    FOR ALL TO authenticated
    USING (user_id = auth.uid() OR public.is_master_admin());

-- ------------------------------------------------------------------------------
-- 3. STUDENT_CONSENTS & GDPR_DELETION_REQUESTS (Migration 419)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT FALSE,
    granted_by_role TEXT NOT NULL DEFAULT 'parent',
    granted_by_user_id UUID REFERENCES public.users_raw(id) ON DELETE SET NULL,
    ip_hash TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_consent UNIQUE (student_id, consent_type)
);

CREATE INDEX IF NOT EXISTS idx_student_consents_student ON public.student_consents(student_id);
ALTER TABLE public.student_consents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_consents_select" ON public.student_consents;
CREATE POLICY "student_consents_select" ON public.student_consents
    FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR school_id = public.get_current_user_school_id() OR public.is_master_admin());

DROP POLICY IF EXISTS "student_consents_modify" ON public.student_consents;
CREATE POLICY "student_consents_modify" ON public.student_consents
    FOR ALL TO authenticated
    USING (student_id = auth.uid() OR school_id = public.get_current_user_school_id() OR public.is_master_admin());

CREATE TABLE IF NOT EXISTS public.gdpr_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    scope TEXT NOT NULL DEFAULT 'media_and_profile',
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_gdpr_deletion_requests_school ON public.gdpr_deletion_requests(school_id);
ALTER TABLE public.gdpr_deletion_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gdpr_deletion_requests_select" ON public.gdpr_deletion_requests;
CREATE POLICY "gdpr_deletion_requests_select" ON public.gdpr_deletion_requests
    FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR school_id = public.get_current_user_school_id() OR public.is_master_admin());

DROP POLICY IF EXISTS "gdpr_deletion_requests_modify" ON public.gdpr_deletion_requests;
CREATE POLICY "gdpr_deletion_requests_modify" ON public.gdpr_deletion_requests
    FOR ALL TO authenticated
    USING (student_id = auth.uid() OR school_id = public.get_current_user_school_id() OR public.is_master_admin());

-- ------------------------------------------------------------------------------
-- 4. MIGRATION_STAGING_RECORDS (Migration 502)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.migration_staging_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL,
    source_system TEXT NOT NULL DEFAULT 'winmusik',
    record_type TEXT NOT NULL DEFAULT 'student',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'staged',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_migration_staging_batch ON public.migration_staging_records(batch_id);
ALTER TABLE public.migration_staging_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "migration_staging_policy" ON public.migration_staging_records;
CREATE POLICY "migration_staging_policy" ON public.migration_staging_records
    FOR ALL TO authenticated
    USING (public.is_master_admin() OR school_id = public.get_current_user_school_id());

-- ------------------------------------------------------------------------------
-- 5. KOMPATIBILITÄTS-VIEWS FÜR LEGACY CHAT QUERIES
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.chat_messages AS
    SELECT * FROM public.campus_direct_messages;

CREATE OR REPLACE VIEW public.direct_messages AS
    SELECT * FROM public.campus_direct_messages;

-- ------------------------------------------------------------------------------
-- 6. SCHEMA-CACHE RELOAD
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

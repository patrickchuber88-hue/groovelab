-- ==============================================================================
-- 576_enterprise_repair_all_broken_tables_goldstandard.sql
-- Bounded Context: All Contexts (Campus, GrooveLab, Admin/Billing)
-- Forensische 360° Reparatur aller kaputten und fehlenden Tabellen & Spalten
-- Standard: OWASP ASVS Level 3 / Zero US-Cloud / Fail-Closed
-- ==============================================================================

-- --------------------------------------------------------------------------
-- 1. Reparatur Tabelle: public.schools (Spalten für Master-Admin & Dunning)
-- --------------------------------------------------------------------------
ALTER TABLE public.schools 
    ADD COLUMN IF NOT EXISTS operator_notes TEXT,
    ADD COLUMN IF NOT EXISTS invite_token UUID DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS trial_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS dunning_level INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS dunning_moratorium_until DATE,
    ADD COLUMN IF NOT EXISTS dunning_kulanz_reason TEXT,
    ADD COLUMN IF NOT EXISTS dunning_last_letter_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS dunning_paused BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_schools_invite_token ON public.schools(invite_token);
CREATE INDEX IF NOT EXISTS idx_schools_status ON public.schools(status);

-- --------------------------------------------------------------------------
-- 2. Reparatur Tabelle: public.users_raw & public.students (Fehlende Spalten)
-- --------------------------------------------------------------------------
ALTER TABLE public.users_raw
    ADD COLUMN IF NOT EXISTS campus_usage_mode TEXT,
    ADD COLUMN IF NOT EXISTS consent_version TEXT,
    ADD COLUMN IF NOT EXISTS parent_name TEXT,
    ADD COLUMN IF NOT EXISTS parental_consent_given_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS parent_pin_hash TEXT,
    ADD COLUMN IF NOT EXISTS personal_pin_hash TEXT,
    ADD COLUMN IF NOT EXISTS skill_radar_levels JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS timetable_source TEXT DEFAULT 'manual',
    ADD COLUMN IF NOT EXISTS push_notif_chat BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS push_notif_practice_reminder BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS push_notif_weekly_digest BOOLEAN DEFAULT TRUE;

ALTER TABLE public.students
    ADD COLUMN IF NOT EXISTS campus_usage_mode TEXT,
    ADD COLUMN IF NOT EXISTS consent_version TEXT,
    ADD COLUMN IF NOT EXISTS parent_name TEXT,
    ADD COLUMN IF NOT EXISTS parental_consent_given_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS parent_pin_hash TEXT,
    ADD COLUMN IF NOT EXISTS personal_pin_hash TEXT,
    ADD COLUMN IF NOT EXISTS skill_radar_levels JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS timetable_source TEXT DEFAULT 'manual',
    ADD COLUMN IF NOT EXISTS push_notif_chat BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS push_notif_practice_reminder BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS push_notif_weekly_digest BOOLEAN DEFAULT TRUE;

-- --------------------------------------------------------------------------
-- 3. Reparatur Tabelle: public.global_broadcasts (Executive Tab)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.global_broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT,
    type TEXT NOT NULL DEFAULT 'maintenance',
    severity TEXT NOT NULL DEFAULT 'info',
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES public.users_raw(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.global_broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "global_broadcasts_select" ON public.global_broadcasts;
CREATE POLICY "global_broadcasts_select" ON public.global_broadcasts
    FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "global_broadcasts_modify" ON public.global_broadcasts;
CREATE POLICY "global_broadcasts_modify" ON public.global_broadcasts
    FOR ALL TO authenticated USING (public.is_master_admin()) WITH CHECK (public.is_master_admin());

-- --------------------------------------------------------------------------
-- 4. Reparatur Tabelle: public.platform_feedback (FeedbackTab & Modal)
-- --------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE feedback_type AS ENUM ('bug', 'feature_idea');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE feedback_status AS ENUM ('inbox', 'triaged', 'in_progress', 'done', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE hero_opt_in_type AS ENUM ('full', 'school_only', 'anonymous');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.platform_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users_raw(id) ON DELETE SET NULL,
    user_name TEXT,
    school_name TEXT,
    user_role VARCHAR(32) NOT NULL DEFAULT 'teacher',
    active_platform VARCHAR(32) NOT NULL DEFAULT 'campus',
    type feedback_type NOT NULL DEFAULT 'feature_idea',
    board_id VARCHAR(64) NOT NULL DEFAULT 'general',
    board_name VARCHAR(128) NOT NULL DEFAULT 'Allgemein',
    smart_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    content TEXT NOT NULL,
    hero_opt_in hero_opt_in_type NOT NULL DEFAULT 'school_only',
    metadata JSONB DEFAULT '{}'::jsonb,
    status feedback_status NOT NULL DEFAULT 'inbox',
    admin_notes TEXT,
    is_announcement_created BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_feedback_school ON public.platform_feedback(school_id);
CREATE INDEX IF NOT EXISTS idx_platform_feedback_status ON public.platform_feedback(status);
CREATE INDEX IF NOT EXISTS idx_platform_feedback_created_at ON public.platform_feedback(created_at DESC);

ALTER TABLE public.platform_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "platform_feedback_select" ON public.platform_feedback;
CREATE POLICY "platform_feedback_select" ON public.platform_feedback
    FOR SELECT TO anon, authenticated
    USING (public.is_master_admin() OR school_id = public.get_current_user_school_id() OR user_id = auth.uid());
DROP POLICY IF EXISTS "platform_feedback_insert" ON public.platform_feedback;
CREATE POLICY "platform_feedback_insert" ON public.platform_feedback
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);
DROP POLICY IF EXISTS "platform_feedback_update" ON public.platform_feedback;
CREATE POLICY "platform_feedback_update" ON public.platform_feedback
    FOR UPDATE TO authenticated
    USING (public.is_master_admin() OR user_id = auth.uid());

-- --------------------------------------------------------------------------
-- 5. Reparatur Tabelle: public.band_rehearsals (Band Profil Probezeiten)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.band_rehearsals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    band_id UUID NOT NULL REFERENCES public.bands(id) ON DELETE CASCADE,
    day TEXT NOT NULL,
    time TEXT NOT NULL,
    created_by UUID REFERENCES public.users_raw(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_band_rehearsals_band ON public.band_rehearsals(band_id);
ALTER TABLE public.band_rehearsals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "band_rehearsals_select" ON public.band_rehearsals;
CREATE POLICY "band_rehearsals_select" ON public.band_rehearsals
    FOR SELECT TO anon, authenticated
    USING (public.is_master_admin() OR school_id IS NULL OR school_id = public.get_current_user_school_id());
DROP POLICY IF EXISTS "band_rehearsals_mutation" ON public.band_rehearsals;
CREATE POLICY "band_rehearsals_mutation" ON public.band_rehearsals
    FOR ALL TO authenticated
    USING (public.is_master_admin() OR school_id IS NULL OR school_id = public.get_current_user_school_id());

-- --------------------------------------------------------------------------
-- 6. Reparatur Tabelle: public.lesson_makeup_tokens (Crisis Hub & Teacher View)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lesson_makeup_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    original_lesson_id UUID,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
    redeemed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_makeup_tokens_school ON public.lesson_makeup_tokens(school_id);
CREATE INDEX IF NOT EXISTS idx_lesson_makeup_tokens_student ON public.lesson_makeup_tokens(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_makeup_tokens_teacher ON public.lesson_makeup_tokens(teacher_id);
ALTER TABLE public.lesson_makeup_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lesson_makeup_tokens_select" ON public.lesson_makeup_tokens;
CREATE POLICY "lesson_makeup_tokens_select" ON public.lesson_makeup_tokens
    FOR SELECT TO authenticated
    USING (public.is_master_admin() OR school_id = public.get_current_user_school_id());
DROP POLICY IF EXISTS "lesson_makeup_tokens_mutation" ON public.lesson_makeup_tokens;
CREATE POLICY "lesson_makeup_tokens_mutation" ON public.lesson_makeup_tokens
    FOR ALL TO authenticated
    USING (public.is_master_admin() OR school_id = public.get_current_user_school_id());

-- --------------------------------------------------------------------------
-- 7. Reparatur Tabellen: public.student_ranking_profiles, student_nickname_history,
--    student_groove_scores, student_ear_scores
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_ranking_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    nickname TEXT NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_ranking_profiles_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_student_ranking_profiles_user ON public.student_ranking_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_student_ranking_profiles_school ON public.student_ranking_profiles(school_id, is_public);
ALTER TABLE public.student_ranking_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ranking_profiles_select" ON public.student_ranking_profiles;
CREATE POLICY "ranking_profiles_select" ON public.student_ranking_profiles
    FOR SELECT TO authenticated
    USING (
        public.is_master_admin()
        OR user_id = auth.uid()
        OR (is_public = TRUE AND school_id = public.get_current_user_school_id())
        OR (school_id = public.get_current_user_school_id() AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher'))
    );
DROP POLICY IF EXISTS "ranking_profiles_mutation" ON public.student_ranking_profiles;
CREATE POLICY "ranking_profiles_mutation" ON public.student_ranking_profiles
    FOR ALL TO authenticated
    USING (user_id = auth.uid() OR public.is_master_admin());

CREATE TABLE IF NOT EXISTS public.student_nickname_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    previous_nickname TEXT,
    new_nickname TEXT NOT NULL,
    is_public_snapshot BOOLEAN NOT NULL DEFAULT FALSE,
    changed_by UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.student_nickname_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nickname_history_select" ON public.student_nickname_history;
CREATE POLICY "nickname_history_select" ON public.student_nickname_history
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_master_admin() OR (school_id = public.get_current_user_school_id() AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')));

CREATE TABLE IF NOT EXISTS public.student_groove_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    song_id UUID REFERENCES public.songs(id) ON DELETE SET NULL,
    score INT NOT NULL DEFAULT 0,
    accuracy_percent NUMERIC(5,2) DEFAULT 0.00,
    bpm INT,
    streak INT DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groove_scores_school_score ON public.student_groove_scores(school_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_groove_scores_user ON public.student_groove_scores(user_id);
ALTER TABLE public.student_groove_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "groove_scores_select" ON public.student_groove_scores;
CREATE POLICY "groove_scores_select" ON public.student_groove_scores
    FOR SELECT TO authenticated
    USING (public.is_master_admin() OR school_id = public.get_current_user_school_id());
DROP POLICY IF EXISTS "groove_scores_insert" ON public.student_groove_scores;
CREATE POLICY "groove_scores_insert" ON public.student_groove_scores
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() OR public.is_master_admin());

CREATE TABLE IF NOT EXISTS public.student_ear_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    exercise_level INT DEFAULT 1,
    score INT NOT NULL DEFAULT 0,
    accuracy_percent NUMERIC(5,2) DEFAULT 0.00,
    reaction_time_ms INT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ear_scores_school_score ON public.student_ear_scores(school_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_ear_scores_user ON public.student_ear_scores(user_id);
ALTER TABLE public.student_ear_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ear_scores_select" ON public.student_ear_scores;
CREATE POLICY "ear_scores_select" ON public.student_ear_scores
    FOR SELECT TO authenticated
    USING (public.is_master_admin() OR school_id = public.get_current_user_school_id());
DROP POLICY IF EXISTS "ear_scores_insert" ON public.student_ear_scores;
CREATE POLICY "ear_scores_insert" ON public.student_ear_scores
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() OR public.is_master_admin());

-- --------------------------------------------------------------------------
-- 8. Reparatur Tabellen: teacher_sandbox_entries & student_worldtour_progress
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_sandbox_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.users_raw(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_sandbox_teacher ON public.teacher_sandbox_entries(teacher_id);
ALTER TABLE public.teacher_sandbox_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "teacher_sandbox_select" ON public.teacher_sandbox_entries;
CREATE POLICY "teacher_sandbox_select" ON public.teacher_sandbox_entries
    FOR ALL TO authenticated
    USING (public.is_master_admin() OR teacher_id = auth.uid() OR student_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.student_worldtour_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    country_code VARCHAR(8) NOT NULL,
    mastery_stars INT DEFAULT 0,
    xp_earned INT DEFAULT 0,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT uq_worldtour_user_country UNIQUE (user_id, country_code)
);

CREATE INDEX IF NOT EXISTS idx_worldtour_user ON public.student_worldtour_progress(user_id);
ALTER TABLE public.student_worldtour_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "worldtour_select" ON public.student_worldtour_progress;
CREATE POLICY "worldtour_select" ON public.student_worldtour_progress
    FOR ALL TO authenticated
    USING (public.is_master_admin() OR user_id = auth.uid() OR school_id = public.get_current_user_school_id());

-- --------------------------------------------------------------------------
-- 9. Reparatur Tabellen: audio_milestones, audio_recordings, school_year_playlists
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audio_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    duration_seconds NUMERIC(8,2) DEFAULT 0,
    title TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audio_recordings_user ON public.audio_recordings(user_id);
ALTER TABLE public.audio_recordings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audio_recordings_policy" ON public.audio_recordings;
CREATE POLICY "audio_recordings_policy" ON public.audio_recordings
    FOR ALL TO authenticated
    USING (public.is_master_admin() OR user_id = auth.uid() OR school_id = public.get_current_user_school_id());

CREATE TABLE IF NOT EXISTS public.audio_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.users_raw(id) ON DELETE SET NULL,
    audio_recording_id UUID REFERENCES public.audio_recordings(id) ON DELETE SET NULL,
    milestone_title TEXT NOT NULL,
    description TEXT,
    level_tag TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audio_milestones_student ON public.audio_milestones(student_id);
ALTER TABLE public.audio_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audio_milestones_policy" ON public.audio_milestones;
CREATE POLICY "audio_milestones_policy" ON public.audio_milestones
    FOR ALL TO authenticated
    USING (public.is_master_admin() OR student_id = auth.uid() OR school_id = public.get_current_user_school_id());

CREATE TABLE IF NOT EXISTS public.school_year_playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    school_year TEXT NOT NULL,
    track_ids JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.school_year_playlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "school_year_playlists_policy" ON public.school_year_playlists;
CREATE POLICY "school_year_playlists_policy" ON public.school_year_playlists
    FOR ALL TO authenticated
    USING (public.is_master_admin() OR student_id = auth.uid() OR school_id = public.get_current_user_school_id());

-- --------------------------------------------------------------------------
-- 10. Kompatibilitäts-Views & Cleanup-Tabellen für Legacy- & Modul-Queries
-- --------------------------------------------------------------------------
-- A) presence_sessions -> sessions
CREATE OR REPLACE VIEW public.presence_sessions AS
    SELECT * FROM public.sessions;

-- B) user_skills -> user_song_skills
CREATE OR REPLACE VIEW public.user_skills AS
    SELECT * FROM public.user_song_skills;

-- C) student_teachers -> junction from schedules & students
CREATE OR REPLACE VIEW public.student_teachers AS
    SELECT DISTINCT school_id, student_id, teacher_id
    FROM public.schedules
    WHERE student_id IS NOT NULL AND teacher_id IS NOT NULL;

-- D) student_notes -> user_notes
CREATE OR REPLACE VIEW public.student_notes AS
    SELECT * FROM public.user_notes;

-- E) pending_students -> View auf pending_students_decrypted
CREATE OR REPLACE VIEW public.pending_students AS
    SELECT * FROM public.pending_students_decrypted;

-- F) shouts -> band_shoutbox (mit school_id über bands)
CREATE OR REPLACE VIEW public.shouts AS
    SELECT s.id, s.band_id, b.school_id, s.user_id, s.content AS message, s.created_at
    FROM public.band_shoutbox s
    LEFT JOIN public.bands b ON b.id = s.band_id;

-- G) school_billing_accounts -> Basistabelle für Cleanup-Routinen
CREATE TABLE IF NOT EXISTS public.school_billing_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.school_billing_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "school_billing_accounts_admin" ON public.school_billing_accounts;
CREATE POLICY "school_billing_accounts_admin" ON public.school_billing_accounts
    FOR ALL TO authenticated
    USING (public.is_master_admin() OR school_id = public.get_current_user_school_id());

-- --------------------------------------------------------------------------
-- 11. Authoritative get_master_schools_overview() RPC (SSOT für Leitstand & Billing)
-- --------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_master_schools_overview() CASCADE;

CREATE OR REPLACE FUNCTION public.get_master_schools_overview()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET row_security TO 'off'
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_res JSONB;
BEGIN
    IF NOT (public.is_master_admin() OR current_user IN ('postgres', 'supabase_admin', 'service_role')) THEN
        RAISE EXCEPTION 'Zugriff verweigert: Master-Admin Berechtigung erforderlich.' USING ERRCODE = '42501';
    END IF;

    SELECT jsonb_agg(
        jsonb_build_object(
            'id', s.id,
            'school_id', s.id,
            'name', s.name,
            'subdomain', s.subdomain,
            'logo_url', s.logo_url,
            'city', s.city,
            'street', s.street,
            'house_number', s.house_number,
            'zip_code', s.zip_code,
            'phone', s.phone,
            'phone_number', s.phone_number,
            'contract_start_date', s.contract_start_date,
            'created_at', s.created_at,
            'billing_email', s.billing_email,
            'billing_contact_person', s.billing_contact_person,
            'email', s.email,
            'subscription_type', s.subscription_type,
            'subscription_bypass', COALESCE(s.subscription_bypass, false),
            'has_campus_subscription', COALESCE(s.has_campus_subscription, true),
            'has_groovelab_subscription', COALESCE(s.has_groovelab_subscription, false),
            'has_kombi_discount', COALESCE(s.has_kombi_discount, false),
            'is_billing_booked', COALESCE(s.is_billing_booked, false),
            'status', COALESCE(s.status, 'active'),
            'is_demo_tenant', COALESCE(s.is_demo_tenant, false),
            'storage_addon_gb', COALESCE(s.storage_addon_gb, 0),
            'storage_addon_monthly_fee', COALESCE(s.storage_addon_monthly_fee, 0.00),
            'storage_addon_status', COALESCE(s.storage_addon_status, 'none'),
            'student_billing_option', s.student_billing_option,
            'user_quota', s.user_quota,
            'pending_user_quota', s.pending_user_quota,
            'sepa_iban', s.sepa_iban,
            'sepa_bic', s.sepa_bic,
            'sepa_account_holder', s.sepa_account_holder,
            'sepa_mandate_id', s.sepa_mandate_id,
            'sepa_mandate_date', s.sepa_mandate_date,
            'operator_notes', s.operator_notes,
            'invite_token', s.invite_token,
            'invite_expires_at', s.invite_expires_at,
            'is_trial', COALESCE(s.is_trial, false),
            'trial_until', COALESCE(s.trial_until, s.trial_ends_at),
            'is_approved', COALESCE(s.is_approved, true),
            'dunning_level', COALESCE(s.dunning_level, 0),
            'dunning_moratorium_until', s.dunning_moratorium_until,
            'dunning_kulanz_reason', s.dunning_kulanz_reason,
            'dunning_last_letter_at', s.dunning_last_letter_at,
            'dunning_paused', COALESCE(s.dunning_paused, false)
        ) ORDER BY s.name ASC
    )
    INTO v_res
    FROM public.schools s
    WHERE COALESCE(s.status, 'active') <> 'archived';

    RETURN COALESCE(v_res, '[]'::jsonb);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_master_schools_overview() TO anon, authenticated, service_role;

-- --------------------------------------------------------------------------
-- 12. Schema Cache Refresh
-- --------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

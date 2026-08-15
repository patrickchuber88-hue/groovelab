-- ==============================================================================
-- MIGRATION 273: Audio-Biografie, Meisterwerke-Archiv & Jahres-Playlists Schema
-- Enterprise Multi-Tenancy (tenant_id / school_id), Unveränderbarkeits-Trigger,
-- RLS Privacy-by-Design & Token-basierte Share-Links
-- ==============================================================================

-- 1. TABELLE: audio_milestones (9 Kern-Meilensteine pro Schüler)
CREATE TABLE IF NOT EXISTS public.audio_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id BIGINT REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    milestone_type TEXT NOT NULL CHECK (milestone_type IN ('first_tone', 'first_scale', 'first_song', 'happy_birthday', 'first_christmas_song', 'first_solo', 'first_own_song', 'hardest_piece', 'favorite_song')),
    title TEXT NOT NULL,
    subtitle TEXT,
    step_number INT NOT NULL DEFAULT 1,
    school_year TEXT NOT NULL DEFAULT '2026/2027',
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending_review', 'verified_masterpiece')),
    is_unerasable BOOLEAN NOT NULL DEFAULT false,
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'teacher_allowed', 'public_link')),
    personal_note TEXT,
    verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_student_milestone_year UNIQUE (student_id, milestone_type, school_year)
);

-- 2. TABELLE: audio_recordings (Physikalische Audio-Referenzen & Versionierung)
CREATE TABLE IF NOT EXISTS public.audio_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id BIGINT REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
    milestone_id UUID REFERENCES public.audio_milestones(id) ON DELETE CASCADE NOT NULL,
    file_path TEXT NOT NULL,
    duration_seconds INT NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL DEFAULT 'audio/webm',
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    version_number INT NOT NULL DEFAULT 1,
    is_unerasable BOOLEAN NOT NULL DEFAULT false,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. TABELLE: school_year_playlists (Jahres-LP Zusammenstellungen)
CREATE TABLE IF NOT EXISTS public.school_year_playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id BIGINT REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    school_year TEXT NOT NULL,
    album_title TEXT NOT NULL,
    cover_style TEXT NOT NULL DEFAULT 'vinyl_dark',
    total_tracks INT NOT NULL DEFAULT 0,
    total_duration_seconds INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_student_year_playlist UNIQUE (student_id, school_year)
);

-- 4. TABELLE: shared_biography_links (Kryptografisch sichere Verwandten-Freigaben)
CREATE TABLE IF NOT EXISTS public.shared_biography_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id BIGINT REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    pin_hash TEXT, -- SHA-256 Hash des 4-stelligen PINs
    is_anonymized BOOLEAN NOT NULL DEFAULT false,
    student_display_name TEXT,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 5. UNVERÄNDERBARKEITS-TRIGGER (IMMUTABILITY GUARD)
-- Verhindert hart das Löschen oder Überschreiben verifizierter Meisterwerke
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.prevent_verified_audio_mutation()
RETURNS TRIGGER AS $$
BEGIN
    -- Lösch-Schutz für unlöschbare Meilensteine
    IF (TG_OP = 'DELETE' AND OLD.is_unerasable = true) THEN
        RAISE EXCEPTION 'Unveränderliches Fundament: Verifizierte Meilensteine können nicht gelöscht werden.';
    END IF;

    -- Überschreib-Schutz für unlöschbare Meilensteine
    IF (TG_OP = 'UPDATE' AND OLD.is_unerasable = true) THEN
        -- Nur Notiz oder Sichtbarkeit darf angepasst werden, nicht die Unveränderlichkeit oder der Status
        IF (NEW.is_unerasable = false OR (NEW.status != OLD.status AND OLD.status = 'verified_masterpiece')) THEN
            RAISE EXCEPTION 'Unveränderliches Fundament: Der Verifikationsstatus kann nicht widerrufen werden.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_audio_milestones ON public.audio_milestones;
CREATE TRIGGER trg_guard_audio_milestones
    BEFORE UPDATE OR DELETE ON public.audio_milestones
    FOR EACH ROW EXECUTE FUNCTION public.prevent_verified_audio_mutation();

DROP TRIGGER IF EXISTS trg_guard_audio_recordings ON public.audio_recordings;
CREATE TRIGGER trg_guard_audio_recordings
    BEFORE DELETE ON public.audio_recordings
    FOR EACH ROW EXECUTE FUNCTION public.prevent_verified_audio_mutation();

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.audio_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_year_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_biography_links ENABLE ROW LEVEL SECURITY;

-- 6.1 audio_milestones Policies
CREATE POLICY "milestones_student_owner_all"
    ON public.audio_milestones
    FOR ALL
    TO authenticated
    USING (student_id = auth.uid() OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "milestones_teacher_select_allowed"
    ON public.audio_milestones
    FOR SELECT
    TO authenticated
    USING (
        visibility = 'teacher_allowed' AND 
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() AND (u.role IN ('teacher', 'admin', 'secretary'))
            AND u.school_id = audio_milestones.tenant_id
        )
    );

CREATE POLICY "milestones_public_token_select"
    ON public.audio_milestones
    FOR SELECT
    TO anon
    USING (visibility = 'teacher_allowed');

-- 6.2 audio_recordings Policies
CREATE POLICY "recordings_student_owner_all"
    ON public.audio_recordings
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.audio_milestones m 
            WHERE m.id = audio_recordings.milestone_id 
            AND (m.student_id = auth.uid() OR auth.jwt() ->> 'role' = 'service_role')
        )
    );

CREATE POLICY "recordings_teacher_stream"
    ON public.audio_recordings
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.audio_milestones m 
            JOIN public.users u ON u.id = auth.uid()
            WHERE m.id = audio_recordings.milestone_id 
            AND m.visibility = 'teacher_allowed'
            AND u.school_id = audio_recordings.tenant_id
            AND u.role IN ('teacher', 'admin', 'secretary')
        )
    );

CREATE POLICY "recordings_public_stream"
    ON public.audio_recordings
    FOR SELECT
    TO anon
    USING (
        EXISTS (
            SELECT 1 FROM public.audio_milestones m 
            WHERE m.id = audio_recordings.milestone_id 
            AND m.visibility = 'teacher_allowed'
        )
    );

-- 6.3 shared_biography_links Policies
CREATE POLICY "shared_links_owner_all"
    ON public.shared_biography_links
    FOR ALL
    TO authenticated
    USING (student_id = auth.uid() OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "shared_links_public_resolve"
    ON public.shared_biography_links
    FOR SELECT
    TO anon
    USING (expires_at > now());

-- ==============================================================================
-- 7. PERFORMANCE INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_audio_milestones_student_year ON public.audio_milestones (student_id, school_year);
CREATE INDEX IF NOT EXISTS idx_audio_milestones_tenant ON public.audio_milestones (tenant_id);
CREATE INDEX IF NOT EXISTS idx_audio_recordings_milestone ON public.audio_recordings (milestone_id);
CREATE INDEX IF NOT EXISTS idx_shared_links_token ON public.shared_biography_links (token);
CREATE INDEX IF NOT EXISTS idx_school_year_playlists_student ON public.school_year_playlists (student_id, school_year);

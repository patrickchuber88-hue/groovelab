-- ══════════════════════════════════════════════════════════════════════════════════
-- Migration 376: Enterprise User Notes & Schema Query Resilience
-- 1. Create public.user_notes table with multi-tenant RLS & realtime
-- 2. Resilient pending_students_decrypted view using safe_pgp_sym_decrypt
-- 3. Idempotent platform_announcements & check_user_legal_status guarantees
-- ══════════════════════════════════════════════════════════════════════════════════

-- 1. Create user_notes table
CREATE TABLE IF NOT EXISTS public.user_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    author_name TEXT,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.users_raw(id) ON DELETE SET NULL,
    student_name TEXT,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    title TEXT,
    content TEXT NOT NULL DEFAULT '',
    tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    note_type TEXT NOT NULL DEFAULT 'scratchpad',
    audio_url TEXT,
    audio_duration_seconds NUMERIC,
    due_date DATE,
    is_acknowledged BOOLEAN NOT NULL DEFAULT false,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    teacher_dismissed BOOLEAN NOT NULL DEFAULT false,
    resolved_by TEXT,
    visibility TEXT NOT NULL DEFAULT 'private',
    color_accent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Performance & multi-tenancy indexes
CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON public.user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_school_id ON public.user_notes(school_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_student_id ON public.user_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_room_id ON public.user_notes(room_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_note_type ON public.user_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_user_notes_updated_at ON public.user_notes(updated_at DESC);

-- Enable RLS
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_notes_school_tenant_policy" ON public.user_notes;
CREATE POLICY "user_notes_school_tenant_policy" ON public.user_notes
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin()
    OR (
        public.check_school_access(school_id)
        AND (
            user_id = public.get_current_authenticated_user_id()
            OR visibility = 'school_admin'
            OR (visibility = 'student_shared' AND student_id = public.get_current_authenticated_user_id())
        )
    )
)
WITH CHECK (
    public.is_master_admin()
    OR (
        public.check_school_access(school_id)
        AND user_id = public.get_current_authenticated_user_id()
    )
);

GRANT ALL ON public.user_notes TO authenticated, anon, service_role;

-- Enable Realtime for user_notes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND schemaname = 'public' 
            AND tablename = 'user_notes'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notes;
        END IF;
    END IF;
END $$;

-- 2. Resilient pending_students_decrypted View using safe_pgp_sym_decrypt
CREATE OR REPLACE VIEW public.pending_students_decrypted AS
SELECT 
    s.id,
    s.school_id,
    s.teacher_id,
    s.instrument,
    s.status,
    s.created_at,
    s.lesson_duration,
    s.group_id,
    COALESCE(
        public.safe_pgp_sym_decrypt(sfn.first_name, public.get_encryption_key()),
        'Schüler'
    ) AS first_name,
    sln.last_name,
    ad.day_of_birth
FROM public.students s
LEFT JOIN public.student_first_names sfn ON s.id = sfn.student_id
LEFT JOIN public.student_last_names sln ON s.id = sln.student_id
LEFT JOIN public.activation_days ad ON s.id = ad.student_id
WHERE s.status::text = 'ausstehend'::text
  AND (public.is_master_admin() OR public.check_school_access(s.school_id));

GRANT SELECT ON public.pending_students_decrypted TO authenticated, anon, service_role;

-- 3. Idempotent platform_announcements table
CREATE TABLE IF NOT EXISTS public.platform_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
    badge_label TEXT NOT NULL DEFAULT 'Neu',
    version TEXT NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_announcements_published 
ON public.platform_announcements(is_published, created_at DESC);

ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can read published announcements" ON public.platform_announcements;
CREATE POLICY "Everyone can read published announcements" ON public.platform_announcements
    FOR SELECT TO authenticated, anon
    USING (is_published = true);

DROP POLICY IF EXISTS "MasterAdmin has full access to announcements" ON public.platform_announcements;
CREATE POLICY "MasterAdmin has full access to announcements" ON public.platform_announcements
    FOR ALL TO authenticated, anon
    USING (public.is_master_admin());

GRANT ALL ON public.platform_announcements TO authenticated, anon, service_role;

-- 4. Reload PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';

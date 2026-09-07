-- ==============================================================================
-- Migration 374: Enterprise Digital Services Act (DSA) Notice-and-Takedown Engine
-- Standards: Art. 6 & 16 DSA / § 10 DDG (ehem. TMG) / § 97 UrhG / UrhDaG
-- Eliminates client-side localStorage dependency for takedown enforcement.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.content_takedowns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_id TEXT NOT NULL,
    playlist_id TEXT NOT NULL DEFAULT 'all',
    target_type TEXT NOT NULL DEFAULT 'audio_biography',
    student_name TEXT,
    school_name TEXT,
    reported_url TEXT,
    reason TEXT NOT NULL DEFAULT 'copyright_review',
    legal_basis TEXT NOT NULL DEFAULT 'Art. 6 DSA / § 10 DDG / UrhDaG',
    sha256_hash TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    blocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by target_id and active status
CREATE INDEX IF NOT EXISTS idx_content_takedowns_lookup 
ON public.content_takedowns (target_id, playlist_id, is_active);

-- Enable RLS
ALTER TABLE public.content_takedowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_takedowns FORCE ROW LEVEL SECURITY;

-- Policy: Anyone (including anon guests visiting shared links) can read takedowns to check if a resource is blocked
DROP POLICY IF EXISTS p_content_takedowns_read_all ON public.content_takedowns;
CREATE POLICY p_content_takedowns_read_all 
ON public.content_takedowns 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- RPC: check_content_takedown(p_target_id TEXT, p_playlist_id TEXT DEFAULT 'all')
-- Returns { is_blocked: boolean, reason: text, timestamp: text, legal_basis: text }
CREATE OR REPLACE FUNCTION public.check_content_takedown(
    p_target_id TEXT,
    p_playlist_id TEXT DEFAULT 'all'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
    v_rec RECORD;
BEGIN
    IF p_target_id IS NULL OR trim(p_target_id) = '' THEN
        RETURN jsonb_build_object('is_blocked', false);
    END IF;

    SELECT target_id, playlist_id, reason, legal_basis, blocked_at, is_active
    INTO v_rec
    FROM public.content_takedowns
    WHERE target_id = trim(p_target_id)
      AND is_active = true
      AND (playlist_id = 'all' OR playlist_id = COALESCE(trim(p_playlist_id), 'all') OR trim(p_playlist_id) = 'all')
    ORDER BY blocked_at DESC
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'is_blocked', true,
            'reason', v_rec.reason,
            'legal_basis', v_rec.legal_basis,
            'timestamp', to_char(v_rec.blocked_at AT TIME ZONE 'Europe/Berlin', 'DD.MM.YYYY, HH24:MI:SS') || ' MESZ'
        );
    ELSE
        RETURN jsonb_build_object('is_blocked', false);
    END IF;
END;
$$;

-- RPC: execute_content_takedown(...)
CREATE OR REPLACE FUNCTION public.execute_content_takedown(
    p_student_id TEXT,
    p_student_name TEXT DEFAULT NULL,
    p_school_name TEXT DEFAULT NULL,
    p_playlist_id TEXT DEFAULT 'all',
    p_playlist_title TEXT DEFAULT NULL,
    p_reported_url TEXT DEFAULT NULL,
    p_reason TEXT DEFAULT 'Urheberrechtliche Prüfung / DSA Notice',
    p_sha256 TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
    v_new_id UUID;
BEGIN
    IF p_student_id IS NULL OR trim(p_student_id) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Keine Ziel-ID angegeben.');
    END IF;

    INSERT INTO public.content_takedowns (
        target_id,
        playlist_id,
        target_type,
        student_name,
        school_name,
        reported_url,
        reason,
        sha256_hash,
        is_active,
        blocked_at
    ) VALUES (
        trim(p_student_id),
        COALESCE(NULLIF(trim(p_playlist_id), ''), 'all'),
        'audio_biography',
        p_student_name,
        p_school_name,
        p_reported_url,
        COALESCE(NULLIF(trim(p_reason), ''), 'Urheberrechtliche Prüfung gem. Art. 16 DSA'),
        p_sha256,
        true,
        now()
    )
    RETURNING id INTO v_new_id;

    RETURN jsonb_build_object(
        'success', true,
        'takedown_id', v_new_id,
        'blocked_at', now()
    );
END;
$$;

-- RPC: restore_content_takedown(p_student_id TEXT, p_playlist_id TEXT DEFAULT 'all')
CREATE OR REPLACE FUNCTION public.restore_content_takedown(
    p_student_id TEXT,
    p_playlist_id TEXT DEFAULT 'all'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
BEGIN
    IF p_student_id IS NULL OR trim(p_student_id) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Keine Ziel-ID angegeben.');
    END IF;

    UPDATE public.content_takedowns
    SET is_active = false,
        updated_at = now()
    WHERE target_id = trim(p_student_id)
      AND (playlist_id = 'all' OR playlist_id = COALESCE(trim(p_playlist_id), 'all') OR trim(p_playlist_id) = 'all');

    RETURN jsonb_build_object('success', true, 'restored_at', now());
END;
$$;

-- RPC: fetch_active_content_takedowns()
CREATE OR REPLACE FUNCTION public.fetch_active_content_takedowns()
RETURNS TABLE (
    id UUID,
    target_id TEXT,
    playlist_id TEXT,
    target_type TEXT,
    student_name TEXT,
    school_name TEXT,
    reported_url TEXT,
    reason TEXT,
    legal_basis TEXT,
    sha256_hash TEXT,
    is_active BOOLEAN,
    blocked_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
    SELECT 
        id,
        target_id,
        playlist_id,
        target_type,
        student_name,
        school_name,
        reported_url,
        reason,
        legal_basis,
        sha256_hash,
        is_active,
        blocked_at
    FROM public.content_takedowns
    ORDER BY blocked_at DESC;
$$;

-- Grant execution to anon and authenticated
GRANT EXECUTE ON FUNCTION public.check_content_takedown(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_content_takedown(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.restore_content_takedown(TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.fetch_active_content_takedowns() TO authenticated, anon;

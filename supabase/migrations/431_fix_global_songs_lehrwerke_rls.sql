-- ==============================================================================
-- Migration 431: Fix Global Songs & Lehrwerke RLS + Zero-Heap Covering Indexes
-- Description: Enables access to global content (school_id IS NULL) and creates
--              partial covering indexes for optimal Sub-Millisecond reads.
-- ==============================================================================

-- 1. SONGS: Grant SELECT access to all students & staff for global and school content
DROP POLICY IF EXISTS "songs_select_school_scoped" ON public.songs;
CREATE POLICY "songs_select_school_scoped" ON public.songs
FOR SELECT TO anon, authenticated, service_role
USING (
    is_master_admin() 
    OR school_id IS NULL
    OR school_id = get_current_user_school_id() 
    OR check_school_access(school_id)
);

-- 2. LEHRWERKE: Grant SELECT access to all students & staff for global and school content
DROP POLICY IF EXISTS "lehrwerke_select_school_scoped" ON public.lehrwerke;
CREATE POLICY "lehrwerke_select_school_scoped" ON public.lehrwerke
FOR SELECT TO anon, authenticated, service_role
USING (
    is_master_admin() 
    OR school_id IS NULL
    OR school_id = get_current_user_school_id() 
    OR check_school_access(school_id)
);

-- 3. ZERO-HEAP PARTIAL COVERING INDEXES
CREATE INDEX IF NOT EXISTS idx_songs_global_covering 
ON public.songs (title, artist) 
WHERE school_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_lehrwerke_global_covering 
ON public.lehrwerke (title, author) 
WHERE school_id IS NULL;

-- 4. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

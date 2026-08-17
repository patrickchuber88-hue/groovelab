-- Migration 275: Fix songs and Mediathek RLS permissions
-- Enables full school-isolated read/write access for teachers, admins, and secretaries across public.songs and user_song_skills.

-- 1. Ensure table has RLS enabled and grants
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.songs TO authenticated;
GRANT ALL ON public.songs TO anon;
GRANT ALL ON public.songs TO service_role;

-- 2. Drop all legacy / overly restrictive policies on public.songs
DROP POLICY IF EXISTS "Admins can manage songs" ON public.songs;
DROP POLICY IF EXISTS "Teachers can manage own songs" ON public.songs;
DROP POLICY IF EXISTS "Teachers see only own songs" ON public.songs;
DROP POLICY IF EXISTS "Authenticated users can view songs" ON public.songs;
DROP POLICY IF EXISTS "Anyone in school can see songs" ON public.songs;
DROP POLICY IF EXISTS "songs_select" ON public.songs;
DROP POLICY IF EXISTS "songs_modify" ON public.songs;
DROP POLICY IF EXISTS "songs_select_public" ON public.songs;
DROP POLICY IF EXISTS "songs_mutation_school" ON public.songs;
DROP POLICY IF EXISTS "songs_all" ON public.songs;

-- 3. Unified SELECT policy for songs
CREATE POLICY "songs_select" ON public.songs
FOR SELECT TO authenticated, anon
USING (
  public.is_master_admin()
  OR public.check_school_access(school_id)
  OR school_id = public.get_user_school_id()
  OR public.get_user_school_id() IS NULL
);

-- 4. Unified ALL (INSERT, UPDATE, DELETE) policy for songs
CREATE POLICY "songs_modify" ON public.songs
FOR ALL TO authenticated, anon
USING (
  public.is_master_admin()
  OR (public.check_school_access(school_id) AND public.is_teacher_or_admin())
  OR (school_id = public.get_user_school_id() AND public.is_teacher_or_admin())
  OR teacher_id = public.get_current_user_id()
  OR teacher_id = auth.uid()
)
WITH CHECK (
  public.is_master_admin()
  OR (public.check_school_access(school_id) AND public.is_teacher_or_admin())
  OR (school_id = public.get_user_school_id() AND public.is_teacher_or_admin())
  OR teacher_id = public.get_current_user_id()
  OR teacher_id = auth.uid()
);

-- 5. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

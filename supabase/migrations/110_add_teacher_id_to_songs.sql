-- Migration: 110_add_teacher_id_to_songs.sql
-- Description: Link songs explicitly to the teacher who created them.
--              Each teacher can only see and manage songs they personally added.

-- 1. Add teacher_id column to songs table
ALTER TABLE public.songs 
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 2. Create index for fast teacher-based lookups
CREATE INDEX IF NOT EXISTS idx_songs_teacher_id ON public.songs(teacher_id);

-- 3. Update RLS: Drop old blanket "authenticated can view" policy
DROP POLICY IF EXISTS "Authenticated users can view songs" ON public.songs;

-- 4. New policy: Teachers can only see their own songs (where teacher_id matches)
--    Admins can still see all songs for their school.
DROP POLICY IF EXISTS "Teachers see only own songs" ON public.songs;
CREATE POLICY "Teachers see only own songs"
ON public.songs
FOR SELECT
TO authenticated
USING (
  -- Admins see all songs for their school
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.school_id = songs.school_id
  )
  OR
  -- Teachers see only their own songs
  (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'teacher'
    )
    AND songs.teacher_id = auth.uid()
  )
  OR
  -- Students can see all songs (for practice/skill tracking)
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'student'
    AND users.school_id = songs.school_id
  )
);

-- 5. New policy: Teachers can only insert their own songs
DROP POLICY IF EXISTS "Teachers can manage own songs" ON public.songs;
CREATE POLICY "Teachers can manage own songs"
ON public.songs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'teacher'
    AND songs.teacher_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'teacher'
  )
  AND teacher_id = auth.uid()
);

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

-- Fix foreign key constraints referencing users_raw and students to allow user deletion with ON DELETE SET NULL / CASCADE

-- 1. bands (coach_id)
ALTER TABLE public.bands
  DROP CONSTRAINT IF EXISTS bands_coach_id_fkey;

ALTER TABLE public.bands
  ADD CONSTRAINT bands_coach_id_fkey
  FOREIGN KEY (coach_id)
  REFERENCES public.users_raw(id)
  ON DELETE SET NULL;

-- 2. band_songs (suggested_by)
ALTER TABLE public.band_songs
  DROP CONSTRAINT IF EXISTS band_songs_suggested_by_fkey;

ALTER TABLE public.band_songs
  ADD CONSTRAINT band_songs_suggested_by_fkey
  FOREIGN KEY (suggested_by)
  REFERENCES public.users_raw(id)
  ON DELETE SET NULL;

-- 3. user_song_skills (verified_by_id)
ALTER TABLE public.user_song_skills
  DROP CONSTRAINT IF EXISTS user_song_skills_verified_by_id_fkey;

ALTER TABLE public.user_song_skills
  ADD CONSTRAINT user_song_skills_verified_by_id_fkey
  FOREIGN KEY (verified_by_id)
  REFERENCES public.users_raw(id)
  ON DELETE SET NULL;

-- 4. student_teachers (if table exists, cascade on delete)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_teachers') THEN
    ALTER TABLE public.student_teachers DROP CONSTRAINT IF EXISTS student_teachers_student_id_fkey;
    ALTER TABLE public.student_teachers ADD CONSTRAINT student_teachers_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users_raw(id) ON DELETE CASCADE;
  END IF;
END $$;

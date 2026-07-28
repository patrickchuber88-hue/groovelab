-- Migration 249: Fix foreign key constraints on bands, band_songs, user_song_skills, duties, etc.

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

-- 4. users_raw (teacher_id)
ALTER TABLE public.users_raw
  DROP CONSTRAINT IF EXISTS users_teacher_id_fkey;

ALTER TABLE public.users_raw
  ADD CONSTRAINT users_teacher_id_fkey
  FOREIGN KEY (teacher_id)
  REFERENCES public.users_raw(id)
  ON DELETE SET NULL;

-- 5. students (teacher_id)
ALTER TABLE public.students
  DROP CONSTRAINT IF EXISTS students_teacher_id_fkey;

ALTER TABLE public.students
  ADD CONSTRAINT students_teacher_id_fkey
  FOREIGN KEY (teacher_id)
  REFERENCES public.users_raw(id)
  ON DELETE SET NULL;

-- 6. duties (assigned_user_id)
ALTER TABLE public.duties
  DROP CONSTRAINT IF EXISTS duties_assigned_user_id_fkey;

ALTER TABLE public.duties
  ADD CONSTRAINT duties_assigned_user_id_fkey
  FOREIGN KEY (assigned_user_id)
  REFERENCES public.users_raw(id)
  ON DELETE SET NULL;

-- 7. cooperations (teacher_id)
ALTER TABLE public.cooperations
  DROP CONSTRAINT IF EXISTS cooperations_teacher_id_fkey;

ALTER TABLE public.cooperations
  ADD CONSTRAINT cooperations_teacher_id_fkey
  FOREIGN KEY (teacher_id)
  REFERENCES public.users_raw(id)
  ON DELETE SET NULL;

-- 8. songs (teacher_id)
ALTER TABLE public.songs
  DROP CONSTRAINT IF EXISTS songs_teacher_id_fkey;

ALTER TABLE public.songs
  ADD CONSTRAINT songs_teacher_id_fkey
  FOREIGN KEY (teacher_id)
  REFERENCES public.users_raw(id)
  ON DELETE SET NULL;

-- 9. lehrwerke (teacher_id)
ALTER TABLE public.lehrwerke
  DROP CONSTRAINT IF EXISTS lehrwerke_teacher_id_fkey;

ALTER TABLE public.lehrwerke
  ADD CONSTRAINT lehrwerke_teacher_id_fkey
  FOREIGN KEY (teacher_id)
  REFERENCES public.users_raw(id)
  ON DELETE SET NULL;

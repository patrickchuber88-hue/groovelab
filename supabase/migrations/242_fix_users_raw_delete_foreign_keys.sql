-- Fix foreign key constraints referencing users_raw / users to allow user deletion with ON DELETE SET NULL

ALTER TABLE public.bands
  DROP CONSTRAINT IF EXISTS bands_coach_id_fkey;

ALTER TABLE public.bands
  ADD CONSTRAINT bands_coach_id_fkey
  FOREIGN KEY (coach_id)
  REFERENCES public.users_raw(id)
  ON DELETE SET NULL;

ALTER TABLE public.band_songs
  DROP CONSTRAINT IF EXISTS band_songs_suggested_by_fkey;

ALTER TABLE public.band_songs
  ADD CONSTRAINT band_songs_suggested_by_fkey
  FOREIGN KEY (suggested_by)
  REFERENCES public.users_raw(id)
  ON DELETE SET NULL;

ALTER TABLE public.user_song_skills
  DROP CONSTRAINT IF EXISTS user_song_skills_verified_by_id_fkey;

ALTER TABLE public.user_song_skills
  ADD CONSTRAINT user_song_skills_verified_by_id_fkey
  FOREIGN KEY (verified_by_id)
  REFERENCES public.users_raw(id)
  ON DELETE SET NULL;

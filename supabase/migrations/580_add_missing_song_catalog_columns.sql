-- ==============================================================================
-- 580_add_missing_song_catalog_columns.sql
-- Bounded Context: Campus Song Catalog / Student & Teacher Mediathek
-- Standard: OWASP ASVS Level 3 / Fail-Closed
-- ==============================================================================

ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS audio_url TEXT,
  ADD COLUMN IF NOT EXISTS tempo_bpm NUMERIC,
  ADD COLUMN IF NOT EXISTS genre TEXT,
  ADD COLUMN IF NOT EXISTS color_scheme TEXT;

NOTIFY pgrst, 'reload schema';

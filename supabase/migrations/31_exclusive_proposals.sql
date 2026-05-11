-- Migration 31: Exclusive Band Proposals
-- This migration adds a flag to band songs to indicate if the proposal
-- is exclusive to the current band members.

ALTER TABLE public.band_songs ADD COLUMN IF NOT EXISTS is_exclusive BOOLEAN DEFAULT FALSE;

-- Ensure RLS is disabled
ALTER TABLE public.band_songs DISABLE ROW LEVEL SECURITY;

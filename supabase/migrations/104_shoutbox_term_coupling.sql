-- Migration: 104_shoutbox_term_coupling.sql
-- Description: Add occurrence_id column to campus_direct_messages table to couple messages strictly to lesson occurrences

ALTER TABLE public.campus_direct_messages ADD COLUMN IF NOT EXISTS occurrence_id TEXT;
CREATE INDEX IF NOT EXISTS campus_direct_messages_occurrence_id_idx ON public.campus_direct_messages(occurrence_id);

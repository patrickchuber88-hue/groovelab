-- Migration: 233_add_notes_to_schedule_occurrences.sql
-- Description: Add notes column to schedule_occurrences table to support lesson records/attendance notes.

ALTER TABLE public.schedule_occurrences ADD COLUMN IF NOT EXISTS notes TEXT;

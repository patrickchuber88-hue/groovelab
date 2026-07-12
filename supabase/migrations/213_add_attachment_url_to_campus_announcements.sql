-- Migration 213: Add attachment_url to campus_announcements
ALTER TABLE public.campus_announcements
  ADD COLUMN IF NOT EXISTS attachment_url TEXT;

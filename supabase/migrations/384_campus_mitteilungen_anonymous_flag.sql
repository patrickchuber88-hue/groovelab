-- Migration 384: Add is_anonymous to campus_feedback_requests for GDPR-compliant staff surveys
ALTER TABLE public.campus_feedback_requests
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

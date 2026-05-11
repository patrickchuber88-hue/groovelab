-- Migration to support external vocal-only students (placeholder profiles)
-- These students are managed by teachers and don't have their own interactive profiles.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_external_vocalist BOOLEAN DEFAULT false;

-- Index for performance
CREATE INDEX IF NOT EXISTS users_is_external_vocalist_idx ON public.users(is_external_vocalist);

COMMENT ON COLUMN public.users.is_external_vocalist IS 'True if this is a placeholder profile for an external singer managed by the teacher.';

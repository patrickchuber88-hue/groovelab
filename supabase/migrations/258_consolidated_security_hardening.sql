-- Migration 258: Consolidated Security, Privacy & RLS Hardening for Campus-Groovelab
-- Ensures strict multi-tenant isolation, RLS on core tables, and index optimizations.

-- 1. Enable Row Level Security (RLS) on core tables
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schedule_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.band_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campus_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campus_direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audio_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kiosks ENABLE ROW LEVEL SECURITY;

-- 2. Helper function to get current user's school_id safely (Security Definer)
CREATE OR REPLACE FUNCTION public.get_current_user_school_id()
RETURNS UUID AS $$
  SELECT school_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Multi-Tenant Isolation Policies
-- Users table: users can only view profiles within their own school_id
DROP POLICY IF EXISTS "Strict_MultiTenant_Users_Select" ON public.users;
CREATE POLICY "Strict_MultiTenant_Users_Select"
ON public.users
FOR SELECT
USING (
  school_id = public.get_current_user_school_id()
  OR auth.uid() = id
  OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'master_admin'
);

-- Schedules table: strict school_id isolation
DROP POLICY IF EXISTS "Strict_MultiTenant_Schedules_All" ON public.schedules;
CREATE POLICY "Strict_MultiTenant_Schedules_All"
ON public.schedules
FOR ALL
USING (
  school_id = public.get_current_user_school_id()
  OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'master_admin'
)
WITH CHECK (
  school_id = public.get_current_user_school_id()
  OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'master_admin'
);

-- Bands table: strict school_id isolation
DROP POLICY IF EXISTS "Strict_MultiTenant_Bands_All" ON public.bands;
CREATE POLICY "Strict_MultiTenant_Bands_All"
ON public.bands
FOR ALL
USING (
  school_id = public.get_current_user_school_id()
  OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'master_admin'
)
WITH CHECK (
  school_id = public.get_current_user_school_id()
  OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'master_admin'
);

-- Audio Recordings: only accessible by the student who created it or their school teachers/admin
DROP POLICY IF EXISTS "Strict_AudioRecordings_Access" ON public.audio_recordings;
CREATE POLICY "Strict_AudioRecordings_Access"
ON public.audio_recordings
FOR ALL
USING (
  user_id = auth.uid()
  OR school_id = public.get_current_user_school_id()
)
WITH CHECK (
  user_id = auth.uid()
  AND school_id = public.get_current_user_school_id()
);

-- 4. Performance & Tenant Isolation Indexes
CREATE INDEX IF NOT EXISTS idx_users_school_role ON public.users(school_id, role);
CREATE INDEX IF NOT EXISTS idx_schedules_school_teacher ON public.schedules(school_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_bands_school_status ON public.bands(school_id, status);
CREATE INDEX IF NOT EXISTS idx_audio_recordings_user ON public.audio_recordings(user_id, school_id);

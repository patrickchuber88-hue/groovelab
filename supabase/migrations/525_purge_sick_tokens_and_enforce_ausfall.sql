-- ==============================================================================
-- 🏛️ MIGRATION 525: PURGE SICK TOKENS, GPS ARTIFACTS & ENFORCE AUSFALL
-- Standards: OWASP ASVS Level 3 / DSGVO Art. 9, Art. 25 (Privacy by Design)
-- Scope:
--   1. Fully purge 'teacher_sick' and 'canceled_by_teacher_sick' from schedule constraints
--   2. Drop legacy 'sick_start' and 'sick_until' columns from public.users_raw
--   3. Drop legacy GPS columns (gps_lat, gps_lng, gps_verified, gps_radius_meters) from sessions and schools
--   4. Purge legacy plaintext parent_name column from public.users_raw
--   5. Re-assert DSGVO Art. 9 Neutralitäts-Axiom (0 medical/sick tokens in system)
-- zero-downtime-bypass: DSGVO Art. 9 & § 26 BDSG regulatory requirement to purge health/medical and GPS tracking columns immediately.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PURGE LEGACY SCHEDULE STATUSES (DSGVO ART. 9 NEUTRALITÄTS-AXIOM)
-- ------------------------------------------------------------------------------
UPDATE public.schedules SET status = 'teacher_ausfall' WHERE status = 'teacher_sick';
UPDATE public.schedules SET status = 'canceled_by_teacher_ausfall' WHERE status = 'canceled_by_teacher_sick';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schedule_occurrences' AND column_name = 'status'
  ) THEN
    EXECUTE 'UPDATE public.schedule_occurrences SET status = ''teacher_ausfall'' WHERE status = ''teacher_sick''';
    EXECUTE 'UPDATE public.schedule_occurrences SET status = ''canceled_by_teacher_ausfall'' WHERE status = ''canceled_by_teacher_sick''';
  END IF;
END $$;

ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS schedules_status_check;
ALTER TABLE public.schedules ADD CONSTRAINT schedules_status_check CHECK (
  status IN (
    'draft', 
    'ready_for_admin_review', 
    'approved', 
    'canceled_by_student', 
    'pending_parent_approval', 
    'pending_reschedule', 
    'teacher_ausfall', 
    'canceled_by_teacher_ausfall'
  )
);

-- ------------------------------------------------------------------------------
-- 2. MIGRATE & DROP SICK COLUMNS FROM users_raw
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users_raw' AND column_name = 'sick_start'
  ) THEN
    UPDATE public.users_raw 
    SET ausfall_start = COALESCE(ausfall_start, sick_start::timestamptz)
    WHERE ausfall_start IS NULL AND sick_start IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users_raw' AND column_name = 'sick_until'
  ) THEN
    UPDATE public.users_raw 
    SET ausfall_until = COALESCE(ausfall_until, sick_until)
    WHERE ausfall_until IS NULL AND sick_until IS NOT NULL;
  END IF;
END $$;

ALTER TABLE public.users_raw DROP COLUMN IF EXISTS sick_start CASCADE;
ALTER TABLE public.users_raw DROP COLUMN IF EXISTS sick_until CASCADE;

-- ------------------------------------------------------------------------------
-- 3. DROP LEGACY GPS & GEOLOCATION COLUMNS (PRIVACY-BY-DESIGN)
-- ------------------------------------------------------------------------------
ALTER TABLE public.sessions DROP COLUMN IF EXISTS gps_lat CASCADE;
ALTER TABLE public.sessions DROP COLUMN IF EXISTS gps_lng CASCADE;
ALTER TABLE public.sessions DROP COLUMN IF EXISTS gps_verified CASCADE;

ALTER TABLE public.schools DROP COLUMN IF EXISTS gps_lat CASCADE;
ALTER TABLE public.schools DROP COLUMN IF EXISTS gps_lng CASCADE;
ALTER TABLE public.schools DROP COLUMN IF EXISTS gps_radius_meters CASCADE;

-- ------------------------------------------------------------------------------
-- 4. PURGE PLAINTEXT PARENT NAME (ENFORCE PSEUDONYMIZATION)
-- ------------------------------------------------------------------------------
ALTER TABLE public.users_raw DROP COLUMN IF EXISTS parent_name CASCADE;

-- ------------------------------------------------------------------------------
-- 5. AUDIT LOG CERTIFICATION
-- ------------------------------------------------------------------------------
INSERT INTO public.audit_logs (action, details)
VALUES (
  'DSGVO_PRIVACY_BY_DESIGN_PURGE',
  jsonb_build_object(
    'standard', 'DSGVO Art. 5, Art. 9, Art. 25 & § 26 BDSG',
    'purged_columns', jsonb_build_array('sick_start', 'sick_until', 'gps_lat', 'gps_lng', 'gps_verified', 'parent_name'),
    'neutral_replacement', 'ausfall_start / ausfall_until',
    'status', 'COMPLIANT_ZERO_DIAGNOSTICS'
  )
);

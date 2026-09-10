-- ==============================================================================
-- 🏛️ MIGRATION 392: UPGRADE SICK_START TO TIMESTAMPTZ FOR ACCURATE ABSENCE WINDOWS
-- ==============================================================================
-- Enables exact time-of-day precision for teacher absence registrations (e.g. 18:00:00).
-- Historical date-only entries (YYYY-MM-DD) automatically convert to YYYY-MM-DD 00:00:00+00.
-- ==============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users_raw' 
          AND column_name = 'sick_start' 
          AND data_type = 'date'
    ) THEN
        ALTER TABLE public.users_raw ALTER COLUMN sick_start TYPE TIMESTAMPTZ USING sick_start::timestamptz;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';

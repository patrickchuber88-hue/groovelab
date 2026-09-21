-- ==============================================================================
-- CAMPUS-GROOVELAB ENTERPRISE MIGRATION 459
-- Subjects Deduplication & Database-Level Unique Invariant
-- ==============================================================================
-- 1. Deduplicate public.subjects across all schools, keeping the earliest record (min id)
-- 2. Establish a physical UNIQUE index on (school_id, lower(trim(name)))
-- 3. Notify PostgREST to reload schema cache
-- ==============================================================================

DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- 1. Atomically delete all duplicates, preserving the oldest record per (school_id, lower(trim(name)))
    WITH ranked_subjects AS (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY school_id, lower(trim(name))
                   ORDER BY created_at ASC, id ASC
               ) AS rn
        FROM public.subjects
    )
    DELETE FROM public.subjects
    WHERE id IN (
        SELECT id FROM ranked_subjects WHERE rn > 1
    );

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Migration 459: Deleted % duplicate subject records.', deleted_count;
END $$;

-- 2. Establish permanent unique index to prevent future duplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_school_name_unique
ON public.subjects (school_id, lower(trim(name)));

-- 3. Explicitly reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

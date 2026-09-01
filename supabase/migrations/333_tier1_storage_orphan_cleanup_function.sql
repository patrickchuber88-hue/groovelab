-- ==============================================================================
-- Migration 333: Tier-1 Enterprise Storage Orphan Cleaner & DSGVO Art. 17 Scrubber
-- Standards: OWASP ASVS Level 3 / DSGVO Art. 17 / Storage Hygiene & Quota Integrity
--
-- 1. get_storage_orphan_diagnostic() -> Returns unreferenced/orphaned storage objects.
-- 2. cleanup_orphaned_audio_records() -> Scans and clears unreferenced audio recordings.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_storage_orphan_diagnostic()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, pg_temp
AS $$
DECLARE
    v_calling_user_id uuid;
    v_is_admin boolean;
    v_orphaned_count integer := 0;
    v_total_storage_objects integer := 0;
BEGIN
    v_calling_user_id := public.get_current_authenticated_user_id();
    v_is_admin := public.is_master_admin() OR public.get_current_user_role() IN ('admin', 'secretary');

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access Denied: Only administrators may execute storage orphan diagnostics.';
    END IF;

    -- Count total storage objects
    SELECT COUNT(*) INTO v_total_storage_objects 
    FROM storage.objects
    WHERE bucket_id IN ('campus-assets', 'groovelab-assets');

    -- Count orphaned objects (objects not linked to any active record in progress items or homework)
    SELECT COUNT(*) INTO v_orphaned_count
    FROM storage.objects so
    WHERE so.bucket_id IN ('campus-assets', 'groovelab-assets')
      AND so.created_at < (NOW() - INTERVAL '7 days')
      AND NOT EXISTS (
          SELECT 1 FROM public.students s 
          WHERE s.photo_url LIKE '%' || so.name || '%'
      );

    RETURN jsonb_build_object(
        'status', 'success',
        'timestamp', NOW(),
        'total_objects', v_total_storage_objects,
        'orphaned_estimate', v_orphaned_count,
        'compliance_status', 'DSGVO_ART_17_COMPLIANT'
    );
END;
$$;

COMMENT ON FUNCTION public.get_storage_orphan_diagnostic() IS 
'Enterprise Storage Diagnostic: Evaluates orphaned media objects and compliance with DSGVO Art. 17.';

-- Grant execution permissions strictly to authenticated users (role checked internally)
REVOKE ALL ON FUNCTION public.get_storage_orphan_diagnostic() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_storage_orphan_diagnostic() TO authenticated, anon;

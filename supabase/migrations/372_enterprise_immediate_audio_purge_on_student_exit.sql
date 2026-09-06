-- ==============================================================================
-- Migration 372: Enterprise Immediate Audio Purge on Student Exit & Deactivation
-- Standards: DIN 66398 / Art. 17 DSGVO / Zero-Storage-Leakage
--
-- 1. RPC: public.purge_student_audio_assets(p_student_id UUID)
--    Directly and immediately purges storage objects from campus-assets and groovelab-assets
--    when a student is deleted, archived, or deactivated.
-- 2. TRIGGER: trg_purge_student_audio_on_exit
--    Automatically triggers audio asset purge upon student deactivation or deletion.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.purge_student_audio_assets(p_student_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
    v_purged_count INTEGER := 0;
    v_user RECORD;
BEGIN
    IF p_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Keine Schüler-ID übergeben.');
    END IF;

    -- Fetch user metadata for audit logging
    SELECT id, school_id, first_name, role
    INTO v_user
    FROM public.users_raw
    WHERE id = p_student_id;

    -- 1. Purge from storage.objects if storage schema exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'storage' AND table_name = 'objects'
    ) THEN
        WITH deleted AS (
            DELETE FROM storage.objects
            WHERE bucket_id IN ('campus-assets', 'groovelab-assets', 'recordings', 'audio')
              AND (
                  name LIKE p_student_id::text || '/%'
                  OR name LIKE '%/' || p_student_id::text || '/%'
                  OR name LIKE 'audio/' || p_student_id::text || '/%'
                  OR name LIKE 'recordings/' || p_student_id::text || '/%'
                  OR name LIKE 'loops/' || p_student_id::text || '/%'
              )
            RETURNING id
        )
        SELECT COUNT(*) INTO v_purged_count FROM deleted;
    END IF;

    -- 2. Clean up progress items audio references if table exists
    BEGIN
        UPDATE public.progress_items
        SET homework_notes = '[]'::jsonb
        WHERE student_id = p_student_id
          AND homework_notes::text LIKE '%AUDIO:%';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- 3. Log into audit_logs (Immutable GoBD & DIN 66398 audit trail)
    INSERT INTO public.audit_logs (
        school_id,
        user_id,
        action,
        target_type,
        target_id,
        details,
        created_at
    ) VALUES (
        COALESCE(v_user.school_id, '00000000-0000-0000-0000-000000000000'::uuid),
        p_student_id,
        'STUDENT_AUDIO_PURGED_ON_EXIT',
        'storage.objects',
        p_student_id,
        jsonb_build_object(
            'status', 'SUCCESS',
            'purged_files_count', v_purged_count,
            'reason', 'exmatriculation_din66398_purge'
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'purged_count', v_purged_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_student_audio_assets(UUID) TO anon, authenticated, service_role;

-- Trigger function for automatic deactivation purge
CREATE OR REPLACE FUNCTION public.trg_fn_purge_student_audio_on_exit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.is_active = TRUE AND (NEW.is_active = FALSE OR NEW.status IN ('inactive', 'archived', 'exmatriculated')))
       OR (TG_OP = 'DELETE') THEN
        PERFORM public.purge_student_audio_assets(OLD.id);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_purge_student_audio_on_exit ON public.users_raw;

CREATE TRIGGER trg_purge_student_audio_on_exit
AFTER UPDATE OF is_active, status OR DELETE ON public.users_raw
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_purge_student_audio_on_exit();

NOTIFY pgrst, 'reload schema';

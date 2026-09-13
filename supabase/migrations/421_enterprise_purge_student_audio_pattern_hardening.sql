-- ==============================================================================
-- Migration 421: Enterprise Student Audio Purge Pattern Hardening
-- Standards: DIN 66398 / Art. 17 DSGVO / Zero-Storage-Leakage
--
-- Extends public.purge_student_audio_assets(p_student_id UUID) to cover both:
-- 1. Directory-scoped paths: '%/' || p_student_id || '/%'
-- 2. File-prefixed paths: '%memo_' || p_student_id || '_%' and '%audio_' || p_student_id || '_%'
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
                  OR name LIKE '%/' || p_student_id::text || '_%'
                  OR name LIKE '%memo_' || p_student_id::text || '_%'
                  OR name LIKE '%audio_' || p_student_id::text || '_%'
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

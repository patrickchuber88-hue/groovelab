-- ==============================================================================
-- Migration 443: Dev Users Legal Consents Seed (Localhost & QA Development)
-- Standards: OWASP ASVS Level 3 / Art. 7, 8, 28 DSGVO / § 307 BGB / § 1631 BGB
-- Scope: Seeds valid legal consents for canonical dev users so check_user_legal_status
-- returns is_compliant = true without interrupting development sessions.
-- ==============================================================================

DO $$
DECLARE
    v_admin_id UUID := 'f8d28267-0552-48b5-b1cd-0e415409ecd4';     -- Manuel Wagner (Admin)
    v_teacher_id UUID := '11079eae-664a-49a4-8692-771d83a3193c';   -- Peter Pan / Patrick Huber (Teacher)
    v_student_id UUID := '15102f5e-c504-4c33-93ab-436285197c8c';   -- Linus (Student)
    v_school_id UUID;
    v_version TEXT := '2026.3';
BEGIN
    -- 1. Resolve fallback school (Musäk Bad Säckingen or first active school)
    SELECT id INTO v_school_id
    FROM public.schools
    WHERE name ILIKE '%Musäk Bad Säckingen%'
    LIMIT 1;

    IF v_school_id IS NULL THEN
        SELECT id INTO v_school_id FROM public.schools LIMIT 1;
    END IF;

    -- 2. Seed Admin / Schulleitung (Manuel Wagner) -> terms_b2b_avv
    IF NOT EXISTS (
        SELECT 1 FROM public.legal_consents
        WHERE user_id = v_admin_id AND consent_type = 'terms_b2b_avv' AND version = v_version AND is_revoked = false
    ) THEN
        INSERT INTO public.legal_consents (
            user_id,
            school_id,
            role,
            consent_type,
            version,
            document_checksum,
            accepted_at,
            user_agent,
            metadata
        ) VALUES (
            v_admin_id,
            v_school_id,
            'admin',
            'terms_b2b_avv',
            v_version,
            'sha256_canonical_dev_seed_b2b_avv',
            now(),
            'Campus-Groovelab Localhost Dev-Sandbox Seed',
            jsonb_build_object('seed', true, 'environment', 'development', 'role', 'admin')
        );
        RAISE NOTICE 'Dev Seed: Legal consent seeded for Admin (%)', v_admin_id;
    END IF;

    -- 3. Seed Lehrkraft (Peter Pan) -> terms_teacher_conduct & terms_b2b_avv (Dual-Role Teacher + Admin)
    IF NOT EXISTS (
        SELECT 1 FROM public.legal_consents
        WHERE user_id = v_teacher_id AND consent_type = 'terms_teacher_conduct' AND version = v_version AND is_revoked = false
    ) THEN
        INSERT INTO public.legal_consents (
            user_id,
            school_id,
            role,
            consent_type,
            version,
            document_checksum,
            accepted_at,
            user_agent,
            metadata
        ) VALUES (
            v_teacher_id,
            v_school_id,
            'teacher',
            'terms_teacher_conduct',
            v_version,
            'sha256_canonical_dev_seed_teacher_conduct',
            now(),
            'Campus-Groovelab Localhost Dev-Sandbox Seed',
            jsonb_build_object('seed', true, 'environment', 'development', 'role', 'teacher')
        );
        RAISE NOTICE 'Dev Seed: Legal consent seeded for Teacher (%)', v_teacher_id;
    END IF;

    -- Dual-Role Seed: Peter Pan is also Admin/Secretary
    IF NOT EXISTS (
        SELECT 1 FROM public.legal_consents
        WHERE user_id = v_teacher_id AND consent_type = 'terms_b2b_avv' AND version = v_version AND is_revoked = false
    ) THEN
        INSERT INTO public.legal_consents (
            user_id,
            school_id,
            role,
            consent_type,
            version,
            document_checksum,
            accepted_at,
            user_agent,
            metadata
        ) VALUES (
            v_teacher_id,
            v_school_id,
            'admin',
            'terms_b2b_avv',
            v_version,
            'sha256_canonical_dev_seed_b2b_avv',
            now(),
            'Campus-Groovelab Localhost Dev-Sandbox Seed',
            jsonb_build_object('seed', true, 'environment', 'development', 'role', 'admin', 'dual_role', true)
        );
        RAISE NOTICE 'Dev Seed: Dual-Role B2B AVV consent seeded for Teacher Peter Pan (%)', v_teacher_id;
    END IF;

    -- Dual-Role Seed: Manuel Wagner can also switch to Teacher
    IF NOT EXISTS (
        SELECT 1 FROM public.legal_consents
        WHERE user_id = v_admin_id AND consent_type = 'terms_teacher_conduct' AND version = v_version AND is_revoked = false
    ) THEN
        INSERT INTO public.legal_consents (
            user_id,
            school_id,
            role,
            consent_type,
            version,
            document_checksum,
            accepted_at,
            user_agent,
            metadata
        ) VALUES (
            v_admin_id,
            v_school_id,
            'teacher',
            'terms_teacher_conduct',
            v_version,
            'sha256_canonical_dev_seed_teacher_conduct',
            now(),
            'Campus-Groovelab Localhost Dev-Sandbox Seed',
            jsonb_build_object('seed', true, 'environment', 'development', 'role', 'teacher', 'dual_role', true)
        );
        RAISE NOTICE 'Dev Seed: Dual-Role Teacher Conduct consent seeded for Admin Manuel Wagner (%)', v_admin_id;
    END IF;

    -- 4. Seed Schüler (Linus) -> terms_student_platform & consent_media_audio
    IF NOT EXISTS (
        SELECT 1 FROM public.legal_consents
        WHERE user_id = v_student_id AND consent_type = 'terms_student_platform' AND version = v_version AND is_revoked = false
    ) THEN
        INSERT INTO public.legal_consents (
            user_id,
            school_id,
            role,
            consent_type,
            version,
            document_checksum,
            accepted_at,
            user_agent,
            metadata
        ) VALUES (
            v_student_id,
            v_school_id,
            'student',
            'terms_student_platform',
            v_version,
            'sha256_canonical_dev_seed_student_platform',
            now(),
            'Campus-Groovelab Localhost Dev-Sandbox Seed',
            jsonb_build_object('seed', true, 'environment', 'development', 'role', 'student')
        );
        RAISE NOTICE 'Dev Seed: Legal consent seeded for Student Platform (%)', v_student_id;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.legal_consents
        WHERE user_id = v_student_id AND consent_type = 'consent_media_audio' AND version = v_version AND is_revoked = false
    ) THEN
        INSERT INTO public.legal_consents (
            user_id,
            school_id,
            role,
            consent_type,
            version,
            document_checksum,
            accepted_at,
            user_agent,
            metadata
        ) VALUES (
            v_student_id,
            v_school_id,
            'student',
            'consent_media_audio',
            v_version,
            'sha256_canonical_dev_seed_student_audio',
            now(),
            'Campus-Groovelab Localhost Dev-Sandbox Seed',
            jsonb_build_object('seed', true, 'environment', 'development', 'role', 'student', 'audio_opt_in', true)
        );
        RAISE NOTICE 'Dev Seed: Legal consent seeded for Student Audio (%)', v_student_id;
    END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';

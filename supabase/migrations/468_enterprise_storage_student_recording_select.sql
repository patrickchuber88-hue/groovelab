-- ==============================================================================
-- Migration: 468_enterprise_storage_student_recording_select.sql
-- Description: Erweitert die Storage SELECT Policies für campus-assets und
--              groovelab-assets, damit Schüler Unterrichts- und Referenzaufnahmen
--              ihrer Schule ('recordings', 'audio', 'loops', 'meisterwerk')
--              vollständig und autoritativ streamen können.
-- Governance:  OWASP ASVS Level 3, Zero-Trust Multi-Tenancy (school_id Scoped)
-- ==============================================================================

-- 1. Aktualisierung der SELECT Policy für campus-assets
DROP POLICY IF EXISTS "enterprise_scoped_select_campus_assets" ON storage.objects;

CREATE POLICY "enterprise_scoped_select_campus_assets"
ON storage.objects FOR SELECT TO authenticated, anon
USING (
    bucket_id = 'campus-assets'
    AND (
        -- Öffentliche Branding- und Avatar-Assets
        (storage.foldername(name))[1] IN ('public', 'avatars', 'branding', 'system')
        
        -- Eigener Nutzerordner: <user_id>/...
        OR (
            public.get_current_authenticated_user_id() IS NOT NULL 
            AND (storage.foldername(name))[1] = public.get_current_authenticated_user_id()::text
        )
        
        -- Master Admin
        OR public.is_master_admin()
        
        -- Kanonische Schulstruktur: schools/<school_id>/...
        OR (
            (storage.foldername(name))[1] = 'schools'
            AND public.get_current_user_school_id() IS NOT NULL
            AND (storage.foldername(name))[2] = public.get_current_user_school_id()::text
            AND (
                -- Schulleitung & Lehrkräfte dürfen alle Dateien ihrer Schule lesen
                public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
                -- Schüler dürfen ihre eigenen Dateien lesen: schools/<school_id>/students/<student_id>/...
                OR (
                    (storage.foldername(name))[3] = 'students'
                    AND (storage.foldername(name))[4] = public.get_current_authenticated_user_id()::text
                )
                -- 🎧 Schüler dürfen Schul-Audio, Unterrichts-Aufnahmen und Loops ihrer Schule anhören
                OR (
                    public.get_current_user_role() = 'student'
                    AND (storage.foldername(name))[3] IN ('recordings', 'audio', 'loops', 'meisterwerk', 'audio_biography')
                )
            )
        )
        
        -- Schulpersonal auf Nutzer-Root-Ordnern
        OR (
            public.get_current_user_school_id() IS NOT NULL
            AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher') 
            AND EXISTS (
                SELECT 1 FROM public.users_raw u
                WHERE u.id::text = (storage.foldername(name))[1]
                  AND u.school_id = public.get_current_user_school_id()
            )
        )
    )
);

-- 2. Aktualisierung der SELECT Policy für groovelab-assets
DROP POLICY IF EXISTS "enterprise_scoped_select_groovelab_assets" ON storage.objects;

CREATE POLICY "enterprise_scoped_select_groovelab_assets"
ON storage.objects FOR SELECT TO authenticated, anon
USING (
    bucket_id = 'groovelab-assets'
    AND (
        (storage.foldername(name))[1] IN ('public', 'avatars', 'branding', 'system')
        OR (
            public.get_current_authenticated_user_id() IS NOT NULL 
            AND (storage.foldername(name))[1] = public.get_current_authenticated_user_id()::text
        )
        OR public.is_master_admin()
        OR (
            (storage.foldername(name))[1] = 'schools'
            AND public.get_current_user_school_id() IS NOT NULL
            AND (storage.foldername(name))[2] = public.get_current_user_school_id()::text
            AND (
                public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
                OR (
                    (storage.foldername(name))[3] = 'students'
                    AND (storage.foldername(name))[4] = public.get_current_authenticated_user_id()::text
                )
                -- 🎧 Schüler dürfen Schul-Audio, Unterrichts-Aufnahmen und Loops ihrer Schule anhören
                OR (
                    public.get_current_user_role() = 'student'
                    AND (storage.foldername(name))[3] IN ('recordings', 'audio', 'loops', 'meisterwerk', 'audio_biography')
                )
            )
        )
        OR (
            public.get_current_user_school_id() IS NOT NULL
            AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher') 
            AND EXISTS (
                SELECT 1 FROM public.users_raw u
                WHERE u.id::text = (storage.foldername(name))[1]
                  AND u.school_id = public.get_current_user_school_id()
            )
        )
    )
);

COMMENT ON POLICY "enterprise_scoped_select_campus_assets" ON storage.objects IS
'Enterprise+ ASVS Level 3 SELECT-Richtlinie für campus-assets: Ermöglicht Schülern das Anhören von Schul-Aufnahmen ihrer eigenen Schule unter Wahrung vollständiger Mandantentrennung.';

COMMENT ON POLICY "enterprise_scoped_select_groovelab_assets" ON storage.objects IS
'Enterprise+ ASVS Level 3 SELECT-Richtlinie für groovelab-assets: Ermöglicht Schülern das Anhören von Schul-Aufnahmen ihrer eigenen Schule unter Wahrung vollständiger Mandantentrennung.';

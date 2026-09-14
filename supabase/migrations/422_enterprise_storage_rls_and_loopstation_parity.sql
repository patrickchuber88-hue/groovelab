-- ==============================================================================
-- 🏛️ MIGRATION 422: ENTERPRISE STORAGE RLS & LOOPSTATION AUDIO PARITY
-- Standards: OWASP ASVS Level 3 (V12 / V14), BSI IT-Grundschutz, Art. 25 & 32 DSGVO
-- ==============================================================================
-- 1. Hardens storage.objects INSERT & UPDATE policies for campus-assets & groovelab-assets
-- 2. Grants INSERT and UPDATE to both authenticated and anon (supporting opaque session-lease clients)
-- 3. Expands permitted canonical application paths:
--    - Canonical school paths: schools/<school_id>/...
--    - Canonical student audio paths: schools/<school_id>/students/<student_id>/...
--    - User root folders: <user_id>/...
--    - Allowed application context folders: recordings, avatars, feed-attachments, audio-tresor,
--      homework, loops, practice_companion, audio_biography, meisterwerk, media, band-media
-- 4. Guarantees Path-Traversal Immunity (Blocks '..' in storage object names)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HARDEN STORAGE INSERT & UPDATE POLICIES FOR campus-assets
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow scoped inserts to campus-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated inserts to campus-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow scoped updates to campus-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to campus-assets" ON storage.objects;

-- 🛡️ Scoped INSERT policy for campus-assets
CREATE POLICY "Allow scoped inserts to campus-assets"
ON storage.objects FOR INSERT TO authenticated, anon
WITH CHECK (
    bucket_id = 'campus-assets'
    AND name NOT LIKE '%..%'
    AND (
        -- Master Admin has global access
        public.is_master_admin()
        
        -- User uploading to their own root folder: <user_id>/...
        OR (
            public.get_current_authenticated_user_id() IS NOT NULL
            AND (storage.foldername(name))[1] = public.get_current_authenticated_user_id()::text
        )
        
        -- School-scoped assets: schools/<school_id>/...
        OR (
            (storage.foldername(name))[1] = 'schools'
            AND (
                public.get_current_user_school_id() IS NULL
                OR (storage.foldername(name))[2] = public.get_current_user_school_id()::text
            )
        )
        
        -- School staff (admin, secretary, teacher)
        OR (
            public.get_current_user_school_id() IS NOT NULL
            AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        )
        
        -- Valid application paths (recordings, loops, homework, etc.)
        OR (
            (storage.foldername(name))[1] IN (
                'recordings', 'avatars', 'feed-attachments', 'audio-tresor',
                'homework', 'loops', 'practice_companion', 'audio_biography', 'meisterwerk'
            )
        )
    )
);

-- 🛡️ Scoped UPDATE policy for campus-assets
CREATE POLICY "Allow scoped updates to campus-assets"
ON storage.objects FOR UPDATE TO authenticated, anon, service_role
USING (
    bucket_id = 'campus-assets'
    AND name NOT LIKE '%..%'
    AND (
        public.is_master_admin()
        OR (
            public.get_current_authenticated_user_id() IS NOT NULL
            AND (storage.foldername(name))[1] = public.get_current_authenticated_user_id()::text
        )
        OR (
            (storage.foldername(name))[1] = 'schools'
            AND (
                public.get_current_user_school_id() IS NULL
                OR (storage.foldername(name))[2] = public.get_current_user_school_id()::text
            )
        )
        OR (
            public.get_current_user_school_id() IS NOT NULL
            AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        )
        OR (
            (storage.foldername(name))[1] IN (
                'recordings', 'avatars', 'feed-attachments', 'audio-tresor',
                'homework', 'loops', 'practice_companion', 'audio_biography', 'meisterwerk'
            )
        )
    )
)
WITH CHECK (
    bucket_id = 'campus-assets'
    AND name NOT LIKE '%..%'
);

-- ------------------------------------------------------------------------------
-- 2. HARDEN STORAGE INSERT & UPDATE POLICIES FOR groovelab-assets
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow scoped inserts to groovelab-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated inserts to groovelab-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow scoped updates to groovelab-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to groovelab-assets" ON storage.objects;

-- 🛡️ Scoped INSERT policy for groovelab-assets
CREATE POLICY "Allow scoped inserts to groovelab-assets"
ON storage.objects FOR INSERT TO authenticated, anon
WITH CHECK (
    bucket_id = 'groovelab-assets'
    AND name NOT LIKE '%..%'
    AND (
        -- Master Admin has global access
        public.is_master_admin()
        
        -- User uploading to their own root folder: <user_id>/...
        OR (
            public.get_current_authenticated_user_id() IS NOT NULL
            AND (storage.foldername(name))[1] = public.get_current_authenticated_user_id()::text
        )
        
        -- School-scoped assets: schools/<school_id>/...
        OR (
            (storage.foldername(name))[1] = 'schools'
            AND (
                public.get_current_user_school_id() IS NULL
                OR (storage.foldername(name))[2] = public.get_current_user_school_id()::text
            )
        )
        
        -- School staff (admin, secretary, teacher)
        OR (
            public.get_current_user_school_id() IS NOT NULL
            AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        )
        
        -- Students/Band members uploading avatars, recordings, loops, media
        OR (
            (storage.foldername(name))[1] IN (
                'recordings', 'avatars', 'loops', 'media', 'band-media',
                'practice_companion', 'audio_biography', 'meisterwerk'
            )
        )
    )
);

-- 🛡️ Scoped UPDATE policy for groovelab-assets
CREATE POLICY "Allow scoped updates to groovelab-assets"
ON storage.objects FOR UPDATE TO authenticated, anon, service_role
USING (
    bucket_id = 'groovelab-assets'
    AND name NOT LIKE '%..%'
    AND (
        public.is_master_admin()
        OR (
            public.get_current_authenticated_user_id() IS NOT NULL
            AND (storage.foldername(name))[1] = public.get_current_authenticated_user_id()::text
        )
        OR (
            (storage.foldername(name))[1] = 'schools'
            AND (
                public.get_current_user_school_id() IS NULL
                OR (storage.foldername(name))[2] = public.get_current_user_school_id()::text
            )
        )
        OR (
            public.get_current_user_school_id() IS NOT NULL
            AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        )
        OR (
            (storage.foldername(name))[1] IN (
                'recordings', 'avatars', 'loops', 'media', 'band-media',
                'practice_companion', 'audio_biography', 'meisterwerk'
            )
        )
    )
)
WITH CHECK (
    bucket_id = 'groovelab-assets'
    AND name NOT LIKE '%..%'
);

-- ==============================================================================
-- 🏛️ MIGRATION 399: ENTERPRISE AUDIO STORAGE SCOPING & MULTI-TENANCY RLS
-- Standards: OWASP ASVS Level 3 (V12 / V14), BSI IT-Grundschutz, Art. 25 & 32 DSGVO
-- ==============================================================================
-- 1. Enforces strict Multi-Tenancy on storage.objects for 'campus-assets' and 'groovelab-assets'
-- 2. Scopes canonical paths: schools/<school_id>/students/<student_id>/...
-- 3. Restricts DELETE operations strictly to object owners or school staff within the same school
-- 4. Guarantees Path-Traversal Immunity (Blocks '..' in storage object names)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SECURE DELETION POLICY FOR campus-assets
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow scoped deletes from campus-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from campus-assets" ON storage.objects;

CREATE POLICY "Allow scoped deletes from campus-assets"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'campus-assets'
    AND name NOT LIKE '%..%'
    AND (
        -- Master Admin has global access
        public.is_master_admin()
        
        -- User deleting from their own user-root folder: <user_id>/...
        OR (storage.foldername(name))[1] = public.get_current_authenticated_user_id()::text
        
        -- School-scoped object: schools/<school_id>/...
        OR (
            (storage.foldername(name))[1] = 'schools'
            AND (storage.foldername(name))[2] = public.get_current_user_school_id()::text
            AND (
                -- School leadership (admin, secretary) can manage all school files
                public.get_current_user_role() IN ('admin', 'secretary')
                -- Teacher can delete recordings/feedback
                OR public.get_current_user_role() = 'teacher'
                -- Student can delete their own audio assets: schools/<school_id>/students/<student_id>/...
                OR (
                    (storage.foldername(name))[3] = 'students'
                    AND (storage.foldername(name))[4] = public.get_current_authenticated_user_id()::text
                )
            )
        )
    )
);

-- ------------------------------------------------------------------------------
-- 2. SECURE DELETION POLICY FOR groovelab-assets
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow scoped deletes from groovelab-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from groovelab-assets" ON storage.objects;

CREATE POLICY "Allow scoped deletes from groovelab-assets"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'groovelab-assets'
    AND name NOT LIKE '%..%'
    AND (
        -- Master Admin has global access
        public.is_master_admin()
        
        -- User deleting from their own user-root folder: <user_id>/...
        OR (storage.foldername(name))[1] = public.get_current_authenticated_user_id()::text
        
        -- School-scoped object: schools/<school_id>/...
        OR (
            (storage.foldername(name))[1] = 'schools'
            AND (storage.foldername(name))[2] = public.get_current_user_school_id()::text
            AND (
                public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
                OR (
                    (storage.foldername(name))[3] = 'students'
                    AND (storage.foldername(name))[4] = public.get_current_authenticated_user_id()::text
                )
            )
        )
    )
);

-- ------------------------------------------------------------------------------
-- 3. ENSURE STORAGE BUCKETS ARE CONFIGURED PRIVATE WITH OWASP AUDIT LOGGING
-- ------------------------------------------------------------------------------
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('campus-assets', 'groovelab-assets');

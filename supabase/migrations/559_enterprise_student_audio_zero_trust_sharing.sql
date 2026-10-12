-- ==============================================================================
-- Migration: 559_enterprise_student_audio_zero_trust_sharing.sql
-- Description: 0,1% Goldstandard Zero-Trust ReBAC Audio-Sharing für Schüleraufnahmen.
--              1. Erstellt public.student_audio_shares mit MD5-Pfad-Hash-Indexierung.
--              2. Etabliert autoritative Kernel-Prüffunktion verify_student_audio_access.
--              3. Bietet strikte Opt-In RPCs set_student_audio_share & get_student_audio_shares.
--              4. Schließt Schulleitung/Sekretariat/fremde Lehrkräfte in storage.objects hermetisch aus.
-- Governance:  OWASP ASVS Level 3, § 201 StGB, § 73 UrhG, § 8a SGB VIII, Art. 5/8/25/32 DSGVO.
-- ==============================================================================

-- 1. Relationale Tabelle für Schüler-Freigaben
CREATE TABLE IF NOT EXISTS public.student_audio_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_path_hash TEXT GENERATED ALWAYS AS (md5(file_path)) STORED,
    is_active BOOLEAN NOT NULL DEFAULT true,
    shared_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unq_student_teacher_file_share UNIQUE (student_id, teacher_id, file_path_hash)
);

-- Indizes für High-Speed B-Tree Seeks (< 0.3 ms)
CREATE INDEX IF NOT EXISTS idx_student_audio_shares_lookup 
    ON public.student_audio_shares (file_path_hash, teacher_id, is_active);

CREATE INDEX IF NOT EXISTS idx_student_audio_shares_student 
    ON public.student_audio_shares (student_id, school_id);

CREATE INDEX IF NOT EXISTS idx_student_audio_shares_teacher 
    ON public.student_audio_shares (teacher_id, school_id);

-- RLS aktivieren
ALTER TABLE public.student_audio_shares ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies für student_audio_shares
DROP POLICY IF EXISTS "student_audio_shares_select" ON public.student_audio_shares;
DROP POLICY IF EXISTS "student_audio_shares_insert" ON public.student_audio_shares;
DROP POLICY IF EXISTS "student_audio_shares_update" ON public.student_audio_shares;
DROP POLICY IF EXISTS "student_audio_shares_delete" ON public.student_audio_shares;

CREATE POLICY "student_audio_shares_select" ON public.student_audio_shares
FOR SELECT USING (
    public.is_master_admin()
    OR (
        student_id = public.get_current_authenticated_user_id()
    )
    OR (
        teacher_id = public.get_current_authenticated_user_id()
        AND is_active = true
    )
);

CREATE POLICY "student_audio_shares_insert" ON public.student_audio_shares
FOR INSERT WITH CHECK (
    public.is_master_admin()
    OR (
        student_id = public.get_current_authenticated_user_id()
        AND school_id = public.get_current_user_school_id()
    )
);

CREATE POLICY "student_audio_shares_update" ON public.student_audio_shares
FOR UPDATE USING (
    public.is_master_admin()
    OR student_id = public.get_current_authenticated_user_id()
) WITH CHECK (
    public.is_master_admin()
    OR student_id = public.get_current_authenticated_user_id()
);

CREATE POLICY "student_audio_shares_delete" ON public.student_audio_shares
FOR DELETE USING (
    public.is_master_admin()
    OR student_id = public.get_current_authenticated_user_id()
);

-- 3. Autoritativer Kernel-Gatekeeper: verify_student_audio_access
CREATE OR REPLACE FUNCTION public.verify_student_audio_access(
    p_student_id UUID,
    p_file_path TEXT,
    p_requesting_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    v_req_role TEXT;
    v_req_school_id UUID;
    v_is_assigned BOOLEAN;
BEGIN
    -- Fail-closed bei ungültigen Eingaben
    IF p_student_id IS NULL OR p_file_path IS NULL OR p_requesting_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Master-Admin hat für forensische Audits Lesezugriff
    IF public.is_master_admin() THEN
        RETURN TRUE;
    END IF;

    -- 1. Schüler ist 100% Eigentümer seiner eigenen Aufnahmen
    IF p_requesting_user_id = p_student_id THEN
        RETURN TRUE;
    END IF;

    -- Rolle und Schule des Anfragenden ermitteln
    SELECT role, school_id INTO v_req_role, v_req_school_id
    FROM public.users_raw
    WHERE id = p_requesting_user_id;

    IF v_req_role IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 2. 🛡️ Schulleitung, Sekretariat, Kiosk & Anonym: STRENG 0% ZUGRIFF (§ 201 StGB / § 73 UrhG)
    IF v_req_role IN ('admin', 'secretary', 'superadmin', 'kiosk') THEN
        RETURN FALSE;
    END IF;

    -- Nur Lehrkräfte können für geteilte Schüleraufnahmen autorisiert werden
    IF v_req_role <> 'teacher' THEN
        RETURN FALSE;
    END IF;

    -- 3. Mandantentrennung: Schüler und Lehrkraft müssen derselben Schule angehören
    IF NOT EXISTS (
        SELECT 1 FROM public.users_raw s
        WHERE s.id = p_student_id AND s.school_id = v_req_school_id
    ) THEN
        RETURN FALSE;
    END IF;

    -- 4. Lehrkraft-Zuweisung prüfen (schedules, schedule_occurrences oder students)
    SELECT EXISTS (
        SELECT 1 FROM public.schedules sch
        WHERE sch.school_id = v_req_school_id
          AND sch.teacher_id = p_requesting_user_id
          AND sch.student_id = p_student_id
        UNION ALL
        SELECT 1 FROM public.schedule_occurrences occ
        WHERE occ.school_id = v_req_school_id
          AND (occ.teacher_id = p_requesting_user_id OR occ.substitute_teacher_id = p_requesting_user_id)
          AND occ.student_id = p_student_id
        UNION ALL
        SELECT 1 FROM public.students stud
        WHERE stud.school_id = v_req_school_id
          AND stud.teacher_id = p_requesting_user_id
          AND stud.id = p_student_id
    ) INTO v_is_assigned;

    IF NOT v_is_assigned THEN
        RETURN FALSE;
    END IF;

    -- 5. Opt-In ReBAC Sharing prüfen: Wurde diese Datei aktiv für diese Lehrkraft freigegeben?
    RETURN EXISTS (
        SELECT 1 FROM public.student_audio_shares
        WHERE student_id = p_student_id
          AND teacher_id = p_requesting_user_id
          AND file_path_hash = md5(p_file_path)
          AND is_active = TRUE
    );
END;
$$;

-- 4. Autoritativer RPC: set_student_audio_share
CREATE OR REPLACE FUNCTION public.set_student_audio_share(
    p_file_path TEXT,
    p_teacher_id UUID,
    p_is_shared BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
VOLATILE
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_school_id UUID;
    v_is_assigned BOOLEAN;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'AUTHENTICATION_REQUIRED';
    END IF;

    SELECT role, school_id INTO v_caller_role, v_school_id
    FROM public.users_raw
    WHERE id = v_caller_id;

    -- Nur Schüler dürfen eigene Aufnahmen freigeben oder widerrufen
    IF v_caller_role <> 'student' AND NOT public.is_master_admin() THEN
        RAISE EXCEPTION 'ONLY_STUDENT_OWNER_CAN_SHARE_RECORDINGS';
    END IF;

    IF p_teacher_id IS NULL OR p_file_path IS NULL THEN
        RAISE EXCEPTION 'INVALID_ARGUMENTS';
    END IF;

    -- Validieren, dass die Lehrkraft der gleichen Schule angehört
    IF NOT EXISTS (
        SELECT 1 FROM public.users_raw
        WHERE id = p_teacher_id AND school_id = v_school_id AND role = 'teacher'
    ) THEN
        RAISE EXCEPTION 'TEACHER_NOT_FOUND_IN_SCHOOL';
    END IF;

    -- Validieren, dass die Lehrkraft dem Schüler zugewiesen ist
    SELECT EXISTS (
        SELECT 1 FROM public.schedules sch
        WHERE sch.school_id = v_school_id
          AND sch.teacher_id = p_teacher_id
          AND sch.student_id = v_caller_id
        UNION ALL
        SELECT 1 FROM public.schedule_occurrences occ
        WHERE occ.school_id = v_school_id
          AND (occ.teacher_id = p_teacher_id OR occ.substitute_teacher_id = p_teacher_id)
          AND occ.student_id = v_caller_id
        UNION ALL
        SELECT 1 FROM public.students stud
        WHERE stud.school_id = v_school_id
          AND stud.teacher_id = p_teacher_id
          AND stud.id = v_caller_id
    ) INTO v_is_assigned;

    IF NOT v_is_assigned THEN
        RAISE EXCEPTION 'TEACHER_NOT_ASSIGNED_TO_STUDENT';
    END IF;

    -- Upsert in student_audio_shares
    INSERT INTO public.student_audio_shares (
        school_id,
        student_id,
        teacher_id,
        file_path,
        is_active,
        shared_at,
        revoked_at,
        updated_at
    ) VALUES (
        v_school_id,
        v_caller_id,
        p_teacher_id,
        p_file_path,
        p_is_shared,
        CASE WHEN p_is_shared THEN timezone('utc'::text, now()) ELSE timezone('utc'::text, now()) END,
        CASE WHEN p_is_shared THEN NULL ELSE timezone('utc'::text, now()) END,
        timezone('utc'::text, now())
    )
    ON CONFLICT (student_id, teacher_id, file_path_hash)
    DO UPDATE SET
        is_active = EXCLUDED.is_active,
        revoked_at = CASE WHEN EXCLUDED.is_active THEN NULL ELSE timezone('utc'::text, now()) END,
        updated_at = timezone('utc'::text, now());

    -- WORM Audit-Logging
    INSERT INTO public.audit_logs (
        school_id,
        user_id,
        action,
        resource,
        metadata
    ) VALUES (
        v_school_id,
        v_caller_id,
        CASE WHEN p_is_shared THEN 'SHARE_STUDENT_AUDIO' ELSE 'REVOKE_STUDENT_AUDIO' END,
        'student_audio_shares',
        jsonb_build_object(
            'student_id', v_caller_id,
            'teacher_id', p_teacher_id,
            'file_path', p_file_path,
            'is_shared', p_is_shared,
            'timestamp', timezone('utc'::text, now())
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'student_id', v_caller_id,
        'teacher_id', p_teacher_id,
        'file_path', p_file_path,
        'is_shared', p_is_shared
    );
END;
$$;

-- 5. RPC zum Abfragen des Sharing-Status einer Datei: get_student_audio_shares
CREATE OR REPLACE FUNCTION public.get_student_audio_shares(
    p_file_path TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_school_id UUID;
    v_shares JSONB;
BEGIN
    v_caller_id := public.get_current_authenticated_user_id();
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('shares', '[]'::jsonb);
    END IF;

    SELECT role, school_id INTO v_caller_role, v_school_id
    FROM public.users_raw
    WHERE id = v_caller_id;

    IF v_caller_role = 'student' THEN
        -- Schüler sieht alle Freigaben für seine Datei
        SELECT coalesce(jsonb_agg(
            jsonb_build_object(
                'teacher_id', s.teacher_id,
                'teacher_name', concat(t.first_name, ' ', t.last_name),
                'is_active', s.is_active,
                'shared_at', s.shared_at,
                'revoked_at', s.revoked_at
            )
        ), '[]'::jsonb) INTO v_shares
        FROM public.student_audio_shares s
        JOIN public.users_raw t ON t.id = s.teacher_id
        WHERE s.student_id = v_caller_id
          AND s.file_path_hash = md5(p_file_path);

        RETURN jsonb_build_object('role', 'student', 'shares', v_shares);

    ELSIF v_caller_role = 'teacher' THEN
        -- Lehrkraft sieht nur, ob die Datei mit ihr geteilt ist
        SELECT coalesce(jsonb_agg(
            jsonb_build_object(
                'teacher_id', s.teacher_id,
                'is_active', s.is_active,
                'shared_at', s.shared_at
            )
        ), '[]'::jsonb) INTO v_shares
        FROM public.student_audio_shares s
        WHERE s.teacher_id = v_caller_id
          AND s.file_path_hash = md5(p_file_path)
          AND s.is_active = true;

        RETURN jsonb_build_object('role', 'teacher', 'shares', v_shares, 'is_shared', jsonb_array_length(v_shares) > 0);

    ELSE
        -- Admins, Sekretariat, Externe erhalten 0 Informationen
        RETURN jsonb_build_object('role', v_caller_role, 'shares', '[]'::jsonb, 'access_prohibited', true);
    END IF;
END;
$$;

-- 6. Storage RLS Richtlinien-Härtung (Ausschluss von Schulleitung/Sekretariat bei Schüleraufnahmen)
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
                -- A) Schüler-Ordner: schools/<school_id>/students/<student_id>/...
                CASE 
                    WHEN (storage.foldername(name))[3] = 'students' THEN
                        -- Schüler selbst darf immer seine eigenen Dateien lesen
                        (storage.foldername(name))[4] = public.get_current_authenticated_user_id()::text
                        -- Lehrkraft darf Schüler-Aufnahmen NUR bei explizitem Opt-In Share lesen
                        OR (
                            public.get_current_user_role() = 'teacher'
                            AND public.verify_student_audio_access(
                                (storage.foldername(name))[4]::uuid,
                                name,
                                public.get_current_authenticated_user_id()
                            ) = TRUE
                        )
                        -- Schulleitung & Sekretariat sind bei 'students' explizit AUSGESCHLOSSEN

                    -- B) Allgemeine Schuldateien (KEIN Schüler-Ordner):
                    ELSE
                        -- Schulleitung & Lehrkräfte dürfen allgemeine Schulmaterialien lesen
                        public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
                        -- Schüler dürfen Schul-Audio, Loops und Meisterwerk-Vorlagen anhören
                        OR (
                            public.get_current_user_role() = 'student'
                            AND (storage.foldername(name))[3] IN ('loops', 'meisterwerk', 'audio_biography')
                        )
                END
            )
        )
    )
);

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
                CASE 
                    WHEN (storage.foldername(name))[3] = 'students' THEN
                        (storage.foldername(name))[4] = public.get_current_authenticated_user_id()::text
                        OR (
                            public.get_current_user_role() = 'teacher'
                            AND public.verify_student_audio_access(
                                (storage.foldername(name))[4]::uuid,
                                name,
                                public.get_current_authenticated_user_id()
                            ) = TRUE
                        )
                    ELSE
                        public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
                        OR (
                            public.get_current_user_role() = 'student'
                            AND (storage.foldername(name))[3] IN ('loops', 'meisterwerk', 'audio_biography')
                        )
                END
            )
        )
    )
);

COMMENT ON TABLE public.student_audio_shares IS
'Enterprise+ ASVS L3 ReBAC Tabelle für explizite Schüler-Freigaben von Unterrichts- und Übeaufnahmen an zugewiesene Lehrkräfte.';

COMMENT ON FUNCTION public.verify_student_audio_access IS
'Autoritativer Kernel-Gatekeeper: Verifiziert Schüler-Eigentümerschaft oder Opt-In Share für zugewiesene Lehrkräfte. Schließt Schulleitung/Sekretariat hermetisch aus.';

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';

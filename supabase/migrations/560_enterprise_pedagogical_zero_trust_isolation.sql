-- ==============================================================================
-- Migration: 560_enterprise_pedagogical_zero_trust_isolation.sql
-- Description: 0,1% Goldstandard Pedagogical Zero-Trust Isolation (Hermetische Trennung
--              der pädagogischen Sphäre von der Verwaltungssphäre).
--              1. ReBAC Kernel-Funktionen: is_assigned_teacher_of_student,
--                 is_band_coach_of_student, is_parent_of_student.
--              2. progress_matrix: Hermetischer Ausschluss von Schulleitung/Sekretariat;
--                 Zugriff nur für Schüler, Eltern und zugewiesene Lehrkraft.
--              3. user_song_skills: Streichung der pauschalen check_school_access Klausel;
--                 Mitschüler- und Administrations-Schutz.
--              4. campus_direct_messages: Beseitigung der Admin/Lehrer-Hintertür bei Gruppenchats.
--              5. storage.objects: Ganzheitlicher Schutz des gesamten Schülerordners
--                 schools/<school_id>/students/<student_id>/* gegen Administrationszugriff.
-- Governance:  OWASP ASVS Level 3, § 201 StGB, § 26 BDSG, § 8a SGB VIII, Art. 5/8/9/25 DSGVO.
-- ==============================================================================

-- 1. ReBAC Kernel-Funktionen zur autoritativen Zuweisungs- & Verwandtschaftsprüfung

CREATE OR REPLACE FUNCTION public.is_assigned_teacher_of_student(
    p_teacher_id UUID,
    p_student_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
    IF p_teacher_id IS NULL OR p_student_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Master-Admin hat globalen Audit-Zugriff
    IF public.is_master_admin() THEN
        RETURN TRUE;
    END IF;

    -- Prüfung 1: Stundenplan (schedules)
    IF EXISTS (
        SELECT 1 FROM public.schedules s
        WHERE s.teacher_id = p_teacher_id AND s.student_id = p_student_id
    ) THEN
        RETURN TRUE;
    END IF;

    -- Prüfung 2: Konkrete Unterrichtstermine oder Vertretungen (schedule_occurrences)
    IF EXISTS (
        SELECT 1 FROM public.schedule_occurrences o
        WHERE (o.teacher_id = p_teacher_id OR o.substitute_teacher_id = p_teacher_id)
          AND o.student_id = p_student_id
    ) THEN
        RETURN TRUE;
    END IF;

    -- Prüfung 3: Schüler-Stammsatz (students)
    IF EXISTS (
        SELECT 1 FROM public.students st
        WHERE st.teacher_id = p_teacher_id AND st.id = p_student_id
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_band_coach_of_student(
    p_coach_id UUID,
    p_student_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
    IF p_coach_id IS NULL OR p_student_id IS NULL THEN
        RETURN FALSE;
    END IF;

    IF public.is_master_admin() THEN
        RETURN TRUE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.bands b
        JOIN public.band_members bm ON bm.band_id = b.id
        WHERE b.coach_id = p_coach_id AND bm.user_id = p_student_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_parent_of_student(
    p_parent_id UUID,
    p_student_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
    IF p_parent_id IS NULL OR p_student_id IS NULL THEN
        RETURN FALSE;
    END IF;

    IF public.is_master_admin() THEN
        RETURN TRUE;
    END IF;

    -- 1. Direkte Eltern-Kind-Verknüpfung
    IF EXISTS (
        SELECT 1 FROM public.student_parent_relations r
        WHERE r.parent_id = p_parent_id AND r.student_id = p_student_id AND r.is_active = TRUE
    ) THEN
        RETURN TRUE;
    END IF;

    -- 2. Geschwister-/Familiengruppe
    IF EXISTS (
        SELECT 1 FROM public.users_raw p
        JOIN public.users_raw s ON p.sibling_group_id = s.sibling_group_id
        WHERE p.id = p_parent_id 
          AND s.id = p_student_id 
          AND p.sibling_group_id IS NOT NULL
          AND p.role IN ('parent', 'guardian')
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- 2. Härtung von public.progress_matrix (Hausaufgaben, persönliche Reflexionen & Schülerfragen)
DROP POLICY IF EXISTS "progress_matrix_all" ON public.progress_matrix;
DROP POLICY IF EXISTS "progress_matrix_all_policy" ON public.progress_matrix;
DROP POLICY IF EXISTS "progress_matrix_select_scoped" ON public.progress_matrix;
DROP POLICY IF EXISTS "progress_matrix_modify_scoped" ON public.progress_matrix;
DROP POLICY IF EXISTS "tenant_isolation_progress_policy" ON public.progress_matrix;

CREATE POLICY "progress_matrix_select_scoped" ON public.progress_matrix
FOR SELECT TO authenticated, anon
USING (
    public.is_master_admin()
    -- Schüler selbst
    OR student_id = public.get_current_authenticated_user_id()
    -- Verifizierte Eltern des Schülers
    OR public.is_parent_of_student(public.get_current_authenticated_user_id(), student_id)
    -- Zugewiesene Lehrkraft (Schulleitung & fremde Lehrkräfte haben STRENG 0% Zugriff)
    OR (
        public.get_current_user_role() = 'teacher'
        AND public.is_assigned_teacher_of_student(public.get_current_authenticated_user_id(), student_id)
    )
);

CREATE POLICY "progress_matrix_modify_scoped" ON public.progress_matrix
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin()
    -- Schüler (für eigene Reflexionen & Fragen)
    OR student_id = public.get_current_authenticated_user_id()
    -- Zugewiesene Lehrkraft (für Hausaufgaben, Buchseiten, Bewertungen)
    OR (
        public.get_current_user_role() = 'teacher'
        AND public.is_assigned_teacher_of_student(public.get_current_authenticated_user_id(), student_id)
    )
)
WITH CHECK (
    public.is_master_admin()
    OR student_id = public.get_current_authenticated_user_id()
    OR (
        public.get_current_user_role() = 'teacher'
        AND public.is_assigned_teacher_of_student(public.get_current_authenticated_user_id(), student_id)
    )
);

-- 3. Härtung von public.user_song_skills (Song-Bewertungen, Bühnenreife & Gehör-Match)
DROP POLICY IF EXISTS "user_song_skills_all" ON public.user_song_skills;
DROP POLICY IF EXISTS "user_song_skills_select" ON public.user_song_skills;
DROP POLICY IF EXISTS "user_song_skills_modify" ON public.user_song_skills;

CREATE POLICY "user_song_skills_select" ON public.user_song_skills
FOR SELECT TO authenticated, anon
USING (
    public.is_master_admin()
    -- Schüler selbst
    OR user_id = public.get_current_authenticated_user_id()
    -- Eltern des Schülers
    OR public.is_parent_of_student(public.get_current_authenticated_user_id(), user_id)
    -- Zugewiesene Lehrkraft oder Band-Coach
    OR (
        public.get_current_user_role() = 'teacher'
        AND (
            public.is_assigned_teacher_of_student(public.get_current_authenticated_user_id(), user_id)
            OR public.is_band_coach_of_student(public.get_current_authenticated_user_id(), user_id)
        )
    )
    -- Band-Mitschüler sehen nur Songs des gemeinsamen Band-Repertoires
    OR EXISTS (
        SELECT 1 FROM public.band_members bm_self
        JOIN public.band_members bm_peer ON bm_self.band_id = bm_peer.band_id
        JOIN public.band_songs bs ON bs.band_id = bm_self.band_id
        WHERE bm_self.user_id = public.get_current_authenticated_user_id()
          AND bm_peer.user_id = user_song_skills.user_id
          AND bs.song_id = user_song_skills.song_id
    )
);

CREATE POLICY "user_song_skills_modify" ON public.user_song_skills
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin()
    OR user_id = public.get_current_authenticated_user_id()
    OR (
        public.get_current_user_role() = 'teacher'
        AND (
            public.is_assigned_teacher_of_student(public.get_current_authenticated_user_id(), user_id)
            OR public.is_band_coach_of_student(public.get_current_authenticated_user_id(), user_id)
        )
    )
)
WITH CHECK (
    public.is_master_admin()
    OR user_id = public.get_current_authenticated_user_id()
    OR (
        public.get_current_user_role() = 'teacher'
        AND (
            public.is_assigned_teacher_of_student(public.get_current_authenticated_user_id(), user_id)
            OR public.is_band_coach_of_student(public.get_current_authenticated_user_id(), user_id)
        )
    )
);

-- 4. Härtung von public.campus_direct_messages (Gruppenchats & Band-Kommunikation gem. § 201 StGB)
DROP POLICY IF EXISTS "campus_direct_messages_tenant_scoped" ON public.campus_direct_messages;

CREATE POLICY "campus_direct_messages_tenant_scoped" ON public.campus_direct_messages
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR (
        public.get_current_authenticated_user_id() IS NOT NULL
        AND (
            -- 1:1 Einzelchat: Nur Sender oder Empfänger
            (group_id IS NULL AND (
                sender_id = public.get_current_authenticated_user_id()
                OR recipient_id = public.get_current_authenticated_user_id()
            ))
            -- Gruppenchat: Ausschließlich verifizierte Gruppenmitglieder oder Ersteller
            -- Keine pauschale Hintertür für unbeteiligte Lehrer oder Schulleiter mehr!
            OR (group_id IS NOT NULL AND (
                public.is_campus_chat_group_member(group_id, public.get_current_authenticated_user_id())
                OR public.is_campus_chat_group_creator(group_id, public.get_current_authenticated_user_id())
            ))
        )
    )
)
WITH CHECK (
    public.is_master_admin()
    OR (
        public.get_current_authenticated_user_id() IS NOT NULL
        AND (
            (group_id IS NULL AND (
                sender_id = public.get_current_authenticated_user_id()
                OR recipient_id = public.get_current_authenticated_user_id()
            ))
            OR (group_id IS NOT NULL AND (
                public.is_campus_chat_group_member(group_id, public.get_current_authenticated_user_id())
                OR public.is_campus_chat_group_creator(group_id, public.get_current_authenticated_user_id())
            ))
        )
    )
);

-- 5. Storage RLS Whole-Tree Shield (Ganzheitlicher Schutz des Schüler-Ordners)
DROP POLICY IF EXISTS "enterprise_scoped_select_campus_assets" ON storage.objects;

CREATE POLICY "enterprise_scoped_select_campus_assets"
ON storage.objects FOR SELECT TO authenticated, anon
USING (
    bucket_id = 'campus-assets'
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
                -- 🛡️ GANZHEITLICHER SCHÜLERBAUM-SCHUTZ: schools/<school_id>/students/<student_id>/*
                CASE 
                    WHEN (storage.foldername(name))[3] = 'students' THEN
                        -- 1. Schüler selbst: 100% Hoheit über alle eigenen Dateien
                        (storage.foldername(name))[4] = public.get_current_authenticated_user_id()::text
                        -- 2. Zugewiesene Lehrkraft:
                        OR (
                            public.get_current_user_role() = 'teacher'
                            AND public.is_assigned_teacher_of_student(
                                public.get_current_authenticated_user_id(),
                                (storage.foldername(name))[4]::uuid
                            ) = TRUE
                            AND (
                                -- A) Hausaufgaben & Meisterwerk: Zur didaktischen Durchsicht erlaubt
                                (storage.foldername(name))[5] IN ('homework', 'meisterwerk', 'audio', 'notes')
                                -- B) Recordings: Nur bei explizitem Opt-In Share (SEC-121)
                                OR (
                                    (storage.foldername(name))[5] = 'recordings'
                                    AND public.verify_student_audio_access(
                                        (storage.foldername(name))[4]::uuid,
                                        name,
                                        public.get_current_authenticated_user_id()
                                    ) = TRUE
                                )
                            )
                        )
                        -- 🚫 Schulleitung & Sekretariat sind hermetisch vom gesamten Schülerordner ausgeschlossen

                    -- Allgemeine Schuldateien (Nicht-Schülerordner)
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
                            AND public.is_assigned_teacher_of_student(
                                public.get_current_authenticated_user_id(),
                                (storage.foldername(name))[4]::uuid
                            ) = TRUE
                            AND (
                                (storage.foldername(name))[5] IN ('homework', 'meisterwerk', 'audio', 'notes')
                                OR (
                                    (storage.foldername(name))[5] = 'recordings'
                                    AND public.verify_student_audio_access(
                                        (storage.foldername(name))[4]::uuid,
                                        name,
                                        public.get_current_authenticated_user_id()
                                    ) = TRUE
                                )
                            )
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

GRANT EXECUTE ON FUNCTION public.is_assigned_teacher_of_student(UUID, UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_band_coach_of_student(UUID, UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_parent_of_student(UUID, UUID) TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.is_assigned_teacher_of_student IS
'0,1% Goldstandard ReBAC: Verifiziert die offizielle pädagogische Zuweisung einer Lehrkraft zu einem Schüler via Stundenplan, Termine oder Fach.';

COMMENT ON POLICY "progress_matrix_select_scoped" ON public.progress_matrix IS
'OWASP ASVS L3: Schließt Schulleitung und unbeteiligte Lehrkräfte hermetisch von Schüler-Hausaufgaben, Notizen und Reflexionen aus.';

COMMENT ON POLICY "campus_direct_messages_tenant_scoped" ON public.campus_direct_messages IS
'§ 201 StGB Konformität: Unterbindet das heimliche Mitlesen von Gruppen- und Band-Chats durch Schulleitung oder unbeteiligte Lehrer.';

-- PostgREST Schema-Cache aktualisieren
NOTIFY pgrst, 'reload schema';


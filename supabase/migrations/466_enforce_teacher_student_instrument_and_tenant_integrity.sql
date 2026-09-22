-- ==============================================================================
-- 🏛️ MIGRATION 466: ENFORCE TEACHER-STUDENT INSTRUMENT & TENANT INTEGRITY
-- Standards: OWASP ASVS Level 3 / Fail-Closed / Zero-Trust / DSGVO Art. 25
-- Purpose:
-- 1. Function public.is_instrument_compatible(student_instrument, teacher_id)
-- 2. Trigger trg_enforce_teacher_student_assignment_integrity on users_raw, students, schedules
-- 3. Strict Teacher-Student RLS on users_raw, students, schedules, schedule_occurrences
-- 4. Single-Flight Roster Invariant Hardening in get_teacher_schedule_roster
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CANONICAL INSTRUMENT NORMALIZER & COMPATIBILITY CHECKER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_instrument_token(p_raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_clean text;
BEGIN
    IF p_raw IS NULL THEN
        RETURN '';
    END IF;
    
    v_clean := LOWER(TRIM(p_raw));
    
    -- Normalize umlauts & special chars
    v_clean := REPLACE(v_clean, 'ä', 'ae');
    v_clean := REPLACE(v_clean, 'ö', 'oe');
    v_clean := REPLACE(v_clean, 'ü', 'ue');
    v_clean := REPLACE(v_clean, 'ß', 'ss');
    
    -- Strip punctuation except hyphens
    v_clean := REGEXP_REPLACE(v_clean, '[^a-z0-9\-]', '', 'g');

    -- Alias mappings to canonical instrument families
    IF v_clean IN ('schlagzeug', 'drums', 'drumset', 'percussion', 'cajon', 'pauken', 'bongos', 'congas') THEN
        RETURN 'schlagzeug';
    ELSIF v_clean IN ('gitarre', 'guitar', 'egitarre', 'akustikgitarre', 'westerngitarre', 'konzertgitarre', 'classicalguitar') THEN
        RETURN 'gitarre';
    ELSIF v_clean IN ('bass', 'ebass', 'kontrabass', 'uprightbass', 'bassgitarre') THEN
        RETURN 'bass';
    ELSIF v_clean IN ('klavier', 'piano', 'epiano', 'keyboard', 'fluegel', 'tasteninstrumente') THEN
        RETURN 'klavier';
    ELSIF v_clean IN ('gesang', 'vocals', 'vocal', 'stimme', 'singing') THEN
        RETURN 'gesang';
    ELSIF v_clean IN ('saxophon', 'saxophone', 'sax', 'altsaxophon', 'tenorsaxophon', 'baritonsaxophon', 'sopransaxophon') THEN
        RETURN 'saxophon';
    ELSIF v_clean IN ('trompete', 'trumpet', 'kornett', 'fluegelhorn') THEN
        RETURN 'trompete';
    ELSIF v_clean IN ('posaune', 'trombone') THEN
        RETURN 'posaune';
    ELSIF v_clean IN ('geige', 'violine', 'violin') THEN
        RETURN 'geige';
    ELSIF v_clean IN ('bratsche', 'viola') THEN
        RETURN 'bratsche';
    ELSIF v_clean IN ('cello', 'violoncello') THEN
        RETURN 'cello';
    ELSIF v_clean IN ('floete', 'querfloete', 'blockfloete', 'flute', 'recorder') THEN
        RETURN 'floete';
    ELSIF v_clean IN ('klarinette', 'clarinet') THEN
        RETURN 'klarinette';
    ELSIF v_clean IN ('ukulele') THEN
        RETURN 'ukulele';
    ELSIF v_clean IN ('harfe', 'harp') THEN
        RETURN 'harfe';
    ELSIF v_clean IN ('akkordeon', 'accordion') THEN
        RETURN 'akkordeon';
    END IF;

    RETURN v_clean;
END;
$$;

GRANT EXECUTE ON FUNCTION public.normalize_instrument_token(text) TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.is_instrument_compatible(
    p_student_instrument text,
    p_teacher_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_norm_student text;
    v_teacher_rec record;
    v_raw_combined text := '';
    v_token text;
    v_teacher_tokens text[];
BEGIN
    -- If no teacher assigned, it is unassigned and thus valid
    IF p_teacher_id IS NULL THEN
        RETURN TRUE;
    END IF;

    -- If student instrument is unset or generic placeholder, allow assignment (pending allocation)
    IF p_student_instrument IS NULL OR TRIM(p_student_instrument) = '' THEN
        RETURN TRUE;
    END IF;

    v_norm_student := public.normalize_instrument_token(p_student_instrument);
    IF v_norm_student IN ('', 'musiker', 'schueler', 'allgemein', 'onboarding', 'unbekannt') THEN
        RETURN TRUE;
    END IF;

    -- Fetch teacher instrument and expertise data
    SELECT instrument, groovelab_instrument, expertise INTO v_teacher_rec
    FROM public.users_raw
    WHERE id = p_teacher_id;

    IF v_teacher_rec IS NULL THEN
        -- Fallback check in students/users table
        SELECT instrument, NULL as groovelab_instrument, NULL as expertise INTO v_teacher_rec
        FROM public.students
        WHERE id = p_teacher_id;
    END IF;

    IF v_teacher_rec IS NULL THEN
        RETURN FALSE;
    END IF;

    v_raw_combined := COALESCE(v_teacher_rec.instrument, '') || ' ' || 
                      COALESCE(v_teacher_rec.groovelab_instrument, '') || ' ' || 
                      COALESCE(v_teacher_rec.expertise, '');

    -- If teacher has no instrument configured, permit fallback
    IF TRIM(v_raw_combined) = '' THEN
        RETURN TRUE;
    END IF;

    -- Split teacher's combined instrument definitions by comma, slash, plus, ampersand, whitespace
    FOREACH v_token IN ARRAY REGEXP_SPLIT_TO_ARRAY(v_raw_combined, '[,/&+;\s]+')
    LOOP
        IF v_token IS NOT NULL AND TRIM(v_token) <> '' THEN
            IF public.normalize_instrument_token(v_token) = v_norm_student THEN
                RETURN TRUE;
            END IF;
        END IF;
    END LOOP;

    -- No match found: incompatible
    RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_instrument_compatible(text, uuid) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 2. AUTHORITATIVE INTEGRITY TRIGGER GUARD
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_enforce_teacher_student_assignment_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_teacher_school_id uuid;
    v_teacher_role text;
    v_teacher_name text;
    v_student_instrument text;
    v_is_group boolean := FALSE;
BEGIN
    -- A) Branch: USERS_RAW
    IF TG_TABLE_NAME = 'users_raw' THEN
        IF NEW.role = 'student' AND NEW.teacher_id IS NOT NULL THEN
            -- Check Multi-Tenancy Scoping
            SELECT school_id, role, COALESCE(first_name || ' ' || last_name, 'Unbekannt')
            INTO v_teacher_school_id, v_teacher_role, v_teacher_name
            FROM public.users_raw
            WHERE id = NEW.teacher_id;

            IF v_teacher_school_id IS NULL THEN
                RAISE EXCEPTION 'Zuweisung ungültig: Die angegebene Lehrkraft (ID %) existiert nicht.', NEW.teacher_id
                    USING ERRCODE = 'P0002';
            END IF;

            IF v_teacher_school_id <> NEW.school_id THEN
                RAISE EXCEPTION 'Multi-Tenancy Verletzung: Schüler (%) und Lehrkraft % gehören unterschiedlichen Schulen an.', 
                    NEW.id, v_teacher_name
                    USING ERRCODE = '42501';
            END IF;

            -- Check Instrument Compatibility
            IF NOT public.is_instrument_compatible(NEW.instrument, NEW.teacher_id) THEN
                RAISE EXCEPTION 'Regelverstoß: Fachfremde Zuweisung unzulässig! Lehrkraft % unterrichtet das Fach des Schülers (%) nicht.', 
                    v_teacher_name, COALESCE(NEW.instrument, 'Unbekannt')
                    USING ERRCODE = 'P0001';
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    -- B) Branch: STUDENTS
    IF TG_TABLE_NAME = 'students' THEN
        IF NEW.teacher_id IS NOT NULL THEN
            SELECT school_id, role, COALESCE(first_name || ' ' || last_name, 'Unbekannt')
            INTO v_teacher_school_id, v_teacher_role, v_teacher_name
            FROM public.users_raw
            WHERE id = NEW.teacher_id;

            IF v_teacher_school_id IS NOT NULL THEN
                IF v_teacher_school_id <> NEW.school_id THEN
                    RAISE EXCEPTION 'Multi-Tenancy Verletzung: Schüler (%) und Lehrkraft % gehören unterschiedlichen Schulen an.', 
                        NEW.id, v_teacher_name
                        USING ERRCODE = '42501';
                END IF;

                IF NOT public.is_instrument_compatible(NEW.instrument, NEW.teacher_id) THEN
                    RAISE EXCEPTION 'Regelverstoß: Fachfremde Zuweisung unzulässig! Lehrkraft % unterrichtet das Fach des Schülers (%) nicht.', 
                        v_teacher_name, COALESCE(NEW.instrument, 'Unbekannt')
                        USING ERRCODE = 'P0001';
                END IF;
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    -- C) Branch: SCHEDULES
    IF TG_TABLE_NAME = 'schedules' THEN
        IF NEW.teacher_id IS NOT NULL AND NEW.student_id IS NOT NULL THEN
            -- Check if this is a group schedule
            BEGIN
                v_is_group := COALESCE(NEW.is_group, false);
            EXCEPTION WHEN OTHERS THEN
                v_is_group := FALSE;
            END IF;

            -- Band/Ensemble schedules are exempt from 1:1 instrument matching
            IF NOT v_is_group THEN
                SELECT instrument INTO v_student_instrument
                FROM public.users_raw
                WHERE id = NEW.student_id;

                IF v_student_instrument IS NULL THEN
                    SELECT instrument INTO v_student_instrument
                    FROM public.students
                    WHERE id = NEW.student_id;
                END IF;

                IF v_student_instrument IS NOT NULL AND NOT public.is_instrument_compatible(v_student_instrument, NEW.teacher_id) THEN
                    SELECT COALESCE(first_name || ' ' || last_name, 'Lehrkraft') INTO v_teacher_name
                    FROM public.users_raw
                    WHERE id = NEW.teacher_id;

                    RAISE EXCEPTION 'Regelverstoß: Fachfremde Zuweisung im Stundenplan unzulässig! Lehrkraft % unterrichtet das Fach [%] nicht.', 
                        v_teacher_name, v_student_instrument
                        USING ERRCODE = 'P0001';
                END IF;
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

-- Bind triggers to tables
DROP TRIGGER IF EXISTS trg_enforce_teacher_student_integrity ON public.users_raw;
CREATE TRIGGER trg_enforce_teacher_student_integrity
    BEFORE INSERT OR UPDATE OF teacher_id, instrument, school_id ON public.users_raw
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_enforce_teacher_student_assignment_integrity();

DO $$
BEGIN
    IF to_regclass('public.students') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS trg_enforce_student_teacher_integrity ON public.students;
        CREATE TRIGGER trg_enforce_student_teacher_integrity
            BEFORE INSERT OR UPDATE OF teacher_id, instrument, school_id ON public.students
            FOR EACH ROW
            EXECUTE FUNCTION public.trg_enforce_teacher_student_assignment_integrity();
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_schedule_teacher_integrity ON public.schedules;
CREATE TRIGGER trg_enforce_schedule_teacher_integrity
    BEFORE INSERT OR UPDATE OF teacher_id, student_id, school_id ON public.schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_enforce_teacher_student_assignment_integrity();

-- ------------------------------------------------------------------------------
-- 3. ROW-LEVEL SECURITY (RLS) RE-HARDENING (STRICT TEACHER-STUDENT ISOLATION)
-- ------------------------------------------------------------------------------

-- A) public.users_raw
DROP POLICY IF EXISTS "users_raw_select_tenant_scoped" ON public.users_raw;

CREATE POLICY "users_raw_select_tenant_scoped" ON public.users_raw
FOR SELECT TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR id = public.get_current_authenticated_user_id()
    OR (
        public.get_kiosk_school_id() IS NOT NULL 
        AND school_id = public.get_kiosk_school_id()
    )
    OR (
        public.get_current_user_school_id() IS NOT NULL 
        AND school_id = public.get_current_user_school_id()
        AND (
            -- 1. Admins and Secretaries can view everyone in their school
            public.get_current_user_role() IN ('admin', 'secretary')
            
            -- 2. Staff members (teachers/admins) are visible in school directory/chat
            OR role IN ('teacher', 'admin', 'secretary')
            
            -- 3. Teachers can ONLY view students assigned to them AND instrument-compatible
            OR (
                public.get_current_user_role() = 'teacher'
                AND role = 'student'
                AND (
                    teacher_id = public.get_current_authenticated_user_id()
                    OR id IN (
                        SELECT s.student_id FROM public.schedules s 
                        WHERE s.teacher_id = public.get_current_authenticated_user_id() AND s.student_id IS NOT NULL
                    )
                    OR id IN (
                        SELECT so.student_id FROM public.schedule_occurrences so 
                        WHERE so.teacher_id = public.get_current_authenticated_user_id() AND so.student_id IS NOT NULL
                    )
                    OR id IN (
                        SELECT bm.user_id FROM public.bands b 
                        JOIN public.band_members bm ON bm.band_id = b.id 
                        WHERE b.coach_id = public.get_current_authenticated_user_id()
                    )
                )
                AND public.is_instrument_compatible(instrument, public.get_current_authenticated_user_id())
            )

            -- 4. Students can view themselves and classmates in the same group/band
            OR (
                public.get_current_user_role() = 'student'
                AND (
                    id = public.get_current_authenticated_user_id()
                    OR (group_id IS NOT NULL AND group_id = (SELECT u_self.group_id FROM public.users_raw u_self WHERE u_self.id = public.get_current_authenticated_user_id()))
                    OR (sibling_group_id IS NOT NULL AND sibling_group_id = (SELECT u_self.sibling_group_id FROM public.users_raw u_self WHERE u_self.id = public.get_current_authenticated_user_id()))
                    OR id IN (
                        SELECT bm2.user_id FROM public.band_members bm1
                        JOIN public.band_members bm2 ON bm1.band_id = bm2.band_id
                        WHERE bm1.user_id = public.get_current_authenticated_user_id()
                    )
                )
            )
        )
    )
);

-- B) public.students
DO $$
BEGIN
    IF to_regclass('public.students') IS NOT NULL THEN
        DROP POLICY IF EXISTS "students_select" ON public.students;
        CREATE POLICY "students_select" ON public.students
        FOR SELECT TO authenticated, anon
        USING (
            public.is_master_admin()
            OR id = public.get_current_authenticated_user_id()
            OR (
                school_id IS NOT NULL 
                AND school_id = public.get_current_user_school_id()
                AND (
                    public.get_current_user_role() IN ('admin', 'secretary')
                    OR (
                        public.get_current_user_role() = 'teacher'
                        AND (
                            teacher_id = public.get_current_authenticated_user_id()
                            OR id IN (
                                SELECT s.student_id FROM public.schedules s 
                                WHERE s.teacher_id = public.get_current_authenticated_user_id() AND s.student_id IS NOT NULL
                            )
                        )
                        AND public.is_instrument_compatible(instrument, public.get_current_authenticated_user_id())
                    )
                )
            )
        );
    END IF;
END;
$$;

-- C) public.schedules
DROP POLICY IF EXISTS "schedules_tenant_scoped" ON public.schedules;
CREATE POLICY "schedules_tenant_scoped" ON public.schedules
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR (
        school_id = public.get_current_user_school_id()
        AND public.get_current_user_role() IN ('admin', 'secretary')
    )
    OR (teacher_id = public.get_current_authenticated_user_id())
    OR (student_id = public.get_current_authenticated_user_id())
    OR (public.get_kiosk_school_id() IS NOT NULL AND school_id = public.get_kiosk_school_id())
)
WITH CHECK (
    public.is_master_admin()
    OR (
        school_id = public.get_current_user_school_id()
        AND public.get_current_user_role() IN ('admin', 'secretary')
    )
    OR (teacher_id = public.get_current_authenticated_user_id())
);

-- D) public.schedule_occurrences
DROP POLICY IF EXISTS "schedule_occurrences_tenant_scoped" ON public.schedule_occurrences;
CREATE POLICY "schedule_occurrences_tenant_scoped" ON public.schedule_occurrences
FOR ALL TO authenticated, anon, service_role
USING (
    public.is_master_admin()
    OR (
        public.get_current_user_school_id() IS NOT NULL 
        AND public.get_current_user_role() IN ('admin', 'secretary')
        AND EXISTS (
            SELECT 1 FROM public.users_raw u
            WHERE u.id = schedule_occurrences.teacher_id AND u.school_id = public.get_current_user_school_id()
        )
    )
    OR (teacher_id = public.get_current_authenticated_user_id())
    OR (student_id = public.get_current_authenticated_user_id())
)
WITH CHECK (
    public.is_master_admin()
    OR (
        public.get_current_user_school_id() IS NOT NULL 
        AND public.get_current_user_role() IN ('admin', 'secretary')
    )
    OR (teacher_id = public.get_current_authenticated_user_id())
    OR (student_id = public.get_current_authenticated_user_id())
);

-- ------------------------------------------------------------------------------
-- 4. HARDEN get_teacher_schedule_roster RPC WITH INSTRUMENT INVARIANT
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_teacher_schedule_roster(
    p_teacher_id UUID,
    p_school_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
    v_caller_id UUID;
    v_is_admin BOOLEAN := FALSE;
    v_result JSONB;
BEGIN
    -- 1. Parameter-Validierung (Fail-Closed)
    IF p_school_id IS NULL OR p_teacher_id IS NULL THEN
        RAISE EXCEPTION 'school_id und teacher_id sind zwingend erforderlich' USING ERRCODE = '42501';
    END IF;

    -- 2. Autorisierungsprüfung
    v_caller_id := public.get_current_authenticated_user_id();
    v_is_admin := public.is_master_admin();

    IF v_caller_id IS NOT NULL AND NOT v_is_admin THEN
        IF v_caller_id <> p_teacher_id THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.users_raw u1
                JOIN public.users_raw u2 ON u1.school_id = u2.school_id
                WHERE u1.id = v_caller_id 
                  AND u1.role IN ('admin', 'secretary')
                  AND u2.id = p_teacher_id
                  AND u1.school_id = p_school_id
            ) THEN
                RAISE EXCEPTION 'Nicht autorisiert: Zugriff auf Stundenplandaten dieser Lehrkraft verweigert' USING ERRCODE = '42501';
            END IF;
        END IF;
    END IF;

    -- 3. Aggregation des lehrer-zentrierten Datenbündels mit Fach-Integritätsfilter
    SELECT jsonb_build_object(
        -- A) Räume der Schule
        'rooms', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', r.id,
                'name', r.name
            ) ORDER BY r.name), '[]'::jsonb)
            FROM public.rooms r
            WHERE r.school_id = p_school_id
        ),

        -- B) Profil der Lehrkraft
        'teacher_profile', (
            SELECT jsonb_build_object(
                'id', u.id,
                'first_name', u.first_name,
                'last_name', u.last_name,
                'role', u.role,
                'instrument', u.instrument,
                'lesson_duration', u.lesson_duration,
                'planned_boards', u.planned_boards,
                'campus_räume', u.campus_räume,
                'groovelab_räume', u.groovelab_räume,
                'teacher_availability', u.teacher_availability,
                'teacher_onboarding_completed', COALESCE(u.teacher_onboarding_completed, false)
            )
            FROM public.users_raw u
            WHERE u.id = p_teacher_id AND u.school_id = p_school_id
        ),

        -- C) Schedules der Lehrkraft mit Schülerdetails
        'schedules', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', s.id,
                'school_id', s.school_id,
                'teacher_id', s.teacher_id,
                'student_id', s.student_id,
                'day_of_week', s.day_of_week,
                'time_slot', s.time_slot,
                'duration', COALESCE(s.duration, 30),
                'room_id', s.room_id,
                'student', CASE WHEN su.id IS NOT NULL THEN jsonb_build_object(
                    'id', su.id,
                    'first_name', su.first_name,
                    'last_name', su.last_name,
                    'instrument', su.instrument,
                    'lesson_duration', su.lesson_duration,
                    'sibling_group_id', su.sibling_group_id,
                    'group_id', su.group_id,
                    'is_campus_active', su.is_campus_active,
                    'is_groovelab_active', su.is_groovelab_active,
                    'is_active', su.is_active
                ) ELSE NULL END
            )), '[]'::jsonb)
            FROM public.schedules s
            LEFT JOIN public.users_raw su ON su.id = s.student_id
            WHERE s.teacher_id = p_teacher_id AND s.school_id = p_school_id
        ),

        -- D) Zugeordnete Schüler (Need-to-Know: Nur EIGENE & FACH-KOMPATIBLE Schüler dieser Lehrkraft)
        'students', (
            WITH teacher_student_ids AS (
                SELECT st.id AS student_id, st.user_id, st.instrument, FALSE as is_band
                FROM public.students st
                WHERE st.school_id = p_school_id AND st.teacher_id = p_teacher_id
                UNION
                SELECT u.id AS student_id, u.id AS user_id, u.instrument, FALSE as is_band
                FROM public.users_raw u
                WHERE u.school_id = p_school_id AND u.teacher_id = p_teacher_id AND u.role = 'student'
                UNION
                SELECT s.student_id, s.student_id AS user_id, su.instrument, COALESCE(s.is_group, false) as is_band
                FROM public.schedules s
                LEFT JOIN public.users_raw su ON su.id = s.student_id
                WHERE s.school_id = p_school_id AND s.teacher_id = p_teacher_id AND s.student_id IS NOT NULL
                UNION
                SELECT bm.user_id AS student_id, bm.user_id, u.instrument, TRUE as is_band
                FROM public.bands b
                JOIN public.band_members bm ON bm.band_id = b.id
                LEFT JOIN public.users_raw u ON u.id = bm.user_id
                WHERE b.coach_id = p_teacher_id AND b.school_id = p_school_id
            ),
            consolidated_students AS (
                SELECT DISTINCT ON (COALESCE(u.id, st.id))
                    COALESCE(u.id, st.id) AS canonical_id,
                    u.id AS user_id,
                    COALESCE(NULLIF(TRIM(u.first_name), ''), NULLIF(TRIM(st.first_name), ''), 'Schüler') AS first_name,
                    COALESCE(u.last_name, st.last_name, '') AS last_name,
                    COALESCE(NULLIF(TRIM(st.instrument), ''), NULLIF(TRIM(u.instrument), ''), 'Musiker') AS instrument,
                    COALESCE(st.lesson_duration, u.lesson_duration, 30) AS duration,
                    COALESCE(st.status, 'aktiv') AS status,
                    COALESCE(st.sibling_group_id, u.sibling_group_id) AS sibling_group_id,
                    COALESCE(st.group_id, u.group_id) AS group_id,
                    (COALESCE(st.is_campus_active, false) OR COALESCE(st.is_groovelab_active, false) OR COALESCE(u.is_campus_active, false) OR COALESCE(u.is_groovelab_active, false) OR st.status = 'aktiv') AS is_onboarded,
                    EXISTS (
                        SELECT 1 FROM public.student_schedule_preferences sp
                        WHERE (sp.student_id = COALESCE(u.id, st.id) OR sp.student_id = st.id)
                          AND sp.school_id = p_school_id
                    ) AS has_preferences,
                    tsi.is_band
                FROM teacher_student_ids tsi
                LEFT JOIN public.students st ON (st.id = tsi.student_id OR st.user_id = tsi.user_id) AND st.school_id = p_school_id
                LEFT JOIN public.users_raw u ON (u.id = tsi.user_id OR u.id = tsi.student_id) AND u.school_id = p_school_id
                WHERE COALESCE(u.id, st.id) IS NOT NULL
                  -- FACH-INTEGRITÄTS-INVARIANTE:
                  -- Schüler MUSS fachlich kompatibel sein ODER im Rahmen einer Band/Ensemble zugewiesen sein
                  AND (tsi.is_band = TRUE OR public.is_instrument_compatible(COALESCE(u.instrument, st.instrument, tsi.instrument), p_teacher_id))
            )
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', cs.canonical_id,
                'user_id', cs.user_id,
                'first_name', cs.first_name,
                'last_name', cs.last_name,
                'instrument', cs.instrument,
                'duration', cs.duration,
                'status', cs.status,
                'sibling_group_id', cs.sibling_group_id,
                'group_id', cs.group_id,
                'isOnboarded', cs.is_onboarded,
                'hasPreferences', cs.has_preferences
            ) ORDER BY cs.first_name, cs.last_name), '[]'::jsonb)
            FROM consolidated_students cs
        ),

        -- E) Präferenzen (Nur von den zugeordneten Schülern)
        'preferences', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', sp.id,
                'student_id', sp.student_id,
                'day_of_week', sp.day_of_week,
                'start_time', sp.start_time,
                'end_time', sp.end_time,
                'preference_type', sp.preference_type,
                'note', sp.note
            )), '[]'::jsonb)
            FROM public.student_schedule_preferences sp
            WHERE sp.school_id = p_school_id
              AND (
                  sp.student_id IN (
                      SELECT st.id FROM public.students st WHERE st.school_id = p_school_id AND st.teacher_id = p_teacher_id
                      UNION
                      SELECT u.id FROM public.users_raw u WHERE u.school_id = p_school_id AND u.teacher_id = p_teacher_id
                      UNION
                      SELECT s.student_id FROM public.schedules s WHERE s.school_id = p_school_id AND s.teacher_id = p_teacher_id
                      UNION
                      SELECT bm.user_id FROM public.bands b JOIN public.band_members bm ON bm.band_id = b.id WHERE b.coach_id = p_teacher_id AND b.school_id = p_school_id
                  )
              )
        ),

        -- F) Anonymisierte Raumkollisionen anderer Lehrkräfte (DSGVO Art. 5/25 konform)
        'room_busy_intervals', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'day_of_week', s.day_of_week,
                'room_id', s.room_id,
                'time_slot', s.time_slot,
                'duration', COALESCE(s.duration, 30)
            )), '[]'::jsonb)
            FROM public.schedules s
            WHERE s.school_id = p_school_id
              AND s.teacher_id <> p_teacher_id
              AND s.room_id IS NOT NULL
        ),

        -- G) Raumblockierungen der Schule
        'blocked_slots', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', rb.id,
                'room_id', rb.room_id,
                'day_of_week', rb.day_of_week,
                'start_time', rb.start_time,
                'end_time', rb.end_time,
                'title', rb.title,
                'note', rb.note
            )), '[]'::jsonb)
            FROM public.room_blocked_slots rb
            WHERE rb.school_id = p_school_id
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

NOTIFY pgrst, 'reload schema';

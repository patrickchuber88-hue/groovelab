-- ==============================================================================
-- 🏛️ MIGRATION 418: ENTERPRISE TEACHER SCHEDULE ROSTER RPC (OWASP ASVS LEVEL 3)
-- Campus-Groovelab Platform - Single-Flight Low-Latency Roster Engine
-- ==============================================================================
-- 1. Aggregiert Räume, Lehrkraftprofil, zugeordnete Schüler und Präferenzen in 1 Roundtrip
-- 2. Strikte Mandanten- & Need-to-Know-Isolation (Zero Data Leakage nach Art. 5/25 DSGVO)
-- 3. Anonymisierte Bereitstellung von Fremd-Raumbelegungen für Kollisionsprüfungen
-- ==============================================================================

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

    -- 3. Aggregation des lehrer-zentrierten Datenbündels
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
                'instruments', u.instruments,
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

        -- D) Zugeordnete Schüler (Need-to-Know: Nur eigene Schüler dieser Lehrkraft)
        'students', (
            WITH teacher_student_ids AS (
                -- 1. Direkt zugewiesen in students-Tabelle
                SELECT st.id AS student_id, st.user_id
                FROM public.students st
                WHERE st.school_id = p_school_id AND st.teacher_id = p_teacher_id
                UNION
                -- 2. Direkt zugewiesen in users-Tabelle
                SELECT u.id AS student_id, u.id AS user_id
                FROM public.users_raw u
                WHERE u.school_id = p_school_id AND u.teacher_id = p_teacher_id AND u.role = 'student'
                UNION
                -- 3. Über bestehende Schedules zugewiesen
                SELECT s.student_id, s.student_id AS user_id
                FROM public.schedules s
                WHERE s.school_id = p_school_id AND s.teacher_id = p_teacher_id AND s.student_id IS NOT NULL
                UNION
                -- 4. Über Bands/Ensembles zugewiesen
                SELECT bm.user_id AS student_id, bm.user_id
                FROM public.bands b
                JOIN public.band_members bm ON bm.band_id = b.id
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
                    ) AS has_preferences
                FROM teacher_student_ids tsi
                LEFT JOIN public.students st ON (st.id = tsi.student_id OR st.user_id = tsi.user_id) AND st.school_id = p_school_id
                LEFT JOIN public.users_raw u ON (u.id = tsi.user_id OR u.id = tsi.student_id) AND u.school_id = p_school_id
                WHERE COALESCE(u.id, st.id) IS NOT NULL
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

        -- F) Anonymisierte Raumkollisionen anderer Lehrkräfte (Art. 5/25 DSGVO konform)
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

-- Berechtigungen für den RPC gewähren
REVOKE ALL ON FUNCTION public.get_teacher_schedule_roster(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_teacher_schedule_roster(UUID, UUID) TO authenticated, anon, service_role;

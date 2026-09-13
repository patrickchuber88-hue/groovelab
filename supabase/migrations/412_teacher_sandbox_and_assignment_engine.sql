-- ==============================================================================
-- 🏛️ MIGRATION 412: TEACHER SANDBOX BOARD & HOMEWORK ASSIGNMENT ENGINE
-- Campus-Groovelab Platform (OWASP ASVS Level 3 / Multi-Tenancy Invariant)
-- ==============================================================================
-- 1. Etabliert autonome Tabelle teacher_sandbox_entries für Lehrkraft-Vorbereitungen
-- 2. Strikte RLS-Policies für Tenant- & Teacher-Owner Isolation
-- 3. Autoritativer RPC assign_teacher_homework_to_students (Deep Copy in Schülerhefte)
-- ==============================================================================

-- 1. Tabelle für Vorbereitungs- & Sandbox-Einträge der Lehrkräfte
CREATE TABLE IF NOT EXISTS public.teacher_sandbox_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    topic_name VARCHAR(255) NOT NULL DEFAULT 'Unterrichts-Vorbereitung',
    category VARCHAR(50) NOT NULL DEFAULT 'lesson_prep',
    homework_notes TEXT DEFAULT '',
    teacher_notes TEXT DEFAULT '',
    assigned_lehrwerke JSONB DEFAULT '[]'::jsonb,
    assigned_songs JSONB DEFAULT '[]'::jsonb,
    audio_recordings JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indizes für Sub-Sekunden Abfragen
CREATE INDEX IF NOT EXISTS idx_teacher_sandbox_lookup 
ON public.teacher_sandbox_entries(teacher_id, school_id);

CREATE INDEX IF NOT EXISTS idx_teacher_sandbox_updated 
ON public.teacher_sandbox_entries(teacher_id, updated_at DESC);

-- RLS aktivieren
ALTER TABLE public.teacher_sandbox_entries ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies
DROP POLICY IF EXISTS "teacher_sandbox_owner_access" ON public.teacher_sandbox_entries;
CREATE POLICY "teacher_sandbox_owner_access" ON public.teacher_sandbox_entries
FOR ALL TO authenticated, anon, service_role
USING (
    is_master_admin()
    OR (
        teacher_id = get_current_authenticated_user_id()
        AND school_id = get_current_user_school_id()
    )
)
WITH CHECK (
    is_master_admin()
    OR (
        teacher_id = get_current_authenticated_user_id()
        AND school_id = get_current_user_school_id()
    )
);

-- 3. Autoritativer RPC: assign_teacher_homework_to_students
CREATE OR REPLACE FUNCTION public.assign_teacher_homework_to_students(
    p_teacher_id UUID,
    p_target_student_ids UUID[],
    p_target_week_iso VARCHAR(20),
    p_topic_name VARCHAR(255),
    p_notes_content TEXT DEFAULT '',
    p_lehrwerke_json JSONB DEFAULT '[]'::jsonb,
    p_songs_json JSONB DEFAULT '[]'::jsonb,
    p_audios_json JSONB DEFAULT '[]'::jsonb,
    p_append_mode BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_school_id UUID;
    v_student_id UUID;
    v_assigned_count INT := 0;
    v_existing_id UUID;
    v_existing_notes TEXT;
    v_notes_list JSONB := '[]'::jsonb;
    v_final_notes_str TEXT;
    v_audio_entry JSONB;
    v_audio_token TEXT;
    v_snapshot_lw TEXT := '';
    v_snapshot_s TEXT := '';
    v_effective_topic VARCHAR(255);
BEGIN
    -- 🛡️ 1. Verifiziere Authentifizierung & Mandantenkontext
    v_caller_id := get_current_authenticated_user_id();
    v_school_id := get_current_user_school_id();

    IF v_school_id IS NULL THEN
        RAISE EXCEPTION 'Zugriff verweigert: Kein autorisierter Schulkontext ermittelbar.';
    END IF;

    -- Caller muss entweder Master-Admin sein oder mit p_teacher_id übereinstimmen
    IF NOT is_master_admin() AND (v_caller_id IS NULL OR v_caller_id <> p_teacher_id) THEN
        RAISE EXCEPTION 'Zugriff verweigert: Ungültige Lehrkraft-Identität.';
    END IF;

    -- Ermittle Topic Name (z.B. 'Hausaufgabe KW 38')
    IF p_topic_name IS NULL OR trim(p_topic_name) = '' THEN
        v_effective_topic := 'Hausaufgabe ' || COALESCE(p_target_week_iso, 'Aktuell');
    ELSE
        v_effective_topic := trim(p_topic_name);
    END IF;

    -- 🛡️ 2. Iteriere über Zielschüler (Multi-Tenancy Guard)
    FOREACH v_student_id IN ARRAY p_target_student_ids LOOP
        -- Stelle sicher, dass der Zielschüler zur selben Schule gehört (Fail-Closed)
        IF NOT EXISTS (
            SELECT 1 FROM public.users_raw 
            WHERE id = v_student_id AND school_id = v_school_id
        ) THEN
            CONTINUE; -- Überspringe Fremdschüler
        END IF;

        -- Bestehende Hausaufgabe abfragen
        SELECT id, homework_notes INTO v_existing_id, v_existing_notes
        FROM public.progress_matrix
        WHERE student_id = v_student_id AND topic_name = v_effective_topic
        LIMIT 1;

        -- Notizen-Array vorbereiten
        IF v_existing_id IS NOT NULL AND p_append_mode AND v_existing_notes IS NOT NULL AND trim(v_existing_notes) <> '' THEN
            BEGIN
                v_notes_list := v_existing_notes::jsonb;
                IF jsonb_typeof(v_notes_list) <> 'array' THEN
                    v_notes_list := jsonb_build_array(v_existing_notes);
                END IF;
            EXCEPTION WHEN OTHERS THEN
                v_notes_list := jsonb_build_array(v_existing_notes);
            END;
        ELSE
            v_notes_list := '[]'::jsonb;
        END IF;

        -- A. Textnotiz hinzufügen (falls vorhanden)
        IF p_notes_content IS NOT NULL AND trim(p_notes_content) <> '' THEN
            IF NOT (v_notes_list @> jsonb_build_array(trim(p_notes_content))) THEN
                v_notes_list := v_notes_list || jsonb_build_array(trim(p_notes_content));
            END IF;
        END IF;

        -- B. Audio-Aufnahmen anfügen (kanonisches AUDIO-Format)
        IF p_audios_json IS NOT NULL AND jsonb_array_length(p_audios_json) > 0 THEN
            FOR v_audio_entry IN SELECT * FROM jsonb_array_elements(p_audios_json) LOOP
                v_audio_token := 'AUDIO:' || (v_audio_entry->>'url') || '|' || 
                                 COALESCE(v_audio_entry->>'duration', '60') || '|' || 
                                 COALESCE(v_audio_entry->>'date', NOW()::text) || '|' || 
                                 COALESCE(v_audio_entry->>'label', 'Lehrer-Demo') || '|teacher|shared_with_teacher';
                IF NOT (v_notes_list @> jsonb_build_array(v_audio_token)) THEN
                    v_notes_list := v_notes_list || jsonb_build_array(v_audio_token);
                END IF;
            END LOOP;
        END IF;

        -- C. SNAPSHOT_LEHRWERKE anfügen
        IF p_lehrwerke_json IS NOT NULL AND jsonb_array_length(p_lehrwerke_json) > 0 THEN
            v_snapshot_lw := 'SNAPSHOT_LEHRWERKE:' || p_lehrwerke_json::text;
            -- Filter previous SNAPSHOT_LEHRWERKE if replacing
            SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_notes_list
            FROM jsonb_array_elements(v_notes_list) AS elem
            WHERE NOT (elem::text LIKE '"SNAPSHOT_LEHRWERKE:%"');
            v_notes_list := v_notes_list || jsonb_build_array(v_snapshot_lw);
        END IF;

        -- D. SNAPSHOT_SONGS anfügen
        IF p_songs_json IS NOT NULL AND jsonb_array_length(p_songs_json) > 0 THEN
            v_snapshot_s := 'SNAPSHOT_SONGS:' || p_songs_json::text;
            -- Filter previous SNAPSHOT_SONGS if replacing
            SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_notes_list
            FROM jsonb_array_elements(v_notes_list) AS elem
            WHERE NOT (elem::text LIKE '"SNAPSHOT_SONGS:%"');
            v_notes_list := v_notes_list || jsonb_build_array(v_snapshot_s);
        END IF;

        v_final_notes_str := v_notes_list::text;

        -- Atomarer Upsert in public.progress_matrix
        IF v_existing_id IS NOT NULL THEN
            UPDATE public.progress_matrix
            SET homework_notes = v_final_notes_str,
                teacher_id = p_teacher_id,
                updated_at = NOW()
            WHERE id = v_existing_id;
        ELSE
            INSERT INTO public.progress_matrix (
                student_id,
                teacher_id,
                topic_name,
                status,
                is_current_homework,
                homework_notes,
                updated_at
            ) VALUES (
                v_student_id,
                p_teacher_id,
                v_effective_topic,
                'IN_PROGRESS',
                TRUE,
                v_final_notes_str,
                NOW()
            );
        END IF;

        v_assigned_count := v_assigned_count + 1;
    END LOOP;

    -- 🛡️ 3. Revisionssicheres Audit-Logging
    IF v_assigned_count > 0 THEN
        INSERT INTO public.audit_logs (
            school_id, action, entity_type, entity_id, user_id, details
        ) VALUES (
            v_school_id,
            'teacher_homework_assigned',
            'progress_matrix',
            p_teacher_id,
            v_caller_id,
            jsonb_build_object(
                'teacher_id', p_teacher_id,
                'assigned_count', v_assigned_count,
                'target_week', p_target_week_iso,
                'topic_name', v_effective_topic,
                'append_mode', p_append_mode,
                'has_audios', (jsonb_array_length(COALESCE(p_audios_json, '[]'::jsonb)) > 0),
                'has_lehrwerke', (jsonb_array_length(COALESCE(p_lehrwerke_json, '[]'::jsonb)) > 0),
                'has_songs', (jsonb_array_length(COALESCE(p_songs_json, '[]'::jsonb)) > 0)
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'assigned_count', v_assigned_count,
        'topic_name', v_effective_topic
    );
END;
$$;

-- Berechtigungen
GRANT EXECUTE ON FUNCTION public.assign_teacher_homework_to_students TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.teacher_sandbox_entries TO authenticated, anon, service_role;

-- Schema Cache Reload
NOTIFY pgrst, 'reload schema';

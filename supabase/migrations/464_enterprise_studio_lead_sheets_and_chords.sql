-- ====================================================================
-- 464_enterprise_studio_lead_sheets_and_chords.sql
-- 
-- 🏛️ Campus-Groovelab Studio Module: Standalone Lead-Sheet & Chords Engine
-- Zero-Audio-Storage Invariante: Nur strukturierte Taktfolgen & Metadaten (JSONB)
-- Strict Multi-Tenancy (OWASP ASVS Level 3 / Fail-Closed)
-- ====================================================================

-- 1. Tabelle für extrahierte Akkordfolgen und Lead-Sheets (0 Bytes Audio!)
CREATE TABLE IF NOT EXISTS public.song_lead_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    youtube_video_id TEXT,
    title TEXT NOT NULL,
    artist TEXT DEFAULT 'Unbekannt',
    tonal_center TEXT NOT NULL,          -- z.B. "G major", "A minor"
    time_signature TEXT DEFAULT '4/4',
    detected_bpm INTEGER DEFAULT 120,
    chord_sequence JSONB NOT NULL,       -- Array von { bar, beat, chord, degree, duration_beats }
    form_sections JSONB NOT NULL,        -- Array von { name, start_bar, end_bar }
    suggested_scales JSONB NOT NULL,     -- Array von Strings z.B. ["G major pentatonic"]
    is_school_shared BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexe für schnelle Performance
CREATE INDEX IF NOT EXISTS idx_song_lead_sheets_school_id ON public.song_lead_sheets(school_id);
CREATE INDEX IF NOT EXISTS idx_song_lead_sheets_yt_video_id ON public.song_lead_sheets(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_song_lead_sheets_created_at ON public.song_lead_sheets(created_at DESC);

-- 2. Row Level Security (RLS) Mandantentrennung
ALTER TABLE public.song_lead_sheets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_sheets_school_isolation" ON public.song_lead_sheets;
CREATE POLICY "lead_sheets_school_isolation" ON public.song_lead_sheets
    FOR ALL
    USING (
        school_id = (SELECT public.get_current_user_school_id())
        OR is_master_admin()
    )
    WITH CHECK (
        school_id = (SELECT public.get_current_user_school_id())
        OR is_master_admin()
    );

-- 3. Autoritativer RPC: Speichert Lead-Sheet & verknüpft es optional im Hausaufgabenheft
CREATE OR REPLACE FUNCTION public.save_lead_sheet_to_homework(
    p_title TEXT,
    p_artist TEXT,
    p_tonal_center TEXT,
    p_chord_sequence JSONB,
    p_form_sections JSONB,
    p_suggested_scales JSONB,
    p_bpm INTEGER DEFAULT 120,
    p_youtube_video_id TEXT DEFAULT NULL,
    p_student_id UUID DEFAULT NULL,
    p_homework_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_school_id UUID;
    v_sheet_id UUID;
    v_teacher_id UUID;
BEGIN
    v_school_id := get_current_user_school_id();
    IF v_school_id IS NULL THEN
        RAISE EXCEPTION 'Nicht autorisiert: Keine Schul-Zuordnung ermittelt.' USING ERRCODE = '42501';
    END IF;

    v_teacher_id := auth.uid();

    -- Lead-Sheet atomar anlegen
    INSERT INTO public.song_lead_sheets (
        school_id,
        student_id,
        teacher_id,
        youtube_video_id,
        title,
        artist,
        tonal_center,
        time_signature,
        detected_bpm,
        chord_sequence,
        form_sections,
        suggested_scales,
        is_school_shared
    ) VALUES (
        v_school_id,
        p_student_id,
        v_teacher_id,
        p_youtube_video_id,
        p_title,
        COALESCE(p_artist, 'Unbekannt'),
        p_tonal_center,
        '4/4',
        COALESCE(p_bpm, 120),
        p_chord_sequence,
        p_form_sections,
        p_suggested_scales,
        true
    ) RETURNING id INTO v_sheet_id;

    -- Falls ein Schüler angegeben wurde, erstellen wir direkt den Übe-Auftrag im Aufgabenheft
    IF p_student_id IS NOT NULL THEN
        INSERT INTO public.student_homework (
            school_id,
            student_id,
            title,
            description,
            homework_type,
            meta_json,
            assigned_at
        ) VALUES (
            v_school_id,
            p_student_id,
            'Studio-Play-Along: ' || p_title,
            COALESCE(p_homework_note, 'Übe den Song im Campus Studio im eigenen Tempo.'),
            'studio_chord_practice',
            jsonb_build_object(
                'lead_sheet_id', v_sheet_id,
                'youtube_video_id', p_youtube_video_id,
                'target_bpm', p_bpm,
                'tonal_center', p_tonal_center
            ),
            now()
        );
    END IF;

    RETURN v_sheet_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_lead_sheet_to_homework TO authenticated;

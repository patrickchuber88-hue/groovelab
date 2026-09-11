-- ==============================================================================
-- 🏛️ MIGRATION 398: ENTERPRISE STUDENT RANKING PROFILES & IMMUTABLE NICKNAME HISTORY
-- ==============================================================================
-- 1. Tabelle public.student_ranking_profiles (Aktiver Ranking-Status, Nickname, Public/Ghost-Toggle)
-- 2. Tabelle public.student_nickname_history (Revisionssichere WORM-Tabelle, Append-Only)
-- 3. Autoritativer RPC public.set_student_ranking_nickname(...) mit serverseitigem Echtnamen-Schutz
-- 4. RLS-Policies für strikte Mandantentrennung und Datenschutz nach Art. 25 Abs. 2 DSGVO
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Tabelle: student_ranking_profiles (Aktiver Zustand)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_ranking_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    school_id BIGINT NOT NULL,
    nickname TEXT NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_ranking_profiles_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_student_ranking_profiles_user 
    ON public.student_ranking_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_student_ranking_profiles_school_public 
    ON public.student_ranking_profiles(school_id, is_public);

-- ------------------------------------------------------------------------------
-- 2. Tabelle: student_nickname_history (Revisionssichere Append-Only Historie)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_nickname_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
    school_id BIGINT NOT NULL,
    previous_nickname TEXT,
    new_nickname TEXT NOT NULL,
    is_public_snapshot BOOLEAN NOT NULL DEFAULT false,
    changed_by UUID NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_nickname_history_user 
    ON public.student_nickname_history(user_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_nickname_history_school 
    ON public.student_nickname_history(school_id);

-- WORM-Schutz (Write Once, Read Many): Kein UPDATE oder DELETE auf der Historie erlaubt
REVOKE UPDATE, DELETE ON public.student_nickname_history FROM authenticated, anon, public;

CREATE OR REPLACE FUNCTION public.prevent_student_nickname_history_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'student_nickname_history ist eine revisionssichere WORM-Tabelle. Aktualisierungen und Löschungen sind untersagt.';
END;
$$;

DROP TRIGGER IF EXISTS trg_student_nickname_history_immutable ON public.student_nickname_history;
CREATE TRIGGER trg_student_nickname_history_immutable
    BEFORE UPDATE OR DELETE ON public.student_nickname_history
    FOR EACH ROW EXECUTE FUNCTION public.prevent_student_nickname_history_mutation();

-- ------------------------------------------------------------------------------
-- 3. Row Level Security (RLS) aktivieren
-- ------------------------------------------------------------------------------
ALTER TABLE public.student_ranking_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_nickname_history ENABLE ROW LEVEL SECURITY;

-- student_ranking_profiles RLS Policies
DROP POLICY IF EXISTS "ranking_profiles_select_policy" ON public.student_ranking_profiles;
CREATE POLICY "ranking_profiles_select_policy" ON public.student_ranking_profiles
    FOR SELECT
    TO authenticated
    USING (
        -- Eigener Datensatz
        user_id = auth.uid()
        -- ODER öffentlicher Eintrag an derselben Schule
        OR (
            is_public = TRUE 
            AND school_id = (SELECT ur.school_id FROM public.users_raw ur WHERE ur.id = auth.uid())
        )
        -- ODER Verwaltung / Lehrkraft der Schule
        OR (
            school_id = (SELECT ur.school_id FROM public.users_raw ur WHERE ur.id = auth.uid())
            AND (SELECT ur.role FROM public.users_raw ur WHERE ur.id = auth.uid()) IN ('admin', 'secretary', 'teacher')
        )
    );

-- student_nickname_history RLS Policies
DROP POLICY IF EXISTS "nickname_history_select_policy" ON public.student_nickname_history;
CREATE POLICY "nickname_history_select_policy" ON public.student_nickname_history
    FOR SELECT
    TO authenticated
    USING (
        -- Eigene Historie
        user_id = auth.uid()
        -- ODER Verwaltung / Lehrkraft der Schule
        OR (
            school_id = (SELECT ur.school_id FROM public.users_raw ur WHERE ur.id = auth.uid())
            AND (SELECT ur.role FROM public.users_raw ur WHERE ur.id = auth.uid()) IN ('admin', 'secretary', 'teacher')
        )
    );

-- ------------------------------------------------------------------------------
-- 4. Autoritativer RPC: public.set_student_ranking_nickname
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_student_ranking_nickname(
    p_nickname TEXT,
    p_is_public BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_school_id BIGINT;
    v_first_name TEXT;
    v_last_name TEXT;
    v_clean_nick TEXT;
    v_previous_nick TEXT;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Nicht authentifiziert.';
    END IF;

    -- Benutzer-Informationen laden
    SELECT ur.school_id, ur.first_name, ur.last_name, ur.nickname
    INTO v_school_id, v_first_name, v_last_name, v_previous_nick
    FROM public.users_raw ur
    WHERE ur.id = v_caller_id;

    IF v_school_id IS NULL THEN
        RAISE EXCEPTION 'Benutzerprofil oder Schule nicht gefunden.';
    END IF;

    -- Bereinigung des Nicknames
    v_clean_nick := TRIM(COALESCE(p_nickname, ''));

    IF LENGTH(v_clean_nick) < 3 OR LENGTH(v_clean_nick) > 24 THEN
        RAISE EXCEPTION 'Der Nickname muss zwischen 3 und 24 Zeichen lang sein.';
    END IF;

    -- Zeichensatz-Validierung (Buchstaben, Zahlen, Bindestrich, Unterstrich, Leerzeichen)
    IF v_clean_nick !~ '^[a-zA-Z0-9_\- äöüÄÖÜß]+$' THEN
        RAISE EXCEPTION 'Der Nickname enthält unzulässige Sonderzeichen.';
    END IF;

    -- 🛡️ ECHTNAMEN-SCHUTZ: Vor- und Nachname dürfen nicht im Nickname vorkommen
    IF v_first_name IS NOT NULL AND LENGTH(TRIM(v_first_name)) >= 3 THEN
        IF LOWER(v_clean_nick) LIKE '%' || LOWER(TRIM(v_first_name)) || '%' THEN
            RAISE EXCEPTION 'Rechtlicher Schutz: Dein Nickname darf nicht deinen echten Vornamen enthalten.';
        END IF;
    END IF;

    IF v_last_name IS NOT NULL AND LENGTH(TRIM(v_last_name)) >= 3 THEN
        IF LOWER(v_clean_nick) LIKE '%' || LOWER(TRIM(v_last_name)) || '%' THEN
            RAISE EXCEPTION 'Rechtlicher Schutz: Dein Nickname darf nicht deinen echten Nachnamen enthalten.';
        END IF;
    END IF;

    -- 🛡️ SCHUTZ DER LEHRKRÄFTE: Nachnamen von Lehrkräften und Mitarbeitern der Schule sperren
    IF EXISTS (
        SELECT 1 FROM public.users_raw ur
        WHERE ur.school_id = v_school_id
          AND ur.role IN ('teacher', 'admin', 'secretary')
          AND ur.last_name IS NOT NULL
          AND LENGTH(TRIM(ur.last_name)) >= 3
          AND LOWER(v_clean_nick) LIKE '%' || LOWER(TRIM(ur.last_name)) || '%'
    ) THEN
        RAISE EXCEPTION 'Schutz der Lehrkräfte: Dein Musiker-Nickname darf keine Namen von Lehrkräften oder Mitarbeitern deiner Musikschule enthalten.';
    END IF;

    -- 🛡️ JUGENDSCHUTZ-FILTER: Schutz vor Fäkalsprache, Beleidigungen, Sexismus & Extremismus (inkl. Leetspeak)
    DECLARE
        v_normalized_nick TEXT;
    BEGIN
        -- Leetspeak normalisieren (4->a, 3->e, 1->i, 0->o, 5->s, @->a, $->s)
        v_normalized_nick := LOWER(v_clean_nick);
        v_normalized_nick := REGEXP_REPLACE(v_normalized_nick, '[4@]', 'a', 'g');
        v_normalized_nick := REGEXP_REPLACE(v_normalized_nick, '3', 'e', 'g');
        v_normalized_nick := REGEXP_REPLACE(v_normalized_nick, '[1!|]', 'i', 'g');
        v_normalized_nick := REGEXP_REPLACE(v_normalized_nick, '0', 'o', 'g');
        v_normalized_nick := REGEXP_REPLACE(v_normalized_nick, '[5$]', 's', 'g');
        v_normalized_nick := REGEXP_REPLACE(v_normalized_nick, '[^a-z0-9äöüß]', '', 'g');

        -- Prüfung auf verbotene Wortstämme
        IF v_normalized_nick ~* '(arsch|fick|shit|fuck|bitch|hure|nazi|hitler|porn|sex|penis|vagina|schwuchtel|bastard|fotze|idiot|kanake|nigga|nigger|wixxer|wichs|spast|nutte|pedoph|pedo|88|1818)' THEN
            RAISE EXCEPTION 'Jugendschutz-Richtlinie: Dieser Nickname enthält unzulässige oder anstößige Begriffe. Bitte wähle einen freundlichen, musikalischen Spitznamen!';
        END IF;
    END;

    -- Eindeutigkeitsprüfung an der Schule (Case-Insensitive)
    IF EXISTS (
        SELECT 1 FROM public.student_ranking_profiles
        WHERE school_id = v_school_id 
          AND LOWER(nickname) = LOWER(v_clean_nick)
          AND user_id != v_caller_id
    ) THEN
        RAISE EXCEPTION 'Dieser Musiker-Nickname ist an deiner Musikschule bereits vergeben. Bitte wähle einen anderen!';
    END IF;

    -- Vorherigen Nickname aus dem Profil abfragen
    SELECT nickname INTO v_previous_nick
    FROM public.student_ranking_profiles
    WHERE user_id = v_caller_id;

    -- 1. Profil atomar einfügen oder aktualisieren
    INSERT INTO public.student_ranking_profiles (
        user_id,
        school_id,
        nickname,
        is_public,
        updated_at
    ) VALUES (
        v_caller_id,
        v_school_id,
        v_clean_nick,
        COALESCE(p_is_public, false),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        nickname = EXCLUDED.nickname,
        is_public = EXCLUDED.is_public,
        updated_at = NOW();

    -- 2. Revisionssicheren Historien-Eintrag schreiben (Append-Only)
    INSERT INTO public.student_nickname_history (
        user_id,
        school_id,
        previous_nickname,
        new_nickname,
        is_public_snapshot,
        changed_by,
        changed_at
    ) VALUES (
        v_caller_id,
        v_school_id,
        v_previous_nick,
        v_clean_nick,
        COALESCE(p_is_public, false),
        v_caller_id,
        NOW()
    );

    -- 3. Synchronisation mit users_raw.nickname für plattformweite Verfügbarkeit
    UPDATE public.users_raw
    SET nickname = v_clean_nick
    WHERE id = v_caller_id;

    -- 4. Revisionssicheres Audit-Logging
    BEGIN
        INSERT INTO public.audit_logs (
            table_name,
            record_id,
            action,
            old_data,
            new_data,
            changed_by,
            created_at
        ) VALUES (
            'student_ranking_profiles',
            v_caller_id,
            'STUDENT_NICKNAME_UPDATED',
            jsonb_build_object('nickname', v_previous_nick),
            jsonb_build_object('nickname', v_clean_nick, 'is_public', COALESCE(p_is_public, false)),
            v_caller_id,
            NOW()
        );
    EXCEPTION WHEN OTHERS THEN
        -- Audit-Log Fehler blockiert nicht die primäre Transaktion
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'nickname', v_clean_nick,
        'is_public', COALESCE(p_is_public, false)
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. RPC: public.get_student_ranking_profile
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_student_ranking_profile(
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_profile RECORD;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT id, user_id, school_id, nickname, is_public, updated_at
    INTO v_profile
    FROM public.student_ranking_profiles
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN jsonb_build_object(
        'id', v_profile.id,
        'user_id', v_profile.user_id,
        'school_id', v_profile.school_id,
        'nickname', v_profile.nickname,
        'is_public', v_profile.is_public,
        'updated_at', v_profile.updated_at
    );
END;
$$;

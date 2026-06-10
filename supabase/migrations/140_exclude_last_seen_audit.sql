-- Migration: 140_exclude_last_seen_audit.sql
-- Description: Exclude last_seen and password_hash from audit logs and clean up existing heartbeat entries.

-- 1. Bestehende heartbeat-Einträge (nur last_seen geändert) löschen
DELETE FROM public.audit_logs
WHERE (old_data - 'last_seen' = '{}'::JSONB OR old_data IS NULL)
  AND (new_data - 'last_seen' = '{}'::JSONB OR new_data IS NULL);

-- 2. Trigger-Funktion für Audit-Log aktualisieren
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_school_id UUID;
    v_old JSONB := '{}'::JSONB;
    v_new JSONB := '{}'::JSONB;
BEGIN
    -- 1. Versuchen, den Benutzer über JWT-Claims (Supabase Auth) zu ermitteln
    BEGIN
        v_user_id := nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    -- 2. Fallback: Benutzer über den custom header x-user-id (unsere App) ermitteln
    IF v_user_id IS NULL THEN
        BEGIN
            v_user_id := nullif(current_setting('request.headers', true)::jsonb->>'x-user-id', '')::UUID;
        EXCEPTION WHEN OTHERS THEN
            v_user_id := NULL;
        END;
    END IF;

    -- 3. Schul-ID ermitteln (NEW bei INSERT/UPDATE, OLD bei DELETE)
    IF TG_OP = 'DELETE' THEN
        v_school_id := OLD.school_id;
    ELSE
        v_school_id := NEW.school_id;
    END IF;

    IF TG_OP = 'INSERT' THEN
        v_new := to_jsonb(NEW);
        -- Sensible Felder und Heartbeats ausschließen
        v_new := v_new - 'password' - 'personal_pin' - 'password_hash' - 'last_seen';
        
        INSERT INTO public.audit_logs (changed_by, school_id, table_name, action, record_id, new_data)
        VALUES (v_user_id, v_school_id, TG_TABLE_NAME::TEXT, TG_OP, NEW.id, v_new);
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Berechne das Diff (altes Feld vs. neues Feld und umgekehrt)
        v_old := public.jsonb_diff(to_jsonb(OLD), to_jsonb(NEW)) - 'password' - 'personal_pin' - 'password_hash' - 'last_seen';
        v_new := public.jsonb_diff(to_jsonb(NEW), to_jsonb(OLD)) - 'password' - 'personal_pin' - 'password_hash' - 'last_seen';
        
        -- Nur loggen, wenn sich tatsächlich relevante Spalten geändert haben
        IF v_old != '{}'::JSONB OR v_new != '{}'::JSONB THEN
            INSERT INTO public.audit_logs (changed_by, school_id, table_name, action, record_id, old_data, new_data)
            VALUES (v_user_id, v_school_id, TG_TABLE_NAME::TEXT, TG_OP, NEW.id, v_old, v_new);
        END IF;
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        v_old := to_jsonb(OLD) - 'password' - 'personal_pin' - 'password_hash' - 'last_seen';
        
        INSERT INTO public.audit_logs (changed_by, school_id, table_name, action, record_id, old_data)
        VALUES (v_user_id, v_school_id, TG_TABLE_NAME::TEXT, TG_OP, OLD.id, v_old);
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. PGRST Schema Cache neu laden
NOTIFY pgrst, 'reload schema';

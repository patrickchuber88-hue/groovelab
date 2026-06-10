-- Migration: Automatischer Audit Trail in PostgreSQL für die Users-Tabelle

-- 1. Tabelle für die Audit-Logs erstellen
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    table_name VARCHAR(100) NOT NULL,
    action VARCHAR(20) NOT NULL,
    record_id UUID NOT NULL,
    old_data JSONB DEFAULT NULL,
    new_data JSONB DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. RLS für audit_logs aktivieren (Sicherheits-Härtung)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Nur Benutzer mit der Rolle 'admin' dürfen Logs einsehen
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- 3. Berechtigungen vergeben
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

-- 4. Hilfsfunktion zur Ermittlung von JSONB-Unterschieden (Diffs)
CREATE OR REPLACE FUNCTION public.jsonb_diff(val1 JSONB, val2 JSONB)
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}'::JSONB;
    key TEXT;
    value JSONB;
BEGIN
    -- Wenn val1 NULL ist, gibt es kein Diff
    IF val1 IS NULL THEN
        RETURN '{}'::JSONB;
    END IF;

    -- Loope über alle Keys des ersten Objekts
    FOR key, value IN SELECT * FROM jsonb_each(val1)
    LOOP
        -- Wenn der Key im zweiten Objekt nicht existiert oder einen anderen Wert hat
        IF val2 IS NULL OR NOT val2 ? key OR val2->key != value THEN
            result := result || jsonb_build_object(key, value);
        END IF;
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Trigger-Funktion für die Protokollierung
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_old JSONB := '{}'::JSONB;
    v_new JSONB := '{}'::JSONB;
BEGIN
    -- Versuchen, die aktuelle Supabase-User-ID aus den JWT-Claims der Session zu holen
    BEGIN
        v_user_id := nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        v_new := to_jsonb(NEW);
        -- Sensible Felder ausschließen (Sicherheits-Best-Practice)
        v_new := v_new - 'password' - 'personal_pin';
        
        INSERT INTO public.audit_logs (changed_by, table_name, action, record_id, new_data)
        VALUES (v_user_id, TG_TABLE_NAME::TEXT, TG_OP, NEW.id, v_new);
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Berechne das Diff (altes Feld vs. neues Feld und umgekehrt)
        v_old := public.jsonb_diff(to_jsonb(OLD), to_jsonb(NEW)) - 'password' - 'personal_pin';
        v_new := public.jsonb_diff(to_jsonb(NEW), to_jsonb(OLD)) - 'password' - 'personal_pin';
        
        -- Nur loggen, wenn sich tatsächlich relevante Spalten geändert haben
        IF v_old != '{}'::JSONB OR v_new != '{}'::JSONB THEN
            INSERT INTO public.audit_logs (changed_by, table_name, action, record_id, old_data, new_data)
            VALUES (v_user_id, TG_TABLE_NAME::TEXT, TG_OP, NEW.id, v_old, v_new);
        END IF;
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        v_old := to_jsonb(OLD) - 'password' - 'personal_pin';
        
        INSERT INTO public.audit_logs (changed_by, table_name, action, record_id, old_data)
        VALUES (v_user_id, TG_TABLE_NAME::TEXT, TG_OP, OLD.id, v_old);
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger auf die Users-Tabelle binden
DROP TRIGGER IF EXISTS audit_users_trigger ON public.users;

CREATE TRIGGER audit_users_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- Migration: 139_update_audit_logs_rls.sql
-- Description: Add school_id to audit_logs, update trigger to set school_id and resolve changed_by using x-user-id header, and update RLS select policy.

-- 1. school_id Spalte zu audit_logs hinzufügen
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

-- 2. Bestehende Daten anreichern
UPDATE public.audit_logs
SET school_id = users.school_id
FROM public.users
WHERE audit_logs.record_id = users.id AND audit_logs.school_id IS NULL;

-- 3. Trigger-Funktion für Audit-Log aktualisieren
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
        -- Sensible Felder ausschließen
        v_new := v_new - 'password' - 'personal_pin';
        
        INSERT INTO public.audit_logs (changed_by, school_id, table_name, action, record_id, new_data)
        VALUES (v_user_id, v_school_id, TG_TABLE_NAME::TEXT, TG_OP, NEW.id, v_new);
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Berechne das Diff (altes Feld vs. neues Feld und umgekehrt)
        v_old := public.jsonb_diff(to_jsonb(OLD), to_jsonb(NEW)) - 'password' - 'personal_pin';
        v_new := public.jsonb_diff(to_jsonb(NEW), to_jsonb(OLD)) - 'password' - 'personal_pin';
        
        -- Nur loggen, wenn sich tatsächlich relevante Spalten geändert haben
        IF v_old != '{}'::JSONB OR v_new != '{}'::JSONB THEN
            INSERT INTO public.audit_logs (changed_by, school_id, table_name, action, record_id, old_data, new_data)
            VALUES (v_user_id, v_school_id, TG_TABLE_NAME::TEXT, TG_OP, NEW.id, v_old, v_new);
        END IF;
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        v_old := to_jsonb(OLD) - 'password' - 'personal_pin';
        
        INSERT INTO public.audit_logs (changed_by, school_id, table_name, action, record_id, old_data)
        VALUES (v_user_id, v_school_id, TG_TABLE_NAME::TEXT, TG_OP, OLD.id, v_old);
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS-Richtlinien aktualisieren
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins and secretaries can view audit logs" ON public.audit_logs;

CREATE POLICY "Admins and secretaries can view audit logs" ON public.audit_logs
    FOR SELECT
    USING (
        public.is_master_admin() OR (
            EXISTS (
                SELECT 1 FROM public.users changer
                WHERE changer.id = (current_setting('request.headers', true)::json->>'x-user-id')::uuid
                  AND changer.role IN ('admin', 'secretary')
                  AND changer.school_id = audit_logs.school_id
            )
        )
    );

-- 5. PGRST Schema Cache neu laden
NOTIFY pgrst, 'reload schema';

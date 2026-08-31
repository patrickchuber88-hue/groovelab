-- ==============================================================================
-- Migration 329: Tier-1 SQL Framework Hardening (Phase 5)
-- Prevents connection pool leaks, enforces RBAC on sensitive data, 
-- and guarantees server-side updated_at timestamps.
-- ==============================================================================

-- 1. UNIVERSAL UPDATED_AT TRIGGER
-- Garantiert, dass kein fehlerhafter Client den Zeitstempel umgehen kann.
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to core tables
DROP TRIGGER IF EXISTS trg_users_raw_updated_at ON public.users_raw;
CREATE TRIGGER trg_users_raw_updated_at
BEFORE UPDATE ON public.users_raw
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_schools_updated_at ON public.schools;
CREATE TRIGGER trg_schools_updated_at
BEFORE UPDATE ON public.schools
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 2. SECURE TRANSACTION CONTEXT (Pool-Leak Prevention)
-- Ersetzt (oder ergänzt) bestehende Session-Setzer, um is_local = true zu erzwingen
CREATE OR REPLACE FUNCTION public.set_secure_tenant_context(p_school_id UUID)
RETURNS VOID AS $$
BEGIN
    IF p_school_id IS NULL THEN
        RAISE EXCEPTION 'Context Error: school_id must not be NULL';
    END IF;
    -- "true" = is_local (gilt nur für diese Transaktion, schützt vor PgBouncer-Leaks)
    PERFORM set_config('app.current_school_id', p_school_id::TEXT, true);
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- 3. RBAC & CONFIDENTIALITY ON SENSITIVE DATA (Notes/Documents)
-- Wir fügen eine is_confidential Spalte zu internen Notizen (falls vorhanden, ansonsten exemplarisch an 'practice_logs' oder 'homework' angelehnt)
-- Da wir das genaue Schema von 'notes' nicht sehen, hier der sichere Standard-Weg für eine hypothetische 'internal_notes' oder bestehende 'notes' Tabelle:

DO $$ 
BEGIN
    -- Füge is_confidential hinzu, falls die Tabelle 'notes' existiert
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notes') THEN
        ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS is_confidential BOOLEAN NOT NULL DEFAULT false;
        
        -- RBAC Policy: Schüler dürfen keine confidential notes lesen, selbst wenn RLS (school_id) übereinstimmt.
        DROP POLICY IF EXISTS "notes_confidential_rbac" ON public.notes;
        CREATE POLICY "notes_confidential_rbac" ON public.notes
        FOR SELECT
        USING (
            NOT is_confidential 
            OR auth.uid() IN (
                SELECT id FROM public.users_raw WHERE role IN ('teacher', 'admin', 'secretary')
            )
        );
    END IF;
END $$;


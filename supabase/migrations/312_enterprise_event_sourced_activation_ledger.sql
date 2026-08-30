-- ==============================================================================
-- Migration 312: Event-Sourced Immutable Activation Ledger Engine
-- Standard: FinTech / BaFin MaRisk WORM (Write-Once-Read-Many) Audit Standard
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.activation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users_raw(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    module TEXT NOT NULL,
    actor_id UUID,
    actor_role TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 1. Indexing for high-speed ledger aggregation
CREATE INDEX IF NOT EXISTS idx_activation_events_school_user ON public.activation_events(school_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activation_events_event_type ON public.activation_events(event_type, created_at DESC);

-- 2. Hermetic FORCE ROW LEVEL SECURITY
ALTER TABLE public.activation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_events FORCE ROW LEVEL SECURITY;

-- 3. WORM Policies: Append-Only, No Update or Delete
DROP POLICY IF EXISTS "activation_events_select" ON public.activation_events;
CREATE POLICY "activation_events_select" ON public.activation_events
FOR SELECT TO anon, authenticated, service_role
USING (
    is_master_admin() 
    OR (get_current_user_school_id() IS NOT NULL AND school_id = get_current_user_school_id())
);

DROP POLICY IF EXISTS "activation_events_insert" ON public.activation_events;
CREATE POLICY "activation_events_insert" ON public.activation_events
FOR INSERT TO anon, authenticated, service_role
WITH CHECK (
    is_master_admin() 
    OR (get_current_user_school_id() IS NOT NULL AND school_id = get_current_user_school_id())
);

-- 4. Automated Trigger on users_raw for State-Change Ledgering
CREATE OR REPLACE FUNCTION public.trg_log_user_activation_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    -- Detect Campus activation change
    IF (OLD.is_campus_active IS DISTINCT FROM NEW.is_campus_active) THEN
        INSERT INTO public.activation_events (
            school_id,
            user_id,
            event_type,
            module,
            actor_id,
            actor_role,
            metadata
        ) VALUES (
            NEW.school_id,
            NEW.id,
            CASE WHEN NEW.is_campus_active THEN 'CAMPUS_ACTIVATED' ELSE 'CAMPUS_DEACTIVATED' END,
            'campus',
            get_current_authenticated_user_id(),
            get_current_user_role(),
            jsonb_build_object('previous', OLD.is_campus_active, 'current', NEW.is_campus_active)
        );
    END IF;

    -- Detect GrooveLab activation change
    IF (OLD.is_groovelab_active IS DISTINCT FROM NEW.is_groovelab_active) THEN
        INSERT INTO public.activation_events (
            school_id,
            user_id,
            event_type,
            module,
            actor_id,
            actor_role,
            metadata
        ) VALUES (
            NEW.school_id,
            NEW.id,
            CASE WHEN NEW.is_groovelab_active THEN 'GROOVELAB_ACTIVATED' ELSE 'GROOVELAB_DEACTIVATED' END,
            'groovelab',
            get_current_authenticated_user_id(),
            get_current_user_role(),
            jsonb_build_object('previous', OLD.is_groovelab_active, 'current', NEW.is_groovelab_active)
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_raw_activation_events ON public.users_raw;
CREATE TRIGGER trg_users_raw_activation_events
AFTER UPDATE OF is_campus_active, is_groovelab_active ON public.users_raw
FOR EACH ROW
EXECUTE FUNCTION public.trg_log_user_activation_event();

GRANT SELECT, INSERT ON public.activation_events TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

-- ==============================================================================
-- Migration 327: Tier-1 SaaS Enterprise+ Immutable Audit Logging
-- Enforces Non-Repudiation for all critical CRUD actions on tenant data.
-- ==============================================================================

-- 1. Create the Append-Only Audit Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_by UUID, -- Can be NULL if system action
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Prevent tampering (Append-Only Enforcement)
-- Revoke all permissions except INSERT for authenticated users
REVOKE ALL ON public.audit_logs FROM authenticated, anon, public;
GRANT INSERT ON public.audit_logs TO authenticated;

-- Hard block on DELETE/UPDATE via Rule or Trigger to ensure absolute immutability
CREATE OR REPLACE FUNCTION public.prevent_audit_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_tampering ON public.audit_logs;
CREATE TRIGGER trg_prevent_audit_tampering
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.prevent_audit_tampering();

-- 3. Create the Generic Audit Trigger Function
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Attempt to get the user ID from the Supabase auth context
    BEGIN
        current_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;

    IF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, changed_by)
        VALUES (TG_TABLE_NAME::TEXT, OLD.id, TG_OP, to_jsonb(OLD), current_user_id);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME::TEXT, NEW.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW), current_user_id);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, new_data, changed_by)
        VALUES (TG_TABLE_NAME::TEXT, NEW.id, TG_OP, to_jsonb(NEW), current_user_id);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Attach Triggers to Critical Entities (Users & Schools)
DROP TRIGGER IF EXISTS audit_users_raw_trigger ON public.users_raw;
CREATE TRIGGER audit_users_raw_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.users_raw
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_schools_trigger ON public.schools;
CREATE TRIGGER audit_schools_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.schools
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- 5. Enable RLS on audit_logs (Only Master Admins can read)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_master_admin_read" ON public.audit_logs
FOR SELECT TO authenticated
USING (public.is_master_admin());


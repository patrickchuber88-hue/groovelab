-- Migration: 396_enterprise_supabase_loop_and_heartbeat_hardening.sql
-- Description: 
-- 1. Sets REPLICA IDENTITY FULL on public.users_raw to ensure complete OLD record replication for Supabase Realtime CDC.
-- 2. Hardens public.log_audit_event() to bypass logging of pure high-frequency heartbeat/presence updates ('last_seen')
--    on public.users_raw, eliminating massive write amplification and WAL/disk I/O bloat while 100% preserving
--    forensic audit logging for all actual administrative, security, credential, and profile modifications.

-- 1. Enable REPLICA IDENTITY FULL on public.users_raw
ALTER TABLE public.users_raw REPLICA IDENTITY FULL;

-- 2. Update log_audit_event trigger function
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
        -- 🛡️ Performance Invariant: Bypass high-frequency presence/heartbeat updates ('last_seen')
        -- if no substantive business, security or profile fields have changed.
        IF TG_TABLE_NAME = 'users_raw' THEN
            IF (to_jsonb(OLD) - 'last_seen') = (to_jsonb(NEW) - 'last_seen') THEN
                RETURN NEW;
            END IF;
        END IF;

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

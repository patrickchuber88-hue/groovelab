-- ==============================================================================
-- Migration 328: Tier-1 Explicit Composite Tenant Indices
-- Performance and isolation hardening to prevent full-table scans.
-- Accelerates RLS policies across multi-tenant data.
-- ==============================================================================

-- 1. Index on users_raw for school-based lookups and sorting
CREATE INDEX IF NOT EXISTS idx_users_raw_school_id_created_at 
ON public.users_raw(school_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_raw_school_id_role 
ON public.users_raw(school_id, role);

-- 2. Index on audit_logs for tenant forensics
-- (Assuming audit_logs has changed_by which joins to users_raw)
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by_created_at 
ON public.audit_logs(changed_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record
ON public.audit_logs(table_name, record_id);

-- 3. Sessions indexing for device management
CREATE INDEX IF NOT EXISTS idx_sessions_user_id_created_at
ON public.sessions(user_id, created_at DESC);

-- Analyze tables to update query planner statistics
ANALYZE public.users_raw;
ANALYZE public.audit_logs;
ANALYZE public.sessions;

-- ==============================================================================
-- 🚀 CAMPUS-GROOVELAB ENTERPRISE+ DATABASE OPTIMIZATION & INDEX MIGRATION
-- Platform: Campus-Groovelab (https://campus-groovelab.de)
-- Execution: Run in Supabase Dashboard SQL Editor or via psql (Port 5432/6543)
-- Effect: Idempotent B-Tree indexing on foreign keys, lookups, and sorting fields
-- ==============================================================================

-- 1. USERS TABLE INDICES (Authentication, Tenant-Isolation & Role Filtering)
CREATE INDEX IF NOT EXISTS idx_users_school_role_active 
ON users(school_id, role, is_active)
INCLUDE (id, is_campus_active, is_groovelab_active);

CREATE INDEX IF NOT EXISTS idx_users_ausweis_nummer 
ON users(ausweis_nummer) 
WHERE ausweis_nummer IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_teacher_qr_token 
ON users(teacher_qr_token) 
WHERE teacher_qr_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_created_at 
ON users(created_at DESC);

-- 2. SCHOOLS TABLE INDICES (Tenant Lookup, Status & Sort)
CREATE INDEX IF NOT EXISTS idx_schools_status_name 
ON schools(status, name);

CREATE INDEX IF NOT EXISTS idx_schools_groovelab_kiosk_token 
ON schools(groovelab_kiosk_token) 
WHERE groovelab_kiosk_token IS NOT NULL;

-- 3. SONGS & REPERTOIRE INDICES
CREATE INDEX IF NOT EXISTS idx_songs_school_id 
ON songs(school_id);

CREATE INDEX IF NOT EXISTS idx_bands_school_id 
ON bands(school_id);

-- 4. SESSIONS & TELEMETRY INDICES (Live Cockpit & Health Monitor)
CREATE INDEX IF NOT EXISTS idx_sessions_school_user 
ON sessions(school_id, user_id) 
WHERE expires_at > NOW();

CREATE INDEX IF NOT EXISTS idx_server_metrics_created_at_desc 
ON server_metrics(created_at DESC);

-- 5. AUDIT LOGS & COMPLIANCE TRAIL (DSGVO Art. 30 / Art. 28)
CREATE INDEX IF NOT EXISTS idx_compliance_audit_logs_timestamp 
ON compliance_audit_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_compliance_audit_logs_school_id 
ON compliance_audit_logs(school_id);

-- 6. VACUUM ANALYZE (Update PostgreSQL Query Planner Statistics)
ANALYZE users;
ANALYZE schools;
ANALYZE songs;
ANALYZE bands;
ANALYZE server_metrics;

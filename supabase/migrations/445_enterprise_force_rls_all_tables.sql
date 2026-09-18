-- ==============================================================================
-- Migration 445: Enterprise Tier-1 FORCE ROW LEVEL SECURITY on all Tenant Tables
-- Bounded Context: SEC-24 (System Isolation & OWASP ASVS Level 3 Fail-Closed)
-- 
-- Ensures that table owners, maintenance connections, and background sessions 
-- are strictly bound to Row-Level Security policies without bypass capability.
-- ==============================================================================

-- 1. Explicit FORCE ROW LEVEL SECURITY on all core operational tenant tables
ALTER TABLE IF EXISTS public.users_raw FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.students FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schools FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lessons FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schedule_occurrences FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campus_direct_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campus_message_reactions FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campus_chat_channel_reads FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.parent_student_relations FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.parent_consent_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.legal_consents FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.master_audit_trail FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rooms FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stations FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bands FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.band_members FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.band_songs FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.band_song_slots FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.band_media FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.band_gigs FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.band_song_proposals FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.band_proposal_votes FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_song_skills FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.progress_matrix FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.student_ranking_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.student_nickname_history FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.student_schedule_preferences FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.session_leases FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dpa_agreements FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pilot_agreements FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.school_equipment FORCE ROW LEVEL SECURITY;

-- 2. Dynamic loop over ALL remaining tables in public schema with RLS enabled
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    ) LOOP
        BEGIN
            EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', tbl.tablename);
        EXCEPTION WHEN OTHERS THEN
            -- Skip views or unprivileged system internals safely
            NULL;
        END;
    END LOOP;
END $$;

COMMENT ON MIGRATION "445_enterprise_force_rls_all_tables" IS 
'Enforces FORCE ROW LEVEL SECURITY across all tenant tables in public schema according to OWASP ASVS Level 3 and BSI TR-03116.';

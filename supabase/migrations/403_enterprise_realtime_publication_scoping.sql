-- ==============================================================================
-- 🏛️ MIGRATION 403: ENTERPRISE REALTIME PUBLICATION SCOPING & WAL RELIEF
-- Campus-Groovelab Platform (OWASP ASVS Level 3 / Fail-Closed)
-- ==============================================================================
-- 1. Bereinigung supabase_realtime: Entfernt schwere Audit- & Statistik-Tabellen
--    aus der PostgreSQL Logical Replication (WAL-Schutz)
-- 2. Strikte Scoping-Garantie für die 6 essentiellen Live-Tabellen
-- ==============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        
        -- A. TABELLEN ENTFERNEN (Kein Live-Streaming für Audit-Logs & historische Telemetrie)
        IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'audit_logs') THEN
            ALTER PUBLICATION supabase_realtime DROP TABLE public.audit_logs;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'master_pricing_audit_log') THEN
            ALTER PUBLICATION supabase_realtime DROP TABLE public.master_pricing_audit_log;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'fokus_logs') THEN
            ALTER PUBLICATION supabase_realtime DROP TABLE public.fokus_logs;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'student_stats') THEN
            ALTER PUBLICATION supabase_realtime DROP TABLE public.student_stats;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'avatars') THEN
            ALTER PUBLICATION supabase_realtime DROP TABLE public.avatars;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'user_presence') THEN
            ALTER PUBLICATION supabase_realtime DROP TABLE public.user_presence;
        END IF;

        -- B. ECHTE LIVE-TABELLEN GARANTIEREN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'campus_direct_messages') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campus_direct_messages') THEN
                ALTER PUBLICATION supabase_realtime ADD TABLE public.campus_direct_messages;
            END IF;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'crisis_notifications') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crisis_notifications') THEN
                ALTER PUBLICATION supabase_realtime ADD TABLE public.crisis_notifications;
            END IF;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'system_alerts') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'system_alerts') THEN
                ALTER PUBLICATION supabase_realtime ADD TABLE public.system_alerts;
            END IF;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'sessions') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sessions') THEN
                ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
            END IF;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'band_shoutbox') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'band_shoutbox') THEN
                ALTER PUBLICATION supabase_realtime ADD TABLE public.band_shoutbox;
            END IF;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'band_songs') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'band_songs') THEN
                ALTER PUBLICATION supabase_realtime ADD TABLE public.band_songs;
            END IF;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'band_song_slots') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'band_song_slots') THEN
                ALTER PUBLICATION supabase_realtime ADD TABLE public.band_song_slots;
            END IF;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'help_requests') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'help_requests') THEN
                ALTER PUBLICATION supabase_realtime ADD TABLE public.help_requests;
            END IF;
        END IF;

    END IF;
END $$;

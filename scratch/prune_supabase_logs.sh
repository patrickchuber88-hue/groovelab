#!/bin/bash
# Prune Supabase analytics logs older than 7 days to prevent mount disk space from filling up.

echo "=== Log pruning started at $(date) ==="

docker exec -i supabase-db psql -U supabase_admin -d _supabase << 'EOF'
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = '_analytics' AND tablename LIKE 'log_events_%') LOOP
        EXECUTE 'DELETE FROM _analytics.' || quote_ident(r.tablename) || ' WHERE timestamp < NOW() - INTERVAL ''7 days'';';
    END LOOP;
END $$;
EOF

docker exec -i supabase-db psql -U supabase_admin -d _supabase << 'EOF'
VACUUM ANALYZE;
EOF

echo "=== Log pruning completed successfully at $(date) ==="

#!/bin/bash
# ==============================================================================
# Campus-Groovelab Nightly SecOps Penetration & Privilege Audit Daemon
# Runs automatically every night at 03:00 UTC on the production server
# ==============================================================================

set -e

echo "🛡️  [$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starte Nightly SecOps & Posture Verification..."

# 1. Run database kernel posture audit
AUDIT_OUTPUT=$(docker exec -i $(docker ps -q --filter 'name=supabase-db' | head -n 1) psql -U postgres -d postgres -t -A -F"," -c "SELECT check_name, status, details FROM public.audit_security_posture();")

FAILED_COUNT=0
while IFS=',' read -r check_name status details; do
    if [ "$status" != "PASSED" ]; then
        echo "⚠️  SECURITY ANOMALY DETECTED: $check_name (Status: $status, Details: $details)"
        FAILED_COUNT=$((FAILED_COUNT + 1))
        
        # Inject system alert into PostgreSQL
        docker exec -i $(docker ps -q --filter 'name=supabase-db' | head -n 1) psql -U postgres -d postgres -c "
            INSERT INTO public.system_alerts (severity, title, message, created_at)
            VALUES ('critical', 'Nightly SecOps Audit Alert: $check_name', 'Sicherheitsabweichung festgestellt: $details', NOW());
        " || true
    else
        echo "  ✓ $check_name: $status ($details)"
    fi
done <<< "$AUDIT_OUTPUT"

# 2. Check Table RLS Integrity directly via pg_class
RLS_LEAKS=$(docker exec -i $(docker ps -q --filter 'name=supabase-db' | head -n 1) psql -U postgres -d postgres -t -A -c "
    SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' AND (c.relrowsecurity = FALSE OR c.relforcerowsecurity = FALSE);
")

if [ "$RLS_LEAKS" -gt 0 ]; then
    echo "🚨 CRITICAL: $RLS_LEAKS tables in public schema missing FORCE RLS!"
    FAILED_COUNT=$((FAILED_COUNT + 1))
else
    echo "  ✓ Strict Kernel Isolation: 100% of public tables have FORCE ROW LEVEL SECURITY enabled."
fi

# 3. Check Disk Space & DB Volume Health
DISK_USAGE=$(df -h /mnt/supabase_data | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt 85 ]; then
    echo "⚠️  Disk usage warning: /mnt/supabase_data is at ${DISK_USAGE}% capacity."
else
    echo "  ✓ Storage Health: /mnt/supabase_data capacity at ${DISK_USAGE}% (Normal)."
fi

if [ "$FAILED_COUNT" -eq 0 ]; then
    echo "✅ [$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Nightly SecOps Audit PASSED: 100% Zero-Trust Compliance."
    exit 0
else
    echo "❌ [$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Nightly SecOps Audit FAILED with $FAILED_COUNT issue(s)."
    exit 1
fi

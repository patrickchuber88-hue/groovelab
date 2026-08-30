#!/bin/bash
# ==============================================================================
# Campus-Groovelab Automated Privilege & Posture Verification Runner
# Runs live security checks directly against PostgreSQL engine in supabase-db
# ==============================================================================

set -e

SERVER="root@178.105.10.2"

echo "🛡️  Starte Automated Privilege & Posture Audit auf $SERVER..."

ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres -P pager=off" << 'EOF'
SELECT check_name, status, details FROM public.audit_security_posture();
EOF

echo "✅ Automated Privilege Audit erfolgreich abgeschlossen!"

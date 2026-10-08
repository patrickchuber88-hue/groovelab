#!/bin/bash
# ==============================================================================
# Campus-Groovelab Enterprise Migrations Deployer (Migration 539)
# Applies Migration 539 to remote Supabase DB via SSH (deployuser@178.105.10.2)
# ==============================================================================

set -e

SERVER="${SERVER:-deployuser@178.105.10.2}"
MIGRATION_FILE="supabase/migrations/539_enterprise_security_hardening_sql_bypasses.sql"

echo "🛡️  Prüfe Verbindung zu $SERVER..."
ssh -o BatchMode=yes -o ConnectTimeout=5 "$SERVER" "echo '  ✓ SSH-Verbindung erfolgreich.'"

echo "📦 Suche aktiven Supabase-DB-Container auf dem Server..."
DB_CONTAINER=$(ssh -o BatchMode=yes "$SERVER" "docker ps --format '{{.Names}}' | grep -E 'supabase-db|postgres' | head -n 1")

if [ -z "$DB_CONTAINER" ]; then
  echo "❌ Fehler: Kein aktiver Supabase-DB-Container auf $SERVER gefunden."
  exit 1
fi

echo "  ✓ DB-Container identifiziert: $DB_CONTAINER"
echo ""

echo "🚀 Führe Migration 539 aus ($MIGRATION_FILE)..."
ssh -o BatchMode=yes "$SERVER" "docker exec -i $DB_CONTAINER psql -U postgres -d postgres" < "$MIGRATION_FILE"

echo ""
echo "🔍 Verifiziere Migration 539:"
echo "1. Prüfung is_demo_tenant Spalte und Demo-Kennzeichnungen:"
ssh -o BatchMode=yes "$SERVER" "docker exec $DB_CONTAINER psql -U postgres -d postgres -c \"SELECT id, name, is_demo_tenant, status FROM public.schools ORDER BY is_demo_tenant DESC;\""

echo ""
echo "2. Prüfung verify_registration_passcode (Bypass-Eliminierung):"
ssh -o BatchMode=yes "$SERVER" "docker exec $DB_CONTAINER psql -U postgres -d postgres -c \"SELECT public.verify_registration_passcode('test-campus') AS test_campus_result, public.verify_registration_passcode('falscher-code') AS invalid_result;\""

echo ""
echo "✅ Migration 539 erfolgreich und atomar auf Hetzner-Cluster angewendet!"
